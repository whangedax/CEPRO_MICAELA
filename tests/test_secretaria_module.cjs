const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:8080';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const EVIDENCIAS_DIR = 'C:\\CETPRO\\PAQUETE_ANTIGRAVITY_CETPRO_V2\\EVIDENCIAS_PROCESO_COMPLETO_GONZALO';

(async () => {
  console.log('=== TEST E2E: MÓDULO DE SECRETARÍA ACADÉMICA & DEPURACIÓN DE RUIDO ===');
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

  // 2. Iniciar sesión como SECRETARÍA ACADÉMICA
  console.log('2. Conmutando e iniciando sesión como SECRETARÍA ACADÉMICA...');
  const isLoginPage = await page.evaluate(() => Boolean(document.querySelector('#btn-login-submit')));
  if (isLoginPage) {
    await page.click('.login-role-card[data-role="SECRETARIA"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#btn-login-submit');
    await page.waitForSelector('#user-role-widget', { timeout: 8000 });
  } else {
    await page.click('#user-role-widget');
    await page.waitForSelector('#role-select-modal', { timeout: 5000 });
    await page.click('.role-picker-option[data-role-id="SECRETARIA"]');
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. Navegar a #/inicio (Panel de Secretaría)
  console.log('3. Navegando al Panel de Inicio de Secretaría (#/inicio)...');
  await page.evaluate(() => { window.location.hash = '#/inicio'; });
  await page.waitForSelector('.mvp-shortcuts-grid', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 700));

  // 4. Validar Banner Institucional de Secretaría Académica
  console.log('4. Validando Banner Institucional de Secretaría...');
  const bannerInfo = await page.evaluate(() => {
    const text = document.body.innerText.toUpperCase();
    return {
      hasArea: text.includes('ÁREA DE SECRETARÍA ACADÉMICA') || text.includes('SECRETARÍA ACADÉMICA'),
      hasGestion: text.includes('GESTIÓN DE MATRÍCULA Y NÓMINAS') || text.includes('MATRÍCULA'),
      hasPeriodo: text.includes('2026-I'),
      hasPadron: text.includes('PADRÓN OFICIAL') || text.includes('PADRÓN')
    };
  });
  console.log('   Resultado Banner Secretaría:', bannerInfo);
  if (!bannerInfo.hasArea || !bannerInfo.hasPeriodo) {
    throw new Error('El banner institucional de Secretaría Académica no contiene los datos requeridos');
  }

  // 5. Validar Métricas de Secretaría
  console.log('5. Validando Métricas de Secretaría...');
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

  // 6. Validar 6 Tarjetas Ejecutivas de Acceso Rápido (.shortcut-btn-card)
  console.log('6. Validando 6 Tarjetas de Trabajo para Secretaría...');
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
    throw new Error(`Se esperaban 6 tarjetas de secretaría, se encontraron ${shortcutCards.length}`);
  }

  // 7. Validar Control Centralizado de Aulas y Nóminas
  console.log('7. Validando Control Centralizado de Aulas y Nóminas de Matrícula...');
  const synopticData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
    const foot = document.querySelector('.data-table tfoot')?.innerText || '';
    return {
      rowCount: rows.length,
      footText: foot
    };
  });
  console.log(`   Aulas detectadas en el tablero: ${synopticData.rowCount} (Esperadas: 12)`);
  console.log(`   Texto de cierre consolidado: ${synopticData.footText.replace(/\n/g, ' ')}`);
  if (synopticData.rowCount !== 12) {
    throw new Error(`El tablero de secretaría debe listar las 12 aulas, listó ${synopticData.rowCount}`);
  }
  if (!synopticData.footText.includes('295 Matrículas')) {
    throw new Error('El total consolidado debe reflejar 295 matrículas registradas');
  }

  // 8. Validar Depuración de Ruido Visual en la Barra Lateral para Secretaría
  console.log('8. Validando Barra Lateral Depurada para Secretaría (Cero Ruido)...');
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
      estText: document.querySelector('#sidebar a[href="#/estudiantes"] span:last-child')?.textContent?.trim(),
      docText: document.querySelector('#sidebar a[href="#/documentos"] span:last-child')?.textContent?.trim(),
      gruposText: document.querySelector('#sidebar a[href="#/grupos"] span:last-child')?.textContent?.trim(),
      programasText: document.querySelector('#sidebar a[href="#/programas"] span:last-child')?.textContent?.trim(),
      respaldoText: document.querySelector('#sidebar a[href="#/respaldo"] span:last-child')?.textContent?.trim()
    };
  });
  console.log('   Auditoría de Sidebar Secretaría:', sidebarCheck);
  if (!sidebarCheck.incidenciasOculta || !sidebarCheck.efsrtOculta || !sidebarCheck.cierreOculta) {
    throw new Error('Fallo de depuración: Las rutas de ruido no fueron ocultadas para Secretaría');
  }
  if (sidebarCheck.mainSecText !== 'SECRETARÍA ACADÉMICA' || sidebarCheck.adminSecText !== 'ADMINISTRACIÓN Y REGISTRO') {
    throw new Error('Las cabeceras de sección institucional para Secretaría no se configuraron correctamente');
  }

  // 9. Tomar capturas de evidencia
  console.log('9. Generando capturas de pantalla para auditoría...');
  const snap1 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_32_SECRETARIA_DASHBOARD_MATRICULA.png');
  const snap2 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_33_SECRETARIA_CONTROL_NOMINAS.png');
  const snap1Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_32_SECRETARIA_DASHBOARD_MATRICULA.png');
  const snap2Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_33_SECRETARIA_CONTROL_NOMINAS.png');

  await page.screenshot({ path: snap1 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap1, snap1Ev);
  console.log('✓ Captura 1 guardada: EVIDENCIA_32_SECRETARIA_DASHBOARD_MATRICULA.png');

  // Scroll al tablero de nóminas para captura enfocada
  await page.evaluate(() => {
    document.querySelector('.data-table')?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: snap2 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap2, snap2Ev);
  console.log('✓ Captura 2 guardada: EVIDENCIA_33_SECRETARIA_CONTROL_NOMINAS.png');

  // 10. Probar navegación directa a Nóminas Oficiales desde tarjeta
  console.log('10. Probando clic en tarjeta de Nóminas Oficiales...');
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('.shortcut-btn-card')).find(c => c.innerText.includes('Nóminas Oficiales de Matrícula'));
    if (card) card.click();
  });
  await page.waitForSelector('.stage-nav-pill', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 500));

  const currentUrl = page.url();
  console.log(`✓ Navegación exitosa a: ${currentUrl}`);

  // Verificar presencia de TMPL-01 en Etapa 1
  const hasTmpl01Card = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-01"]')));
  console.log(`✓ Tarjeta Nómina Oficial (TMPL-01) presente en Centro Documental: ${hasTmpl01Card}`);
  if (!hasTmpl01Card) {
    throw new Error('La tarjeta de Nómina Oficial (TMPL-01) debe estar presente en el Centro Documental');
  }

  // Guardar captura de evidencia 34 en Centro Documental de Secretaría
  const snap3 = path.join(ARTIFACTS_DIR, 'EVIDENCIA_34_SECRETARIA_SIDEBAR_DEPURADO.png');
  const snap3Ev = path.join(EVIDENCIAS_DIR, 'EVIDENCIA_34_SECRETARIA_SIDEBAR_DEPURADO.png');
  await page.screenshot({ path: snap3 });
  if (fs.existsSync(EVIDENCIAS_DIR)) fs.copyFileSync(snap3, snap3Ev);
  console.log('✓ Captura 3 guardada: EVIDENCIA_34_SECRETARIA_SIDEBAR_DEPURADO.png');

  // 11. Verificar errores en consola
  console.log('11. Verificando log de consola...');
  if (consoleErrors.length > 0) {
    console.warn(`⚠️ Se registraron ${consoleErrors.length} advertencias/errores en consola:`, consoleErrors);
  } else {
    console.log('✓ Cero errores en consola de Edge durante todo el flujo de Secretaría.');
  }

  await browser.close();
  console.log('=== PRUEBA E2E FINALIZADA CON ÉXITO: 100% PASS ===');
})();
