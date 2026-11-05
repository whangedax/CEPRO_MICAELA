/**
 * scripts/seed-cepro-bd-2026.cjs
 * 
 * SCRIPT EJECUTABLE DE POBLADO CANÓNICO DEL CATÁLOGO DOCUMENTAL CEPRO_BD 2026
 * CEPRO_MICAELA 2.0 — Release 2.0
 * 
 * Uso:
 *   node scripts/seed-cepro-bd-2026.cjs [ruta-data]
 * Por defecto siembra en dev-sandbox/data.
 */

const path = require('node:path');
const fs = require('node:fs');
const { validateDevSandbox } = require('./dev-sandbox-guard.cjs');
const { OfflineCore } = require('./offline-core.cjs');
const { seedCatalog, parseCatalog } = require('./cepro-bd-catalog.cjs');

async function runSeed() {
  console.log('========================================================================');
  console.log('  CEPRO_MICAELA 2.0 — SIEMBRA CANÓNICA DE CATÁLOGO DOCUMENTAL 2026      ');
  console.log('========================================================================\n');

  const targetDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', 'dev-sandbox', 'data');

  // Guardián contra modificación de orígenes solo lectura
  const guard = validateDevSandbox({ dataDir: targetDir });
  console.log(`✔ Directorio de datos validado: ${guard.dataDir}`);

  const core = new OfflineCore(guard.dataDir, null);
  try {
    const director = core.users().find(u => u.role === 'DIRECTOR') || core.users()[0];
    if (!director) throw new Error('No se encontró cuenta de usuario en el almacén.');

    console.log(`✔ Autoridad operante: ${director.name} (${director.username}) [${director.role}]`);

    const beforeEnrollments = core.records('enrollments').filter(e => e.active).length;
    console.log(`✔ Matrículas activas previas: ${beforeEnrollments}`);

    console.log('\nIniciando extracción y siembra transaccional...');
    const startTime = Date.now();
    const summary = seedCatalog(core, { user: director });
    const elapsed = Date.now() - startTime;

    console.log(`✔ Siembra completada en ${elapsed} ms.`);
    console.log('------------------------------------------------------------------------');
    console.log(`  Programas registrados:            ${summary.programsCount}`);
    console.log(`  Módulos vinculados:               ${summary.modulesCount}`);
    console.log(`  Capacidades formuladas:           ${summary.capacidadesCount}`);
    console.log(`  Indicadores de capacidad:         ${summary.indicadoresCapacidadCount}`);
    console.log(`  Indicadores de competencia UC/CE: ${summary.indicadoresCompetenciaCount}`);
    console.log(`  Incidencias documentadas:         ${summary.issuesCount} (${summary.issuesPendingCount} pendientes)`);
    console.log(`  Elementos en cuarentena:          ${summary.quarantineCount}`);
    console.log('------------------------------------------------------------------------');

    // Integridad SQLite
    const integrity = core.db.prepare('PRAGMA quick_check').get();
    const isOk = Object.values(integrity)[0] === 'ok';
    if (!isOk) throw new Error(`Fallo de integridad SQLite: ${JSON.stringify(integrity)}`);
    console.log(`✔ Integridad SQLite: PRAGMA quick_check = ok`);

    // Invariante de matrículas
    const afterEnrollments = core.records('enrollments').filter(e => e.active).length;
    if (afterEnrollments !== beforeEnrollments || afterEnrollments !== 286) {
      throw new Error(`Invariante de matrículas violada: previas ${beforeEnrollments}, posteriores ${afterEnrollments} (esperadas 286)`);
    }
    console.log(`✔ Invariante de matrículas ratificada: ${afterEnrollments} alumnos únicos 1:1 intactos.`);

    console.log('\n✅ SIEMBRA CANÓNICA COMPLETADA EXITOSAMENTE CON REGRESIÓN CERO.\n');
  } finally {
    core.close();
  }
}

if (require.main === module) {
  runSeed().catch(err => {
    console.error('\n❌ ERROR EN SIEMBRA CANÓNICA:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { runSeed };
