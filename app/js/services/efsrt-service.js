/**
 * Servicio de Gestión de Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT)
 * Módulo: M08 — EFSRT
 */

import { EfsrtRepository } from '../repositories/efsrt-repository.js';
import { AuditService } from './audit-service.js';
import { ValidationError } from './error-service.js';
import { CONFIG } from '../config.js';
import { AcademicContextAuthorityService } from './academic-context-authority-service.js';

export class EfsrtService {
  constructor(dbOverride = null) {
    this.repo = new EfsrtRepository(dbOverride);
  }

  /**
   * Genera un identificador opaco y robusto para EFSRT
   * @returns {string}
   */
  generateEfsrtId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `EFSRT-${crypto.randomUUID()}`;
    }
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `EFSRT-${timestamp}-${random}`;
  }

  /**
   * Valida los datos contractuales de una experiencia EFSRT
   * @param {object} data
   */
  validateEfsrtData(data) {
    if (!data) {
      throw new ValidationError('Los datos de EFSRT son obligatorios.');
    }

    if (!data.matriculaId || typeof data.matriculaId !== 'string' || data.matriculaId.trim() === '') {
      throw new ValidationError('El ID de matrícula (matriculaId) es obligatorio.');
    }

    if (!data.moduloId || typeof data.moduloId !== 'string' || data.moduloId.trim() === '') {
      throw new ValidationError('El ID de módulo (moduloId) es obligatorio.');
    }

    if (data.empresa === undefined || data.empresa === null || String(data.empresa).trim() === '') {
      throw new ValidationError('El nombre de la empresa u organización es obligatorio.');
    }

    const horas = Number(data.horasRealizadas);
    if (isNaN(horas) || horas < 0) {
      throw new ValidationError('Las horas realizadas deben ser un número válido no negativo.');
    }

    if (!data.fechaInicio || isNaN(Date.parse(data.fechaInicio))) {
      throw new ValidationError('La fecha de inicio es obligatoria y debe ser una fecha válida.');
    }

    if (data.fechaFin) {
      if (isNaN(Date.parse(data.fechaFin))) {
        throw new ValidationError('La fecha de fin debe ser una fecha válida.');
      }
      if (new Date(data.fechaFin) < new Date(data.fechaInicio)) {
        throw new ValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      }
    }

    if (data.nota !== undefined && data.nota !== null && data.nota !== '') {
      const notaNum = Number(data.nota);
      if (isNaN(notaNum)) {
        throw new ValidationError('La nota de EFSRT debe ser numérica.');
      }
      if (notaNum < 0) {
        throw new ValidationError('La nota no puede ser menor a 0.');
      }
      if (notaNum > 20) {
        throw new ValidationError('La nota no puede ser mayor a 20.');
      }
    }
  }

  /**
   * Registra una nueva experiencia EFSRT (Creación)
   * @param {object} efsrtData
   * @param {string} [operator='SECRETARIA_LOCAL']
   * @returns {Promise<object>}
   */
  async registerEfsrt(efsrtData, operator = 'SECRETARIA_LOCAL') {
    if (CONFIG.IS_V2_CANDIDATE) {
      if (!efsrtData?.groupId || efsrtData.grupoCode) throw new ValidationError('EFSRT v2 exige groupId y rechaza grupoCode como clave operativa.');
      const context = await new AcademicContextAuthorityService().resolveEnrollment(efsrtData.matriculaId);
      if (context.groupId !== efsrtData.groupId) throw new ValidationError('INCONSISTENCY: groupId de EFSRT no corresponde a la matrícula.');
      if (efsrtData.moduloId && efsrtData.moduloId !== context.moduloId) throw new ValidationError('INCONSISTENCY: módulo autodeclarado difiere del grupo.');
      if (!context.moduloId || !context.periodoId) throw new ValidationError('B-004/B-007: contexto GROUP pendiente; EFSRT bloqueada.');
      throw new ValidationError('B-005: reglas oficiales EFSRT pendientes; candidata bloqueada.');
    }
    this.validateEfsrtData(efsrtData);

    const id = efsrtData.id || this.generateEfsrtId();
    const now = new Date().toISOString();

    const record = {
      id,
      matriculaId: efsrtData.matriculaId.trim(),
      moduloId: efsrtData.moduloId.trim(),
      empresa: String(efsrtData.empresa).trim(),
      horasRealizadas: Number(efsrtData.horasRealizadas),
      fechaInicio: efsrtData.fechaInicio,
      fechaFin: efsrtData.fechaFin || null,
      nota: (efsrtData.nota !== undefined && efsrtData.nota !== null && efsrtData.nota !== '') ? Number(efsrtData.nota) : null,
      estado: efsrtData.estado || 'REGISTRADO',
      // Extensiones técnicas
      observacion: efsrtData.observacion || '',
      estadoLogico: 'ACTIVO',
      creadoEn: now,
      actualizadoEn: now
    };

    await this.repo.saveRecord(record);

    await AuditService.record({
      entidad: 'EFSRT',
      idEntidad: id,
      accion: 'REGISTRO_EFSRT',
      estadoAnterior: null,
      estadoNuevo: record,
      origen: operator
    });

    return record;
  }

  /**
   * Edita explícitamente una experiencia EFSRT existente (Edición)
   * @param {object} efsrtData
   * @param {string} [operator='SECRETARIA_LOCAL']
   * @returns {Promise<object>}
   */
  async updateEfsrt(efsrtData, operator = 'SECRETARIA_LOCAL') {
    if (CONFIG.IS_V2_CANDIDATE) throw new ValidationError('EFSRT v2 bloqueada hasta validar reglas oficiales GROUP; sin escritura.');
    if (!efsrtData || !efsrtData.id) {
      throw new ValidationError('El ID de EFSRT es obligatorio para la edición.');
    }

    const current = await this.repo.getById(efsrtData.id);
    if (!current) {
      throw new ValidationError(`Registro EFSRT con ID "${efsrtData.id}" no encontrado.`);
    }

    this.validateEfsrtData({
      ...current,
      ...efsrtData
    });

    const now = new Date().toISOString();
    const updated = {
      ...current,
      empresa: efsrtData.empresa !== undefined ? String(efsrtData.empresa).trim() : current.empresa,
      horasRealizadas: efsrtData.horasRealizadas !== undefined ? Number(efsrtData.horasRealizadas) : current.horasRealizadas,
      fechaInicio: efsrtData.fechaInicio || current.fechaInicio,
      fechaFin: efsrtData.fechaFin !== undefined ? (efsrtData.fechaFin || null) : current.fechaFin,
      nota: efsrtData.nota !== undefined ? (efsrtData.nota !== null && efsrtData.nota !== '' ? Number(efsrtData.nota) : null) : current.nota,
      estado: efsrtData.estado || current.estado,
      observacion: efsrtData.observacion !== undefined ? efsrtData.observacion : current.observacion,
      actualizadoEn: now
    };

    await this.repo.saveRecord(updated);

    await AuditService.record({
      entidad: 'EFSRT',
      idEntidad: current.id,
      accion: 'EDICION_EFSRT',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: operator
    });

    return updated;
  }

  /**
   * Anula lógicamente un registro EFSRT
   * @param {string} id
   * @param {string} [operator='SECRETARIA_LOCAL']
   * @param {string} [reason='ANULACION_ADMINISTRATIVA']
   * @returns {Promise<object>}
   */
  async cancelEfsrt(id, operator = 'SECRETARIA_LOCAL', reason = 'ANULACION_ADMINISTRATIVA') {
    if (CONFIG.IS_V2_CANDIDATE) throw new ValidationError('EFSRT v2 bloqueada hasta validar reglas oficiales GROUP; sin escritura.');
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('El ID de EFSRT es obligatorio para la anulación.');
    }

    const current = await this.repo.getById(id);
    if (!current) {
      throw new ValidationError(`Registro EFSRT con ID "${id}" no encontrado.`);
    }

    const now = new Date().toISOString();
    const updated = {
      ...current,
      estadoLogico: 'ANULADO',
      estado: 'ANULADO',
      actualizadoEn: now
    };

    await this.repo.saveRecord(updated);

    await AuditService.record({
      entidad: 'EFSRT',
      idEntidad: current.id,
      accion: 'ANULACION_EFSRT',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: {
        usuarioOperador: operator,
        motivo: reason
      }
    });

    return updated;
  }

  /**
   * Obtiene un registro por ID
   * @param {string} id
   */
  async getById(id) {
    return this.repo.getById(id);
  }

  /**
   * Lista registros por matrícula
   * @param {string} matriculaId
   */
  async getByMatriculaId(matriculaId) {
    return this.repo.getByMatriculaId(matriculaId);
  }

  /**
   * Lista registros por módulo
   * @param {string} moduloId
   */
  async getByModuloId(moduloId) {
    return this.repo.getByModuloId(moduloId);
  }

  /**
   * Lista todos los registros EFSRT
   */
  async listAll() {
    return this.repo.list();
  }
}
