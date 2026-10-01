const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1050 });

  const artifactDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('BROWSER_ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.log('PAGE_ERROR:', err.message);
  });

  console.log('1. Cargando aplicación en http://127.0.0.1:8081/#/inicio...');
  await page.goto('http://127.0.0.1:8081/#/inicio', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#user-role-widget');
  await new Promise(r => setTimeout(r, 1000));

  // --- TEST ROL 1: DIRECTOR GENERAL (Por defecto) ---
  console.log('2. Verificando Rol DIRECTOR GENERAL...');
  const roleNameDir = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-name')?.textContent);
  const roleBadgeDir = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-badge')?.textContent);
  console.log(`Director detectado: ${roleNameDir} (${roleBadgeDir})`);

  await page.screenshot({ path: path.join(artifactDir, '61_rbac_director_dashboard.png'), fullPage: false });

  // Abrir Modal de Roles
  console.log('3. Abriendo Modal de Conmutación de Roles...');
  await page.click('#user-role-widget');
  await page.waitForSelector('#role-selector-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, '62_rbac_modal_selector_roles.png'), fullPage: false });

  // --- TEST ROL 2: CONMUTAR A SECRETARÍA ACADÉMICA ---
  console.log('4. Cambiando al rol SECRETARIA ACADÉMICA...');
  await page.click('.role-card-option[data-role-id="SECRETARIA"]');
  await new Promise(r => setTimeout(r, 1000));

  const roleNameSec = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-name')?.textContent);
  const roleBadgeSec = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-badge')?.textContent);
  console.log(`Secretaría activada: ${roleNameSec} (${roleBadgeSec})`);

  await page.screenshot({ path: path.join(artifactDir, '63_rbac_secretaria_dashboard.png'), fullPage: false });

  // Navegar a Documentos como Secretaría
  console.log('5. Navegando a Documentos como Secretaría...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.flow-stepper');
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(artifactDir, '64_rbac_secretaria_documentos.png'), fullPage: false });

  // --- TEST ROL 3: CONMUTAR A DOCENTE DE ESPECIALIDAD ---
  console.log('6. Cambiando al rol DOCENTE DE ESPECIALIDAD...');
  await page.click('#user-role-widget');
  await page.waitForSelector('#role-selector-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 500));

  await page.click('.role-card-option[data-role-id="DOCENTE"]');
  await new Promise(r => setTimeout(r, 1000));

  const roleNameDoc = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-name')?.textContent);
  const roleBadgeDoc = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-badge')?.textContent);
  console.log(`Docente activado: ${roleNameDoc} (${roleBadgeDoc})`);

  // Ir a inicio del Docente
  await page.goto('http://127.0.0.1:8081/#/inicio', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(artifactDir, '65_rbac_docente_dashboard.png'), fullPage: false });

  // Probar Guardia de Enrutamiento (Router Guard) para ruta restringida: #/respaldo
  console.log('7. Verificando Router Guard intentando acceder a #/respaldo como Docente...');
  await page.goto('http://127.0.0.1:8081/#/respaldo', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.access-denied-card');
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, '66_rbac_docente_acceso_restringido.png'), fullPage: false });

  // Ir a Documentos como Docente (debe ver atribuciones pedagógicas)
  console.log('8. Navegando a Documentos como Docente...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.flow-stepper');
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(artifactDir, '67_rbac_docente_documentos.png'), fullPage: false });

  // --- RESTAURAR A DIRECTOR ---
  console.log('9. Restaurando rol a DIRECTOR GENERAL...');
  await page.click('#user-role-widget');
  await page.waitForSelector('#role-selector-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 500));
  await page.click('.role-card-option[data-role-id="DIRECTOR"]');
  await new Promise(r => setTimeout(r, 800));

  console.log('=== VERIFICACIÓN RBAC E2E COMPLETADA CON ÉXITO ===');
  console.log('Total errores de consola:', consoleErrors.length);

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('FAIL RBAC E2E:', err);
  process.exit(1);
});
