/**
 * Servicio de Control de Prerrequisitos y Preparación Académica (AcademicReadinessService)
 * Módulo: M05.3 — Configuración Académica Diferida y Control de Prerrequisitos
 */

import { getDB } from '../db/database.js';
import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { PeriodRepository } from '../repositories/period-repository.js';
import { ModuleRepository } from '../repositories/module-repository.js';
import { FILE_GROUP_MAP } from './enrollment-service.js';
import { OFFICIAL_CATALOG_SEED } from './catalog-service.js';
import { CONFIG } from '../config.js';
import { AcademicContextAuthorityService } from './academic-context-authority-service.js';

export const PENDING_PREREQUISITES = {
  PERIODO_ACADEMICO_PENDIENTE: 'PERIODO_ACADEMICO_PENDIENTE',
  MODULO_POR_GRUPO_PENDIENTE: 'MODULO_POR_GRUPO_PENDIENTE',
  UNIDADES_DIDACTICAS_PENDIENTES: 'UNIDADES_DIDACTICAS_PENDIENTES'
};

export class AcademicReadinessService {
  constructor() {
    this.enrollmentRepo = new EnrollmentRepository();
    this.periodRepo = new PeriodRepository();
    this.moduleRepo = new ModuleRepository();
  }

  /**
   * Verifica si existe al menos un periodo académico oficial activo registrado
   */
  async isPeriodReady() {
    const periods = await this.periodRepo.list();
    const activePeriods = periods.filter(p => p.estado === 'ACTIVO');
    const ready = activePeriods.length > 0;
    return {
      ready,
      count: activePeriods.length,
      missing: ready ? [] : [PENDING_PREREQUISITES.PERIODO_ACADEMICO_PENDIENTE]
    };
  }

  /**
   * Verifica si un grupo técnico específico tiene un módulo curricular asignado
   * @param {string} grupoCode
   */
  async isGroupModuleReady(grupoCode) {
    if (CONFIG.IS_V2_CANDIDATE) {
      try {
        const { group } = await new AcademicContextAuthorityService().resolveMembers(grupoCode);
        return { ready: Boolean(group.moduloId), assignedModuloId: group.moduloId || null,
          missing: group.moduloId ? [] : [PENDING_PREREQUISITES.MODULO_POR_GRUPO_PENDIENTE], groupId: group.id };
      } catch (error) { return { ready: false, assignedModuloId: null, missing: ['INCONSISTENCY'], error: error.message }; }
    }
    if (!grupoCode) {
      return { ready: false, assignedModuloId: null, missing: [PENDING_PREREQUISITES.MODULO_POR_GRUPO_PENDIENTE] };
    }

    const items = await this.enrollmentRepo.getByGrupoCode(grupoCode);
    if (items.length === 0) {
      return { ready: false, assignedModuloId: null, missing: [PENDING_PREREQUISITES.MODULO_POR_GRUPO_PENDIENTE] };
    }

    const assignedModuloId = items[0].moduloId;
    const ready = assignedModuloId !== null && items.every(i => i.moduloId === assignedModuloId);

    return {
      ready,
      assignedModuloId,
      missing: ready ? [] : [PENDING_PREREQUISITES.MODULO_POR_GRUPO_PENDIENTE]
    };
  }

