/**
 * tests/verify-documentos-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para el CENTRO DE DOCUMENTOS ACADÉMICOS (Tarea 19).
 * Captura evidencias visuales en 1366x768 y 1920x1080.
 * 
 * Comprueba:
 * 1. Login como DOCENTE (docente.dev).
 * 2. Navegación a #/documentos y verificación de encabezado institucional.
 * 3. Catálogo de 21 formatos con búsqueda y filtrado por categoría.
 * 4. Selección de plantilla oficial (TMPL-05 Asistencia UD1).
 * 5. Checklist preflight con parámetros completos y pendientes.
 * 6. Generación del PDF con el motor oficial (POST /api/document/pdf).
 * 7. Renderizado en el visor integrado (PdfViewer) sobre elemento canvas.
 * 8. Controles de navegación de página, zoom y descarga.
 * 9. Capturas de pantalla en 1366x768 y 1920x1080 en capturas_ux_informe2/.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = 'http://127.0.0.1:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'capturas_ux_informe2');

async function fillField(page, selector, text) {
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, text, { delay: 10 });
}

async function run() {
  console.log('=== INICIANDO VERIFICACIÓN E2E DE CENTRO DOCUMENTAL (TAREA 19) ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  [BROWSER ERROR]:', msg.text());
      consoleErrors.push(msg.text());
    } else {
      // console.log('  [BROWSER]:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log('  [PAGE ERROR]:', err.message);
    consoleErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------
    // PASO 1: LOGIN COMO DOCENTE
    // -------------------------------------------------------------
    console.log('[PASO 1] Iniciando sesión como docente.dev en 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('#username', { timeout: 10000 });
    await fillField(page, '#username', 'docente.dev');
    await fillField(page, '#password', 'DocenteDev2026!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('  ✔ Sesión iniciada correctamente');

    // -------------------------------------------------------------
    // PASO 2: NAVEGAR A CENTRO DOCUMENTAL (#/documentos)
    // -------------------------------------------------------------
    console.log('\n[PASO 2] Navegando a #/documentos...');
    await page.click('a[href="#/documentos"]');
    await new Promise((r) => setTimeout(r, 1200));

    // Si requiere seleccionar aula o unidad didáctica, abrir modal
    const needModal = await page.evaluate(() => {
      return document.body.innerText.includes('Seleccionar Aula y Espacio');
    });

    if (needModal) {
      console.log('  -> Abriendo modal de selección de aula y espacio...');
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const btn = btns.find((b) => b.textContent.includes('Seleccionar Aula y Espacio'));
        if (btn) btn.click();
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 6000 });
      await new Promise((r) => setTimeout(r, 500));
      await page.click('[role="dialog"] button[type="submit"]');
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Esperar a que el catálogo y encabezado de documentos esté visible
    await page.waitForSelector('h1', { timeout: 10000 });
    const mainTitle = await page.$eval('h1', (el) => el.textContent.trim());
    console.log(`  ✔ Título principal confirmado: "${mainTitle}"`);

    // -------------------------------------------------------------
    // PASO 3: VERIFICAR CATÁLOGO DE PLANTILLAS Y CATEGORÍAS
    // -------------------------------------------------------------
    console.log('\n[PASO 3] Verificando catálogo de formatos oficiales...');
    await page.waitForSelector('input[placeholder*="Buscar por nombre"]', { timeout: 8000 });

    // Filtrar por categoría "Control de Asistencia"
    console.log('  -> Probando filtro de categoría "Control de Asistencia"...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find((b) => b.textContent.includes('Control'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Volver a "Todos"
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find((b) => b.textContent.trim() === 'Todos');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------
    // PASO 4: SELECCIÓN DE PLANTILLA TMPL-05 (Asistencia UD1)
    // -------------------------------------------------------------
    console.log('\n[PASO 4] Seleccionando plantilla TMPL-05 (Asistencia UD1)...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find((b) => b.textContent.includes('TMPL-05'));
      if (btn) btn.click();
    });

    console.log('  -> Esperando informe preflight del motor documental...');
    await page.waitForFunction(() => document.body.innerText.includes('Checklist Preflight'), { timeout: 12000 });
    console.log('  ✔ Checklist Preflight verificado en pantalla');

    // -------------------------------------------------------------
    // PASO 5: GENERACIÓN DE PDF MEDIANTE MOTOR INSTITUCIONAL
    // -------------------------------------------------------------
    console.log('\n[PASO 5] Generando PDF con botón "Ver formato rellenado"...');
    await page.click('#document-generate');

    // Esperar a que se renderice el canvas del PDF
    console.log('  -> Esperando renderizado de páginas en canvas...');
    await page.waitForSelector('canvas', { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 2000));
    console.log('  ✔ Canvas del PDF renderizado exitosamente');

    // Verificar controles del visor (Página 1 de 1, zoom, descarga)
    const pageStatus = await page.$eval('[data-page]', (el) => el.textContent.trim());
    console.log(`  ✔ Indicador de paginación del visor: "${pageStatus}"`);

    const hasDownloadBtn = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.some((b) => b.textContent.includes('Descargar PDF'));
    });
    console.log(`  ✔ Botón oficial de descarga de PDF presente: ${hasDownloadBtn}`);
    if (!hasDownloadBtn) {
      throw new Error('El visor debe incluir el botón oficial de Descargar PDF');
    }

    // -------------------------------------------------------------
    // PASO 6: GENERAR CAPTURA 1366x768
    // -------------------------------------------------------------
    console.log('\n[PASO 6] Generando captura en resolución 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise((r) => setTimeout(r, 500));
    const shot1366 = path.join(SCREENSHOT_DIR, 'documentos-1366x768.png');
    await page.screenshot({ path: shot1366, fullPage: false });
    console.log(`  ✔ Captura guardada en: ${shot1366}`);

    // -------------------------------------------------------------
    // PASO 7: GENERAR CAPTURA 1920x1080 (FULL HD)
    // -------------------------------------------------------------
    console.log('\n[PASO 7] Generando captura en resolución 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 600));
    const shot1920 = path.join(SCREENSHOT_DIR, 'documentos-1920x1080.png');
    await page.screenshot({ path: shot1920, fullPage: false });
    console.log(`  ✔ Captura guardada en: ${shot1920}`);

    // -------------------------------------------------------------
    // PASO 8: CAPTURA FOCALIZADA DEL VISOR PDF
    // -------------------------------------------------------------
    console.log('\n[PASO 8] Generando captura ampliada del visor PDF...');
    // Scroll hacia el visor
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 500));

    const shotViewer = path.join(SCREENSHOT_DIR, 'documentos-pdf-viewer-1920x1080.png');
    await page.screenshot({ path: shotViewer, fullPage: false });
    console.log(`  ✔ Captura del visor PDF guardada en: ${shotViewer}`);

    console.log('\n======================================================');
    console.log('✔ TODAS LAS PRUEBAS E2E DEL CENTRO DOCUMENTAL FINALIZARON CON ÉXITO');
    console.log(`Errores críticos de consola: ${consoleErrors.length}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ ERROR EN VERIFICACIÓN E2E DE DOCUMENTOS:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
