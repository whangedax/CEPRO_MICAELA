// Corregir pertenencia a un módulo conserva el registro y todo su historial.
function correctModule(core,actor,input){
 core.requireRole(actor,['DIRECTOR','SECRETARIA']);const e=core.record('enrollments',input.id),g=e&&core.record('groups',e.groupId);
 const fail=(text,status=400)=>{throw Object.assign(new Error(text),{status});};
 if(!e||!g?.moduleId||!g.periodId)fail('Seleccione una matrícula con módulo y periodo configurados.');
 if(!['CONFIRM','EXCLUDE','RESTORE'].includes(input.action)||!String(input.reason||'').trim())fail('Acción y motivo obligatorios.');
 const student=core.record('students',e.studentId);if(input.action!=='EXCLUDE'&&(!student?.active||student.archived))fail('Restaure primero al estudiante.');
 if(input.action==='CONFIRM'&&!e.active)fail('Restaure primero la matrícula del módulo.');
 if(input.action==='EXCLUDE'&&!e.active)fail('La matrícula ya está retirada de este módulo.');
 if(input.action==='RESTORE'){if(e.active||e.moduleState!=='EXCLUDED')fail('Esta matrícula no está excluida de un módulo.');if(g.closed)fail('Dirección debe reabrir el aula.');if(core.records('enrollments').some(r=>r.id!==e.id&&r.studentId===e.studentId&&r.groupId===e.groupId&&r.active))fail('Ya existe una matrícula activa del estudiante en este módulo.',409);}
 return core.transaction(()=>core.write(actor,'enrollments',{...e,active:input.action!=='EXCLUDE',provisional:input.action==='CONFIRM'?false:e.provisional===true,moduleState:input.action==='EXCLUDE'?'EXCLUDED':input.action==='CONFIRM'?'CONFIRMED':e.provisional?'PROVISIONAL':'CONFIRMED',moduleCorrection:{action:input.action,reason:String(input.reason).trim(),at:new Date().toISOString(),by:actor.id}},input.rev));
}
module.exports={correctModule};
