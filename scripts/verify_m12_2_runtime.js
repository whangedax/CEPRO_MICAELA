const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');

async function buildOneRealCase() {
  const stamp = Date.now();
  const [{ STAGING_DATA }, { ProductiveImportService }, { EnrollmentService }] = await Promise.all([
    import(`${pathToFileURL(path.join(ROOT, 'app/js/data/staging-data.js')).href}?runtime=${stamp}`),
    import(`${pathToFileURL(path.join(ROOT, 'app/js/services/productive-import-service.js')).href}?runtime=${stamp}`),
    import(`${pathToFileURL(path.join(ROOT, 'app/js/services/enrollment-service.js')).href}?runtime=${stamp}`)
  ]);
  const studentsBuild = ProductiveImportService.buildStudentsFromStaging(STAGING_DATA);
  const enrollmentsBuild = EnrollmentService.buildEnrollmentsFromStaging(Array.from(studentsBuild.updatedStagingItemsMap.values()));
  const studentMap = new Map(studentsBuild.newStudents.map(student => [student.id, student]));
  const enrollment = enrollmentsBuild.newEnrollments.find(item => {
    const student = studentMap.get(item.estudianteId);
    return student?.numeroDocumento && student?.fechaNacimiento;
  });
  return { student: studentMap.get(enrollment.estudianteId), enrollment };
}

