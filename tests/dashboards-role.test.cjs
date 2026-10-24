/**
 * tests/dashboards-role.test.cjs
 * 
 * Suite de pruebas automatizadas para la modernización integral de Dashboards por Rol (Tarea 26):
 * - Dashboard de Dirección (DashboardDireccion.tsx): Métricas reales de supervisión, acceso institucional y respaldo.
 * - Dashboard de Secretaría (DashboardSecretaria.tsx): Métricas de gestión académica, trámites autorizados y exclusión de respaldo.
 * - Dashboard Docente (DashboardDocente.tsx): Preservación estricta y aislamiento de aula.
 * - Políticas oficiales de rutas según scripts/role-policy.cjs.
 * - Validación de contratos de datos para GET /api/dashboard?overview=1.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const rolePolicy = require('../scripts/role-policy.cjs');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Dashboards por Rol — Dirección, Secretaría y Docente (Tarea 26)', () => {
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
  // 1. DASHBOARD DIRECCIÓN — CONTRATO DE MÉTRICAS Y SUPERVISIÓN
  // =========================================================================

  test('1. DIRECTOR: GET /api/dashboard?overview=1 retorna contrato completo de supervisión', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector });
    assert.equal(res.status, 200, 'Debe responder HTTP 200 para DIRECTOR');

    const data = await res.json();
    assert.ok(Array.isArray(data.students), 'Debe incluir lista de estudiantes');
    assert.ok(Array.isArray(data.enrollments), 'Debe incluir lista de matrículas');
    assert.ok(Array.isArray(data.groups), 'Debe incluir lista de grupos');
    assert.ok(Array.isArray(data.programs), 'Debe incluir lista de programas');
    assert.ok(Array.isArray(data.modules), 'Debe incluir lista de módulos');
    assert.ok(Array.isArray(data.submissions), 'Debe incluir entregas');
    assert.ok(data.status, 'Debe incluir objeto de estado institucional');

    // Validación de métricas no ficticias (valores reales de SQLite)
    const activeStudents = data.students.filter(s => s.active && !s.archived).length;
    const activeEnrollments = data.enrollments.filter(e => e.active).length;
    const groupsCount = data.groups.length;

    assert.ok(activeStudents > 0, 'Debe haber estudiantes activos registrados en SQLite');
    assert.ok(activeEnrollments > 0, 'Debe haber matrículas activas registradas en SQLite');
    assert.ok(groupsCount > 0, 'Debe haber grupos registrados en SQLite');
    assert.ok(data.programs.length > 0, 'Debe haber programas formativos registrados');
    assert.ok(data.modules.length > 0, 'Debe haber módulos registrados');
  });

  test('2. DIRECTOR: Acceso autorizado a endpoint de salud y respaldo de base de datos', async () => {
    const res = await fetch(`${BASE_URL}/api/database/health`, { headers: headersDirector });
    assert.equal(res.status, 200, 'DIRECTOR debe tener acceso a /api/database/health');
    const health = await res.json();
    assert.ok(health.healthy !== undefined, 'Debe retornar propiedad healthy');
  });

  test('3. DIRECTOR: Política de rutas contiene todos los módulos institucionales y respaldo', () => {
    const policy = rolePolicy.policyFor({ role: 'DIRECTOR' });
    const routes = policy.routes;

    const expectedRoutes = [
      'inicio',
      'estudiantes',
      'matriculas',
      'grupos',
      'evaluacion',
      'asistencia',
      'documentos',
      'configuracion-documental',
      'entregas',
      'datos',
      'cuentas',
      'sincronizacion',
      'respaldo',
      'configuracion-academica',
      'perfil',
    ];

    for (const r of expectedRoutes) {
      assert.ok(routes.includes(r), `DIRECTOR debe tener autorizada la ruta: ${r}`);
    }
    assert.ok(routes.includes('respaldo'), 'DIRECTOR debe tener acceso exclusivo a respaldo');
  });

  // =========================================================================
  // 2. DASHBOARD SECRETARÍA — CONTRATO DE GESTIÓN Y EXCLUSIÓN DE RESPALDO
  // =========================================================================

  test('4. SECRETARIA: GET /api/dashboard?overview=1 retorna métricas de gestión académica', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersSecretaria });
    assert.equal(res.status, 200, 'Debe responder HTTP 200 para SECRETARIA');

    const data = await res.json();
    assert.ok(Array.isArray(data.students), 'Debe incluir lista de estudiantes');
    assert.ok(Array.isArray(data.enrollments), 'Debe incluir lista de matrículas');
    assert.ok(Array.isArray(data.groups), 'Debe incluir lista de grupos');
    assert.ok(Array.isArray(data.submissions), 'Debe incluir entregas para revisión en mesa de partes');

    const activeStudents = data.students.filter(s => s.active && !s.archived).length;
    const activeEnrollments = data.enrollments.filter(e => e.active).length;
    assert.ok(activeStudents > 0, 'Debe reportar estudiantes activos en secretaría');
    assert.ok(activeEnrollments > 0, 'Debe reportar matrículas activas en secretaría');
  });

  test('5. SECRETARIA: Bloqueo estricto ante endpoint de salud y respaldo de base de datos (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/database/health`, { headers: headersSecretaria });
    assert.equal(res.status, 403, 'SECRETARIA no debe tener acceso a /api/database/health (HTTP 403)');
  });

  test('6. SECRETARIA: Política oficial de rutas EXCLUYE rigurosamente la ruta "respaldo"', () => {
    const policy = rolePolicy.policyFor({ role: 'SECRETARIA' });
    const routes = policy.routes;

    assert.equal(routes.includes('respaldo'), false, 'SECRETARIA NO debe tener acceso a la ruta respaldo');
    assert.ok(routes.includes('matriculas'), 'SECRETARIA debe tener acceso a matriculas');
    assert.ok(routes.includes('estudiantes'), 'SECRETARIA debe tener acceso a estudiantes');
    assert.ok(routes.includes('entregas'), 'SECRETARIA debe tener acceso a entregas');
    assert.ok(routes.includes('documentos'), 'SECRETARIA debe tener acceso a documentos');
    assert.ok(routes.includes('cuentas'), 'SECRETARIA debe tener acceso a cuentas');
    assert.ok(routes.includes('grupos'), 'SECRETARIA debe tener acceso a grupos');
    assert.ok(routes.includes('configuracion-documental'), 'SECRETARIA debe tener acceso a configuracion-documental');
    assert.ok(routes.includes('sincronizacion'), 'SECRETARIA debe tener acceso a sincronizacion');
    assert.ok(routes.includes('configuracion-academica'), 'SECRETARIA debe tener acceso a configuracion-academica');
  });

  // =========================================================================
  // 3. AISLAMIENTO DEL ROL DOCENTE
  // =========================================================================

  test('7. DOCENTE: Intento de POST /api/workspace con overview es rechazado (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ overview: true }),
    });
    assert.equal(res.status, 403, 'DOCENTE no puede activar modo overview institucional');
  });

  test('8. DOCENTE: Política de rutas restringe módulos administrativos exclusivos', () => {
    const policy = rolePolicy.policyFor({ role: 'DOCENTE' });
    const routes = policy.routes;

    assert.equal(routes.includes('respaldo'), false, 'DOCENTE NO tiene acceso a respaldo');
    assert.equal(routes.includes('cuentas'), false, 'DOCENTE NO tiene acceso a cuentas');
    assert.equal(routes.includes('matriculas'), false, 'DOCENTE NO tiene acceso a matriculas generales');
    assert.equal(routes.includes('configuracion-academica'), false, 'DOCENTE NO tiene acceso a configuracion-academica');
    
    assert.ok(routes.includes('inicio'), 'DOCENTE tiene acceso a su dashboard de aula');
    assert.ok(routes.includes('asistencia'), 'DOCENTE tiene acceso a asistencia');
    assert.ok(routes.includes('evaluacion'), 'DOCENTE tiene acceso a evaluacion');
    assert.ok(routes.includes('documentos'), 'DOCENTE tiene acceso a centro documental');
    assert.ok(routes.includes('entregas'), 'DOCENTE tiene acceso a entregas');
  });

  // =========================================================================
  // 4. VERIFICACIÓN DE CORRECCIONES DE TAREA 25 EN ENTREGAS Y REVISIÓN
  // =========================================================================

  test('9. ENTREGAS: Contrato de entregas soporta estados normados y campos de auditoría', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector });
    assert.equal(res.status, 200);
    const data = await res.json();
    const submissions = data.submissions || [];

    for (const sub of submissions) {
      assert.ok(sub.id, 'Toda entrega debe poseer un id');
      assert.ok(sub.templateId, 'Toda entrega debe referenciar una plantilla oficial');
      assert.ok(sub.authorName, 'Toda entrega debe consignar el nombre del autor');
      assert.ok(['ENTREGADO', 'RECIBIDO', 'OBSERVADO', 'REVISADO'].includes(sub.status), 'El estado debe ser válido');
      assert.ok(sub.rev, 'Toda entrega debe poseer un rev de control de concurrencia');
    }
  });

  test('10. TOPBAR Y ROLES: Validación de perfiles para mapeo dinámico de Topbar', async () => {
    const meDir = await fetch(`${BASE_URL}/api/me`, { headers: headersDirector });
    assert.equal(meDir.status, 200);
    const dirUser = await meDir.json();
    assert.equal(dirUser.role, 'DIRECTOR');

    const meSec = await fetch(`${BASE_URL}/api/me`, { headers: headersSecretaria });
    assert.equal(meSec.status, 200);
    const secUser = await meSec.json();
    assert.equal(secUser.role, 'SECRETARIA');

    const meDoc = await fetch(`${BASE_URL}/api/me`, { headers: headersDocente });
    assert.equal(meDoc.status, 200);
    const docUser = await meDoc.json();
    assert.equal(docUser.role, 'DOCENTE');
  });
});
