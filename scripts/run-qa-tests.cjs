/**
 * scripts/run-qa-tests.cjs
 * 
 * RUNNER DE PRUEBAS AUTOMATIZADAS AISLADAS - CEPRO_MICAELA 2.0 (Tarea 30)
 * 
 * Garantiza aislamiento absoluto y reproducibilidad:
 * 1. Inicializa un sandbox sintético limpio en dev-sandbox/data/qa-isolated.
 * 2. Levanta un servidor QA dedicado en 127.0.0.1:8089 (sin tocar dev en 8085).
 * 3. Ejecuta las suites de pruebas con TEST_API_URL y CETPRO_DATA_DIR configurados.
 * 4. Preserva 100% intacta la base de datos de desarrollo (dev-sandbox/data/cetpro.sqlite).
 * 5. Detiene limpiamente el servidor QA y libera los sockets y conexiones SQLite.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const {
  QA_DATA_DIR,
  QA_PORT,
  QA_URL,
  initQaBaseline,
  startQaServer,
} = require('../tests/helpers/qa-env.cjs');

const DEFAULT_TEST_SUITES = [
  'tests/dev-sandbox-guard.test.cjs',
  'tests/backend-integration.test.cjs',
  'tests/attendance-module.test.cjs',
  'tests/pending-changes-and-conflict.test.cjs',
  'tests/grades-module.test.cjs',
  'tests/documents-module.test.cjs',
  'tests/document-watermark-security.test.cjs',
  'tests/document-config.test.cjs',
  'tests/document-submissions.test.cjs',
  'tests/dashboards-role.test.cjs',
  'tests/students-enrollments-groups.test.cjs',
  'tests/accounts-management.test.cjs',
  'tests/academic-config-management.test.cjs',
  'tests/synchronization-management.test.cjs',
  'tests/backup-restore-management.test.cjs',
  'tests/electron-and-encrypted-backup.test.cjs',
];

async function main() {
  const cliArgs = process.argv.slice(2);
  const testFiles = cliArgs.length > 0 ? cliArgs : DEFAULT_TEST_SUITES;

  console.log('========================================================================');
  console.log('          CEPRO_MICAELA 2.0 — SUITE DE PRUEBAS QA AISLADA               ');
  console.log('========================================================================');
  console.log(`  Sandbox QA:    ${QA_DATA_DIR}`);
  console.log(`  Puerto QA:     ${QA_PORT}`);
  console.log(`  URL QA:        ${QA_URL}`);
  console.log(`  Suites:        ${testFiles.length} archivo(s)`);
  console.log('========================================================================\n');

  // 1. Inicializar sandbox QA sintético limpio e independiente
  console.log('[QA-RUNNER] 1. Inicializando datos sintéticos base en sandbox QA...');
  const initResult = initQaBaseline(QA_DATA_DIR);
  console.log(`✔ Sandbox QA preparado con éxito (Fingerprint: ${initResult.fingerprint.slice(0, 16)}...)`);

  // 2. Arrancar servidor QA dedicado en puerto 8089
  console.log('[QA-RUNNER] 2. Arrancando servidor QA dedicado en 127.0.0.1:' + QA_PORT + '...');
  const qaServer = await startQaServer({
    dataDir: QA_DATA_DIR,
    port: QA_PORT,
  });
  console.log(`✔ Servidor QA escuchando en ${qaServer.url}\n`);

  let childProcess = null;
  let exitCode = 0;

  const cleanup = async () => {
    console.log('\n[QA-RUNNER] 4. Deteniendo servidor QA y liberando recursos...');
    try {
      await qaServer.close();
      console.log('✔ Servidor QA detenido limpiamente.');
    } catch (err) {
      console.error('⚠ Error al detener servidor QA:', err.message);
    }
  };

  // Manejo de señales para evitar procesos zombies
  process.on('SIGINT', async () => {
    if (childProcess) childProcess.kill('SIGINT');
    await cleanup();
    process.exit(130);
  });

  process.on('SIGTERM', async () => {
    if (childProcess) childProcess.kill('SIGTERM');
    await cleanup();
    process.exit(143);
  });

  try {
    // 3. Ejecutar runner de pruebas nativo de Node.js
    console.log('[QA-RUNNER] 3. Ejecutando suites de pruebas automatizadas...\n');

    const nodeArgs = ['--test', '--test-concurrency=1', ...testFiles];
    const env = {
      ...process.env,
      TEST_API_URL: qaServer.url,
      CETPRO_DATA_DIR: qaServer.dataDir,
      CETPRO_PORT: String(qaServer.port),
      CETPRO_DEV_PORT: String(qaServer.port),
    };

    exitCode = await new Promise((resolve) => {
      childProcess = spawn(process.execPath, nodeArgs, {
        cwd: path.resolve(__dirname, '..'),
        env,
        stdio: 'inherit',
      });

      childProcess.on('close', (code) => {
        resolve(code ?? 0);
      });

      childProcess.on('error', (err) => {
        console.error('[QA-RUNNER] Error al ejecutar proceso de pruebas:', err);
        resolve(1);
      });
    });
  } finally {
    await cleanup();
  }

  console.log('\n========================================================================');
  if (exitCode === 0) {
    console.log('  RESULTADO: TODAS LAS PRUEBAS QA SE EJECUTARON SATISFACTORIAMENTE');
  } else {
    console.log(`  RESULTADO: FALLARON PRUEBAS (CÓDIGO DE SALIDA: ${exitCode})`);
  }
  console.log('========================================================================\n');

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('[QA-RUNNER] Error fatal en runner QA:', err);
  process.exit(1);
});
