// Distribución provisional autorizada: conserva las matrículas y utiliza los turnos existentes.
const D=require('./offline-documents.cjs');
const PLAN=[['magda.chura','PROG-005',['GRP-BD-007','GRP-BD-008']],['teofilo.larico','PROG-006',['GRP-BD-010']],['rene.chura','PROG-006',['GRP-BD-011']],['liz.flores','PROG-006',['GRP-BD-009']]];
function apply(core,actor){
 core.requireRole(actor,['DIRECTOR']);if(!core.status().authority)throw Error('Realice la asignación en el equipo institucional.');
 const tasks=PLAN.map(([username,programId,ids])=>{const user=core.users().find(u=>u.username===username);if(!user||!user.active||user.role!=='DOCENTE')throw Error('Cuenta docente no disponible: '+username);if(user.assignments.length)return null;
  const groups=ids.flatMap(id=>[id,id+'-M2']).map(id=>core.record('groups',id));if(groups.some(g=>!g||g.programId!==programId||!g.units?.length))throw Error('Revise las aulas de '+username+' antes de asignar.');return {user,groups};}).filter(Boolean);
 if(!tasks.length)return [];
 core.createBackup(actor,'antes-asignar-docentes-pendientes');return core.transaction(()=>tasks.map(({user,groups})=>{
  const saved=core.saveUser(actor,{...user,assignmentPending:false,description:core.record('programs',groups[0].programId).nombre+' · Asignación provisional de aulas; Dirección puede corregir grupos, módulos y unidades.',assignments:groups.map(g=>({groupId:g.id,units:g.units}))});
  for(const g of groups){const scope={kind:'group',target:g.id},old=core.record('documentSettings',D.idFor(scope));D.saveSettings(core,actor,{scope,rev:old?.rev||null,fields:{teacherName:user.name}});core.write(actor,'groups',{...g,teacherAssignmentPending:false},g.rev);}
  core.audit('PROVISIONAL_TEACHER_ASSIGNMENT',actor,{userId:user.id,groups:groups.map(g=>g.id),reason:'Asignación provisional autorizada; Computación para Magda y grupos de Corte por turno del directorio: Teófilo noche, René tarde, Liz mañana. Editable desde Usuarios y asignaciones.'});
  return {username:saved.username,groups:groups.map(g=>g.id)};
 }));
}
module.exports={apply,PLAN};
