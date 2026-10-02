/**
 * Servicio de Datos de Etapa 2 (Etapa2DataService)
 * Gestiona la persistencia, consulta y generación demo de asistencia y calificaciones
 * para los documentos oficiales de la Etapa 2 (TMPL-05..10 Asistencia y TMPL-11..17 Evaluación).
 */

const STORAGE_PREFIX_ATT = 'CETPRO_ETAPA2_ATT_';
const STORAGE_PREFIX_EVAL = 'CETPRO_ETAPA2_EVAL_';

export class Etapa2DataService {
  constructor() {
    this.memoryCache = new Map();
  }

  _getKey(prefix, groupId, udNum) {
    return `${prefix}${groupId}_UD${udNum}`;
  }

  _safeGet(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
      }
    } catch (e) {
      console.warn('[Etapa2DataService] Error leyendo localStorage:', e);
    }
    return this.memoryCache.get(key) || null;
  }

  _safeSet(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('[Etapa2DataService] Error escribiendo localStorage:', e);
    }
    this.memoryCache.set(key, value);
  }

  _safeRemove(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[Etapa2DataService] Error borrando localStorage:', e);
    }
    this.memoryCache.delete(key);
  }

  // ==========================================
  // ASISTENCIA (TMPL-05 a TMPL-10)
  // ==========================================

  /**
   * Obtiene los datos de asistencia guardados para un grupo y Unidad Didáctica
   * @param {string} groupId
   * @param {number} udNum (1..6)
   * @returns {object|null}
   */
  getAttendance(groupId, udNum) {
    if (!groupId || !udNum) return null;
    const key = this._getKey(STORAGE_PREFIX_ATT, groupId, udNum);
    return this._safeGet(key);
  }

  /**
   * Guarda los datos de asistencia
   * @param {string} groupId
   * @param {number} udNum
   * @param {object} payload { sessions: [], marksByEnrollment: {} }
   */
  saveAttendance(groupId, udNum, payload) {
    if (!groupId || !udNum) return;
    const key = this._getKey(STORAGE_PREFIX_ATT, groupId, udNum);
    const data = {
      groupId,
      udNum,
      sessions: Array.isArray(payload?.sessions) ? payload.sessions : [],
      marksByEnrollment: payload?.marksByEnrollment || {},
      updatedAt: new Date().toISOString()
    };
    this._safeSet(key, data);
    return data;
  }

  /**
   * Limpia los datos de asistencia para un grupo y UD
   */
  clearAttendance(groupId, udNum) {
    const key = this._getKey(STORAGE_PREFIX_ATT, groupId, udNum);
    this._safeRemove(key);
  }

  /**
   * Genera datos de asistencia de demostración realistas (40 sesiones con P, F, J y totales)
   * @param {string} groupId
   * @param {number} udNum
   * @param {Array<object>} rows Padrón de estudiantes matriculados
   * @param {string} [startDateStr] Fecha inicial (YYYY-MM-DD), defecto 2026-03-02
   */
  generateDemoAttendance(groupId, udNum, rows = [], startDateStr = '2026-03-02') {
    if (!groupId || !udNum) return null;

    // Generar 40 fechas hábiles consecutivas (lunes a viernes)
    const sessions = [];
    const curDate = new Date(`${startDateStr}T08:00:00`);
    while (sessions.length < 40) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Solo lunes a viernes
        const yyyy = curDate.getFullYear();
        const mm = String(curDate.getMonth() + 1).padStart(2, '0');
        const dd = String(curDate.getDate()).padStart(2, '0');
        sessions.push({
          sessionId: sessions.length + 1,
          sessionIndex: sessions.length,
          fecha: `${yyyy}-${mm}-${dd}`,
          day: dd
        });
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    const marksByEnrollment = {};
    rows.forEach((student, sIdx) => {
      const enrollmentId = student.enrollmentId || student.id || `STUD_${sIdx}`;
      const marks = [];
      let presentCount = 0;
      let absentCount = 0;

      // Generar patrón realista de asistencia con semilla determinista
      sessions.forEach((session, jIdx) => {
        const seed = (sIdx * 37 + jIdx * 13 + udNum * 19) % 100;
        let estado = 'P'; // 88% Presente
        if (seed > 95) {
          estado = 'J'; // 4% Justificada
        } else if (seed > 88) {
          estado = 'F'; // 8% Falta
          absentCount++;
        } else {
          presentCount++;
        }

        marks.push({
          sessionId: session.sessionId,
          estadoRegistro: estado,
          state: estado
        });
      });

      marksByEnrollment[enrollmentId] = {
        marks,
        presentCount,
        absentCount
      };
    });

    const payload = {
      sessions,
      marksByEnrollment
    };
    return this.saveAttendance(groupId, udNum, payload);
  }

  // ==========================================
  // EVALUACIÓN (TMPL-11 a TMPL-17)
  // ==========================================

  /**
   * Obtiene los datos de evaluación guardados para un grupo y Unidad Didáctica
   * @param {string} groupId
   * @param {number} udNum (1..7)
   * @returns {object|null}
   */
  getEvaluation(groupId, udNum) {
    if (!groupId || !udNum) return null;
    const key = this._getKey(STORAGE_PREFIX_EVAL, groupId, udNum);
    return this._safeGet(key);
  }

  /**
   * Guarda los datos de evaluación
   * @param {string} groupId
   * @param {number} udNum
   * @param {object} payload { indicators: [], evaluationsByEnrollment: {} }
   */
  saveEvaluation(groupId, udNum, payload) {
    if (!groupId || !udNum) return;
    const key = this._getKey(STORAGE_PREFIX_EVAL, groupId, udNum);
    const data = {
      groupId,
      udNum,
      indicators: Array.isArray(payload?.indicators) ? payload.indicators : this.getDefaultIndicators(udNum),
      evaluationsByEnrollment: payload?.evaluacionesByEnrollment || payload?.evaluationsByEnrollment || {},
      updatedAt: new Date().toISOString()
    };
    this._safeSet(key, data);
    return data;
  }

  /**
   * Limpia los datos de evaluación para un grupo y UD
   */
  clearEvaluation(groupId, udNum) {
    const key = this._getKey(STORAGE_PREFIX_EVAL, groupId, udNum);
    this._safeRemove(key);
  }

  /**
   * Indicadores de logro por defecto para la UD
   */
  getDefaultIndicators(udNum) {
    return [
      `IL1: Reconoce y fundamenta conceptos clave de la Unidad Didáctica ${udNum}.`,
      `IL2: Configura el entorno y organiza los recursos de aprendizaje.`,
      `IL3: Ejecuta procedimientos técnicos con criterios de seguridad y calidad.`,
      `IL4: Evalúa resultados y resuelve contingencias operativas.`,
      `IL5: Elabora documentación y sustenta el trabajo técnico ejecutado.`
    ];
  }

  /**
   * Genera notas de demostración realistas (IL1..IL5, IA1..IA3, R y Logro Final)
   * @param {string} groupId
   * @param {number} udNum
   * @param {Array<object>} rows Padrón de estudiantes matriculados
   */
  generateDemoEvaluation(groupId, udNum, rows = []) {
    if (!groupId || !udNum) return null;

    const indicators = this.getDefaultIndicators(udNum);
    const evaluationsByEnrollment = {};

    rows.forEach((student, sIdx) => {
      const enrollmentId = student.enrollmentId || student.id || `STUD_${sIdx}`;
      const evals = [];
      let sumIL = 0;

      for (let k = 0; k < 5; k++) {
        // Generar notas vigesimales entre 11 y 19
        const seedBase = 12 + ((sIdx * 7 + k * 11 + udNum * 5) % 8); // 12 a 19
        let ia1 = Math.min(20, Math.max(10, seedBase + ((sIdx + k) % 3) - 1));
        let ia2 = Math.min(20, Math.max(10, seedBase + ((sIdx * 2 + k) % 3) - 1));
        let ia3 = Math.min(20, Math.max(10, seedBase - ((sIdx + k * 2) % 3) + 1));
        let score = Math.round((ia1 + ia2 + ia3) / 3);
        let recovery = null;

        // Si desaprueba (< 13), asignar prueba de recuperación (R) aprobatoria
        if (score < 13) {
          recovery = 13 + ((sIdx + k) % 3); // 13, 14 o 15
          sumIL += recovery;
        } else {
          sumIL += score;
        }

        evals.push({
          ia1,
          ia2,
          ia3,
          score,
          recovery
        });
      }

      // Logro final de la Unidad Didáctica: promedio redondeado de los 5 IL
      const finalLogro = Math.min(20, Math.max(0, Math.round(sumIL / 5)));

      evaluationsByEnrollment[enrollmentId] = {
        evaluations: evals,
        finalLogro
      };
    });

    const payload = {
      indicators,
      evaluationsByEnrollment
    };
    return this.saveEvaluation(groupId, udNum, payload);
  }
}
