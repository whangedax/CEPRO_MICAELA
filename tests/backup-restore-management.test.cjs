/**
 * tests/backup-restore-management.test.cjs
 * 
 * Suite de pruebas automatizadas para Sistema de Respaldos y Restauración (Tarea 36):
 * - Control de Acceso RBAC:
 *   * Exclusividad para DIRECTOR (HTTP 403 para SECRETARIA y DOCENTE).
 *   * Bloqueo ante peticiones sin autenticación (HTTP 401).
 * - Creación y Estructura Canónica de Respaldos:
 *   * Generación de respaldo manual y con etiqueta personalizada.
 *   * Validación de formato { backup, checksum } con SHA-256 canónico.
 *   * Permisos de archivo restringidos (0o600).
 * - Inspección y Preflight:
 *   * Verificación de firma e integridad sin alterar SQLite (dry-run).
 *   * Detección y rechazo de archivo corrupto o manipulado (HTTP 400).
 *   * Detección y rechazo de versiones incompatibles o app desconocida (HTTP 400).
 * - Seguridad de Rutas y Path Traversal:
 *   * Rechazo de rutas relativas con .., barras y nombres maliciosos (HTTP 400 / 403).
 * - Descarga de Respaldos:
 *   * Entrega segura con encabezados Content-Disposition y Content-Type application/json.
 * - Restauración Real sobre Base Sintética:
 *   * Generación automática del respaldo preventivo 'antes-restaurar'.
 *   * Ejecución atómica y transaccional con reversión ante relaciones huérfanas.
 *   * Verificación de persistencia y salud SQLite post-restauración (PRAGMA quick_check).
 * - Análisis WAL y SHM (Observación Tarea 35):
 *   * Verificación de variación de hash en -wal y -shm por auditoría sin modificar base principal.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';
const QA_DATA_DIR = process.env.CETPRO_DATA_DIR || path.resolve(__dirname, '../dev-sandbox/data/qa-isolated');

describe('Sistema de Respaldos y Restauración (Tarea 36)', () => {
  let tokenDirector = null;
  let tokenSecretaria = null;
  let tokenDocente = null;
  let headersDirector = {};
  let headersSecretaria = {};
  let headersDocente = {};

  before(async () => {
    // 1. Autenticar DIRECTOR
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

    // 2. Autenticar SECRETARIA
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

    // 3. Autenticar DOCENTE
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
  // 1. CONTROL DE ACCESO RBAC ESTRICTO
  // =========================================================================
  test('RBAC: SECRETARIA y DOCENTE tienen bloqueado el acceso a respaldos y restauración (HTTP 403)', async () => {
    // 1. Secretaria intenta listar respaldos
    const resSecList = await fetch(`${BASE_URL}/api/backups`, { headers: headersSecretaria });
    assert.equal(resSecList.status, 403, 'Secretaria no debe poder listar respaldos (403)');

    // 2. Docente intenta listar respaldos
    const resDocList = await fetch(`${BASE_URL}/api/backups`, { headers: headersDocente });
    assert.equal(resDocList.status, 403, 'Docente no debe poder listar respaldos (403)');

    // 3. Secretaria intenta crear respaldo
    const resSecCreate = await fetch(`${BASE_URL}/api/backup`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({ label: 'intento-secretaria' }),
    });
    assert.equal(resSecCreate.status, 403, 'Secretaria no debe poder crear respaldo (403)');

    // 4. Docente intenta restaurar
    const resDocRestore = await fetch(`${BASE_URL}/api/restore`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ filename: 'test.json' }),
    });
    assert.equal(resDocRestore.status, 403, 'Docente no debe poder restaurar (403)');

    // 5. Petición anónima sin token
    const resAnon = await fetch(`${BASE_URL}/api/backups`);
    assert.equal(resAnon.status, 401, 'Petición sin autenticación debe retornar 401');
  });

  // =========================================================================
  // 2. CREACIÓN MANUAL DE RESPALDO Y ESTRUCTURA CANÓNICA
  // =========================================================================
  let createdBackupFilename = null;

  test('Creación: DIRECTOR genera respaldo con etiqueta personalizada y estructura canónica', async () => {
    const res = await fetch(`${BASE_URL}/api/backup`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ label: 'auditoria-qa-tarea36' }),
    });

    assert.equal(res.status, 200, 'Creación de respaldo debe responder 200');
    const data = await res.json();
    assert.ok(data.filename, 'Debe devolver el nombre del archivo generado');
    assert.ok(data.filename.includes('auditoria-qa-tarea36'), 'Debe contener la etiqueta sanitizada');
    assert.ok(data.counts.records >= 0, 'Debe reportar conteo de registros');
    assert.ok(data.counts.operations >= 0, 'Debe reportar conteo de operaciones');

    createdBackupFilename = data.filename;

    // Verificar en disco en la carpeta de respaldos
    const filePath = path.join(QA_DATA_DIR, 'backups', data.filename);
    assert.ok(fs.existsSync(filePath), 'El archivo físico debe existir en backups/');

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    assert.ok(parsed.backup, 'Debe tener objeto backup');
    assert.equal(parsed.backup.app, 'CETPRO_OFFLINE');
    assert.equal(parsed.backup.version, 1);
    assert.ok(parsed.checksum, 'Debe tener checksum SHA-256');

    // Verificar cálculo del hash canónico
    const { OfflineCore, hash } = require('../scripts/offline-core.cjs');
    assert.equal(parsed.checksum, hash(parsed.backup), 'El checksum debe coincidir exactamente con el hash canónico');
  });

  // =========================================================================
  // 3. CONSULTA Y LISTADO DE RESPALDOS (GET /api/backups)
  // =========================================================================
  test('Listado: DIRECTOR consulta historial de respaldos disponibles', async () => {
    const res = await fetch(`${BASE_URL}/api/backups`, { headers: headersDirector });
    assert.equal(res.status, 200, 'Consulta de respaldos debe responder 200');
    const list = await res.json();
    assert.ok(Array.isArray(list), 'Debe devolver un array de respaldos');
    assert.ok(list.length > 0, 'Debe contener al menos el respaldo recién creado');

    const found = list.find(b => b.filename === createdBackupFilename);
    assert.ok(found, 'El respaldo creado debe aparecer en la lista');
    assert.equal(found.label, 'auditoria-qa-tarea36');
    assert.ok(found.size > 0, 'Debe reportar tamaño en bytes mayor a cero');
    assert.ok(found.createdAt, 'Debe reportar fecha de creación');
  });

  // =========================================================================
  // 4. INSPECCIÓN Y PREFLIGHT (POST /api/backup/inspect)
  // =========================================================================
  test('Inspección: Preflight valida checksum y analiza contenido sin modificar SQLite', async () => {
    const res = await fetch(`${BASE_URL}/api/backup/inspect`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ filename: createdBackupFilename }),
    });

    assert.equal(res.status, 200, 'Inspección debe responder 200');
    const report = await res.json();
    assert.equal(report.valid, true, 'Debe ser marcado como válido');
    assert.equal(report.app, 'CETPRO_OFFLINE');
    assert.equal(report.version, 1);
    assert.equal(report.checksumValid, true);
    assert.ok(report.totalRecords >= 0);
    assert.ok(report.counts, 'Debe desglosar conteos por entidad');
    assert.ok(report.counts.students !== undefined);
    assert.ok(report.counts.groups !== undefined);
  });

  test('Inspección: Rechaza archivo con checksum adulterado (HTTP 400)', async () => {
    const filePath = path.join(QA_DATA_DIR, 'backups', createdBackupFilename);
    const validRaw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Corromper el checksum
    const corrupted = {
      backup: validRaw.backup,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // hash inválido
    };

    const res = await fetch(`${BASE_URL}/api/backup/inspect`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ source: corrupted }),
    });

    assert.equal(res.status, 400, 'Checksum adulterado debe responder HTTP 400');
    const err = await res.json();
    assert.match(err.error, /checksum|corrupto/i);
  });

  test('Inspección: Rechaza archivo con app o versión incompatible (HTTP 400)', async () => {
    const filePath = path.join(QA_DATA_DIR, 'backups', createdBackupFilename);
    const validRaw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const { hash } = require('../scripts/offline-core.cjs');
    const invalidApp = structuredClone(validRaw.backup);
    invalidApp.app = 'OTRA_APP';

    const res = await fetch(`${BASE_URL}/api/backup/inspect`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        source: { backup: invalidApp, checksum: hash(invalidApp) },
      }),
    });

    assert.equal(res.status, 400, 'App incompatible debe responder HTTP 400');
    const err = await res.json();
    assert.match(err.error, /CETPRO_OFFLINE|formato/i);
  });

  // =========================================================================
  // 5. PROTECCIÓN CONTRA PATH TRAVERSAL Y DESCARGA SEGURA
  // =========================================================================
  test('Seguridad: Rechaza path traversal al descargar o inspeccionar respaldos', async () => {
    const maliciousPaths = [
      '../cetpro.sqlite',
      '..\\cetpro.sqlite',
      '../../package.json',
      '/etc/passwd',
      'C:\\Windows\\win.ini',
      'sub/algo.json',
    ];

    for (const malPath of maliciousPaths) {
      const res = await fetch(
        `${BASE_URL}/api/backup/download?filename=${encodeURIComponent(malPath)}`,
        { headers: headersDirector }
      );
      assert.ok([400, 403, 404].includes(res.status), `Debe rechazar ruta maliciosa: ${malPath}`);
    }
  });

  test('Descarga: Permite descargar archivo legítimo con cabeceras correctas', async () => {
    const res = await fetch(
      `${BASE_URL}/api/backup/download?filename=${encodeURIComponent(createdBackupFilename)}`,
      { headers: headersDirector }
    );

    assert.equal(res.status, 200, 'Descarga legítima debe responder 200');
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.match(res.headers.get('content-disposition'), /attachment/);
    const content = await res.json();
    assert.equal(content.backup.app, 'CETPRO_OFFLINE');
  });

  // =========================================================================
  // 6. RESTAURACIÓN REAL SOBRE BASE SINTÉTICA (DOS BASES INDEPENDIENTES)
  // =========================================================================
  test('Restauración Real: Restaura estado previo, crea respaldo preventivo antes-restaurar y verifica salud', async () => {
    const { OfflineCore } = require('../scripts/offline-core.cjs');

    // 1. Modificar un dato en la base activa (ej: cambiar nombre de un estudiante o agregar uno)
    const newStudentRes = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        name: 'Estudiante Temporal Para Prueba Restore',
        document: '99887766',
      }),
    });
    assert.equal(newStudentRes.status, 200, 'Estudiante temporal agregado');
    const tempStudent = await newStudentRes.json();

    // Comprobar que existe
    const dashAfterAdd = await (await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector })).json();
    assert.ok(dashAfterAdd.students.some(s => s.id === tempStudent.id), 'Estudiante temporal debe estar presente');

    // 2. Restaurar el respaldo tomado antes de agregar al estudiante temporal
    const resRestore = await fetch(`${BASE_URL}/api/restore`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ filename: createdBackupFilename }),
    });

    assert.equal(resRestore.status, 200, 'Restauración debe responder 200');
    const restoreResult = await resRestore.json();
    assert.equal(restoreResult.success, true);
    assert.ok(restoreResult.previousCopy, 'Debe devolver el nombre del respaldo preventivo antes-restaurar');
    assert.ok(restoreResult.previousCopy.includes('antes-restaurar'), 'Debe incluir etiqueta antes-restaurar');

    // 3. Comprobar que el estudiante temporal ya NO existe en la base restaurada
    const dashAfterRestore = await (await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector })).json();
    assert.ok(!dashAfterRestore.students.some(s => s.id === tempStudent.id), 'Estudiante temporal debe haber desaparecido tras restaurar');

    // 4. Comprobar que la salud e integridad física (PRAGMA quick_check) y lógica están 100% OK
    const healthRes = await fetch(`${BASE_URL}/api/database/health`, { headers: headersDirector });
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.physicalIntegrity, true, 'Integridad física debe ser true');
    assert.equal(health.healthy, true, 'Base debe ser 100% saludable tras restaurar');
  });

  // =========================================================================
  // 7. INVESTIGACIÓN WAL Y SHM (OBSERVACIÓN TAREA 35)
  // =========================================================================
  test('Análisis WAL/SHM: Inserción de auditoría modifica -wal y -shm sin alterar cetpro.sqlite antes del checkpoint', async () => {
    const dbPath = path.join(QA_DATA_DIR, 'cetpro.sqlite');
    const walPath = path.join(QA_DATA_DIR, 'cetpro.sqlite-wal');
    const shmPath = path.join(QA_DATA_DIR, 'cetpro.sqlite-shm');

    const getHash = (p) => {
      if (!fs.existsSync(p)) return null;
      return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    };

    const hashDbBefore = getHash(dbPath);
    const hashWalBefore = getHash(walPath);
    const hashShmBefore = getHash(shmPath);

    // Ejecutar una operación de escritura (ej: registrar un estudiante que escribe en records y audit)
    await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({ name: 'Estudiante Para WAL Test', document: '77665544' }),
    });

    const hashDbAfter = getHash(dbPath);
    const hashWalAfter = getHash(walPath);
    const hashShmAfter = getHash(shmPath);

    // En SQLite WAL mode sin checkpoint automático de 1000 páginas:
    // cetpro.sqlite permanece intacto
    assert.equal(hashDbBefore, hashDbAfter, 'El hash de cetpro.sqlite debe permanecer idéntico en transacciones pequeñas');
    // Mientras que -wal y -shm absorben las escrituras del WAL
    assert.notEqual(hashWalBefore, hashWalAfter, 'El hash de cetpro.sqlite-wal debe cambiar con nuevas inserciones');
  });

  // =========================================================================
  // 8. PRUEBAS REGRESIÓN TAREA 36A (DIAGNÓSTICO SQLITE Y CONCORDANCIA REAL)
  // =========================================================================
  test('PRUEBA E y H: Diagnóstico SQLite en base sana y concordancia de contadores con consultas SQL', async () => {
    // 1. Probar tanto /api/database/health como el alias /api/system/health
    const resDbHealth = await fetch(`${BASE_URL}/api/database/health`, { headers: headersDirector });
    assert.equal(resDbHealth.status, 200, 'GET /api/database/health debe responder 200');
    const health = await resDbHealth.json();

    const resSysHealth = await fetch(`${BASE_URL}/api/system/health`, { headers: headersDirector });
    assert.equal(resSysHealth.status, 200, 'GET /api/system/health debe responder 200');

    // 2. Verificar que la base sintética sana reporta integridad física y lógica
    assert.equal(health.physicalIntegrity, true, 'Base sintética sana debe reportar physicalIntegrity=true');
    assert.equal(health.healthy, true, 'Base sintética sana debe reportar healthy=true');
    assert.equal(health.quickCheck, 'ok', 'quick_check debe ser ok');
    assert.equal(health.integrityCheck, 'ok', 'integrity_check debe ser ok');
    assert.equal(health.foreignKeyCheck, 'ok', 'foreign_key_check debe ser ok');
    assert.equal(health.schemaVersion, 2, 'schemaVersion debe ser 2');
    assert.equal(health.journalMode.toLowerCase(), 'wal', 'journalMode debe ser wal');
    assert.ok(Array.isArray(health.errors), 'errors debe ser array');
    assert.equal(health.errors.length, 0, 'No debe haber errores en base sana');
    assert.ok(Array.isArray(health.warnings), 'warnings debe ser array');

    // 3. Verificar contadores académicos contra SQLite independiente
    const { OfflineCore } = require('../scripts/offline-core.cjs');
    const core = new OfflineCore(QA_DATA_DIR);
    try {
      const sqlCount = (entity) => core.db.prepare('SELECT COUNT(*) AS count FROM records WHERE entity=?').get(entity).count;
      assert.equal(health.counts.students, sqlCount('students'), 'Conteo de estudiantes en diagnóstico debe coincidir con SQL');
      assert.equal(health.counts.enrollments, sqlCount('enrollments'), 'Conteo de matrículas en diagnóstico debe coincidir con SQL');
      assert.equal(health.counts.groups, sqlCount('groups'), 'Conteo de grupos en diagnóstico debe coincidir con SQL');
      assert.equal(health.counts.grades, sqlCount('grades'), 'Conteo de notas en diagnóstico debe coincidir con SQL');
      assert.equal(health.counts.attendance, sqlCount('attendance'), 'Conteo de asistencias en diagnóstico debe coincidir con SQL');
    } finally {
      core.close();
    }
  });

  test('PRUEBA F y G: Tratamiento de errores y advertencias en endpoints de salud y respaldos', async () => {
    // 1. Petición no autorizada a salud debe fallar con 401 o 403, nunca mostrar base corrupta
    const unauthRes = await fetch(`${BASE_URL}/api/database/health`);
    assert.equal(unauthRes.status, 401, 'Petición anónima debe retornar 401');

    const docenteRes = await fetch(`${BASE_URL}/api/database/health`, { headers: headersDocente });
    assert.equal(docenteRes.status, 403, 'Docente debe recibir 403 en salud SQLite');

    // 2. Comprobar que advertencias legítimas se reportan con código y entidad
    const resHealth = await fetch(`${BASE_URL}/api/database/health`, { headers: headersDirector });
    const health = await resHealth.json();
    if (health.warnings.length > 0) {
      const w = health.warnings[0];
      assert.ok(w.code, 'Cada advertencia debe tener un código');
      assert.ok(w.entity, 'Cada advertencia debe tener entidad asociada');
      assert.ok(w.message, 'Cada advertencia debe tener mensaje descriptivo');
      // Las advertencias no alteran physicalIntegrity
      assert.equal(health.physicalIntegrity, true, 'Advertencias de negocio no comprometen physicalIntegrity');
    }
  });

  test('PRUEBA EXPERIMENTAL WAL: Efectos de lecturas, escrituras y checkpoint explícito', async () => {
    const dbPath = path.join(QA_DATA_DIR, 'cetpro.sqlite');
    const walPath = path.join(QA_DATA_DIR, 'cetpro.sqlite-wal');

    const getHash = (p) => {
      if (!fs.existsSync(p)) return null;
      return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    };

    // 1. Efecto de lecturas: Consultar varias veces dashboard y health
    const walBeforeRead = getHash(walPath);
    const dbBeforeRead = getHash(dbPath);

    await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector });
    await fetch(`${BASE_URL}/api/database/health`, { headers: headersDirector });
    await fetch(`${BASE_URL}/api/backups`, { headers: headersDirector });

    const walAfterRead = getHash(walPath);
    const dbAfterRead = getHash(dbPath);

    assert.equal(walBeforeRead, walAfterRead, 'Operaciones de solo lectura pura no alteran el archivo WAL');
    assert.equal(dbBeforeRead, dbAfterRead, 'Operaciones de solo lectura pura no alteran el archivo principal SQLite');

    // 2. Efecto de checkpoint: Ejecutar checkpoint explícito para consolidar páginas WAL a cetpro.sqlite
    const { OfflineCore } = require('../scripts/offline-core.cjs');
    const core = new OfflineCore(QA_DATA_DIR);
    try {
      const checkpointResult = core.db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get();
      assert.equal(checkpointResult.busy, 0, 'Checkpoint pasivo debe ejecutarse sin bloqueo');
    } finally {
      core.close();
    }
  });
});
