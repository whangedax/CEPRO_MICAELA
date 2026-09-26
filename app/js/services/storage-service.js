/** Respaldo/restauración local versionado. No migra el esquema. */
import { initDB, getDB, closeDB, executeTransaction } from '../db/database.js';
import { SCHEMA_V1 } from '../db/schema.js';
import { CONFIG } from '../config.js';
import { OperationalError } from './error-service.js';
import { analyzeReferentialSnapshot } from './referential-audit-service.js';

export const BACKUP_FORMAT = 'CETPRO_BACKUP';
export const BACKUP_FORMAT_VERSION = 2;
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export const EXPECTED_STORE_NAMES = Object.freeze(Object.keys(SCHEMA_V1.stores).sort());

function fail(message) { throw new OperationalError(message); }
function sorted(value) { return [...value].sort(); }
function sameNames(a, b) { return a.length === b.length && sorted(a).every((name, i) => name === sorted(b)[i]); }

/** JSON determinista: ordena claves de objetos; conserva orden significativo de arrays. */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

async function sha256(text) {
  if (!globalThis.crypto?.subtle) fail('SHA-256 no está disponible en este navegador.');
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function checksumPayload(envelope) {
  const { integrity, ...payload } = envelope;
  return payload;
}

async function snapshotStores(db, names = EXPECTED_STORE_NAMES) {
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(names, 'readonly'); } catch (error) { reject(error); return; }
    const stores = {};
    let requestFailure = null;
    tx.oncomplete = () => requestFailure ? reject(requestFailure) : resolve(stores);
    tx.onerror = event => { requestFailure = event.target.error || tx.error; };
    tx.onabort = event => reject(requestFailure || event.target.error || tx.error || new Error('Lectura abortada.'));
    for (const name of names) {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => { stores[name] = request.result || []; };
      request.onerror = event => { requestFailure = event.target.error || request.error; };
    }
  });
}

function validateStoreKeys(stores) {
  for (const name of EXPECTED_STORE_NAMES) {
    const definition = SCHEMA_V1.stores[name];
    const keyPath = definition.keyPath;
    const seenKeys = new Set();
    const uniqueIndexes = (definition.indexes || []).filter(index => index.options?.unique);
    const uniqueValues = new Map(uniqueIndexes.map(index => [index.name, new Set()]));
    for (const record of stores[name]) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) fail(`Registro inválido en store "${name}".`);
      const key = record[keyPath];
      if (key === undefined || key === null || key === '') fail(`Registro sin clave "${keyPath}" en store "${name}".`);
      const serializedKey = canonicalize(key);
      if (seenKeys.has(serializedKey)) fail(`Clave duplicada en store "${name}": ${String(key)}.`);
      seenKeys.add(serializedKey);
      for (const index of uniqueIndexes) {
        const indexValue = Array.isArray(index.keyPath) ? index.keyPath.map(field => record[field]) : record[index.keyPath];
        if (indexValue === undefined || (Array.isArray(indexValue) && indexValue.some(value => value === undefined))) continue;
        const serializedValue = canonicalize(indexValue);
        const values = uniqueValues.get(index.name);
        if (values.has(serializedValue)) fail(`Valor duplicado para índice único "${name}.${index.name}".`);
        values.add(serializedValue);
      }
    }
  }
}

function validateReferences(stores) {
  const report = analyzeReferentialSnapshot(stores);
  if (report.issueCount) {
    const first = report.issues[0];
    fail(`Respaldo referencialmente inconsistente (${report.issueCount}): ${first.code} en ${first.store}/${first.id}.`);
  }
  return report;
}

async function buildEnvelope(db, origin = 'USER_EXPORT') {
  const actualNames = Array.from(db.objectStoreNames);
  if (!sameNames(actualNames, EXPECTED_STORE_NAMES)) fail(`El esquema físico no coincide con v1. Esperados: ${EXPECTED_STORE_NAMES.join(', ')}.`);
  if (db.version !== SCHEMA_V1.version) fail(`Schema incompatible: ${db.version}; esperado ${SCHEMA_V1.version}.`);
  const stores = await snapshotStores(db);
  const counts = Object.fromEntries(EXPECTED_STORE_NAMES.map(name => [name, stores[name].length]));
  const envelope = {
    format: BACKUP_FORMAT, formatVersion: BACKUP_FORMAT_VERSION, schemaVersion: SCHEMA_V1.version,
    createdAt: new Date().toISOString(), appVersion: CONFIG.APP_VERSION, origin, database: db.name,
    storeManifest: EXPECTED_STORE_NAMES.map(name => ({ name, keyPath: SCHEMA_V1.stores[name].keyPath })),
    stores, counts
  };
  envelope.integrity = { algorithm: 'SHA-256', canonicalization: 'JCS-LIKE-SORTED-KEYS-V1',
    checksum: await sha256(canonicalize(checksumPayload(envelope))) };
  return envelope;
}

