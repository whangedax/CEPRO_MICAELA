const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const required = [
  'docs/PROJECT_STATE.md',
  'docs/ROADMAP.md',
  'docs/OFFICIAL_CATALOG.md',
  'docs/M02_TECHNICAL_REPORT.md',
  'docs/M03_TECHNICAL_REPORT.md',
  'sources/raw/CARRERAS.jpeg',
  'sources/templates/CATALOGO_PLANTILLAS.md',
  'sources/templates/audit/AUDITORIA_REPLICAS.csv',
  'sources/templates/audit/LEEME_PRIMERO.txt',
  'app/index.html',
  'app/css/app.css',
  'app/css/components.css',
  'app/css/responsive.css',
  'app/css/print.css',
  'app/js/app.js',
  'app/js/config.js',
  'app/js/router.js',
  'app/js/db/database.js',
  'app/js/db/schema.js',
  'app/js/services/audit-service.js',
  'app/js/services/error-service.js',
  'app/js/services/storage-service.js',
  'app/js/services/institution-service.js',
  'app/js/services/catalog-service.js',
  'app/js/services/period-service.js',
  'app/js/services/config-service.js',
  'app/js/services/student-service.js',
  'app/js/services/academic-readiness-service.js',
  'app/js/repositories/base-repository.js',
  'app/js/repositories/institution-repository.js',
  'app/js/repositories/program-repository.js',
  'app/js/repositories/module-repository.js',
  'app/js/repositories/period-repository.js',
  'app/js/repositories/config-repository.js',
  'app/js/repositories/student-repository.js',
  'app/js/repositories/staging-repository.js',
  'app/js/services/reconciliation-service.js',
  'app/js/services/staging-service.js',
  'app/js/data/staging-data.js',
  'docs/M04_TECHNICAL_REPORT.md',
  'docs/M04_RECONCILIATION_REPORT.md',
  'docs/M04_ROW_TRACE.md',
  'docs/M04_1_FINAL_AUDIT.md',
  'docs/M04_2_IDENTITY_AUDIT.md',
  'docs/M04_3_PRODUCTIVE_IMPORT_REPORT.md',
  'docs/M04_4_POST_IMPORT_AUDIT.md',
  'docs/M05_TECHNICAL_REPORT.md',
  'docs/M05_ENROLLMENT_MAPPING.md',
  'docs/M05_1_POST_ENROLLMENT_AUDIT.md',
  'docs/M05_2_GROUP_RECONCILIATION.md',
  'docs/M05_3_DEFERRED_ACADEMIC_CONFIGURATION.md',
  'docs/M05_4_READINESS_AUDIT.md',
  'docs/M06_TECHNICAL_REPORT.md',
  'docs/M06_ATTENDANCE_MODEL.md',
  'docs/M06_TEST_ENVIRONMENT.md',
  'docs/M06_1_ATTENDANCE_SESSION_AUDIT.md',
  'docs/M06_2_SESSION_SEMANTICS_AUDIT.md',
  'docs/M06_3_REGRESSION_AND_SESSION_ID_AUDIT.md',
  'docs/M05_GROUP_CONFIGURATION.md',
  'app/js/repositories/enrollment-repository.js',
  'app/js/repositories/attendance-repository.js',
  'app/js/services/productive-import-service.js',
  'app/js/services/enrollment-service.js',
  'app/js/services/attendance-service.js',
  'tests/m04_tests.js',
  'tests/m04_3_tests.js',
  'tests/m04_4_tests.js',
  'tests/m05_tests.js',
  'tests/m05_1_tests.js',
  'tests/m05_2_tests.js',
  'tests/m05_3_tests.js',
  'tests/m05_4_tests.js',
  'tests/m06_tests.js',
  'tests/m06_1_tests.js',
  'tests/m06_2_tests.js',
  'tests/m06_3_tests.js',
  'tests/m07_tests.js',
  'tests/m07_1_tests.js',
  'tests/m08_tests.js',
  'app/js/repositories/evaluation-repository.js',
  'app/js/repositories/efsrt-repository.js',
  'app/js/services/evaluation-service.js',
  'app/js/services/efsrt-service.js',
  'app/js/ui/evaluation-view.js',
  'app/js/ui/efsrt-view.js',
  'docs/M07_TECHNICAL_REPORT.md',
  'docs/M07_EVALUATION_MODEL.md',
  'docs/M07_TEST_ENVIRONMENT.md',
  'docs/M07_1_EVALUATION_IDEMPOTENCY_AUDIT.md',
  'docs/M08_TECHNICAL_REPORT.md',
  'docs/M08_EFSRT_MODEL.md',
  'docs/M08_TEST_ENVIRONMENT.md',
  'docs/M09_TECHNICAL_REPORT.md',
  'docs/M09_CLOSURE_READINESS_MODEL.md',
  'docs/M09_TEST_ENVIRONMENT.md',
  'docs/M10_TECHNICAL_REPORT.md',
  'docs/M10_TEMPLATE_REGISTRY.md',
  'docs/M10_FIELD_MAPPING_MODEL.md',
  'docs/M10_RENDER_ENGINE.md',
  'docs/M10_TEST_ENVIRONMENT.md',
  'app/js/services/academic-closure-readiness-service.js',
  'app/js/services/staging-recovery-service.js',
  'app/js/services/template-registry.js',
  'app/js/services/transform-engine.js',
  'app/js/services/field-mapping-engine.js',
  'app/js/services/document-service.js',
  'app/js/services/document-render-engine.js',
  'app/js/ui/closure-view.js',
  'app/js/ui/documents-view.js',
  'app/js/services/document-field-contract.js',
  'app/js/services/document-validation-service.js',
  'docs/DOCUMENT_FIELD_COVERAGE.md',
  'tests/results/DOCUMENT_CONTRACT_01_TEST_RESULT.md',
  'scripts/audit_document_source_labels.py',
  'app/js/data/institutional-source-2026.js',
  'app/data/TMPL02_PDF_FIELDS.json',
  'app/js/services/pdf-template-engine.js',
  'tests/m09_tests.js',
  'tests/m10_tests.js',
  'tests/m11_tests.js',
  'tests/m12_audit_tests.js',
  'tests/m12_1_tests.js',
  'tests/m12_1b_tests.js',
  'tests/m12_1c_tests.js',
  'tests/m12_2_tests.js',
  'tests/m12_2a_ux_tests.js',
  'tests/results/M12_2A_UX_TEST_RESULT.md',
  'tests/integration_gate_01_tests.js',
  'tests/document_contract_01_tests.js',
  'scripts/audit_integration_gate_runtime.js',
  'docs/INTEGRATION_GATE_01_OPERATIONAL_AUDIT.md',
  'tests/results/INTEGRATION_GATE_01_TEST_RESULT.md',
  'tests/recovery_tests.js',
  'app/js/ui/layout.js',
  'app/js/ui/notifications.js',
  'app/js/ui/students-view.js',
  'app/js/ui/enrollments-view.js',
  'app/js/ui/attendance-view.js',
  'app/js/services/runtime-target-service.js',
  'app/js/services/demo-runtime-service.js',
  'app/js/services/document-pagination-policy.js',
  'app/js/ui/demo-dashboard-view.js',
  'app/js/ui/demo-attendance-view.js',
  'app/js/ui/demo-evaluation-view.js',
  'docs/DEMO_MODE_GUIDE.md',
  'tests/demo_nomina_hotfix_10.regression.js',
  'tests/results/DEMO_NOMINA_HOTFIX_10_TEST_RESULT.md',
  'tests/mvp_document_pagination_and_registry_hotfix_11.regression.js',
  'tests/results/MVP_DOCUMENT_PAGINATION_AND_REGISTRY_HOTFIX_11_TEST_RESULT.md',
  'tests/mvp_nomina_continuation_physical_12.regression.js',
  'tests/results/MVP_NOMINA_CONTINUATION_PHYSICAL_12_TEST_RESULT.md',
  'docs/MVP_NOMINA_CONTINUATION_PHYSICAL_12_REPORT.md',
  'tests/demo_operational_mode_09.regression.js',
  'tests/results/DEMO_OPERATIONAL_MODE_09_TEST_RESULT.md'
];

