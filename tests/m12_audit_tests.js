const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdfLib = require('pdf-lib');
const { PDFDocument } = pdfLib;

const ROOT = path.join(__dirname, '..');
const PDF_PATH = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');

const testResults = [];
function recordTest(id, description, passed) {
  testResults.push({ id, description, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}`);
}

async function runM12_Audit() {
  console.log('\n==================================================');
  console.log('EJECUTANDO PRUEBAS DE AUDITORÍA M12.0');
  console.log('==================================================\n');

  // T-M12-01: Existe archivo
  const exists = fs.existsSync(PDF_PATH);
  recordTest('T-M12-01', 'El PDF canónico TMPL-02 existe', exists);

  if (!exists) return;

  const buf = fs.readFileSync(PDF_PATH);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  recordTest('T-M12-02', 'Hash SHA-256 es 63a712ba...', hash.startsWith('63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914'));

  const doc = await PDFDocument.load(buf);
  recordTest('T-M12-03', 'El documento tiene 1 página', doc.getPageCount() === 1);

  const page = doc.getPage(0);
  const { width, height } = page.getSize();
  const isA4Landscape = Math.abs(width - 841.890) < 1 && Math.abs(height - 595.304) < 1;
  recordTest('T-M12-04', 'La página es tamaño A4 Landscape (841.89 x 595.30 pt)', isA4Landscape);

  const form = doc.getForm();
  recordTest('T-M12-05', 'No existen campos AcroForm embebidos', form.getFields().length === 0);

  recordTest('T-M12-06', 'El documento no está cifrado', !doc.isEncrypted);

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;

  console.log('\n--------------------------------------------------');
  console.log(`RESUMEN M12-AUDIT: TOTAL=${total}, PASSED=${passed}, FAILED=${failed}`);
  console.log('--------------------------------------------------\n');

  return { suite: 'M12-AUDIT', total, passed, failed };
}

if (require.main === module) {
  runM12_Audit().catch(console.error);
}

module.exports = { runM12_Audit };
