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
  await page.goto('http://127.0.0.1:8081/#/inicio', { waitUntil: 'load' });
  await page.waitForSelector('#user-role-widget');
  await new Promise(r => setTimeout(r, 600));

  // --- TEST ROL 1: DIRECTOR GENERAL (Por defecto) ---
  console.log('2. Verificando Rol DIRECTOR GENERAL...');
  const roleNameDir = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-name')?.textContent);
  const roleBadgeDir = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-badge')?.textContent);
  console.log(`Director detectado: ${roleNameDir} (${roleBadgeDir})`);

  await page.screenshot({ path: path.join(artifactDir, '61_rbac_director_dashboard.png'), fullPage: false });

  // Verificar que Director ve Etapa 4 con TMPL-21
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'load' });
  await page.waitForSelector('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 500));
  const hasTmpl21Director = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-21"]')));
  console.log('Director puede ver TMPL-21 Título Técnico:', hasTmpl21Director);
  if (!hasTmpl21Director) throw new Error('Director debería ver TMPL-21');
  await page.screenshot({ path: path.join(artifactDir, '72_rbac_director_etapa4_con_titulo.png'), fullPage: false });

  // Abrir Modal de Roles
  console.log('3. Abriendo Modal de Conmutación de Roles...');
  await page.click('#user-role-widget');
  await page.waitForSelector('#role-selector-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(artifactDir, '62_rbac_modal_selector_roles.png'), fullPage: false });

  // --- TEST ROL 2: CONMUTAR A SECRETARÍA ACADÉMICA ---
  console.log('4. Cambiando al rol SECRETARIA ACADÉMICA...');
  await page.click('.role-card-option[data-role-id="SECRETARIA"]');
  await new Promise(r => setTimeout(r, 600));

  const roleNameSec = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-name')?.textContent);
  console.log(`Secretaría activada: ${roleNameSec}`);
  await page.screenshot({ path: path.join(artifactDir, '63_rbac_secretaria_dashboard.png'), fullPage: false });

  // Validar que Secretaría ve Documentos pero NO ve TMPL-21 en Etapa 4
  console.log('5. Verificando Etapa 4 de Secretaría (TMPL-21 debe estar OCULTO)...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'load' });
  await page.waitForSelector('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_4"]');
  await new Promise(r => setTimeout(r, 500));

  const hasTmpl20Sec = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-20"]')));
  const hasTmpl21Sec = await page.evaluate(() => Boolean(document.querySelector('[data-select-tmpl="TMPL-21"]')));
  console.log('Secretaría ve TMPL-20 Certificado:', hasTmpl20Sec);
  console.log('Secretaría ve TMPL-21 Título (debe ser false):', hasTmpl21Sec);
  if (!hasTmpl20Sec) throw new Error('Secretaría debe ver TMPL-20');
  if (hasTmpl21Sec) throw new Error('Secretaría NO debe ver TMPL-21 (oculto por seguridad)');
  await page.screenshot({ path: path.join(artifactDir, '71_rbac_secretaria_sin_titulo_tecnico.png'), fullPage: false });

  // Validar que en Respaldo, Secretaría NO tiene botón de restaurar base de datos
  console.log('6. Verificando Respaldo como Secretaría (Restauración debe estar OCULTA)...');
  await page.goto('http://127.0.0.1:8081/#/respaldo', { waitUntil: 'load' });
  await page.waitForSelector('#btn-export-backup');
  const hasRestoreBtnSec = await page.evaluate(() => Boolean(document.querySelector('#btn-restore-backup')));
  console.log('Secretaría tiene botón de Restauración (debe ser false):', hasRestoreBtnSec);
  if (hasRestoreBtnSec) throw new Error('Secretaría NO debe tener botón de restaurar base de datos');
  await page.screenshot({ path: path.join(artifactDir, '70_rbac_secretaria_respaldo_sin_restaurar.png'), fullPage: false });

  // --- TEST ROL 3: CONMUTAR A DOCENTE DE ESPECIALIDAD ---
  console.log('7. Cambiando al rol DOCENTE DE ESPECIALIDAD...');
  await page.click('#user-role-widget');
  await page.waitForSelector('#role-selector-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 400));
  await page.click('.role-card-option[data-role-id="DOCENTE"]');
  await new Promise(r => setTimeout(r, 600));

  const roleNameDoc = await page.evaluate(() => document.querySelector('#user-role-widget .user-role-name')?.textContent);
  console.log(`Docente activado: ${roleNameDoc}`);

  // Verificar Inicio del Docente
  await page.goto('http://127.0.0.1:8081/#/inicio', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(artifactDir, '65_rbac_docente_dashboard.png'), fullPage: false });

  // Validar Padrón de Estudiantes: NO botón de nuevo estudiante
  console.log('8. Verificando Padrón como Docente (#btn-new-student debe estar OCULTO)...');
  await page.goto('http://127.0.0.1:8081/#/estudiantes', { waitUntil: 'load' });
  await page.waitForSelector('#student-search-input');
  const hasNewStudentBtnDoc = await page.evaluate(() => Boolean(document.querySelector('#btn-new-student')));
  console.log('Docente ve botón + Nuevo Estudiante (debe ser false):', hasNewStudentBtnDoc);
  if (hasNewStudentBtnDoc) throw new Error('Docente no debe tener botón + Nuevo Estudiante');
  await page.screenshot({ path: path.join(artifactDir, '68_rbac_docente_estudiantes_consulta.png'), fullPage: false });

  // Validar Documentos: Etapa 3 y Etapa 4 deben estar OCULTAS
  console.log('9. Verificando Documentos como Docente (Etapa 3 y 4 deben estar OCULTAS)...');
  await page.goto('http://127.0.0.1:8081/#/documentos', { waitUntil: 'load' });
  await page.waitForSelector('.stage-nav-pill');
  const stageIdsDoc = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.stage-nav-pill')).map(el => el.getAttribute('data-stage-id'));
  });
  console.log('Etapas visibles para Docente:', stageIdsDoc);
  if (stageIdsDoc.includes('ETAPA_3') || stageIdsDoc.includes('ETAPA_4')) {
    throw new Error('Docente no debe ver ETAPA_3 ni ETAPA_4');
  }
  const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
  console.log('Fuente activa en el navegador:', bodyFont);
  await page.screenshot({ path: path.join(artifactDir, '69_rbac_docente_etapas_ocultas.png'), fullPage: false });
  await page.screenshot({ path: path.join(artifactDir, '73_modern_docente_documentos.png'), fullPage: false });

  // Validar Router Guard para #/respaldo
  console.log('10. Verificando Router Guard para ruta #/respaldo como Docente...');
  await page.goto('http://127.0.0.1:8081/#/respaldo', { waitUntil: 'load' });
  await page.waitForSelector('.access-denied-card');
  await page.screenshot({ path: path.join(artifactDir, '66_rbac_docente_acceso_restringido.png'), fullPage: false });

  // --- RESTAURAR A DIRECTOR ---
  console.log('11. Restaurando rol a DIRECTOR GENERAL...');
  await page.click('#user-role-widget');
  await page.waitForSelector('#role-selector-modal-overlay', { visible: true });
  await new Promise(r => setTimeout(r, 400));
  await page.click('.role-card-option[data-role-id="DIRECTOR"]');
  await new Promise(r => setTimeout(r, 600));

  console.log('=== VERIFICACIÓN RBAC E2E COMPLETADA CON ÉXITO ===');
  console.log('Total errores de consola:', consoleErrors.length);

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('FAIL RBAC E2E:', err);
  process.exit(1);
});
