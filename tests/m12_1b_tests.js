const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL: NodeURL, pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const SOURCE_DATA_PATH = path.join(ROOT, 'app/js/data/institutional-source-2026.js');
const CATALOG_PATH = path.join(ROOT, 'app/js/services/catalog-service.js');
const ENGINE_PATH = path.join(ROOT, 'app/js/services/pdf-template-engine.js');
const VIEW_PATH = path.join(ROOT, 'app/js/ui/documents-view.js');
const FIELDS_PATH = path.join(ROOT, 'app/data/TMPL02_PDF_FIELDS.json');
const TMPL01_PDF_PATH = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf');
const TMPL02_PDF_PATH = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');
const TMPL01_FIELDS_PATH = path.join(ROOT, 'app/data/TMPL01_PDF_FIELDS.json');

const EXPECTED_PROGRAMS = [
  'PELUQUERÍA Y BARBERÍA',
  'MECÁNICA AUTOMOTRIZ',
  'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
  'CARPINTERÍA METÁLICA',
  'COMPUTACIÓN E INFORMÁTICA',
  'CORTE Y ENSAMBLAJE',
  'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS'
];

const ORIGINAL_TMPL02_BOXES = {
  'institution.name': { x: 222.064, y: 79.216, width: 246.928, height: 23.264, align: 'left', maxFontSize: 8, minFontSize: 5.5, paddingX: 5 },
  'program.name': { x: 222.064, y: 157.424, width: 246.928, height: 23.952, align: 'left', maxFontSize: 8, minFontSize: 5.5, paddingX: 5 },
  'student.documentNumber': { x: 609.232, y: 231.424, width: 169.776, height: 18.304, align: 'center', maxFontSize: 8, minFontSize: 5.5, paddingX: 5 },
  'student.fullName': { x: 222.064, y: 249.728, width: 556.944, height: 21.12, align: 'left', maxFontSize: 8, minFontSize: 5.5, paddingX: 5 }
};

