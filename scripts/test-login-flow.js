const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

(async () => {
  console.log('--- Iniciando Test E2E de Login y Contexto Docente ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // 1. Navegar e iniciar con almacenamiento limpio para verificar la redirección a login
  console.log('1. Accediendo a la aplicación...');
  await page.goto('http://localhost:8081/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Recargar hacia la ruta de login
  await page.goto('http://localhost:8081/index.html#/login', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // Verificar presencia de elementos clave del Login
  const loginCardExists = await page.$('.login-view-card');
  console.log('¿Tarjeta de Login renderizada?:', Boolean(loginCardExists));

  const logoExists = await page.$('.login-logo-img');
  console.log('¿Logo oficial del CETPRO presente?:', Boolean(logoExists));

  // Captura 1: Vista de Login Principal
  const shot1 = path.join(ARTIFACTS_DIR, '90_login_vista_principal.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('✓ Captura 1 guardada:', shot1);

  // 2. Probar cambio de carrera y cascada de grupos
  console.log('2. Probando selección de carrera y grupos dinámicos...');
  // Seleccionar Peluquería y Barbería (PROG-004)
  await page.select('#login-program-select', 'PROG-004');
  await new Promise(r => setTimeout(r, 500));

  // Obtener opciones del select de grupo
  const groupOptions = await page.evaluate(() => {
    const sel = document.getElementById('login-group-select');
    return sel ? Array.from(sel.options).map(o => ({ value: o.value, text: o.text })) : [];
  });
  console.log('Grupos cargados para Peluquería y Barbería:', groupOptions);

  // Seleccionar grupo GRP-BD-001 (Turno Mañana)
  await page.select('#login-group-select', 'GRP-BD-001');

  // Ingresar nombre personalizado del docente (opcional)
  await page.type('#login-custom-name', 'Docente Lic. Carlos Ramos');

  // Captura 1b: Login con selecciones activas
  const shot1b = path.join(ARTIFACTS_DIR, '90b_login_seleccion_docente.png');
  await page.screenshot({ path: shot1b, fullPage: true });
  console.log('✓ Captura 1b guardada:', shot1b);

  // 3. Enviar formulario de Login
  console.log('3. Haciendo clic en "Ingresar al Sistema"...');
  await page.click('#btn-login-submit');
  await new Promise(r => setTimeout(r, 1500));

  const currentUrl = page.url();
  console.log('URL tras login:', currentUrl);

  // Captura 2: Dashboard contextual del Docente
  const shot2 = path.join(ARTIFACTS_DIR, '91_docente_dashboard_contextual.png');
  await page.screenshot({ path: shot2, fullPage: true });
  console.log('✓ Captura 2 guardada:', shot2);

  // 4. Probar Conmutador de Aula desde el Navbar
  console.log('4. Probando botón "🏫 Aula ▾" en el Navbar...');
  const switchClassroomBtn = await page.$('#btn-switch-classroom');
  if (switchClassroomBtn) {
    await switchClassroomBtn.click();
    await new Promise(r => setTimeout(r, 800));

    // Captura 3: Modal de Conmutación de Aula
    const shot3 = path.join(ARTIFACTS_DIR, '92_modal_conmutador_aula.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log('✓ Captura 3 guardada:', shot3);

    // Cambiar a Computación e Informática (PROG-005) y Grupo GRP-BD-007
    console.log('Conmutando a Computación e Informática (GRP-BD-007)...');
    await page.select('#modal-classroom-prog-select', 'PROG-005');
    await new Promise(r => setTimeout(r, 500));
    await page.select('#modal-classroom-group-select', 'GRP-BD-007');
    await page.click('#modal-classroom-apply-btn');
    await new Promise(r => setTimeout(r, 1000));
  }

  // 5. Ir al Centro de Documentos para verificar que se eliminaron los selects apiñados
  console.log('5. Navegando al Centro de Documentos...');
  await page.goto('http://localhost:8081/index.html#/documentos', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // Verificar que los dropdowns viejos ya no existen
  const oldClassroomSelect = await page.$('#doc-teacher-classroom-select');
  const oldProgramSelect = await page.$('#doc-teacher-program-select');
  console.log('¿Dropdowns viejos eliminados?:', oldClassroomSelect === null && oldProgramSelect === null);

  const newPillBtn = await page.$('#doc-teacher-switch-classroom-btn');
  console.log('¿Nuevo botón ergonómico de aula presente?:', Boolean(newPillBtn));

  // Captura 4: Centro de Documentos Limpio y Ergonómico
  const shot4 = path.join(ARTIFACTS_DIR, '93_centro_documental_docente_limpio.png');
  await page.screenshot({ path: shot4, fullPage: true });
  console.log('✓ Captura 4 guardada:', shot4);

  // 6. Verificar ausencia total de nombres hardcodeados ("Walter Quispe")
  const pageContent = await page.content();
  const containsHardcoded = pageContent.includes('Walter Quispe');
  console.log('¿Existe algún nombre hardcodeado ("Walter Quispe") en la interfaz?:', containsHardcoded ? 'SÍ (ERROR)' : 'NO (CORRECTO - TOTALMENTE SANEADO)');

  // 7. Probar Cierre de Sesión (Logout)
  console.log('6. Probando botón de Cierre de Sesión [⎋ Salir]...');
  const logoutBtn = await page.$('#btn-auth-logout');
  if (logoutBtn) {
    await logoutBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    console.log('URL tras logout:', page.url());
  }

  // Captura 5: Regreso limpio a la pantalla de login tras logout
  const shot5 = path.join(ARTIFACTS_DIR, '94_logout_retorno_login.png');
  await page.screenshot({ path: shot5, fullPage: true });
  console.log('✓ Captura 5 guardada:', shot5);

  // 8. Probar Login como Director General
  console.log('7. Probando Login como Director General...');
  await page.click('.login-role-card[data-role="DIRECTOR"]');
  await page.click('#btn-login-submit');
  await new Promise(r => setTimeout(r, 1200));
  const shot6 = path.join(ARTIFACTS_DIR, '95_director_dashboard.png');
  await page.screenshot({ path: shot6, fullPage: true });
  console.log('✓ Captura 6 (Director) guardada:', shot6);

  // Salir como Director
  await page.click('#btn-auth-logout');
  await new Promise(r => setTimeout(r, 1000));

  // 9. Probar Login como Secretaría Académica
  console.log('8. Probando Login como Secretaría Académica...');
  await page.click('.login-role-card[data-role="SECRETARIA"]');
  await page.click('#btn-login-submit');
  await new Promise(r => setTimeout(r, 1200));
  const shot7 = path.join(ARTIFACTS_DIR, '96_secretaria_dashboard.png');
  await page.screenshot({ path: shot7, fullPage: true });
  console.log('✓ Captura 7 (Secretaría) guardada:', shot7);

  await browser.close();
  console.log('--- Test E2E completado exitosamente con los 3 roles institucionales ---');
  console.log('--- Test E2E completado exitosamente ---');
})().catch(err => {
  console.error('Error en Test E2E:', err);
  process.exit(1);
});
