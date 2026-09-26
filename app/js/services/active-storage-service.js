/** Selecciona backup v1 o v2 únicamente a partir del target runtime autorizado. */
import { CONFIG } from '../config.js';
import { getDB } from '../db/database.js';
import { StorageService as V1StorageService } from './storage-service.js';
import { V2CandidateStorageService } from '../v2-candidate/candidate-services.js';

export const ActiveStorageService = {
  async init(dbName = CONFIG.DB.NAME) { return V1StorageService.init(dbName); },
  getStatus() { return V1StorageService.getStatus(); },
  runTestTransaction(...args) { return V1StorageService.runTestTransaction(...args); },
  exportBackup(options = {}) {
    return CONFIG.IS_V2_CANDIDATE
      ? V2CandidateStorageService.exportBackup(options.db || getDB(), options.origin)
      : V1StorageService.exportBackup(options);
  },
  async inspectBackup(source, options = {}) {
    if (!CONFIG.IS_V2_CANDIDATE) return V1StorageService.inspectBackup(source, options);
    const info = await V2CandidateStorageService.inspectBackup(source);
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    return { ...info, format: parsed.format, formatVersion: parsed.formatVersion,
      createdAt: parsed.createdAt, database: parsed.database,
      totalRecords: Object.values(info.counts).reduce((sum, count) => sum + count, 0) };
  },
  restoreBackup(source, targetDb = null, options = {}) {
    return CONFIG.IS_V2_CANDIDATE
      ? V2CandidateStorageService.restoreBackup(source, targetDb || getDB(), options)
      : V1StorageService.restoreBackup(source, targetDb, options);
  }
};
