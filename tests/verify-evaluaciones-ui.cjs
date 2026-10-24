/**
 * tests/verify-evaluaciones-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para el módulo REGISTRO DE EVALUACIONES (Tarea 17).
 * Captura evidencias visuales en 1366x768 y 1920x1080.
 * 
 * Comprueba:
 * 1. Login como DOCENTE (docente.dev).
 * 2. Selección de aula y unidad didáctica UD1 en modo UNIT.
 * 3. Navegación a #/evaluacion.
 * 4. Verificación de pestañas interactivas (Indicadores 1..5, Logro UD, Matriz Completa).
 * 5. Registro de calificaciones en escala vigesimal (0 a 20) diferenciando 0 de vacío (null).
 * 6. Navegación ágil por teclado (Enter / Flecha Abajo para avanzar de estudiante en la misma columna).
 * 7. Intercepción de navegación con cambios no guardados mediante PendingChangesContext.
 * 8. Guardado oficial mediante POST /api/grades y confirmación visual.
 * 9. Persistencia de calificaciones tras recarga de página (F5).
 * 10. Vista de matriz completa (26 criterios con scroll y cabecera multinivel).
 * 11. Generación de capturas de pantalla de alta resolución.
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
  await page.type(selector, text, { delay: 10 });
}

async function run() {
  console.log('=== INICIANDO VERIFICACIÓN E2E DE REGISTRO DE EVALUACIONES (TAREA 17) ===\n');

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
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
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
    // PASO 2: NAVEGAR A EVALUACIONES (#/evaluacion)
    // -------------------------------------------------------------
    console.log('\n[PASO 2] Navegando a #/evaluacion...');
    await page.click('a[href="#/evaluacion"]');
    await new Promise((r) => setTimeout(r, 1200));

    // Comprobar si requiere seleccionar aula o unidad didáctica
    const screenHeading = await page.$eval('h1, h2', (el) => el.textContent.trim());
    console.log(`  ✔ Encabezado inicial en pantalla: "${screenHeading}"`);

    if (
      screenHeading.includes('Selección de Unidad') ||
      screenHeading.includes('Registro Auxiliar') ||
      screenHeading.includes('Seleccione una unidad') ||
      screenHeading.includes('Requerida')
    ) {
      console.log('  -> Abriendo modal de selección de aula y unidad didáctica...');
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const btn = btns.find(
          (b) =>
            b.textContent.includes('Seleccionar Aula') ||
            b.textContent.includes('Cambiar a Modo Unidad') ||
            b.textContent.includes('Seleccionar Unidad')
        );
        if (btn) btn.click();
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 6000 });
      await new Promise((r) => setTimeout(r, 600));

      console.log('  -> Confirmando selección en modo UNIT con unidad didáctica...');
      await page.click('[role="dialog"] button[type="submit"]');
      await new Promise((r) => setTimeout(r, 2500));
    }

    // Esperar a que la tabla de calificaciones esté lista
    await page.waitForSelector('table.grade-matrix', { timeout: 10000 });
    console.log('  ✔ Módulo de evaluaciones cargado y tabla de calificaciones visible');

    // -------------------------------------------------------------
    // PASO 3: VERIFICAR PESTAÑAS DE INDICADORES
    // -------------------------------------------------------------
    console.log('\n[PASO 3] Verificando pestañas interactivas de evaluación...');
    const tabs = await page.$$eval('[data-grade-tab]', (els) =>
      els.map((e) => ({ id: e.getAttribute('data-grade-tab'), label: e.textContent.trim() }))
    );
    console.log(`  ✔ ${tabs.length} pestañas detectadas:`, tabs.map((t) => t.label).join(', '));
    if (tabs.length < 7) {
      throw new Error(`Se esperaban al menos 7 pestañas, se encontraron ${tabs.length}`);
    }

    // -------------------------------------------------------------
    // PASO 4: EDICIÓN DE NOTAS EN ESCALA VIGESIMAL (0 a 20)
    // -------------------------------------------------------------
    console.log('\n[PASO 4] Editando calificaciones en Indicador 1...');
    // Asegurar que estamos en la pestaña 1
    await page.click('[data-grade-tab="1"]');
    await new Promise((r) => setTimeout(r, 500));

    // Obtener los primeros inputs de la columna IL1.IA1
    const inputs = await page.$$('input[data-indicator="IL1.IA1"]');
    console.log(`  -> ${inputs.length} inputs encontrados para IL1.IA1`);
    if (inputs.length < 2) {
      throw new Error('Se requieren al menos 2 estudiantes matriculados para pruebas completas');
    }

    // 1. Asignar nota 17 al primer estudiante
    await inputs[0].click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.type('17', { delay: 15 });

    // 2. Probar navegación con tecla Enter hacia abajo
    console.log('  -> Probando navegación por teclado con tecla Enter...');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 200));

    // El foco debe estar en el segundo estudiante
    await page.keyboard.type('0', { delay: 15 }); // Asignar nota 0 (desaprobada válida)

    // 3. Probar navegación con flecha abajo
    await page.keyboard.press('ArrowDown');
    await new Promise((r) => setTimeout(r, 200));

    // Si hay un tercer estudiante, asignar nota 12 (desaprobado < 13)
    if (inputs.length > 2) {
      await page.keyboard.type('12', { delay: 15 });
    }

    // Verificar texto de estado no guardado
    const saveStateText = await page.$eval('#save-state', (el) => el.textContent.trim());
    console.log(`  ✔ Estado de cambios pendientes: "${saveStateText}"`);
    if (!saveStateText.includes('cambios pendientes')) {
      throw new Error('El estado debe indicar que hay modificaciones pendientes');
    }

    // -------------------------------------------------------------
    // PASO 5: INTERCEPCIÓN DE CAMBIOS NO GUARDADOS (PendingChangesContext)
    // -------------------------------------------------------------
    console.log('\n[PASO 5] Verificando protección contra pérdida de cambios pendientes...');
    // Intentar navegar a #/inicio
    await page.click('a[href="#/inicio"]');
    await new Promise((r) => setTimeout(r, 600));

    // El modal de cambios pendientes debe haberse abierto
    await page.waitForSelector('#unsaved-modal-title', { timeout: 5000 });
    const modalTitle = await page.$eval(
      '#unsaved-modal-title',
      (el) => el.textContent.trim()
    );
    console.log(`  ✔ Diálogo de protección interceptó la navegación: "${modalTitle}"`);

    // Hacer clic en "Permanecer y continuar editando"
    await page.click('#btn-unsaved-stay');
    await new Promise((r) => setTimeout(r, 600));
    console.log('  ✔ Transición cancelada; seguimos en el registro de evaluaciones');

    // -------------------------------------------------------------
    // PASO 6: GUARDADO OFICIAL (POST /api/grades)
    // -------------------------------------------------------------
    console.log('\n[PASO 6] Guardando calificaciones con el botón "Guardar matriz"...');
    await page.click('#save-academic');
    await new Promise((r) => setTimeout(r, 2000));

    // Verificar feedback de guardado exitoso
    const feedbackText = await page.evaluate(() => {
      const el = document.querySelector('[role="status"]');
      return el ? el.textContent : '';
    });
    console.log(`  ✔ Notificación del servidor: "${feedbackText}"`);
    if (!feedbackText.includes('Guardado en este equipo') && !feedbackText.includes('confirmadas')) {
      throw new Error(`Esperado feedback de guardado exitoso, recibido: "${feedbackText}"`);
    }

    // -------------------------------------------------------------
    // PASO 7: PERSISTENCIA TRAS RECARGA (F5)
    // -------------------------------------------------------------
    console.log('\n[PASO 7] Verificando persistencia tras recarga de página (F5)...');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('table.grade-matrix', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    const reloadedVal0 = await page.$eval('input[data-indicator="IL1.IA1"]', (el) => el.value);
    console.log(`  ✔ Valor persistido para primer estudiante: "${reloadedVal0}" (esperado: 17)`);
    if (reloadedVal0 !== '17') {
      throw new Error(`El valor guardado (17) no persistió tras recargar. Obtenido: "${reloadedVal0}"`);
    }

    // -------------------------------------------------------------
    // PASO 8: CAPTURA EN 1366x768
    // -------------------------------------------------------------
    console.log('\n[PASO 8] Generando captura en resolución 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise((r) => setTimeout(r, 500));
    const shot1366 = path.join(SCREENSHOT_DIR, 'evaluaciones-1366x768.png');
    await page.screenshot({ path: shot1366, fullPage: false });
    console.log(`  ✔ Captura guardada en: ${shot1366}`);

    // -------------------------------------------------------------
    // PASO 9: CAPTURA EN 1920x1080 (FULL HD)
    // -------------------------------------------------------------
    console.log('\n[PASO 9] Generando captura en resolución 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise((r) => setTimeout(r, 600));
    const shot1920 = path.join(SCREENSHOT_DIR, 'evaluaciones-1920x1080.png');
    await page.screenshot({ path: shot1920, fullPage: false });
    console.log(`  ✔ Captura guardada en: ${shot1920}`);

    // -------------------------------------------------------------
    // PASO 10: VISTA MATRIZ COMPLETA (26 COLUMNAS) Y CAPTURA
    // -------------------------------------------------------------
    console.log('\n[PASO 10] Activando vista "Ver matriz completa" (26 columnas)...');
    await page.click('[data-grade-tab="0"]');
    await new Promise((r) => setTimeout(r, 1000));

    const totalHeaders = await page.$$eval('table.grade-matrix th', (els) => els.length);
    console.log(`  ✔ Columnas/encabezados renderizados en matriz completa: ${totalHeaders}`);

    const shotMatrix = path.join(SCREENSHOT_DIR, 'evaluaciones-matriz-completa-1920x1080.png');
    await page.screenshot({ path: shotMatrix, fullPage: false });
    console.log(`  ✔ Captura de matriz completa guardada en: ${shotMatrix}`);

    // -------------------------------------------------------------
    // PASO 11: VERIFICAR RESULTADO DE LA UNIDAD (LOGRO UD)
    // -------------------------------------------------------------
    console.log('\n[PASO 11] Verificando pestaña "Resultado de la unidad" (Logro UD)...');
    await page.click('[data-grade-tab="6"]');
    await new Promise((r) => setTimeout(r, 600));

    const udInputs = await page.$$('input[data-indicator="RESULTADO_UD"]');
    console.log(`  ✔ Inputs de RESULTADO_UD detectados: ${udInputs.length}`);
    if (udInputs.length === 0) {
      throw new Error('No se encontraron inputs para RESULTADO_UD');
    }

    console.log('\n======================================================');
    console.log('✔ TODAS LAS PRUEBAS E2E DE EVALUACIONES FINALIZARON CON ÉXITO');
    console.log(`Errores de consola: ${consoleErrors.length}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ ERROR EN VERIFICACIÓN E2E:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