  /**
   * Verifica si un módulo curricular tiene unidades didácticas registradas
   * @param {string} moduloId
   */
  async isCurriculumReady(moduloId) {
    if (!moduloId) {
      return { ready: false, unidadesCount: 0, missing: [PENDING_PREREQUISITES.UNIDADES_DIDACTICAS_PENDIENTES] };
    }

    const db = getDB();
    const unidades = await new Promise((resolve) => {
      const tx = db.transaction('unidades', 'readonly');
      const req = tx.objectStore('unidades').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const moduleUnits = unidades.filter(u => u.moduloId === moduloId);
    const ready = moduleUnits.length > 0;

    return {
      ready,
      unidadesCount: moduleUnits.length,
      missing: ready ? [] : [PENDING_PREREQUISITES.UNIDADES_DIDACTICAS_PENDIENTES]
    };
  }

  /**
   * Evalúa si una matrícula está habilitada para registrar Asistencia (M06)
   * @param {string} matriculaId
   */
  async canRegisterAttendance(matriculaId) {
    if (!matriculaId) {
      return { ready: false, missing: ['PERIODO', 'MODULO', 'UNIDADES'], details: null };
    }

    let authority = null;
    if (CONFIG.IS_V2_CANDIDATE) {
      try { authority = await new AcademicContextAuthorityService().resolveEnrollment(matriculaId); }
      catch (error) { return { ready: false, missing: ['INCONSISTENCY'], details: { matriculaId, error: error.message } }; }
    }
    const enrollment = authority?.enrollment || await this.enrollmentRepo.getById(matriculaId);
    if (!enrollment) {
      return { ready: false, missing: ['MATRICULA_NO_ENCONTRADA'], details: null };
    }

    const missing = [];
    let periodoId = authority ? authority.periodoId : enrollment.periodoId;
    let moduloId = authority ? authority.moduloId : enrollment.moduloId;

    if (!periodoId) {
      missing.push('PERIODO');
    }

    if (!moduloId) {
      missing.push('MODULO');
    }

    let unidadesCount = 0;
    if (moduloId) {
      const curr = await this.isCurriculumReady(moduloId);
      unidadesCount = curr.unidadesCount;
      if (!curr.ready) {
        missing.push('UNIDADES');
      }
    } else {
      missing.push('UNIDADES');
    }

    return {
      ready: missing.length === 0,
      missing,
      details: {
        matriculaId: enrollment.id,
        groupId: authority?.groupId || null,
        estudianteNombre: enrollment.estudianteNombreCompleto,
        grupoCode: enrollment.grupoCode,
        programaId: enrollment.programaId,
        periodoId: periodoId || null,
        moduloId: moduloId || null,
        unidadesCount
      }
    };
  }

  /**
   * Evalúa si una matrícula está habilitada para registrar Evaluación/Notas (M07)
   * @param {string} matriculaId
   */
  async canRegisterEvaluation(matriculaId) {
    const attRes = await this.canRegisterAttendance(matriculaId);
    if (!attRes.ready) {
      const missing = [...attRes.missing];
      if (!missing.includes('INDICADORES')) {
        missing.push('INDICADORES');
      }
      return {
        ready: false,
        missing,
        details: attRes.details
      };
    }

    const db = getDB();
    const unidades = await new Promise((resolve) => {
      const tx = db.transaction('unidades', 'readonly');
      const req = tx.objectStore('unidades').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const moduleUnits = unidades.filter(u => u.moduloId === attRes.details.moduloId);
    const hasIndicators = moduleUnits.length > 0 && moduleUnits.every(u => Array.isArray(u.indicadores) && u.indicadores.length > 0);

    if (!hasIndicators) {
      return {
        ready: false,
        missing: ['INDICADORES'],
        details: attRes.details
      };
    }

    return {
      ready: true,
      missing: [],
      details: attRes.details
    };
  }

  /**
   * Evalúa si una matrícula está habilitada para registrar EFSRT (M08)
   * Prerrequisitos técnicos mínimos de trazabilidad: matrícula válida, periodoId != null, moduloId != null.
   * @param {string} matriculaId
   * @param {IDBDatabase} [dbOverride=null]
   */
  async canRegisterEFSRT(matriculaId, dbOverride = null) {
    if (!matriculaId) {
      return { ready: false, missing: ['MATRICULA_NO_ENCONTRADA'], details: null };
    }
    if (CONFIG.IS_V2_CANDIDATE) {
      try {
        const context = await new AcademicContextAuthorityService().resolveEnrollment(matriculaId, dbOverride);
        const missing = [];
        if (!context.periodoId) missing.push('PERIODO');
        if (!context.moduloId) missing.push('MODULO');
        return { ready: false, missing: [...missing, 'B-005'], details: {
          matriculaId, groupId: context.groupId, grupoCode: context.enrollment.grupoCode,
          programaId: context.programaId, moduloId: context.moduloId, periodoId: context.periodoId } };
      } catch (error) { return { ready: false, missing: ['INCONSISTENCY'], details: { matriculaId, error: error.message } }; }
    }

    let db;
    try {
      db = dbOverride || getDB();
    } catch (e) {
      return { ready: false, missing: ['PERIODO', 'MODULO'], details: null };
    }

    const enrollment = await new Promise((resolve) => {
      try {
        const tx = db.transaction('matriculas', 'readonly');
        const store = tx.objectStore('matriculas');
        const req = store.get(matriculaId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });

    if (!enrollment) {
      return { ready: false, missing: ['PERIODO', 'MODULO'], details: null };
    }

    const missing = [];
    if (!enrollment.periodoId) {
      missing.push('PERIODO');
    }
    if (!enrollment.moduloId) {
      missing.push('MODULO');
    }

    return {
      ready: missing.length === 0,
      missing,
      details: {
        matriculaId: enrollment.id,
        estudianteNombre: enrollment.estudianteNombreCompleto || 'Estudiante',
        grupoCode: enrollment.grupoCode,
        programaId: enrollment.programaId,
        periodoId: enrollment.periodoId || null,
        moduloId: enrollment.moduloId || null
      }
    };
  }

  /**
   * Evalúa si una matrícula puede cerrar módulo (M09)
   * @param {string} matriculaId
   */
  async canCloseModule(matriculaId) {
    const evalRes = await this.canRegisterEvaluation(matriculaId);
    if (!evalRes.ready) {
      return evalRes;
    }
    return { ready: false, missing: ['EVALUACIONES_INCOMPLETAS', 'ASISTENCIA_INCOMPLETA'], details: evalRes.details };
  }

  /**
   * Evalúa si se pueden emitir documentos académicos oficiales (M14)
   * @param {string} matriculaId
   */
  async canGenerateAcademicDocuments(matriculaId) {
    const attRes = await this.canRegisterAttendance(matriculaId);
    if (!attRes.ready) {
      return {
        ready: false,
        missing: attRes.missing,
        message: 'Configuración académica incompleta: ' + attRes.missing.join(', ')
      };
    }
    return { ready: false, missing: ['MODULO_NO_CONCLUIDO'], message: 'El módulo no ha sido concluido oficialmente.' };
  }

  /**
   * Resumen global de preparación académica para el panel administrativo
   */
  async getAcademicReadinessSummary() {
    const periods = await this.periodRepo.list();
    const activePeriods = periods.filter(p => p.estado === 'ACTIVO');

    const db = getDB();
    if (CONFIG.IS_V2_CANDIDATE) {
      const groups = await new Promise((resolve, reject) => {
        const req = db.transaction('grupos_academicos', 'readonly').objectStore('grupos_academicos').getAll();
        req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
      });
      const units = await new Promise((resolve, reject) => {
        const req = db.transaction('unidades', 'readonly').objectStore('unidades').getAll();
        req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
      });
      const assigned = groups.filter(g => Boolean(g.moduloId)).length;
      return { periodosCount: activePeriods.length, totalGroups: groups.length,
        groupsWithModule: assigned, groupsPending: groups.length - assigned,
        totalCatalogModules: 14, modulesWithUnitsCount: new Set(units.map(u => u.moduloId)).size,
        totalUnits: units.length, isFullyConfigured: false };
    }
    const enrollments = await new Promise((resolve) => {
      const tx = db.transaction('matriculas', 'readonly');
      const req = tx.objectStore('matriculas').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const unidades = await new Promise((resolve) => {
      const tx = db.transaction('unidades', 'readonly');
      const req = tx.objectStore('unidades').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const totalGroups = FILE_GROUP_MAP.length;
    let groupsWithModule = 0;

    FILE_GROUP_MAP.forEach(g => {
      const grpMats = enrollments.filter(e => e.grupoCode === g.grupoCode);
      if (grpMats.length > 0 && grpMats[0].moduloId !== null) {
        groupsWithModule++;
      }
    });

    const configuredModulesSet = new Set(unidades.map(u => u.moduloId));

    return {
      periodosCount: activePeriods.length,
      totalGroups,
      groupsWithModule,
      groupsPending: totalGroups - groupsWithModule,
      totalCatalogModules: 14,
      modulesWithUnitsCount: configuredModulesSet.size,
      totalUnits: unidades.length,
      isFullyConfigured: activePeriods.length > 0 && groupsWithModule === totalGroups && configuredModulesSet.size === 14
    };
  }
}
