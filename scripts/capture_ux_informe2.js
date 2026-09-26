const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const CAPTURAS_DIR = path.join(ROOT, 'capturas_ux_informe2');

if (!fs.existsSync(CAPTURAS_DIR)) {
  fs.mkdirSync(CAPTURAS_DIR, { recursive: true });
}

async function saveScreenshot(page, filename, options = {}) {
  const filePathRoot = path.join(ROOT, filename);
  const filePathCapturas = path.join(CAPTURAS_DIR, filename);
  const filePathArtifacts = path.join(ARTIFACTS_DIR, filename);

  const shotOpts = {
    path: filePathCapturas,
    fullPage: options.fullPage !== undefined ? options.fullPage : false
  };

  await page.screenshot(shotOpts);
  fs.copyFileSync(filePathCapturas, filePathRoot);
  fs.copyFileSync(filePathCapturas, filePathArtifacts);
  console.log(`[CAPTURA GUARDADA] -> ${filename}`);
}

async function run() {
  console.log('Iniciando captura de evidencias UX para Informe 2...');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1520, height: 960, deviceScaleFactor: 1 });

  // 1. Entrar en modo demostración para asegurar dataset uniforme y franja visible
  console.log('1. Navegando a #/demo para inicializar Modo Demostración...');
  await page.goto(`${BASE}#/demo`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#demo-runtime-bar', { timeout: 15000 });
  await page.waitForSelector('.mvp-metric-grid', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));

  // CAPTURA 1: 01_inicio_dashboard.png
  console.log('Generando 01_inicio_dashboard.png...');
  await saveScreenshot(page, '01_inicio_dashboard.png', { fullPage: false });

  // CAPTURA 2: 02_estudiantes.png
  console.log('2. Navegando a #/estudiantes...');
  await page.goto(`${BASE}#/estudiantes`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#student-count-badge', { timeout: 15000 });
  await page.waitForSelector('#student-table, table', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  await saveScreenshot(page, '02_estudiantes.png', { fullPage: false });

  // CAPTURA 3: 03_grupos_academicos.png
  console.log('3. Navegando a #/grupos...');
  await page.goto(`${BASE}#/grupos`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('table.mvp-table', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  await saveScreenshot(page, '03_grupos_academicos.png', { fullPage: false });

  // CAPTURA 4: 04_nomina_grupo.png
  console.log('4. Navegando a #/nominas y generando nómina con visor integrado...');
  await page.goto(`${BASE}#/nominas`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#roster-group', { timeout: 15000 });

  // Seleccionar grupo con matrículas si no está seleccionado
  const groupSelectVal = await page.evaluate(() => {
    const sel = document.querySelector('#roster-group');
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return sel.value;
    }
    return null;
  });
  console.log('Grupo seleccionado para nómina:', groupSelectVal);
  await page.waitForSelector('#generate-tmpl01', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 500));

  console.log('Haciendo clic en "Generar Nómina completa"...');
  await page.click('#generate-tmpl01');
  await page.waitForSelector('#roster-generation-status.alert-success', { timeout: 20000 });
  await page.waitForSelector('#roster-pdf iframe', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1200));

  // Mantener scroll en top con viewport adecuado (1180px) para que se aprecien cabecera, filtros, botones, alerta y visor de PDF
  await page.setViewport({ width: 1520, height: 1180, deviceScaleFactor: 1 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  await saveScreenshot(page, '04_nomina_grupo.png', { fullPage: false });
  // Restaurar viewport estándar para las siguientes capturas
  await page.setViewport({ width: 1520, height: 960, deviceScaleFactor: 1 });

  // CAPTURA 5: 05_documentos.png
  console.log('5. Navegando a #/documentos...');
  await page.goto(`${BASE}#/documentos`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#document-stage-tabs', { timeout: 15000 });
  await page.waitForSelector('.doc-cards-grid', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  await saveScreenshot(page, '05_documentos.png', { fullPage: false });

  // CAPTURA 6: 06_registro_academico.png (Asistencia en Modo Demo con tabla, sesiones y estado)
  console.log('6. Navegando a #/registro (Asistencia interactiva)...');
  await page.goto(`${BASE}#/registro`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('.demo-att-counts, .table-info', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  await saveScreenshot(page, '06_registro_academico.png', { fullPage: false });

  // CAPTURA 7: 07_respaldo.png
  console.log('7. Navegando a #/respaldo...');
  await page.goto(`${BASE}#/respaldo`, { waitUntil: 'networkidle0', timeout: 20000 });
  await page.waitForSelector('#btn-export-backup', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  await saveScreenshot(page, '07_respaldo.png', { fullPage: false });

  // CAPTURA 8 (Opcional): 08_programas_modulos.png
  console.log('8. Navegando a #/programas...');
  try {
    await page.goto(`${BASE}#/programas`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await saveScreenshot(page, '08_programas_modulos.png', { fullPage: false });
  } catch (err) {
    console.warn('No se pudo capturar 08_programas_modulos.png:', err.message);
  }

  // CAPTURA 9 (Opcional): 09_matriculas.png
  console.log('9. Navegando a #/matriculas...');
  try {
    await page.goto(`${BASE}#/matriculas`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await saveScreenshot(page, '09_matriculas.png', { fullPage: false });
  } catch (err) {
    console.warn('No se pudo capturar 09_matriculas.png:', err.message);
  }

  await browser.close();
  console.log('==================================================');
  console.log('¡TODAS LAS CAPTURAS DE EVIDENCIAS UX COMPLETADAS!');
  console.log('==================================================');
}

run().catch(err => {
  console.error('ERROR EN CAPTURAS:', err);
  process.exit(1);
});
