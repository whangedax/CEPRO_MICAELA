/**
 * Repositorio de la Entidad Estudiantes
 * Módulo: M03 - Estudiantes
 */

import { BaseRepository } from './base-repository.js';

/**
 * Normaliza una cadena para búsquedas insensibles a mayúsculas, minúsculas y tildes
 * SIN modificar el valor original almacenado.
 * @param {string} str
 * @returns {string}
 */
export function normalizeSearchString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export class StudentRepository extends BaseRepository {
  constructor() {
    super('estudiantes');
  }

  /**
   * Busca un estudiante por tipo y número de documento exacto
   * @param {string} tipoDocumento
   * @param {string} numeroDocumento
   * @returns {Promise<object|null>}
   */
  async getByDocument(tipoDocumento, numeroDocumento) {
    if (!numeroDocumento) return null;
    const cleanDoc = String(numeroDocumento).trim();
    const list = await this.list(e => {
      const matchDoc = String(e.numeroDocumento || '').trim() === cleanDoc;
      const matchType = !tipoDocumento || e.tipoDocumento === tipoDocumento;
      return matchDoc && matchType && e.estado !== 'ANULADO';
    });
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Búsqueda avanzada por documento, apellidos o nombres tolerando tildes y mayúsculas
   * @param {string} queryText
   * @param {object} [filters]
   * @returns {Promise<object[]>}
   */
  async searchStudents(queryText = '', filters = {}) {
    const qNorm = normalizeSearchString(queryText);

    return this.list(student => {
      // Filtrar por estado si se especifica
      if (filters.estado && student.estado !== filters.estado) {
        return false;
      }
      if (student.estado === 'ANULADO') {
        return false;
      }

      // Filtrar por tipo de documento si se especifica
      if (filters.tipoDocumento && student.tipoDocumento !== filters.tipoDocumento) {
        return false;
      }

      if (!qNorm) return true;

      // Concatenar campos para la búsqueda normalizada
      const docNorm = normalizeSearchString(student.numeroDocumento);
      const patNorm = normalizeSearchString(student.apellidoPaterno);
      const matNorm = normalizeSearchString(student.apellidoMaterno);
      const nomNorm = normalizeSearchString(student.nombres);
      const fullNorm = normalizeSearchString(student.nombresCompletoOriginal);

      return docNorm.includes(qNorm) ||
             patNorm.includes(qNorm) ||
             matNorm.includes(qNorm) ||
             nomNorm.includes(qNorm) ||
             fullNorm.includes(qNorm);
    });
  }
}
