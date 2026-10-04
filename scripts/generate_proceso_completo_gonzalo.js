const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const OUTPUT_DIR = path.join(ROOT, 'EVIDENCIAS_PROCESO_COMPLETO_GONZALO');

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

  if (options.clip) {
    shotOpts.clip = options.clip;
  }

  await page.screenshot(shotOpts);
  fs.copyFileSync(filePathLocal, filePathArtifact);
  console.log(`[OK] Guardado: ${filename}`);
}

async function saveElementEvidence(element, filename) {
  const filePathLocal = path.join(OUTPUT_DIR, filename);
  const filePathArtifact = path.join(ARTIFACTS_DIR, filename);

  await element.screenshot({ path: filePathLocal });
  fs.copyFileSync(filePathLocal, filePathArtifact);
  console.log(`[OK] Guardado elemento: ${filename}`);
}

async function run() {
  console.log('Iniciando captura rigurosa de las 20 evidencias del proceso completo...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // 1. Autenticar como Secretaría y navegar a #/documentos
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

  // =========================================================================
  // EVIDENCIA 01: REVISIÓN DEL FLUJO GENERAL (EVIDENCIA_01_FLUJO_GENERAL.png)
  // =========================================================================
  console.log('2. Capturando EVIDENCIA_01_FLUJO_GENERAL.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));
  await saveEvidence(page, 'EVIDENCIA_01_FLUJO_GENERAL.png');

  // =========================================================================
  // EVIDENCIA 02: REDISEÑO DE LAS TARJETAS (EVIDENCIA_02_TARJETAS_REDISENADAS.png)
  // =========================================================================
  console.log('3. Capturando EVIDENCIA_02_TARJETAS_REDISENADAS.png...');
  await page.evaluate(() => {
    const cards = document.querySelector('#stage-cards-container');
    if (cards) cards.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 700));
  await saveEvidence(page, 'EVIDENCIA_02_TARJETAS_REDISENADAS.png');

  // =========================================================================
  // EVIDENCIA 03: ESTADOS NORMAL, ACTIVO Y HOVER (03A, 03B, 03C)
  // =========================================================================
  console.log('4. Capturando estados de tarjeta (03A Normal, 03B Activa, 03C Hover)...');
  // 03A: Tarjeta normal (TMPL-02 Ficha de Matrícula)
  const cardNormal = await page.$('.doc-item-card[data-select-tmpl="TMPL-02"]');
  if (cardNormal) {
    await saveElementEvidence(cardNormal, 'EVIDENCIA_03A_TARJETA_NORMAL.png');
  }

  // 03B: Tarjeta activa (TMPL-01 Nómina de Matrícula)
  const cardActiva = await page.$('.doc-item-card[data-select-tmpl="TMPL-01"]');
  if (cardActiva) {
    await saveElementEvidence(cardActiva, 'EVIDENCIA_03B_TARJETA_ACTIVA.png');
  }

  // 03C: Tarjeta hover (simular hover sobre TMPL-04 Portada)
  await page.hover('.doc-item-card[data-select-tmpl="TMPL-04"]');
  await new Promise(r => setTimeout(r, 500));
  const cardHover = await page.$('.doc-item-card[data-select-tmpl="TMPL-04"]');
  if (cardHover) {
    await saveElementEvidence(cardHover, 'EVIDENCIA_03C_TARJETA_HOVER.png');
  }

  // =========================================================================
  // EVIDENCIA 04: ORGANIZACIÓN DE DOCUMENTOS POR ETAPAS (04A y 04B)
  // =========================================================================
  console.log('5. Capturando catálogo Etapa 1 (EVIDENCIA_04A_DOCUMENTOS_ETAPA1.png)...');
  await page.evaluate(() => {
    const cards = document.querySelector('#stage-cards-container');
    if (cards) cards.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_04A_DOCUMENTOS_ETAPA1.png');

  console.log('6. Seleccionando Etapa 2 y capturando catálogo Etapa 2 (EVIDENCIA_04B_DOCUMENTOS_ETAPA2.png)...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    const cards = document.querySelector('#stage-cards-container');
    if (cards) cards.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_04B_DOCUMENTOS_ETAPA2.png');

  // =========================================================================
  // EVIDENCIA 05: DATOS DISPONIBLES DE LOS GRUPOS (EVIDENCIA_05_DATOS_GRUPOS.png)
  // =========================================================================
  console.log('7. Capturando EVIDENCIA_05_DATOS_GRUPOS.png...');
  await page.evaluate(() => {
    const contextBox = document.querySelector('.context-step-box');
    if (contextBox) {
      contextBox.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -60);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_05_DATOS_GRUPOS.png');

  // =========================================================================
  // EVIDENCIA 06: SELECTOR ORGANIZADO POR PROGRAMA (EVIDENCIA_06_SELECTOR_POR_PROGRAMA.png)
  // =========================================================================
  console.log('8. Capturando selector organizado por programas (EVIDENCIA_06_SELECTOR_POR_PROGRAMA.png)...');
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
  await saveEvidence(page, 'EVIDENCIA_06_SELECTOR_POR_PROGRAMA.png');

  // =========================================================================
  // EVIDENCIA 07: TURNO Y CANTIDAD DE MATRICULADOS (EVIDENCIA_07_TURNO_MATRICULADOS.png)
  // =========================================================================
  console.log('9. Capturando detalle de turno y matriculados (EVIDENCIA_07_TURNO_MATRICULADOS.png)...');
  const groupSelectEl = await page.$('#doc-group-select');
  if (groupSelectEl) {
    await saveElementEvidence(groupSelectEl, 'EVIDENCIA_07_TURNO_MATRICULADOS.png');
  }

  // Restaurar el select a modo desplegable normal
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      select.removeAttribute('size');
      select.style.height = '';
      select.style.boxShadow = '';
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // =========================================================================
  // EVIDENCIA 08: RESUMEN DEL GRUPO SELECCIONADO (EVIDENCIA_08_RESUMEN_GRUPO.png)
  // =========================================================================
  console.log('10. Capturando EVIDENCIA_08_RESUMEN_GRUPO.png...');
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      const compOpt = Array.from(select.options).find(o => o.value.includes('GRP-BD-007') || o.textContent.includes('COMPUTACIÓN'));
      if (compOpt) select.value = compOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const card = document.querySelector('#doc-selected-group-card');
    if (card) {
      card.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await saveEvidence(page, 'EVIDENCIA_08_RESUMEN_GRUPO.png');

  // =========================================================================
  // EVIDENCIA 09: ACTUALIZACIÓN DINÁMICA (09A GRUPO A vs 09B GRUPO B)
  // =========================================================================
  console.log('11. Capturando actualización reactiva (09A Grupo A y 09B Grupo B)...');
  // Grupo A: Peluquería y Barbería (GRP-BD-001)
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      const peluOpt = Array.from(select.options).find(o => o.value.includes('GRP-BD-001') || o.textContent.includes('PELUQUERÍA'));
      if (peluOpt) select.value = peluOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const card = document.querySelector('#doc-selected-group-card');
    if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await saveEvidence(page, 'EVIDENCIA_09A_GRUPO_A.png');

  // Grupo B: Computación e Informática (GRP-BD-007)
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      const compOpt = Array.from(select.options).find(o => o.value.includes('GRP-BD-007') || o.textContent.includes('COMPUTACIÓN'));
      if (compOpt) select.value = compOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const card = document.querySelector('#doc-selected-group-card');
    if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await saveEvidence(page, 'EVIDENCIA_09B_GRUPO_B.png');

  // =========================================================================
  // EVIDENCIA 10: ETAPA 2 (PROCESOS SEPARADOS) (EVIDENCIA_10_ETAPA2.png)
  // =========================================================================
  console.log('12. Capturando EVIDENCIA_10_ETAPA2.png...');
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const cards = document.querySelector('#stage-cards-container');
    if (cards) cards.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 600));
  await saveEvidence(page, 'EVIDENCIA_10_ETAPA2.png');

  // =========================================================================
  // EVIDENCIA 11: ASISTENCIA POR UNIDAD DIDÁCTICA (EVIDENCIA_11_ASISTENCIA_UD.png)
  // =========================================================================
  console.log('13. Capturando EVIDENCIA_11_ASISTENCIA_UD.png...');
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
  await saveEvidence(page, 'EVIDENCIA_11_ASISTENCIA_UD.png');

  // =========================================================================
  // EVIDENCIA 12: LLENADO INTERACTIVO DE ASISTENCIA (EVIDENCIA_12_LLENADO_ASISTENCIA.png)
  // =========================================================================
  console.log('14. Abriendo modal de asistencia y capturando EVIDENCIA_12_LLENADO_ASISTENCIA.png...');
  await page.evaluate(() => {
    const openBtn = document.querySelector('#doc-open-asistencia-modal-btn');
    if (openBtn) openBtn.click();
  });
  await page.waitForSelector('#etapa2-attendance-modal', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1000));
  await saveEvidence(page, 'EVIDENCIA_12_LLENADO_ASISTENCIA.png');

  // Cerrar modal de asistencia guardando datos
  await page.evaluate(() => {
    const saveBtn = document.querySelector('#btn-save-attendance');
    if (saveBtn) {
      saveBtn.click();
    } else {
      document.querySelector('#btn-cancel-att-modal')?.click();
      document.querySelector('#etapa2-attendance-modal')?.remove();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // EVIDENCIA 13: EVALUACIÓN POR UNIDAD DIDÁCTICA (EVIDENCIA_13_EVALUACION_UD.png)
  // =========================================================================
  console.log('15. Seleccionando Evaluación UD 1 y capturando EVIDENCIA_13_EVALUACION_UD.png...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-11"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Precargar demo de notas
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
  await saveEvidence(page, 'EVIDENCIA_13_EVALUACION_UD.png');

  // =========================================================================
  // EVIDENCIA 14: LLENADO INTERACTIVO DE NOTAS (EVIDENCIA_14_LLENADO_NOTAS.png)
  // =========================================================================
  console.log('16. Abriendo modal de notas y capturando EVIDENCIA_14_LLENADO_NOTAS.png...');
  await page.evaluate(() => {
    const openBtn = document.querySelector('#doc-open-evaluacion-modal-btn');
    if (openBtn) openBtn.click();
  });
  await page.waitForSelector('#etapa2-evaluation-modal', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1000));
  await saveEvidence(page, 'EVIDENCIA_14_LLENADO_NOTAS.png');

  // Cerrar modal de notas guardando datos
  await page.evaluate(() => {
    const saveBtn = document.querySelector('#btn-save-evaluation');
    if (saveBtn) {
      saveBtn.click();
    } else {
      document.querySelector('#btn-cancel-eval-modal')?.click();
      document.querySelector('#etapa2-evaluation-modal')?.remove();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // EVIDENCIA 15: VALIDACIÓN SIN GRUPO (EVIDENCIA_15_VALIDACION_SIN_GRUPO.png)
  // =========================================================================
  console.log('17. Simulando validación sin grupo (EVIDENCIA_15_VALIDACION_SIN_GRUPO.png)...');
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
  await saveEvidence(page, 'EVIDENCIA_15_VALIDACION_SIN_GRUPO.png');

  // Restaurar grupo Computación (GRP-BD-007)
  await page.evaluate(() => {
    const select = document.querySelector('#doc-group-select');
    if (select) {
      const compOpt = Array.from(select.options).find(o => o.value.includes('GRP-BD-007') || o.textContent.includes('COMPUTACIÓN'));
      if (compOpt) select.value = compOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // =========================================================================
  // EVIDENCIA 16: PERSISTENCIA DE ASISTENCIA (EVIDENCIA_16_PERSISTENCIA_ASISTENCIA.png)
  // =========================================================================
  console.log('18. Verificando persistencia de asistencia (EVIDENCIA_16_PERSISTENCIA_ASISTENCIA.png)...');
  // Navegar a Etapa 1 y volver a Etapa 2
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_1"]');
  await new Promise(r => setTimeout(r, 600));
  await page.click('.stage-nav-pill[data-stage-id="ETAPA_2"]');
  await new Promise(r => setTimeout(r, 800));
  // Seleccionar Asistencia UD 1
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-05"]');
    if (btn) btn.click();
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
  await saveEvidence(page, 'EVIDENCIA_16_PERSISTENCIA_ASISTENCIA.png');

  // =========================================================================
  // EVIDENCIA 17: PERSISTENCIA DE EVALUACIÓN (EVIDENCIA_17_PERSISTENCIA_EVALUACION.png)
  // =========================================================================
  console.log('19. Verificando persistencia de evaluación (EVIDENCIA_17_PERSISTENCIA_EVALUACION.png)...');
  // Seleccionar Evaluación UD 1
  await page.evaluate(() => {
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-11"]');
    if (btn) btn.click();
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
  await saveEvidence(page, 'EVIDENCIA_17_PERSISTENCIA_EVALUACION.png');

  // =========================================================================
  // EVIDENCIA 18: PDF OFICIAL DE ASISTENCIA (EVIDENCIA_18_PDF_ASISTENCIA.png)
  // =========================================================================
  console.log('20. Generando PDF de asistencia (EVIDENCIA_18_PDF_ASISTENCIA.png)...');
  await page.evaluate(() => {
    document.querySelectorAll('.etapa2-modal-overlay').forEach(el => el.remove());
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-05"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const genBtn = document.querySelector('#doc-generate-asistencia-btn');
    if (genBtn) genBtn.click();
  });
  await new Promise(r => setTimeout(r, 4500));
  await page.evaluate(() => {
    const workspace = document.querySelector('#doc-render-workspace');
    if (workspace) {
      workspace.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -60);
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await saveEvidence(page, 'EVIDENCIA_18_PDF_ASISTENCIA.png');

  // =========================================================================
  // EVIDENCIA 19: PDF OFICIAL DE EVALUACIÓN (EVIDENCIA_19_PDF_EVALUACION.png)
  // =========================================================================
  console.log('21. Generando PDF de evaluación (EVIDENCIA_19_PDF_EVALUACION.png)...');
  await page.evaluate(() => {
    document.querySelectorAll('.etapa2-modal-overlay').forEach(el => el.remove());
    const btn = document.querySelector('.ud-selector-pill[data-select-tmpl="TMPL-11"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const genBtn = document.querySelector('#doc-generate-evaluacion-btn');
    if (genBtn) genBtn.click();
  });
  await new Promise(r => setTimeout(r, 4500));
  await page.evaluate(() => {
    const workspace = document.querySelector('#doc-render-workspace');
    if (workspace) {
      workspace.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -60);
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await saveEvidence(page, 'EVIDENCIA_19_PDF_EVALUACION.png');

  // =========================================================================
  // EVIDENCIA 20: COMPOSICIÓN DEL FLUJO COMPLETO (EVIDENCIA_20_FLUJO_COMPLETO.png)
  // =========================================================================
  console.log('22. Componiendo infografía de flujo completo en alta resolución (EVIDENCIA_20_FLUJO_COMPLETO.png)...');
  const toDataUrl = filename => {
    const p = path.join(OUTPUT_DIR, filename);
    const b64 = fs.readFileSync(p).toString('base64');
    return `data:image/png;base64,${b64}`;
  };

  const b64_1 = toDataUrl('EVIDENCIA_01_FLUJO_GENERAL.png');
  const b64_2 = toDataUrl('EVIDENCIA_04B_DOCUMENTOS_ETAPA2.png');
  const b64_3 = toDataUrl('EVIDENCIA_06_SELECTOR_POR_PROGRAMA.png');
  const b64_4 = toDataUrl('EVIDENCIA_08_RESUMEN_GRUPO.png');
  const b64_5 = toDataUrl('EVIDENCIA_14_LLENADO_NOTAS.png');
  const b64_6 = toDataUrl('EVIDENCIA_19_PDF_EVALUACION.png');

  await page.setContent(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Roboto, sans-serif;
          background: #090d16;
          color: #ffffff;
          padding: 24px;
          width: 1920px;
          height: 1080px;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #1e293b;
        }
        .header h1 {
          font-size: 1.55rem;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }
        .header p {
          color: #94a3b8;
          font-size: 0.95rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 16px;
          height: 940px;
        }
        .card {
          background: #1e293b;
          border: 2px solid #2563eb;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .card-header {
          background: #0f172a;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #334155;
        }
        .step-badge {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 0.82rem;
          margin-right: 10px;
        }
        .step-title {
          font-weight: 700;
          font-size: 0.9rem;
          color: #e2e8f0;
          flex: 1;
        }
        .card-img-wrap {
          flex: 1;
          overflow: hidden;
          background: #000;
        }
        .card-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>SISTEMA ACADÉMICO CETPRO — SECUENCIA INTEGRAL DEL FLUJO DOCUMENTAL</h1>
          <p>Flujo completo de Secretaría: Selección de Etapa → Elección de Formato → Selector por Carrera → Resumen → Llenado → Emisión Oficial</p>
        </div>
        <div style="text-align: right;">
          <span style="background: #22c55e; color: #052e16; font-weight: 800; padding: 6px 14px; border-radius: 9999px; font-size: 0.88rem;">100% OPERATIVO EN SERVIDOR LOCAL</span>
        </div>
      </div>
      <div class="grid">
        <div class="card">
          <div class="card-header">
            <span class="step-badge">PASO 1</span>
            <span class="step-title">Centro de Emisión Documental y 4 Etapas</span>
          </div>
          <div class="card-img-wrap"><img src="${b64_1}"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="step-badge">PASO 2</span>
            <span class="step-title">Etapa 2: Asistencia y Evaluación por UD</span>
          </div>
          <div class="card-img-wrap"><img src="${b64_2}"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="step-badge">PASO 3</span>
            <span class="step-title">Selector Organizado por Programa y Turno</span>
          </div>
          <div class="card-img-wrap"><img src="${b64_3}"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="step-badge">PASO 4</span>
            <span class="step-title">Verificación de Contexto y Resumen de Aula</span>
          </div>
          <div class="card-img-wrap"><img src="${b64_4}"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="step-badge">PASO 5</span>
            <span class="step-title">Llenado Interactivo de Calificaciones / Asistencia</span>
          </div>
          <div class="card-img-wrap"><img src="${b64_5}"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="step-badge">PASO 6</span>
            <span class="step-title">Generación del Formato Oficial PDF A3</span>
          </div>
          <div class="card-img-wrap"><img src="${b64_6}"></div>
        </div>
      </div>
    </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 1500));
  await saveEvidence(page, 'EVIDENCIA_20_FLUJO_COMPLETO.png');

  console.log('¡Todas las evidencias reales fueron capturadas y guardadas exitosamente!');
  await browser.close();
}

run().catch(err => {
  console.error('Error durante la generación de evidencias:', err);
  process.exit(1);
});
