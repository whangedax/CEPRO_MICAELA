const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const up = () => new Promise(resolve => {
  const request = http.get(BASE, response => { response.resume(); resolve(response.statusCode === 200); });
  request.on('error', () => resolve(false));
  request.setTimeout(1000, () => { request.destroy(); resolve(false); });
});
const waitServer = async () => {
  for (let index = 0; index < 40; index += 1) {
    if (await up()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Servidor candidato 8081 no disponible.');
};
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
async function pdfText(base64) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(base64, 'base64')), disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return pages.join(' ');
}

async function run() {
  const results = [];
  const check = (id, passed, detail = '') => {
    const row = { id, passed: Boolean(passed), detail };
    results.push(row);
    console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${id}: ${detail}`);
  };

  const runtime = read('app/js/services/runtime-target-service.js');
  const demo = read('app/js/services/demo-runtime-service.js');
  const html = read('app-v2/index.html');
  const css = read('app-v2/candidate.css');
  const config = read('app/js/config.js');
  const backup = read('app/js/services/schema-v2-backup-lab-service.js');
  const candidateStorage = read('app/js/v2-candidate/candidate-services.js');
  const pdfEngine = read('app/js/services/pdf-template-engine.js');
  const pdfService = read('app/js/services/mvp-pdf-service.js');
  const attendanceView = read('app/js/ui/demo-attendance-view.js');
  const evaluationView = read('app/js/ui/demo-evaluation-view.js');
  const dashboardView = read('app/js/ui/demo-dashboard-view.js');
  const appSource = read('app/js/app.js');
  check('T-DEMO09-01-RUNTIME', runtime.includes("REAL: 'REAL'") && runtime.includes("DEMO: 'DEMO'") && runtime.includes("LAB: 'LAB'"), 'runtimeTarget explícito REAL/DEMO/LAB');
  check('T-DEMO09-02-DB-NAME', demo.includes("DEMO_DB_NAME = RUNTIME_DATABASES.DEMO") && runtime.includes("DEMO: 'CETPRO_V2_DEMO'"), 'DB demo separada');
  check('T-DEMO09-03-DETERMINISTIC', demo.includes('DEMO_DATASET_V1') && demo.includes('DEMO_FIXED_TIMESTAMP') && !demo.includes('Math.random'), 'dataset versionado y determinista');
  check('T-DEMO09-04-BARRIERS', html.includes('MODO DEMOSTRACIÓN · DATOS SIMULADOS · NO OFICIAL') && css.includes('.demo-mode .demo-runtime-bar'), 'barrera visual persistente');
  check('T-DEMO09-05-CONTROLS', ['btn-enter-demo', 'btn-reset-demo', 'btn-exit-demo'].every(id => html.includes(`id="${id}"`)), 'entrar, reiniciar y salir');
  check('T-DEMO09-06-ROUTES', config.includes("'#/demo'") && config.includes("'#/demo/evaluacion'"), 'ruta directa y evaluación demo');
  check('T-DEMO09-07-GUARD', runtime.includes('DEMO_TARGET_VIOLATION') && runtime.includes('assertRuntimeWriteTarget'), 'fail-closed por destino');
  check('T-DEMO09-08-BACKUP-META', backup.includes("envelope.environment = 'DEMO'") && backup.includes('envelope.official = false'), 'backup DEMO no oficial');
  check('T-DEMO09-09-BACKUP-MISMATCH', candidateStorage.includes('BACKUP_ENVIRONMENT_MISMATCH'), 'restore cruzado bloqueado');
  check('T-DEMO09-10-PDF-WATERMARK', pdfEngine.includes('DEMOSTRACIÓN — NO OFICIAL') && pdfService.includes('DEMOSTRACIÓN — NO OFICIAL'), 'renderers con marca de agua');
  check('T-DEMO09-11-ATTENDANCE-POLICY', attendanceView.includes('PORCENTAJE OFICIAL NO DISPONIBLE') && attendanceView.includes('TMPL-05'), 'asistencia sin inferir B-003');
  check('T-DEMO09-12-EVALUATION-BOUNDARY', evaluationView.includes('no se registran notas') && evaluationView.includes('Evaluación productiva continúa bloqueada'), 'evaluación demostrativa sin desbloqueo productivo');
  check('T-DEMO09-13-GUIDE', fs.existsSync(path.join(ROOT, 'docs/DEMO_MODE_GUIDE.md')) && read('docs/DEMO_MODE_GUIDE.md').split(/\r?\n/).length <= 60, 'guía breve disponible');
  check('T-DEMO09-14-V1-UNCHANGED', /VERSION:\s*runtime\?\.dbVersion\s*\|\|\s*1/.test(config) && /NAME:\s*runtime\?\.dbName\s*\|\|\s*'CETPRO_DB'/.test(config), 'producción conserva CETPRO_DB v1');

  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(name => name.endsWith('.json'));
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const pdfPath = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(pdfPath) && crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex') === manifest.sha256) hashMatches += 1;
  }
  check('T-DEMO09-15-PDF-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 PDF canónicos intactos`);
  const jsFiles = fs.readdirSync(path.join(ROOT, 'app/js'), { recursive: true }).filter(file => String(file).endsWith('.js'));
  const unsafe = jsFiles.filter(file => /\beval\s*\(|\bnew\s+Function\s*\(/.test(read(`app/js/${String(file).replace(/\\/g, '/')}`)));
  check('T-DEMO09-16-NO-DYNAMIC-CODE', unsafe.length === 0, '0 eval / 0 Function');
  check('T-DEMO09-16B-XSS', [attendanceView, evaluationView, dashboardView].every(source => source.includes('escapeHtml')) &&
    appSource.includes('textContent'), 'datos DEMO escapados y preflight por textContent');

  let server;
  if (!await up()) { server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true }); await waitServer(); }
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage();
    const runtimeErrors = [];
    const external = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', response => {
      try { if (new URL(response.url()).hostname !== '127.0.0.1') external.push(response.url()); } catch { /* local */ }
    });
    await page.goto(`${BASE}#/demo`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForFunction(() => document.querySelector('#candidate-runtime-banner')?.textContent.includes('MODO DEMOSTRACIÓN'), { timeout: 30000 });
    } catch (error) {
      const boot = await page.evaluate(() => ({ banner: document.querySelector('#candidate-runtime-banner')?.textContent,
        main: document.querySelector('#main-content')?.innerText, body: document.body?.innerText.slice(0, 1000) }));
      throw new Error(`Bootstrap candidato no quedó listo: ${JSON.stringify(boot)}; pageErrors=${runtimeErrors.join(' | ')}`);
    }

    const outcome = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { DemoRuntimeService, DEMO_EXPECTED_COUNTS, DEMO_IDS } = await import('/app/js/services/demo-runtime-service.js');
      const { RUNTIME_TARGETS, assertRuntimeWriteTarget } = await import('/app/js/services/runtime-target-service.js');
      const { readV2Snapshot, SchemaV2BackupLabService } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const { V2CandidateStorageService } = await import('/app/js/v2-candidate/candidate-services.js');
      const { MvpAdminService, evaluateRosterCapacity } = await import('/app/js/services/mvp-admin-service.js');
      const { MvpPdfService } = await import('/app/js/services/mvp-pdf-service.js');
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { DocumentValidationService } = await import('/app/js/services/document-validation-service.js');
      const { AttendanceV2Repository } = await import('/app/js/repositories/attendance-v2-repository.js');
      const { AttendanceSessionService } = await import('/app/js/services/attendance-session-service.js');
      const { AttendanceSummaryService } = await import('/app/js/services/attendance-summary-service.js');
      const { AttendanceDocumentContextService } = await import('/app/js/services/attendance-document-context-service.js');

      const count = (db, store) => new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).count();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const realCounts = async db => Object.fromEntries(await Promise.all([
        'estudiantes', 'matriculas', 'staging_importaciones', 'grupos_academicos', 'programas', 'modulos', 'periodos', 'unidades', 'asistencia'
      ].map(async store => [store, await count(db, store)])));
      const toBase64 = async blob => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        return btoa(binary);
      };

      if (DemoRuntimeService.isActive()) await DemoRuntimeService.exit();
      await new Promise(r => setTimeout(r, 200));
      const candidateDb = getDB();
      const candidateBeforeHash = await V2CandidateStorageService.semanticHash(candidateDb);
      const candidateBeforeCounts = await realCounts(candidateDb);
      const state = await DemoRuntimeService.enter({ reset: true });
      const demoDb = getDB();
      const initialSnapshot = await readV2Snapshot(demoDb);
      const initialFingerprint = state.fingerprint;

      let targetViolation = null;
      try { assertRuntimeWriteTarget(candidateDb, RUNTIME_TARGETS.DEMO); } catch (error) { targetViolation = error.code; }

      const admin = new MvpAdminService();
      const groups = await admin.listGroupSummaries();
      const contextA = await admin.buildGroupRoster(DEMO_IDS.groupA);
      const contextB = await admin.buildGroupRoster(DEMO_IDS.groupB);
      const engine = new PdfTemplateEngine();
      const rowPayload = context => ({ institution: context.institution, program: context.program,
        studentsList: context.rows.map(row => ({ apellidosNombres: row.studentName, sexo: row.sex, fechaNacimiento: row.birthDate })),
        administrativeDraft: true, demoMode: true });
      const tmpl01B = await engine.renderTMPL01(rowPayload(contextB));
      let capacityCode = null;
      try { await engine.renderTMPL01(rowPayload(contextA)); } catch (error) { capacityCode = error.code; }
      const mvpPdf = new MvpPdfService();
      const completeA = await mvpPdf.renderAdministrativeRoster(contextA);
      const registerB = await mvpPdf.renderAdministrativeEnrollmentRegister(contextB);
      const registerCsv = mvpPdf.buildEnrollmentRegisterCsv(contextB);

      const enrollmentId = contextB.rows[0].enrollmentId;
      const documentContext = await new DocumentDataService().buildEnrollmentContext(enrollmentId);
      const documentPreflight = new DocumentValidationService().validateDocument('TMPL-02', documentContext);
      const tmpl02 = documentPreflight.canPreview
        ? await engine.renderTMPL02({ ...documentContext, resolvedFieldSet: documentPreflight.resolvedFieldSet, demoMode: true })
        : null;

      const repository = new AttendanceV2Repository(() => getDB());
      const summaryService = new AttendanceSummaryService();
      const sessionService = new AttendanceSessionService({ repository, summaryService });
      const attendanceContext = await repository.loadDocumentContext({ groupId: DEMO_IDS.groupA,
        periodoId: DEMO_IDS.period, unidadId: DEMO_IDS.unitA1 });
      const enrollmentIds = attendanceContext.enrollments.map(item => item.id);
      const draft = await sessionService.loadSession(DEMO_IDS.session1, enrollmentIds);
      const attendanceBefore = summaryService.summarize({ sessions: [draft.session], marks: draft.marks });
      const changed = draft.marks.map(mark => ({ ...mark }));
      const presentIndex = changed.findIndex(mark => mark.estadoRegistro === 'PRESENTE');
      changed[presentIndex].estadoRegistro = 'AUSENTE';
      changed[presentIndex].observacion = 'CAMBIO DEMO';
      const saved = await sessionService.saveDraft({ ...draft, marks: changed, dirty: true }, { operator: 'SISTEMA_DEMO' });
      const reloaded = await sessionService.loadSession(DEMO_IDS.session1, enrollmentIds);
      const attendanceAfter = summaryService.summarize({ sessions: [reloaded.session], marks: reloaded.marks });
      const attendanceDocument = await new AttendanceDocumentContextService({ repository, summaryService })
        .buildAttendanceDocumentContext({ groupId: DEMO_IDS.groupA, periodoId: DEMO_IDS.period, unidadId: DEMO_IDS.unitA1, testOnly: true });
      const studentMap = new Map(attendanceContext.students.map(student => [student.id, student]));
      const enrollmentMap = new Map(attendanceContext.enrollments.map(enrollment => [enrollment.id, enrollment]));
      const markMap = new Map(reloaded.marks.map(mark => [mark.matriculaId, mark]));
      const attendanceReport = await mvpPdf.renderAdministrativeAttendanceReport({
        program: attendanceContext.program, group: { visibleCode: attendanceContext.group.codigoVisible },
        rows: attendanceContext.enrollments.map(enrollment => {
          const student = studentMap.get(enrollment.estudianteId); const mark = markMap.get(enrollment.id);
          return { studentName: student.nombresCompletoOriginal, document: student.numeroDocumento,
            state: mark.estadoRegistro, observation: mark.observacion || '' };
        })
      });

      const demoBackup = await SchemaV2BackupLabService.exportBackup(demoDb, 'DEMO_OPERATIONAL_MODE_09');
      const demoBackupInfo = await SchemaV2BackupLabService.inspectBackup(demoBackup);
      let mismatchCode = null; let preBackupCalled = false;
      try {
        await V2CandidateStorageService.restoreBackup(demoBackup, candidateDb, { confirmed: true,
          beforeWrite: async () => { preBackupCalled = true; return true; } });
      } catch (error) { mismatchCode = error.code; }
      const candidateAfterRejectedRestore = await V2CandidateStorageService.semanticHash(candidateDb);

      const resetState = await DemoRuntimeService.reset({ stayInDemo: true });
      const resetSnapshot = await readV2Snapshot(getDB());
      const resetSession = resetSnapshot.asistencia.find(row => row.id === DEMO_IDS.session1);
      await DemoRuntimeService.exit();
      const candidateAfterHash = await V2CandidateStorageService.semanticHash(getDB());
      const candidateAfterCounts = await realCounts(getDB());
      await DemoRuntimeService.enter({ reset: false });

      const allSeededRecords = Object.values(initialSnapshot).flat().filter(record => record && typeof record === 'object');
      const explicitDemoRecords = allSeededRecords.filter(record => record.demo === true && record.official === false);
      return {
        state, expectedCounts: DEMO_EXPECTED_COUNTS, initialFingerprint,
        schema: { name: demoDb.name, version: demoDb.version, stores: demoDb.objectStoreNames.length },
        candidateBeforeHash, candidateBeforeCounts, candidateAfterHash, candidateAfterCounts, candidateAfterRejectedRestore,
        targetViolation, groupCounts: Object.fromEntries(groups.map(group => [group.id, group.enrollmentCount])),
        groupA: { rows: contextA.rows.length, capacity: evaluateRosterCapacity(contextA.rows.length), reportSize: completeA.size },
        groupB: { rows: contextB.rows.length, capacity: evaluateRosterCapacity(contextB.rows.length), tmplSize: tmpl01B.size,
          registerSize: registerB.size, csvRows: registerCsv.replace(/^\uFEFF/, '').split('\r\n').length,
          csvMarked: registerCsv.includes('DEMOSTRACIÓN — NO OFICIAL') },
        capacityCode, document: { canPreview: documentPreflight.canPreview, official: documentPreflight.canOfficiallyIssue,
          size: tmpl02?.size || 0 },
        academic: { periods: initialSnapshot.periodos.length, units: initialSnapshot.unidades.length,
          indicators: initialSnapshot.indicadores.length,
          assignedGroups: initialSnapshot.grupos_academicos.filter(group => group.moduloId && group.periodoId).length,
          catalog: [initialSnapshot.programas.length, initialSnapshot.modulos.length],
          provenance: [...initialSnapshot.periodos, ...initialSnapshot.unidades].every(row => row.sourceType === 'DEMO_SYNTHETIC' && row.demo === true && row.official === false) },
        records: { total: allSeededRecords.length, explicit: explicitDemoRecords.length,
          noRealDocuments: initialSnapshot.estudiantes.every(student => /^DEMO\d{4}$/.test(student.numeroDocumento)),
          labels: allSeededRecords.filter(row => row.demo === true).every(row => JSON.stringify(row).includes('DEMO') || row.sourceType === 'DEMO_SYNTHETIC') },
        attendance: { before: attendanceBefore, after: attendanceAfter, savedVersion: saved.session.version,
          reloadedVersion: reloaded.session.version, document: { templateId: attendanceDocument.templateId,
            rows: attendanceDocument.rows.length, sessions: attendanceDocument.sessions.length,
            percentage: attendanceDocument.officialAbsencePercentage } },
        backup: demoBackupInfo, mismatchCode, preBackupCalled,
        reset: { fingerprint: resetState.fingerprint, counts: resetState.counts, sessionVersion: resetSession.version,
          auditCount: resetSnapshot.auditoria.length },
        pdfs: { tmpl01: await toBase64(tmpl01B), complete: await toBase64(completeA),
          tmpl02: tmpl02 ? await toBase64(tmpl02) : '', attendance: await toBase64(attendanceReport) }
      };
    });

    const expectedReal = { estudiantes: 269, matriculas: 295, staging_importaciones: 295, grupos_academicos: 12,
      programas: 7, modulos: 14, periodos: 0, unidades: 0, asistencia: 0 };
    check('T-DEMO09-17-REAL-BEFORE', JSON.stringify(outcome.candidateBeforeCounts) === JSON.stringify(expectedReal), 'snapshot candidata real exacto');
    check('T-DEMO09-18-SCHEMA', outcome.schema.name === 'CETPRO_V2_DEMO' && outcome.schema.version === 2 && outcome.schema.stores === 18, 'CETPRO_V2_DEMO schema 2 / 18 stores');
    check('T-DEMO09-19-COUNTS', Object.entries(outcome.expectedCounts).every(([key, value]) => outcome.state.counts[key] === value), JSON.stringify(outcome.state.counts));
    check('T-DEMO09-20-DATASET', outcome.state.datasetVersion === 'DEMO_DATASET_V1' && outcome.state.target === 'DEMO', 'DEMO_DATASET_V1 activo');
    check('T-DEMO09-21-SYNTHETIC', outcome.records.noRealDocuments && outcome.records.explicit === outcome.records.total, `${outcome.records.explicit}/${outcome.records.total} registros marcados demo/no oficial`);
    check('T-DEMO09-22-CATALOG', outcome.academic.catalog.join('/') === '7/14', '7 programas / 14 módulos');
    check('T-DEMO09-23-ACADEMIC-DATA', outcome.academic.periods === 1 && outcome.academic.units === 12 && outcome.academic.indicators === 60 && outcome.academic.assignedGroups === 2, 'periodo, módulos, unidades e indicadores DEMO');
    check('T-DEMO09-24-PROVENANCE', outcome.academic.provenance, 'procedencia DEMO_SYNTHETIC explícita');
    check('T-DEMO09-25-GROUPS', outcome.groupCounts['GAC-DEMO-A'] === 40 && outcome.groupCounts['GAC-DEMO-B'] === 25, 'Grupo A=40, Grupo B=25');
    check('T-DEMO09-26-TARGET-VIOLATION', outcome.targetViolation === 'DEMO_TARGET_VIOLATION', 'DEMO no puede escribir candidata');
    check('T-DEMO09-27-TMPL01-B', outcome.groupB.rows === 25 && outcome.groupB.tmplSize > 1000 && outcome.groupB.capacity.code !== 'CAPACITY_EXCEEDED', 'TMPL-01 Grupo B generado');
    check('T-DEMO09-28-TMPL01-A', outcome.groupA.rows === 40 && outcome.capacityCode === 'CAPACITY_EXCEEDED' && outcome.groupA.reportSize > 1000, 'Grupo A bloqueado y reporte completo disponible');
    check('T-DEMO09-29-TMPL03-ALTERNATIVE', outcome.groupB.registerSize > 1000 && outcome.groupB.csvRows === 27 && outcome.groupB.csvMarked, 'registro administrativo PDF/CSV DEMO');
    check('T-DEMO09-30-TMPL02', outcome.document.canPreview && !outcome.document.official && outcome.document.size > 1000, 'TMPL-02 DEMO disponible, emisión oficial bloqueada');
    check('T-DEMO09-31-ATTENDANCE-SAVE', outcome.attendance.savedVersion === 2 && outcome.attendance.reloadedVersion === 2 && outcome.attendance.after.absentCount === outcome.attendance.before.absentCount + 1, 'editar, guardar y recargar asistencia');
    check('T-DEMO09-32-ATTENDANCE-COUNTS', outcome.attendance.after.presentCount === outcome.attendance.before.presentCount - 1 && outcome.attendance.after.markedCount === outcome.attendance.before.markedCount, 'conteos técnicos coherentes');
    check('T-DEMO09-33-TMPL05-CONTEXT', outcome.attendance.document.templateId === 'TMPL-05' && outcome.attendance.document.rows === 40 && outcome.attendance.document.sessions === 5, 'contexto TMPL-05 por grupo/unidad/periodo');
    check('T-DEMO09-34-B003', outcome.attendance.document.percentage.status === 'BLOCKED_BY_POLICY' && outcome.attendance.document.percentage.value === null, 'sin porcentaje oficial inventado');
    check('T-DEMO09-35-BACKUP', outcome.backup.valid && outcome.backup.environment === 'DEMO' && outcome.backup.official === false && outcome.backup.datasetVersion === 'DEMO_DATASET_V1', 'backup DEMO identificado');
    check('T-DEMO09-36-MISMATCH', outcome.mismatchCode === 'BACKUP_ENVIRONMENT_MISMATCH' && !outcome.preBackupCalled && outcome.candidateAfterRejectedRestore === outcome.candidateBeforeHash, 'restore DEMO→REAL rechazado antes de escribir');
    check('T-DEMO09-37-RESET', outcome.reset.fingerprint === outcome.initialFingerprint && outcome.reset.sessionVersion === 1 && outcome.reset.auditCount === 1, 'reset determinista completo');
    check('T-DEMO09-38-REAL-AFTER', outcome.candidateAfterHash === outcome.candidateBeforeHash && JSON.stringify(outcome.candidateAfterCounts) === JSON.stringify(expectedReal), 'candidata real idéntica antes/después');

    for (const [key, label] of [['tmpl01', 'TMPL-01'], ['complete', 'reporte completo'], ['tmpl02', 'TMPL-02'], ['attendance', 'reporte asistencia']]) {
      const text = normalize(await pdfText(outcome.pdfs[key]));
      check(`T-DEMO09-${({ tmpl01: 39, complete: 40, tmpl02: 41, attendance: 42 })[key]}-WATERMARK`, text.includes('DEMOSTRACION') && text.includes('NO OFICIAL'), `${label} marcado`);
    }

    const routes = [
      ['#/demo', 'Modo Demostración'], ['#/estudiantes', 'Estudiantes'], ['#/matriculas', 'Matrículas'],
      ['#/nominas?groupId=GAC-DEMO-B', 'Nóminas'], ['#/registros/matricula?groupId=GAC-DEMO-B', 'Registro de matrícula'],
      ['#/documentos', 'Documental Institucional'], ['#/registro', 'Asistencia DEMO'],
      ['#/demo/evaluacion', 'Evaluación — Vista demostrativa'], ['#/respaldo', 'Respaldo y Restauración']
    ];
    const routeStates = [];
    for (const [route, marker] of routes) {
      console.log('Testing route:', route);
      await page.evaluate(value => { location.hash = value; }, route);
      await page.waitForFunction(expected => document.querySelector('#main-content')?.innerText.includes(expected), {}, marker);
      routeStates.push(await page.evaluate(() => ({
        barrier: document.querySelector('#demo-runtime-bar') && getComputedStyle(document.querySelector('#demo-runtime-bar')).display !== 'none',
        label: document.querySelector('#candidate-runtime-banner')?.textContent,
        body: document.querySelector('#main-content')?.innerText || ''
      })));
    }
    check('T-DEMO09-43-GUIDED-ROUTES', routeStates.length === routes.length && routeStates.every(state => state.body.length > 20), `${routeStates.length} rutas demo operativas`);
    check('T-DEMO09-44-PERSISTENT-BARRIER', routeStates.every(state => state.barrier && state.label.includes('MODO DEMOSTRACIÓN')), 'barrera visible en todo el recorrido');
    check('T-DEMO09-45-OFFLINE', external.length === 0, '0 recursos externos');
    check('T-DEMO09-46-RUNTIME-ERRORS', runtimeErrors.length === 0, `${runtimeErrors.length} errores de página`);

    const finish = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { DemoRuntimeService } = await import('/app/js/services/demo-runtime-service.js');
      const exited = await DemoRuntimeService.exit();
      const destroyed = await DemoRuntimeService.destroy();
      const databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
      return { exited, destroyed, active: getDB().name, demoExists: databases.some(item => item.name === 'CETPRO_V2_DEMO') };
    });
    check('T-DEMO09-47-EXIT', finish.exited.target === 'REAL' && finish.active === 'CETPRO_V2_CANDIDATE', 'salida vuelve a candidata real');
    check('T-DEMO09-48-DELETE', finish.destroyed.deleted && !finish.demoExists, 'DB demo eliminable y recreable');
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  return { total: results.length, passed: results.filter(row => row.passed).length, failed: results.filter(row => !row.passed).length };
}

module.exports = { name: 'DEMO_OPERATIONAL_MODE_09', run };

if (require.main === module) run().then(result => {
  console.log(`DEMO_OPERATIONAL_MODE_09 ${result.passed}/${result.total}, failed=${result.failed}`);
  process.exit(result.failed ? 1 : 0);
}).catch(error => { console.error(error); process.exit(1); });



