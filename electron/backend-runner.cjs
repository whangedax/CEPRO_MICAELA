/**
 * electron/backend-runner.cjs
 * 
 * Proceso secundario dedicado para el backend de Node.js 24 + SQLite — CEPRO_MICAELA 2.0.
 * Se ejecuta en un proceso hijo aislado (Child Process / UtilityProcess) gestionado por Electron Main.
 * 
 * Reglas de seguridad:
 * 1. Escucha exclusivamente en 127.0.0.1 (loopback).
 * 2. Directorio persistente configurable (userData/data en producción).
 * 3. Prohibición estricta de acceder a private-data/ o PAQUETE_ANTIGRAVITY_CETPRO_V2.
 * 4. Cierre ordenado y transaccional ante señales de terminación.
 */

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const root = process.env.CETPRO_ROOT || path.resolve(__dirname, '..');
const dataDir = process.env.CETPRO_DATA_DIR || path.resolve(root, 'dev-sandbox/data');
const port = Number(process.env.CETPRO_PORT || 8085);
const host = '127.0.0.1';

// Seguridad: Bloqueo terminante contra rutas institucionales protegidas
const normalizedDataDir = path.resolve(dataDir).toLowerCase();
if (
  normalizedDataDir.includes('private-data') ||
  normalizedDataDir.includes('paquete_antigravity_cetpro_v2')
) {
  console.error('[BACKEND-RUNNER] ERROR CRÍTICO: Prohibido apuntar a private-data o repositorio institucional.');
  process.exit(1);
}

// Crear directorio de datos persistente si no existe
fs.mkdirSync(dataDir, { recursive: true });

const logFile = path.join(dataDir, 'backend-service.log');
const log = (msg) => {
  try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};
log(`Backend service iniciando en puerto ${port}, root: ${root}`);

// Cargar offline-http desde scripts
let createService;
try {
  const serviceModule = require(path.join(root, 'scripts/offline-http.cjs'));
  createService = serviceModule.createService;
  log('offline-http.cjs cargado satisfactoriamente.');
} catch (err) {
  log(`Error fatal al cargar offline-http.cjs: ${err.message}\n${err.stack}`);
  process.exit(1);
}

const service = createService({
  root,
  directory: dataDir,
  backupFile: null,
});

const server = service.server();
let isStopping = false;

function gracefulShutdown(code = 0) {
  if (isStopping) return;
  isStopping = true;
  console.log('[BACKEND-RUNNER] Deteniendo servidor HTTP loopback...');
  server.close(() => {
    try {
      service.core.close();
      console.log('[BACKEND-RUNNER] Base SQLite cerrada satisfactoriamente.');
    } catch (err) {
      console.error('[BACKEND-RUNNER] Error al cerrar base SQLite:', err.message);
    }
    process.exit(code);
  });
}

process.on('SIGINT', () => gracefulShutdown(0));
process.on('SIGTERM', () => gracefulShutdown(0));

// Soporte para IPC vía ChildProcess (process.on('message'))
process.on('message', (msg) => {
  if (msg === 'shutdown' || (typeof msg === 'object' && msg?.type === 'shutdown')) {
    gracefulShutdown(0);
  }
});

// Soporte para IPC vía Electron UtilityProcess (process.parentPort)
if (process.parentPort && typeof process.parentPort.on === 'function') {
  process.parentPort.on('message', (e) => {
    const msg = e.data;
    if (msg === 'shutdown' || (typeof msg === 'object' && msg?.type === 'shutdown')) {
      gracefulShutdown(0);
    }
  });
}

server.on('error', (err) => {
  console.error(`[BACKEND-RUNNER] Error en servidor HTTP en puerto ${port}:`, err.message);
  gracefulShutdown(1);
});

server.listen(port, host, () => {
  log(`Servidor HTTP loopback escuchando en http://${host}:${port}`);
  console.log(`[BACKEND-READY:${port}] Escuchando en http://${host}:${port} (datos en ${dataDir})`);
  if (typeof process.send === 'function') {
    try {
      process.send({ type: 'ready', port, host, dataDir });
    } catch {}
  }
});
