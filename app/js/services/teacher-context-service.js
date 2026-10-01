/**
 * Servicio de Contexto de Carrera y Especialidad para Docentes (TeacherContextService)
 * Módulo: M01/RBAC — Delimitación de Ámbito por Carrera / Programa de Estudios
 */

import { OFFICIAL_CATALOG_SEED } from './catalog-service.js';
import { ActiveStorageService as StorageService } from './active-storage-service.js';

const STORAGE_KEY_TEACHER_PROGRAM = 'CETPRO_TEACHER_ACTIVE_PROGRAM_ID';
const DEFAULT_TEACHER_PROGRAM_ID = 'PROG-005'; // Computación e Informática por defecto

const listeners = new Set();

export const TeacherContextService = {
  /**
   * Obtiene la lista oficial de programas formativos
   */
  getPrograms() {
    return OFFICIAL_CATALOG_SEED;
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
      // Ignorar fallback
    }
    return DEFAULT_TEACHER_PROGRAM_ID;
  },

  /**
   * Asigna la carrera activa para el docente y notifica a los oyentes
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
    listeners.forEach(fn => {
      try { fn(exists); } catch (err) { console.error('[TeacherContextService] Listener error:', err); }
    });
    return true;
  },

  /**
   * Obtiene el objeto completo del programa activo
   */
  getActiveProgram() {
    const id = this.getActiveProgramId();
    return OFFICIAL_CATALOG_SEED.find(p => p.id === id) || OFFICIAL_CATALOG_SEED[4]; // Default: Computación
  },

  /**
   * Suscribe una función para escuchar cambios de carrera del docente
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
    return groups.filter(g => g.programaId === targetProgId);
  },

  /**
   * Filtra una lista de matrículas por la carrera activa del docente
   * @param {Array} enrollments Lista de matrículas de la BD
   * @param {string|null} programId
   */
  filterEnrollments(enrollments, programId = null) {
    if (!Array.isArray(enrollments)) return [];
    const targetProgId = programId || this.getActiveProgramId();
    return enrollments.filter(e => e.programaId === targetProgId);
  },

  /**
   * Filtra los estudiantes retornando exclusivamente aquellos matriculados en la carrera activa
   * @param {Array} students Lista total de estudiantes
   * @param {Array} enrollments Lista total de matrículas
   * @param {string|null} programId
   */
  filterStudents(students, enrollments, programId = null) {
    if (!Array.isArray(students)) return [];
    if (!Array.isArray(enrollments)) return students;
    const targetProgId = programId || this.getActiveProgramId();
    const enrolledStudentIds = new Set(
      enrollments.filter(e => e.programaId === targetProgId).map(e => String(e.estudianteId || e.studentId))
    );
    return students.filter(s => enrolledStudentIds.has(String(s.id)));
  }
};
