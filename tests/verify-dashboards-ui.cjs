/**
 * tests/verify-dashboards-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para DASHBOARDS POR ROL (Tarea 26).
 * Captura evidencias visuales en 1366x768 y 1920x1080:
 * 
 * 1. DIRECTOR (director.dev):
 *    - Login y navegación a #/inicio.
 *    - Validación visual de DashboardDireccion.tsx: KPIs reales, banner sandbox,
 *      9 tarjetas de supervisión autorizadas (incluyendo Respaldo), Topbar ("Supervisión de Dirección").
 *    - Capturas: dashboard-direccion-1366x768.png, dashboard-direccion-1920x1080.png.
 * 
 * 2. SECRETARIA (secretaria.dev):
 *    - Login y navegación a #/inicio.
 *    - Validación visual de DashboardSecretaria.tsx: KPIs reales, banner sandbox,
 *      9 tarjetas de trámites autorizadas (excluyendo estrictamente Respaldo), Topbar ("Gestión de Secretaría").
 *    - Capturas: dashboard-secretaria-1366x768.png, dashboard-secretaria-1920x1080.png.
 * 
 * 3. DOCENTE (docente.dev):
 *    - Login y navegación a #/inicio.
 *    - Validación visual de DashboardDocente.tsx: Preservación intacta del diseño premium Google Stitch.
 *    - Captura: dashboard-docente-1920x1080.png.
 * 
 * 4. ENTREGAS (Correcciones Tarea 25):
 *    - Navegación a #/entregas sin aula seleccionada.
 *    - Verificación visual de los 4 hallazgos corregidos (Catálogo Informativo, banner de alerta, estado Preflight pendiente).
 *    - Captura: entregas-corregido-1920x1080.png.
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

async function run() {
  console.log('=== INICIANDO CAPTURA E2E DE DASHBOARDS POR ROL (TAREA 26) ===\n');

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
    // FASE 1: DIRECTOR GENERAL (director.dev)
    // -------------------------------------------------------------
    console.log('1. Iniciando sesión como DIRECTOR (director.dev)...');
    const dirPage = await browser.newPage();
    await dirPage.setViewport({ width: 1366, height: 768 });
    await dirPage.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    // Si muestra login
    const loginUsername = await dirPage.$('#username');
    if (loginUsername) {
      await fillField(dirPage, '#username', 'director.dev');
      await fillField(dirPage, '#password', 'DirectorDev2026!');
      await dirPage.click('button[type="submit"]');
      await dirPage.waitForSelector('aside nav', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log('2. Esperando carga de métricas de Dirección...');
    await dirPage.waitForSelector('#supervision-areas-heading', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 1: Director 1366x768
    const shotDir1366 = path.join(SCREENSHOT_DIR, 'dashboard-direccion-1366x768.png');
    await dirPage.screenshot({ path: shotDir1366, fullPage: true });
    console.log(`✔ Captura generada: ${shotDir1366}`);

    // Captura 2: Director 1920x1080
    console.log('3. Ajustando viewport a 1920x1080...');
    await dirPage.setViewport({ width: 1920, height: 1080 });
    await new Promise(r => setTimeout(r, 1000));

    const shotDir1920 = path.join(SCREENSHOT_DIR, 'dashboard-direccion-1920x1080.png');
    await dirPage.screenshot({ path: shotDir1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotDir1920}`);

    // Cerrar sesión de Director
    console.log('4. Cerrando sesión de Director...');
    const logoutBtn = await dirPage.$('header button[aria-label="Cerrar sesión institucional"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    await dirPage.close();

    // -------------------------------------------------------------
    // FASE 2: SECRETARÍA ACADÉMICA (secretaria.dev)
    // -------------------------------------------------------------
    console.log('5. Iniciando sesión como SECRETARIA (secretaria.dev)...');
    const secPage = await browser.newPage();
    await secPage.setViewport({ width: 1366, height: 768 });
    await secPage.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await secPage.waitForSelector('#username', { timeout: 10000 });
    await fillField(secPage, '#username', 'secretaria.dev');
    await fillField(secPage, '#password', 'SecretariaDev2026!');
    await secPage.click('button[type="submit"]');

    await secPage.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));

    console.log('6. Esperando carga de métricas de Secretaría...');
    await secPage.waitForSelector('#secretariat-areas-heading', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 3: Secretaría 1366x768
    const shotSec1366 = path.join(SCREENSHOT_DIR, 'dashboard-secretaria-1366x768.png');
    await secPage.screenshot({ path: shotSec1366, fullPage: true });
    console.log(`✔ Captura generada: ${shotSec1366}`);

    // Captura 4: Secretaría 1920x1080
    console.log('7. Ajustando viewport a 1920x1080...');
    await secPage.setViewport({ width: 1920, height: 1080 });
    await new Promise(r => setTimeout(r, 1000));

    const shotSec1920 = path.join(SCREENSHOT_DIR, 'dashboard-secretaria-1920x1080.png');
    await secPage.screenshot({ path: shotSec1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotSec1920}`);

    // Cerrar sesión de Secretaría
    console.log('8. Cerrando sesión de Secretaría...');
    const secLogoutBtn = await secPage.$('header button[aria-label="Cerrar sesión institucional"]');
    if (secLogoutBtn) {
      await secLogoutBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    await secPage.close();

    // -------------------------------------------------------------
    // FASE 3: DOCENTE (docente.dev)
    // -------------------------------------------------------------
    console.log('9. Iniciando sesión como DOCENTE (docente.dev)...');
    const docPage = await browser.newPage();
    await docPage.setViewport({ width: 1920, height: 1080 });
    await docPage.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await docPage.waitForSelector('#username', { timeout: 10000 });
    await fillField(docPage, '#username', 'docente.dev');
    await fillField(docPage, '#password', 'DocenteDev2026!');
    await docPage.click('button[type="submit"]');

    await docPage.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 5: Dashboard Docente 1920x1080
    const shotDoc1920 = path.join(SCREENSHOT_DIR, 'dashboard-docente-1920x1080.png');
    await docPage.screenshot({ path: shotDoc1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotDoc1920}`);

    // -------------------------------------------------------------
    // FASE 4: ENTREGAS Y REVISIÓN (Correcciones Tarea 25)
    // -------------------------------------------------------------
    console.log('10. Navegando a #/entregas como Docente (sin aula seleccionada)...');
    await docPage.goto(`${BASE_URL}/#/entregas`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 6: Entregas corregidas 1920x1080
    const shotEntregas = path.join(SCREENSHOT_DIR, 'entregas-corregido-1920x1080.png');
    await docPage.screenshot({ path: shotEntregas, fullPage: true });
    console.log(`✔ Captura generada: ${shotEntregas}`);

    await docPage.close();

    console.log('\n=== VERIFICACIÓN VISUAL COMPLETADA CON ÉXITO ===');
  } catch (err) {
    console.error('Error durante la verificación visual:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
