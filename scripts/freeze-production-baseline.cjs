/**
 * scripts/freeze-production-baseline.cjs
 * 
 * Congela la base de datos oficial 2026 desde dev-sandbox/data/cetpro.sqlite
 * hacia sources/baseline/production-2026.sqlite:
 * 1. Asegura que el certificado institucional apunte formalmente a eloy.paredes.
 * 2. Ejecuta PRAGMA wal_checkpoint(TRUNCATE) sobre dev-sandbox/data/cetpro.sqlite.
 * 3. Ejecuta VACUUM INTO 'sources/baseline/production-2026.sqlite'.
 * 4. Valida integridad con PRAGMA quick_check = ok en el baseline generado.
 * 5. Reporta métricas y conteos oficiales (286 estudiantes 1:1, 13 usuarios, 16 aulas).
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { calculateSha256 } = require('./sign-executables.cjs');
const { OfflineCore } = require('./offline-core.cjs');

const root = path.resolve(__dirname, '..');
const sandboxDataDir = path.join(root, 'dev-sandbox', 'data');
const sandboxDbPath = path.join(sandboxDataDir, 'cetpro.sqlite');
const baselineDir = path.join(root, 'sources', 'baseline');
const baselineDbPath = path.join(baselineDir, 'production-2026.sqlite');

function freezeProductionBaseline() {
  console.log('========================================================================');
  console.log('  CEPRO_MICAELA 2.0 — CONGELADOR DE LÍNEA BASE OFICIAL PRODUCCIÓN 2026  ');
  console.log('========================================================================\n');

  if (!fs.existsSync(sandboxDbPath)) {
    throw new Error(`Base de datos sandbox no encontrada: ${sandboxDbPath}`);
  }

  // 1. Asegurar certificado formal apuntando a eloy.paredes (Director)
  console.log('[BASELINE] 1. Configurando certificado formal de autoridad para eloy.paredes...');
  const core = new OfflineCore(sandboxDataDir);
  try {
    const eloyUser = core.users().find(u => u.username === 'eloy.paredes');
    if (!eloyUser) {
      throw new Error("Usuario 'eloy.paredes' no encontrado en dev-sandbox/data.");
    }
    const device = core.setting('device');
    if (!device) {
      throw new Error("Dispositivo institucional no inicializado en settings.");
    }
    const cert = core.certificate(eloyUser, device);
    core.setting('certificate', cert);

    const updatedDevices = [{
      id: device.id,
      userId: eloyUser.id,
      signingKey: device.signing.public,
      encryptionKey: device.encryption.public
    }];
    core.setting('devices', updatedDevices);

    const institution = core.setting('institution');
    if (institution) {
      institution.hub = {
        id: device.id,
        encryptionKey: device.encryption.public
      };
      core.setting('institution', institution);
    }
    console.log(`  ✔ Certificado oficial emitido para: ${eloyUser.name} (${eloyUser.username})`);
    console.log(`  ✔ Válido hasta: ${cert.body.validUntil}`);
  } finally {
    core.close();
  }

  // 2. Abrir conexión SQLite directa para checkpoint y VACUUM INTO
  console.log('\n[BASELINE] 2. Ejecutando PRAGMA wal_checkpoint(TRUNCATE)...');
  const sourceDb = new DatabaseSync(sandboxDbPath);
  try {
    sourceDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log('  ✔ WAL checkpoint TRUNCATE completado.');

    fs.mkdirSync(baselineDir, { recursive: true });
    if (fs.existsSync(baselineDbPath)) {
      console.log(`  ℹ Eliminando copia previa de baseline en ${baselineDbPath}...`);
      fs.unlinkSync(baselineDbPath);
    }

    console.log(`\n[BASELINE] 3. Ejecutando VACUUM INTO '${baselineDbPath}'...`);
    const escapedTarget = baselineDbPath.replace(/'/g, "''");
    sourceDb.exec(`VACUUM INTO '${escapedTarget}';`);
    console.log('  ✔ VACUUM INTO ejecutado exitosamente.');
  } finally {
    sourceDb.close();
  }

  // 3. Verificar integridad del baseline generado
  console.log('\n[BASELINE] 4. Verificando integridad y métricas del baseline...');
  if (!fs.existsSync(baselineDbPath)) {
    throw new Error(`El archivo de línea base no fue generado: ${baselineDbPath}`);
  }

  const baselineDb = new DatabaseSync(baselineDbPath);
  let metrics = {};
  try {
    const quickCheck = baselineDb.prepare('PRAGMA quick_check;').get();
    const checkResult = quickCheck?.quick_check || Object.values(quickCheck || {})[0];
    if (checkResult !== 'ok') {
      throw new Error(`PRAGMA quick_check falló: ${JSON.stringify(quickCheck)}`);
    }

    const usersCount = baselineDb.prepare('SELECT count(*) as c FROM users;').get().c;
    const studentsCount = baselineDb.prepare("SELECT count(*) as c FROM records WHERE entity='students';").get().c;
    const enrollmentsCount = baselineDb.prepare("SELECT count(*) as c FROM records WHERE entity='enrollments';").get().c;
    const groupsCount = baselineDb.prepare("SELECT count(*) as c FROM records WHERE entity='groups';").get().c;
    const modulesCount = baselineDb.prepare("SELECT count(*) as c FROM records WHERE entity='modules';").get().c;
    const programsCount = baselineDb.prepare("SELECT count(*) as c FROM records WHERE entity='programs';").get().c;
    const certRow = baselineDb.prepare("SELECT value FROM settings WHERE key='certificate';").get();
    const certData = certRow ? JSON.parse(certRow.value) : null;

    metrics = {
      quickCheck: checkResult,
      usersCount,
      studentsCount,
      enrollmentsCount,
      groupsCount,
      modulesCount,
      programsCount,
      directorUsername: certData?.body?.user?.username,
      directorName: certData?.body?.user?.name,
      validUntil: certData?.body?.validUntil
    };

    if (studentsCount !== 286 || enrollmentsCount !== 286) {
      throw new Error(`Discrepancia en alumnos: ${studentsCount} estudiantes, ${enrollmentsCount} matrículas (esperado 286 1:1)`);
    }
    if (usersCount !== 13) {
      throw new Error(`Discrepancia en usuarios: ${usersCount} (esperado 13)`);
    }
    if (groupsCount !== 16) {
      throw new Error(`Discrepancia en aulas/grupos: ${groupsCount} (esperado 16)`);
    }
    if (metrics.directorUsername !== 'eloy.paredes') {
      throw new Error(`Certificado no apunta a eloy.paredes: ${metrics.directorUsername}`);
    }
  } finally {
    baselineDb.close();
  }

  const stat = fs.statSync(baselineDbPath);
  const sha256 = calculateSha256(baselineDbPath);

  console.log(`  ✔ PRAGMA quick_check     : ${metrics.quickCheck}`);
  console.log(`  ✔ Usuarios oficiales      : ${metrics.usersCount}`);
  console.log(`  ✔ Estudiantes únicos      : ${metrics.studentsCount}`);
  console.log(`  ✔ Matrículas activas (1:1): ${metrics.enrollmentsCount}`);
  console.log(`  ✔ Aulas / Secciones       : ${metrics.groupsCount}`);
  console.log(`  ✔ Módulos formativos      : ${metrics.modulesCount}`);
  console.log(`  ✔ Carreras técnicas       : ${metrics.programsCount}`);
  console.log(`  ✔ Titular certificado     : ${metrics.directorName} (${metrics.directorUsername})`);
  console.log(`  ✔ Tamaño de archivo       : ${stat.size.toLocaleString('es-PE')} bytes (~${(stat.size / 1024).toFixed(1)} KB)`);
  console.log(`  ✔ SHA-256 baseline        : ${sha256}`);
  console.log('\n========================================================================');
  console.log('  LÍNEA BASE OFICIAL 2026 CONGELADA SATISFACTORIAMENTE');
  console.log('========================================================================\n');

  return {
    baselineDbPath,
    size: stat.size,
    sha256,
    metrics
  };
}

if (require.main === module) {
  freezeProductionBaseline();
}

module.exports = { freezeProductionBaseline };