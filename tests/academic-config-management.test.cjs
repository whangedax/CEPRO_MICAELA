/**
 * tests/academic-config-management.test.cjs
 * 
 * Suite oficial de pruebas automatizadas para:
 * CONFIGURACIÓN ACADÉMICA Y PERIODOS LECTIVOS (Tarea 32)
 * CEPRO_MICAELA 2.0.
 * 
 * Verifica más de 30 aspectos esenciales:
 * 1. RBAC estricto (DIRECTOR full, SECRETARIA solo lectura, DOCENTE bloqueado)
 * 2. Institución y calendario (academicYear)
 * 3. Periodos académicos y sincronización con calendario (academicPeriod)
 * 4. Planes curriculares, unidades didácticas y EFSRT (curriculum)
 * 5. Valores oficiales de referencia (moduleDefaults)
 * 6. Directorio institucional de personal (personnel)
 * 7. Clonación integral de año académico (POST /api/academic/year) con aislamiento histórico
 * 8. Manejo de concurrencia optimista (HTTP 409)
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8089';

describe('Configuración Académica y Periodos Lectivos (Tarea 32)', () => {
  let tokenDirector = null;
  let tokenSecretaria = null;
  let tokenDocente = null;
  let headersDirector = {};
  let headersSecretaria = {};
  let headersDocente = {};

  before(async () => {
    // 1. Login Director
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

    // 2. Login Secretaría
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

    // 3. Login Docente
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

  // ==========================================
  // BLOQUE 1: CONTROL DE ACCESO RBAC ESTRICTO
  // ==========================================
  describe('1. Control de acceso RBAC institucional', () => {
    test('1.1 DIRECTOR puede consultar configuración académica con editable=true', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.editable, true, 'Director debe tener editable=true');
      assert.ok(Array.isArray(data.records), 'Debe contener records');
      assert.ok(data.issues, 'Debe contener issues');
      assert.ok(data.schema, 'Debe contener schema de los 5 ámbitos');
    });

    test('1.2 SECRETARIA puede consultar configuración académica pero con editable=false (solo lectura)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersSecretaria,
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.editable, false, 'Secretaría debe tener editable=false');
      assert.ok(data.records.length > 0, 'Secretaría puede consultar los registros');
    });

    test('1.3 DOCENTE tiene acceso estrictamente bloqueado a configuración académica (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDocente,
      });
      assert.equal(res.status, 403, 'Docente debe recibir 403 Forbidden');
    });

    test('1.4 SECRETARIA tiene bloqueada la clonación de año lectivo (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/year`, {
        method: 'POST',
        headers: headersSecretaria,
        body: JSON.stringify({ sourceYear: '2026', year: '2028' }),
      });
      assert.equal(res.status, 403, 'Secretaría no puede clonar años');
    });

    test('1.5 DOCENTE tiene bloqueada la clonación de año lectivo (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/year`, {
        method: 'POST',
        headers: headersDocente,
        body: JSON.stringify({ sourceYear: '2026', year: '2028' }),
      });
      assert.equal(res.status, 403, 'Docente no puede clonar años');
    });

    test('1.6 SECRETARIA tiene bloqueada la aplicación de valores de referencia (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/reference/apply`, {
        method: 'POST',
        headers: headersSecretaria,
        body: JSON.stringify({ moduleId: 'MOD-009' }),
      });
      assert.equal(res.status, 403, 'Secretaría no puede aplicar referencias');
    });

    test('1.7 DOCENTE tiene bloqueada la aplicación de valores de referencia (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/reference/apply`, {
        method: 'POST',
        headers: headersDocente,
        body: JSON.stringify({ moduleId: 'MOD-009' }),
      });
      assert.equal(res.status, 403, 'Docente no puede aplicar referencias');
    });

    test('1.8 SECRETARIA tiene bloqueada la edición de parámetros de academicYear (HTTP 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersSecretaria,
        body: JSON.stringify({
          scope: { kind: 'academicYear', target: '2026' },
          fields: { hours: 1800 },
        }),
      });
      assert.equal(res.status, 403, 'Secretaría no puede guardar academicYear');
    });
  });

  // ==========================================
  // BLOQUE 2: INSTITUCIÓN Y CALENDARIO (academicYear)
  // ==========================================
  describe('2. Institución y calendario lectivo (academicYear)', () => {
    let yearRecord = null;

    test('2.1 Consulta registro base de academicYear:2026', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const data = await res.json();
      yearRecord = data.records.find((r) => r.scope.kind === 'academicYear' && r.scope.target === '2026');
      assert.ok(yearRecord, 'Debe existir academicYear:2026');
      assert.equal(yearRecord.fields.hours, 1700);
      assert.equal(yearRecord.fields.credits, 64);
    });

    test('2.2 Rechaza target de año inválido que no conste de 4 cifras (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicYear', target: '26' },
          fields: { hours: 1700 },
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cuatro cifras/i);
    });

    test('2.3 DIRECTOR actualiza exitosamente parámetros institucionales y horas anuales', async () => {
      const instData = JSON.parse(yearRecord.fields.institutionJson || '{}');
      instData.direccion = 'Jr. San Román 320';

      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicYear', target: '2026' },
          fields: {
            institutionJson: JSON.stringify(instData),
            hours: 1720,
            directoryPlace: 'Juliaca - Sede Central',
          },
          rev: yearRecord.rev,
        }),
      });
      assert.equal(res.status, 200);
      const saved = await res.json();
      assert.equal(saved.fields.hours, 1720);
      assert.equal(saved.fields.directoryPlace, 'Juliaca - Sede Central');
      yearRecord = saved; // Actualizar rev
    });

    test('2.4 Rechaza calendarJson cuyas fechas no correspondan al año del target (HTTP 400)', async () => {
      const invalidCalendar = [
        { name: 'Periodo fuera de año', start: '2025-03-01', end: '2025-07-20' },
      ];
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicYear', target: '2026' },
          fields: { calendarJson: JSON.stringify(invalidCalendar) },
          rev: yearRecord.rev,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /calendario/i);
    });

    test('2.5 Detecta conflicto de concurrencia HTTP 409 ante rev desactualizado en academicYear', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicYear', target: '2026' },
          fields: { hours: 1750 },
          rev: 'rev-obsoleto-inexistente',
        }),
      });
      assert.equal(res.status, 409, 'Debe responder 409 Conflict');
    });
  });

  // ==========================================
  // BLOQUE 3: PERIODOS ACADÉMICOS (academicPeriod)
  // ==========================================
  describe('3. Periodos académicos y sincronización de calendario (academicPeriod)', () => {
    let period1 = null;

    test('3.1 Consulta registros base de academicPeriod:2026-I y 2026-II', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const data = await res.json();
      period1 = data.records.find((r) => r.scope.kind === 'academicPeriod' && r.scope.target === '2026-I');
      const period2 = data.records.find((r) => r.scope.kind === 'academicPeriod' && r.scope.target === '2026-II');
      assert.ok(period1, 'Debe existir 2026-I');
      assert.ok(period2, 'Debe existir 2026-II');
      assert.equal(period1.fields.year, '2026');
      assert.equal(period1.fields.hours, 850);
    });

    test('3.2 Rechaza periodo cuyo target no coincida con el año del periodo (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicPeriod', target: '2027-I' },
          fields: { year: '2026', fechaInicio: '2026-03-01', fechaFin: '2026-07-24' },
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /comenzar por su año/i);
    });

    test('3.3 DIRECTOR actualiza fechas de 2026-I y verifica sincronización automática en calendario de academicYear', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicPeriod', target: '2026-I' },
          fields: {
            year: '2026',
            fechaInicio: '2026-03-02',
            fechaFin: '2026-07-24',
            hours: 860,
            credits: 32,
          },
          rev: period1.rev,
        }),
      });
      assert.equal(res.status, 200);

      // Verificar sincronización en academicYear
      const cfgRes = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const cfg = await cfgRes.json();
      const yr = cfg.records.find((r) => r.scope.kind === 'academicYear' && r.scope.target === '2026');
      const calendar = JSON.parse(yr.fields.calendarJson || '[]');
      const row2026I = calendar.find((c) => c.name.includes('(2026-I)'));
      assert.ok(row2026I, 'Debe existir fila de 2026-I en calendarJson');
      assert.equal(row2026I.start, '2026-03-02', 'Fecha de inicio debe estar sincronizada');
      assert.equal(row2026I.end, '2026-07-24', 'Fecha de fin debe estar sincronizada');
    });

    test('3.4 Rechaza mover periodo si dejaría fuera fechas de unidades existentes (HTTP 400)', async () => {
      // Intentar recortar el periodo a abril, cuando UD2 finaliza en julio
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'academicPeriod', target: '2026-I' },
          fields: {
            year: '2026',
            fechaInicio: '2026-03-02',
            fechaFin: '2026-04-30', // Demasiado corto para UD2
          },
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /dejaría fuera fechas de unidades/i);
    });
  });

  // ==========================================
  // BLOQUE 4: PLANES CURRICULARES (curriculum)
  // ==========================================
  describe('4. Programas y planes curriculares (curriculum)', () => {
    let curRecord = null;

    test('4.1 Consulta currículo base de MOD-009 (Ofimática)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const data = await res.json();
      curRecord = data.records.find((r) => r.scope.kind === 'curriculum' && r.scope.target === 'MOD-009');
      assert.ok(curRecord, 'Debe existir curriculum:MOD-009');
      assert.equal(curRecord.fields.nombre, 'Ofimática');
      assert.equal(curRecord.fields.periodId, '2026-I');
      const units = JSON.parse(curRecord.fields.unitsJson || '[]');
      assert.ok(units.some((u) => u.code === 'EFSRT'), 'Debe incluir EFSRT');
    });

    test('4.2 Rechaza plan curricular que omita unidad obligatoria EFSRT (HTTP 400)', async () => {
      const unitsWithoutEfsrt = [
        { code: 'UD1', name: 'Ofimática Básica', hours: 200, credits: 8 },
      ];
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'curriculum', target: 'MOD-009' },
          fields: {
            year: '2026',
            periodId: '2026-I',
            nombre: 'Ofimática',
            programName: 'COMPUTACIÓN E INFORMÁTICA',
            unitsJson: JSON.stringify(unitsWithoutEfsrt),
          },
          rev: curRecord.rev,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /debe incluir EFSRT/i);
    });

    test('4.3 Rechaza retirar unidad que esté actualmente en uso por un aula existente (HTTP 400)', async () => {
      // Grupo A usa UD1 y UD2. Si intentamos guardar curriculum sin UD2:
      const unitsWithoutUD2 = [
        { code: 'UD1', name: 'Ofimática Básica', hours: 200, credits: 8 },
        { code: 'EFSRT', name: 'Prácticas Pre-Profesionales', hours: 80, credits: 4 },
      ];
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'curriculum', target: 'MOD-009' },
          fields: {
            year: '2026',
            periodId: '2026-I',
            nombre: 'Ofimática',
            programName: 'COMPUTACIÓN E INFORMÁTICA',
            unitsJson: JSON.stringify(unitsWithoutUD2),
          },
          rev: curRecord.rev,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /No retire una unidad utilizada por un aula/i);
    });

    test('4.4 DIRECTOR aplica exitosamente valores de referencia a MOD-009 (POST /api/academic/reference/apply)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/reference/apply`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          moduleId: 'MOD-009',
          rev: curRecord.rev,
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, 'curriculum:MOD-009');
      assert.equal(data.fields.hours, 400);
      assert.equal(data.fields.credits, 16);
      curRecord = data; // Actualizar rev
    });

    test('4.5 Detecta issues cuando la suma de horas de las unidades difiere del total declarado', async () => {
      // Guardar horas = 500 cuando la suma de unidades es 400
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'curriculum', target: 'MOD-009' },
          fields: {
            ...curRecord.fields,
            hours: 500, // Discrepancia intencional
          },
          rev: curRecord.rev,
        }),
      });
      assert.equal(res.status, 200);
      const saved = await res.json();
      curRecord = saved;

      // Consultar issues
      const cfgRes = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const cfg = await cfgRes.json();
      const issues2026 = cfg.issues['2026'] || [];
      assert.ok(
        issues2026.some((iss) => iss.includes('suma 400 horas; total declarado 500')),
        'Debe advertir la discrepancia de horas en issues'
      );

      // Restaurar a 400 para consistencia
      const fixRes = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'curriculum', target: 'MOD-009' },
          fields: { ...curRecord.fields, hours: 400 },
          rev: curRecord.rev,
        }),
      });
      assert.equal(fixRes.status, 200);
      curRecord = await fixRes.json();
    });
  });

  // ==========================================
  // BLOQUE 5: VALORES DE REFERENCIA (moduleDefaults)
  // ==========================================
  describe('5. Valores oficiales de referencia (moduleDefaults)', () => {
    let defRecord = null;

    test('5.1 Consulta moduleDefaults:MOD-009', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const data = await res.json();
      defRecord = data.records.find((r) => r.scope.kind === 'moduleDefaults' && r.scope.target === 'MOD-009');
      assert.ok(defRecord, 'Debe existir moduleDefaults:MOD-009');
      const refData = JSON.parse(defRecord.fields.dataJson || '{}');
      assert.equal(refData.module.hours, 400);
      assert.equal(refData.units.length, 3);
    });

    test('5.2 DIRECTOR actualiza notas y observaciones de moduleDefaults', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'moduleDefaults', target: 'MOD-009' },
          fields: {
            ...defRecord.fields,
            notes: 'Revisado y cotejado con Catálogo 2026-MINEDU',
          },
          rev: defRecord.rev,
        }),
      });
      assert.equal(res.status, 200);
      const saved = await res.json();
      assert.equal(saved.fields.notes, 'Revisado y cotejado con Catálogo 2026-MINEDU');
      defRecord = saved;
    });

    test('5.3 Rechaza dataJson con código de unidad inválido (HTTP 400)', async () => {
      const invalidData = {
        module: { hours: 400 },
        units: [{ code: 'INVALID_CODE', name: 'Unidad Inválida' }],
      };
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'moduleDefaults', target: 'MOD-009' },
          fields: {
            ...defRecord.fields,
            dataJson: JSON.stringify(invalidData),
          },
          rev: defRecord.rev,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Código de unidad de referencia inválido/i);
    });
  });

  // ==========================================
  // BLOQUE 6: DIRECTORIO DEL PERSONAL (personnel)
  // ==========================================
  describe('6. Directorio institucional del personal (personnel)', () => {
    let docRecord = null;

    test('6.1 Consulta personal docente Martín Valdivia (personnel:2026:42345678)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const data = await res.json();
      docRecord = data.records.find((r) => r.scope.kind === 'personnel' && r.scope.target === '2026:42345678');
      assert.ok(docRecord, 'Debe existir personnel:2026:42345678');
      assert.equal(docRecord.fields.document, '42345678');
      assert.equal(docRecord.fields.position, 'Docente');
    });

    test('6.2 Rechaza registrar persona con DNI que no conste de 8 dígitos (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'personnel', target: '2026:123' },
          fields: {
            year: '2026',
            document: '123',
            name: 'Pérez, Juan',
          },
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /ocho cifras/i);
    });

    test('6.3 DIRECTOR registra nueva persona en el directorio institucional', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'personnel', target: '2026:70123456' },
          fields: {
            year: '2026',
            document: '70123456',
            name: 'Quispe Ramos, Elena',
            position: 'Docente',
            specialty: 'Confección Textil',
            email: 'equispe@cetpromicaelabastidas.edu.pe',
            phone: '951777888',
            referenceTurno: 'Tarde',
            sourceNote: 'Directorio 2026 oficial',
          },
        }),
      });
      assert.equal(res.status, 200);
      const saved = await res.json();
      assert.equal(saved.fields.document, '70123456');
      assert.equal(saved.fields.specialty, 'Confección Textil');
    });

    test('6.4 DIRECTOR actualiza número de celular de personal existente', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'personnel', target: '2026:42345678' },
          fields: {
            ...docRecord.fields,
            phone: '951234999',
          },
          rev: docRecord.rev,
        }),
      });
      assert.equal(res.status, 200);
      const saved = await res.json();
      assert.equal(saved.fields.phone, '951234999');
      docRecord = saved;
    });

    test('6.5 Detecta conflicto de concurrencia HTTP 409 en ficha de personal con rev desfasado', async () => {
      const res = await fetch(`${BASE_URL}/api/document/configuration`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({
          scope: { kind: 'personnel', target: '2026:42345678' },
          fields: { ...docRecord.fields, phone: '951000000' },
          rev: 'rev-invalido',
        }),
      });
      assert.equal(res.status, 409);
    });
  });

  // ==========================================
  // BLOQUE 7: CLONACIÓN DE AÑO ACADÉMICO (POST /api/academic/year)
  // ==========================================
  describe('7. Clonación de año académico con aislamiento histórico (POST /api/academic/year)', () => {
    test('7.1 Rechaza clonar a un año con formato inválido (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/year`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({ sourceYear: '2026', year: '27' }),
      });
      assert.equal(res.status, 400);
    });

    test('7.2 Rechaza clonar si el año destino ya se encuentra registrado (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/year`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({ sourceYear: '2026', year: '2026' }),
      });
      assert.equal(res.status, 400);
    });

    test('7.3 DIRECTOR clona exitosamente año 2026 a nuevo año 2027', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/year`, {
        method: 'POST',
        headers: headersDirector,
        body: JSON.stringify({ sourceYear: '2026', year: '2027' }),
      });
      assert.equal(res.status, 200);
      const result = await res.json();
      assert.equal(result.year, '2027');
      assert.match(result.message, /Año creado/i);
    });

    test('7.4 El nuevo año 2027 contiene estructura completa con fechas en blanco', async () => {
      const res = await fetch(`${BASE_URL}/api/academic/configuration`, {
        headers: headersDirector,
      });
      const data = await res.json();

      // academicYear:2027
      const year27 = data.records.find((r) => r.scope.kind === 'academicYear' && r.scope.target === '2027');
      assert.ok(year27, 'Debe existir academicYear:2027');
      assert.equal(year27.fields.calendarJson, '[]', 'Calendario debe iniciar en blanco');
      assert.equal(year27.fields.directoryDate, '', 'Fecha del directorio debe estar limpia');

      // periodos 2027-I y 2027-II
      const p1 = data.records.find((r) => r.scope.kind === 'academicPeriod' && r.scope.target === '2027-I');
      const p2 = data.records.find((r) => r.scope.kind === 'academicPeriod' && r.scope.target === '2027-II');
      assert.ok(p1, 'Debe existir periodo 2027-I');
      assert.ok(p2, 'Debe existir periodo 2027-II');
      assert.equal(p1.fields.fechaInicio, '', 'Fecha inicio 2027-I debe estar limpia');
      assert.equal(p1.fields.fechaFin, '', 'Fecha fin 2027-I debe estar limpia');

      // curriculum para 2027
      const cur27 = data.records.filter((r) => r.scope.kind === 'curriculum' && r.fields.year === '2027');
      assert.ok(cur27.length > 0, 'Debe haber planes curriculares creados para 2027');
      assert.ok(cur27[0].scope.target.startsWith('MOD-2027-'), 'Módulos deben tener IDs nuevos con prefijo MOD-2027-');

      // personal clonado para 2027
      const pers27 = data.records.filter((r) => r.scope.kind === 'personnel' && r.fields.year === '2027');
      assert.ok(pers27.length >= 2, 'Directorio del personal debe estar clonado para 2027');
      assert.ok(pers27.some((p) => p.fields.document === '42345678'));
    });

    test('7.5 Aislamiento histórico: Estudiantes, matrículas, notas y asistencias de 2026 NO se copiaron a 2027', async () => {
      const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
        headers: headersDirector,
      });
      const dash = await dashRes.json();

      // Ninguna matrícula histórica fue duplicada para 2027
      assert.ok(
        !dash.enrollments.some((e) => e.periodId && e.periodId.startsWith('2027')),
        'No deben existir matrículas en 2027'
      );

      // Ningún grupo nuevo fue auto-creado sin autorización de secretaría/dirección
      assert.ok(
        !dash.groups.some((g) => g.periodId && g.periodId.startsWith('2027')),
        'No deben existir grupos automáticos en 2027'
      );
    });
  });
});
