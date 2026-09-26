import { SCHEMA_V2_STORE_NAMES } from '../db/schema-v2-design.js';
import { canonicalize } from '../services/storage-service.js';
import { SchemaV2BackupLabService, readV2Snapshot } from '../services/schema-v2-backup-lab-service.js';
import { AcademicGroupRepository, CandidateEnrollmentRepository, CandidateRepository } from './candidate-repositories.js';
import { getV2CandidateDB, V2_CANDIDATE_CONFIG } from './candidate-db.js';

const present = value => value !== null && value !== undefined && String(value).trim() !== '';
const resultOf = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

export function assertGroupContextKey(input) {
  if (!input?.groupId || input.groupCode) throw new Error('Las acciones académicas v2 exigen groupId y prohíben groupCode como primary context key.');
}

export function detectDualSourceInconsistencies(group, enrollments) {
  const issues = [];
  for (const enrollment of enrollments) {
    if (enrollment.grupoId !== group.id || enrollment.programaId !== group.programaId) {
      issues.push({ code: 'GROUP_ENROLLMENT_IDENTITY_INCONSISTENCY', groupId: group.id, enrollmentId: enrollment.id });
    }
    if (present(group.moduloId) && present(enrollment.moduloId) && group.moduloId !== enrollment.moduloId) {
      issues.push({ code: 'GROUP_ENROLLMENT_MODULE_INCONSISTENCY', groupId: group.id, enrollmentId: enrollment.id });
    }
    if (present(group.periodoId) && present(enrollment.periodoId) && group.periodoId !== enrollment.periodoId) {
      issues.push({ code: 'GROUP_ENROLLMENT_PERIOD_INCONSISTENCY', groupId: group.id, enrollmentId: enrollment.id });
    }
  }
  return issues;
}

