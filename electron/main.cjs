/**
 * electron/main.cjs
 * 
 * Proceso Principal de Electron — CEPRO_MICAELA 2.0.
 * Convierte el sistema React 19 + Node.js 24 + SQLite en una aplicación
 * de escritorio Windows nativa, segura y 100% offline-first.
 * 
 * Cumplimiento estricto de seguridad:
 * - Instancia única obligatoria (Single Instance Lock)
 * - contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true
 * - Bloqueo estricto de window.open y navegación arbitraria
 * - CSP restrictivo
 * - Puente IPC mínimo y tipado
 * - Proceso backend hijo con verificación previa de salud (Health Check)
 * - Datos persistentes en userData/data (nunca dentro de app.asar)
 */

const { app, BrowserWindow, ipcMain, dialog, shell, session, utilityProcess } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

// 1. INSTANCIA ÚNICA (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[ELECTRON-MAIN] Ya existe una instancia de CEPRO_MICAELA en ejecución. Cerrando proceso duplicado.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let backendProcess = null;
let backendPort = 8085;
let backendUrl = 'http://127.0.0.1:8085';
const instanceSecret = crypto.randomBytes(32).toString('hex');
const authorizedWebContentsIds = new Set();
let isQuitting = false;

// Rutas base
const rootDir = app.isPackaged ? path.resolve(__dirname, '..') : path.resolve(__dirname, '..');
const dataDir = app.isPackaged
  ? (process.env.CETPRO_DATA_DIR || path.join(app.getPath('userData'), 'data'))
  : (process.env.CETPRO_DATA_DIR || path.resolve(rootDir, 'dev-sandbox/data'));

// Asegurar que el directorio de datos persistente existe
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch (err) {
  console.error('[ELECTRON-MAIN] Error al crear carpeta de datos:', err);
}

const mainLogFile = path.join(dataDir, 'main-process.log');
const mainLog = (msg) => {
  try { fs.appendFileSync(mainLogFile, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};
mainLog(`Electron Main iniciado. isPackaged=${app.isPackaged}, rootDir=${rootDir}, dataDir=${dataDir}`);

/**
 * Verifica si un puerto local está ocupado.
 */
function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        resolve(err.code === 'EADDRINUSE');
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port, host);
  });
}

/**
 * Consulta el endpoint de salud del backend.
 * Valida que responda HTTP 200 y que contenga { deviceId, initialized }.
 */
