/**
 * tests/document-submissions.test.cjs
 * 
 * Suite de pruebas automatizadas para la ENTREGA Y REVISIÓN DE DOCUMENTOS (Tarea 24).
 * Valida contratos reales de API:
 * - POST /api/document/submit (Entrega formal)
 * - POST /api/document/submission-pdf (Recuperación de copia custodial del PDF)
 * - POST /api/document/review (Revisión y dictamen de entregas)
 * - GET /api/dashboard (Bandeja de entregas autorizadas por rol)
 * 
 * Reglas de negocio y seguridad:
 * - Rechazo de entregas incompletas (HTTP 422).
 * - Rechazo de entregas con fingerprint obsoleto (HTTP 409).
 * - Rechazo de entregas en modo demoFill (HTTP 422).
 * - Control de roles RBAC (DOCENTE no puede revisar; SECRETARIA no puede visar REVISADO; DIRECTOR sí puede).
 * - Control de concurrencia con rev (HTTP 409).
 * - Integridad del PDF entregado (%PDF- y hash SHA-256).
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Entrega y Revisión de Documentos — Contratos y Dominio (Sandbox)', () => {
  let tokenDocente = null;
  let tokenDirector = null;
  let tokenSecretaria = null;
  let headersDocente = {};
  let headersDirector = {};
  let headersSecretaria = {};
  let group = null;
  let unitCode = null;

  before(async () => {
    // 1. Login DOCENTE
    const loginDoc = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'docente.dev', password: 'DocenteDev2026!' }),
    });
    assert.equal(loginDoc.status, 200);
    const docData = await loginDoc.json();
    tokenDocente = docData.token;
    headersDocente = {
      'Authorization': `Bearer ${tokenDocente}`,
      'Content-Type': 'application/json',
    };

    // 2. Login DIRECTOR
    const loginDir = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director.dev', password: 'DirectorDev2026!' }),
    });
    assert.equal(loginDir.status, 200);
    const dirData = await loginDir.json();
    tokenDirector = dirData.token;
    headersDirector = {
      'Authorization': `Bearer ${tokenDirector}`,
      'Content-Type': 'application/json',
    };

    // 3. Login SECRETARIA
    const loginSec = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'secretaria.dev', password: 'SecretariaDev2026!' }),
    });
    assert.equal(loginSec.status, 200);
    const secData = await loginSec.json();
    tokenSecretaria = secData.token;
    headersSecretaria = {
      'Authorization': `Bearer ${tokenSecretaria}`,
      'Content-Type': 'application/json',
    };

    // 4. Obtener aula del docente
    const wsRes = await fetch(`${BASE_URL}/api/workspace/options`, { headers: headersDocente });
    assert.equal(wsRes.status, 200);
    const wsData = await wsRes.json();
    group = wsData.groups[0];
    unitCode = group.units[0]?.code || 'UD1';
    assert.ok(group, 'El docente debe tener al menos un aula asignada');
  });

  test('1. Preflight incomplete: Rechaza entrega con HTTP 422 si faltan campos obligatorios', async () => {
    // Seleccionar workspace en UNIT
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'UNIT',
        unit: unitCode,
      }),
    });

    // TMPL-05 está incompleto por falta de marcas de asistencia
    const docRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ templateId: 'TMPL-05', groupId: group.id, unit: unitCode }),
    });
    const doc = await docRes.json();
    assert.equal(doc.preflight.complete, false, 'TMPL-05 debe reportar preflight incompleto');

    // Intentar submit
    const submitRes = await fetch(`${BASE_URL}/api/document/submit`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        templateId: 'TMPL-05',
        groupId: group.id,
        unit: unitCode,
        fingerprint: doc.fingerprint,
      }),
    });

    assert.equal(submitRes.status, 422, 'Debe responder HTTP 422 ante campos pendientes');
    const err = await submitRes.json();
    assert.match(err.error, /campos pendientes/i);
  });

  test('2. Fingerprint inválido u obsoleto: Rechaza entrega con HTTP 409 si los datos cambiaron', async () => {
    const staleFingerprint = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const submitRes = await fetch(`${BASE_URL}/api/document/submit`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        templateId: 'TMPL-05',
        groupId: group.id,
        unit: unitCode,
        fingerprint: staleFingerprint,
      }),
    });

    assert.equal(submitRes.status, 409, 'Debe responder HTTP 409 si el fingerprint no coincide');
    const err = await submitRes.json();
    assert.match(err.error, /cambiaron después de la vista previa/i);
  });

  test('3. Simulación demoFill rechazada: No permite entregar documentos con datos ficticios', async () => {
    const docRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ templateId: 'TMPL-05', groupId: group.id, unit: unitCode, demoFill: true }),
    });
    const doc = await docRes.json();
    assert.equal(doc.preflight.complete, true, 'Con demoFill el preflight aparenta completitud');

    const submitRes = await fetch(`${BASE_URL}/api/document/submit`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        templateId: 'TMPL-05',
        groupId: group.id,
        unit: unitCode,
        fingerprint: doc.fingerprint,
        demoFill: true,
      }),
    });

    assert.equal(submitRes.status, 422, 'Debe responder HTTP 422 al intentar entregar con demoFill');
    const err = await submitRes.json();
    assert.match(err.error, /datos de demostración no puede entregarse/i);
  });

  test('4. Configuración y Preflight completo: TMPL-04 Carpeta pedagógica cumple requisitos', async () => {
    // Asegurar parámetros requeridos para TMPL-04
    const cfgRes = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDirector });
    const cfg = await cfgRes.json();
    const instSetting = cfg.settings.find(s => s.scope.kind === 'institution');
    const grpSetting = cfg.settings.find(s => s.scope.kind === 'group' && s.scope.target === group.id);
    const modSetting = cfg.settings.find(s => s.scope.kind === 'module' && s.scope.target === group.moduleId);

    // Guardar institución completa
    await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: { kind: 'institution' },
        fields: { ...instSetting?.fields, tipoGestion: 'PÚBLICA' },
        rev: instSetting?.rev || null,
      }),
    });

    // Guardar grupo completo
    await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: { kind: 'group', target: group.id },
        fields: { ...grpSetting?.fields, ciclo: 'Auxiliar Técnico', fechaInicio: '2026-03-16', fechaFin: '2026-07-24' },
        rev: grpSetting?.rev || null,
      }),
    });

    // Guardar módulo completo
    await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: { kind: 'module', target: group.moduleId },
        fields: { ...modSetting?.fields, hours: 528, credits: 22 },
        rev: modSetting?.rev || null,
      }),
    });

    // Seleccionar workspace en MODULE para TMPL-04
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'MODULE',
      }),
    });

    const docRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ templateId: 'TMPL-04', groupId: group.id }),
    });
    const doc = await docRes.json();
    assert.equal(doc.preflight.complete, true, 'TMPL-04 debe tener preflight.complete = true');
    assert.equal(doc.preflight.missing.length, 0);
  });

  let submittedDocId = null;
  let submittedRev = null;
  let submittedPdfHash = null;

  test('5. Entrega formal exitosa: POST /api/document/submit registra el documento en SQLite', async () => {
    // Obtener fingerprint vigente
    const docRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ templateId: 'TMPL-04', groupId: group.id }),
    });
    const doc = await docRes.json();

    const submitRes = await fetch(`${BASE_URL}/api/document/submit`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        templateId: 'TMPL-04',
        groupId: group.id,
        fingerprint: doc.fingerprint,
      }),
    });

    assert.equal(submitRes.status, 200);
    const sub = await submitRes.json();

    assert.ok(sub.id, 'Debe emitir identificador único de entrega');
    assert.equal(sub.templateId, 'TMPL-04');
    assert.equal(sub.status, 'ENTREGADO');
    assert.equal(sub.authorName, 'Prof. Martín Valdivia');
    assert.ok(sub.pdfHash, 'Debe incluir hash SHA-256 del PDF custodial');
    assert.ok(sub.rev, 'Debe emitir revisión inicial rev');
    assert.equal(sub.pdf, undefined, 'No debe filtrar la cadena base64 en la respuesta pública');

    submittedDocId = sub.id;
    submittedRev = sub.rev;
    submittedPdfHash = sub.pdfHash;
  });

  test('6. Consulta de entregas en GET /api/dashboard: Aparece en el historial del docente', async () => {
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: headersDocente });
    assert.equal(dashRes.status, 200);
    const dash = await dashRes.json();

    const found = dash.submissions?.find(s => s.id === submittedDocId);
    assert.ok(found, 'La entrega debe figurar en el listado de submissions del docente');
    assert.equal(found.status, 'ENTREGADO');
  });

  test('7. Recuperación del PDF entregado: POST /api/document/submission-pdf retorna binario exacto', async () => {
    const pdfRes = await fetch(`${BASE_URL}/api/document/submission-pdf`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({ id: submittedDocId }),
    });

    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');

    const buffer = await pdfRes.arrayBuffer();
    assert.ok(buffer.byteLength > 1000, 'El PDF debe tener tamaño válido');

    // Verificar encabezado %PDF-
    const header = Buffer.from(buffer.slice(0, 5)).toString();
    assert.equal(header, '%PDF-', 'Debe comenzar con la firma oficial %PDF-');

    // Verificar integridad del hash
    const computedHash = crypto.createHash('sha256').update(Buffer.from(buffer).toString('base64')).digest('hex');
    assert.equal(computedHash, submittedPdfHash, 'El hash del PDF debe coincidir con el registrado');
  });

  test('8. RBAC DOCENTE: No puede revisar documentos (retorna HTTP 403)', async () => {
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'RECIBIDO',
        reason: 'Intento de revisión por parte del docente',
        rev: submittedRev,
      }),
    });

    assert.equal(revRes.status, 403, 'El docente no tiene permisos administrativos para revisar');
  });

  test('9. SECRETARIA: Puede emitir dictamen RECIBIDO con motivo obligatorio', async () => {
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'RECIBIDO',
        reason: 'Recibido formalmente en mesa de partes de Secretaría.',
        rev: submittedRev,
      }),
    });

    assert.equal(revRes.status, 200);
    const updated = await revRes.json();

    assert.equal(updated.id, submittedDocId);
    assert.equal(updated.status, 'RECIBIDO');
    assert.equal(updated.reviewReason, 'Recibido formalmente en mesa de partes de Secretaría.');
    assert.notEqual(updated.rev, submittedRev, 'El rev debe actualizarse tras la revisión');

    // Actualizar rev para pruebas subsecuentes
    submittedRev = updated.rev;
  });

  test('10. SECRETARIA: Puede emitir dictamen OBSERVADO con motivo obligatorio', async () => {
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'OBSERVADO',
        reason: 'Se observa que la carpeta pedagógica requiere firma del coordinador.',
        rev: submittedRev,
      }),
    });

    assert.equal(revRes.status, 200);
    const updated = await revRes.json();

    assert.equal(updated.status, 'OBSERVADO');
    assert.equal(updated.reviewReason, 'Se observa que la carpeta pedagógica requiere firma del coordinador.');

    submittedRev = updated.rev;
  });

  test('11. SECRETARIA: Bloqueo estricto ante dictamen REVISADO (exclusivo DIRECTOR, HTTP 403)', async () => {
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'REVISADO',
        reason: 'Intento de visado final por secretaría',
        rev: submittedRev,
      }),
    });

    assert.equal(revRes.status, 403, 'Secretaría no puede emitir dictamen REVISADO');
  });

  test('12. Validación de motivo: Rechaza revisión sin motivo con HTTP 400', async () => {
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'REVISADO',
        reason: '   ',
        rev: submittedRev,
      }),
    });

    assert.equal(revRes.status, 400, 'Debe rechazar revisiones con motivo vacío');
  });

  test('13. Concurrencia rev (HTTP 409): Rechaza revisión con rev obsoleto', async () => {
    const staleRev = '00000000-0000-0000-0000-000000000000';
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'REVISADO',
        reason: 'Intento con rev obsoleto',
        rev: staleRev,
      }),
    });

    assert.equal(revRes.status, 409, 'Debe responder HTTP 409 ante rev desactualizado');
    const err = await revRes.json();
    assert.match(err.error, /otra ventana/i);
  });

  test('14. DIRECTOR: Visado oficial REVISADO aprobado', async () => {
    const revRes = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        id: submittedDocId,
        status: 'REVISADO',
        reason: 'Aprobado y visado por la Dirección General del CETPRO.',
        rev: submittedRev,
      }),
    });

    assert.equal(revRes.status, 200);
    const updated = await revRes.json();

    assert.equal(updated.status, 'REVISADO');
    assert.equal(updated.reviewReason, 'Aprobado y visado por la Dirección General del CETPRO.');
    assert.ok(updated.reviewedAt);
    assert.ok(updated.reviewedBy);
  });

  test('15. Seguridad: Rechazo de petición sin token de autenticación (HTTP 401)', async () => {
    const unauthSubmit = await fetch(`${BASE_URL}/api/document/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'TMPL-04', groupId: group.id, fingerprint: 'abc' }),
    });
    assert.equal(unauthSubmit.status, 401);

    const unauthReview = await fetch(`${BASE_URL}/api/document/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submittedDocId, status: 'RECIBIDO', reason: 'sin token' }),
    });
    assert.equal(unauthReview.status, 401);

    const unauthPdf = await fetch(`${BASE_URL}/api/document/submission-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submittedDocId }),
    });
    assert.equal(unauthPdf.status, 401);
  });
});
