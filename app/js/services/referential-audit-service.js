/** Read-only v1 referential diagnostic. A report never repairs or writes records. */
import { getDB } from '../db/database.js';

const STORES = ['estudiantes', 'matriculas', 'programas', 'modulos', 'periodos',
  'unidades', 'indicadores', 'matricula_unidades', 'asistencia', 'evaluacion', 'efsrt'];
const idSet = rows => new Set((rows || []).map(row => row.id));

export function analyzeReferentialSnapshot(snapshot) {
  const rows = Object.fromEntries(STORES.map(store => [store, snapshot[store] || []]));
  const students = idSet(rows.estudiantes);
  const enrollments = idSet(rows.matriculas);
  const programs = idSet(rows.programas);
  const modules = new Map(rows.modulos.map(item => [item.id, item]));
  const periods = idSet(rows.periodos);
  const units = new Map(rows.unidades.map(item => [item.id, item]));
  const indicators = idSet(rows.indicadores);
  const issues = [];
  const issue = (code, store, id, reference) => issues.push({ code, store, id, reference });
  const groups = new Map();
  for (const item of rows.matriculas) {
    if (!students.has(item.estudianteId)) issue('INV-001', 'matriculas', item.id, item.estudianteId);
    if (!programs.has(item.programaId)) issue('INV-002', 'matriculas', item.id, item.programaId);
    if (item.periodoId && !periods.has(item.periodoId)) issue('PERIOD_MISSING', 'matriculas', item.id, item.periodoId);
    if (item.moduloId && !modules.has(item.moduloId)) issue('MODULE_MISSING', 'matriculas', item.id, item.moduloId);
    if (item.moduloId && modules.has(item.moduloId) && modules.get(item.moduloId).programaId !== item.programaId) {
      issue('INV-005', 'matriculas', item.id, item.moduloId);
    }
    const code = String(item.grupoCode || '').trim();
    if (!code) issue('GROUP_CODE_MISSING', 'matriculas', item.id, code);
    else {
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code).push(item);
    }
  }
  for (const [code, members] of groups) {
    for (const [field, invariant] of [['programaId', 'INV-003'], ['moduloId', 'INV-004'], ['periodoId', 'INV-006']]) {
      if (new Set(members.map(item => item[field] || null)).size > 1) issue(invariant, 'grupoCode', code, field);
    }
  }
  for (const item of rows.modulos) if (!programs.has(item.programaId)) issue('MODULE_PROGRAM_MISSING', 'modulos', item.id, item.programaId);
  for (const item of rows.unidades) if (!modules.has(item.moduloId)) issue('UNIT_ORPHAN', 'unidades', item.id, item.moduloId);
  for (const item of rows.indicadores) if (!units.has(item.unidadId)) issue('INDICATOR_ORPHAN', 'indicadores', item.id, item.unidadId);
  for (const store of ['matricula_unidades', 'asistencia', 'evaluacion', 'efsrt']) {
    for (const item of rows[store]) {
      if (!enrollments.has(item.matriculaId)) issue('ACADEMIC_ENROLLMENT_ORPHAN', store, item.id, item.matriculaId);
      if (item.unidadId && !units.has(item.unidadId)) issue('ACADEMIC_UNIT_ORPHAN', store, item.id, item.unidadId);
      if (item.moduloId && !modules.has(item.moduloId)) issue('ACADEMIC_MODULE_ORPHAN', store, item.id, item.moduloId);
      if (item.indicadorId && !indicators.has(item.indicadorId)) issue('ACADEMIC_INDICATOR_ORPHAN', store, item.id, item.indicadorId);
    }
  }
  return { readOnly: true, schemaVersion: 1, counts: Object.fromEntries(STORES.map(store => [store, rows[store].length])),
    groupCount: groups.size, issueCount: issues.length, issues };
}

export async function auditReferentialIntegrity(db = getDB()) {
  const missing = STORES.filter(store => !db.objectStoreNames.contains(store));
  if (missing.length) throw new Error(`Esquema incompleto para auditoría: ${missing.join(', ')}`);
  const snapshot = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readonly');
    const result = {};
    let remaining = STORES.length;
    tx.onerror = () => reject(tx.error || new Error('Falló la lectura de auditoría.'));
    tx.onabort = () => reject(tx.error || new Error('Se abortó la lectura de auditoría.'));
    for (const store of STORES) {
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => {
        result[store] = request.result || [];
        if (--remaining === 0) resolve(result);
      };
    }
  });
  return analyzeReferentialSnapshot(snapshot);
}
