/**
 * scripts/package-production-2026.cjs
 * 
 * Script de empaquetado para distribución Windows Desktop — Producción Oficial 2026.
 * Genera el paquete standalone win32-x64 en `release/CEPRO_MICAELA_2.0_Produccion_2026-win32-x64`:
 * 1. Asegura que la línea base congelada sources/baseline/production-2026.sqlite exista y esté íntegra.
 * 2. Ejecuta compilación de Vite en modo institutional (VITE_APP_PROFILE=institutional).
 * 3. Ensambla los binarios nativos de Electron v44 (Node 24 integrado).
 * 4. Prepara la estructura resources/app con backend, frontend institucional y baseline 2026 integrado.
 * 5. Renombra el ejecutable principal a CEPRO_MICAELA_2.0.exe.
 * 6. Registra estado Authenticode con scripts/sign-executables.cjs.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { calculateSha256, verifySignature, signFile } = require('./sign-executables.cjs');
const { freezeProductionBaseline } = require('./freeze-production-baseline.cjs');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');
const targetAppDir = path.join(releaseDir, 'CEPRO_MICAELA_2.0_Produccion_2026-win32-x64');
const electronDist = path.join(root, 'node_modules/electron/dist');
const baselineSource = path.join(root, 'sources', 'baseline', 'production-2026.sqlite');

console.log('========================================================================');
console.log('  CEPRO_MICAELA 2.0 — EMPAQUETADOR DE PRODUCCIÓN OFICIAL 2026           ');
console.log('========================================================================\n');

if (!fs.existsSync(electronDist)) {
  console.error('[PROD-PACKAGER] Error: No se encontró node_modules/electron/dist. Ejecute npm install.');
  process.exit(1);
}

// 0. Asegurar línea base congelada
console.log('[PROD-PACKAGER] 0. Verificando línea base congelada production-2026.sqlite...');
if (!fs.existsSync(baselineSource)) {
  console.log('  ℹ Línea base no encontrada. Generando baseline desde dev-sandbox...');
  freezeProductionBaseline();
} else {
  const stat = fs.statSync(baselineSource);
  console.log(`  ✔ Línea base presente: ${stat.size.toLocaleString('es-PE')} bytes (~${(stat.size / 1024).toFixed(1)} KB)`);
}

// 1. Compilación de Vite en modo institucional
console.log('\n[PROD-PACKAGER] 1. Compilando aplicación en modo institucional (Vite)...');
try {
  execSync('npm run build:institutional', { cwd: root, stdio: 'inherit' });
} catch (err) {
  console.error('[PROD-PACKAGER] Error en compilación de Vite:', err.message);
  process.exit(1);
}

// 2. Preparación de directorios
console.log(`\n[PROD-PACKAGER] 2. Preparando ${targetAppDir}...`);
if (fs.existsSync(targetAppDir)) {
  fs.rmSync(targetAppDir, { recursive: true, force: true });
}
fs.mkdirSync(targetAppDir, { recursive: true });

// 3. Copiar binarios de Electron
console.log('[PROD-PACKAGER] 3. Copiando runtime de Electron v44 (Node.js 24 + SQLite)...');
fs.cpSync(electronDist, targetAppDir, { recursive: true });

// Renombrar ejecutable a CEPRO_MICAELA_2.0.exe
const originalExe = path.join(targetAppDir, 'electron.exe');
const targetExe = path.join(targetAppDir, 'CEPRO_MICAELA_2.0.exe');
if (fs.existsSync(originalExe)) {
  fs.renameSync(originalExe, targetExe);
  console.log('  ✔ Ejecutable renombrado a: CEPRO_MICAELA_2.0.exe');
}

// 4. Estructurar resources/app
console.log('[PROD-PACKAGER] 4. Ensamblando resources/app con backend, frontend y línea base...');
const appDir = path.join(targetAppDir, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });

// Copiar package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
  name: pkgJson.name,
  version: pkgJson.version,
  main: 'electron/main.cjs',
  type: pkgJson.type || 'module',
  description: pkgJson.description,
}, null, 2));

// Copiar carpetas esenciales
const foldersToCopy = ['app', 'dist', 'electron', 'scripts', 'sources'];
for (const f of foldersToCopy) {
  const src = path.join(root, f);
  const dst = path.join(appDir, f);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
    console.log(`  ✔ Copiado: ${f}/`);
  }
}

// Integrar línea base 2026 en resources/app/baseline/production-2026.sqlite
const appBaselineDir = path.join(appDir, 'baseline');
fs.mkdirSync(appBaselineDir, { recursive: true });
const appBaselineFile = path.join(appBaselineDir, 'production-2026.sqlite');
fs.copyFileSync(baselineSource, appBaselineFile);
const baselineSha = calculateSha256(appBaselineFile);
console.log(`  ✔ Línea base 2026 copiada a resources/app/baseline/production-2026.sqlite`);
console.log(`    ↪ SHA-256 baseline en app: ${baselineSha}`);

// Copiar node_modules esenciales para el backend (excluyendo electron y build tools)
console.log('\n[PROD-PACKAGER] 5. Copiando dependencias para el runtime...');
const appNodeModules = path.join(appDir, 'node_modules');
fs.mkdirSync(appNodeModules, { recursive: true });

const excludeFromNodeModules = new Set(['electron', '.bin', '.cache', 'innosetup-compiler']);
for (const entry of fs.readdirSync(path.join(root, 'node_modules'))) {
  if (excludeFromNodeModules.has(entry)) continue;
  const src = path.join(root, 'node_modules', entry);
  const dst = path.join(appNodeModules, entry);
  fs.cpSync(src, dst, { recursive: true });
}

// Limpieza de artefactos de prueba internos de dependencias (MAX_PATH 260 de Inno Setup)
function pruneDevArtifacts(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__image_snapshots__' || entry.name === '__tests__' || entry.name === '.github') {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        pruneDevArtifacts(fullPath);
      }
    }
  }
}
pruneDevArtifacts(appNodeModules);
console.log('  ✔ Dependencias de runtime empaquetadas y optimizadas.');

// 6. Firma digital Authenticode (o registro de NotSigned)
console.log('\n[PROD-PACKAGER] 6. Verificando estado Authenticode del binario principal...');
let signResult;
if (process.env.AUTHENTICODE_PFX_PATH) {
  signResult = signFile(targetExe);
  console.log(`  ✔ Firma aplicada: ${signResult.success ? 'VÁLIDA' : 'FALLIDA'} (${signResult.verification.status})`);
} else {
  signResult = { verification: verifySignature(targetExe) };
  console.log(`  ℹ Estado Authenticode: ${signResult.verification.status} (Certificado PFX pendiente de provisión institucional)`);
}

console.log('\n========================================================================');
console.log('  PAQUETE PRODUCCIÓN 2026 GENERADO SATISFACTORIAMENTE');
console.log('========================================================================');
console.log(`  Ruta de salida:  ${targetAppDir}`);
console.log(`  Ejecutable:      ${targetExe}`);
console.log(`  SHA-256 binario: ${signResult.verification.sha256}`);
console.log(`  Baseline SQLite: ${appBaselineFile}`);
console.log(`  SHA-256 base:    ${baselineSha}`);
console.log('========================================================================\n');