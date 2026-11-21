const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { DataUpdateService } = require('../scripts/data-update-service.cjs');

function fixture(t) {
  const root = path.resolve(__dirname, '..');
  const parent = path.join(root, 'dev-sandbox/data/table-transfer');
  fs.mkdirSync(parent, { recursive: true });
  const core = new OfflineCore(fs.mkdtempSync(path.join(parent, 'case-')), null);
  core.setup({ username: 'director.qa', password: 'DirectorQA123!', name: 'Dirección QA', importBaseline: false });
  const director = core.users()[0];
  const group = core.saveGroup(director, { name: 'Aula QA A', programId: 'PROG-005', moduleId: 'MOD-009', periodId: '2026-I', units: ['UD1', 'UD2'] });
  const otherGroup = core.saveGroup(director, { name: 'Aula QA B', programId: group.programId, moduleId: group.moduleId, periodId: group.periodId, units: ['UD1'] });
  const teacher = core.saveUser(director, { username: 'docente.qa', name: 'Docente QA', description: 'Descripción conservada', role: 'DOCENTE', password: 'DocenteQA123!', assignments: [{ groupId: group.id, units: ['UD1', 'UD2'] }] });
  const secretary = core.saveUser(director, { username: 'secretaria.qa', name: 'Secretaría QA', role: 'SECRETARIA', password: 'SecretariaQA123!' });
  const student = core.saveStudent(director, { document: '00112233', name: 'Estudiante QA', documentType: 'DNI' });
  const enrollment = core.enroll(director, { studentId: student.id, groupId: group.id, startDate: '2026-03-01' });
  const other = core.saveStudent(director, { document: '00445566', name: 'Registro que se conserva', documentType: 'DNI' });
  core.enroll(director, { studentId: other.id, groupId: otherGroup.id, startDate: '2026-03-01' });
  core.saveAcademic(core.user(teacher.id), 'grades', { groupId: group.id, unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: enrollment.id, value: 0 }] });
  core.saveAcademic(core.user(teacher.id), 'attendance', { groupId: group.id, unit: 'UD1', date: '2026-03-02', session: '1', rows: [{ enrollmentId: enrollment.id, value: 'P' }] });
  t.after(() => core.close());
  return { core, service: new DataUpdateService(core, root), director, teacher: core.user(teacher.id), secretary: core.user(secretary.id), group, otherGroup, student, enrollment, other };
}

test('catálogo de tres perfiles explica permisos sin conceder edición administrativa de notas', t => {
  const f = fixture(t);
  for (const actor of [f.director, f.secretary, f.teacher]) {
    const catalog = f.service.catalog(actor);
    assert.equal(catalog.role, actor.role);
    assert.match(catalog.mergePolicy, /conservan/);
    assert(catalog.kinds.every(kind => typeof kind.importPolicy === 'string'));
    const grades = catalog.kinds.find(kind => kind.kind === 'notas');
    assert.equal(grades.canImport, actor.role === 'DOCENTE');
  }
  assert.throws(() => f.service.preview(f.secretary, { kind: 'notas', format: 'json', content: [] }), /función/);
});

test('tablas incorrectas y acciones de borrado se rechazan sin modificar registros', t => {
  const f = fixture(t);
  const before = JSON.stringify(f.core.records('students'));
  assert.throws(() => f.service.export(f.director, 'estudiantes', 'exe'), /Formato/);
  assert.throws(() => f.service.preview(f.director, { kind: 'estudiantes', format: 'json', content: { app: 'CETPRO_TABLE', kind: 'docentes', version: 1, rows: [] } }), /otra sección/);
  assert.throws(() => f.service.preview(f.director, { kind: 'estudiantes', format: 'json', content: { app: 'CETPRO_OFFLINE', rows: [] } }), /Sincronización/);
  assert.throws(() => f.service.preview(f.director, { kind: 'estudiantes', format: 'json', content: '{' }), /JSON/);
  const row = f.service.rows(f.director, 'estudiantes', { groupId: f.group.id })[0];
  const preview = f.service.preview(f.director, { kind: 'estudiantes', format: 'json', content: [{ ...row, accion: 'ELIMINAR' }] });
  assert.equal(preview.canApply, false);
  assert.match(preview.errors[0].message, /no eliminan/);
  assert.throws(() => f.service.apply(f.director, preview.token), /errores/);
  assert.equal(JSON.stringify(f.core.records('students')), before);
});

test('CSV, XLSX y JSON reimportados conservan cero, asistencias y alcance docente', t => {
  const f = fixture(t);
  const before = JSON.stringify([f.core.records('grades'), f.core.records('attendance')]);
  for (const kind of ['notas', 'asistencias']) {
    for (const format of ['csv', 'xlsx', 'json']) {
      const file = f.service.export(f.teacher, kind, format, { groupId: f.group.id, unit: 'UD1' });
      const preview = f.service.preview(f.teacher, { kind, format, content: file.bytes.toString(format === 'xlsx' ? 'base64' : 'utf8') });
      assert.deepEqual(preview.errors, [], `${kind}/${format}`);
      assert.equal(preview.canApply, false);
      assert.equal(preview.ignored, 1);
    }
  }
  assert.equal(JSON.stringify([f.core.records('grades'), f.core.records('attendance')]), before);
  const rows = f.service.rows(f.teacher, 'estudiantes');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].dni, '00112233');
  assert.throws(() => f.service.export(f.teacher, 'estudiantes', 'json', { groupId: f.otherGroup.id }), error => error.status === 403);
});

