const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

(async () => {
  console.log('--- Capturando Evidencias de la Cabecera Corregida en Peluquería y Barbería ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  // 1. Login
  console.log('Iniciando sesión...');
  await page.goto('http://127.0.0.1:8080/#/login', { waitUntil: 'networkidle0' });
  await page.type('#username', 'fiuler');
  await page.type('#password', 'fiuler123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));

  // 2. Documentos
  console.log('Navegando a #/documentos...');
  await page.goto('http://127.0.0.1:8080/#/documentos', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Seleccionar Peluquería y Barbería Módulo II (GRP-BD-001-M2)
  console.log('Seleccionando GRP-BD-001-M2 (Peluquería y Barbería M2)...');
  await page.select('#document-group', 'GRP-BD-001-M2');
  await new Promise(r => setTimeout(r, 500));

  await page.select('#document-template', 'TMPL-06');
  await new Promise(r => setTimeout(r, 500));

  const unitSelect = await page.$('#document-unit');
  if (unitSelect) {
    await page.select('#document-unit', 'UD1');
    await new Promise(r => setTimeout(r, 500));
  }

  // Activar Modo Demostración
  const demoCheckbox = await page.$('#document-demo-fill');
  if (demoCheckbox) {
    const isChecked = await (await demoCheckbox.getProperty('checked')).jsonValue();
    if (!isChecked) await demoCheckbox.click();
  }
  await new Promise(r => setTimeout(r, 500));

  console.log('Actualizando vista previa...');
  await page.click('#document-generate');
  await new Promise(r => setTimeout(r, 4000));

  // Captura 1: Pantalla completa UI
  const shot1 = path.join(ARTIFACTS_DIR, 'DEMO_PELUQUERIA_CABECERA_UI.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('✓ Captura completa guardada:', shot1);

  // Captura 2: Zoom al Canvas (área superior de la cabecera)
  const canvas = await page.$('.pdf-canvas');
  if (canvas) {
    const shot2 = path.join(ARTIFACTS_DIR, 'DEMO_ZOOM_CABECERA_CORREGIDA.png');
    await canvas.screenshot({ path: shot2 });
    console.log('✓ Captura del Canvas guardada:', shot2);
  }

  await browser.close();
  console.log('--- Proceso completado exitosamente ---');
})().catch(console.error);
