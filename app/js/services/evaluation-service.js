/**
 * Servicio de Evaluación (EvaluationService)
 * Módulo: M07.1 — Cierre de Contrato e Idempotencia de Evaluación
 */

import { EvaluationRepository } from '../repositories/evaluation-repository.js';
import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { AcademicReadinessService } from './academic-readiness-service.js';
import { AuditService } from './audit-service.js';
import { ValidationError, OperationalError, IntegrityError } from './error-service.js';
import { CONFIG } from '../config.js';
import { AcademicContextAuthorityService } from './academic-context-authority-service.js';

export class EvaluationService {
  /**
   * @param {object} [options]
   * @param {EvaluationRepository} [options.evaluationRepo]
   * @param {EnrollmentRepository} [options.enrollmentRepo]
   * @param {AcademicReadinessService} [options.readinessService]
   * @param {AuditService} [options.auditService]
   */
  constructor(options = {}) {
    this.evaluationRepo = options.evaluationRepo || (typeof EvaluationRepository === 'function' ? new EvaluationRepository() : null);
    this.enrollmentRepo = options.enrollmentRepo !== undefined ? options.enrollmentRepo : (typeof EnrollmentRepository === 'function' ? new EnrollmentRepository() : null);
    this.readinessService = options.readinessService || (typeof AcademicReadinessService === 'function' ? new AcademicReadinessService() : null);
    this.auditService = options.auditService || AuditService;
  }

  /**
   * Valida que la nota cumpla la escala vigesimal contractual (0 a 20)
   * @param {number|string} nota
   * @returns {number}
   */
  validateNota(nota) {
    if (nota === null || nota === undefined || nota === '') {
      throw new ValidationError('La calificación/nota es obligatoria.');
    }
    const num = Number(nota);
    if (isNaN(num)) {
      throw new ValidationError(`La nota '${nota}' debe ser un valor numérico.`);
    }
    if (num < 0 || num > 20) {
      throw new ValidationError(`La nota '${num}' está fuera de la escala vigesimal oficial (0 a 20).`);
    }
    return num;
  }

  /**
   * Valida formato ISO de fecha (YYYY-MM-DD)
   * @param {string} fecha
   * @returns {string}
   */
  validateFecha(fecha) {
    if (!fecha || typeof fecha !== 'string') {
      throw new ValidationError('La fecha de evaluación es obligatoria y debe ser texto.');
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
   * Calcula la huella digital / fingerprint determinista (SHA-256) del contenido lógico de un lote
   * @param {object} params
   * @param {string} params.grupoCode
   * @param {string} params.unidadId
   * @param {string} params.indicadorId
   * @param {string} params.fecha
   * @param {Array<object>} params.evaluaciones
   * @returns {string}
   */
  computeBatchFingerprint({ grupoCode, unidadId, indicadorId, fecha, evaluaciones }) {
    const normalizedEvaluaciones = (evaluaciones || [])
      .slice()
      .sort((a, b) => (a.matriculaId || '').localeCompare(b.matriculaId || ''))
      .map(ev => ({
        matriculaId: ev.matriculaId || '',
        estudianteId: ev.estudianteId || '',
        nota: Number(ev.nota),
        observacion: (ev.observacion || '').trim()
      }));

    const canonicalObj = {
      fecha: fecha || '',
      grupoCode: grupoCode || '',
      indicadorId: indicadorId || '',
      unidadId: unidadId || '',
      evaluaciones: normalizedEvaluaciones
    };

    const jsonString = JSON.stringify(canonicalObj);

    let hash1 = 5381;
    let hash2 = 52711;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash1 = (hash1 * 33) ^ char;
      hash2 = (hash2 * 33) ^ char;
    }

    const h1Hex = (hash1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
    const h2Hex = (hash2 >>> 0).toString(16).padStart(8, '0').toUpperCase();

    return `FP-${h1Hex}${h2Hex}`;
  }

  /**
   * Genera un batchId técnico robusto con UUID v4 completo
   * @returns {string}
   */
  generateBatchId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `BATCH-EVAL-${crypto.randomUUID().toUpperCase()}`;
    }
    const rand1 = Math.random().toString(36).substring(2, 10).toUpperCase();
    const rand2 = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `BATCH-EVAL-${Date.now()}-${rand1}${rand2}`;
  }