const missing = required.filter(p => !fs.existsSync(path.join(ROOT, p)));
console.log('ROOT:', ROOT);
if (missing.length > 0) {
  console.log('FALTAN:', missing);
  process.exit(1);
}

const xlsxDir = path.join(ROOT, 'sources/templates/originals/xlsx');
const pngDir = path.join(ROOT, 'sources/templates/previews');

const xlsx = fs.existsSync(xlsxDir) ? fs.readdirSync(xlsxDir).filter(f => f.endsWith('.xlsx')) : [];
const png = fs.existsSync(pngDir) ? fs.readdirSync(pngDir).filter(f => f.endsWith('.png')) : [];

if (xlsx.length !== 21 || png.length !== 21) {
  console.error(`Plantillas incompletas: XLSX=${xlsx.length} PNG=${png.length}`);
  process.exit(1);
}

console.log('Estructura mínima M00-M11: OK');
console.log('Plantillas XLSX:', xlsx.length);
console.log('Vistas PNG:', png.length);

// Ejecutar Suites de Pruebas M01 a M11 + RECOVERY-01
const { runM01Tests } = require('../tests/m01_tests.js');
const { runM02Tests } = require('../tests/m02_tests.js');
const { runM03Tests } = require('../tests/m03_tests.js');
const { runM04Tests } = require('../tests/m04_tests.js');
const { runM04_3Tests } = require('../tests/m04_3_tests.js');
const { runM04_4Tests } = require('../tests/m04_4_tests.js');
const { runM05Tests } = require('../tests/m05_tests.js');
const { runM05_1Tests } = require('../tests/m05_1_tests.js');
const { runM05_2Tests } = require('../tests/m05_2_tests.js');
const { runM05_3Tests } = require('../tests/m05_3_tests.js');
const { runM05_4Tests } = require('../tests/m05_4_tests.js');
const { runM06Tests } = require('../tests/m06_tests.js');
const { runM06_1Tests } = require('../tests/m06_1_tests.js');
const { runM06_2Tests } = require('../tests/m06_2_tests.js');
const { runM06_3Tests } = require('../tests/m06_3_tests.js');
const { runM07Tests } = require('../tests/m07_tests.js');
const { runM07_1Tests } = require('../tests/m07_1_tests.js');
const { runM08Tests } = require('../tests/m08_tests.js');
const { runM09Tests } = require('../tests/m09_tests.js');
const { runM10Tests } = require('../tests/m10_tests.js');
const { runM11Tests } = require('../tests/m11_tests.js');
const { runM11_POC_Tests } = require('../tests/m11_poc_tests.js');
const { runM12_Audit } = require('../tests/m12_audit_tests.js');
const { runM12_1Tests } = require('../tests/m12_1_tests.js');
const { runM12_1BTests } = require('../tests/m12_1b_tests.js');
const { runM12_1CTests } = require('../tests/m12_1c_tests.js');
const { runM12_2Tests } = require('../tests/m12_2_tests.js');
const { runM12_2A_UXTests } = require('../tests/m12_2a_ux_tests.js');
const { runIntegrationGate01Tests } = require('../tests/integration_gate_01_tests.js');
const { runDocumentContract01Tests } = require('../tests/document_contract_01_tests.js');
const { runConfigInstitution01Tests } = require('../tests/config_institution_01_tests.js');
const { runDocumentBinding01Tests } = require('../tests/document_binding_01_tests.js');
const { runRecoveryTests } = require('../tests/recovery_tests.js');

