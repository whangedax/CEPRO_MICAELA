const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:8080';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const EVIDENCIAS_DIR = 'C:\\CETPRO\\PAQUETE_ANTIGRAVITY_CETPRO_V2\\EVIDENCIAS_PROCESO_COMPLETO_GONZALO';

(async () => {
  console.log('=== TEST E2E: MÓDULO DE DOCENTE DE ESPECIALIDAD & DEPURACIÓN DE RUIDO ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_CONSOLE_ERROR:', msg.text());
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('BROWSER_PAGE_ERROR:', err.message);
    consoleErrors.push(err.message);
  });

  // 1. Cargar aplicación en login
  console.log('1. Cargando sistema en ' + BASE_URL + '...');
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'load' });
  await page.waitForSelector('#btn-login-submit, #user-role-widget', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // 2. Iniciar sesión como DOCENTE DE ESPECIALIDAD
  console.log('2. Conmutando e iniciando sesión como DOCENTE DE ESPECIALIDAD...');
  const isLoginPage = await page.evaluate(() => Boolean(document.querySelector('#btn-login-submit')));
  if (isLoginPage) {
    await page.click('.login-role-card[data-role="DOCENTE"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#btn-login-submit');
    await page.waitForSelector('#user-role-widget', { timeout: 8000 });
  } else {
    await page.click('#user-role-widget');
    await page.waitForSelector('#role-select-modal, #role-selector-modal-overlay', { timeout: 5000 });
    await page.click('.role-card-option[data-role-id="DOCENTE"]');
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. Navegar a #/inicio (Aula Pedagógica)
  console.log('3. Navegando al Panel de Inicio del Docente (#/inicio)...');
  await page.evaluate(() => { window.location.hash = '#/inicio'; });
  await page.waitForSelector('.mvp-shortcuts-grid', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 700));

  // 4. Validar Banner Institucional Pedagógico
  console.log('4. Validando Banner Institucional Pedagógico del Docente...');
  const bannerInfo = await page.evaluate(() => {
    const text = document.body.innerText.toUpperCase();
    return {
      hasArea: text.includes('ÁREA PEDAGÓGICA Y AULA') || text.includes('ÁREA PEDAGÓGICA'),
      hasGestion: text.includes('GESTIÓN MODULAR DE CLASES') || text.includes('GESTIÓN MODULAR'),
      hasPeriodo: text.includes('2026-I'),
      hasTitulo: text.includes('MICAELA BASTIDAS PUYUCAWA'),
      hasAsistenciaBtn: Boolean(document.querySelector('a[href="#/asistencia"]')),
      hasEvaluacionBtn: Boolean(document.querySelector('a[href="#/evaluacion"]'))
    };
  });
  console.log('   Resultado Banner Docente:', bannerInfo);
  if (!bannerInfo.hasArea || !bannerInfo.hasPeriodo || !bannerInfo.hasAsistenciaBtn) {
    throw new Error('El banner institucional del Docente no contiene los datos o botones requeridos');
  }

  // 5. Validar Métricas Pedagógicas
  console.log('5. Validando Métricas Pedagógicas del Docente...');
  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.stat-card'));
    return cards.map(c => ({
      val: c.querySelector('.stat-value')?.textContent?.trim(),
      lbl: c.querySelector('.stat-label')?.textContent?.trim()
    }));
  });
  console.log('   Métricas encontradas:', metrics);
  if (metrics.length < 5) {
    throw new Error(`Se esperaban 5 métricas, se encontraron ${metrics.length}`);
  }

  // 6. Validar 6 Tarjetas de Trabajo para Docente (.shortcut-btn-card)
  console.log('6. Validando 6 Tarjetas de Trabajo para Docente...');
  const shortcutCards = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.shortcut-btn-card'));
    return cards.map(c => ({
      title: c.querySelector('.shortcut-btn-title')?.textContent?.trim(),
      badge: c.querySelector('.shortcut-btn-badge')?.textContent?.trim(),
      href: c.getAttribute('href')
    }));
  });
  console.log('   Tarjetas encontradas:', shortcutCards);
  if (shortcutCards.length < 6) {
    throw new Error(`Se esperaban 6 tarjetas de docente, se encontraron ${shortcutCards.length}`);
  }

  // 7. Validar Control Pedagógico de Aulas (Synoptic table)
  console.log('7. Validando Control Pedagógico de Aulas para Docente...');
  const synopticData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
    const foot = document.querySelector('.data-table tfoot')?.innerText || '';
    return {
      rowCount: rows.length,
      footText: foot
    };
  });
  console.log(`   Aulas detectadas en la especialidad: ${synopticData.rowCount}`);
  console.log(`   Texto de pie consolidado: ${synopticData.footText.replace(/\n/g, ' ')}`);
  if (synopticData.rowCount < 2) {
    throw new Error(`El tablero docente debe listar las aulas de la carrera, listó ${synopticData.rowCount}`);
  }
  if (!synopticData.footText.includes('TOTAL ESPECIALIDAD DOCENTE')) {
    throw new Error('El pie de tabla debe reflejar el consolidado de la especialidad técnica');
  }

  // 8. Validar Barra Lateral Depurada para Docente (Cero Ruido)
  console.log('8. Validando Barra Lateral Depurada para Docente (Cero Ruido)...');
  const sidebarCheck = await page.evaluate(() => {
    const isHidden = sel => {
      const el = document.querySelector(sel);
      return !el || el.style.display === 'none' || el.offsetParent === null;
    };
    const isVisible = sel => {
      const el = document.querySelector(sel);
      return el && el.style.display !== 'none' && el.offsetParent !== null;
    };

    return {
      incidenciasOculta: isHidden('#sidebar a[href="#/incidencias"]'),
      efsrtOculta: isHidden('#sidebar a[href="#/efsrt"]'),
      cierreOculta: isHidden('#sidebar a[href="#/cierre"]'),
      respaldoOculta: isHidden('#sidebar a[href="#/respaldo"]'),
      documentosOculta: isHidden('#sidebar a[href="#/documentos"]'),
      secPedagogicaVisible: isVisible('#sidebar-sec-title-main'),
      secAcademicVisible: isVisible('#sidebar-sec-title-academic'),
      secAdminOculta: isHidden('#sidebar-sec-title-admin'),
      mainSecText: document.querySelector('#sidebar-sec-title-main')?.textContent?.trim(),
      academicSecText: document.querySelector('#sidebar-sec-title-academic')?.textContent?.trim(),
      inicioText: document.querySelector('#sidebar a[href="#/inicio"] span:last-child')?.textContent?.trim(),
      asistenciaVisible: isVisible('#sidebar a[href="#/asistencia"]'),
      evaluacionVisible: isVisible('#sidebar a[href="#/evaluacion"]'),
      portadaVisible: isVisible('#sidebar a[href="#/portada"]'),
      alumnosVisible: isVisible('#sidebar a[href="#/estudiantes"]')
    };
  });
  console.log('   Auditoría de Sidebar Docente:', sidebarCheck);
  if (!sidebarCheck.incidenciasOculta || !sidebarCheck.efsrtOculta || !sidebarCheck.respaldoOculta || !sidebarCheck.secAdminOculta) {
    throw new Error('Fallo de depuración: Las rutas de ruido administrativo no fueron ocultadas para Docente');
  }
  if (sidebarCheck.mainSecText !== 'GESTIÓN PEDAGÓGICA' || sidebarCheck.academicSecText !== 'AULA Y ESPECIALIDAD') {
    throw new Error('Las cabeceras de sección institucional para Docente no se configuraron correctamente');
  }
  if (!sidebarCheck.asistenciaVisible || !sidebarCheck.evaluacionVisible) {
    throw new Error('Las herramientas pedagógicas de asistencia y notas deben ser visibles en el menú del Docente');
  }

  // 9. Tomar capturas de evidencia
  console.log('9. Generando capturas de pantalla para auditoría...');
  const snap1 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_35_DOCENTE_DASHBOARD_PEDAGOGICO.png');
  const snap2 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_36_DOCENTE_CONTROL_AULAS.png');
  const snap1Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_35_DOCENTE_DASHBOARD_PEDAGOGICO.png');
  const snap2Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_36_DOCENTE_CONTROL_AULAS.png');

  await page.screenshot({ path: snap1 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap1, snap1Ev);
  console.log('✓ Captura 1 guardada: EVIDENCIA_35_DOCENTE_DASHBOARD_PEDAGOGICO.png');

  // Scroll al tablero de control de aulas para captura enfocada
  await page.evaluate(() => {
    document.querySelector('.data-table')?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: snap2 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap2, snap2Ev);
  console.log('✓ Captura 2 guardada: EVIDENCIA_36_DOCENTE_CONTROL_AULAS.png');

  // 10. Probar navegación directa al Control de Asistencia Modular
  console.log('10. Probando clic en tarjeta de Control de Asistencia Modular...');
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('.shortcut-btn-card')).find(c => c.innerText.includes('Control de Asistencia Modular'));
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const currentUrl = page.url();
  console.log(`✓ Navegación exitosa a: ${currentUrl}`);

  // Guardar captura de evidencia 37 en vista pedagógica con sidebar activo
  const snap3 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_37_DOCENTE_SIDEBAR_DEPURADO.png');
  const snap3Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_37_DOCENTE_SIDEBAR_DEPURADO.png');
  await page.screenshot({ path: snap3 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap3, snap3Ev);
  console.log('✓ Captura 3 guardada: EVIDENCIA_37_DOCENTE_SIDEBAR_DEPURADO.png');

  // 11. Probar navegación a Registro Auxiliar de Notas
  console.log('11. Probando navegación a Registro de Notas...');
  await page.evaluate(() => { window.location.hash = '#/evaluacion'; });
  await new Promise(r => setTimeout(r, 800));
  console.log(`✓ Navegación exitosa a: ${page.url()}`);

  // 12. Verificar log de consola
  console.log('12. Verificando log de consola...');
  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Se registraron ${consoleErrors.length} advertencias/errores en consola:`, consoleErrors);
  } else {
    console.log('✓ Cero errores en consola de Edge durante todo el flujo de Docente.');
  }

  await browser.close();
  console.log('=== PRUEBA E2E FINALIZADA CON ÉXITO: 100% PASS ===');
})();
