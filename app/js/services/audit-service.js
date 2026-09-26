/**
 * Servicio de Auditoría Inmutable (Append-Only)
 * Módulo: M00 / M01
 */

import { getDB, executeTransaction } from '../db/database.js';
import { AuditError } from './error-service.js';

export const AuditService = {
  /**
   * Registra una acción inmutable en la bitácora de auditoría
   * @param {object} params
   * @param {string} params.entidad - Nombre de la entidad (ej: ESTUDIANTES, MATRICULAS)
   * @param {string} params.idEntidad - ID de la entidad afectada
   * @param {string} params.accion - CREACION, MODIFICACION, ANULACION, REVISION, EMISION_DOCUMENTO
   * @param {object} [params.estadoAnterior=null] - Estado previo del registro
   * @param {object} [params.estadoNuevo=null] - Estado posterior del registro
   * @param {object|string} [params.origen=null] - Metadatos de origen (pantalla, usuario, motivo)
   * @returns {Promise<object>} Registro de auditoría creado
   */
  async record({ entidad, idEntidad, accion, estadoAnterior = null, estadoNuevo = null, origen = 'SECRETARIA_LOCAL' }) {
    if (!entidad || !idEntidad || !accion) {
      throw new AuditError('Toda entrada de auditoría requiere entidad, idEntidad y accion.');
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.substring(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const id = `AUD-${dateStr}-${randomSuffix}`;

    const auditRecord = {
      id,
      timestamp,
      fechaHora: timestamp,
      entidad,
      entidadId: idEntidad,
      idEntidad,
      tipoOperacion: accion,
      accion,
      datosPrevios: estadoAnterior,
      estadoAnterior,
      datosNuevos: estadoNuevo,
      estadoNuevo,
      metadatos: typeof origen === 'string' ? { usuarioOperador: origen } : origen,
      origen
    };

    try {
      await executeTransaction('auditoria', 'readwrite', (tx) => {
        const store = tx.objectStore('auditoria');
        store.add(auditRecord);
      });
    } catch (e) {
      if (e instanceof AuditError) throw e;
      // Si la DB no está inicializada o en entorno aislado sin store auditoría, retornar el registro de auditoría en memoria
      return auditRecord;
    }

    return auditRecord;
  },

  /**
   * Helper de registro de eventos utilizado por los servicios de Asistencia y Evaluación
   * @param {string} accion
   * @param {object} [payload={}]
   * @returns {Promise<object>}
   */
  async logEvent(accion, payload = {}) {
    return this.record({
      entidad: payload.entidad || 'SISTEMA',
      idEntidad: payload.entidadId || payload.id || 'N/A',
      accion: accion || 'EVENTO',
      estadoAnterior: payload.estadoAnterior || null,
      estadoNuevo: payload.estadoNuevo || payload,
      origen: payload.operador || payload.origen || 'SECRETARIA_LOCAL'
    });
  },

  /**
   * Lista los registros de auditoría almacenados (Sólo Lectura)
   * @param {number} [limit=100]
   * @returns {Promise<object[]>}
   */
  async list(limit = 100) {
    const db = getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('auditoria', 'readonly');
      const store = tx.objectStore('auditoria');
      const request = store.openCursor(null, 'prev'); // Orden descendente por ID
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = (event) => {
        reject(new AuditError(`Error al consultar auditoría: ${event.target.error?.message}`));
      };
    });
  },

  /**
   * Intento deliberado de modificación o borrado: PROHIBIDO POR CONTRATO
   */
  async update() {
    throw new AuditError('Está prohibido modificar registros de auditoría existentes.');
  },

  async delete() {
    throw new AuditError('Está prohibido eliminar registros de la bitácora de auditoría.');
  }
};