export class V2GroupAssignmentService {
  constructor(dbProvider = getV2CandidateDB) {
    this.dbProvider = dbProvider;
    this.groups = new AcademicGroupRepository(dbProvider);
    this.enrollments = new CandidateEnrollmentRepository(dbProvider);
  }
  async listGroups() {
    const [groups, enrollments, programs, modules, periods] = await Promise.all([
      this.groups.list(), this.enrollments.list(), new CandidateRepository('programas', this.dbProvider).list(),
      new CandidateRepository('modulos', this.dbProvider).list(), new CandidateRepository('periodos', this.dbProvider).list()
    ]);
    const counts = new Map();
    enrollments.forEach(item => counts.set(item.grupoId, (counts.get(item.grupoId) || 0) + 1));
    const programMap = new Map(programs.map(item => [item.id, item]));
    const moduleMap = new Map(modules.map(item => [item.id, item]));
    const periodMap = new Map(periods.map(item => [item.id, item]));
    return groups.map(group => ({ ...group, enrollmentCount: counts.get(group.id) || 0,
      contextInconsistencies: detectDualSourceInconsistencies(group, enrollments.filter(item => item.grupoId === group.id)),
      program: programMap.get(group.programaId) || null, module: group.moduloId ? moduleMap.get(group.moduloId) || null : null,
      period: group.periodoId ? periodMap.get(group.periodoId) || null : null })).sort((a, b) => a.id.localeCompare(b.id));
  }
  async getGroup(groupId) {
    assertGroupContextKey({ groupId });
    const group = await this.groups.getById(groupId);
    if (!group) throw new Error('Grupo académico inexistente.');
    const enrollments = await this.enrollments.getByGroupId(groupId);
    const inconsistencies = detectDualSourceInconsistencies(group, enrollments);
    return { group, enrollments, inconsistencies };
  }
  async assignModule({ groupId, moduloId, confirmed = false, operator = 'SECRETARIA_LOCAL', simulateFailure = false,
    changeConfirmed = false, expectedProgramId, expectedCount, expectedPreviousModuloId, expectedPeriodId } = {}) {
    assertGroupContextKey({ groupId });
    if (!moduloId || confirmed !== true) throw new Error('La asignación requiere módulo y confirmación explícita.');
    const db = this.dbProvider();
    return new Promise((resolve, reject) => {
      if (db.name === 'CETPRO_DB' || db.version !== 2) return reject(new Error('Asignación v2 prohibida fuera de DB aislada schema2.'));
      const tx = db.transaction(['grupos_academicos', 'matriculas', 'modulos', 'auditoria'], 'readwrite');
      const groupReq = tx.objectStore('grupos_academicos').get(groupId);
      const moduleReq = tx.objectStore('modulos').get(moduloId);
      const memberReq = tx.objectStore('matriculas').index('grupoId').getAll(groupId);
      let pending = 3; let failure = null; let result = null;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const validate = () => {
        if (--pending) return;
        const group = groupReq.result; const module = moduleReq.result; const members = memberReq.result || [];
        if (!group || !module || module.programaId !== group.programaId || !members.length) return abort(new Error('Grupo/módulo/matrículas incompatibles.'));
        if (group.estado === 'REVIEW_REQUIRED' || group.estado === 'INCONSISTENT') return abort(new Error('Grupo requiere revisión/integridad antes de asignación.'));
        if (expectedProgramId && group.programaId !== expectedProgramId) return abort(new Error('STALENESS: programa cambió.'));
        if (Number.isInteger(expectedCount) && members.length !== expectedCount) return abort(new Error('STALENESS: impacto cambió.'));
        if (expectedPreviousModuloId !== undefined && (group.moduloId || null) !== expectedPreviousModuloId) return abort(new Error('STALENESS: módulo anterior cambió.'));
        if (expectedPeriodId !== undefined && (group.periodoId || null) !== expectedPeriodId) return abort(new Error('STALENESS: periodo cambió.'));
        if (group.moduloId && !changeConfirmed) return abort(new Error('Cambio de módulo exige confirmación específica.'));
        if (detectDualSourceInconsistencies(group, members).length || detectDualSourceInconsistencies({ ...group, moduloId }, members).length) {
          return abort(new Error('INCONSISTENCY: miembros/snapshots divergen del grupo actual o propuesto.'));
        }
        const timestamp = new Date().toISOString();
        const updated = { ...group, moduloId, moduleAssignmentStatus: 'ASSIGNED', updatedAt: timestamp };
        tx.objectStore('grupos_academicos').put(updated);
        if (simulateFailure === true) return abort(new Error('SIMULATED_AFTER_GROUP_PUT: transacción abortada para probar rollback.'));
        const auditId = `AUD-V2-GROUP-${crypto.randomUUID()}`;
        tx.objectStore('auditoria').add({ id: auditId, timestamp, entidad: 'GRUPO_ACADEMICO', entidadId: groupId,
          accion: 'ASIGNACION_MODULO_GRUPO_V2', estadoAnterior: { moduloId: group.moduloId || null },
          estadoNuevo: { moduloId }, origen: { usuarioOperador: operator, build: V2_CANDIDATE_CONFIG.BUILD } });
        result = { groupId, moduloId, auditId, affectedEnrollments: 0, authority: 'grupos_academicos' };
      };
      groupReq.onsuccess = validate; moduleReq.onsuccess = validate; memberReq.onsuccess = validate;
      groupReq.onerror = () => abort(groupReq.error); moduleReq.onerror = () => abort(moduleReq.error);
      memberReq.onerror = () => abort(memberReq.error);
      tx.oncomplete = () => resolve(result); tx.onabort = () => reject(failure || tx.error || new Error('Asignación abortada.'));
    });
  }
}

