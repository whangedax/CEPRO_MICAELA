/**
 * tests/attendance-integrity.test.cjs
 * 
 * Suite de validación de integridad para el módulo de asistencia:
 * 1. Sesión forzada a '1' (guardar con sesión '2' o '3' resulta en session '1').
 * 2. Mismo día guardado dos veces actualiza el registro sin duplicar filas (idempotencia y OCC).
 * 3. Fecha fuera de la UD rechazada con HTTP 400 y mensaje con formato D/M/Y exacto.
 * 4. Sábado rechazado con HTTP 400 ("no es día lectivo (sábado)").
 * 5. Feriado 2026-04-02 (Jueves Santo) rechazado con HTTP 400 ("es feriado (Jueves Santo)").
 * 6. Motor de calendario deduplica fechas que tengan sesiones heredadas múltiples (1 columna por día).
 * 7. Enriquecimiento de documento TMPL-05 consolida asistencias y no repite fechas.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { AcademicCalendarEngine } = require('../scripts/academic-calendar-engine.cjs');
const D = require('../scripts/offline-documents.cjs');

const { initQaBaseline } = require('./helpers/qa-env.cjs');

describe('Suite de Integridad de Asistencia — Cero Duplicados y Validación Normativa', () => {
  let tempDir = null;
  let core = null;
  let director = null;
  let docente = null;
  let group = null;
  let enrollment = null;

  before(() => {
    tempDir = path.resolve(__dirname, '../dev-sandbox/data/qa-attendance-test-' + Date.now());
    initQaBaseline(tempDir);
    core = new OfflineCore(tempDir);
    director = core.users().find(u => u.username === 'director.dev');
    docente = core.users().find(u => u.username === 'docente.dev');
    group = core.records('groups').find(g => g.programId === 'PROG-005') || core.records('groups')[0];
    enrollment = core.records('enrollments').find(e => e.groupId === group.id && e.active);
  });

  after(() => {
    if (core) core.close();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('1. Sesión forzada a 1 (guardar con sesión 2 o 3 resulta en session 1)', () => {
    // Intentar guardar con session = '2'
    const result = core.saveAcademic(docente, 'attendance', {
      groupId: group.id,
      unit: 'UD1',
      date: '2026-03-17',
      session: '2',
      rows: [{ enrollmentId: enrollment.id, value: 'P' }]
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].session, '1', 'La sesión guardada debe ser estrictamente 1');
    assert.equal(result[0].date, '2026-03-17');
    assert.equal(result[0].value, 'P');

    // Verificar en la BD
    const record = core.records('attendance').find(r => r.enrollmentId === enrollment.id && r.date === '2026-03-17');
    assert.ok(record, 'El registro debe existir en BD');
    assert.equal(record.session, '1');
  });

  test('2. Mismo día guardado dos veces actualiza sin duplicar registros', () => {
    const beforeCount = core.records('attendance').length;

    // Guardar de nuevo el mismo día 2026-03-17 pero cambiando el valor a 'T'
    const updateResult = core.saveAcademic(docente, 'attendance', {
      groupId: group.id,
      unit: 'UD1',
      date: '2026-03-17',
      session: '1',
      rows: [{ enrollmentId: enrollment.id, value: 'T', observation: 'Llegó con tardanza' }]
    });

    assert.equal(updateResult.length, 1);
    assert.equal(updateResult[0].value, 'T');

    const afterCount = core.records('attendance').length;
    assert.equal(afterCount, beforeCount, 'No debe crearse una nueva fila; debe actualizar la existente');

    const recordsOnDate = core.records('attendance').filter(r => r.enrollmentId === enrollment.id && r.date === '2026-03-17');
    assert.equal(recordsOnDate.length, 1, 'Debe haber exactamente 1 registro para este estudiante en esta fecha');
    assert.equal(recordsOnDate[0].value, 'T');
    assert.equal(recordsOnDate[0].observation, 'Llegó con tardanza');
  });

  test('3. Fecha fuera de la UD rechazada con HTTP 400 y mensaje exacto formatDmy', () => {
    assert.throws(
      () => {
        core.saveAcademic(docente, 'attendance', {
          groupId: group.id,
          unit: 'UD1',
          date: '2026-11-05',
          session: '1',
          rows: [{ enrollmentId: enrollment.id, value: 'P' }]
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(
          err.message,
          /^La fecha 05\/11\/2026 está fuera de la UD1 \(\d{2}\/\d{2}\/\d{4} \u2013 \d{2}\/\d{2}\/\d{4}\)\.$/,
          `Mensaje esperado debe contener fechas formateadas con guion medio: ${err.message}`
        );
        return true;
      }
    );
  });

  test('4. Sábado rechazado con HTTP 400 ("no es día lectivo (sábado)")', () => {
    // 2026-03-21 es sábado
    assert.throws(
      () => {
        core.saveAcademic(docente, 'attendance', {
          groupId: group.id,
          unit: 'UD1',
          date: '2026-03-21',
          session: '1',
          rows: [{ enrollmentId: enrollment.id, value: 'P' }]
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.ok(
          err.message.includes('no es día lectivo (sábado)'),
          `Mensaje debe indicar que el sábado no es día lectivo: ${err.message}`
        );
        return true;
      }
    );
  });

  test('5. 2026-04-02 Jueves Santo rechazado con HTTP 400 ("es feriado (Jueves Santo)")', () => {
    // 2026-04-02 es Jueves Santo (feriado institucional)
    assert.throws(
      () => {
        core.saveAcademic(docente, 'attendance', {
          groupId: group.id,
          unit: 'UD1',
          date: '2026-04-02',
          session: '1',
          rows: [{ enrollmentId: enrollment.id, value: 'P' }]
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.ok(
          err.message.includes('es feriado (Jueves Santo)'),
          `Mensaje debe indicar que la fecha es feriado (Jueves Santo): ${err.message}`
        );
        return true;
      }
    );
  });

  test('6. Motor de calendario deduplica fechas con sesiones heredadas múltiples', () => {
    const engine = new AcademicCalendarEngine();

    // Simular sesiones heredadas con duplicados en 2026-03-17 (sesión 1 y sesión 2)
    const recordedSessions = [
      { date: '2026-03-16', session: '1' },
      { date: '2026-03-17', session: '1' },
      { date: '2026-03-17', session: '2' }, // duplicado anómalo
      { date: '2026-03-18', session: '1' }
    ];

    const result = engine.resolveAcademicDates({
      fechaInicio: '2026-03-16',
      fechaFin: '2026-03-20',
      diasClase: [1, 2, 3, 4, 5],
      recordedSessions
    });

    assert.equal(result.success, true);
    // Debe haber exactamente 1 columna por cada fecha (Lu 16, Ma 17, Mi 18, Ju 19, Vi 20 = 5 fechas)
    const dates17 = result.dates.filter(d => d.fecha === '2026-03-17');
    assert.equal(dates17.length, 1, '2026-03-17 debe aparecer exactamente 1 vez en el calendario');
    assert.equal(dates17[0].sessionId, '2026-03-17|1');

    // Totales de estudiante: deben contar 1 sola vez el día 17
    const attendanceMarks = [
      { enrollmentId: 'EN-1', date: '2026-03-16', session: '1', value: 'P' },
      { enrollmentId: 'EN-1', date: '2026-03-17', session: '1', value: 'F', createdAt: '2026-03-17T08:00:00Z' },
      { enrollmentId: 'EN-1', date: '2026-03-17', session: '2', value: 'P', createdAt: '2026-03-17T10:00:00Z' }, // más reciente
      { enrollmentId: 'EN-1', date: '2026-03-18', session: '1', value: 'P' }
    ];

    const totals = engine.calculateStudentTotals(
      { enrollmentId: 'EN-1', startDate: '2026-03-16' },
      result.dates,
      attendanceMarks
    );

    // En 2026-03-17 ganó 'P' (más reciente); en total: Lu 16=P, Ma 17=P, Mi 18=P
    assert.equal(totals.totalRegistradas, 3, 'Deben registrarse 3 días');
    assert.equal(totals.P, 3, 'Deben contarse 3 asistencias P');
    assert.equal(totals.F, 0, 'No debe duplicar ni acumular la F superada');
  });

  test('7. Renderizado TMPL-05 consolida asistencias y no repite fechas', () => {
    // Generar documento TMPL-05 para el grupo y UD1
    const doc = core.document(docente, {
      templateId: 'TMPL-05',
      groupId: group.id,
      unit: 'UD1'
    });

    assert.ok(doc, 'El documento debe generarse con éxito');
    assert.ok(Array.isArray(doc.academicDates));

    // Verificar que todas las fechas en doc.academicDates sean únicas
    const datesSet = new Set(doc.academicDates.map(d => d.fecha));
    assert.equal(datesSet.size, doc.academicDates.length, 'No deben existir fechas duplicadas en academicDates');

    // Verificar que Semana Santa (02/04 y 03/04) no esté incluida en los días lectivos
    assert.equal(datesSet.has('2026-04-02'), false, '2026-04-02 (Jueves Santo) no debe figurar');
    assert.equal(datesSet.has('2026-04-03'), false, '2026-04-03 (Viernes Santo) no debe figurar');
  });

  test('8. Renderizado PDF de TMPL-05 no desplaza marcas a fechas intermedias no registradas', async () => {
    const { renderPDF } = require('../scripts/offline-pdf.cjs');
    const path = require('path');
    const root = path.resolve(__dirname, '..');
    core.saveAcademic(docente, 'attendance', {
      groupId: group.id,
      unit: 'UD1',
      date: '2026-03-24',
      session: '1',
      rows: [{ enrollmentId: enrollment.id, value: 'P' }]
    });
    const doc = core.document(docente, {
      templateId: 'TMPL-05',
      groupId: group.id,
      unit: 'UD1'
    });
    const pdfBytes = await renderPDF(root, doc, docente);
    assert.ok(pdfBytes && pdfBytes.length > 50000, 'PDF debe generarse correctamente');
    const marksForDate = doc.attendance.filter(a => a.enrollmentId === enrollment.id && a.date === '2026-03-19');
    assert.equal(marksForDate.length, 0, 'No debe haber marca registrada para 2026-03-19');
  });
});

