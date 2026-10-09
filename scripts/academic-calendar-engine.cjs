/**
 * Motor Dinámico de Calendarización y Fechas Académicas CETPRO
 * Módulo: AcademicCalendarEngine
 * 
 * Gestiona el cálculo determinista, verificable y dinámico de fechas válidas de asistencia
 * para unidades didácticas, respetando el horario de clases, feriados institucionales,
 * suspensiones, recuperaciones y cambios de mes/año.
 * 
 * Compatible con Node.js (offline/server) y Navegador (Vanilla JS).
 */

const DAY_NAMES_ABBR = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Catálogo institucional de feriados y días no lectivos 2026
 * Fuentes: Calendarización Oficial CETPRO Micaela Bastidas (Foto 782) y Calendario Nacional del Perú.
 */
const INSTITUTIONAL_HOLIDAYS_2026 = {
  '2026-01-01': 'Año Nuevo',
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-28': 'Aniversario del CETPRO Micaela Bastidas',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-06': 'Día del Maestro',
  '2026-07-27': 'Vacaciones de Medio Año / Semanas de Gestión',
  '2026-07-28': 'Fiestas Patrias',
  '2026-07-29': 'Fiestas Patrias',
  '2026-07-30': 'Vacaciones de Medio Año',
  '2026-07-31': 'Vacaciones de Medio Año',
  '2026-08-03': 'Semanas de Gestión 4',
  '2026-08-04': 'Semanas de Gestión 4',
  '2026-08-05': 'Semanas de Gestión 4',
  '2026-08-06': 'Batalla de Junín / Gestión 4',
  '2026-08-07': 'Semanas de Gestión 4',
  '2026-08-30': 'Santa Rosa de Lima',
  '2026-09-24': 'Día de la Educación Técnica',
  '2026-09-25': 'Virgen de las Mercedes',
  '2026-10-08': 'Combate de Angamos',
  '2026-11-01': 'Día de Todos los Santos',
  '2026-11-02': 'Conmemoración de los Fieles Difuntos',
  '2026-11-10': 'Aniversario de San Román / CETPRO Puno',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-09': 'Batalla de Ayacucho',
  '2026-12-25': 'Navidad'
};

const FIXED_ANNUAL_HOLIDAYS = {
  '01-01': 'Año Nuevo',
  '05-01': 'Día del Trabajo',
  '06-29': 'San Pedro y San Pablo',
  '07-28': 'Fiestas Patrias',
  '07-29': 'Fiestas Patrias',
  '08-06': 'Batalla de Junín',
  '08-30': 'Santa Rosa de Lima',
  '10-08': 'Combate de Angamos',
  '11-01': 'Día de Todos los Santos',
  '12-08': 'Inmaculada Concepción',
  '12-09': 'Batalla de Ayacucho',
  '12-25': 'Navidad'
};

/**
 * Valida si un string cumple el formato YYYY-MM-DD
 */
function isValidIsoDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Suma un número de días a una fecha ISO
 */
function addDaysIso(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Obtiene el día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) de una fecha ISO
 */
function getDayOfWeekIso(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDay();
}

/**
 * Clase principal del Motor de Calendarización Académica
 */
class AcademicCalendarEngine {
  constructor(options = {}) {
    this.customHolidays = { ...options.holidays };
  }

  /**
   * Determina si una fecha es feriado o día no lectivo
   */
  isHoliday(isoDate, holidaysMap = null) {
    const map = holidaysMap || this.customHolidays;
    if (map && map[isoDate]) return map[isoDate];
    if (isoDate.startsWith('2026-') && INSTITUTIONAL_HOLIDAYS_2026[isoDate]) {
      return INSTITUTIONAL_HOLIDAYS_2026[isoDate];
    }
    const mmdd = isoDate.slice(5);
    if (FIXED_ANNUAL_HOLIDAYS[mmdd]) {
      return FIXED_ANNUAL_HOLIDAYS[mmdd];
    }
    return null;
  }

