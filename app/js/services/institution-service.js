/**
 * Servicio de Gestión Institucional
 * Módulo: M02 - Catálogos y Configuración
 */

import { InstitutionRepository } from '../repositories/institution-repository.js';
import { AuditService } from './audit-service.js';
import { ValidationError } from './error-service.js';

const PROFILE_FIELDS = Object.freeze([
  'id', 'nombre', 'denominacionVisible', 'tipoGestion', 'ugel',
  'resolucionAutorizacion1', 'resolucionAutorizacion2', 'resolucion',
  'direccion', 'telefono', 'celular1', 'celular2', 'dre', 'codigoModular',
  'departamento', 'provincia', 'distrito', 'fuente', 'fuenteDescripcion',
  'sourceMigrationVersion'
]);
export const EDITABLE_INSTITUTION_FIELDS = Object.freeze([
  'nombre', 'denominacionVisible', 'tipoGestion', 'ugel',
  'resolucionAutorizacion1', 'resolucionAutorizacion2',
  'direccion', 'telefono', 'celular1', 'celular2',
  'dre', 'codigoModular', 'departamento', 'provincia', 'distrito'
]);
const PENDING_INSTITUTION_FIELDS = Object.freeze([
  'dre', 'codigoModular', 'departamento', 'provincia', 'distrito'
]);

export function normalizeInstitutionProfile(record) {
  const profile = PROFILE_FIELDS.reduce((profile, field) => {
    profile[field] = record?.[field] ?? '';
    return profile;
  }, {});
  // Metadato futuro explícito, nunca inferido por la mera presencia de texto.
  profile.confirmedSources = Array.isArray(record?.confirmedSources)
    ? record.confirmedSources.filter(source => typeof source === 'string') : [];
  return profile;
}

export const InstitutionService = {
  repo: new InstitutionRepository(),

  /**
   * Obtiene el registro operacional vigente desde CETPRO_DB.institucion.
   * @returns {Promise<object|null>}
   */
  async getInstitution() {
    return this.repo.getInstitution();
  },

  /**
   * Devuelve el perfil institucional operacional con valores ausentes normalizados a texto vacío.
   * No consulta ni aplica nuevamente la fuente física.
   * @returns {Promise<object>}
   */
  async getInstitutionProfile() {
    return normalizeInstitutionProfile(await this.repo.getInstitution());
  },

  /**
   * Actualiza los datos institucionales registrando auditoría inmutable
   * @param {object} updatedData
   * @param {string} [operator='SECRETARIA_LOCAL']
   * @param {object} [options] Confirmación explícita de campos pendientes con fuente oficial.
   * @returns {Promise<object>}
   */
  async updateInstitution(updatedData, operator = 'SECRETARIA_LOCAL', options = {}) {
    if (!updatedData || typeof updatedData.nombre !== 'string' || updatedData.nombre.trim() === '') {
      throw new ValidationError('El nombre de la institución es obligatorio.');
    }

    const current = await this.getInstitution();
    if (!current) {
      throw new ValidationError('No existe un perfil institucional operativo para actualizar.');
    }
    if (current.id !== 'INST-001') {
      throw new ValidationError('El perfil institucional operativo no corresponde a INST-001.');
    }
    const normalized = {};
    for (const field of EDITABLE_INSTITUTION_FIELDS) {
      if (!Object.hasOwn(updatedData, field)) continue;
      if (typeof updatedData[field] !== 'string') {
        throw new ValidationError(`El campo institucional ${field} debe ser texto.`);
      }
      normalized[field] = updatedData[field].trim();
    }
    const confirmedSources = new Set(Array.isArray(current.confirmedSources) ? current.confirmedSources : []);
    for (const field of PENDING_INSTITUTION_FIELDS) {
      if (Object.hasOwn(normalized, field) && normalized[field] === '') confirmedSources.delete(`institution.${field}`);
    }
    const explicitConfirmations = options.confirmPendingSources || [];
    if (!Array.isArray(explicitConfirmations) || explicitConfirmations.some(field => !PENDING_INSTITUTION_FIELDS.includes(field))) {
      throw new ValidationError('La confirmación de fuente institucional contiene campos no permitidos.');
    }
    for (const field of PENDING_INSTITUTION_FIELDS) {
      if (Object.hasOwn(normalized, field) && normalized[field] && normalized[field] !== String(current[field] || '').trim()
        && !explicitConfirmations.includes(field)) {
        throw new ValidationError(`El cambio de ${field} requiere confirmar su fuente oficial.`);
      }
    }
    for (const field of explicitConfirmations) {
      const value = Object.hasOwn(normalized, field) ? normalized[field] : current[field];
      if (!value) {
        throw new ValidationError(`No puede confirmar ${field} sin un valor institucional.`);
      }
      confirmedSources.add(`institution.${field}`);
    }
    const newRecord = {
      ...current,
      ...normalized,
      id: 'INST-001',
      resolucion: [normalized.resolucionAutorizacion1 ?? current.resolucionAutorizacion1,
        normalized.resolucionAutorizacion2 ?? current.resolucionAutorizacion2]
        .map(value => String(value || '').trim()).filter(Boolean).join(' / '),
      confirmedSources: [...confirmedSources],
      fechaActualizacion: new Date().toISOString()
    };

    await this.repo.update(newRecord);

    await AuditService.record({
      entidad: 'INSTITUCION',
      idEntidad: newRecord.id,
      accion: 'MODIFICACION',
      estadoAnterior: current,
      estadoNuevo: newRecord,
      origen: { usuarioOperador: operator, pantalla: 'Configuración/Institución' }
    });

    return newRecord;
  }
};
