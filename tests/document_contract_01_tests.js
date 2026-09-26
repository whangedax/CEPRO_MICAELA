const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const results = [];
function check(id, description, passed) {
  results.push({ id, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}`);
}

async function runDocumentContract01Tests() {
  results.length = 0;
  const stamp = Date.now();
  const contract = await import(`${pathToFileURL(path.join(ROOT, 'app/js/services/document-field-contract.js')).href}?contract=${stamp}`);
  const { DocumentValidationService } = await import(`${pathToFileURL(path.join(ROOT, 'app/js/services/document-validation-service.js')).href}?contract=${stamp}`);
  const { TemplateRegistry } = await import(`${pathToFileURL(path.join(ROOT, 'app/js/services/template-registry.js')).href}?contract=${stamp}`);
  const registry = new TemplateRegistry();
  const validator = new DocumentValidationService(registry);
  const context = {
    institution: { nombre: 'CETPRO REAL', tipoGestion: 'PÚBLICA', resolucion: 'R-001' },
    student: { id: 'EST-REAL', numeroDocumento: '01234567', apellidosNombres: 'PERSONA REAL' },
    enrollment: { id: 'MAT-REAL' }, program: { id: 'PROG-001', nombre: 'PROGRAMA REAL' },
    module: {}, period: {}, curriculum: {}, source: { enrollmentId: 'MAT-REAL' }
  };

  console.log('\nDOCUMENT-CONTRACT-01 — CONTRATO Y PREFLIGHT');
  const allFields = Object.values(contract.TEMPLATE_FIELD_CONTRACTS).flat();
  check('T-DC01-01', 'Toda declaración tiene fuente y política de vacíos',
    registry.getAll().length === 21 && Object.keys(contract.TEMPLATE_FIELD_CONTRACTS).length === 21 &&
    allFields.every(field => field.source && field.emptyPolicy === 'BLANK' &&
      (field.source === 'template' || contract.SOURCE_CATEGORIES.includes(field.source.split('.')[0]))));

  const empty = contract.resolveDocumentFields('TMPL-02', {});
  check('T-DC01-02', 'Campos ausentes resuelven a texto vacío',
    empty.every(field => field.value === '') && validator.validateDocument('TMPL-02', {}).canPreview === false);

  const source = fs.readFileSync(path.join(ROOT, 'app/js/services/document-field-contract.js'), 'utf8');
  check('T-DC01-03', 'No existe fallback inventado en el contrato',
    !/TEST-0001|ESTUDIANTE DE PRUEBA|MAT-TEST|15\/03\/2005|00000000|SIN_DNI|N\/A/.test(source));

  const hostile = { ...context, module: { nombre: 'MÓDULO INFERIDO' },
    period: { nombre: 'PERIODO INVENTADO' }, curriculum: { units: ['UD FICTICIA'], credits: 8, hours: 100 } };
  const hostileFields = Object.fromEntries(contract.resolveDocumentFields('TMPL-02', hostile).map(field => [field.key, field]));
  check('T-DC01-04', 'B-002 bloquea unidades, créditos y horas',
    ['curriculum.units', 'curriculum.credits', 'curriculum.hours'].every(key => hostileFields[key].status === 'BLOCKED' && hostileFields[key].value === ''));
  check('T-DC01-05', 'B-004 bloquea módulo', hostileFields['module.nombre'].status === 'BLOCKED' && hostileFields['module.nombre'].value === '');
  check('T-DC01-06', 'B-007 bloquea periodo', hostileFields['period.nombre'].status === 'BLOCKED' && hostileFields['period.nombre'].value === '');

  const preflight = validator.validateDocument('TMPL-02', context);
  check('T-DC01-07', 'Campos confirmados se propagan y preview no equivale a emisión',
    preflight.canPreview && !preflight.canOfficiallyIssue &&
    preflight.documentFields['student.numeroDocumento'] === '01234567' &&
    preflight.documentFields['program.nombre'] === 'PROGRAMA REAL');

  const altered = { ...context, institution: { ...context.institution, nombre: 'CETPRO EDITADO' } };
  const one = validator.validateDocument('TMPL-01', altered);
  const two = validator.validateDocument('TMPL-02', altered);
  const codeContext = { ...altered, institution: { ...altered.institution, codigoModular: 'CÓDIGO CONFIRMADO' },
    confirmedSources: ['institution.codigoModular'] };
  const codeUsers = ['TMPL-01', 'TMPL-02', 'TMPL-03', 'TMPL-19'];
  check('T-DC01-08', 'Una edición institucional alimenta contratos compartidos',
    one.documentFields['institution.nombre'] === 'CETPRO EDITADO' &&
    two.documentFields['institution.nombre'] === 'CETPRO EDITADO' &&
    codeUsers.every(id => validator.validateDocument(id, codeContext).documentFields['institution.codigoModular'] === 'CÓDIGO CONFIRMADO') &&
    validator.validateDocument('TMPL-02', { ...codeContext, confirmedSources: [] }).documentFields['institution.codigoModular'] === '');

  const viewSource = fs.readFileSync(path.join(ROOT, 'app/js/ui/documents-view.js'), 'utf8');
  check('T-DC01-09', 'TMPL-02 productiva reconstruye el contexto y aplica preflight antes del PDF',
    viewSource.includes('buildEnrollmentContext(enrollmentId)') &&
    viewSource.includes('validateDocument(template.templateId, context)') &&
    viewSource.includes('resolvedFieldSet: preflight.resolvedFieldSet') &&
    registry.getById('TMPL-01').contextType === 'GROUP');

  const canonical = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');
  const canonicalHash = crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex');
  const xlsxHashes = registry.getAll().every(template => crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, template.sourceFile))).digest('hex') === template.sourceHash);
  check('T-DC01-10', 'PDF canónico y 21 XLSX originales permanecen intactos',
    canonicalHash === '63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914' && xlsxHashes);

  const passed = results.filter(item => item.passed).length;
  const failed = results.length - passed;
  console.log(`RESUMEN DOCUMENT-CONTRACT-01: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}`);
  return { suite: 'DOCUMENT-CONTRACT-01', total: results.length, passed, failed };
}
module.exports = { runDocumentContract01Tests };
if (require.main === module) runDocumentContract01Tests().then(result => { if (result.failed) process.exitCode = 1; });
