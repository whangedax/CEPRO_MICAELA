/**
 * Migrador de laboratorio v1→v2. No está conectado al bootstrap productivo.
 */
import { CONFIG } from '../config.js';
import { GROUP_ACADEMIC_STORE, SCHEMA_V2 } from '../db/schema-v2-design.js';

export const MIGRATION_ID = 'SCHEMA-V2-GROUP-01A';
export const MIGRATION_MARKER_KEY = 'SCHEMA_MIGRATION_V1_TO_V2_GROUP';
const TEST_DB_PATTERN = /^CETPRO_(?:SCHEMA_V2|V2_)[A-Z0-9_-]+$/i;

function migrationError(message, code = 'MIGRATION_ABORTED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function assertIsolatedV2DatabaseName(dbName) {
  if (!dbName || dbName === 'CETPRO_DB' || !TEST_DB_PATTERN.test(dbName)) {
    throw migrationError('El migrador v2 solo admite nombres explícitos de DB aislada.', 'PRODUCTIVE_DB_FORBIDDEN');
  }
}

export function migratedGroupId(sourceGroupCode) {
  const code = String(sourceGroupCode || '').trim();
  if (!code) throw migrationError('No se puede generar ID para groupCode vacío.', 'GROUP_CODE_MISSING');
  return `GAC-V1-${code}`;
}

function sourceBackedOptional(members, field) {
  const values = members.map(item => item[field]).filter(value => value !== null && value !== undefined && String(value).trim() && String(value).trim() !== 'PENDIENTE');
  if (!values.length) return { value: null, review: false };
  const normalized = new Set(values.map(value => String(value).trim()));
  const allSourced = members.every(item => !item[field] || Boolean(item.academicContextSources?.[field]));
  if (normalized.size !== 1 || !allSourced) return { value: null, review: true };
  return { value: [...normalized][0], review: false };
}

export function planGroupMigration({ enrollments, students, programs }) {
  const studentIds = new Set(students.map(item => item.id));
  const programIds = new Set(programs.map(item => item.id));
  const groups = new Map();
  for (const enrollment of enrollments) {
    const code = String(enrollment.grupoCode || '').trim();
    if (!code) throw migrationError(`Matrícula ${enrollment.id} sin groupCode.`, 'GROUP_CODE_MISSING');
    if (!studentIds.has(enrollment.estudianteId)) throw migrationError(`Matrícula ${enrollment.id} refiere estudiante inexistente.`, 'STUDENT_MISSING');
    if (!programIds.has(enrollment.programaId)) throw migrationError(`Matrícula ${enrollment.id} refiere programa inexistente.`, 'PROGRAM_MISSING');
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(enrollment);
  }
  const createdAt = new Date().toISOString();
  const groupRecords = [];
  const enrollmentUpdates = [];
  for (const [sourceGroupCode, members] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const memberPrograms = new Set(members.map(item => item.programaId));
    if (memberPrograms.size !== 1) throw migrationError(`Grupo ${sourceGroupCode} mezcla programas.`, 'MIXED_PROGRAM');
    const optional = Object.fromEntries(['turno', 'modalidad', 'seccion'].map(field => [field, sourceBackedOptional(members, field)]));
    const hasUnconfirmedModule = members.some(item => item.moduloId !== null && item.moduloId !== undefined && item.moduloId !== '');
    const hasPeriod = members.some(item => item.periodoId !== null && item.periodoId !== undefined && item.periodoId !== '');
    const reviewReasons = [];
    if (hasUnconfirmedModule) reviewReasons.push('MODULE_REVIEW_REQUIRED');
    if (hasPeriod) reviewReasons.push('PERIOD_REVIEW_REQUIRED');
    for (const field of ['turno', 'modalidad', 'seccion']) if (optional[field].review) reviewReasons.push(`${field.toUpperCase()}_REVIEW_REQUIRED`);
    const id = migratedGroupId(sourceGroupCode);
    groupRecords.push({
      id,
      codigoVisible: sourceGroupCode,
      sourceGroupCode,
      programaId: [...memberPrograms][0],
      moduloId: null,
      periodoId: null,
      turno: optional.turno.value,
      modalidad: optional.modalidad.value,
      seccion: optional.seccion.value,
      estado: reviewReasons.length ? 'REVIEW_REQUIRED' : 'ACTIVO',
      moduleAssignmentStatus: 'UNASSIGNED',
      periodAssignmentStatus: 'UNASSIGNED',
      reviewReasons,
      source: { type: 'V1_MIGRATION', migrationId: MIGRATION_ID, field: 'matriculas.grupoCode' },
      createdAt,
      updatedAt: createdAt
    });
    for (const enrollment of members) enrollmentUpdates.push({ ...enrollment, grupoId: id });
  }
  return { groupRecords, enrollmentUpdates, createdAt };
}

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

function without(record, field) {
  const clone = { ...record };
  delete clone[field];
  return clone;
}

export function compareV1V2Snapshots(before, after) {
  const differences = [];
  for (const storeName of Object.keys(before).sort()) {
    if (storeName === 'matriculas') {
      const normalized = (after.matriculas || []).map(item => without(item, 'grupoId'));
      if (stable(before.matriculas) !== stable(normalized)) differences.push('matriculas_except_grupoId');
    } else if (storeName === 'configuracion') {
      const normalized = (after.configuracion || []).filter(item => item.clave !== MIGRATION_MARKER_KEY);
      if (stable(before.configuracion) !== stable(normalized)) differences.push('configuracion_except_marker');
    } else if (stable(before[storeName]) !== stable(after[storeName])) {
      differences.push(storeName);
    }
  }
  return { equivalent: differences.length === 0, differences };
}

