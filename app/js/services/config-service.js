/**
 * Servicio de Configuración del Sistema
 * Módulo: M02 - Catálogos y Configuración
 */

import { ConfigRepository } from '../repositories/config-repository.js';
import { ActiveStorageService as StorageService } from './active-storage-service.js';
import { CatalogService } from './catalog-service.js';
import { PeriodService } from './period-service.js';
import { CONFIG } from '../config.js';

export const ConfigService = {
  repo: new ConfigRepository(),

  /**
   * Obtiene la información del estado del sistema y contadores reales en CETPRO_DB
   */
  async getSystemSummary() {
    const dbStatus = StorageService.getStatus();
    const programs = await CatalogService.listPrograms();
    const modules = await CatalogService.listModules();
    const periods = await PeriodService.listPeriods();
    const activePeriods = periods.filter(p => p.estado === 'ACTIVO');

    return {
      appName: CONFIG.APP_NAME,
      appVersion: CONFIG.APP_VERSION,
      dbName: dbStatus.dbName || CONFIG.DB.NAME,
      dbVersion: dbStatus.version || CONFIG.DB.VERSION,
      isConnected: dbStatus.isconnected,
      mode: 'OFFLINE LOCAL (Sin Internet)',
      localTime: new Date().toLocaleString(),
      programsCount: programs.length,
      modulesCount: modules.length,
      periodsCount: periods.length,
      activePeriodsCount: activePeriods.length,
      unitsCount: 0 // Inviolable M02: store unidades debe permanecer vacío (0)
    };
  }
};
