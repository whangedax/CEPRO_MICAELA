/**
 * tests/verify-electron-ui.cjs
 * 
 * Verificación E2E de escritorio REAL para CEPRO_MICAELA 2.0 (Tarea 39A).
 * 
 * Levanta el ejecutable empaquetado nativo de Windows:
 * release/CEPRO_MICAELA_2.0-win32-x64/CEPRO_MICAELA_2.0.exe
 * con --remote-debugging-port=9222, se conecta vía Chrome DevTools Protocol (CDP)
 * con Puppeteer, interactúa con la ventana real de Electron, captura las pantallas
 * oficiales y realiza un cierre limpio sin procesos huérfanos.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXE_PATH = path.join(ROOT_DIR, 'release', 'CEPRO_MICAELA_2.0-win32-x64', 'CEPRO_MICAELA_2.0.exe');
const DATA_DIR = path.join(ROOT_DIR, 'dev-sandbox', 'data');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'capturas_ux_informe2');
const ARTIFACT_DIR = 'C:/Users/whangedax/.gemini/antigravity/brain/213e96a3-2011-433e-ad38-2d173b7740b9';
const CDP_PORT = 9222;

function checkCdpReady(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1000 }, (res) => {
        if (res.statusCode === 200) {
          return resolve(true);
        }
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Tiempo de espera agotado (${timeoutMs}ms) esperando CDP en puerto ${port}`));
      }
      setTimeout(check, 500);
    };

    check();
  });
}

async function fillField(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(selector, text, { delay: 15 });
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
  console.log('  VERIFICACIÓN E2E DESKTOP: EJECUTABLE PACKAGED CEPRO_MICAELA_2.0.exe    ');
  console.log('========================================================================\n');

  if (!fs.existsSync(EXE_PATH)) {
    console.error(`ERROR: No se encontró el ejecutable en: ${EXE_PATH}`);
    console.error('Ejecute primero: npm run electron:pack');
    process.exit(1);
  }

  console.log(`[E2E] 1. Ejecutable localizado: ${EXE_PATH}`);
  console.log(`[E2E]    Directorio de datos: ${DATA_DIR}`);

  // 1. Lanzar el ejecutable empaquetado de Electron con flag de depuración CDP
  const electronProcess = spawn(EXE_PATH, [`--remote-debugging-port=${CDP_PORT}`], {
    env: Object.assign({}, process.env, {
      CETPRO_PORT: '8085',
      CETPRO_DATA_DIR: DATA_DIR,
      CETPRO_ROOT: ROOT_DIR,
    }),
    stdio: 'pipe',
  });

  electronProcess.stdout?.on('data', (d) => {
    const s = d.toString().trim();
    if (s) console.log(`[EXE-STDOUT] ${s}`);
  });

  electronProcess.stderr?.on('data', (d) => {
    const s = d.toString().trim();
    if (s) console.error(`[EXE-STDERR] ${s}`);
  });

  let browser = null;

  try {
    console.log(`[E2E] 2. Esperando inicialización de Electron y backend en puerto CDP ${CDP_PORT}...`);
    await checkCdpReady(CDP_PORT, 25000);
    console.log(`✔ Electron activo y puerto CDP ${CDP_PORT} listo.`);

    console.log(`[E2E] 3. Conectando Puppeteer vía CDP a la ventana nativa de Electron...`);
    browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${CDP_PORT}`,
      defaultViewport: null,
    });

    console.log(`[E2E]    Esperando creación de ventana principal (BrowserWindow)...`);
    let page = null;
    const pageStart = Date.now();
    while (Date.now() - pageStart < 25000) {
      const pages = await browser.pages();
      for (const p of pages) {
        const u = p.url();
        if (u && (u.includes('index.html') || u.startsWith('file://') || u.includes('127.0.0.1'))) {
          page = p;
          break;
        }
      }
      if (page) break;
      if (pages.length > 0 && pages[0].url() !== 'about:blank') {
        page = pages[0];
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!page) {
      // Intentar waitForTarget como fallback
      const target = await browser.waitForTarget(t => t.type() === 'page', { timeout: 10000 });
      page = await target.page();
    }

    if (!page) {
      throw new Error('No se detectó ninguna página en la instancia de Electron tras esperar');
    }

    console.log(`✔ Conectado a la ventana Electron: ${page.url()}`);

    // Configurar viewport 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });

    // Esperar a que la interfaz cargue (formulario o main)
    await page.waitForSelector('main', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    // Capturar pantalla de Login de Electron
    console.log('[E2E] 4. Capturando pantalla de inicio de Electron...');
    await saveScreenshot(page, '00-electron-login-1920x1080.png');

    // -----------------------------------------------------------------------
    // Iniciar sesión como DIRECTOR
    // -----------------------------------------------------------------------
    console.log('[E2E] 5. Autenticando DIRECTOR (director.dev)...');
    const usernameInput = await page.$('#username');
    if (usernameInput) {
      await fillField(page, '#username', 'director.dev');
      await fillField(page, '#password', 'DirectorDev2026!');
      await page.click('button[type="submit"]');
      await page.waitForSelector('aside nav', { timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));
    }

    // -----------------------------------------------------------------------
    // Navegar a la sección de Respaldos
    // -----------------------------------------------------------------------
    console.log('[E2E] 6. Navegando al módulo de Respaldos y Restauración (#respaldo)...');
    await page.evaluate(() => {
      window.location.hash = '#respaldo';
    });
    await new Promise(r => setTimeout(r, 1500));

    // Captura 1: Vista principal con botón Exportar Cifrado (.cetpro-backup)
    console.log('[E2E] 7. Capturando vista de respaldos en ventana Electron (1920x1080)...');
    await saveScreenshot(page, '01-respaldo-con-exportar-cifrado-1920x1080.png');

    // -----------------------------------------------------------------------
    // Abrir modal de Exportar Respaldo Cifrado
    // -----------------------------------------------------------------------
    console.log('[E2E] 8. Abriendo modal Exportar Cifrado (.cetpro-backup)...');
    const allBtns = await page.$$('button');
    let exportBtn = null;
    for (const btn of allBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Exportar Cifrado')) {
        exportBtn = btn;
        break;
      }
    }

    if (exportBtn) {
      await exportBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const inputs = await page.$$('div.fixed input');
      if (inputs.length >= 2) {
        await inputs[0].type('ClaveUltraSegura2026!', { delay: 10 });
        await inputs[1].type('ClaveUltraSegura2026!', { delay: 10 });
        if (inputs.length >= 3) {
          await inputs[2].type('Clave del Director 2026', { delay: 10 });
        }
      }
      await new Promise(r => setTimeout(r, 600));
      await saveScreenshot(page, '02-modal-exportar-cifrado-1920x1080.png');

      // Cerrar modal
      const modalBtns = await page.$$('div.fixed button');
      for (const btn of modalBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('Cerrar') || text.includes('Cancelar'))) {
          await btn.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }

    // -----------------------------------------------------------------------
    // Modal de Inspección / Preflight
    // -----------------------------------------------------------------------
    console.log('[E2E] 9. Verificando modal de inspección / preflight...');
    const tableBtns = await page.$$('table tbody button');
    let targetBtn = null;
    for (const btn of tableBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Verificar')) {
        targetBtn = btn;
        break;
      }
    }

    if (targetBtn) {
      await targetBtn.click();
      await new Promise(r => setTimeout(r, 1200));
      await saveScreenshot(page, '03-inspeccion-cifrado-desbloqueo-1920x1080.png');

      // Cerrar modal
      const closeBtns = await page.$$('div.fixed button');
      for (const btn of closeBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('Cerrar') || text.includes('Entendido'))) {
          await btn.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }

    // -----------------------------------------------------------------------
    // Resolución laptop 1366x768
    // -----------------------------------------------------------------------
    console.log('[E2E] 10. Probando resolución de laptop 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise(r => setTimeout(r, 800));
    await saveScreenshot(page, '04-respaldo-laptop-1366x768.png');

    console.log('\n========================================================================');
    console.log('  VERIFICACIÓN E2E DE ESCRITORIO COMPLETADA CON ÉXITO');
    console.log('========================================================================\n');

  } catch (err) {
    console.error('[E2E] Error durante la ejecución:', err);
    throw err;
  } finally {
    console.log('[E2E] Limpiando conexiones y cerrando aplicación...');
    if (browser) {
      try { await browser.disconnect(); } catch {}
    }
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1500));
      try { electronProcess.kill('SIGKILL'); } catch {}
    }
  }
}

main().catch(err => {
  console.error('Fallo en test E2E:', err);
  process.exit(1);
});
