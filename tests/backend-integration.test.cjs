const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { validateDevSandbox, DEFAULT_DEV_PORT } = require('../scripts/dev-sandbox-guard.cjs');
const { createService } = require('../scripts/offline-http.cjs');

const root = path.resolve(__dirname, '..');
const sandboxDir = process.env.CETPRO_DATA_DIR
  ? path.resolve(process.env.CETPRO_DATA_DIR)
  : path.resolve(root, 'dev-sandbox', 'data');

let server;
let service;
let baseUrl;

function request(method, route, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, baseUrl);
    const headers = { ...(options.headers || {}) };
    let bodyData = null;

    if (options.body || method === 'POST') {
      bodyData = JSON.stringify(options.body || {});
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(url, {
      method,
      headers
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

const TEST_PORT = 8086;

before(() => {
  // 1. Validar sandbox de forma estricta en puerto de test aislado (8086)
  const guard = validateDevSandbox({
    dataDir: sandboxDir,
    port: TEST_PORT
  });
  assert.equal(guard.safe, true);

  // 2. Levantar servicio en sandbox
  service = createService({
    root,
    directory: guard.dataDir,
    backupFile: null
  });

  server = service.server();
  return new Promise((resolve) => {
    server.listen(guard.port, guard.host, () => {
      baseUrl = `http://${guard.host}:${guard.port}`;
      resolve();
    });
  });
});

after(() => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        try {
          if (service && service.core) service.core.close();
        } catch {}
        resolve();
      });
    } else {
      resolve();
    }
  });
});

test('1. GET /api/status retorna estado institucional del sandbox', async () => {
  const res = await request('GET', '/api/status');
  assert.equal(res.status, 200);
  assert.equal(res.data.initialized, true);
  assert.equal(res.data.institutionName, 'CETPRO Micaela Bastidas (Sandbox Dev)');
  assert.ok(typeof res.data.deviceId === 'string');
  assert.ok(typeof res.data.fingerprint === 'string');
});

