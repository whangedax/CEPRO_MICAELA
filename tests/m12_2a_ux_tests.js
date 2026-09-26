const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL: NodeURL, pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const VIEW = path.join(ROOT, 'app/js/ui/documents-view.js');
const REGISTRY = path.join(ROOT, 'app/js/services/template-registry.js');
const DATA_SERVICE = path.join(ROOT, 'app/js/services/document-data-service.js');
const ENGINE = path.join(ROOT, 'app/js/services/pdf-template-engine.js');
const TMPL01_PDF = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf');
const TMPL02_PDF = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');
const TMPL01_FIELDS = path.join(ROOT, 'app/data/TMPL01_PDF_FIELDS.json');
const TMPL02_FIELDS = path.join(ROOT, 'app/data/TMPL02_PDF_FIELDS.json');

const results = [];
function record(id, description, passed) {
  results.push({ id, description, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}`);
}
function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function runM12_2A_UXTests() {
  results.length = 0;
  console.log('\n==================================================');
  console.log('M12.2A-UX — NORMALIZACIÓN DEL FLUJO DOCUMENTAL');
  console.log('==================================================\n');

  const view = fs.readFileSync(VIEW, 'utf8');
  const registrySource = fs.readFileSync(REGISTRY, 'utf8');
  const serviceSource = fs.readFileSync(DATA_SERVICE, 'utf8');
  const testSources = fs.readFileSync(path.join(ROOT, 'tests/m11_tests.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'tests/m12_1_tests.js'), 'utf8');
  const stamp = Date.now();
  const registryModule = await import(`${pathToFileURL(REGISTRY).href}?ux=${stamp}`);
  const registry = new registryModule.TemplateRegistry();
  const tmpl01 = registry.getById('TMPL-01');
  const tmpl02 = registry.getById('TMPL-02');

  record('T-M12.2A-UX-01', 'TMPL-02 usa flujo productivo único',
    tmpl02.contextType === 'ENROLLMENT' && !view.includes('tmpl02Mode') && !view.includes('Modo de datos'));
  record('T-M12.2A-UX-02', 'No aparece VISTA TÉCNICA TEST_ONLY', !view.includes('VISTA TÉCNICA TEST_ONLY'));
  record('T-M12.2A-UX-03', 'No aparece TEST-0001', !view.includes('TEST-0001'));
  record('T-M12.2A-UX-04', 'No existe botón de generación técnica', !view.includes('Generar PDF técnico') && !view.includes('tmpl02-test-generate-btn'));
  record('T-M12.2A-UX-05', 'La búsqueda consulta DocumentDataService',
    view.includes('this.documentDataService.searchEnrollments(this.searchQuery)') && view.includes('document-context-result'));
  record('T-M12.2A-UX-06', 'La selección construye contexto autoritativo',
    view.includes('this.selectedEnrollmentId = String(selected.id)') && view.includes('MATRÍCULA SELECCIONADA'));
  record('T-M12.2A-UX-07', 'La generación usa contexto real y renderer declarado',
    view.includes('buildEnrollmentContext(enrollmentId)') && view.includes('this.pdfEngine[template.renderer]') && view.includes('Vista previa PDF TMPL-02'));
  record('T-M12.2A-UX-08', 'DocumentDataService es el único acceso académico de DocumentsView',
    view.includes("from '../services/document-data-service.js'") && !/Repository|InstitutionService/.test(view) && serviceSource.includes('buildEnrollmentContext'));
  record('T-M12.2A-UX-09', 'TMPL-01 no muestra fixtures en la UX',
    tmpl01.contextType === 'GROUP' && !/Fixture|fixture|ESTUDIANTE DE PRUEBA|ESTUDIANTE FIXTURE|MAT-TEST/.test(view));
  record('T-M12.2A-UX-10', 'TMPL-01 delega el flujo productivo a Nóminas y no genera desde Documentos',
    view.includes('La nómina administrativa está disponible en la sección Nóminas.') &&
    view.includes('href="#/nominas"') && view.includes("if (template.templateId === 'TMPL-01')"));
  record('T-M12.2A-UX-11', 'Los fixtures permanecen disponibles en pruebas',
    testSources.includes('ESTUDIANTE FIXTURE') && testSources.includes('TEST_ONLY'));
  record('T-M12.2A-UX-12', 'Los PDF canónicos permanecen intactos',
    hash(TMPL01_PDF) === '938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2' &&
    hash(TMPL02_PDF) === '63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914');
  const tmpl02Geometry = JSON.parse(fs.readFileSync(TMPL02_FIELDS, 'utf8'));
  record('T-M12.2A-UX-13', 'TMPL-01 y seis cajas originales TMPL-02 mantienen geometría',
    hash(TMPL01_FIELDS) === '18bcaf2a0533e33e82b34a85c90aac49b53874cfbd8d42dcb5adef94d28e411f' &&
    tmpl02Geometry['institution.name'].x === 222.064 && tmpl02Geometry['institution.name'].y === 79.216 &&
    tmpl02Geometry['institution.managementType'].x === 609.232 && tmpl02Geometry['institution.managementType'].y === 102.48 &&
    tmpl02Geometry['institution.directorResolution'].x === 609.232 && tmpl02Geometry['institution.directorResolution'].y === 139.811 &&
    tmpl02Geometry['program.name'].x === 222.064 && tmpl02Geometry['program.name'].y === 157.424 &&
    tmpl02Geometry['student.documentNumber'].x === 609.232 && tmpl02Geometry['student.documentNumber'].y === 231.424 &&
    tmpl02Geometry['student.fullName'].x === 222.064 && tmpl02Geometry['student.fullName'].y === 249.728);
  record('T-M12.2A-UX-14', 'El flujo productivo no escribe CETPRO_DB',
    !/\.create\(|\.update\(|\.delete\(|\.put\(|readwrite/.test(serviceSource) && !/\.create\(|\.update\(|\.delete\(|\.put\(|readwrite/.test(view));
  record('T-M12.2A-UX-15', 'No se crean periodos',
    serviceSource.includes('this.periodRepo.getById(CONFIG.IS_V2_CANDIDATE ? groupRecord.periodoId : enrollment.periodoId)') &&
    serviceSource.includes('Promise.resolve(null)') && !/periodRepo\.(create|update|delete)/.test(serviceSource));

  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  console.log(`\nRESUMEN M12.2A-UX: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}\n`);
  return { suite: 'M12.2A-UX', total: results.length, passed, failed };
}

module.exports = { runM12_2A_UXTests };
if (require.main === module) runM12_2A_UXTests().then(result => { if (result.failed) process.exitCode = 1; });
