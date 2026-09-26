/**
 * Motor de Transformaciones Técnicas Permitidas (TransformEngine)
 * Módulo: M10 — Motor Documental Institucional
 *
 * Ejecuta únicamente transformaciones técnicas seguras.
 * Rechaza explícitamente cualquier intento de transformación académica o de folio no normado.
 */

import { ValidationError } from './error-service.js';

export const FORBIDDEN_TRANSFORMS = [
  'AVERAGE',
  'PASS_FAIL',
  'CALCULATE_ATTENDANCE',
  'EFSRT_COMPLIANCE',
  'INFER_MODULE',
  'INFER_PERIOD',
  'GENERATE_FOLIO'
];

export class TransformEngine {
  /**
   * Transforma un valor según el tipo de transformación declarada
   * @param {any} val - Valor de entrada
   * @param {string} transformType - Tipo de transformación
   * @returns {string} Valor transformado
   */
  transform(val, transformType = 'IDENTITY') {
    if (FORBIDDEN_TRANSFORMS.includes(transformType)) {
      throw new ValidationError(`La transformación "${transformType}" está expresamente PROHIBIDA en el motor documental por las reglas normativas del proyecto (B-002..B-007).`);
    }

    if (val === undefined || val === null) {
      return '';
    }

    switch (transformType) {
      case 'IDENTITY':
        return String(val);

      case 'UPPERCASE':
        return String(val).toUpperCase();

      case 'LOWERCASE':
        return String(val).toLowerCase();

      case 'FORMAT_DATE':
        // Convierte YYYY-MM-DD a DD/MM/YYYY
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          const parts = val.substring(0, 10).split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return String(val);

      case 'JOIN_NAME':
        if (typeof val === 'object' && val !== null) {
          const p = val.apellidoPaterno || '';
          const m = val.apellidoMaterno || '';
          const n = val.nombres || '';
          return `${p} ${m}, ${n}`.trim().toUpperCase();
        }
        return String(val).toUpperCase();

      case 'FORMAT_NUMBER':
        const num = Number(val);
        return isNaN(num) ? String(val) : num.toFixed(2);

      case 'MULTILINE':
        return String(val).replace(/\n/g, '<br/>');

      default:
        return String(val);
    }
  }
}