(async () => {
  console.log('\n==================================================');
  console.log('EJECUTANDO COMPROBACIÓN INTEGRAL DEL PROYECTO');
  console.log('==================================================\n');

  const suites = [
    { name: 'M01', fn: runM01Tests },
    { name: 'M02', fn: runM02Tests },
    { name: 'M03', fn: runM03Tests },
    { name: 'M04', fn: runM04Tests },
    { name: 'M04.3', fn: runM04_3Tests },
    { name: 'M04.4', fn: runM04_4Tests },
    { name: 'M05', fn: runM05Tests },
    { name: 'M05.1', fn: runM05_1Tests },
    { name: 'M05.2', fn: runM05_2Tests },
    { name: 'M05.3', fn: runM05_3Tests },
    { name: 'M05.4', fn: runM05_4Tests },
    { name: 'M06', fn: runM06Tests },
    { name: 'M06.1', fn: runM06_1Tests },
    { name: 'M06.2', fn: runM06_2Tests },
    { name: 'M06.3', fn: runM06_3Tests },
    { name: 'M07', fn: runM07Tests },
    { name: 'M07.1', fn: runM07_1Tests },
    { name: 'M08', fn: runM08Tests },
    { name: 'M09', fn: runM09Tests },
    { name: 'M10', fn: runM10Tests },
    { name: 'M11', fn: runM11Tests },
    { name: 'M11-POC', fn: runM11_POC_Tests },
    { name: 'M12-AUDIT', fn: runM12_Audit },
    { name: 'M12.1', fn: runM12_1Tests },
    { name: 'M12.1B', fn: runM12_1BTests },
    { name: 'M12.1C', fn: runM12_1CTests },
    { name: 'M12.2A', fn: runM12_2Tests },
    { name: 'M12.2A-UX', fn: runM12_2A_UXTests },
    { name: 'INTEGRATION-GATE-01', fn: runIntegrationGate01Tests },
    { name: 'DOCUMENT-CONTRACT-01', fn: runDocumentContract01Tests },
    { name: 'CONFIG-INSTITUTION-01', fn: runConfigInstitution01Tests },
    { name: 'DOCUMENT-BINDING-01', fn: runDocumentBinding01Tests },
    { name: 'RECOVERY-01', fn: runRecoveryTests }
  ];
  // Stable suites opt in through a naming contract; counts come from execution.
  const regressionDir = path.resolve(__dirname, '../tests');
  for (const filename of fs.readdirSync(regressionDir).filter(name => name.endsWith('.regression.js')).sort()) {
    const suite = require(path.join(regressionDir, filename));
    if (!suite.name || typeof suite.run !== 'function' || suites.some(item => item.name === suite.name)) {
      throw new Error(`Suite de regresión inválida o duplicada: ${filename}`);
    }
    suites.push({ name: suite.name, fn: suite.run });
  }

  let grandTotalPassed = 0;
  let grandTotalFailed = 0;
  const breakdown = [];

  for (const s of suites) {
    const res = (await s.fn()) || { passed: 0, failed: 0 };
    const passed = res.passed || 0;
    const failed = res.failed || 0;
    const total = res.total || (passed + failed);
    grandTotalPassed += passed;
    grandTotalFailed += failed;
    breakdown.push({ suite: s.name, total, passed, failed });
  }

  console.log('\n==================================================');
  console.log('TABLA DESGLOSADA DE SUITES DE PRUEBAS EJECUTADAS');
  console.log('==================================================');
  console.table(breakdown);

  if (grandTotalFailed > 0) {
    console.error(`\n[ERROR VERIFY] Ocurrieron ${grandTotalFailed} fallos en las suites de pruebas.`);
    process.exit(1);
  } else {
    const firstSuite = suites[0]?.name || 'M01';
    const lastSuite = suites[suites.length - 1]?.name || '';
    console.log(`\n[ÉXITO VERIFY] Todas las pruebas ${firstSuite}-${lastSuite} pasaron al 100% (${grandTotalPassed}/${grandTotalPassed} pruebas exitosas en ${suites.length} suites).\n`);
  }
})();
