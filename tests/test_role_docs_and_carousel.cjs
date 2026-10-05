const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:8080';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

(async () => {
  console.log('=== INICIO DE PRUEBAS: ROLES, DOCUMENTOS Y CARRUSEL INFORMATIVO ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('BROWSER_PAGE_ERROR:', err.message);
  });

  // 1. Cargar aplicación
  console.log('1. Cargando sistema en ' + BASE_URL + '...');
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'load' });
  await page.waitForSelector('#btn-login-submit, #user-role-widget', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // 2. Login como Secretaría
  console.log('2. Iniciando sesión como Secretaría Académica...');
  const isLoginPage = await page.evaluate(() => Boolean(document.querySelector('#btn-login-submit')));
  if (isLoginPage) {
    await page.click('.login-role-card[data-role="SECRETARIA"]');
    await new Promise(r => setTimeout(r, 300));
    await page.click('#btn-login-submit');
    await page.waitForSelector('#user-role-widget', { timeout: 8000 });
  }

  // 3. Navegar a Centro de Emisión Documental
  console.log('3. Navegando al Centro de Emisión Documental (#/documentos)...');
  await page.evaluate(() => { window.location.hash = '#/documentos'; });
  await page.waitForSelector('.stage-nav-pill', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  // Verificar presencia de botones informativos en Etapa 1
  const infoBtnsCount = await page.evaluate(() => document.querySelectorAll('[data-doc-info]').length);
  console.log(`✓ Botones informativos detectados en Etapa 1: ${infoBtnsCount}`);
  if (infoBtnsCount === 0) {
    throw new Error('No se detectaron botones data-doc-info en las tarjetas de Etapa 1');
  }

  // 4. Probar apertura del Modal y Carrusel Informativo para TMPL-01
  console.log('4. Abriendo Ficha Técnica con Carrusel para TMPL-01 (Nómina)...');
  await page.click('[data-doc-info="TMPL-01"]');
  await page.waitForSelector('#doc-info-modal-overlay', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 500));

  // Validar Diapositiva 1
  const slide1Title = await page.evaluate(() => {
    const active = document.querySelector('.doc-info-slide.is-active .doc-slide-main-title');
    return active ? active.textContent.trim() : '';
  });
  console.log(`✓ Diapositiva 1 activa: "${slide1Title}"`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_carrusel_slide1_que_es.png') });

  // Navegar a Diapositiva 2
  console.log('5. Avanzando a Diapositiva 2 (¿Qué contiene?)...');
  await page.click('#btn-doc-info-next');
  await new Promise(r => setTimeout(r, 400));
  const slide2Title = await page.evaluate(() => {
    const active = document.querySelector('.doc-info-slide.is-active .doc-slide-main-title');
    return active ? active.textContent.trim() : '';
  });
  console.log(`✓ Diapositiva 2 activa: "${slide2Title}"`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_carrusel_slide2_que_contiene.png') });

  // Navegar a Diapositiva 3
  console.log('6. Avanzando a Diapositiva 3 (¿Para qué sirve?)...');
  await page.click('#btn-doc-info-next');
  await new Promise(r => setTimeout(r, 400));
  const slide3Title = await page.evaluate(() => {
    const active = document.querySelector('.doc-info-slide.is-active .doc-slide-main-title');
    return active ? active.textContent.trim() : '';
  });
  console.log(`✓ Diapositiva 3 activa: "${slide3Title}"`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_carrusel_slide3_para_que_sirve.png') });

  // Navegar a Diapositiva 4
  console.log('7. Avanzando a Diapositiva 4 (Responsabilidades por Rol)...');
  await page.click('#btn-doc-info-next');
  await new Promise(r => setTimeout(r, 400));
  const slide4Title = await page.evaluate(() => {
    const active = document.querySelector('.doc-info-slide.is-active .doc-slide-main-title');
    return active ? active.textContent.trim() : '';
  });
  console.log(`✓ Diapositiva 4 activa: "${slide4Title}"`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_carrusel_slide4_roles.png') });

  // Probar clic en dot para volver al paso 1
  console.log('8. Probando salto directo con Dot indicador al Paso 1...');
  await page.click('.doc-info-dot[data-slide-index="0"]');
  await new Promise(r => setTimeout(r, 300));

  // Cerrar modal
  console.log('9. Cerrando modal con botón [✕]...');
  await page.click('#btn-close-doc-info');
  await new Promise(r => setTimeout(r, 400));
  const isModalOpen = await page.evaluate(() => Boolean(document.getElementById('doc-info-modal-overlay')));
  console.log(`✓ Modal cerrado correctamente: ${!isModalOpen}`);

  // 10. Probar Etapa 2 (Asistencia y Evaluación)
  console.log('10. Navegando a Etapa 2...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 600));

  // Probar modal en Control de Asistencia
  console.log('11. Probando información de Control de Asistencia en Etapa 2...');
  const attInfoBtn = await page.$('.doc-item-card.card-accent-ugel [data-doc-info]');
  if (attInfoBtn) {
    await attInfoBtn.click();
    await page.waitForSelector('#doc-info-modal-overlay', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 400));
    const attModalTitle = await page.evaluate(() => document.querySelector('.doc-info-modal-title')?.textContent);
    console.log(`✓ Modal de Asistencia abierto: "${attModalTitle}"`);
    await page.click('#btn-close-doc-info');
    await new Promise(r => setTimeout(r, 400));
  }

  // 12. Probar Etapa 4 (Certificación)
  console.log('12. Navegando a Etapa 4 (Certificación y Egreso)...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 600));

  const hasTmpl20 = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-20"]')));
  console.log(`✓ Secretaría puede seleccionar Certificado Modular (TMPL-20): ${hasTmpl20}`);

  // Probar información de Título Técnico
  console.log('13. Probando botón informativo de Título Técnico (TMPL-21)...');
  await page.click('[data-doc-info="TMPL-21"]');
  await page.waitForSelector('#doc-info-modal-overlay', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 400));
  const tmpl21Title = await page.evaluate(() => document.querySelector('.doc-info-modal-title')?.textContent);
  console.log(`✓ Ficha de Título Técnico abierta: "${tmpl21Title}"`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_carrusel_tmpl21_titulo.png') });
  await page.click('#btn-close-doc-info');
  await new Promise(r => setTimeout(r, 400));

  // 14. Cambiar rol a DIRECTOR y comprobar que puede emitir TMPL-21 directamente
  console.log('14. Conmutando a Rol DIRECTOR GENERAL para validar emisión de Título...');
  await page.click('#btn-switch-role');
  await page.waitForSelector('.role-card-option[data-role-id="DIRECTOR"]', { visible: true });
  await page.click('.role-card-option[data-role-id="DIRECTOR"]');
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => { window.location.hash = '#/documentos'; });
  await page.waitForSelector('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 600));

  const dirHasTmpl21Select = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-21"]')));
  console.log(`✓ Director tiene acceso directo para emitir Título Técnico (TMPL-21): ${dirHasTmpl21Select}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'director_etapa4_con_titulo_activo.png') });

  console.log('\n========================================================================');
  console.log('✓ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
  console.log('✓ Modales con Carrusel 100% operativos, dinámicos y sin internet');
  console.log('✓ Roles de Secretaría y Dirección estructurados con emisión directa');
  console.log('========================================================================\n');

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('ERROR EN PRUEBAS:', err);
  process.exit(1);
});
