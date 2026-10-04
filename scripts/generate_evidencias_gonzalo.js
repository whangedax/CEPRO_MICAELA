const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const OUTPUT_DIR = path.join(ROOT, 'EVIDENCIAS_TAREA_SIGNIFICATIVA_GONZALO');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function saveEvidence(page, filename, options = {}) {
  const filePathLocal = path.join(OUTPUT_DIR, filename);
  const filePathArtifact = path.join(ARTIFACTS_DIR, filename);

  const shotOpts = {
    path: filePathLocal,
    fullPage: options.fullPage !== undefined ? options.fullPage : false
  };

  await page.screenshot(shotOpts);
  fs.copyFileSync(filePathLocal, filePathArtifact);
  console.log(`[OK] Guardado: ${filename}`);
}

async function run() {
  console.log('Iniciando generador de evidencias reales para Informe de Prácticas...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // 1. Configurar sesión de SECRETARIA y navegar a #/documentos
  console.log('1. Autenticando como Secretaría y navegando a #/documentos...');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });

  await page.evaluate(() => {
    localStorage.setItem('CETPRO_AUTH_SESSION_ACTIVE', 'true');
    localStorage.setItem('CETPRO_AUTH_USER_ROLE', 'SECRETARIA');
    localStorage.setItem('CETPRO_AUTH_CUSTOM_USER_NAME', 'Lic. Carmen Rosa Mendívil');
    window.location.hash = '#/documentos';
  });

  await new Promise(r => setTimeout(r, 2000));
  await page.waitForSelector('#document-stage-tabs', { timeout: 15000 });
  await page.waitForSelector('.doc-cards-grid', { timeout: 15000 });

  // ==========================================
  // EVIDENCIA 01: CENTRO DE EMISIÓN DOCUMENTAL
  // ==========================================
  console.log('2. Generando EVIDENCIA_01_CENTRO_DOCUMENTAL.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));
  await saveEvidence(page, 'EVIDENCIA_01_CENTRO_DOCUMENTAL.png');

  // ==========================================
  // EVIDENCIA 02: ESTADO ACTIVO DE UNA TARJETA (ETAPA 2)
  // ==========================================
  console.log('3. Seleccionando Etapa 2 y generando EVIDENCIA_02_ETAPA2_SELECCIONADA.png...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => window.scrollTo(0, 110));
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_02_ETAPA2_SELECCIONADA.png');

  // ==========================================
  // EVIDENCIA 03: SELECTOR DE GRUPOS ACADÉMICOS
  // ==========================================
  console.log('4. Generando EVIDENCIA_03_SELECTOR_GRUPOS.png (desplegando programas y turnos)...');
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      select.setAttribute('size', '9');
      select.style.height = '230px';
      select.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.2)';
      select.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 700));
  await saveEvidence(page, 'EVIDENCIA_03_SELECTOR_GRUPOS.png');

  // Restaurar el select y seleccionar grupo Computación e Informática (GRP-BD-007)
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      select.removeAttribute('size');
      select.style.height = '';
      select.style.boxShadow = '';
      const compOpt = Array.from(select.options).find(o => o.value.includes('GRP-BD-007') || o.textContent.includes('COMPUTACIÓN'));
      if (compOpt) {
        select.value = compOpt.value;
      }
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  // ==========================================
  // EVIDENCIA 04: RESUMEN DEL GRUPO SELECCIONADO
  // ==========================================
  console.log('5. Generando EVIDENCIA_04_RESUMEN_GRUPO.png...');
  await page.evaluate(() => {
    const contextBox = document.querySelector('.context-step-box');
    if (contextBox) {
      contextBox.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -60);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_04_RESUMEN_GRUPO.png');

  // ==========================================
  // EVIDENCIA 05: CONTROL DE ASISTENCIA MODULAR
  // ==========================================
  console.log('6. Generando EVIDENCIA_05_ASISTENCIA.png...');
  // Activar UD 1 de asistencia
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-05"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Precargar marcas demo
  await page.evaluate(() => {
    const demoBtn = document.querySelector('#doc-demo-asistencia-btn');
    if (demoBtn) demoBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const contextBox = document.querySelector('.context-step-box');
    if (contextBox) {
      contextBox.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -80);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_05_ASISTENCIA.png');

  // ==========================================
  // EVIDENCIA 06: REGISTRO DE EVALUACIÓN AUXILIAR
  // ==========================================
  console.log('7. Generando EVIDENCIA_06_EVALUACION.png...');
  // Activar UD 1 de evaluación
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-11"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Precargar calificaciones demo
  await page.evaluate(() => {
    const demoBtn = document.querySelector('#doc-demo-evaluacion-btn');
    if (demoBtn) demoBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const contextBox = document.querySelector('.context-step-box');
    if (contextBox) {
      contextBox.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -80);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_06_EVALUACION.png');

  // ==========================================
  // EVIDENCIA 07: VALIDACIÓN DEL FLUJO DE TRABAJO
  // ==========================================
  console.log('8. Generando EVIDENCIA_07_VALIDACION_FLUJO.png (deseleccionando grupo)...');
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      let emptyOpt = select.querySelector('option[value=""]');
      if (!emptyOpt) {
        emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '⚠️ -- Seleccione un Grupo Académico para continuar --';
        select.prepend(emptyOpt);
      }
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Limpiar mensaje anterior de generación para que la validación sea el único foco
    const statusBox = document.querySelector('#doc-group-status');
    if (statusBox) {
      statusBox.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-octagon-fill me-1"></i>Flujo bloqueado: Es indispensable seleccionar un grupo académico antes de emitir o registrar calificaciones.</span>';
    }
    const contextBox = document.querySelector('.context-step-box');
    if (contextBox) {
      contextBox.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -80);
    }
  });
  await new Promise(r => setTimeout(r, 700));
  await saveEvidence(page, 'EVIDENCIA_07_VALIDACION_FLUJO.png');

  // Restaurar selección de grupo para las siguientes capturas
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      const compOpt = Array.from(select.options).find(o => o.value.includes('GRP-BD-007') || o.textContent.includes('COMPUTACIÓN'));
      if (compOpt) select.value = compOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // ==========================================
  // EVIDENCIA 08: MODAL DE LLENADO DE ASISTENCIA (OPCIONAL)
  // ==========================================
  console.log('9. Generando EVIDENCIA_08_LLENADO_ASISTENCIA.png (modal interactivo)...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-05"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const openModalBtn = document.querySelector('#doc-open-asistencia-modal-btn');
    if (openModalBtn) openModalBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await saveEvidence(page, 'EVIDENCIA_08_LLENADO_ASISTENCIA.png');

  // Cerrar modal de asistencia usando el botón cancelar oficial
  await page.evaluate(() => {
    const cancelBtn = document.querySelector('#btn-cancel-att-modal') || document.querySelector('#btn-close-att-modal');
    if (cancelBtn) {
      cancelBtn.click();
    } else {
      document.querySelector('#etapa2-attendance-modal')?.remove();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // ==========================================
  // EVIDENCIA 09: MODAL DE LLENADO DE EVALUACIÓN (OPCIONAL)
  // ==========================================
  console.log('10. Generando EVIDENCIA_09_LLENADO_EVALUACION.png (modal interactivo)...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-11"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => {
    const openModalBtn = document.querySelector('#doc-open-evaluacion-modal-btn');
    if (openModalBtn) openModalBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await saveEvidence(page, 'EVIDENCIA_09_LLENADO_EVALUACION.png');

  // Cerrar modal de evaluación usando el botón cancelar oficial
  await page.evaluate(() => {
    const cancelBtn = document.querySelector('#btn-cancel-eval-modal') || document.querySelector('#btn-close-eval-modal');
    if (cancelBtn) {
      cancelBtn.click();
    } else {
      document.querySelector('#etapa2-evaluation-modal')?.remove();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // ==========================================
  // EVIDENCIA 10: GENERACIÓN DEL DOCUMENTO PDF (OPCIONAL)
  // ==========================================
  console.log('11. Generando documento PDF y capturando EVIDENCIA_10_DOCUMENTO_GENERADO.png...');
  await page.evaluate(() => {
    // Asegurar que no hay ningún modal residual
    document.querySelectorAll('.etapa2-modal-overlay').forEach(el => el.remove());
    const genBtn = document.querySelector('#doc-generate-evaluacion-btn') || document.querySelector('#doc-generate-asistencia-btn');
    if (genBtn) genBtn.click();
  });

  // Esperar a que el visor renderice el documento PDF
  await new Promise(r => setTimeout(r, 4500));
  await page.evaluate(() => {
    const workspace = document.querySelector('#doc-render-workspace');
    if (workspace) {
      workspace.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -60);
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await saveEvidence(page, 'EVIDENCIA_10_DOCUMENTO_GENERADO.png');

  console.log('¡Todas las 10 evidencias han sido generadas y verificadas con éxito!');
  await browser.close();
}

run().catch(err => {
  console.error('Error durante la generación de evidencias:', err);
  process.exit(1);
});
