/**
 * tests/verify-configuracion-academica-ui.cjs
 * 
 * Verificación visual automatizada con Puppeteer para:
 * CONFIGURACIÓN ACADÉMICA Y PERIODOS LECTIVOS (Tarea 32)
 * CEPRO_MICAELA 2.0.
 * 
 * Genera capturas de alta definición en capturas_ux_informe2/:
 * 1. configuracion-academica-general-1920x1080.png
 * 2. configuracion-academica-general-1366x768.png
 * 3. configuracion-academica-periodos-1920x1080.png
 * 4. configuracion-academica-curriculo-1920x1080.png
 * 5. configuracion-academica-valores-1920x1080.png
 * 6. configuracion-academica-personal-1920x1080.png
 * 7. configuracion-academica-clonacion-modal-1920x1080.png
 * 8. configuracion-academica-secretaria-1920x1080.png
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
  await page.type(selector, text, { delay: 15 });
}

async function doLogin(page, username, password) {
  await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const loginUsername = await page.$('#username');
  if (loginUsername) {
    await fillField(page, '#username', username);
    await fillField(page, '#password', password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));
  } else {
    // Si ya hay sesión abierta, verificar o hacer logout
    const logoutBtn = await page.$('button[title*="sesión"], button[title*="Cerrar"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      return doLogin(page, username, password);
    }
  }
}

async function doLogout(page) {
  try {
    const logoutBtn = await page.$('button[title*="sesión"], button[title*="Cerrar"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (e) {
    // ignorar
  }
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('========================================================================');
  console.log('  VERIFICACIÓN VISUAL PUPPETEER: CONFIGURACIÓN ACADÉMICA (Tarea 32)     ');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // 1. SESIÓN DIRECTOR: Tab 1 Institución y Calendario (1920x1080)
    // ----------------------------------------------------
    console.log('[EVAL] 1. Autenticando como DIRECTOR en 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await doLogin(page, 'director.dev', 'DirectorDev2026!');

    console.log('[EVAL] Navegando a #/configuracion-academica...');
    await page.goto(`${BASE_URL}/#/configuracion-academica`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura General 1920x1080
    const shotGen1080 = path.join(SCREENSHOT_DIR, 'configuracion-academica-general-1920x1080.png');
    await page.screenshot({ path: shotGen1080, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotGen1080)}`);

    // ----------------------------------------------------
    // 2. SESIÓN DIRECTOR: Tab 1 en 1366x768
    // ----------------------------------------------------
    console.log('[EVAL] 2. Ajustando resolución a 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise((r) => setTimeout(r, 800));

    const shotGen768 = path.join(SCREENSHOT_DIR, 'configuracion-academica-general-1366x768.png');
    await page.screenshot({ path: shotGen768, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotGen768)}`);

    // Restaurar a 1920x1080 para las siguientes
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // 3. Tab 2: Periodos Académicos
    // ----------------------------------------------------
    console.log('[EVAL] 3. Seleccionando Pestaña 2: Periodos académicos...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((btn) => btn.textContent.includes('Periodos'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const shotPeriodos = path.join(SCREENSHOT_DIR, 'configuracion-academica-periodos-1920x1080.png');
    await page.screenshot({ path: shotPeriodos, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotPeriodos)}`);

    // ----------------------------------------------------
    // 4. Tab 3: Programas y Planes Curriculares
    // ----------------------------------------------------
    console.log('[EVAL] 4. Seleccionando Pestaña 3: Programas y planes curriculares...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((btn) => btn.textContent.includes('curriculares'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const shotCurriculo = path.join(SCREENSHOT_DIR, 'configuracion-academica-curriculo-1920x1080.png');
    await page.screenshot({ path: shotCurriculo, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotCurriculo)}`);

    // ----------------------------------------------------
    // 5. Tab 4: Valores Oficiales de Referencia
    // ----------------------------------------------------
    console.log('[EVAL] 5. Seleccionando Pestaña 4: Valores de referencia...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((btn) => btn.textContent.includes('Valores de referencia'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const shotValores = path.join(SCREENSHOT_DIR, 'configuracion-academica-valores-1920x1080.png');
    await page.screenshot({ path: shotValores, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotValores)}`);

    // ----------------------------------------------------
    // 6. Tab 5: Directorio del Personal
    // ----------------------------------------------------
    console.log('[EVAL] 6. Seleccionando Pestaña 5: Directorio del personal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((btn) => btn.textContent.includes('Directorio'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const shotPersonal = path.join(SCREENSHOT_DIR, 'configuracion-academica-personal-1920x1080.png');
    await page.screenshot({ path: shotPersonal, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotPersonal)}`);

    // ----------------------------------------------------
    // 7. Modal Clonación de Año Académico
    // ----------------------------------------------------
    console.log('[EVAL] 7. Abriendo modal de Clonación de Año Lectivo...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((btn) => btn.textContent.includes('Preparar nuevo año'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const shotModal = path.join(SCREENSHOT_DIR, 'configuracion-academica-clonacion-modal-1920x1080.png');
    await page.screenshot({ path: shotModal, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotModal)}`);

    // Cerrar modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((btn) => btn.textContent.includes('Cancelar') || btn.textContent.includes('✕'));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // 8. SESIÓN SECRETARÍA: Modo Solo Lectura Institucional
    // ----------------------------------------------------
    console.log('[EVAL] 8. Cerrando sesión e ingresando como SECRETARIA...');
    await doLogout(page);
    await doLogin(page, 'secretaria.dev', 'SecretariaDev2026!');

    console.log('[EVAL] Navegando a #/configuracion-academica como SECRETARIA...');
    await page.goto(`${BASE_URL}/#/configuracion-academica`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    const shotSec = path.join(SCREENSHOT_DIR, 'configuracion-academica-secretaria-1920x1080.png');
    await page.screenshot({ path: shotSec, fullPage: false });
    console.log(`✔ Guardada captura: ${path.basename(shotSec)}`);

    console.log('\n========================================================================');
    console.log('  VERIFICACIÓN VISUAL COMPLETADA: TODAS LAS CAPTURAS GUARDADAS CON ÉXITO');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Error durante la verificación visual:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
