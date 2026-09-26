/**
 * Servicio de Diagnóstico Técnico de Cierre Académico (AcademicClosureReadinessService)
 * Módulo: M09 — Diagnóstico Técnico de Cierre Académico
 *
 * 100% SOLO LECTURA Y CALCULADO.
 * NO crea entidades ni object stores en IndexedDB.
 * NO escribe registros en auditoría al consultar o renderizar.
 * NUNCA retorna academicClosureAllowed = true mientras las reglas B-002/B-003/B-004/B-005/B-007 permanezcan abiertas.
 */

import { getDB } from '../db/database.js';
import { ValidationError } from './error-service.js';
import { CONFIG } from '../config.js';
import { AcademicContextAuthorityService } from './academic-context-authority-service.js';

export const BLOCKED_NORMATIVE_RULES = [
  { id: 'B-002', code: 'B-002', description: 'Catálogo curricular oficial completo (Unidades didácticas) pendiente' },
  { id: 'B-003', code: 'B-003', description: 'Reglas institucionales de evaluación, notas mínimas, redondeos y promedios pendientes' },
  { id: 'B-004', code: 'B-004', description: 'Asignación oficial de Módulo I / Módulo II por grupo pendiente' },
  { id: 'B-005', code: 'B-005', description: 'Normativa e integración de EFSRT con horas mínimas y convalidaciones pendiente' },
  { id: 'B-007', code: 'B-007', description: 'Resolución institucional de apertura del Periodo Académico oficial pendiente' }
];

export class AcademicClosureReadinessService {
  constructor(dbOverride = null) {
    this.dbOverride = dbOverride;
  }