test('2. POST /api/login rechaza credenciales inválidas (401)', async () => {
  const res = await request('POST', '/api/login', {
    body: {
      username: 'docente.dev',
      password: 'ClaveTotalmenteIncorrecta!'
    }
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.error, 'Usuario o contraseña incorrectos.');
});

test('3. POST /api/login autentica correctamente a docente.dev y emite token Bearer', async () => {
  const res = await request('POST', '/api/login', {
    body: {
      username: 'docente.dev',
      password: 'DocenteDev2026!'
    }
  });
  assert.equal(res.status, 200);
  assert.ok(typeof res.data.token === 'string' && res.data.token.length === 64);
  assert.equal(res.data.user.username, 'docente.dev');
  assert.equal(res.data.user.role, 'DOCENTE');
  assert.equal(res.data.user.name, 'Prof. Martín Valdivia');
  assert.equal(res.data.user.active, true);
  // Verificar que NUNCA se exponga digest o salt
  assert.equal(res.data.user.digest, undefined);
  assert.equal(res.data.user.salt, undefined);
});

test('4. GET /api/me recupera identidad con token Bearer válido', async () => {
  // Primero login para obtener token fresco
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  // Petición a /api/me con token
  const meRes = await request('GET', '/api/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.username, 'docente.dev');
  assert.equal(meRes.data.role, 'DOCENTE');
  assert.equal(meRes.data.name, 'Prof. Martín Valdivia');
  assert.ok(Array.isArray(meRes.data.assignments));
  assert.equal(meRes.data.assignments.length, 2);
});

test('5. GET /api/me rechaza peticiones sin token o con token alterado (401)', async () => {
  const sinToken = await request('GET', '/api/me');
  assert.equal(sinToken.status, 401);

  const tokenFalso = await request('GET', '/api/me', {
    headers: { Authorization: 'Bearer 00112233445566778899aabbccddeeff' }
  });
  assert.equal(tokenFalso.status, 401);
  assert.equal(tokenFalso.data.error, 'Inicie sesión nuevamente.');
});

test('6. POST /api/logout invalida la sesión en el servidor', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  // Logout exitoso
  const logoutRes = await request('POST', '/api/logout', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.data.success, true);

  // Intentar usar el token invalidado
  const mePostLogout = await request('GET', '/api/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(mePostLogout.status, 401);
  assert.equal(mePostLogout.data.error, 'Inicie sesión nuevamente.');
});

test('7. POST /api/login autentica correctamente a director.dev y secretaria.dev', async () => {
  const dirLogin = await request('POST', '/api/login', {
    body: { username: 'director.dev', password: 'DirectorDev2026!' }
  });
  assert.equal(dirLogin.status, 200);
  assert.equal(dirLogin.data.user.role, 'DIRECTOR');

  const secLogin = await request('POST', '/api/login', {
    body: { username: 'secretaria.dev', password: 'SecretariaDev2026!' }
  });
  assert.equal(secLogin.status, 200);
  assert.equal(secLogin.data.user.role, 'SECRETARIA');
});

test('8. Cabeceras de seguridad: acepta loopback Vite (5173) y rechaza orígenes externos', async () => {
  // Origen permitido: loopback dev Vite
  const viteReq = await request('GET', '/api/status', {
    headers: { Origin: 'http://127.0.0.1:5173' }
  });
  assert.equal(viteReq.status, 200);
  assert.equal(viteReq.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');

  // Preflight OPTIONS desde loopback Vite
  const optionsReq = await request('OPTIONS', '/api/status', {
    headers: { Origin: 'http://127.0.0.1:5173' }
  });
  assert.equal(optionsReq.status, 204);

  // Origen prohibido: sitio web malicioso externo
  const evilReq = await request('GET', '/api/status', {
    headers: { Origin: 'http://sitio-malicioso.com' }
  });
  assert.equal(evilReq.status, 403);
  assert.equal(evilReq.data.error, 'Origen no permitido.');
});

test('9. GET /api/workspace/options retorna únicamente las aulas asignadas al DOCENTE', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const res = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.role, 'DOCENTE');
  assert.ok(Array.isArray(res.data.groups));
  assert.ok(res.data.groups.length >= 2, 'Docente debe tener al menos 2 aulas asignadas');

  // Verificar que todas las aulas retornadas pertenezcan al docente
  const names = res.data.groups.map(g => g.name);
  assert.ok(names.some(n => n.includes('Computación')));
  assert.ok(names.some(n => n.includes('Confección')));

  // Verificar que NO incluya aulas no asignadas (ej. Mecánica)
  assert.ok(!names.some(n => n.includes('Mecánica')), 'No debe retornar aulas de otros docentes o no asignadas');
});

test('10. POST /api/workspace rechaza aula no autorizada para DOCENTE (403)', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  // Intentar seleccionar aula no asignada (Mecánica Automotriz PROG-001 / MOD-001)
  const res = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: '2026',
      programId: 'PROG-001',
      moduleId: 'MOD-001',
      groupId: 'GRUPO-NO-AUTORIZADO',
      mode: 'UNIT',
      unit: 'UD1'
    }
  });
  assert.equal(res.status, 403);
  assert.ok(
    res.data.error.includes('no pertenece a su cuenta') ||
    res.data.error.includes('Seleccione') ||
    res.data.error.includes('alcance')
  );
});

test('11. POST /api/workspace selecciona aula y unidad válidas en modo UNIT', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const optsRes = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groupA = optsRes.data.groups.find(g => g.name.includes('Computación'));
  assert.ok(groupA);

  const selectRes = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: groupA.year,
      programId: groupA.programId,
      moduleId: groupA.moduleId,
      groupId: groupA.id,
      mode: 'UNIT',
      unit: 'UD1'
    }
  });

  assert.equal(selectRes.status, 200);
  assert.equal(selectRes.data.groupId, groupA.id);
  assert.equal(selectRes.data.mode, 'UNIT');
  assert.equal(selectRes.data.unit, 'UD1');
  assert.equal(selectRes.data.year, groupA.year);
});

