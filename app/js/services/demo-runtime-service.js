import { getDB, setDBInstance } from '../db/database.js';
import { SCHEMA_V2_STORE_NAMES } from '../db/schema-v2-design.js';
import { OFFICIAL_CATALOG_SEED } from './catalog-service.js';
import { canonicalize } from './storage-service.js';
import { SchemaV2BackupLabService, readV2Snapshot } from './schema-v2-backup-lab-service.js';
import {
  RUNTIME_DATABASES, RUNTIME_TARGETS, assertRuntimeDatabase, assertRuntimeWriteTarget,
  getRuntimeTarget, isDemoRuntime, setRuntimeTarget
} from './runtime-target-service.js';

export const DEMO_DATASET_VERSION = 'DEMO_DATASET_V1';
export const DEMO_DB_NAME = RUNTIME_DATABASES.DEMO;
export const DEMO_SESSION_KEY = 'CETPRO_RUNTIME_TARGET';
export const DEMO_FIXED_TIMESTAMP = '2026-09-16T00:00:00.000Z';
export const DEMO_IDS = Object.freeze({
  period: 'PER-DEMO-2026-I', groupA: 'GAC-DEMO-A', groupB: 'GAC-DEMO-B',
  moduleA: 'MOD-001', moduleB: 'MOD-002', unitA1: 'UNI-DEMO-MOD-001-01', session1: 'ATS-DEMO-001'
});
export const DEMO_EXPECTED_COUNTS = Object.freeze({
  estudiantes: 40, matriculas: 65, grupos_academicos: 2, programas: 7, modulos: 14,
  periodos: 1, unidades: 12, indicadores: 60, asistencia: 205
});

let candidateDb = null;
let demoDb = null;

const demoMeta = Object.freeze({
  sourceType: 'DEMO_SYNTHETIC',
  sourceDescription: 'Datos simulados para demostración funcional',
  confirmedBy: 'SISTEMA_DEMO',
  confirmedAt: DEMO_FIXED_TIMESTAMP,
  official: false,
  demo: true
});

const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Operación IndexedDB DEMO fallida.'));
});

function moduleRecords() {
  return OFFICIAL_CATALOG_SEED.flatMap(program => program.modulos.map(module => ({
    id: module.id, idModulo: module.id, programaId: program.id, numeroModulo: module.numeroModulo,
    nombre: module.nombre, nombreOficial: module.nombre, nombreOriginalFuente: module.nombreOriginalFuente,
    fuente: program.fuente, estado: 'ACTIVO', fechaCreacion: DEMO_FIXED_TIMESTAMP,
    fechaActualizacion: DEMO_FIXED_TIMESTAMP, ...demoMeta
  })));
}

function programRecords() {
  return OFFICIAL_CATALOG_SEED.map(program => ({
    id: program.id, codigo: program.codigo, nombre: program.nombre,
    nombreOriginalFuente: program.nombreOriginalFuente, fuente: program.fuente,
    estado: 'ACTIVO', fechaCreacion: DEMO_FIXED_TIMESTAMP, fechaActualizacion: DEMO_FIXED_TIMESTAMP, ...demoMeta
  }));
}

