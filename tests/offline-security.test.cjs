const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { createService } = require('../scripts/offline-http.cjs');
const { restore } = require('../scripts/restore-offline.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');
const artifacts = path.resolve(__dirname, 'offline-artifacts'); fs.mkdirSync(artifacts, { recursive: true });
const makeCore = () => new OfflineCore(fs.mkdtempSync(path.join(artifacts, 'case-')));
const baseline = { stores: {
  estudiantes: [{ id: 'S1', numeroDocumento: '00112233', nombresCompletoOriginal: 'Ana Uno' }, { id: 'S2', numeroDocumento: '00445566', nombresCompletoOriginal: 'Bea Dos' }],
  matriculas: [{ id: 'E1', estudianteId: 'S1', grupoCode: 'G1', programaId: 'P1' }, { id: 'E2', estudianteId: 'S2', grupoCode: 'G2', programaId: 'P1' }],
  programas: [{ id: 'P1', nombre: 'Computación' }], modulos: [{ id: 'M1', programaId: 'P1', nombre: 'Módulo I' }]
} };
function fixture() {
  const hub = makeCore(), teacher = makeCore(), secretary = makeCore();
  hub.setup({ username: 'director', password: 'director-test-123', name: 'Dirección', institutionName: 'CETPRO TEST' });
  const director = hub.users()[0]; hub.importLegacy(director, baseline);
  for (const group of hub.records('groups')) hub.saveGroup(director, { id: group.id, rev: group.rev, periodId: '2026-I', moduleId: 'M1', units: ['UD1', 'UD2'] });
  const t = hub.saveUser(director, { username: 'docente', password: 'docente-test-123', name: 'Docente A', role: 'DOCENTE', assignments: [{ groupId: 'G1', units: ['UD1'] }] });
  const s = hub.saveUser(director, { username: 'secretaria', password: 'secretaria-test-123', name: 'Secretaría', role: 'SECRETARIA' });
  for (const [target, user] of [[teacher, t], [secretary, s]]) { const provision = hub.provision(director, { userId: user.id, request: target.requestDevice() }); target.acceptProvision({ package: provision, fingerprint: provision.fingerprint }); target.importPackage(target.users()[0], hub.packageFor(director, target.status().deviceId), true); }
  return { hub, teacher, secretary, director, t: teacher.users()[0], s: secretary.users()[0], close() { hub.close(); teacher.close(); secretary.close(); } };
}
test('login exige credenciales, rol procede de cuenta y cuentas inactivas no entran', () => {
  const f = fixture(); try {
    assert.throws(() => f.hub.login({ roleId: 'DIRECTOR' }), /incorrectos/);
    assert.throws(() => f.hub.login({ username: 'director', password: 'incorrecta' }), /incorrectos/);
    const login = f.teacher.login({ username: 'docente', password: 'docente-test-123', roleId: 'DIRECTOR' });
    assert.equal(login.user.role, 'DOCENTE'); assert.equal(f.teacher.authenticate(login.token).id, f.t.id);
    assert.equal(JSON.stringify(login).includes('digest'), false);
    f.teacher.logout(login.token); assert.throws(() => f.teacher.authenticate(login.token), /sesión/);
    assert.throws(() => f.hub.saveUser(f.director, { ...f.director, active: false }), /director activo/);
  } finally { f.close(); }
});
test('aislamiento en consultas, escritura, unidades y documentos, también con IDs manipulados', () => {
  const f = fixture(); try {
    const dashboard = f.teacher.dashboard(f.t);
    assert.deepEqual(dashboard.students.map(s => s.id), ['S1']); assert.deepEqual(dashboard.groups.map(g => g.id), ['G1']);
    assert.throws(() => f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G2', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E2', value: 18 }] }), /acceso/);
    assert.throws(() => f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD2', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 18 }] }), /acceso/);
    assert.throws(() => f.teacher.document(f.t, { templateId: 'TMPL-01', groupId: 'G1' }), /función/);
    assert.throws(() => f.teacher.document(f.t, { templateId: 'TMPL-11', groupId: 'G2' }), /acceso/);
    assert.throws(() => f.teacher.document(f.t, { templateId: 'TMPL-12', groupId: 'G1' }), /acceso/);
    assert.throws(() => f.secretary.saveAcademic(f.s, 'grades', { groupId: 'G1', unit: 'UD1' }), /función/);
    assert.throws(() => f.teacher.saveStudent(f.t, { name: 'Otra', document: '1' }), /función/);
    assert.throws(() => f.teacher.saveUser(f.t, { role: 'DIRECTOR' }), /función/);
  } finally { f.close(); }
});
test('tres computadoras: matrícula nueva preserva notas/asistencia, consolida, confirma y no duplica', () => {
  const f = fixture(); try {
    const grade = f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 16, rev: null }] })[0];
    const mark = f.teacher.saveAcademic(f.t, 'attendance', { groupId: 'G1', unit: 'UD1', date: '2026-10-05', session: '1', rows: [{ enrollmentId: 'E1', value: 'P', rev: null }] })[0];
    const s = f.secretary.saveStudent(f.s, { name: 'Luis Nuevo', document: '00000077' });
    const e = f.secretary.enroll(f.s, { studentId: s.id, groupId: 'G1', startDate: '2026-10-05' });
    const incoming = f.secretary.packageFor(f.s);
    f.hub.importPackage(f.director, incoming, true);
    assert.equal(f.hub.importPackage(f.director, incoming, true).duplicatePackage, true);
    const update = f.hub.packageFor(f.director, f.teacher.status().deviceId);
    const preview = f.teacher.importPackage(f.t, update); assert.equal(preview.newRecords, 2);
    f.teacher.importPackage(f.t, update, true);
    assert.equal(f.teacher.record('grades', grade.id).value, 16); assert.equal(f.teacher.record('attendance', mark.id).value, 'P');
    assert.ok(f.teacher.record('enrollments', e.id));
    const academic = f.teacher.packageFor(f.t); f.hub.importPackage(f.director, academic, true);
    assert.equal(f.hub.record('grades', grade.id).value, 16);
    f.teacher.importPackage(f.t, f.hub.packageFor(f.director, f.teacher.status().deviceId), true);
    assert.equal(f.teacher.dashboard(f.t).pending, 0);
    assert.throws(() => f.teacher.saveAcademic(f.t, 'attendance', { groupId: 'G1', unit: 'UD1', date: '2026-10-04', session: '1', rows: [{ enrollmentId: e.id, value: 'F' }] }), /anterior/);
    assert.equal(JSON.stringify(academic).includes('Luis Nuevo'), false);
  } finally { f.close(); }
});
test('validación y transacciones: nota cero válida, batch inválido y revisión antigua no cambian datos', () => {
  const f = fixture(); try {
    const grade = f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 0 }] })[0];
    assert.equal(grade.value, 0);
    assert.throws(() => f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 10, rev: grade.rev }, { enrollmentId: 'E2', value: 100 }] }));
    assert.equal(f.teacher.record('grades', grade.id).value, 0);
    f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 12, rev: grade.rev }] });
    assert.throws(() => f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 15, rev: grade.rev }] }), /otra ventana/);
    assert.equal(f.teacher.record('grades', grade.id).value, 12);
  } finally { f.close(); }
});
test('paquetes antiguos, corruptos, otro equipo/institución y docente desactivado se rechazan', () => {
  const f = fixture(); try {
    const first = f.hub.packageFor(f.director, f.teacher.status().deviceId);
    f.teacher.importPackage(f.t, first, true);
    const altered = structuredClone(first); altered.body.at = 'forged'; assert.throws(() => f.teacher.importPackage(f.t, altered, true), /Firma/);
    assert.throws(() => f.secretary.importPackage(f.s, first, true), /institución, equipo/);
    const other = makeCore(); try { other.setup({ username: 'otro', name: 'Otro', password: 'otra-clave-123' }); assert.throws(() => other.importPackage(other.users()[0], first, true), /institución/); } finally { other.close(); }
    f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 18 }] });
    const pkg = f.teacher.packageFor(f.t);
    f.hub.saveUser(f.director, { ...f.hub.user(f.t.id), active: false });
    assert.throws(() => f.hub.importPackage(f.director, pkg, true), /no autorizados/);
    f.teacher.importPackage(f.t, f.hub.packageFor(f.director, f.teacher.status().deviceId), true);
    assert.equal(f.teacher.user(f.t.id).active, false);
  } finally { f.close(); }
});
test('dos equipos docentes editan la misma nota: conflicto conserva ambos y resolución converge', () => {
  const f = fixture(), second = makeCore(); try {
    const provision = f.hub.provision(f.director, { userId: f.t.id, request: second.requestDevice() }); second.acceptProvision({ package: provision, fingerprint: provision.fingerprint }); second.importPackage(second.users()[0], f.hub.packageFor(f.director, second.status().deviceId), true);
    const input = { groupId: 'G1', unit: 'UD1', indicator: 'IL1' };
    const a = f.teacher.saveAcademic(f.t, 'grades', { ...input, rows: [{ enrollmentId: 'E1', value: 16 }] })[0];
    const b = second.saveAcademic(second.users()[0], 'grades', { ...input, rows: [{ enrollmentId: 'E1', value: 19 }] })[0];
    f.hub.importPackage(f.director, f.teacher.packageFor(f.t), true);
    const conflict = f.hub.importPackage(f.director, second.packageFor(second.users()[0]), true);
    assert.equal(conflict.conflicts, 1); assert.equal(f.hub.record('grades', a.id).value, 16);
    const c = f.hub.dashboard(f.director).conflicts[0]; assert.equal(c.operation.body.value.value, 19);
    f.hub.resolve(f.director, { id: c.id, currentRev: c.current.rev, action: 'KEEP_LOCAL', reason: 'Docente confirmó la primera nota' });
    second.importPackage(second.users()[0], f.hub.packageFor(f.director, second.status().deviceId), true);
    assert.equal(second.record('grades', b.id).value, 16);
  } finally { second.close(); f.close(); }
});
test('cierre impide editar; reapertura requiere dirección y motivo', () => {
  const f = fixture(); try {
    const group = f.hub.record('groups', 'G1');
    assert.throws(() => f.hub.closure(f.director, { groupId: 'G1', closed: true, rev: group.rev, reason: '' }));
    f.hub.closure(f.director, { groupId: 'G1', closed: true, rev: group.rev, reason: 'Fin de módulo' });
    f.teacher.importPackage(f.t, f.hub.packageFor(f.director, f.teacher.status().deviceId), true);
    assert.throws(() => f.teacher.saveAcademic(f.t, 'grades', { groupId: 'G1', unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: 'E1', value: 20 }] }), /cerrado/);
  } finally { f.close(); }
});
test('migración conserva originales y no pisa datos existentes; copia recuperable con checksum', () => {
  const f = fixture(); try {
    const s = f.hub.record('students', 'S1'); f.hub.saveStudent(f.director, { ...s, name: 'Ana Actualizada' });
    const result = f.hub.importLegacy(f.director, baseline);
    assert.equal(result.imported, 0); assert.equal(f.hub.record('students', 'S1').name, 'Ana Actualizada');
    const copy = f.hub.createBackup(f.director); const b = JSON.parse(fs.readFileSync(path.join(f.hub.directory, 'backups', copy.filename), 'utf8'));
    assert.equal(b.checksum.length, 64); assert.ok(b.backup.settings.some(s => s.key === 'device')); assert.ok(b.backup.users.length);
  } finally { f.close(); }
});
test('HTTP verifica sesión, rol, origen, métodos y no publica base/respaldos privados', async () => {
  const service = createService({ root: path.resolve(__dirname, '..'), directory: fs.mkdtempSync(path.join(artifacts, 'http-')) });
  const server = service.server(); await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/dashboard`)).status, 401);
    assert.equal((await fetch(`${base}/api/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.invalid' }, body: '{}' })).status, 403);
    assert.equal((await fetch(`${base}/private-data/cetpro.sqlite`)).status, 404);
    assert.equal((await fetch(`${base}/_candidate/real-backup`)).status, 404);
    assert.equal((await fetch(`${base}/scripts/offline-core.cjs`)).status, 404);
    assert.equal((await fetch(`${base}/app/operational/..%2f..%2fscripts%2foffline-core.cjs`)).status, 403);
    assert.equal((await fetch(`${base}/app/operational/..%2f..%2fprivate-data%2fcetpro.sqlite`)).status, 403);
    assert.equal((await fetch(`${base}/`)).status, 200);
  } finally { await new Promise(r => server.close(r)); service.core.close(); }
});
test('notas de ambas fuentes históricas se migran, sobreviven reinicio y se recuperan desde copia', () => {
  const f = fixture(); let reopened; try {
    const legacy = structuredClone(baseline);
    legacy.stores.evaluacion = [{ id:'OLD1', matriculaId:'E1', unidadId:'UD1', indicadorId:'IL1', nota:17 }];
    legacy.stores.asistencia = [{ id:'OLD2', matriculaId:'E1', unidadId:'UD1', fecha:'2026-10-05', sesionId:'1', estado:'PRESENTE' }];
    legacy.etapa2 = { CETPRO_ETAPA2_EVAL_GAC_V1_G1_UD1: {} };
    legacy.etapa2['CETPRO_ETAPA2_EVAL_GAC-V1-G1_UD1'] = { evaluationsByEnrollment: { E1: { evaluations:[{score:17}], finalLogro:17 } } };
    legacy.etapa2['CETPRO_ETAPA2_ATT_GAC-V1-G1_UD1'] = { sessions:[{sessionId:2,fecha:'2026-10-06'}], marksByEnrollment:{E1:{marks:[{sessionId:2,state:'J'}]}} };
    const result = f.hub.importLegacy(f.director, legacy);
    assert.ok(result.imported >= 3); assert.ok(f.hub.records('grades').some(g => g.value === 17)); assert.ok(f.hub.records('attendance').some(a => a.value === 'J'));
    const pkg = f.hub.packageFor(f.director, f.teacher.status().deviceId); f.teacher.importPackage(f.t,pkg,true);
    assert.ok(f.teacher.records('grades').some(g => g.value === 17));
    const copy = f.hub.createBackup(f.director), backup = fs.readFileSync(path.join(f.hub.directory,'backups',copy.filename),'utf8');
    const prior = f.hub.records('students').length; f.hub.saveStudent(f.director,{name:'Posterior',document:'44556600'}); assert.equal(f.hub.records('students').length,prior+1);
    restore(f.hub,backup); assert.equal(f.hub.records('students').length,prior);
    const corrupted = JSON.parse(backup); corrupted.backup.records[0].value='corrupt'; assert.throws(()=>restore(f.hub,corrupted),/checksum/);
    reopened = new OfflineCore(f.hub.directory); assert.ok(reopened.records('grades').some(g=>g.value===17));
  } finally { reopened?.close(); f.close(); }
});
test('retirar o trasladar matrícula conserva historial y una nota borrada queda pendiente con auditoría', () => {
  const f = fixture(); try {
    const g = f.teacher.saveAcademic(f.t,'grades',{groupId:'G1',unit:'UD1',indicator:'IL1',rows:[{enrollmentId:'E1',value:14}]})[0];
    const cleared = f.teacher.saveAcademic(f.t,'grades',{groupId:'G1',unit:'UD1',indicator:'IL1',rows:[{enrollmentId:'E1',value:null,clear:true,rev:g.rev}]})[0]; assert.equal(cleared.pending,true); assert.equal(cleared.value,null);
    const enrollment = f.hub.record('enrollments','E1'); f.hub.retireEnrollment(f.director,{id:enrollment.id,rev:enrollment.rev,date:'2026-10-05',reason:'Cambio de turno',targetGroupId:'G2'});
    assert.equal(f.hub.record('enrollments','E1').active,false); assert.ok(f.hub.records('enrollments').some(e=>e.groupId==='G2'&&e.studentId==='S1'&&e.active));
    assert.equal(f.teacher.record('grades',g.id).pending,true);
    assert.throws(()=>f.hub.enroll(f.director,{studentId:'S2',groupId:'G1',startDate:'2026-99-99'}),/Fecha/);
  } finally { f.close(); }
});
test('renovación permite recuperar contraseña, rechaza replay y respeta unidades reasignadas', () => {
  const f = fixture(); try {
    const changed = f.hub.saveUser(f.director,{...f.hub.user(f.t.id),password:'clave-recuperada-123',assignments:[{groupId:'G1',units:['UD2']}]});
    const provision=f.hub.provision(f.director,{userId:changed.id,request:f.teacher.requestDevice()});
    f.teacher.acceptProvision({package:provision,fingerprint:provision.fingerprint});
    assert.throws(()=>f.teacher.acceptProvision({package:provision,fingerprint:provision.fingerprint}),/ya fue aplicada/);
    assert.equal(f.teacher.login({username:'docente',password:'clave-recuperada-123'}).user.assignments[0].units[0],'UD2');
    assert.throws(()=>f.teacher.login({username:'docente',password:'docente-test-123'}),/incorrectos/);
  } finally { f.close(); }
});
test('avances fuera de orden quedan pendientes; al reenviar su base se aplican sin perder datos', () => {
  const f = fixture(); try {
    const base = {groupId:'G1',unit:'UD1',indicator:'IL1'};
    const first = f.teacher.saveAcademic(f.t,'grades',{...base,rows:[{enrollmentId:'E1',value:12}]})[0];
    const early = f.teacher.packageFor(f.t);
    f.teacher.saveAcademic(f.t,'grades',{...base,rows:[{enrollmentId:'E1',value:15,rev:first.rev}]});
    const later = f.teacher.packageFor(f.t), firstId = f.teacher.operations().find(op=>op.body.entity==='grades'&&op.body.value.rev===first.rev).body.id;
    // Recibir un paquete posterior completo ya incluye el historial causal; no depende de su fecha.
    f.hub.importPackage(f.director,later,true); assert.equal(f.hub.record('grades',first.id).value,15);
    f.hub.importPackage(f.director,early,true); assert.equal(f.hub.record('grades',first.id).value,15); assert.ok(f.hub.operations().some(op=>op.body.id===firstId));
  } finally { f.close(); }
});
test('los 21 formatos PDF generan contenido autorizado sin marcas de agua', async () => {
  const f=fixture(); try {
    const group=f.hub.record('groups','G1'); f.hub.saveGroup(f.director,{...group,units:['UD1','UD2','UD3','UD4','UD5','UD6','UD7']});
    const { PDFDocument }=require('pdf-lib');
    for(let n=1;n<=21;n++) {
      const templateId=`TMPL-${String(n).padStart(2,'0')}`;
      const doc=f.hub.document(f.director,{templateId,groupId:'G1',...([2,20,21].includes(n)?{enrollmentId:'E1'}:{})});
      const bytes=await renderPDF(path.resolve(__dirname,'..'),doc,f.director), pdf=await PDFDocument.load(bytes);
      assert.ok(pdf.getPageCount()>=1,templateId); fs.writeFileSync(path.join(artifacts,`${templateId}.pdf`),bytes);
      const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'), extracted=await pdfjs.getDocument({data:new Uint8Array(bytes),disableFontFace:true,useSystemFonts:true}).promise;
      for(let pageNumber=1;pageNumber<=extracted.numPages;pageNumber++) { const text=(await (await extracted.getPage(pageNumber)).getTextContent()).items.map(i=>i.str).join(' '); assert.doesNotMatch(text,/BORRADOR - NO OFICIAL/,`${templateId} página ${pageNumber}`); }
      await extracted.destroy?.();
    }
  } finally { f.close(); }
});
test('dirección registra usuarios y restablecer contraseña elimina el bloqueo anterior sin cambiar asignaciones',()=>{const f=fixture();try{const user=f.hub.user(f.t.id);for(let i=0;i<5;i++)assert.throws(()=>f.hub.login({username:user.username,password:'incorrecta'},'same-client'),/incorrectos/);assert.throws(()=>f.hub.login({username:user.username,password:'docente-test-123'},'same-client'),/Demasiados intentos/);const updated=f.hub.saveUser(f.director,{...user,password:'clave-restablecida-123'});const login=f.hub.login({username:user.username,password:'clave-restablecida-123'},'same-client');assert.equal(login.user.id,user.id);assert.deepEqual(login.user.assignments,user.assignments);assert.equal(updated.role,'DOCENTE');assert.throws(()=>f.hub.saveUser(f.s,{username:'intruso',name:'Otra cuenta',role:'DIRECTOR',password:'clave-no-autorizada'}),/solo registra/);}finally{f.close();}});
