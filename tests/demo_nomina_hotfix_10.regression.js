const fs = require('fs');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
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
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').toUpperCase();
async function inspectPdf(base64) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(base64, 'base64')), disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return { pages: pdf.numPages, text: normalize(pages.join(' ')) };
}

async function run() {
  const results = [];
  const check = (id, passed, detail = '') => {
    const row = { id, passed: Boolean(passed), detail };
    results.push(row);
    console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${id}: ${detail}`);
  };

  const groupView = read('app/js/ui/group-assignment-view.js');
  const rosterView = read('app/js/ui/nominas-view.js');
  check('T-HOTFIX10-01-GROUP-ID-LINK', groupView.includes('#/nominas?groupId=${encodeURIComponent(group.id)}') &&
    !groupView.includes('nominas?grupoCode='), 'la navegación usa groupId técnico');
  check('T-HOTFIX10-02-NO-GRUPOCODE-IDENTITY', !/buildGroupRoster\([^)]*grupoCode/.test(rosterView),
    'la nómina no usa grupoCode como identidad');

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
    page.on('response', response => {
      try {
        const url = new URL(response.url());
        if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1') external.push(response.url());
      } catch { /* local */ }
    });
    await page.goto(`${BASE}#/demo`, { waitUntil: 'networkidle0', timeout: 30000 });
    const browserIdentity = await browser.version();
    check('T-HOTFIX10-03-EDGE', /Edg/i.test(browserIdentity), browserIdentity);
    await page.waitForFunction(() => document.querySelector('#candidate-runtime-banner')?.textContent.includes('MODO DEMOSTRACIÓN'),
      { timeout: 30000 });

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
      const hash = await V2CandidateStorageService.semanticHash(db);
      const counts = Object.fromEntries(await Promise.all(stores.map(async store => [store, await count(db, store)])));
      await DemoRuntimeService.enter({ reset: true });
      return { hash, counts };
    });
    check('T-HOTFIX10-04-REAL-BASELINE', JSON.stringify(baseline.counts) === JSON.stringify({
      estudiantes: 269, matriculas: 295, grupos_academicos: 12, periodos: 0, unidades: 0, asistencia: 0
    }), JSON.stringify(baseline.counts));

    await page.evaluate(() => { location.hash = '#/grupos'; });
    await page.waitForFunction(() => document.querySelector('#main-content')?.innerText.includes('GRUPO DEMO B'));
    const groupList = await page.evaluate(() => ({
      body: document.querySelector('#main-content')?.innerText || '',
      link: document.querySelector('a[href="#/nominas?groupId=GAC-DEMO-B"]')?.getAttribute('href') || ''
    }));
    check('T-HOTFIX10-05-DEMO-GROUPS', groupList.body.includes('GRUPO DEMO A') && groupList.body.includes('40') &&
      groupList.body.includes('GRUPO DEMO B') && groupList.body.includes('25'), 'A=40 y B=25 visibles en Grupos');
    check('T-HOTFIX10-06-B-LINK', groupList.link === '#/nominas?groupId=GAC-DEMO-B', groupList.link);

    await page.click('a[href="#/nominas?groupId=GAC-DEMO-B"]');
    await page.waitForSelector('#generate-tmpl01');
    const beforeB = await page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { getRuntimeTarget } = await import('/app/js/services/runtime-target-service.js');
      return {
        hash: location.hash,
        disabled: document.querySelector('#generate-tmpl01')?.disabled,
        rows: document.querySelectorAll('#roster-workspace tbody tr').length,
        text: document.querySelector('#roster-workspace')?.innerText || '',
        groupId: document.querySelector('#roster-workspace')?.dataset.groupId || '',
        runtime: getRuntimeTarget(), dbName: getDB().name
      };
    });
    check('T-HOTFIX10-07-B-CONTEXT', beforeB.hash === '#/nominas?groupId=GAC-DEMO-B' &&
      beforeB.groupId === 'GAC-DEMO-B' && beforeB.runtime === 'DEMO' && beforeB.dbName === 'CETPRO_V2_DEMO',
      `${beforeB.hash}; data-group-id=${beforeB.groupId}; runtime=${beforeB.runtime}; db=${beforeB.dbName}`);
    check('T-HOTFIX10-08-B-ROWS', beforeB.rows === 25 && beforeB.text.includes('25 matrícula'), `${beforeB.rows} filas`);
    check('T-HOTFIX10-09-BUTTON-ENABLED', beforeB.disabled === false, `disabled=${beforeB.disabled}`);

    await page.click('#generate-tmpl01');
    await page.waitForSelector('#roster-pdf iframe', { timeout: 30000 });
    const generatedB = await page.evaluate(async () => {
      const anchor = document.querySelector('#roster-pdf a[download]');
      const target = document.querySelector('#roster-pdf');
      const bytes = new Uint8Array(await (await fetch(anchor.href)).arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      let printCalled = false;
      const frame = target.querySelector('iframe');
      try { frame.contentWindow.print = () => { printCalled = true; }; } catch { /* checked below */ }
      document.querySelector('#roster-print').click();
      const rect = target.getBoundingClientRect();
      return {
        base64: btoa(binary), download: anchor.download, href: anchor.href,
        printCalled, printButton: Boolean(document.querySelector('#roster-print')),
        visible: rect.top < innerHeight && rect.bottom > 0,
        status: document.querySelector('#roster-generation-status')?.textContent || ''
      };
    });
    const pdfB = await inspectPdf(generatedB.base64);
    const bNames = (pdfB.text.match(/ESTUDIANTE DEMO/g) || []).length;
    check('T-HOTFIX10-10-VIEWER', generatedB.href.startsWith('blob:') && generatedB.visible,
      `blob=${generatedB.href.startsWith('blob:')}; visible=${generatedB.visible}`);
    check('T-HOTFIX10-11-PDF-VALID', Buffer.from(generatedB.base64, 'base64').subarray(0, 5).toString() === '%PDF-', 'cabecera %PDF-');
    check('T-HOTFIX10-12-ONE-PAGE', pdfB.pages === 1, `${pdfB.pages} página(s)`);
    check('T-HOTFIX10-13-WATERMARK', pdfB.text.includes('DEMOSTRACION') && pdfB.text.includes('NO OFICIAL'), 'marca DEMO presente');
    check('T-HOTFIX10-14-25-PDF-ROWS', bNames === 25, `${bNames} estudiantes en PDF`);
    check('T-HOTFIX10-14B-NO-TECH-ID', !pdfB.text.includes('GAC-DEMO-B') && !pdfB.text.includes('MAT-DEMO'),
      'sin groupId/matriculaId como código oficial');
    check('T-HOTFIX10-15-DOWNLOAD', /^DEMO_NOMINA_ADMINISTRATIVA_COMPLETA_GRUPO_DEMO_B\.pdf$/.test(generatedB.download), generatedB.download);
    check('T-HOTFIX10-16-PRINT', generatedB.printButton && generatedB.printCalled, `button=${generatedB.printButton}; called=${generatedB.printCalled}`);
    check('T-HOTFIX10-17-UX-STATUS', /NÓMINA|NOMINA/.test(normalize(generatedB.status)), generatedB.status);

    await page.evaluate(() => { location.hash = '#/nominas?groupId=GAC-DEMO-A'; });
    await page.waitForFunction(() => document.querySelector('#roster-workspace')?.innerText.includes('40 matrícula'));
    const beforeA = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const { MvpAdminService } = await import('/app/js/services/mvp-admin-service.js');
      const context = await new MvpAdminService().buildGroupRoster('GAC-DEMO-A');
      let canonicalCode = null;
      try {
        await new PdfTemplateEngine().renderTMPL01({ institution: context.institution, program: context.program,
          studentsList: context.rows.map(row => ({ apellidosNombres: row.studentName, sexo: row.sex,
            fechaNacimiento: row.birthDate })) });
      } catch (error) { canonicalCode = error.code; }
      return { disabled: document.querySelector('#generate-tmpl01')?.disabled,
        text: document.querySelector('#roster-workspace')?.innerText || '',
        rows: document.querySelectorAll('#roster-workspace tbody tr').length, canonicalCode };
    });
    check('T-HOTFIX10-18-A-CAPACITY', !beforeA.disabled && beforeA.rows === 40 &&
      beforeA.text.includes('2 página') && beforeA.canonicalCode === 'CAPACITY_EXCEEDED',
      `disabled=${beforeA.disabled}; rows=${beforeA.rows}; canonical=${beforeA.canonicalCode}`);
    await page.click('#generate-full-roster');
    await page.waitForSelector('#roster-pdf iframe', { timeout: 30000 });
    const reportA64 = await page.evaluate(async () => {
      const href = document.querySelector('#roster-pdf a[download]').href;
      const bytes = new Uint8Array(await (await fetch(href)).arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      return btoa(binary);
    });
    const reportA = await inspectPdf(reportA64);
    check('T-HOTFIX10-19-A-REPORT', (reportA.text.match(/ESTUDIANTE DEMO/g) || []).length === 40 &&
      reportA.text.includes('DEMOSTRACION') && reportA.text.includes('NO OFICIAL'), 'reporte completo A con 40 filas y marca DEMO');

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
      return {
        hash: await V2CandidateStorageService.semanticHash(db),
        counts: Object.fromEntries(await Promise.all(stores.map(async store => [store, await count(db, store)])))
      };
    });
    check('T-HOTFIX10-20-REAL-UNCHANGED', after.hash === baseline.hash &&
      JSON.stringify(after.counts) === JSON.stringify(baseline.counts), 'fingerprint y conteos idénticos');
    check('T-HOTFIX10-21-CONSOLE', errors.length === 0 && external.length === 0,
      `${errors.length} errores; ${external.length} solicitudes externas`);
  } finally {
    await browser.close();
    if (server) server.kill();
  }
  return { total: results.length, passed: results.filter(row => row.passed).length,
    failed: results.filter(row => !row.passed).length };
}

module.exports = { name: 'DEMO_NOMINA_HOTFIX_10', run };

if (require.main === module) run().then(result => {
  console.log(`DEMO_NOMINA_HOTFIX_10 ${result.passed}/${result.total}, failed=${result.failed}`);
  process.exit(result.failed ? 1 : 0);
}).catch(error => { console.error(error); process.exit(1); });