async function readCounts(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('CETPRO_DB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const names = ['estudiantes', 'matriculas', 'staging_importaciones', 'periodos', 'documentos'];
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
  const realCase = await buildOneRealCase();
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage();
  const consoleIssues = [];
  const appJsErrors = [];
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const issue = { text: message.text(), url: location?.url || '' };
    consoleIssues.push(issue);
    if (issue.url.includes('/app/js/') || /ReferenceError|TypeError|SyntaxError/.test(issue.text)) {
      appJsErrors.push(issue);
    }
  });
  page.on('pageerror', error => appJsErrors.push({ text: error.message, url: error.stack || '' }));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/app/js/')) {
      appJsErrors.push({ text: `HTTP ${response.status()}`, url: response.url() });
    }
  });

  try {
    await page.goto('http://127.0.0.1:8080/app/index.html#/inicio', { waitUntil: 'networkidle0' });
    await page.evaluate(async ({ student, enrollment }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('CETPRO_DB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['estudiantes', 'matriculas'], 'readwrite');
        tx.objectStore('estudiantes').put(student);
        tx.objectStore('matriculas').put(enrollment);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, realCase);

    await page.goto('http://127.0.0.1:8080/app/index.html#/documentos', { waitUntil: 'networkidle0' });
    let templateSelected = false;
    for (let attempt = 0; attempt < 3 && !templateSelected; attempt++) {
      await page.waitForSelector('#doc-template-select');
      try {
        await page.select('#doc-template-select', 'TMPL-02');
        templateSelected = true;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }
    await page.waitForSelector('#doc-context-search');

    const defaultState = await page.evaluate(() => ({
      modeSelectorAbsent: !document.querySelector('#tmpl02-mode-select'),
      generateDisabled: document.querySelector('#doc-generate-btn')?.disabled,
      generationButtonCount: document.querySelectorAll('#doc-generate-btn').length,
      forbiddenTermsAbsent: !['TEST_ONLY', 'TEST-0001', 'fixture', 'POC', 'modo técnico', 'renderer', 'Blob', 'payload']
        .some(term => document.body.innerText.toLowerCase().includes(term.toLowerCase()))
    }));

    await page.type('#doc-context-search', realCase.enrollment.id);
    await page.waitForSelector('.document-context-result');
    await page.evaluate(() => {
      const result = Array.from(document.querySelectorAll('.document-context-result'))
        .find(element => element.offsetParent !== null);
      result?.click();
    });
    await page.waitForFunction(() => document.querySelector('#doc-generate-btn')?.disabled === false);
    const selectionReady = await page.$eval('#doc-context-summary', element =>
      ['Estudiante:', 'Documento:', 'Programa:', 'Matrícula:', 'Grupo:'].every(label => element.innerText.includes(label))
    );
    const preflightVisible = await page.$eval('#doc-preflight-summary', element =>
      element.innerText.includes('Estado del documento') &&
      element.innerText.includes('Datos disponibles:') &&
      element.innerText.includes('Datos pendientes:') &&
      element.innerText.includes('Vista previa permitida. Emisión oficial bloqueada.') &&
      element.querySelector('#doc-field-details')?.textContent.includes('Código Modular')
    );

    const countsBefore = await readCounts(page);
    await page.$eval('#doc-generate-btn', button => button.click());
    await new Promise(resolve => setTimeout(resolve, 500));
    const generationSnapshot = await page.evaluate(() => ({
      state: document.querySelector('#doc-flow-state')?.dataset.state || '',
      message: document.querySelector('#doc-flow-state')?.innerText || '',
      workspace: document.querySelector('#doc-render-workspace')?.innerText || ''
    }));
    if (generationSnapshot.state !== 'GENERATING' && generationSnapshot.state !== 'READY' && generationSnapshot.state !== 'ERROR') {
      throw new Error(`El botón no inició la generación: ${JSON.stringify(generationSnapshot)}`);
    }
    await page.waitForFunction(() =>
      document.querySelector('iframe[title="Vista previa PDF TMPL-02"]')?.src.startsWith('blob:') ||
      document.querySelector('#doc-flow-state')?.dataset.state === 'ERROR'
    );
    const generationError = await page.$eval('#doc-flow-state', element =>
      element.dataset.state === 'ERROR' ? element.innerText.trim() : ''
    );
    if (generationError) {
      throw new Error(`Flujo documental en ERROR: ${generationError}`);
    }
    const pdfState = await page.evaluate(async () => {
      const iframe = document.querySelector('iframe[title="Vista previa PDF TMPL-02"]');
      const download = document.querySelector('a[download^="TMPL02_Ficha_Matricula_"]');
      const response = await fetch(iframe.src);
      const blob = await response.blob();
      return {
        iframeBlob: iframe.src.startsWith('blob:'),
        downloadBlob: download?.href.startsWith('blob:') || false,
        downloadName: download?.getAttribute('download') || '',
        blobType: blob.type,
        blobSizePositive: blob.size > 0
      };
    });
    const countsAfter = await readCounts(page);

    await page.select('#doc-template-select', 'TMPL-01');
    await page.waitForFunction(() => document.body.innerText.includes('Nómina pendiente de conexión productiva por grupo.'));
    const tmpl01State = await page.evaluate(() => ({
      pendingMessageVisible: document.body.innerText.includes('Nómina pendiente de conexión productiva por grupo.'),
      generateDisabled: document.querySelector('#doc-generate-btn')?.disabled,
      fixtureTermsAbsent: !/fixture|TEST_ONLY|1 Estudiante|10 Estudiantes|30 Estudiantes/i.test(document.body.innerText)
    }));

    console.log(JSON.stringify({
      url: page.url(),
      selectorVisible: true,
      searchReturned: true,
      selectionReady,
      preflightVisible,
      defaultState,
      pdfState,
      tmpl01State,
      countsBefore,
      countsAfter,
      countsUnchanged: JSON.stringify(countsBefore) === JSON.stringify(countsAfter),
      appJsErrors,
      consoleIssues
    }, null, 2));

    const passed = defaultState.modeSelectorAbsent && defaultState.generateDisabled === true &&
      defaultState.generationButtonCount === 1 && defaultState.forbiddenTermsAbsent && selectionReady && preflightVisible && pdfState.iframeBlob &&
      pdfState.downloadBlob && pdfState.blobType === 'application/pdf' && pdfState.blobSizePositive &&
      tmpl01State.pendingMessageVisible && tmpl01State.generateDisabled === true && tmpl01State.fixtureTermsAbsent &&
      JSON.stringify(countsBefore) === JSON.stringify(countsAfter) && countsAfter.periodos === 0 && appJsErrors.length === 0;
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

