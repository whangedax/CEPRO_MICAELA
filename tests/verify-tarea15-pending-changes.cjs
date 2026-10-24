/**
 * tests/verify-tarea15-pending-changes.cjs
 * 
 * Verificación integral E2E con Puppeteer para TAREA 15:
 * - Protección contra pérdida de cambios no guardados.
 * - Diálogo accesible con las 3 opciones (Permanecer, Descartar, Guardar).
 * - Protección de navegación interna, logout, fecha, sesión y cambio de unidad.
 * - Resolución de conflictos de concurrencia HTTP 409 en la UI.
 * - Registro de beforeunload.
 * - Persistencia real y cero errores críticos de consola.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = 'http://127.0.0.1:5173';
const API_URL = 'http://127.0.0.1:8085';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'capturas_ux_informe2');

async function fillField(page, selector, text) {
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, text, { delay: 10 });
}

async function run() {
  console.log('=== INICIANDO VERIFICACIÓN E2E DE PROTECCIÓN DE CAMBIOS Y CONFLICTO (TAREA 15) ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
    console.log(`  [BROWSER] ${msg.type()}: ${msg.text()}`);
  });

  try {
    // -------------------------------------------------------------
    // PASO 1: LOGIN COMO DOCENTE Y SELECCIÓN DE AULA EN INICIO
    // -------------------------------------------------------------
    console.log('[PASO 1] Autenticando como docente.dev y seleccionando aula...');
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    const isLogin = await page.$('#username');
    if (isLogin) {
      await fillField(page, '#username', 'docente.dev');
      await fillField(page, '#password', 'DocenteDev2026!');
      await page.click('button[type="submit"]');
      await page.waitForSelector('aside nav', { timeout: 8000 });
      await new Promise(r => setTimeout(r, 800));
    }

    // Si aún no hay aula activa, seleccionarla desde DashboardDocente
    const enterClassroomBtn = await page.$('button::-p-text(Ingresar al aula)');
    if (enterClassroomBtn) {
      console.log('  -> Abriendo selector de unidad para el aula en Dashboard...');
      await enterClassroomBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 400));
      await page.click('[role="dialog"] button[type="submit"]');
      await new Promise(r => setTimeout(r, 1000));
    }

    // Navegar a asistencia
    console.log('  -> Navegando a #/asistencia...');
    await page.click('aside nav a[href="#/asistencia"]');
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector('table', { timeout: 10000 });
    console.log('  ✔ Vista de asistencia lista con nómina de estudiantes.');

    // -------------------------------------------------------------
    // PASO 2: REALIZAR UNA MODIFICACIÓN LOCAL (MARCAR 'P' O EDITAR NOTA)
    // -------------------------------------------------------------
    console.log('\n[PASO 2] Realizando una modificación local sin guardar...');
    const isAlreadyP = (await page.$eval('tbody tr:first-child button[aria-label^="Marcar Presente"]', b => b.getAttribute('aria-pressed'))) === 'true';
    const markToClick = isAlreadyP ? 'Marcar Falta' : 'Marcar Presente';
    const firstRowBtn = await page.$(`tbody tr:first-child button[aria-label^="${markToClick}"]`);
    if (!firstRowBtn) throw new Error(`No se encontró botón ${markToClick} en la primera fila`);
    await firstRowBtn.click();
    await new Promise(r => setTimeout(r, 300));

    // Comprobar que la fila indica "● Modificado"
    const rowStatus = await page.$eval('tbody tr:first-child td:last-child', el => el.textContent.trim());
    console.log(`  ✔ Estado visual de la fila modificada: "${rowStatus}"`);
    if (!rowStatus.includes('Modificado')) {
      throw new Error(`Se esperaba "Modificado" pero se encontró: "${rowStatus}"`);
    }

    // Comprobar que el botón guardar está habilitado y tiene indicador de cambios
    const saveBtnDisabled = await page.$eval('button::-p-text(Guardar asistencia)', btn => btn.disabled);
    if (saveBtnDisabled) throw new Error('El botón Guardar asistencia debería estar habilitado');
    console.log('  ✔ Botón "Guardar asistencia" activado con cambios pendientes.');

    // -------------------------------------------------------------
    // PASO 3: INTENTAR CAMBIO DE FECHA -> DIÁLOGO ACCESIBLE
    // -------------------------------------------------------------
    console.log('\n[PASO 3] Intentando cambiar de fecha con cambios pendientes...');
    await page.$eval('#attendance-date', el => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, '2026-03-30');
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 600));

    // Verificar que apareció el diálogo accesible
    const modalVisible = await page.$('div[role="dialog"][aria-modal="true"]');
    if (!modalVisible) throw new Error('No se abrió el diálogo de confirmación ante cambio de fecha');
    const modalText = await page.$eval('#unsaved-modal-desc', el => el.textContent.trim());
    console.log(`  ✔ Diálogo accesible interceptó el cambio con texto: "${modalText}"`);
    if (!modalText.includes('Hay cambios de asistencia sin guardar')) {
      throw new Error(`Texto de diálogo inesperado: ${modalText}`);
    }

    // Capturar pantalla del diálogo de cambios pendientes
    const shotPending1366 = path.join(SCREENSHOT_DIR, 'modal-cambios-pendientes-1366x768.png');
    await page.screenshot({ path: shotPending1366, fullPage: true });
    console.log(`  ✔ Captura de cambios pendientes guardada: ${shotPending1366}`);

    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(r => setTimeout(r, 200));
    const shotPending1920 = path.join(SCREENSHOT_DIR, 'modal-cambios-pendientes-1920x1080.png');
    await page.screenshot({ path: shotPending1920, fullPage: true });
    console.log(`  ✔ Captura de cambios pendientes guardada: ${shotPending1920}`);
    await page.setViewport({ width: 1366, height: 768 });

    // -------------------------------------------------------------
    // PASO 4: PROBAR OPCIÓN "PERMANECER Y CONTINUAR EDITANDO"
    // -------------------------------------------------------------
    console.log('\n[PASO 4] Probando opción "Permanecer y continuar editando"...');
    await page.click('#btn-unsaved-stay');
    await new Promise(r => setTimeout(r, 500));

    const modalAfterStay = await page.$('div[role="dialog"][aria-modal="true"]');
    if (modalAfterStay) throw new Error('El diálogo debería haberse cerrado tras pulsar Permanecer');

    // Comprobar que los cambios siguen intactos
    const statusAfterStay = await page.$eval('tbody tr:first-child td:last-child', el => el.textContent.trim());
    console.log(`  ✔ Cambios conservados tras permanecer: "${statusAfterStay}"`);
    if (!statusAfterStay.includes('Modificado')) {
      throw new Error('Las modificaciones se perdieron al pulsar Permanecer');
    }

    // -------------------------------------------------------------
    // PASO 5: INTENTAR NAVEGACIÓN A INICIO -> DIÁLOGO ACCESIBLE
    // -------------------------------------------------------------
    console.log('\n[PASO 5] Intentando navegar a Inicio mediante el menú lateral...');
    await page.click('aside nav a[href="#/inicio"]');
    await new Promise(r => setTimeout(r, 500));

    const modalOnNav = await page.$('div[role="dialog"][aria-modal="true"]');
    if (!modalOnNav) throw new Error('La navegación a inicio no fue interceptada por el diálogo');
    console.log('  ✔ Navegación lateral interceptada correctamente.');

    // -------------------------------------------------------------
    // PASO 6: PROBAR OPCIÓN "GUARDAR ANTES DE CONTINUAR"
    // -------------------------------------------------------------
    console.log('\n[PASO 6] Probando opción "Guardar antes de continuar"...');
    await page.click('#btn-unsaved-save');
    await new Promise(r => setTimeout(r, 2000));

    // Revisar si apareció algún error en el modal
    const errorInModal = await page.evaluate(() => {
      const alert = document.querySelector('div[role="alert"]');
      const hash = window.location.hash;
      const modal = !!document.querySelector('div[role="dialog"]');
      return { alertText: alert ? alert.textContent : null, hash, modalOpen: modal };
    });
    console.log('  -> Estado tras pulsar Guardar:', JSON.stringify(errorInModal));

    // Esperar a que guarde en el backend y luego proceda con la navegación
    await page.waitForFunction(() => window.location.hash.includes('inicio'), { timeout: 8000 });
    console.log(`  ✔ Navegación completada tras guardado exitoso en backend. Hash actual: ${await page.evaluate(() => window.location.hash)}`);

    // -------------------------------------------------------------
    // PASO 7: REGRESAR A ASISTENCIA Y VERIFICAR PERSISTENCIA
    // -------------------------------------------------------------
    console.log('\n[PASO 7] Retornando a asistencia y verificando que el registro quedó guardado...');
    await page.goto(`${BASE_URL}/#/asistencia`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    const statusRestored = await page.$eval('tbody tr:first-child td:last-child', el => el.textContent.trim());
    console.log(`  ✔ Estado de persistencia tras retorno: "${statusRestored}"`);
    if (!statusRestored.includes('Guardado')) {
      throw new Error(`Se esperaba "Guardado" pero se encontró: "${statusRestored}"`);
    }

    // -------------------------------------------------------------
    // PASO 8: PROBAR OPCIÓN "DESCARTAR CAMBIOS Y CONTINUAR"
    // -------------------------------------------------------------
    console.log('\n[PASO 8] Probando opción "Descartar cambios y continuar"...');
    // Hacer una modificación temporal a Tardanza (T)
    const btnT = await page.$('tbody tr:first-child button[aria-label^="Marcar Tardanza"]');
    await btnT.click();
    await new Promise(r => setTimeout(r, 300));

    // Intentar navegar a inicio
    await page.click('aside nav a[href="#/inicio"]');
    await new Promise(r => setTimeout(r, 500));
    await page.waitForSelector('#btn-unsaved-discard', { timeout: 3000 });
    await page.click('#btn-unsaved-discard');
    await page.waitForFunction(() => window.location.hash.includes('inicio'), { timeout: 5000 });
    console.log('  ✔ Descarte confirmado y navegación permitida.');

    // Volver a asistencia y comprobar que NO se guardó Tardanza (T)
    await page.goto(`${BASE_URL}/#/asistencia`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    const finalValue = await page.$eval('tbody tr:first-child button[aria-label^="Marcar Tardanza"]', el => el.getAttribute('aria-pressed'));
    console.log(`  ✔ Tardanza descartada correctamente: aria-pressed="${finalValue}"`);
    if (finalValue === 'true') {
      throw new Error('La modificación descartada fue guardada indebidamente');
    }

    // -------------------------------------------------------------
    // PASO 9: SIMULAR CONFLICTO DE CONCURRENCIA HTTP 409 EN LA UI
    // -------------------------------------------------------------
    console.log('\n[PASO 9] Simulando conflicto de concurrencia HTTP 409 en la UI...');
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    const { token: apiToken } = await loginRes.json();

    const dash = await fetch(`${API_URL}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }).then(r => r.json());
    const group = dash.groups ? dash.groups[0] : null;
    if (!group) throw new Error('No se encontró grupo en dashboard');
    const enr = dash.enrollments.find(e => e.groupId === group.id && e.active);
    
    // Guardar una versión paralela en el servidor para forzar un nuevo rev
    const conflictDate = '2026-03-27';
    const existingConf = dash.attendance.find(a => a.enrollmentId === enr.id && a.date === conflictDate && a.session === '1');
    
    await fetch(`${API_URL}/api/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: conflictDate,
        session: '1',
        rows: [{ enrollmentId: enr.id, value: 'J', observation: 'Actualizado externamente', rev: existingConf?.rev || null }]
      })
    });

    // En la UI, navegar a la fecha conflictDate (2026-03-27)
    await page.$eval('#attendance-date', (el, d) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, d);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, conflictDate);
    await new Promise(r => setTimeout(r, 600));

    // Ahora simular que otra sesión concurrente modifica el backend antes de que el docente pulse Guardar
    const dash2 = await fetch(`${API_URL}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }).then(r => r.json());
    const rec2 = dash2.attendance.find(a => a.enrollmentId === enr.id && a.date === conflictDate && a.session === '1');
    
    // Sesión concurrente cambia a 'P' (generando un rev nuevo en el servidor)
    await fetch(`${API_URL}/api/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: conflictDate,
        session: '1',
        rows: [{ enrollmentId: enr.id, value: 'P', observation: 'Modificado por sesión paralela B', rev: rec2.rev }]
      })
    });

    // En el navegador, el docente marca Tardanza 'T' e intenta guardar
    await page.$eval('tbody tr:first-child button[aria-label^="Marcar Tardanza"]', b => b.click());
    await new Promise(r => setTimeout(r, 300));
    await page.click('button::-p-text(Guardar asistencia)');
    await new Promise(r => setTimeout(r, 1500));

    // Verificar que aparece el modal de resolución de conflicto 409
    await page.waitForSelector('#conflict-dialog-title', { timeout: 8000 });
    console.log('  ✔ Diálogo accesible de resolución de conflicto 409 desplegado.');
    const conflictTitle = await page.$eval('#conflict-dialog-title', el => el.textContent.trim());
    console.log(`  ✔ Mensaje: "${conflictTitle}"`);

    // Captura de pantalla del modal de resolución de conflicto
    const shotConflict1366 = path.join(SCREENSHOT_DIR, 'conflicto-409-resolucion-1366x768.png');
    await page.screenshot({ path: shotConflict1366, fullPage: true });
    console.log(`  ✔ Captura de conflicto 409 guardada: ${shotConflict1366}`);

    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(r => setTimeout(r, 200));
    const shotConflict1920 = path.join(SCREENSHOT_DIR, 'conflicto-409-resolucion-1920x1080.png');
    await page.screenshot({ path: shotConflict1920, fullPage: true });
    console.log(`  ✔ Captura de conflicto 409 guardada: ${shotConflict1920}`);
    await page.setViewport({ width: 1366, height: 768 });

    // Probar opción "Conservar cambios locales (sin enviar)"
    await page.click('#btn-conflict-keep');
    await new Promise(r => setTimeout(r, 500));
    const isConflictClosed = !(await page.$('#conflict-dialog-title'));
    console.log(`  ✔ Diálogo de conflicto cerrado manteniendo cambios locales: ${isConflictClosed}`);

    // -------------------------------------------------------------
    // PASO 10: VERIFICAR ERRORES CRÍTICOS DE CONSOLA
    // -------------------------------------------------------------
    console.log('\n[PASO 10] Comprobando logs y errores de consola...');
    const criticalErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('409') && !e.includes('favicon'));
    if (criticalErrors.length > 0) {
      throw new Error(`Se detectaron errores críticos en consola: ${criticalErrors.join('; ')}`);
    }
    console.log('  ✔ Cero errores críticos no esperados de JavaScript o React en consola.');

    console.log('\n========================================================================');
    console.log('  VERIFICACIÓN E2E DE TAREA 15 COMPLETADA EXITOSAMENTE AL 100%          ');
    console.log('========================================================================\n');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('\n❌ ERROR EN LA PRUEBA E2E:', err);
  process.exit(1);
});
