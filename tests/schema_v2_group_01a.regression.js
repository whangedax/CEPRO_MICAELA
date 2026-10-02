const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');
const URL = 'http://127.0.0.1:8080/app/index.html#/inicio';

async function serverUp() {
  return new Promise(resolve => {
    const request = http.get(URL, response => { response.resume(); resolve(response.statusCode === 200); });
    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => { request.destroy(); resolve(false); });
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
    const externalRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (!url.startsWith('http://127.0.0.1:8080/') && !url.startsWith('data:') && !url.startsWith('blob:')) externalRequests.push(url);
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    const outcome = await page.evaluate(async () => {
      const { CONFIG } = await import('/app/js/config.js');
      const { SCHEMA_V1, applySchemaUpgrade } = await import('/app/js/db/schema.js');
      const { SCHEMA_V2, SCHEMA_V2_STORE_NAMES } = await import('/app/js/db/schema-v2-design.js');
      const { StorageService, canonicalize } = await import('/app/js/services/storage-service.js');
      const migration = await import('/app/js/services/schema-v2-group-migration-service.js');
      const { SchemaV2BackupLabService, readV2Snapshot } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const results = [];
      const check = (id, passed, detail = '') => results.push({ id, passed: Boolean(passed), detail });
      const v1Names = Object.keys(SCHEMA_V1.stores).sort();
      const vector = [36, 15, 24, 17, 25, 20, 26, 70, 28, 7, 20, 7];
      const requestResult = request => new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const openCurrent = name => requestResult(indexedDB.open(name));
      const snapshot = (db, names) => new Promise((resolve, reject) => {
        const tx = db.transaction(names, 'readonly');
        const data = {};
        tx.oncomplete = () => resolve(data);
        tx.onerror = () => reject(tx.error);
        for (const name of names) {
          const req = tx.objectStore(name).getAll();
          req.onsuccess = () => { data[name] = req.result || []; };
        }
      });
      const mutate = (db, callback) => new Promise((resolve, reject) => {
        const tx = db.transaction(v1Names, 'readwrite');
        callback(tx);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('mutation aborted'));
      });
      const createV1 = (name, { students = 269, enrollments = 295, groups = vector } = {}) => new Promise((resolve, reject) => {
        const req = indexedDB.open(name, 1);
        req.onupgradeneeded = event => applySchemaUpgrade(event.target.result, event.oldVersion, event.newVersion);
        req.onerror = () => reject(req.error);
        req.onsuccess = async () => {
          const db = req.result;
          try {
            await mutate(db, tx => {
              tx.objectStore('institucion').add({ id: 'INST-001', nombre: 'CETPRO TEST' });
              for (let i = 1; i <= 7; i++) tx.objectStore('programas').add({ id: `PROG-${String(i).padStart(3, '0')}`, codigo: `P${i}`, nombre: `PROGRAMA ${i}` });
              for (let i = 1; i <= 14; i++) tx.objectStore('modulos').add({ id: `MOD-${String(i).padStart(3, '0')}`, codigo: `M${i}`, programaId: `PROG-${String(Math.ceil(i / 2)).padStart(3, '0')}` });
              for (let i = 0; i < students; i++) tx.objectStore('estudiantes').add({ id: `EST-${i}`, nombres: `PERSONA ${i}`, numeroDocumento: String(10000000 + i) });
              let created = 0;
              if (groups) {
                groups.forEach((count, groupIndex) => {
                  for (let n = 0; n < count && created < enrollments; n++, created++) {
                    tx.objectStore('matriculas').add({ id: `MAT-${created}`, estudianteId: `EST-${created % students}`,
                      programaId: `PROG-${String((groupIndex % 7) + 1).padStart(3, '0')}`,
                      grupoCode: `GRP-BD-${String(groupIndex + 1).padStart(3, '0')}`, moduloId: null, periodoId: null,
                      turno: 'PENDIENTE', modalidad: 'PENDIENTE', seccion: 'PENDIENTE' });
                    tx.objectStore('staging_importaciones').add({ id: `STG-${created}`, loteId: 'V1-SYNTHETIC', estado: 'LISTO' });
                  }
                });
              } else {
                for (; created < enrollments; created++) {
                  const groupIndex = created % 50;
                  tx.objectStore('matriculas').add({ id: `MAT-${created}`, estudianteId: `EST-${created % students}`,
                    programaId: `PROG-${String((groupIndex % 7) + 1).padStart(3, '0')}`,
                    grupoCode: `GRP-LARGE-${String(groupIndex + 1).padStart(3, '0')}`, moduloId: null, periodoId: null });
                  tx.objectStore('staging_importaciones').add({ id: `STG-${created}`, loteId: 'V1-LARGE', estado: 'LISTO' });
                }
              }
              tx.objectStore('configuracion').add({ clave: 'DATA_VERSION', valor: '1' });
            });
            resolve(db);
          } catch (error) { db.close(); reject(error); }
        };
      });
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`.toUpperCase();
      check('T-SV2-01', CONFIG.DB.VERSION === 1 && SCHEMA_V1.version === 1 && SCHEMA_V2.version === 2 && v1Names.length === 17 && SCHEMA_V2_STORE_NAMES.length === 18, 'producto v1; diseño aislado v2/18');

      const validName = `CETPRO_SCHEMA_V2_VALID_${suffix}`;
      const v1db = await createV1(validName);
      const before = await snapshot(v1db, v1Names);
      const backupV1 = await StorageService.exportBackup({ db: v1db, origin: 'PRE_MIGRATION_TEST' });
      v1db.close();
      const upgradeStart = performance.now();
      const v2db = await migration.upgradeIsolatedDatabaseV1ToV2(validName);
      const upgradeMs = performance.now() - upgradeStart;
      const after = await readV2Snapshot(v2db);
      const groups = after.grupos_academicos;
      check('T-SV2-02', v2db.version === 2 && v2db.objectStoreNames.length === 18 && v2db.objectStoreNames.contains('grupos_academicos') &&
        v2db.transaction('matriculas', 'readonly').objectStore('matriculas').indexNames.contains('grupoId'), 'upgrade válido v1→v2 + índice grupoId');
      check('T-SV2-03', groups.length === 12 && after.matriculas.length === 295 && after.matriculas.every(item => item.grupoId), '12 grupos/295 relaciones');
      const counts = Object.fromEntries(groups.map(group => [group.sourceGroupCode, after.matriculas.filter(item => item.grupoId === group.id).length]));
      check('T-SV2-04', vector.every((count, i) => counts[`GRP-BD-${String(i + 1).padStart(3, '0')}`] === count), 'vector histórico conservado');
      check('T-SV2-05', groups.every(group => group.id === `GAC-V1-${group.sourceGroupCode}` && group.codigoVisible === group.sourceGroupCode), 'IDs deterministas y trazabilidad');
      check('T-SV2-06', groups.every(group => group.moduloId === null && group.periodoId === null && group.estado === 'ACTIVO' && group.moduleAssignmentStatus === 'UNASSIGNED'), 'cero inferencias módulo/periodo');
      check('T-SV2-07', groups.every(group => after.matriculas.filter(item => item.grupoId === group.id).every(item => item.programaId === group.programaId)), 'programa uniforme');
      const comparison = migration.compareV1V2Snapshots(before, after);
      check('T-SV2-08', comparison.equivalent && after.estudiantes.length === 269 && after.staging_importaciones.length === 295 && after.periodos.length === 0 && after.unidades.length === 0, 'pre/post semánticamente equivalente');
      const auditStart = performance.now();
      const audit = migration.auditV2Snapshot(after);
      const auditMs = performance.now() - auditStart;
      check('T-SV2-09', audit.valid && audit.issueCount === 0, 'referential audit 0 huérfanos');
      const marker = after.configuracion.find(item => item.clave === migration.MIGRATION_MARKER_KEY);
      check('T-SV2-10', marker?.fromVersion === 1 && marker?.toVersion === 2 && marker?.migrationId === migration.MIGRATION_ID && marker?.resultado === 'SUCCESS', 'migration marker sin datos personales');

      const reviewPlan = migration.planGroupMigration({
        students: [{ id: 'E' }], programs: [{ id: 'P' }],
        enrollments: [{ id: 'M', estudianteId: 'E', programaId: 'P', grupoCode: 'G', moduloId: 'MOD-X', periodoId: null,
          turno: 'TARDE', academicContextSources: {} }]
      });
      check('T-SV2-11', reviewPlan.groupRecords[0].estado === 'REVIEW_REQUIRED' && reviewPlan.groupRecords[0].moduloId === null && reviewPlan.groupRecords[0].turno === null && reviewPlan.enrollmentUpdates[0].moduloId === 'MOD-X', 'datos no confirmados se preservan/revisan, no se infieren');

      const abortCase = async (label, prepare, faultInjector) => {
        const name = `CETPRO_SCHEMA_V2_ABORT_${label}_${suffix}`;
        const db = await createV1(name);
        if (prepare) await prepare(db);
        const expected = await snapshot(db, v1Names);
        db.close();
        let rejected = false;
        try { const unexpected = await migration.upgradeIsolatedDatabaseV1ToV2(name, { faultInjector }); unexpected.close(); } catch { rejected = true; }
        const reopened = await openCurrent(name);
        const actual = await snapshot(reopened, v1Names);
        const ok = rejected && reopened.version === 1 && !reopened.objectStoreNames.contains('grupos_academicos') && canonicalize(expected) === canonicalize(actual);
        reopened.close();
        return ok;
      };
      check('T-SV2-12', await abortCase('CREATE', null, state => { if (state.phase === 'BEFORE_CREATE_STORE') throw new Error('create fail'); }), 'fallo creando store revierte');
      check('T-SV2-13', await abortCase('MIXED', db => mutate(db, tx => {
        const req = tx.objectStore('matriculas').get('MAT-0'); req.onsuccess = () => tx.objectStore('matriculas').put({ ...req.result, programaId: 'PROG-002' });
      })), 'programa mixto aborta');
      check('T-SV2-14', await abortCase('EMPTYCODE', db => mutate(db, tx => {
        const req = tx.objectStore('matriculas').get('MAT-0'); req.onsuccess = () => tx.objectStore('matriculas').put({ ...req.result, grupoCode: '' });
      })), 'groupCode vacío aborta');
      check('T-SV2-15', await abortCase('BADPROGRAM', db => mutate(db, tx => {
        const req = tx.objectStore('matriculas').get('MAT-0'); req.onsuccess = () => tx.objectStore('matriculas').put({ ...req.result, programaId: 'NO-EXISTE' });
      })), 'programa inexistente aborta');
      check('T-SV2-16', await abortCase('GROUPS', null, state => { if (state.phase === 'AFTER_GROUP' && state.index === 3) throw new Error('groups fail'); }), 'fallo tras algunos grupos revierte');
      check('T-SV2-17', await abortCase('MIDDLE', null, state => { if (state.phase === 'AFTER_ENROLLMENT' && state.index === 140) throw new Error('middle fail'); }), 'fallo mitad matrículas revierte');
      check('T-SV2-18', await abortCase('COMMIT', null, state => { if (state.phase === 'BEFORE_COMMIT') throw new Error('commit fail'); }), 'fallo antes commit revierte');

      const backupStart = performance.now();
      const backupV2 = await SchemaV2BackupLabService.exportBackup(v2db, 'POST_MIGRATION_TEST');
      const backupMs = performance.now() - backupStart;
      const backupInfo = await SchemaV2BackupLabService.inspectBackup(backupV2);
      check('T-SV2-19', backupInfo.valid && backupInfo.schemaVersion === 2 && backupInfo.stores === 18 && backupInfo.counts.grupos_academicos === 12, 'backup schema2 válido');
      const restoredName = `CETPRO_SCHEMA_V2_RESTORED_${suffix}`;
      const restoredDb = await SchemaV2BackupLabService.createEmptyDatabase(restoredName);
      const restoreStart = performance.now();
      const restored = await SchemaV2BackupLabService.restoreBackup(backupV2, restoredDb);
      const restoreMs = performance.now() - restoreStart;
      const restoredSnapshot = await readV2Snapshot(restoredDb);
      check('T-SV2-20', restored.success && restored.integrityCheck && canonicalize(after) === canonicalize(restoredSnapshot), 'backup→restore→readback v2');
      check('T-SV2-21', JSON.parse(backupV1).schemaVersion === 1 && migration.compareV1V2Snapshots(JSON.parse(backupV1).stores, restoredSnapshot).equivalent, 'round-trip v1 backup→migración→v2 backup→restore');

      await new Promise((resolve, reject) => {
        const tx = v2db.transaction(['periodos', 'grupos_academicos'], 'readwrite');
        ['2026-I', '2026-II', '2027-I', '2027-II'].forEach((label, i) => tx.objectStore('periodos').add({ id: `PER-FUT-${i}`, nombre: label }));
        ['11111111', '22222222', '33333333', '44444444'].forEach((token, i) => tx.objectStore('grupos_academicos').add({
          id: `GAC-${token}-aaaa-bbbb-cccccccccccc`, codigoVisible: i < 2 ? 'SECCIÓN A' : 'SECCIÓN B', sourceGroupCode: null,
          programaId: 'PROG-001', moduloId: null, periodoId: `PER-FUT-${i}`, turno: null, modalidad: null, seccion: null,
          estado: 'ACTIVO', moduleAssignmentStatus: 'UNASSIGNED', periodAssignmentStatus: 'ASSIGNED',
          source: { type: 'FUTURE_SYNTHETIC_TEST' }, createdAt: 'TEST', updatedAt: 'TEST'
        }));
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      const multi = await readV2Snapshot(v2db);
      const future = multi.grupos_academicos.filter(group => group.source?.type === 'FUTURE_SYNTHETIC_TEST');
      check('T-SV2-22', multi.grupos_academicos.filter(group => group.sourceGroupCode).length === 12 && future.length === 4 && new Set(future.map(group => group.id)).size === 4, 'multiaño no modifica 12 migrados');
      check('T-SV2-23', future[0].codigoVisible === future[1].codigoVisible && future[0].id !== future[1].id, 'código visible repetible, ID independiente');

      const stableName = `CETPRO_SCHEMA_V2_STABLE_${suffix}`;
      const stableV1 = await createV1(stableName); stableV1.close();
      const stableV2 = await migration.upgradeIsolatedDatabaseV1ToV2(stableName);
      const stableSnapshot = await readV2Snapshot(stableV2);
      check('T-SV2-24', canonicalize(stableSnapshot.grupos_academicos.map(g => [g.id, g.sourceGroupCode])) === canonicalize(groups.map(g => [g.id, g.sourceGroupCode])), 'IDs migrados reproducibles');

      const largeName = `CETPRO_SCHEMA_V2_LARGE_${suffix}`;
      const largeV1 = await createV1(largeName, { students: 1000, enrollments: 5000, groups: null }); largeV1.close();
      const largeUpgradeStart = performance.now();
      const largeV2 = await migration.upgradeIsolatedDatabaseV1ToV2(largeName);
      const largeUpgradeMs = performance.now() - largeUpgradeStart;
      const largeSnapshot = await readV2Snapshot(largeV2);
      const largeAuditStart = performance.now(); migration.auditV2Snapshot(largeSnapshot); const largeAuditMs = performance.now() - largeAuditStart;
      const largeBackupStart = performance.now(); const largeBackup = await SchemaV2BackupLabService.exportBackup(largeV2, 'PERFORMANCE'); const largeBackupMs = performance.now() - largeBackupStart;
      const largeRestoreDb = await SchemaV2BackupLabService.createEmptyDatabase(`CETPRO_SCHEMA_V2_LARGE_RESTORE_${suffix}`);
      const largeRestoreStart = performance.now(); await SchemaV2BackupLabService.restoreBackup(largeBackup, largeRestoreDb); const largeRestoreMs = performance.now() - largeRestoreStart;
      check('T-SV2-25', largeSnapshot.matriculas.length === 5000 && largeSnapshot.grupos_academicos.length === 50 && migration.auditV2Snapshot(largeSnapshot).valid,
        `upgrade=${largeUpgradeMs.toFixed(1)} audit=${largeAuditMs.toFixed(1)} backup=${largeBackupMs.toFixed(1)} restore=${largeRestoreMs.toFixed(1)}ms`);

      const productDb = await openCurrent(CONFIG.DB.NAME);
      check('T-SV2-26', productDb.version === 1 && !productDb.objectStoreNames.contains('grupos_academicos') && CONFIG.DB.VERSION === 1, 'CETPRO_DB headless permanece v1');
      productDb.close();
      let migrationGuard = false; let backupGuard = false;
      try { migration.upgradeIsolatedDatabaseV1ToV2(CONFIG.DB.NAME); } catch { migrationGuard = true; }
      try { await SchemaV2BackupLabService.createEmptyDatabase(CONFIG.DB.NAME); } catch { backupGuard = true; }
      const [appSource, databaseSource] = await Promise.all([fetch('/app/js/app.js').then(r => r.text()), fetch('/app/js/db/database.js').then(r => r.text())]);
      check('T-SV2-28', migrationGuard && backupGuard && CONFIG.DB.VERSION === 1 &&
        databaseSource.includes('CONFIG.IS_V2_CANDIDATE') && databaseSource.includes("overrideDbName === 'CETPRO_V2_CANDIDATE'") &&
        !appSource.includes('upgradeIsolatedDatabaseV1ToV2'), 'guards productivos + v2 solo por target explícito');
      [v2db, restoredDb, stableV2, largeV2, largeRestoreDb].forEach(db => db.close());
      return { results, performance: { upgradeMs, auditMs, backupMs, restoreMs, largeUpgradeMs, largeAuditMs, largeBackupMs, largeRestoreMs } };
    });
    outcome.results.push({ id: 'T-SV2-27', passed: externalRequests.length === 0, detail: `red externa=${externalRequests.length}` });
    for (const item of outcome.results) console.log(`[${item.passed ? 'PASSED' : 'FAILED'}] ${item.id}: ${item.detail}`);
    return { total: outcome.results.length, passed: outcome.results.filter(item => item.passed).length,
      failed: outcome.results.filter(item => !item.passed).length, performance: outcome.performance };
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

module.exports = { name: 'SCHEMA-V2-GROUP-01A', run };



