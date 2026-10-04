const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://127.0.0.1:8080';
const OUT_DIR = path.resolve(__dirname, '..', 'EVIDENCIAS_PROCESO_COMPLETO_GONZALO');

(async () => {
  console.log('--- CAPTURANDO NUEVAS EVIDENCIAS REALES PARA EL INFORME DE PRÁCTICAS ---');
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });

  // 1. Evidencia 21: Pantalla de Login Institucional con selección de roles
  console.log('Capturando EVIDENCIA_21_LOGIN_INSTITUCIONAL_ROLES...');
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'load' });
  await page.waitForSelector('#login-form', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_21_LOGIN_INSTITUCIONAL_ROLES.png') });

  // 2. Iniciar sesión como Secretaría para capturar Centro Documental
  console.log('Iniciando sesión como Secretaría...');
  await page.click('.login-role-card[data-role="SECRETARIA"]');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#btn-login-submit');
  await page.waitForSelector('#user-role-widget', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // 3. Evidencia 26: Centro Documental Secretaría con las 4 etapas y botones de guía
  console.log('Capturando EVIDENCIA_26_CENTRO_DOCUMENTAL_SECRETARIA...');
  await page.evaluate(() => { window.location.hash = '#/documentos'; });
  await page.waitForSelector('.stage-nav-pill', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_26_CENTRO_DOCUMENTAL_SECRETARIA.png') });

  // 4. Evidencia 22: Carrusel Slide 1 (¿Qué es este documento?) para TMPL-01
  console.log('Capturando EVIDENCIA_22_CARRUSEL_SLIDE1_QUE_ES...');
  await page.click('[data-doc-info="TMPL-01"]');
  await page.waitForSelector('#doc-info-modal-overlay', { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_22_CARRUSEL_SLIDE1_QUE_ES.png') });

  // 5. Evidencia 23: Carrusel Slide 2 (¿Qué contiene?)
  console.log('Capturando EVIDENCIA_23_CARRUSEL_SLIDE2_CONTENIDO...');
  await page.click('#btn-doc-info-next');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_23_CARRUSEL_SLIDE2_CONTENIDO.png') });

  // 6. Evidencia 24: Carrusel Slide 3 (¿Para qué sirve?)
  console.log('Capturando EVIDENCIA_24_CARRUSEL_SLIDE3_UTILIDAD...');
  await page.click('#btn-doc-info-next');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_24_CARRUSEL_SLIDE3_UTILIDAD.png') });

  // 7. Evidencia 25: Carrusel Slide 4 (Responsabilidades por Rol)
  console.log('Capturando EVIDENCIA_25_CARRUSEL_SLIDE4_ROLES...');
  await page.click('#btn-doc-info-next');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_25_CARRUSEL_SLIDE4_ROLES.png') });

  // Cerrar modal
  await page.click('#btn-close-doc-info');
  await new Promise(r => setTimeout(r, 500));

  // 8. Cambiar a Director General
  console.log('Cambiando a Director General...');
  await page.click('#btn-switch-role');
  await page.waitForSelector('.role-card-option[data-role-id="DIRECTOR"]', { visible: true });
  await page.click('.role-card-option[data-role-id="DIRECTOR"]');
  await new Promise(r => setTimeout(r, 800));

  // 9. Evidencia 27: Director en Etapa 4 con Título Técnico Oficial activo
  console.log('Capturando EVIDENCIA_27_DIRECTOR_TITULACION_TMPL21...');
  await page.evaluate(() => { window.location.hash = '#/documentos'; });
  await page.waitForSelector('.stage-nav-pill[data-stage-id="ETAPA_4"]', { timeout: 10000 });
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_27_DIRECTOR_TITULACION_TMPL21.png') });

  // 10. Evidencia 28: Carrusel de Título Técnico Oficial (TMPL-21)
  console.log('Capturando EVIDENCIA_28_CARRUSEL_TITULO_TECNICO...');
  await page.click('[data-doc-info="TMPL-21"]');
  await page.waitForSelector('#doc-info-modal-overlay', { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'EVIDENCIA_28_CARRUSEL_TITULO_TECNICO.png') });
  await page.click('#btn-close-doc-info');
  await new Promise(r => setTimeout(r, 500));

  console.log('\n✓ TODAS LAS NUEVAS EVIDENCIAS HAN SIDO CAPTURADAS EN ALTA RESOLUCIÓN');
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('ERROR CAPTURANDO EVIDENCIAS:', err);
  process.exit(1);
});
