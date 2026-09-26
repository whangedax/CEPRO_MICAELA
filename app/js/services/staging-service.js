/**
 * Servicio de Staging de Importaciones M04 (StagingService)
 * Módulo: M04 - Importación Controlada de BD.zip e Incidencias
 */

import { StagingRepository } from '../repositories/staging-repository.js';
import { ReconciliationService } from './reconciliation-service.js';
import { STAGING_DATA } from '../data/staging-data.js';

export class StagingService {
  constructor() {
    this.stagingRepo = new StagingRepository();
  }

  /**
   * Garantiza que los 295 registros de staging estén cargados en IndexedDB
   */
  async ensureStagingLoaded() {
    const existing = await this.stagingRepo.getByLoteId(ReconciliationService.LOTE_ID);
    if (!existing || existing.length === 0) {
      for (const record of STAGING_DATA) {
        await this.stagingRepo.create(record);
      }
    }
  }

  /**
   * Carga masiva de registros a staging_importaciones
   * @param {object[]} records 
   * @returns {Promise<number>}
   */
  async loadStagingBatch(records) {
    let count = 0;
    for (const record of records) {
      await this.stagingRepo.create(record);
      count++;
    }
    return count;
  }

  /**
   * Obtiene todos los registros de staging para un lote
   * @param {string} loteId 
   * @returns {Promise<object[]>}
   */
  async getStagingByLote(loteId = ReconciliationService.LOTE_ID) {
    await this.ensureStagingLoaded();
    return this.stagingRepo.getByLoteId(loteId);
  }

  /**
   * Obtiene los registros de staging filtrados
   * @param {object} options 
   * @returns {Promise<object[]>}
   */
  async getFilteredStaging({ estado = null, archivo = null, conIncidencia = null, query = null } = {}) {
    await this.ensureStagingLoaded();
    let items = await this.stagingRepo.getByLoteId(ReconciliationService.LOTE_ID);

    if (estado) {
      items = items.filter(item => item.estado === estado);
    }
    if (archivo) {
      items = items.filter(item => item.archivoOrigen === archivo);
    }
    if (conIncidencia === true) {
      items = items.filter(item => Array.isArray(item.incidencias) && item.incidencias.length > 0);
    } else if (conIncidencia === false) {
      items = items.filter(item => !Array.isArray(item.incidencias) || item.incidencias.length === 0);
    }
    if (query) {
      const q = query.toLowerCase().trim();
      items = items.filter(item => 
        (item.numeroDocumentoOriginal && item.numeroDocumentoOriginal.toLowerCase().includes(q)) ||
        (item.nombreCompletoOriginal && item.nombreCompletoOriginal.toLowerCase().includes(q)) ||
        (item.programaOriginal && item.programaOriginal.toLowerCase().includes(q))
      );
    }

    return items;
  }

  /**
   * Obtiene todas las incidencias extraídas de los registros de staging
   * @returns {Promise<object[]>}
   */
  async getAllIncidences() {
    await this.ensureStagingLoaded();
    const items = await this.stagingRepo.getByLoteId(ReconciliationService.LOTE_ID);
    const incidences = [];

    for (const item of items) {
      if (Array.isArray(item.incidencias) && item.incidencias.length > 0) {
        for (const inc of item.incidencias) {
          incidences.push({
            id: inc.id || `${item.id}-${inc.codigo}`,
            severidad: inc.severidad || 'MEDIA',
            lote: item.loteId,
            archivo: item.archivoOrigen,
            hoja: item.hojaOrigen,
            fila: item.filaOrigen,
            campo: inc.campo || 'GENERAL',
            valorOriginal: inc.valorOriginal !== undefined ? inc.valorOriginal : item.datosOriginales,
            descripcion: inc.descripcion || inc.mensaje,
            codigo: inc.codigo,
            estado: inc.estado || 'PENDIENTE',
            resolucion: inc.resolucion || null,
            fecha: inc.fecha || item.fechaImportacion
          });
        }
      }
    }
    return incidences;
  }

  /**
   * Obtiene resumen cuantitativo para el Dashboard de Incidencias
   */
  async getDashboardSummary() {
    await this.ensureStagingLoaded();
    const items = await this.stagingRepo.getByLoteId(ReconciliationService.LOTE_ID);
    const incidences = await this.getAllIncidences();
    const reconciliation = ReconciliationService.getReconciliationSummary();

    let listos = 0;
    let conIncidenciasCount = 0;
    let docsVacios = 0;
    let docsAtipicos = 0;
    let docsRepetidos = 0;

    for (const item of items) {
      if (item.estado === 'LISTO') listos++;
      if (Array.isArray(item.incidencias) && item.incidencias.length > 0) {
        conIncidenciasCount++;
      }
      if (item.incidencias && item.incidencias.some(i => i.codigo === 'DOCUMENTO_VACIO')) docsVacios++;
      if (item.incidencias && item.incidencias.some(i => i.codigo === 'DOCUMENTO_FORMATO_ATIPICO')) docsAtipicos++;
      if (item.incidencias && item.incidencias.some(i => i.codigo === 'DOCUMENTO_REPETIDO')) docsRepetidos++;
    }

    return {
      totalLeido: items.length,
      listos,
      conIncidencias: conIncidenciasCount,
      documentosVacios: docsVacios,
      documentosAtipicos: docsAtipicos,
      documentosRepetidos: docsRepetidos,
      totalIncidencias: incidences.length,
      reconciliation
    };
  }

  /**
   * Limpia el lote de staging
   */
  async clearStaging() {
    await this.stagingRepo.clearLote(ReconciliationService.LOTE_ID);
  }
}
