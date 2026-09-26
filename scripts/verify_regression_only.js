const path = require('path');
const { fork } = require('child_process');

const SAFE_REGRESSION_FILES = [
  'app_v2_candidate_01.regression.js',
  'attendance_engine_v2_07.regression.js',
  'demo_nomina_hotfix_10.regression.js',
  'demo_operational_mode_09.regression.js',
  'document_renderer_build_02_a.regression.js',
  'document_renderer_build_02_b.regression.js',
  'document_renderer_build_02_c.regression.js',
  'document_renderer_build_02_d.regression.js',
  'document_renderer_build_02_e.regression.js',
  'document_renderer_build_02_f.regression.js',
  'document_renderer_build_02_g.regression.js',
  'edge_physical_acceptance_05.regression.js',
  'gate_v2_context_authority_01.regression.js',
  'mvp_document_pagination_and_registry_hotfix_11.regression.js',
  'mvp_nomina_continuation_physical_12.regression.js',
  'night_document_build_01.regression.js',
  'night_v2_end_to_end_hardening_03.regression.js',
  'physical_qa_corrections_06.regression.js',
  'priority_production_mvp_08.regression.js',
  'v2_functional_parity_01.regression.js'
];

function runSuite(filename) {
  return new Promise((resolve, reject) => {
    const child = fork(path.join(__dirname, 'run_single_suite.js'), [filename], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    let result = null;
    child.on('message', msg => { result = msg; });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0 && result) {
        resolve(result);
      } else {
        reject(new Error(`Suite ${filename} exited with code ${code}`));
      }
    });
  });
}

(async () => {
  const results = [];
  for (const filename of SAFE_REGRESSION_FILES) {
    console.log(`\n========================================\n[RUNNER] Suite: ${filename}\n========================================`);
    const result = await runSuite(filename);
    results.push(result);
    // Pausa breve para liberar puertos en Windows
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  console.log('\n==================================================');
  console.log('TABLA DE REGRESIÓN SEGURA V2 / DEMO / LAB (20 SUITES)');
  console.log('==================================================');
  console.table(results);
  const total = results.reduce((sum, row) => sum + row.total, 0);
  const passed = results.reduce((sum, row) => sum + row.passed, 0);
  const failed = results.reduce((sum, row) => sum + row.failed, 0);
  console.log(`REGRESSION_ONLY ${passed}/${total}, failed=${failed}, suites=${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
