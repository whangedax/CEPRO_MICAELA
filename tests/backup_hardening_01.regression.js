const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');
const URL = 'http://127.0.0.1:8080/app/index.html#/respaldo';

async function serverUp() {
  return new Promise(resolve => {
    const req = http.get(URL, res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function run() {
  let server;
  if (!await serverUp()) {
    server = fork(require.resolve('../scripts/dev-server.js'), [], { silent: true });
    for (let i = 0; i < 40 && !await serverUp(); i++) await new Promise(resolve => setTimeout(resolve, 250));
    if (!await serverUp()) throw new Error('Servidor local no disponible.');
  }
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    const outcome = await page.evaluate(async () => {
      const { initDB } = await import('/app/js/db/database.js');
      const { StorageService, EXPECTED_STORE_NAMES, canonicalize, MAX_BACKUP_BYTES } = await import('/app/js/services/storage-service.js');
      const results = [];
      const check = (id, passed, detail = '') => results.push({ id, passed: Boolean(passed), detail });
      const txWrite = (db, names, callback) => new Promise((resolve, reject) => {
        const tx = db.transaction(names, 'readwrite');
        callback(tx);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('write failed'));
        tx.onabort = () => reject(tx.error || new Error('write aborted'));
      });
      const clearDb = db => txWrite(db, EXPECTED_STORE_NAMES, tx => EXPECTED_STORE_NAMES.forEach(name => tx.objectStore(name).clear()));
      const resign = async envelope => {
        const payload = structuredClone(envelope);
        delete payload.integrity;
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalize(payload)));
        envelope.integrity = { algorithm: 'SHA-256', canonicalization: 'JCS-LIKE-SORTED-KEYS-V1',
          checksum: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') };
        return envelope;
      };
      const semantic = async db => canonicalize(JSON.parse(await StorageService.exportBackup({ db })).stores);
      const expectRejectedUnchanged = async (source, db, options = {}) => {
        const before = await semantic(db);
        let rejected = false;
        try { await StorageService.restoreBackup(source, db, options); } catch { rejected = true; }
        return rejected && before === await semantic(db);
      };
      const seed = async (db, studentCount, enrollmentCount, { years = 0 } = {}) => {
        await clearDb(db);
        await txWrite(db, EXPECTED_STORE_NAMES, tx => {
          tx.objectStore('institucion').add({ id: 'INST-TEST', nombre: 'CETPRO Ñ TEST' });
          tx.objectStore('programas').add({ id: 'PROG-TEST', codigo: 'PTEST', nombre: 'Programa O\'Connor' });
          tx.objectStore('modulos').add({ id: 'MOD-TEST', codigo: 'MTEST', programaId: 'PROG-TEST', nombre: 'Módulo Técnico' });
          const periods = Math.max(0, years);
          for (let y = 0; y < periods; y++) tx.objectStore('periodos').add({ id: `PER-${2026 + y}`, nombre: `${2026 + y}-I` });
          for (let i = 0; i < studentCount; i++) {
            const documents = ['01234567', '1234567', 'A1B2C3', '87654321'];
            tx.objectStore('estudiantes').add({ id: `EST-${i}`, nombres: ['María Ñusta', "Ana O'Connor", 'Á'.repeat(80)][i % 3], numeroDocumento: documents[i % documents.length] });
          }
          for (let i = 0; i < enrollmentCount; i++) {
            tx.objectStore('matriculas').add({ id: `MAT-${i}`, estudianteId: `EST-${i % Math.max(1, studentCount)}`,
              programaId: 'PROG-TEST', moduloId: years ? 'MOD-TEST' : null,
              periodoId: years ? `PER-${2026 + (i % years)}` : null, grupoCode: `GRP-${i % 50}` });
          }
          for (let i = 0; i < enrollmentCount; i++) tx.objectStore('staging_importaciones').add({ id: `STG-${i}`, loteId: 'SYNTHETIC', estado: 'LISTO' });
          if (enrollmentCount) {
            tx.objectStore('unidades').add({ id: 'UNI-1', moduloId: 'MOD-TEST', nombre: 'Unidad' });
            tx.objectStore('indicadores').add({ id: 'IND-1', unidadId: 'UNI-1' });
            tx.objectStore('matricula_unidades').add({ id: 'MU-1', matriculaId: 'MAT-0', unidadId: 'UNI-1' });
            tx.objectStore('asistencia').add({ id: 'ASI-1', matriculaId: 'MAT-0', unidadId: 'UNI-1' });
            tx.objectStore('evaluacion').add({ id: 'EVA-1', matriculaId: 'MAT-0', unidadId: 'UNI-1', indicadorId: 'IND-1' });
            tx.objectStore('efsrt').add({ id: 'EFS-1', matriculaId: 'MAT-0', moduloId: 'MOD-TEST' });
          }
          tx.objectStore('documentos').add({ id: 'DOC-1', tipoDocumento: 'TEST' });
          tx.objectStore('auditoria').add({ id: 'AUD-1', accion: 'SEED_TEST' });
          tx.objectStore('configuracion').add({ clave: 'DATA_VERSION', valor: '1' });
          tx.objectStore('docentes').add({ id: 'DOCENTE-1', numeroDocumento: '00000001' });
        });
      };

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const dbA = await initDB(`CETPRO_BACKUP_A_${suffix}`);
      const dbB = await initDB(`CETPRO_BACKUP_B_${suffix}`);
      await seed(dbA, 269, 295);
      await seed(dbB, 1, 1);
      const backupA = await StorageService.exportBackup({ db: dbA, origin: 'TEST_EXPORT' });
      const parsedA = JSON.parse(backupA);
      const info = await StorageService.inspectBackup(backupA);
      check('T-BH01-01', info.valid && info.schemaVersion === 1 && info.formatVersion === 2 && /^[a-f0-9]{64}$/.test(info.checksum), 'backup válido/versionado');
      check('T-BH01-02', parsedA.storeManifest.length === 17 && EXPECTED_STORE_NAMES.every(name => parsedA.storeManifest.some(item => item.name === name)), 'manifiesto nominal 17/17');
      check('T-BH01-03', parsedA.counts.estudiantes === 269 && parsedA.counts.matriculas === 295 && parsedA.counts.staging_importaciones === 295, '269/295/295 sintéticos');
      check('T-BH01-04', MAX_BACKUP_BYTES === 50 * 1024 * 1024 && !('password' in parsedA) && !('token' in parsedA), 'límite y sin secretos');

      const restore = await StorageService.restoreBackup(backupA, dbB, { beforeWrite: async (pre, preInfo) => Boolean(pre && preInfo.checksum) });
      check('T-BH01-05', restore.success && restore.integrityCheck && restore.restoredStores === 17 && restore.preRestoreChecksum, 'restore + prebackup + readback');
      const backupB = await StorageService.exportBackup({ db: dbB, origin: 'ROUND_TRIP' });
      check('T-BH01-06', canonicalize(JSON.parse(backupA).stores) === canonicalize(JSON.parse(backupB).stores), 'round-trip semántico A→B');

      const tampered = structuredClone(parsedA); tampered.stores.estudiantes[0].nombres = 'ALTERADO';
      check('T-BH01-07', await expectRejectedUnchanged(tampered, dbB), 'checksum alterado');
      check('T-BH01-08', await expectRejectedUnchanged(backupA.slice(0, -20), dbB), 'JSON truncado');
      const missing = structuredClone(parsedA); delete missing.stores.unidades; delete missing.counts.unidades; missing.storeManifest = missing.storeManifest.filter(x => x.name !== 'unidades'); await resign(missing);
      check('T-BH01-09', await expectRejectedUnchanged(missing, dbB), 'store faltante');
      const unexpected = structuredClone(parsedA); unexpected.stores.intruso = []; unexpected.counts.intruso = 0; unexpected.storeManifest.push({ name: 'intruso', keyPath: 'id' }); await resign(unexpected);
      check('T-BH01-10', await expectRejectedUnchanged(unexpected, dbB), 'store inesperado');
      const duplicate = structuredClone(parsedA); duplicate.stores.estudiantes.push(structuredClone(duplicate.stores.estudiantes[0])); duplicate.counts.estudiantes++; await resign(duplicate);
      check('T-BH01-11', await expectRejectedUnchanged(duplicate, dbB), 'clave duplicada');
      const orphan = structuredClone(parsedA); orphan.stores.matriculas.push({ id: 'MAT-ORPHAN', estudianteId: 'NO-EXISTE', programaId: 'PROG-TEST', grupoCode: 'G' }); orphan.counts.matriculas++; await resign(orphan);
      check('T-BH01-12', await expectRejectedUnchanged(orphan, dbB), 'referencia huérfana');
      const incompatible = structuredClone(parsedA); incompatible.schemaVersion = 2; await resign(incompatible);
      check('T-BH01-13', await expectRejectedUnchanged(incompatible, dbB), 'schema incompatible');

      const alternate = structuredClone(parsedA); alternate.stores.estudiantes[0].nombres = 'OTRO VALOR VÁLIDO'; await resign(alternate);
      const faults = [
        ['T-BH01-14', state => state.phase === 'AFTER_CLEAR' && state.storeIndex === 0, 'fallo tras limpiar primer store'],
        ['T-BH01-15', state => state.phase === 'AFTER_WRITE' && state.storeName === 'matriculas' && state.recordIndex === 100, 'fallo en mitad'],
        ['T-BH01-16', state => state.phase === 'AFTER_STORE' && state.storeIndex === EXPECTED_STORE_NAMES.length - 1, 'fallo último store'],
        ['T-BH01-17', state => state.phase === 'BEFORE_COMMIT', 'fallo antes del commit']
      ];
      for (const [id, predicate, detail] of faults) {
        const ok = await expectRejectedUnchanged(alternate, dbB, { faultInjector: state => { if (predicate(state)) throw new Error(detail); } });
        check(id, ok, detail);
      }
      check('T-BH01-18', await expectRejectedUnchanged(alternate, dbB, { beforeWrite: async () => false }), 'pre-restore backup fallido');

      const legacy = { version: 'AG-V2', timestamp: parsedA.createdAt, dbName: 'LEGACY', dbVersion: 1,
        stores: structuredClone(parsedA.stores), storeCounts: structuredClone(parsedA.counts) };
      const legacyInfo = await StorageService.inspectBackup(legacy);
      check('T-BH01-19', legacyInfo.legacyConverted && legacyInfo.schemaVersion === 1, 'legacy convertido solo en memoria');

      // UI: seleccionar hace preflight; cancelar confirmación produce cero escrituras.
      await initDB(dbB.name);
      const input = document.querySelector('#backup-restore-file');
      const transfer = new DataTransfer();
      transfer.items.add(new File([backupA], 'respaldo_no_confiable_por_nombre_v99.json', { type: 'application/json' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 250));
      const beforeCancel = await semantic(dbB);
      const originalConfirm = window.confirm; window.confirm = () => false;
      document.querySelector('#btn-restore-backup').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      window.confirm = originalConfirm;
      check('T-BH01-20', !document.querySelector('#btn-restore-backup').disabled &&
        document.querySelector('#backup-restore-preflight').textContent.includes('SHA-256 verificado') && beforeCancel === await semantic(dbB), 'preflight y cancelación 0 writes');

      const dbLargeA = await initDB(`CETPRO_BACKUP_LARGE_A_${suffix}`);
      const dbLargeB = await initDB(`CETPRO_BACKUP_LARGE_B_${suffix}`);
      await seed(dbLargeA, 1000, 5000, { years: 5 });
      await seed(dbLargeB, 0, 0);
      const startExport = performance.now();
      const largeBackup = await StorageService.exportBackup({ db: dbLargeA, origin: 'PERFORMANCE_TEST' });
      const exportMs = performance.now() - startExport;
      const startRestore = performance.now();
      const largeRestore = await StorageService.restoreBackup(largeBackup, dbLargeB);
      const restoreMs = performance.now() - startRestore;
      const largeInfo = await StorageService.inspectBackup(largeBackup);
      check('T-BH01-21', largeInfo.counts.matriculas === 5000 && largeInfo.counts.periodos === 5 && largeRestore.integrityCheck, `export=${exportMs.toFixed(1)}ms restore=${restoreMs.toFixed(1)}ms`);
      check('T-BH01-22', canonicalize(JSON.parse(largeBackup).stores) === canonicalize(JSON.parse(await StorageService.exportBackup({ db: dbLargeB })).stores), 'round-trip multianual 5000');

      // Variantes mínimas separadas: 0/0 y 1/1.
      const dbZero = await initDB(`CETPRO_BACKUP_ZERO_${suffix}`); await seed(dbZero, 0, 0);
      const zeroInfo = await StorageService.inspectBackup(await StorageService.exportBackup({ db: dbZero }));
      const dbOne = await initDB(`CETPRO_BACKUP_ONE_${suffix}`); await seed(dbOne, 1, 1);
      const oneInfo = await StorageService.inspectBackup(await StorageService.exportBackup({ db: dbOne }));
      check('T-BH01-23', zeroInfo.counts.estudiantes === 0 && zeroInfo.counts.matriculas === 0 && oneInfo.counts.estudiantes === 1 && oneInfo.counts.matriculas === 1, 'variantes 0/0 y 1/1');
      check('T-BH01-24', dbA.version === 1 && dbB.version === 1 && !dbA.objectStoreNames.contains('grupos_academicos'), 'schema v1 sin migración');
      return { results, performance: { exportMs, restoreMs, records: largeInfo.totalRecords } };
    });
    for (const item of outcome.results) console.log(`[${item.passed ? 'PASSED' : 'FAILED'}] ${item.id}: ${item.detail}`);
    return { total: outcome.results.length, passed: outcome.results.filter(x => x.passed).length,
      failed: outcome.results.filter(x => !x.passed).length, performance: outcome.performance };
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

module.exports = { name: 'BACKUP-HARDENING-01', run };



