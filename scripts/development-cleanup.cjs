// Limpieza trazable: las revisiones y operaciones anteriores se conservan para sincronizar.
const {hash}=require('./offline-core.cjs');
function plan(core){
 const audit=core.db.prepare('SELECT value FROM audit ORDER BY rowid').all().map(r=>JSON.parse(r.value)),synthetic=new Map(),unresolved=[];
 for(let i=0;i<audit.length;i++){const a=audit[i];if(!['UNIT_ATTENDANCE_SIMULATION','UNIT_ATTENDANCE_CLEAR'].includes(a.action))continue;const n=a.detail.recordsCount??a.detail.clearedCount;
  if(!Number.isInteger(n)||n<0||n>i){unresolved.push(a);continue;}const writes=audit.slice(i-n,i);
  if(writes.some(w=>w.action!=='WRITE'||w.userId!==a.userId||w.detail.entity!=='attendance'||w.detail.after?.groupId!==a.detail.groupId||w.detail.after?.unit!==a.detail.unit)){unresolved.push(a);continue;}
  for(const w of writes)synthetic.set(w.detail.after.rev,w.detail.before||null);
 }
 const corrections=[];for(const r of core.records('attendance')){if(!synthetic.has(r.rev))continue;let previous=r,seen=new Set();while(previous&&synthetic.has(previous.rev)){if(seen.has(previous.rev))throw Error('Historial cíclico: '+r.id);seen.add(previous.rev);previous=synthetic.get(previous.rev);}corrections.push({id:r.id,expectedRev:r.rev,previous});}
 const groups=core.records('groups').filter(g=>g.periodId==='PRUEBA'&&/prueba/i.test(g.name)&&!g.archived),groupIds=new Set(groups.map(g=>g.id));
 const students=core.records('students').filter(s=>!s.developmentData&&/^PRUEBA-ALUMNO-\d+$/.test(s.document)&&core.records('enrollments').filter(e=>e.studentId===s.id).every(e=>groupIds.has(e.groupId)));
 const users=core.users().filter(u=>!u.archived&&['fiuler','fiuler.docente','fiuler.secretaria','docente','gonzalo','prueba.director','prueba','amanda'].includes(u.username));
 return {corrections,groups,students,users,unresolved,fingerprint:hash({corrections,groups,students,users,unresolved})};
}
function apply(core,actor,expected){
 core.requireRole(actor,['DIRECTOR']);if(!core.status().authority)throw Error('La limpieza se realiza en el equipo institucional.');const p=plan(core);if(p.fingerprint!==expected)throw Error('La base cambió. Repita la revisión antes de limpiar.');
 if(!p.corrections.length&&!p.groups.length&&!p.students.length&&!p.users.length)return {changed:false};
 const backup=core.createBackup(actor,'antes-limpiar-desarrollo');return core.transaction(()=>{
  let restored=0,cleared=0;for(const item of p.corrections){const current=core.record('attendance',item.id),value=item.previous?{...item.previous}:{...current,value:null,pending:true,observation:''};core.write(actor,'attendance',{...value,developmentCleanup:{sourceRevision:item.expectedRev,restored:!!item.previous}},current.rev);if(item.previous)restored++;else cleared++;}
  for(const entity of ['grades','attendance'])for(const r of core.records(entity).filter(r=>p.groups.some(g=>g.id===r.groupId)&&r.value!==null))core.write(actor,entity,{...r,value:null,pending:true,observation:'',developmentCleanup:{kind:'DEMO_GROUP'}},r.rev);
  for(const s of p.students){if(!s.archived)core.archiveStudent(actor,{id:s.id,rev:s.rev,date:new Date().toISOString().slice(0,10),reason:'Retiro de alumno ficticio de desarrollo autorizado.'});const current=core.record('students',s.id);core.write(actor,'students',{...current,developmentData:true},current.rev);}
  for(const u of p.users)core.archiveUser(actor,{id:u.id,version:u.version,reason:'Retiro de cuenta de desarrollo autorizado.'});
  for(const g of p.groups)core.write(actor,'groups',{...g,closed:true,archived:true,developmentData:true},g.rev);
  const result={changed:true,backup:backup.filename,restoredAttendance:restored,clearedAttendance:cleared,archivedGroups:p.groups.length,archivedStudents:p.students.length,archivedUsers:p.users.length,unresolvedBatches:p.unresolved.length};
  core.setting('developmentCleanup',{at:new Date().toISOString(),...result});core.audit('DEVELOPMENT_DATA_CLEANUP',actor,result);return result;
 });
}
module.exports={plan,apply};
