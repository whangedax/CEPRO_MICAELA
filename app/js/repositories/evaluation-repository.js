/**
 * Repositorio de Evaluación (EvaluationRepository)
 * Módulo: M07.1 — Cierre de Contrato e Idempotencia de Evaluación
 */

import { BaseRepository } from './base-repository.js';
import { getDB, executeTransaction } from '../db/database.js';
import { IntegrityError, OperationalError } from '../services/error-service.js';

export class EvaluationRepository extends BaseRepository {
  constructor(dbOverride = null) {
    super('evaluacion');
    this.dbOverride = dbOverride;
  }

  _getDb() {
    return this.dbOverride || getDB();
  }

  /**
   * Obtiene un registro por su ID de clave primaria (soporta dbOverride)
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = (event) => {
        reject(new OperationalError(`Error al consultar ${this.storeName} por ID ${id}: ${event.target.error?.message}`));
      };
    });
  }

  /**
   * Obtiene todos los registros de evaluación para una matrícula específica
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
   * Obtiene registros de evaluación por Unidad Didáctica
   * @param {string} unidadId
   * @returns {Promise<object[]>}
   */
  async getByUnidadId(unidadId) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('unidadId')) {
        const req = store.index('unidadId').getAll(unidadId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByUnidadId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.unidadId === unidadId));
        req.onerror = (e) => reject(new OperationalError(`Error getByUnidadId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene registros de evaluación por Indicador de Logro
   * @param {string} indicadorId
   * @returns {Promise<object[]>}
   */
  async getByIndicadorId(indicadorId) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('indicadorId')) {
        const req = store.index('indicadorId').getAll(indicadorId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByIndicadorId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.indicadorId === indicadorId));
        req.onerror = (e) => reject(new OperationalError(`Error getByIndicadorId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene registros de evaluación pertenecientes a un batchId específico (Idempotencia)
   * @param {string} batchId
   * @returns {Promise<object[]>}
   */
  async getByBatchId(batchId) {
    if (!batchId) return [];
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('batchId')) {
        const req = store.index('batchId').getAll(batchId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByBatchId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.batchId === batchId));
        req.onerror = (e) => reject(new OperationalError(`Error getByBatchId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene registros por payloadHash
   * @param {string} payloadHash
   * @returns {Promise<object[]>}
   */
  async getByPayloadHash(payloadHash) {
    if (!payloadHash) return [];
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('payloadHash')) {
        const req = store.index('payloadHash').getAll(payloadHash);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByPayloadHash: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.payloadHash === payloadHash));
        req.onerror = (e) => reject(new OperationalError(`Error getByPayloadHash: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene la lista de evaluaciones para una matrícula e indicador específico
   * @param {string} matriculaId
   * @param {string} indicadorId
   * @returns {Promise<object[]>}
   */
  async getByMatriculaAndIndicador(matriculaId, indicadorId) {
    const records = await this.getByMatriculaId(matriculaId);
    return records.filter(r => r.indicadorId === indicadorId && r.estado !== 'ANULADO' && r.estadoLogico !== 'ANULADO');
  }

  /**
   * Obtiene la lista de evaluaciones para un contexto de grupo, unidad, indicador y batchId opcional
   * @param {string[]} matriculaIds - Lista de matriculaIds del grupo
   * @param {string} unidadId
   * @param {string} indicadorId
   * @param {string} [batchId]
   * @returns {Promise<object[]>}
   */
  async getByContext(matriculaIds, unidadId, indicadorId, batchId = null) {
    if (!Array.isArray(matriculaIds) || matriculaIds.length === 0) return [];
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        const set = new Set(matriculaIds);
        const filtered = all.filter(r => {
          if (!set.has(r.matriculaId)) return false;
          if (r.unidadId !== unidadId || r.indicadorId !== indicadorId) return false;
          if (batchId && r.batchId !== batchId) return false;
          return true;
        });
        resolve(filtered);
      };
      req.onerror = (e) => reject(new OperationalError(`Error getByContext: ${e.target.error?.message}`));
    });
  }

  /**
   * Guarda un lote de evaluaciones en una sola transacción ATÓMICA todo-o-nada
   * @param {object[]} items
   * @param {boolean} [simulateFailure] - Opciones para pruebas de rollback
   * @returns {Promise<object[]>}
   */
  async saveBatch(items, simulateFailure = false) {
    if (!Array.isArray(items) || items.length === 0) return [];

    for (const item of items) {
      if (!item.id || !item.matriculaId || !item.unidadId || !item.indicadorId) {
        throw new IntegrityError('Cada registro de evaluación debe incluir id, matriculaId, unidadId e indicadorId.');
      }
    }

    if (this.dbOverride) {
      const db = this.dbOverride;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        try {
          for (let i = 0; i < items.length; i++) {
            if (simulateFailure && i === items.length - 1) {
              tx.abort();
              return reject(new OperationalError('Fallo técnico simulado en la persistencia del lote. Rollback ejecutado.'));
            }
            store.put(items[i]);
          }
        } catch (e) {
          tx.abort();
          return reject(new OperationalError(`Error en transacción saveBatch: ${e.message}`));
        }

        tx.oncomplete = () => resolve(items);
        tx.onerror = (e) => reject(new OperationalError(`Error saveBatch en DB aislada: ${e.target.error?.message}`));
        tx.onabort = () => reject(new OperationalError('Transacción abortada. Rollback ejecutado.'));
      });
    }

    await executeTransaction(this.storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(this.storeName);
      for (const item of items) {
        store.put(item);
      }
    });

    return items;
  }
}
