/**
 * scripts/package-institutional.cjs
 * 
 * Script de empaquetado para distribución Windows Desktop — Perfil Institucional Oficial.
 * Genera el paquete standalone win32-x64 en `release/CEPRO_MICAELA_2.0_Institucional-win32-x64`:
 * 1. Ejecuta compilación de Vite en modo institutional (VITE_APP_PROFILE=institutional).
 * 2. Ensambla los binarios nativos de Electron v44 (Node 24 integrado).
 * 3. Prepara la estructura `resources/app` con backend y dependencias de producción.
 * 4. Renombra el ejecutable principal a CEPRO_MICAELA_2.0.exe.
 * 5. Registra estado Authenticode con scripts/sign-executables.cjs.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { verifySignature, signFile } = require('./sign-executables.cjs');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');
const targetAppDir = path.join(releaseDir, 'CEPRO_MICAELA_2.0_Institucional-win32-x64');
const electronDist = path.join(root, 'node_modules/electron/dist');

console.log('========================================================================');
console.log('   CEPRO_MICAELA 2.0 — PAQUETIZADOR WINDOWS (PERFIL INSTITUCIONAL)      ');
console.log('========================================================================\n');

if (!fs.existsSync(electronDist)) {
  console.error('[INSTITUTIONAL-PACKAGER] Error: No se encontró node_modules/electron/dist. Ejecute npm install.');
  process.exit(1);
}

// 1. Compilación de Vite en modo institucional
console.log('[INSTITUTIONAL-PACKAGER] 1. Compilando aplicación en modo institucional...');
try {
  execSync('npm run build:institutional', { cwd: root, stdio: 'inherit' });
} catch (err) {
  console.error('[INSTITUTIONAL-PACKAGER] Error en compilación de Vite:', err.message);
  process.exit(1);
}

// 2. Preparación de directorios
console.log('\n[INSTITUTIONAL-PACKAGER] 2. Preparando release/CEPRO_MICAELA_2.0_Institucional-win32-x64...');
if (fs.existsSync(targetAppDir)) {
  fs.rmSync(targetAppDir, { recursive: true, force: true });
}
fs.mkdirSync(targetAppDir, { recursive: true });

// 3. Copiar binarios de Electron
console.log('[INSTITUTIONAL-PACKAGER] 3. Copiando runtime de Electron v44 (Node.js 24 + SQLite)...');
fs.cpSync(electronDist, targetAppDir, { recursive: true });

// Renombrar ejecutable a CEPRO_MICAELA_2.0.exe
const originalExe = path.join(targetAppDir, 'electron.exe');
const targetExe = path.join(targetAppDir, 'CEPRO_MICAELA_2.0.exe');
if (fs.existsSync(originalExe)) {
  fs.renameSync(originalExe, targetExe);
  console.log('✔ Ejecutable renombrado a: CEPRO_MICAELA_2.0.exe');
}

// 4. Estructurar resources/app
console.log('[INSTITUTIONAL-PACKAGER] 4. Ensamblando resources/app con backend y dist institucional...');
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

// Copiar node_modules esenciales para el backend (excluyendo electron y build tools)
console.log('[INSTITUTIONAL-PACKAGER] 5. Copiando dependencias para el runtime...');
const appNodeModules = path.join(appDir, 'node_modules');
fs.mkdirSync(appNodeModules, { recursive: true });

const excludeFromNodeModules = new Set(['electron', '.bin', '.cache', 'innosetup-compiler']);
for (const entry of fs.readdirSync(path.join(root, 'node_modules'))) {
  if (excludeFromNodeModules.has(entry)) continue;
  const src = path.join(root, 'node_modules', entry);
  const dst = path.join(appNodeModules, entry);
  fs.cpSync(src, dst, { recursive: true });
}

// Limpieza de artefactos de prueba internos de dependencias (para cumplir límite MAX_PATH 260 de Inno Setup)
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
console.log('✔ Dependencias de runtime empaquetadas y optimizadas (purgados snapshots de tests).');

// 6. Firma digital Authenticode (o registro de NotSigned)
console.log('[INSTITUTIONAL-PACKAGER] 6. Verificando estado Authenticode del binario principal...');
let signResult;
if (process.env.AUTHENTICODE_PFX_PATH) {
  signResult = signFile(targetExe);
  console.log(`  ✔ Firma aplicada: ${signResult.success ? 'VÁLIDA' : 'FALLIDA'} (${signResult.verification.status})`);
} else {
  signResult = { verification: verifySignature(targetExe) };
  console.log(`  ℹ Estado Authenticode: ${signResult.verification.status} (OBS-41B-01: Certificado PFX pendiente de provisión institucional)`);
}

console.log('\n========================================================================');
console.log('  PAQUETE INSTITUCIONAL GENERADO SATISFACTORIAMENTE');
console.log('========================================================================');
console.log(`  Ruta de salida:  ${targetAppDir}`);
console.log(`  Ejecutable:      ${targetExe}`);
console.log(`  SHA-256 binario: ${signResult.verification.sha256}`);
console.log('========================================================================\n');
