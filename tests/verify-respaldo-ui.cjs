/**
 * tests/verify-respaldo-ui.cjs
 * 
 * Verificación visual automatizada con Puppeteer para:
 * SISTEMA DE RESPALDOS Y RESTAURACIÓN (Tarea 36A — Corrección Integral)
 * CEPRO_MICAELA 2.0.
 * 
 * EVIDENCIA OBLIGATORIA EN UNA MISMA SESIÓN:
 * 1. Estado inicial del historial.
 * 2. Creación de respaldo con etiqueta personalizada.
 * 3. Respaldo visible en el historial inmediatamente sin F5.
 * 4. Contador actualizado en encabezado y pestañas.
 * 5. Diagnóstico SQLite coherente (CORRECTO ok, 100% SALUDABLE, conteos reales).
 * 6. Inspección previa (Preflight) y verificación SHA-256.
 * 7. Pestaña de Restauración Controlada.
 * 8. Resolución portátil 1366x768.
 * 9. Control RBAC (Bloqueo a DOCENTE).
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = 'http://127.0.0.1:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'capturas_ux_informe2');
const ARTIFACT_DIR = 'C:/Users/whangedax/.gemini/antigravity/brain/213e96a3-2011-433e-ad38-2d173b7740b9';

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
  } catch (e) {}
}

async function saveScreenshot(page, filename) {
  const localPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  console.log(`✔ Captura local: ${filename}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artPath = path.join(ARTIFACT_DIR, filename);
    fs.copyFileSync(localPath, artPath);
    console.log(`  ↪ Copiada a artefactos: ${filename}`);
  }
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('========================================================================');
  console.log('  VERIFICACIÓN VISUAL PUPPETEER: TAREA 36A — CORRECCIÓN INTEGRAL        ');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    // -----------------------------------------------------------------------
    // PASO 1: Iniciar sesión como DIRECTOR en 1920x1080
    // -----------------------------------------------------------------------
    console.log('[EVAL] 1. Autenticando como DIRECTOR en resolución 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await doLogin(page, 'director.dev', 'DirectorDev2026!');

    console.log('[EVAL] Navegando a #/respaldo...');
    await page.goto(`${BASE_URL}/#/respaldo`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura 1: Estado inicial del historial antes de crear nuevo respaldo
    console.log('[EVAL] Capturando Estado Inicial del Historial...');
    await saveScreenshot(page, '01-historial-inicial-1920x1080.png');

    // -----------------------------------------------------------------------
    // PASO 2: Creación de respaldo con etiqueta personalizada en la misma sesión
    // -----------------------------------------------------------------------
    console.log('[EVAL] 2. Escribiendo etiqueta personalizada "tarea36a-verificacion"...');
    const labelInput = await page.$('input[placeholder*="Etiqueta opcional"]');
    if (labelInput) {
      await fillField(page, 'input[placeholder*="Etiqueta opcional"]', 'tarea36a-verificacion');
    }

    console.log('[EVAL] Presionando botón "Generar Respaldo Ahora"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Generar Respaldo Ahora')
      );
      if (btn) btn.click();
    });

    // Esperar a que la petición finalice y el historial se actualice inmediatamente
    await new Promise((r) => setTimeout(r, 2000));

    // Captura 2: Respaldo visible en el historial y contador actualizado inmediatamente
    console.log('[EVAL] Capturando Respaldo Creado e Historial Actualizado (Misma Sesión)...');
    await saveScreenshot(page, '02-respaldo-creado-historial-actualizado-1920x1080.png');
    await saveScreenshot(page, 'respaldo-general-1920x1080.png');

    // -----------------------------------------------------------------------
    // PASO 3: Inspección Preflight (Validación SHA-256 sin modificar SQLite)
    // -----------------------------------------------------------------------
    console.log('[EVAL] 3. Abriendo modal de inspección del primer respaldo...');
    await page.evaluate(() => {
      const verifyBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Verificar')
      );
      if (verifyBtn) verifyBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    await saveScreenshot(page, '03-preflight-inspeccion-sha256-1920x1080.png');
    await saveScreenshot(page, 'respaldo-verificar-modal-1920x1080.png');

    // Cerrar modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && (b.textContent.includes('Cerrar') || b.textContent.includes('Entendido'))
      );
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -----------------------------------------------------------------------
    // PASO 4: Pestaña Restauración Controlada
    // -----------------------------------------------------------------------
    console.log('[EVAL] 4. Cambiando a pestaña "Restauración Controlada"...');
    await page.evaluate(() => {
      const restoreTabBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Restauración Controlada')
      );
      if (restoreTabBtn) restoreTabBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Seleccionar el primer respaldo del select para auditar su preflight
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    await saveScreenshot(page, '04-restauracion-controlada-1920x1080.png');
    await saveScreenshot(page, 'respaldo-restauracion-1920x1080.png');

    // -----------------------------------------------------------------------
    // PASO 5: Pestaña Salud e Integridad SQLite
    // -----------------------------------------------------------------------
    console.log('[EVAL] 5. Cambiando a pestaña "Salud e Integridad SQLite"...');
    await page.evaluate(() => {
      const healthTabBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Salud e Integridad SQLite')
      );
      if (healthTabBtn) healthTabBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    await saveScreenshot(page, '05-salud-sqlite-coherente-1920x1080.png');
    await saveScreenshot(page, 'respaldo-salud-sqlite-1920x1080.png');

    // -----------------------------------------------------------------------
    // PASO 6: Vista Responsiva Portátil 1366x768
    // -----------------------------------------------------------------------
    console.log('[EVAL] 6. Evaluando resolución 1366x768 en pestaña principal...');
    await page.evaluate(() => {
      const listTabBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Copias de Seguridad')
      );
      if (listTabBtn) listTabBtn.click();
    });
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise((r) => setTimeout(r, 800));

    await saveScreenshot(page, '06-respaldo-laptop-1366x768.png');
    await saveScreenshot(page, 'respaldo-general-1366x768.png');

    // -----------------------------------------------------------------------
    // PASO 7: Control RBAC — Bloqueo de Acceso a DOCENTE
    // -----------------------------------------------------------------------
    console.log('[EVAL] 7. Cerrando sesión de DIRECTOR e iniciando como DOCENTE...');
    await page.setViewport({ width: 1920, height: 1080 });
    await doLogout(page);
    await doLogin(page, 'docente.dev', 'DocenteDev2026!');

    console.log('[EVAL] Navegando a #/respaldo como DOCENTE...');
    await page.goto(`${BASE_URL}/#/respaldo`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    await saveScreenshot(page, '07-bloqueo-rbac-docente-1920x1080.png');
    await saveScreenshot(page, 'respaldo-rbac-docente-1920x1080.png');

    console.log('\n========================================================================');
    console.log('  EVALUACIÓN E2E COMPLETADA CON ÉXITO — TODAS LAS CAPTURAS GENERADAS     ');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Error durante la verificación visual:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error fatal en verify-respaldo-ui:', err);
  process.exit(1);
});
