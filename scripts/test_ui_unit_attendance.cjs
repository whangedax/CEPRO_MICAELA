const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:8080';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

(async () => {
  console.log('=== VERIFICANDO BOTÓN DE ASISTENCIA COMPLETA AL LADO DE AJUSTAR ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1080']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 });

    // 1. Iniciar sesión como Director para tener visión amplia o Docente
    console.log('1. Navegando al login...');
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', 'eloy.paredes');
    await page.type('#password', 'Eloy2026!');
    await page.click('#login-form button[type=submit]');
    await page.waitForSelector('#logout', { timeout: 10000 });
    console.log('✓ Sesión iniciada con éxito como Director');

    // 2. Ir a documentos
    console.log('2. Navegando a #/documentos...');
    await page.goto(`${BASE_URL}/#/documentos`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#document-template', { timeout: 10000 });

    // Seleccionar grupo de Computación e Informática y UD2 (Microsoft Word, TMPL-06)
    console.log('3. Seleccionando grupo Computación y plantilla TMPL-06 (UD2 Microsoft Word)...');
    await page.select('#document-template', 'TMPL-06');
    await new Promise(r => setTimeout(r, 600));

    // Generar formato inicial
    console.log('4. Generando vista previa del documento...');
    await page.click('#document-generate');
    await page.waitForFunction(() => {
      const c = document.querySelector('.pdf-canvas');
      const b = document.querySelector('#pdf-demo-unit-fill');
      return c && c.width > 0 && b;
    }, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Tomar captura 1: Barra de controles mostrando el botón al lado de "Ajustar"
    console.log('5. Capturando barra de controles con botón Llenar asistencia al lado de Ajustar...');
    const controlsShotPath = path.join(ARTIFACTS_DIR, 'EVIDENCIA_BOTON_AL_LADO_DE_AJUSTAR.png');
    await page.screenshot({ path: controlsShotPath, fullPage: false });
    console.log('✓ Captura guardada:', controlsShotPath);

    // Zoom específico sobre los controles del PDF (.pdf-controls)
    const controlsElem = await page.$('.pdf-controls');
    if (controlsElem) {
      const zoomControlsPath = path.join(ARTIFACTS_DIR, 'EVIDENCIA_ZOOM_CONTROLES_AJUSTAR_Y_BOTON.png');
      await controlsElem.screenshot({ path: zoomControlsPath });
      console.log('✓ Zoom de controles guardado:', zoomControlsPath);
    }

    // 6. Hacer click en "Llenar asistencia completa (Demo)"
    console.log('6. Haciendo click en #pdf-demo-unit-fill ("Llenar asistencia completa (Demo)")...');
    await page.click('#pdf-demo-unit-fill');

    // Esperar a que se procese la simulación y se re-genere el PDF con marcas
    console.log('Esperando re-generación del canvas con marcas de asistencia...');
    await page.waitForFunction(() => {
      const clearBtn = document.querySelector('#pdf-demo-clear-fill');
      return clearBtn && clearBtn.style.display !== 'none';
    }, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Tomar captura 2: Vista completa con el PDF lleno al 100%
    const filledShotPath = path.join(ARTIFACTS_DIR, 'EVIDENCIA_ASISTENCIA_UNIDAD_COMPLETA_LLENADA.png');
    await page.screenshot({ path: filledShotPath, fullPage: false });
    console.log('✓ Captura de documento lleno guardada:', filledShotPath);

    // Tomar captura 3: Zoom del canvas del PDF mostrando fechas inicio 01/04 y fin 16/04 y marcas
    const canvasElem = await page.$('.pdf-stage');
    if (canvasElem) {
      const canvasShotPath = path.join(ARTIFACTS_DIR, 'EVIDENCIA_ZOOM_GRILLA_ASISTENCIA_INICIO_CULMINACION.png');
      await canvasElem.screenshot({ path: canvasShotPath });
      console.log('✓ Zoom de grilla guardado:', canvasShotPath);
    }

    console.log('=== VERIFICACIÓN COMPLETADA EXITOSAMENTE ===');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('ERROR EN CAPTURA:', err);
  process.exit(1);
});
