/**
 * tests/verify-cuentas-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para:
 * GESTIÓN DE CUENTAS, USUARIOS Y ASIGNACIONES (GestionCuentas.tsx - Tarea 31)
 * 
 * Captura evidencias visuales en 1366x768 y 1920x1080:
 * - cuentas-director-1366x768.png
 * - cuentas-director-1920x1080.png
 * - cuentas-modal-creacion-1920x1080.png
 * - cuentas-secretaria-1920x1080.png
 * - cuentas-docente-1920x1080.png
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
    // Si ya hay sesión abierta, verificar si es el mismo usuario o hacer logout
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
    console.log('Logout notice:', e.message);
  }
}

async function run() {
  console.log('=== INICIANDO CAPTURA E2E DE GESTIÓN DE CUENTAS (TAREA 31) ===\n');

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
    // FASE 1: DIRECTOR (1366x768 y 1920x1080)
    // -------------------------------------------------------------
    console.log('1. Iniciando sesión como DIRECTOR (director.dev)...');
    await page.setViewport({ width: 1366, height: 768 });
    await doLogin(page, 'director.dev', 'DirectorDev2026!');

    console.log('2. Navegando a Gestión de Cuentas (#/cuentas) como DIRECTOR...');
    await page.goto(`${BASE_URL}/#/cuentas`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Captura 1366x768
    const path1366 = path.join(SCREENSHOT_DIR, 'cuentas-director-1366x768.png');
    await page.screenshot({ path: path1366, fullPage: false });
    console.log(`✓ Captura guardada: ${path1366}`);

    // Captura 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 800));
    const path1920 = path.join(SCREENSHOT_DIR, 'cuentas-director-1920x1080.png');
    await page.screenshot({ path: path1920, fullPage: false });
    console.log(`✓ Captura guardada: ${path1920}`);

    // -------------------------------------------------------------
    // FASE 2: DRAWER DE CREACIÓN / ASIGNACIÓN
    // -------------------------------------------------------------
    console.log('3. Abriendo Drawer de Nueva Cuenta y Asignación Docente...');
    const btnNueva = await page.$('#btn-nueva-cuenta');
    if (btnNueva) {
      await btnNueva.click();
      await new Promise((r) => setTimeout(r, 800));

      // Seleccionar un aula en el formulario docente para ver las unidades
      const selectAula = await page.$('select[class*="text-slate-800"]');
      if (selectAula) {
        // Seleccionar la segunda opción del selector de grupo
        await page.evaluate((el) => {
          const selects = Array.from(document.querySelectorAll('select'));
          const groupSelect = selects.find((s) => s.innerHTML.includes('Elija un aula'));
          if (groupSelect && groupSelect.options.length > 1) {
            groupSelect.selectedIndex = 1;
            groupSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await new Promise((r) => setTimeout(r, 600));
      }

      const pathModal = path.join(SCREENSHOT_DIR, 'cuentas-modal-creacion-1920x1080.png');
      await page.screenshot({ path: pathModal, fullPage: false });
      console.log(`✓ Captura guardada: ${pathModal}`);

      // Cerrar Drawer
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 600));
    }

    // -------------------------------------------------------------
    // FASE 3: SECRETARIA (1920x1080)
    // -------------------------------------------------------------
    console.log('4. Cerrando sesión de Director y entrando como SECRETARIA (secretaria.dev)...');
    await doLogout(page);
    await doLogin(page, 'secretaria.dev', 'SecretariaDev2026!');

    console.log('5. Navegando a Gestión de Cuentas (#/cuentas) como SECRETARIA...');
    await page.goto(`${BASE_URL}/#/cuentas`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    const pathSec = path.join(SCREENSHOT_DIR, 'cuentas-secretaria-1920x1080.png');
    await page.screenshot({ path: pathSec, fullPage: false });
    console.log(`✓ Captura guardada: ${pathSec}`);

    // -------------------------------------------------------------
    // FASE 4: DOCENTE (1920x1080)
    // -------------------------------------------------------------
    console.log('6. Cerrando sesión de Secretaria y entrando como DOCENTE (docente.dev)...');
    await doLogout(page);
    await doLogin(page, 'docente.dev', 'DocenteDev2026!');

    console.log('7. Verificando navegación a Mi Ficha Institucional (#/cuentas) como DOCENTE...');
    // Verificar que el sidebar muestre "Mi ficha institucional" para el rol DOCENTE
    const sidebarText = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside nav a, aside nav button'));
      return links.map((l) => l.textContent?.trim()).filter(Boolean);
    });
    const hasFichaLabel = sidebarText.some((text) => text.includes('Mi ficha institucional'));
    console.log(`   - Enlace en sidebar "Mi ficha institucional": ${hasFichaLabel ? 'PRESENTE' : 'NO ENCONTRADO'}`);
    if (!hasFichaLabel) {
      throw new Error('El sidebar no contiene el texto "Mi ficha institucional" para el rol DOCENTE.');
    }

    // Navegar formalmente a #/cuentas
    await page.goto(`${BASE_URL}/#/cuentas`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Validar que la URL permanezca en #/cuentas (sin redirección indebida a #/inicio)
    const currentUrl = page.url();
    console.log(`   - URL actual: ${currentUrl}`);
    if (!currentUrl.includes('#/cuentas')) {
      throw new Error(`La URL no permaneció en #/cuentas. Redirigió a: ${currentUrl}`);
    }

    // Validar que se renderice la ficha institucional del docente
    const pageContent = await page.evaluate(() => document.body.innerText);
    const hasDocenteProfile = pageContent.includes('@docente.dev') || pageContent.includes('Ficha de cuenta institucional');
    console.log(`   - Ficha institucional renderizada: ${hasDocenteProfile ? 'SÍ' : 'NO'}`);
    if (!hasDocenteProfile) {
      throw new Error('No se renderizó la ficha institucional del docente.');
    }

    // Validar RBAC estricto: DOCENTE no tiene botón "+ Nueva Cuenta" ni tabla administrativa
    const btnNuevaDocente = await page.$('#btn-nueva-cuenta');
    const tableDocente = await page.$('table');
    console.log(`   - Botón "+ Nueva Cuenta" visible para docente: ${btnNuevaDocente ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
    console.log(`   - Tabla de todas las cuentas visible para docente: ${tableDocente ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
    if (btnNuevaDocente || tableDocente) {
      throw new Error('Violación RBAC: Elementos de administración expuestos al rol DOCENTE.');
    }

    const pathDoc = path.join(SCREENSHOT_DIR, 'cuentas-docente-1920x1080.png');
    await page.screenshot({ path: pathDoc, fullPage: false });
    console.log(`✓ Captura regenerada con éxito: ${pathDoc}`);

    console.log('\n=== CAPTURAS E2E Y VALIDACIÓN RBAC COMPLETADAS EXITOSAMENTE ===');

    console.log('\n=== CAPTURAS E2E COMPLETADAS EXITOSAMENTE ===');
  } catch (err) {
    console.error('Error durante la verificación UI:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
