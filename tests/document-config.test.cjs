/**
 * tests/document-config.test.cjs
 * 
 * Suite de pruebas automatizadas para la CONFIGURACIÓN DOCUMENTAL (Tarea 22).
 * Valida contratos reales de API (GET /api/document/configuration, POST /api/document/configuration),
 * esquemas por rol (DOCENTE, SECRETARIA, DIRECTOR), edición pedagógica de unidades didácticas
 * (nombre, capacidad, indicadores IL1..IL5), control de concurrencia con rev (HTTP 409),
 * aislamiento entre unidades didácticas y actualización del fingerprint en el Preflight.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Configuración Documental — Integración y Reglas de Dominio (Sandbox)', () => {
  let tokenDocente = null;
  let tokenDirector = null;
  let tokenSecretaria = null;
  let headersDocente = {};
  let headersDirector = {};
  let headersSecretaria = {};
  let group = null;

  before(async () => {
    // 1. Login como DOCENTE
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

    // 2. Login como DIRECTOR
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

    // 3. Login como SECRETARIA
    const loginSec = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'secretaria.dev', password: 'SecretariaDev2026!' }),
    });
    const secData = await loginSec.json();
    assert.equal(loginSec.status, 200);
    tokenSecretaria = secData.token;
    headersSecretaria = {
      'Authorization': `Bearer ${tokenSecretaria}`,
      'Content-Type': 'application/json',
    };

    // 4. Obtener aula del docente y establecer workspace en modo UNIT (UD1)
    const optRes = await fetch(`${BASE_URL}/api/workspace/options`, { headers: headersDocente });
    const optData = await optRes.json();
    group = optData.groups[0];
    assert.ok(group, 'El docente debe tener al menos un aula asignada');

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

  test('1. GET /api/document/configuration recupera esquemas y defaults para el rol DOCENTE en modo UNIT', async () => {
    const res = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDocente });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.schema, 'Debe devolver el esquema de campos');
    assert.ok(data.schema.unit, 'DOCENTE en modo UNIT debe tener esquema para ámbito "unit"');
    assert.ok(Array.isArray(data.settings), 'Debe devolver lista de settings');

    // Comprobar que en ámbito unit existen los campos pedagógicos requeridos
    const unitKeys = data.schema.unit.map((f) => f.key);
    assert.ok(unitKeys.includes('name'), 'Debe incluir nombre de la unidad didáctica');
    assert.ok(unitKeys.includes('capacity'), 'Debe incluir capacidad de la unidad');
    assert.ok(unitKeys.includes('competence'), 'Debe incluir unidad de competencia');
    for (let i = 1; i <= 5; i++) {
      assert.ok(unitKeys.includes(`indicator${i}`), `Debe incluir indicator${i}`);
    }
  });

  test('2. DOCENTE: Guardado real de capacidades e indicadores pedagógicos (POST /api/document/configuration)', async () => {
    // Consultar configuración actual para obtener rev previo si existe
    const cfgRes = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDocente });
    const cfgData = await cfgRes.json();
    const existingRec = cfgData.settings.find((s) => s.id === `unit:${group.id}:UD1`);

    const payload = {
      scope: {
        kind: 'unit',
        target: group.id,
        unit: 'UD1',
      },
      fields: {
        name: 'Procesador de Textos Avanzado',
        capacity: 'Elabora y gestiona documentación administrativa compleja con herramientas ofimáticas.',
        competence: 'Gestiona la información institucional mediante software aplicativo.',
        indicator1: 'Aplica formatos, estilos y plantillas según estándares institucionales.',
        indicator2: 'Inserta tablas complejas, gráficos y referencias bibliográficas.',
        indicator3: 'Diseña y automatiza correspondencia masiva.',
        indicator4: 'Configura esquemas de protección y revisión documental.',
        indicator5: 'Exporta a PDF institucional y valida la integridad de los metadatos.',
      },
      rev: existingRec?.rev || null,
    };

    const res = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const saved = await res.json();

    assert.equal(saved.id, `unit:${group.id}:UD1`);
    assert.ok(saved.rev, 'El servidor debe retornar un nuevo rev único');
    assert.equal(saved.fields.name, 'Procesador de Textos Avanzado');
    assert.equal(saved.fields.indicator1, 'Aplica formatos, estilos y plantillas según estándares institucionales.');
  });

  test('3. Persistencia y recuperación: los valores persisten y se recuperan tras nueva consulta (simulación F5)', async () => {
    const res = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDocente });
    assert.equal(res.status, 200);
    const data = await res.json();

    const unitSetting = data.settings.find((s) => s.id === `unit:${group.id}:UD1`);
    assert.ok(unitSetting, 'El setting guardado debe estar presente en data.settings');
    assert.equal(unitSetting.fields.name, 'Procesador de Textos Avanzado');
    assert.equal(unitSetting.fields.indicator5, 'Exporta a PDF institucional y valida la integridad de los metadatos.');
  });

  test('4. Detección de conflicto de concurrencia HTTP 409 ante rev desactualizado', async () => {
    const payloadConRevObsoleto = {
      scope: {
        kind: 'unit',
        target: group.id,
        unit: 'UD1',
      },
      fields: {
        name: 'Intento Concurrente Obsoleto',
        capacity: 'Capacidad modificada en conflicto',
      },
      rev: 'REV-INEXISTENTE-O-DESACTUALIZADA-999',
    };

    const res = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify(payloadConRevObsoleto),
    });

    assert.equal(res.status, 409, 'Debe responder HTTP 409 cuando el rev no coincide');
    const errData = await res.json();
    assert.match(errData.error, /otra ventana|cambió/i);
  });

  test('5. Aislamiento entre unidades didácticas: los datos de UD1 no alteran UD2', async () => {
    // Cambiar temporalmente a UD2
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'UNIT',
        unit: 'UD2',
      }),
    });

    const resUD2 = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDocente });
    const dataUD2 = await resUD2.json();

    // El setting activo para UD2 debe ser independiente
    const settingUD2 = dataUD2.settings.find((s) => s.id === `unit:${group.id}:UD2`);
    if (settingUD2) {
      assert.notEqual(settingUD2.fields.name, 'Procesador de Textos Avanzado', 'UD2 no debe tener el nombre de UD1');
    }

    // Regresar a UD1
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

  test('6. Control RBAC: DOCENTE no puede modificar parámetros institucionales (403)', async () => {
    const payloadInst = {
      scope: {
        kind: 'institution',
      },
      fields: {
        nombre: 'CETPRO HACKEADO POR DOCENTE',
      },
    };

    const res = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify(payloadInst),
    });

    assert.equal(res.status, 403, 'DOCENTE debe ser rechazado al intentar modificar institución');
  });

  test('7. SECRETARIA: Puede consultar y guardar parámetros de grupo autorizados', async () => {
    // Secretaria en modo MODULE para el aula
    await fetch(`${BASE_URL}/api/workspace`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: 'MODULE',
      }),
    });

    const cfgRes = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersSecretaria });
    assert.equal(cfgRes.status, 200);
    const cfgData = await cfgRes.json();
    assert.ok(cfgData.schema.group, 'SECRETARIA debe tener acceso a esquema "group"');

    const existingGroup = cfgData.settings.find((s) => s.id === `group:${group.id}`);

    const saveGroupRes = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        scope: {
          kind: 'group',
          target: group.id,
        },
        fields: {
          turno: 'Noche',
          modalidad: 'Presencial',
          periodClase: '2026-I Regular',
        },
        rev: existingGroup?.rev || null,
      }),
    });

    assert.equal(saveGroupRes.status, 200);
    const savedGroup = await saveGroupRes.json();
    assert.equal(savedGroup.fields.turno, 'Noche');
  });

  test('8. SECRETARIA: Bloqueo de campos pedagógicos de unidad (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersSecretaria,
      body: JSON.stringify({
        scope: {
          kind: 'unit',
          target: group.id,
          unit: 'UD1',
        },
        fields: {
          name: 'Intento Secretaria',
        },
      }),
    });

    assert.equal(res.status, 403, 'SECRETARIA debe ser rechazada al intentar editar capacidades de unidad');
  });

  test('9. DIRECTOR: Modificación institucional autorizada y validación de nombre obligatorio', async () => {
    // 1. Rechazo con nombre vacío
    const invalidRes = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: {
          kind: 'institution',
        },
        fields: {
          nombre: '',
        },
      }),
    });
    assert.equal(invalidRes.status, 400, 'Nombre institucional no puede quedar vacío');

    // 2. Modificación válida con autoridades y DRE/UGEL
    const cfgRes = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDirector });
    const cfgData = await cfgRes.json();
    const instRec = cfgData.settings.find((s) => s.id === 'institution:institution');

    const validRes = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: {
          kind: 'institution',
        },
        fields: {
          nombre: 'CETPRO MICAELA BASTIDAS',
          dre: 'DRE Lima Metropolitana',
          ugel: 'UGEL 03',
          directorNombre: 'Mg. Juan Carlos Pérez García',
        },
        rev: instRec?.rev || null,
      }),
    });

    assert.equal(validRes.status, 200);
    const savedInst = await validRes.json();
    assert.equal(savedInst.fields.dre, 'DRE Lima Metropolitana');
    assert.equal(savedInst.fields.directorNombre, 'Mg. Juan Carlos Pérez García');

    // Restaurar el nombre institucional original del sandbox para idempotencia de la suite
    await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: {
          kind: 'institution',
        },
        fields: {
          nombre: 'CETPRO Micaela Bastidas (Sandbox Dev)',
          dre: 'DRE Lima Metropolitana',
          ugel: 'UGEL 03',
          directorNombre: 'Mg. Juan Carlos Pérez García',
        },
        rev: savedInst.rev,
      }),
    });
  });

  test('10. Validación de fechas: rechaza fecha de término anterior a fecha de inicio', async () => {
    const cfgRes = await fetch(`${BASE_URL}/api/document/configuration`, { headers: headersDirector });
    const cfgData = await cfgRes.json();
    const grpRec = cfgData.settings.find((s) => s.id === `group:${group.id}`);

    const resInverted = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'POST',
      headers: headersDirector,
      body: JSON.stringify({
        scope: {
          kind: 'group',
          target: group.id,
        },
        fields: {
          fechaInicio: '2026-11-20',
          fechaFin: '2026-03-01', // Anterior al inicio
        },
        rev: grpRec?.rev || null,
      }),
    });

    assert.equal(resInverted.status, 400, 'Debe rechazar fechas invertidas');
    const err = await resInverted.json();
    assert.match(err.error, /posterior/i);
  });

  test('11. Integración con Preflight: Los datos guardados actualizan los requisitos de TMPL-05 (Asistencia UD1)', async () => {
    // Preflight como DOCENTE en UD1 para TMPL-05
    const preflightRes = await fetch(`${BASE_URL}/api/document`, {
      method: 'POST',
      headers: headersDocente,
      body: JSON.stringify({
        groupId: group.id,
        templateId: 'TMPL-05',
        unit: 'UD1',
      }),
    });

    assert.equal(preflightRes.status, 200);
    const preflight = await preflightRes.json();

    assert.ok(preflight.fingerprint, 'El preflight debe generar una huella SHA-256');
    assert.ok(preflight.preflight, 'Debe incluir estructura preflight');

    // Comprobar que en fields del preflight el nombre de la unidad corresponde al guardado
    const unitField = preflight.preflight.fields.find((f) => f.key === 'units.name' || f.key === 'unit.name');
    if (unitField) {
      assert.equal(unitField.value, 'Procesador de Textos Avanzado');
      assert.equal(unitField.status, 'READY');
    }
  });

  test('12. Seguridad HTTP 401: Rechazo estricto ante petición sin token de autenticación', async () => {
    const res = await fetch(`${BASE_URL}/api/document/configuration`, {
      method: 'GET',
    });
    assert.equal(res.status, 401, 'Petición sin token debe responder HTTP 401');
  });
});
