/**
 * Repositorio de la Entidad Programas de Estudio
 * Módulo: M02 - Catálogos y Configuración
 */

import { BaseRepository } from './base-repository.js';

export class ProgramRepository extends BaseRepository {
  constructor() {
    super('programas');
  }

  /**
   * Obtiene un programa por su código técnico
   * @param {string} codigo
   * @returns {Promise<object|null>}
   */
  async getByCode(codigo) {
    const results = await this.getByIndex('codigo', codigo);
    return results.length > 0 ? results[0] : null;
  }
}
