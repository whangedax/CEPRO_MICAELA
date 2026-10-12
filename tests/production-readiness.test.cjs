const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createPdfFixture}=require('./helpers/pdf-fixture.cjs'),{inspectReadiness}=require('../scripts/production-readiness.cjs');
test('salida a producción inspecciona sin escribir y detecta simulaciones, docentes pendientes y matrículas provisionales',()=>{
 const dir=path.join(__dirname,'offline-artifacts/production-readiness');fs.mkdirSync(dir,{recursive:true});const f=createPdfFixture(dir);
 try{
  const en=f.c.record('enrollments',f.enrollment.id);f.c.putRecord('enrollments',{...en,provisional:true});
  f.c.saveUser(f.director,{username:'pendiente',name:'Docente pendiente',password:'Password2026!',role:'DOCENTE',assignmentPending:true,assignments:[]});
  f.c.audit('UNIT_ATTENDANCE_SIMULATION',f.docente,{groupId:f.group.id,unit:'UD1'});
  const before=JSON.stringify([f.c.operations(),f.c.records('attendance'),f.c.db.prepare('SELECT * FROM audit').all(),f.c.db.prepare('SELECT * FROM settings').all()]);
  const r=inspectReadiness(path.join(f.c.directory,'cetpro.sqlite'));
  assert.equal(r.health.healthy,true);assert.equal(r.readyForProduction,false);assert.equal(r.affectedAttendance.length,1);assert.equal(r.provisionalEnrollments,1);assert.equal(r.pendingTeachers.length,1);assert.ok(r.blockers.includes('CONTRASTAR_ASISTENCIAS_HISTORICAS'));assert.equal(r.documents.errors.length,0);
  assert.equal(JSON.stringify([f.c.operations(),f.c.records('attendance'),f.c.db.prepare('SELECT * FROM audit').all(),f.c.db.prepare('SELECT * FROM settings').all()]),before);
 }finally{f.c.close();}
});
