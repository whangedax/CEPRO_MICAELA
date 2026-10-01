/**
 * Prueba End-to-End: Verificación de Integración del Logotipo Oficial del CETPRO
 * Valida la incrustación del logo en TMPL-04 (Carátula), TMPL-05 (Asistencia),
 * TMPL-11 (Evaluación) y TMPL-19 (Acta Modular), así como en la interfaz de usuario.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';
const BASE_URL = 'http://127.0.0.1:8081';

async function runTest() {
  console.log('--- Iniciando prueba de Logotipo Oficial del CETPRO en Plantillas PDF y UI ---');

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

    // 3. Generar y verificar TMPL-04 (Carátula) con logo incrustado
    console.log('\n3. Verificando generación de TMPL-04 (Carátula) con logo...');
    const tmpl04Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();
      
      const payload = {
        institution: {
          nombreInstitucion: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
          dre: 'PUNO',
          ugel: 'SAN ROMÁN',
          tipoGestion: 'PÚBLICA'
        },
        program: {
          nombre: 'COMPUTACIÓN E INFORMÁTICA'
        },
        module: {
          nombre: 'Ofimática',
          horas: 300,
          creditos: 12
        },
        group: {
          ciclo: 'TÉCNICO',
          turno: 'MAÑANA',
          seccion: 'ÚNICA',
          docente: 'DOCENTE RESPONSABLE'
        },
        period: {
          year: '2026',
          fechaInicio: '2026-03-15',
          fechaTermino: '2026-07-20'
        }
      };

      const blob = await engine.renderTMPL04(payload);
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      
      // Comprobar que en el PDF generado existe el descriptor de imagen /Image
      const decoder = new TextDecoder('latin1');
      const pdfText = decoder.decode(uint8);
      const hasImageXObject = pdfText.includes('/Subtype /Image') || pdfText.includes('/Subtype/Image');
      const hasDctDecode = pdfText.includes('/DCTDecode'); // Compresión nativa JPG

      return {
        size: uint8.length,
        hasImageXObject,
        hasDctDecode
      };
    });

    console.log('Resultado TMPL-04:', tmpl04Result);
    if (!tmpl04Result.hasImageXObject || !tmpl04Result.hasDctDecode) {
      throw new Error('TMPL-04 no contiene el logo incrustado (/Image /DCTDecode)');
    }
    console.log('✓ PASS: TMPL-04 (Carátula) contiene el logo oficial incrustado (/Image /DCTDecode)');

    // 4. Generar y verificar TMPL-05 (Asistencia) con logo incrustado
    console.log('\n4. Verificando generación de TMPL-05 (Asistencia) con logo...');
    const tmpl05Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();

      const blob = await engine.renderAttendanceTMPL05({
        studentsList: [{ id: 'EST-1', apellidosNombres: 'ALUMNO DE PRUEBA', sexo: 'M' }],
        sessions: [{ sessionId: 'S1', fecha: '2026-04-01' }]
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
      throw new Error('TMPL-05 no contiene el logo incrustado');
    }
    console.log('✓ PASS: TMPL-05 (Asistencia) contiene el logo oficial incrustado (/Image /DCTDecode)');

    // 5. Generar y verificar TMPL-11 (Evaluación) con logo incrustado
    console.log('\n5. Verificando generación de TMPL-11 (Evaluación) con logo...');
    const tmpl11Result = await page.evaluate(async () => {
      const engineMod = await import('/app/js/services/pdf-template-engine.js');
      const engine = new engineMod.PdfTemplateEngine();

      const blob = await engine.renderEvaluationTMPL11({
        unit: { orden: 1 },
        studentsList: [{ id: 'EST-1', apellidosNombres: 'ALUMNO EVALUADO', sexo: 'M' }]
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
      throw new Error('TMPL-11 no contiene el logo incrustado');
    }
    console.log('✓ PASS: TMPL-11 (Evaluación) contiene el logo oficial incrustado (/Image /DCTDecode)');

    // 6. Generar y verificar TMPL-19 (Acta Modular de 2 Páginas) con logo en ambas páginas
    console.log('\n6. Verificando generación de TMPL-19 (Acta Modular) con logo...');
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

      // Comprobar apariciones del objeto de imagen
      const matches = pdfText.match(/\/Subtype\s*\/Image/g) || [];

      return {
        size: uint8.length,
        imageCount: matches.length,
        hasDctDecode: pdfText.includes('/DCTDecode')
      };
    });

    console.log('Resultado TMPL-19:', tmpl19Result);
    if (tmpl19Result.imageCount < 2 || !tmpl19Result.hasDctDecode) {
      throw new Error(`TMPL-19 debe contener el logo en ambas páginas (encontradas: ${tmpl19Result.imageCount})`);
    }
    console.log('✓ PASS: TMPL-19 (Acta Modular) contiene el logo oficial en ambas páginas físicas');

    // 7. Renderizar en pantalla la vista previa de TMPL-04 y guardar captura
    console.log('\n7. Seleccionando TMPL-04 en el visor web y generando vista previa...');
    await page.waitForSelector('#doc-template-select');
    await page.select('#doc-template-select', 'TMPL-04');
    await new Promise(r => setTimeout(r, 600));

    const btnGen = await page.$('#doc-generate-btn');
    if (btnGen) {
      await btnGen.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const path81 = path.join(ARTIFACTS_DIR, '81_vista_previa_documento_portada.png');
    await page.screenshot({ path: path81 });
    console.log(`✓ Screenshot guardado: ${path81}`);

    console.log('\n======================================================');
    console.log('✅ TODAS LAS PRUEBAS DE INTEGRACIÓN DEL LOGO PASARON CON ÉXITO');
    console.log('======================================================');

  } catch (err) {
    console.error('❌ ERROR EN PRUEBA:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTest();
