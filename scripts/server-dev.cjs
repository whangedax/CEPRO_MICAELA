/**
 * server-dev.cjs
 * 
 * SERVIDOR DE DESARROLLO CON AISLAMIENTO OBLIGATORIO SQLITE - CEPRO_MICAELA 2.0
 * 
 * Este servidor ejecuta el backend de Node.js 24 exclusivamente sobre datos sintéticos
 * dentro de un sandbox autorizado, garantizando:
 * 1. Verificación de ruta absoluta y segura en CETPRO_DATA_DIR antes de tocar SQLite.
 * 2. Bloqueo terminante si se intenta usar private-data/ o el repositorio institucional.
 * 3. Puerto de desarrollo no reservado (por defecto 8085), distinto de 8080/8081.
 * 4. Escucha exclusivamente en 127.0.0.1.
 * 5. Cero lecturas/escrituras sobre bases de datos institucionales.
 */

const path = require('node:path');
const fs = require('node:fs');
const { validateDevSandbox, DEFAULT_DEV_PORT } = require('./dev-sandbox-guard.cjs');
const { createService } = require('./offline-http.cjs');

// 1. Verificación previa de Node.js 24+
const majorVersion = Number(process.versions.node.split('.')[0]);
if (majorVersion < 24) {
  throw new Error(`[ERROR DE ENTORNO] Se requiere Node.js 24 o posterior. Versión detectada: ${process.versions.node}`);
}

const root = path.resolve(__dirname, '..');

// 2. Validación de seguridad y aislamiento del sandbox ANTES de inicializar SQLite
const guard = validateDevSandbox({
  dataDir: process.env.CETPRO_DATA_DIR,
  port: process.env.CETPRO_PORT ? Number(process.env.CETPRO_PORT) : DEFAULT_DEV_PORT
});

const directory = guard.dataDir;
const devPort = guard.port;
const devHost = guard.host;

fs.mkdirSync(directory, { recursive: true });

// 3. Manejo seguro de archivo lock dentro del sandbox
const lockFile = path.join(directory, 'server-lock.json');
if (fs.existsSync(lockFile)) {
  let isRunning = false;
  try {
    const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    if (lockData.pid && lockData.pid !== process.pid) {
      process.kill(lockData.pid, 0);
      isRunning = true;
    }
  } catch {
    isRunning = false;
  }
  if (isRunning) {
    throw new Error(`[SANDBOX BLOQUEADO] Ya existe un servicio de desarrollo usando el sandbox: ${directory}`);
  } else {
    try { fs.unlinkSync(lockFile); } catch {}
  }
}

// 4. Creación del servicio sin enlace a respaldos institucionales (backupFile: null)
const service = createService({
  root,
  directory,
  backupFile: null
});

// Registrar PID en el lock del sandbox
fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, port: devPort, startedAt: new Date().toISOString() }));

// 5. Configuración de servidor HTTP en loopback
const server = service.server();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  server.close(() => {
    try {
      service.core.close();
      if (fs.existsSync(lockFile)) {
        const currentLock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        if (currentLock.pid === process.pid) {
          fs.unlinkSync(lockFile);
        }
      }
    } catch {
      // Ignorar errores durante cierre
    }
    console.log('[Servidor Dev CETPRO] Servicio detenido limpiamente.');
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

server.on('error', (err) => {
  console.error(`[Servidor Dev CETPRO] Error en puerto ${devPort}: ${err.message}`);
  stop(1);
});

server.listen(devPort, devHost, () => {
  console.log('========================================================================');
  console.log('          CEPRO_MICAELA 2.0 — SERVIDOR DE DESARROLLO AISLADO           ');
  console.log('========================================================================');
  console.log(`  Estado:        SANDBOX DE DATOS SINTÉTICOS VERIFICADO`);
  console.log(`  Sandbox Dir:   ${directory}`);
  console.log(`  Escuchando:    http://${devHost}:${devPort}/`);
  console.log(`  API Status:    http://${devHost}:${devPort}/api/status`);
  console.log(`  Modo:          DESARROLLO (Bases institucionales protegidas)`);
  console.log('========================================================================');
});
