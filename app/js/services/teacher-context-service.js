/**
 * Servicio de Contexto de Carrera y Aula/Grupo para Docentes (TeacherContextService)
 * Módulo: M01/RBAC — Delimitación de Ámbito por Aula Pedagógica (Carrera y Grupo)
 */

import { OFFICIAL_CATALOG_SEED } from './catalog-service.js';
import { FILE_GROUP_MAP } from './enrollment-service.js';

const STORAGE_KEY_TEACHER_PROGRAM = 'CETPRO_TEACHER_ACTIVE_PROGRAM_ID';
const STORAGE_KEY_TEACHER_GROUP = 'CETPRO_TEACHER_ACTIVE_GROUP_CODE';

const DEFAULT_TEACHER_PROGRAM_ID = 'PROG-005'; // Computación e Informática por defecto
const DEFAULT_TEACHER_GROUP_CODE = 'GRP-BD-007'; // Computación Presencial (26 alumnos)

const listeners = new Set();

export const TeacherContextService = {
  /**
   * Catálogo oficial de grupos por programa
   */
  getGroupCatalog() {
    return FILE_GROUP_MAP;
  },

  /**
   * Obtiene la lista oficial de programas formativos
   */
  getPrograms() {
    return OFFICIAL_CATALOG_SEED;
  },

  /**
   * Obtiene los grupos pertenecientes a un programa formativo específico
   * @param {string} [programId]
   */
  getGroupsForProgram(programId = null) {
    const progId = programId || this.getActiveProgramId();
    return FILE_GROUP_MAP.filter(g => g.programaId === progId);
  },

  /**
   * Obtiene el ID del programa / carrera activa asignada al docente
   */
  getActiveProgramId() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEACHER_PROGRAM) || sessionStorage.getItem(STORAGE_KEY_TEACHER_PROGRAM);
      if (stored && OFFICIAL_CATALOG_SEED.some(p => p.id === stored)) {
        return stored;
      }
    } catch {
      // Fallback seguro
    }
    return DEFAULT_TEACHER_PROGRAM_ID;
  },

  /**
   * Obtiene el código de grupo activo (ej. 'GRP-BD-007')
   */
  getActiveGroupCode() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEACHER_GROUP) || sessionStorage.getItem(STORAGE_KEY_TEACHER_GROUP);
      const progId = this.getActiveProgramId();
      const validForProgram = FILE_GROUP_MAP.some(g => g.grupoCode === stored && g.programaId === progId);
      if (stored && validForProgram) {
        return stored;
      }
    } catch {
      // Fallback seguro
    }
    // Si no hay grupo guardado o no coincide con el programa, tomar el primero de la carrera
    const progGroups = this.getGroupsForProgram(this.getActiveProgramId());
    return progGroups.length > 0 ? progGroups[0].grupoCode : DEFAULT_TEACHER_GROUP_CODE;
  },

  /**
   * Asigna la carrera activa para el docente.
   * Si el grupo actual no pertenece a la nueva carrera, autoselecciona el primer grupo de la misma.
   * @param {string} programId e.g. 'PROG-005'
   */
  setActiveProgramId(programId) {
    const exists = OFFICIAL_CATALOG_SEED.find(p => p.id === programId);
    if (!exists) {
      console.warn(`[TeacherContextService] Programa desconocido: ${programId}`);
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY_TEACHER_PROGRAM, programId);
      sessionStorage.setItem(STORAGE_KEY_TEACHER_PROGRAM, programId);
    } catch (e) {
      console.error('[TeacherContextService] Error persistiendo programa:', e);
    }

    // Comprobar si el grupo actual pertenece al nuevo programa
    const progGroups = this.getGroupsForProgram(programId);
    const currentGroupCode = this.getActiveGroupCode();
    const isCurrentValid = progGroups.some(g => g.grupoCode === currentGroupCode);
    if (!isCurrentValid && progGroups.length > 0) {
      this.setActiveGroupCode(progGroups[0].grupoCode, false);
    }

    this._notifyListeners();
    return true;
  },

  /**
   * Asigna el grupo activo del docente (ej. 'GRP-BD-007' o 'GAC-V1-GRP-BD-007')
   * @param {string} groupCodeOrId
   * @param {boolean} [shouldNotify=true]
   */
  setActiveGroupCode(groupCodeOrId, shouldNotify = true) {
    if (!groupCodeOrId) return false;
    // Extraer código canónico GRP-BD-XXX si viene con prefijo GAC-V1-
    const cleanCode = groupCodeOrId.includes('GRP-BD-')
      ? 'GRP-BD-' + groupCodeOrId.split('GRP-BD-')[1]
      : groupCodeOrId;

    const groupDef = FILE_GROUP_MAP.find(g => g.grupoCode === cleanCode);
    if (groupDef) {
      try {
        localStorage.setItem(STORAGE_KEY_TEACHER_GROUP, cleanCode);
        sessionStorage.setItem(STORAGE_KEY_TEACHER_GROUP, cleanCode);
      } catch (e) {
        console.error('[TeacherContextService] Error persistiendo grupo:', e);
      }

      // Si el grupo pertenece a otra carrera, sincronizar también la carrera
      if (groupDef.programaId !== this.getActiveProgramId()) {
        try {
          localStorage.setItem(STORAGE_KEY_TEACHER_PROGRAM, groupDef.programaId);
          sessionStorage.setItem(STORAGE_KEY_TEACHER_PROGRAM, groupDef.programaId);
        } catch { /* Ignorar */ }
      }
    }

    if (shouldNotify) {
      this._notifyListeners();
    }
    return true;
  },

  /**
   * Obtiene la información completa del grupo activo
   */
  getActiveGroupInfo() {
    const code = this.getActiveGroupCode();
    return FILE_GROUP_MAP.find(g => g.grupoCode === code) || FILE_GROUP_MAP[6]; // Default: Computación Presencial
  },

  /**
   * Obtiene el objeto completo del programa activo
   */
  getActiveProgram() {
    const id = this.getActiveProgramId();
    return OFFICIAL_CATALOG_SEED.find(p => p.id === id) || OFFICIAL_CATALOG_SEED[4]; // Default: Computación
  },

  /**
   * Notifica a todos los suscriptores cuando cambia el contexto docente
   */
  _notifyListeners() {
    const ctx = {
      program: this.getActiveProgram(),
      group: this.getActiveGroupInfo()
    };
    listeners.forEach(fn => {
      try { fn(ctx); } catch (err) { console.error('[TeacherContextService] Listener error:', err); }
    });
  },

  /**
   * Suscribe una función para escuchar cambios de aula (carrera o grupo) del docente
   * @param {Function} callback
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /**
   * Filtra una lista de grupos académicos por la carrera activa del docente
   * @param {Array} groups Lista de grupos de la BD
   * @param {string|null} programId Opcional, si no se envía usa el activo
   */
  filterGroups(groups, programId = null) {
    if (!Array.isArray(groups)) return [];
    const targetProgId = programId || this.getActiveProgramId();
    return groups.filter(g => g.programaId === targetProgId || g.programId === targetProgId || (g.program && g.program.id === targetProgId));
  },

  /**
   * Filtra una lista de matrículas por el grupo activo del docente
   * @param {Array} enrollments Lista de matrículas de la BD
   * @param {string|null} groupCode Opcional, si no se envía usa el activo
   */
  filterEnrollmentsByGroup(enrollments, groupCode = null) {
    if (!Array.isArray(enrollments)) return [];
    const targetCode = groupCode || this.getActiveGroupCode();
    return enrollments.filter(e => {
      const code = e.grupoCode || (e.grupoId ? (e.grupoId.includes('GRP-BD-') ? 'GRP-BD-' + e.grupoId.split('GRP-BD-')[1] : e.grupoId) : '');
      return code === targetCode;
    });
  },

  /**
   * Filtra los estudiantes retornando EXCLUSIVAMENTE aquellos matriculados en el aula / grupo activo
   * @param {Array} students Lista total de estudiantes
   * @param {Array} enrollments Lista total de matrículas
   * @param {string|null} groupCode Opcional, si no se envía usa el grupo activo
   */
  filterStudentsByGroup(students, enrollments, groupCode = null) {
    if (!Array.isArray(students)) return [];
    if (!Array.isArray(enrollments)) return students;
    const targetCode = groupCode || this.getActiveGroupCode();
    const enrolledStudentIds = new Set(
      enrollments
        .filter(e => {
          const code = e.grupoCode || (e.grupoId ? (e.grupoId.includes('GRP-BD-') ? 'GRP-BD-' + e.grupoId.split('GRP-BD-')[1] : e.grupoId) : '');
          return code === targetCode;
        })
        .map(e => String(e.estudianteId || e.studentId))
    );
    return students.filter(s => enrolledStudentIds.has(String(s.id)));
  },

  /**
   * Compatibilidad hacia atrás: filtra estudiantes por carrera general
   */
  filterStudents(students, enrollments, programId = null) {
    return this.filterStudentsByGroup(students, enrollments);
  }
};