  /**
   * Genera el conjunto de fechas académicas programadas para una unidad didáctica.
   * 
   * @param {Object} params
   * @param {string} params.fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} [params.fechaFin] - Fecha de fin (YYYY-MM-DD)
   * @param {number[]} [params.diasClase] - Días de la semana permitidos (1..6). Por defecto [1, 2, 3, 4, 5] (Lu-Vi)
   * @param {number} [params.targetDays] - Cantidad objetivo de días lectivos (ej. 8 o 16).
   * @param {Object} [params.holidays] - Mapa de feriados { 'YYYY-MM-DD': 'Motivo' }
   * @param {string[]} [params.suspensiones] - Fechas suspendidas extraordinariamente
   * @param {string[]} [params.recuperaciones] - Fechas de recuperación autorizadas
   * @param {Array} [params.recordedSessions] - Sesiones ya registradas en BD para conservar el histórico
   * 
   * @returns {{ success: boolean, dates: Array, monthSpans: Array, error?: string }}
   */
  resolveAcademicDates(params = {}) {
    const {
      fechaInicio,
      fechaFin,
      diasClase = [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
      targetDays = null,
      holidays = null,
      suspensiones = [],
      recuperaciones = [],
      recordedSessions = []
    } = params;

    // Validación de entrada obligatoria
    if (!fechaInicio || !isValidIsoDate(fechaInicio)) {
      // Si no hay fecha de inicio pero hay sesiones grabadas, resolver a partir de las sesiones grabadas
      if (Array.isArray(recordedSessions) && recordedSessions.length > 0) {
        return this._resolveFromRecordedOnly(recordedSessions);
      }
      return {
        success: false,
        dates: [],
        monthSpans: [],
        error: 'Falta configurar la fecha de inicio de la unidad didáctica en la programación.'
      };
    }

    const suspensionSet = new Set(suspensiones || []);
    const recuperacionSet = new Set(recuperaciones || []);
    const allowedDaysSet = new Set(diasClase || [1, 2, 3, 4, 5]);

    const generatedDates = [];
    let currentDate = fechaInicio;
    const maxIterations = 365 * 2; // Salvaguarda contra bucles infinitos
    let iterations = 0;

    // Condición de parada: por fechaFin (si existe) o por targetDays (si no hay fechaFin)
    const hasEndDate = Boolean(fechaFin && isValidIsoDate(fechaFin));
    if (hasEndDate && fechaFin < fechaInicio) {
      return {
        success: false,
        dates: [],
        monthSpans: [],
        error: 'La fecha de fin de la unidad no puede ser anterior a la fecha de inicio.'
      };
    }

    while (iterations++ < maxIterations) {
      if (hasEndDate && currentDate > fechaFin) break;
      if (!hasEndDate && targetDays && generatedDates.length >= targetDays) break;

      const dow = getDayOfWeekIso(currentDate);
      const isRecovery = recuperacionSet.has(currentDate);
      const isSuspended = suspensionSet.has(currentDate);
      const holidayReason = this.isHoliday(currentDate, holidays);

      let isValidClassDate = false;

      if (isRecovery) {
        // Las recuperaciones expresamente autorizadas se incluyen aunque sea sábado o feriado
        isValidClassDate = true;
      } else if (!isSuspended && !holidayReason) {
        // Día ordinario sin suspensión ni feriado
        if (allowedDaysSet.has(dow)) {
          isValidClassDate = true;
        }
      }

      if (isValidClassDate) {
        const [y, m, d] = currentDate.split('-').map(Number);
        generatedDates.push({
          fecha: currentDate,
          session: '1',
          sessionId: `${currentDate}|1`,
          dayOfWeek: dow,
          dayAbbr: DAY_NAMES_ABBR[dow] || 'Lu',
          dayNum: String(d).padStart(2, '0'),
          monthIndex: m - 1,
          monthName: SPANISH_MONTHS[m - 1],
          year: y,
          isRecovery,
          isRecorded: false
        });
      }

      // Si alcanzamos targetDays y no hay fechaFin fija, terminar
      if (!hasEndDate && targetDays && generatedDates.length >= targetDays) break;

      currentDate = addDaysIso(currentDate, 1);
    }

    // Integrar sesiones históricas ya registradas en la BD para que NUNCA se pierdan ni se omitan
    const dateMap = new Map(generatedDates.map(item => [item.sessionId, item]));

    if (Array.isArray(recordedSessions)) {
      for (const rec of recordedSessions) {
        const rawDate = rec.fecha || rec.date;
        const sessionKey = `${rawDate}|${rec.session || '1'}`;
        if (rawDate && isValidIsoDate(rawDate)) {
          if (fechaInicio && rawDate < fechaInicio) continue;
          if (hasEndDate && rawDate > fechaFin) continue;
          if (!dateMap.has(sessionKey)) {
            const [y, m, d] = rawDate.split('-').map(Number);
            const dow = getDayOfWeekIso(rawDate);
            dateMap.set(sessionKey, {
              fecha: rawDate,
              session: String(rec.session || '1'),
              sessionId: sessionKey,
              dayOfWeek: dow,
              dayAbbr: DAY_NAMES_ABBR[dow] || 'Lu',
              dayNum: String(d).padStart(2, '0'),
              monthIndex: m - 1,
              monthName: SPANISH_MONTHS[m - 1],
              year: y,
              isRecovery: recuperacionSet.has(rawDate),
              isRecorded: true
            });
          } else {
            const existing = dateMap.get(sessionKey);
            existing.isRecorded = true;
          }
        }
      }
    }

    // Ordenar cronológicamente todas las fechas resultantes
    const finalDates = Array.from(dateMap.values()).sort((a, b) => a.sessionId.localeCompare(b.sessionId));

    // Si después de calcular no hay fechas válidas
    if (finalDates.length === 0) {
      return {
        success: false,
        dates: [],
        monthSpans: [],
        error: 'El rango de fechas y horario no contiene ningún día lectivo válido.'
      };
    }

    // Calcular los tramos exactos de meses (monthSpans)
    const monthSpans = this.calculateMonthSpans(finalDates);

    return {
      success: true,
      dates: finalDates,
      monthSpans,
      totalSessions: finalDates.length
    };
  }

  /**
   * Calcula los intervalos de agrupación de meses a partir de las columnas reales.
   * Garantiza que cada mes agrupe estrictamente sus fechas correspondientes.
   */
  calculateMonthSpans(datesList) {
    if (!datesList || !datesList.length) return [];
    const spans = [];
    let currentSpan = {
      monthIndex: datesList[0].monthIndex,
      monthName: datesList[0].monthName,
      year: datesList[0].year,
      startCol: 0,
      endCol: 0,
      count: 1
    };

    for (let i = 1; i < datesList.length; i++) {
      const item = datesList[i];
      if (item.monthIndex === currentSpan.monthIndex && item.year === currentSpan.year) {
        currentSpan.endCol = i;
        currentSpan.count++;
      } else {
        spans.push(currentSpan);
        currentSpan = {
          monthIndex: item.monthIndex,
          monthName: item.monthName,
          year: item.year,
          startCol: i,
          endCol: i,
          count: 1
        };
      }
    }
    spans.push(currentSpan);
    return spans;
  }

  /**
   * Resuelve el calendario únicamente a partir de sesiones históricas registradas en BD
   */
  _resolveFromRecordedOnly(recordedSessions) {
    const datesMap = new Map();
    for (const rec of recordedSessions) {
      const rawDate = rec.fecha || rec.date;
      if (rawDate && isValidIsoDate(rawDate)) {
        const key = `${rawDate}|${rec.session || '1'}`;
        if (!datesMap.has(key)) {
          const [y, m, d] = rawDate.split('-').map(Number);
          const dow = getDayOfWeekIso(rawDate);
          datesMap.set(key, {
            fecha: rawDate,
            session: String(rec.session || '1'),
            sessionId: key,
            dayOfWeek: dow,
            dayAbbr: DAY_NAMES_ABBR[dow] || 'Lu',
            dayNum: String(d).padStart(2, '0'),
            monthIndex: m - 1,
            monthName: SPANISH_MONTHS[m - 1],
            year: y,
            isRecovery: false,
            isRecorded: true
          });
        }
      }
    }
    const dates = Array.from(datesMap.values()).sort((a, b) => a.sessionId.localeCompare(b.sessionId));
    return {
      success: dates.length > 0,
      dates,
      monthSpans: this.calculateMonthSpans(dates),
      totalSessions: dates.length,
      ...(dates.length === 0 ? { error: 'No se encontraron sesiones registradas.' } : {})
    };
  }

  /**
   * Calcula los totales de asistencia por estudiante diferenciando
   * sesiones programadas, realizadas y registradas.
   */
  calculateStudentTotals(student, academicDates, attendanceMarks, policy = {}) {
    const presenceStates = (policy.presenceStates || 'P,T').split(',').map(s => s.trim().toUpperCase());
    const absenceStates = (policy.absenceStates || 'F,J').split(',').map(s => s.trim().toUpperCase());
    const denominatorType = policy.absenceDenominator || 'PROGRAMADAS';

    const enrollmentId = typeof student === 'string' ? student : (student.enrollmentId || student.id);
    let enrollmentStart = typeof student === 'string' ? null : (student.enrollmentStartDate || student.startDate || null);
    if (!enrollmentStart && typeof policy === 'string') {
      enrollmentStart = policy;
    }
    const enrollmentEnd = typeof student === 'string' ? null : (student.enrollmentEndDate || student.endDate || null);

    let presentCount = 0;
    let absentCount = 0;
    let registeredCount = 0;
    let totalEligibleSessions = 0;
    let countP = 0, countT = 0, countF = 0, countJ = 0;

    const studentMarksMap = new Map(
      (attendanceMarks || [])
        .filter(m => m.enrollmentId === enrollmentId)
        .map(m => [`${m.date}|${m.session || '1'}`, String(m.value || '').toUpperCase()])
    );

    for (const session of academicDates) {
      if (enrollmentStart && session.fecha < enrollmentStart) continue;
      if (enrollmentEnd && session.fecha > enrollmentEnd) continue;

      totalEligibleSessions++;
      const mark = studentMarksMap.get(session.sessionId);

      if (mark) {
        registeredCount++;
        if (mark === 'P') countP++;
        else if (mark === 'T') countT++;
        else if (mark === 'F') countF++;
        else if (mark === 'J') countJ++;

        if (presenceStates.includes(mark)) {
          presentCount++;
        } else if (absenceStates.includes(mark)) {
          absentCount++;
        }
      }
    }

    let denominator = 0;
    if (denominatorType === 'PROGRAMADAS') {
      denominator = totalEligibleSessions;
    } else if (denominatorType === 'REGISTRADAS') {
      denominator = registeredCount;
    } else {
      denominator = academicDates.length;
    }

    let absencePercent = null;
    if (denominator > 0) {
      absencePercent = Number(((absentCount / denominator) * 100).toFixed(2));
    }

    return {
      P: countP,
      T: countT,
      F: countF,
      J: countJ,
      totalPresences: presentCount,
      totalAbsences: absentCount,
      unregistered: totalEligibleSessions - registeredCount,
      totalProgramadas: totalEligibleSessions,
      totalRegistradas: registeredCount,
      presentCount,
      absentCount,
      absencePercent
    };
  }

  calculateStudentSummary(...args) {
    return this.calculateStudentTotals(...args);
  }
}


module.exports = {
  DAY_NAMES_ABBR,
  SPANISH_MONTHS,
  INSTITUTIONAL_HOLIDAYS_2026,
  FIXED_ANNUAL_HOLIDAYS,
  isValidIsoDate,
  addDaysIso,
  getDayOfWeekIso,
  AcademicCalendarEngine
};
