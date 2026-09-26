/** Backup/restore schema 2 exclusivo para laboratorios SCHEMA-V2-GROUP-01A. */
import { canonicalize } from './storage-service.js';
import { SCHEMA_V2, SCHEMA_V2_STORE_NAMES, createStoresForSchemaV2 } from '../db/schema-v2-design.js';
import { assertIsolatedV2DatabaseName, auditV2Snapshot } from './schema-v2-group-migration-service.js';

async function digest(value) {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sameNames(a, b) {
  return a.length === b.length && [...a].sort().every((name, i) => name === [...b].sort()[i]);
}

export function readV2Snapshot(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCHEMA_V2_STORE_NAMES, 'readonly');
    const stores = {};
    tx.oncomplete = () => resolve(stores);
    tx.onerror = () => reject(tx.error || new Error('Fallo de snapshot v2.'));
    tx.onabort = () => reject(tx.error || new Error('Snapshot v2 abortado.'));
    for (const name of SCHEMA_V2_STORE_NAMES) {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => { stores[name] = request.result || []; };
    }
  });
}

async function validate(envelope) {
  if (!envelope || envelope.format !== 'CETPRO_BACKUP' || envelope.formatVersion !== 2 || envelope.schemaVersion !== 2) throw new Error('Backup v2 incompatible.');
  const names = Object.keys(envelope.stores || {});
  const manifestNames = (envelope.storeManifest || []).map(item => item.name);
  if (!sameNames(names, SCHEMA_V2_STORE_NAMES) || !sameNames(manifestNames, SCHEMA_V2_STORE_NAMES) || !sameNames(Object.keys(envelope.counts || {}), SCHEMA_V2_STORE_NAMES)) throw new Error('Manifiesto v2 inválido.');
  for (const name of SCHEMA_V2_STORE_NAMES) {
    if (!Array.isArray(envelope.stores[name]) || envelope.counts[name] !== envelope.stores[name].length) throw new Error(`Conteo v2 inválido: ${name}.`);
    const keys = new Set();
    const keyPath = SCHEMA_V2.stores[name].keyPath;
    for (const record of envelope.stores[name]) {
      const key = record?.[keyPath];
      if (key === undefined || key === null || keys.has(canonicalize(key))) throw new Error(`Clave v2 inválida/duplicada: ${name}.`);
      keys.add(canonicalize(key));
    }
  }
  const { integrity, ...payload } = envelope;
  if (integrity?.algorithm !== 'SHA-256' || integrity.checksum !== await digest(payload)) throw new Error('Checksum v2 inválido.');
  const report = auditV2Snapshot(envelope.stores);
  if (!report.valid) throw new Error(`Referencialidad v2 inválida: ${report.issues[0]?.code}.`);
  return report;
}

export const SchemaV2BackupLabService = {
  async createEmptyDatabase(dbName) {
    assertIsolatedV2DatabaseName(dbName);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 2);
      request.onupgradeneeded = event => createStoresForSchemaV2(event.target.result, event.target.transaction);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async exportBackup(db, origin = 'SCHEMA_V2_LAB') {
    assertIsolatedV2DatabaseName(db.name);
    if (db.version !== 2 || !sameNames(Array.from(db.objectStoreNames), SCHEMA_V2_STORE_NAMES)) throw new Error('DB de laboratorio no es schema v2 exacto.');
    const stores = await readV2Snapshot(db);
    const envelope = { format: 'CETPRO_BACKUP', formatVersion: 2, schemaVersion: 2,
      createdAt: new Date().toISOString(), appVersion: 'SCHEMA-V2-LAB', origin, database: db.name,
      storeManifest: SCHEMA_V2_STORE_NAMES.map(name => ({ name, keyPath: SCHEMA_V2.stores[name].keyPath })),
      stores, counts: Object.fromEntries(SCHEMA_V2_STORE_NAMES.map(name => [name, stores[name].length])) };
    if (db.name === 'CETPRO_V2_DEMO') {
      envelope.environment = 'DEMO';
      envelope.official = false;
      envelope.datasetVersion = 'DEMO_DATASET_V1';
    }
    envelope.integrity = { algorithm: 'SHA-256', canonicalization: 'JCS-LIKE-SORTED-KEYS-V1', checksum: await digest(envelope) };
    await validate(envelope);
    return JSON.stringify(envelope, null, 2);
  },
  async inspectBackup(source) {
    const envelope = typeof source === 'string' ? JSON.parse(source) : structuredClone(source);
    const report = await validate(envelope);
    return { valid: true, schemaVersion: 2, stores: SCHEMA_V2_STORE_NAMES.length,
      counts: { ...envelope.counts }, checksum: envelope.integrity.checksum, referentialIssues: report.issueCount,
      environment: envelope.environment || null, official: envelope.official !== false, database: envelope.database,
      datasetVersion: envelope.datasetVersion || null };
  },
  async restoreBackup(source, db) {
    assertIsolatedV2DatabaseName(db.name);
    const envelope = typeof source === 'string' ? JSON.parse(source) : structuredClone(source);
    await validate(envelope);
    if (db.version !== 2 || !sameNames(Array.from(db.objectStoreNames), SCHEMA_V2_STORE_NAMES)) throw new Error('Destino no es v2 exacto.');
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SCHEMA_V2_STORE_NAMES, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Restore v2 falló.'));
      tx.onabort = () => reject(tx.error || new Error('Restore v2 abortó.'));
      for (const name of SCHEMA_V2_STORE_NAMES) {
        const store = tx.objectStore(name);
        store.clear();
        for (const record of envelope.stores[name]) store.add(structuredClone(record));
      }
    });
    const readback = await readV2Snapshot(db);
    if (canonicalize(readback) !== canonicalize(envelope.stores)) throw new Error('Readback v2 diferente.');
    const report = auditV2Snapshot(readback);
    if (!report.valid) throw new Error('Readback v2 referencialmente inválido.');
    return { success: true, schemaVersion: 2, restoredStores: 18, counts: { ...envelope.counts }, integrityCheck: true };
  }
};
