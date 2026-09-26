/**
 * SCHEMA-V2-GROUP-01A: diseño/ensayo aislado. Este módulo NO es importado por
 * database.js y no cambia CONFIG.DB.VERSION ni CETPRO_DB productiva.
 */
import { SCHEMA_V1 } from './schema.js';

export const GROUP_ACADEMIC_STORE = 'grupos_academicos';

export const SCHEMA_V2 = Object.freeze({
  version: 2,
  stores: {
    ...SCHEMA_V1.stores,
    matriculas: {
      ...SCHEMA_V1.stores.matriculas,
      indexes: [
        ...SCHEMA_V1.stores.matriculas.indexes,
        { name: 'grupoId', keyPath: 'grupoId', options: { unique: false } }
      ]
    },
    [GROUP_ACADEMIC_STORE]: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'programaId', keyPath: 'programaId', options: { unique: false } },
        { name: 'moduloId', keyPath: 'moduloId', options: { unique: false } },
        { name: 'periodoId', keyPath: 'periodoId', options: { unique: false } },
        { name: 'sourceGroupCode', keyPath: 'sourceGroupCode', options: { unique: false } },
        { name: 'estado', keyPath: 'estado', options: { unique: false } }
      ]
    }
  }
});

export const SCHEMA_V2_STORE_NAMES = Object.freeze(Object.keys(SCHEMA_V2.stores).sort());

export function createStoresForSchemaV2(db, transaction, { includeExisting = true } = {}) {
  for (const [storeName, definition] of Object.entries(SCHEMA_V2.stores)) {
    let store;
    if (!db.objectStoreNames.contains(storeName)) {
      store = db.createObjectStore(storeName, {
        keyPath: definition.keyPath,
        autoIncrement: definition.autoIncrement || false
      });
    } else if (includeExisting) {
      store = transaction.objectStore(storeName);
    } else {
      continue;
    }
    for (const index of definition.indexes || []) {
      if (!store.indexNames.contains(index.name)) store.createIndex(index.name, index.keyPath, index.options || {});
    }
  }
}