test('12. GET /api/dashboard retorna información académica contextualizada tras selección', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const optsRes = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groupA = optsRes.data.groups.find(g => g.name.includes('Computación'));

  // Seleccionar workspace
  await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: groupA.year,
      programId: groupA.programId,
      moduleId: groupA.moduleId,
      groupId: groupA.id,
      mode: 'UNIT',
      unit: 'UD1'
    }
  });

  // Consultar dashboard contextual
  const dashRes = await request('GET', '/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(dashRes.status, 200);
  assert.ok(dashRes.data.workspace, 'Dashboard debe incluir workspace activo');
  assert.equal(dashRes.data.workspace.groupId, groupA.id);
  assert.equal(dashRes.data.workspace.unit, 'UD1');
  assert.equal(dashRes.data.groups.length, 1, 'Dashboard filtrado debe retornar solo el aula contextual');
});

test('13. POST /api/workspace rechaza unidad didáctica inexistente o no perteneciente al aula', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const optsRes = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groupA = optsRes.data.groups.find(g => g.name.includes('Computación'));

  const badUnitRes = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: groupA.year,
      programId: groupA.programId,
      moduleId: groupA.moduleId,
      groupId: groupA.id,
      mode: 'UNIT',
      unit: 'UD_FALSA_999'
    }
  });
  assert.equal(badUnitRes.status, 403);
  assert.ok(badUnitRes.data.error.includes('La unidad no pertenece al aula'));
});

test('14. Cambio entre aulas autorizadas actualiza inmediatamente el contexto', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const optsRes = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groupA = optsRes.data.groups.find(g => g.name.includes('Computación'));
  const groupB = optsRes.data.groups.find(g => g.name.includes('Confección'));
  assert.ok(groupA && groupB);

  // Seleccionar Aula A
  await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: groupA.year,
      programId: groupA.programId,
      moduleId: groupA.moduleId,
      groupId: groupA.id,
      mode: 'UNIT',
      unit: 'UD1'
    }
  });

  // Cambiar a Aula B
  const switchRes = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: groupB.year,
      programId: groupB.programId,
      moduleId: groupB.moduleId,
      groupId: groupB.id,
      mode: 'UNIT',
      unit: 'UD2'
    }
  });
  assert.equal(switchRes.status, 200);
  assert.equal(switchRes.data.groupId, groupB.id);
  assert.equal(switchRes.data.unit, 'UD2');

  // Dashboard refleja el cambio de aula
  const dashRes = await request('GET', '/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(dashRes.data.workspace.groupId, groupB.id);
  assert.equal(dashRes.data.workspace.unit, 'UD2');
});

test('15. POST /api/workspace con modo MODULE no acepta unidad (400)', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const optsRes = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groupA = optsRes.data.groups.find(g => g.name.includes('Computación'));

  const badModuleRes = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: {
      year: groupA.year,
      programId: groupA.programId,
      moduleId: groupA.moduleId,
      groupId: groupA.id,
      mode: 'MODULE',
      unit: 'UD1' // Error: en modo MODULE no debe llevar unit
    }
  });
  assert.equal(badModuleRes.status, 400);
  assert.ok(badModuleRes.data.error.includes('Los documentos del módulo incluyen todas sus unidades'));
});

test('16. POST /api/workspace rechaza selección overview para DOCENTE (403)', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  const overviewRes = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: { overview: true }
  });
  assert.equal(overviewRes.status, 403);
  assert.ok(overviewRes.data.error.includes('El docente debe seleccionar un módulo de sus aulas'));
});

test('17. DIRECTOR sí puede acceder a opciones globales y seleccionar overview', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'director.dev', password: 'DirectorDev2026!' }
  });
  const token = loginRes.data.token;

  const optsRes = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(optsRes.status, 200);
  assert.equal(optsRes.data.role, 'DIRECTOR');
  // Director ve todos los grupos del sistema (A, B y C)
  assert.ok(optsRes.data.groups.length >= 3);

  const overviewRes = await request('POST', '/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
    body: { overview: true }
  });
  assert.equal(overviewRes.status, 200);
  assert.equal(overviewRes.data.overview, true);
});

test('18. Tras logout, peticiones de workspace quedan no autorizadas (401)', async () => {
  const loginRes = await request('POST', '/api/login', {
    body: { username: 'docente.dev', password: 'DocenteDev2026!' }
  });
  const token = loginRes.data.token;

  await request('POST', '/api/logout', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const res = await request('GET', '/api/workspace/options', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(res.status, 401);
});