export function auditV2Snapshot(snapshot) {
  const issues = [];
  const students = new Set((snapshot.estudiantes || []).map(item => item.id));
  const programs = new Set((snapshot.programas || []).map(item => item.id));
  const modules = new Set((snapshot.modulos || []).map(item => item.id));
  const periods = new Set((snapshot.periodos || []).map(item => item.id));
  const groups = new Map((snapshot[GROUP_ACADEMIC_STORE] || []).map(item => [item.id, item]));
  const add = (code, id, reference) => issues.push({ code, id, reference });
  for (const group of groups.values()) {
    if (!programs.has(group.programaId)) add('GROUP_PROGRAM_ORPHAN', group.id, group.programaId);
    if (group.moduloId && !modules.has(group.moduloId)) add('GROUP_MODULE_ORPHAN', group.id, group.moduloId);
    if (group.periodoId && !periods.has(group.periodoId)) add('GROUP_PERIOD_ORPHAN', group.id, group.periodoId);
  }
  for (const enrollment of snapshot.matriculas || []) {
    if (!students.has(enrollment.estudianteId)) add('ENROLLMENT_STUDENT_ORPHAN', enrollment.id, enrollment.estudianteId);
    if (!programs.has(enrollment.programaId)) add('ENROLLMENT_PROGRAM_ORPHAN', enrollment.id, enrollment.programaId);
    const group = groups.get(enrollment.grupoId);
    if (!group) add('ENROLLMENT_GROUP_ORPHAN', enrollment.id, enrollment.grupoId);
    else {
      if (group.programaId !== enrollment.programaId) add('ENROLLMENT_GROUP_PROGRAM_MISMATCH', enrollment.id, enrollment.grupoId);
      if (group.sourceGroupCode !== enrollment.grupoCode) add('SOURCE_GROUP_CODE_MISMATCH', enrollment.id, enrollment.grupoId);
    }
  }
  return { valid: issues.length === 0, issueCount: issues.length, issues };
}

export function upgradeIsolatedDatabaseV1ToV2(dbName, options = {}) {
  assertIsolatedV2DatabaseName(dbName);
  return new Promise((resolve, reject) => {
    let migrationFailure = null;
    const request = indexedDB.open(dbName, SCHEMA_V2.version);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      const tx = event.target.transaction;
      const abort = error => {
        migrationFailure = error instanceof Error ? error : migrationError(String(error));
        try { tx.abort(); } catch { /* request.onerror will reject */ }
      };
      if (event.oldVersion !== 1) { abort(migrationError(`Versión origen ${event.oldVersion}; se exige v1.`, 'SOURCE_VERSION_INVALID')); return; }
      try {
        options.faultInjector?.({ phase: 'BEFORE_CREATE_STORE', tx });
        if (db.objectStoreNames.contains(GROUP_ACADEMIC_STORE)) throw migrationError('El store grupos_academicos ya existe.', 'STORE_ALREADY_EXISTS');
        const groupStore = db.createObjectStore(GROUP_ACADEMIC_STORE, { keyPath: 'id' });
        for (const index of SCHEMA_V2.stores[GROUP_ACADEMIC_STORE].indexes) groupStore.createIndex(index.name, index.keyPath, index.options);
        const enrollmentStore = tx.objectStore('matriculas');
        if (!enrollmentStore.indexNames.contains('grupoId')) enrollmentStore.createIndex('grupoId', 'grupoId', { unique: false });
        options.faultInjector?.({ phase: 'AFTER_CREATE_STORE', tx });
        const matriculasRequest = tx.objectStore('matriculas').getAll();
        const estudiantesRequest = tx.objectStore('estudiantes').getAll();
        const programasRequest = tx.objectStore('programas').getAll();
        let pending = 3;
        const process = () => {
          if (--pending) return;
          try {
            const plan = planGroupMigration({ enrollments: matriculasRequest.result || [], students: estudiantesRequest.result || [], programs: programasRequest.result || [] });
            plan.groupRecords.forEach((group, index) => {
              groupStore.add(group);
              options.faultInjector?.({ phase: 'AFTER_GROUP', index, group, tx });
            });
            plan.enrollmentUpdates.forEach((enrollment, index) => {
              enrollmentStore.put(enrollment);
              options.faultInjector?.({ phase: 'AFTER_ENROLLMENT', index, enrollment, tx });
            });
            const marker = { clave: MIGRATION_MARKER_KEY, fromVersion: 1, toVersion: 2,
              executedAt: plan.createdAt, migrationId: MIGRATION_ID, resultado: 'SUCCESS' };
            tx.objectStore('configuracion').put(marker);
            options.faultInjector?.({ phase: 'BEFORE_COMMIT', tx });
          } catch (error) { abort(error); }
        };
        matriculasRequest.onsuccess = process;
        estudiantesRequest.onsuccess = process;
        programasRequest.onsuccess = process;
        for (const req of [matriculasRequest, estudiantesRequest, programasRequest]) req.onerror = () => abort(req.error || migrationError('Fallo leyendo v1.'));
      } catch (error) { abort(error); }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(migrationFailure || request.error || migrationError('Upgrade v2 abortado.'));
    request.onblocked = () => reject(migrationError('Upgrade bloqueado por una conexión abierta.', 'UPGRADE_BLOCKED'));
  });
}
