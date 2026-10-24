/**
 * tests/pending-changes-and-conflict.test.cjs
 * 
 * Suite de pruebas de integración para Tarea 15:
 * - Ciclo de vida y resolución de conflictos HTTP 409
 * - Contrato HTTP estricto de POST /api/attendance (rows, observation, rev string)
 * - Verificación del motor de calendario (2 de nov, 10 de nov, feriados multianuales)
 * - Aislamiento entre unidades y protección contra sobrescrituras silenciosas
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Tarea 15 — Integridad de Asistencia, Manejo 409 y Calendario', () => {
  let headers = {};
  let group = null;
  let enrollment = null;

  before(async () => {
    // 1. Autenticación como DOCENTE
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json',
    };

    // 2. Obtener aula autorizada
    const optRes = await fetch(`${BASE_URL}/api/workspace/options`, { headers });
    assert.equal(optRes.status, 200);
    const optData = await optRes.json();
    group = optData.groups[0];
    assert.ok(group, 'El docente debe tener al menos un aula autorizada');

    // 3. Activar contexto en modo UNIT
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

    // 4. Obtener matrícula
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    enrollment = dashData.enrollments.find((e) => e.groupId === group.id && e.active);
    assert.ok(enrollment, 'Debe haber matrícula activa');
  });

  test('1. Contrato HTTP POST /api/attendance: acepta rows, observation y rev string', async () => {
    const testDate = '2026-03-24';
    const testSession = '1';

    // Obtener rev actual si existe
    const dash = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = dash.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === testDate && a.session === testSession
    );

    const saveRes = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: testDate,
        session: testSession,
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'P',
            observation: 'Asistencia confirmada contrato v2',
            rev: existing ? existing.rev : null,
          },
        ],
      }),
    });

    assert.equal(saveRes.status, 200);
    const saved = await saveRes.json();
    assert.ok(Array.isArray(saved));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].value, 'P');
    assert.equal(saved[0].observation, 'Asistencia confirmada contrato v2');
    assert.equal(typeof saved[0].rev, 'string');
  });

  test('2. Rechaza payload que use formato antiguo o campos incorrectos (ej. sin rows)', async () => {
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: '2026-03-24',
        session: '1',
        items: [], // campo incorrecto
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('Seleccione registros para guardar'));
  });

  test('3. Conflicto HTTP 409 y ciclo de resolución segura sin sobrescrituras silenciosas', async () => {
    const conflictDate = '2026-03-25';
    const conflictSession = '2';

    // Paso A: Guardar estado inicial (Sesión 1)
    const initialDash = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const preExisting = initialDash.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === conflictDate && a.session === conflictSession
    );

    const initRes = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: conflictDate,
        session: conflictSession,
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'P',
            observation: 'Estado inicial',
            rev: preExisting?.rev || null,
          },
        ],
      }),
    });
    assert.equal(initRes.status, 200);
    const [initRecord] = await initRes.json();
    const rev1 = initRecord.rev;
    assert.ok(rev1, 'Debe haber un rev inicial');

    // Paso B: Otra sesión (Sesión 2) modifica el registro y genera rev2
    const session2Res = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: conflictDate,
        session: conflictSession,
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'T',
            observation: 'Modificado por sesión paralela',
            rev: rev1,
          },
        ],
      }),
    });
    assert.equal(session2Res.status, 200);
    const [session2Record] = await session2Res.json();
    const rev2 = session2Record.rev;
    assert.notEqual(rev1, rev2, 'El rev debe haber cambiado en el servidor');

    // Paso C: Sesión 1 intenta guardar enviando el rev1 desactualizado -> Debe retornar 409
    const conflictAttempt = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: conflictDate,
        session: conflictSession,
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'F',
            observation: 'Intento con rev obsoleto',
            rev: rev1,
          },
        ],
      }),
    });
    assert.equal(conflictAttempt.status, 409);
    const conflictBody = await conflictAttempt.json();
    assert.ok(conflictBody.error.includes('El registro cambió en otra ventana'));

    // Paso D: Verificar que el servidor NO fue sobrescrito (permanece con rev2 y 'T')
    const verifyDash = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const intactRecord = verifyDash.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === conflictDate && a.session === conflictSession
    );
    assert.equal(intactRecord.rev, rev2);
    assert.equal(intactRecord.value, 'T');
    assert.equal(intactRecord.observation, 'Modificado por sesión paralela');

    // Paso E: Resolución voluntaria: reaplicar con la revisión vigente rev2
    const resolutionRes = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: conflictDate,
        session: conflictSession,
        rows: [
          {
            enrollmentId: enrollment.id,
            value: 'F',
            observation: 'Cambio explícitamente confirmado con rev2',
            rev: rev2,
          },
        ],
      }),
    });
    assert.equal(resolutionRes.status, 200);
    const [resolvedRecord] = await resolutionRes.json();
    assert.equal(resolvedRecord.value, 'F');
    assert.equal(resolvedRecord.observation, 'Cambio explícitamente confirmado con rev2');
    assert.notEqual(resolvedRecord.rev, rev2);
  });

  test('4. Calendario institucional: Feriados del 2 de noviembre y 10 de noviembre de 2026', () => {
    // Validar directamente contra el motor oficial scripts/academic-calendar-engine.cjs
    const { AcademicCalendarEngine } = require('../scripts/academic-calendar-engine.cjs');
    const engine = new AcademicCalendarEngine();

    // 2 de noviembre de 2026
    const feriado2Nov = engine.isHoliday('2026-11-02');
    assert.equal(feriado2Nov, 'Conmemoración de los Fieles Difuntos');

    // 10 de noviembre de 2026
    const feriado10Nov = engine.isHoliday('2026-11-10');
    assert.equal(feriado10Nov, 'Aniversario de San Román / CETPRO Puno');

    // Feriados multianuales fuera de 2026
    assert.equal(engine.isHoliday('2025-05-01'), 'Día del Trabajo');
    assert.equal(engine.isHoliday('2027-12-25'), 'Navidad');
    assert.equal(engine.isHoliday('2026-07-28'), 'Fiestas Patrias');
  });

  test('5. Desmarcado formal con clear: true y value: null', async () => {
    const clearDate = '2026-03-26';
    const clearSession = '1';

    // Crear primero
    const dash1 = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = dash1.attendance.find(
      (a) => a.enrollmentId === enrollment.id && a.date === clearDate && a.session === clearSession
    );

    const setRes = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: clearDate,
        session: clearSession,
        rows: [{ enrollmentId: enrollment.id, value: 'J', observation: 'Permiso médico', rev: existing?.rev || null }],
      }),
    });
    assert.equal(setRes.status, 200);
    const [saved] = await setRes.json();

    // Desmarcar
    const clearRes = await fetch(`${BASE_URL}/api/attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        date: clearDate,
        session: clearSession,
        rows: [{ enrollmentId: enrollment.id, value: null, clear: true, rev: saved.rev }],
      }),
    });
    assert.equal(clearRes.status, 200);
    const [cleared] = await clearRes.json();
    assert.equal(cleared.value, null);
    assert.equal(cleared.pending, true);
  });
});
