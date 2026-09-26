/**
 * Adaptadores candidatos para validar schema v2 en copias aisladas.
 * No están importados por app.js ni por database.js y nunca abren CETPRO_DB.
 */
import { CONFIG } from '../config.js';
import { assertIsolatedV2DatabaseName } from './schema-v2-group-migration-service.js';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Lectura IndexedDB fallida.'));
  });
}

function assertCandidateDb(db) {
  if (!db || db.name === CONFIG.DB.NAME || db.version !== 2) {
    throw new Error('El runtime candidato solo admite una DB v2 aislada.');
  }
  assertIsolatedV2DatabaseName(db.name);
  if (!db.objectStoreNames.contains('grupos_academicos')) {
    throw new Error('La DB candidata no contiene grupos_academicos.');
  }
}

async function readAll(db, storeName) {
  assertCandidateDb(db);
  return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

async function readOne(db, storeName, key) {
  assertCandidateDb(db);
  return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
}

async function readByIndex(db, storeName, indexName, key) {
  assertCandidateDb(db);
  return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName).getAll(key));
}

export class SchemaV2GroupAssignmentCandidate {
  constructor(db) {
    assertCandidateDb(db);
    this.db = db;
  }

  async listGroups() {
    const [groups, programs, modules] = await Promise.all([
      readAll(this.db, 'grupos_academicos'), readAll(this.db, 'programas'), readAll(this.db, 'modulos')
    ]);
    const programMap = new Map(programs.map(item => [item.id, item]));
    const moduleMap = new Map(modules.map(item => [item.id, item]));
    return groups.map(group => ({
      ...group,
      program: programMap.has(group.programaId) ? { ...programMap.get(group.programaId) } : null,
      module: group.moduloId && moduleMap.has(group.moduloId) ? { ...moduleMap.get(group.moduloId) } : null
    })).sort((a, b) => a.id.localeCompare(b.id));
  }

  async openGroup(groupId) {
    const id = String(groupId || '').trim();
    if (!id) throw new Error('groupId es obligatorio.');
    const group = await readOne(this.db, 'grupos_academicos', id);
    if (!group) throw new Error('El grupo académico no existe.');
    const enrollments = await readByIndex(this.db, 'matriculas', 'grupoId', id);
    return { group: { ...group }, enrollmentIds: enrollments.map(item => item.id).sort(), enrollmentCount: enrollments.length };
  }

  /** 01B solo valida el contrato groupId; las escrituras permanecen deshabilitadas. */
  async assignModule({ groupId, moduloId, dryRun = true } = {}) {
    const id = String(groupId || '').trim();
    const targetId = String(moduloId || '').trim();
    if (!id || !targetId) throw new Error('groupId y moduloId son obligatorios.');
    if (dryRun !== true) throw new Error('SCHEMA-V2-GROUP-01B prohíbe asignaciones; use dryRun.');
    const opened = await this.openGroup(id);
    const module = await readOne(this.db, 'modulos', targetId);
    if (!module || module.programaId !== opened.group.programaId) {
      throw new Error('El módulo no existe o no pertenece al programa del grupo.');
    }
    return { dryRun: true, groupId: id, moduloId: targetId, affectedCount: opened.enrollmentCount, persisted: false };
  }
}

export class SchemaV2DocumentDataCandidate {
  constructor(db) {
    assertCandidateDb(db);
    this.db = db;
  }

  async buildEnrollmentContext(enrollmentId) {
    const id = String(enrollmentId || '').trim();
    if (!id) throw new Error('enrollmentId es obligatorio.');
    const enrollment = await readOne(this.db, 'matriculas', id);
    if (!enrollment) throw new Error('La matrícula no existe.');
    const [student, program, institutionRows] = await Promise.all([
      readOne(this.db, 'estudiantes', enrollment.estudianteId),
      readOne(this.db, 'programas', enrollment.programaId),
      readAll(this.db, 'institucion')
    ]);
    if (!student || !program) throw new Error('El contexto ENROLLMENT tiene referencias incompletas.');
    return {
      institution: { ...(institutionRows[0] || {}) }, student: { ...student }, enrollment: { ...enrollment },
      program: { ...program }, module: {}, period: {}, units: [],
      curriculum: { units: [], subsanacionUnits: [], credits: '', hours: '' },
      source: { enrollmentId: enrollment.id, studentId: student.id, groupId: enrollment.grupoId,
        periodStatus: 'BLOCKED_B007', curriculumStatus: 'BLOCKED_B002' }
    };
  }

  async buildGroupContext(groupId) {
    const id = String(groupId || '').trim();
    if (!id) throw new Error('groupId es obligatorio.');
    const group = await readOne(this.db, 'grupos_academicos', id);
    if (!group) throw new Error('El grupo académico no existe.');
    const enrollments = await readByIndex(this.db, 'matriculas', 'grupoId', id);
    const [program, institutionRows, students] = await Promise.all([
      readOne(this.db, 'programas', group.programaId), readAll(this.db, 'institucion'),
      Promise.all(enrollments.map(item => readOne(this.db, 'estudiantes', item.estudianteId)))
    ]);
    if (!program || students.some(item => !item)) throw new Error('El contexto GROUP tiene referencias incompletas.');
    return {
      group: { ...group }, program: { ...program }, enrollments: enrollments.map(item => ({ ...item })),
      students: students.map(item => ({ ...item })), institution: { ...(institutionRows[0] || {}) },
      module: {}, period: {}, units: [], curriculum: { units: [], subsanacionUnits: [], credits: '', hours: '' },
      source: { groupId: id, sourceGroupCode: group.sourceGroupCode,
        periodStatus: 'BLOCKED_B007', curriculumStatus: 'BLOCKED_B002' }
    };
  }
}

export async function inspectSchemaV2Candidate(db) {
  assertCandidateDb(db);
  const names = ['estudiantes', 'matriculas', 'programas', 'grupos_academicos', 'configuracion'];
  const rows = await Promise.all(names.map(name => readAll(db, name)));
  return Object.fromEntries(names.map((name, index) => [name, rows[index].length]));
}
