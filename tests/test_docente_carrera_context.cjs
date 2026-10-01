const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const BASE_URL = 'http://127.0.0.1:8081';

async function runTest() {
  console.log('--- Iniciando prueba de delimitación contextual de docente por carrera ---');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('BROWSER_PAGE_ERROR:', err.message, err.stack);
  });

  try {
    // 1. Abrir la aplicación en puerto 8081
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'load' });
    await page.waitForSelector('#user-role-widget');
    await new Promise(r => setTimeout(r, 600));

    // 2. Abrir modal y cambiar a DOCENTE mediante interacción de UI
    console.log('Cambiando a rol DOCENTE...');
    await page.click('#user-role-widget');
    await page.waitForSelector('.role-card-option[data-role-id="DOCENTE"]', { visible: true });
    await new Promise(r => setTimeout(r, 400));
    await page.click('.role-card-option[data-role-id="DOCENTE"]');
    await new Promise(r => setTimeout(r, 800));

    // 3. Validar widget en el header
    const widgetText = await page.evaluate(() => {
      const widget = document.getElementById('user-role-widget');
      return widget ? widget.innerText : '';
    });
    console.log(`Widget de usuario header: "${widgetText.replace(/\n/g, ' ')}"`);
    if (!widgetText.includes('COMPUTACIÓN E INFORMÁTICA') && !widgetText.includes('Computación e Informática')) {
      throw new Error(`El widget no refleja la especialidad de Computación e Informática. Texto: ${widgetText}`);
    }
    console.log('✓ PASS: Widget refleja correctamente "COMPUTACIÓN E INFORMÁTICA"');

    const navigateToHash = async (hash) => {
      await page.evaluate(h => { window.location.hash = h; }, hash);
      await new Promise(r => setTimeout(r, 600));
    };

    // 4. Navegar a #/estudiantes y verificar acotamiento a 96 alumnos
    await navigateToHash('#/estudiantes');
    await page.waitForSelector('#student-list-container');
    await new Promise(r => setTimeout(r, 600));

    const studentCountBadge = await page.evaluate(() => {
      const badge = document.getElementById('student-count-badge');
      return badge ? badge.innerText : '';
    });
    const studentRowsCount = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });

    console.log(`Padrón de estudiantes (Computación): badge="${studentCountBadge}", filas en tabla=${studentRowsCount}`);
    if (studentRowsCount !== 95) {
      throw new Error(`Se esperaban exactamente 95 alumnos únicos de Computación e Informática (96 matrículas), pero se contaron ${studentRowsCount}`);
    }
    console.log('✓ PASS: Exactamente 95 alumnos mostrados para la carrera de Computación e Informática');

    // Screenshot 74a
    const path74a = path.join(ARTIFACTS_DIR, '74_docente_carrera_computacion_estudiantes.png');
    await page.screenshot({ path: path74a });
    console.log(`✓ Screenshot guardado: ${path74a}`);

    // 5. Navegar a #/documentos y verificar acotamiento a 2 grupos (GRP-BD-007 y GRP-BD-008)
    await navigateToHash('#/documentos');
    await page.waitForSelector('#doc-group-select');
    await new Promise(r => setTimeout(r, 600));

    const groupOptions = await page.evaluate(() => {
      const select = document.getElementById('doc-group-select');
      if (!select) return [];
      return Array.from(select.querySelectorAll('option')).map(opt => ({
        value: opt.value,
        text: opt.innerText
      }));
    });

    console.log(`Grupos disponibles en selector de documentos:`, groupOptions.map(g => g.value));
    if (groupOptions.length !== 2) {
      throw new Error(`Se esperaban exactamente 2 grupos para Computación e Informática, pero hay ${groupOptions.length}`);
    }
    if (!groupOptions.some(g => g.value.includes('GRP-BD-007')) || !groupOptions.some(g => g.value.includes('GRP-BD-008'))) {
      throw new Error(`Los grupos no corresponden a GRP-BD-007 y GRP-BD-008. Obtenidos: ${JSON.stringify(groupOptions)}`);
    }
    console.log('✓ PASS: Exactamente 2 grupos de Computación disponibles en emisión documental (GRP-BD-007 y GRP-BD-008)');

    // Screenshot 74b
    const path74b = path.join(ARTIFACTS_DIR, '74_docente_carrera_computacion_documentos.png');
    await page.screenshot({ path: path74b });
    console.log(`✓ Screenshot guardado: ${path74b}`);

    // 6. Conmutar a carrera PROG-006: CORTE Y ENSAMBLAJE mediante el selector UI
    console.log('Conmutando especialidad docente a PROG-006 (Corte y Ensamblaje) vía selector...');
    const selectExists = await page.evaluate(() => Boolean(document.getElementById('doc-teacher-program-select')));
    if (!selectExists) {
      throw new Error('No se encontró el selector #doc-teacher-program-select en la tarjeta de documentos');
    }
    await page.select('#doc-teacher-program-select', 'PROG-006');
    await new Promise(r => setTimeout(r, 800));

    // Verificar en documentos los grupos de Corte y Ensamblaje (deben ser 3 grupos: GRP-BD-009, GRP-BD-010, GRP-BD-011)
    const corteGroupOptions = await page.evaluate(() => {
      const select = document.getElementById('doc-group-select');
      if (!select) return [];
      return Array.from(select.querySelectorAll('option')).map(opt => ({
        value: opt.value,
        text: opt.innerText
      }));
    });
    console.log(`Grupos disponibles para Corte y Ensamblaje:`, corteGroupOptions.map(g => g.value));
    if (corteGroupOptions.length !== 3) {
      throw new Error(`Se esperaban 3 grupos para Corte y Ensamblaje, pero se obtuvieron ${corteGroupOptions.length}`);
    }
    console.log('✓ PASS: Exactamente 3 grupos de Corte y Ensamblaje disponibles');

    // Navegar a #/estudiantes y verificar 55 alumnos
    await navigateToHash('#/estudiantes');
    await page.waitForSelector('#student-list-container');
    await new Promise(r => setTimeout(r, 600));

    const corteStudentsCount = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });
    console.log(`Padrón de estudiantes (Corte y Ensamblaje): ${corteStudentsCount} alumnos`);
    if (corteStudentsCount !== 55) {
      throw new Error(`Se esperaban 55 alumnos de Corte y Ensamblaje, pero se contaron ${corteStudentsCount}`);
    }
    console.log('✓ PASS: Exactamente 55 alumnos de Corte y Ensamblaje mostrados');

    // Screenshot 75
    const path75 = path.join(ARTIFACTS_DIR, '75_docente_carrera_corte.png');
    await page.screenshot({ path: path75 });
    console.log(`✓ Screenshot guardado: ${path75}`);

    // 7. Volver al rol DIRECTOR y verificar que ve todo el universo (269 alumnos, 12 grupos)
    console.log('Conmutando a DIRECTOR para verificar que el acceso institucional completo no se alteró...');
    await page.click('#user-role-widget');
    await page.waitForSelector('.role-card-option[data-role-id="DIRECTOR"]', { visible: true });
    await new Promise(r => setTimeout(r, 400));
    await page.click('.role-card-option[data-role-id="DIRECTOR"]');
    await new Promise(r => setTimeout(r, 800));

    await navigateToHash('#/estudiantes');
    await page.waitForSelector('#student-list-container');
    await new Promise(r => setTimeout(r, 600));
    const directorStudentsCount = await page.evaluate(() => {
      return document.querySelectorAll('#student-list-container tbody tr').length;
    });
    console.log(`Padrón de estudiantes (Director): ${directorStudentsCount} alumnos`);
    if (directorStudentsCount !== 269) {
      throw new Error(`El Director debería ver 269 alumnos, pero ve ${directorStudentsCount}`);
    }
    console.log('✓ PASS: Director ve los 269 estudiantes completos');

    await navigateToHash('#/documentos');
    await page.waitForSelector('#doc-group-select');
    await new Promise(r => setTimeout(r, 600));
    const directorGroupsCount = await page.evaluate(() => {
      const select = document.getElementById('doc-group-select');
      return select ? select.querySelectorAll('option').length : 0;
    });
    console.log(`Grupos en documentos (Director): ${directorGroupsCount} grupos`);
    if (directorGroupsCount !== 12) {
      throw new Error(`El Director debería ver 12 grupos, pero ve ${directorGroupsCount}`);
    }
    console.log('✓ PASS: Director ve los 12 grupos completos');

    console.log('\n======================================================');
    console.log('✅ TODAS LAS PRUEBAS DE CONTEXTO POR CARRERA PASARON CON ÉXITO');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ ERROR EN PRUEBA:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTest();
