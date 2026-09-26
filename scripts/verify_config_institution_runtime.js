const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
async function buildCase() {
  const [{ STAGING_DATA }, { ProductiveImportService }, { EnrollmentService }] = await Promise.all([
    import(pathToFileURL(path.join(ROOT, 'app/js/data/staging-data.js')).href),
    import(pathToFileURL(path.join(ROOT, 'app/js/services/productive-import-service.js')).href),
    import(pathToFileURL(path.join(ROOT, 'app/js/services/enrollment-service.js')).href)
  ]);
  const studentsBuild = ProductiveImportService.buildStudentsFromStaging(STAGING_DATA);
  const enrollmentsBuild = EnrollmentService.buildEnrollmentsFromStaging(Array.from(studentsBuild.updatedStagingItemsMap.values()));
  const students = new Map(studentsBuild.newStudents.map(item => [item.id, item]));
  const enrollment = enrollmentsBuild.newEnrollments.find(item => students.get(item.estudianteId)?.numeroDocumento);
  return { students: studentsBuild.newStudents, enrollments: enrollmentsBuild.newEnrollments, enrollment };
}
async function readCounts(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('CETPRO_DB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const counts = {};
    for (const [key, store] of Object.entries({ students: 'estudiantes', enrollments: 'matriculas',
      staging: 'staging_importaciones', periods: 'periodos', documents: 'documentos' })) {
      counts[key] = await new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    db.close();
    return counts;
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
        for (const student of students) tx.objectStore('estudiantes').put(student);
        for (const enrollment of enrollments) tx.objectStore('matriculas').put(enrollment);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, sample);
    const countsBefore = await readCounts(page);
    await page.goto('http://127.0.0.1:8080/app/index.html#/configuracion', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#form-institution');
    const before = await page.evaluate(() => ({
      phone: document.querySelector('#inst-telefono')?.value,
      dre: document.querySelector('#inst-dre')?.value,
      code: document.querySelector('#inst-codigoModular')?.value,
      pendingBlank: ['dre', 'codigoModular', 'departamento', 'provincia', 'distrito']
        .every(field => document.querySelector(`#inst-${field}`)?.value === '')
    }));
    await page.evaluate(() => {
      document.querySelector('#inst-nombre').value = 'CETPRO ACTUALIZADO AISLADO';
      document.querySelector('#inst-telefono').value = ' NUEVO-TELEFONO ';
      document.querySelector('#inst-dre').value = ' DRE-OFICIAL-FUTURA ';
      document.querySelector('#inst-codigoModular').value = ' CODIGO-MODULAR-FUTURO ';
      document.querySelector('#inst-confirm-source').checked = true;
      document.querySelector('#btn-save-institution').click();
    });
    await page.waitForFunction(() => document.querySelector('#institution-save-status')?.textContent.trim() !== '');
    const saveStatus = await page.$eval('#institution-save-status', element => element.textContent.trim());
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#form-institution');
    const reloaded = await page.evaluate(async () => {
      const { CatalogService } = await import('/app/js/services/catalog-service.js');
      const { InstitutionService } = await import('/app/js/services/institution-service.js');
      const fields = ['nombre', 'telefono', 'dre', 'codigoModular'];
      const fromForm = Object.fromEntries(fields.map(field => [field, document.querySelector(`#inst-${field}`)?.value]));
      const beforeCatalog = await InstitutionService.getInstitutionProfile();
      await CatalogService.initializeCatalogs();
      const afterCatalog = await InstitutionService.getInstitutionProfile();
      return { fromForm, beforeCatalog, afterCatalog };
    });
    const audit = await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('CETPRO_DB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const events = await new Promise((resolve, reject) => {
        const request = db.transaction('auditoria', 'readonly').objectStore('auditoria').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      const event = events.find(item => item.entidad === 'INSTITUCION' && item.idEntidad === 'INST-001' &&
        item.accion === 'MODIFICACION' && item.estadoNuevo?.telefono === 'NUEVO-TELEFONO');
      return { found: Boolean(event), previousPhone: event?.estadoAnterior?.telefono,
        newPhone: event?.estadoNuevo?.telefono };
    });
    const contract = await page.evaluate(async enrollmentId => {
      const { DocumentDataService } = await import('/app/js/services/document-data-service.js');
      const { resolveDocumentFields } = await import('/app/js/services/document-field-contract.js');
      const context = await new DocumentDataService().buildEnrollmentContext(enrollmentId);
      const fields = Object.fromEntries(resolveDocumentFields('TMPL-02', context)
        .map(field => [field.key, { status: field.status, value: field.value }]));
      return { institution: context.institution, fields };
    }, sample.enrollment.id);
    await page.goto('http://127.0.0.1:8080/app/index.html#/documentos', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#doc-template-select');
    await page.select('#doc-template-select', 'TMPL-02');
    await page.type('#doc-context-search', sample.enrollment.id);
    await page.waitForSelector('.document-context-result');
    await page.evaluate(() => Array.from(document.querySelectorAll('.document-context-result'))
      .find(element => element.offsetParent !== null)?.click());
    await page.waitForFunction(() => document.querySelector('#doc-generate-btn')?.disabled === false);
    await page.$eval('#doc-generate-btn', button => button.click());
    await page.waitForFunction(() =>
      document.querySelector('iframe[title="Vista previa PDF TMPL-02"]')?.src.startsWith('blob:') ||
      document.querySelector('#doc-flow-state')?.dataset.state === 'ERROR');
    const pdf = await page.evaluate(async () => {
      const iframe = document.querySelector('iframe[title="Vista previa PDF TMPL-02"]');
      if (!iframe?.src.startsWith('blob:')) return { ready: false, error: document.querySelector('#doc-flow-state')?.innerText };
      const blob = await (await fetch(iframe.src)).blob();
      return { ready: true, size: blob.size, type: blob.type };
    });
    const countsAfter = await readCounts(page);
    await page.select('#doc-template-select', 'TMPL-01');
    await page.waitForFunction(() => document.body.innerText.includes('Nómina pendiente de conexión productiva por grupo.'));
    const tmpl01Blocked = await page.$eval('#doc-generate-btn', button => button.disabled);
    const passed = before.pendingBlank && saveStatus === 'Datos institucionales actualizados.' &&
      reloaded.fromForm.nombre === 'CETPRO ACTUALIZADO AISLADO' &&
      reloaded.fromForm.telefono === 'NUEVO-TELEFONO' &&
      reloaded.fromForm.dre === 'DRE-OFICIAL-FUTURA' &&
      reloaded.fromForm.codigoModular === 'CODIGO-MODULAR-FUTURO' &&
      reloaded.beforeCatalog.telefono === reloaded.afterCatalog.telefono &&
      reloaded.beforeCatalog.dre === reloaded.afterCatalog.dre &&
      reloaded.beforeCatalog.codigoModular === reloaded.afterCatalog.codigoModular &&
      reloaded.afterCatalog.sourceMigrationVersion === 'FUENTE_FISICA_INSTITUCIONAL_2026_V1' &&
      audit.found && audit.previousPhone === before.phone && audit.newPhone === 'NUEVO-TELEFONO' &&
      contract.fields['institution.nombre'].value === 'CETPRO ACTUALIZADO AISLADO' &&
      contract.fields['institution.dre'].status === 'CONFIRMED' &&
      contract.fields['institution.codigoModular'].status === 'CONFIRMED' &&
      pdf.ready && pdf.size > 0 && tmpl01Blocked &&
      countsBefore.students === 269 && countsBefore.enrollments === 295 &&
      countsBefore.staging === 295 && countsBefore.periods === 0 && countsBefore.documents === 0 &&
      JSON.stringify(countsBefore) === JSON.stringify(countsAfter) && jsErrors.length === 0;
    console.log(JSON.stringify({ passed, before, saveStatus, reloaded, audit, contract, pdf, countsBefore,
      countsAfter, tmpl01Blocked, jsErrors }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
module.exports = { buildCase, readCounts };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
