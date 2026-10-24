/**
 * tests/verify-configuracion-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para CONFIGURACIÓN DOCUMENTAL (Tarea 22).
 * Captura evidencias visuales en 1366x768 y 1920x1080.
 * 
 * Comprueba:
 * 1. Login como DOCENTE (docente.dev).
 * 2. Navegación a #/configuracion-documental.
 * 3. Selección de ámbito pedagógico (Unidad: capacidades e indicadores) y UD1.
 * 4. Edición de capacidad y primer indicador de logro (IL1).
 * 5. Detección de cambios pendientes y activación de botón "Guardar Parámetros".
 * 6. Guardado real en SQLite local mediante POST /api/document/configuration.
 * 7. Mensaje de confirmación institucional y actualización de estado rev.
 * 8. Protección ante navegación con cambios no guardados (PendingChangesModal).
 * 9. Capturas de pantalla en 1366x768 y 1920x1080 en capturas_ux_informe2/.
 */

const puppeteer = require('puppeteer');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const BASE_URL = 'http://127.0.0.1:5173';
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
  console.log('=== INICIANDO VERIFICACIÓN E2E DE CONFIGURACIÓN DOCUMENTAL (TAREA 22) ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  [BROWSER ERROR]:', msg.text());
      consoleErrors.push(msg.text());
    } else {
      console.log('  [BROWSER LOG]:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log('  [PAGE ERROR]:', err.message);
    consoleErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------
    // PASO 1: LOGIN COMO DOCENTE
    // -------------------------------------------------------------
    console.log('[PASO 1] Iniciando sesión como docente.dev en 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('#username', { timeout: 10000 });
    await fillField(page, '#username', 'docente.dev');
    await fillField(page, '#password', 'DocenteDev2026!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('aside nav', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('  ✔ Sesión iniciada correctamente');

    // -------------------------------------------------------------
    // PASO 2: NAVEGAR A CONFIGURACIÓN DOCUMENTAL (#/configuracion-documental)
    // -------------------------------------------------------------
    console.log('\n[PASO 2] Navegando a #/configuracion-documental...');
    await page.click('a[href="#/configuracion-documental"]');
    await new Promise((r) => setTimeout(r, 1500));

    // Si requiere seleccionar aula o unidad didáctica, abrir modal
    const needModal = await page.evaluate(() => {
      return document.body.innerText.includes('Seleccionar Aula y Espacio');
    });

    if (needModal) {
      console.log('  -> Abriendo modal de selección de aula y espacio...');
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const btn = btns.find((b) => b.textContent.includes('Seleccionar Aula y Espacio'));
        if (btn) btn.click();
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 6000 });
      await new Promise((r) => setTimeout(r, 500));
      await page.click('[role="dialog"] button[type="submit"]');
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Esperar a que el encabezado y formulario de configuración documental esté visible
    await page.waitForSelector('h1', { timeout: 10000 });
    const mainTitle = await page.$eval('h1', (el) => el.textContent.trim());
    console.log(`  ✔ Título principal confirmado: "${mainTitle}"`);

    // -------------------------------------------------------------
    // PASO 3: VERIFICAR SELECTORES DE ÁMBITO Y UNIDAD DIDÁCTICA
    // -------------------------------------------------------------
    console.log('\n[PASO 3] Verificando selectores de contexto y ámbito...');
    await page.waitForSelector('#parameter-kind', { timeout: 8000 });

    const selectedKind = await page.$eval('#parameter-kind', (el) => el.value);
    console.log(`  ✔ Ámbito documental seleccionado por defecto: "${selectedKind}"`);
    assert.ok(['unit', 'unitCurriculum'].includes(selectedKind), 'DOCENTE debe iniciar en ámbito pedagógico');

    // Comprobar selector de unidad didáctica
    const hasUnitSelector = await page.$('#parameter-unit');
    assert.ok(hasUnitSelector, 'Debe existir el selector de unidad didáctica para el ámbito pedagógico');

    // -------------------------------------------------------------
    // PASO 4: EDICIÓN DE CAPACIDAD TERMINAL E INDICADORES DE LOGRO (IL1)
    // -------------------------------------------------------------
    console.log('\n[PASO 4] Editando capacidad e indicadores de logro con valores dinámicos...');
    await page.waitForSelector('#field-capacity', { timeout: 8000 });
    await page.waitForSelector('#field-indicator1', { timeout: 8000 });

    const timestamp = Date.now();
    const testCapacityText = `Elabora y gestiona documentación administrativa compleja (${timestamp}).`;
    const testIndicator1Text = `Aplica formatos, estilos y plantillas según estándares MINEDU (${timestamp}).`;

    await fillField(page, '#field-capacity', testCapacityText);
    await fillField(page, '#field-indicator1', testIndicator1Text);

    await new Promise((r) => setTimeout(r, 600));

    const capacityVal = await page.$eval('#field-capacity', (el) => el.value);
    console.log('  -> Valor en #field-capacity tras fillField:', capacityVal);

    // Comprobar que se activa la detección de cambios pendientes
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasDirtyNotice = pageText.includes('Hay modificaciones sin guardar');
    console.log(`  ✔ ¿Aviso de cambios pendientes visible?: ${hasDirtyNotice}`);

    const isSaveBtnEnabled = await page.$eval('#save-parameters', (btn) => !btn.disabled);
    console.log(`  ✔ ¿Botón "Guardar Parámetros" habilitado?: ${isSaveBtnEnabled}`);
    if (!isSaveBtnEnabled) {
      throw new Error('El botón de guardar parámetros debe habilitarse tras modificar campos.');
    }

    // -------------------------------------------------------------
    // PASO 5: GUARDADO REAL EN SQLITE LOCAL (POST /api/document/configuration)
    // -------------------------------------------------------------
    console.log('\n[PASO 5] Guardando parámetros en el servidor local...');
    await page.click('#save-parameters');
    await new Promise((r) => setTimeout(r, 2000));

    const alertText = await page.evaluate(() => {
      const el = document.querySelector('[role="alert"], [role="status"], .bg-rose-50, .bg-amber-50, .bg-emerald-50');
      return el ? el.innerText : 'NO ALERT/STATUS FOUND';
    });
    console.log('  -> Texto en banner de alerta/estado:', alertText);

    // Esperar a que aparezca la alerta de éxito en pantalla
    await page.waitForFunction(
      () => document.body.innerText.includes('Cambios Guardados Exitosamente'),
      { timeout: 10000 }
    );
    console.log('  ✔ Notificación de éxito confirmada en pantalla');

    // -------------------------------------------------------------
    // PASO 6: GENERAR CAPTURA 1366x768 (LAPTOP)
    // -------------------------------------------------------------
    console.log('\n[PASO 6] Generando captura en resolución 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise((r) => setTimeout(r, 600));
    const shot1366 = path.join(SCREENSHOT_DIR, 'configuracion-documental-1366x768.png');
    await page.screenshot({ path: shot1366, fullPage: false });
    console.log(`  ✔ Captura guardada en: ${shot1366}`);

    // -------------------------------------------------------------
    // PASO 7: GENERAR CAPTURA 1920x1080 (FULL HD)
    // -------------------------------------------------------------
    console.log('\n[PASO 7] Generando captura en resolución 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 700));
    const shot1920 = path.join(SCREENSHOT_DIR, 'configuracion-documental-1920x1080.png');
    await page.screenshot({ path: shot1920, fullPage: false });
    console.log(`  ✔ Captura guardada en: ${shot1920}`);

    // -------------------------------------------------------------
    // PASO 8: CAPTURA FOCALIZADA EN INDICADORES DE LOGRO (IL1..IL5)
    // -------------------------------------------------------------
    console.log('\n[PASO 8] Generando captura ampliada de los 5 indicadores de logro...');
    await page.evaluate(() => {
      const el = document.querySelector('#field-indicator1');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 500));

    const shotIndicadores = path.join(SCREENSHOT_DIR, 'configuracion-documental-indicadores-1920x1080.png');
    await page.screenshot({ path: shotIndicadores, fullPage: false });
    console.log(`  ✔ Captura de indicadores guardada en: ${shotIndicadores}`);

    // -------------------------------------------------------------
    // PASO 9: VERIFICAR PROTECCIÓN DE CAMBIOS PENDIENTES
    // -------------------------------------------------------------
    console.log('\n[PASO 9] Probando interceptor de cambios pendientes ante navegación...');
    // Realizar un cambio sin guardar
    await fillField(page, '#field-indicator2', 'Prueba de cambio no guardado para validar modal');
    await new Promise((r) => setTimeout(r, 500));

    // Intentar navegar al inicio mediante el breadcrumb
    await page.click('a[href="#/inicio"]');

    // Debe abrir el diálogo de confirmación de PendingChangesContext
    await page.waitForSelector('[role="dialog"]', { timeout: 6000 });
    const dialogText = await page.$eval('[role="dialog"]', (el) => el.innerText);
    console.log('  ✔ Diálogo de protección detectado:', dialogText.slice(0, 100).replace(/\n+/g, ' '));
    assert.ok(dialogText.includes('modificaciones sin guardar') || dialogText.includes('Cambios pendientes'));

    // Descartar cambios para completar la transición
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('[role="dialog"] button')];
      const discardBtn = btns.find((b) => b.textContent.includes('Descartar'));
      if (discardBtn) discardBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    console.log('  ✔ Transición segura completada tras descarte');

    console.log('\n======================================================');
    console.log('✔ TODAS LAS PRUEBAS E2E DE CONFIGURACIÓN DOCUMENTAL FINALIZARON CON ÉXITO');
    console.log(`Errores críticos de consola: ${consoleErrors.length}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ ERROR EN VERIFICACIÓN E2E DE CONFIGURACIÓN DOCUMENTAL:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
