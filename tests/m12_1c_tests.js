const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL: NodeURL, pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'app/js/data/institutional-source-2026.js');
const CATALOG_PATH = path.join(ROOT, 'app/js/services/catalog-service.js');
const INSTITUTION_SERVICE_PATH = path.join(ROOT, 'app/js/services/institution-service.js');
const VIEW_PATH = path.join(ROOT, 'app/js/ui/documents-view.js');
const ENGINE_PATH = path.join(ROOT, 'app/js/services/pdf-template-engine.js');
const TMPL01_PDF_PATH = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf');
const TMPL02_PDF_PATH = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');
const TMPL01_FIELDS_PATH = path.join(ROOT, 'app/data/TMPL01_PDF_FIELDS.json');
const TMPL02_FIELDS_PATH = path.join(ROOT, 'app/data/TMPL02_PDF_FIELDS.json');

const results = [];
function recordTest(id, description, passed, detail = '') {
  results.push({ id, description, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}${detail ? ` (${detail})` : ''}`);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

async function runM12_1CTests() {
  results.length = 0;
  console.log('\n==================================================');
  console.log('EJECUTANDO PRUEBAS M12.1C — FUENTE INSTITUCIONAL ÚNICA');
  console.log('==================================================\n');

  const sourceModule = await import(`${pathToFileURL(SOURCE_PATH).href}?m12_1c=${Date.now()}`);
  const catalogModule = await import(`${pathToFileURL(CATALOG_PATH).href}?m12_1c=${Date.now()}`);
  const catalog = catalogModule.CatalogService;
  const migrationVersion = sourceModule.INSTITUTION_SOURCE_MIGRATION_VERSION;
  let institution = null;
  let creates = 0;
  let updates = 0;
  let audits = 0;

  catalog.programRepo = { list: async () => [{ id: 'PROG-001' }] };
  catalog.moduleRepo = { list: async () => Array.from({ length: 14 }, (_, index) => ({ id: `MOD-${index + 1}` })) };
  catalog.instRepo = {
    getInstitution: async () => institution,
    create: async record => { creates += 1; institution = { ...record }; return record; },
    update: async record => { updates += 1; institution = { ...record }; return record; }
  };
  catalog.auditService = { record: async () => { audits += 1; } };

  await catalog.initializeCatalogs();
  recordTest('T-M12.1C-01', 'Primera migración crea e importa INST-001',
    creates === 1 && institution?.id === 'INST-001' && institution?.telefono === '051-602378');
  recordTest('T-M12.1C-02', 'INST-001 registra la versión estable de migración',
    institution?.sourceMigrationVersion === 'FUENTE_FISICA_INSTITUCIONAL_2026_V1' && migrationVersion === institution.sourceMigrationVersion);

  institution = { id: 'INST-001', nombre: 'PERFIL LEGADO SIN MARCADOR', estructuraLegada: 'PRESERVAR' };
  await catalog.initializeCatalogs();
  recordTest('T-M12.1C-02B', 'Un INST-001 legado se migra una sola vez y preserva su estructura',
    updates === 1 && audits === 1 && institution.estructuraLegada === 'PRESERVAR' &&
    institution.sourceMigrationVersion === migrationVersion && institution.telefono === '051-602378');

  institution.telefono = 'NUEVO-TELEFONO';
  institution.dre = 'DRE-OFICIAL-FUTURA';
  institution.codigoModular = 'CODIGO-MODULAR-FUTURO';
  const updatesBeforeSecondStart = updates;
  await catalog.initializeCatalogs();
  recordTest('T-M12.1C-03', 'Segundo initializeCatalogs no reescribe INST-001 marcado', updates === updatesBeforeSecondStart);
  recordTest('T-M12.1C-04', 'El teléfono editado permanece después de reinicializar', institution.telefono === 'NUEVO-TELEFONO');
  recordTest('T-M12.1C-05', 'La DRE futura permanece después de reinicializar', institution.dre === 'DRE-OFICIAL-FUTURA');
  recordTest('T-M12.1C-06', 'El Código Modular futuro permanece después de reinicializar', institution.codigoModular === 'CODIGO-MODULAR-FUTURO');

  const serviceModule = await import(`${pathToFileURL(INSTITUTION_SERVICE_PATH).href}?m12_1c=${Date.now()}`);
  serviceModule.InstitutionService.repo = { getInstitution: async () => institution };
  const profile = await serviceModule.InstitutionService.getInstitutionProfile();
  recordTest('T-M12.1C-07', 'getInstitutionProfile obtiene el INST-001 operacional',
    profile.id === 'INST-001' && profile.telefono === 'NUEVO-TELEFONO' && profile.dre === 'DRE-OFICIAL-FUTURA');
  const normalized = serviceModule.normalizeInstitutionProfile({ id: 'INST-001', telefono: null, dre: undefined });
  recordTest('T-M12.1C-08', 'null y undefined se normalizan a vacío sin inventar datos',
    normalized.telefono === '' && normalized.dre === '' && normalized.ugel === '');

  const viewSource = fs.readFileSync(VIEW_PATH, 'utf8');
  const dataServiceSource = fs.readFileSync(path.join(ROOT, 'app/js/services/document-data-service.js'), 'utf8');
  const engineSource = fs.readFileSync(ENGINE_PATH, 'utf8');
  const tmpl01Source = engineSource.slice(engineSource.indexOf('  async renderTMPL01('), engineSource.indexOf('  async renderTMPL02('));
  recordTest('T-M12.1C-09', 'TMPL-01 recibe el perfil institucional central completo',
    tmpl01Source.includes("payload.institution?.ugel || ''") && viewSource.includes("contextType === 'GROUP'"));
  recordTest('T-M12.1C-10', 'TMPL-02 recibe exactamente el mismo perfil institucional central',
    dataServiceSource.includes('this.institutionService.getInstitutionProfile()') &&
    viewSource.includes('buildEnrollmentContext(enrollmentId)'));
  recordTest('T-M12.1C-11', 'TMPL-01 no conserva fallback SAN ROMÁN', !tmpl01Source.includes("|| 'SAN ROMÁN'"));
  recordTest('T-M12.1C-12', 'TMPL-01 no conserva fallback YUNGAY', !/YUNGAY/i.test(tmpl01Source));
  recordTest('T-M12.1C-13', 'TMPL-02 no importa la fuente física como proveedor runtime',
    !viewSource.includes("from '../data/institutional-source-2026.js'") &&
    !engineSource.includes("from '../data/institutional-source-2026.js'"));

  recordTest('T-M12.1C-14', 'Geometría y PDF canónico TMPL-01 permanecen intactos',
    sha256File(TMPL01_PDF_PATH) === '938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2' &&
    sha256File(TMPL01_FIELDS_PATH) === '18bcaf2a0533e33e82b34a85c90aac49b53874cfbd8d42dcb5adef94d28e411f');
  const tmpl02Geometry = JSON.parse(fs.readFileSync(TMPL02_FIELDS_PATH, 'utf8'));
  recordTest('T-M12.1C-15', 'PDF canónico y seis cajas originales TMPL-02 permanecen intactos',
    sha256File(TMPL02_PDF_PATH) === '63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914' &&
    tmpl02Geometry['institution.name'].x === 222.064 && tmpl02Geometry['institution.name'].y === 79.216 &&
    tmpl02Geometry['institution.managementType'].x === 609.232 && tmpl02Geometry['institution.managementType'].y === 102.48 &&
    tmpl02Geometry['institution.directorResolution'].x === 609.232 && tmpl02Geometry['institution.directorResolution'].y === 139.811 &&
    tmpl02Geometry['program.name'].x === 222.064 && tmpl02Geometry['program.name'].y === 157.424 &&
    tmpl02Geometry['student.documentNumber'].x === 609.232 && tmpl02Geometry['student.documentNumber'].y === 231.424 &&
    tmpl02Geometry['student.fullName'].x === 222.064 && tmpl02Geometry['student.fullName'].y === 249.728);
  recordTest('T-M12.1C-16', 'La generación de preview no escribe el store documentos',
    !viewSource.includes("new DocumentRepository") && !engineSource.includes("'documentos'"));

  installBrowserFixture();
  const engineModule = await import(`${pathToFileURL(ENGINE_PATH).href}?m12_1c=${Date.now()}`);
  const engine = new engineModule.PdfTemplateEngine();
  // El happy path usa un valor que cabe en la caja canónica. Los casos de
  // overflow se prueban aparte y deben fallar de forma controlada.
  const centralProfile = { nombre: 'CETPRO CENTRAL TEST', tipoGestion: 'PÚBLICA', ugel: 'UGEL', resolucion: 'R.D. CENTRAL', direccion: 'DIRECCIÓN CENTRAL' };
  const tmpl01Blob = await engine.renderTMPL01({ institution: centralProfile, program: { nombre: 'PROGRAMA TEST' }, studentsList: [] });
  const tmpl02Context = { institution: centralProfile, program: { nombre: 'PROGRAMA TEST' },
    student: { numeroDocumento: 'TEST-0001', apellidosNombres: 'ESTUDIANTE DE PRUEBA UNO' } };
  const { resolveDocumentFields } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-field-contract.js')).href);
  const { buildResolvedFieldSet } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-binding-service.js')).href);
  const tmpl02Blob = await engine.renderTMPL02({ ...tmpl02Context,
    resolvedFieldSet: buildResolvedFieldSet(resolveDocumentFields('TMPL-02', tmpl02Context)) });
  const tmpl01Doc = await PDFDocument.load(await tmpl01Blob.arrayBuffer());
  const tmpl02Doc = await PDFDocument.load(await tmpl02Blob.arrayBuffer());
  recordTest('T-M12.1C-17', 'TMPL-01 y TMPL-02 generan PDF técnico con el perfil común',
    tmpl01Blob.type === 'application/pdf' && tmpl02Blob.type === 'application/pdf' && tmpl01Doc.getPageCount() === 1 && tmpl02Doc.getPageCount() === 1);

  const state = fs.readFileSync(path.join(ROOT, 'docs/PROJECT_STATE.md'), 'utf8');
  const blockers = fs.readFileSync(path.join(ROOT, 'docs/contracts/BLOCKED_RULES.md'), 'utf8');
  recordTest('T-M12.1C-18', 'Periodos continúa 0 y B-002/B-004/B-007 permanecen abiertas',
    /PERIODOS[^\n]*:\s*0/i.test(state) && ['B-002', 'B-004', 'B-007'].every(id => blockers.includes(id)));

  recordTest('T-M12.1C-19', 'La migración única genera auditoría solo cuando escribe', audits === 1 && updates === 1,
    `creates=${creates}, updates=${updates}, audits=${audits}`);

  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  console.log(`\nRESUMEN M12.1C: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}\n`);
  return { suite: 'M12.1C', total: results.length, passed, failed };
}

if (require.main === module) {
  runM12_1CTests().then(result => {
    if (result.failed > 0) process.exitCode = 1;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runM12_1CTests };
