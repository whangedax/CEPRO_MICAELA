// Transport-independent module classification. Unknown modules fail closed.
const SYNC_MODULES={ALL:'all',CONFIG:'config',ENROLLMENTS:'enrollments',GRADES:'grades',ATTENDANCE:'attendance'};
const MODULE_LABELS={all:'Lote completo',config:'Configuración académica e institucional',enrollments:'Estudiantes y matrículas',grades:'Calificaciones y planificación',attendance:'Control de asistencias'};
const CONFIG_SCOPES=new Set(['institution','program','module','group','curriculum','moduleDefaults','academicYear','academicPeriod','unitCurriculum']);
function validateSyncModule(value='all'){if(!Object.values(SYNC_MODULES).includes(value)){const e=new Error('Módulo de sincronización desconocido.');e.status=400;throw e;}return value;}
function matchesSyncModule(entity,detail,module='all'){
 validateSyncModule(module);const scope=detail?.scope?.kind||detail?.scopeKind;
 if(module==='all')return true;
 if(module==='config')return ['programs','modules','groups','academic_years','periods'].includes(entity)||(entity==='documentSettings'&&CONFIG_SCOPES.has(scope));
 if(module==='enrollments')return ['students','enrollments','studentRequests'].includes(entity)||(entity==='documentSettings'&&['admissionConfig','admissionSubmission','profile2026'].includes(scope));
 if(module==='grades')return ['grades','documentSubmissions'].includes(entity)||(entity==='documentSettings'&&['unit','practice'].includes(scope));
 return entity==='attendance';
}
// Add only signed dependencies already visible to sender AND recipient.
function withDependencies(operations,module){
 validateSyncModule(module);const latest=new Map();for(const op of operations)latest.set(op.body.entity+':'+op.body.recordId,op);
 const selected=new Map([...latest].filter(([,op])=>matchesSyncModule(op.body.entity,op.body.value,module))),required=new Set();
 const add=(entity,id)=>{const key=entity+':'+id,op=latest.get(key);if(op&&!selected.has(key)){selected.set(key,op);required.add(key);}return op?.body.value;};
 for(const op of [...selected.values()]){const b=op.body,v=b.value;if(!['grades','attendance','documentSubmissions','enrollments','studentRequests'].includes(b.entity))continue;const en=v.enrollmentId?add('enrollments',v.enrollmentId):null;if(en)add('students',en.studentId);const group=add('groups',v.groupId||en?.groupId);if(group){add('programs',group.programId);add('modules',group.moduleId);for(const config of latest.values()){if(config.body.entity!=='documentSettings')continue;const scope=config.body.value?.scope;if((scope?.kind==='unitCurriculum'&&scope.target===group.id&&scope.unit===v.unit)||(scope?.kind==='group'&&scope.target===group.id)||(['curriculum','moduleDefaults','module'].includes(scope?.kind)&&scope.target===group.moduleId))add('documentSettings',config.body.recordId);}}}
 const rank={programs:0,modules:1,groups:2,students:3,enrollments:4,documentSettings:5};
 // Keep signed causal predecessors for each selected record. A latest-only
 // update may refer to a revision the receiving computer has never seen.
 const result=operations.filter(op=>selected.has(op.body.entity+':'+op.body.recordId))
  .sort((a,b)=>(rank[a.body.entity]??6)-(rank[b.body.entity]??6));
 const dependencies={};for(const key of required){const entity=key.split(':')[0];dependencies[entity]=(dependencies[entity]||0)+1;}
 return {operations:result,dependencies};
}
function classifyOperations(operations=[]){return Object.fromEntries(Object.values(SYNC_MODULES).map(module=>[module,operations.filter(op=>matchesSyncModule(op.body.entity,op.body.value,module)).length]));}
module.exports={SYNC_MODULES,MODULE_LABELS,CONFIG_SCOPES,validateSyncModule,matchesSyncModule,classifyOperations,withDependencies};
