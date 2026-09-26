const fs = require('fs');
const path = require('path');
const { URL: NodeURL, pathToFileURL } = require('url');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const SERVICE_PATH = path.join(ROOT, 'app/js/services/document-data-service.js');
const ENGINE_PATH = path.join(ROOT, 'app/js/services/pdf-template-engine.js');
const VIEW_PATH = path.join(ROOT, 'app/js/ui/documents-view.js');
const STAGING_PATH = path.join(ROOT, 'app/js/data/staging-data.js');
const STUDENT_BUILDER_PATH = path.join(ROOT, 'app/js/services/productive-import-service.js');
const ENROLLMENT_BUILDER_PATH = path.join(ROOT, 'app/js/services/enrollment-service.js');
const CATALOG_PATH = path.join(ROOT, 'app/js/services/catalog-service.js');

const results = [];
function recordTest(id, description, passed, detail = '') {
  results.push({ id, description, passed });
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

function buildReadOnlyDependencies(students, enrollments, programs, institution) {
  let writeAttempts = 0;
  let moduleReads = 0;
  let periodReads = 0;
  const studentMap = new Map(students.map(item => [item.id, item]));
  const enrollmentMap = new Map(enrollments.map(item => [item.id, item]));
  const programMap = new Map(programs.map(item => [item.id, item]));
  const forbiddenWrite = async () => { writeAttempts += 1; throw new Error('Escritura no permitida'); };

  const enrollmentRepo = {
    async getById(id) { return enrollmentMap.get(id) || null; },
    async searchEnrollments(query = '') {
      const q = String(query).toLowerCase();
      return enrollments.filter(item => [
        item.id, item.estudianteDocumento, item.estudianteNombreCompleto,
        item.programaNombre, item.grupoCode
      ].some(value => String(value || '').toLowerCase().includes(q)));
    },
    create: forbiddenWrite, update: forbiddenWrite, delete: forbiddenWrite
  };
  const studentRepo = {
    async getById(id) { return studentMap.get(id) || null; },
    create: forbiddenWrite, update: forbiddenWrite, delete: forbiddenWrite
  };
  const programRepo = {
    async getById(id) { return programMap.get(id) || null; },
    create: forbiddenWrite, update: forbiddenWrite, delete: forbiddenWrite
  };
  const moduleRepo = {
    async getById() { moduleReads += 1; return null; },
    create: forbiddenWrite, update: forbiddenWrite, delete: forbiddenWrite
  };
  const periodRepo = {
    async getById() { periodReads += 1; return null; },
    create: forbiddenWrite, update: forbiddenWrite, delete: forbiddenWrite
  };
  const institutionService = {
    async getInstitutionProfile() { return { ...institution }; },
    updateInstitution: forbiddenWrite
  };

  return {
    dependencies: { enrollmentRepo, studentRepo, programRepo, moduleRepo, periodRepo, institutionService },
    counters: {
      get writeAttempts() { return writeAttempts; },
      get moduleReads() { return moduleReads; },
      get periodReads() { return periodReads; }
    }
  };
}

async function runM12_2Tests() {
  results.length = 0;
  console.log('\n==================================================');
  console.log('EJECUTANDO PRUEBAS M12.2A — DOCUMENT DATA SERVICE');
  console.log('==================================================\n');

  const stamp = Date.now();
  const [{ STAGING_DATA }, { ProductiveImportService }, { EnrollmentService }, catalogModule, serviceModule] = await Promise.all([
    import(`${pathToFileURL(STAGING_PATH).href}?m12_2=${stamp}`),
    import(`${pathToFileURL(STUDENT_BUILDER_PATH).href}?m12_2=${stamp}`),
    import(`${pathToFileURL(ENROLLMENT_BUILDER_PATH).href}?m12_2=${stamp}`),
    import(`${pathToFileURL(CATALOG_PATH).href}?m12_2=${stamp}`),
    import(`${pathToFileURL(SERVICE_PATH).href}?m12_2=${stamp}`)
  ]);

  const builtStudents = ProductiveImportService.buildStudentsFromStaging(STAGING_DATA);
  const linkedStaging = Array.from(builtStudents.updatedStagingItemsMap.values());
  const builtEnrollments = EnrollmentService.buildEnrollmentsFromStaging(linkedStaging);
  const students = builtStudents.newStudents;
  const enrollments = builtEnrollments.newEnrollments;
  const programs = catalogModule.OFFICIAL_CATALOG_SEED.map(item => ({ id: item.id, codigo: item.codigo, nombre: item.nombre }));
  const institution = {
    id: 'INST-001',
    nombre: 'CETPRO CENTRAL M12.2A',
    tipoGestion: 'PÚBLICA',
    resolucion: 'R.D. M12.2A'
  };
  const readOnly = buildReadOnlyDependencies(students, enrollments, programs, institution);
  const service = new serviceModule.DocumentDataService(readOnly.dependencies);
  const studentMap = new Map(students.map(item => [item.id, item]));
  const enrollmentCounts = new Map();
  enrollments.forEach(item => enrollmentCounts.set(item.estudianteId, (enrollmentCounts.get(item.estudianteId) || 0) + 1));

  const caseAEnrollment = enrollments.find(item => {
    const student = studentMap.get(item.estudianteId);
    return student?.numeroDocumento && student?.fechaNacimiento;
  });
  const caseBEnrollment = enrollments.find(item => !studentMap.get(item.estudianteId)?.fechaNacimiento);
  const caseCEnrollments = enrollments.filter(item => enrollmentCounts.get(item.estudianteId) > 1);
  const caseCEnrollment = caseCEnrollments[0];
  const noDocumentEnrollment = enrollments.find(item => !studentMap.get(item.estudianteId)?.numeroDocumento);

  const searchResult = await service.searchEnrollments(caseAEnrollment.id);
  recordTest('T-M12.2-A', 'La búsqueda devuelve una matrícula real existente', searchResult.some(item => item.id === caseAEnrollment.id));

  const contextA = await service.buildEnrollmentContext(caseAEnrollment.id);
  recordTest('T-M12.2-B', 'buildEnrollmentContext resuelve la matrícula seleccionada', contextA.enrollment.id === caseAEnrollment.id);
  recordTest('T-M12.2-C', 'El estudiante se resuelve por estudianteId', contextA.student.id === caseAEnrollment.estudianteId);
  recordTest('T-M12.2-D', 'El programa se resuelve por programaId', contextA.program.id === caseAEnrollment.programaId);
  recordTest('T-M12.2-E', 'La institución proviene del servicio institucional inyectado', contextA.institution.id === 'INST-001' && contextA.institution.nombre === institution.nombre);
  recordTest('T-M12.2-F', 'moduloId null produce module vacío', caseAEnrollment.moduloId === null && Object.keys(contextA.module).length === 0 && readOnly.counters.moduleReads === 0);
  recordTest('T-M12.2-G', 'periodoId null produce period vacío', caseAEnrollment.periodoId === null && Object.keys(contextA.period).length === 0 && readOnly.counters.periodReads === 0);
  recordTest('T-M12.2-H', 'B-002 mantiene units vacío', Array.isArray(contextA.units) && contextA.units.length === 0);
  recordTest('T-M12.2-I', 'El documento conserva el texto exacto del estudiante autoritativo', contextA.student.numeroDocumento === studentMap.get(caseAEnrollment.estudianteId).numeroDocumento);

  const noDocumentContext = await service.buildEnrollmentContext(noDocumentEnrollment.id);
  recordTest('T-M12.2-J', 'Un estudiante sin documento produce cadena vacía', noDocumentContext.student.numeroDocumento === '');

  const contextB = await service.buildEnrollmentContext(caseBEnrollment.id);
  recordTest('T-M12.2-K', 'Un nacimiento ausente produce cadena vacía', contextB.student.fechaNacimiento === '');

  installBrowserFixture();
  const engineModule = await import(`${pathToFileURL(ENGINE_PATH).href}?m12_2=${stamp}`);
  const engine = new engineModule.PdfTemplateEngine();
  const missingDateBlob = await engine.renderTMPL01({
    institution: {}, program: {},
    studentsList: [{ apellidosNombres: 'CASO SIN FECHA M12.2A', sexo: 'H', fechaNacimiento: '' }]
  });
  const missingDateText = await extractText(await missingDateBlob.arrayBuffer());
  recordTest('T-M12.2-L', 'El renderer no inventa 15/03/2005 cuando falta fecha', !missingDateText.includes('15/03/2005') && !fs.readFileSync(ENGINE_PATH, 'utf8').includes('15/03/2005'));

  const beforeCounts = { students: students.length, enrollments: enrollments.length };
  const secondCaseCEnrollment = caseCEnrollments.find(item => item.id !== caseCEnrollment.id && item.estudianteId === caseCEnrollment.estudianteId);
  const contextC1 = await service.buildEnrollmentContext(caseCEnrollment.id);
  const contextC2 = await service.buildEnrollmentContext(secondCaseCEnrollment.id);
  recordTest('T-M12.2-M', 'Tres casos reales se resuelven sin escrituras', readOnly.counters.writeAttempts === 0 && contextB.source.enrollmentId && contextC1.source.enrollmentId);
  recordTest('T-M12.2-N', 'La cantidad de estudiantes permanece en 269', beforeCounts.students === 269 && students.length === 269);
  recordTest('T-M12.2-O', 'La cantidad de matrículas permanece en 295', beforeCounts.enrollments === 295 && enrollments.length === 295);
  recordTest('T-M12.2-P', 'No se crea periodo ni se asignan módulo/periodo',
    enrollments.every(item => item.moduloId === null && item.periodoId === null) && readOnly.counters.periodReads === 0);

  const { resolveDocumentFields } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-field-contract.js')).href);
  const { buildResolvedFieldSet } = await import(pathToFileURL(path.join(ROOT, 'app/js/services/document-binding-service.js')).href);
  const productiveBlob = await engine.renderTMPL02({ ...contextA,
    resolvedFieldSet: buildResolvedFieldSet(resolveDocumentFields('TMPL-02', contextA)) });
  const productiveText = await extractText(await productiveBlob.arrayBuffer());
  recordTest('T-M12.2-Q', 'TMPL-02 recibe y renderiza el contexto productivo',
    productiveBlob.type === 'application/pdf' && productiveText.includes(contextA.student.numeroDocumento) &&
    productiveText.includes(contextA.student.apellidosNombres) && productiveText.includes(contextA.program.nombre));

  const viewSource = fs.readFileSync(VIEW_PATH, 'utf8');
  recordTest('T-M12.2-R', 'TEST-0001 no es el valor predeterminado de Secretaría',
    !viewSource.includes('TEST-0001') &&
    !viewSource.includes('VISTA TÉCNICA TEST_ONLY') &&
    viewSource.includes('this.selectedEnrollmentId = null') &&
    viewSource.includes('buildEnrollmentContext(enrollmentId)'));

  const tmpl01Doc = await PDFDocument.load(await missingDateBlob.arrayBuffer());
  recordTest('T-M12.2-S', 'TMPL-01 continúa generando PDF de una página', missingDateBlob.type === 'application/pdf' && tmpl01Doc.getPageCount() === 1);

  recordTest('T-M12.2-REAL-3', 'Caso con múltiples matrículas conserva identidad y programa por matrícula',
    contextC1.student.id === contextC2.student.id &&
    contextC1.source.enrollmentId !== contextC2.source.enrollmentId &&
    contextC1.program.id === contextC1.enrollment.programaId &&
    contextC2.program.id === contextC2.enrollment.programaId,
    'documentos enmascarados en logs');

  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  console.log(`\nRESUMEN M12.2A: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}\n`);
  return { suite: 'M12.2A', total: results.length, passed, failed };
}

if (require.main === module) {
  runM12_2Tests().then(result => {
    if (result.failed > 0) process.exitCode = 1;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runM12_2Tests };
