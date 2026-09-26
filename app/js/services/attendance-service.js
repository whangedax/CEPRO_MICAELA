/**
 * Servicio de Asistencia (AttendanceService)
 * Módulo: M06.1 — Cierre de Modelo de Asistencia y Sesiones
 */

import { AttendanceRepository } from '../repositories/attendance-repository.js';
import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { AcademicReadinessService } from './academic-readiness-service.js';
import { AuditService } from './audit-service.js';
import { ValidationError, OperationalError, IntegrityError } from './error-service.js';
import { CONFIG } from '../config.js';
import { AcademicContextAuthorityService } from './academic-context-authority-service.js';

export const OFFICIAL_ATTENDANCE_STATES = {
  PRESENTE: 'Presente',
  FALTA: 'Falta',
  TARDANZA: 'Tardanza',
  JUSTIFICADO: 'Justificado'
};

export class AttendanceService {
  /**
   * @param {object} [options]
   * @param {AttendanceRepository} [options.attendanceRepo]
   * @param {EnrollmentRepository} [options.enrollmentRepo]
   * @param {AcademicReadinessService} [options.readinessService]
   * @param {AuditService} [options.auditService]
   */
  constructor(options = {}) {
    this.attendanceRepo = options.attendanceRepo || new AttendanceRepository();
    this.enrollmentRepo = options.enrollmentRepo || new EnrollmentRepository();
    this.readinessService = options.readinessService || new AcademicReadinessService();
    this.auditService = options.auditService || AuditService;
  }