function checkBackendHealth(url, secret = '') {
  return new Promise((resolve) => {
    const headers = {};
    if (secret) {
      headers['X-CETPRO-Instance-Secret'] = secret;
    }
    const req = http.get(`${url}/api/status`, { headers, timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed && typeof parsed.deviceId === 'string' && typeof parsed.initialized === 'boolean');
          } catch {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

/**
 * Localiza o arranca el backend de Node.js 24.
 */
async function ensureBackendRunning() {
  const desiredPort = Number(process.env.CETPRO_PORT || 8085);
  const inUse = await isPortInUse(desiredPort);

  if (inUse) {
    const isHealthy = await checkBackendHealth(`http://127.0.0.1:${desiredPort}`, instanceSecret);
    if (isHealthy) {
      console.log(`[ELECTRON-MAIN] Backend ya activo y saludable en http://127.0.0.1:${desiredPort}`);
      backendPort = desiredPort;
      backendUrl = `http://127.0.0.1:${backendPort}`;
      return;
    }
  }

  // Buscar un puerto libre a partir de desiredPort
  let portToUse = desiredPort;
  while (await isPortInUse(portToUse)) {
    portToUse++;
  }

  backendPort = portToUse;
  backendUrl = `http://127.0.0.1:${backendPort}`;

  console.log(`[ELECTRON-MAIN] Iniciando backend Node.js 24 en puerto ${backendPort}...`);

  const runnerScript = path.join(__dirname, 'backend-runner.cjs');
  const env = Object.assign({}, process.env, {
    CETPRO_PORT: String(backendPort),
    CETPRO_DATA_DIR: dataDir,
    CETPRO_ROOT: rootDir,
    CETPRO_INSTANCE_SECRET: instanceSecret,
  });
  delete env.ELECTRON_RUN_AS_NODE;

  if (utilityProcess && typeof utilityProcess.fork === 'function') {
    backendProcess = utilityProcess.fork(runnerScript, [], {
      env,
      stdio: 'pipe',
    });
    backendProcess.stdout?.on('data', (d) => {
      console.log(`[BACKEND-STDOUT] ${d.toString().trim()}`);
    });
    backendProcess.stderr?.on('data', (d) => {
      console.error(`[BACKEND-STDERR] ${d.toString().trim()}`);
    });
    backendProcess.on('exit', (code) => {
      console.log(`[ELECTRON-MAIN] Proceso backend utilityProcess finalizó (código: ${code})`);
      backendProcess = null;
    });
  } else {
    backendProcess = spawn(process.execPath, [runnerScript], {
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    });
    backendProcess.stdout?.on('data', (d) => {
      console.log(`[BACKEND-STDOUT] ${d.toString().trim()}`);
    });
    backendProcess.stderr?.on('data', (d) => {
      console.error(`[BACKEND-STDERR] ${d.toString().trim()}`);
    });
    backendProcess.on('exit', (code, sig) => {
      console.log(`[ELECTRON-MAIN] Proceso backend spawn finalizó (código: ${code}, señal: ${sig})`);
      backendProcess = null;
    });
  }

  // Polling de salud hasta que responda (máximo 15 segundos)
  const startTime = Date.now();
  let online = false;
  while (Date.now() - startTime < 15000) {
    await new Promise(r => setTimeout(r, 250));
    online = await checkBackendHealth(backendUrl, instanceSecret);
    if (online) break;
  }

  if (!online) {
    throw new Error(`El backend local en ${backendUrl} no respondió tras 15 segundos.`);
  }

  console.log(`[ELECTRON-MAIN] Backend listo y verificado en ${backendUrl}`);
}

/**
 * Creación de la ventana principal de la aplicación.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'CEPRO_MICAELA 2.0 — Sistema Académico Institucional',
    backgroundColor: '#F6F8FA',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: [
        `--cetpro-backend-url=${backendUrl}`,
      ],
    },
  });

  // Registrar webContents como autorizado para peticiones autenticadas
  authorizedWebContentsIds.add(mainWindow.webContents.id);

  // Maximizar por defecto en pantallas grandes para confort de trabajo
  mainWindow.maximize();

  // Mostrar la ventana solo cuando esté lista para evitar parpadeos
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // SEGURIDAD: Bloqueo estricto de apertura de nuevas ventanas (window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // SEGURIDAD: Bloqueo de navegación arbitraria fuera de la aplicación
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalApp = url.startsWith('file://') || url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:');
    if (!isLocalApp) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Carga de la interfaz:
  // En desarrollo con Vite en ejecución: carga http://127.0.0.1:5173
  // En producción / empaquetado: carga dist/index.html local
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  const distHtml = path.join(rootDir, 'dist/index.html');

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    // Si dist no existe aún pero Vite está en 5173
    mainWindow.loadURL('http://127.0.0.1:5173');
  }

  mainWindow.on('closed', () => {
    if (mainWindow) {
      authorizedWebContentsIds.delete(mainWindow.webContents.id);
    }
    mainWindow = null;
  });
}

// IPC HANDLERS SEGUROS
ipcMain.handle('backend:getInfo', () => {
  return {
    backendUrl,
  };
});

ipcMain.on('backend:getUrlSync', (event) => {
  event.returnValue = backendUrl;
});

ipcMain.handle('app:getInfo', () => {
  return {
    name: 'CEPRO_MICAELA 2.0',
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    dataDir,
    backendUrl,
    hasInstanceSecret: true,
  };
});

ipcMain.handle('dialog:openFile', async (event, options = {}) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, {
    title: options.title || 'Seleccionar Archivo',
    filters: options.filters || [{ name: 'Todos los archivos', extensions: ['*'] }],
    properties: options.properties || ['openFile'],
  });
});

ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
  if (!mainWindow) return { canceled: true, filePath: '' };
  return dialog.showSaveDialog(mainWindow, {
    title: options.title || 'Guardar Archivo',
    defaultPath: options.defaultPath || 'respaldo.cetpro-backup',
    filters: options.filters || [{ name: 'Todos los archivos', extensions: ['*'] }],
  });
});

ipcMain.handle('dialog:showMessageBox', async (event, options = {}) => {
  if (!mainWindow) return { response: 0 };
  return dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('shell:openExternal', async (event, url) => {
  if (typeof url === 'string') {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        await shell.openExternal(url);
        return true;
      }
    } catch {}
  }
  return false;
});

// GESTIÓN DE SEGUNDA INSTANCIA
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// CICLO DE VIDA DE ELECTRON
app.whenReady().then(async () => {
  // Inyectar secreto efímero de instancia exclusivamente a peticiones originadas por ventanas autorizadas (MED-39B-01)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['http://127.0.0.1:*/*', 'http://localhost:*/*'] },
    (details, callback) => {
      const requestHeaders = Object.assign({}, details.requestHeaders);
      if (details.webContentsId && authorizedWebContentsIds.has(details.webContentsId)) {
        requestHeaders['X-CETPRO-Instance-Secret'] = instanceSecret;
      }
      callback({ requestHeaders });
    }
  );

  // Configurar Content-Security-Policy restrictivo
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: Object.assign({}, details.responseHeaders, {
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' blob:; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; " +
          "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*; " +
          "font-src 'self' data:; " +
          "object-src 'none'; " +
          "frame-ancestors 'none';"
        ],
      }),
    });
  });

  try {
    await ensureBackendRunning();
    createMainWindow();
  } catch (err) {
    console.error('[ELECTRON-MAIN] Error fatal durante inicialización:', err);
    dialog.showErrorBox(
      'Error de inicio — CEPRO_MICAELA 2.0',
      `No se pudo iniciar el servicio local:\n${err.message}`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// CIERRE ORDENADO Y CONTROLADO
async function cleanupAndQuit() {
  if (isQuitting) return;
  isQuitting = true;

  if (backendProcess) {
    console.log('[ELECTRON-MAIN] Enviando orden de terminación al backend...');
    try {
      if (typeof backendProcess.postMessage === 'function') {
        backendProcess.postMessage({ type: 'shutdown' });
      } else if (typeof backendProcess.send === 'function') {
        backendProcess.send({ type: 'shutdown' });
      }
    } catch {
      try { backendProcess.kill('SIGTERM'); } catch {}
    }

    // Esperar hasta 2 segundos a que el proceso termine
    const waitStart = Date.now();
    while (backendProcess && Date.now() - waitStart < 2000) {
      await new Promise(r => setTimeout(r, 100));
    }

    if (backendProcess) {
      try { backendProcess.kill(); } catch {}
    }
  }

  app.quit();
}

app.on('before-quit', (event) => {
  if (!isQuitting && backendProcess) {
    event.preventDefault();
    cleanupAndQuit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAndQuit();
  }
});
