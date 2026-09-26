/**
 * Repositorio de Configuración Local
 * Módulo: M02 - Catálogos y Configuración
 */

import { BaseRepository } from './base-repository.js';

export class ConfigRepository extends BaseRepository {
  constructor() {
    super('configuracion');
  }

  async getVal(clave) {
    const item = await this.getById(clave);
    return item ? item.valor : null;
  }

  async setVal(clave, valor, descripcion = '') {
    const record = {
      clave,
      id: clave,
      valor,
      descripcion,
      actualizadoEn: new Date().toISOString()
    };
    return this.update(record);
  }
}
