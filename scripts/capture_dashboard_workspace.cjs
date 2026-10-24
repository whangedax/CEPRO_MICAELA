/**
 * scripts/capture_dashboard_workspace.cjs
 * 
 * Genera capturas de pantalla de evidencia para la TAREA 11:
 * 1. Dashboard Docente con aulas reales desde SQLite (dev-sandbox/data).
 * 2. Modal de selección de Unidad Didáctica y espacio de trabajo.
 * 3. Dashboard Docente con contexto académico activo tras confirmar ingreso.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { validateDevSandbox, DEFAULT_DEV_PORT } = require('./dev-sandbox-guard.cjs');
const { createService } = require('./offline-http.cjs');

const root = path.resolve(__dirname, '..');
const sandboxDir = path.resolve(root, 'dev-sandbox', 'data');
const artifactDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\c9975a44-786f-4a85-9cb1-8dc2eb6ed0f5';
const localCapturasDir = path.resolve(root, 'capturas_tarea11');

fs.mkdirSync(localCapturasDir, { recursive: true });
if (fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout esperando URL: ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    }
    check();
  });
}

(async () => {
  console.log('[CAPTURA TAREA 11] Validando sandbox y levantando servidor dev...');
  const guard = validateDevSandbox({
    dataDir: sandboxDir,
    port: DEFAULT_DEV_PORT
  });

  const service = createService({
    root,
    directory: guard.dataDir,
    backupFile: null
  });

  const server = service.server();
  await new Promise((resolve) => {
    server.listen(guard.port, guard.host, resolve);
  });
  console.log(`[CAPTURA TAREA 11] Backend dev escuchando en http://${guard.host}:${guard.port}`);

  console.log('[CAPTURA TAREA 11] Levantando Vite preview en http://127.0.0.1:5174...');
  const viteProc = spawn('npx.cmd', ['vite', 'preview', '--port', '5174', '--host', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore',
    shell: true
  });

  try {
    await waitForHttp('http://127.0.0.1:5174/');
    console.log('[CAPTURA TAREA 11] Vite preview listo.');

    const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({
      executablePath: edgePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1024 });

    console.log('[CAPTURA TAREA 11] Navegando a http://127.0.0.1:5174/#/inicio...');
    await page.goto('http://127.0.0.1:5174/#/inicio', { waitUntil: 'networkidle0' });

    // Esperar a que el formulario de login esté presente
    await page.waitForSelector('#username', { timeout: 10000 });

    console.log('[CAPTURA TAREA 11] Autenticando como docente.dev...');
    await page.type('#username', 'docente.dev');
    await page.type('#password', 'DocenteDev2026!');
    await page.click('button[type="submit"]');

    // Esperar a que el Dashboard Docente cargue
    await page.waitForSelector('#section-classrooms-title', { timeout: 10000 });
    // Esperar a que las tarjetas de aulas reales se rendericen
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('button');
      return Array.from(cards).some(b => b.textContent && b.textContent.includes('Ingresar al aula'));
    }, { timeout: 10000 });

    await new Promise(r => setTimeout(r, 1500));

    // Captura 1: Dashboard con aulas reales conectadas
    const cap1Local = path.join(localCapturasDir, 'dashboard-docente-aulas-reales.png');
    const cap1Artifact = path.join(artifactDir, 'dashboard-docente-aulas-reales.png');
    await page.screenshot({ path: cap1Local, fullPage: true });
    if (fs.existsSync(artifactDir)) fs.copyFileSync(cap1Local, cap1Artifact);
    console.log('✔ Captura 1 guardada:', cap1Local);

    // Clic en "Ingresar al aula" para abrir modal de selección de unidad
    console.log('[CAPTURA TAREA 11] Abriendo modal de selección de unidad...');
    const enterButtons = await page.$$('button');
    let clicked = false;
    for (const btn of enterButtons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text && text.includes('Ingresar al aula')) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) throw new Error('No se encontró el botón Ingresar al aula');

    // Esperar modal
    await page.waitForSelector('#select-unit-modal-title', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));

    // Captura 2: Modal de selección de Unidad Didáctica
    const cap2Local = path.join(localCapturasDir, 'modal-seleccion-unidad.png');
    const cap2Artifact = path.join(artifactDir, 'modal-seleccion-unidad.png');
    await page.screenshot({ path: cap2Local, fullPage: true });
    if (fs.existsSync(artifactDir)) fs.copyFileSync(cap2Local, cap2Artifact);
    console.log('✔ Captura 2 guardada:', cap2Local);

    // Confirmar ingreso con UD1
    console.log('[CAPTURA TAREA 11] Confirmando selección de UD1...');
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) await submitBtn.click();

    // Esperar a que el modal se cierre y aparezca el banner de espacio activo
    await page.waitForSelector('aside[aria-label="Espacio académico activo"]', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1200));

    // Captura 3: Dashboard con Espacio de Trabajo Activo
    const cap3Local = path.join(localCapturasDir, 'dashboard-workspace-activo.png');
    const cap3Artifact = path.join(artifactDir, 'dashboard-workspace-activo.png');
    await page.screenshot({ path: cap3Local, fullPage: true });
    if (fs.existsSync(artifactDir)) fs.copyFileSync(cap3Local, cap3Artifact);
    console.log('✔ Captura 3 guardada:', cap3Local);

    await browser.close();
    console.log('[CAPTURA TAREA 11] Proceso de captura finalizado exitosamente.');
  } finally {
    try {
      viteProc.kill();
    } catch {}
    try {
      server.close();
      service.core.close();
    } catch {}
  }
})();
