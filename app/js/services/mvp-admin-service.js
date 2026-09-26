import { getDB } from '../db/database.js';
import { ValidationError, OperationalError } from './error-service.js';
import { RUNTIME_TARGETS, assertRuntimeWriteTarget, getRuntimeTarget } from './runtime-target-service.js';

export const SOURCE_CONFIRMATION_TEXT = 'Confirmo que esta información proviene de una fuente oficial/autorizada.';
export const MVP_WRITE_TARGETS = Object.freeze({
  candidate: 'CETPRO_V2_CANDIDATE',
  demo: 'CETPRO_V2_DEMO',
  laboratoryPrefix: 'CETPRO_V2_MVP_LAB_'
});

const text = value => value === null || value === undefined ? '' : String(value).trim();
const resultOf = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new OperationalError('No se pudo leer la base local.'));
});
const all = (db, storeName) => resultOf(db.transaction(storeName, 'readonly').objectStore(storeName).getAll())
  .then(rows => rows || []);
const byId = (db, storeName, id) => resultOf(db.transaction(storeName, 'readonly').objectStore(storeName).get(id))
  .then(row => row || null);
const opaqueId = prefix => {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (!uuid) throw new OperationalError('El navegador no puede generar identificadores seguros.');
  return `${prefix}-${uuid}`;
};
const displayName = student => {
  const surnames = [student?.apellidoPaterno, student?.apellidoMaterno].map(text).filter(Boolean).join(' ');
  const names = text(student?.nombres);
  return surnames && names ? `${surnames}, ${names}` : surnames || names || text(student?.nombresCompletoOriginal);
};
const auditRecord = ({ entity, entityId, action, previous = null, next = null, provenance = null }) => {
  const timestamp = new Date().toISOString();
  return {
    id: opaqueId('AUD-MVP'), timestamp, fechaHora: timestamp,
    entidad: entity, entidadId: entityId, idEntidad: entityId,
    accion: action, tipoOperacion: action,
    estadoAnterior: previous, datosPrevios: previous,
    estadoNuevo: next, datosNuevos: next,
    origen: provenance || { usuarioOperador: 'SECRETARIA_LOCAL', pantalla: 'MVP administrativo' },
    metadatos: provenance || null
  };
};

function assertCandidateSchema(db) {
  if (!db || db.version !== 2 || !db.objectStoreNames.contains('grupos_academicos')) {
    throw new OperationalError('Esta operación requiere la aplicación administrativa v2.');
  }
}

function assertWritableTarget(db) {
  assertCandidateSchema(db);
  const runtimeTarget = getRuntimeTarget();
  if (runtimeTarget === RUNTIME_TARGETS.DEMO) {
    assertRuntimeWriteTarget(db, RUNTIME_TARGETS.DEMO);
    return;
  }
  if (db.name !== MVP_WRITE_TARGETS.candidate && !db.name.startsWith(MVP_WRITE_TARGETS.laboratoryPrefix)) {
    throw new OperationalError('Escritura MVP bloqueada fuera de la candidata o un laboratorio autorizado.');
  }
  if (db.name === 'CETPRO_DB') throw new OperationalError('CETPRO_DB productiva permanece protegida.');
}

function validateProvenance(input = {}) {
  if (getRuntimeTarget() === RUNTIME_TARGETS.DEMO) {
    return { sourceType: 'DEMO_SYNTHETIC', sourceDescription: 'Datos simulados para demostración funcional',
      confirmedBy: 'SISTEMA_DEMO', confirmedAt: new Date().toISOString(), official: false, demo: true };
  }
  if (input.confirmationText !== SOURCE_CONFIRMATION_TEXT || input.sourceConfirmed !== true) {
    throw new ValidationError(`Debe confirmar expresamente: “${SOURCE_CONFIRMATION_TEXT}”`);
  }
  const sourceType = text(input.sourceType);
  const sourceDescription = text(input.sourceDescription);
  const confirmedBy = text(input.confirmedBy);
  if (!sourceType || !sourceDescription || !confirmedBy) {
    throw new ValidationError('Indique tipo de fuente, descripción y persona que confirma.');
  }
  return { sourceType, sourceDescription, confirmedBy, confirmedAt: new Date().toISOString() };
}

