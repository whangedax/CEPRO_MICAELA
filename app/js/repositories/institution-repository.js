/**
 * Repositorio de la Entidad Institución
 * Módulo: M02 - Catálogos y Configuración
 */

import { BaseRepository } from './base-repository.js';

export class InstitutionRepository extends BaseRepository {
  constructor() {
    super('institucion');
  }

  /**
   * Obtiene el registro único institucional
   * @returns {Promise<object|null>}
   */
  async getInstitution() {
    const list = await this.list();
    return list.length > 0 ? list[0] : null;
  }
}
