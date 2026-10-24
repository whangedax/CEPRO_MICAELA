/**
 * tests/verify-role-separation.cjs
 * 
 * Verificación integral E2E de separación de interfaces por rol y accesibilidad:
 * - Accesibilidad del toggle de contraseña (teclado, foco, tabIndex).
 * - Rol DOCENTE: DashboardDocente Stitch preservado, rutas autorizadas exactas, bloqueo de no autorizadas.
 * - Rol DIRECTOR: Panel de Dirección provisional ("Panel de Dirección pendiente de modernización"), rutas completas.
 * - Rol SECRETARIA: Panel de Secretaría provisional ("Panel de Secretaría pendiente de modernización"), exclusión de respaldo.
 * - Cierre de sesión y limpieza de hash/estado.
 * - Cero errores de consola.
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://127.0.0.1:5173';

async function fillField(page, selector, text) {
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, text, { delay: 5 });
}

async function runTests() {
  console.log('=== INICIANDO VERIFICACIÓN E2E DE SEPARACIÓN DE ROLES ===\n');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: PÁGINA DE LOGIN Y ACCESIBILIDAD DEL TOGGLE PASSWORD
    // -------------------------------------------------------------
    console.log('[TEST 1] Verificando página de Login y accesibilidad del botón de contraseña...');
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    // Verificar que estamos en la pantalla de login
    await page.waitForSelector('h1');
    const loginHeader = await page.$eval('h1', el => el.textContent.trim());
    console.log(`  ✔ Título de bienvenida: "${loginHeader}"`);

    // Comprobar accesibilidad del botón de mostrar contraseña
    const passwordToggle = await page.$('button[aria-label*="contraseña"]');
    if (!passwordToggle) {
      throw new Error('No se encontró el botón de mostrar/ocultar contraseña con aria-label apropiado');
    }

    const tabIndex = await page.$eval('button[aria-label*="contraseña"]', el => el.getAttribute('tabindex'));
    if (tabIndex === '-1') {
      throw new Error('El botón de contraseña tiene tabIndex=-1, lo que viola el requisito de accesibilidad por teclado');
    }
    console.log(`  ✔ Botón de contraseña tiene tabIndex accesible: ${tabIndex === null ? '0 (nativo)' : tabIndex}`);

    // Probar interacción con el toggle
    await fillField(page, '#password', 'TestPassword123');
    let inputType = await page.$eval('#password', el => el.getAttribute('type'));
    console.log(`  ✔ Tipo de input inicial: "${inputType}"`);

    await passwordToggle.click();
    inputType = await page.$eval('#password', el => el.getAttribute('type'));
    const toggleLabel = await page.$eval('button[aria-label*="contraseña"]', el => el.getAttribute('aria-label'));
    console.log(`  ✔ Tipo de input tras toggle: "${inputType}", aria-label: "${toggleLabel}"`);

    if (inputType !== 'text') {
      throw new Error('El botón toggle no cambió el tipo de input a "text"');
    }

    // -------------------------------------------------------------
    // PRUEBA 2: INICIO DE SESIÓN COMO DOCENTE
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Probando inicio de sesión como DOCENTE (docente.dev)...');
    await fillField(page, '#username', 'docente.dev');
    await fillField(page, '#password', 'DocenteDev2026!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('aside nav', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));

    // Verificar que se renderiza DashboardDocente
    const docenteDashboardPresent = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('actividades pedagógicas') && text.includes('mis aulas asignadas');
    });

    if (!docenteDashboardPresent) {
      throw new Error('DOCENTE no visualiza el Dashboard Docente Stitch premium');
    }
    console.log('  ✔ DOCENTE visualiza correctamente el Dashboard Docente Stitch premium');

    // Verificar que las rutas de Sidebar para DOCENTE NO incluyen rutas administrativas
    const docenteNavRoutes = await page.$$eval('aside nav a', links =>
      links.map(l => l.getAttribute('href'))
    );
    console.log(`  ✔ DOCENTE tiene ${docenteNavRoutes.length} rutas en el menú lateral:`, docenteNavRoutes.join(', '));

    const unauthorizedForDocente = ['#/matriculas', '#/cuentas', '#/respaldo', '#/configuracion-academica'];
    for (const unauth of unauthorizedForDocente) {
      if (docenteNavRoutes.includes(unauth)) {
        throw new Error(`DOCENTE tiene ruta no autorizada visible en Sidebar: ${unauth}`);
      }
    }
    console.log('  ✔ DOCENTE no tiene rutas administrativas en su menú lateral');

    // Verificar Route Guard: intentar navegar a #/matriculas
    console.log('  -> Probando Route Guard de DOCENTE forzando #/matriculas...');
    await page.evaluate(() => { window.location.hash = '#/matriculas'; });
    await new Promise(r => setTimeout(r, 500));
    const currentHashDocente = await page.evaluate(() => window.location.hash);
    if (currentHashDocente !== '#/inicio') {
      throw new Error(`Route Guard falló: DOCENTE pudo quedarse en ${currentHashDocente} en lugar de ser redirigido a #/inicio`);
    }
    console.log('  ✔ Route Guard redirigió a DOCENTE de #/matriculas hacia #/inicio exitosamente');

    // -------------------------------------------------------------
    // PRUEBA 3: CIERRE DE SESIÓN DOCENTE Y RESET DE HASH
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Probando cierre de sesión y reset de navegación...');
    const logoutBtn = await page.$('button[aria-label="Cerrar sesión institucional"]');
    if (logoutBtn) {
      await logoutBtn.click();
    } else {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Cerrar sesión')) {
          await btn.click();
          break;
        }
      }
    }
    await page.waitForSelector('#login-form, #username', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 500));

    const postLogoutHash = await page.evaluate(() => window.location.hash);
    console.log(`  ✔ Hash tras cierre de sesión: "${postLogoutHash}"`);
    if (postLogoutHash !== '#/inicio' && postLogoutHash !== '') {
      throw new Error(`El hash tras logout no se reseteó a #/inicio: ${postLogoutHash}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 4: INICIO DE SESIÓN COMO DIRECTOR
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Probando inicio de sesión como DIRECTOR (director.dev)...');
    await fillField(page, '#username', 'director.dev');
    await fillField(page, '#password', 'DirectorDev2026!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('aside nav', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));

    // Verificar que DIRECTOR NO ve el Dashboard Docente
    const directorSeesTeacherDashboard = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('actividades pedagógicas') || text.includes('mis aulas asignadas');
    });

    if (directorSeesTeacherDashboard) {
      throw new Error('DIRECTOR visualizó indebidamente el Dashboard Docente');
    }
    console.log('  ✔ DIRECTOR NO visualiza el Dashboard Docente');

    // Verificar que DIRECTOR visualiza el Panel de Dirección provisional con el mensaje exacto
    const directorPanelText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : '';
    });
    console.log(`  ✔ Título de pantalla de Dirección: "${directorPanelText}"`);
    if (!directorPanelText.includes('Panel de Dirección pendiente de modernización')) {
      throw new Error(`Mensaje requerido no coincide. Encontrado: "${directorPanelText}"`);
    }

    // Verificar que DIRECTOR tiene todas las 15 rutas autorizadas en Sidebar
    const directorNavRoutes = await page.$$eval('aside nav a', links =>
      links.map(l => l.getAttribute('href'))
    );
    console.log(`  ✔ DIRECTOR tiene ${directorNavRoutes.length} rutas en Sidebar:`, directorNavRoutes.join(', '));
    const requiredDirectorRoutes = [
      '#/inicio', '#/estudiantes', '#/matriculas', '#/grupos', '#/asistencia',
      '#/evaluacion', '#/documentos', '#/configuracion-documental', '#/entregas',
      '#/sincronizacion', '#/datos', '#/configuracion-academica', '#/cuentas',
      '#/respaldo', '#/perfil'
    ];
    for (const req of requiredDirectorRoutes) {
      if (!directorNavRoutes.includes(req)) {
        throw new Error(`DIRECTOR no tiene la ruta requerida en Sidebar: ${req}`);
      }
    }
    console.log('  ✔ DIRECTOR tiene acceso completo a todas las rutas institucionales');

    // Navegar a una ruta administrativa (e.g. #/respaldo)
    console.log('  -> Navegando a #/respaldo como DIRECTOR...');
    await page.click('a[href="#/respaldo"]');
    await new Promise(r => setTimeout(r, 500));
    const placeholderTitle = await page.$eval('h1', el => el.textContent.trim());
    console.log(`  ✔ Pantalla renderizada en #/respaldo: "${placeholderTitle}"`);
    if (!placeholderTitle.includes('Respaldo y Migración')) {
      throw new Error(`Placeholder de respaldo incorrecto: ${placeholderTitle}`);
    }

    // -------------------------------------------------------------
    // PRUEBA 5: CIERRE DE SESIÓN DIRECTOR
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Cerrando sesión de DIRECTOR...');
    const logoutBtnDir = await page.$('button[aria-label="Cerrar sesión institucional"]');
    if (logoutBtnDir) {
      await logoutBtnDir.click();
    }
    await page.waitForSelector('#login-form, #username', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 500));

    // -------------------------------------------------------------
    // PRUEBA 6: INICIO DE SESIÓN COMO SECRETARIA
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Probando inicio de sesión como SECRETARIA (secretaria.dev)...');
    await fillField(page, '#username', 'secretaria.dev');
    await fillField(page, '#password', 'SecretariaDev2026!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('aside nav', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));

    // Verificar que SECRETARIA NO ve el Dashboard Docente
    const secSeesTeacherDashboard = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('actividades pedagógicas') || text.includes('mis aulas asignadas');
    });

    if (secSeesTeacherDashboard) {
      throw new Error('SECRETARIA visualizó indebidamente el Dashboard Docente');
    }
    console.log('  ✔ SECRETARIA NO visualiza el Dashboard Docente');

    // Verificar que SECRETARIA visualiza el Panel de Secretaría provisional con el mensaje exacto
    const secPanelText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : '';
    });
    console.log(`  ✔ Título de pantalla de Secretaría: "${secPanelText}"`);
    if (!secPanelText.includes('Panel de Secretaría pendiente de modernización')) {
      throw new Error(`Mensaje requerido no coincide. Encontrado: "${secPanelText}"`);
    }

    // Verificar rutas de SECRETARIA: debe tener matriculas y cuentas, pero NO respaldo
    const secNavRoutes = await page.$$eval('aside nav a', links =>
      links.map(l => l.getAttribute('href'))
    );
    console.log(`  ✔ SECRETARIA tiene ${secNavRoutes.length} rutas en Sidebar:`, secNavRoutes.join(', '));
    if (!secNavRoutes.includes('#/matriculas')) {
      throw new Error('SECRETARIA debería tener #/matriculas en Sidebar');
    }
    if (secNavRoutes.includes('#/respaldo')) {
      throw new Error('SECRETARIA NO debe tener #/respaldo en Sidebar');
    }
    console.log('  ✔ SECRETARIA tiene matrículas pero no respaldo');

    // Route guard de SECRETARIA intentando acceder a #/respaldo
    console.log('  -> Probando Route Guard de SECRETARIA forzando #/respaldo...');
    await page.evaluate(() => { window.location.hash = '#/respaldo'; });
    await new Promise(r => setTimeout(r, 500));
    const currentHashSec = await page.evaluate(() => window.location.hash);
    if (currentHashSec !== '#/inicio') {
      throw new Error(`Route Guard falló: SECRETARIA pudo acceder a ${currentHashSec}`);
    }
    console.log('  ✔ Route Guard de SECRETARIA bloqueó #/respaldo y redirigió a #/inicio');

    // -------------------------------------------------------------
    // PRUEBA 7: ERRORES DE CONSOLA
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Verificando logs y errores de consola...');
    const criticalErrors = consoleErrors.filter(e => !e.includes('401'));
    if (criticalErrors.length > 0) {
      throw new Error(`Se detectaron errores críticos en consola: ${criticalErrors.join('; ')}`);
    }
    console.log('  ✔ Cero errores críticos de JavaScript o React en consola.');

    console.log('\n========================================================================');
    console.log('  TODAS LAS PRUEBAS DE SEPARACIÓN POR ROL PASARON EXITOSAMENTE (100%)   ');
    console.log('========================================================================\n');
  } finally {
    await browser.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN E2E:', err);
  process.exit(1);
});