  /**
   * Valida la estructura y formato de una fecha ISO (YYYY-MM-DD)
   * @param {string} fecha
   */
  validateFecha(fecha) {
    if (!fecha || typeof fecha !== 'string') {
      throw new ValidationError('La fecha de asistencia es obligatoria y debe ser texto.');
    }
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) {
      throw new ValidationError(`Formato de fecha inválido '${fecha}'. Debe ser YYYY-MM-DD.`);
    }
    const d = new Date(fecha + 'T00:00:00Z');
    if (isNaN(d.getTime())) {
      throw new ValidationError(`Fecha corrupta o inexistente '${fecha}'.`);
    }
    return fecha;
  }

  /**
   * Valida las horas de clase asociadas
   * @param {number} [horas]
   */
  validateHoras(horas) {
    if (horas !== undefined && horas !== null) {
      if (typeof horas !== 'number' || isNaN(horas) || horas < 0) {
        throw new ValidationError('Las horas de asistencia no pueden ser negativas o inválidas.');
      }
    }
    return horas;
  }

  /**
   * Genera un identificador técnico de sesión opaco, inmutable y robusto (SES-<UUID COMPLETO>)
   * @param {string} [fecha] - Metadata opcional sin interpretación de negocio
   * @returns {string}
   */
  generateSessionId(fecha) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `SES-${crypto.randomUUID().toUpperCase()}`;
    }
    const cleanFecha = (fecha || '').replace(/-/g, '');
    const rand1 = Math.random().toString(36).substring(2, 10).toUpperCase();
    const rand2 = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `SES-${cleanFecha}-${Date.now()}-${rand1}${rand2}`;
  }

  /**
   * Registra la asistencia de un lote de matrículas para una sesión lectiva (CREACIÓN EXCLUSIVA)
   * Si ya existe un registro para (matriculaId + sesionId), RECHAZA la operación como duplicado.
   * @param {object} params
   * @param {string} params.grupoCode
   * @param {string} params.unidadId
   * @param {string} params.fecha - YYYY-MM-DD
   * @param {string} [params.sesionId] - Identificador técnico de sesión. Si no se envía se genera uno nuevo comprobando colisiones.
   * @param {number} [params.horas]
   * @param {Array<{matriculaId: string, estudianteId: string, estado: string, observaciones?: string, periodoId?: string, moduloId?: string}>} params.asistencias
   * @param {object} [params.operador]
   */
  async registerBatchAttendance({ groupId, grupoCode, unidadId, fecha, sesionId, horas, asistencias, operador = { id: 'SYS', nombre: 'Secretaría' } }) {
    if (CONFIG.IS_V2_CANDIDATE) {
      if (!groupId || grupoCode) throw new ValidationError('Registro v2 exige groupId y rechaza grupoCode como clave operativa.');
      const authority = new AcademicContextAuthorityService();
      const { group } = await authority.resolveMembers(groupId);
      for (const item of asistencias || []) {
        const context = await authority.resolveEnrollment(item.matriculaId);
        if (context.groupId !== groupId) throw new IntegrityError('INCONSISTENCY: matrícula fuera del groupId de asistencia.');
      }
      if (!group.moduloId || !group.periodoId) throw new ValidationError('B-004/B-007: módulo/periodo del grupo pendientes; asistencia bloqueada.');
      throw new ValidationError('B-002: currículo oficial pendiente; asistencia v2 bloqueada.');
    }
    this.validateFecha(fecha);
    this.validateHoras(horas);

    if (!unidadId) {
      throw new ValidationError('La Unidad Didáctica es obligatoria para registrar asistencia.');
    }

    if (!Array.isArray(asistencias) || asistencias.length === 0) {
      throw new ValidationError('Debe proporcionar al menos un registro de asistencia.');
    }

    // Identificador técnico de sesión opaco con verificación anti-colisión
    let targetSesionId = (sesionId && typeof sesionId === 'string' && sesionId.trim())
      ? sesionId.trim()
      : null;

    if (!targetSesionId) {
      targetSesionId = this.generateSessionId(fecha);
      // Detección y resolución explícita de colisiones previas antes de persistir
      let existingWithSession = await this.attendanceRepo.getBySessionId(targetSesionId);
      let retries = 0;
      while (existingWithSession && existingWithSession.length > 0 && retries < 5) {
        targetSesionId = this.generateSessionId(fecha);
        existingWithSession = await this.attendanceRepo.getBySessionId(targetSesionId);
        retries++;
      }
    }

    // Comprobación de Prerrequisitos de Lectura/Escritura vía AcademicReadinessService
    for (const item of asistencias) {
      const readiness = await this.readinessService.canRegisterAttendance(item.matriculaId);
      if (!readiness.ready) {
        throw new OperationalError(
          `Registro de Asistencia bloqueado para la matrícula '${item.matriculaId}': ` +
          `Configuración académica pendiente (${readiness.missing.join(', ')}).`
        );
      }
    }

    // Validar coherencia referencial e inasistencia de duplicados previos
    for (const item of asistencias) {
      if (!item.matriculaId || !item.estudianteId) {
        throw new ValidationError('Cada elemento de asistencia debe contener matriculaId y estudianteId.');
      }

      // Validar coherencia referencial entre matriculaId, grupoCode y estudianteId
      if (this.enrollmentRepo && typeof this.enrollmentRepo.getById === 'function') {
        try {
          const enrollment = await this.enrollmentRepo.getById(item.matriculaId);
          if (enrollment) {
            if (enrollment.grupoCode && enrollment.grupoCode !== grupoCode) {
              throw new IntegrityError(
                `Incoherencia referencial: la matrícula '${item.matriculaId}' pertenece al grupo '${enrollment.grupoCode}', no al grupo '${grupoCode}'.`
              );
            }
            if (enrollment.estudianteId && enrollment.estudianteId !== item.estudianteId) {
              throw new IntegrityError(
                `Incoherencia referencial: la matrícula '${item.matriculaId}' corresponde al estudiante '${enrollment.estudianteId}', no a '${item.estudianteId}'.`
              );
            }
          }
        } catch (err) {
          if (err instanceof IntegrityError) throw err;
          // Ignorar si el repositorio está en ambiente aislado sin DB inicializada
        }
      }

      // Rechazo estricto de duplicados intra-sesión (matriculaId + targetSesionId)
      const previa = await this.attendanceRepo.getByMatriculaAndSession(item.matriculaId, targetSesionId);
      if (previa && previa.estadoLogico !== 'ANULADO') {
        throw new ValidationError(
          `Registro de asistencia ya existente para esta sesión: la matrícula '${item.matriculaId}' ya cuenta con asistencia registrada en la sesión '${targetSesionId}'. Utilice la acción explícita de edición (updateAttendance) para realizar modificaciones.`
        );
      }
    }

    const registrosAGuardar = [];
    const timestamp = new Date().toISOString();

    for (const item of asistencias) {
      const estado = item.estado || OFFICIAL_ATTENDANCE_STATES.PRESENTE;
      if (!Object.values(OFFICIAL_ATTENDANCE_STATES).includes(estado)) {
        throw new ValidationError(`Estado de asistencia no válido '${estado}'. Debe ser uno de: ${Object.values(OFFICIAL_ATTENDANCE_STATES).join(', ')}.`);
      }

      const id = `ASIS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const registro = {
        id,
        matriculaId: item.matriculaId,
        estudianteId: item.estudianteId,
        grupoCode,
        periodoId: item.periodoId || null,
        moduloId: item.moduloId || null,
        unidadId,
        sesionId: targetSesionId,
        fecha,
        horas: horas !== undefined ? horas : 0,
        estado,
        observaciones: item.observaciones || '',
        estadoLogico: 'ACTIVO',
        actualizadoEn: timestamp,
        creadoEn: timestamp
      };

      registrosAGuardar.push(registro);
    }

    await this.attendanceRepo.saveBatch(registrosAGuardar);

    // Bitácora de Auditoría Inmutable (REGISTRO_ASISTENCIA)
    for (const registro of registrosAGuardar) {
      await this.auditService.logEvent(
        'REGISTRO_ASISTENCIA',
        'asistencia',
        registro.id,
        null,
        registro,
        { operador, grupoCode, unidadId, fecha, sesionId: targetSesionId }
      );
    }

    return registrosAGuardar;
  }

  /**
   * Modifica explícitamente el estado o campos de una asistencia existente (EDICIÓN EXPLÍCITA)
   * Conserva inalterado el sesionId original y genera auditoría de diferencias (valorAnterior vs valorNuevo).
   * @param {object} params
   * @param {string} params.id - Identificador idAsistencia
   * @param {string} params.estado - Nuevo estado
   * @param {string} [params.observaciones]
   * @param {object} [params.operador]
   */
  async updateAttendance({ id, estado, observaciones, operador = { id: 'SYS', nombre: 'Secretaría' } }) {
    if (!id) {
      throw new ValidationError('El ID del registro de asistencia es obligatorio para la edición.');
    }

    const existing = await this.attendanceRepo.getById(id);
    if (!existing) {
      throw new ValidationError(`Registro de asistencia con ID '${id}' no encontrado.`);
    }

    if (existing.estadoLogico === 'ANULADO') {
      throw new OperationalError('No se puede editar un registro de asistencia anulado.');
    }

    if (!estado || !Object.values(OFFICIAL_ATTENDANCE_STATES).includes(estado)) {
      throw new ValidationError(`Estado de asistencia no válido '${estado}'. Debe ser uno de: ${Object.values(OFFICIAL_ATTENDANCE_STATES).join(', ')}.`);
    }

    const timestamp = new Date().toISOString();
    const updated = {
      ...existing,
      estado,
      observaciones: observaciones !== undefined ? observaciones : existing.observaciones,
      actualizadoEn: timestamp
    };

    if (this.attendanceRepo.update && typeof this.attendanceRepo.update === 'function') {
      await this.attendanceRepo.update(updated);
    } else {
      await this.attendanceRepo.saveBatch([updated]);
    }

    await this.auditService.logEvent(
      'EDICION_ASISTENCIA',
      'asistencia',
      id,
      existing,
      updated,
      {
        operador,
        sesionId: existing.sesionId,
        matriculaId: existing.matriculaId,
        valorAnterior: existing.estado,
        valorNuevo: estado
      }
    );

    return updated;
  }

  /**
   * Obtiene el listado de asistencia para una sesión o contexto académico
   * @param {string} unidadId
   * @param {string} fecha
   * @param {string[]} matriculaIds
   * @param {string} [sesionId]
   */
  async getAttendanceContext(unidadId, fecha, matriculaIds, sesionId = null) {
    this.validateFecha(fecha);
    return await this.attendanceRepo.getByContext(matriculaIds, unidadId, fecha, sesionId);
  }

  /**
   * Anula un registro de asistencia conservando el sesionId original y generando auditoría
   * @param {string} asistenciaId
   * @param {object} operador
   */
  async cancelAttendance(asistenciaId, operador = { id: 'SYS', nombre: 'Secretaría' }) {
    const existing = await this.attendanceRepo.getById(asistenciaId);
    if (!existing) {
      throw new ValidationError(`Registro de asistencia con ID '${asistenciaId}' no encontrado.`);
    }

    const updated = {
      ...existing,
      estado: 'ANULADO',
      estadoLogico: 'ANULADO',
      actualizadoEn: new Date().toISOString()
    };

    if (this.attendanceRepo.update && typeof this.attendanceRepo.update === 'function') {
      await this.attendanceRepo.update(updated);
    } else {
      await this.attendanceRepo.saveBatch([updated]);
    }

    await this.auditService.logEvent(
      'ANULACION_ASISTENCIA',
      'asistencia',
      asistenciaId,
      existing,
      updated,
      { operador, sesionId: existing.sesionId, matriculaId: existing.matriculaId }
    );

    return updated;
  }
}
