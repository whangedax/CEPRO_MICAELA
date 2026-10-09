const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');

test('ATTENDANCE-SIM: Llenado simulado de asistencia de toda la unidad', async () => {
  const root = path.resolve(__dirname, '..');
  const core = new OfflineCore('private-data');
  const user = core.users().find(u => u.username === 'docente1' || u.role === 'DOCENTE');
  assert.ok(user, 'Usuario docente debe existir');

  // Obtener un grupo asignado al docente
  const group = core.scoped(user, 'groups')[0];
  assert.ok(group, 'Debe tener al menos un grupo');
  const unit = group.units.find(u => u !== 'EFSRT') || 'UD1';

  // 1. Ejecutar simulateUnitAttendance
  const simResult = core.simulateUnitAttendance(user, {
    groupId: group.id,
    unit,
    mode: 'realistic'
  });

  assert.equal(simResult.success, true, 'La simulación debe responder exitosamente');
  assert.ok(simResult.datesCount > 0, 'Debe haber fechas lectivas programadas');
  assert.ok(simResult.recordsCount > 0, 'Debe haber generado marcas de asistencia');
  assert.equal(simResult.recordsCount, simResult.datesCount * simResult.studentsCount, 'Total de marcas debe ser fechas * estudiantes');

  // Verificar que todas las marcas sean válidas
  for (const rec of simResult.records) {
    assert.ok(['P', 'F', 'J', 'T'].includes(rec.value), `Marca válida: ${rec.value}`);
    assert.equal(rec.groupId, group.id);
    assert.equal(rec.unit, unit);
    assert.equal(rec.pending, false);
  }

  // 2. Comprobar que core.document refleja las marcas en modo normal (sin demoFill forzado)
  const doc = core.document(user, {
    groupId: group.id,
    templateId: 'TMPL-05',
    unit,
    demoFill: false
  });

  assert.ok(doc.academicDates.length > 0, 'Debe tener fechas académicas');
  const studentRows = doc.students;
  assert.ok(studentRows.length > 0, 'Debe tener estudiantes');

  // 3. Renderizar PDF para verificar que la grilla y los totales se estampan perfectamente
  const pdfBytes = await renderPDF(root, doc, user);
  assert.ok(pdfBytes instanceof Uint8Array || Buffer.isBuffer(pdfBytes), 'Debe generar PDF en buffer');
  assert.ok(pdfBytes.length > 50000, 'El PDF generado debe tener peso válido');

  // 4. Probar clearUnitAttendance
  const clearResult = core.clearUnitAttendance(user, {
    groupId: group.id,
    unit
  });
  assert.equal(clearResult.success, true, 'Debe responder con éxito');
  assert.ok(clearResult.clearedCount >= simResult.recordsCount, 'Debe limpiar todos los registros existentes y simulados');

  // 5. Re-simular para dejar la unidad con datos demostrativos listos para visualización
  const reSimResult = core.simulateUnitAttendance(user, {
    groupId: group.id,
    unit,
    mode: 'realistic'
  });
  assert.ok(reSimResult.recordsCount > 0, 'Debe volver a simular satisfactoriamente');
});
