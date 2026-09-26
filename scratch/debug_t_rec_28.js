const path = require('path');
const fs = require('fs');
const ROOT = 'c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2';

// Copy MockRecoveryIndexedDB class logic to debug
class MockRecoveryIndexedDB {
  constructor() {
    this.name = 'CETPRO_DB';
    this.version = 1;
    this.stores = new Map();

    const instStore = new Map([['INST-001', { id: 'INST-001', nombre: 'CETPRO MICAELA BASTIDAS' }]]);
    const progStore = new Map();
    for (let i = 1; i <= 7; i++) progStore.set(`PROG-00${i}`, { id: `PROG-00${i}`, nombre: `PROGRAMA ${i}` });
    const modStore = new Map();
    for (let i = 1; i <= 14; i++) modStore.set(`MOD-${String(i).padStart(3, '0')}`, { id: `MOD-${String(i).padStart(3, '0')}`, nombre: `MODULO ${i}` });

    this.stores.set('institucion', instStore);
    this.stores.set('programas', progStore);
    this.stores.set('modulos', modStore);
    this.stores.set('periodos', new Map());
    this.stores.set('staging_importaciones', new Map());
    this.stores.set('estudiantes', new Map());
    this.stores.set('matriculas', new Map());
    this.stores.set('unidades', new Map());
    this.stores.set('asistencia', new Map());
    this.stores.set('evaluacion', new Map());
    this.stores.set('efsrt', new Map());
    this.stores.set('configuracion', new Map());
    this.stores.set('auditoria', new Map());
    this.stores.set('documentos', new Map());
    this.stores.set('indicadores', new Map());
    this.stores.set('docentes', new Map());
    this.stores.set('secciones', new Map());

    this.objectStoreNames = {
      length: this.stores.size,
      contains: (n) => this.stores.has(n),
      [Symbol.iterator]: () => this.stores.keys()
    };
  }

  transaction(storeNames, mode) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = {
      objectStore: (name) => {
        const storeMap = this.stores.get(name) || new Map();
        return {
          indexNames: { contains: (idxName) => true },
          index: (idxName) => ({
            getAll: (val) => {
              const results = Array.from(storeMap.values()).filter(item => {
                if (idxName === 'loteId') return item.loteId === val;
                if (idxName === 'numeroDocumento') return item.numeroDocumento === val || item.numeroDocumentoOriginal === val;
                return true;
              });
              const req = { onsuccess: null, onerror: null, result: results };
              Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
              return req;
            }
          }),
          get: (key) => {
            const req = { onsuccess: null, onerror: null, result: storeMap.get(key) || null };
            Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
            return req;
          },
          getAll: () => {
            const req = { onsuccess: null, onerror: null, result: Array.from(storeMap.values()) };
            Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
            return req;
          },
          count: () => {
            const req = { onsuccess: null, onerror: null, result: storeMap.size };
            Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
            return req;
          },
          put: (item) => {
            const key = item.id || item.clave || `KEY-${Date.now()}`;
            storeMap.set(key, JSON.parse(JSON.stringify(item)));
          },
          delete: (key) => {
            storeMap.delete(key);
          },
          clear: () => {
            storeMap.clear();
          }
        };
      },
      _oncomplete: null,
      get oncomplete() { return this._oncomplete; },
      set oncomplete(cb) {
        this._oncomplete = cb;
        if (typeof cb === 'function') Promise.resolve().then(() => cb());
      }
    };
    return tx;
  }
}

async function debug() {
  const { PeriodService } = require(path.join(ROOT, 'app/js/services/period-service.js'));
  const isolatedDb = new MockRecoveryIndexedDB();
  isolatedDb.name = 'CETPRO_PERIOD_CLEANUP_TEST_DB';
  isolatedDb.stores.get('periodos').set('PER-TEST-ISO-01', { id: 'PER-TEST-ISO-01', nombre: '2026-1', estado: 'ACTIVO' });
  for (let i = 1; i <= 269; i++) {
    isolatedDb.stores.get('estudiantes').set(`EST-${i}`, { id: `EST-${i}` });
  }
  for (let i = 1; i <= 295; i++) {
    isolatedDb.stores.get('matriculas').set(`MAT-${i}`, { id: `MAT-${i}`, estudianteId: `EST-${Math.min(i, 269)}`, programaId: 'PROG-001', periodoId: null, moduloId: null });
    isolatedDb.stores.get('staging_importaciones').set(`STG-${i}`, { id: `STG-${i}` });
  }

  require(path.join(ROOT, 'app/js/db/database.js')).setDBInstance(isolatedDb);
  try {
    const res = await PeriodService.deletePeriodAdmin('PER-TEST-ISO-01', { motivo: 'PRUEBA_DB_AISLADA', operador: 'TEST' });
    console.log('T-REC-28 Result:', res);
  } catch (err) {
    console.error('T-REC-28 Error:', err);
  }
}

debug();
