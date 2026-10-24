/**
 * tests/documents-module.test.cjs
 * 
 * Suite de pruebas de integración para el CENTRO DE DOCUMENTOS ACADÉMICOS (Tarea 19).
 * Valida contratos reales de API (GET /api/document/configuration, POST /api/document, POST /api/document/pdf),
 * el catálogo oficial de 21 plantillas (TMPL-01 a TMPL-21), preflight, integridad binaria PDF (%PDF-),
 * aislamiento de workspace y control de roles en SQLite sandbox.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Centro Documental — Integración y Contratos de Plantillas (Sandbox)', () => {
  let tokenDocente = null;
  let tokenDirector = null;
  let headersDocente = {};
  let headersDirector = {};
  let group = null;
  let enrollment = null;

  before(async () => {
    // 1. Autenticar como DOCENTE
    const loginDoc = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    const docData = await loginDoc.json();
    assert.equal(loginDoc.status, 200);
    tokenDocente = docData.token;
    headersDocente = {
      'Authorization': `Bearer ${tokenDocente}`,
      'Content-Type': 'application/json',
    };

    // 2. Autenticar como DIRECTOR
    const loginDir = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director.dev', password: 'DirectorDev2026!' }),
    });
    const dirData = await loginDir.json();
    assert.equal(loginDir.status, 200);
    tokenDirector = dirData.token;
    headersDirector = {
      'Authorization': `Bearer ${tokenDirector}`,
      'Content-Type': 'application/json',
    };

    // 3. Obtener aula autorizada del docente
    const optRes = await fetch(`${BASE_URL}/api/workspace/options`, { headers: headersDocente });
    const optData = await optRes.json();
    group = optData.groups[0];
    assert.ok(group, 'El docente debe tener al menos un aula asignada');

    // 4. Seleccionar aula y UD1 en modo UNIT
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'UNIT',
        unit: 'UD1',
      }),
    });

    // 5. Obtener matrícula activa y vigente para el aula seleccionada
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: headersDocente });
    const dashData = await dashRes.json();
    enrollment = (dashData.enrollments || []).find(
      (e) => e.active === true && e.groupId === group.id && !e.endDate && (!e.moduleState || e.moduleState === 'CONFIRMED')
    ) || (dashData.enrollments || []).find(
      (e) => e.active === true && e.groupId === group.id
    ) || (dashData.enrollments || []).find(
      (e) => e.active !== false
    );
    assert.ok(enrollment, 'El aula debe tener al menos una matrícula para pruebas');
  });

  test('1. GET /api/document/configuration recupera configuración y catálogo oficial', async () => {
    const res = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDocente });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.catalog), 'Debe retornar un array con el catálogo de plantillas');
    assert.ok(data.schema, 'Debe incluir los esquemas de configuración');
    assert.ok(data.defaults, 'Debe incluir los valores por defecto');
    assert.ok(Array.isArray(data.settings), 'Debe incluir los settings guardados');
  });

  test('2. Catálogo Oficial: Las 21 plantillas normadas (TMPL-01 a TMPL-21) están registradas en el sistema', async () => {
    // Para el DIRECTOR (permisos plenos y visión institucional), el catálogo contiene las 21 plantillas
    const res = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDirector });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.catalog.length, 21, 'El catálogo oficial debe contener exactamente 21 plantillas');

    const expectedIds = Array.from({ length: 21 }, (_, i) => `TMPL-${String(i + 1).padStart(2, '0')}`);
    const actualIds = data.catalog.map((t) => t.id);

    for (const expected of expectedIds) {
      assert.ok(actualIds.includes(expected), `La plantilla ${expected} debe estar en el catálogo`);
    }
  });

  test('3. POST /api/document retorna informe preflight con campos, faltantes y fingerprint', async () => {
    const res = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05', // Asistencia UD1
        unit: 'UD1',
      }),
    });

    assert.equal(res.status, 200);
    const doc = await res.json();

    assert.equal(doc.templateId, 'TMPL-05');
    assert.ok(doc.fingerprint, 'Debe incluir huella criptográfica (fingerprint)');
    assert.ok(doc.preflight, 'Debe incluir informe preflight');
    assert.equal(typeof doc.preflight.total, 'number');
    assert.equal(typeof doc.preflight.filled, 'number');
    assert.equal(typeof doc.preflight.complete, 'boolean');
    assert.ok(Array.isArray(doc.preflight.fields), 'preflight.fields debe ser un array');
    assert.ok(Array.isArray(doc.preflight.missing), 'preflight.missing debe ser un array');

    // Verificar que los campos contengan metadatos requeridos
    for (const field of doc.preflight.fields) {
      assert.ok(field.key);
      assert.ok(['READY', 'MISSING'].includes(field.status));
      assert.ok(field.source);
    }
  });

  test('4. POST /api/document/pdf genera binario PDF válido con encabezado %PDF-', async () => {
    // 1. Obtener fingerprint mediante preflight
    const preflightRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05',
        unit: 'UD1',
      }),
    });
    const doc = await preflightRes.json();

    // 2. Generar PDF
    const pdfRes = await fetch(`${BASE_URL}/api/document/pdf`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05',
        unit: 'UD1',
        fingerprint: doc.fingerprint,
      }),
    });

    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');

    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    assert.ok(buffer.length > 1000, 'El archivo PDF debe tener un tamaño binario significativo');

    // Encabezado estándar de todo archivo PDF válido: %PDF-
    const header = buffer.subarray(0, 5).toString('utf8');
    assert.equal(header, '%PDF-', 'El archivo debe comenzar con la firma mágica %PDF-');
  });

  test('5. Detección de fingerprint inválido o datos cambiados en POST /api/document/pdf retorna 409', async () => {
    const pdfRes = await fetch(`${BASE_URL}/api/document/pdf`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05',
        unit: 'UD1',
        fingerprint: 'fingerprint_ficticio_o_desactualizado_1234567890',
      }),
    });

    assert.equal(pdfRes.status, 409, 'Debe responder con HTTP 409 Conflict ante fingerprint discordante');
    const err = await pdfRes.json();
    assert.ok(err.error.includes('cambiaron') || err.error.includes('vista previa'));
  });

  test('6. Aislamiento de Workspace: en modo UNIT para UD1 se rechaza plantilla de UD2', async () => {
    // En modo UNIT para UD1, intentar generar TMPL-06 (Asistencia UD2) debe ser rechazado
    const res = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-06', // Asistencia UD2
        unit: 'UD2',
      }),
    });

    // workspace.cjs:15 valida que la unidad coincida con el contexto UNIT activo
    assert.ok(
      res.status === 400 || res.status === 403,
      'Debe rechazar una plantilla de UD2 cuando el workspace está en UD1'
    );
  });

  test('7. Cambio a modo MODULE permite consultar plantillas modulares (TMPL-01, TMPL-02)', async () => {
    // Cambiar a modo MODULE con DIRECTOR
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'MODULE',
      }),
    });

    // Consultar preflight de TMPL-01 (Nómina de matrícula)
    const resNomina = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-01',
      }),
    });

    assert.equal(resNomina.status, 200);
    const docNomina = await resNomina.json();
    assert.equal(docNomina.templateId, 'TMPL-01');

    // Restaurar el docente a modo UNIT
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDocente,
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

  test('8. Formatos individuales: TMPL-02 (Ficha de matrícula) procesa enrollmentId', async () => {
    // Con DIRECTOR en modo MODULE
    const resFicha = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-02',
        enrollmentId: enrollment.id,
      }),
    });

    assert.equal(resFicha.status, 200);
    const docFicha = await resFicha.json();
    assert.equal(docFicha.templateId, 'TMPL-02');
    assert.ok(docFicha.fingerprint);
  });

  test('9. Modo Demostración (demoFill: true) genera PDF simulado para revisión sin alterar datos', async () => {
    const resPreflight = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05',
        unit: 'UD1',
        demoFill: true,
      }),
    });

    assert.equal(resPreflight.status, 200);
    const doc = await resPreflight.json();
    assert.equal(doc.demoFill, true);

    const pdfRes = await fetch(`${BASE_URL}/api/document/pdf`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05',
        unit: 'UD1',
        demoFill: true,
        fingerprint: doc.fingerprint,
      }),
    });

    assert.equal(pdfRes.status, 200);
    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    assert.ok(buffer.length > 1000);
    assert.equal(buffer.subarray(0, 5).toString('utf8'), '%PDF-');
  });

  test('10. Control RBAC: DOCENTE no puede acceder a plantillas exclusivas de DIRECTOR (TMPL-21 Título)', async () => {
    const res = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-21',
      }),
    });

    // DOCENTE no tiene asignado TMPL-21 en role-policy / offline-documents
    assert.ok(
      res.status === 400 || res.status === 403,
      'Debe denegar acceso al docente para formatos exclusivos de Dirección'
    );
  });
});
