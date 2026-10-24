/**
 * scripts/build-installer.cjs
 * 
 * Compilador automatizado del Instalador Profesional Windows — CEPRO_MICAELA 2.0.
 * Utiliza Inno Setup 6 (via innosetup-compiler) para generar:
 * release/CEPRO_MICAELA_2.0_Setup_QA_x64.exe
 */

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');

const rootDir = path.resolve(__dirname, '..');
const issFile = path.join(rootDir, 'installer.iss');
const isccBin = path.join(rootDir, 'node_modules', 'innosetup-compiler', 'bin', 'ISCC.exe');
const outputDir = path.join(rootDir, 'release');
const targetSetupExe = path.join(outputDir, 'CEPRO_MICAELA_2.0_Setup_QA_x64.exe');

console.log('========================================================================');
console.log('    CEPRO_MICAELA 2.0 — GENERADOR DE INSTALADOR PROFESIONAL WINDOWS     ');
console.log('========================================================================\n');

if (!fs.existsSync(isccBin)) {
  console.error(`[INSTALLER-BUILDER] Error: No se encontró ISCC.exe en: ${isccBin}`);
  process.exit(1);
}

if (!fs.existsSync(issFile)) {
  console.error(`[INSTALLER-BUILDER] Error: No se encontró installer.iss en: ${issFile}`);
  process.exit(1);
}

// Eliminar instalador previo si existe para asegurar frescura
if (fs.existsSync(targetSetupExe)) {
  fs.unlinkSync(targetSetupExe);
}

console.log(`[INSTALLER-BUILDER] 1. Compilando script Inno Setup: ${issFile}`);
console.log(`[INSTALLER-BUILDER]    Compilador: ${isccBin}`);

const result = spawnSync(isccBin, [issFile], {
  cwd: rootDir,
  stdio: 'inherit',
  encoding: 'utf8',
});

if (result.status !== 0) {
  console.error(`[INSTALLER-BUILDER] Fallo al compilar el instalador (código de salida: ${result.status})`);
  process.exit(result.status || 1);
}

if (!fs.existsSync(targetSetupExe)) {
  console.error(`[INSTALLER-BUILDER] Error: No se generó el archivo esperado: ${targetSetupExe}`);
  process.exit(1);
}

const stats = fs.statSync(targetSetupExe);
const hash = crypto.createHash('sha256').update(fs.readFileSync(targetSetupExe)).digest('hex').toUpperCase();

console.log('\n========================================================================');
console.log('  INSTALADOR PROFESIONAL GENERADO SATISFACTORIAMENTE');
console.log('========================================================================');
console.log(`  Archivo:     ${targetSetupExe}`);
console.log(`  Tamaño:      ${stats.size.toLocaleString('es-PE')} bytes (~${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`  SHA-256:     ${hash}`);
console.log(`  Firma:       NO FIRMADO (Instalador QA — Observación BAJO-39B-01)`);
console.log('========================================================================\n');