const results = [];
function recordTest(id, description, passed, detail = '') {
  results.push({ id, description, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}${detail ? ` (${detail})` : ''}`);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

async function runM12_1BTests() {
  results.length = 0;
  console.log('\n==================================================');
  console.log('EJECUTANDO PRUEBAS M12.1B — DATOS INSTITUCIONALES');
  console.log('==================================================\n');

  const sourceModule = await import(`${pathToFileURL(SOURCE_DATA_PATH).href}?m12_1b=${Date.now()}`);
  const source = sourceModule.INSTITUTIONAL_SOURCE_2026;
  recordTest('T-M12.1B-A', 'Procedencia física institucional identificada',
    source.fuente === 'FUENTE_FISICA_INSTITUCIONAL_2026' &&
    source.fuenteDescripcion === 'Volante físico institucional entregado por jefatura/dirección.');
  recordTest('T-M12.1B-B', 'Nombre y denominación visible conservan el texto confirmado',
    source.nombre === 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"' &&
    source.denominacionVisible === 'CENTRO DE EDUCACIÓN TÉCNICA PRODUCTIVA PÚBLICO\nMICAELA BASTIDAS PUYUCAWA');
  recordTest('T-M12.1B-C', 'Tipo de gestión confirmado como PÚBLICA', source.tipoGestion === 'PÚBLICA');
  recordTest('T-M12.1B-D', 'UGEL confirmada como SAN ROMÁN', source.ugel === 'SAN ROMÁN');
  recordTest('T-M12.1B-E', 'Se conservan ambas resoluciones y su valor visual combinado',
    source.resolucionAutorizacion1 === 'R.D. N.º 3367-DREP' &&
    source.resolucionAutorizacion2 === 'R.D. N.º 774-DREP' &&
    source.resolucion === 'R.D. N.º 3367-DREP / R.D. N.º 774-DREP');
  recordTest('T-M12.1B-F', 'Dirección y tres teléfonos se conservan como texto',
    source.direccion === 'Jr. Yungay N.º 302 - San Miguel - Juliaca' &&
    source.telefono === '051-602378' && source.celular1 === '999-041818' && source.celular2 === '961-990905');
  recordTest('T-M12.1B-G', 'Datos informativos del volante se preservan sin transformación',
    source.inicioAnunciado === '10 DE AGOSTO' &&
    source.horarioAnunciado === 'M - T - N / L - V y S/D' &&
    JSON.stringify(source.requisitosInscripcion) === JSON.stringify(['Una Foto', 'Fotocopia de DNI', 'Pago por Mantenimiento de Talleres']));

  const forbiddenFieldsEmpty = ['dre', 'codigoModular', 'departamento', 'provincia', 'distrito'].every(key => source[key] === '');
  const noAcademicPeriod = !Object.hasOwn(source, 'periodoLectivo') && !Object.hasOwn(source, 'periodoAcademico') &&
    !Object.values(source).some(value => typeof value === 'string' && value.includes('2026-I'));
  recordTest('T-M12.1B-H', 'Campos no confirmados permanecen vacíos y 10 DE AGOSTO no se convierte en periodo', forbiddenFieldsEmpty && noAcademicPeriod);

  const catalogModule = await import(`${pathToFileURL(CATALOG_PATH).href}?m12_1b=${Date.now()}`);
  const actualPrograms = catalogModule.OFFICIAL_CATALOG_SEED.map(program => program.nombre);
  recordTest('T-M12.1B-I', 'Los 7 programas coinciden exactamente con la fuente',
    actualPrograms.length === 7 && EXPECTED_PROGRAMS.every(program => actualPrograms.includes(program)));

  const currentRecord = { id: 'INST-001', nombre: 'VALOR ANTERIOR', dre: 'VALOR INFERIDO', codigoModular: 'PENDIENTE DE CONFIGURACIÓN', fechaRegistro: '2026-09-11T00:00:00.000Z' };
  const updatedRecord = sourceModule.buildInstitutionalSourceRecord(currentRecord, '2026-09-14T12:00:00.000Z');
  const idempotentRecord = sourceModule.buildInstitutionalSourceRecord(updatedRecord, '2026-09-14T13:00:00.000Z');
  recordTest('T-M12.1B-J', 'La reconciliación actualiza el registro existente sin duplicar ID ni perder fecha de alta',
    updatedRecord.id === 'INST-001' && updatedRecord.fechaRegistro === currentRecord.fechaRegistro &&
    updatedRecord.sourceMigrationVersion === sourceModule.INSTITUTION_SOURCE_MIGRATION_VERSION &&
    idempotentRecord.sourceMigrationVersion === sourceModule.INSTITUTION_SOURCE_MIGRATION_VERSION);

  const fields = JSON.parse(fs.readFileSync(FIELDS_PATH, 'utf8'));
  const originalBoxesUnchanged = Object.entries(ORIGINAL_TMPL02_BOXES).every(([key, value]) => {
    const { contractKey, ...geometry } = fields[key];
    return Boolean(contractKey) && JSON.stringify(geometry) === JSON.stringify(value);
  });
  recordTest('T-M12.1B-K', 'Las 4 cajas aprobadas conservan su geometría tras nuevos bindings',
    originalBoxesUnchanged && Object.keys(fields).length === 11 && fields['institution.managementType'] && fields['institution.directorResolution']);

  installBrowserFixture();
  const engineModule = await import(`${pathToFileURL(ENGINE_PATH).href}?m12_1b=${Date.now()}`);
  const engine = new engineModule.PdfTemplateEngine();
  let indexedDbAccesses = 0;
  global.indexedDB = new Proxy({}, { get() { indexedDbAccesses += 1; throw new Error('Acceso IndexedDB no permitido en preview'); } });
  const fixture = {
    testOnly: true,
    institution: { ...source, dre: 'BLOCKED-DRE', codigoModular: 'BLOCKED-CODIGO', departamento: 'BLOCKED-DEPARTAMENTO', provincia: 'BLOCKED-PROVINCIA', distrito: 'BLOCKED-DISTRITO' },
    program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
    student: { numeroDocumento: 'TEST-0001', apellidosNombres: 'ESTUDIANTE DE PRUEBA UNO' },
    period: { nombre: 'BLOCKED-PERIODO' },
    module: { nombre: 'BLOCKED-MODULO' },
    units: [{ nombre: 'BLOCKED-UNIDAD' }]
  };
  const { resolveDocumentFields } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-field-contract.js')).href);
  const { buildResolvedFieldSet } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-binding-service.js')).href);
  const blob = await engine.renderTMPL02({ ...fixture,
    resolvedFieldSet: buildResolvedFieldSet(resolveDocumentFields('TMPL-02', fixture)) });
  const outputText = await extractText(await blob.arrayBuffer());
  recordTest('T-M12.1B-L', 'TMPL-02 renderiza gestión y ambas resoluciones mediante AutoFit',
    blob.type === 'application/pdf' && outputText.includes('PÚBLICA') &&
    outputText.includes('R.D. N.º 3367-DREP / R.D. N.º 774-DREP'));
  const blockedValues = ['BLOCKED-DRE', 'BLOCKED-CODIGO', 'BLOCKED-DEPARTAMENTO', 'BLOCKED-PROVINCIA', 'BLOCKED-DISTRITO', 'BLOCKED-PERIODO', 'BLOCKED-MODULO', 'BLOCKED-UNIDAD', '10 DE AGOSTO'];
  recordTest('T-M12.1B-M', 'DRE, código, ubicación, periodo, módulo, unidades e inicio anunciado no se imprimen',
    blockedValues.every(value => !outputText.includes(value)) && indexedDbAccesses === 0);

  const engineSource = fs.readFileSync(ENGINE_PATH, 'utf8');
  const renderTMPL02Source = engineSource.slice(engineSource.indexOf('  async renderTMPL02('));
  recordTest('T-M12.1B-N', 'renderTMPL02 usa los bindings declarativos sin resolver fuentes de nuevo',
    Object.values(fields).every(box => Boolean(box.contractKey)) &&
    renderTMPL02Source.includes('getDrawableBindings') && !renderTMPL02Source.includes('resolveDocumentFields') &&
    !renderTMPL02Source.includes('PENDIENTE DE CONFIGURACIÓN') &&
    !renderTMPL02Source.includes('payload?.institution?.nombre'));

  recordTest('T-M12.1B-O', 'PDF y geometría TMPL-01 permanecen congelados',
    sha256File(TMPL01_PDF_PATH) === '938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2' &&
    sha256File(TMPL01_FIELDS_PATH) === '18bcaf2a0533e33e82b34a85c90aac49b53874cfbd8d42dcb5adef94d28e411f');

  const canonicalTmpl02 = await PDFDocument.load(fs.readFileSync(TMPL02_PDF_PATH));
  recordTest('T-M12.1B-P', 'PDF canónico TMPL-02 permanece inmutable y de una página',
    sha256File(TMPL02_PDF_PATH) === '63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914' && canonicalTmpl02.getPageCount() === 1);

  const relevantSources = [SOURCE_DATA_PATH, CATALOG_PATH, ENGINE_PATH, VIEW_PATH, FIELDS_PATH].map(file => fs.readFileSync(file, 'utf8')).join('\n');
  recordTest('T-M12.1B-Q', 'M12.1B permanece offline y sin dependencia web nueva',
    !/https?:\/\/(?!127\.0\.0\.1|localhost)|unpkg|jsdelivr|cdnjs/i.test(relevantSources));

  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  console.log(`\nRESUMEN M12.1B: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}\n`);
  return { suite: 'M12.1B', total: results.length, passed, failed };
}

if (require.main === module) {
  runM12_1BTests().then(result => {
    if (result.failed > 0) process.exitCode = 1;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runM12_1BTests };
