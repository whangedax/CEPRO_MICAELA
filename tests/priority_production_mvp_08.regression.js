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

async function run() {
  const results = [];
  const check = (id, passed, detail = '') => {
    const row = { id, passed: Boolean(passed), detail };
    results.push(row);
    console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${id}: ${detail}`);
  };

  const config = read('app/js/config.js');
  const candidateHtml = read('app-v2/index.html');
  const pdfEngine = read('app/js/services/pdf-template-engine.js');
  const paginationPolicy = read('app/js/services/document-pagination-policy.js');
  const mvpService = read('app/js/services/mvp-admin-service.js');
  const registerManifest = JSON.parse(read('app/data/pdf-manifests/TMPL-03.json'));
  check('T-MVP08-01-ROUTES', ['#/nominas', '#/registros/matricula', '#/configuracion-academica'].every(route => config.includes(`'${route}'`)), 'rutas operativas registradas');
  check('T-MVP08-02-NAV', candidateHtml.includes('OPERACIÓN DIARIA') && candidateHtml.includes('NÓMINAS') && candidateHtml.includes('REGISTROS') && !/tools\/|TEST_DB|QA/i.test(candidateHtml), 'menú normal sin herramientas de prueba');
  check('T-MVP08-03-V1-GUARD', /VERSION:\s*runtime\?\.dbVersion\s*\|\|\s*1/.test(config) && /NAME:\s*runtime\?\.dbName\s*\|\|\s*'CETPRO_DB'/.test(config), 'producción permanece CETPRO_DB v1');
  check('T-MVP08-04-NO-SCHEMA3', !read('app/js/db/schema-v2-design.js').includes('version: 3'), 'sin cambio de schema');
  check('T-MVP08-05-TMPL01-CAPACITY', pdfEngine.includes("DocumentPaginationPolicy.plan('TMPL-01', rowCount, { mode: 'CANONICAL' })") &&
    paginationPolicy.includes('canonicalCapacity: 30') && paginationPolicy.includes("'CAPACITY_EXCEEDED'"),
  'TMPL-01 canónica conserva capacidad física 30 fail-closed');
  check('T-MVP08-06-WATERMARK', pdfEngine.includes('BORRADOR ADMINISTRATIVO — DATOS ACADÉMICOS PENDIENTES'), 'marca generada, no canónico modificado');
  check('T-MVP08-07-SEX', pdfEngine.includes("student.sexo === 'H'") && pdfEngine.includes("student.sexo === 'M'"), 'semántica H/M corregida');
  check('T-MVP08-08-NO-TECH-CODE', mvpService.includes("officialEnrollmentCode: text(enrollment.codigoOficialMatricula)") && !pdfEngine.includes("student.enrollmentId"), 'ID técnico no se eleva a código oficial');
  check('T-MVP08-09-TMPL03-CLOSED', registerManifest.previewStatus === 'REVIEW_REQUIRED' && registerManifest.fields.length === 0, 'TMPL-03 conserva geometría dudosa sin pintar');
  check('T-MVP08-10-PROVENANCE', ['sourceType', 'sourceDescription', 'confirmedBy', 'confirmedAt'].every(field => mvpService.includes(field)) && mvpService.includes('SOURCE_CONFIRMATION_TEXT'), 'guardados académicos exigen procedencia');
  check('T-MVP08-11-WRITE-ALLOWLIST', mvpService.includes("candidate: 'CETPRO_V2_CANDIDATE'") && mvpService.includes("laboratoryPrefix: 'CETPRO_V2_MVP_LAB_'") && mvpService.includes("db.name === 'CETPRO_DB'"), 'writes restringidos y producción protegida');
  check('T-MVP08-12-DOCS', ['docs/INFORMACION_QUE_DEBE_CONFIRMAR_JEFATURA.md', 'docs/MVP_DEMO_CHECKLIST.md', 'docs/PRODUCTION_MIGRATION_V1_TO_V2.md', 'docs/MVP_OFFLINE_PORTABILITY_AUDIT.md'].every(file => fs.existsSync(path.join(ROOT, file))), 'documentación operativa presente');

  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(name => name.endsWith('.json'));
  const pdfDir = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES');
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const pdfPath = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(pdfPath) && crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex') === manifest.sha256) hashMatches += 1;
  }
  check('T-MVP08-13-PDF-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 PDF canónicos intactos`);
  const appJs = fs.readdirSync(path.join(ROOT, 'app/js'), { recursive: true }).filter(name => String(name).endsWith('.js'));
  const unsafe = appJs.filter(name => /\beval\s*\(|\bnew\s+Function\s*\(/.test(read(`app/js/${String(name).replace(/\\/g, '/')}`)));
  check('T-MVP08-14-NO-DYNAMIC-CODE', unsafe.length === 0, '0 eval / 0 Function');

  let server;
  if (!await up()) { server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true }); await waitServer(); }
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage();
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#candidate-runtime-banner')?.textContent === 'OPERACIÓN LOCAL' && document.querySelector('h2')?.textContent.includes('Inicio'), { timeout: 30000 });
    const shell = await page.evaluate(() => ({ text: document.body.innerText, nav: [...document.querySelectorAll('.nav-link')].map(node => node.getAttribute('href')) }));
    check('T-MVP08-15-SHELL', ['#/nominas', '#/registros/matricula', '#/configuracion-academica', '#/respaldo'].every(route => shell.nav.includes(route)), 'flujo administrativo visible');
    check('T-MVP08-16-HIDE-TECH', !/schema 2|18 stores|TEST_DB|CANDIDATE|LAB|B-002|B-004|B-007/i.test(shell.text), 'shell operativo sin lenguaje técnico');
    check('T-MVP08-17-DASHBOARD', ['269', '295', '12', '7', '14'].every(value => shell.text.includes(value)), 'tablero muestra conteos reales');

    const real = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { MvpAdminService, evaluateRosterCapacity } = await import('/app/js/services/mvp-admin-service.js');
      const { MvpPdfService } = await import('/app/js/services/mvp-pdf-service.js');
      const { V2CandidateStorageService } = await import('/app/js/v2-candidate/candidate-services.js');
      const db = getDB();
      const count = store => new Promise((resolve, reject) => { const req = db.transaction(store, 'readonly').objectStore(store).count(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
      const beforeHash = await V2CandidateStorageService.semanticHash(db);
      const counts = Object.fromEntries(await Promise.all(['estudiantes', 'matriculas', 'grupos_academicos', 'programas', 'modulos', 'periodos', 'unidades'].map(async store => [store, await count(store)])));
      const service = new MvpAdminService();
      const groups = await service.listGroupSummaries();
      const large = groups.filter(group => group.enrollmentCount > 30).sort((a, b) => b.enrollmentCount - a.enrollmentCount)[0];
      const first = await service.buildGroupRoster(large.id);
      const second = await service.buildGroupRoster(large.id);
      const capacity = evaluateRosterCapacity(first.rows.length);
      const pdf = new MvpPdfService();
      const complete = await pdf.renderAdministrativeRoster(first);
      const register = await pdf.renderAdministrativeEnrollmentRegister(first);
      const csv = pdf.buildEnrollmentRegisterCsv(first);
      const afterHash = await V2CandidateStorageService.semanticHash(db);
      return { counts, groupCount: groups.length, rowCount: first.rows.length,
        stable: JSON.stringify(first.source.enrollmentIds) === JSON.stringify(second.source.enrollmentIds),
        unique: new Set(first.source.enrollmentIds).size === first.rows.length,
        allStudents: first.rows.every(row => row.studentId), groupIdAuthoritative: first.source.authority === 'groupId',
        noOfficialTechnicalCode: first.rows.every(row => !row.officialEnrollmentCode),
        capacity, completePdf: complete.size, registerPdf: register.size,
        csvRows: csv.split('\r\n').length, pendingModule: !first.module?.id, pendingPeriod: !first.period?.id,
        unchanged: beforeHash === afterHash };
    });
    check('T-MVP08-18-REAL-COUNTS', JSON.stringify(real.counts) === JSON.stringify({ estudiantes: 269, matriculas: 295, grupos_academicos: 12, programas: 7, modulos: 14, periodos: 0, unidades: 0 }), JSON.stringify(real.counts));
    check('T-MVP08-19-REAL-GROUP', real.groupIdAuthoritative && real.stable && real.unique && real.allStudents && real.rowCount > 30, `${real.rowCount} matrículas, orden estable, sin duplicación`);
    check('T-MVP08-20-REAL-CAPACITY', real.capacity.code === 'CAPACITY_EXCEEDED' && real.capacity.capacity === 30, 'grupo real >30 bloquea TMPL-01');
    check('T-MVP08-21-COMPLETE-REPORT', real.completePdf > 1000, 'listado completo interno PDF');
    check('T-MVP08-22-REAL-REGISTER', real.registerPdf > 1000 && real.csvRows === real.rowCount + 1 && real.pendingModule && real.pendingPeriod, 'registro real conserva pendientes');
    check('T-MVP08-23-NO-OFFICIAL-CODE', real.noOfficialTechnicalCode, 'ningún MAT-* se usa como código oficial');
    check('T-MVP08-24-READONLY-CANDIDATE', real.unchanged, 'prueba real no escribió candidata');

    for (const [route, heading] of [['#/nominas', 'Nóminas'], ['#/registros/matricula', 'Registro de matrícula'], ['#/grupos', 'Grupos académicos'], ['#/matriculas', 'Matrículas'], ['#/configuracion-academica', 'Configuración académica'], ['#/respaldo', 'Respaldo y Restauración']]) {
      await page.evaluate(value => { location.hash = value; }, route);
      await page.waitForFunction(expected => document.querySelector('h2')?.textContent.includes(expected), {}, heading);
    }
    check('T-MVP08-25-NAVIGATION', runtimeErrors.length === 0, 'rutas operativas sin error de ejecución');
    check('T-MVP08-26-BACKUP-UX', await page.$eval('#main-content', node => node.innerText.includes('checksum SHA-256') && node.innerText.includes('prebackup') && node.innerText.includes('lectura posterior')), 'backup/restore seguro visible');

    const synthetic = await page.evaluate(async () => {
      const { SchemaV2BackupLabService } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const { getDB, setDBInstance } = await import('/app/js/db/database.js');
      const { StudentService } = await import('/app/js/services/student-service.js');
      const { MvpAdminService, SOURCE_CONFIRMATION_TEXT, evaluateRosterCapacity } = await import('/app/js/services/mvp-admin-service.js');
      const { MvpPdfService } = await import('/app/js/services/mvp-pdf-service.js');
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const candidateDb = getDB();
      const name = `CETPRO_V2_MVP_LAB_${Date.now()}`;
      const lab = await SchemaV2BackupLabService.createEmptyDatabase(name);
      const txDone = (stores, work) => new Promise((resolve, reject) => { const tx = lab.transaction(stores, 'readwrite'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = tx.onerror; work(tx); });
      await txDone(['institucion', 'programas', 'modulos'], tx => {
        tx.objectStore('institucion').put({ id: 'INST-LAB', nombre: 'CETPRO SINTÉTICO', ugel: 'UGEL 01', tipoGestion: 'PÚBLICA' });
        tx.objectStore('programas').put({ id: 'PRO-LAB', nombre: 'PROGRAMA SINTÉTICO', codigo: 'PS', estado: 'ACTIVO' });
        tx.objectStore('modulos').put({ id: 'MOD-LAB-1', programaId: 'PRO-LAB', nombre: 'MÓDULO SINTÉTICO I', nombreOficial: 'MÓDULO SINTÉTICO I', numeroModulo: 1, codigo: 'ML1', estado: 'ACTIVO' });
      });
      setDBInstance(lab);
      const first = await StudentService.createStudent({ tipoDocumento: 'DNI', numeroDocumento: '1234567', apellidoPaterno: 'NUÑEZ', apellidoMaterno: "D'ÁVILA", nombres: 'ÁNGELA', sexo: 'M' }, 'QA_SINTETICO');
      await StudentService.updateStudent({ ...first, telefono: '999000111' }, 'QA_SINTETICO');
      const found = await StudentService.searchStudents('NUNEZ');
      await StudentService.deactivateStudent(first.id, 'QA_SINTETICO');
      const active = await StudentService.createStudent({ tipoDocumento: 'CE', numeroDocumento: 'AB12C34', apellidoPaterno: 'SINTÉTICO', apellidoMaterno: 'PRUEBA', nombres: 'UNO', sexo: 'H' }, 'QA_SINTETICO');
      setDBInstance(candidateDb);
      const service = new MvpAdminService(() => lab);
      const source = { sourceType: 'PLAN_OFICIAL', sourceDescription: 'FUENTE SINTÉTICA AUTORIZADA', confirmedBy: 'RESPONSABLE SINTÉTICO', sourceConfirmed: true, confirmationText: SOURCE_CONFIRMATION_TEXT };
      let sourceRejected = false;
      try { await service.createConfirmedPeriod({ nombre: 'SIN FUENTE', anio: 2026, fechaInicio: '2026-01-01', fechaFin: '2026-02-01' }); } catch { sourceRejected = true; }
      const enrollmentResult = await service.createEnrollment({ estudianteId: active.id, programaId: 'PRO-LAB', futureGroup: { codigoVisible: 'GRUPO SINTÉTICO', turno: 'MAÑANA', modalidad: 'PRESENCIAL', seccion: 'A' }, ...source });
      const period = await service.createConfirmedPeriod({ nombre: 'PERIODO SINTÉTICO', anio: 2026, fechaInicio: '2026-03-01', fechaFin: '2026-07-31', estado: 'ACTIVO', ...source });
      const periodAssignment = await service.assignConfirmedPeriod({ groupId: enrollmentResult.group.id, periodoId: period.id, ...source });
      const moduleAssignment = await service.assignConfirmedModule({ groupId: enrollmentResult.group.id, moduloId: 'MOD-LAB-1', ...source });
      const unit = await service.createConfirmedUnit({ programaId: 'PRO-LAB', moduloId: 'MOD-LAB-1', orden: 1, nombre: 'UNIDAD SINTÉTICA', capacidad: 30, horas: 80, creditos: 4, indicadores: ['INDICADOR SINTÉTICO 1'], ...source });
      const context = await service.buildGroupRoster(enrollmentResult.group.id);
      const engine = new PdfTemplateEngine();
      const mkStudents = count => Array.from({ length: count }, (_, index) => ({ apellidosNombres: `SINTÉTICO ${String(index + 1).padStart(2, '0')}`, sexo: index % 2 ? 'M' : 'H', fechaNacimiento: '2000-01-01' }));
      const pdf0 = await engine.renderTMPL01({ institution: context.institution, program: context.program, studentsList: [], administrativeDraft: true });
      const pdf1 = await engine.renderTMPL01({ institution: context.institution, program: context.program, studentsList: mkStudents(1), administrativeDraft: true });
      const pdf30 = await engine.renderTMPL01({ institution: context.institution, program: context.program, studentsList: mkStudents(30), administrativeDraft: true });
      let rejected31 = false;
      try { await engine.renderTMPL01({ institution: context.institution, program: context.program, studentsList: mkStudents(31), administrativeDraft: true }); } catch (error) { rejected31 = error.code === 'CAPACITY_EXCEEDED'; }
      const reportContext = { ...context, rows: Array.from({ length: 31 }, (_, index) => ({ studentName: `SINTÉTICO ÑÁ ${index + 1}`, document: `D${index + 1}`, sex: index % 2 ? 'M' : 'H', birthDate: '', enrollmentStatus: 'ACTIVA' })) };
      const pdf = new MvpPdfService();
      const complete = await pdf.renderAdministrativeRoster(reportContext);
      const register = await pdf.renderAdministrativeEnrollmentRegister(context);
      const csv = pdf.buildEnrollmentRegisterCsv(context);
      const backup = await SchemaV2BackupLabService.exportBackup(lab, 'PRIORITY_PRODUCTION_MVP_08');
      const backupInfo = await SchemaV2BackupLabService.inspectBackup(backup);
      const capacity = [0, 1, 30, 31].map(evaluateRosterCapacity);
      const result = { sourceRejected, studentCreated: first.numeroDocumento === '1234567', alphaDocument: active.numeroDocumento === 'AB12C34', studentFound: found.some(item => item.id === first.id),
        groupOpaque: enrollmentResult.group.id.startsWith('GAC-') && enrollmentResult.group.id !== enrollmentResult.group.codigoVisible,
        enrollmentPending: enrollmentResult.enrollment.estado === 'CONFIGURACION_ACADEMICA_PENDIENTE',
        periodAssigned: periodAssignment.group.periodoId === period.id, moduleAssigned: moduleAssignment.group.moduloId === 'MOD-LAB-1',
        provenance: [period, periodAssignment.provenance, moduleAssignment.provenance, unit.unit].every(item => item.sourceType && item.sourceDescription && item.confirmedBy && item.confirmedAt),
        rosterRows: context.rows.length, pdfs: [pdf0.size, pdf1.size, pdf30.size], rejected31,
        capacity, completeSize: complete.size, registerSize: register.size, csvRows: csv.split('\r\n').length,
        backupValid: backupInfo.valid && backupInfo.schemaVersion === 2 && backupInfo.referentialIssues === 0 };
      lab.close();
      await new Promise(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = resolve; request.onerror = resolve; request.onblocked = resolve; });
      return result;
    });
    check('T-MVP08-27-STUDENTS', synthetic.studentCreated && synthetic.alphaDocument && synthetic.studentFound, 'crear/buscar/editar/desactivar en laboratorio; documentos de texto');
    check('T-MVP08-28-ENROLLMENT-GROUP', synthetic.groupOpaque && synthetic.enrollmentPending && synthetic.rosterRows === 1, 'grupo opaco y matrícula administrativa funcional');
    check('T-MVP08-29-PERIOD-MODULE', synthetic.periodAssigned && synthetic.moduleAssigned, 'periodo y módulo confirmados manualmente');
    check('T-MVP08-30-SOURCE-GUARD', synthetic.sourceRejected && synthetic.provenance, 'procedencia obligatoria y persistida');
    check('T-MVP08-31-CAPACITY-MATRIX', synthetic.capacity.map(item => item.code).join(',') === 'PREVIEW_ADMINISTRATIVE,PREVIEW_ADMINISTRATIVE,PREVIEW_ADMINISTRATIVE,CAPACITY_EXCEEDED' && synthetic.rejected31, '0/1/30 permitidos; 31 bloqueado');
    check('T-MVP08-32-TMPL01-PDFS', synthetic.pdfs.every(size => size > 1000), 'TMPL-01 administrativo 0/1/30');
    check('T-MVP08-33-INTERNAL-REPORT', synthetic.completeSize > 1000, '31 filas completas en reporte interno separado');
    check('T-MVP08-34-ADMIN-REGISTER', synthetic.registerSize > 1000 && synthetic.csvRows === 2, 'registro administrativo PDF/CSV');
    check('T-MVP08-35-BACKUP', synthetic.backupValid, 'export/checksum/readback lógico de backup laboratorio');
    const finalState = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { V2CandidateStorageService } = await import('/app/js/v2-candidate/candidate-services.js');
      const db = getDB();
      return { name: db.name, version: db.version, hash: await V2CandidateStorageService.semanticHash(db), external: performance.getEntriesByType('resource').filter(item => new URL(item.name).hostname !== '127.0.0.1').length };
    });
    check('T-MVP08-36-CANDIDATE-INTACT', finalState.name === 'CETPRO_V2_CANDIDATE' && finalState.version === 2 && finalState.hash.length === 64, 'conexión candidata restaurada tras laboratorio');
    check('T-MVP08-37-OFFLINE', finalState.external === 0, '0 recursos externos');
    check('T-MVP08-38-XSS', [read('app/js/ui/nominas-view.js'), read('app/js/ui/enrollment-register-view.js'), read('app/js/ui/candidate-enrollments-view.js'), read('app/js/ui/group-assignment-view.js')].every(source => source.includes('escapeHtml')), 'salidas de usuario escapadas');
    check('T-MVP08-39-NO-RUNTIME-ERRORS', runtimeErrors.length === 0, `${runtimeErrors.length} errores de página`);
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  return { total: results.length, passed: results.filter(row => row.passed).length, failed: results.filter(row => !row.passed).length };
}

module.exports = { name: 'PRIORITY_PRODUCTION_MVP_08', run };

if (require.main === module) run().then(result => {
  console.log(`PRIORITY_PRODUCTION_MVP_08 ${result.passed}/${result.total}, failed=${result.failed}`);
  process.exit(result.failed ? 1 : 0);
}).catch(error => { console.error(error); process.exit(1); });



