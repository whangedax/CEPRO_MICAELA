/**
 * tests/verify-estudiantes-matriculas-grupos-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para:
 * 1. ESTUDIANTES (GestionEstudiantes.tsx)
 * 2. MATRÍCULAS (GestionMatriculas.tsx)
 * 3. GRUPOS Y AULAS (GestionGrupos.tsx)
 * 
 * Captura evidencias visuales en 1366x768 y 1920x1080:
 * - estudiantes-1366x768.png / estudiantes-1920x1080.png
 * - matriculas-1366x768.png / matriculas-1920x1080.png
 * - grupos-1366x768.png / grupos-1920x1080.png
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
  console.log('=== INICIANDO CAPTURA E2E DE ESTUDIANTES, MATRÍCULAS Y GRUPOS (TAREA 28) ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------
    // FASE 1: LOGIN COMO DIRECTOR
    // -------------------------------------------------------------
    console.log('1. Iniciando sesión como DIRECTOR (director.dev)...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    const loginUsername = await page.$('#username');
    if (loginUsername) {
      await fillField(page, '#username', 'director.dev');
      await fillField(page, '#password', 'DirectorDev2026!');
      await page.click('button[type="submit"]');
      await page.waitForSelector('aside nav', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));
    }

    // -------------------------------------------------------------
    // FASE 2: MÓDULO ESTUDIANTES (#/estudiantes)
    // -------------------------------------------------------------
    console.log('2. Navegando a #/estudiantes...');
    await page.goto(`${BASE_URL}/#/estudiantes`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura Estudiantes 1366x768
    const shotEst1366 = path.join(SCREENSHOT_DIR, 'estudiantes-1366x768.png');
    await page.screenshot({ path: shotEst1366, fullPage: true });
    console.log(`✔ Captura generada: ${shotEst1366}`);

    // Captura Estudiantes 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 1000));
    const shotEst1920 = path.join(SCREENSHOT_DIR, 'estudiantes-1920x1080.png');
    await page.screenshot({ path: shotEst1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotEst1920}`);

    // -------------------------------------------------------------
    // FASE 3: MÓDULO MATRÍCULAS (#/matriculas)
    // -------------------------------------------------------------
    console.log('3. Navegando a #/matriculas...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/#/matriculas`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura Matrículas 1366x768
    const shotMat1366 = path.join(SCREENSHOT_DIR, 'matriculas-1366x768.png');
    await page.screenshot({ path: shotMat1366, fullPage: true });
    console.log(`✔ Captura generada: ${shotMat1366}`);

    // Captura Matrículas 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 1000));
    const shotMat1920 = path.join(SCREENSHOT_DIR, 'matriculas-1920x1080.png');
    await page.screenshot({ path: shotMat1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotMat1920}`);

    // -------------------------------------------------------------
    // FASE 4: MÓDULO GRUPOS Y AULAS (#/grupos)
    // -------------------------------------------------------------
    console.log('4. Navegando a #/grupos...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/#/grupos`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura Grupos 1366x768
    const shotGrp1366 = path.join(SCREENSHOT_DIR, 'grupos-1366x768.png');
    await page.screenshot({ path: shotGrp1366, fullPage: true });
    console.log(`✔ Captura generada: ${shotGrp1366}`);

    // Captura Grupos 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 1000));
    const shotGrp1920 = path.join(SCREENSHOT_DIR, 'grupos-1920x1080.png');
    await page.screenshot({ path: shotGrp1920, fullPage: true });
    console.log(`✔ Captura generada: ${shotGrp1920}`);

    await page.close();
    console.log('\n=== VERIFICACIÓN VISUAL COMPLETADA CON ÉXITO ===');
  } catch (err) {
    console.error('Error durante la verificación visual:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
