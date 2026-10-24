/**
 * tests/students-enrollments-groups.test.cjs
 * 
 * Suite de pruebas automatizadas para la MODERNIZACIÓN INTEGRAL DE:
 * 1. ESTUDIANTES (GestionEstudiantes.tsx)
 * 2. MATRÍCULAS (GestionMatriculas.tsx)
 * 3. GRUPOS Y AULAS (GestionGrupos.tsx)
 * 
 * Valida contratos reales de API contra SQLite sintético (127.0.0.1:8085):
 * - POST /api/students (Alta y actualización de ficha de participante)
 * - POST /api/students/archive (Archivado formal con motivo auditado)
 * - POST /api/enrollments (Matrícula formal con generación de código MAT)
 * - POST /api/enrollments/module (Confirmación, exclusión y restauración modular)
 * - POST /api/enrollments/retire (Retiro formal y traslado de grupo)
 * - POST /api/groups (Creación y actualización de aulas - exclusivo DIRECTOR)
 * - POST /api/closure (Cierre y reapertura de aulas con motivo auditado - exclusivo DIRECTOR)
 * - Control estricto de roles RBAC y concurrencia rev (HTTP 409 / HTTP 403).
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Modernización Integral — Estudiantes, Matrículas y Grupos (Tarea 28)', () => {
  let tokenDirector = null;
  let tokenSecretaria = null;
  let tokenDocente = null;
  let headersDirector = {};
  let headersSecretaria = {};
  let headersDocente = {};

  before(async () => {
    // 1. Login DIRECTOR
    const resDir = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director.dev', password: 'DirectorDev2026!' }),
    });
    assert.equal(resDir.status, 200, 'Login DIRECTOR debe responder 200');
    const dataDir = await resDir.json();
    tokenDirector = dataDir.token;
    headersDirector = {
      'Authorization': `Bearer ${tokenDirector}`,
      'Content-Type': 'application/json',
    };

    // 2. Login SECRETARIA
    const resSec = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'secretaria.dev', password: 'SecretariaDev2026!' }),
    });
    assert.equal(resSec.status, 200, 'Login SECRETARIA debe responder 200');
    const dataSec = await resSec.json();
    tokenSecretaria = dataSec.token;
    headersSecretaria = {
      'Authorization': `Bearer ${tokenSecretaria}`,
      'Content-Type': 'application/json',
    };

    // 3. Login DOCENTE
    const resDoc = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    assert.equal(resDoc.status, 200, 'Login DOCENTE debe responder 200');
    const dataDoc = await resDoc.json();
    tokenDocente = dataDoc.token;
    headersDocente = {
      'Authorization': `Bearer ${tokenDocente}`,
      'Content-Type': 'application/json',
    };
  });

  // =========================================================================
  // 1. MÓDULO ESTUDIANTES
  // =========================================================================

  let testStudentId = null;
  let testStudentRev = null;
  const uniqueDoc = `99${Date.now().toString().slice(-6)}`;

  test('1. ESTUDIANTES: Consulta del padrón consolidado retorna estudiantes reales', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.students), 'Debe incluir lista de estudiantes');
    assert.ok(data.students.length > 0, 'Debe haber estudiantes en la base SQLite');
  });

  test('2. ESTUDIANTES: SECRETARIA registra nuevo participante (POST /api/students)', async () => {
    const payload = {
      name: 'Test Participant, Modernizado',
      document: uniqueDoc,
      documentType: 'DNI',
      lastName1: 'Test',
      lastName2: 'Participant',
      firstNames: 'Modernizado',
      sex: 'M',
      birthDate: '2000-05-15',
      active: true,
    };

    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200, 'SECRETARIA debe poder registrar estudiantes');
    const student = await res.json();
    assert.ok(student.id, 'Debe retornar un id generado');
    assert.equal(student.document, uniqueDoc);
    assert.equal(student.active, true);
    assert.ok(student.rev, 'Debe retornar un rev de concurrencia');

    testStudentId = student.id;
    testStudentRev = student.rev;
  });

  test('3. ESTUDIANTES: Rechazo de documento duplicado con HTTP 409', async () => {
    const duplicatePayload = {
      name: 'Otro Participante Con Mismo DNI',
      document: uniqueDoc,
      active: true,
    };

    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify(duplicatePayload),
    });
    assert.equal(res.status, 409, 'Debe responder HTTP 409 ante documento duplicado');
    const data = await res.json();
    assert.match(data.error, /Ya existe un estudiante con ese documento/i);
  });

  test('4. ESTUDIANTES: Actualización de ficha permitida para DIRECTOR', async () => {
    const updatePayload = {
      id: testStudentId,
      rev: testStudentRev,
      name: 'Test Participant, Modernizado Modificado',
      document: uniqueDoc,
      active: true,
    };

    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify(updatePayload),
    });
    assert.equal(res.status, 200, 'DIRECTOR debe poder actualizar estudiantes');
    const updated = await res.json();
    assert.equal(updated.name, 'Test Participant, Modernizado Modificado');
    assert.notEqual(updated.rev, testStudentRev, 'El rev debe cambiar tras la actualización');
    testStudentRev = updated.rev;
  });

  test('5. ESTUDIANTES: RBAC — DOCENTE no tiene autorización para crear o modificar estudiantes (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ name: 'Falso Docente', document: '88888888', active: true }),
    });
    assert.equal(res.status, 403, 'DOCENTE debe ser bloqueado con HTTP 403');
  });

  // =========================================================================
  // 2. MÓDULO MATRÍCULAS
  // =========================================================================

  let testEnrollmentId = null;
  let testEnrollmentRev = null;
  let sampleGroupId = null;

  test('6. MATRÍCULAS: Obtención de grupo autorizado y registro de matrícula (POST /api/enrollments)', async () => {
    const dashRes = await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersSecretaria });
    const dash = await dashRes.json();
    const group = dash.groups.find((g) => g.moduleId && g.periodId && !g.closed);
    assert.ok(group, 'Debe haber al menos un aula configurada y abierta');
    sampleGroupId = group.id;

    const enrollPayload = {
      studentId: testStudentId,
      groupId: sampleGroupId,
      startDate: '2026-03-16',
    };

    const res = await fetch(`${BASE_URL}/api/enrollments`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify(enrollPayload),
    });
    assert.equal(res.status, 200, 'SECRETARIA debe poder matricular en grupo abierto');
    const enrollment = await res.json();
    assert.ok(enrollment.id, 'Debe generar identificador de matrícula');
    assert.ok(enrollment.code, 'Debe generar código de matrícula MAT');
    assert.equal(enrollment.studentId, testStudentId);
    assert.equal(enrollment.groupId, sampleGroupId);
    assert.equal(enrollment.active, true);

    testEnrollmentId = enrollment.id;
    testEnrollmentRev = enrollment.rev;
  });

  test('7. MATRÍCULAS: Rechazo de matrícula duplicada en la misma aula (HTTP 409)', async () => {
    const res = await fetch(`${BASE_URL}/api/enrollments`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        studentId: testStudentId,
        groupId: sampleGroupId,
        startDate: '2026-03-16',
      }),
    });
    assert.equal(res.status, 409, 'Debe responder 409 si el alumno ya está matriculado');
  });

  test('8. MATRÍCULAS: Corrección modular EXCLUDE y RESTORE (POST /api/enrollments/module)', async () => {
    // 8a. Excluir del módulo
    const excludeRes = await fetch(`${BASE_URL}/api/enrollments/module`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        id: testEnrollmentId,
        rev: testEnrollmentRev,
        action: 'EXCLUDE',
        reason: 'Ajuste de carga modular por convalidación',
      }),
    });
    assert.equal(excludeRes.status, 200, 'Debe permitir EXCLUDE');
    const excluded = await excludeRes.json();
    assert.equal(excluded.moduleState, 'EXCLUDED');
    assert.equal(excluded.active, false);
    testEnrollmentRev = excluded.rev;

    // 8b. Restaurar en el módulo
    const restoreRes = await fetch(`${BASE_URL}/api/enrollments/module`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        id: testEnrollmentId,
        rev: testEnrollmentRev,
        action: 'RESTORE',
        reason: 'Restauración por resolución de secretaría',
      }),
    });
    assert.equal(restoreRes.status, 200, 'Debe permitir RESTORE');
    const restored = await restoreRes.json();
    assert.equal(restored.active, true);
    testEnrollmentRev = restored.rev;
  });

  test('9. MATRÍCULAS: Retiro formal de matrícula (POST /api/enrollments/retire)', async () => {
    const res = await fetch(`${BASE_URL}/api/enrollments/retire`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: testEnrollmentId,
        rev: testEnrollmentRev,
        date: '2026-05-30',
        reason: 'Retiro voluntario por motivos laborales',
      }),
    });
    assert.equal(res.status, 200, 'Debe procesar retiro formal');
    const retired = await res.json();
    assert.equal(retired.active, false);
    assert.equal(retired.endDate, '2026-05-30');
  });

  test('10. ESTUDIANTES: Archivado formal con preservación de historial (POST /api/students/archive)', async () => {
    const res = await fetch(`${BASE_URL}/api/students/archive`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: testStudentId,
        rev: testStudentRev,
        reason: 'Traslado externo de institución',
        date: '2026-06-01',
      }),
    });
    assert.equal(res.status, 200, 'DIRECTOR debe poder archivar estudiante');
    const archived = await res.json();
    assert.equal(archived.archived, true);
    assert.equal(archived.active, false);
  });

  // =========================================================================
  // 3. MÓDULO GRUPOS Y AULAS
  // =========================================================================

  let testGroupId = null;
  let testGroupRev = null;

  test('11. GRUPOS: DIRECTOR crea nueva aula (POST /api/groups)', async () => {
    const dashRes = await fetch(`${BASE_URL}/api/dashboard?overview=1`, { headers: headersDirector });
    const dash = await dashRes.json();
    const program = dash.programs[0];
    const module = dash.modules.find((m) => m.programaId === program.id) || dash.modules[0];

    const uniqueSection = `SEC-${Date.now().toString().slice(-4)}`;
    const groupPayload = {
      name: `Aula Pruebas Automatizadas ${uniqueSection}`,
      programId: program.id,
      moduleId: module.id,
      periodId: '2026-I',
      section: uniqueSection,
      turno: 'Noche',
      units: ['UD1', 'UD2', 'UD3', 'EFSRT'],
    };

    const res = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify(groupPayload),
    });
    assert.equal(res.status, 200, 'DIRECTOR debe poder crear grupos');
    const group = await res.json();
    assert.ok(group.id, 'Debe retornar id de grupo');
    assert.equal(group.section, uniqueSection);
    assert.equal(group.closed, false);
    assert.ok(group.rev, 'Debe retornar rev');

    testGroupId = group.id;
    testGroupRev = group.rev;
  });

  test('12. GRUPOS: RBAC — SECRETARIA no puede crear ni editar grupos (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        name: 'Aula Denegada',
        programId: 'P01',
        moduleId: 'M01',
        periodId: '2026-I',
        units: ['UD1'],
      }),
    });
    assert.equal(res.status, 403, 'SECRETARIA debe recibir HTTP 403 al intentar crear grupos');
  });

  test('13. GRUPOS: Cierre y reapertura formal de aula por DIRECTOR (POST /api/closure)', async () => {
    // 13a. Cerrar aula
    const closeRes = await fetch(`${BASE_URL}/api/closure`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        groupId: testGroupId,
        closed: true,
        reason: 'Cierre de periodo lectivo 2026-I',
        rev: testGroupRev,
      }),
    });
    assert.equal(closeRes.status, 200, 'DIRECTOR debe poder cerrar aula');
    const closedGroup = await closeRes.json();
    assert.equal(closedGroup.closed, true);
    assert.equal(closedGroup.closureReason, 'Cierre de periodo lectivo 2026-I');
    testGroupRev = closedGroup.rev;

    // 13b. Reabrir aula
    const openRes = await fetch(`${BASE_URL}/api/closure`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        groupId: testGroupId,
        closed: false,
        reason: 'Reapertura para ingreso de calificaciones rezagadas',
        rev: testGroupRev,
      }),
    });
    assert.equal(openRes.status, 200, 'DIRECTOR debe poder reabrir aula');
    const openedGroup = await openRes.json();
    assert.equal(openedGroup.closed, false);
  });

  test('14. GRUPOS: RBAC — DOCENTE no puede cerrar ni reabrir aulas (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/closure`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: testGroupId,
        closed: true,
        reason: 'Intento no autorizado',
      }),
    });
    assert.equal(res.status, 403, 'DOCENTE debe ser rechazado con HTTP 403');
  });
});
