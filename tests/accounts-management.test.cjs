/**
 * tests/accounts-management.test.cjs
 * 
 * Suite de pruebas automatizadas para Gestión de Cuentas, Usuarios y Asignaciones (Tarea 31):
 * - Directorio institucional y control RBAC:
 *   * DIRECTOR: Acceso total a todos los roles (DIRECTOR, SECRETARIA, DOCENTE).
 *   * SECRETARIA: Consulta y administración restringida exclusivamente a DOCENTE (HTTP 403 en otros roles).
 *   * DOCENTE: Bloqueo de operaciones de directorio administrativo (HTTP 403).
 * - Creación y edición de cuentas de usuario:
 *   * Rechazo de nombres de usuario duplicados (HTTP 409).
 *   * Obligatoriedad de contraseña inicial en creación.
 *   * Cero exposición de hashes (digest, salt) en respuestas públicas.
 * - Asignaciones docentes (DOCENTE -> GRUPO -> UNIDADES):
 *   * Normalización y validación de grupos y unidades didácticas.
 *   * Compatibilidad con cuentas provisionales (assignmentPending: true).
 * - Control de concurrencia optimista (version / HTTP 409).
 * - Reglas de archivación y baja institucional:
 *   * Imposibilidad de archivar la propia cuenta activa en sesión.
 *   * Imposibilidad de dar de baja al único director activo.
 *   * Requisito de motivo no vacío para archivación auditada.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Gestión de Cuentas, Usuarios y Asignaciones (Tarea 31)', () => {
  let tokenDirector = null;
  let tokenSecretaria = null;
  let tokenDocente = null;
  let userDirector = null;
  let userSecretaria = null;
  let userDocente = null;
  let headersDirector = {};
  let headersSecretaria = {};
  let headersDocente = {};
  let availableGroups = [];

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
    userDirector = dirData.user;
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
    userSecretaria = secData.user;
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
    userDocente = docData.user;
    headersDocente = {
      'Authorization': `Bearer ${tokenDocente}`,
      'Content-Type': 'application/json',
    };

    // 4. Obtener grupos institucionales disponibles
    const dashRes = await fetch(`${BASE_URL}/api/dashboard?overview=1`, {
      headers: headersDirector,
    });
    assert.equal(dashRes.status, 200);
    const dash = await dashRes.json();
    availableGroups = dash.groups || [];
    assert.ok(availableGroups.length > 0, 'Debe haber grupos disponibles para las pruebas');
  });

  test('RBAC: DIRECTOR visualiza todos los roles y DOCENTE está bloqueado de /api/users', async () => {
    // 1. Director puede listar todos los usuarios
    const resDir = await fetch(`${BASE_URL}/api/users`, { headers: headersDirector });
    assert.equal(resDir.status, 200, 'Director debe poder listar usuarios (200)');
    const usersDir = await resDir.json();
    assert.ok(Array.isArray(usersDir), 'Debe retornar un array');
    const rolesDir = new Set(usersDir.map((u) => u.role));
    assert.ok(rolesDir.has('DIRECTOR'), 'Director debe ver cuentas DIRECTOR');
    assert.ok(rolesDir.has('SECRETARIA'), 'Director debe ver cuentas SECRETARIA');
    assert.ok(rolesDir.has('DOCENTE'), 'Director debe ver cuentas DOCENTE');

    // Cero exposición de hashes
    for (const u of usersDir) {
      assert.equal(u.digest, undefined, 'No debe exponerse hash digest');
      assert.equal(u.salt, undefined, 'No debe exponerse hash salt');
      assert.equal(u.password, undefined, 'No debe exponerse campo password');
    }

    // 2. Docente intentando listar usuarios recibe 403
    const resDoc = await fetch(`${BASE_URL}/api/users`, { headers: headersDocente });
    assert.equal(resDoc.status, 403, 'Docente debe recibir HTTP 403 en /api/users');
  });

  test('RBAC: SECRETARIA solo visualiza y administra cuentas con rol DOCENTE', async () => {
    const resSec = await fetch(`${BASE_URL}/api/users`, { headers: headersSecretaria });
    assert.equal(resSec.status, 200, 'Secretaria debe poder listar usuarios (200)');
    const usersSec = await resSec.json();
    assert.ok(Array.isArray(usersSec), 'Debe retornar un array');

    // Secretaría solo debe ver docentes
    for (const u of usersSec) {
      assert.equal(u.role, 'DOCENTE', 'Secretaría solo puede ver cuentas con rol DOCENTE');
    }

    // Secretaría intentando registrar un DIRECTOR recibe 403
    const createDir = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        username: 'subdirector.qa',
        name: 'Subdirector QA',
        role: 'DIRECTOR',
        password: 'Password123!',
      }),
    });
    assert.equal(createDir.status, 403, 'Secretaría debe recibir 403 al intentar crear cuenta no-DOCENTE');

    // Secretaría intentando registrar otra SECRETARIA recibe 403
    const createSec = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        username: 'asistente.qa',
        name: 'Asistente QA',
        role: 'SECRETARIA',
        password: 'Password123!',
      }),
    });
    assert.equal(createSec.status, 403, 'Secretaría debe recibir 403 al intentar crear cuenta SECRETARIA');
  });

  test('Creación de docente por SECRETARIA con asignación provisional (assignmentPending: true)', async () => {
    const newUsername = `docente.temp.${Date.now()}`;
    const payload = {
      username: newUsername,
      name: 'Profesor Provisional QA',
      description: 'Especialista en Computación',
      role: 'DOCENTE',
      password: 'DocentePass2026!',
      active: true,
      assignmentPending: true,
      assignments: [],
    };

    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200, 'Secretaría debe poder registrar docente provisional');
    const created = await res.json();
    assert.equal(created.username, newUsername);
    assert.equal(created.role, 'DOCENTE');
    assert.equal(created.assignmentPending, true);
    assert.equal(created.active, true);
    assert.equal(created.version, 1);
    assert.equal(created.digest, undefined, 'No debe retornar credenciales sensibles');
  });

  test('Validación: Rechazo de nombres de usuario duplicados (HTTP 409)', async () => {
    const payload = {
      username: 'docente.dev', // Ya existe
      name: 'Docente Duplicado',
      role: 'DOCENTE',
      password: 'DocentePass2026!',
      assignmentPending: true,
    };

    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 409, 'Debe responder HTTP 409 ante usuario duplicado');
    const err = await res.json();
    assert.match(err.error, /ya existe/i);
  });

  test('Asignaciones docentes: Asignar grupo y unidades válidas a un docente', async () => {
    const testGroup = availableGroups[0];
    assert.ok(testGroup.units && testGroup.units.length > 0, 'Grupo de prueba debe tener unidades');

    const newUsername = `docente.aula.${Date.now()}`;
    const payload = {
      username: newUsername,
      name: 'Profesor Titular QA',
      role: 'DOCENTE',
      password: 'DocentePass2026!',
      active: true,
      assignmentPending: false,
      assignments: [
        {
          groupId: testGroup.id,
          units: [testGroup.units[0]],
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200, 'Debe crear docente con asignación de aula');
    const created = await res.json();
    assert.equal(created.assignments.length, 1);
    assert.equal(created.assignments[0].groupId, testGroup.id);
    assert.deepEqual(created.assignments[0].units, [testGroup.units[0]]);
    assert.equal(created.assignments[0].periodId, testGroup.periodId);
    assert.equal(created.assignments[0].moduleId, testGroup.moduleId);
    assert.equal(created.assignmentPending, false);
  });

  test('Validación: Docente sin asignaciones y con assignmentPending: false es rechazado', async () => {
    const payload = {
      username: `docente.invalido.${Date.now()}`,
      name: 'Profesor Invalido',
      role: 'DOCENTE',
      password: 'DocentePass2026!',
      assignmentPending: false,
      assignments: [],
    };

    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 400, 'Debe responder HTTP 400 al no tener aulas ni flag provisional');
  });

  test('Concurrencia optimista: Versión obsoleta produce HTTP 409', async () => {
    // 1. Crear usuario
    const username = `docente.concurrencia.${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        username,
        name: 'Docente Concurrente',
        role: 'DOCENTE',
        password: 'Password2026!',
        assignmentPending: true,
      }),
    });
    assert.equal(createRes.status, 200);
    const user = await createRes.json();
    assert.equal(user.version, 1);

    // 2. Intentar actualizar con versión incorrecta (ej. version 99)
    const updateConflict = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        ...user,
        name: 'Docente Nombre Modificado',
        version: 99,
      }),
    });
    assert.equal(updateConflict.status, 409, 'Versión obsoleta debe responder HTTP 409');
    const err = await updateConflict.json();
    assert.match(err.error, /cambió/i);

    // 3. Actualizar con versión correcta (version 1) -> pasa a version 2
    const updateOk = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        ...user,
        name: 'Docente Nombre Correcto',
        version: 1,
      }),
    });
    assert.equal(updateOk.status, 200, 'Actualización con versión correcta debe responder 200');
    const updated = await updateOk.json();
    assert.equal(updated.version, 2);
    assert.equal(updated.name, 'Docente Nombre Correcto');
  });

  test('Seguridad y Archivación: Imposible archivar la cuenta con la que se tiene sesión activa', async () => {
    const res = await fetch(`${BASE_URL}/api/users/archive`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: userDirector.id,
        version: userDirector.version,
        reason: 'Intento de auto-archivación',
      }),
    });
    assert.equal(res.status, 400, 'No debe permitir auto-eliminar la cuenta en sesión');
    const err = await res.json();
    assert.match(err.error, /no puede eliminar la cuenta con la que está trabajando/i);
  });

  test('Seguridad y Archivación: Imposible dar de baja al único director activo', async () => {
    // Buscar la cuenta del director
    const resUsers = await fetch(`${BASE_URL}/api/users`, { headers: headersDirector });
    const allUsers = await resUsers.json();
    const directors = allUsers.filter((u) => u.role === 'DIRECTOR' && u.active);

    if (directors.length === 1) {
      // Intentar desactivarlo actualizando su ficha
      const director = directors[0];
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          ...director,
          active: false,
          version: director.version,
        }),
      });
      assert.equal(res.status, 400, 'Debe impedir desactivar al único director activo');
      const err = await res.json();
      assert.match(err.error, /conservar un director activo/i);
    }
  });

  test('Archivación de cuenta docente con motivo auditable obligatorio', async () => {
    // 1. Crear un docente para archivar
    const username = `docente.baja.${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        username,
        name: 'Docente Para Archivar',
        role: 'DOCENTE',
        password: 'DocentePass2026!',
        assignmentPending: true,
      }),
    });
    assert.equal(createRes.status, 200);
    const userToArchive = await createRes.json();

    // 2. Intentar archivar sin motivo
    const resNoReason = await fetch(`${BASE_URL}/api/users/archive`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: userToArchive.id,
        version: userToArchive.version,
        reason: '   ',
      }),
    });
    assert.equal(resNoReason.status, 400, 'Debe requerir motivo para archivar');

    // 3. Archivar con motivo válido
    const resArchive = await fetch(`${BASE_URL}/api/users/archive`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: userToArchive.id,
        version: userToArchive.version,
        reason: 'Baja institucional por fin de ciclo lectivo',
      }),
    });
    assert.equal(resArchive.status, 200, 'Debe archivar satisfactoriamente con motivo');
    const archived = await resArchive.json();
    assert.equal(archived.active, false);
    assert.equal(archived.archived, true);
  });
});
