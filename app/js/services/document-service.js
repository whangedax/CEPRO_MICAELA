/**
 * Servicio Central de Coordinación Documental (DocumentService)
 * Módulo: M10 — Motor Documental Institucional
 *
 * 1. Consume AcademicClosureReadinessService.
 * 2. Previews (DRAFT_PREVIEW / TEST_PREVIEW) NO escriben registros en el store 'documentos'.
 * 3. Prohíbe emisión oficial mientras academicClosureAllowed = false.
 */

import { TemplateRegistry } from './template-registry.js';
import { FieldMappingEngine } from './field-mapping-engine.js';
import { AcademicClosureReadinessService } from './academic-closure-readiness-service.js';
import { ValidationError } from './error-service.js';

export class DocumentService {
  constructor(dbOverride = null) {
    this.registry = new TemplateRegistry();
    this.mappingEngine = new FieldMappingEngine();
    this.readinessService = new AcademicClosureReadinessService(dbOverride);
  }

  /**
   * Genera la vista previa documental (Read-Only sin escribir en IndexedDB)
   * @param {string} templateId - ID de plantilla (ej. 'TMPL-01')
   * @param {object} payloadData - Datos de entrada para renderizado
   * @param {string} mode - 'DRAFT_PREVIEW' | 'TEST_PREVIEW'
   * @returns {Promise<object>} Objeto documental de vista previa
   */
  async generatePreview(templateId, payloadData = {}, mode = 'DRAFT_PREVIEW') {
    const template = this.registry.getById(templateId);
    if (!template) {
      throw new ValidationError(`La plantilla con ID "${templateId}" no existe en el catálogo documental.`);
    }

    if (template.implementationStatus !== 'READY_FOR_PREVIEW') {
      throw new ValidationError(`La plantilla "${template.name}" (${template.code}) aún no está implementada en M10. (Asignada a ${template.roadmapModule}).`);
    }

    if (mode !== 'DRAFT_PREVIEW' && mode !== 'TEST_PREVIEW' && mode !== 'DEBUG_BOXES' && mode !== 'CANONICAL_UNDERLAY_ONLY') {
      throw new ValidationError(`Modo documental "${mode}" no válido para vista previa.`);
    }

    // Probar readiness si se provee una matrícula en el payload
    let closureStatus = { academicClosureAllowed: false, blockedRules: [] };
    if (payloadData && payloadData.matriculaId) {
      try {
        closureStatus = await this.readinessService.evaluateClosureReadiness(payloadData.matriculaId);
      } catch (e) {
        // En preview sin matrícula real en DB se mantiene por defecto bloqueado
      }
    }

    const mappedFields = this.mappingEngine.mapFields(templateId, payloadData, mode);

    let paginationInfo = null;
    if (templateId === 'TMPL-01') {
      const studentsList = Array.isArray(payloadData.studentsList) ? payloadData.studentsList : [];
      const totalStudents = studentsList.length;
      const confirmedCapacity = 30;
      const capacityExceeded = totalStudents > confirmedCapacity;
      const renderedCount = Math.min(totalStudents, confirmedCapacity);
      const overflowCount = Math.max(0, totalStudents - confirmedCapacity);
      const pageCount = 1;
      const status = capacityExceeded ? 'CAPACITY_EXCEEDED' : 'OK';
      const printAllowedForPreview = !capacityExceeded;

      const overflowList = capacityExceeded
        ? studentsList.slice(confirmedCapacity).map((st, idx) => ({
            overflowIndex: confirmedCapacity + idx + 1,
            matriculaId: st.matriculaId || st.id || `MAT-OVERFLOW-${confirmedCapacity + idx + 1}`,
            numeroDocumento: st.numeroDocumento || st.documento || '[PENDIENTE]',
            apellidosNombres: st.apellidosNombres || st.nombreCompleto || st.estudianteNombreCompleto || '[PENDIENTE]'
          }))
        : [];

      paginationInfo = {
        totalStudents,
        confirmedCapacity,
        renderedCount,
        overflowCount,
        pageCount,
        status,
        capacityExceeded,
        printAllowedForPreview,
        overflowList,
        capacityWarning: capacityExceeded
          ? `CAPACIDAD DE PLANTILLA SUPERADA: La fuente oficial auditada confirma 2 páginas / 60 posiciones. (Registrados: ${totalStudents}, Excedentes: ${overflowCount}). No es posible imprimir una nómina completa sin validar páginas adicionales.`
          : null
      };
    }

    return {
      template,
      mode,
      mappedFields,
      payloadData,
      paginationInfo,
      academicClosureAllowed: false, // Inflexiblemente false mientras sigan bloqueos
      officialEmissionStatus: 'OFFICIAL_BLOCKED',
      isPersisted: false // IMPORTANTE: Preview ≠ Emisión (0 escrituras en store documentos)
    };
  }

  /**
   * Intenta emitir un documento oficial (ESTRICTAMENTE BLOQUEADO EN M10)
   */
  async generateOfficialDocument(templateId, matriculaId) {
    throw new ValidationError('EMISIÓN OFICIAL BLOQUEADA: Mientras no exista resolución de bloqueos institucionales (B-002..B-007) y academicClosureAllowed sea false, está estrictamente prohibido emitir documentos oficiales.');
  }
}
