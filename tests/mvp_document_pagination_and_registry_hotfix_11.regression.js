const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').toUpperCase();
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
async function inspectPdf(base64) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(base64, 'base64')), disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    pages.push(normalize(content.items.map(item => item.str).join(' ')));
  }
  return { pageCount: pdf.numPages, pages, text: pages.join(' ') };
}
const orderedMatches = (text, expression) => [...text.matchAll(expression)].map(match => match[0]);

async function run() {
  const results = [];
  const check = (id, passed, detail = '') => {
    const row = { id, passed: Boolean(passed), detail };
    results.push(row);
    console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${id}: ${detail}`);
  };

  const policySource = read('app/js/services/document-pagination-policy.js');
  const engineSource = read('app/js/services/pdf-template-engine.js');
  const registerView = read('app/js/ui/enrollment-register-view.js');
  check('T-HOTFIX11-01-POLICY-TYPES', ['SINGLE_PAGE_FIXED', 'PAGINATE_BY_TEMPLATE_COPY',
    'FIXED_PAGE_COUNT', 'SINGLE_RECORD', 'BLOCK_ON_OVERFLOW'].every(type => policySource.includes(type)),
  'cinco tipos explícitos');
  check('T-HOTFIX11-02-RENDERER-PURE', !/getDB\(|IndexedDB|Repository/.test(engineSource) &&
    engineSource.includes("mode === 'ADMINISTRATIVE_MULTIPAGE'"), 'renderer sin acceso DB');
  check('T-HOTFIX11-03-REGISTRY-UX', registerView.includes('register-generation-status') &&
    registerView.indexOf('id="register-output"') < registerView.indexOf('<table class="table-info mvp-table"') &&
    registerView.includes('scrollIntoView'), 'estado y visor antes de tabla larga');

  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(file => file.endsWith('.json'));
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(canonical) && crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex') === manifest.sha256) hashMatches += 1;
  }
  check('T-HOTFIX11-04-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21`);

  let server;
  if (!await up()) { server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true }); await waitServer(); }
  const browser = await puppeteer.launch({ headless: true, executablePath: EDGE });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errors = [];
    const external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('request', request => {
      try {
        const url = new URL(request.url());
        if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1') external.push(request.url());
      } catch { /* blob/data */ }
    });
    await page.goto(`${BASE}#/demo`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#candidate-runtime-banner')?.textContent.includes('MODO DEMOSTRACIÓN'));
    check('T-HOTFIX11-05-EDGE', /Edg/i.test(await browser.version()), await browser.version());

    const baseline = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { DemoRuntimeService } = await import('/app/js/services/demo-runtime-service.js');
      const { V2CandidateStorageService } = await import('/app/js/v2-candidate/candidate-services.js');
      const stores = ['estudiantes', 'matriculas', 'grupos_academicos', 'periodos', 'unidades', 'asistencia'];
      const count = (db, store) => new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).count();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      await DemoRuntimeService.exit();
      const db = getDB();
      const result = { hash: await V2CandidateStorageService.semanticHash(db),
        counts: Object.fromEntries(await Promise.all(stores.map(async store => [store, await count(db, store)]))) };
      await DemoRuntimeService.enter({ reset: true });
      return result;
    });
    check('T-HOTFIX11-06-REAL-BASELINE', JSON.stringify(baseline.counts) === JSON.stringify({
      estudiantes: 269, matriculas: 295, grupos_academicos: 12, periodos: 0, unidades: 0, asistencia: 0
    }), JSON.stringify(baseline.counts));

    const generated = await page.evaluate(async () => {
      const { DocumentPaginationPolicy, PAGINATION_TYPES, TMPL01_CANONICAL_CAPACITY, TMPL01_ADMIN_PAGINATION } =
        await import('/app/js/services/document-pagination-policy.js');
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const { MvpPdfService } = await import('/app/js/services/mvp-pdf-service.js');
      const { MvpAdminService } = await import('/app/js/services/mvp-admin-service.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { DocumentValidationService } = await import('/app/js/services/document-validation-service.js');
      const toBase64 = async blob => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        return btoa(binary);
      };
      const policies = DocumentPaginationPolicy.all();
      const sizes = [0, 1, 25, 30, 31, 40, 50, 60, 61, 70, 300];
      const engine = new PdfTemplateEngine();
      const context = { institution: { nombre: 'CETPRO DEMO', ugel: 'UGEL DEMO', tipoGestion: 'PÚBLICA' },
        program: { nombre: 'PROGRAMA DEMO' } };
      const nominas = {};
      for (const size of sizes) {
        const rows = Array.from({ length: size }, (_, index) => ({
          studentName: `ALUMNO${String(index + 1).padStart(4, '0')}`,
          sex: index % 2 ? 'M' : 'H', birthDate: '2000-01-01'
        }));
        const blob = await engine.renderDocument({ documentType: 'TMPL-01', mode: 'ADMINISTRATIVE_MULTIPAGE',
          context, rows, demoMode: true });
        nominas[size] = { base64: await toBase64(blob), metadata: { ...engine.lastAdministrativePagination } };
      }
      let canonicalOverflow = null;
      try {
        await engine.renderTMPL01({ ...context, studentsList: Array.from({ length: 31 }, (_, index) => ({
          apellidosNombres: `CANONICO${index + 1}`, sexo: 'H', fechaNacimiento: ''
        })) });
      } catch (error) { canonicalOverflow = error.code; }

      const registry = {};
      const pdfService = new MvpPdfService();
      for (const size of [25, 40, 70, 300]) {
        const registryContext = { program: { nombre: 'PROGRAMA DEMO' }, group: { visibleCode: 'GRUPO DEMO' },
          module: null, period: null, rows: Array.from({ length: size }, (_, index) => ({
            studentName: `REGISTRO${String(index + 1).padStart(4, '0')}`, document: `D${String(index + 1).padStart(7, '0')}`,
            enrollmentStatus: 'ACTIVA'
          })) };
        const blob = await pdfService.renderAdministrativeEnrollmentRegister(registryContext);
        registry[size] = { base64: await toBase64(blob), csv: pdfService.buildEnrollmentRegisterCsv(registryContext) };
      }
      const demoRoster = await new MvpAdminService().buildGroupRoster('GAC-DEMO-B');
      const enrollmentContext = await new DocumentDataService().buildEnrollmentContext(demoRoster.rows[0].enrollmentId);
      const enrollmentPreflight = new DocumentValidationService().validateDocument('TMPL-02', enrollmentContext);
      const tmpl02 = await engine.renderTMPL02({ ...enrollmentContext,
        resolvedFieldSet: enrollmentPreflight.resolvedFieldSet, demoMode: true });
      return {
        policy: {
          count: Object.keys(policies).length, types: PAGINATION_TYPES,
          tmpl01: policies['TMPL-01'], tmpl02: policies['TMPL-02'], tmpl03: policies['TMPL-03'],
          tmpl05: policies['TMPL-05'], tmpl10: policies['TMPL-10'], tmpl11: policies['TMPL-11'],
          tmpl18: policies['TMPL-18'], tmpl19: policies['TMPL-19'], tmpl20: policies['TMPL-20'], tmpl21: policies['TMPL-21'],
          canonicalCapacity: TMPL01_CANONICAL_CAPACITY, adminFlag: TMPL01_ADMIN_PAGINATION
        },
        nominas, registry, canonicalOverflow, tmpl02: await toBase64(tmpl02)
      };
    });

    check('T-HOTFIX11-07-POLICY-COMPLETE', generated.policy.count === 21 &&
      generated.policy.tmpl01.type === 'PAGINATE_BY_TEMPLATE_COPY' && generated.policy.canonicalCapacity === 30 &&
      generated.policy.adminFlag === 'ENABLED', '21 políticas; TMPL-01 30/admin enabled');
    check('T-HOTFIX11-08-POLICY-BOUNDARIES', generated.policy.tmpl02.type === 'SINGLE_RECORD' &&
      generated.policy.tmpl03.type === 'BLOCK_ON_OVERFLOW' && generated.policy.tmpl03.geometryStatus === 'REVIEW_REQUIRED' &&
      generated.policy.tmpl05.type === 'BLOCK_ON_OVERFLOW' && generated.policy.tmpl10.type === 'BLOCK_ON_OVERFLOW' &&
      generated.policy.tmpl11.type === 'BLOCK_ON_OVERFLOW' && generated.policy.tmpl18.type === 'BLOCK_ON_OVERFLOW',
    'TMPL-02/03/05–18 no extrapoladas');
    check('T-HOTFIX11-09-FIXED-PAGES', generated.policy.tmpl19.pageCount === 2 &&
      JSON.stringify(generated.policy.tmpl19.pageRows) === JSON.stringify([20, 20]) &&
      generated.policy.tmpl20.pageCount === 2 && generated.policy.tmpl20.detailRows === 8 &&
      generated.policy.tmpl21.pageCount === 2 && generated.policy.tmpl21.singleRecord,
    'TMPL-19/20/21 conservan 2 páginas');
    check('T-HOTFIX11-10-CANONICAL-LIMIT', generated.canonicalOverflow === 'CAPACITY_EXCEEDED', generated.canonicalOverflow);

    const expectedPages = { 0: 1, 1: 1, 25: 1, 30: 1, 31: 2, 40: 2, 50: 2, 60: 2, 61: 3, 70: 3, 300: 10 };
    for (const [sizeText, expected] of Object.entries(expectedPages)) {
      const size = Number(sizeText);
      const pdf = await inspectPdf(generated.nominas[size].base64);
      const metadata = generated.nominas[size].metadata;
      const found = orderedMatches(pdf.text, /ALUMNO\d{4}/g);
      const wanted = Array.from({ length: size }, (_, index) => `ALUMNO${String(index + 1).padStart(4, '0')}`);
      const chunksOk = metadata.chunkSizes.length === expected && metadata.chunkSizes.every((chunkSize, index) =>
        chunkSize === Math.min(30, Math.max(0, size - index * 30)));
      check(`T-HOTFIX11-NOMINA-${size}`, pdf.pageCount === expected && metadata.pageCount === expected &&
        found.length === size && JSON.stringify(found) === JSON.stringify(wanted) && chunksOk &&
        pdf.pages.every((text, index) => text.includes('BORRADOR ADMINISTRATIVO') && text.includes('NO OFICIAL') &&
          text.includes(`PAGINA ${index + 1} DE ${expected}`)),
      `${size} filas → ${pdf.pageCount} página(s); chunks=${metadata.chunkSizes.join('+')}`);
    }
    const tmpl02Pdf = await inspectPdf(generated.tmpl02);
    check('T-HOTFIX11-11-TMPL02', tmpl02Pdf.pageCount === 1 && tmpl02Pdf.text.includes('DEMOSTRACION') &&
      tmpl02Pdf.text.includes('NO OFICIAL'), 'TMPL-02 funcional, 1 página');

    for (const size of [25, 40, 70, 300]) {
      const pdf = await inspectPdf(generated.registry[size].base64);
      const found = orderedMatches(pdf.text, /REGISTRO\d{4}/g);
      const wanted = Array.from({ length: size }, (_, index) => `REGISTRO${String(index + 1).padStart(4, '0')}`);
      const csvLines = generated.registry[size].csv.replace(/^\uFEFF/, '').split('\r\n');
      const csvNames = generated.registry[size].csv.match(/REGISTRO\d{4}/g) || [];
      check(`T-HOTFIX11-REGISTRY-${size}`, pdf.pageCount === Math.max(1, Math.ceil(size / 16)) &&
        found.length === size && JSON.stringify(found) === JSON.stringify(wanted) &&
        csvLines.length === size + 2 && JSON.stringify(csvNames) === JSON.stringify(wanted),
      `PDF ${pdf.pageCount} página(s), CSV ${size} filas`);
    }

    await page.evaluate(() => { location.hash = '#/registros/matricula?groupId=GAC-DEMO-A'; });
    await page.waitForSelector('#register-pdf');
    const registerBefore = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { getRuntimeTarget } = await import('/app/js/services/runtime-target-service.js');
      return { groupId: document.querySelector('#register-workspace')?.dataset.groupId,
        rows: document.querySelectorAll('#register-workspace tbody tr').length,
        runtime: getRuntimeTarget(), db: getDB().name };
    });
    check('T-HOTFIX11-12-REGISTRY-CONTEXT', registerBefore.groupId === 'GAC-DEMO-A' && registerBefore.rows === 40 &&
      registerBefore.runtime === 'DEMO' && registerBefore.db === 'CETPRO_V2_DEMO', JSON.stringify(registerBefore));
    await page.click('#register-pdf');
    await page.waitForSelector('#register-output iframe', { timeout: 30000 });
    const registerUi = await page.evaluate(async () => {
      const output = document.querySelector('#register-output');
      const anchor = output.querySelector('a[download]');
      const bytes = new Uint8Array(await (await fetch(anchor.href)).arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      let printCalled = false;
      const frame = output.querySelector('iframe');
      try { frame.contentWindow.print = () => { printCalled = true; }; } catch { /* tested by handler presence */ }
      document.querySelector('#register-print').click();
      const rect = output.getBoundingClientRect();
      return { base64: btoa(binary), download: anchor.download, printCalled,
        printButton: Boolean(document.querySelector('#register-print')),
        visible: rect.top < innerHeight && rect.bottom > 0,
        status: document.querySelector('#register-generation-status')?.textContent || '' };
    });
    const registerUiPdf = await inspectPdf(registerUi.base64);
    check('T-HOTFIX11-13-REGISTRY-UI', registerUi.visible && registerUiPdf.pageCount === 3 &&
      (registerUiPdf.text.match(/ESTUDIANTE DEMO/g) || []).length === 40 &&
      /^DEMO_REGISTRO_ADMINISTRATIVO_GRUPO_DEMO_A\.pdf$/.test(registerUi.download) &&
      /PDF generado correctamente/.test(registerUi.status), `${registerUiPdf.pageCount} páginas; ${registerUi.download}`);
    check('T-HOTFIX11-14-REGISTRY-PRINT', registerUi.printButton && registerUi.printCalled, 'handler de impresión ejecutable');

    const uiNomina = {};
    for (const [groupId, expectedRows, expectedPageCount] of [['GAC-DEMO-B', 25, 1], ['GAC-DEMO-A', 40, 2]]) {
      await page.evaluate(value => { location.hash = `#/nominas?groupId=${value}`; }, groupId);
      await page.waitForSelector('#generate-tmpl01');
      const enabled = await page.$eval('#generate-tmpl01', button => !button.disabled);
      await page.click('#generate-tmpl01');
      await page.waitForSelector('#roster-pdf iframe', { timeout: 30000 });
      const outcome = await page.evaluate(async () => {
        const anchor = document.querySelector('#roster-pdf a[download]');
        const bytes = new Uint8Array(await (await fetch(anchor.href)).arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        let printCalled = false;
        const frame = document.querySelector('#roster-pdf iframe');
        try { frame.contentWindow.print = () => { printCalled = true; }; } catch { /* checked */ }
        document.querySelector('#roster-print').click();
        const rect = document.querySelector('#roster-pdf').getBoundingClientRect();
        return { base64: btoa(binary), download: anchor.download, printCalled,
          visible: rect.top < innerHeight && rect.bottom > 0,
          status: document.querySelector('#roster-generation-status')?.textContent || '' };
      });
      const pdf = await inspectPdf(outcome.base64);
      uiNomina[groupId] = { enabled, expectedRows, expectedPageCount, outcome, pdf };
    }
    check('T-HOTFIX11-15-DEMO-B', uiNomina['GAC-DEMO-B'].enabled && uiNomina['GAC-DEMO-B'].pdf.pageCount === 1 &&
      (uiNomina['GAC-DEMO-B'].pdf.text.match(/ESTUDIANTE DEMO/g) || []).length === 25 &&
      uiNomina['GAC-DEMO-B'].outcome.visible, '25 → 1 página visible');
    check('T-HOTFIX11-16-DEMO-A', uiNomina['GAC-DEMO-A'].enabled && uiNomina['GAC-DEMO-A'].pdf.pageCount === 2 &&
      (uiNomina['GAC-DEMO-A'].pdf.text.match(/ESTUDIANTE DEMO/g) || []).length === 40 &&
      uiNomina['GAC-DEMO-A'].outcome.visible && uiNomina['GAC-DEMO-A'].outcome.printCalled,
    '40 → 2 páginas visibles, descarga e impresión');

    const after = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { DemoRuntimeService } = await import('/app/js/services/demo-runtime-service.js');
      const { V2CandidateStorageService } = await import('/app/js/v2-candidate/candidate-services.js');
      const stores = ['estudiantes', 'matriculas', 'grupos_academicos', 'periodos', 'unidades', 'asistencia'];
      const count = (db, store) => new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).count();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      await DemoRuntimeService.exit();
      const db = getDB();
      return { hash: await V2CandidateStorageService.semanticHash(db),
        counts: Object.fromEntries(await Promise.all(stores.map(async store => [store, await count(db, store)]))) };
    });
    check('T-HOTFIX11-17-REAL-UNCHANGED', after.hash === baseline.hash &&
      JSON.stringify(after.counts) === JSON.stringify(baseline.counts), 'fingerprint y conteos idénticos');
    check('T-HOTFIX11-18-RUNTIME', errors.length === 0, `${errors.length} errores JS/promise`);
    check('T-HOTFIX11-19-OFFLINE', external.length === 0, `${external.length} solicitudes externas`);
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  return { total: results.length, passed: results.filter(row => row.passed).length,
    failed: results.filter(row => !row.passed).length };
}

module.exports = { name: 'MVP_DOCUMENT_PAGINATION_AND_REGISTRY_HOTFIX_11', run };

if (require.main === module) run().then(result => {
  console.log(`MVP_DOCUMENT_PAGINATION_AND_REGISTRY_HOTFIX_11 ${result.passed}/${result.total}, failed=${result.failed}`);
  process.exit(result.failed ? 1 : 0);
}).catch(error => { console.error(error); process.exit(1); });
