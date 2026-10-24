/**
 * scripts/package-electron.cjs
 * 
 * Script de empaquetado para distribución Windows Desktop — CEPRO_MICAELA 2.0.
 * Genera el paquete standalone win32-x64 en `release/CEPRO_MICAELA_2.0-win32-x64`:
 * 1. Ejecuta build de Vite para generar los assets optimizados en dist/.
 * 2. Ensambla los binarios nativos de Electron v44 (Node 24 integrado).
 * 3. Prepara la estructura `resources/app` con todo el backend y dependencias de producción.
 * 4. Renombra el ejecutable principal a CEPRO_MICAELA_2.0.exe.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');
const targetAppDir = path.join(releaseDir, 'CEPRO_MICAELA_2.0-win32-x64');
const electronDist = path.join(root, 'node_modules/electron/dist');

console.log('========================================================================');
console.log('       CEPRO_MICAELA 2.0 — GENERADOR DE PAQUETE WINDOWS DESKTOP         ');
console.log('========================================================================\n');

if (!fs.existsSync(electronDist)) {
  console.error('[PACKAGER] Error: No se encontró node_modules/electron/dist. Ejecute npm install.');
  process.exit(1);
}

// 1. Compilación de Vite
console.log('[PACKAGER] 1. Compilando aplicación React 19 + TypeScript...');
try {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
} catch (err) {
  console.error('[PACKAGER] Error en compilación de Vite:', err.message);
  process.exit(1);
}

// 2. Preparación de directorios
console.log('\n[PACKAGER] 2. Preparando estructura de directorios en release/...');
if (fs.existsSync(targetAppDir)) {
  fs.rmSync(targetAppDir, { recursive: true, force: true });
}
fs.mkdirSync(targetAppDir, { recursive: true });

// 3. Copiar binarios de Electron
console.log('[PACKAGER] 3. Copiando runtime de Electron v44 (Node.js 24 + SQLite)...');
fs.cpSync(electronDist, targetAppDir, { recursive: true });

// Renombrar ejecutable a CEPRO_MICAELA_2.0.exe
const originalExe = path.join(targetAppDir, 'electron.exe');
const targetExe = path.join(targetAppDir, 'CEPRO_MICAELA_2.0.exe');
if (fs.existsSync(originalExe)) {
  fs.renameSync(originalExe, targetExe);
  console.log('✔ Ejecutable renombrado a: CEPRO_MICAELA_2.0.exe');
}

// 4. Estructurar resources/app
console.log('[PACKAGER] 4. Ensamblando resources/app con backend, frontend y plantillas...');
const appDir = path.join(targetAppDir, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });

// Copiar package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
// Asegurar que en app el main apunte a electron/main.cjs
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
  name: pkgJson.name,
  version: pkgJson.version,
  main: 'electron/main.cjs',
  type: pkgJson.type || 'module',
  description: pkgJson.description,
}, null, 2));

// Copiar carpetas esenciales
const foldersToCopy = ['dist', 'electron', 'scripts', 'sources'];
for (const f of foldersToCopy) {
  const src = path.join(root, f);
  const dst = path.join(appDir, f);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
    console.log(`  ✔ Copiado: ${f}/`);
  }
}

// Copiar node_modules esenciales para el backend (excluyendo electron runtime ya copiado)
console.log('[PACKAGER] 5. Copiando dependencias para el runtime...');
const appNodeModules = path.join(appDir, 'node_modules');
fs.mkdirSync(appNodeModules, { recursive: true });

const excludeFromNodeModules = new Set(['electron', '.bin', '.cache']);
for (const entry of fs.readdirSync(path.join(root, 'node_modules'))) {
  if (excludeFromNodeModules.has(entry)) continue;
  const src = path.join(root, 'node_modules', entry);
  const dst = path.join(appNodeModules, entry);
  fs.cpSync(src, dst, { recursive: true });
}
console.log('✔ Dependencias de runtime empaquetadas.');

console.log('\n========================================================================');
console.log('  PAQUETE GENERADO SATISFACTORIAMENTE');
console.log('========================================================================');
console.log(`  Ruta de salida:  ${targetAppDir}`);
console.log(`  Ejecutable:      ${targetExe}`);
console.log('========================================================================\n');