function reviewLabels(reasons = []) {
  const labels = {
    TURNO_REVIEW_REQUIRED: 'Falta confirmar la procedencia del turno.',
    MODALIDAD_REVIEW_REQUIRED: 'Falta confirmar la procedencia de la modalidad.',
    SECCION_REVIEW_REQUIRED: 'Falta confirmar la procedencia de la sección.',
    MODULE_REVIEW_REQUIRED: 'Falta confirmar el módulo correspondiente.',
    PERIOD_REVIEW_REQUIRED: 'Falta confirmar el periodo académico.'
  };
  return reasons.map(reason => labels[reason] || `Falta revisar la procedencia: ${reason}.`);
}

export class MvpAdminService {
  constructor(dbProvider = getDB) { this.dbProvider = dbProvider; }
  get db() { return this.dbProvider(); }

  async listCatalogs() {
    const db = this.db;
    assertCandidateSchema(db);
    const [programs, modules, periods, groups, students] = await Promise.all([
      all(db, 'programas'), all(db, 'modulos'), all(db, 'periodos'),
      all(db, 'grupos_academicos'), all(db, 'estudiantes')
    ]);
    return {
      programs: programs.sort((a, b) => text(a.nombre).localeCompare(text(b.nombre), 'es')),
      modules: modules.sort((a, b) => Number(a.numeroModulo || 0) - Number(b.numeroModulo || 0)),
      periods: periods.sort((a, b) => text(a.nombre).localeCompare(text(b.nombre), 'es')),
      groups: groups.sort((a, b) => text(a.codigoVisible || a.sourceGroupCode).localeCompare(text(b.codigoVisible || b.sourceGroupCode), 'es')),
      students: students.filter(item => item.estado !== 'INACTIVO' && item.estado !== 'ANULADO')
        .sort((a, b) => displayName(a).localeCompare(displayName(b), 'es'))
    };
  }

  async getDashboardStats() {
    const db = this.db;
    assertCandidateSchema(db);
    const [students, enrollments, groups, programs, modules] = await Promise.all([
      all(db, 'estudiantes'), all(db, 'matriculas'), all(db, 'grupos_academicos'), all(db, 'programas'), all(db, 'modulos')
    ]);
    return { students: students.length, enrollments: enrollments.length, groups: groups.length,
      programs: programs.length, modules: modules.length };
  }

  async listGroupSummaries() {
    const db = this.db;
    assertCandidateSchema(db);
    const [groups, enrollments, programs, modules, periods] = await Promise.all([
      all(db, 'grupos_academicos'), all(db, 'matriculas'), all(db, 'programas'), all(db, 'modulos'), all(db, 'periodos')
    ]);
    const programMap = new Map(programs.map(item => [item.id, item]));
    const moduleMap = new Map(modules.map(item => [item.id, item]));
    const periodMap = new Map(periods.map(item => [item.id, item]));
    const counts = new Map();
    enrollments.forEach(item => counts.set(item.grupoId, (counts.get(item.grupoId) || 0) + 1));
    return groups.map(group => ({
      ...group,
      visibleCode: text(group.codigoVisible || group.sourceGroupCode) || 'Sin código visible',
      program: programMap.get(group.programaId) || null,
      module: group.moduloId ? moduleMap.get(group.moduloId) || null : null,
      period: group.periodoId ? periodMap.get(group.periodoId) || null : null,
      enrollmentCount: counts.get(group.id) || 0,
      reviewDetails: reviewLabels(group.reviewReasons || []),
      administrativeStatus: group.estado === 'REVIEW_REQUIRED' ? 'REVISAR PROCEDENCIA'
        : (!group.moduloId || !group.periodoId ? 'CONFIGURACIÓN ACADÉMICA PENDIENTE' : text(group.estado || 'ACTIVO'))
    })).sort((a, b) => a.visibleCode.localeCompare(b.visibleCode, 'es'));
  }

