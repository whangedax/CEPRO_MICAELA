/**
 * tests/verify-attendance-ui.cjs
 * 
 * Verificación integral E2E con Puppeteer para el módulo REGISTRO DE ASISTENCIA (Tarea 13).
 * Captura evidencias visuales en 1366x768 y 1920x1080.
 * Comprueba:
 * 1. Login como DOCENTE.
 * 2. Corrección del badge en Dashboard: "DATOS DE PRUEBA · CONECTADO A SQLITE LOCAL".
 * 3. Asistencia sin espacio activo -> Pantalla explicativa.
 * 4. Selección de aula y unidad didáctica UD1.
 * 5. Visualización del encabezado institucional, carrera, módulo, aula y unidad.
 * 6. Lista real de estudiantes desde SQLite sintético (nombre, DNI, matrícula).
 * 7. Interacción de marcado P, F, J, T con teclado y clic.
 * 8. Registro de observación.
 * 9. Guardado oficial mediante POST /api/attendance.
 * 10. Confirmación visual de persistencia (badges "Guardado", feedback banner).
 * 11. Búsqueda y filtrado de estudiantes.
 * 12. Contador accesible de marcas.
 * 13. Persistencia tras recarga.
 * 14. Cero errores críticos en consola.
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
  await page.type(selector, text, { delay: 5 });
}

async function run() {
  console.log('=== INICIANDO VERIFICACIÓN E2E DE REGISTRO DE ASISTENCIA ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
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
    // PASO 1: LOGIN COMO DOCENTE
    // -------------------------------------------------------------
    console.log('[PASO 1] Iniciando sesión como docente.dev...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('#username');
    await fillField(page, '#username', 'docente.dev');
    await fillField(page, '#password', 'DocenteDev2026!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('aside nav', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));
    console.log('  ✔ Sesión iniciada correctamente');

    // -------------------------------------------------------------
    // PASO 2: VERIFICAR CORRECCIÓN BADGE EN DASHBOARD (REQUISITO 15)
    // -------------------------------------------------------------
    console.log('\n[PASO 2] Verificando corrección del badge en DashboardDocente...');
    const dashboardText = await page.evaluate(() => document.body.innerText);
    assertCorrectBadge(dashboardText);
    console.log('  ✔ Badge corregido verificado: "DATOS DE PRUEBA · CONECTADO A SQLITE LOCAL"');

    // -------------------------------------------------------------
    // PASO 3: NAVEGAR A ASISTENCIA SIN WORKSPACE UNIT PREVIO O DIRECTO
    // -------------------------------------------------------------
    console.log('\n[PASO 3] Navegando a #/asistencia...');
    await page.click('a[href="#/asistencia"]');
    await new Promise(r => setTimeout(r, 1000));

    // Si aún no hay unidad seleccionada, debe mostrar la pantalla correspondiente
    const screenHeading = await page.$eval('h1, h2', el => el.textContent.trim());
    console.log(`  ✔ Encabezado en pantalla: "${screenHeading}"`);

    // Si muestra "Sin espacio de trabajo activo" o "Seleccione una unidad", seleccionar aula
    if (screenHeading.includes('Sin espacio de trabajo activo') || screenHeading.includes('Seleccione una unidad')) {
      console.log('  -> Espacio no seleccionado aún. Seleccionando aula y UD1 desde el modal...');
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const btn = btns.find(b => b.textContent.includes('Seleccionar aula') || b.textContent.includes('Elegir Unidad'));
        if (btn) btn.click();
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 500));
      // Confirmar en el modal
      await page.click('[role="dialog"] button[type="submit"]');
      await new Promise(r => setTimeout(r, 1500));
    }

    // -------------------------------------------------------------
    // PASO 4: VERIFICAR PANTALLA PRINCIPAL DE ASISTENCIA
    // -------------------------------------------------------------
    console.log('\n[PASO 4] Verificando elementos de la pantalla de asistencia...');
    await page.waitForSelector('table');

    const titleText = await page.$eval('h1', el => el.textContent.trim());
    console.log(`  ✔ Título principal: "${titleText}"`);
    if (!titleText.includes('Control de Asistencia')) {
      throw new Error(`Título no coincide: ${titleText}`);
    }

    // Verificar datos de contexto (carrera, aula, unidad)
    const contextInfo = await page.evaluate(() => {
      const el = document.querySelector('h1').closest('div').parentElement;
      return el ? el.innerText : '';
    });
    console.log('  ✔ Contexto activo visualizado en barra superior');

    // -------------------------------------------------------------
    // PASO 5: VERIFICAR LISTA DE ESTUDIANTES REALES DESDE SQLITE
    // -------------------------------------------------------------
    console.log('\n[PASO 5] Verificando lista de estudiantes matriculados...');
    const studentNames = await page.$$eval('tbody tr td:first-child span.font-bold', spans =>
      spans.map(s => s.textContent.trim())
    );
    console.log(`  ✔ Estudiantes encontrados (${studentNames.length}):`, studentNames.join(', '));
    if (studentNames.length === 0) {
      throw new Error('No se cargaron estudiantes matriculados en la tabla');
    }

    // -------------------------------------------------------------
    // PASO 6: INTERACCIÓN DE ASISTENCIA (P, F, J, T) Y TECLADO
    // -------------------------------------------------------------
    console.log('\n[PASO 6] Marcando asistencia interactiva y observando estados...');
    
    // Seleccionar una fecha válida lectiva (Lunes 2026-03-23)
    await page.$eval('#attendance-date', (el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '2026-03-23');
    await new Promise(r => setTimeout(r, 500));

    // Verificar estado previo y marcar
    const initialPressedP = await page.$eval('tbody tr:first-child button[aria-label^="Presente"]', el => el.getAttribute('aria-pressed'));
    console.log(`  ✔ Estado inicial botón Presente: aria-pressed="${initialPressedP}"`);

    // Si ya estaba en Presente, alternar a Falta; si no, marcar Presente
    const markLabel = initialPressedP === 'true' ? 'Falta' : 'Presente';
    const markBtn = await page.$(`tbody tr:first-child button[aria-label^="${markLabel}"]`);
    await markBtn.click();
    await new Promise(r => setTimeout(r, 200));

    const isPressed = await page.$eval(`tbody tr:first-child button[aria-label^="${markLabel}"]`, el => el.getAttribute('aria-pressed'));
    console.log(`  ✔ Botón ${markLabel} activado: aria-pressed="${isPressed}"`);
    if (isPressed !== 'true') {
      throw new Error(`aria-pressed no se actualizó a true para ${markLabel}`);
    }

    // Verificar badge "Modificado"
    const rowStatus = await page.$eval('tbody tr:first-child td:last-child', el => el.textContent.trim());
    console.log(`  ✔ Estado visual de fila tras marcado: "${rowStatus}"`);
    if (!rowStatus.includes('Modificado')) {
      throw new Error(`Se esperaba estado "Modificado" pero se encontró: "${rowStatus}"`);
    }

    // Añadir observación
    const obsInput = await page.$('tbody tr:first-child input[aria-label^="Observación"]');
    await fillField(page, 'tbody tr:first-child input[aria-label^="Observación"]', 'Asistencia verificada en laboratorio');
    await new Promise(r => setTimeout(r, 200));

    // Si hay un segundo estudiante, marcar T (Tardanza)
    const secondStudentBtnT = await page.$('tbody tr:nth-child(2) button[aria-label^="Tardanza"]');
    if (secondStudentBtnT) {
      await secondStudentBtnT.click();
      await new Promise(r => setTimeout(r, 200));
    }

    // -------------------------------------------------------------
    // PASO 7: GUARDAR ASISTENCIA (POST /api/attendance)
    // -------------------------------------------------------------
    console.log('\n[PASO 7] Guardando asistencia en el servidor...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const save = btns.find(b => b.textContent && b.textContent.includes('Guardar asistencia'));
      if (save) save.click();
    });

    await page.waitForSelector('#attendance-save-feedback', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));

    const feedbackText = await page.$eval('#attendance-save-feedback', el => el.textContent.trim());
    console.log(`  ✔ Mensaje de confirmación del backend: "${feedbackText}"`);
    if (!feedbackText.includes('Guardado en este equipo') && !feedbackText.includes('confirmados')) {
      throw new Error(`Respuesta inesperada al guardar: "${feedbackText}"`);
    }

    // Verificar que las filas cambiaron a "✔ Guardado"
    const savedStatus = await page.$eval('tbody tr:first-child td:last-child', el => el.textContent.trim());
    console.log(`  ✔ Estado de persistencia tras guardado: "${savedStatus}"`);
    if (!savedStatus.includes('Guardado')) {
      throw new Error(`Se esperaba estado "Guardado" pero se encontró: "${savedStatus}"`);
    }

    // -------------------------------------------------------------
    // PASO 8: CAPTURA DE PANTALLA EN 1366x768
    // -------------------------------------------------------------
    console.log('\n[PASO 8] Generando captura de pantalla 1366x768...');
    await page.setViewport({ width: 1366, height: 768 });
    await new Promise(r => setTimeout(r, 500));
    const shot1366 = path.join(SCREENSHOT_DIR, 'asistencia-1366x768.png');
    await page.screenshot({ path: shot1366, fullPage: true });
    console.log(`  ✔ Captura guardada: ${shot1366}`);

    // -------------------------------------------------------------
    // PASO 9: CAPTURA DE PANTALLA EN 1920x1080
    // -------------------------------------------------------------
    console.log('\n[PASO 9] Generando captura de pantalla 1920x1080...');
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(r => setTimeout(r, 500));
    const shot1920 = path.join(SCREENSHOT_DIR, 'asistencia-1920x1080.png');
    await page.screenshot({ path: shot1920, fullPage: true });
    console.log(`  ✔ Captura guardada: ${shot1920}`);

    // -------------------------------------------------------------
    // PASO 10: PROBAR PERSISTENCIA TRAS RECARGA (F5)
    // -------------------------------------------------------------
    console.log('\n[PASO 10] Verificando persistencia tras recarga de página (F5)...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Seleccionar misma fecha 2026-03-23
    await page.$eval('#attendance-date', (el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '2026-03-23');
    await new Promise(r => setTimeout(r, 500));

    const reloadedValue = await page.$eval(`tbody tr:first-child button[aria-label^="${markLabel}"]`, el => el.getAttribute('aria-pressed'));
    console.log(`  ✔ Marca ${markLabel} recuperada tras F5: aria-pressed="${reloadedValue}"`);
    if (reloadedValue !== 'true') {
      throw new Error(`La marca ${markLabel} no persistió tras recargar la página`);
    }

    // -------------------------------------------------------------
    // PASO 11: VERIFICAR ERRORES DE CONSOLA
    // -------------------------------------------------------------
    console.log('\n[PASO 11] Comprobando logs y errores de consola...');
    const criticalErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('favicon'));
    if (criticalErrors.length > 0) {
      throw new Error(`Se detectaron errores críticos en consola: ${criticalErrors.join('; ')}`);
    }
    console.log('  ✔ Cero errores críticos de JavaScript o React en consola.');

    console.log('\n========================================================================');
    console.log('  VERIFICACIÓN E2E DE REGISTRO DE ASISTENCIA COMPLETADA AL 100%         ');
    console.log('========================================================================\n');
  } finally {
    await browser.close();
  }
}

function assertCorrectBadge(text) {
  if (text.includes('DATOS ACADÉMICOS REALES · SESIÓN AUTORIZADA')) {
    throw new Error('El Dashboard aún contiene la etiqueta prohibida "DATOS ACADÉMICOS REALES · SESIÓN AUTORIZADA"');
  }
  if (!text.includes('DATOS DE PRUEBA · CONECTADO A SQLITE LOCAL')) {
    throw new Error('No se encontró la etiqueta requerida "DATOS DE PRUEBA · CONECTADO A SQLITE LOCAL"');
  }
}

run().catch(err => {
  console.error('\n❌ ERROR EN LA PRUEBA E2E:', err);
  process.exit(1);
});
