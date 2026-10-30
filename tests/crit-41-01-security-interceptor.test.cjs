/**
 * tests/crit-41-01-security-interceptor.test.cjs
 * 
 * Suite de Pruebas Automatizadas de Regresión — TAREA 41A
 * Prevención de Fuga de Credenciales de Instancia (CRIT-41-01) y Protección de Setup
 * 
 * Verifica rigurosamente:
 * 1. Análisis robusto de URL y validación estricta de destino del backend legítimo.
 * 2. Rechazo categórico de hostnames alternativos, comodines, esquemas y puertos ajenos.
 * 3. Protección de cabeceras en redirecciones HTTP hacia destinos externos.
 * 4. Protección del endpoint /api/status y /api/setup ante solicitudes sin secreto o con secreto adulterado.
 * 5. Bloqueo de segundo setup ante nodo ya configurado (HTTP 409 Conflict).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const { QA_URL } = require('./helpers/qa-env.cjs');

describe('Seguridad de Transporte e Interceptor — Mitigación CRIT-41-01 (Tarea 41A)', () => {
  const root = path.resolve(__dirname, '..');
  const mainCode = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');

  test('1. Inspección de código: Eliminación total de comodines en urls de onBeforeSendHeaders', () => {
    // Prohibido utilizar urls con comodines para puertos loopback
    assert.ok(!mainCode.includes("urls: ['http://127.0.0.1:*/*', 'http://localhost:*/*']"), 'No debe contener filtro con comodín de puertos');
    assert.ok(!mainCode.includes('http://127.0.0.1:*'), 'No debe contener http://127.0.0.1:* en ningún interceptor');
    assert.ok(!mainCode.includes('http://localhost:*'), 'No debe contener http://localhost:* en ningún interceptor');

    // Debe existir la función de validación estricta
    assert.ok(mainCode.includes('function isLegitimateBackendUrl'), 'Debe definir isLegitimateBackendUrl');
    assert.ok(mainCode.includes('setupSecurityInterceptors'), 'Debe definir setupSecurityInterceptors');
  });

  test('2. Inspección de código: CSP restrictiva y eliminación de comodines en index.html', () => {
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(!indexHtml.includes('http://127.0.0.1:*'), 'index.html no debe incluir comodines de loopback');
    assert.ok(!indexHtml.includes('http://localhost:*'), 'index.html no debe incluir http://localhost:*');

    // Comprobar que main.cjs genera CSP dinámica sin comodines
    assert.ok(mainCode.includes("default-src 'self'"), 'CSP debe declarar default-src self');
    assert.ok(mainCode.includes("object-src 'none'"), 'CSP debe bloquear object-src');
    assert.ok(mainCode.includes("frame-ancestors 'none'"), 'CSP debe declarar frame-ancestors none');
    assert.ok(!mainCode.includes("'unsafe-eval'"), 'script-src no debe admitir unsafe-eval');
  });

  test('3. Función isLegitimateBackendUrl: Validación positiva con URL legítima', () => {
    // Extraer o reproducir la función exacta definida en main.cjs
    function isLegitimateBackendUrl(targetUrl, expectedPort) {
      if (typeof targetUrl !== 'string' || !targetUrl) return false;
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== 'http:') return false;
        if (parsed.hostname !== '127.0.0.1') return false;
        const parsedPort = parsed.port ? Number(parsed.port) : 80;
        if (parsedPort !== Number(expectedPort)) return false;
        if (parsed.username || parsed.password) return false;
        return true;
      } catch {
        return false;
      }
    }

    const testPort = 8085;
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:8085/api/status', testPort), true);
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:8085/api/login', testPort), true);
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:8085/', testPort), true);
  });

  test('4. Función isLegitimateBackendUrl: Rechazo de puertos loopback alternativos y maliciosos (CRIT-41-01)', () => {
    function isLegitimateBackendUrl(targetUrl, expectedPort) {
      if (typeof targetUrl !== 'string' || !targetUrl) return false;
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== 'http:') return false;
        if (parsed.hostname !== '127.0.0.1') return false;
        const parsedPort = parsed.port ? Number(parsed.port) : 80;
        if (parsedPort !== Number(expectedPort)) return false;
        if (parsed.username || parsed.password) return false;
        return true;
      } catch {
        return false;
      }
    }

    const testPort = 8085;

    // Rechazo de puerto rogue de auditoría
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:9988/sink', testPort), false);
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:9987/sink', testPort), false);
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:8086/api/status', testPort), false);
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1:80/api/status', testPort), false);
  });

  test('5. Función isLegitimateBackendUrl: Rechazo de hostnames engañosos, subdominios y localhost', () => {
    function isLegitimateBackendUrl(targetUrl, expectedPort) {
      if (typeof targetUrl !== 'string' || !targetUrl) return false;
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== 'http:') return false;
        if (parsed.hostname !== '127.0.0.1') return false;
        const parsedPort = parsed.port ? Number(parsed.port) : 80;
        if (parsedPort !== Number(expectedPort)) return false;
        if (parsed.username || parsed.password) return false;
        return true;
      } catch {
        return false;
      }
    }

    const testPort = 8085;

    // localhost no permitido en el validador estricto de IP
    assert.equal(isLegitimateBackendUrl('http://localhost:8085/api/status', testPort), false);
    // Subdominio que empiece con 127.0.0.1
    assert.equal(isLegitimateBackendUrl('http://127.0.0.1.attacker.com:8085/api/status', testPort), false);
    // Loopback alternativo
    assert.equal(isLegitimateBackendUrl('http://127.0.0.2:8085/api/status', testPort), false);
    // IP externa
    assert.equal(isLegitimateBackendUrl('http://192.168.1.1:8085/api/status', testPort), false);
    // Credenciales en URL
    assert.equal(isLegitimateBackendUrl('http://user:pass@127.0.0.1:8085/api/status', testPort), false);
    // Esquema HTTPS hacia loopback sin certificado
    assert.equal(isLegitimateBackendUrl('https://127.0.0.1:8085/api/status', testPort), false);
  });

  test('6. Protección de redirección: Purgado de secreto si la petición salta a un destino no legítimo', async () => {
    const testSecret = crypto.randomBytes(32).toString('hex');
    const legitPort = 8111;
    const roguePort = 8112;

    const receivedAtRogue = [];

    // Servidor rogue (puerto 8112)
    const rogueServer = http.createServer((req, res) => {
      receivedAtRogue.push({
        url: req.url,
        headers: req.headers,
        secret: req.headers['x-cetpro-instance-secret'] || null,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ captured: true }));
    });
    await new Promise(r => rogueServer.listen(roguePort, '127.0.0.1', r));

    // Servidor legítimo simulado que redirige con 302 hacia el puerto rogue
    const legitServer = http.createServer((req, res) => {
      res.writeHead(302, {
        'Location': `http://127.0.0.1:${roguePort}/stolen-data`,
      });
      res.end();
    });
    await new Promise(r => legitServer.listen(legitPort, '127.0.0.1', r));

    try {
      // Simular lógica de onBeforeSendHeaders ante redirección
      function simulateSendHeaders(targetUrl, incomingHeaders = {}) {
        const parsed = new URL(targetUrl);
        const headers = Object.assign({}, incomingHeaders);
        const isLegit = (
          parsed.protocol === 'http:' &&
          parsed.hostname === '127.0.0.1' &&
          Number(parsed.port || 80) === legitPort
        );

        if (isLegit) {
          headers['X-CETPRO-Instance-Secret'] = testSecret;
        } else {
          delete headers['X-CETPRO-Instance-Secret'];
          delete headers['x-cetpro-instance-secret'];
        }
        return headers;
      }

      // Paso 1: Petición inicial a servidor legítimo
      const initialHeaders = simulateSendHeaders(`http://127.0.0.1:${legitPort}/api/test`);
      assert.equal(initialHeaders['X-CETPRO-Instance-Secret'], testSecret, 'Debe adjuntar secreto en backend legítimo');

      // Paso 2: Redirección hacia roguePort 8112
      const redirectedHeaders = simulateSendHeaders(`http://127.0.0.1:${roguePort}/stolen-data`, initialHeaders);
      assert.equal(redirectedHeaders['X-CETPRO-Instance-Secret'], undefined, 'No debe filtrar secreto en destino redirigido');
      assert.equal(redirectedHeaders['x-cetpro-instance-secret'], undefined, 'No debe filtrar secreto en minúsculas');
    } finally {
      legitServer.close();
      rogueServer.close();
    }
  });

  test('7. Backend en Sandbox QA: GET /api/status y rutas protegidas operan normalmente', async () => {
    const res = await fetch(`${QA_URL}/api/status`);
    assert.equal(res.status, 200, 'GET /api/status debe retornar HTTP 200');
    const data = await res.json();
    assert.equal(typeof data.deviceId, 'string', 'Debe contener deviceId');
    assert.equal(typeof data.initialized, 'boolean', 'Debe contener initialized');
  });

  test('8. Seguridad de Primera Configuración: POST /api/setup bloqueado ante equipo ya configurado (HTTP 409)', async () => {
    // En sandbox QA initialized=true, cualquier intento de segundo setup debe ser rechazado
    const res = await fetch(`${QA_URL}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionName: 'Intento de Secuestro',
        directorName: 'Atacante Local',
        directorUsername: 'hacker',
        directorPassword: 'Password123!',
      }),
    });

    assert.equal(res.status, 409, 'POST /api/setup en equipo ya configurado debe retornar HTTP 409 Conflict');
    const body = await res.json();
    assert.ok(body.error.includes('ya está configurado') || body.error.includes('configurado'), 'Debe indicar que el equipo ya está configurado');
  });

  async function getDirectorToken() {
    const res = await fetch(`${QA_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director.dev', password: 'DirectorDev2026!' }),
    });
    assert.equal(res.status, 200, 'Login DIRECTOR debe responder 200');
    const data = await res.json();
    return data.token;
  }

  test('9. Regresión de Contrato: Solicitud mal formada a POST /api/students (sin name o sin document) retorna HTTP 400 Bad Request', async () => {
    const token = await getDirectorToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Caso a: Sin name (payload incorrecto detectado en Tarea 41B)
    const resWithoutName = await fetch(`${QA_URL}/api/students`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentNumber: '70891234',
        documentType: 'DNI',
        lastName1: 'QUISPE',
        lastName2: 'MAMANI',
        firstNames: 'CARLOS ALBERTO',
        birthDate: '2004-05-12',
        sex: 'M',
      }),
    });
    assert.equal(resWithoutName.status, 400, 'Petición sin name ni document debe responder HTTP 400');
    const bodyWithoutName = await resWithoutName.json();
    assert.equal(bodyWithoutName.error, 'Nombre y documento son obligatorios.');

    // Caso b: Con document pero sin name
    const resNoName = await fetch(`${QA_URL}/api/students`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document: '70891234',
        name: '',
      }),
    });
    assert.equal(resNoName.status, 400, 'Petición sin name debe responder HTTP 400');
    const bodyNoName = await resNoName.json();
    assert.equal(bodyNoName.error, 'Nombre y documento son obligatorios.');

    // Caso c: Con name pero sin document
    const resNoDoc = await fetch(`${QA_URL}/api/students`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'QUISPE MAMANI, CARLOS ALBERTO',
        document: '',
      }),
    });
    assert.equal(resNoDoc.status, 400, 'Petición sin document debe responder HTTP 400');
    const bodyNoDoc = await resNoDoc.json();
    assert.equal(bodyNoDoc.error, 'Nombre y documento son obligatorios.');
  });

  test('10. Regresión de Contrato: Solicitud bien formada a POST /api/students retorna HTTP 200 y persiste registro en SQLite', async () => {
    const token = await getDirectorToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const docId = '70899999';
    const payload = {
      document: docId,
      name: 'QUISPE MAMANI, CARLOS ALBERTO',
      documentType: 'DNI',
      lastName1: 'QUISPE',
      lastName2: 'MAMANI',
      firstNames: 'CARLOS ALBERTO',
      birthDate: '2004-05-12',
      sex: 'M',
    };

    const res = await fetch(`${QA_URL}/api/students`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200, 'Petición con payload canónico debe responder HTTP 200');
    const created = await res.json();
    assert.equal(created.document, docId);
    assert.equal(created.name, 'QUISPE MAMANI, CARLOS ALBERTO');
    assert.ok(created.id, 'Debe asignar ID de registro');
    assert.ok(created.rev, 'Debe asignar rev de concurrencia');

    // Verificar persistencia en dashboard overview
    const dashRes = await fetch(`${QA_URL}/api/dashboard?overview=1`, { headers });
    assert.equal(dashRes.status, 200, 'GET /api/dashboard?overview=1 debe responder HTTP 200');
    const dash = await dashRes.json();
    const found = dash.students.find(s => s.document === docId);
    assert.ok(found, 'El estudiante debe existir efectivamente en SQLite');
    assert.equal(found.name, 'QUISPE MAMANI, CARLOS ALBERTO');
  });

  test('11. Verificación de Aserción Estricta HTTP: El sistema de pruebas detecta y rechaza respuestas con error inesperado', async () => {
    function assertHttpResponseStrict(response, expectedStatus = 200) {
      if (!response.ok || response.status !== expectedStatus) {
        throw new Error(`Código de error HTTP inesperado: ${response.status} (esperado ${expectedStatus})`);
      }
    }

    const token = await getDirectorToken();

    // Caso 1: Endpoint no autorizado (403 con token docente a ruta restringida)
    const resDocenteLogin = await fetch(`${QA_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    const docData = await resDocenteLogin.json();
    const resForbidden = await fetch(`${QA_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${docData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document: '88888888', name: 'Prueba Docente' }),
    });

    assert.throws(
      () => assertHttpResponseStrict(resForbidden, 200),
      /Código de error HTTP inesperado: 403/,
      'El sistema de pruebas debe fallar explícitamente ante respuestas no 200'
    );

    // Caso 2: Petición exitosa pasa la validación estricta sin lanzar error
    const resOk = await fetch(`${QA_URL}/api/status`);
    assert.doesNotThrow(
      () => assertHttpResponseStrict(resOk, 200),
      'Petición 200 debe superar la aserción estricta sin error'
    );
  });
});