  async buildGroupRoster(groupId) {
    const id = text(groupId);
    if (!id) throw new ValidationError('Seleccione un grupo académico.');
    const db = this.db;
    assertCandidateSchema(db);
    const group = await byId(db, 'grupos_academicos', id);
    if (!group) throw new ValidationError('El grupo académico seleccionado no existe.');
    const [enrollments, students, program, module, period, institutions] = await Promise.all([
      resultOf(db.transaction('matriculas', 'readonly').objectStore('matriculas').index('grupoId').getAll(id)).then(rows => rows || []),
      all(db, 'estudiantes'), byId(db, 'programas', group.programaId),
      group.moduloId ? byId(db, 'modulos', group.moduloId) : Promise.resolve(null),
      group.periodoId ? byId(db, 'periodos', group.periodoId) : Promise.resolve(null),
      all(db, 'institucion')
    ]);
    if (!program) throw new OperationalError('El programa del grupo no está disponible.');
    const studentMap = new Map(students.map(item => [item.id, item]));
    const seen = new Set();
    const rows = enrollments.map(enrollment => {
      if (enrollment.grupoId !== id || enrollment.programaId !== group.programaId) {
        throw new OperationalError('La composición del grupo es inconsistente.');
      }
      if (seen.has(enrollment.id)) throw new OperationalError('La matrícula aparece duplicada en el grupo.');
      seen.add(enrollment.id);
      const student = studentMap.get(enrollment.estudianteId);
      if (!student) throw new OperationalError('Una matrícula perdió su estudiante vinculado.');
      return {
        enrollmentId: enrollment.id,
        studentId: student.id,
        studentName: displayName(student),
        document: text(student.numeroDocumento),
        numeroDocumento: text(student.numeroDocumento),
        tipoDocumento: text(student.tipoDocumento || 'DNI'),
        apellidoPaterno: text(student.apellidoPaterno || ''),
        apellidoMaterno: text(student.apellidoMaterno || ''),
        nombres: text(student.nombres || ''),
        sex: ['H', 'M'].includes(text(student.sexo).toUpperCase()) ? text(student.sexo).toUpperCase() : '',
        sexo: ['H', 'M'].includes(text(student.sexo).toUpperCase()) ? text(student.sexo).toUpperCase() : '',
        birthDate: text(student.fechaNacimiento),
        fechaNacimiento: text(student.fechaNacimiento),
        enrollmentStatus: text(enrollment.estado || 'ACTIVA'),
        officialEnrollmentCode: text(enrollment.codigoOficialMatricula),
        sourceOrder: Number(enrollment.filaOrigen || Number.MAX_SAFE_INTEGER)
      };
    }).sort((a, b) => a.studentName.localeCompare(b.studentName, 'es') || a.sourceOrder - b.sourceOrder || a.enrollmentId.localeCompare(b.enrollmentId));
    const capacity = 30;
    return {
      group: { ...group, visibleCode: text(group.codigoVisible || group.sourceGroupCode) || 'Sin código visible',
        reviewDetails: reviewLabels(group.reviewReasons || []) },
      program, module, period, institution: institutions[0] || {}, rows,
      source: { groupId: id, enrollmentIds: rows.map(row => row.enrollmentId), authority: 'groupId' },
      preflight: {
        mode: 'PREVIEW_ADMINISTRATIVE', rows: rows.length, capacity,
        capacityExceeded: rows.length > capacity,
        canPreviewInstitutional: rows.length <= capacity,
        canGenerateInternalReport: true,
        canOfficiallyIssue: false,
        pendingFields: [!module && 'Módulo', !period && 'Periodo', 'Plan y unidades didácticas'].filter(Boolean)
      }
    };
  }

