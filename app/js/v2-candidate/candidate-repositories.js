import { getV2CandidateDB } from './candidate-db.js';

const resultOf = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

export class CandidateRepository {
  constructor(storeName, dbProvider = getV2CandidateDB) { this.storeName = storeName; this.dbProvider = dbProvider; }
  get db() { return this.dbProvider(); }
  async getById(id) { return (await resultOf(this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(id))) || null; }
  async list() { return resultOf(this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).getAll()); }
  async getByIndex(indexName, key) { return resultOf(this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName).index(indexName).getAll(key)); }
}

export class AcademicGroupRepository extends CandidateRepository {
  constructor(dbProvider) { super('grupos_academicos', dbProvider); }
  listByProgram(programaId) { return this.getByIndex('programaId', programaId); }
  listByPeriod(periodoId) { return this.getByIndex('periodoId', periodoId); }
  /** @deprecated Compatibilidad/procedencia; acciones académicas deben usar groupId. */
  getBySourceGroupCode(code) { return this.getByIndex('sourceGroupCode', code); }
}

export class CandidateEnrollmentRepository extends CandidateRepository {
  constructor(dbProvider) { super('matriculas', dbProvider); }
  getByGroupId(groupId) { return this.getByIndex('grupoId', groupId); }
  /** @deprecated Búsqueda secundaria visible; nunca identidad de contexto. */
  getByVisibleGroupCode(code) { return this.getByIndex('grupoCode', code); }
}
