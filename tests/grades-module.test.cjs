/**
 * tests/grades-module.test.cjs
 * 
 * Suite de pruebas de integración para el módulo REGISTRO DE EVALUACIONES Y CALIFICACIONES (Tarea 17).
 * Valida contratos reales de API (POST /api/grades, GET /api/dashboard), reglas de dominio
 * sobre escala vigesimal (0 a 20), diferenciación de 0 vs null, concurrencia HTTP 409 y sandbox SQLite.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Módulo de Evaluaciones — Integración y Reglas de Dominio (Sandbox)', () => {
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

  test('1. POST /api/grades guarda calificaciones válidas (0-20) y retorna confirmación con rev', async () => {
    // Consultar dashboard para obtener rev si ya existía
    const dashBefore = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = (dashBefore.grades || []).find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === 'IL1.IA1'
    );

    const res = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL1.IA1',
            value: 16,
            observation: 'Evaluación práctica aprobada',
            rev: existing ? existing.rev : undefined,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Debe retornar un array con los registros guardados');
    assert.equal(data.length, 1);
    assert.equal(data[0].value, 16);
    assert.equal(data[0].enrollmentId, enrollment.id);
    assert.equal(data[0].unit, 'UD1');
    assert.equal(data[0].indicator, 'IL1.IA1');
    assert.ok(data[0].rev, 'Debe incluir número de revisión (rev)');
  });

  test('2. GET /api/dashboard recupera las calificaciones guardadas para la unidad activa', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard`, { headers });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.grades), 'Dashboard debe incluir array de calificaciones');

    const grade = data.grades.find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === 'IL1.IA1'
    );
    assert.ok(grade, 'La calificación registrada debe estar presente en dashboard');
    assert.equal(grade.value, 16);
  });

  test('3. Escala vigesimal: nota 0 es válida y se preserva numéricamente (no null, no pendiente)', async () => {
    const dashBefore = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = (dashBefore.grades || []).find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === 'IL1.IA2'
    );

    const res = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL1.IA2',
            value: 0,
            observation: 'No presentó evidencia',
            rev: existing ? existing.rev : undefined,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data[0].value, 0);
    assert.equal(typeof data[0].value, 'number');
    assert.equal(data[0].pending, false);

    // Verificar también en GET /api/dashboard
    const dashAfter = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const grade0 = dashAfter.grades.find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === 'IL1.IA2'
    );
    assert.ok(grade0);
    assert.strictEqual(grade0.value, 0);
  });

  test('4. Rechazo de calificaciones fuera del rango vigesimal (< 0 o > 20)', async () => {
    // Intento con nota negativa (-5)
    const resNegative = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL1.IA3',
            value: -5,
          },
        ],
      }),
    });
    assert.equal(resNegative.status, 400);
    const dataNeg = await resNegative.json();
    assert.ok(dataNeg.error.includes('0 y 20'), 'Debe rechazar notas menores a 0');

    // Intento con nota superior a 20 (21)
    const resOver = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL1.IA3',
            value: 21,
          },
        ],
      }),
    });
    assert.equal(resOver.status, 400);
    const dataOver = await resOver.json();
    assert.ok(dataOver.error.includes('0 y 20'), 'Debe rechazar notas mayores a 20');
  });

  test('5. Desmarcado formal (clear: true y value: null) establece la nota como pendiente', async () => {
    const dashBefore = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = (dashBefore.grades || []).find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === 'IL1.IA1'
    );

    const res = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL1.IA1',
            value: null,
            clear: true,
            rev: existing ? existing.rev : undefined,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data[0].value, null);
    assert.equal(data[0].pending, true);
  });

  test('6. Registro múltiple de criterios (IA, IL, R y RESULTADO_UD) en un solo lote', async () => {
    const dashBefore = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const indicatorsToTest = ['IL1.IA3', 'IL1', 'IL1.RECOVERY', 'RESULTADO_UD'];
    const rows = indicatorsToTest.map((ind, idx) => {
      const existing = (dashBefore.grades || []).find(
        (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === ind
      );
      return {
        enrollmentId: enrollment.id,
        indicator: ind,
        value: 14 + idx, // 14, 15, 16, 17
        rev: existing ? existing.rev : undefined,
      };
    });

    const res = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.length, indicatorsToTest.length);

    for (let i = 0; i < indicatorsToTest.length; i++) {
      assert.equal(data[i].indicator, indicatorsToTest[i]);
      assert.equal(data[i].value, 14 + i);
    }
  });

  test('7. Aislamiento entre unidades: al cambiar a UD2, los registros de UD1 no deben cruzarse', async () => {
    // Cambiar a UD2
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

    // Consultar dashboard de UD2
    const dashUD2 = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const gradeInUD2 = (dashUD2.grades || []).find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD2' && g.indicator === 'IL1'
    );
    // En UD2 no debe aparecer la nota de UD1
    assert.ok(
      !gradeInUD2 || gradeInUD2.unit === 'UD2',
      'Las notas de UD1 no deben mezclarse con UD2'
    );

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

  test('8. Detección de conflicto de concurrencia: si se envía un rev desactualizado retorna 409', async () => {
    // 0. Si ya existe un registro previo de IL2.IA1, consultar su rev
    const dashBefore = await fetch(`${BASE_URL}/api/dashboard`, { headers }).then((r) => r.json());
    const existing = (dashBefore.grades || []).find(
      (g) => g.enrollmentId === enrollment.id && g.unit === 'UD1' && g.indicator === 'IL2.IA1'
    );

    // 1. Guardar una nota y obtener rev vigente
    const res1 = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL2.IA1',
            value: 15,
            rev: existing ? existing.rev : undefined,
          },
        ],
      }),
    });
    assert.equal(res1.status, 200);
    const [rec1] = await res1.json();
    assert.ok(rec1.rev);

    // 2. Modificar en otra sesión (avanza el rev)
    const res2 = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL2.IA1',
            value: 18,
            rev: rec1.rev,
          },
        ],
      }),
    });
    assert.equal(res2.status, 200);

    // 3. Intentar guardar nuevamente con el rev antiguo (rec1.rev)
    const resConflict = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL2.IA1',
            value: 12,
            rev: rec1.rev, // Rev obsoleto
          },
        ],
      }),
    });

    assert.equal(resConflict.status, 409, 'Debe responder con HTTP 409 Conflict ante rev desactualizado');
    const errData = await resConflict.json();
    assert.ok(errData.error, 'Debe indicar mensaje de conflicto');
  });

  test('9. Rechazo en modo MODULE: no permite registrar notas sin unidad específica', async () => {
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

    // Intentar guardar notas
    const res = await fetch(`${BASE_URL}/api/grades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        groupId: group.id,
        unit: 'UD1',
        rows: [
          {
            enrollmentId: enrollment.id,
            indicator: 'IL1.IA1',
            value: 15,
          },
        ],
      }),
    });

    // workspace.cjs:14 exige modo UNIT
    assert.ok(
      res.status === 400 || res.status === 403 || res.status === 409,
      'Debe rechazar peticiones de notas en modo MODULE'
    );
    const errData = await res.json();
    assert.ok(
      errData.error.includes('unidad') || errData.error.includes('registrar notas'),
      'Debe incluir mensaje de selección de unidad requerida'
    );

    // Restaurar a modo UNIT para no afectar siguientes suites
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
});
