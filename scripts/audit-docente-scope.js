const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

(async () => {
  console.log('=== AUDITORÍA INTEGRAL DE DELIMITACIÓN CONTEXTUAL DOCENTE ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  // 1. Acceder y limpiar almacenamiento previo
  console.log('\n[1/6] Iniciando sesión como DOCENTE en Computación e Informática (GRP-BD-008)...');
  await page.goto('http://localhost:8081/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto('http://localhost:8081/index.html#/login', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // Asegurar selección de DOCENTE
  await page.click('input[name="login-role"][value="DOCENTE"]');
  await new Promise(r => setTimeout(r, 400));

  // Seleccionar Carrera: PROG-005 (Computación e Informática)
  await page.select('#login-program-select', 'PROG-005');
  await new Promise(r => setTimeout(r, 400));

  // Seleccionar Grupo: GRP-BD-008 (70 estudiantes)
  await page.select('#login-group-select', 'GRP-BD-008');
  await new Promise(r => setTimeout(r, 300));

  // Click Iniciar Sesión
  await page.click('#btn-login-submit');
  await new Promise(r => setTimeout(r, 1200));

  // 2. AUDITORÍA #/inicio
  console.log('\n[2/6] Verificando métricas contextuales en #/inicio...');
  const inicioStats = await page.evaluate(() => {
    const cards = document.querySelectorAll('.mvp-metric-grid .stat-card');
    return Array.from(cards).map(c => ({
      val: c.querySelector('.stat-value')?.textContent?.trim(),
      lbl: c.querySelector('.stat-label')?.textContent?.trim()
    }));
  });
  console.log('Métricas visibles en #/inicio:', inicioStats);

  const hasGlobal269 = inicioStats.some(s => s.val === '269' || s.val === '295' || s.val === '12');
  console.log('¿Hay fuga de datos globales (269, 295, 12)?:', hasGlobal269 ? '❌ ERROR: FUGA DETECTADA' : '✅ CORRECTO: CERO FUGA GLOBAL');

  const shotInicio = path.join(ARTIFACTS_DIR, 'audit_01_docente_inicio_scoped.png');
  await page.screenshot({ path: shotInicio, fullPage: true });
  console.log('✓ Captura 1 guardada:', shotInicio);

  // 3. AUDITORÍA #/grupos
  console.log('\n[3/6] Verificando delimitación en #/grupos...');
  await page.goto('http://localhost:8081/index.html#/grupos', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const gruposInfo = await page.evaluate(() => {
    const rows = document.querySelectorAll('.mvp-table tbody tr');
    const hasConfigBtn = Boolean(document.querySelector('a[href="#/configuracion-academica"]'));
    const groupCodes = Array.from(rows).map(r => r.querySelector('td strong')?.textContent?.trim());
    return {
      rowCount: rows.length,
      groupCodes,
      hasConfigBtn,
      headerText: document.querySelector('.view-header h2')?.textContent?.trim()
    };
  });
  console.log('Información en #/grupos:', gruposInfo);
  console.log('¿Botón Configuración Académica visible al docente?:', gruposInfo.hasConfigBtn ? '❌ ERROR' : '✅ OCULTO ADECUADAMENTE');
  console.log('¿Solo grupos de Computación (GRP-BD-007, GRP-BD-008)?:', gruposInfo.rowCount === 2 ? '✅ CORRECTO (2 grupos)' : `❌ ERROR: ${gruposInfo.rowCount} grupos`);

  const shotGrupos = path.join(ARTIFACTS_DIR, 'audit_02_docente_grupos_scoped.png');
  await page.screenshot({ path: shotGrupos, fullPage: true });
  console.log('✓ Captura 2 guardada:', shotGrupos);

  // 4. AUDITORÍA #/estudiantes
  console.log('\n[4/6] Verificando delimitación en #/estudiantes...');
  await page.goto('http://localhost:8081/index.html#/estudiantes', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const estudiantesInfo = await page.evaluate(() => {
    const badge = document.getElementById('student-count-badge')?.textContent?.trim();
    const rows = document.querySelectorAll('.desktop-only tbody tr');
    const editBtns = document.querySelectorAll('.btn-edit-student');
    const deactivateBtns = document.querySelectorAll('.btn-deactivate-student');
    const headerTitle = document.querySelector('.view-header h2')?.textContent?.trim();
    return {
      badge,
      rowCount: rows.length,
      hasEditBtns: editBtns.length > 0,
      hasDeactivateBtns: deactivateBtns.length > 0,
      headerTitle
    };
  });
  console.log('Información en #/estudiantes:', estudiantesInfo);
  console.log('¿Título contextual?:', estudiantesInfo.headerTitle);
  console.log('¿Alumnos delimitados a 70?:', estudiantesInfo.rowCount === 70 ? '✅ EXACTO (70 alumnos)' : `Contador: ${estudiantesInfo.rowCount}`);
  console.log('¿Botones editar/desactivar ocultos al docente?:', !estudiantesInfo.hasEditBtns && !estudiantesInfo.hasDeactivateBtns ? '✅ SÍ (SOLO LECTURA PEDAGÓGICA)' : '❌ ERROR');

  const shotEstudiantes = path.join(ARTIFACTS_DIR, 'audit_03_docente_estudiantes_scoped.png');
  await page.screenshot({ path: shotEstudiantes, fullPage: true });
  console.log('✓ Captura 3 guardada:', shotEstudiantes);

  // 5. AUDITORÍA #/programas
  console.log('\n[5/6] Verificando delimitación en #/programas...');
  await page.goto('http://localhost:8081/index.html#/programas', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const programasInfo = await page.evaluate(() => {
    const progCards = document.querySelectorAll('#programs-container > .card');
    const headerTitle = document.querySelector('.view-header h2')?.textContent?.trim();
    return {
      cardCount: progCards.length,
      headerTitle,
      progName: progCards[0]?.querySelector('h3')?.textContent?.trim()
    };
  });
  console.log('Información en #/programas:', programasInfo);
  console.log('¿Solo 1 programa asignado (Computación e Informática)?:', programasInfo.cardCount === 1 ? '✅ CORRECTO' : `❌ ERROR: ${programasInfo.cardCount}`);

  const shotProgramas = path.join(ARTIFACTS_DIR, 'audit_04_docente_programas_scoped.png');
  await page.screenshot({ path: shotProgramas, fullPage: true });
  console.log('✓ Captura 4 guardada:', shotProgramas);

  // 6. AUDITORÍA #/documentos
  console.log('\n[6/6] Verificando selectores en #/documentos...');
  await page.goto('http://localhost:8081/index.html#/documentos', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const docSelectInfo = await page.evaluate(() => {
    const groupSelect = document.getElementById('doc-group-select');
    if (!groupSelect) return { found: false };
    const options = Array.from(groupSelect.options).map(o => o.text);
    return {
      found: true,
      selectedVal: groupSelect.value,
      selectedText: groupSelect.options[groupSelect.selectedIndex]?.text,
      optionsCount: options.length,
      options
    };
  });
  console.log('Selector de grupos en #/documentos:', docSelectInfo);

  const shotDocumentos = path.join(ARTIFACTS_DIR, 'audit_05_docente_documentos_scoped.png');
  await page.screenshot({ path: shotDocumentos, fullPage: true });
  console.log('✓ Captura 5 guardada:', shotDocumentos);

  // 7. PRUEBA DE CONMUTACIÓN DE AULA VÍA MODAL
  console.log('\n[7/7] Probando conmutador dinámico de aula a Peluquería (GRP-BD-001)...');
  await page.click('#btn-switch-classroom');
  await new Promise(r => setTimeout(r, 500));

  await page.select('#modal-classroom-prog-select', 'PROG-004');
  await new Promise(r => setTimeout(r, 400));
  await page.select('#modal-classroom-group-select', 'GRP-BD-001');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#modal-classroom-apply-btn');
  await new Promise(r => setTimeout(r, 1000));

  // Ir a inicio y verificar cambio
  await page.goto('http://localhost:8081/index.html#/inicio', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const newInicioStats = await page.evaluate(() => {
    const cards = document.querySelectorAll('.mvp-metric-grid .stat-card');
    return Array.from(cards).map(c => ({
      val: c.querySelector('.stat-value')?.textContent?.trim(),
      lbl: c.querySelector('.stat-label')?.textContent?.trim()
    }));
  });
  console.log('Métricas en #/inicio tras conmutar a Peluquería (GRP-BD-001):', newInicioStats);

  const shotConmutado = path.join(ARTIFACTS_DIR, 'audit_06_docente_conmutado_peluqueria.png');
  await page.screenshot({ path: shotConmutado, fullPage: true });
  console.log('✓ Captura 6 guardada:', shotConmutado);

  await browser.close();
  console.log('\n=== AUDITORÍA FINALIZADA EXITOSAMENTE ===');
})().catch(err => {
  console.error('Error fatal durante auditoría:', err);
  process.exit(1);
});
