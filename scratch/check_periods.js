import { JSDOM } from 'jsdom';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange.js';

const fakeDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
global.window = fakeDom.window;
global.document = fakeDom.window.document;
global.navigator = fakeDom.window.navigator;
global.window.indexedDB = indexedDB;
global.window.IDBKeyRange = IDBKeyRange;

import { initDB, getDB } from '../app/js/db/database.js';
import { CONFIG } from '../app/js/config.js';
import { CatalogService } from '../app/js/services/catalog-service.js';
import { ProductiveImportService } from '../app/js/services/productive-import-service.js';
import { StagingService } from '../app/js/services/staging-service.js';

async function checkPeriods() {
  const db = await initDB(CONFIG.DB.NAME);
  await CatalogService.initializeCatalogs();
  const stagingService = new StagingService();
  await stagingService.ensureStagingLoaded();
  const importService = new ProductiveImportService();
  await importService.executeImport();

  const tx = db.transaction('periodos', 'readonly');
  const store = tx.objectStore('periodos');
  const req = store.getAll();
  req.onsuccess = () => {
    console.log('Periodos count:', req.result.length);
    console.log('Periodos content:', req.result);
  };
}

checkPeriods();