test('actualización de un alumno conserva los otros registros y detecta revisiones posteriores', t => {
  const f = fixture(t);
  const row = f.service.rows(f.director, 'estudiantes', { groupId: f.group.id })[0];
  const untouched = JSON.stringify([f.core.record('students', f.other.id), f.core.records('grades'), f.core.records('attendance')]);
  let preview = f.service.preview(f.secretary, { kind: 'estudiantes', format: 'json', content: [{ ...row, nombre_completo: 'Nombre actualizado QA' }] });
  assert.equal(preview.canApply, true);
  const result = f.service.apply(f.secretary, preview.token);
  assert.equal(result.applied, 1);
  assert.equal(JSON.stringify([f.core.record('students', f.other.id), f.core.records('grades'), f.core.records('attendance')]), untouched);
  preview = f.service.preview(f.secretary, { kind: 'estudiantes', format: 'json', content: [{ ...row, nombre_completo: 'Archivo antiguo' }] });
  assert.equal(preview.canApply, false);
  assert.match(preview.errors[0].message, /antigua/);
});

test('directorio docente idéntico es idempotente y una columna vacía no borra descripción', t => {
  const f = fixture(t);
  let row = f.service.rows(f.director, 'docentes')[0];
  const version = f.core.user(f.teacher.id).version;
  let preview = f.service.preview(f.director, { kind: 'docentes', format: 'json', content: [{ ...row, descripcion: '', revision_usuario: 0 }] });
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.ignored, 1);
  assert.equal(preview.canApply, false);
  assert.equal(f.core.user(f.teacher.id).version, version);
  preview = f.service.preview(f.director, { kind: 'docentes', format: 'json', content: [{ ...row, nombre_profesor: 'Docente QA actualizado' }] });
  assert.equal(preview.canApply, true);
  f.service.apply(f.director, preview.token);
  preview = f.service.preview(f.director, { kind: 'docentes', format: 'json', content: [{ ...row, nombre_profesor: 'Docente QA actualizado' }] });
  assert.equal(preview.canApply, false);
  assert.equal(preview.ignored, 1);
  assert.equal(f.core.user(f.teacher.id).description, 'Descripción conservada');
});

test('contrato de carga admite content y aliases históricos text/data sin mezclar archivos', t => {
  const f = fixture(t);
  for (const format of ['csv', 'json', 'xlsx']) {
    const file = f.service.export(f.teacher, 'notas', format);
    const content = file.bytes.toString(format === 'xlsx' ? 'base64' : 'utf8');
    const alias = format === 'xlsx' ? 'data' : 'text';
    const preview = f.service.preview(f.teacher, { kind: 'notas', format, [alias]: content });
    assert.deepEqual(preview.errors, [], format);
    assert.equal(preview.ignored, 1);
    assert.equal(preview.canApply, false);
    assert.throws(() => f.service.preview(f.teacher, { kind: 'notas', format, content, [alias]: content + 'otro archivo' }), /contenidos distintos/);
  }
});

test('el filtro explícito de aula y unidad también se respeta al revisar una tabla', t => {
  const f = fixture(t);
  const rows = f.service.rows(f.teacher, 'notas');
  let preview = f.service.preview(f.teacher, { kind: 'notas', format: 'json', content: rows, options: { groupId: f.otherGroup.id } });
  assert.equal(preview.canApply, false);
  assert.match(preview.errors[0].message, /aula seleccionada/);
  preview = f.service.preview(f.teacher, { kind: 'notas', format: 'json', content: rows, options: { groupId: f.group.id, unit: 'UD2' } });
  assert.equal(preview.canApply, false);
  assert.match(preview.errors[0].message, /unidad seleccionada/);
});

test('el archivo de una unidad con asistencia se sincroniza sin perder el avance del docente', t => {
  const f = fixture(t);
  const { removeCurriculumUnit } = require('../scripts/curriculum-units.cjs');
  const { exportTransfer, SyncTransferService } = require('../scripts/sync-transfer.cjs');
  const remote = new OfflineCore(fs.mkdtempSync(path.join(path.dirname(f.core.directory), 'remote-')), null);
  t.after(() => remote.close());
  f.core.saveAcademic(f.teacher, 'attendance', { groupId: f.group.id, unit: 'UD2', date: '2026-03-03', session: '1', rows: [{ enrollmentId: f.enrollment.id, value: 'P' }] });
  const provision = f.core.provision(f.director, { userId: f.teacher.id, request: remote.requestDevice() });
  remote.acceptProvision({ package: provision, fingerprint: provision.fingerprint });
  const actor = remote.user(f.teacher.id);
  remote.importPackage(actor, f.core.packageFor(f.director, remote.status().deviceId), true);
  const before = JSON.stringify([remote.records('grades'), remote.records('attendance')]);
  const archived = removeCurriculumUnit(f.core, f.director, { groupId: f.group.id, unitCode: 'UD2' });
  assert.equal(archived.action, 'ARCHIVED');
  assert.equal(archived.preservedAttendanceCount, 1);
  const exported = exportTransfer(f.core, f.director, { syncModule: 'config', recipientUserId: f.teacher.id, passphrase: 'TransferenciaQA123!' });
  const service = new SyncTransferService(remote);
  const preview = service.preview(actor, { package: exported.package, passphrase: 'TransferenciaQA123!' });
  service.import(actor, { previewToken: preview.previewToken });
  assert(remote.record('groups', f.group.id).archivedUnits.includes('UD2'));
  assert.equal(JSON.stringify([remote.records('grades'), remote.records('attendance')]), before);
});
