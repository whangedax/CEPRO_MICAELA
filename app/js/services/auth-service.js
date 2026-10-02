/**
 * Servicio de Autenticación y Control de Acceso Basado en Roles (RBAC)
 * Roles canónicos: DIRECTOR, SECRETARIA, DOCENTE
 */

export const ROLES = Object.freeze({
  DIRECTOR: {
    id: 'DIRECTOR',
    title: 'Director General',
    userName: 'Dirección General',
    cargo: 'Dirección General — CETPRO Micaela Bastidas',
    avatar: '👨‍💼',
    color: '#047857',
    badgeBg: '#d1fae5',
    badgeColor: '#065f46',
    description: 'Máxima autoridad institucional. Refrendo de títulos, actas y configuración académica.',
    allowedRoutes: [
      '#/login', '#/inicio', '#/estudiantes', '#/grupos', '#/documentos',
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
    userName: 'Secretaría Académica',
    cargo: 'Secretaría de Registros Académicos',
    avatar: '👩‍💼',
    color: '#1d4ed8',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    description: 'Gestión de matrícula, nóminas oficiales, actas modulares y certificados.',
    allowedRoutes: [
      '#/login', '#/inicio', '#/estudiantes', '#/grupos', '#/documentos',
      '#/programas', '#/configuracion', '#/respaldo', '#/evaluacion', '#/efsrt', '#/cierre', '#/demo', '#/demo/evaluacion'
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
    canEmitTitulo: false,
    canEmitCertificado: true,
    canManageEnrollments: true,
    canEditGrades: false
  },

  DOCENTE: {
    id: 'DOCENTE',
    title: 'Docente de Especialidad',
    userName: 'Docente de Especialidad',
    cargo: 'Docente de Formación Técnica y Módulos',
    avatar: '👨‍🏫',
    color: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
    description: 'Control de asistencia pedagógica, evaluación continua y carpeta docente.',
    allowedRoutes: [
      '#/login', '#/inicio', '#/estudiantes', '#/grupos', '#/documentos',
      '#/evaluacion', '#/configuracion', '#/demo', '#/demo/evaluacion'
    ],
    allowedStages: ['ETAPA_1', 'ETAPA_2'],
    allowedTemplates: [
      'TMPL-04',
      'TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10',
      'TMPL-11', 'TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17'
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
const AUTH_CUSTOM_NAME_KEY = 'CETPRO_AUTH_CUSTOM_USER_NAME';
const AUTH_SESSION_ACTIVE_KEY = 'CETPRO_AUTH_SESSION_ACTIVE';
const listeners = new Set();

export const AuthService = {
  ROLES,

  /**
   * Verifica si hay una sesión iniciada explícitamente en el sistema
   */
  isAuthenticated() {
    try {
      const active = localStorage.getItem(AUTH_SESSION_ACTIVE_KEY) || sessionStorage.getItem(AUTH_SESSION_ACTIVE_KEY);
      const storedRole = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      return active === 'true' && Boolean(ROLES[storedRole]);
    } catch {
      return false;
    }
  },

  /**
   * Obtiene el nombre personalizado del usuario si fue ingresado en el login
   */
  getCustomUserName() {
    try {
      return localStorage.getItem(AUTH_CUSTOM_NAME_KEY) || sessionStorage.getItem(AUTH_CUSTOM_NAME_KEY) || '';
    } catch {
      return '';
    }
  },

  /**
   * Obtiene el rol activo. Si hay sesión y nombre personalizado, lo refleja dinámicamente.
   */
  getCurrentRole() {
    let roleId = 'DIRECTOR';
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored && ROLES[stored]) {
        roleId = stored;
      }
    } catch {}

    const base = ROLES[roleId] || ROLES.DIRECTOR;
    const customName = this.getCustomUserName();
    if (customName && roleId === 'DOCENTE') {
      return { ...base, userName: customName };
    }
    return base;
  },

  /**
   * Inicia sesión institucional con un rol y datos contextuales
   * @param {object} params { roleId, customName, programId, groupCode }
   */
  login({ roleId, customName = '', programId = null, groupCode = null } = {}) {
    if (!ROLES[roleId]) {
      throw new Error(`Rol institucional no reconocido: ${roleId}`);
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, roleId);
      sessionStorage.setItem(AUTH_STORAGE_KEY, roleId);
      localStorage.setItem(AUTH_SESSION_ACTIVE_KEY, 'true');
      sessionStorage.setItem(AUTH_SESSION_ACTIVE_KEY, 'true');
      if (customName && customName.trim()) {
        const cleanName = customName.trim();
        localStorage.setItem(AUTH_CUSTOM_NAME_KEY, cleanName);
        sessionStorage.setItem(AUTH_CUSTOM_NAME_KEY, cleanName);
      } else {
        localStorage.removeItem(AUTH_CUSTOM_NAME_KEY);
        sessionStorage.removeItem(AUTH_CUSTOM_NAME_KEY);
      }
    } catch (e) {
      console.error('[AuthService] Error al persistir sesión:', e);
    }

    const current = this.getCurrentRole();
    listeners.forEach(fn => {
      try { fn(current); } catch (err) { console.error('[AuthService] Listener error:', err); }
    });
    return current;
  },

  /**
   * Cierra la sesión activa y limpia los datos de autenticación
   */
  logout() {
    try {
      localStorage.removeItem(AUTH_SESSION_ACTIVE_KEY);
      sessionStorage.removeItem(AUTH_SESSION_ACTIVE_KEY);
      localStorage.removeItem(AUTH_CUSTOM_NAME_KEY);
      sessionStorage.removeItem(AUTH_CUSTOM_NAME_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('[AuthService] Error al cerrar sesión:', e);
    }
    listeners.forEach(fn => {
      try { fn(null); } catch (err) { console.error('[AuthService] Listener error:', err); }
    });
  },

  /**
   * Cambia el usuario y rol activo y notifica a los oyentes
   * @param {string} roleId 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE'
   */
  setRole(roleId) {
    return this.login({ roleId });
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