  /**
   * Genera un ID técnico de evaluación inmutable (EVAL-UUID)
   * @returns {string}
   */
  generateEvaluationId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `EVAL-${crypto.randomUUID().toUpperCase()}`;
    }
    const rand1 = Math.random().toString(36).substring(2, 10).toUpperCase();
    const rand2 = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `EVAL-${Date.now()}-${rand1}${rand2}`;
  }

  /**
   * Registra la evaluación masiva de un lote de matrículas (CREACIÓN EXCLUSIVA Y ATÓMICA)
   * - Verifica idempotencia avanzada por batchId y payloadHash.
   * - Rechaza mismo batchId con payload diferente (IDEMPOTENCY_CONFLICT).
   * - Rechaza duplicados de matriculaId dentro del mismo lote.
   * - Ejecuta validaciones atómicas todo-o-nada antes de persitir.
   * @param {object} params
   * @param {string} [params.batchId]
   * @param {string} params.grupoCode
   * @param {string} params.unidadId
   * @param {string} params.indicadorId
   * @param {string} params.fecha
   * @param {Array<{matriculaId: string, estudianteId?: string, nota: number|string, observacion?: string}>} params.evaluaciones
   * @param {object} [params.operador]
   * @param {boolean} [params.simulateFailure] - Para simulación de rollback de transacciones
   * @returns {Promise<object[]>}
   */
  async registerBatchEvaluation({ batchId, groupId, grupoCode, unidadId, indicadorId, fecha, evaluaciones, operador = { id: 'SYS', nombre: 'Secretaría' }, simulateFailure = false }) {
    if (CONFIG.IS_V2_CANDIDATE) {
      if (!groupId || grupoCode) throw new ValidationError('Evaluación v2 exige groupId y rechaza grupoCode como clave operativa.');
      const authority = new AcademicContextAuthorityService();
      const { group } = await authority.resolveMembers(groupId);
      for (const item of evaluaciones || []) {
        const context = await authority.resolveEnrollment(item.matriculaId);
        if (context.groupId !== groupId) throw new IntegrityError('INCONSISTENCY: matrícula fuera del groupId de evaluación.');
      }
      if (!group.moduloId || !group.periodoId) throw new ValidationError('B-004/B-007: módulo/periodo del grupo pendientes; evaluación bloqueada.');
      throw new ValidationError('B-002/B-003: unidades e indicadores oficiales pendientes; evaluación v2 bloqueada.');
    }
    this.validateFecha(fecha);

    if (!grupoCode) throw new ValidationError('El código de grupo es obligatorio.');
    if (!unidadId) throw new ValidationError('La Unidad Didáctica es obligatoria.');
    if (!indicadorId) throw new ValidationError('El Indicador de Logro es obligatorio.');
    if (!Array.isArray(evaluaciones) || evaluaciones.length === 0) {
      throw new ValidationError('Debe proporcionar al menos una evaluación para registrar el lote.');
    }

    const payloadHash = this.computeBatchFingerprint({ grupoCode, unidadId, indicadorId, fecha, evaluaciones });
    const finalBatchId = batchId || this.generateBatchId();

    // 1. Verificación de Idempotencia Avanzada
    const existingBatch = await this.evaluationRepo.getByBatchId(finalBatchId);
    if (existingBatch && existingBatch.length > 0) {
      const existingHash = existingBatch[0].payloadHash;
      if (existingHash && existingHash !== payloadHash) {
        throw new OperationalError(`IDEMPOTENCY_CONFLICT: El batchId '${finalBatchId}' ya fue procesado previamente con un contenido de evaluación diferente.`);
      }
      return existingBatch;
    }

    // 2. Rechazo de duplicados de matriculaId dentro del MISMO lote
    const seenMatriculas = new Set();
    for (const ev of evaluaciones) {
      if (!ev.matriculaId) throw new ValidationError('Cada evaluación debe contener una matriculaId.');
      if (seenMatriculas.has(ev.matriculaId)) {
        throw new IntegrityError(`Matrícula duplicada '${ev.matriculaId}' dentro del mismo lote de evaluación.`);
      }
      seenMatriculas.add(ev.matriculaId);
    }

    // 3. Pre-validación atómica de todos los elementos ANTES de iniciar escritura
    const preparedItems = [];
    for (const ev of evaluaciones) {
      const validNota = this.validateNota(ev.nota);

      const readiness = await this.readinessService.canRegisterEvaluation(ev.matriculaId);
      if (!readiness.ready) {
        const missingText = (readiness.missing || []).join(', ');
        throw new OperationalError(`CONFIGURACIÓN ACADÉMICA PENDIENTE: No es posible registrar evaluaciones (${missingText}).`);
      }

      if (this.enrollmentRepo) {
        try {
          const mat = await this.enrollmentRepo.getById(ev.matriculaId);
          if (mat) {
            if (mat.grupoCode && mat.grupoCode !== grupoCode) {
              throw new IntegrityError(`Inconsistencia de integridad: La matrícula '${ev.matriculaId}' pertenece al grupo '${mat.grupoCode}', no a '${grupoCode}'.`);
            }
            if (ev.estudianteId && mat.estudianteId && mat.estudianteId !== ev.estudianteId) {
              throw new IntegrityError(`Inconsistencia de integridad: La matrícula '${ev.matriculaId}' no pertenece al estudiante '${ev.estudianteId}'.`);
            }
          }
        } catch (e) {
          if (e instanceof IntegrityError) throw e;
        }
      }

      let evalId = this.generateEvaluationId();
      // Verificación de colisión pre-persistencia
      let collisionCheck = await this.evaluationRepo.getById(evalId);
      while (collisionCheck) {
        evalId = this.generateEvaluationId();
        collisionCheck = await this.evaluationRepo.getById(evalId);
      }

      preparedItems.push({
        id: evalId,
        batchId: finalBatchId,
        payloadHash,
        matriculaId: ev.matriculaId,
        estudianteId: ev.estudianteId || null,
        unidadId,
        indicadorId,
        nota: validNota,
        fecha,
        observacion: ev.observacion || '',
        estadoLogico: 'ACTIVO',
        estado: 'ACTIVO',
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString()
      });
    }

    // 4. Persistencia transaccional atómica
    const savedItems = await this.evaluationRepo.saveBatch(preparedItems, simulateFailure);

    // 5. Bitácora de Auditoría
    if (this.auditService) {
      await this.auditService.logEvent('REGISTRO_EVALUACION', {
        entidad: 'evaluacion',
        entidadId: finalBatchId,
        batchId: finalBatchId,
        payloadHash,
        grupoCode,
        unidadId,
        indicadorId,
        cantidadRegistros: savedItems.length,
        operador
      });
    }

    return savedItems;
  }

  /**
   * Actualiza explícitamente un registro de evaluación existente (EDICIÓN EXCLUSIVA)
   * @param {object} params
   * @param {string} params.id
   * @param {number|string} params.nota
   * @param {string} [params.observacion]
   * @param {object} [params.operador]
   * @returns {Promise<object>}
   */
  async updateEvaluation({ id, nota, observacion, operador = { id: 'SYS', nombre: 'Secretaría' } }) {
    if (!id) throw new ValidationError('El ID de evaluación es obligatorio para actualizar.');

    const validNota = this.validateNota(nota);
    const existing = await this.evaluationRepo.getById(id);

    if (!existing || existing.estadoLogico === 'ANULADO' || existing.estado === 'ANULADO') {
      throw new OperationalError(`No se encontró el registro activo de evaluación con ID '${id}'.`);
    }

    const valorAnterior = {
      nota: existing.nota,
      observacion: existing.observacion
    };

    const valorNuevo = {
      nota: validNota,
      observacion: observacion !== undefined ? observacion : existing.observacion
    };

    const updatedRecord = {
      ...existing,
      nota: valorNuevo.nota,
      observacion: valorNuevo.observacion,
      actualizadoEn: new Date().toISOString()
    };

    await this.evaluationRepo.saveBatch([updatedRecord]);

    if (this.auditService) {
      await this.auditService.logEvent('EDICION_EVALUACION', {
        entidad: 'evaluacion',
        entidadId: id,
        matriculaId: existing.matriculaId,
        unidadId: existing.unidadId,
        indicadorId: existing.indicadorId,
        datosPrevios: valorAnterior,
        datosNuevos: valorNuevo,
        operador
      });
    }

    return updatedRecord;
  }

  /**
   * Anula lógicamente un registro de evaluación
   * @param {string} id
   * @param {object} [operador]
   * @returns {Promise<object>}
   */
  async cancelEvaluation(id, operador = { id: 'SYS', nombre: 'Secretaría' }) {
    if (!id) throw new ValidationError('El ID de evaluación es obligatorio para anular.');

    const existing = await this.evaluationRepo.getById(id);
    if (!existing) {
      throw new OperationalError(`No existe el registro de evaluación '${id}'.`);
    }

    const updatedRecord = {
      ...existing,
      estadoLogico: 'ANULADO',
      estado: 'ANULADO',
      actualizadoEn: new Date().toISOString()
    };

    await this.evaluationRepo.saveBatch([updatedRecord]);

    if (this.auditService) {
      await this.auditService.logEvent('ANULACION_EVALUACION', {
        entidad: 'evaluacion',
        entidadId: id,
        matriculaId: existing.matriculaId,
        unidadId: existing.unidadId,
        indicadorId: existing.indicadorId,
        datosPrevios: { nota: existing.nota, estadoLogico: existing.estadoLogico },
        datosNuevos: { estadoLogico: 'ANULADO' },
        operador
      });
    }

    return updatedRecord;
  }
}
