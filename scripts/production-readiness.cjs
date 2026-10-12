// Inspección de solo lectura: no inicializa, migra ni corrige la base institucional.
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const {OfflineCore}=require('./offline-core.cjs'),{inspectDatabase}=require('./database-health.cjs');
function inspectReadiness(filename){
 const db=new DatabaseSync(filename,{readOnly:true}),core=Object.create(OfflineCore.prototype);core.db=db;
 core.setting=function(key){const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(row.value):null;};
 try{
  const health=inspectDatabase(core),users=core.users(),groups=core.records('groups'),settings=core.records('documentSettings');
  const cleanup=require('./development-cleanup.cjs').plan(core);
  const events=db.prepare('SELECT value FROM audit').all().map(r=>JSON.parse(r.value)).filter(r=>['UNIT_ATTENDANCE_SIMULATION','UNIT_ATTENDANCE_CLEAR'].includes(r.action));
  const affected=[...new Set(events.map(r=>r.detail?.groupId+'|'+r.detail?.unit))].map(key=>{const [groupId,unit]=key.split('|');return {groupId,group:groups.find(g=>g.id===groupId)?.name||groupId,unit,events:events.filter(r=>r.detail?.groupId===groupId&&r.detail?.unit===unit).map(({action,at})=>({action,at})),currentRecords:core.records('attendance').filter(r=>r.groupId===groupId&&r.unit===unit).length};});
  const plans=settings.filter(r=>r.scope?.kind==='curriculum').map(r=>({moduleId:r.scope.target,period:r.fields.periodId,units:JSON.parse(r.fields.unitsJson||'[]').filter(u=>u.confirmed===false).map(u=>({code:u.code,name:u.name}))})).filter(r=>r.units.length);
  const director=users.find(u=>u.active&&!u.archived&&u.role==='DIRECTOR'),documents={checked:0,complete:0,pending:[],errors:[]};
  if(director)for(const g of groups.filter(g=>!g.archived&&g.moduleId&&g.units?.length))for(let n=1;n<=21;n++){
   const templateId='TMPL-'+String(n).padStart(2,'0'),en=core.records('enrollments').find(e=>e.groupId===g.id&&e.active);
   if([2,20,21].includes(n)&&!en)continue;
   const units=g.units.filter(u=>u!=='EFSRT');if(n>=5&&n<=10&&n-5>=units.length||n>=11&&n<=17&&n-11>=units.length)continue;
   try{const doc=core.document(director,{templateId,groupId:g.id,...([2,20,21].includes(n)?{enrollmentId:en.id}:{})});documents.checked++;if(doc.preflight.complete)documents.complete++;else documents.pending.push({groupId:g.id,templateId,fields:doc.preflight.missing});}
   catch(e){documents.errors.push({groupId:g.id,templateId,error:e.message});}
  }
  const pendingTeachers=users.filter(u=>u.active&&!u.archived&&u.role==='DOCENTE'&&!u.assignments?.length).map(u=>({id:u.id,username:u.username,name:u.name}));
  const testAccounts=users.filter(u=>u.active&&!u.archived&&(/fiuler|prueba|demo/i.test(u.username+' '+u.name))).map(u=>({id:u.id,username:u.username,role:u.role}));
  const provisionalEnrollments=core.records('enrollments').filter(e=>e.active&&e.provisional).length;
  const blockers=[];
  if(!health.healthy)blockers.push('INTEGRIDAD_BASE');if(!director)blockers.push('SIN_DIRECTOR');
  if(core.setting('documentDemo')===true)blockers.push('BASE_DEMOSTRACION');
  if(cleanup.corrections.length||cleanup.unresolved.length)blockers.push('CONTRASTAR_ASISTENCIAS_HISTORICAS');
  if(plans.length)blockers.push('CONFIRMAR_PLANES');if(provisionalEnrollments)blockers.push('CONFIRMAR_MATRICULAS');
  if(documents.pending.length||documents.errors.length)blockers.push('COMPLETAR_DOCUMENTOS');
  if(pendingTeachers.length)blockers.push('ASIGNAR_DOCENTES');if(testAccounts.length)blockers.push('REVISAR_CUENTAS_PRUEBA');
  return {at:new Date().toISOString(),readyForProduction:!blockers.length,blockers,health,developmentCleanup:core.setting('developmentCleanup'),remainingSyntheticAttendance:cleanup.corrections.length,unresolvedSimulationBatches:cleanup.unresolved.length,affectedAttendance:affected,unconfirmedPlans:plans,provisionalEnrollments,pendingTeachers,testAccounts,documents};
 }finally{db.close();}
}
if(require.main===module){
 try{const file=path.resolve(process.env.CETPRO_DATA_DIR||path.join(__dirname,'../private-data'),'cetpro.sqlite'),report=inspectReadiness(file);
  const out=path.resolve(process.argv[2]||path.join(__dirname,'../private-data/production-readiness.json'));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
  console.log(JSON.stringify({readyForProduction:report.readyForProduction,blockers:report.blockers,counts:report.health.counts,affectedUnits:report.affectedAttendance.length,pendingTeachers:report.pendingTeachers.length,provisionalEnrollments:report.provisionalEnrollments,documents:{checked:report.documents.checked,complete:report.documents.complete,pending:report.documents.pending.length,errors:report.documents.errors.length},report:out}));
  if(!report.readyForProduction)process.exitCode=2;
 }catch(e){console.error('Inspección cancelada: '+e.message);process.exitCode=1;}
}
module.exports={inspectReadiness};
