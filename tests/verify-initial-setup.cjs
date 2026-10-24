/**
 * tests/verify-initial-setup.cjs
 * 
 * Verificación E2E de Primera Instalación (MED-01) para CEPRO_MICAELA 2.0.
 * Prueba el arranque en un entorno completamente virgen (initialized: false),
 * valida la presentación del Asistente de Configuración Inicial, ejecuta
 * el aprovisionamiento de la cuenta de Dirección y verifica la inicialización
 * completa del nodo maestro.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXE_PATH = path.join(ROOT_DIR, 'release', 'CEPRO_MICAELA_2.0-win32-x64', 'CEPRO_MICAELA_2.0.exe');
const FRESH_DATA_DIR = path.join(ROOT_DIR, 'dev-sandbox', 'data', 'qa-fresh-setup');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'capturas_ux_informe2');
const ARTIFACT_DIR = 'C:/Users/whangedax/.gemini/antigravity/brain/213e96a3-2011-433e-ad38-2d173b7740b9';
const CDP_PORT = 9223;

function checkCdpReady(port, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1000 }, (res) => {
        if (res.statusCode === 200) return resolve(true);
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Tiempo agotado esperando CDP en puerto ${port}`));
      }
      setTimeout(check, 500);
    };
    check();
  });
}

async function saveScreenshot(page, filename) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
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
  console.log('========================================================================');
  console.log('  VERIFICACIÓN E2E: ASISTENTE DE CONFIGURACIÓN INICIAL (MED-01)          ');
  console.log('========================================================================\n');

  // Limpiar directorio de datos virgen previo si existe
  if (fs.existsSync(FRESH_DATA_DIR)) {
    fs.rmSync(FRESH_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(FRESH_DATA_DIR, { recursive: true });

  console.log(`[E2E-SETUP] Directorio virgen preparado: ${FRESH_DATA_DIR}`);

  const electronProcess = spawn(EXE_PATH, [`--remote-debugging-port=${CDP_PORT}`], {
    env: Object.assign({}, process.env, {
      CETPRO_PORT: '8086',
      CETPRO_DATA_DIR: FRESH_DATA_DIR,
      CETPRO_ROOT: ROOT_DIR,
    }),
    stdio: 'pipe',
  });

  electronProcess.stdout?.on('data', d => console.log(`[SETUP-EXE] ${d.toString().trim()}`));
  electronProcess.stderr?.on('data', d => console.error(`[SETUP-ERR] ${d.toString().trim()}`));

  let browser = null;

  try {
    await checkCdpReady(CDP_PORT, 25000);
    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${CDP_PORT}`,
      defaultViewport: null,
    });

    console.log('[E2E-SETUP] Esperando ventana de Electron...');
    let page = null;
    const start = Date.now();
    while (Date.now() - start < 20000) {
      const pages = await browser.pages();
      for (const p of pages) {
        if (p.url().includes('index.html') || p.url().startsWith('file://')) {
          page = p;
          break;
        }
      }
      if (page) break;
      await new Promise(r => setTimeout(r, 400));
    }

    if (!page) throw new Error('No se detectó la página en el arranque virgen');

    await page.setViewport({ width: 1920, height: 1080 });
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    // Capturar pantalla del Asistente de Configuración Inicial
    console.log('[E2E-SETUP] 1. Capturando Asistente de Configuración Inicial (initialized: false)...');
    await saveScreenshot(page, '05-asistente-configuracion-inicial-1920x1080.png');

    // Llenar formulario de primera configuración
    console.log('[E2E-SETUP] 2. Completando formulario de configuración inicial...');
    const inputs = await page.$$('form input');
    // input 0: instName (ya prellenado)
    // input 1: directorFullName (ya prellenado)
    // input 2: directorUser (ya prellenado)
    // input 3: directorPass
    // input 4: confirmPass
    if (inputs.length >= 5) {
      await inputs[3].type('DirectorSeguro2026!', { delay: 15 });
      await inputs[4].type('DirectorSeguro2026!', { delay: 15 });
    }

    await new Promise(r => setTimeout(r, 600));

    // Enviar configuración inicial
    console.log('[E2E-SETUP] 3. Enviando inicialización institucional (POST /api/setup)...');
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    // Esperar navegación al dashboard tras auto-login
    await page.waitForSelector('aside nav', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));

    console.log('[E2E-SETUP] 4. Nodo inicializado con éxito y sesión de Director activa.');
    await saveScreenshot(page, '06-post-setup-director-dashboard-1920x1080.png');

    console.log('\n========================================================================');
    console.log('  VERIFICACIÓN DEL ASISTENTE DE CONFIGURACIÓN INICIAL EXITOSA');
    console.log('========================================================================\n');

  } finally {
    if (browser) {
      try { await browser.disconnect(); } catch {}
    }
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1200));
      try { electronProcess.kill('SIGKILL'); } catch {}
    }
    // Limpieza
    try {
      if (fs.existsSync(FRESH_DATA_DIR)) {
        fs.rmSync(FRESH_DATA_DIR, { recursive: true, force: true });
      }
    } catch {}
  }
}

main().catch(err => {
  console.error('[E2E-SETUP] Fallo:', err);
  process.exit(1);
});
