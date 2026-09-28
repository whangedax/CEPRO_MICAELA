const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const URL = 'http://127.0.0.1:8080/app/index.html#/inicio';
const DEFAULT_BACKUP = path.resolve(__dirname, '../CETPRO_BACKUP_2026-09-15 (2).json');
const EXPECTED_FILE_SHA256 = '5a792e65c67b249d45de71b0ea9b5de37e79b0e4a9a5bbd118ef1404d69e58f6';

async function serverUp() {
  return new Promise(resolve => {
    const request = http.get(URL, response => { response.resume(); resolve(response.statusCode === 200); });
    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => { request.destroy(); resolve(false); });
  });
}

async function run() {
  const backupPath = process.env.CETPRO_REAL_BACKUP_PATH || DEFAULT_BACKUP;
  if (!fs.existsSync(backupPath)) throw new Error('SCHEMA-V2-GROUP-01B requiere CETPRO_REAL_BACKUP_PATH o el backup real en la raíz.');
  const backupBuffer = fs.readFileSync(backupPath);
  const fileHash = crypto.createHash('sha256').update(backupBuffer).digest('hex');
  if (fileHash !== EXPECTED_FILE_SHA256) throw new Error('El hash físico del backup real cambió; ensayo 01B abortado.');
  const backupSource = backupBuffer.toString('utf8');

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
    const outcome = await page.evaluate(async backupSource => {
      const { CONFIG } = await import('/app/js/config.js');
      const { SCHEMA_V1, applySchemaUpgrade } = await import('/app/js/db/schema.js');
      const { SCHEMA_V2, SCHEMA_V2_STORE_NAMES } = await import('/app/js/db/schema-v2-design.js');
      const { StorageService, canonicalize } = await import('/app/js/services/storage-service.js');
      const migration = await import('/app/js/services/schema-v2-group-migration-service.js');
      const { SchemaV2BackupLabService, readV2Snapshot } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const { SchemaV2GroupAssignmentCandidate, SchemaV2DocumentDataCandidate, inspectSchemaV2Candidate } =
        await import('/app/js/services/schema-v2-candidate-runtime-service.js');

      const results = [];
      const check = (id, passed, detail = '') => results.push({ id, passed: Boolean(passed), detail });
      const v1Names = Object.keys(SCHEMA_V1.stores).sort();
      const requestResult = request => new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IDB request failed'));
      });
      const deleteDb = name => new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(`DB aislada bloqueada: ${name}`));
      });
      const createV1 = async name => {
        await deleteDb(name);
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = event => applySchemaUpgrade(event.target.result, event.oldVersion, event.newVersion);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      };
      const snapshotV1 = db => new Promise((resolve, reject) => {
        const tx = db.transaction(v1Names, 'readonly');
        const stores = {};
        tx.oncomplete = () => resolve(stores);
        tx.onerror = () => reject(tx.error);
        for (const name of v1Names) {
          const request = tx.objectStore(name).getAll();
          request.onsuccess = () => { stores[name] = request.result || []; };
        }
      });
      const valuePresent = value => value !== null && value !== undefined && String(value).trim() !== '';
      const preflight = await StorageService.inspectBackup(backupSource, { allowLegacy: false });
      check('T-SV2B-01', preflight.valid && preflight.formatVersion === 2 && preflight.schemaVersion === 1, 'preflight real válido');
      check('T-SV2B-02', Object.keys(preflight.counts).length === 17 && preflight.totalRecords === 893 && preflight.referentialIssues === 0, '17 stores/893/0 issues');

      const sourceEnvelope = JSON.parse(backupSource);
      const before = sourceEnvelope.stores;
      const counts = sourceEnvelope.counts;
      check('T-SV2B-03', canonicalize(counts) === canonicalize(Object.fromEntries(v1Names.map(name => [name, before[name].length]))), 'inventario real coincide');

      const byCode = new Map();
      for (const enrollment of before.matriculas) {
        const code = String(enrollment.grupoCode || '').trim();
        if (!byCode.has(code)) byCode.set(code, []);
        byCode.get(code).push(enrollment);
      }
      const academicBefore = [...byCode].sort(([a], [b]) => a.localeCompare(b)).map(([sourceGroupCode, members]) => ({
        sourceGroupCode,
        count: members.length,
        programIds: [...new Set(members.map(item => item.programaId))].sort(),
        moduleNonNull: members.filter(item => valuePresent(item.moduloId)).length,
        periodNonNull: members.filter(item => valuePresent(item.periodoId)).length,
        turnoValues: [...new Set(members.map(item => item.turno ?? null))],
        modalidadValues: [...new Set(members.map(item => item.modalidad ?? null))],
        seccionValues: [...new Set(members.map(item => item.seccion ?? null))]
      }));
      check('T-SV2B-04', academicBefore.length > 0 && academicBefore.every(item => item.sourceGroupCode && item.programIds.length === 1), 'grupos reales con programa uniforme');

      const v1Name = `CETPRO_SCHEMA_V2_REAL_BACKUP_MIGRATION_TEST_V1_${Date.now()}`;
      const v1db = await createV1(v1Name);
      const restoreV1 = await StorageService.restoreBackup(backupSource, v1db);
      const restoredV1Snapshot = await snapshotV1(v1db);
      check('T-SV2B-05', restoreV1.success && restoreV1.integrityCheck && canonicalize(before) === canonicalize(restoredV1Snapshot), 'restore v1 exacto');
      const v1RoundTrip = JSON.parse(await StorageService.exportBackup({ db: v1db, origin: 'SCHEMA_V2_GROUP_01B_ROUNDTRIP' }));
      check('T-SV2B-06', canonicalize(before) === canonicalize(v1RoundTrip.stores), 'backup→DB v1→export equivalente');
      v1db.close();

      const v2db = await migration.upgradeIsolatedDatabaseV1ToV2(v1Name);
      const after = await readV2Snapshot(v2db);
      const groups = after.grupos_academicos.slice().sort((a, b) => a.id.localeCompare(b.id));
      check('T-SV2B-07', v2db.version === 2 && SCHEMA_V2_STORE_NAMES.length === 18 && v2db.objectStoreNames.length === 18, 'upgrade 17→18');
      check('T-SV2B-08', groups.length === academicBefore.length && after.matriculas.every(item => item.grupoId), 'grupos y enlaces completos');
      const comparison = migration.compareV1V2Snapshots(before, after);
      check('T-SV2B-09', comparison.equivalent && comparison.differences.length === 0, 'unexpectedDifferences=0');

      const groupMap = new Map(groups.map(group => [group.id, group]));
      const studentIds = new Set(after.estudiantes.map(item => item.id));
      const programIds = new Set(after.programas.map(item => item.id));
      const moduleIds = new Set(after.modulos.map(item => item.id));
      const periodIds = new Set(after.periodos.map(item => item.id));
      const invariantChecks = [
        ['INV-G01', after.matriculas.every(item => Boolean(item.grupoId))],
        ['INV-G02', after.matriculas.every(item => groupMap.has(item.grupoId))],
        ['INV-G03', groups.every(item => programIds.has(item.programaId))],
        ['INV-G04', after.matriculas.every(item => groupMap.get(item.grupoId)?.programaId === item.programaId)],
        ['INV-G05', after.matriculas.every(item => groupMap.get(item.grupoId)?.sourceGroupCode === item.grupoCode)],
        ['INV-G06', new Set(groups.map(item => item.id)).size === groups.length && new Set(groups.map(item => item.sourceGroupCode)).size === groups.length],
        ['INV-G07', before.matriculas.length === after.matriculas.length],
        ['INV-G08', canonicalize(before.estudiantes) === canonicalize(after.estudiantes)],
        ['INV-G09', canonicalize(before.staging_importaciones) === canonicalize(after.staging_importaciones)],
        ['INV-G10', before.periodos.length === after.periodos.length && after.periodos.length === 0],
        ['INV-G11', before.unidades.length === after.unidades.length && after.unidades.length === 0],
        ['INV-G12', groups.every(item => item.moduloId === null && item.periodoId === null)],
        ['INV-G13', v1Names.every(name => name === 'matriculas' || name === 'configuracion' || canonicalize(before[name]) === canonicalize(after[name]))],
        ['INV-G14', comparison.equivalent],
        ['INV-G15', SCHEMA_V2.stores.grupos_academicos.keyPath === 'id' && !SCHEMA_V2.stores.grupos_academicos.indexes.find(item => item.name === 'sourceGroupCode').options.unique],
        ['INV-G16', (() => { try { const copy = structuredClone(before.matriculas); copy[0].programaId = copy.find(item => item.grupoCode === copy[0].grupoCode && item.id !== copy[0].id)?.programaId === copy[0].programaId ? 'PROG-INEXISTENTE' : copy.find(item => item.programaId !== copy[0].programaId)?.programaId; migration.planGroupMigration({ enrollments: copy, students: before.estudiantes, programs: before.programas }); return false; } catch { return true; } })()],
        ['INV-G17', groups.every(group => ['turno', 'modalidad', 'seccion'].every(field => group[field] === null || academicBefore.find(item => item.sourceGroupCode === group.sourceGroupCode)[`${field}Values`].length === 1))],
        ['INV-G18', SCHEMA_V2_STORE_NAMES.length === 18]
      ];
      invariantChecks.forEach(([id, passed], index) => check(`T-SV2B-${String(10 + index).padStart(2, '0')}`, passed, `${id}=PASS`));

      const audit = migration.auditV2Snapshot(after);
      check('T-SV2B-28', audit.valid && audit.issueCount === 0 && after.matriculas.every(item => studentIds.has(item.estudianteId)), 'auditor v2: 0 huérfanos');

      const v2Backup = await SchemaV2BackupLabService.exportBackup(v2db, 'REAL_BACKUP_CLONE_POST_MIGRATION');
      const v2Info = await SchemaV2BackupLabService.inspectBackup(v2Backup);
      check('T-SV2B-29', v2Info.valid && v2Info.schemaVersion === 2 && v2Info.stores === 18 && v2Info.referentialIssues === 0, 'backup v2 válido');
      const restoreName = `CETPRO_SCHEMA_V2_REAL_BACKUP_MIGRATION_TEST_V2_RESTORE_${Date.now()}`;
      const restoreDb = await SchemaV2BackupLabService.createEmptyDatabase(restoreName);
      const restoreV2 = await SchemaV2BackupLabService.restoreBackup(v2Backup, restoreDb);
      const restoredV2Snapshot = await readV2Snapshot(restoreDb);
      check('T-SV2B-30', restoreV2.success && canonicalize(after) === canonicalize(restoredV2Snapshot), 'restore v2 equivalente');

      const candidateCounts = await inspectSchemaV2Candidate(restoreDb);
      check('T-SV2B-31', candidateCounts.estudiantes === counts.estudiantes && candidateCounts.matriculas === counts.matriculas && candidateCounts.programas === counts.programas && candidateCounts.grupos_academicos === groups.length && candidateCounts.configuracion === counts.configuracion + 1, 'runtime candidato abre funciones base');
      const sampleEnrollmentId = after.matriculas[0].id;
      const docsCandidate = new SchemaV2DocumentDataCandidate(restoreDb);
      const enrollmentContext = await docsCandidate.buildEnrollmentContext(sampleEnrollmentId);
      check('T-SV2B-32', enrollmentContext.enrollment.id === sampleEnrollmentId && enrollmentContext.student.id && enrollmentContext.program.id && enrollmentContext.source.groupId, 'DocumentData ENROLLMENT v2');
      const sampleGroupId = groups[0].id;
      const groupContext = await docsCandidate.buildGroupContext(sampleGroupId);
      check('T-SV2B-33', groupContext.group.id === sampleGroupId && groupContext.enrollments.length > 0 && groupContext.students.length === groupContext.enrollments.length && Object.keys(groupContext.period).length === 0 && groupContext.curriculum.units.length === 0, 'buildGroupContext(groupId)');
      const assignmentCandidate = new SchemaV2GroupAssignmentCandidate(restoreDb);
      const listedGroups = await assignmentCandidate.listGroups();
      const openedGroup = await assignmentCandidate.openGroup(sampleGroupId);
      check('T-SV2B-34', listedGroups.length === groups.length && openedGroup.group.id === sampleGroupId && openedGroup.enrollmentCount === groupContext.enrollments.length, 'list/open por groupId');
      const compatibleModule = after.modulos.find(item => item.programaId === openedGroup.group.programaId);
      const beforeDryRun = await readV2Snapshot(restoreDb);
      const dryRun = await assignmentCandidate.assignModule({ groupId: sampleGroupId, moduloId: compatibleModule.id, dryRun: true });
      const afterDryRun = await readV2Snapshot(restoreDb);
      check('T-SV2B-35', dryRun.dryRun && !dryRun.persisted && canonicalize(beforeDryRun) === canonicalize(afterDryRun), 'assignModule candidato sin escritura');

      const [appSource, databaseSource] = await Promise.all([fetch('/app/js/app.js').then(r => r.text()), fetch('/app/js/db/database.js').then(r => r.text())]);
      let productGuard = false;
      try { await migration.upgradeIsolatedDatabaseV1ToV2(CONFIG.DB.NAME); } catch { productGuard = true; }
      check('T-SV2B-36', CONFIG.DB.VERSION === 1 && productGuard &&
        databaseSource.includes('CONFIG.IS_V2_CANDIDATE') && databaseSource.includes("overrideDbName === 'CETPRO_V2_CANDIDATE'") &&
        !appSource.includes('upgradeIsolatedDatabaseV1ToV2'), 'producto permanece v1; v2 solo por target explícito');

      const realGroupSummary = groups.map(group => ({
        id: group.id, sourceGroupCode: group.sourceGroupCode, programaId: group.programaId,
        estado: group.estado, reviewReasons: [...group.reviewReasons], moduloId: group.moduloId,
        periodoId: group.periodoId, turno: group.turno, modalidad: group.modalidad, seccion: group.seccion,
        enrollmentCount: after.matriculas.filter(item => item.grupoId === group.id).length
      }));
      v2db.close(); restoreDb.close();
      return {
        results,
        summary: {
          preflight: { formatVersion: preflight.formatVersion, schemaVersion: preflight.schemaVersion, totalRecords: preflight.totalRecords,
            counts: preflight.counts, checksum: preflight.checksum, referentialIssues: preflight.referentialIssues },
          academicBefore, realGroupSummary, groupCount: groups.length, linkedEnrollments: after.matriculas.length,
          unexpectedDifferences: comparison.differences, auditIssueCount: audit.issueCount,
          v2Backup: { schemaVersion: v2Info.schemaVersion, stores: v2Info.stores, counts: v2Info.counts, checksum: v2Info.checksum },
          invariantResults: invariantChecks.map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }))
        }
      };
    }, backupSource);
    outcome.results.unshift({ id: 'T-SV2B-00', passed: fileHash === EXPECTED_FILE_SHA256, detail: 'hash físico exacto' });
    outcome.results.push({ id: 'T-SV2B-37', passed: externalRequests.length === 0, detail: `red externa=${externalRequests.length}` });
    for (const item of outcome.results) console.log(`[${item.passed ? 'PASSED' : 'FAILED'}] ${item.id}: ${item.detail}`);
    console.log('[SCHEMA-V2-GROUP-01B-SUMMARY]', JSON.stringify({ fileSha256: fileHash, ...outcome.summary }));
    return { total: outcome.results.length, passed: outcome.results.filter(item => item.passed).length,
      failed: outcome.results.filter(item => !item.passed).length, summary: outcome.summary };
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

module.exports = { name: 'SCHEMA-V2-GROUP-01B', run };



