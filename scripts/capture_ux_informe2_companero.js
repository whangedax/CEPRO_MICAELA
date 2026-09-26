const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const COMPANERO_DIR = path.join(ROOT, 'CAPTURAS_INFORME_2_COMPAÑERO');

if (!fs.existsSync(COMPANERO_DIR)) {
  fs.mkdirSync(COMPANERO_DIR, { recursive: true });
}

async function saveShot(page, filename, options = {}) {
  const filePathLocal = path.join(COMPANERO_DIR, filename);
  const filePathArtifacts = path.join(ARTIFACTS_DIR, filename);

  const shotOpts = {
    path: filePathLocal,
    fullPage: options.fullPage !== undefined ? options.fullPage : false
  };

  await page.screenshot(shotOpts);
  fs.copyFileSync(filePathLocal, filePathArtifacts);
  console.log(`[CAPTURA GUARDADA] -> ${filename}`);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Iniciando batería de capturas UX para Informe 2 del compañero...');
  console.log('Resolución estándar: 1920x1080. Entorno: CETPRO_V2_DEMO.');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  page.on('dialog', async dialog => {
    console.log('Dialog detectado:', dialog.message());
    await dialog.accept();
  });

  // 0. Preparar entorno DEMO limpio (resetear para asegurar estado inicial idóneo)
  console.log('0. Preparando entorno DEMO limpio...');
  await page.goto(`${BASE}#/demo`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#demo-runtime-bar', { timeout: 15000 });
  await page.evaluate(async () => {
    try {
      const { DemoRuntimeService } = await import('./js/services/demo-runtime-service.js');
      await DemoRuntimeService.reset({ stayInDemo: true });
    } catch (e) {
      console.warn('Reset directo:', e.message);
    }
  });
  await delay(1000);
  await page.goto(`${BASE}#/demo`, { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(800);

  // 1. CAPTURA 01: Inicio del entorno DEMO (#/demo)
  console.log('1. Generando 01_companero_inicio_demo.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(400);
  await saveShot(page, '01_companero_inicio_demo.png');

  // 2. CAPTURA 02: Grupos Académicos (#/grupos)
  console.log('2. Navegando a #/grupos...');
  await page.goto(`${BASE}#/grupos`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('table.mvp-table', { timeout: 15000 });
  await delay(800);
  await saveShot(page, '02_companero_grupos.png');

  // 3. CAPTURA 03: Matrículas del grupo (#/matriculas filtrado por GRUPO DEMO A)
  console.log('3. Navegando a #/matriculas y filtrando por GRUPO DEMO A...');
  await page.goto(`${BASE}#/matriculas`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#candidate-enrollment-search', { timeout: 15000 });
  await delay(600);
  await page.type('#candidate-enrollment-search', 'GRUPO DEMO A');
  await delay(800);
  await saveShot(page, '03_companero_matriculas_grupo.png');

  // 4. CAPTURA 04: Registro Académico / Asistencia - Estado Inicial (#/registro)
  console.log('4. Navegando a #/registro para capturar estado inicial de asistencia...');
  await page.goto(`${BASE}#/registro`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#demo-att-workspace .demo-att-counts', { timeout: 15000 });
  await page.waitForSelector('.demo-att-state', { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(800);
  await saveShot(page, '04_companero_asistencia_estado_inicial.png');

  // 5. CAPTURA 05: Detalle del estudiante antes del cambio (encuadre enfocado en tabla y selectores)
  console.log('5. Capturando detalle del estudiante DEMO antes del cambio...');
  await page.evaluate(() => {
    window.scrollTo(0, 160);
  });
  await delay(600);
  await saveShot(page, '05_companero_asistencia_antes_cambio.png');

  // 6. CAPTURA 06: Modificación de asistencia (PRESENTE -> JUSTIFICADA + observación)
  console.log('6. Modificando estado de asistencia de ESTUDIANTE DEMO 001 a JUSTIFICADA...');
  await page.evaluate(() => {
    const firstSelect = document.querySelector('.demo-att-state');
    const firstObs = document.querySelector('.demo-att-observation');
    if (firstSelect) {
      firstSelect.value = 'JUSTIFICADA';
      firstSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (firstObs) {
      firstObs.value = 'Permiso médico presentado (DEMO)';
      firstObs.dispatchEvent(new Event('input', { bubbles: true }));
      firstObs.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await delay(800);
  await saveShot(page, '06_companero_asistencia_modificacion.png');

  // 7. CAPTURA 07: Guardado del cambio (clic en Guardar cambios DEMO con toast visible)
  console.log('7. Guardando cambios de asistencia DEMO...');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await delay(300);
  // Ejecutar el clic directo sobre el botón
  await page.evaluate(() => {
    const btn = document.querySelector('#demo-save-attendance');
    if (btn) btn.click();
  });
  await delay(400);
  try {
    await page.waitForSelector('#toast-container .toast-success', { timeout: 6000 });
  } catch (e) {
    console.warn('Toast wait:', e.message);
  }
  await delay(400);
  await saveShot(page, '07_companero_asistencia_guardada.png');

  // 8. CAPTURA 08: Comprobación de conteos (tarjetas métricas actualizadas y versión 2)
  console.log('8. Capturando conteos actualizados y versión 2...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(600);
  await saveShot(page, '08_companero_asistencia_conteos.png');

  // 9. CAPTURA 09: Persistencia del cambio (navegar a otra vista, volver y recargar)
  console.log('9. Verificando persistencia tras navegación y recarga...');
  await page.goto(`${BASE}#/inicio`, { waitUntil: 'networkidle0', timeout: 20000 });
  await delay(800);
  await page.goto(`${BASE}#/registro`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#demo-att-workspace .demo-att-counts', { timeout: 15000 });
  await page.waitForSelector('.demo-att-state', { timeout: 15000 });
  await delay(800);
  // Verificar en la DOM los valores persistidos
  const persistedData = await page.evaluate(() => {
    const sel = document.querySelector('.demo-att-state');
    const obs = document.querySelector('.demo-att-observation');
    const header = document.querySelector('.mvp-summary-header p');
    return {
      state: sel ? sel.value : null,
      observation: obs ? obs.value : null,
      versionInfo: header ? header.textContent : null
    };
  });
  console.log('Datos persistidos verificados en recarga:', persistedData);
  await saveShot(page, '09_companero_asistencia_persistencia.png');

  // 10. CAPTURA 10: Resultado final del proceso
  console.log('10. Capturando resultado final del proceso completo...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(500);
  await saveShot(page, '10_companero_resultado_final.png');

  // 11. CAPTURA 11: Padrón general de estudiantes (#/estudiantes)
  console.log('11. Navegando a #/estudiantes...');
  await page.goto(`${BASE}#/estudiantes`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#student-count-badge', { timeout: 15000 });
  await delay(800);
  await saveShot(page, '11_companero_estudiantes.png');

  // 12. CAPTURA 12: Programas y Módulos Curriculares (#/programas)
  console.log('12. Navegando a #/programas...');
  await page.goto(`${BASE}#/programas`, { waitUntil: 'networkidle0', timeout: 20000 });
  await delay(800);
  await saveShot(page, '12_companero_programas_modulos.png');

  // 13. CAPTURA 13: Respaldo y Restauración (#/respaldo)
  console.log('13. Navegando a #/respaldo...');
  await page.goto(`${BASE}#/respaldo`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#btn-export-backup', { timeout: 15000 });
  await delay(800);
  await saveShot(page, '13_companero_respaldo.png');

  // 14. CAPTURA 14: Respaldo Exportado con confirmación visible
  console.log('14. Ejecutando exportación de respaldo DEMO y capturando confirmación...');
  await page.evaluate(() => {
    const btn = document.querySelector('#btn-export-backup');
    if (btn) btn.click();
  });
  try {
    await page.waitForSelector('#toast-container .toast-success', { timeout: 8000 });
    await delay(400);
    await saveShot(page, '14_companero_respaldo_exportado.png');
  } catch (err) {
    console.warn('Toast de exportación no detectado a tiempo:', err.message);
  }

  // 15. CAPTURA 15: Panel Documental como contexto secundario (#/documentos)
  console.log('15. Navegando a #/documentos...');
  await page.goto(`${BASE}#/documentos`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#document-stage-tabs', { timeout: 15000 });
  await delay(800);
  await saveShot(page, '15_companero_documentos_contexto.png');

  await browser.close();
  console.log('================================================================');
  console.log('¡TODAS LAS CAPTURAS PARA EL INFORME 2 DEL COMPAÑERO COMPLETADAS!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('ERROR EN CAPTURAS DEL COMPAÑERO:', err);
  process.exit(1);
});
