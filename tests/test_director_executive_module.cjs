const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:8080';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const EVIDENCIAS_DIR = 'C:\\CETPRO\\PAQUETE_ANTIGRAVITY_CETPRO_V2\\EVIDENCIAS_PROCESO_COMPLETO_GONZALO';

(async () => {
  console.log('=== TEST E2E: MÓDULO EJECUTIVO DE DIRECCIÓN GENERAL & DEPURACIÓN DE RUIDO ===');
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

  // 2. Iniciar sesión como DIRECTOR GENERAL
  console.log('2. Conmutando e iniciando sesión como DIRECTOR GENERAL...');
  const isLoginPage = await page.evaluate(() => Boolean(document.querySelector('#btn-login-submit')));
  if (isLoginPage) {
    await page.click('.login-role-card[data-role="DIRECTOR"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#btn-login-submit');
    await page.waitForSelector('#user-role-widget', { timeout: 8000 });
  } else {
    // Si ya está dentro, conmutar mediante widget
    await page.click('#user-role-widget');
    await page.waitForSelector('#role-select-modal', { timeout: 5000 });
    await page.click('.role-picker-option[data-role-id="DIRECTOR"]');
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. Navegar a #/inicio (Panel Ejecutivo)
  console.log('3. Navegando al Panel de Inicio Ejecutivo (#/inicio)...');
  await page.evaluate(() => { window.location.hash = '#/inicio'; });
  await page.waitForSelector('.mvp-shortcuts-grid', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 700));

  // 4. Validar Banner Institucional de Dirección General
  console.log('4. Validando Banner Institucional de Dirección...');
  const bannerInfo = await page.evaluate(() => {
    const text = document.body.innerText.toUpperCase();
    return {
      hasDespacho: text.includes('DESPACHO DE DIRECCIÓN GENERAL') || text.includes('DIRECCIÓN GENERAL'),
      hasRD: text.includes('0124-1983-ED'),
      hasUgel: text.includes('UGEL 03'),
      hasCodModular: text.includes('0725358'),
      hasPeriodo: text.includes('2026-I')
    };
  });
  console.log('   Resultado Banner:', bannerInfo);
  if (!bannerInfo.hasDespacho || !bannerInfo.hasRD || !bannerInfo.hasCodModular) {
    throw new Error('El banner institucional de Dirección General no contiene los datos oficiales requeridos');
  }

  // 5. Validar Métricas Ejecutivas del Dashboard
  console.log('5. Validando Métricas Ejecutivas...');
  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.stat-card'));
    return cards.map(c => ({
      val: c.querySelector('.stat-value')?.textContent?.trim(),
      lbl: c.querySelector('.stat-label')?.textContent?.trim()
    }));
  });
  console.log('   Métricas encontradas:', metrics);
  if (metrics.length < 5) {
    throw new Error(`Se esperaban 5 métricas ejecutivas, se encontraron ${metrics.length}`);
  }

  // 6. Validar Tarjetas Ejecutivas de Alta Jerarquía (.shortcut-btn-card)
  console.log('6. Validando 6 Tarjetas Ejecutivas de Acceso Rápido...');
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
    throw new Error(`Se esperaban 6 tarjetas ejecutivas, se encontraron ${shortcutCards.length}`);
  }

  // 7. Validar Monitor Sinóptico de Carreras Técnicas
  console.log('7. Validando Monitor Sinóptico de Especialidades Técnicas...');
  const synopticData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
    const foot = document.querySelector('.data-table tfoot')?.innerText || '';
    return {
      rowCount: rows.length,
      footText: foot
    };
  });
  console.log(`   Filas de carreras detectadas: ${synopticData.rowCount} (Esperadas: 7)`);
  console.log(`   Texto de cierre consolidado: ${synopticData.footText.replace(/\n/g, ' ')}`);
  if (synopticData.rowCount !== 7) {
    throw new Error(`El Monitor Sinóptico debe mostrar exactamente 7 carreras técnicas, mostró ${synopticData.rowCount}`);
  }
  if (!synopticData.footText.includes('295 Matrículas')) {
    throw new Error('El total consolidado debe reflejar 295 matrículas en el CETPRO');
  }

  // 8. Validar Depuración de Ruido Visual en la Barra Lateral (#sidebar)
  console.log('8. Validando Barra Lateral Depurada (Cero Ruido para Director)...');
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
      secTitleMainVisible: isVisible('#sidebar-sec-title-main'),
      secTitleAdminVisible: isVisible('#sidebar-sec-title-admin'),
      mainSecText: document.querySelector('#sidebar-sec-title-main')?.textContent?.trim(),
      adminSecText: document.querySelector('#sidebar-sec-title-admin')?.textContent?.trim(),
      inicioText: document.querySelector('#sidebar a[href="#/inicio"] span:last-child')?.textContent?.trim(),
      docText: document.querySelector('#sidebar a[href="#/documentos"] span:last-child')?.textContent?.trim(),
      gruposText: document.querySelector('#sidebar a[href="#/grupos"] span:last-child')?.textContent?.trim(),
      respaldoText: document.querySelector('#sidebar a[href="#/respaldo"] span:last-child')?.textContent?.trim()
    };
  });
  console.log('   Auditoría de Sidebar Director:', sidebarCheck);
  if (!sidebarCheck.incidenciasOculta || !sidebarCheck.efsrtOculta || !sidebarCheck.cierreOculta) {
    throw new Error('Fallo de depuración: Las rutas de ruido no fueron ocultadas para el Director');
  }
  if (sidebarCheck.mainSecText !== 'DIRECCIÓN GENERAL' || sidebarCheck.adminSecText !== 'SISTEMA Y SEGURIDAD') {
    throw new Error('Las cabeceras de sección institucional no se configuraron correctamente');
  }

  // 9. Tomar capturas de evidencia
  console.log('9. Generando capturas de pantalla para auditoría y reporte...');
  const snap1 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_29_DIRECTOR_DASHBOARD_EJECUTIVO.png');
  const snap2 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_30_DIRECTOR_MONITOR_SINOPTICO.png');
  const snap1Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_29_DIRECTOR_DASHBOARD_EJECUTIVO.png');
  const snap2Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_30_DIRECTOR_MONITOR_SINOPTICO.png');

  await page.screenshot({ path: snap1 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap1, snap1Ev);
  console.log(`✓ Captura 1 guardada: EVIDENCIA_29_DIRECTOR_DASHBOARD_EJECUTIVO.png`);

  // Scroll al monitor sinóptico para captura enfocada
  await page.evaluate(() => {
    document.querySelector('.data-table')?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: snap2 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap2, snap2Ev);
  console.log(`✓ Captura 2 guardada: EVIDENCIA_30_DIRECTOR_MONITOR_SINOPTICO.png`);

  // 10. Probar navegación directa a Titulación Oficial (#/documentos) desde la tarjeta
  console.log('10. Probando clic en tarjeta de Titulación Oficial...');
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('.shortcut-btn-card')).find(c => c.innerText.includes('Titulación y Certificación Oficial'));
    if (card) card.click();
  });
  await page.waitForSelector('.stage-nav-pill', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 500));

  const currentUrl = page.url();
  console.log(`✓ Navegación exitosa a: ${currentUrl}`);

  // Conmutar a Etapa 4 (Certificación y Titulación) donde radica TMPL-21
  console.log('    Conmutando a Etapa 4 (Titulación y Certificación)...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 600));

  // Verificar tarjeta de TMPL-21 visible para Director
  const hasTmpl21Card = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-21"]')));
  console.log(`✓ Tarjeta Título Técnico (TMPL-21) presente en Centro Documental: ${hasTmpl21Card}`);
  if (!hasTmpl21Card) {
    throw new Error('La tarjeta exclusiva de Título Técnico Oficial (TMPL-21) debe estar presente para el Director');
  }

  // Guardar captura de evidencia 31 en Etapa 4
  const snap3 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_31_DIRECTOR_TITULACION_CENTRO_DOC.png');
  const snap3Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_31_DIRECTOR_TITULACION_CENTRO_DOC.png');
  await page.screenshot({ path: snap3 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap3, snap3Ev);
  console.log('✓ Captura 3 guardada: EVIDENCIA_31_DIRECTOR_TITULACION_CENTRO_DOC.png');

  // 11. Verificar errores en consola
  console.log('11. Verificando log de consola...');
  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Se registraron ${consoleErrors.length} advertencias/errores en consola:`, consoleErrors);
  } else {
    console.log('✓ Cero errores en consola de Edge durante todo el flujo del Director.');
  }

  await browser.close();
  console.log('=== PRUEBA E2E FINALIZADA CON ÉXITO: 100% PASS ===');
})();
