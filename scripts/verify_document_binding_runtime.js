const puppeteer = require('puppeteer');
const { buildCase, readCounts } = require('./verify_config_institution_runtime.js');

async function extractText(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
  return (await (await pdf.getPage(1)).getTextContent()).items.map(item => item.str).join(' ');
}
async function chooseEnrollment(page, enrollmentId) {
  await page.goto('http://127.0.0.1:8080/app/index.html#/documentos', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#doc-template-select');
  await page.select('#doc-template-select', 'TMPL-02');
  await page.type('#doc-context-search', enrollmentId);
  await page.waitForSelector('.document-context-result');
  await page.evaluate(() => Array.from(document.querySelectorAll('.document-context-result'))
    .find(element => element.offsetParent !== null)?.click());
  await page.waitForFunction(() => document.querySelector('#doc-generate-btn')?.disabled === false);
  await page.$eval('#doc-generate-btn', button => button.click());
  await page.waitForFunction(() =>
    document.querySelector('iframe[title="Vista previa PDF TMPL-02"]')?.src.startsWith('blob:') ||
    document.querySelector('#doc-flow-state')?.dataset.state === 'ERROR');
  return page.evaluate(async () => {
    const iframe = document.querySelector('iframe[title="Vista previa PDF TMPL-02"]');
    if (!iframe?.src.startsWith('blob:')) throw new Error(document.querySelector('#doc-flow-state')?.innerText || 'PDF no generado');
    return Array.from(new Uint8Array(await (await (await fetch(iframe.src)).blob()).arrayBuffer()));
  });
}
async function run() {
  const sample = await buildCase();
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', error => jsErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /ReferenceError|TypeError|SyntaxError/.test(message.text())) jsErrors.push(message.text());
  });
  try {
    await page.goto('http://127.0.0.1:8080/app/index.html#/inicio', { waitUntil: 'networkidle0' });
    await page.evaluate(async ({ students, enrollments }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('CETPRO_DB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['estudiantes', 'matriculas'], 'readwrite');
        for (const item of students) tx.objectStore('estudiantes').put(item);
        for (const item of enrollments) tx.objectStore('matriculas').put(item);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, sample);
    const countsBefore = await readCounts(page);
    await page.goto('http://127.0.0.1:8080/app/index.html#/configuracion', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#form-institution');
    const pendingBlank = await page.evaluate(() => ['dre', 'codigoModular', 'departamento', 'provincia', 'distrito']
      .every(field => document.querySelector(`#inst-${field}`)?.value === ''));
    const values = { dre: 'DRE-TEST-CONFIRMADA', codigoModular: 'CM-TEST-001', departamento: 'DEP-TEST',
      provincia: 'PROV-TEST', distrito: 'DIST-TEST' };
    await page.evaluate(values => {
      for (const [field, value] of Object.entries(values)) document.querySelector(`#inst-${field}`).value = value;
      document.querySelector('#inst-confirm-source').checked = false;
      document.querySelector('#btn-save-institution').click();
    }, values);
    await page.waitForFunction(() => document.querySelector('#institution-save-status')?.textContent.trim() ===
      'No se pudieron guardar los datos institucionales.');
    const denied = await page.evaluate(async () => {
      const { InstitutionService } = await import('/app/js/services/institution-service.js');
      return { status: document.querySelector('#institution-save-status').textContent.trim(),
        profile: await InstitutionService.getInstitutionProfile() };
    });
    await page.evaluate(() => {
      document.querySelector('#inst-confirm-source').checked = true;
      document.querySelector('#btn-save-institution').click();
    });
    await page.waitForFunction(() => document.querySelector('#institution-save-status')?.textContent.trim() ===
      'Datos institucionales actualizados.');
    const checkboxCleared = await page.$eval('#inst-confirm-source', input => !input.checked);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#form-institution');
    const persistence = await page.evaluate(async () => {
      const { InstitutionService } = await import('/app/js/services/institution-service.js');
      const { CatalogService } = await import('/app/js/services/catalog-service.js');
      const before = await InstitutionService.getInstitutionProfile();
      await CatalogService.initializeCatalogs();
      const after = await InstitutionService.getInstitutionProfile();
      return { before, after };
    });
    const preflight = await page.evaluate(async enrollmentId => {
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { DocumentValidationService } = await import('/app/js/services/document-validation-service.js');
      const context = await new DocumentDataService().buildEnrollmentContext(enrollmentId);
      const result = new DocumentValidationService().validateDocument('TMPL-02', context);
      return { canPreview: result.canPreview, available: result.availableFields.length,
        mapped: result.mappedAvailableFields.length, unmapped: result.unmappedAvailableFields.length,
        five: Object.fromEntries(['dre', 'codigoModular', 'departamento', 'provincia', 'distrito']
          .map(field => [field, result.resolvedFieldSet[`institution.${field}`]])) };
    }, sample.enrollment.id);
    const firstBytes = await chooseEnrollment(page, sample.enrollment.id);
    const firstText = await extractText(firstBytes);
    const dynamic = await page.evaluate(async enrollmentId => {
      const { InstitutionService } = await import('/app/js/services/institution-service.js');
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { DocumentValidationService } = await import('/app/js/services/document-validation-service.js');
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const makePdf = async dre => {
        const current = await InstitutionService.getInstitutionProfile();
        await InstitutionService.updateInstitution({ nombre: current.nombre, dre }, 'SECRETARIA_TEST',
          { confirmPendingSources: ['dre'] });
        const context = await new DocumentDataService().buildEnrollmentContext(enrollmentId);
        const preflight = new DocumentValidationService().validateDocument('TMPL-02', context);
        const blob = await new PdfTemplateEngine().renderTMPL02({ resolvedFieldSet: preflight.resolvedFieldSet });
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      };
      return { A: await makePdf('DRE-A'), B: await makePdf('DRE-B') };
    }, sample.enrollment.id);
    const textA = await extractText(dynamic.A);
    const textB = await extractText(dynamic.B);
    const countsAfter = await readCounts(page);
    await page.select('#doc-template-select', 'TMPL-01');
    await page.waitForFunction(() => document.body.innerText.includes('Nómina pendiente de conexión productiva por grupo.'));
    const tmpl01Blocked = await page.$eval('#doc-generate-btn', button => button.disabled);
    const fiveVisible = Object.values(values).every(value => firstText.includes(value));
    const profileUnchangedByCatalog = Object.keys(values).every(field =>
      persistence.before[field] === values[field] && persistence.after[field] === values[field]);
    const passed = pendingBlank && denied.profile.dre === '' &&
      denied.status === 'No se pudieron guardar los datos institucionales.' && checkboxCleared &&
      profileUnchangedByCatalog && Object.keys(values).every(field =>
        persistence.after.confirmedSources.includes(`institution.${field}`)) &&
      persistence.after.sourceMigrationVersion === 'FUENTE_FISICA_INSTITUCIONAL_2026_V1' &&
      preflight.canPreview && preflight.available === 11 && preflight.mapped === 11 && preflight.unmapped === 0 &&
      fiveVisible && firstText.includes('DRE-TEST-CONFIRMADA') &&
      textA.includes('DRE-A') && !textA.includes('DRE-B') &&
      textB.includes('DRE-B') && !textB.includes('DRE-A') &&
      countsBefore.students === 269 && countsBefore.enrollments === 295 &&
      countsBefore.staging === 295 && countsBefore.periods === 0 && countsBefore.documents === 0 &&
      JSON.stringify(countsBefore) === JSON.stringify(countsAfter) && tmpl01Blocked && jsErrors.length === 0;
    console.log(JSON.stringify({ passed, pendingBlank, deniedStatus: denied.status, checkboxCleared,
      savedFive: Object.fromEntries(Object.keys(values).map(field => [field, persistence.after[field]])),
      confirmedSources: persistence.after.confirmedSources, preflight, fiveVisible,
      dynamic: { A: textA.includes('DRE-A'), B: textB.includes('DRE-B'), originalUnchanged: firstText.includes('DRE-TEST-CONFIRMADA') },
      countsBefore, countsAfter, tmpl01Blocked, jsErrors }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