  async createConfirmedPeriod(input = {}) {
    const db = this.db;
    assertWritableTarget(db);
    const provenance = validateProvenance(input);
    const nombre = text(input.nombre);
    const anio = Number.parseInt(input.anio, 10);
    const fechaInicio = text(input.fechaInicio);
    const fechaFin = text(input.fechaFin);
    const estado = text(input.estado || 'ACTIVO');
    if (!nombre || !Number.isInteger(anio) || anio < 2000 || anio > 2100 || !fechaInicio || !fechaFin) {
      throw new ValidationError('Complete denominación, año y fechas del periodo.');
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) throw new ValidationError('La fecha final no puede ser anterior a la inicial.');
    const id = opaqueId('PER');
    const record = { id, idPeriodo: id, nombre, anio, fechaInicio, fechaFin, estado, ...provenance, fechaCreacion: provenance.confirmedAt };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['periodos', 'auditoria'], 'readwrite');
      let failure = null;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const req = tx.objectStore('periodos').index('nombre').get(nombre);
      req.onsuccess = () => {
        if (req.result) return abort(new ValidationError(`Ya existe el periodo “${nombre}”.`));
        tx.objectStore('periodos').add(record);
        tx.objectStore('auditoria').add(auditRecord({ entity: 'PERIODOS', entityId: id, action: 'CREACION_CONFIRMADA', next: record, provenance }));
      };
      req.onerror = () => abort(req.error);
      tx.oncomplete = () => resolve(record);
      tx.onabort = () => reject(failure || tx.error || new OperationalError('No se guardó el periodo.'));
    });
  }

  async assignConfirmedPeriod(input = {}) {
    const db = this.db;
    assertWritableTarget(db);
    const provenance = validateProvenance(input);
    const groupId = text(input.groupId); const periodoId = text(input.periodoId);
    if (!groupId || !periodoId) throw new ValidationError('Seleccione grupo y periodo; no existe asignación automática.');
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['grupos_academicos', 'periodos', 'matriculas', 'auditoria'], 'readwrite');
      let failure = null; let outcome = null; let pending = 3;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const groupReq = tx.objectStore('grupos_academicos').get(groupId);
      const periodReq = tx.objectStore('periodos').get(periodoId);
      const membersReq = tx.objectStore('matriculas').index('grupoId').getAll(groupId);
      const validate = () => {
        if (--pending || failure) return;
        const group = groupReq.result; const period = periodReq.result; const members = membersReq.result || [];
        if (!group || !period) return abort(new ValidationError('El grupo o periodo seleccionado ya no existe.'));
        if (!members.length || members.some(item => item.grupoId !== groupId || item.programaId !== group.programaId)) {
          return abort(new OperationalError('La composición del grupo cambió; revise antes de guardar.'));
        }
        if (group.estado === 'INCONSISTENT' || (group.reviewReasons || []).includes('PERIOD_REVIEW_REQUIRED')) {
          return abort(new ValidationError('El grupo requiere revisar la procedencia del periodo antes de asignarlo.'));
        }
        if (group.periodoId === periodoId) return abort(new ValidationError('El grupo ya tiene ese periodo.'));
        const updated = { ...group, periodoId,
          academicContextSources: { ...(group.academicContextSources || {}), periodoId: provenance },
          updatedAt: provenance.confirmedAt };
        tx.objectStore('grupos_academicos').put(updated);
        tx.objectStore('auditoria').add(auditRecord({ entity: 'GRUPO_ACADEMICO', entityId: groupId,
          action: group.periodoId ? 'CAMBIO_PERIODO_CONFIRMADO' : 'ASIGNACION_PERIODO_CONFIRMADA',
          previous: { periodoId: group.periodoId || null }, next: { periodoId }, provenance }));
        outcome = { group: updated, period, affectedEnrollments: members.length, provenance };
      };
      groupReq.onsuccess = validate; periodReq.onsuccess = validate; membersReq.onsuccess = validate;
      groupReq.onerror = () => abort(groupReq.error); periodReq.onerror = () => abort(periodReq.error); membersReq.onerror = () => abort(membersReq.error);
      tx.oncomplete = () => resolve(outcome);
      tx.onabort = () => reject(failure || tx.error || new OperationalError('No se asignó el periodo.'));
    });
  }

  async assignConfirmedModule(input = {}) {
    const db = this.db;
    assertWritableTarget(db);
    const provenance = validateProvenance(input);
    const groupId = text(input.groupId);
    const moduloId = text(input.moduloId);
    const turno = input.turno !== undefined ? text(input.turno) : undefined;
    const ciclo = input.ciclo !== undefined ? text(input.ciclo) : undefined;
    const seccion = input.seccion !== undefined ? text(input.seccion) : undefined;
    if (!groupId) throw new ValidationError('Seleccione un grupo académico.');
    if (!moduloId && turno === undefined && ciclo === undefined && seccion === undefined) {
      throw new ValidationError('Seleccione grupo y módulo; el sistema no autoselecciona.');
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['grupos_academicos', 'modulos', 'matriculas', 'auditoria'], 'readwrite');
      let failure = null; let outcome = null; let pending = 3;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const groupReq = tx.objectStore('grupos_academicos').get(groupId);
      const targetModuloId = moduloId || '';
      const moduleReq = targetModuloId ? tx.objectStore('modulos').get(targetModuloId) : null;
      const membersReq = tx.objectStore('matriculas').index('grupoId').getAll(groupId);
      const validate = () => {
        if (--pending || failure) return;
        const group = groupReq.result; const module = moduleReq ? moduleReq.result : null; const members = membersReq.result || [];
        if (!group) return abort(new ValidationError('El grupo académico seleccionado ya no existe.'));
        if (targetModuloId && (!module || module.programaId !== group.programaId)) {
          return abort(new ValidationError('El módulo no pertenece al programa del grupo.'));
        }
        if (!members.length || members.some(item => item.grupoId !== groupId || item.programaId !== group.programaId)) {
          return abort(new OperationalError('La composición del grupo cambió; revise antes de guardar.'));
        }
        if (group.estado === 'INCONSISTENT' || (group.reviewReasons || []).includes('MODULE_REVIEW_REQUIRED')) {
          return abort(new ValidationError('El grupo requiere revisar la procedencia del módulo antes de asignarlo.'));
        }
        
        const moduleChanged = Boolean(targetModuloId && targetModuloId !== group.moduloId);
        const turnoChanged = Boolean(turno !== undefined && turno !== (group.turno || ''));
        const cicloChanged = Boolean(ciclo !== undefined && ciclo !== (group.ciclo || ''));
        const seccionChanged = Boolean(seccion !== undefined && seccion !== (group.seccion || ''));

        if (!moduleChanged && !turnoChanged && !cicloChanged && !seccionChanged) {
          return abort(new ValidationError('El grupo ya tiene esa configuración académica.'));
        }

        const effectiveModuloId = targetModuloId || group.moduloId || null;
        const updated = {
          ...group,
          ...(effectiveModuloId ? { moduloId: effectiveModuloId, moduleAssignmentStatus: 'ASSIGNED_CONFIRMED' } : {}),
          ...(turno !== undefined ? { turno } : {}),
          ...(ciclo !== undefined ? { ciclo } : {}),
          ...(seccion !== undefined ? { seccion } : {}),
          academicContextSources: {
            ...(group.academicContextSources || {}),
            ...(targetModuloId ? { moduloId: provenance } : {}),
            ...(turno !== undefined ? { turno: provenance } : {}),
            ...(ciclo !== undefined ? { ciclo: provenance } : {}),
            ...(seccion !== undefined ? { seccion: provenance } : {})
          },
          updatedAt: provenance.confirmedAt
        };
        tx.objectStore('grupos_academicos').put(updated);
        tx.objectStore('auditoria').add(auditRecord({
          entity: 'GRUPO_ACADEMICO',
          entityId: groupId,
          action: moduleChanged ? (group.moduloId ? 'CAMBIO_MODULO_CONFIRMADO' : 'ASIGNACION_MODULO_CONFIRMADA') : 'ACTUALIZACION_GRUPO_CONFIRMADA',
          previous: {
            moduloId: group.moduloId || null,
            turno: group.turno || null,
            ciclo: group.ciclo || null,
            seccion: group.seccion || null
          },
          next: {
            moduloId: updated.moduloId || null,
            turno: updated.turno || null,
            ciclo: updated.ciclo || null,
            seccion: updated.seccion || null
          },
          provenance
        }));
        outcome = { group: updated, module: module || null, affectedEnrollments: members.length, provenance };
      };
      groupReq.onsuccess = validate;
      if (moduleReq) {
        moduleReq.onsuccess = validate;
        moduleReq.onerror = () => abort(moduleReq.error);
      } else {
        pending--;
      }
      membersReq.onsuccess = validate;
      groupReq.onerror = () => abort(groupReq.error);
      membersReq.onerror = () => abort(membersReq.error);
      tx.oncomplete = () => resolve(outcome);
      tx.onabort = () => reject(failure || tx.error || new OperationalError('No se asignó el módulo.'));
    });
  }

  async createConfirmedUnit(input = {}) {
    const db = this.db;
    assertWritableTarget(db);
    const provenance = validateProvenance(input);
    const programaId = text(input.programaId); const moduloId = text(input.moduloId);
    const orden = Number.parseInt(input.orden, 10); const nombre = text(input.nombre);
    const capacidad = Number.parseInt(input.capacidad, 10); const horas = Number.parseInt(input.horas, 10);
    const creditos = Number(input.creditos); const indicators = (Array.isArray(input.indicadores) ? input.indicadores : [])
      .map(text).filter(Boolean);
    if (!programaId || !moduloId || !Number.isInteger(orden) || orden < 1 || !nombre ||
        !Number.isInteger(capacidad) || capacidad < 1 || !Number.isInteger(horas) || horas < 1 ||
        !Number.isFinite(creditos) || creditos <= 0 || !indicators.length) {
      throw new ValidationError('Complete programa, módulo, orden, nombre, capacidad, horas, créditos e indicadores.');
    }
    const id = opaqueId('UNI');
    const unit = { id, idUnidad: id, programaId, moduloId, orden, numeroUnidad: orden, nombre,
      capacidad, horas, creditos, indicadores: indicators, estado: 'ACTIVA', ...provenance, fechaCreacion: provenance.confirmedAt };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['modulos', 'unidades', 'indicadores', 'auditoria'], 'readwrite');
      let failure = null;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const req = tx.objectStore('modulos').get(moduloId);
      req.onsuccess = () => {
        const module = req.result;
        if (!module || module.programaId !== programaId) return abort(new ValidationError('El módulo no pertenece al programa seleccionado.'));
        tx.objectStore('unidades').add(unit);
        indicators.forEach((label, index) => tx.objectStore('indicadores').add({
          id: opaqueId('IND'), unidadId: id, orden: index + 1, nombre: label, descripcion: label,
          estado: 'ACTIVO', ...provenance, fechaCreacion: provenance.confirmedAt
        }));
        tx.objectStore('auditoria').add(auditRecord({ entity: 'UNIDADES', entityId: id,
          action: 'CREACION_CURRICULAR_CONFIRMADA', next: unit, provenance }));
      };
      req.onerror = () => abort(req.error);
      tx.oncomplete = () => resolve({ unit, indicatorCount: indicators.length, provenance });
      tx.onabort = () => reject(failure || tx.error || new OperationalError('No se guardó la unidad.'));
    });
  }

  async createEnrollment(input = {}) {
    const db = this.db;
    assertWritableTarget(db);
    const provenance = validateProvenance(input);
    const estudianteId = text(input.estudianteId); const programaId = text(input.programaId);
    const requestedGroupId = text(input.groupId);
    const future = input.futureGroup || null;
    if (!estudianteId || !programaId || (!requestedGroupId && !future)) {
      throw new ValidationError('Seleccione estudiante, programa y grupo académico.');
    }
    const groupId = requestedGroupId || opaqueId('GAC');
    const enrollmentId = opaqueId('MAT');
    return new Promise((resolve, reject) => {
      const stores = ['estudiantes', 'programas', 'grupos_academicos', 'matriculas', 'modulos', 'periodos', 'auditoria'];
      const tx = db.transaction(stores, 'readwrite');
      let failure = null; let outcome = null; let pending = requestedGroupId ? 4 : 5;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const studentReq = tx.objectStore('estudiantes').get(estudianteId);
      const programReq = tx.objectStore('programas').get(programaId);
      const groupReq = requestedGroupId ? tx.objectStore('grupos_academicos').get(groupId) : null;
      const needsModule = !requestedGroupId && Boolean(text(future.moduloId));
      const needsPeriod = !requestedGroupId && Boolean(text(future.periodoId));
      const moduleReq = needsModule ? tx.objectStore('modulos').get(text(future.moduloId)) : { result: null };
      const periodReq = needsPeriod ? tx.objectStore('periodos').get(text(future.periodoId)) : { result: null };
      const membersReq = tx.objectStore('matriculas').index('grupoId').getAll(groupId);
      const finishRead = () => {
        try {
          if (--pending || failure) return;
          const student = studentReq.result; const program = programReq.result;
          if (!student || student.estado === 'INACTIVO' || student.estado === 'ANULADO') return abort(new ValidationError('El estudiante no está activo.'));
          if (!program) return abort(new ValidationError('El programa seleccionado no existe.'));
          let group = groupReq?.result || null;
          if (requestedGroupId && (!group || group.programaId !== programaId)) return abort(new ValidationError('El grupo no pertenece al programa seleccionado.'));
          if ((membersReq.result || []).some(item => item.estudianteId === estudianteId && item.estado !== 'ANULADA')) {
            return abort(new ValidationError('El estudiante ya tiene una matrícula activa en ese grupo.'));
          }
          if (!requestedGroupId) {
            const visibleCode = text(future.codigoVisible);
            if (!visibleCode) return abort(new ValidationError('Indique un código visible para el nuevo grupo.'));
            if (needsModule && (!moduleReq.result || moduleReq.result.programaId !== programaId)) return abort(new ValidationError('El módulo opcional no pertenece al programa.'));
            if (needsPeriod && !periodReq.result) return abort(new ValidationError('El periodo opcional no existe.'));
            const reviewReasons = [!text(future.turno) && 'TURNO_REVIEW_REQUIRED', !text(future.modalidad) && 'MODALIDAD_REVIEW_REQUIRED',
              !text(future.seccion) && 'SECCION_REVIEW_REQUIRED'].filter(Boolean);
            group = { id: groupId, codigoVisible: visibleCode, sourceGroupCode: null, programaId,
              moduloId: text(future.moduloId) || null, periodoId: text(future.periodoId) || null,
              turno: text(future.turno) || null, modalidad: text(future.modalidad) || null,
              seccion: text(future.seccion) || null, estado: reviewReasons.length ? 'REVIEW_REQUIRED' : text(future.estado || 'ACTIVO'),
              reviewReasons, sourceType: provenance.sourceType, sourceDescription: provenance.sourceDescription,
              confirmedBy: provenance.confirmedBy, confirmedAt: provenance.confirmedAt,
              academicContextSources: { creation: provenance } };
            tx.objectStore('grupos_academicos').add(group);
            tx.objectStore('auditoria').add(auditRecord({ entity: 'GRUPO_ACADEMICO', entityId: groupId,
              action: 'CREACION_GRUPO_FUTURO_CONFIRMADA', next: group, provenance }));
          }
          const enrollment = {
            id: enrollmentId, idMatricula: enrollmentId, estudianteId, programaId, grupoId: groupId,
            // grupoCode es únicamente la traza histórica v1; un grupo creado en v2 no fabrica ese legado.
            grupoCode: group.sourceGroupCode ? text(group.sourceGroupCode) : null,
            estudianteNombreCompleto: displayName(student), estudianteDocumento: text(student.numeroDocumento),
            programaNombre: text(program.nombre), moduloId: null, periodoId: null,
            turno: text(group.turno) || 'PENDIENTE', modalidad: text(group.modalidad) || 'PENDIENTE',
            codigoOficialMatricula: '', estado: group.moduloId && group.periodoId ? 'ACTIVA' : 'CONFIGURACION_ACADEMICA_PENDIENTE',
            incidencias: [], sourceType: provenance.sourceType, sourceDescription: provenance.sourceDescription,
            confirmedBy: provenance.confirmedBy, confirmedAt: provenance.confirmedAt,
            fechaCreacion: provenance.confirmedAt, fechaActualizacion: provenance.confirmedAt
          };
          tx.objectStore('matriculas').add(enrollment);
          tx.objectStore('auditoria').add(auditRecord({ entity: 'MATRICULAS', entityId: enrollmentId,
            action: 'CREACION_MATRICULA_ADMINISTRATIVA', next: enrollment, provenance }));
          outcome = { enrollment, group, provenance };
        } catch (error) {
          abort(error);
        }
      };
      studentReq.onsuccess = finishRead; programReq.onsuccess = finishRead; membersReq.onsuccess = finishRead;
      if (groupReq) groupReq.onsuccess = finishRead;
      else {
        if (needsModule) moduleReq.onsuccess = finishRead; else queueMicrotask(finishRead);
        if (needsPeriod) periodReq.onsuccess = finishRead; else queueMicrotask(finishRead);
      }
      const fail = request => () => abort(request.error || new OperationalError('Falló la validación transaccional.'));
      studentReq.onerror = fail(studentReq); programReq.onerror = fail(programReq); membersReq.onerror = fail(membersReq);
      if (groupReq) groupReq.onerror = fail(groupReq);
      if (!requestedGroupId && needsModule) moduleReq.onerror = fail(moduleReq);
      if (!requestedGroupId && needsPeriod) periodReq.onerror = fail(periodReq);
      tx.oncomplete = () => resolve(outcome);
      tx.onerror = () => { if (!failure) failure = tx.error || new OperationalError('Falló la escritura transaccional de la matrícula.'); };
      tx.onabort = () => reject(failure || tx.error || new OperationalError('No se creó la matrícula.'));
    });
  }
}

export function evaluateRosterCapacity(rowCount) {
  const count = Number(rowCount);
  if (!Number.isInteger(count) || count < 0) throw new ValidationError('Cantidad de matrículas inválida.');
  return { capacity: 30, rows: count, capacityExceeded: count > 30,
    code: count > 30 ? 'CAPACITY_EXCEEDED' : 'PREVIEW_ADMINISTRATIVE' };
}
