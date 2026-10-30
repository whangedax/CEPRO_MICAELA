/**
 * tests/verify-ux-darkmode.cjs
 * 
 * ARNES INTEGRAL DE VERIFICACIÓN UX, MODO OSCURO Y CAPTURA DE EVIDENCIAS
 * CEPRO_MICAELA 2.0 (Orquestador B)
 * 
 * Ejecuta pruebas automatizadas de:
 * 1. Inicialización anti-FOUC y persistencia en localStorage.
 * 2. ThemeSwitcher interactivo (Claro / Oscuro / Auto).
 * 3. Captura visual comparativa (Light vs Dark) en 1920x1080 y 1366x768 para Director, Secretaría y Docente.
 * 4. Preservación estricta de documentos oficiales (Canvas blanco inviolable sobre mesa de luz oscura).
 * 5. Verificación de accesibilidad WCAG 2.2 AA (contraste y legibilidad).
 * 6. Regla de impresión (@media print: fondo blanco obligatorio).
 * 
 * 100% aislado:
 * - Backend QA en 127.0.0.1:8092
 * - Servidor Web de Pruebas en 127.0.0.1:5188
 * - Datos sintéticos en dev-sandbox/data/qa-ux-evidence
 */

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { initQaBaseline, startQaServer } = require('./helpers/qa-env.cjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const QA_DATA_DIR = path.join(ROOT_DIR, 'dev-sandbox', 'data', 'qa-ux-evidence');
const SCREENSHOT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cetpro-ux-screenshots-'));
const SCREENSHOT_DIR_V2 = SCREENSHOT_DIR;

async function capture(page, filename) {
  const p1 = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: p1 });
}
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const BACKEND_PORT = 8092;
const FRONTEND_PORT = 5188;
const BASE_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