function parseSource(source) {
  if (typeof source === 'string') {
    if (new TextEncoder().encode(source).byteLength > MAX_BACKUP_BYTES) fail('El respaldo supera el límite de 50 MiB.');
    try { return JSON.parse(source); } catch { fail('El archivo JSON está truncado o no es válido.'); }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) fail('El formato del respaldo no es válido.');
  const serialized = JSON.stringify(source);
  if (new TextEncoder().encode(serialized).byteLength > MAX_BACKUP_BYTES) fail('El respaldo supera el límite de 50 MiB.');
  return structuredClone(source);
}

async function normalizeLegacy(data) {
  if (!data.stores || typeof data.stores !== 'object' || Array.isArray(data.stores)) fail('Respaldo legacy sin stores válidos.');
  const names = Object.keys(data.stores);
  if (!sameNames(names, EXPECTED_STORE_NAMES)) fail('Respaldo legacy incompleto o con stores inesperados; conversión insegura.');
  if (Number(data.dbVersion) !== SCHEMA_V1.version) fail('Respaldo legacy de schema incompatible.');
  const envelope = {
    format: BACKUP_FORMAT, formatVersion: BACKUP_FORMAT_VERSION, schemaVersion: SCHEMA_V1.version,
    createdAt: data.timestamp || new Date(0).toISOString(), appVersion: data.version || 'LEGACY_UNKNOWN',
    origin: 'LEGACY_CONVERTED_IN_MEMORY', database: data.dbName || 'LEGACY_UNKNOWN',
    storeManifest: EXPECTED_STORE_NAMES.map(name => ({ name, keyPath: SCHEMA_V1.stores[name].keyPath })),
    stores: Object.fromEntries(EXPECTED_STORE_NAMES.map(name => [name, data.stores[name]])),
    counts: Object.fromEntries(EXPECTED_STORE_NAMES.map(name => [name, data.stores[name].length]))
  };
  envelope.integrity = { algorithm: 'SHA-256', canonicalization: 'JCS-LIKE-SORTED-KEYS-V1',
    checksum: await sha256(canonicalize(checksumPayload(envelope))) };
  return envelope;
}

async function validateEnvelope(source, { allowLegacy = true } = {}) {
  const parsed = parseSource(source);
  const legacy = parsed.format !== BACKUP_FORMAT;
  const envelope = legacy && allowLegacy ? await normalizeLegacy(parsed) : parsed;
  if (envelope.format !== BACKUP_FORMAT || envelope.formatVersion !== BACKUP_FORMAT_VERSION) fail('Formato o versión de respaldo no soportados.');
  if (envelope.schemaVersion !== SCHEMA_V1.version) fail(`Schema ${envelope.schemaVersion} incompatible con CETPRO_DB v1.`);
  if (!envelope.stores || !envelope.counts || !Array.isArray(envelope.storeManifest)) fail('Envelope incompleto.');
  const storeNames = Object.keys(envelope.stores);
  const manifestNames = envelope.storeManifest.map(item => item?.name);
  if (!sameNames(storeNames, EXPECTED_STORE_NAMES) || !sameNames(manifestNames, EXPECTED_STORE_NAMES) ||
      !sameNames(Object.keys(envelope.counts), EXPECTED_STORE_NAMES)) fail('Manifiesto de stores faltante o inesperado.');
  for (const name of EXPECTED_STORE_NAMES) {
    if (!Array.isArray(envelope.stores[name])) fail(`Store "${name}" no es un array.`);
    if (envelope.counts[name] !== envelope.stores[name].length) fail(`Conteo inválido para store "${name}".`);
    const manifest = envelope.storeManifest.find(item => item.name === name);
    if (manifest.keyPath !== SCHEMA_V1.stores[name].keyPath) fail(`keyPath incompatible para store "${name}".`);
  }
  if (envelope.integrity?.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(envelope.integrity.checksum || '')) fail('Metadata de integridad SHA-256 inválida.');
  const calculated = await sha256(canonicalize(checksumPayload(envelope)));
  if (calculated !== envelope.integrity.checksum) fail('Checksum SHA-256 inválido; restauración abortada.');
  validateStoreKeys(envelope.stores);
  const referentialReport = validateReferences(envelope.stores);
  return { envelope, legacyConverted: legacy, referentialReport };
}

async function restoreAtomically(db, envelope, faultInjector) {
  return new Promise((resolve, reject) => {
    let tx; let failure = null;
    try { tx = db.transaction(EXPECTED_STORE_NAMES, 'readwrite'); } catch (error) { reject(error); return; }
    const abort = error => { failure = error instanceof Error ? error : new Error(String(error)); try { tx.abort(); } catch { reject(failure); } };
    tx.oncomplete = () => failure ? reject(failure) : resolve();
    tx.onabort = event => reject(failure || event.target.error || tx.error || new Error('Restauración abortada.'));
    tx.onerror = event => { if (!failure) failure = event.target.error || tx.error; };
    try {
      faultInjector?.({ phase: 'BEFORE_CLEAR', tx });
      EXPECTED_STORE_NAMES.forEach((name, storeIndex) => {
        const store = tx.objectStore(name);
        store.clear();
        faultInjector?.({ phase: 'AFTER_CLEAR', storeName: name, storeIndex, tx });
        envelope.stores[name].forEach((record, recordIndex) => {
          store.add(structuredClone(record));
          faultInjector?.({ phase: 'AFTER_WRITE', storeName: name, storeIndex, recordIndex, tx });
        });
        faultInjector?.({ phase: 'AFTER_STORE', storeName: name, storeIndex, tx });
      });
      faultInjector?.({ phase: 'BEFORE_COMMIT', tx });
    } catch (error) { abort(error); }
  });
}

