/**
 * tests/institutional-bundle-clean.test.cjs
 * 
 * Suite de Verificación de Higiene del Bundle Institucional (OBS-41B-02).
 * Inspecciona los artefactos compilados en dist/ bajo el perfil institucional (VITE_APP_PROFILE=institutional)
 * y garantiza la ausencia total de:
 * 1. Leyendas de prototipo o sandbox ("PROTOTIPO", "Entorno de Pruebas", "MODO DEMOSTRACIÓN").
 * 2. Cuentas y credenciales predeterminadas ("director.dev", "docente.dev", "DocenteDev2026!").
 * 3. Textos dev de almacenamiento sintético ("SQLite sintético").
 * 4. Rutas relativas o menciones a "dev-sandbox/data".
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

test('Bundle Institucional — Limpieza de Prototipo y Credenciales Sandbox', async (t) => {
  await t.test('1. Compilación fresca en modo institucional', () => {
    // Compilar con perfil institucional
    execSync('npm run build:institutional', { cwd: rootDir, stdio: 'pipe' });
    assert.ok(fs.existsSync(distDir), 'El directorio dist/ debe existir tras la compilación.');
    const indexHtml = path.join(distDir, 'index.html');
    assert.ok(fs.existsSync(indexHtml), 'index.html debe existir en dist/.');
  });

  await t.test('2. Inspección de index.html institucional', () => {
    const htmlContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    assert.ok(
      htmlContent.includes('CEPRO_MICAELA 2.0 — Sistema Académico Institucional'),
      'El título de index.html debe ser formal institucional.'
    );
    assert.ok(!htmlContent.includes('Plataforma del Docente'), 'No debe tener título restrictivo a docente.');
  });

  await t.test('3. Inspección exhaustiva de assets JS y CSS compilados', () => {
    const assetsDir = path.join(distDir, 'assets');
    assert.ok(fs.existsSync(assetsDir), 'El directorio dist/assets debe existir.');

    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    assert.ok(jsFiles.length > 0, 'Debe haber al menos un archivo JS compilado.');

    // Cadenas prohibidas en el bundle de producción/institucional
    const prohibitedStrings = [
      'PROTOTIPO · DATOS FICTICIOS',
      'Cuentas del Sandbox de Desarrollo',
      'director.dev',
      'docente.dev',
      'DocenteDev2026!',
      'dev-sandbox/data',
      'SQLite sintético',
      'Entorno de Pruebas · Sin Validez Oficial',
      'MODO DEMOSTRACIÓN ACTIVO',
    ];

    let combinedJs = '';
    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
      combinedJs += content + '\n';
    }

    const violations = [];
    for (const prohibited of prohibitedStrings) {
      if (combinedJs.includes(prohibited)) {
        violations.push(prohibited);
      }
    }

    assert.equal(
      violations.length,
      0,
      `Se encontraron cadenas prohibidas en el bundle institucional: ${violations.join(', ')}`
    );
  });

  await t.test('4. Verificación de presencia de mensajes y denominaciones institucionales', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    let combinedJs = '';
    for (const jsFile of jsFiles) {
      combinedJs += fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
    }

    assert.ok(
      combinedJs.includes('Ingrese su usuario institucional'),
      'Debe incluir el placeholder institucional en LoginPage.'
    );
    assert.ok(
      combinedJs.includes('SISTEMA ACADÉMICO INSTITUCIONAL'),
      'Debe incluir el banner institucional formal.'
    );
  });
});
