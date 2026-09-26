/**
 * Taxonomía de errores y servicio de manejo de excepciones
 * Módulo: M00 / M01
 */

export class AppError extends Error {
  constructor(message, category = 'SISTEMA', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDACION', details);
  }
}

export class AuditError extends AppError {
  constructor(message, details = null) {
    super(message, 'AUDITORIA', details);
  }
}

export class ConcurrencyError extends AppError {
  constructor(message, details = null) {
    super(message, 'CONCURRENCIA', details);
  }
}

export class IntegrityError extends AppError {
  constructor(message, details = null) {
    super(message, 'INTEGRIDAD', details);
  }
}

export class ImportConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 'IMPORTACION', details);
  }
}

export class OperationalError extends AppError {
  constructor(message, details = null) {
    super(message, 'OPERACIONAL', details);
  }
}

export class BlockedRuleError extends AppError {
  constructor(ruleCode, message) {
    super(`Regla Bloqueada [${ruleCode}]: ${message}`, 'REGLA_BLOQUEADA', { ruleCode });
  }
}

export const ErrorService = {
  /**
   * Procesa cualquier error capturado, registra detalles técnicos en consola y genera un mensaje amigable
   * @param {Error|AppError} error
   * @param {string} [context]
   * @returns {{ userMessage: string, category: string, technicalDetails: object }}
   */
  handleError(error, context = 'General') {
    const isCustom = error instanceof AppError;
    const category = isCustom ? error.category : 'SISTEMA';
    
    // Log completo en consola para diagnóstico técnico
    console.error(`[ErrorService][${context}][${category}]`, {
      name: error.name,
      message: error.message,
      category,
      details: isCustom ? error.details : null,
      stack: error.stack
    });

    let userMessage = 'Ha ocurrido un error inesperado en el sistema.';

    switch (category) {
      case 'VALIDACION':
        userMessage = `Datos no válidos: ${error.message}`;
        break;
      case 'AUDITORIA':
        userMessage = `Error de auditoría: ${error.message}`;
        break;
      case 'CONCURRENCIA':
        userMessage = `Conflicto de modificación: ${error.message}`;
        break;
      case 'INTEGRIDAD':
        userMessage = `Incapaz de completar la operación: ${error.message}`;
        break;
      case 'IMPORTACION':
        userMessage = `Conflicto en datos importados: ${error.message}`;
        break;
      case 'OPERACIONAL':
        userMessage = `Error en la base de datos local: ${error.message}`;
        break;
      case 'REGLA_BLOQUEADA':
        userMessage = `Operación no autorizada: ${error.message}`;
        break;
      default:
        userMessage = error.message || userMessage;
    }

    return {
      userMessage,
      category,
      technicalDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
  }
};
