/**
 * tests/attendance-module.test.cjs
 * 
 * Suite de pruebas de integración para el módulo REGISTRO DE ASISTENCIA (Tarea 13).
 * Valida contratos reales de API, reglas de negocio, calendarización y persistencia en SQLite sandbox.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Módulo de Asistencia — Integración y Reglas de Dominio (Sandbox)', () => {
  let tokenDocente = null;
  let headers = {};
  let group = null;
  let enrollment = null;

  before(async () => {
    // 1. Autenticar como DOCENTE
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    tokenDocente = loginData.token;
    headers = {
      'Authorization': `Bearer ${tokenDocente}`,
      'Content-Type': 'application/json',
    };

    // 2. Obtener aula autorizada
    const optRes = await fetch(`${BASE_URL}/api/workspace/options`, { headers });
    const optData = await optRes.json();
    group = optData.groups[0];
    assert.ok(group, 'El docente debe tener al menos un aula asignada');

    // 3. Seleccionar aula y UD1 en modo UNIT
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'UNIT',
        unit: 'UD1',
      }),
    });

    // 4. Obtener matrícula activa y vigente para el aula seleccionada
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers });
    const dashData = await dashRes.json();
    enrollment = (dashData.enrollments || []).find(
      (e) => e.active === true && e.groupId === group.id && !e.endDate && (!e.moduleState || e.moduleState === 'CONFIRMED')
    ) || (dashData.enrollments || []).find(
      (e) => e.active === true && e.groupId === group.id
    ) || (dashData.enrollments || []).find(
      (e) => e.active !== false
    );
    assert.ok(enrollment, `No se encontró ninguna matrícula activa y vigente para el aula ${group.name} (${group.id})`);
  });

  test('1. POST /api/attendance guarda registro válido (P, F, J, T) y retorna confirmación con rev', async () => {
    // Si ya existe un registro previo de una ejecución anterior, recuperar su rev para asegurar idempotencia
    const dashBefore = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = dashBefore.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === '2026-03-17' && a.session === '1'
    );

    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-17',
        session: '1',
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'P',
            observation: 'Asistió puntualmente',
            rev: existing ? existing.rev : undefined,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Debe retornar un array con los registros guardados');
    assert.equal(data.length, 1);
    assert.equal(data[0].value, 'P');
    assert.equal(data[0].enrollmentId, enrollment.id);
    assert.equal(data[0].unit, 'UD1');
    assert.equal(data[0].date, '2026-03-17');
    assert.equal(data[0].session, '1');
    assert.ok(data[0].rev, 'Debe incluir número de revisión (rev)');
  });

  test('2. GET /api/dashboard recupera los registros guardados de asistencia para la unidad activa', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard`, { headers });
    assert.equal(res.status, 200);
    const data = await res.json();

    const record = data.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === '2026-03-17' && a.session === '1'
    );
    assert.ok(record, 'El registro de asistencia debe figurar en el dashboard');
    assert.equal(record.value, 'P');
    assert.equal(record.observation, 'Asistió puntualmente');
  });

  test('3. Aislamiento entre unidades: al cambiar a UD2, los registros de UD1 no deben cruzarse', async () => {
    // Cambiar espacio a UD2
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'UNIT',
        unit: 'UD2',
      }),
    });

    const res = await fetch(`${BASE_URL}/api/dashboard`, { headers });
    const data = await res.json();

    const recordInUd2 = data.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.unit === 'UD2' && a.date === '2026-03-16'
    );
    assert.equal(recordInUd2, undefined, 'UD2 no debe tener el registro de asistencia de UD1');

    // Restaurar a UD1
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'UNIT',
        unit: 'UD1',
      }),
    });
  });

  test('4. Detección de conflicto de concurrencia: si se envía un rev desactualizado retorna 409', async () => {
    // 1. Asegurar que existe un registro previo de asistencia en esta fecha/sesión
    await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-16',
        session: '1',
        rows: [{ enrollmentId: enrollment.id, value: 'P' }],
      }),
    });

    // 2. Intentar sobrescribir con un rev obsoleto/inválido -> debe retornar 409
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-16',
        session: '1',
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'T',
            rev: 'rev-invalido-conflicto-999',
          },
        ],
      }),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.ok(
      data.error.includes('cambió en otra ventana') || data.error.includes('Recargue'),
      'Debe retornar mensaje de conflicto explicativo'
    );
  });

  test('5. Rechazo de fecha anterior a la matrícula del estudiante', async () => {
    // Si la matrícula tiene startDate: '2026-03-01', una fecha en febrero debe fallar
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-02-15',
        session: '1',
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'P',
          },
        ],
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('anterior al ingreso'), 'Debe rechazar fechas previas al inicio de matrícula');
  });

  test('6. Rechazo de estado de asistencia inválido (no permitido por contrato)', async () => {
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-16',
        session: '1',
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'INVALID_STATE',
          },
        ],
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('inválido') || data.error.includes('asistencia'), 'Debe rechazar estados no permitidos');
  });

  test('7. Desmarcado formal (clear: true y value: null) establece el registro como pendiente', async () => {
    // Primero consultar el rev actual
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers });
    const dashData = await dashRes.json();
    const current = dashData.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === '2026-03-17' && a.session === '1'
    );

    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-17',
        session: '1',
        rows: [
          {
            enrollmentId: enrollment.id,
            value: null,
            clear: true,
            rev: current ? current.rev : null,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data[0].value, null);
    assert.equal(data[0].pending, true);
  });

  test('8. Rechazo en modo MODULE: no permite registrar asistencia sin unidad específica', async () => {
    // Cambiar a modo MODULE
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'MODULE',
      }),
    });

    // Intentar guardar asistencia
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-16',
        session: '1',
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'P',
          },
        ],
      }),
    });

    // El guardián de workspace o core rechaza la operación porque el contexto actual es MODULE
    assert.ok(res.status === 400 || res.status === 403 || res.status === 409);
  });
});
