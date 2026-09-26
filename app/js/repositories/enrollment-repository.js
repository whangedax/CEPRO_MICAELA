/**
 * Repositorio de la Entidad Matrículas (EnrollmentRepository)
 * Módulo: M05 — Matrículas
 */

import { BaseRepository } from './base-repository.js';
import { normalizeSearchString } from './student-repository.js';
import { CONFIG } from '../config.js';
import { getDB } from '../db/database.js';
import { AcademicContextAuthorityService } from '../services/academic-context-authority-service.js';
import { IntegrityError } from '../services/error-service.js';

export class EnrollmentRepository extends BaseRepository {
  constructor() {
    super('matriculas');
  }

  /**
   * Obtiene todas las matrículas registradas para un estudiante
   * @param {string} estudianteId
   * @returns {Promise<object[]>}
   */
  async getByStudentId(estudianteId) {
    if (!estudianteId) return [];
    return this.getByIndex('estudianteId', estudianteId);
  }

  /**
   * Obtiene todas las matrículas para un código de grupo técnico
   * @param {string} grupoCode
   * @returns {Promise<object[]>}
   */
  async getByGrupoCode(grupoCode) {
    if (!grupoCode) return [];
    return this.getByIndex('grupoCode', grupoCode);
  }

  /** Relación autoritativa de schema v2. */
  async getByGroupId(groupId) {
    if (!groupId) return [];
    return this.getByIndex('grupoId', groupId);
  }

  /**
   * Búsqueda avanzada de matrículas con filtros
   * @param {string} queryText
   * @param {object} filters
   * @returns {Promise<object[]>}
   */
  async searchEnrollments(queryText = '', filters = {}) {
    const qNorm = normalizeSearchString(queryText);

    const rows = await this.list(enrollment => {
      // Filtros exactos
      if (filters.programaId && enrollment.programaId !== filters.programaId) {
        return false;
      }
      if (filters.grupoCode && enrollment.grupoCode !== filters.grupoCode) {
        return false;
      }
      if (filters.groupId && enrollment.grupoId !== filters.groupId) {
        return false;
      }
      if (filters.turno && enrollment.turno !== filters.turno) {
        return false;
      }
      if (filters.modalidad && enrollment.modalidad !== filters.modalidad) {
        return false;
      }
      if (filters.estado && enrollment.estado !== filters.estado) {
        return false;
      }
      if (!CONFIG.IS_V2_CANDIDATE && filters.moduloPendiente === true && enrollment.moduloId !== null) {
        return false;
      }
      if (!CONFIG.IS_V2_CANDIDATE && filters.periodoPendiente === true && enrollment.periodoId !== null) {
        return false;
      }

      if (!qNorm) return true;

      // Buscar por estudianteNombre, estudianteDocumento, idMatricula, programaNombre, grupoCode
      const docNorm = normalizeSearchString(enrollment.estudianteDocumento || '');
      const nomNorm = normalizeSearchString(enrollment.estudianteNombreCompleto || '');
      const idNorm = normalizeSearchString(enrollment.id || '');
      const progNorm = normalizeSearchString(enrollment.programaNombre || '');
      const grpNorm = normalizeSearchString(enrollment.grupoCode || '');

      return docNorm.includes(qNorm) ||
             nomNorm.includes(qNorm) ||
             idNorm.includes(qNorm) ||
             progNorm.includes(qNorm) ||
             grpNorm.includes(qNorm);
    });
    if (!CONFIG.IS_V2_CANDIDATE || (!filters.moduloPendiente && !filters.periodoPendiente)) return rows;
    const db = getDB();
    const groups = await new Promise((resolve, reject) => {
      const req = db.transaction('grupos_academicos', 'readonly').objectStore('grupos_academicos').getAll();
      req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
    });
    const byId = new Map(groups.map(group => [group.id, group]));
    const authority = new AcademicContextAuthorityService();
    return rows.filter(enrollment => {
      const group = byId.get(enrollment.grupoId);
      if (!group) throw new IntegrityError('INCONSISTENCY: matrícula tiene groupId inexistente en filtro v2.');
      authority.validateMember(enrollment, group);
      return (!filters.moduloPendiente || !group.moduloId) && (!filters.periodoPendiente || !group.periodoId);
    });
  }
}
