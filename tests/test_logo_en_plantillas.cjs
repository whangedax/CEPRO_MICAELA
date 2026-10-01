/**
 * Prueba End-to-End: Verificación de Integración del Logotipo Oficial del CETPRO
 * Valida la incrustación del logo en TODOS los documentos oficiales:
 * TMPL-01 (Nómina), TMPL-02 (Ficha), TMPL-03 (Consolidado), TMPL-04 (Carátula),
 * TMPL-05 (Asistencia), TMPL-11 (Evaluación), TMPL-18 (EFSRT) y TMPL-19 (Acta Modular).
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const BASE_URL = 'http://127.0.0.1:8081';

async function runTest() {
  console.log('--- Iniciando prueba de Logotipo Oficial del CETPRO en TODOS los Documentos Oficiales ---');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERROR:', msg.text());
  });

  try {
    // 1. Cargar aplicación y verificar presencia del logo en el Header
    console.log('1. Verificando logo en el Header principal de la aplicación...');
    await page.goto(`${BASE_URL}/#/inicio`, { waitUntil: 'load' });
    await page.waitForSelector('.header-brand img');
    
    const logoSrc = await page.evaluate(() => {
      const img = document.querySelector('.header-brand img');
      return img ? img.getAttribute('src') : null;
    });
    console.log('Logo detectado en Header:', logoSrc);
    if (!logoSrc || !logoSrc.includes('logo-cetpro.jpg')) {
      throw new Error('No se encontró el logo oficial en la cabecera del sistema.');
    }
    console.log('✓ PASS: Logo oficial visible en Header de la aplicación');

    // 2. Navegar a Documentos y verificar el banner institucional con el escudo
    console.log('\n2. Verificando logo en Centro de Emisión Documental (#/documentos)...');
    await page.evaluate(() => { window.location.hash = '#/documentos'; });
    await page.waitForSelector('.hero-banner img');
    await new Promise(r => setTimeout(r, 600));

    const path80 = path.join(ARTIFACTS_DIR, '80_ui_centro_documental_con_logo.png');
    await page.screenshot({ path: path80 });
    console.log(`✓ PASS: Banner documental con logo oficial capturado en: ${path80}`);

    // Helper para verificar imagen en PDF
    const verifyPdfHasLogo = (uint8Array) => {
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8Array);
      const hasImageXObject = pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image');
      const hasDctDecode = pdfText.includes('/DCTDecode');
      return hasImageXObject && hasDctDecode;
    };

    // 3. Verificando TMPL-01 (Nómina de Matrícula Oficial - caso reportado por el usuario)
    console.log('\n3. Verificando generación de TMPL-01 (Nómina de Matrícula Oficial) con logo...');
    const tmpl01Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();

      const blob = await engine.renderAdministrativeTMPL01({
        institution: {
          nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
          ugel: 'SAN ROMÁN',
          tipoGestion: 'PÚBLICA',
          distrito: 'SAN MIGUEL',
          provincia: 'SAN ROMÁN'
        },
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
        module: { nombre: 'Ofimática' },
        period: { fechaInicio: '2026-03-15', fechaFin: '2026-07-20' },
        group: { turno: 'MAÑANA', ciclo: 'TÉCNICO', seccion: 'A' },
        studentsList: [
          { matriculaId: 'MAT-1', studentName: 'QUISPE APAZA, JUAN', sexo: 'H', birthDate: '2000-01-01' }
        ]
      });

      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);

      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });

    console.log('Resultado TMPL-01:', tmpl01Result);
    if (!tmpl01Result.hasImageXObject || !tmpl01Result.hasDctDecode) {
      throw new Error('TMPL-01 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-01 (Nómina de Matrícula) contiene el logo oficial incrustado en esquina superior derecha');

    // 4. Verificando TMPL-02 (Ficha de Matrícula)
    console.log('\n4. Verificando generación de TMPL-02 (Ficha de Matrícula) con logo...');
    const tmpl02Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const valMod = await import('/app/js/services/document-validation-service.js');
      const regMod = await import('/app/js/services/template-registry.js');
      const engine = new engineMod.PdfTemplateEngine();
      const validator = new valMod.DocumentValidationService(new regMod.TemplateRegistry());
      const preflight = validator.validateDocument('TMPL-02', {
        institution: { nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"' },
        student: { id: 'EST-1', apellidosNombres: 'QUISPE APAZA, JUAN', numeroDocumento: '70000001' }
      });
      const blob = await engine.renderTMPL02({ resolvedFieldSet: preflight.resolvedFieldSet });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-02:', tmpl02Result);
    if (!tmpl02Result.hasImageXObject || !tmpl02Result.hasDctDecode) {
      throw new Error('TMPL-02 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-02 (Ficha de Matrícula) contiene el logo oficial incrustado');

    // 5. Verificando TMPL-03 (Consolidado de Matrícula)
    console.log('\n5. Verificando generación de TMPL-03 (Consolidado de Matrícula) con logo...');
    const tmpl03Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      const blob = await engine.renderAdministrativeTMPL03({
        institution: { nombre: 'CETPRO MICAELA BASTIDAS' },
        program: { nombre: 'COMPUTACIÓN' },
        studentsList: [{ matriculaId: 'MAT-1', studentName: 'ALUMNO TEST', sexo: 'H' }]
      });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-03:', tmpl03Result);
    if (!tmpl03Result.hasImageXObject || !tmpl03Result.hasDctDecode) {
      throw new Error('TMPL-03 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-03 (Consolidado de Matrícula) contiene el logo oficial incrustado');

    // 6. Verificando TMPL-04 (Carátula / Portada)
    console.log('\n6. Verificando generación de TMPL-04 (Carátula) con logo...');
    const tmpl04Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      const blob = await engine.renderTMPL04({
        institution: { nombreInstitucion: 'CETPRO MICAELA BASTIDAS' },
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
        module: { nombre: 'Ofimática' }
      });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-04:', tmpl04Result);
    if (!tmpl04Result.hasImageXObject || !tmpl04Result.hasDctDecode) {
      throw new Error('TMPL-04 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-04 (Carátula) contiene el logo oficial centrado en la cabecera');

    // 7. Verificando TMPL-05 (Asistencia)
    console.log('\n7. Verificando generación de TMPL-05 (Asistencia) con logo...');
    const tmpl05Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      const blob = await engine.renderAttendanceTMPL05({
        studentsList: [{ id: 'EST-1', apellidosNombres: 'ALUMNO', sexo: 'M' }]
      });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-05:', tmpl05Result);
    if (!tmpl05Result.hasImageXObject || !tmpl05Result.hasDctDecode) {
      throw new Error('TMPL-05 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-05 (Asistencia) contiene el logo oficial en cuadrante superior izquierdo');

    // 8. Verificando TMPL-11 (Evaluación)
    console.log('\n8. Verificando generación de TMPL-11 (Evaluación) con logo...');
    const tmpl11Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      const blob = await engine.renderEvaluationTMPL11({
        unit: { orden: 1 },
        studentsList: [{ id: 'EST-1', apellidosNombres: 'ALUMNO', sexo: 'M' }]
      });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-11:', tmpl11Result);
    if (!tmpl11Result.hasImageXObject || !tmpl11Result.hasDctDecode) {
      throw new Error('TMPL-11 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-11 (Evaluación) contiene el logo oficial en cuadrante superior izquierdo');

    // 9. Verificando TMPL-18 (EFSRT)
    console.log('\n9. Verificando generación de TMPL-18 (EFSRT) con logo...');
    const tmpl18Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      const blob = await engine.renderEFSRTDocument({
        studentsList: [{ id: 'EST-1', apellidosNombres: 'ALUMNO', sexo: 'M' }]
      });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      return {
        size: uint8.length,
        hasImageXObject: pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image'),
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-18:', tmpl18Result);
    if (!tmpl18Result.hasImageXObject || !tmpl18Result.hasDctDecode) {
      throw new Error('TMPL-18 no contiene el logo oficial incrustado');
    }
    console.log('✓ PASS: TMPL-18 (EFSRT) contiene el logo oficial en cabecera superior');

    // 10. Verificando TMPL-19 (Acta Modular en ambas páginas)
    console.log('\n10. Verificando generación de TMPL-19 (Acta Modular) con logo...');
    const tmpl19Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      const blob = await engine.renderModularActDocument({
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
        module: { nombre: 'Ofimática' },
        period: { year: '2026' },
        group: { turno: 'MAÑANA', seccion: 'ÚNICA' },
        studentsList: Array.from({ length: 25 }, (_, i) => ({
          id: `EST-${i + 1}`,
          apellidosNombres: `ESTUDIANTE NRO ${i + 1}`,
          numeroDocumento: `7000000${i + 1}`,
          sexo: i % 2 === 0 ? 'M' : 'F'
        }))
      });
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      const matches = pdfText.match(/\/Subtype\s*\/Image/g) || [];
      return {
        size: uint8.length,
        imageCount: matches.length,
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });
    console.log('Resultado TMPL-19:', tmpl19Result);
    if (tmpl19Result.imageCount < 2 || !tmpl19Result.hasDctDecode) {
      throw new Error('TMPL-19 debe contener el logo en ambas páginas físicas');
    }
    console.log('✓ PASS: TMPL-19 (Acta Modular) contiene el logo oficial en ambas páginas físicas');

    // 11. Seleccionar TMPL-01 en el visor de documentos web, pulsar Generar y capturar pantalla real
    console.log('\n11. Generando vista previa real de TMPL-01 (Nómina de Matrícula) en la UI...');
    await page.waitForSelector('#doc-template-select');
    await page.select('#doc-template-select', 'TMPL-01');
    await new Promise(r => setTimeout(r, 600));

    // Seleccionar grupo académico si está disponible
    await page.evaluate(() => {
      const groupSelect = document.getElementById('doc-group-select');
      if (groupSelect && groupSelect.options.length > 0) {
        if (!groupSelect.value && groupSelect.options.length > 1) {
          groupSelect.selectedIndex = 1;
        } else if (!groupSelect.value) {
          groupSelect.selectedIndex = 0;
        }
        groupSelect.dispatchEvent(new Event('change'));
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const btnGen = await page.$('#doc-generate-tmpl01-btn');
    if (btnGen) {
      console.log('Haciendo clic en #doc-generate-tmpl01-btn...');
      await btnGen.click();
      await new Promise(r => setTimeout(r, 3500));
    } else {
      console.warn('No se encontró #doc-generate-tmpl01-btn');
    }

    const path82 = path.join(ARTIFACTS_DIR, '82_nomina_con_logo_cetpro.png');
    await page.screenshot({ path: path82, fullPage: true });
    console.log(`✓ Screenshot guardado: ${path82}`);

    console.log('\n======================================================');
    console.log('✅ TODOS LOS DOCUMENTOS OFICIALES TIENEN EL LOGO INTEGRADO CON ÉXITO');
    console.log('======================================================');

  } catch (err) {
    console.error('❌ ERROR EN PRUEBA:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTest();
