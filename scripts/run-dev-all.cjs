/**
 * scripts/run-dev-all.cjs
 * 
 * Launcher unificado de desarrollo para CEPRO_MICAELA 2.0.
 * Inicia de forma coordinada:
 * 1. El backend de Node.js 24 con guardián de sandbox (127.0.0.1:8085).
 * 2. El servidor de desarrollo de Vite (127.0.0.1:5173).
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

console.log('========================================================================');
console.log('       CEPRO_MICAELA 2.0 — ENTORNO DE DESARROLLO UNIFICADO             ');
console.log('========================================================================');

// 1. Iniciar backend con dev-sandbox-guard
const backend = spawn('node', [path.join(__dirname, 'run-dev-backend.cjs')], {
  cwd: root,
  stdio: 'inherit'
});

// 2. Iniciar Vite
const isWin = process.platform === 'win32';
const vite = spawn(isWin ? 'npx.cmd' : 'npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: root,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n[DEV] Deteniendo servicios de desarrollo...');
  try { backend.kill(); } catch {}
  try { vite.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[DEV] El backend terminó con código ${code}`);
    cleanup();
  }
});
