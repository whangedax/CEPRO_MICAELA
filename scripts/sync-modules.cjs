/**
 * scripts/sync-modules.cjs
 * 
 * Definición y categorización de módulos de sincronización para el intercambio
 * estructurado por partes (Matrículas, Configuraciones, Notas, Asistencias).
 */

const SYNC_MODULES = {
  ALL: 'all',
  CONFIG: 'config',
  ENROLLMENTS: 'enrollments',
  GRADES: 'grades',
  ATTENDANCE: 'attendance'
};

const MODULE_LABELS = {
  all: 'Lote Completo (Todos los datos)',
  config: 'Configuraciones Académicas e Institucionales',
  enrollments: 'Estudiantes y Matrículas',
  grades: 'Calificaciones, Notas de Logro y Evaluaciones',
  attendance: 'Control de Asistencias'
};

/**
 * Determina si una entidad y su scope pertenecen al módulo de sincronización solicitado.
 * @param {string} entity - Nombre de la entidad ('students', 'grades', 'documentSettings', etc.)
 * @param {object|string} [detail] - Objeto o scope de la operación
 * @param {string} syncModule - 'all' | 'config' | 'enrollments' | 'grades' | 'attendance'
 * @returns {boolean}
 */
function matchesSyncModule(entity, detail, syncModule) {
  if (!syncModule || syncModule === SYNC_MODULES.ALL) {
    return true;
  }

  const scopeKind = detail?.scope?.kind || detail?.scopeKind || null;

  switch (syncModule) {
    case SYNC_MODULES.CONFIG:
      // Programas, módulos, settings institucionales, periodos, años, valores de referencia
      if (['programs', 'modules', 'academic_years', 'periods'].includes(entity)) {
        return true;
      }
      if (entity === 'documentSettings') {
        // Excluir notas o entregas específicas si estuvieran en documentSettings
        return true;
      }
      if (entity === 'userDirectory') {
        return true;
      }
      return false;

    case SYNC_MODULES.ENROLLMENTS:
      // Estudiantes, matrículas, admisiones y solicitudes de alumnos
      if (['students', 'enrollments', 'studentRequests'].includes(entity)) {
        return true;
      }
      if (entity === 'documentSettings' && ['admissionConfig', 'admissionSubmission', 'profile2026'].includes(scopeKind)) {
        return true;
      }
      return false;

    case SYNC_MODULES.GRADES:
      // Calificaciones vigesimales, actas y entregas documentales
      if (['grades', 'documentSubmissions'].includes(entity)) {
        return true;
      }
      if (entity === 'documentSettings' && ['unit', 'practice'].includes(scopeKind)) {
        return true;
      }
      return false;

    case SYNC_MODULES.ATTENDANCE:
      // Control de asistencias
      return entity === 'attendance';

    default:
      return true;
  }
}

/**
 * Clasifica una lista de operaciones por módulo de sincronización.
 * @param {Array} operations - Lista de operaciones
 * @returns {object} Contadores por módulo
 */
function classifyOperations(operations = []) {
  const counts = {
    all: operations.length,
    config: 0,
    enrollments: 0,
    grades: 0,
    attendance: 0
  };

  for (const op of operations) {
    const entity = op?.body?.entity;
    const detail = op?.body?.value;
    if (matchesSyncModule(entity, detail, SYNC_MODULES.CONFIG)) counts.config++;
    if (matchesSyncModule(entity, detail, SYNC_MODULES.ENROLLMENTS)) counts.enrollments++;
    if (matchesSyncModule(entity, detail, SYNC_MODULES.GRADES)) counts.grades++;
    if (matchesSyncModule(entity, detail, SYNC_MODULES.ATTENDANCE)) counts.attendance++;
  }

  return counts;
}

module.exports = {
  SYNC_MODULES,
  MODULE_LABELS,
  matchesSyncModule,
  classifyOperations
};
