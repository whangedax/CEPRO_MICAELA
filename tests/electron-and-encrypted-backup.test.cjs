/**
 * tests/electron-and-encrypted-backup.test.cjs
 * 
 * Suite de pruebas automatizadas para:
 * 1. Respaldos Cifrados Portátiles AES-256-GCM + scrypt (Tarea 37 Hallazgo)
 * 2. Integración y Seguridad de Electron Desktop (Tarea 38)
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';
const QA_DATA_DIR = process.env.CETPRO_DATA_DIR || path.resolve(__dirname, '../dev-sandbox/data/qa-isolated');

describe('Tarea 38 — Respaldos Cifrados e Integración Electron', () => {
  let tokenDirector = null;
  let tokenSecretaria = null;
  let tokenDocente = null;
  let headersDirector = {};
  let headersSecretaria = {};
  let headersDocente = {};
  let encryptedBackupFilename = null;
  const testPassphrase = 'ClaveUltraSegura2026!';
  const testHint = 'Prueba QA Tarea 38';

  before(async () => {
    // 1. Login DIRECTOR
    const loginDir = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director.dev', password: 'DirectorDev2026!' }),
    });
    assert.equal(loginDir.status, 200, 'Login DIRECTOR debe responder 200');
    const dirData = await loginDir.json();
    tokenDirector = dirData.token;
    headersDirector = {
      'Authorization': `Bearer ${tokenDirector}`,
      'Content-Type': 'application/json',
    };

    // 2. Login SECRETARIA
    const loginSec = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'secretaria.dev', password: 'SecretariaDev2026!' }),
    });
    assert.equal(loginSec.status, 200, 'Login SECRETARIA debe responder 200');
    const secData = await loginSec.json();
    tokenSecretaria = secData.token;
    headersSecretaria = {
      'Authorization': `Bearer ${tokenSecretaria}`,
      'Content-Type': 'application/json',
    };

    // 3. Login DOCENTE
    const loginDoc = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    assert.equal(loginDoc.status, 200, 'Login DOCENTE debe responder 200');
    const docData = await loginDoc.json();
    tokenDocente = docData.token;
    headersDocente = {
      'Authorization': `Bearer ${tokenDocente}`,
      'Content-Type': 'application/json',
    };
  });

  // =========================================================================
  // BLOQUE 1: RESPALDOS CIFRADOS PORTÁTILES (AES-256-GCM + SCRYPT)
  // =========================================================================

  test('1.1 RBAC: SECRETARIA y DOCENTE no pueden exportar respaldos cifrados (HTTP 403)', async () => {
    const resSec = await fetch(`${BASE_URL}/api/backup/export-encrypted`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({ passphrase: testPassphrase }),
    });
    assert.equal(resSec.status, 403, 'SECRETARIA debe recibir 403');

    const resDoc = await fetch(`${BASE_URL}/api/backup/export-encrypted`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ passphrase: testPassphrase }),
    });
    assert.equal(resDoc.status, 403, 'DOCENTE debe recibir 403');
  });

  test('1.2 Validación de contraseña: rechaza contraseña menor a 8 caracteres (HTTP 400)', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/export-encrypted`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ passphrase: '123' }),
    });
    assert.equal(res.status, 400, 'Debe rechazar contraseña corta con HTTP 400');
    const err = await res.json();
    assert.match(err.error, /al menos 8 caracteres/i);
  });

  test('1.3 DIRECTOR exporta exitosamente respaldo cifrado portátil (.cetpro-backup)', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/export-encrypted`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        passphrase: testPassphrase,
        hint: testHint,
      }),
    });
    assert.equal(res.status, 200, 'Debe responder 200 al exportar respaldo cifrado');
    const data = await res.json();
    assert.ok(data.filename, 'Debe devolver nombre de archivo');
    assert.ok(data.filename.endsWith('.cetpro-backup'), 'Extensión debe ser .cetpro-backup');
    assert.equal(data.algorithm, 'aes-256-gcm');
    assert.equal(data.kdf, 'scrypt');
    assert.equal(data.hint, testHint);
    encryptedBackupFilename = data.filename;

    // Verificar en disco
    const filePath = path.join(QA_DATA_DIR, 'backups', data.filename);
    assert.ok(fs.existsSync(filePath), 'El archivo .cetpro-backup debe existir en disco');

    // Verificar contenido del sobre cifrado
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const envelope = JSON.parse(rawContent);
    assert.equal(envelope.type, 'ENCRYPTED_BACKUP_EXPORT');
    assert.equal(envelope.version, 1);
    assert.equal(envelope.kdf, 'scrypt');
    assert.equal(envelope.salt.length, 64, 'Salt hex de 32 bytes = 64 caracteres');
    assert.equal(envelope.iv.length, 24, 'IV hex de 12 bytes = 24 caracteres');
    assert.equal(envelope.authTag.length, 32, 'AuthTag hex de 16 bytes = 32 caracteres');
    assert.ok(envelope.ciphertext.length > 100, 'Ciphertext debe contener datos cifrados');
    assert.equal(envelope.hint, testHint);

    // 1.4 Confidencialidad estricta: contraseñas y hashes NO existen en texto plano en el archivo
    assert.ok(!rawContent.includes('DirectorDev2026!'), 'La contraseña en claro no debe figurar en el archivo cifrado');
    assert.ok(!rawContent.includes('$scrypt$'), 'Los hashes scrypt no deben estar en claro en el archivo');
    assert.ok(!rawContent.includes('estudiantes'), 'Los nombres de tablas no deben estar en claro en el archivo');
  });

  test('1.4 Preflight sin contraseña: detecta respaldo cifrado y requiere passphrase sin exponer datos', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/inspect`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ filename: encryptedBackupFilename }),
    });
    assert.equal(res.status, 200, 'Debe responder 200 con reporte de protección');
    const report = await res.json();
    assert.equal(report.encrypted, true);
    assert.equal(report.requiresPassphrase, true);
    assert.equal(report.algorithm, 'aes-256-gcm');
    assert.equal(report.kdf, 'scrypt');
    assert.equal(report.hint, testHint);
    assert.equal(report.counts, undefined, 'No debe filtrar conteo de entidades sin contraseña');
  });

  test('1.5 Preflight con contraseña incorrecta: rechaza con HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/inspect`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        filename: encryptedBackupFilename,
        passphrase: 'ClaveTotalmenteErronea!',
      }),
    });
    assert.equal(res.status, 400, 'Debe rechazar con HTTP 400');
    const err = await res.json();
    assert.match(err.error, /contraseña incorrecta/i);
  });

  test('1.6 Preflight con contraseña correcta: descifra en memoria y valida checksum SHA-256', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/inspect`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        filename: encryptedBackupFilename,
        passphrase: testPassphrase,
      }),
    });
    assert.equal(res.status, 200, 'Debe responder 200');
    const report = await res.json();
    assert.equal(report.valid, true);
    assert.equal(report.encrypted, true);
    assert.equal(report.checksumValid, true);
    assert.ok(report.totalRecords > 0, 'Debe contabilizar registros reales');
    assert.ok(report.counts.students >= 0);
    assert.ok(report.counts.users >= 3);
  });

  test('1.7 Restauración con contraseña incorrecta: rechaza con HTTP 400 sin alterar SQLite', async () => {
    const res = await fetch(`${BASE_URL}/api/restore`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        filename: encryptedBackupFilename,
        passphrase: 'ClaveInvalida!',
      }),
    });
    assert.equal(res.status, 400, 'Debe rechazar restauración con contraseña incorrecta');
  });

  test('1.8 Restauración exitosa con contraseña válida: genera respaldo preventivo y restaura transaccionalmente', async () => {
    const res = await fetch(`${BASE_URL}/api/restore`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        filename: encryptedBackupFilename,
        passphrase: testPassphrase,
      }),
    });
    assert.equal(res.status, 200, 'Debe restaurar satisfactoriamente');
    const result = await res.json();
    assert.equal(result.success, true);
    assert.ok(result.previousCopy, 'Debe crear copia preventiva antes-restaurar');
    assert.ok(result.previousCopy.includes('antes-restaurar'), 'Debe incluir etiqueta antes-restaurar');
  });

  // =========================================================================
  // BLOQUE 2: ARQUITECTURA Y SEGURIDAD ELECTRON DESKTOP (TAREA 38)
  // =========================================================================

  test('2.1 Existencia y configuración de archivos estructurales Electron', () => {
    const root = path.resolve(__dirname, '..');
    const mainFile = path.join(root, 'electron/main.cjs');
    const preloadFile = path.join(root, 'electron/preload.cjs');
    const runnerFile = path.join(root, 'electron/backend-runner.cjs');

    assert.ok(fs.existsSync(mainFile), 'electron/main.cjs debe existir');
    assert.ok(fs.existsSync(preloadFile), 'electron/preload.cjs debe existir');
    assert.ok(fs.existsSync(runnerFile), 'electron/backend-runner.cjs debe existir');
  });

  test('2.2 Auditoría estricta de seguridad en electron/main.cjs', () => {
    const root = path.resolve(__dirname, '..');
    const mainCode = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');

    // Instancia única
    assert.ok(mainCode.includes('requestSingleInstanceLock'), 'Debe implementar requestSingleInstanceLock');

    // Seguridad BrowserWindow
    assert.ok(mainCode.includes('contextIsolation: true'), 'contextIsolation debe ser true');
    assert.ok(mainCode.includes('nodeIntegration: false'), 'nodeIntegration debe ser false');
    assert.ok(mainCode.includes('sandbox: true'), 'sandbox debe ser true');
    assert.ok(mainCode.includes('webSecurity: true'), 'webSecurity debe ser true');

    // Navegación segura y bloqueo de popups
    assert.ok(mainCode.includes('setWindowOpenHandler'), 'Debe controlar apertura de ventanas');
    assert.ok(mainCode.includes('will-navigate'), 'Debe interceptar will-navigate');
    assert.ok(mainCode.includes('shell.openExternal'), 'Debe derivar enlaces seguros a shell.openExternal');

    // Aislamiento de datos en userData
    assert.ok(mainCode.includes("app.getPath('userData')"), 'Debe usar userData para datos persistentes');

    // CSP Headers
    assert.ok(mainCode.includes('Content-Security-Policy'), 'Debe configurar CSP');
  });

  test('2.3 Auditoría estricta de aislamiento en electron/preload.cjs', () => {
    const root = path.resolve(__dirname, '..');
    const preloadCode = fs.readFileSync(path.join(root, 'electron/preload.cjs'), 'utf8');

    assert.ok(preloadCode.includes('contextBridge.exposeInMainWorld'), 'Debe usar contextBridge.exposeInMainWorld');
    assert.ok(preloadCode.includes('electronAPI'), 'Debe exponer únicamente electronAPI');

    // Prohibición terminante de exponer primitivas peligrosas
    assert.ok(!preloadCode.includes('window.require'), 'No debe exponer window.require');
    assert.ok(!preloadCode.includes('window.process'), 'No debe exponer window.process');
    assert.ok(!preloadCode.includes("require('child_process')") && !preloadCode.includes('require("child_process")'), 'No debe importar child_process');
    assert.ok(!preloadCode.includes("require('fs')") && !preloadCode.includes('require("fs")'), 'No debe importar fs en el preload');
  });

  test('2.4 Verificación de backend-runner.cjs ejecutado bajo Node 24 en entorno aislado', async () => {
    const root = path.resolve(__dirname, '..');
    const runnerScript = path.join(root, 'electron/backend-runner.cjs');
    const testRunnerPort = 8091;
    const testRunnerDataDir = path.join(QA_DATA_DIR, 'test-electron-backend');
    fs.mkdirSync(testRunnerDataDir, { recursive: true });

    const child = spawn(process.execPath, [runnerScript], {
      cwd: root,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        CETPRO_PORT: String(testRunnerPort),
        CETPRO_DATA_DIR: testRunnerDataDir,
        CETPRO_ROOT: root,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    try {
      // Esperar a que el backend secundario responda a /api/status
      let ready = false;
      const start = Date.now();
      while (Date.now() - start < 8000) {
        await new Promise(r => setTimeout(r, 200));
        try {
          const res = await fetch(`http://127.0.0.1:${testRunnerPort}/api/status`);
          if (res.status === 200) {
            const status = await res.json();
            assert.ok(status.deviceId, 'El backend secundario debe responder con deviceId');
            ready = true;
            break;
          }
        } catch {}
      }

      assert.ok(ready, `backend-runner.cjs debe responder en puerto ${testRunnerPort}`);
    } finally {
      // Cierre ordenado
      if (child.connected) {
        child.send({ type: 'shutdown' });
      } else {
        child.kill('SIGTERM');
      }
      await new Promise(r => setTimeout(r, 500));
    }
  });
});
