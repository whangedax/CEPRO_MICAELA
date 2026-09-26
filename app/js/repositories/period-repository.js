/**
 * Repositorio de la Entidad Periodos Académicos
 * Módulo: M02 - Catálogos y Configuración
 */

import { BaseRepository } from './base-repository.js';

export class PeriodRepository extends BaseRepository {
  constructor() {
    super('periodos');
  }

  /**
   * Obtiene un periodo académico por su nombre
   * @param {string} nombre
   * @returns {Promise<object|null>}
   */
  async getByName(nombre) {
    const results = await this.getByIndex('nombre', nombre);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Obtiene el periodo actualmente activo
   * @returns {Promise<object|null>}
   */
  async getActivePeriod() {
    const list = await this.list(p => p.estado === 'ACTIVO');
    return list.length > 0 ? list[0] : null;
  }
}
