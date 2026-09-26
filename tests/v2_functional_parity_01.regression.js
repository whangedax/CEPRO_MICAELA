const http = require('http');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const V2_URL = 'http://127.0.0.1:8081/';
const V1_URL = 'http://127.0.0.1:8080/app/index.html';
const up = url => new Promise(resolve => {
  const request = http.get(url, response => { response.resume(); resolve(response.statusCode === 200); });
  request.on('error', () => resolve(false));
  request.setTimeout(1200, () => { request.destroy(); resolve(false); });
});
const waitForServer = async url => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await up(url)) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor no disponible: ${url}`);
};

async function run() {
  let v1Server; let v2Server;
  if (!await up(V2_URL)) { v2Server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true }); await waitForServer(V2_URL); }
  if (!await up(V1_URL)) { v1Server = fork(require.resolve('../scripts/dev-server.js'), [], { silent: true }); await waitForServer(V1_URL); }
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; const external = []; const httpErrors = [];
    await page.setRequestInterception(true);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => {
      const url = request.url();
      if (/^https?:\/\//.test(url) && !/^http:\/\/127\.0\.0\.1:(8080|8081)\//.test(url)) {
        external.push(url);
        request.abort();
      } else request.continue();
    });
    page.on('response', response => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });
    await page.goto(V2_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#db-status-badge')?.textContent.includes('Datos locales disponibles'));

    const outcome = await page.evaluate(async () => {
      const results = [];
      const check = (id, passed, detail = '') => results.push({ id, passed: Boolean(passed), detail });
      const { getDB } = await import('/app/js/db/database.js');
      const { readV2Snapshot } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const { canonicalize } = await import('/app/js/services/storage-service.js');
      const { TemplateRegistry } = await import('/app/js/services/template-registry.js');
      const db = getDB();
      const before = await readV2Snapshot(db);
      const beforeCanonical = canonicalize(before);
      const counts = Object.fromEntries(Object.entries(before).map(([name, rows]) => [name, rows.length]));
      check('T-V2FP-01', db.name === 'CETPRO_V2_CANDIDATE' && db.version === 2, 'DB aislada schema 2');
      check('T-V2FP-02', db.objectStoreNames.length === 18 && db.objectStoreNames.contains('grupos_academicos'), '18 stores');
      check('T-V2FP-03', counts.estudiantes === 269 && counts.matriculas === 295 && counts.staging_importaciones === 295, 'conteos reales');
      check('T-V2FP-04', counts.programas === 7 && counts.modulos === 14 && counts.grupos_academicos === 12, 'catálogos y grupos');
      check('T-V2FP-05', counts.periodos === 0 && counts.unidades === 0, 'sin periodo/currículo productivo');
      check('T-V2FP-06', before.matriculas.every(row => row.grupoId) && before.grupos_academicos.every(row => row.id), 'groupId completo');
      check('T-V2FP-07', before.matriculas.every(row => row.moduloId === null) && before.grupos_academicos.every(row => row.moduloId === null), 'sin módulos asignados');
      check('T-V2FP-08', new TemplateRegistry().getAll().length === 21, 'arquitectura documental 21 plantillas');
      check('T-V2FP-09', Boolean(document.querySelector('#candidate-runtime-banner')) && !document.querySelector('#candidate-main'), 'shell único maduro');

      const routes = ['inicio','estudiantes','matriculas','programas','grupos','nominas','registros/matricula','configuracion-academica','registro','efsrt','cierre','documentos','incidencias','respaldo','configuracion'];
      const routeStates = [];
      for (const id of routes) {
        location.hash = `#/${id}`;
        await new Promise(resolve => setTimeout(resolve, 180));
        routeStates.push({ id, text: document.querySelector('#main-content')?.textContent.trim() || '', children: document.querySelector('#main-content')?.children.length || 0 });
      }
      check('T-V2FP-10', routeStates.length === 15 && routeStates.every(row => row.children > 0 && row.text.length > 20), '15 rutas funcionales, incluidas nóminas, registros y configuración académica');

      location.hash = '#/estudiantes'; await new Promise(resolve => setTimeout(resolve, 250));
      check('T-V2FP-11', document.querySelector('#student-list-container')?.textContent.length > 100, 'padrón y expediente');
      check('T-V2FP-12', Boolean(document.querySelector('#btn-new-student') && document.querySelector('#student-search-input') && document.querySelector('#student-filter-status')), 'alta/búsqueda/filtros preservados');
      location.hash = '#/matriculas'; await new Promise(resolve => setTimeout(resolve, 700));
      check('T-V2FP-13', document.querySelector('#main-content').textContent.includes('295') && document.querySelector('#main-content').textContent.includes('Matrículas'),
        `matrículas completas: ${document.querySelector('#main-content').textContent.slice(0, 230).replace(/\s+/g, ' ')}`);
      check('T-V2FP-14', Boolean(document.querySelector('input') && document.querySelector('select')), 'consulta/filtros de matrícula');
      check('T-V2FP-14B', !document.querySelector('#enrollment-list-container')?.textContent.includes('GAC-V1-') &&
        before.matriculas.every(row => row.grupoId), 'groupId autoritativo completo y oculto como detalle técnico');
      location.hash = '#/programas'; await new Promise(resolve => setTimeout(resolve, 700));
      check('T-V2FP-15', document.querySelector('#main-content').textContent.includes('7') && document.querySelector('#main-content').textContent.includes('Programas') &&
        document.querySelector('#main-content').textContent.includes('14') && document.querySelector('#main-content').textContent.includes('Módulos'),
        `vista curricular madura: ${document.querySelector('#main-content').textContent.slice(0, 230).replace(/\s+/g, ' ')}`);
      location.hash = '#/grupos'; await new Promise(resolve => setTimeout(resolve, 300));
      const groupText = document.querySelector('#main-content').textContent;
      check('T-V2FP-16', document.querySelectorAll('.group-detail').length === 12 && groupText.includes('REVISAR PROCEDENCIA') && !groupText.includes('8 inconsistentes'), '12 grupos y reviewReasons separados de corrupción real');
      check('T-V2FP-17', !groupText.includes('GAC-V1-'), 'identificador técnico oculto en operación normal');
      location.hash = '#/incidencias'; await new Promise(resolve => setTimeout(resolve, 250));
      check('T-V2FP-18', document.querySelector('#main-content').textContent.includes('BLOQUEADO — PENDIENTE DE CONCILIACIÓN'), 'staging/incidencias preservado');
      const { Layout } = await import('/app/js/ui/layout.js');
      const injectedTable = Layout.generateStagingTableHtml([{ id: 'XSS-SYNTHETIC', archivoOrigen: '<script>alert(1)</script>',
        hojaOrigen: 'TEST', filaOrigen: 1, numeroDocumentoOriginal: '', nombreCompletoOriginal: '<img src=x onerror=alert(1)>',
        programaOriginal: 'TEST', estado: 'LISTO', incidencias: [{ codigo: '<script>bad()</script>', severidad: 'ALTA' }] }]);
      check('T-V2FP-18B', !injectedTable.includes('<script>') && !injectedTable.includes('<img ') && injectedTable.includes('&lt;script&gt;'), 'XSS staging escapado');
      location.hash = '#/configuracion-academica'; await new Promise(resolve => setTimeout(resolve, 300));
      const configurationText = document.querySelector('#main-content').textContent;
      check('T-V2FP-19', configurationText.includes('Periodo académico') && configurationText.includes('Asignación de módulo por grupo') && configurationText.includes('Unidades didácticas por módulo'), 'configuración académica productiva y guiada');
      check('T-V2FP-20', Boolean(document.querySelector('#mvp-period-form') && document.querySelector('#mvp-module-form') && document.querySelector('#mvp-unit-form')) && configurationText.includes('fuente autorizada'), 'altas habilitadas solo con procedencia explícita');
      location.hash = '#/respaldo'; await new Promise(resolve => setTimeout(resolve, 220));
      check('T-V2FP-21', Boolean(document.querySelector('#btn-export-backup') && document.querySelector('#backup-restore-file') &&
        document.querySelector('#btn-restore-backup')?.disabled) && document.querySelector('#main-content').textContent.includes('prebackup'), 'respaldo y restauración con preflight, prebackup y confirmación');
      const { ActiveStorageService } = await import('/app/js/services/active-storage-service.js');
      const backup = await ActiveStorageService.exportBackup({ origin: 'V2_FUNCTIONAL_PARITY_TEST' });
      const backupInfo = await ActiveStorageService.inspectBackup(backup);
      check('T-V2FP-22', backupInfo.valid && backupInfo.schemaVersion === 2 && backupInfo.stores === 18 && backupInfo.referentialIssues === 0, 'backup v2 válido');
      const backupText = document.querySelector('#main-content')?.textContent || '';
      check('T-V2FP-22B', backupText.includes('checksum SHA-256') && backupText.includes('prebackup') && backupText.includes('lectura posterior'), 'UX explica checksum, prebackup y lectura posterior en lenguaje operativo');
      check('T-V2FP-22C', document.querySelector('#btn-restore-backup')?.disabled === true && before.matriculas.length === 295, 'restore inactivo hasta validar un archivo y confirmar');

      location.hash = '#/documentos'; await new Promise(resolve => setTimeout(resolve, 250));
      const select = document.querySelector('#doc-template-select');
      select.value = 'TMPL-02'; select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 180));
      const search = document.querySelector('#doc-context-search'); search.value = 'GRP-BD'; search.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 350));
      document.querySelector('.document-context-result')?.click(); await new Promise(resolve => setTimeout(resolve, 350));
      check('T-V2FP-23', document.querySelectorAll('.document-context-result').length === 50, 'búsqueda real TMPL-02');
      check('T-V2FP-24', document.querySelector('#doc-generate-btn')?.disabled === false && document.querySelector('#doc-preflight-summary')?.textContent.includes('Vista previa permitida'), 'binding/validación documental');
      document.querySelector('#doc-generate-btn')?.click();
      for (let i = 0; i < 50 && !document.querySelector('iframe[title="Vista previa PDF TMPL-02"]'); i += 1) await new Promise(resolve => setTimeout(resolve, 100));
      check('T-V2FP-25', Boolean(document.querySelector('iframe[title="Vista previa PDF TMPL-02"]')), 'Blob PDF visible');
      check('T-V2FP-26', Boolean(document.querySelector('a[download$=".pdf"]') && document.querySelector('#doc-print-pdf-btn')), 'descarga e impresión');
      check('T-V2FP-27', document.querySelector('script[src*="pdf-lib.min.js"]')?.src.includes('/app/vendor/'), 'pdf-lib local');
      const after = await readV2Snapshot(db);
      check('T-V2FP-28', canonicalize(after) === beforeCanonical, 'navegación/preview/backup sin escrituras');
      check('T-V2FP-29', after.periodos.length === 0 && after.unidades.length === 0 && after.grupos_academicos.every(row => row.moduloId === null), 'bloqueos académicos intactos');
      return { results, counts, routeStates };
    });

    const [configSource, entrySource, candidateHtml] = await Promise.all([
      page.evaluate(() => fetch('/app/js/config.js').then(response => response.text())),
      page.evaluate(() => fetch('/app/js/v2-candidate/candidate-entry.js').then(response => response.text())),
      page.evaluate(() => fetch('/app-v2/index.html').then(response => response.text()))
    ]);
    outcome.results.push({ id: 'T-V2FP-30', passed: /runtime\?\.dbVersion \|\| 1/.test(configSource) && configSource.includes("'CETPRO_DB'") && entrySource.includes("'CETPRO_V2_CANDIDATE'") && candidateHtml.includes('candidate-entry.js') && !candidateHtml.includes('candidate-app.js'), detail: 'v1 default + entry v2 explícito' });
    outcome.results.push({ id: 'T-V2FP-31', passed: await up(V1_URL) && await up(V2_URL), detail: '8080 y 8081 coexistentes' });
    outcome.results.push({ id: 'T-V2FP-32', passed: external.length === 0, detail: `red externa=${external.length}` });
    outcome.results.push({ id: 'T-V2FP-33', passed: httpErrors.length === 0, detail: `HTTP>=400=${httpErrors.length}` });
    outcome.results.push({ id: 'T-V2FP-34', passed: errors.length === 0, detail: `errores JS=${errors.length}: ${errors.slice(0, 2).join(' | ')}` });
    for (const result of outcome.results) console.log(`[${result.passed ? 'PASSED' : 'FAILED'}] ${result.id}: ${result.detail}`);
    return { total: outcome.results.length, passed: outcome.results.filter(item => item.passed).length,
      failed: outcome.results.filter(item => !item.passed).length,
      summary: { counts: outcome.counts, routes: outcome.routeStates.length, errors: errors.length, external: external.length } };
  } finally {
    await browser.close();
    if (v1Server) v1Server.kill();
    if (v2Server) v2Server.kill();
  }
}

module.exports = { name: 'V2-FUNCTIONAL-PARITY-01', run };
