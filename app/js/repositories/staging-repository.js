/**
 * Repositorio de la Entidad Staging de Importaciones (staging_importaciones)
 * Módulo: M04 - Importación Controlada de BD.zip e Incidencias
 */

import { BaseRepository } from './base-repository.js';

export class StagingRepository extends BaseRepository {
  constructor() {
    super('staging_importaciones');
  }

  /**
   * Obtiene todos los registros de staging pertenecientes a un lote de importación
   * @param {string} loteId
   * @returns {Promise<object[]>}
   */
  async getByLoteId(loteId) {
    return this.getByIndex('loteId', loteId);
  }

  /**
   * Obtiene registros de staging por estado (ej: LISTO, PENDIENTE_REVISION, CONFLICETO)
   * @param {string} estado
   * @returns {Promise<object[]>}
   */
  async getByEstado(estado) {
    return this.getByIndex('estado', estado);
  }

  /**
   * Vacía o limpia un lote de staging específico
   * @param {string} loteId
   */
  async clearLote(loteId) {
    const items = await this.getByLoteId(loteId);
    for (const item of items) {
      await this.delete(item.id, false); // Borrado físico en staging
    }
  }
}
