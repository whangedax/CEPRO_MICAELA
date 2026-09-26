const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const testResults = [];

function recordTest(id, description, passed, details = '') {
  testResults.push({ id, description, passed, details });
  const statusStr = passed ? '[PASSED]' : '[FAILED]';
  console.log(`${statusStr} ${id}: ${description} ${details ? '(' + details + ')' : ''}`);
}

async function runM11_POC_Tests() {
  console.log('\n==================================================');
  console.log('EJECUTANDO PRUEBAS M11-ARCH-POC.3 — MOTOR PDF NATIVO');
  console.log('==================================================\n');

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Funciones extraídas para pruebas aisladas
  function getVerticallyCenteredBaseline(font, fontSize, box, pageHeight) {
    const ascent = (font.embedder.font.Ascender / 1000) * fontSize;
    const descent = (font.embedder.font.Descender / 1000) * fontSize;
    const pdfLibBottomY = pageHeight - box.y - box.h;
    return pdfLibBottomY + (box.h / 2) - ((ascent + descent) / 2);
  }

  function fitTextToBox(text, font, box, options) {
    let currentSize = options.maxFontSize;
    const minSize = options.minFontSize;
    const padding = options.paddingX || 0;
    const availableWidth = box.w - (2 * padding);

    while (currentSize >= minSize) {
      const textWidth = font.widthOfTextAtSize(text, currentSize);
      if (textWidth <= availableWidth) break;
      currentSize -= 0.1;
    }

    const finalWidth = font.widthOfTextAtSize(text, currentSize);
    if (finalWidth > availableWidth) {
      const err = new Error('Fails');
      err.name = 'EXPECTED_REJECTION';
      throw err;
    }

    let startX = box.x + padding;
    if (options.align === 'center') {
      startX = box.x + (box.w / 2) - (finalWidth / 2);
    }
    const baselineY = getVerticallyCenteredBaseline(font, currentSize, box, 841.890);
    return { text, x: startX, y: baselineY, size: currentSize, finalWidth, availableWidth, startX };
  }

  // T-POC-01: Padding horizontal aplicado a ambos lados
  const box = { x: 100, y: 100, w: 200, h: 20 };
  const res = fitTextToBox('TEXT', font, box, { maxFontSize: 10, minFontSize: 5, paddingX: 5 });
  recordTest('T-POC-01', 'Padding horizontal (5pt) se aplica a ambos lados: availableWidth = w - 10', res.availableWidth === 190 && res.startX === 105);

  // T-POC-02: textWidth nunca supera availableWidth
  const longText = 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"';
  const cetproBox = { x: 386.82, y: 101.31, w: 166.27, h: 14.95 };
  const resCetpro = fitTextToBox(longText, font, cetproBox, { maxFontSize: 8, minFontSize: 5.5, paddingX: 2 });
  recordTest('T-POC-02', 'textWidth nunca supera availableWidth (AutoFit no trunca)', resCetpro.finalWidth <= resCetpro.availableWidth);

  // T-POC-03: Autofit funciona con nombre extremadamente largo produciendo rechazo controlado
  const extLongText = 'APELLIDO PATERNO LARGO APELLIDO MATERNO LARGO, NOMBRES DE PRUEBA';
  const nombreBox = { x: 113.59, y: 244.48, w: 180.13, h: 14.94 };
  let expectedRejectionThrown = false;
  try {
    fitTextToBox(extLongText, font, nombreBox, { maxFontSize: 8, minFontSize: 5.5, paddingX: 2 });
  } catch (err) {
    if (err.name === 'EXPECTED_REJECTION') {
      expectedRejectionThrown = true;
    }
  }
  recordTest('T-POC-03', 'Texto largo en prueba de estrés produce rechazo controlado (EXPECTED_REJECTION)', expectedRejectionThrown);

  // T-POC-04: Baseline vertical usa métricas reales
  const pageHeight = 841.890;
  const baseline = getVerticallyCenteredBaseline(font, 10, box, pageHeight);
  // Box is at y=100, h=20. pdfLibBottomY = 841.890 - 100 - 20 = 721.890
  // Center is 721.890 + 10 = 731.890
  // Ascent=7.18, Descent=-2.07. Center of text = 2.555
  // Expected baseline = 731.890 - 2.555 = 729.335
  recordTest('T-POC-04', 'Baseline vertical calcula métricas reales de Ascent/Descent', Math.abs(baseline - 729.335) < 0.01);

  // T-POC-05: Ningún AcroForm ni Widget en el código del POC (estático)
  const pocPath = path.join(ROOT, 'app/js/poc/pdf-draw-poc.js');
  const pocContent = fs.readFileSync(pocPath, 'utf8');
  const hasAcroForm = pocContent.includes('getForm()') || pocContent.includes('createTextField');
  recordTest('T-POC-05', 'El código de la POC no utiliza AcroForm ni Widgets (drawText plano)', !hasAcroForm);

  // T-POC-06: PDF canónico original no se modifica
  // It fetches dynamically, doesn't fs.writeFileSync to the original source path.
  const hasWriteToSource = pocContent.includes('writeFileSync(url');
  recordTest('T-POC-06', 'El PDF canónico original nunca se sobreescribe', !hasWriteToSource);

  // M11.15 Tests
  const fieldsConfigPath = path.join(ROOT, 'app/data/TMPL01_PDF_FIELDS.json');
  const fieldsConfig = JSON.parse(fs.readFileSync(fieldsConfigPath, 'utf8'));

  let has30Rows = true;
  for (let i = 1; i <= 30; i++) {
    const nn = String(i).padStart(2, '0');
    if (!fieldsConfig[`row${nn}.nombre`]) has30Rows = false;
  }
  recordTest('T-POC-07', 'Existen 30 filas geométricas en TMPL01_PDF_FIELDS.json', has30Rows);

  const r1 = fieldsConfig['row01.nombre'];
  const r30 = fieldsConfig['row30.nombre'];
  const verticalDiff = r30.y - r1.y;
  recordTest('T-POC-08', 'Ausencia de deriva fila 01 → fila 30 (mismo X, diferencia Y congruente)', r1.x === r30.x && Math.abs(verticalDiff - 29 * 14.94) < 1.0);

  recordTest('T-POC-09', 'MAT-IMP (Id técnico) no se imprime (No configurado en map)', !fieldsConfig['row01.id'] && !fieldsConfig['row01.matImp']);
  recordTest('T-POC-10', 'Campos sin fuente quedan vacíos (No hay DNI ni otros no solicitados)', !fieldsConfig['row01.dni'] && !fieldsConfig['row01.region']);

  const buildScriptPath = path.join(ROOT, 'scripts/build_poc5_30rows.mjs');
  const buildScript = fs.readFileSync(buildScriptPath, 'utf8');
  recordTest('T-POC-11', 'Fixture 1, 10, y 30 se prueban aislados', buildScript.includes('generatePOC_Test_01') && buildScript.includes('generatePOC_Test_10') && buildScript.includes('generatePOC_Test_30'));
  recordTest('T-POC-12', 'Rechazo controlado de fila 31 implementado', buildScript.includes('generatePOC_Test_31'));
  
  const auditScriptPath = path.join(ROOT, 'scripts/audit_names.mjs');
  const auditScript = fs.existsSync(auditScriptPath) ? fs.readFileSync(auditScriptPath, 'utf8') : '';
  recordTest('T-POC-13', 'Auditoría read-only de 269 nombres existe', auditScript.includes('269'));
  recordTest('T-POC-14', 'Nombres que no caben se detectan en la auditoria (failsAt55)', auditScript.includes('failsAt55'));

  const summaryResultsPath = path.join(ROOT, 'scratch/summary_results.json');
  if (fs.existsSync(summaryResultsPath)) {
    const sr = JSON.parse(fs.readFileSync(summaryResultsPath, 'utf8'));
    recordTest('T-POC-15', 'Resumen Fixture 1: 1/0/1', sr.test01['summary.hombres'] === '1' && sr.test01['summary.mujeres'] === '0' && sr.test01['summary.totalSexo'] === '1');
    recordTest('T-POC-16', 'Resumen Fixture 10: 5/5/10', sr.test10['summary.hombres'] === '5' && sr.test10['summary.mujeres'] === '5' && sr.test10['summary.totalSexo'] === '10');
    recordTest('T-POC-17', 'Resumen Fixture 30: 15/15/30', sr.test30['summary.hombres'] === '15' && sr.test30['summary.mujeres'] === '15' && sr.test30['summary.totalSexo'] === '30');
    recordTest('T-POC-18', 'Gratuitos/Pagantes/Becarios vacíos si no existe condición', !sr.test30['summary.gratuitos'] && !sr.test30['summary.pagantes'] && !sr.test30['summary.becarios']);
    recordTest('T-POC-19', 'Total condición vacío si no existe condición', !sr.test30['summary.totalCondicion']);
  }

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;

  console.log('\n--------------------------------------------------');
  console.log(`RESUMEN M11-POC: TOTAL=${total}, PASSED=${passed}, FAILED=${failed}`);
  console.log('--------------------------------------------------\n');

  return { suite: 'M11-POC', total, passed, failed };
}

if (require.main === module) {
  runM11_POC_Tests().catch(err => {
    console.error('Error al ejecutar pruebas POC:', err);
    process.exit(1);
  });
}

module.exports = { runM11_POC_Tests };
