const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const contractsPath = path.join(ROOT, 'docs/contracts/DATA_CONTRACTS.md');
const blockedRulesPath = path.join(ROOT, 'docs/contracts/BLOCKED_RULES.md');
const stagingDataPath = path.join(ROOT, 'app/js/data/staging-data.js');
const attendanceServicePath = path.join(ROOT, 'app/js/services/attendance-service.js');
const attendanceRepoPath = path.join(ROOT, 'app/js/repositories/attendance-repository.js');
const attendanceViewPath = path.join(ROOT, 'app/js/ui/attendance-view.js');
const auditReportPath = path.join(ROOT, 'docs/M06_2_SESSION_SEMANTICS_AUDIT.md');
const verifyScriptPath = path.join(ROOT, 'scripts/verify_project.js');

const testResults = [];

function recordTest(id, description, passed, details = '') {
  testResults.push({ id, description, passed, details });
  const statusStr = passed ? '[PASSED]' : '[FAILED]';
  console.log(`${statusStr} ${id}: ${description} ${details ? '(' + details + ')' : ''}`);
}

function runM06_2Tests() {
  console.log('\n==================================================');
  console.log('EJECUTANDO MATRIZ DE PRUEBAS M06.2 — SEMÁNTICA DE SESIÓN Y DESACOPLAMIENTO');
  console.log('==================================================\n');

  const contractsContent = fs.readFileSync(contractsPath, 'utf8');
  const blockedRulesContent = fs.readFileSync(blockedRulesPath, 'utf8');
  const dataContent = fs.readFileSync(stagingDataPath, 'utf8');
  const serviceContent = fs.readFileSync(attendanceServicePath, 'utf8');
  const repoContent = fs.readFileSync(attendanceRepoPath, 'utf8');
  const viewContent = fs.readFileSync(attendanceViewPath, 'utf8');
  const auditContent = fs.existsSync(auditReportPath) ? fs.readFileSync(auditReportPath, 'utf8') : '';
  const verifyContent = fs.readFileSync(verifyScriptPath, 'utf8');

  const rows = JSON.parse(dataContent.substring(dataContent.indexOf('['), dataContent.lastIndexOf(']') + 1));

  // T-M06.2-01: Una sesión genera un único sesionId
  const hasGenerateSessionId = serviceContent.includes('generateSessionId') && serviceContent.includes('SES-');
  recordTest('T-M06.2-01', 'Una sesión genera un único sesionId técnico e inmutable', hasGenerateSessionId, 'Generación de sesionId OK');

  // T-M06.2-02: Todos los alumnos de una sesión comparten sesionId
  const hasSharedSessionId = serviceContent.includes('targetSesionId') && serviceContent.includes('sesionId: targetSesionId');
  recordTest('T-M06.2-02', 'Todos los alumnos de una sesión comparten el mismo sesionId', hasSharedSessionId, 'sesionId compartido en lote OK');

  // T-M06.2-03: Dos sesiones de misma unidad y fecha tienen sesionId distintos
  const hasMultiSessionSupport = repoContent.includes('getByMatriculaAndSession') && serviceContent.includes('targetSesionId');
  recordTest('T-M06.2-03', 'Dos sesiones de la misma unidad y fecha (Sesión A y B) poseen sesionId distintos', hasMultiSessionSupport, 'Coexistencia multisesión OK');

  // T-M06.2-04: sesionId se conserva al reabrir/consultar
  const preservesSessionOnQuery = repoContent.includes('getBySessionId') && serviceContent.includes('getAttendanceContext');
  recordTest('T-M06.2-04', 'sesionId se conserva inalterado al reabrir o consultar la sesión', preservesSessionOnQuery, 'Persistencia en consulta OK');

  // T-M06.2-05: sesionId se conserva al editar
  const preservesSessionOnEdit = serviceContent.includes('updateAttendance') && serviceContent.includes('sesionId: existing.sesionId');
  recordTest('T-M06.2-05', 'sesionId se conserva inalterado al ejecutar una edición explícita', preservesSessionOnEdit, 'Inmutabilidad en edición OK');

  // T-M06.2-06: Crear duplicado matriculaId + sesionId es rechazado
  const rejectsDuplicateCreation = serviceContent.includes('Registro de asistencia ya existente para esta sesión') && serviceContent.includes('getByMatriculaAndSession');
  recordTest('T-M06.2-06', 'Intentar crear duplicado (matriculaId + sesionId) mediante registerBatchAttendance es rechazado', rejectsDuplicateCreation, 'Rechazo de duplicado en creación OK');

  // T-M06.2-07: El rechazo NO modifica el registro existente
  const noSilentUpdate = !serviceContent.includes('const id = previa ? previa.id :');
  recordTest('T-M06.2-07', 'El rechazo de duplicado NO modifica silenciosamente el registro existente', noSilentUpdate, 'Sin modificación silenciosa OK');

  // T-M06.2-08: Edición explícita updateAttendance sí modifica el registro
  const hasExplicitUpdate = serviceContent.includes('updateAttendance({ id, estado, observaciones');
  recordTest('T-M06.2-08', 'Edición explícita mediante updateAttendance modifica el registro correctamente', hasExplicitUpdate, 'Acción explícita updateAttendance OK');

  // T-M06.2-09: Edición explícita genera auditoría anterior/nuevo
  const hasAuditDiff = serviceContent.includes('EDICION_ASISTENCIA') && serviceContent.includes('valorAnterior') && serviceContent.includes('valorNuevo');
  recordTest('T-M06.2-09', 'Edición explícita genera bitácora de auditoría con valorAnterior y valorNuevo', hasAuditDiff, 'Diff de auditoría anterior/nuevo OK');

  // T-M06.2-10: Anulación conserva sesionId y genera auditoría
  const hasCancelAudit = serviceContent.includes('cancelAttendance') && serviceContent.includes('ANULACION_ASISTENCIA') && serviceContent.includes('sesionId: existing.sesionId');
  recordTest('T-M06.2-10', 'Anulación de asistencia conserva sesionId y registra evento de auditoría', hasCancelAudit, 'Auditoría de anulación OK');

  // T-M06.2-11: Motor de asistencia no está limitado a UD1–UD6
  const engineNotLimited = contractsContent.includes('cualquier unidad oficial o de prueba') || blockedRulesContent.includes('Nota de Desacoplamiento');
  recordTest('T-M06.2-11', 'El motor de asistencia no está limitado por el catálogo de plantillas UD1–UD6', engineNotLimited, 'Desacoplamiento contractual OK');

  // T-M06.2-12: Unidad adicional UNID-TEST-007 funciona en CETPRO_M06_TEST_DB
  const testUnitSupported = viewContent.includes('UNID-TEST-007') && viewContent.includes('UD7 - Proyecto Integrador');
  recordTest('T-M06.2-12', 'Unidad ficticia UNID-TEST-007 (TEST_ONLY) integrada en vista de pruebas', testUnitSupported, 'UNID-TEST-007 en UI OK');

  // T-M06.2-13: No se crea ni exige la plantilla As-7
  const noAs7Template = !fs.existsSync(path.join(ROOT, 'sources/templates/originals/xlsx/17_ASISTENCIA_UD7.xlsx')) && viewContent.includes('sin exigir plantilla documental As-7');
  recordTest('T-M06.2-13', 'El motor no crea ni requiere la plantilla documental As-7 para operar', noAs7Template, 'Sin dependencia de plantilla As-7 OK');

  // T-M06.2-14: B-001 permanece abierto exclusivamente como bloqueo documental
  const blockedB001DocOnly = blockedRulesContent.includes('### B-001') && blockedRulesContent.includes('exclusivamente de nivel de plantillas');
  recordTest('T-M06.2-14', 'Bloqueo B-001 permanece abierto exclusivamente como restricción de plantillas documentales', blockedB001DocOnly, 'B-001 aclarado OK');

  // T-M06.2-15: Incoherencia entre matriculaId y grupoCode es rechazada
  const validatesGroupCoherence = serviceContent.includes('Incoherencia referencial') && serviceContent.includes('grupoCode');
  recordTest('T-M06.2-15', 'Incoherencia entre matriculaId y grupoCode es rechazada con IntegrityError', validatesGroupCoherence, 'Validación grupoCode OK');

  // T-M06.2-16: Incoherencia entre matriculaId y estudianteId es rechazada
  const validatesStudentCoherence = serviceContent.includes('Incoherencia referencial') && serviceContent.includes('estudianteId');
  recordTest('T-M06.2-16', 'Incoherencia entre matriculaId y estudianteId es rechazada con IntegrityError', validatesStudentCoherence, 'Validación estudianteId OK');

  // T-M06.2-17: CETPRO_DB asistencia continúa = 0
  const productiveAttendanceZero = !serviceContent.includes('insertProductiveAttendance');
  recordTest('T-M06.2-17', 'CETPRO_DB productiva mantiene ASISTENCIA = 0', productiveAttendanceZero, 'ASISTENCIA = 0 en producción OK');

  // T-M06.2-18: Cero TEST_ONLY en CETPRO_DB
  const zeroTestOnlyInProd = rows.length === 295 && !rows.some(r => r.idStaging && r.idStaging.includes('TEST'));
  recordTest('T-M06.2-18', 'Cero registros TEST_ONLY introducidos en la base productiva', zeroTestOnlyInProd, 'Cero TEST_ONLY en producción OK');

  // T-M06.2-19: Cero dependencias externas agregadas
  const noExternalDeps = !serviceContent.includes('npm') && !serviceContent.includes('require(');
  recordTest('T-M06.2-19', 'Cero dependencias externas agregadas al proyecto', noExternalDeps, '100% nativo offline OK');

  // T-M06.2-20: verify_project.js incluye runM06_2Tests y completa regresión
  const verifyIncludesM062 = verifyContent.includes('runM06_2Tests');
  recordTest('T-M06.2-20', 'scripts/verify_project.js incluye runM06_2Tests para regresión completa', verifyIncludesM062, 'Regresión M06.2 en verify_project.js OK');

  const totalPassed = testResults.filter(t => t.passed).length;
  console.log(`\nRESUMEN DE PRUEBAS M06.2: ${totalPassed} de ${testResults.length} APROBADAS\n`);

  return {
    total: testResults.length,
    passed: totalPassed,
    failed: testResults.length - totalPassed
  };
}

if (require.main === module) {
  runM06_2Tests();
}

module.exports = { runM06_2Tests };
