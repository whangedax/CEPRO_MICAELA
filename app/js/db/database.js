/**
 * Administrador de la conexión a IndexedDB (CETPRO_DB)
 * Módulo: M01 - Núcleo Local
 */

import { CONFIG } from '../config.js';
import { SCHEMA_V1, applySchemaUpgrade } from './schema.js';
import { createStoresForSchemaV2 } from './schema-v2-design.js';
import { OperationalError } from '../services/error-service.js';
import { RUNTIME_TARGETS, assertRuntimeWriteTarget, getRuntimeTarget } from '../services/runtime-target-service.js';

let dbInstance = null;

/**
 * Inicializa la base de datos IndexedDB gestionando todos sus eventos de ciclo de vida
 * @param {string} [overrideDbName] - Nombre alternativo para pruebas aisladas
 * @returns {Promise<IDBDatabase>}
 */
export function initDB(overrideDbName = CONFIG.DB.NAME) {
  return new Promise((resolve, reject) => {
    if (dbInstance && dbInstance.name === overrideDbName) {
      return resolve(dbInstance);
    }

    if (!window.indexedDB) {
      return reject(new OperationalError('IndexedDB no está soportado en este navegador.'));
    }

    const request = window.indexedDB.open(overrideDbName, CONFIG.DB.VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (CONFIG.IS_V2_CANDIDATE && overrideDbName === 'CETPRO_V2_CANDIDATE') {
        if (event.oldVersion === 1) {
          event.target.transaction.abort();
          return;
        }
        createStoresForSchemaV2(db, event.target.transaction);
      } else {
        applySchemaUpgrade(db, event.oldVersion, event.newVersion);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        console.warn('La base de datos se cerró debido a un cambio de versión en otra pestaña.');
      };

      dbInstance.onerror = (errEvent) => {
        console.error('Error no capturado en la base de datos:', errEvent.target.error);
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      const err = event.target.error;
      console.error('Fallo al abrir IndexedDB:', err);
      reject(new OperationalError(`No se pudo abrir la base de datos IndexedDB: ${err?.message || 'Error desconocido'}`));
    };

    request.onblocked = () => {
      console.warn('La apertura de la base de datos está bloqueada por otra conexión activa.');
    };
  });
}

/**
 * Obtiene la instancia activa de la base de datos
 */
export function getDB() {
  if (!dbInstance) {
    throw new OperationalError('La base de datos IndexedDB no ha sido inicializada.');
  }
  return dbInstance;
}

/**
 * Establece la instancia activa de la base de datos (uso de entorno de pruebas)
 */
export function setDBInstance(db) {
  dbInstance = db;
}

/**
 * Cierra la conexión activa a IndexedDB
 */
export function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Ejecuta una transacción en uno o varios stores
 * @param {string|string[]} storeNames
 * @param {'readonly'|'readwrite'} mode
 * @param {function(IDBTransaction): Promise<any>} callback
 */
export async function executeTransaction(storeNames, mode, callback) {
  const db = getDB();
  // El guard universal solo interviene mientras DEMO está activo. En REAL,
  // cada servicio productivo conserva sus propias reglas de escritura v1/v2.
  if (mode === 'readwrite' && getRuntimeTarget() === RUNTIME_TARGETS.DEMO) {
    assertRuntimeWriteTarget(db, RUNTIME_TARGETS.DEMO);
  }
  const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;

    tx.oncomplete = () => {
      resolve(result);
    };

    tx.onerror = (event) => {
      reject(new OperationalError(`Error en transacción IndexedDB: ${event.target.error?.message || 'Error desconocido'}`));
    };

    tx.onabort = (event) => {
      reject(new OperationalError(`Transacción abortada: ${event.target.error?.message || 'Abortada por el sistema'}`));
    };

    try {
      result = callback(tx);
    } catch (err) {
      if (typeof tx.abort === 'function') {
        tx.abort();
      }
      reject(err);
    }
  });
}
