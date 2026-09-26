const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL: NodeURL, pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'app/data/TMPL02_PDF_FIELDS.json');
const CANONICAL = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf');
const results = [];
function check(id, description, passed) {
  results.push({ id, passed: Boolean(passed) });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}`);
}
async function rejects(fn) { try { await fn(); return false; } catch { return true; } }
async function extractText(blob) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), disableWorker: true }).promise;
  return (await (await pdf.getPage(1)).getTextContent()).items.map(item => item.str).join(' ');
}
function installBrowserFixture() {
  global.URL = NodeURL;
  global.window = { location: { href: 'http://127.0.0.1:8080/app/index.html#/documentos' }, PDFLib: require('pdf-lib') };
  global.fetch = async rawUrl => {
    const local = path.join(ROOT, decodeURIComponent(new URL(rawUrl).pathname).replace(/^\//, ''));
    return { ok: fs.existsSync(local), async arrayBuffer() {
      const buffer = fs.readFileSync(local);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }, async json() { return JSON.parse(fs.readFileSync(local, 'utf8')); } };
  };
}

async function runDocumentBinding01Tests() {
  results.length = 0;
  const [{ DocumentValidationService }, binding, { PdfTemplateEngine }, { InstitutionService }, { AuditService }] = await Promise.all([
    import(pathToFileURL(path.join(ROOT, 'app/js/services/document-validation-service.js')).href),
    import(pathToFileURL(path.join(ROOT, 'app/js/services/document-binding-service.js')).href),
    import(pathToFileURL(path.join(ROOT, 'app/js/services/pdf-template-engine.js')).href),
    import(pathToFileURL(path.join(ROOT, 'app/js/services/institution-service.js')).href),
    import(pathToFileURL(path.join(ROOT, 'app/js/services/audit-service.js')).href)
  ]);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const five = { dre: 'DRE-TEST-CONFIRMADA', codigoModular: 'CM-TEST-001', departamento: 'DEP-TEST',
    provincia: 'PROV-TEST', distrito: 'DIST-TEST' };
  const confirmedSources = Object.keys(five).map(key => `institution.${key}`);
  const context = {
    institution: { id: 'INST-001', nombre: 'CETPRO AISLADO', tipoGestion: 'PÚBLICA',
      resolucionAutorizacion1: 'R-1', resolucionAutorizacion2: 'R-2', ...five },
    student: { id: 'EST-AISLADO', numeroDocumento: '01234567', apellidosNombres: 'PERSONA AISLADA' },
    enrollment: { id: 'MAT-AISLADA' }, program: { id: 'PROG-001', nombre: 'PROGRAMA AISLADO' },
    module: { nombre: 'MODULO NO AUTORIZADO' }, period: { nombre: 'PERIODO NO AUTORIZADO' },
    curriculum: { units: ['UD NO AUTORIZADA'], credits: 9, hours: 100 },
    source: { enrollmentId: 'MAT-AISLADA' }, confirmedSources
  };
  const validator = new DocumentValidationService();
  const preflight = validator.validateDocument('TMPL-02', context);
  installBrowserFixture();
  let dbAccesses = 0;
  global.indexedDB = new Proxy({}, { get() { dbAccesses++; throw new Error('IndexedDB prohibida durante render'); } });
  const engine = new PdfTemplateEngine();
  const blob = await engine.renderTMPL02({ resolvedFieldSet: preflight.resolvedFieldSet });
  if (require.main === module) {
    fs.mkdirSync(path.join(ROOT, 'tmp/pdfs'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'tmp/pdfs/tmpl02_binding_qa.pdf'), Buffer.from(await blob.arrayBuffer()));
  }
  const text = await extractText(blob);
  const engineSource = fs.readFileSync(path.join(ROOT, 'app/js/services/pdf-template-engine.js'), 'utf8');
  const viewSource = fs.readFileSync(path.join(ROOT, 'app/js/ui/documents-view.js'), 'utf8');
  const layoutSource = fs.readFileSync(path.join(ROOT, 'app/js/ui/layout.js'), 'utf8');

  check('T-DB01-01', 'Preflight y PDF reciben el mismo conjunto resuelto con estado',
    preflight.canPreview && preflight.mappedAvailableFields.length === 11 &&
    preflight.unmappedAvailableFields.length === 0 &&
    viewSource.includes('resolvedFieldSet: preflight.resolvedFieldSet') &&
    engineSource.includes('getDrawableBindings(\'TMPL-02\', payload?.resolvedFieldSet)'));
  for (const [index, [key, value]] of Object.entries(five).entries()) {
    check(`T-DB01-0${index + 2}`, `${key} confirmado llega a PDF extraído`, text.includes(value));
  }
  const pendingContext = { ...context, confirmedSources: [], institution: { ...context.institution,
    dre: 'DRE-SIN-CONFIRMAR' } };
  const pending = validator.validateDocument('TMPL-02', pendingContext);
  const pendingText = await extractText(await engine.renderTMPL02({ resolvedFieldSet: pending.resolvedFieldSet }));
  check('T-DB01-07', 'Texto institucional sin confirmación permanece en blanco',
    pending.resolvedFieldSet['institution.dre'].status === 'UNCONFIRMED' && !pendingText.includes('DRE-SIN-CONFIRMAR'));
  check('T-DB01-08', 'B-002 mantiene vacías unidades, subsanación, créditos y horas',
    ['curriculum.units', 'curriculum.subsanacionUnits', 'curriculum.credits', 'curriculum.hours']
      .every(key => preflight.resolvedFieldSet[key].status === 'BLOCKED' && preflight.resolvedFieldSet[key].value === '') &&
      !text.includes('UD NO AUTORIZADA'));
  check('T-DB01-09', 'B-004 mantiene módulo bloqueado',
    preflight.resolvedFieldSet['module.nombre'].status === 'BLOCKED' && !text.includes('MODULO NO AUTORIZADO'));
  check('T-DB01-10', 'B-007 mantiene periodo bloqueado',
    preflight.resolvedFieldSet['period.nombre'].status === 'BLOCKED' && !text.includes('PERIODO NO AUTORIZADO'));
  const contextA = { ...context, institution: { ...context.institution, dre: 'DRE-A' } };
  const contextB = { ...context, institution: { ...context.institution, dre: 'DRE-B' } };
  const first = await extractText(await engine.renderTMPL02({ resolvedFieldSet: validator.validateDocument('TMPL-02', contextA).resolvedFieldSet }));
  const second = await extractText(await engine.renderTMPL02({ resolvedFieldSet: validator.validateDocument('TMPL-02', contextB).resolvedFieldSet }));
  check('T-DB01-11', 'DRE-A → DRE-B aparece al regenerar sin cambiar manifest ni renderer',
    first.includes('DRE-A') && !first.includes('DRE-B') && second.includes('DRE-B') && !second.includes('DRE-A'));
  check('T-DB01-12', 'Renderer no resuelve fuentes paralelas ni utiliza fallback',
    !engineSource.includes('resolveDocumentFields') && !engineSource.includes('payload?.institution?.nombre') &&
    await rejects(() => engine.renderTMPL02({ institution: context.institution })));
  check('T-DB01-13', 'Render no accede ni escribe IndexedDB productiva', dbAccesses === 0 && !/indexedDB|readwrite/.test(engineSource));
  check('T-DB01-14', 'PDF canónico preserva SHA-256',
    crypto.createHash('sha256').update(fs.readFileSync(CANONICAL)).digest('hex') ===
      '63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914');
  check('T-DB01-15', 'Seis geometrías anteriores no se desplazan y cinco nuevas salen de líneas físicas',
    Object.keys(manifest).length === 11 && manifest['institution.name'].x === 222.064 &&
    manifest['institution.managementType'].y === 102.48 && manifest['institution.directorResolution'].x === 609.232 &&
    manifest['program.name'].y === 157.424 && manifest['student.documentNumber'].y === 231.424 &&
    manifest['student.fullName'].y === 249.728 && manifest['institution.dre'].y === 4.951 * 16 &&
    manifest['institution.codigoModular'].y === 6.405 * 16 &&
    manifest['institution.departamento'].y === 7.594 * 16 &&
    manifest['institution.provincia'].x === 38.077 * 16 &&
    manifest['institution.distrito'].y === 8.738 * 16);
  const drawable = binding.getDrawableBindings('TMPL-02', preflight.resolvedFieldSet);
  const emptyMapped = structuredClone(preflight.resolvedFieldSet);
  emptyMapped['institution.dre'].value = '';
  check('T-DB01-16', 'CONFIRMED+MAPPED no puede desaparecer silenciosamente del renderer',
    drawable.length === preflight.mappedAvailableFields.length &&
    drawable.every(item => text.includes(item.text)) &&
    await rejects(() => binding.getDrawableBindings('TMPL-02', emptyMapped)) &&
    binding.getBindingCoverage('TMPL-03', validator.validateDocument('TMPL-03', context).resolvedFields)
      .fields.every(field => field.bindingStatus === 'NOT_IMPLEMENTED' || field.bindingStatus === 'FIXED_IN_TEMPLATE'));
  const originalRepo = InstitutionService.repo;
  const originalAudit = AuditService.record;
  let record = { id: 'INST-001', nombre: 'CETPRO AISLADO', dre: '', confirmedSources: [],
    fuente: 'FUENTE ORIGINAL', sourceMigrationVersion: 'FUENTE_FISICA_INSTITUCIONAL_2026_V1' };
  InstitutionService.repo = { async getInstitution() { return structuredClone(record); },
    async update(value) { record = structuredClone(value); return value; } };
  AuditService.record = async event => event;
  try {
    const denied = await rejects(() => InstitutionService.updateInstitution({ nombre: record.nombre, dre: 'DRE-A' }));
    const saved = await InstitutionService.updateInstitution({ nombre: record.nombre, dre: 'DRE-A' },
      'SECRETARIA_LOCAL', { confirmPendingSources: ['dre'] });
    check('T-DB01-17', 'Confirmación de pendiente exige checkbox/UI y conserva procedencia',
      denied && saved.confirmedSources.includes('institution.dre') &&
      saved.sourceMigrationVersion === 'FUENTE_FISICA_INSTITUCIONAL_2026_V1' &&
      layoutSource.includes("document.getElementById('inst-confirm-source')?.checked") &&
      layoutSource.includes('sourceConfirmation.checked = false'));
  } finally {
    InstitutionService.repo = originalRepo;
    AuditService.record = originalAudit;
  }
  const passed = results.filter(item => item.passed).length;
  const failed = results.length - passed;
  console.log(`RESUMEN DOCUMENT-BINDING-01: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}`);
  return { suite: 'DOCUMENT-BINDING-01', total: results.length, passed, failed };
}
module.exports = { runDocumentBinding01Tests };
if (require.main === module) runDocumentBinding01Tests().then(result => { if (result.failed) process.exitCode = 1; });