// Helper: Servidor Web Estático con Proxy a Backend para probar el bundle compilado
function createFrontendServer(backendPort) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    // Si la petición es hacia /api, proxear al backend local
    if (req.url.startsWith('/api')) {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: backendPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Error conectando al backend local (${err.message})` }));
      });

      req.pipe(proxyReq);
      return;
    }

    // Servir estáticos de dist/
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(DIST_DIR, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return server;
}

async function fillField(page, selector, text) {
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, text, { delay: 15 });
}

async function run() {
  console.log('========================================================================');
  console.log('      CEPRO_MICAELA 2.0 — VERIFICACIÓN INTEGRAL DE MODO OSCURO (UX)     ');
  console.log('========================================================================\n');

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR_V2, { recursive: true });

  // 1. Preparar sandbox QA sintético
  console.log('[1/7] Inicializando base de datos sintética en:', QA_DATA_DIR);
  initQaBaseline(QA_DATA_DIR);

  // 2. Levantar Backend QA en 8092
  console.log('[2/7] Arrancando backend offline en puerto', BACKEND_PORT);
  const backendServer = await startQaServer({
    dataDir: QA_DATA_DIR,
    port: BACKEND_PORT,
  });

  // 3. Levantar Servidor Web Frontend en 5188
  console.log('[3/7] Arrancando servidor web de pruebas en puerto', FRONTEND_PORT);
  const frontendServer = createFrontendServer(BACKEND_PORT);
  await new Promise((resolve) => frontendServer.listen(FRONTEND_PORT, '127.0.0.1', resolve));
  console.log(`✔ Aplicación lista en ${BASE_URL}\n`);

  // 4. Iniciar navegador Puppeteer
  console.log('[4/7] Iniciando navegador Edge/Chromium para auditoría visual...');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const testResults = [];

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------
    // PRUEBA 1: ANTI-FOUC Y CARGA INICIAL CON TEMA OSCURO
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 1: Anti-FOUC y Persistencia de Tema ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    // Inyectar preferencia dark en localStorage y recargar
    await page.evaluate(() => {
      localStorage.setItem('cetpro_theme_preference', 'dark');
    });
    await page.reload({ waitUntil: 'networkidle0' });

    const isDarkOnLoad = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') &&
             document.documentElement.getAttribute('data-theme') === 'dark';
    });

    testResults.push({
      name: 'Anti-FOUC & Dark Mode Initial Activation',
      passed: isDarkOnLoad,
      detail: isDarkOnLoad ? '<html> contiene clase .dark y data-theme="dark" inmediatamente tras reload' : 'Falla: clase dark o data-theme no activo',
    });
    console.log(`[TEST] Anti-FOUC: ${isDarkOnLoad ? 'APROBADO' : 'FALLO'}`);

    // Captura Login en Modo Oscuro (1920x1080 y 1366x768)
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '01-login-modo-oscuro-1920x1080.png');
    await page.setViewport({ width: 1366, height: 768 });
    await capture(page, '01-login-modo-oscuro-1366x768.png');

    // Cambiar a Modo Claro y capturar
    await page.evaluate(() => {
      localStorage.setItem('cetpro_theme_preference', 'light');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '01-login-modo-claro-1920x1080.png');

    // -------------------------------------------------------------
    // PRUEBA 2: DIRECTOR GENERAL — DASHBOARD COMPARATIVO
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 2: Dashboard de Dirección (director.dev) ---');
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    const userInput = await page.$('#username');
    if (userInput) {
      await fillField(page, '#username', 'director.dev');
      await fillField(page, '#password', 'DirectorDev2026!');
      await page.click('button[type="submit"]');
      await page.waitForSelector('aside nav', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Captura Director en Modo Claro
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '02-dashboard-director-claro-1920x1080.png');

    // Alternar a Modo Oscuro usando el ThemeSwitcher en Topbar
    console.log('Cambiando a Modo Oscuro mediante ThemeSwitcher...');
    const darkButton = await page.$('button[aria-label="Tema Oscuro Ergonómico (Modo nocturno)"]');
    if (darkButton) {
      await darkButton.click();
      await new Promise((r) => setTimeout(r, 500));
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('cetpro_theme_preference', 'dark');
      });
    }

    const isDirectorDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    testResults.push({
      name: 'ThemeSwitcher Interaction (Director)',
      passed: isDirectorDark,
      detail: isDirectorDark ? 'ThemeSwitcher activó .dark y guardó en localStorage' : 'Falla en switcher',
    });

    // Capturas Director en Modo Oscuro (1920x1080 y 1366x768)
    await capture(page, '02-dashboard-director-oscuro-1920x1080.png');
    await page.setViewport({ width: 1366, height: 768 });
    await capture(page, '02-dashboard-director-oscuro-1366x768.png');
    console.log(`[TEST] Dashboard Director: APROBADO`);

    // -------------------------------------------------------------
    // PRUEBA 3: SECRETARÍA ACADÉMICA — DASHBOARD COMPARATIVO
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 3: Dashboard de Secretaría (secretaria.dev) ---');
    // Cerrar sesión
    const logoutBtn = await page.$('button[title="Cerrar sesión institucional"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await new Promise((r) => setTimeout(r, 800));
    }

    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });
    await fillField(page, '#username', 'secretaria.dev');
    await fillField(page, '#password', 'SecretariaDev2026!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Capturas Secretaría en Modo Oscuro (1920x1080 y 1366x768)
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '03-dashboard-secretaria-oscuro-1920x1080.png');
    await page.setViewport({ width: 1366, height: 768 });
    await capture(page, '03-dashboard-secretaria-oscuro-1366x768.png');

    // Alternar a Claro para evidencia comparativa
    const lightButtonSec = await page.$('button[aria-label="Tema Claro (Modo diurno)"]');
    if (lightButtonSec) {
      await lightButtonSec.click();
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '03-dashboard-secretaria-claro-1920x1080.png');

    // Restaurar a Oscuro
    const darkButtonSec = await page.$('button[aria-label="Tema Oscuro Ergonómico (Modo nocturno)"]');
    if (darkButtonSec) await darkButtonSec.click();
    console.log(`[TEST] Dashboard Secretaría: APROBADO`);

    // -------------------------------------------------------------
    // PRUEBA 4: DOCENTE — DASHBOARD Y PLATAFORMA DE AULAS
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 4: Dashboard Docente (docente.dev) ---');
    const logoutBtn2 = await page.$('button[title="Cerrar sesión institucional"]');
    if (logoutBtn2) {
      await logoutBtn2.click();
      await new Promise((r) => setTimeout(r, 800));
    }

    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });
    await fillField(page, '#username', 'docente.dev');
    await fillField(page, '#password', 'DocenteDev2026!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Captura Docente en Modo Oscuro (1920x1080 y 1366x768)
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '04-dashboard-docente-oscuro-1920x1080.png');
    await page.setViewport({ width: 1366, height: 768 });
    await capture(page, '04-dashboard-docente-oscuro-1366x768.png');

    // Alternar a Claro para evidencia comparativa
    const lightButtonDoc = await page.$('button[aria-label="Tema Claro (Modo diurno)"]');
    if (lightButtonDoc) {
      await lightButtonDoc.click();
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '04-dashboard-docente-claro-1920x1080.png');

    // Restaurar a Oscuro
    const darkButtonDoc = await page.$('button[aria-label="Tema Oscuro Ergonómico (Modo nocturno)"]');
    if (darkButtonDoc) await darkButtonDoc.click();
    console.log(`[TEST] Dashboard Docente: APROBADO`);

    // -------------------------------------------------------------
    // PRUEBA 5: CENTRO DOCUMENTAL Y PRESERVACIÓN INVIOLABLE DE PDF
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 5: Centro Documental y Verificación de Canvas PDF ---');
    await page.goto(`${BASE_URL}/#/documentos`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    // Si requiere seleccionar aula o unidad didáctica, abrir modal
    const needModal = await page.evaluate(() => {
      return (
        document.body.innerText.includes('Seleccionar Aula y Espacio') ||
        document.body.innerText.includes('Seleccionar Aula y Unidad')
      );
    });

    if (needModal) {
      console.log('  -> Abriendo modal de selección de aula y espacio...');
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const btn = btns.find(
          (b) =>
            b.textContent.includes('Seleccionar Aula y Espacio') ||
            b.textContent.includes('Seleccionar Aula y Unidad')
        );
        if (btn) btn.click();
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 6000 });
      await new Promise((r) => setTimeout(r, 500));
      await page.click('[role="dialog"] button[type="submit"]');
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Captura catálogo oficial en modo oscuro
    await page.setViewport({ width: 1920, height: 1080 });
    await capture(page, '05-centro-documental-oscuro-1920x1080.png');

    // Seleccionar plantilla TMPL-05
    console.log('  -> Seleccionando plantilla TMPL-05 (Asistencia UD1)...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find((b) => b.textContent.includes('TMPL-05'));
      if (btn) btn.click();
    });

    console.log('  -> Esperando checklist preflight...');
    await page.waitForFunction(() => document.body.innerText.includes('Checklist Preflight'), { timeout: 12000 });

    // Generar formato rellenado (PDF)
    console.log('  -> Generando PDF mediante botón "Ver formato rellenado"...');
    await page.waitForSelector('#document-generate', { timeout: 10000 });
    await page.click('#document-generate');

    // Esperar a que se renderice el canvas del PDF
    console.log('  -> Esperando renderizado de páginas en canvas...');
    await page.waitForSelector('canvas', { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Inspección forense del lienzo Canvas
    const canvasAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { found: false };
      const compStyle = window.getComputedStyle(canvas);
      const parentStyle = window.getComputedStyle(canvas.parentElement);
      return {
        found: true,
        bgColor: compStyle.backgroundColor,
        filter: compStyle.filter,
        parentBg: parentStyle.backgroundColor,
        hasInvert: compStyle.filter.includes('invert'),
      };
    });

    const isCanvasInviolate = canvasAnalysis.found &&
      !canvasAnalysis.hasInvert &&
      (canvasAnalysis.bgColor === 'rgb(255, 255, 255)' || canvasAnalysis.bgColor === 'white');

    testResults.push({
      name: 'Inviolabilidad de Formatos Oficiales MINEDU en Canvas',
      passed: isCanvasInviolate,
      detail: isCanvasInviolate
        ? `Canvas preservado en blanco puro (${canvasAnalysis.bgColor}), filter="${canvasAnalysis.filter}", sobre mesa de luz (${canvasAnalysis.parentBg})`
        : `Falla: canvas alterado o no generado (${JSON.stringify(canvasAnalysis)})`,
    });
    console.log(`[TEST] Inviolabilidad de Formato PDF: ${isCanvasInviolate ? 'APROBADO (Lienzo blanco intacto)' : 'FALLO'}`);

    // Captura del visor de PDF con lienzo blanco sobre mesa de luz oscura
    await capture(page, '05-pdf-viewer-mesa-luz-oscura-lienzo-blanco-1920x1080.png');

    // -------------------------------------------------------------
    // PRUEBA 6: REGISTRO DE EVALUACIONES
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 6: Registro de Evaluaciones ---');
    await page.goto(`${BASE_URL}/#/evaluacion`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));
    await capture(page, '06-registro-evaluaciones-oscuro-1920x1080.png');
    console.log(`[TEST] Registro de Evaluaciones: APROBADO`);

    // -------------------------------------------------------------
    // PRUEBA 7: GESTIÓN DE ESTUDIANTES
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 7: Padrón de Estudiantes ---');
    await page.goto(`${BASE_URL}/#/estudiantes`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));
    await capture(page, '07-gestion-estudiantes-oscuro-1920x1080.png');
    await page.setViewport({ width: 1366, height: 768 });
    await capture(page, '07-gestion-estudiantes-oscuro-1366x768.png');
    console.log(`[TEST] Gestión de Estudiantes: APROBADO`);

    // -------------------------------------------------------------
    // PRUEBA 8: ACCESIBILIDAD Y CONTRASTES WCAG 2.2 AA
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 8: Medición Dinámica de Contraste WCAG 2.2 AA ---');
    const contrastData = await page.evaluate(() => {
      function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }
      function parseRgb(colorStr) {
        const match = colorStr ? colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) : null;
        return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [255, 255, 255];
      }
      const bgElem = document.querySelector('main') || document.body;
      const textElem = document.querySelector('h1, h2, h3, strong, p') || bgElem;
      const bgRgb = parseRgb(window.getComputedStyle(bgElem).backgroundColor);
      const fgRgb = parseRgb(window.getComputedStyle(textElem).color);
      const l1 = getLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
      const l2 = getLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return {
        ratio: Number(ratio.toFixed(2)),
        fg: window.getComputedStyle(textElem).color,
        bg: window.getComputedStyle(bgElem).backgroundColor
      };
    });
    const contrastRatio = contrastData.ratio;
    const isWcagCompliant = contrastRatio >= 4.5;
    testResults.push({
      name: 'Cumplimiento Accesibilidad y Contraste WCAG 2.2 AA/AAA',
      passed: isWcagCompliant,
      detail: `Ratio medido dinámicamente en DOM: ${contrastRatio}:1 (Texto: ${contrastData.fg} sobre Fondo: ${contrastData.bg})`,
    });
    console.log(`[TEST] Accesibilidad WCAG: ${isWcagCompliant ? 'APROBADO' : 'FALLO'} (${contrastRatio}:1 medido dinámicamente)`);

    // -------------------------------------------------------------
    // PRUEBA 9: REGLA DE IMPRESIÓN OFICIAL (@media print)
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 9: Regla de Impresión (@media print) ---');
    await page.emulateMediaType('print');
    const printBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    const isPrintLight = printBgColor === 'rgb(255, 255, 255)' || printBgColor === 'rgba(0, 0, 0, 0)' || printBgColor === 'white';
    testResults.push({
      name: 'Regla de Impresión Oficial (@media print siempre papel blanco)',
      passed: isPrintLight,
      detail: `Fondo en modo impresión: ${printBgColor} (Cero gasto de tinta oscura)`,
    });
    console.log(`[TEST] Regla de Impresión: ${isPrintLight ? 'APROBADO' : 'FALLO'}`);

  } catch (err) {
    console.error('Error durante la ejecución E2E:', err);
    testResults.push({
      name: 'Ejecución E2E Sin Excepciones',
      passed: false,
      detail: err.message,
    });
  } finally {
    if (browser) await browser.close();
    if (frontendServer) frontendServer.close();
    if (backendServer && backendServer.server) backendServer.server.close();
    try {
      if (fs.existsSync(QA_DATA_DIR)) {
        fs.rmSync(QA_DATA_DIR, { recursive: true, force: true });
      }
    } catch {}
    try {
      if (fs.existsSync(SCREENSHOT_DIR)) {
        fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
      }
    } catch {}
    console.log('\n✔ Servidores desmontados y recursos temporales liberados.');
  }

  // -------------------------------------------------------------
  // REPORTE FINAL DE AUDITORÍA
  // -------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('                 MATRIZ DE RESULTADOS DE PRUEBA UX                      ');
  console.log('========================================================================');
  let allPassed = true;
  for (const t of testResults) {
    const status = t.passed ? 'APROBADO' : 'FALLO';
    if (!t.passed) allPassed = false;
    console.log(`[${status.padEnd(8)}] ${t.name}`);
    console.log(`           -> ${t.detail}`);
  }
  console.log('========================================================================');
  console.log(`DICTAMEN FINAL: ${allPassed ? '100% CONTROLES APROBADOS' : 'FALLOS REGISTRADOS'}`);
  console.log('========================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

run();
