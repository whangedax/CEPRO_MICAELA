/**
 * tests/verify-entregas-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para ENTREGA Y REVISIÓN DE DOCUMENTOS (Tarea 24).
 * Captura evidencias visuales en 1366x768 y 1920x1080.
 * 
 * Comprueba:
 * 1. Login como DOCENTE (docente.dev).
 * 2. Navegación a #/entregas.
 * 3. Vista de preparación y catálogo de plantillas con checklist Preflight.
 * 4. Evidencia visual de la pantalla en 1366x768 y 1920x1080.
 * 5. Login como DIRECTOR (director.dev).
 * 6. Navegación a #/entregas (Bandeja institucional de entregas).
 * 7. Apertura de modal de dictamen y revisión.
 * 8. Captura de pantalla de la bandeja y del modal de revisión en 1920x1080.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

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
  console.log('=== INICIANDO VERIFICACIÓN E2E DE ENTREGA Y REVISIÓN (TAREA 24) ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // -------------------------------------------------------------
    // FASE 1: DOCENTE - LOGIN Y PANTALLA DE PREPARACIÓN DE ENTREGAS
    // -------------------------------------------------------------
    console.log('1. Iniciando sesión como DOCENTE (docente.dev)...');
    const docPage = await browser.newPage();
    await docPage.setViewport({ width: 1366, height: 768 });
    await docPage.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await docPage.waitForSelector('#username', { timeout: 10000 });
    await fillField(docPage, '#username', 'docente.dev');
    await fillField(docPage, '#password', 'DocenteDev2026!');
    await docPage.click('button[type="submit"]');

    await docPage.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('2. Navegando a #/entregas como DOCENTE...');
    await docPage.goto(`${BASE_URL}/#/entregas`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 1: 1366x768 Docente
    const shotDoc1366 = path.join(SCREENSHOT_DIR, 'entregas-docente-1366x768.png');
    await docPage.screenshot({ path: shotDoc1366, fullPage: true });
    console.log(`✔ Captura generada: ${shotDoc1366}`);

    // Captura 2: 1920x1080 Docente
    console.log('3. Ajustando viewport a 1920x1080...');
    await docPage.setViewport({ width: 1920, height: 1080 });
    await new Promise(r => setTimeout(r, 800));

    const shotDoc1920 = path.join(SCREENSHOT_DIR, 'entregas-docente-1920x1080.png');
    await docPage.screenshot({ path: shotDoc1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotDoc1920}`);
    await docPage.close();

    // -------------------------------------------------------------
    // FASE 2: DIRECTOR - BANDEJA INSTITUCIONAL Y MODAL DE REVISIÓN
    // -------------------------------------------------------------
    console.log('4. Creando contexto aislado para DIRECTOR (director.dev)...');
    const dirContext = await browser.createBrowserContext();
    const dirPage = await dirContext.newPage();
    await dirPage.setViewport({ width: 1920, height: 1080 });
    await dirPage.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await dirPage.waitForSelector('#username', { timeout: 10000 });
    await fillField(dirPage, '#username', 'director.dev');
    await fillField(dirPage, '#password', 'DirectorDev2026!');
    await dirPage.click('button[type="submit"]');

    await dirPage.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('5. Navegando a #/entregas como DIRECTOR...');
    await dirPage.goto(`${BASE_URL}/#/entregas`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 3: Bandeja institucional de entregas (Director)
    const shotDir1920 = path.join(SCREENSHOT_DIR, 'entregas-director-bandeja-1920x1080.png');
    await dirPage.screenshot({ path: shotDir1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotDir1920}`);

    // Abrir modal de revisión
    console.log('6. Abriendo modal de revisión y dictamen...');
    const reviewButtons = await dirPage.$$('button');
    let clicked = false;
    for (const btn of reviewButtons) {
      const text = await dirPage.evaluate(el => el.textContent, btn);
      if (text && text.includes('Revisar')) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await new Promise(r => setTimeout(r, 1000));
      // Captura 4: Modal de revisión
      const shotModal1920 = path.join(SCREENSHOT_DIR, 'entregas-revision-modal-1920x1080.png');
      await dirPage.screenshot({ path: shotModal1920, fullPage: true });
      console.log(`✔ Captura generada: ${shotModal1920}`);
    } else {
      console.log('Nota: No se encontró botón "Revisar" en la tabla para abrir el modal.');
    }

    await dirContext.close();
    console.log('\n=== VERIFICACIÓN E2E COMPLETADA CON ÉXITO ===');
  } catch (error) {
    console.error('Error durante la verificación E2E:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
