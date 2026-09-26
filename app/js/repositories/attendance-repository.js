/**
 * Repositorio de Asistencia (AttendanceRepository)
 * Módulo: M06.1 — Cierre de Modelo de Asistencia y Sesiones
 */

import { BaseRepository } from './base-repository.js';
import { getDB, executeTransaction } from '../db/database.js';
import { IntegrityError, OperationalError } from '../services/error-service.js';

export class AttendanceRepository extends BaseRepository {
  constructor(dbOverride = null) {
    super('asistencia');
    this.dbOverride = dbOverride;
  }

  _getDb() {
    return this.dbOverride || getDB();
  }

  /**
   * Obtiene todos los registros de asistencia para una matrícula específica
   * @param {string} matriculaId
   * @returns {Promise<object[]>}
   */
  async getByMatriculaId(matriculaId) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('matriculaId')) {
        const index = store.index('matriculaId');
        const req = index.getAll(matriculaId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByMatriculaId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []).filter(item => item.matriculaId === matriculaId);
          resolve(list);
        };
        req.onerror = (e) => reject(new OperationalError(`Error getByMatriculaId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene registros de asistencia por Unidad Didáctica
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
   * Obtiene registros de asistencia por Fecha
   * @param {string} fecha - Formato ISO (YYYY-MM-DD)
   * @returns {Promise<object[]>}
   */
  async getByFecha(fecha) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('fecha')) {
        const req = store.index('fecha').getAll(fecha);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getByFecha: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.fecha === fecha));
        req.onerror = (e) => reject(new OperationalError(`Error getByFecha: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Obtiene registros de asistencia por Identificador Único de Sesión (sesionId)
   * @param {string} sesionId
   * @returns {Promise<object[]>}
   */
  async getBySessionId(sesionId) {
    const db = this._getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (store.indexNames.contains('sesionId')) {
        const req = store.index('sesionId').getAll(sesionId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(new OperationalError(`Error getBySessionId: ${e.target.error?.message}`));
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).filter(item => item.sesionId === sesionId));
        req.onerror = (e) => reject(new OperationalError(`Error getBySessionId: ${e.target.error?.message}`));
      }
    });
  }

  /**
   * Busca la asistencia de un estudiante para una sesión específica (matriculaId + sesionId)
   * @param {string} matriculaId
   * @param {string} sesionId
   * @returns {Promise<object|null>}
   */
  async getByMatriculaAndSession(matriculaId, sesionId) {
    const records = await this.getByMatriculaId(matriculaId);
    const match = records.find(r => r.sesionId === sesionId && r.estado !== 'ANULADO' && r.estadoLogico !== 'ANULADO');
    return match || null;
  }

  /**
   * Busca la asistencia de un estudiante para un contexto/sesión específico
   * @param {string} matriculaId
   * @param {string} unidadId
   * @param {string} fecha
   * @param {string} [sesionId]
   * @returns {Promise<object|null>}
   */
  async getBySessionKey(matriculaId, unidadId, fecha, sesionId = null) {
    const records = await this.getByMatriculaId(matriculaId);
    if (sesionId) {
      const match = records.find(r => r.sesionId === sesionId && r.estado !== 'ANULADO' && r.estadoLogico !== 'ANULADO');
      return match || null;
    }
    const match = records.find(r => r.unidadId === unidadId && r.fecha === fecha && r.estado !== 'ANULADO' && r.estadoLogico !== 'ANULADO');
    return match || null;
  }

  /**
   * Obtiene la asistencia de un grupo entero para una fecha, unidad didáctica y sesión opcional
   * @param {string[]} matriculaIds - Lista de matriculaIds del grupo
   * @param {string} unidadId
   * @param {string} fecha
   * @param {string} [sesionId]
   * @returns {Promise<object[]>}
   */
  async getByContext(matriculaIds, unidadId, fecha, sesionId = null) {
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
          if (r.unidadId !== unidadId || r.fecha !== fecha) return false;
          if (sesionId && r.sesionId !== sesionId) return false;
          return true;
        });
        resolve(filtered);
      };
      req.onerror = (e) => reject(new OperationalError(`Error getByContext: ${e.target.error?.message}`));
    });
  }

  /**
   * Guarda o actualiza un lote de registros de asistencia en una sola transacción
   * @param {object[]} items
   * @returns {Promise<object[]>}
   */
  async saveBatch(items) {
    if (!Array.isArray(items) || items.length === 0) return [];

    for (const item of items) {
      if (!item.id || !item.matriculaId || !item.sesionId) {
        throw new IntegrityError('Cada registro de asistencia debe incluir id, matriculaId y sesionId.');
      }
    }

    if (this.dbOverride) {
      const db = this.dbOverride;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve(items);
        tx.onerror = (e) => reject(new OperationalError(`Error saveBatch en DB aislada: ${e.target.error?.message}`));
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