export class V2DocumentDataService {
  constructor(dbProvider = getV2CandidateDB) { this.dbProvider = dbProvider; }
  repo(name) { return new CandidateRepository(name, this.dbProvider); }
  async buildEnrollmentContext(matriculaId) {
    const enrollment = await this.repo('matriculas').getById(matriculaId);
    if (!enrollment?.grupoId) throw new Error('Matrícula sin grupoId v2.');
    const [student, program, group, institutionRows] = await Promise.all([
      this.repo('estudiantes').getById(enrollment.estudianteId), this.repo('programas').getById(enrollment.programaId),
      this.repo('grupos_academicos').getById(enrollment.grupoId), this.repo('institucion').list()
    ]);
    if (!student || !program || !group || group.programaId !== enrollment.programaId) throw new Error('Contexto ENROLLMENT v2 inconsistente.');
    const dualSourceIssues = detectDualSourceInconsistencies(group, [enrollment]);
    if (dualSourceIssues.length) throw new Error(dualSourceIssues[0].code);
    const module = group.moduloId ? await this.repo('modulos').getById(group.moduloId) : null;
    const period = group.periodoId ? await this.repo('periodos').getById(group.periodoId) : null;
    return { institution: institutionRows[0] || {}, student, enrollment, group, program, module: module || {}, period: period || {},
      units: [], curriculum: { units: [], subsanacionUnits: [], credits: '', hours: '' },
      source: { enrollmentId: enrollment.id, groupId: group.id, sourceGroupCode: group.sourceGroupCode,
        periodStatus: period ? 'CONFIRMED' : 'BLOCKED_B007', curriculumStatus: 'BLOCKED_B002' } };
  }
  async buildGroupContext(groupId) {
    assertGroupContextKey({ groupId });
    const service = new V2GroupAssignmentService(this.dbProvider);
    const { group, enrollments, inconsistencies } = await service.getGroup(groupId);
    if (inconsistencies.length) throw new Error(inconsistencies[0].code);
    const [institutionRows, program, module, period, students] = await Promise.all([
      this.repo('institucion').list(), this.repo('programas').getById(group.programaId),
      group.moduloId ? this.repo('modulos').getById(group.moduloId) : null,
      group.periodoId ? this.repo('periodos').getById(group.periodoId) : null,
      Promise.all(enrollments.map(item => this.repo('estudiantes').getById(item.estudianteId)))
    ]);
    if (!program || students.some(item => !item)) throw new Error('Contexto GROUP v2 incompleto.');
    return { group, institution: institutionRows[0] || {}, program, module: module || {}, period: period || {}, enrollments, students,
      units: [], curriculum: { units: [], subsanacionUnits: [], credits: '', hours: '' },
      source: { groupId, sourceGroupCode: group.sourceGroupCode, periodStatus: period ? 'CONFIRMED' : 'BLOCKED_B007', curriculumStatus: 'BLOCKED_B002' } };
  }
}

export class V2AcademicIdentityGuard {
  constructor(dbProvider = getV2CandidateDB) { this.dbProvider = dbProvider; }
  async assertMembership({ groupId, enrollmentIds }) {
    assertGroupContextKey({ groupId });
    const members = await new CandidateEnrollmentRepository(this.dbProvider).getByGroupId(groupId);
    const memberIds = new Set(members.map(item => item.id));
    if (!Array.isArray(enrollmentIds) || enrollmentIds.some(id => !memberIds.has(id))) throw new Error('Matrícula ajena al grupo académico.');
    return { groupId, verified: enrollmentIds.length, writeAllowed: false };
  }
  async registerBatchAttendance(input) { await this.assertMembership(input); throw new Error('B-002/B-004/B-007: asistencia candidata sin escrituras.'); }
  async registerBatchEvaluation(input) { await this.assertMembership(input); throw new Error('B-003: evaluación candidata sin notas.'); }
}

export class V2ReadinessService {
  async diagnoseGroup(groupId) {
    const context = await new V2DocumentDataService().buildGroupContext(groupId);
    const blockedRules = ['B-002', 'B-003', 'B-004', 'B-005', 'B-007'];
    return { groupId, contextResolved: true, moduleAssigned: Boolean(context.group.moduloId), periodAssigned: Boolean(context.group.periodoId),
      curriculumUnits: context.curriculum.units.length, blockedRules, academicClosureAllowed: false };
  }
}