  /**
   * Evalúa el diagnóstico técnico de cierre para una matrícula específica (Read-Only)
   * @param {string} matriculaId - ID primario de matrícula (ej. 'MAT-IMP-BD-001')
   * @param {IDBDatabase} [dbOverride=null] - Instancia de DB aislada para pruebas
   * @returns {Promise<object>} Diagnóstico estructurado de cierre técnico
   */
  async evaluateClosureReadiness(matriculaId, dbOverride = null) {
    if (!matriculaId || typeof matriculaId !== 'string' || matriculaId.trim() === '') {
      throw new ValidationError('El ID de matrícula (matriculaId) es obligatorio para el diagnóstico de cierre.');
    }

    const activeDb = dbOverride || this.dbOverride;

    let db;
    try {
      db = activeDb || getDB();
    } catch (e) {
      // Si la DB productiva no está inicializada o es ambiente sin IDB
      return this._buildDefaultBlockedResponse(matriculaId, 'DB_DESCONECTADA');
    }

    // 1. Reconstrucción estricta por matriculaId
    const enrollment = await new Promise((resolve) => {
      try {
        const tx = db.transaction('matriculas', 'readonly');
        const store = tx.objectStore('matriculas');
        const req = store.get(matriculaId.trim());
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });

    if (!enrollment) {
      throw new ValidationError(`La matrícula con ID "${matriculaId}" no existe en el sistema.`);
    }

    // 2. En v2 la matrícula solo identifica GROUP; el grupo determina contexto.
    let group = null;
    if (CONFIG.IS_V2_CANDIDATE) {
      try { group = (await new AcademicContextAuthorityService().resolveEnrollment(matriculaId.trim(), db)).group; }
      catch (error) { return this._buildDefaultBlockedResponse(matriculaId, error.message); }
    }
    const authoritativeModuloId = CONFIG.IS_V2_CANDIDATE ? group.moduloId : enrollment.moduloId;
    const authoritativePeriodoId = CONFIG.IS_V2_CANDIDATE ? group.periodoId : enrollment.periodoId;
    const periodAssigned = Boolean(authoritativePeriodoId);
    const moduloAssigned = Boolean(authoritativeModuloId);

    // Unidades e indicadores configurados
    let unitsConfiguredCount = 0;
    let indicatorsConfiguredCount = 0;
    if (moduloAssigned) {
      const unidades = await new Promise((resolve) => {
        try {
          const tx = db.transaction('unidades', 'readonly');
          const store = tx.objectStore('unidades');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch (e) {
          resolve([]);
        }
      });

      const moduleUnits = unidades.filter(u => u.moduloId === authoritativeModuloId);
      unitsConfiguredCount = moduleUnits.length;
      moduleUnits.forEach(u => {
        if (Array.isArray(u.indicadores)) {
          indicatorsConfiguredCount += u.indicadores.length;
        }
      });
    }

    // Registros de Asistencia observados
    let attendanceRecordsCount = 0;
    try {
      const asistenciaList = await new Promise((resolve) => {
        const tx = db.transaction('asistencia', 'readonly');
        const store = tx.objectStore('asistencia');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      attendanceRecordsCount = asistenciaList.filter(a => a.matriculaId === enrollment.id).length;
    } catch (e) {
      attendanceRecordsCount = 0;
    }

    // Registros de Evaluación observados
    let evaluationRecordsCount = 0;
    try {
      const evaluacionList = await new Promise((resolve) => {
        const tx = db.transaction('evaluacion', 'readonly');
        const store = tx.objectStore('evaluacion');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      evaluationRecordsCount = evaluacionList.filter(e => e.matriculaId === enrollment.id).length;
    } catch (e) {
      evaluationRecordsCount = 0;
    }

    // Registros EFSRT observados
    let efsrtRecordsCount = 0;
    try {
      const efsrtList = await new Promise((resolve) => {
        const tx = db.transaction('efsrt', 'readonly');
        const store = tx.objectStore('efsrt');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      efsrtRecordsCount = efsrtList.filter(ef => ef.matriculaId === enrollment.id).length;
    } catch (e) {
      efsrtRecordsCount = 0;
    }

    // 3. Evaluación de dimensiones técnicas
    const configurationStatus = (periodAssigned && moduloAssigned) ? 'COMPLETE' : 'INCOMPLETE';
    const dataCoverageStatus = 'OBSERVED';
    const rulesStatus = 'BLOCKED';

    // Completitud del contexto técnico (solo si periodo, módulo, unidades e indicadores existen)
    const technicalContextComplete = periodAssigned && moduloAssigned && unitsConfiguredCount > 0 && indicatorsConfiguredCount > 0;

    // academicClosureAllowed es SIEMPRE false mientras existan bloqueos institucionales
    const academicClosureAllowed = false;

    return {
      matriculaId: enrollment.id,
      groupId: group?.id || null,
      estudianteNombre: enrollment.estudianteNombreCompleto || 'Estudiante',
      grupoCode: enrollment.grupoCode || 'GRP-DESCONOCIDO',
      technicalContext: {
        periodAssigned,
        moduloAssigned,
        unitsConfiguredCount,
        indicatorsConfiguredCount,
        attendanceRecordsCount,
        evaluationRecordsCount,
        efsrtRecordsCount
      },
      blockedRules: [...BLOCKED_NORMATIVE_RULES],
      configurationStatus,
      dataCoverageStatus,
      rulesStatus,
      technicalContextComplete,
      academicClosureAllowed
    };
  }

  _buildDefaultBlockedResponse(matriculaId, reason) {
    return {
      matriculaId,
      groupId: null,
      reason,
      estudianteNombre: 'N/A',
      grupoCode: 'N/A',
      technicalContext: {
        periodAssigned: false,
        moduloAssigned: false,
        unitsConfiguredCount: 0,
        indicatorsConfiguredCount: 0,
        attendanceRecordsCount: 0,
        evaluationRecordsCount: 0,
        efsrtRecordsCount: 0
      },
      blockedRules: [...BLOCKED_NORMATIVE_RULES],
      configurationStatus: 'INCOMPLETE',
      dataCoverageStatus: 'NONE',
      rulesStatus: 'BLOCKED',
      technicalContextComplete: false,
      academicClosureAllowed: false
    };
  }
}
