/**
 * scripts/build-installer-institutional.cjs
 * 
 * Compilador automatizado del Instalador Institucional Oficial — CEPRO_MICAELA 2.0.
 * Utiliza Inno Setup 6 (via innosetup-compiler) para generar:
 * release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe
 * 
 * Ejecuta validación y firma Authenticode mediante scripts/sign-executables.cjs.
 */

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { calculateSha256, verifySignature, signFile } = require('./sign-executables.cjs');

const rootDir = path.resolve(__dirname, '..');
const issFile = path.join(rootDir, 'installer-institutional.iss');
const isccBin = path.join(rootDir, 'node_modules', 'innosetup-compiler', 'bin', 'ISCC.exe');
const outputDir = path.join(rootDir, 'release');
const targetAppDir = path.join(outputDir, 'CEPRO_MICAELA_2.0_Institucional-win32-x64');
const targetSetupExe = path.join(outputDir, 'CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe');

console.log('========================================================================');
console.log(' CEPRO_MICAELA 2.0 — COMPILADOR DE INSTALADOR INSTITUCIONAL OFICIAL     ');
console.log('========================================================================\n');

if (!fs.existsSync(isccBin)) {
  console.error(`[INSTALLER-BUILDER] Error: No se encontró ISCC.exe en: ${isccBin}`);
  process.exit(1);
}

if (!fs.existsSync(issFile)) {
  console.error(`[INSTALLER-BUILDER] Error: No se encontró installer-institutional.iss en: ${issFile}`);
  process.exit(1);
}

if (!fs.existsSync(targetAppDir)) {
  console.error(`[INSTALLER-BUILDER] Error: No se encontró el directorio empaquetado: ${targetAppDir}`);
  console.error('Ejecute primero: npm run package:institutional');
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
const sha256 = calculateSha256(targetSetupExe);

console.log('\n[INSTALLER-BUILDER] 2. Verificando estado Authenticode...');
let signResult;
if (process.env.AUTHENTICODE_PFX_PATH) {
  signResult = signFile(targetSetupExe);
  console.log(`  ✔ Firma aplicada: ${signResult.success ? 'VÁLIDA' : 'FALLIDA'} (${signResult.verification.status})`);
} else {
  signResult = { verification: verifySignature(targetSetupExe) };
  console.log(`  ℹ Estado Authenticode: ${signResult.verification.status} (OBS-41B-01: Certificado PFX pendiente de provisión institucional)`);
}

console.log('\n========================================================================');
console.log('  INSTALADOR INSTITUCIONAL GENERADO SATISFACTORIAMENTE');
console.log('========================================================================');
console.log(`  Archivo:     ${targetSetupExe}`);
console.log(`  Tamaño:      ${stats.size.toLocaleString('es-PE')} bytes (~${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`  SHA-256:     ${sha256}`);
console.log(`  Firma:       ${signResult.verification.status}`);
console.log('========================================================================\n');