export async function auditV2Candidate(db = getV2CandidateDB()) {
  const snapshot = await readV2Snapshot(db);
  const issues = [];
  const ids = name => new Set(snapshot[name].map(item => item.id));
  const students = ids('estudiantes'), programs = ids('programas'), modules = ids('modulos'), periods = ids('periodos');
  const enrollments = new Map(snapshot.matriculas.map(item => [item.id, item]));
  const groups = new Map(snapshot.grupos_academicos.map(item => [item.id, item]));
  const units = ids('unidades'), indicators = ids('indicadores');
  const add = (code, store, id) => issues.push({ code, store, id });
  for (const group of groups.values()) {
    if (!programs.has(group.programaId)) add('GROUP_PROGRAM_ORPHAN', 'grupos_academicos', group.id);
    if (group.moduloId && !modules.has(group.moduloId)) add('GROUP_MODULE_ORPHAN', 'grupos_academicos', group.id);
    if (group.periodoId && !periods.has(group.periodoId)) add('GROUP_PERIOD_ORPHAN', 'grupos_academicos', group.id);
  }
  for (const enrollment of enrollments.values()) {
    const group = groups.get(enrollment.grupoId);
    if (!students.has(enrollment.estudianteId)) add('ENROLLMENT_STUDENT_ORPHAN', 'matriculas', enrollment.id);
    if (!programs.has(enrollment.programaId)) add('ENROLLMENT_PROGRAM_ORPHAN', 'matriculas', enrollment.id);
    if (!group) add('ENROLLMENT_GROUP_ORPHAN', 'matriculas', enrollment.id);
    else if (group.programaId !== enrollment.programaId) add('GROUP_PROGRAM_MISMATCH', 'matriculas', enrollment.id);
    detectDualSourceInconsistencies(group || {}, [enrollment]).forEach(issue => issues.push({ ...issue, store: 'matriculas', id: enrollment.id }));
  }
  for (const store of ['matricula_unidades', 'asistencia', 'evaluacion', 'efsrt']) for (const row of snapshot[store]) {
    const isAttendanceSession = store === 'asistencia' && row.recordType === 'ATTENDANCE_SESSION';
    if (!isAttendanceSession && !enrollments.has(row.matriculaId)) add('ACADEMIC_ENROLLMENT_ORPHAN', store, row.id);
    if (row.grupoId && !groups.has(row.grupoId)) add('ACADEMIC_GROUP_ORPHAN', store, row.id);
    if (row.unidadId && !units.has(row.unidadId)) add('ACADEMIC_UNIT_ORPHAN', store, row.id);
    if (row.indicadorId && !indicators.has(row.indicadorId)) add('ACADEMIC_INDICATOR_ORPHAN', store, row.id);
  }
  return { readOnly: true, schemaVersion: 2, issueCount: issues.length, issues,
    counts: Object.fromEntries(SCHEMA_V2_STORE_NAMES.map(name => [name, snapshot[name].length])) };
}

export const V2CandidateStorageService = {
  exportBackup(db = getV2CandidateDB(), origin = 'APP_V2_CANDIDATE_USER_EXPORT') { return SchemaV2BackupLabService.exportBackup(db, origin); },
  inspectBackup(source) { return SchemaV2BackupLabService.inspectBackup(source); },
  async restoreBackup(source, db = getV2CandidateDB(), { confirmed = false, beforeWrite } = {}) {
    if (confirmed !== true) throw new Error('Restore v2 candidato requiere confirmación explícita.');
    const sourceInfo = await this.inspectBackup(source);
    const targetEnvironment = db.name === 'CETPRO_V2_DEMO' ? 'DEMO' : 'REAL';
    const sourceEnvironment = sourceInfo.environment || 'REAL';
    if (sourceEnvironment !== targetEnvironment) {
      const error = new Error(`BACKUP_ENVIRONMENT_MISMATCH: respaldo ${sourceEnvironment} no puede restaurarse sobre ${targetEnvironment}.`);
      error.code = 'BACKUP_ENVIRONMENT_MISMATCH';
      throw error;
    }
    const preBackup = await this.exportBackup(db, 'PRE_RESTORE_BACKUP_V2_CANDIDATE');
    const preInfo = await this.inspectBackup(preBackup);
    if (typeof beforeWrite !== 'function' || await beforeWrite(preBackup, preInfo) !== true) throw new Error('PRE_RESTORE_BACKUP no aceptado.');
    const result = await SchemaV2BackupLabService.restoreBackup(source, db);
    const audit = await auditV2Candidate(db);
    if (audit.issueCount) throw new Error('Readback restaurado tiene incidencias.');
    return { ...result, preRestoreChecksum: preInfo.checksum, auditIssueCount: 0 };
  },
  async semanticHash(db = getV2CandidateDB()) {
    const text = canonicalize(await readV2Snapshot(db));
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
};
