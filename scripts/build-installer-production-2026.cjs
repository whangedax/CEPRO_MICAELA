/**
 * scripts/build-installer-production-2026.cjs
 * 
 * Compilador automatizado del Instalador de Producción Oficial 2026 — CEPRO_MICAELA 2.0.
 * Utiliza Inno Setup 6 (via innosetup-compiler) para generar:
 * release/CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64.exe
 * 
 * Contiene la base de datos pre-cargada 2026 (286 estudiantes 1:1, 13 funcionarios, 16 aulas).
 * Ejecuta validación y firma Authenticode mediante scripts/sign-executables.cjs.
 */

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { calculateSha256, verifySignature, signFile } = require('./sign-executables.cjs');

const rootDir = path.resolve(__dirname, '..');
const issFile = path.join(rootDir, 'installer-production-2026.iss');
const isccBin = path.join(rootDir, 'node_modules', 'innosetup-compiler', 'bin', 'ISCC.exe');
const outputDir = path.join(rootDir, 'release');
const targetAppDir = path.join(outputDir, 'CEPRO_MICAELA_2.0_Produccion_2026-win32-x64');
const targetSetupExe = path.join(outputDir, 'CEPRO_MICAELA_2.0_Setup_Produccion_2026_x64.exe');

console.log('========================================================================');
console.log(' CEPRO_MICAELA 2.0 — COMPILADOR INSTALADOR PRODUCCIÓN OFICIAL 2026      ');
console.log('========================================================================\n');

if (!fs.existsSync(isccBin)) {
  console.error(`[PROD-INSTALLER-BUILDER] Error: No se encontró ISCC.exe en: ${isccBin}`);
  process.exit(1);
}

if (!fs.existsSync(issFile)) {
  console.error(`[PROD-INSTALLER-BUILDER] Error: No se encontró installer-production-2026.iss en: ${issFile}`);
  process.exit(1);
}

if (!fs.existsSync(targetAppDir)) {
  console.error(`[PROD-INSTALLER-BUILDER] Error: No se encontró el directorio empaquetado: ${targetAppDir}`);
  console.error('Ejecute primero: npm run package:production');
  process.exit(1);
}

// Verificar que la base SQLite pre-cargada exista en el paquete
const packagedBaseline = path.join(targetAppDir, 'resources', 'app', 'baseline', 'production-2026.sqlite');
if (!fs.existsSync(packagedBaseline)) {
  console.error(`[PROD-INSTALLER-BUILDER] Error crítico: No se encontró la base pre-cargada en: ${packagedBaseline}`);
  process.exit(1);
}

// Eliminar instalador de producción previo si existe para asegurar frescura absoluta
if (fs.existsSync(targetSetupExe)) {
  console.log(`[PROD-INSTALLER-BUILDER] Limpiando instalador previo: ${targetSetupExe}`);
  fs.unlinkSync(targetSetupExe);
}

console.log(`[PROD-INSTALLER-BUILDER] 1. Compilando script Inno Setup: ${issFile}`);
console.log(`[PROD-INSTALLER-BUILDER]    Compilador: ${isccBin}`);

const result = spawnSync(isccBin, [issFile], {
  cwd: rootDir,
  stdio: 'inherit',
  encoding: 'utf8',
});

if (result.status !== 0) {
  console.error(`[PROD-INSTALLER-BUILDER] Fallo al compilar el instalador (código de salida: ${result.status})`);
  process.exit(result.status || 1);
}

if (!fs.existsSync(targetSetupExe)) {
  console.error(`[PROD-INSTALLER-BUILDER] Error: No se generó el archivo esperado: ${targetSetupExe}`);
  process.exit(1);
}

const stats = fs.statSync(targetSetupExe);
const sha256 = calculateSha256(targetSetupExe);

console.log('\n[PROD-INSTALLER-BUILDER] 2. Verificando estado Authenticode...');
let signResult;
if (process.env.AUTHENTICODE_PFX_PATH) {
  signResult = signFile(targetSetupExe);
  console.log(`  ✔ Firma aplicada: ${signResult.success ? 'VÁLIDA' : 'FALLIDA'} (${signResult.verification.status})`);
} else {
  signResult = { verification: verifySignature(targetSetupExe) };
  console.log(`  ℹ Estado Authenticode: ${signResult.verification.status} (Certificado PFX pendiente de provisión institucional)`);
}

console.log('\n========================================================================');
console.log('  INSTALADOR DE PRODUCCIÓN 2026 GENERADO SATISFACTORIAMENTE');
console.log('========================================================================');
console.log(`  Archivo:     ${targetSetupExe}`);
console.log(`  Tamaño:      ${stats.size.toLocaleString('es-PE')} bytes (~${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`  SHA-256:     ${sha256}`);
console.log(`  Firma:       ${signResult.verification.status}`);
console.log('========================================================================\n');