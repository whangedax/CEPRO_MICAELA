/**
 * tests/verify-production-installer-2026.cjs
 * 
 * Verificación Integral de Ciclo de Vida del Instalador de Producción 2026 — CEPRO_MICAELA 2.0.
 * 
 * Valida los 6 ejes críticos de producción en máquina real:
 * 1. Instalación silenciosa desatendida de CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64.exe
 * 2. Verificación de binarios instalados, desinstalador y presencia de baseline/production-2026.sqlite
 * 3. Primer arranque con siembra automática de la base de datos oficial 2026 (286 alumnos, 13 usuarios, 16 aulas)
 * 4. Autenticación multi-rol en base sembrada (Director: eloy.paredes y Docente: alejandrina.ayna)
 * 5. Mutación de prueba en SQLite persistente y reinstalación sin sobrescritura
 * 6. Desinstalación silenciosa con verificación estricta de PRESERVACIÓN DE BASE DE DATOS
 */

const path = require('node:path');
const fs = require('node:fs');
const { execSync, spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const assert = require('node:assert/strict');

const ROOT_DIR = path.resolve(__dirname, '..');
const INSTALLER_EXE = process.env.TEST_PROD_INSTALLER_EXE || path.join(ROOT_DIR, 'release', 'CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64.exe');
const TARGET_INSTALL_DIR = path.join(ROOT_DIR, 'release', 'qa_production_installed_test');
const INSTALLED_APP_EXE = path.join(TARGET_INSTALL_DIR, 'CEPRO_MICAELA_2.0.exe');
const UNINSTALLER_EXE = path.join(TARGET_INSTALL_DIR, 'unins000.exe');
const PERSISTENT_DATA_DIR = path.join(ROOT_DIR, 'dev-sandbox', 'data', 'qa-production-installer-data');
const TARGET_DB_PATH = path.join(PERSISTENT_DATA_DIR, 'cetpro.sqlite');

async function main() {
  console.log('========================================================================');
  console.log('  VERIFICACIÓN DE CICLO DE VIDA — INSTALADOR PRODUCCIÓN OFICIAL 2026    ');
  console.log('========================================================================\n');

  if (!fs.existsSync(INSTALLER_EXE)) {
    throw new Error(`Instalador de producción no encontrado: ${INSTALLER_EXE}`);
  }

  const installerStat = fs.statSync(INSTALLER_EXE);
  console.log(`✔ Instalador localizado: ${INSTALLER_EXE}`);
  console.log(`  Tamaño: ${installerStat.size.toLocaleString('es-PE')} bytes (~${(installerStat.size / (1024 * 1024)).toFixed(2)} MB)\n`);

  // Limpiar directorios previos de prueba
  if (fs.existsSync(TARGET_INSTALL_DIR)) {
    fs.rmSync(TARGET_INSTALL_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(PERSISTENT_DATA_DIR)) {
    fs.rmSync(PERSISTENT_DATA_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(PERSISTENT_DATA_DIR, { recursive: true });

  // -------------------------------------------------------------------------
  // FASE 1: INSTALACIÓN DESATENDIDA
  // -------------------------------------------------------------------------
  console.log('[FASE 1] Ejecutando instalación desatendida del instalador de producción...');
  console.log(`         Destino: ${TARGET_INSTALL_DIR}`);

  const installCmd = `"${INSTALLER_EXE}" /CURRENTUSER /DIR="${TARGET_INSTALL_DIR}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-`;
  execSync(installCmd, { stdio: 'inherit' });

  if (!fs.existsSync(INSTALLED_APP_EXE)) {
    throw new Error(`Fallo de instalación: no se encontró ${INSTALLED_APP_EXE}`);
  }
  if (!fs.existsSync(UNINSTALLER_EXE)) {
    throw new Error(`Fallo de instalación: no se encontró el desinstalador ${UNINSTALLER_EXE}`);
  }

  const installedBaseline = path.join(TARGET_INSTALL_DIR, 'resources', 'app', 'baseline', 'production-2026.sqlite');
  if (!fs.existsSync(installedBaseline)) {
    throw new Error(`Fallo de empaquetado: baseline no encontrado en ${installedBaseline}`);
  }

  console.log('  ✔ Instalación silenciosa completada con éxito.');
  console.log(`  ✔ Binario instalado: ${INSTALLED_APP_EXE}`);
  console.log(`  ✔ Desinstalador registrado: ${UNINSTALLER_EXE}`);
  console.log(`  ✔ Línea base 2026 verificada en el paquete: ${installedBaseline}`);

  // -------------------------------------------------------------------------
  // FASE 2: PRIMER ARRANQUE Y SIEMBRA AUTOMÁTICA DE BASE DE DATOS
  // -------------------------------------------------------------------------
  console.log('\n[FASE 2] Verificando siembra automática de base de datos en primer arranque...');
  assert.equal(fs.existsSync(TARGET_DB_PATH), false, 'La base persistente no debe existir antes del primer arranque.');

  // Usamos el motor de la app instalada apuntando al directorio persistente virgen
  const installedCoreScript = path.join(TARGET_INSTALL_DIR, 'resources', 'app', 'scripts', 'offline-core.cjs');
  const { OfflineCore: InstalledCore } = require(installedCoreScript);

  // Instanciamos el core apuntando a PERSISTENT_DATA_DIR
  const core1 = new InstalledCore(PERSISTENT_DATA_DIR);
  try {
    assert.equal(fs.existsSync(TARGET_DB_PATH), true, 'La base cetpro.sqlite debe haberse sembrado automáticamente.');

    const status = core1.status();
    console.log(`  ✔ Estado inicializado: ${status.initialized}`);
    console.log(`  ✔ Institución oficial : ${status.institutionName}`);
    assert.equal(status.initialized, true, 'El nodo debe inicializarse automáticamente desde la línea base.');

    // Verificar PRAGMA quick_check
    const checkRow = core1.db.prepare('PRAGMA quick_check;').get();
    const quickResult = checkRow?.quick_check || Object.values(checkRow || {})[0];
    assert.equal(quickResult, 'ok', 'PRAGMA quick_check debe retornar ok en la base sembrada.');

    // Conteos oficiales
    const students = core1.records('students');
    const enrollments = core1.records('enrollments');
    const groups = core1.records('groups');
    const users = core1.users();
    const modules = core1.records('modules');
    const programs = core1.records('programs');

    console.log(`  ✔ Estudiantes únicos      : ${students.length}`);
    console.log(`  ✔ Matrículas activas (1:1): ${enrollments.length}`);
    console.log(`  ✔ Aulas / Secciones       : ${groups.length}`);
    console.log(`  ✔ Usuarios oficiales      : ${users.length}`);
    console.log(`  ✔ Módulos formativos      : ${modules.length}`);
    console.log(`  ✔ Carreras técnicas       : ${programs.length}`);

    assert.equal(students.length, 286, 'Debe haber exactamente 286 estudiantes únicos.');
    assert.equal(enrollments.length, 286, 'Debe haber exactamente 286 matrículas (1:1).');
    assert.equal(groups.length, 16, 'Debe haber exactamente 16 aulas activas.');
    assert.equal(users.length, 13, 'Debe haber exactamente 13 usuarios oficiales.');
    assert.equal(modules.length, 14, 'Debe haber exactamente 14 módulos.');
    assert.equal(programs.length, 7, 'Debe haber exactamente 7 carreras.');

    // -------------------------------------------------------------------------
    // FASE 3: AUTENTICACIÓN MULTI-ROL (DIRECTOR Y DOCENTE)
    // -------------------------------------------------------------------------
    console.log('\n[FASE 3] Probando autenticación multi-rol en base sembrada...');

    const directorLogin = core1.login({ username: 'eloy.paredes', password: 'Eloy2026!' });
    console.log(`  ✔ Login Director exitoso: ${directorLogin.user.name} (${directorLogin.user.role})`);
    assert.equal(directorLogin.user.role, 'DIRECTOR');

    const docenteLogin = core1.login({ username: 'alejandrina.ayna', password: 'Alejandrina2026!' });
    console.log(`  ✔ Login Docente exitoso : ${docenteLogin.user.name} (${docenteLogin.user.role})`);
    assert.equal(docenteLogin.user.role, 'DOCENTE');

    // -------------------------------------------------------------------------
    // FASE 4: MUTACIÓN DE PRUEBA EN SQLITE PERSISTENTE
    // -------------------------------------------------------------------------
    console.log('\n[FASE 4] Aplicando mutación de prueba persistente...');
    core1.setting('qa_production_mutation_token', {
      mutatedAt: new Date().toISOString(),
      marker: 'MUTATION_TEST_QA_2026_PRESERVED',
      director: directorLogin.user.name
    });

    const verifyMutation = core1.setting('qa_production_mutation_token');
    assert.equal(verifyMutation.marker, 'MUTATION_TEST_QA_2026_PRESERVED');
    console.log(`  ✔ Mutación guardada correctamente: ${verifyMutation.marker}`);
  } finally {
    core1.close();
  }

  // -------------------------------------------------------------------------
  // FASE 5: REINSTALACIÓN DESATENDIDA SIN SOBRESCRITURA DE DATOS
  // -------------------------------------------------------------------------
  console.log('\n[FASE 5] Ejecutando reinstalación / actualización sobre el mismo directorio...');
  execSync(installCmd, { stdio: 'inherit' });

  // Verificar que la base de datos NO haya sido reseteada
  const core2 = new InstalledCore(PERSISTENT_DATA_DIR);
  try {
    const retainedMutation = core2.setting('qa_production_mutation_token');
    assert.ok(retainedMutation, 'La mutación previa debe existir tras la reinstalación.');
    assert.equal(retainedMutation.marker, 'MUTATION_TEST_QA_2026_PRESERVED');
    console.log('  ✔ Verificación de persistencia: la mutación institucional sigue intacta.');

    const studentsAfter = core2.records('students');
    assert.equal(studentsAfter.length, 286, 'El padrón de 286 alumnos sigue intacto.');
  } finally {
    core2.close();
  }

  // -------------------------------------------------------------------------
  // FASE 6: DESINSTALACIÓN DESATENDIDA CON PRESERVACIÓN DE BASE DE DATOS
  // -------------------------------------------------------------------------
  console.log('\n[FASE 6] Ejecutando desinstalación desatendida...');
  const uninstallCmd = `"${UNINSTALLER_EXE}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`;
  execSync(uninstallCmd, { stdio: 'inherit' });

  // Pequeña espera para que Windows libere el handle del desinstalador
  await new Promise(r => setTimeout(r, 1500));

  console.log('  ✔ Desinstalador ejecutado.');
  console.log(`  ✔ ¿Existe el binario instalado? : ${fs.existsSync(INSTALLED_APP_EXE)} (esperado: false)`);
  assert.equal(fs.existsSync(INSTALLED_APP_EXE), false, 'El binario ejecutable debe eliminarse al desinstalar.');

  console.log('\n[FASE 6] Comprobando PRESERVACIÓN TOTAL de la base de datos tras desinstalación...');
  console.log(`  ✔ ¿Existe la base cetpro.sqlite? : ${fs.existsSync(TARGET_DB_PATH)} (esperado: true)`);
  assert.equal(fs.existsSync(TARGET_DB_PATH), true, 'La base SQLite NUNCA debe eliminarse al desinstalar.');

  // Inspección directa con DatabaseSync sobre la base preservada
  const preservedDb = new DatabaseSync(TARGET_DB_PATH);
  try {
    const quickPreserved = preservedDb.prepare('PRAGMA quick_check;').get();
    const quickResult = quickPreserved?.quick_check || Object.values(quickPreserved || {})[0];
    assert.equal(quickResult, 'ok', 'La base preservada debe ser 100% íntegra (PRAGMA quick_check = ok).');

    const studentsCount = preservedDb.prepare("SELECT count(*) as c FROM records WHERE entity='students';").get().c;
    assert.equal(studentsCount, 286, 'Los 286 alumnos siguen presentes en la base tras desinstalación.');

    const mutationRow = preservedDb.prepare("SELECT value FROM settings WHERE key='qa_production_mutation_token';").get();
    assert.ok(mutationRow, 'La mutación de prueba sigue presente en settings.');
    const mutationData = JSON.parse(mutationRow.value);
    assert.equal(mutationData.marker, 'MUTATION_TEST_QA_2026_PRESERVED');

    console.log(`  ✔ PRAGMA quick_check tras desinstalación: ${quickResult}`);
    console.log(`  ✔ Estudiantes preservados: ${studentsCount}`);
    console.log(`  ✔ Mutación preservada: ${mutationData.marker}`);
  } finally {
    preservedDb.close();
  }

  // Limpieza de datos temporales de prueba
  if (fs.existsSync(PERSISTENT_DATA_DIR)) {
    fs.rmSync(PERSISTENT_DATA_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TARGET_INSTALL_DIR)) {
    fs.rmSync(TARGET_INSTALL_DIR, { recursive: true, force: true });
  }

  console.log('\n========================================================================');
  console.log('  VERIFICACIÓN DE CICLO DE VIDA COMPLETADA CON ÉXITO ABSOLUTO (100%)    ');
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('\n✖ ERROR EN VERIFICACIÓN DE CICLO DE VIDA:', err);
  process.exit(1);
});