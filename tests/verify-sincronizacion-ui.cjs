/**
 * tests/verify-sincronizacion-ui.cjs
 * 
 * Verificación visual automatizada con Puppeteer para:
 * SINCRONIZACIÓN USB Y TRANSFERENCIA ACADÉMICA (Tarea 34)
 * CEPRO_MICAELA 2.0.
 * 
 * Genera evidencias de alta definición en capturas_ux_informe2/:
 * 1. sincronizacion-general-1920x1080.png
 * 2. sincronizacion-general-1366x768.png
 * 3. sincronizacion-recibir-1920x1080.png
 * 4. sincronizacion-equipos-1920x1080.png
 * 5. sincronizacion-conflictos-1920x1080.png
 * 6. sincronizacion-docente-1920x1080.png
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
  console.log('  VERIFICACIÓN VISUAL PUPPETEER: SINCRONIZACIÓN USB (Tarea 34)           ');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // 1. SESIÓN DIRECTOR: Pestaña 1 Enviar mis datos (1920x1080)
    // ----------------------------------------------------
    console.log('[EVAL] 1. Autenticando como DIRECTOR en 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await doLogin(page, 'director.dev', 'DirectorDev2026!');

    console.log('[EVAL] Navegando a #/sincronizacion...');
    await page.goto(`${BASE_URL}/#/sincronizacion`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura General 1920x1080
    const shotGen1080 = path.join(SCREENSHOT_DIR, 'sincronizacion-general-1920x1080.png');
    await page.screenshot({ path: shotGen1080, fullPage: false });
    console.log(`✔ Captura guardada: ${path.basename(shotGen1080)}`);

    // ----------------------------------------------------
    // 2. SESIÓN DIRECTOR: En resolución portátil 1366x768
    // ----------------------------------------------------
    console.log('[EVAL] 2. Evaluando resolución 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise((r) => setTimeout(r, 600));

    const shotGen768 = path.join(SCREENSHOT_DIR, 'sincronizacion-general-1366x768.png');
    await page.screenshot({ path: shotGen768, fullPage: false });
    console.log(`✔ Captura guardada: ${path.basename(shotGen768)}`);

    // Restaurar a 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });

    // ----------------------------------------------------
    // 3. Sub-pestaña Recibir un archivo (Importar desde USB)
    // ----------------------------------------------------
    console.log('[EVAL] 3. Cambiando a sub-pestaña "Recibir un archivo"...');
    const receiveSubTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Recibir un archivo'));
    });
    if (receiveSubTabBtn) {
      await receiveSubTabBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      const shotRecibir = path.join(SCREENSHOT_DIR, 'sincronizacion-recibir-1920x1080.png');
      await page.screenshot({ path: shotRecibir, fullPage: false });
      console.log(`✔ Captura guardada: ${path.basename(shotRecibir)}`);
    }

    // ----------------------------------------------------
    // 4. Pestaña Equipos Vinculados
    // ----------------------------------------------------
    console.log('[EVAL] 4. Cambiando a pestaña "Equipos Vinculados"...');
    const devicesTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Equipos Vinculados'));
    });
    if (devicesTabBtn) {
      await devicesTabBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      const shotEquipos = path.join(SCREENSHOT_DIR, 'sincronizacion-equipos-1920x1080.png');
      await page.screenshot({ path: shotEquipos, fullPage: false });
      console.log(`✔ Captura guardada: ${path.basename(shotEquipos)}`);
    }

    // ----------------------------------------------------
    // 5. Pestaña Conflictos y Diferencias
    // ----------------------------------------------------
    console.log('[EVAL] 5. Cambiando a pestaña "Conflictos y Diferencias"...');
    const conflictsTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Conflictos y Diferencias'));
    });
    if (conflictsTabBtn) {
      await conflictsTabBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      const shotConflictos = path.join(SCREENSHOT_DIR, 'sincronizacion-conflictos-1920x1080.png');
      await page.screenshot({ path: shotConflictos, fullPage: false });
      console.log(`✔ Captura guardada: ${path.basename(shotConflictos)}`);
    }

    // ----------------------------------------------------
    // 6. SESIÓN DOCENTE: Control RBAC y Alcance Pedagógico
    // ----------------------------------------------------
    console.log('[EVAL] 6. Cerrando sesión de Director e iniciando como DOCENTE...');
    await doLogout(page);
    await doLogin(page, 'docente.dev', 'DocenteDev2026!');

    console.log('[EVAL] Navegando a #/sincronizacion como DOCENTE...');
    await page.goto(`${BASE_URL}/#/sincronizacion`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    const shotDocente = path.join(SCREENSHOT_DIR, 'sincronizacion-docente-1920x1080.png');
    await page.screenshot({ path: shotDocente, fullPage: false });
    console.log(`✔ Captura guardada: ${path.basename(shotDocente)}`);

    console.log('\n========================================================================');
    console.log('  EVALUACIÓN VISUAL COMPLETADA SATISFACTORIAMENTE (6 CAPTURAS GENERADAS)  ');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Error durante la verificación visual:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error fatal en verify-sincronizacion-ui:', err);
  process.exit(1);
});
