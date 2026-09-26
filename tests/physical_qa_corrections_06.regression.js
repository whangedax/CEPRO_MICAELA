const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const { fork } = require('child_process');
const { pathToFileURL } = require('url');
const PDFLib = require('pdf-lib');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://127.0.0.1:8081/';
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const up = () => new Promise(resolve => {
  const request = http.get(BASE_URL, response => { response.resume(); resolve(response.statusCode === 200); });
  request.on('error', () => resolve(false));
  request.setTimeout(1000, () => { request.destroy(); resolve(false); });
});
const wait = async () => {
  for (let i = 0; i < 40; i += 1) {
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

  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await wait();
  }
  const browser = await puppeteer.launch({ headless: true });
  let before;
  try {
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#db-status-badge')?.textContent.includes('Datos locales disponibles'));
    const snapshot = () => page.evaluate(async () => {
      const { getDB } = await import('/app/js/db/database.js');
      const { readV2Snapshot } = await import('/app/js/services/schema-v2-backup-lab-service.js');
      const db = getDB();
      const data = await readV2Snapshot(db);
      const counts = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length]));
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))]
        .map(value => value.toString(16).padStart(2, '0')).join('');
      return {
        dbName: db.name, version: db.version, storeCount: db.objectStoreNames.length, counts, digest,
        groupsUnassigned: data.grupos_academicos.every(group => group.moduloId == null && group.periodoId == null),
        academicEmpty: ['asistencia', 'evaluacion', 'efsrt'].every(store => data[store].length === 0)
      };
    });
    before = await snapshot();
    check('T-PQC06-DB-01', before.dbName === 'CETPRO_V2_CANDIDATE' && before.version === 2 && before.storeCount === 18,
      'candidata schema v2, 18 stores; CETPRO_DB fuera de alcance');
    check('T-PQC06-DB-02', before.counts.estudiantes === 269 && before.counts.matriculas === 295 &&
      before.counts.staging_importaciones === 295 && before.counts.grupos_academicos === 12 &&
      before.counts.programas === 7 && before.counts.modulos === 14 && before.counts.periodos === 0 && before.counts.unidades === 0,
      'snapshot exacto 269/295/295/12/7/14/0/0');
    check('T-PQC06-DB-03', before.groupsUnassigned && before.academicEmpty,
      'sin módulos/periodos asignados y sin escrituras académicas');

    await page.goto(`${BASE_URL}#/configuracion`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('#inst-source-status-dre');
    const provenanceUi = await page.evaluate(() => {
      const fields = ['dre', 'codigoModular', 'departamento', 'provincia', 'distrito'];
      const initial = fields.map(field => ({
        valueVisible: document.querySelector(`#inst-${field}`)?.offsetParent !== null,
        state: document.querySelector(`#inst-source-status-${field}`)?.dataset.state,
        label: document.querySelector(`#inst-source-status-${field}`)?.textContent
      }));
      const input = document.querySelector('#inst-dre');
      const original = input.value;
      input.value = `${original} CAMBIO SINTÉTICO`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const dirty = {
        state: document.querySelector('#inst-source-status-dre')?.dataset.state,
        label: document.querySelector('#inst-source-status-dre')?.textContent,
        checked: document.querySelector('#inst-confirm-source')?.checked
      };
      input.value = original;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { initial, dirty, heading: document.querySelector('#form-institution')?.textContent || '' };
    });
    check('T-PQC06-UX-01', provenanceUi.initial.every(item => item.valueVisible &&
      ['CONFIRMED', 'REVIEW_REQUIRED', 'EMPTY'].includes(item.state)), 'cinco campos visibles con procedencia explícita');
    check('T-PQC06-UX-02', provenanceUi.dirty.state === 'NEW_CHANGE' &&
      provenanceUi.dirty.label.includes('REQUIERE CONFIRMACIÓN') && provenanceUi.dirty.checked === false,
      'cambio nuevo queda sin confirmar; checkbox no reinterpreta el valor existente');
    check('T-PQC06-UX-03', provenanceUi.heading.includes('La casilla se aplica únicamente a cambios nuevos'),
      'texto UX distingue estado existente de cambios nuevos');

    global.window = { location: { origin: BASE_URL.slice(0, -1), href: BASE_URL }, PDFLib };
    const engineUrl = `${pathToFileURL(path.join(ROOT, 'app/js/services/pdf-template-engine.js')).href}?pqc06=${Date.now()}`;
    const registryUrl = `${pathToFileURL(path.join(ROOT, 'app/js/services/v2-document-manifest-registry.js')).href}?pqc06=${Date.now()}`;
    const provenanceUrl = `${pathToFileURL(path.join(ROOT, 'app/js/services/institution-provenance-service.js')).href}?pqc06=${Date.now()}`;
    const { PdfTemplateEngine } = await import(engineUrl);
    const { getV2PdfManifest, getV2PdfManifests } = await import(registryUrl);
    const { getInstitutionFieldProvenance } = await import(provenanceUrl);
    const engine = new PdfTemplateEngine();
    engine._loadResource = async url => fs.readFileSync(path.join(ROOT, new URL(url).pathname.replace(/^\//, '')));
    const confirmed = value => ({ status: 'RESOLVED', value });
    const fields = name => ({
      'student.fullName': confirmed(name),
      'document.officialTitleText': confirmed('AUXILIAR TÉCNICO DE PRUEBA'),
      'document.registerCode': confirmed('ABC01234')
    });
    const pageCount = async blob => (await PDFLib.PDFDocument.load(await blob.arrayBuffer())).getPageCount();

    const manifest21 = getV2PdfManifest('TMPL-21');
    const physical21 = manifest21.physicalFields;
    check('T-PQC06-21-01', physical21.length === 2 && physical21.some(field => field.canonicalKey === 'student.fullName' &&
      field.y === 255.75 && field.height === 20) && physical21.some(field => field.canonicalKey === 'document.officialTitleText' &&
      field.y === 318 && field.height === 26.69), 'dos cajas inequívocas en página 1');
    check('T-PQC06-21-02', !physical21.some(field => field.canonicalKey === 'document.registerCode') &&
      manifest21.fields.find(field => field.canonicalKey === 'document.registerCode')?.geometryStatus === 'REVIEW_REQUIRED',
      'código de registro no se pinta sobre el logo');
    check('T-PQC06-21-03', manifest21.reservedRegions.some(region => region.id === 'PAGE2_RESERVED_LOGO') &&
      manifest21.reservedRegions.some(region => region.id === 'PAGE1_FIXED_MAIN_PARAGRAPH'),
      'logo y texto fijo registrados como regiones reservadas');

    const names = ['JUAN PEREZ', "ESTUDIANTE DE PRUEBA ÑANDÚ O'CONNOR", 'MARÍA DEL CARMEN QUISPE MAMANI',
      "MARÍA DEL CARMEN O'CONNOR QUISPE MAMANI DE LA CRUZ Y FERNÁNDEZ DE LA VEGA"];
    for (let i = 0; i < names.length; i += 1) {
      const blob = await engine.renderTMPL21({ resolvedFieldSet: fields(names[i]) });
      check(`T-PQC06-21-NAME-${i + 1}`, await pageCount(blob) === 2 &&
        engine.lastRenderDiagnostics.fields.length === 2 &&
        engine.lastRenderDiagnostics.fields.every(field => field.status === 'DRAWN'),
      `nombre sintético ${i + 1}: AutoFit sin truncado ni omisión`);
    }
    let overflow;
    try { await engine.renderTMPL21({ resolvedFieldSet: fields('NOMBRE EXTENSO '.repeat(300)) }); }
    catch (error) { overflow = error; }
    check('T-PQC06-21-OVERFLOW', overflow?.code === 'FIELD_OVERFLOW' &&
      engine.lastRenderDiagnostics.fields.some(field => field.status === 'FIELD_OVERFLOW'),
      'overflow fail-closed, sin PDF exitoso');

    const injected = { id: 'SYNTHETIC_CONFLICT', kind: 'RESERVED', page: 1, x: 163.42, y: 255.75, width: 623.93, height: 20 };
    manifest21.reservedRegions.unshift(injected);
    let conflict;
    try { await engine.renderTMPL21({ resolvedFieldSet: fields('JUAN PEREZ') }); }
    catch (error) { conflict = error; }
    finally { manifest21.reservedRegions.shift(); }
    check('T-PQC06-21-CONFLICT', conflict?.code === 'GEOMETRY_CONFLICT' && conflict.conflictId === 'SYNTHETIC_CONFLICT' &&
      engine.lastRenderDiagnostics.fields.some(field => field.status === 'GEOMETRY_CONFLICT'),
      'colisión reservada se bloquea explícitamente');

    const tableRows = count => Array.from({ length: count }, (_, index) => ({
      'student.fullName': `ESTUDIANTE DE PRUEBA ${index + 1}`,
      'student.documentNumber': 'ABC01234', 'curriculum.unit.name': `UNIDAD DE PRUEBA ${index + 1}`,
      'evaluation.unitResult': '18'
    }));
    for (const count of [0, 1, 8]) {
      const blob = await engine.renderTMPL20({ resolvedFieldSet: fields('JUAN PEREZ'), rows: tableRows(count), counts: { detailRows: count } });
      check(`T-PQC06-20-${count}`, await pageCount(blob) === 2, `TMPL-20 conserva dos páginas con ${count} filas`);
    }
    let tmpl20Over;
    try { await engine.renderTMPL20({ resolvedFieldSet: fields('JUAN PEREZ'), rows: tableRows(9), counts: { detailRows: 9 } }); }
    catch (error) { tmpl20Over = error; }
    check('T-PQC06-20-9', tmpl20Over?.code === 'CAPACITY_EXCEEDED', 'TMPL-20 rechaza 9 > 8');

    for (const count of [1, 20, 21, 40]) {
      const blob = await engine.renderTMPL19({ rows: tableRows(count) });
      check(`T-PQC06-19-${count}`, await pageCount(blob) === 2, `TMPL-19 conserva 2 páginas con ${count} filas`);
    }
    let tmpl19Over;
    try { await engine.renderTMPL19({ rows: tableRows(41) }); } catch (error) { tmpl19Over = error; }
    check('T-PQC06-19-41', tmpl19Over?.code === 'CAPACITY_EXCEEDED', 'TMPL-19 rechaza 41 > 40');

    const unchangedHashes = {
      'TMPL-04': '337d8c77f556451eece7521a30bb48390fb8fa72c49995514655601026194026',
      'TMPL-05': '3edb2dcaba59dd2d9107dd8748711f83832e1858c0a9875249264b1ebc3e7f7c',
      'TMPL-11': '093d5022bf307b7b8c999174100c391961d54000162970f08af9c12098d076e2',
      'TMPL-18': '308b39345caff8063a5ed7fa7e72c0409ef5e30f93876b8184385efb3c002520'
    };
    check('T-PQC06-REGRESSION-HASHES', Object.entries(unchangedHashes).every(([id, expected]) =>
      sha256(fs.readFileSync(path.join(ROOT, `app/data/pdf-manifests/${id}.json`))) === expected),
      'TMPL-04/05/11/18 sin cambios de coordenadas');
    const m05 = getV2PdfManifest('TMPL-05');
    const m11 = getV2PdfManifest('TMPL-11');
    const m18 = getV2PdfManifest('TMPL-18');
    check('T-PQC06-REGRESSION-CAPACITY', m05.capacity.rows === 40 && m11.capacity.rows === 47 && m18.capacity.rows === 40,
      'capacidades 40/47/40 conservadas');
    check('T-PQC06-05-TOTALS', m05.physicalFields.some(field => field.canonicalKey === 'attendance.presentCount') &&
      m05.physicalFields.some(field => field.canonicalKey === 'attendance.absentCount') &&
      !m05.physicalFields.some(field => field.canonicalKey === 'attendance.absencePercent') &&
      m05.fields.find(field => field.canonicalKey === 'attendance.absencePercent')?.geometryStatus === 'REVIEW_REQUIRED',
      'totales sintéticos existentes; porcentaje no inventado');
    check('T-PQC06-11-18-SCOPE', !m11.physicalFields.some(field => field.canonicalKey.includes('indicator')) &&
      !m18.physicalFields.some(field => field.canonicalKey === 'efsrt.criterionScore'),
      'indicadores/criterios ambiguos permanecen sin pintar');

    const allHashesMatch = getV2PdfManifests().every(manifest => {
      const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
      return fs.existsSync(canonical) && sha256(fs.readFileSync(canonical)) === manifest.sha256;
    });
    check('T-PQC06-CANONICAL-21', allHashesMatch, '21/21 PDF canónicos conservan SHA-256');
    const configSource = read('app/js/config.js');
    check('T-PQC06-PRODUCTION-GUARD', configSource.includes("runtime?.dbVersion || 1") &&
      configSource.includes("runtime?.dbName || 'CETPRO_DB'"), 'CONFIG.DB.VERSION productiva permanece en 1');
    const qaSource = read('tools/document-renderer-qa.js');
    check('T-PQC06-QA-SCOPE', qaSource.includes("const AUTHORIZED_ORIGIN='http://127.0.0.1:8081'") &&
      !qaSource.includes('indexedDB') && !qaSource.includes('getDB') && qaSource.includes('GEOMETRY_CONFLICT'),
      'harness 8081, memoria, sin DB y con conflicto controlado');
    const documentsView = read('app/js/ui/documents-view.js');
    const tmpl02Boxes = json('app/data/TMPL02_PDF_FIELDS.json');
    check('T-PQC06-TMPL-01', qaSource.includes("'TMPL-01'") &&
      documentsView.includes("this.selectedTemplateId = 'TMPL-01'") && documentsView.includes('GROUP_PENDING_MESSAGE'),
      'TMPL-01 disponible solo en QA y bloqueada en la aplicación normal');
    check('T-PQC06-TMPL-02', Object.keys(tmpl02Boxes).length === 11 &&
      documentsView.includes('buildEnrollmentContext(enrollmentId)') &&
      documentsView.includes('validateDocument(template.templateId, context)') &&
      documentsView.includes('renderDocument.call(this.pdfEngine'),
      'TMPL-02 conserva matrícula→preflight→resolvedFieldSet→PDF y 11 bindings');
    check('T-PQC06-TMPL-03', qaSource.includes("if(templateId==='TMPL-03')return {reviewOnly:true") &&
      qaSource.includes("'REVIEW_REQUIRED'"), 'TMPL-03 continúa REVIEW_REQUIRED sin PDF');
    const runtimeSources = fs.readdirSync(path.join(ROOT, 'app/js'), { recursive: true })
      .filter(filename => filename.endsWith('.js'))
      .map(filename => read(`app/js/${filename.replaceAll('\\', '/')}`)).join('\n');
    check('T-PQC06-OFFLINE', !/(?:unpkg|cdnjs|cdn\.jsdelivr|fonts\.googleapis|fonts\.gstatic)/i.test(runtimeSources) &&
      read('app/index.html').includes('vendor/pdf-lib.min.js'), 'cero CDN runtime; pdf-lib local');
    const layoutSource = read('app/js/ui/layout.js');
    check('T-PQC06-SECURITY', !/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/.test(runtimeSources) &&
      layoutSource.includes("const value = escapeHtml(inst[field] || '')") &&
      layoutSource.includes('status.textContent = provenance.label') &&
      !layoutSource.includes('insertAdjacentHTML'), 'sin primitivas dinámicas; valores escapados y estados por textContent');

    const profile = { dre: 'VALOR', codigoModular: '', confirmedSources: ['institution.dre'] };
    check('T-PQC06-PROVENANCE-UNIT', getInstitutionFieldProvenance(profile, 'dre').code === 'CONFIRMED' &&
      getInstitutionFieldProvenance({ ...profile, confirmedSources: [] }, 'dre').code === 'REVIEW_REQUIRED' &&
      getInstitutionFieldProvenance(profile, 'codigoModular').code === 'EMPTY' &&
      getInstitutionFieldProvenance(profile, 'dre', 'CAMBIO').code === 'NEW_CHANGE',
      'estados A/B/C/D clasificados sin mutar metadatos');
    delete global.window;

    const after = await snapshot();
    check('T-PQC06-DB-04', after.dbName === before.dbName && after.version === before.version &&
      JSON.stringify(after.counts) === JSON.stringify(before.counts) && after.digest === before.digest,
      'snapshot candidato antes/después idéntico');
  } finally {
    delete global.window;
    await browser.close();
    if (server) server.kill();
  }

  return {
    total: results.length,
    passed: results.filter(row => row.passed).length,
    failed: results.filter(row => !row.passed).length,
    results
  };
}

module.exports = { name: 'PHYSICAL_QA_CORRECTIONS_06', run };
