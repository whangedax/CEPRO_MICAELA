const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:8080/app/index.html';

async function buildProductiveData() {
  const stamp = Date.now();
  const [{ STAGING_DATA }, { ProductiveImportService }, { EnrollmentService }] = await Promise.all([
    import(`${pathToFileURL(path.join(ROOT, 'app/js/data/staging-data.js')).href}?gate=${stamp}`),
    import(`${pathToFileURL(path.join(ROOT, 'app/js/services/productive-import-service.js')).href}?gate=${stamp}`),
    import(`${pathToFileURL(path.join(ROOT, 'app/js/services/enrollment-service.js')).href}?gate=${stamp}`)
  ]);
  const studentsBuild = ProductiveImportService.buildStudentsFromStaging(STAGING_DATA);
  const enrollmentsBuild = EnrollmentService.buildEnrollmentsFromStaging(Array.from(studentsBuild.updatedStagingItemsMap.values()));
  return { students: studentsBuild.newStudents, enrollments: enrollmentsBuild.newEnrollments };
}

async function countStores(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('CETPRO_DB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const names = ['institucion', 'programas', 'modulos', 'periodos', 'unidades', 'estudiantes', 'matriculas', 'asistencia', 'evaluacion', 'efsrt', 'documentos', 'staging_importaciones'];
    const counts = {};
    for (const name of names) {
      counts[name] = await new Promise((resolve, reject) => {
        const request = db.transaction(name, 'readonly').objectStore(name).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    db.close();
    return counts;
  });
}

async function run() {
  const productive = await buildProductiveData();
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  let currentRoute = '#/inicio';
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({ route: currentRoute, text: message.text(), url: message.location()?.url || '' });
  });
  page.on('pageerror', error => pageErrors.push({ route: currentRoute, text: error.message }));
  page.on('dialog', dialog => dialog.accept());
  const audit = {};

  async function navigate(route, selector = 'h2') {
    currentRoute = route;
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector(selector);
    return page.$eval('h2', element => element.innerText.trim());
  }

  try {
    await navigate('#/inicio');
    await page.evaluate(async data => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('CETPRO_DB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['estudiantes', 'matriculas'], 'readwrite');
        data.students.forEach(record => tx.objectStore('estudiantes').put(record));
        data.enrollments.forEach(record => tx.objectStore('matriculas').put(record));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, productive);
    const initialCounts = await countStores(page);
    const firstEnrollment = productive.enrollments.find(enrollment => {
      const student = productive.students.find(item => item.id === enrollment.estudianteId);
      return student?.numeroDocumento;
    });
    const firstStudent = productive.students.find(student => student.id === firstEnrollment.estudianteId);

    const headingInicio = await navigate('#/inicio');
    audit.inicio = {
      heading: headingInicio,
      idbConnected: await page.$eval('#db-status-badge', element => element.innerText.includes('Conectado')),
      realEnrollmentCountVisible: await page.$eval('#main-content', element => element.innerText.includes('295')),
      visibleText: await page.$eval('#main-content', element => element.innerText.slice(0, 700))
    };

    const headingStudents = await navigate('#/estudiantes', '#student-search-input');
    await page.type('#student-search-input', firstStudent.numeroDocumento);
    await page.waitForFunction(() => document.querySelector('#student-count-badge')?.innerText.startsWith('1 '));
    const searchWorked = await page.$eval('#student-list-container', (element, documentNumber) => element.innerText.includes(documentNumber), firstStudent.numeroDocumento);
    await page.$eval('#student-search-input', element => { element.value = ''; element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#btn-new-student');
    await page.select('#form-tipoDoc', 'DNI');
    await page.type('#form-numeroDoc', 'IG010001');
    await page.type('#form-paterno', 'AUDITORIA');
    await page.type('#form-materno', 'AISLADA');
    await page.type('#form-nombres', 'ALTA TEMPORAL');
    await page.select('#form-sexo', 'H');
    await page.$eval('#student-form', form => form.requestSubmit());
    await page.waitForFunction(async () => {
      const db = await new Promise(resolve => { const req = indexedDB.open('CETPRO_DB'); req.onsuccess = () => resolve(req.result); });
      const records = await new Promise(resolve => { const req = db.transaction('estudiantes', 'readonly').objectStore('estudiantes').getAll(); req.onsuccess = () => resolve(req.result); });
      db.close();
      return records.some(record => record.numeroDocumento === 'IG010001');
    });
    await page.$eval('#student-search-input', element => { element.value = 'IG010001'; element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#student-count-badge')?.innerText.startsWith('1 ') && document.querySelector('#student-list-container')?.innerText.includes('IG010001'));
    await page.$$eval('.btn-edit-student', buttons => {
      const visible = buttons.find(button => button.offsetParent !== null);
      if (!visible) throw new Error('No existe botón Editar visible.');
      visible.click();
    });
    await page.waitForFunction(() => document.querySelector('#student-modal')?.style.display === 'flex' && document.querySelector('#form-student-id')?.value);
    await page.$eval('#form-nombres', element => { element.value = 'EDICION PERSISTIDA'; });
    await page.$eval('#student-form', form => form.requestSubmit());
    await new Promise(resolve => setTimeout(resolve, 750));
    const editWorked = await page.evaluate(async () => {
      const db = await new Promise(resolve => { const req = indexedDB.open('CETPRO_DB'); req.onsuccess = () => resolve(req.result); });
      const records = await new Promise(resolve => { const req = db.transaction('estudiantes', 'readonly').objectStore('estudiantes').getAll(); req.onsuccess = () => resolve(req.result); });
      db.close();
      return records.some(record => record.numeroDocumento === 'IG010001' && record.nombres === 'EDICION PERSISTIDA');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#student-search-input');
    await page.type('#student-search-input', 'IG010001');
    await page.waitForFunction(() => document.querySelector('#student-list-container')?.innerText.includes('IG010001'));
    const persistedAfterReload = await page.$eval('#student-list-container', element => element.innerText.includes('EDICION PERSISTIDA'));
    audit.estudiantes = { heading: headingStudents, searchWorked, createWorked: true, editWorked, persistedAfterReload };

    const headingEnrollments = await navigate('#/matriculas', '#enrollment-search-input');
    await page.type('#enrollment-search-input', firstEnrollment.id);
    await page.waitForFunction(() => document.querySelector('#enrollment-count-badge')?.innerText.startsWith('1 '));
    await page.$$eval('.btn-view-enrollment', buttons => {
      const visible = buttons.find(button => button.offsetParent !== null);
      if (!visible) throw new Error('No existe botón Ver Detalle visible.');
      visible.click();
    });
    await page.waitForFunction(() => document.querySelector('#enrollment-detail-modal')?.style.display === 'flex');
    audit.matriculas = {
      heading: headingEnrollments,
      searchWorked: await page.$eval('#enrollment-list-container', (element, id) => element.innerText.includes(id), firstEnrollment.id),
      detailWorked: await page.$eval('#enrollment-detail-modal', element => element.style.display === 'flex'),
      groupConfigurationAvailable: Boolean(await page.$('#btn-group-config')),
      periodBlocked: initialCounts.periodos === 0
    };

    const headingPrograms = await navigate('#/programas', '#search-program');
    const programCards = await page.$$eval('#programs-container > .card', cards => cards.length);
    await page.type('#search-program', 'ZZZ-SIN-COINCIDENCIA');
    await page.waitForFunction(() => document.querySelector('#programs-container')?.innerText.includes('No se encontraron'));
    audit.programas = { heading: headingPrograms, catalogCardsBeforeFilter: programCards, emptySearchStateWorked: true, searchWorked: true };

    const headingRegistro = await navigate('#/registro', '#attendance-content-panel');
    audit.registro = { heading: headingRegistro, productionBlocked: await page.$eval('#attendance-content-panel', element => element.innerText.includes('CONFIGURACIÓN ACADÉMICA PENDIENTE')), testOnlyControlVisible: Boolean(await page.$('#btn-toggle-m06-test-mode')) };

    const headingEfsrt = await navigate('#/efsrt', '#btn-toggle-efsrt-test-mode');
    audit.efsrt = { heading: headingEfsrt, productionBlocked: (await page.$eval('#main-content', element => element.innerText)).includes('CONFIGURACIÓN ACADÉMICA PENDIENTE'), testOnlyControlVisible: true };

    const headingClosure = await navigate('#/cierre', '#select-matricula-closure');
    audit.cierre = { heading: headingClosure, readsEnrollment: (await page.$eval('#main-content', element => element.innerText)).includes('MAT-IMP-BD-001'), officialClosureBlocked: (await page.$eval('#main-content', element => element.innerText)).includes('CIERRE ACADÉMICO REAL: BLOQUEADO') };

    const headingDocuments = await navigate('#/documentos', '#doc-template-select');
    await page.select('#doc-template-select', 'TMPL-02');
    await page.waitForSelector('#doc-context-search');
    const disabledBeforeSearch = await page.$eval('#doc-generate-btn', button => button.disabled);
    await page.type('#doc-context-search', firstEnrollment.id);
    await page.waitForSelector('.document-context-result');
    const disabledAfterSearch = await page.$eval('#doc-generate-btn', button => button.disabled);
    await page.click('.document-context-result');
    await page.waitForFunction(() => document.querySelector('#doc-generate-btn')?.disabled === false);
    const selectedSummary = await page.$eval('#doc-context-summary', (element, id) => element.innerText.includes('MATRÍCULA SELECCIONADA') && element.innerText.includes(id), firstEnrollment.id);
    await page.click('#doc-generate-btn');
    await page.waitForFunction(() => document.querySelector('iframe[title="Vista previa PDF TMPL-02"]') || document.querySelector('#doc-render-workspace')?.innerText.includes('No se pudo generar'));
    const pdfResult = await page.evaluate(async () => {
      const iframe = document.querySelector('iframe[title="Vista previa PDF TMPL-02"]');
      const download = document.querySelector('a[download^="TMPL02_Ficha_Matricula_"]');
      if (!iframe) return { ready: false, message: document.querySelector('#doc-render-workspace')?.innerText || '' };
      const blob = await (await fetch(iframe.src)).blob();
      return { ready: Boolean(download?.href.startsWith('blob:')) && blob.type === 'application/pdf' && blob.size > 0, message: '' };
    });
    await page.select('#doc-template-select', 'TMPL-01');
    await page.waitForFunction(() => document.body.innerText.includes('Nómina pendiente de conexión productiva por grupo.'));
    const tmpl01Disabled = await page.$eval('#doc-generate-btn', button => button.disabled && button.getAttribute('aria-disabled') === 'true');
    audit.documentos = { heading: headingDocuments, disabledBeforeSearch, disabledAfterSearch, selectedSummary, pdfReady: pdfResult.ready, generationMessage: pdfResult.message, tmpl01Disabled };

    const headingIncidents = await navigate('#/incidencias', '#staging-search');
    await page.type('#staging-search', firstStudent.numeroDocumento);
    await page.waitForFunction(() => document.querySelector('#staging-table-container')?.innerText.length > 0);
    audit.incidencias = { heading: headingIncidents, realStagingVisible: (await page.$eval('#main-content', element => element.innerText)).includes('295'), searchWorked: await page.$eval('#staging-table-container', (element, doc) => element.innerText.includes(doc), firstStudent.numeroDocumento) };

    const headingBackup = await navigate('#/respaldo', '#btn-export-backup');
    await page.evaluate(() => {
      window.__gateDownload = null;
      HTMLAnchorElement.prototype.click = function () { window.__gateDownload = { download: this.download, href: this.href }; };
    });
    await page.click('#btn-export-backup');
    await page.waitForFunction(() => window.__gateDownload !== null);
    audit.respaldo = { heading: headingBackup, exportWorked: await page.evaluate(() => window.__gateDownload.download.startsWith('CETPRO_BACKUP_') && window.__gateDownload.href.startsWith('blob:')) };

    const errorsBeforeConfig = consoleErrors.length + pageErrors.length;
    const headingConfig = await navigate('#/configuracion', '#btn-save-institution');
    const missingInstitutionInputs = await page.evaluate(() => ['inst-telefono', 'inst-correo', 'inst-resolucion'].filter(id => !document.getElementById(id)));
    await page.click('#btn-save-institution');
    await new Promise(resolve => setTimeout(resolve, 250));
    audit.configuracion = {
      heading: headingConfig,
      idbDiagnosticVisible: (await page.$eval('#main-content', element => element.innerText)).includes('CETPRO_DB'),
      periodFormAvailable: Boolean(await page.$('#btn-create-period')),
      institutionSaveBroken: missingInstitutionInputs.length === 3,
      missingInstitutionInputs,
      errorsRaisedBySave: consoleErrors.length + pageErrors.length - errorsBeforeConfig
    };

    const finalCounts = await countStores(page);
    const routeHeadingsLoaded = Object.values(audit).every(item => Boolean(item.heading));
    const unexpectedErrors = consoleErrors.filter(error => !error.url.endsWith('/favicon.ico') && error.route !== '#/configuracion').concat(pageErrors.filter(error => error.route !== '#/configuracion'));
    const result = { url: page.url(), initialCounts, finalCounts, audit, routeHeadingsLoaded, unexpectedErrors, consoleErrors, pageErrors };
    console.log(JSON.stringify(result, null, 2));
    const documentsPassed = audit.documentos.disabledBeforeSearch && audit.documentos.disabledAfterSearch && audit.documentos.selectedSummary && audit.documentos.pdfReady && audit.documentos.tmpl01Disabled;
    const coreRoutesLoaded = audit.inicio.idbConnected && audit.estudiantes.searchWorked && audit.matriculas.searchWorked && audit.programas.searchWorked && audit.incidencias.searchWorked && audit.respaldo.exportWorked;
    if (!routeHeadingsLoaded || !documentsPassed || !coreRoutesLoaded) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
