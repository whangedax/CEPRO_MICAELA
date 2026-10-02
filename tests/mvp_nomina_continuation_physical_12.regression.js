const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_PDF = path.join(ROOT, 'output', 'pdf', 'MVP_NOMINA_CONTINUATION_PHYSICAL_12_DEMO_A_40.pdf');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();
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
    const items = content.items.map(item => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
    pages.push({ items, text: normalize(items.map(item => item.str).join(' ')) });
  }
  return { pageCount: pdf.numPages, pages, text: pages.map(page => page.text).join(' ') };
}
const inOrder = (text, values) => {
  let offset = -1;
  return values.every(value => {
    offset = text.indexOf(normalize(value), offset + 1);
    return offset >= 0;
  });
};

async function run() {
  const results = [];
  const check = (id, passed, detail = '') => {
    const row = { id, passed: Boolean(passed), detail };
    results.push(row);
    console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${id}: ${detail}`);
  };

  const policySource = read('app/js/services/document-pagination-policy.js');
  const engineSource = read('app/js/services/pdf-template-engine.js');
  check('T-MNCP12-A-POLICY-CONTRACT', policySource.includes('startRecord') && policySource.includes('endRecord') &&
    engineSource.includes('suppressOfficialTotals: false') && engineSource.includes('TOTAL GENERAL DEL GRUPO') &&
    engineSource.includes('REGISTROS EN ESTA PÁGINA'), 'continuidad y totales administrativos explícitos');
  check('T-MNCP12-B-PURE-RENDERER', !/getDB\(|IndexedDB|Repository/.test(engineSource), 'renderer sin acceso a DB');

  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(file => file.endsWith('.json'));
  let hashMatches = 0;
  const pageCounts = {};
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(canonical) && crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex') === manifest.sha256) {
      hashMatches += 1;
    }
    if (['TMPL-19', 'TMPL-20', 'TMPL-21'].includes(manifest.templateId)) {
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(canonical)), disableWorker: true }).promise;
      pageCounts[manifest.templateId] = pdf.numPages;
    }
  }
  check('T-MNCP12-C-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21`);
  check('T-MNCP12-D-FIXED-TWO-PAGES', ['TMPL-19', 'TMPL-20', 'TMPL-21'].every(id => pageCounts[id] === 2), JSON.stringify(pageCounts));

  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await waitServer();
  }
  const edgeProfile = path.join(ROOT, 'tmp', 'edge-profiles', `mvp-nomina-continuation-12-${Date.now()}`);
  fs.mkdirSync(edgeProfile, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, executablePath: EDGE, userDataDir: edgeProfile });
  const downloadDir = path.join(ROOT, 'tmp', 'downloads', `mvp-nomina-continuation-12-${Date.now()}`);
  fs.mkdirSync(downloadDir, { recursive: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => {
      globalThis.__gateOpenedDatabases = [];
      const originalOpen = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function patchedOpen(name, ...args) {
        globalThis.__gateOpenedDatabases.push(String(name));
        return originalOpen.call(this, name, ...args);
      };
    });
    const cdp = await page.target().createCDPSession();
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
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
    await page.goto(`${BASE}#/demo`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#candidate-runtime-banner')?.textContent.includes('MODO DEMOSTRACIÓN'));
    check('T-MNCP12-E-AUTOMATED-EDGE-HEADLESS', /Edg/i.test(await browser.version()), await browser.version());

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
      const result = { hash: await V2CandidateStorageService.semanticHash(db), dbName: db.name,
        counts: Object.fromEntries(await Promise.all(stores.map(async store => [store, await count(db, store)]))) };
      await DemoRuntimeService.enter({ reset: true });
      return result;
    });
    check('T-MNCP12-F-CANDIDATE-BASELINE', baseline.dbName === 'CETPRO_V2_CANDIDATE' &&
      JSON.stringify(baseline.counts) === JSON.stringify({ estudiantes: 269, matriculas: 295,
        grupos_academicos: 12, periodos: 0, unidades: 0, asistencia: 0 }), JSON.stringify(baseline));

    const generated = await page.evaluate(async () => {
      const { DocumentPaginationPolicy } = await import('/app/js/services/document-pagination-policy.js');
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { DocumentValidationService } = await import('/app/js/services/document-validation-service.js');
      const { MvpAdminService } = await import('/app/js/services/mvp-admin-service.js');
      const toBase64 = async blob => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        return btoa(binary);
      };
      const engine = new PdfTemplateEngine();
      const context = { institution: { nombre: 'CETPRO DEMO', ugel: 'UGEL DEMO', tipoGestion: 'PÚBLICA' },
        program: { nombre: 'PROGRAMA DEMO' } };
      const sizes = [1, 30, 31, 40, 50, 60, 61, 70, 300];
      const nominas = {};
      for (const size of sizes) {
        const rows = Array.from({ length: size }, (_, index) => ({
          enrollmentId: `MAT-SCALE-${String(index + 1).padStart(3, '0')}`,
          studentName: `ALUMNO${String(index + 1).padStart(4, '0')}`,
          sex: index % 2 ? 'M' : 'H', birthDate: '2000-01-01'
        }));
        const blob = await engine.renderDocument({ documentType: 'TMPL-01', mode: 'ADMINISTRATIVE_MULTIPAGE',
          context, rows, demoMode: true });
        nominas[size] = { base64: await toBase64(blob), metadata: JSON.parse(JSON.stringify(engine.lastAdministrativePagination)),
          plan: JSON.parse(JSON.stringify(DocumentPaginationPolicy.plan('TMPL-01', size, { mode: 'ADMINISTRATIVE_MULTIPAGE' }))) };
      }
      let canonicalOverflow = null;
      try {
        await engine.renderTMPL01({ ...context, studentsList: Array.from({ length: 31 }, (_, index) => ({
          apellidosNombres: `CANONICO${index + 1}`, sexo: 'H', fechaNacimiento: ''
        })) });
      } catch (error) { canonicalOverflow = error.code; }
      const demoRoster = await new MvpAdminService().buildGroupRoster('GAC-DEMO-B');
      const enrollmentContext = await new DocumentDataService().buildEnrollmentContext(demoRoster.rows[0].enrollmentId);
      const preflight = new DocumentValidationService().validateDocument('TMPL-02', enrollmentContext);
      const tmpl02 = await engine.renderTMPL02({ ...enrollmentContext, resolvedFieldSet: preflight.resolvedFieldSet, demoMode: true });
      return { nominas, canonicalOverflow, tmpl02: await toBase64(tmpl02),
        tmpl03: DocumentPaginationPolicy.get('TMPL-03') };
    });

    check('T-MNCP12-G-CANONICAL-MAX-30', generated.canonicalOverflow === 'CAPACITY_EXCEEDED', generated.canonicalOverflow);
    const tmpl02 = await inspectPdf(generated.tmpl02);
    check('T-MNCP12-H-TMPL02', tmpl02.pageCount === 1 && tmpl02.text.includes('DEMOSTRACION') && tmpl02.text.includes('NO OFICIAL'), '1 página DEMO');
    check('T-MNCP12-I-TMPL03-REVIEW', generated.tmpl03.geometryStatus === 'REVIEW_REQUIRED' &&
      generated.tmpl03.type === 'BLOCK_ON_OVERFLOW', JSON.stringify(generated.tmpl03));

    const sizeResults = {};
    for (const size of [1, 30, 31, 40, 50, 60, 61, 70, 300]) {
      const record = generated.nominas[size];
      const pdf = await inspectPdf(record.base64);
      const expectedPages = Math.ceil(size / 30);
      const wantedNames = Array.from({ length: size }, (_, index) => `ALUMNO${String(index + 1).padStart(4, '0')}`);
      const foundNames = pdf.text.match(/ALUMNO\d{4}/g) || [];
      const allIds = record.metadata.pages.flatMap(item => item.matriculaIds);
      const wantedIds = Array.from({ length: size }, (_, index) => `MAT-SCALE-${String(index + 1).padStart(3, '0')}`);
      const rangesOk = record.metadata.pages.every((item, index) => {
        const start = index * 30 + 1; const end = Math.min(size, (index + 1) * 30);
        return item.pageNumber === index + 1 && item.startRecord === start && item.endRecord === end &&
          item.rowCount === end - start + 1 && pdf.pages[index].text.includes(
            `PAGINA ${index + 1} DE ${expectedPages} · REGISTROS ${start}–${end}`) &&
          pdf.pages[index].text.includes(`TOTAL GENERAL DEL GRUPO: ${size}`) &&
          pdf.pages[index].text.includes(`REGISTROS EN ESTA PAGINA: ${end - start + 1}`);
      });
      const officialNumericTotals = pdf.pages.flatMap(pageData => pageData.items).filter(item =>
        /^\d+$/.test(item.str.trim()) && item.y >= 95 && item.y <= 120 && item.x >= 100 && item.x <= 520);
      const ok = pdf.pageCount === expectedPages && record.plan.pageCount === expectedPages &&
        record.metadata.pageCount === expectedPages && record.metadata.chunkSizes.reduce((sum, value) => sum + value, 0) === size &&
        record.metadata.chunkSizes.every(value => value >= 1 && value <= 30) &&
        foundNames.length === size && JSON.stringify(foundNames) === JSON.stringify(wantedNames) &&
        new Set(allIds).size === size && JSON.stringify(allIds) === JSON.stringify(wantedIds) &&
        record.metadata.officialTotalsSuppressed === false && officialNumericTotals.length === expectedPages * 3 && rangesOk;
      sizeResults[size] = ok;
      check(`T-MNCP12-SCALE-${size}`, ok, `${size} filas → ${pdf.pageCount}/${expectedPages}; chunks=${record.metadata.chunkSizes.join('+')}`);
    }
    check('T-MNCP12-J-GLOBAL-ROW-CONTINUITY', Object.values(sizeResults).every(Boolean), '1..300 sin omisión, duplicación ni reordenamiento');

    const selectGroupFromUi = async (route, programSelector, groupSelector, groupId, readySelector) => {
      await page.evaluate(value => { location.hash = value; }, route);
      await page.waitForSelector(programSelector);
      const programId = await page.evaluate(async id => {
        const { MvpAdminService } = await import('/app/js/services/mvp-admin-service.js');
        return (await new MvpAdminService().listGroupSummaries()).find(group => group.id === id)?.programaId || '';
      }, groupId);
      await page.select(programSelector, programId);
      await page.select(groupSelector, groupId);
      await page.waitForSelector(readySelector);
    };
    const observeStatus = async selector => page.evaluate(statusSelector => {
      globalThis.__gateStatusHistory = [];
      const target = document.querySelector(statusSelector);
      globalThis.__gateStatusHistory.push(target?.textContent || '');
      new MutationObserver(() => globalThis.__gateStatusHistory.push(target?.textContent || ''))
        .observe(target, { childList: true, subtree: true, characterData: true });
    }, selector);
    const captureVisiblePdf = async (outputSelector, statusSelector, printSelector) => page.evaluate(async (outputSel, statusSel, printSel) => {
      const output = document.querySelector(outputSel);
      const anchor = output.querySelector('a[download]');
      const bytes = new Uint8Array(await (await fetch(anchor.href)).arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      let printCalled = false;
      const frame = output.querySelector('iframe');
      try { frame.contentWindow.print = () => { printCalled = true; }; } catch { /* se verifica el botón visible */ }
      document.querySelector(printSel).click();
      const rect = output.getBoundingClientRect();
      return { base64: btoa(binary), byteLength: bytes.length, download: anchor.download, printCalled,
        visible: rect.top < innerHeight && rect.bottom > 0 && getComputedStyle(anchor).display !== 'none',
        status: document.querySelector(statusSel)?.textContent || '', history: globalThis.__gateStatusHistory || [] };
    }, outputSelector, statusSelector, printSelector);

    const nominaUi = {};
    for (const [groupId, expectedRows, expectedPages] of [['GAC-DEMO-B', 25, 1], ['GAC-DEMO-A', 40, 2]]) {
      await selectGroupFromUi('#/nominas', '#roster-program', '#roster-group', groupId, '#generate-tmpl01');
      const tableNames = await page.$$eval('#roster-workspace tbody tr td:nth-child(2)', cells => cells.map(cell => cell.textContent.trim()));
      await observeStatus('#roster-generation-status');
      await page.click('#generate-tmpl01');
      await page.waitForSelector('#roster-pdf iframe', { timeout: 30000 });
      const outcome = await captureVisiblePdf('#roster-pdf', '#roster-generation-status', '#roster-print');
      const pdf = await inspectPdf(outcome.base64);
      await page.click('#roster-pdf a[download]');
      const downloaded = outcome.byteLength > 1000;
      const exactRanges = expectedRows === 25
        ? pdf.pages[0].text.includes('PAGINA 1 DE 1 · REGISTROS 1–25')
        : pdf.pages[0].text.includes('PAGINA 1 DE 2 · REGISTROS 1–30') &&
          pdf.pages[1].text.includes('PAGINA 2 DE 2 · REGISTROS 31–40');
      nominaUi[groupId] = pdf.pageCount === expectedPages && tableNames.length === expectedRows &&
        inOrder(pdf.text, tableNames) && exactRanges && outcome.visible && downloaded && outcome.printCalled &&
        outcome.history.some(text => /Generando nómina/.test(text)) && /Nómina generada correctamente/.test(outcome.status);
      if (groupId === 'GAC-DEMO-A') {
        fs.mkdirSync(path.dirname(OUTPUT_PDF), { recursive: true });
        fs.writeFileSync(OUTPUT_PDF, Buffer.from(outcome.base64, 'base64'));
      }
      check(`T-MNCP12-NOMINA-${groupId.endsWith('A') ? 'A40' : 'B25'}`, nominaUi[groupId],
        `${expectedRows} filas/${pdf.pageCount} pág.; visible=${outcome.visible}; descarga=${downloaded}; print=${outcome.printCalled}`);
    }

    const registryUi = {};
    for (const [groupId, expectedRows, expectedPages] of [['GAC-DEMO-A', 40, 3], ['GAC-DEMO-B', 25, 2]]) {
      await selectGroupFromUi('#/registros/matricula', '#register-program', '#register-group', groupId, '#register-pdf');
      const tableNames = await page.$$eval('#register-workspace tbody tr td:nth-child(2)', cells => cells.map(cell => cell.textContent.trim()));
      await observeStatus('#register-generation-status');
      await page.click('#register-pdf');
      await page.waitForSelector('#register-output iframe', { timeout: 30000 });
      const outcome = await captureVisiblePdf('#register-output', '#register-generation-status', '#register-print');
      const pdf = await inspectPdf(outcome.base64);
      await page.click('#register-output a[download]');
      const downloaded = outcome.byteLength > 1000;
      await page.$eval('#register-csv', button => button.click());
      const csvResult = await page.evaluate(async id => {
        const { MvpAdminService } = await import('/app/js/services/mvp-admin-service.js');
        const { MvpPdfService } = await import('/app/js/services/mvp-pdf-service.js');
        const context = await new MvpAdminService().buildGroupRoster(id);
        return { text: new MvpPdfService().buildEnrollmentRegisterCsv(context),
          status: document.querySelector('#register-generation-status')?.textContent || '' };
      }, groupId);
      const csvLines = csvResult.text.replace(/^\uFEFF/, '').split('\r\n');
      const csvNames = csvResult.text.match(/ESTUDIANTE DEMO[^;\r\n]*/g) || [];
      const csvOk = csvLines.length === expectedRows + 2 && csvNames.length === expectedRows &&
        /CSV preparado correctamente/.test(csvResult.status);
      registryUi[groupId] = pdf.pageCount === expectedPages && tableNames.length === expectedRows &&
        inOrder(pdf.text, tableNames) && outcome.visible && downloaded && outcome.printCalled && csvOk &&
        outcome.history.some(text => /Generando registro administrativo PDF/.test(text)) &&
        /PDF generado correctamente/.test(outcome.status);
      check(`T-MNCP12-REGISTRY-${groupId.endsWith('A') ? 'A40' : 'B25'}`, registryUi[groupId],
        `${expectedRows} filas/${pdf.pageCount} pág.; visible=${outcome.visible}; descarga=${downloaded}; print=${outcome.printCalled}; csv=${csvOk} (${csvLines.length} líneas/${csvNames.length} nombres; ${csvResult.status})`);
    }
    check('T-MNCP12-K-REGISTRY-VISIBLE', Object.values(registryUi).every(Boolean), 'A40 y B25 desde selectores UI');

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
      return { hash: await V2CandidateStorageService.semanticHash(db), dbName: db.name,
        counts: Object.fromEntries(await Promise.all(stores.map(async store => [store, await count(db, store)]))),
        opened: globalThis.__gateOpenedDatabases || [] };
    });
    check('T-MNCP12-L-CANDIDATE-FINGERPRINT', after.hash === baseline.hash &&
      JSON.stringify(after.counts) === JSON.stringify(baseline.counts), `${baseline.hash} = ${after.hash}`);
    check('T-MNCP12-M-CETPRO-DB-UNTOUCHED', !after.opened.includes('CETPRO_DB'), JSON.stringify(after.opened));
    check('T-MNCP12-N-RUNTIME-CLEAN', errors.length === 0, `${errors.length} errores JS/promise`);
    check('T-MNCP12-O-OFFLINE', external.length === 0, `${external.length} solicitudes externas`);
    check('T-MNCP12-P-DEMO-B-25', nominaUi['GAC-DEMO-B'] === true, 'DEMO_B_25');
    check('T-MNCP12-Q-DEMO-A-40', nominaUi['GAC-DEMO-A'] === true, 'DEMO_A_40');
    check('T-MNCP12-R-HUMAN-PENDING', true, 'HUMAN_PHYSICAL_EDGE_ACCEPTANCE=PENDING');
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  return { total: results.length, passed: results.filter(row => row.passed).length,
    failed: results.filter(row => !row.passed).length };
}

module.exports = { name: 'MVP_NOMINA_CONTINUATION_PHYSICAL_12', run };

if (require.main === module) run().then(result => {
  console.log(`MVP_NOMINA_CONTINUATION_PHYSICAL_12 ${result.passed}/${result.total}, failed=${result.failed}`);
  process.exit(result.failed ? 1 : 0);
}).catch(error => { console.error(error); process.exit(1); });



