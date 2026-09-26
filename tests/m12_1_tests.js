const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL: NodeURL, pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const PDF_PATH = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');
const FIELDS_PATH = path.join(ROOT, 'app/data/TMPL02_PDF_FIELDS.json');
const ENGINE_PATH = path.join(ROOT, 'app/js/services/pdf-template-engine.js');
const VIEW_PATH = path.join(ROOT, 'app/js/ui/documents-view.js');

const EXPECTED_HASH = '63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914';
const EXPECTED_KEYS = [
  'institution.name',
  'program.name',
  'student.documentNumber',
  'student.fullName'
];

const testResults = [];
function recordTest(id, description, passed, detail = '') {
  testResults.push({ id, description, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}${detail ? ` (${detail})` : ''}`);
}

async function extractText(pdfBytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes), disableWorker: true });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  return content.items.map(item => item.str).join(' ');
}

function installBrowserFixture() {
  global.URL = NodeURL;
  global.window = {
    location: { href: 'http://127.0.0.1:8080/app/index.html#/documentos' },
    PDFLib: require('pdf-lib')
  };

  global.fetch = async rawUrl => {
    const url = new URL(rawUrl);
    const localPath = path.join(ROOT, decodeURIComponent(url.pathname).replace(/^\//, ''));
    return {
      ok: fs.existsSync(localPath),
      async arrayBuffer() {
        const buffer = fs.readFileSync(localPath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      },
      async json() {
        return JSON.parse(fs.readFileSync(localPath, 'utf8'));
      }
    };
  };
}

async function runM12_1Tests() {
  testResults.length = 0;
  console.log('\n==================================================');
  console.log('EJECUTANDO PRUEBAS M12.1 — VERTICAL SLICE TMPL-02');
  console.log('==================================================\n');

  const canonicalBytes = fs.readFileSync(PDF_PATH);
  const hash = crypto.createHash('sha256').update(canonicalBytes).digest('hex');
  recordTest('T-M12.1-A', 'Hash PDF canónico correcto', hash === EXPECTED_HASH, hash);

  const canonicalText = await extractText(canonicalBytes);
  const fixedPeriodLabel = 'AÑO 2026 - I';
  const canonicalPeriodCount = canonicalText.split(fixedPeriodLabel).length - 1;
  recordTest('T-M12.1A-M', 'El PDF canónico contiene una sola leyenda fija AÑO 2026 - I', canonicalPeriodCount === 1, `ocurrencias=${canonicalPeriodCount}`);

  const canonicalDoc = await PDFDocument.load(canonicalBytes);
  recordTest('T-M12.1-B', 'PDF canónico tiene una sola página', canonicalDoc.getPageCount() === 1);
  const pageSize = canonicalDoc.getPage(0).getSize();
  const landscape = Math.abs(pageSize.width - 841.890) < 1 && Math.abs(pageSize.height - 595.304) < 1;
  recordTest('T-M12.1-C', 'PDF canónico es A4 Landscape', landscape, `${pageSize.width.toFixed(3)} x ${pageSize.height.toFixed(3)} pt`);

  const fields = JSON.parse(fs.readFileSync(FIELDS_PATH, 'utf8'));
  const keys = Object.keys(fields);
  recordTest('T-M12.1-D', 'Las 4 cajas geométricas originales permanecen disponibles', EXPECTED_KEYS.every(key => keys.includes(key)));
  const boxesInside = Object.values(fields).every(box =>
    box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
    box.x + box.width <= pageSize.width + 0.01 && box.y + box.height <= pageSize.height + 0.01
  );
  recordTest('T-M12.1-E', 'Todas las cajas están dentro de los límites de página', boxesInside);

  installBrowserFixture();
  const engineModule = await import(`${pathToFileURL(ENGINE_PATH).href}?m12_1=${Date.now()}`);
  const engine = new engineModule.PdfTemplateEngine();
  const fixture = {
    testOnly: true,
    institution: { nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"', dre: 'BLOCKED-DRE-M12-1' },
    program: { nombre: 'COMPUTACIÓN E INFORMÁTICA', nivel: 'BLOCKED-NIVEL-M12-1' },
    student: { numeroDocumento: 'TEST-0001', apellidosNombres: 'ESTUDIANTE DE PRUEBA UNO' },
    module: { nombre: 'BLOCKED-MODULO-M12-1' },
    period: { nombre: 'BLOCKED-PERIODO-M12-1' },
    units: [{ nombre: 'BLOCKED-UNIDAD-M12-1' }]
  };

  let writeCount = 0;
  global.indexedDB = new Proxy({}, {
    get() {
      writeCount += 1;
      throw new Error('TMPL-02 intentó acceder a IndexedDB');
    }
  });
  const { resolveDocumentFields } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-field-contract.js')).href);
  const { buildResolvedFieldSet } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-binding-service.js')).href);
  const blob = await engine.renderTMPL02({ ...fixture,
    resolvedFieldSet: buildResolvedFieldSet(resolveDocumentFields('TMPL-02', fixture)) });
  recordTest('T-M12.1-F', 'renderTMPL02 genera Blob application/pdf', blob instanceof Blob && blob.type === 'application/pdf');

  const outputBytes = await blob.arrayBuffer();
  const outputText = await extractText(outputBytes);
  const outputPeriodCount = outputText.split(fixedPeriodLabel).length - 1;
  const renderSource = engine.renderTMPL02.toString();
  const preservesSourcePeriodWithoutInjection = outputPeriodCount === canonicalPeriodCount &&
    !renderSource.includes('2026 - I') && !renderSource.includes('2026-I');
  recordTest('T-M12.1A-N', 'renderTMPL02 no inyecta ni sobrescribe la leyenda fija 2026 - I', preservesSourcePeriodWithoutInjection, `canónico=${canonicalPeriodCount}, salida=${outputPeriodCount}`);
  const visibleValues = [
    'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
    'COMPUTACIÓN E INFORMÁTICA',
    'TEST-0001',
    'ESTUDIANTE DE PRUEBA UNO'
  ].every(value => outputText.includes(value));
  recordTest('T-M12.1-G', 'Los 4 textos TEST_ONLY aparecen en el PDF generado', visibleValues);

  const blockedValues = ['BLOCKED-DRE-M12-1', 'BLOCKED-NIVEL-M12-1', 'BLOCKED-MODULO-M12-1', 'BLOCKED-PERIODO-M12-1', 'BLOCKED-UNIDAD-M12-1'];
  recordTest('T-M12.1-H', 'Campos bloqueados no son inyectados', blockedValues.every(value => !outputText.includes(value)));
  recordTest('T-M12.1-I', 'La vista previa no accede ni escribe en IndexedDB/store documentos', writeCount === 0);

  const tmpl01Blob = await engine.renderTMPL01({
    institution: { nombre: 'CETPRO TEST_ONLY' },
    program: { nombre: 'PROGRAMA TEST_ONLY' },
    studentsList: [{ apellidosNombres: 'ESTUDIANTE TEST_ONLY', sexo: 'M', fechaNacimiento: '01/01/2000' }]
  });
  const tmpl01Doc = await PDFDocument.load(await tmpl01Blob.arrayBuffer());
  recordTest('T-M12.1-J', 'TMPL-01 continúa generando PDF de una página', tmpl01Blob.type === 'application/pdf' && tmpl01Doc.getPageCount() === 1);

  const productionFiles = [ENGINE_PATH, VIEW_PATH, FIELDS_PATH, path.join(ROOT, 'app/js/services/template-registry.js')];
  const hasNewRemoteDependency = productionFiles.some(file => /https?:\/\/(?!127\.0\.0\.1|localhost)|unpkg|jsdelivr|cdnjs/i.test(fs.readFileSync(file, 'utf8')));
  recordTest('T-M12.1-K', 'M12.1 no introduce dependencia CDN nueva', !hasNewRemoteDependency);

  const viewSource = fs.readFileSync(VIEW_PATH, 'utf8');
  const connected = viewSource.includes("import { PdfTemplateEngine }") &&
    viewSource.includes('this.pdfEngine[template.renderer]') &&
    viewSource.includes('DocumentDataService') &&
    viewSource.includes('doc-generate-btn') && viewSource.includes('<iframe');
  recordTest('T-M12.1-L', 'DocumentsView conecta TMPL-02 con PdfTemplateEngine y visor nativo', connected);

  const passed = testResults.filter(result => result.passed).length;
  const failed = testResults.filter(result => !result.passed).length;
  const total = testResults.length;
  console.log(`\nRESUMEN M12.1: TOTAL=${total}, PASSED=${passed}, FAILED=${failed}\n`);
  return { suite: 'M12.1', total, passed, failed };
}

if (require.main === module) {
  runM12_1Tests().then(result => {
    if (result.failed > 0) process.exitCode = 1;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runM12_1Tests };
