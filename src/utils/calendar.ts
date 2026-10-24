/**
 * utils/calendar.ts
 * 
 * Utilidades de Calendarización Académica Institucional CETPRO Micaela Bastidas.
 * Basado estrictamente en scripts/academic-calendar-engine.cjs.
 * 
 * Provee verificación de días lectivos, feriados oficiales del Perú y calendario
 * institucional (incluyendo 2026 y feriados fijos anuales) sin inventar fechas ni lógica paralela.
 * La autoridad definitiva sobre asistencia reside en el backend.
 */

/**
 * Catálogo institucional de feriados y días no lectivos 2026
 * Fuentes: Calendarización Oficial CETPRO Micaela Bastidas y scripts/academic-calendar-engine.cjs.
 */
export const INSTITUTIONAL_HOLIDAYS_2026: Record<string, string> = {
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
  '2026-12-25': 'Navidad',
};

/**
 * Feriados nacionales fijos del calendario peruano aplicables anualmente.
 */
export const FIXED_ANNUAL_HOLIDAYS: Record<string, string> = {
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
  '12-25': 'Navidad',
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtiene el día de la semana (0: Domingo, 1: Lunes, ..., 6: Sábado)
 * utilizando parsing numérico exacto para evitar desfases de zona horaria UTC.
 */
export function getDayOfWeekIso(isoDate: string): number {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return -1;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return dateObj.getDay();
}

/**
 * Verifica si una fecha ISO YYYY-MM-DD corresponde a un feriado o día no lectivo.
 * Primero consulta el catálogo específico 2026 si aplica, y como fallback el catálogo
 * anual permanente para no limitar el frontend exclusivamente a 2026.
 */
export function isHoliday(isoDate: string): string | null {
  if (!isoDate || typeof isoDate !== 'string') return null;
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
 * Retorna true si la fecha cae en fin de semana (sábado o domingo).
 */
export function isWeekend(isoDate: string): boolean {
  const dow = getDayOfWeekIso(isoDate);
  return dow === 0 || dow === 6;
}

/**
 * Formatea una fecha ISO para visualización en español.
 * Ej: "Lunes 16 de Marzo de 2026"
 */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = getDayOfWeekIso(isoDate);
  const dayName = DAY_NAMES[dow] || '';
  const monthName = MONTH_NAMES[m - 1] || '';
  return `${dayName}, ${d} de ${monthName} de ${y}`;
}

/**
 * Obtiene la fecha actual en hora de Perú (America/Lima).
 */
export function getTodayLima(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
