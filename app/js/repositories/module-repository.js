/**
 * Repositorio de la Entidad Módulos Curriculares
 * Módulo: M02 - Catálogos y Configuración
 */

import { BaseRepository } from './base-repository.js';

export class ModuleRepository extends BaseRepository {
  constructor() {
    super('modulos');
  }

  /**
   * Obtiene todos los módulos asociados a un programa
   * @param {string} programaId
   * @returns {Promise<object[]>}
   */
  async getByProgramId(programaId) {
    return this.getByIndex('programaId', programaId);
  }
}
