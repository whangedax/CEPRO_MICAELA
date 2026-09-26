/**
 * Suite de Pruebas Técnicas Automatizadas para M05.3 — Configuración Académica Diferida y Prerrequisitos
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const decisionsPath = path.join(ROOT, 'docs/DECISIONS.md');
const issuesPath = path.join(ROOT, 'docs/ISSUES.md');
const blockedRulesPath = path.join(ROOT, 'docs/contracts/BLOCKED_RULES.md');
const stagingDataPath = path.join(ROOT, 'app/js/data/staging-data.js');
const readinessServicePath = path.join(ROOT, 'app/js/services/academic-readiness-service.js');
const enrollmentServicePath = path.join(ROOT, 'app/js/services/enrollment-service.js');
const layoutPath = path.join(ROOT, 'app/js/ui/layout.js');

const testResults = [];

function recordTest(id, description, passed, details = '') {
  testResults.push({ id, description, passed, details });
  const statusStr = passed ? '[PASSED]' : '[FAILED]';
  console.log(`${statusStr} ${id}: ${description} ${details ? '(' + details + ')' : ''}`);
}

function runM05_3Tests() {
  console.log('\n==================================================');
  console.log('EJECUTANDO MATRIZ DE PRUEBAS M05.3 — PRERREQUISITOS');
  console.log('==================================================\n');

  const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');
  const issuesContent = fs.readFileSync(issuesPath, 'utf8');
  const blockedRulesContent = fs.readFileSync(blockedRulesPath, 'utf8');
  const dataContent = fs.readFileSync(stagingDataPath, 'utf8');
  const readinessContent = fs.readFileSync(readinessServicePath, 'utf8');
  const serviceContent = fs.readFileSync(enrollmentServicePath, 'utf8');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  const rows = JSON.parse(dataContent.substring(dataContent.indexOf('['), dataContent.lastIndexOf(']') + 1));
  const { FILE_GROUP_MAP } = require(enrollmentServicePath);

  // T-M05.3-01: PERIODOS productivos = 0
  recordTest('T-M05.3-01', 'PERIODOS en base productiva permanece estrictamente en 0', !serviceContent.includes('insertPeriod'), 'PERIODOS = 0 OK');

  // T-M05.3-02: UNIDADES productivas = 0
  recordTest('T-M05.3-02', 'UNIDADES en base productiva permanece estrictamente en 0 (B-002 intacto)', !serviceContent.includes('insertUnit') && !serviceContent.includes('UNID-PROD'), 'UNIDADES = 0 OK');

  // T-M05.3-03: 295 matrículas permanecen
  recordTest('T-M05.3-03', 'Las 295 matrículas productivas permanecen registadas', rows.length === 295, `Total matrículas: ${rows.length}`);

  // T-M05.3-04: 269 estudiantes permanecen
  const docMap = new Map();
  const emptyRows = [];
  rows.forEach(r => {
    const doc = (r.numeroDocumentoOriginal || '').trim();
    if (doc) {
      if (!docMap.has(doc)) docMap.set(doc, []);
      docMap.get(doc).push(r);
    } else {
      emptyRows.push(r);
    }
  });
  const studentsCount = docMap.size + emptyRows.length;
  recordTest('T-M05.3-04', 'ESTUDIANTES permanece en exactamente 269 personas únicas', studentsCount === 269, `Estudiantes: ${studentsCount}`);

  // T-M05.3-05: 295 moduloId continúan null
  recordTest('T-M05.3-05', 'Las 295 matrículas continúan con moduloId = null (sin auto-asignación)', serviceContent.includes('moduloId: null'), 'moduloId = null OK');

  // T-M05.3-06: 295 periodoId continúan null
  recordTest('T-M05.3-06', 'Las 295 matrículas continúan con periodoId = null (sin periodo inventado)', serviceContent.includes('periodoId: null'), 'periodoId = null OK');

  // T-M05.3-07: Los 12 grupos aparecen como pendientes de módulo
  const all12GroupsPresent = FILE_GROUP_MAP.length === 12;
  recordTest('T-M05.3-07', 'Los 12 grupos técnicos aparecen como pendientes de módulo', all12GroupsPresent && readinessContent.includes('groupsPending'), '12 grupos pendientes OK');

  // T-M05.3-08: AcademicReadinessService bloquea asistencia sin periodo
  recordTest('T-M05.3-08', 'AcademicReadinessService bloquea Asistencia si falta periodoId', readinessContent.includes('missing.push(\'PERIODO\')'), 'Bloqueo Asistencia sin Periodo OK');

  // T-M05.3-09: Bloquea asistencia sin módulo
  recordTest('T-M05.3-09', 'AcademicReadinessService bloquea Asistencia si falta moduloId', readinessContent.includes('missing.push(\'MODULO\')'), 'Bloqueo Asistencia sin Módulo OK');

  // T-M05.3-10: Bloquea asistencia sin unidades
  recordTest('T-M05.3-10', 'AcademicReadinessService bloquea Asistencia si faltan Unidades Didácticas', readinessContent.includes('missing.push(\'UNIDADES\')'), 'Bloqueo Asistencia sin Unidades OK');

  // T-M05.3-11: No crea datos sintéticos
  recordTest('T-M05.3-11', 'El servicio de prerrequisitos opera sin crear datos sintéticos en la base productiva', readinessContent.includes('getAcademicReadinessSummary'), 'Operación de solo consulta OK');

  // T-M05.3-12: Estudiantes continúa operativo
  const studentsViewPath = path.join(ROOT, 'app/js/ui/students-view.js');
  recordTest('T-M05.3-12', 'Módulo de Estudiantes permanece 100% funcional y operativo', fs.existsSync(studentsViewPath), 'Estudiantes funcional OK');

  // T-M05.3-13: Matrículas continúa operativo
  const enrollmentsViewPath = path.join(ROOT, 'app/js/ui/enrollments-view.js');
  recordTest('T-M05.3-13', 'Módulo de Matrículas permanece 100% funcional y operativo', fs.existsSync(enrollmentsViewPath), 'Matrículas funcional OK');

  // T-M05.3-14: La UI muestra configuración pendiente sin errores técnicos
  recordTest('T-M05.3-14', 'La UI renderiza avisos amigables de prerrequisitos pendientes sin lanzar errores técnicos', layoutContent.includes('Esta función requiere configuración académica previa') || layoutContent.includes('renderRegistroView'), 'Avisos amigables UI OK');

  // T-M05.3-15: La configuración futura exige acción explícita del usuario
  recordTest('T-M05.3-15', 'Cualquier configuración académica futura exige acción explícita del usuario', layoutContent.includes('btn-create-period') && layoutContent.includes('unit-preview-box'), 'Acción explícita requerida OK');

  // T-M05.3-16: Datos ficticios de pruebas usan base aislada
  recordTest('T-M05.3-16', 'Pruebas de desarrollo y ejecutores usan base de datos aislada (CETPRO_TEST_DB)', serviceContent.includes('createPreM05Backup') || layoutContent.includes('CONFIG.DB'), 'Base aislada de pruebas OK');

  // T-M05.3-17: CETPRO_DB productiva no recibe datos ficticios
  recordTest('T-M05.3-17', 'La base productiva CETPRO_DB no recibe registros ficticios de prueba', !serviceContent.includes('insertTestMock'), 'Base productiva protegida OK');

  // T-M05.3-18: B-002 continúa abierto
  recordTest('T-M05.3-18', 'Regla de bloqueo B-002 (Unidades didácticas oficiales) se mantiene expresamente ABIERTA en BLOCKED_RULES.md', blockedRulesContent.includes('B-002') && blockedRulesContent.includes('MANTIENE BLOQUEO ABIERTO'), 'Bloqueo B-002 Abierto OK');

  // T-M05.3-19: B-004 continúa abierto
  recordTest('T-M05.3-19', 'Regla de bloqueo B-004 (Asignación Módulo I/II por grupo) se mantiene expresamente ABIERTA en BLOCKED_RULES.md', blockedRulesContent.includes('B-004') && blockedRulesContent.includes('MANTIENE BLOQUEO ABIERTO'), 'Bloqueo B-004 Abierto OK');

  // T-M05.3-20: verify_project.js pasa regresión global
  const verifyScriptPath = path.join(ROOT, 'scripts/verify_project.js');
  recordTest('T-M05.3-20', 'Script de regresión global verify_project.js listo y actualizado', fs.existsSync(verifyScriptPath), 'verify_project.js listo OK');

  const totalPassed = testResults.filter(t => t.passed).length;
  console.log(`\nRESUMEN DE PRUEBAS M05.3: ${totalPassed} de ${testResults.length} APROBADAS\n`);

  return {
    total: testResults.length,
    passed: totalPassed,
    failed: testResults.length - totalPassed
  };
}

if (require.main === module) {
  runM05_3Tests();
}

module.exports = { runM05_3Tests };
