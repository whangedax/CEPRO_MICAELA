const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');

test('DEMO-01: Modo Demostración genera aula completa con 30 alumnos, marcas de asistencia y preflight completo', async () => {
  const root = path.resolve(__dirname, '..');
  const core = new OfflineCore('private-data');
  const user = core.users().find(u => u.username === 'docente1' || u.role === 'DOCENTE');
  assert.ok(user, 'Usuario docente debe existir');

  const doc = core.document(user, {
    groupId: 'G-9978cdc8-9287-484d-8964-d5fe7515c686',
    templateId: 'TMPL-06',
    unit: 'UD2',
    demoFill: true
  });

  assert.equal(doc.demoFill, true, 'Debe activar demoFill');
  assert.equal(doc.demoMode, true, 'Debe activar demoMode');
  assert.equal(doc.students.length, 30, 'Debe generar exactamente 30 estudiantes en modo demo');
  assert.ok(doc.academicDates.length > 0, 'Debe contar con fechas académicas de clase');
  assert.equal(doc.attendance.length, 30 * doc.academicDates.length, 'Debe generar marcas de asistencia para los 30 alumnos en todas las fechas');
  assert.equal(doc.preflight.complete, true, 'El preflight en modo demo debe estar 100% completo');
  assert.equal(doc.preflight.missing.length, 0, 'No deben quedar parámetros pendientes en modo demo');

  // Verificar que los estudiantes estén ordenados A-Z
  for (let i = 0; i < doc.students.length - 1; i++) {
    const a = doc.students[i].student.name;
    const b = doc.students[i + 1].student.name;
    assert.ok(a.localeCompare(b, 'es') <= 0, `Estudiantes deben estar ordenados: ${a} <= ${b}`);
  }

  // Verificar renderizado físico del PDF
  const pdfBytes = await renderPDF(root, doc, user);
  assert.ok(pdfBytes instanceof Uint8Array || Buffer.isBuffer(pdfBytes), 'Debe devolver bytes de PDF válidos');
  assert.ok(pdfBytes.length > 50000, 'El PDF debe tener contenido significativo');
});
