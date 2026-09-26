/** Autoridad GROUP de schema v2. Solo lectura; jamás eleva snapshots v1. */
import { CONFIG } from '../config.js';
import { getDB } from '../db/database.js';
import { IntegrityError, ValidationError } from './error-service.js';

const request = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result || null);
  req.onerror = () => reject(req.error || new Error('Lectura de contexto fallida.'));
});
const present = value => value !== null && value !== undefined && value !== '';

export class AcademicContextAuthorityService {
  constructor(dbProvider = getDB) { this.dbProvider = dbProvider; }

  database(dbOverride = null) {
    const db = dbOverride || this.dbProvider();
    if (!CONFIG.IS_V2_CANDIDATE || db.name === 'CETPRO_DB' || db.version !== 2) {
      throw new ValidationError('La autoridad GROUP v2 requiere una base candidata/laboratorio schema 2; CETPRO_DB está prohibida.');
    }
    return db;
  }

  async resolveGroup(groupId, dbOverride = null) {
    if (!groupId || typeof groupId !== 'string') throw new ValidationError('La operación GROUP requiere groupId; grupoCode no es autoridad.');
    const db = this.database(dbOverride);
    const group = await request(db.transaction('grupos_academicos', 'readonly').objectStore('grupos_academicos').get(groupId));
    if (!group) throw new IntegrityError('INCONSISTENCY: groupId no existe en grupos_academicos.', { groupId });
    return group;
  }

  async resolveEnrollment(matriculaId, dbOverride = null) {
    if (!matriculaId || typeof matriculaId !== 'string') throw new ValidationError('matriculaId es obligatorio.');
    const db = this.database(dbOverride);
    const enrollment = await request(db.transaction('matriculas', 'readonly').objectStore('matriculas').get(matriculaId));
    if (!enrollment) throw new ValidationError('La matrícula no existe en la base candidata aislada.');
    if (!enrollment.grupoId) throw new IntegrityError('INCONSISTENCY: matrícula sin groupId.', { matriculaId });
    const group = await this.resolveGroup(enrollment.grupoId, db);
    this.validateMember(enrollment, group);
    return { enrollment, group, groupId: group.id, programaId: group.programaId,
      moduloId: group.moduloId || null, periodoId: group.periodoId || null };
  }

  validateMember(enrollment, group) {
    if (enrollment.grupoId !== group.id || enrollment.programaId !== group.programaId) {
      throw new IntegrityError('INCONSISTENCY: matrícula y grupo pertenecen a identidades/programas distintos.', { matriculaId: enrollment.id, groupId: group.id });
    }
    for (const field of ['moduloId', 'periodoId']) {
      if (present(enrollment[field]) && present(group[field]) && enrollment[field] !== group[field]) {
        throw new IntegrityError(`INCONSISTENCY: snapshot legacy ${field} diverge de GRUPO_ACADEMICO.`, { matriculaId: enrollment.id, groupId: group.id, field });
      }
    }
  }

  async resolveMembers(groupId, dbOverride = null) {
    const db = this.database(dbOverride);
    const group = await this.resolveGroup(groupId, db);
    const tx = db.transaction('matriculas', 'readonly');
    const store = tx.objectStore('matriculas');
    const members = store.indexNames.contains('grupoId')
      ? await request(store.index('grupoId').getAll(groupId)) || []
      : (await request(store.getAll()) || []).filter(item => item.grupoId === groupId);
    if (!members.length) throw new IntegrityError('INCONSISTENCY: grupo sin matrículas vinculadas.', { groupId });
    members.forEach(member => this.validateMember(member, group));
    return { group, members };
  }
}
