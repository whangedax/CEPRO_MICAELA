/**
 * Servicio de Autenticación y Control de Acceso Basado en Roles (RBAC)
 * Roles canónicos: DIRECTOR, SECRETARIA, DOCENTE
 */

export const ROLES = Object.freeze({
  DIRECTOR: {
    id: 'DIRECTOR',
    title: 'Director General',
    userName: 'Mg. Carlos Mendoza Paredes',
    cargo: 'Dirección General — CETPRO Micaela Bastidas',
    avatar: '👨‍💼',
    color: '#047857',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    description: 'Máxima autoridad institucional. Refrendo de títulos, actas y configuración académica.',
    allowedRoutes: [
      '#/inicio', '#/estudiantes', '#/grupos', '#/documentos',
      '#/configuracion-academica', '#/programas', '#/respaldo',
      '#/configuracion', '#/evaluacion', '#/efsrt', '#/cierre', '#/demo', '#/demo/evaluacion'
    ],
    allowedStages: ['ETAPA_1', 'ETAPA_2', 'ETAPA_3', 'ETAPA_4'],
    allowedTemplates: [
      'TMPL-01', 'TMPL-02', 'TMPL-03', 'TMPL-04',
      'TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10',
      'TMPL-11', 'TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17',
      'TMPL-18', 'TMPL-19', 'TMPL-20', 'TMPL-21'
    ],
    canConfigureAcademic: true,
    canRestoreBackup: true,
    canExportBackup: true,
    canEmitTitulo: true,
    canEmitCertificado: true,
    canManageEnrollments: true,
    canEditGrades: true
  },

  SECRETARIA: {
    id: 'SECRETARIA',
    title: 'Secretaría Académica',
    userName: 'Lic. María Elena Fernández',
    cargo: 'Secretaría de Registros Académicos',
    avatar: '👩‍💼',
    color: '#1d4ed8',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    description: 'Gestión de matrícula, nóminas oficiales, actas modulares y certificados.',
    allowedRoutes: [
      '#/inicio', '#/estudiantes', '#/grupos', '#/documentos',
      '#/programas', '#/configuracion', '#/evaluacion', '#/efsrt', '#/cierre', '#/demo', '#/demo/evaluacion'
    ],
    allowedStages: ['ETAPA_1', 'ETAPA_2', 'ETAPA_3', 'ETAPA_4'],
    allowedTemplates: [
      'TMPL-01', 'TMPL-02', 'TMPL-03', 'TMPL-04',
      'TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10',
      'TMPL-11', 'TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17',
      'TMPL-18', 'TMPL-19', 'TMPL-20'
    ],
    canConfigureAcademic: false,
    canRestoreBackup: false,
    canExportBackup: true,
    canEmitTitulo: false, // Títulos TMPL-21 son potestad exclusiva de Dirección
    canEmitCertificado: true,
    canManageEnrollments: true,
    canEditGrades: false // Calificaciones son asentadas por docentes
  },

  DOCENTE: {
    id: 'DOCENTE',
    title: 'Docente de Especialidad',
    userName: 'Prof. Walter Quispe Mamani',
    cargo: 'Docente de Formación Técnica y Módulos',
    avatar: '👨‍🏫',
    color: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
    description: 'Control de asistencia pedagógica, evaluación continua y carpeta docente.',
    allowedRoutes: [
      '#/inicio', '#/estudiantes', '#/grupos', '#/documentos',
      '#/evaluacion', '#/configuracion', '#/demo', '#/demo/evaluacion'
    ],
    allowedStages: ['ETAPA_1', 'ETAPA_2', 'ETAPA_3'],
    allowedTemplates: [
      'TMPL-04', // Portada de Carpeta Docente
      'TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10', // Asistencia UDs
      'TMPL-11', 'TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17' // Evaluación UDs
    ],
    canConfigureAcademic: false,
    canRestoreBackup: false,
    canExportBackup: false,
    canEmitTitulo: false,
    canEmitCertificado: false,
    canManageEnrollments: false,
    canEditGrades: true
  }
});

const AUTH_STORAGE_KEY = 'CETPRO_AUTH_USER_ROLE';
const listeners = new Set();

export const AuthService = {
  ROLES,

  /**
   * Obtiene el rol activo. Por defecto retorna DIRECTOR para preservar compatibilidad con pruebas.
   */
  getCurrentRole() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored && ROLES[stored]) {
        return ROLES[stored];
      }
    } catch {
      // Ignorar fallback
    }
    return ROLES.DIRECTOR;
  },

  /**
   * Cambia el usuario y rol activo y notifica a los oyentes
   * @param {string} roleId 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE'
   */
  setRole(roleId) {
    if (!ROLES[roleId]) {
      console.warn(`[AuthService] Rol desconocido: ${roleId}`);
      return false;
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, roleId);
      sessionStorage.setItem(AUTH_STORAGE_KEY, roleId);
    } catch (e) {
      console.error('[AuthService] Error al persistir rol:', e);
    }
    const current = ROLES[roleId];
    listeners.forEach(fn => {
      try { fn(current); } catch (err) { console.error('[AuthService] Listener error:', err); }
    });
    return true;
  },

  /**
   * Suscribe un callback a cambios de usuario/rol
   * @param {Function} callback
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /**
   * Verifica si el rol actual puede acceder a una ruta
   * @param {string} routeHash
   */
  canAccessRoute(routeHash) {
    const role = this.getCurrentRole();
    const baseHash = routeHash.split('?')[0];
    return role.allowedRoutes.includes(baseHash);
  },

  /**
   * Verifica si el rol actual puede ver una etapa de documentos
   * @param {string} stageId 'ETAPA_1' | 'ETAPA_2' | 'ETAPA_3' | 'ETAPA_4'
   */
  canAccessStage(stageId) {
    const role = this.getCurrentRole();
    return role.allowedStages.includes(stageId);
  },

  /**
   * Verifica si el rol actual puede emitir una plantilla específica
   * @param {string} templateId e.g. 'TMPL-21'
   */
  canEmitTemplate(templateId) {
    const role = this.getCurrentRole();
    return role.allowedTemplates.includes(templateId);
  },

  /**
   * Obtiene el operador de auditoría para registrar en los logs
   */
  getAuditOperator() {
    const role = this.getCurrentRole();
    return `${role.id}_${role.userName.replace(/\s+/g, '_')}`;
  }
};