export const StorageService = {
  async init(dbName = CONFIG.DB.NAME) { await initDB(dbName); return this.getStatus(); },
  getStatus() {
    try {
      const db = getDB();
      return { isConnected: true, dbName: db.name, version: db.version, storesCount: db.objectStoreNames.length, storeNames: Array.from(db.objectStoreNames) };
    } catch { return { isConnected: false, dbName: null, version: null, storesCount: 0, storeNames: [] }; }
  },
  async runTestTransaction(testDbName = CONFIG.DB.TEST_DB_NAME) {
    const testDb = await initDB(testDbName);
    const testId = `TEST-${Date.now()}`;
    const testData = { id: testId, timestamp: new Date().toISOString(), nombre: 'Prueba Técnica de Persistencia M01', origen: 'T-0002_TEST' };
    await executeTransaction('configuracion', 'readwrite', tx => tx.objectStore('configuracion').put({ clave: testId, valor: JSON.stringify(testData), actualizadoEn: testData.timestamp }));
    return new Promise((resolve, reject) => {
      const req = testDb.transaction('configuracion', 'readonly').objectStore('configuracion').get(testId);
      req.onsuccess = () => resolve({ success: true, item: req.result, testId, dbName: testDbName });
      req.onerror = event => reject(new OperationalError(`Error al verificar la transacción: ${event.target.error?.message}`));
    });
  },
  async exportBackup(options = {}) {
    const db = options.db || getDB();
    const envelope = await buildEnvelope(db, options.origin || 'USER_EXPORT');
    await validateEnvelope(envelope, { allowLegacy: false });
    return JSON.stringify(envelope, null, 2);
  },
  async inspectBackup(source, options = {}) {
    const validated = await validateEnvelope(source, options);
    const totalRecords = Object.values(validated.envelope.counts).reduce((sum, count) => sum + count, 0);
    return { valid: true, format: validated.envelope.format, formatVersion: validated.envelope.formatVersion,
      schemaVersion: validated.envelope.schemaVersion, createdAt: validated.envelope.createdAt,
      database: validated.envelope.database, totalRecords, counts: { ...validated.envelope.counts },
      checksum: validated.envelope.integrity.checksum, legacyConverted: validated.legacyConverted,
      referentialIssues: validated.referentialReport.issueCount };
  },
  async restoreBackup(source, targetDb = null, options = {}) {
    const db = targetDb || getDB();
    const isProductive = db.name === CONFIG.DB.NAME;
    if (isProductive && options.confirmed !== true) fail('La restauración productiva requiere confirmación explícita.');
    const { envelope, legacyConverted } = await validateEnvelope(source, { allowLegacy: options.allowLegacy !== false });
    const actualNames = Array.from(db.objectStoreNames);
    if (db.version !== envelope.schemaVersion || !sameNames(actualNames, EXPECTED_STORE_NAMES)) fail('DB destino incompatible; no se modificó.');
    const preRestoreJson = await this.exportBackup({ db, origin: 'PRE_RESTORE_BACKUP' });
    const preRestoreInfo = await this.inspectBackup(preRestoreJson, { allowLegacy: false });
    if (isProductive && typeof options.beforeWrite !== 'function') fail('No se puede iniciar restore sin guardar PRE_RESTORE_BACKUP.');
    if (typeof options.beforeWrite === 'function') {
      const accepted = await options.beforeWrite(preRestoreJson, preRestoreInfo);
      if (accepted !== true) fail('PRE_RESTORE_BACKUP no fue aceptado; restauración abortada.');
    }
    await restoreAtomically(db, envelope, options.faultInjector);
    let readbackDb = db;
    if (targetDb === null) {
      const dbName = db.name;
      closeDB();
      readbackDb = await initDB(dbName);
    }
    const readback = await snapshotStores(readbackDb);
    const expectedSemantic = await sha256(canonicalize(envelope.stores));
    const actualSemantic = await sha256(canonicalize(readback));
    if (expectedSemantic !== actualSemantic) fail('Falló el readback post-restore; la base queda bloqueada para revisión.');
    validateStoreKeys(readback);
    const postIntegrity = validateReferences(readback);
    return { success: true, restoredStores: EXPECTED_STORE_NAMES.length, storeCounts: { ...envelope.counts },
      schemaVersion: envelope.schemaVersion, checksum: envelope.integrity.checksum,
      preRestoreChecksum: preRestoreInfo.checksum, postRestoreChecksum: actualSemantic,
      integrityCheck: postIntegrity.issueCount === 0, legacyConverted };
  }
};