function academicRecords() {
  const period = {
    id: DEMO_IDS.period, idPeriodo: DEMO_IDS.period, nombre: '2026-I DEMO', anio: 2026,
    fechaInicio: '2026-03-01', fechaFin: '2026-07-31', estado: 'ACTIVO', ...demoMeta
  };
  const groups = [
    { id: DEMO_IDS.groupA, codigoVisible: 'GRUPO DEMO A', sourceGroupCode: null,
      programaId: 'PROG-001', moduloId: DEMO_IDS.moduleA, periodoId: DEMO_IDS.period,
      turno: 'MAÑANA DEMO', modalidad: 'PRESENCIAL DEMO', seccion: 'A DEMO', estado: 'ACTIVO',
      reviewReasons: [], moduleAssignmentStatus: 'DEMO_ASSIGNED', ...demoMeta },
    { id: DEMO_IDS.groupB, codigoVisible: 'GRUPO DEMO B', sourceGroupCode: null,
      programaId: 'PROG-001', moduloId: DEMO_IDS.moduleB, periodoId: DEMO_IDS.period,
      turno: 'TARDE DEMO', modalidad: 'PRESENCIAL DEMO', seccion: 'B DEMO', estado: 'ACTIVO',
      reviewReasons: [], moduleAssignmentStatus: 'DEMO_ASSIGNED', ...demoMeta }
  ].map(group => ({ ...group, academicContextSources: { creation: demoMeta, moduloId: demoMeta, periodoId: demoMeta } }));
  const units = [];
  const indicators = [];
  for (const moduleId of [DEMO_IDS.moduleA, DEMO_IDS.moduleB]) {
    for (let order = 1; order <= 6; order++) {
      const unitId = `UNI-DEMO-${moduleId}-${String(order).padStart(2, '0')}`;
      const labels = Array.from({ length: 5 }, (_, index) => `INDICADOR DEMO ${index + 1} — UNIDAD ${order}`);
      units.push({ id: unitId, idUnidad: unitId, programaId: 'PROG-001', moduloId: moduleId, orden: order,
        numeroUnidad: order, nombre: `UD DEMO ${String(order).padStart(2, '0')} (SIMULADA)`,
        capacidad: 40, capacidadLabel: 'CAPACIDAD DEMO 40', horas: 10, creditos: 1,
        indicadores: labels, estado: 'ACTIVA', ...demoMeta });
      labels.forEach((label, index) => indicators.push({
        id: `IND-DEMO-${moduleId}-${String(order).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
        unidadId: unitId, orden: index + 1, nombre: label, descripcion: label, estado: 'ACTIVO', ...demoMeta
      }));
    }
  }
  return { period, groups, units, indicators };
}

function peopleAndEnrollments() {
  const students = Array.from({ length: 40 }, (_, index) => {
    const ordinal = index + 1;
    const padded = String(ordinal).padStart(3, '0');
    return {
      id: `EST-DEMO-${padded}`, idEstudiante: `EST-DEMO-${padded}`, tipoDocumento: 'DEMO',
      numeroDocumento: `DEMO${String(ordinal).padStart(4, '0')}`, apellidoPaterno: 'ESTUDIANTE',
      apellidoMaterno: 'DEMO', nombres: padded, nombresCompletoOriginal: `ESTUDIANTE DEMO ${padded}`,
      sexo: ordinal % 2 ? 'H' : 'M', fechaNacimiento: `2000-01-${String(((ordinal - 1) % 28) + 1).padStart(2, '0')}`,
      estado: 'ACTIVO', fechaCreacion: DEMO_FIXED_TIMESTAMP, fechaActualizacion: DEMO_FIXED_TIMESTAMP, ...demoMeta
    };
  });
  const enrollments = [];
  const add = (groupId, label, count) => {
    for (let index = 1; index <= count; index++) {
      const padded = String(index).padStart(3, '0');
      enrollments.push({
        id: `MAT-DEMO-${label}-${padded}`, idMatricula: `MAT-DEMO-${label}-${padded}`,
        estudianteId: `EST-DEMO-${padded}`, programaId: 'PROG-001', grupoId: groupId,
        grupoCode: null, estudianteNombreCompleto: `ESTUDIANTE DEMO ${padded}`,
        estudianteDocumento: `DEMO${String(index).padStart(4, '0')}`,
        programaNombre: OFFICIAL_CATALOG_SEED[0].nombre, moduloId: null, periodoId: null,
        turno: label === 'A' ? 'MAÑANA DEMO' : 'TARDE DEMO', modalidad: 'PRESENCIAL DEMO',
        codigoOficialMatricula: '', estado: 'ACTIVA', incidencias: [], filaOrigen: index,
        fechaCreacion: DEMO_FIXED_TIMESTAMP, fechaActualizacion: DEMO_FIXED_TIMESTAMP, ...demoMeta
      });
    }
  };
  add(DEMO_IDS.groupA, 'A', 40);
  add(DEMO_IDS.groupB, 'B', 25);
  return { students, enrollments };
}

function attendanceRecords() {
  const records = [];
  for (let sessionIndex = 1; sessionIndex <= 5; sessionIndex++) {
    const sessionId = `ATS-DEMO-${String(sessionIndex).padStart(3, '0')}`;
    records.push({
      id: sessionId, sessionId, sesionId: sessionId, recordType: 'ATTENDANCE_SESSION',
      groupId: DEMO_IDS.groupA, periodoId: DEMO_IDS.period, unidadId: DEMO_IDS.unitA1,
      fecha: `2026-03-${String(sessionIndex + 1).padStart(2, '0')}`, ordenSesion: sessionIndex,
      horasProgramadas: null, estado: 'ACTIVA', version: 1,
      createdAt: DEMO_FIXED_TIMESTAMP, updatedAt: DEMO_FIXED_TIMESTAMP, ...demoMeta
    });
    for (let studentIndex = 1; studentIndex <= 40; studentIndex++) {
      let estadoRegistro = 'SIN_REGISTRO';
      if (sessionIndex === 1) {
        const bucket = studentIndex % 10;
        estadoRegistro = bucket <= 5 ? 'PRESENTE' : bucket <= 7 ? 'AUSENTE' : bucket === 8 ? 'JUSTIFICADA' : 'SIN_REGISTRO';
      }
      const id = `ATM-DEMO-${String(sessionIndex).padStart(3, '0')}-${String(studentIndex).padStart(3, '0')}`;
      records.push({ id, attendanceId: id, recordType: 'ATTENDANCE_MARK', sessionId, sesionId: sessionId,
        groupId: DEMO_IDS.groupA, periodoId: DEMO_IDS.period, unidadId: DEMO_IDS.unitA1,
        matriculaId: `MAT-DEMO-A-${String(studentIndex).padStart(3, '0')}`, estadoRegistro,
        horasRegistradas: null, observacion: '', estadoLogico: 'ACTIVO', version: 1,
        createdAt: DEMO_FIXED_TIMESTAMP, updatedAt: DEMO_FIXED_TIMESTAMP, ...demoMeta });
    }
  }
  return records;
}

function completeDataset() {
  const { period, groups, units, indicators } = academicRecords();
  const { students, enrollments } = peopleAndEnrollments();
  return {
    institucion: [{ id: 'INST-DEMO', nombre: 'CETPRO DEMOSTRACIÓN — NO OFICIAL',
      denominacionVisible: 'CENTRO DE DEMOSTRACIÓN CETPRO — DATOS SIMULADOS', tipoGestion: 'DEMO',
      ugel: 'UGEL DEMO', direccion: 'DIRECCIÓN DEMO', telefono: '000-DEMO', dre: 'DRE DEMO',
      codigoModular: 'COD-DEMO', departamento: 'DEPARTAMENTO DEMO', provincia: 'PROVINCIA DEMO',
      distrito: 'DISTRITO DEMO', resolucion: 'RESOLUCIÓN DEMO — NO OFICIAL', estado: 'ACTIVO', ...demoMeta }],
    programas: programRecords(), modulos: moduleRecords(), periodos: [period], grupos_academicos: groups,
    estudiantes: students, matriculas: enrollments, unidades: units, indicadores: indicators,
    asistencia: attendanceRecords(), configuracion: [{ clave: 'DEMO_DATASET_VERSION', valor: DEMO_DATASET_VERSION,
      environment: 'DEMO', official: false, demo: true, actualizadoEn: DEMO_FIXED_TIMESTAMP }],
    auditoria: [{ id: 'AUD-DEMO-DATASET-V1', timestamp: DEMO_FIXED_TIMESTAMP, entidad: 'DEMO_DATASET',
      entidadId: DEMO_DATASET_VERSION, accion: 'CREATE_DETERMINISTIC_DEMO_DATASET',
      estadoAnterior: null, estadoNuevo: { version: DEMO_DATASET_VERSION }, origen: demoMeta, ...demoMeta }]
  };
}

async function replaceWithDataset(db) {
  assertRuntimeWriteTarget(db, RUNTIME_TARGETS.DEMO);
  const dataset = completeDataset();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SCHEMA_V2_STORE_NAMES, 'readwrite');
    let failure = null;
    tx.oncomplete = () => failure ? reject(failure) : resolve();
    tx.onerror = () => { failure = tx.error || new Error('No se pudo crear el dataset DEMO.'); };
    tx.onabort = () => reject(failure || tx.error || new Error('Dataset DEMO abortado.'));
    for (const storeName of SCHEMA_V2_STORE_NAMES) {
      const store = tx.objectStore(storeName);
      store.clear();
      for (const record of dataset[storeName] || []) store.add(structuredClone(record));
    }
  });
  return dataset;
}

async function openDemo() {
  const db = await SchemaV2BackupLabService.createEmptyDatabase(DEMO_DB_NAME);
  assertRuntimeDatabase(db, RUNTIME_TARGETS.DEMO);
  return db;
}

async function deleteDatabase(name) {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error || new Error(`No se pudo eliminar ${name}.`));
    request.onblocked = () => reject(new Error(`Cierre otras pestañas que usan ${name}.`));
  });
}

async function markerOf(db) {
  return requestResult(db.transaction('configuracion', 'readonly').objectStore('configuracion').get('DEMO_DATASET_VERSION'));
}

function applyVisualState() {
  const demo = isDemoRuntime();
  document.body?.classList.toggle('demo-mode', demo);
  const banner = document.querySelector('#candidate-runtime-banner');
  if (banner) banner.textContent = demo ? 'MODO DEMOSTRACIÓN · DATOS SIMULADOS · NO OFICIAL' : 'OPERACIÓN LOCAL';
  const enter = document.querySelector('#btn-enter-demo');
  if (enter) enter.hidden = demo;
}

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalize(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const DemoRuntimeService = {
  shouldResume() { return sessionStorage.getItem(DEMO_SESSION_KEY) === RUNTIME_TARGETS.DEMO; },
  isActive: isDemoRuntime,
  getTarget: getRuntimeTarget,

  async enter({ reset = false } = {}) {
    if (isDemoRuntime() && demoDb && !reset) { applyVisualState(); return this.getState(); }
    if (!candidateDb) {
      const current = getDB();
      assertRuntimeDatabase(current, RUNTIME_TARGETS.REAL);
      candidateDb = current;
    }
    if (reset) await this.reset({ stayInDemo: true });
    else {
      demoDb = await openDemo();
      setRuntimeTarget(RUNTIME_TARGETS.DEMO, demoDb);
      setDBInstance(demoDb);
      const marker = await markerOf(demoDb);
      if (marker?.valor !== DEMO_DATASET_VERSION) await replaceWithDataset(demoDb);
    }
    sessionStorage.setItem(DEMO_SESSION_KEY, RUNTIME_TARGETS.DEMO);
    applyVisualState();
    return this.getState();
  },

  async resumeIfRequested() {
    if (!this.shouldResume()) return null;
    return this.enter({ reset: false });
  },

  async exit() {
    if (!candidateDb) throw new Error('No existe una conexión candidata para regresar.');
    demoDb?.close();
    demoDb = null;
    setDBInstance(candidateDb);
    setRuntimeTarget(RUNTIME_TARGETS.REAL, candidateDb);
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    applyVisualState();
    return { target: RUNTIME_TARGETS.REAL, dbName: candidateDb.name };
  },

  async reset({ stayInDemo = isDemoRuntime() } = {}) {
    if (!candidateDb) {
      const current = getDB();
      if (current.name === RUNTIME_DATABASES.REAL) candidateDb = current;
    }
    demoDb?.close();
    demoDb = null;
    if (candidateDb) setDBInstance(candidateDb);
    const existing = await indexedDB.databases?.();
    if (!existing || existing.some(item => item.name === DEMO_DB_NAME)) await deleteDatabase(DEMO_DB_NAME);
    demoDb = await openDemo();
    setRuntimeTarget(RUNTIME_TARGETS.DEMO, demoDb);
    setDBInstance(demoDb);
    await replaceWithDataset(demoDb);
    if (stayInDemo) {
      sessionStorage.setItem(DEMO_SESSION_KEY, RUNTIME_TARGETS.DEMO);
      applyVisualState();
      return this.getState();
    }
    return this.exit();
  },

  async destroy() {
    if (isDemoRuntime()) await this.exit();
    demoDb?.close(); demoDb = null;
    await deleteDatabase(DEMO_DB_NAME);
    return { deleted: true, dbName: DEMO_DB_NAME };
  },

  async ensureAcademicConfiguration() {
    if (!isDemoRuntime()) throw new Error('La configuración automática solo existe en DEMO.');
    const dataset = completeDataset();
    const stores = ['periodos', 'grupos_academicos', 'unidades', 'indicadores'];
    const db = assertRuntimeWriteTarget(getDB(), RUNTIME_TARGETS.DEMO);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = tx.onerror;
      for (const name of stores) for (const row of dataset[name]) tx.objectStore(name).put(structuredClone(row));
    });
    return { period: DEMO_IDS.period, groups: 2, units: 12, sourceType: demoMeta.sourceType, official: false };
  },

  async getState() {
    const db = getDB();
    if (!isDemoRuntime()) return { target: getRuntimeTarget(), dbName: db.name, demo: false };
    assertRuntimeDatabase(db, RUNTIME_TARGETS.DEMO);
    const snapshot = await readV2Snapshot(db);
    const counts = Object.fromEntries(SCHEMA_V2_STORE_NAMES.map(name => [name, snapshot[name].length]));
    return { target: RUNTIME_TARGETS.DEMO, dbName: db.name, version: db.version, demo: true,
      datasetVersion: (snapshot.configuracion.find(item => item.clave === 'DEMO_DATASET_VERSION') || {}).valor,
      counts, fingerprint: await digest(snapshot) };
  },

  async semanticHash(db = getDB()) { return digest(await readV2Snapshot(db)); },
  applyVisualState
};

export function getDemoProvenance() { return { ...demoMeta }; }
