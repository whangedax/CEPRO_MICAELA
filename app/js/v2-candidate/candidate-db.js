import { applySchemaUpgrade } from '../db/schema.js';
import { SCHEMA_V2, SCHEMA_V2_STORE_NAMES } from '../db/schema-v2-design.js';
import { StorageService } from '../services/storage-service.js';
import { upgradeIsolatedDatabaseV1ToV2 } from '../services/schema-v2-group-migration-service.js';

export const V2_CANDIDATE_CONFIG = Object.freeze({
  BUILD: 'APP-V2-CANDIDATE-01',
  DB_NAME: 'CETPRO_V2_CANDIDATE',
  DB_VERSION: 2,
  PORT: 8081,
  BACKUP_ENDPOINT: '/_candidate/real-backup'
});

let activeDb = null;
const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

async function databaseVersion(name) {
  if (typeof indexedDB.databases === 'function') {
    const item = (await indexedDB.databases()).find(entry => entry.name === name);
    return item?.version || 0;
  }
  return 0;
}

async function createCandidateV1(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = event => applySchemaUpgrade(event.target.result, event.oldVersion, event.newVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function initializeV2Candidate({ backupSource = null } = {}) {
  if (activeDb?.version === 2) return activeDb;
  const name = V2_CANDIDATE_CONFIG.DB_NAME;
  const version = await databaseVersion(name);
  if (version > 2) throw new Error(`DB candidata tiene versión futura ${version}.`);
  if (version === 2) {
    activeDb = await requestResult(indexedDB.open(name));
  } else {
    if (version === 0) {
      const source = backupSource ?? await fetch(V2_CANDIDATE_CONFIG.BACKUP_ENDPOINT, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('Backup real candidato no disponible.');
        return response.text();
      });
      const preflight = await StorageService.inspectBackup(source, { allowLegacy: false });
      if (!preflight.valid || preflight.schemaVersion !== 1 || preflight.referentialIssues !== 0) {
        throw new Error('Preflight v1 candidato inválido.');
      }
      const v1db = await createCandidateV1(name);
      await StorageService.restoreBackup(source, v1db, {
        confirmed: true,
        beforeWrite: async () => true
      });
      v1db.close();
    }
    activeDb = await upgradeIsolatedDatabaseV1ToV2(name);
  }
  if (activeDb.name !== name || activeDb.version !== SCHEMA_V2.version ||
      SCHEMA_V2_STORE_NAMES.some(store => !activeDb.objectStoreNames.contains(store))) {
    activeDb?.close(); activeDb = null;
    throw new Error('Startup candidato no obtuvo schema v2 exacto.');
  }
  return activeDb;
}

export function getV2CandidateDB() {
  if (!activeDb || activeDb.version !== 2 || activeDb.name !== V2_CANDIDATE_CONFIG.DB_NAME) {
    throw new Error('DB candidata no inicializada.');
  }
  return activeDb;
}

export function closeV2CandidateDB() {
  activeDb?.close();
  activeDb = null;
}

export async function deleteV2CandidateDBForTests() {
  closeV2CandidateDB();
  await requestResult(indexedDB.deleteDatabase(V2_CANDIDATE_CONFIG.DB_NAME));
}
