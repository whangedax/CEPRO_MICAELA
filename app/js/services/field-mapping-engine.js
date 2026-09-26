/**
 * Motor Declarativo de Mapeo de Campos (FieldMappingEngine)
 * Módulo: M10 — Motor Documental Institucional
 *
 * Resuelve rutas de datos del sistema hacia campos visuales de plantillas.
 * Distingue estrictamente requiredForPreview de requiredForOfficial.
 */

import { TransformEngine } from './transform-engine.js';
import { ValidationError } from './error-service.js';

export const FIELD_MAPPINGS = {
  'TMPL-01': [
    {
      fieldId: 'INSTITUCION_NOMBRE',
      sourcePath: 'institution.nombre',
      targetSelector: 'institucion-nombre',
      transform: 'UPPERCASE',
      requiredForPreview: false,
      requiredForOfficial: true,
      blockedByRule: null
    },
    {
      fieldId: 'PROGRAMA_NOMBRE',
      sourcePath: 'program.nombre',
      targetSelector: 'programa-nombre',
      transform: 'UPPERCASE',
      requiredForPreview: false,
      requiredForOfficial: true,
      blockedByRule: null
    },
    {
      fieldId: 'MODULO_NOMBRE',
      sourcePath: 'module.nombre',
      targetSelector: 'modulo-nombre',
      transform: 'UPPERCASE',
      requiredForPreview: false,
      requiredForOfficial: true,
      blockedByRule: 'B-004'
    },
    {
      fieldId: 'PERIODO_NOMBRE',
      sourcePath: 'period.nombre',
      targetSelector: 'periodo-nombre',
      transform: 'UPPERCASE',
      requiredForPreview: false,
      requiredForOfficial: true,
      blockedByRule: 'B-007'
    },
    {
      fieldId: 'ESTUDIANTES_LISTA',
      sourcePath: 'studentsList',
      targetSelector: 'estudiantes-tabla',
      transform: 'IDENTITY',
      requiredForPreview: true,
      requiredForOfficial: true,
      blockedByRule: null
    }
  ],
  'TMPL-03': [
    {
      fieldId: 'INSTITUCION_NOMBRE',
      sourcePath: 'institution.nombre',
      targetSelector: 'institucion-nombre',
      transform: 'UPPERCASE',
      requiredForPreview: false,
      requiredForOfficial: true,
      blockedByRule: null
    },
    {
      fieldId: 'PROGRAMA_NOMBRE',
      sourcePath: 'program.nombre',
      targetSelector: 'programa-nombre',
      transform: 'UPPERCASE',
      requiredForPreview: false,
      requiredForOfficial: true,
      blockedByRule: null
    },
    {
      fieldId: 'GRUPO_CODE',
      sourcePath: 'groupCode',
      targetSelector: 'grupo-code',
      transform: 'UPPERCASE',
      requiredForPreview: true,
      requiredForOfficial: true,
      blockedByRule: null
    },
    {
      fieldId: 'REGISTROS_MATRICULA',
      sourcePath: 'enrollmentsList',
      targetSelector: 'matriculas-tabla',
      transform: 'IDENTITY',
      requiredForPreview: true,
      requiredForOfficial: true,
      blockedByRule: null
    }
  ]
};

export class FieldMappingEngine {
  constructor() {
    this.transformEngine = new TransformEngine();
  }

  /**
   * Resuelve el mapeo de campos para una plantilla y un payload de datos de entrada
   * @param {string} templateId - ID de la plantilla ('TMPL-01', 'TMPL-03', etc.)
   * @param {object} payload - Objeto con datos del sistema
   * @param {string} mode - Modo documental ('DRAFT_PREVIEW' | 'TEST_PREVIEW' | 'OFFICIAL_BLOCKED')
   * @returns {object} Objeto mapeado y transformado por selector
   */
  mapFields(templateId, payload = {}, mode = 'DRAFT_PREVIEW') {
    const rules = FIELD_MAPPINGS[templateId] || [];
    const mapped = {};

    for (const rule of rules) {
      let rawVal = this._getValueByPath(payload, rule.sourcePath);

      if (rawVal === undefined || rawVal === null || rawVal === '') {
        if (mode === 'DRAFT_PREVIEW') {
          rawVal = '[PENDIENTE]';
        } else {
          rawVal = '';
        }
      }

      let transformedVal;
      try {
        transformedVal = this.transformEngine.transform(rawVal, rule.transform);
      } catch (err) {
        if (err instanceof ValidationError) throw err;
        transformedVal = '[ERROR_TRANSFORM]';
      }

      mapped[rule.targetSelector] = {
        fieldId: rule.fieldId,
        value: transformedVal,
        requiredForPreview: rule.requiredForPreview,
        requiredForOfficial: rule.requiredForOfficial,
        blockedByRule: rule.blockedByRule
      };
    }

    return mapped;
  }

  _getValueByPath(obj, pathStr) {
    if (!obj || !pathStr) return undefined;
    const parts = pathStr.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[p];
    }
    return curr;
  }
}
