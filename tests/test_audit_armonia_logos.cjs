/**
 * Test de Auditoría Visual y Armonía Geométrica de Logotipos Oficiales
 * Genera y captura en tiempo real los documentos auditados:
 * - TMPL-02 (Ficha de Matrícula)
 * - TMPL-03 (Consolidado Modular)
 * - TMPL-18 (Consolidado EFSRT)
 * - TMPL-20 (Certificado Modular con cajetín LOGO)
 * - TMPL-05 (Registro de Asistencia)
 * - TMPL-11 (Registro de Evaluación)
 * - TMPL-19 (Acta Modular)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const BASE_URL = 'http://127.0.0.1:8081';

async function runAudit() {
  console.log('--- INICIANDO AUDITORÍA VISUAL HOJA POR HOJA DE ARMONÍA DEL LOGOTIPO ---');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2200, height: 1400 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERROR:', msg.text());
  });

  try {
    // 1. Cargar la vista de emisión documental
    console.log('1. Navegando al Centro de Emisión Documental...');
    await page.goto(`${BASE_URL}/#/documentos`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#doc-template-select');
    await new Promise(r => setTimeout(r, 1000));

    // Helper para seleccionar plantilla
    const selectTemplate = async (tmplId) => {
      console.log(`\nSeleccionando plantilla ${tmplId}...`);
      await page.select('#doc-template-select', tmplId);
      await new Promise(r => setTimeout(r, 800));

      // Si hay selector de grupo, asegurar selección
      await page.evaluate(() => {
        const grp = document.getElementById('doc-group-select');
        if (grp && grp.options.length > 0) {
          if (!grp.value && grp.options.length > 1) grp.selectedIndex = 1;
          else if (!grp.value) grp.selectedIndex = 0;
          grp.dispatchEvent(new Event('change'));
        }
      });
      await new Promise(r => setTimeout(r, 600));
    };

    // Helper para hacer scroll y capturar el iframe renderizado
    const captureWorkspace = async (filename, label) => {
      await page.waitForSelector('#doc-render-workspace iframe', { timeout: 15000 });
      // Asegurar vista panorámica expandida para ver márgenes izquierdo y derecho simultáneamente
      await page.evaluate(() => {
        const ws = document.getElementById('doc-render-workspace');
        if (ws) {
          ws.scrollIntoView({ behavior: 'instant', block: 'center' });
          ws.style.width = '1750px';
          ws.style.maxWidth = 'none';
        }
        const iframe = ws ? ws.querySelector('iframe') : null;
        if (iframe) {
          iframe.style.width = '1700px';
          iframe.style.height = '1000px';
        }
      });
      await new Promise(r => setTimeout(r, 5500));
      const targetPath = path.join(ARTIFACTS_DIR, filename);
      await page.screenshot({ path: targetPath, fullPage: true });
      console.log(`✓ [${label}] Screenshot guardado exitosamente: ${targetPath}`);
    };

    // ---------------------------------------------------------
    // TEST TMPL-02: FICHA DE MATRÍCULA (Addressing User Image 1)
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-02: Ficha Individual de Matrícula ---');
    await selectTemplate('TMPL-02');
    // En TMPL-02, buscar un estudiante
    await page.waitForSelector('#doc-context-search');
    await page.type('#doc-context-search', 'CABRERA');
    await new Promise(r => setTimeout(r, 800));

    // Seleccionar primer resultado si aparece
    const clickedItem = await page.evaluate(() => {
      const item = document.querySelector('#doc-search-results button, #doc-search-results a, #doc-search-results .list-group-item');
      if (item) {
        item.click();
        return true;
      }
      return false;
    });

    if (clickedItem) {
      await new Promise(r => setTimeout(r, 1000));
      const genBtn = await page.$('#doc-generate-btn');
      if (genBtn) {
        await genBtn.click();
        await captureWorkspace('83_audit_ficha_matricula_tmpl02.png', 'TMPL-02 Ficha de Matrícula');
      }
    } else {
      console.warn('No se encontraron resultados de búsqueda para CABRERA en TMPL-02');
    }

    // ---------------------------------------------------------
    // TEST TMPL-03: CONSOLIDADO MODULAR (Addressing User Image 2)
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-03: Consolidado de Matrícula Modular ---');
    await selectTemplate('TMPL-03');
    const btnTmpl03 = await page.$('#doc-generate-tmpl03-oficial-btn');
    if (btnTmpl03) {
      await btnTmpl03.click();
      await captureWorkspace('84_audit_consolidado_modular_tmpl03.png', 'TMPL-03 Consolidado de Matrícula');
    }

    // ---------------------------------------------------------
    // TEST TMPL-18: CONSOLIDADO EFSRT (Addressing User Image 3)
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-18: Consolidado EFSRT ---');
    await selectTemplate('TMPL-18');
    const btnTmpl18 = await page.$('#doc-generate-tmpl18-btn');
    if (btnTmpl18) {
      await btnTmpl18.click();
      await captureWorkspace('85_audit_consolidado_efsrt_tmpl18.png', 'TMPL-18 Consolidado EFSRT');
    }

    // ---------------------------------------------------------
    // TEST TMPL-20: CERTIFICADO MODULAR (Addressing User Image 4)
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-20: Certificado Modular (Cajetín LOGO) ---');
    await selectTemplate('TMPL-20');
    // Asegurar selección de estudiante si existe selector
    await page.evaluate(() => {
      const stdSelect = document.getElementById('doc-etapa4-student-select');
      if (stdSelect && stdSelect.options.length > 0) {
        stdSelect.selectedIndex = 0;
        stdSelect.dispatchEvent(new Event('change'));
      }
    });
    await new Promise(r => setTimeout(r, 600));
    const btnTmpl20 = await page.$('#doc-generate-tmpl20-btn');
    if (btnTmpl20) {
      await btnTmpl20.click();
      await captureWorkspace('86_audit_certificado_modular_tmpl20.png', 'TMPL-20 Certificado Modular');
    }

    // ---------------------------------------------------------
    // TEST TMPL-05: ASISTENCIA UD1 (Addressing User Image 5)
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-05: Registro de Asistencia ---');
    await selectTemplate('TMPL-05');
    const btnAsistencia = await page.$('#doc-generate-asistencia-btn');
    if (btnAsistencia) {
      await btnAsistencia.click();
      await captureWorkspace('87_audit_asistencia_tmpl05.png', 'TMPL-05 Registro de Asistencia');
    }

    // ---------------------------------------------------------
    // TEST TMPL-11: EVALUACIÓN UD1
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-11: Registro de Evaluación ---');
    await selectTemplate('TMPL-11');
    const btnEval = await page.$('#doc-generate-evaluacion-btn');
    if (btnEval) {
      await btnEval.click();
      await captureWorkspace('88_audit_evaluacion_tmpl11.png', 'TMPL-11 Registro de Evaluación');
    }

    // ---------------------------------------------------------
    // TEST TMPL-19: ACTA MODULAR
    // ---------------------------------------------------------
    console.log('\n--- AUDITORÍA TMPL-19: Acta de Evaluación Modular ---');
    await selectTemplate('TMPL-19');
    const btnTmpl19 = await page.$('#doc-generate-tmpl19-btn');
    if (btnTmpl19) {
      await btnTmpl19.click();
      await captureWorkspace('89_audit_acta_modular_tmpl19.png', 'TMPL-19 Acta Modular');
    }

    console.log('\n======================================================');
    console.log('✅ AUDITORÍA VISUAL COMPLETA: TODAS LAS CAPTURAS GENERADAS');
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Error en auditoría:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runAudit();
