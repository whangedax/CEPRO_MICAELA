const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

(async () => {
  console.log('--- Verificando Botón de Llenado de Asistencia de Toda la Unidad ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  // Manejador automático de confirmaciones
  page.on('dialog', async dialog => {
    console.log('Diálogo detectado:', dialog.message());
    await dialog.accept();
  });

  // 1. Iniciar sesión
  console.log('1. Iniciando sesión...');
  await page.goto('http://127.0.0.1:8080/#/login', { waitUntil: 'networkidle0' });
  await page.type('#username', 'fiuler');
  await page.type('#password', 'fiuler123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 1500));

  // 2. Ir a Asistencia
  console.log('2. Navegando a #/asistencia...');
  await page.goto('http://127.0.0.1:8080/#/asistencia', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Seleccionar grupo GRP-BD-001 (Peluquería y Barbería Módulo I)
  console.log('3. Seleccionando grupo GRP-BD-001 y unidad UD1...');
  await page.select('#academic-group', 'GRP-BD-001');
  await new Promise(r => setTimeout(r, 800));
  await page.select('#academic-unit', 'UD1');
  await new Promise(r => setTimeout(r, 800));

  // Captura 1: Vista de asistencia con el nuevo botón
  const shot1 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_BOTON_LLENAR_ASISTENCIA_UI.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('✓ Captura 1 guardada:', shot1);

  // 4. Hacer clic en "Llenar toda la asistencia de la unidad (Demo)"
  console.log('4. Haciendo clic en #fill-unit-attendance...');
  await page.click('#fill-unit-attendance');
  await new Promise(r => setTimeout(r, 3000));

  // Captura 2: Vista de asistencia COMPLETADA
  const shot2 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_ASISTENCIA_UNIDAD_COMPLETA_UI.png');
  await page.screenshot({ path: shot2, fullPage: true });
  console.log('✓ Captura 2 guardada:', shot2);

  // 5. Ir a generar la ficha de asistencia
  console.log('5. Haciendo clic en #attendance-document para ir a #/documentos...');
  await page.click('#attendance-document');
  await new Promise(r => setTimeout(r, 2000));

  console.log('6. Generando PDF de la ficha de asistencia completa...');
  await page.click('#document-generate');
  await new Promise(r => setTimeout(r, 4500));

  // Captura 3: Vista de Documentos con PDF de la unidad llena
  const shot3 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_FICHA_ASISTENCIA_UNIDAD_COMPLETA_PDF_UI.png');
  await page.screenshot({ path: shot3, fullPage: true });
  console.log('✓ Captura 3 guardada:', shot3);

  // Captura 4: Zoom sobre el Canvas del PDF mostrando grilla y totales
  const canvas = await page.$('.pdf-canvas');
  if (canvas) {
    const canvasShot = path.join(ARTIFACTS_DIR, 'EVIDENCIA_ZOOM_ASISTENCIA_COMPLETA_CANVAS.png');
    await canvas.screenshot({ path: canvasShot });
    console.log('✓ Captura 4 (Canvas completo) guardada:', canvasShot);

    // Recortar cabecera y grilla con Jimp
    try {
      const image = await Jimp.read(canvasShot);
      const w = image.bitmap.width;
      const h = image.bitmap.height;
      // Recorte superior que muestra cabecera, fechas, marcas y totales
      const cropW = w;
      const cropH = Math.min(Math.round(h * 0.55), 750);
      image.crop(0, 0, cropW, cropH);
      const cropPath = path.join(ARTIFACTS_DIR, 'EVIDENCIA_ZOOM_GRILLA_ASISTENCIA_COMPLETA.png');
      await image.writeAsync(cropPath);
      console.log('✓ Captura 5 (Zoom grilla y totales) guardada:', cropPath);
    } catch (e) {
      console.error('Error recortando con Jimp:', e.message);
    }
  }

  await browser.close();
  console.log('--- Proceso completado con éxito ---');
})();
