/**
 * Repositorio de EFSRT (EfsrtRepository)
 * Módulo: M08 — Experiencias Formativas en Situaciones Reales de Trabajo
 */

import { BaseRepository } from './base-repository.js';
import { getDB, executeTransaction } from '../db/database.js';
import { OperationalError } from '../services/error-service.js';

export class EfsrtRepository extends BaseRepository {
  constructor(dbOverride = null) {
    super('efsrt');
    this.dbOverride = dbOverride;
  }

  _getDb() {
    return this.dbOverride || getDB();
  }

  /**
   * Obtiene un registro por su ID primario
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(new OperationalError(`Error al consultar ${this.storeName} por ID ${id}: ${e.target.error?.message}`));
    });
  }

  /**
   * Obtiene todos los registros EFSRT para una matrícula específica
   * @param {string} matriculaId
   * @returns {Promise<object[]>}
   */
  async getByMatriculaId(matriculaId) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('matriculaId')) {
        const req = store.index('matriculaId').getAll(matriculaId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByMatriculaId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.matriculaId === matriculaId));
        req.onerror = (e) => reject(new OperationalError(`Error getByMatriculaId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene todos los registros EFSRT para un módulo específico
   * @param {string} moduloId
   * @returns {Promise<object[]>}
   */
  async getByModuloId(moduloId) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('moduloId')) {
        const req = store.index('moduloId').getAll(moduloId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByModuloId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.moduloId === moduloId));
        req.onerror = (e) => reject(new OperationalError(`Error getByModuloId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene registros EFSRT por matrícula y módulo
   * @param {string} matriculaId
   * @param {string} moduloId
   * @returns {Promise<object[]>}
   */
  async getByMatriculaAndModulo(matriculaId, moduloId) {
    const list = await this.getByMatriculaId(matriculaId);
    return list.filter(item => item.moduloId === moduloId && item.estado !== 'ANULADO' && item.estadoLogico !== 'ANULADO');
  }

  /**
   * Guarda o actualiza un registro EFSRT
   * @param {object} record
   * @returns {Promise<object>}
   */
  async saveRecord(record) {
    const db = this._getDb();
    if (this.dbOverride) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(record);
        tx.oncomplete = () => resolve(record);
        tx.onerror = (e) => reject(new OperationalError(`Error al guardar EFSRT en DB aislada: ${e.target.error?.message}`));
      });
    }

    await executeTransaction(this.storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(this.storeName);
      store.put(record);
    });
    return record;
  }
}
