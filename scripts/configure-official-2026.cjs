// Configuración autorizada: afiche oficial, directorio y matrículas de origen.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('./offline-documents.cjs'),{correctModule}=require('./module-enrollments.cjs');
const PLANS=[
 ['PROG-001','MECÁNICA AUTOMOTRIZ',5,['MANTENIMIENTO Y REPARACIÓN DE SISTEMA DE SUSPENSIÓN, DIRECCIÓN, FRENOS Y TRANSMISIÓN','DIAGNÓSTICO Y MANTENIMIENTO DEL MOTOR DE COMBUSTIÓN INTERNA DE LOS VEHÍCULOS AUTOMOTRICES']],
 ['PROG-002','MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',5,['MANTENIMIENTO Y REPARACIÓN DE SISTEMA DE SUSPENSIÓN, DIRECCIÓN, FRENOS, TRANSMISIÓN, SISTEMA ELÉCTRICO Y SISTEMA ELECTRÓNICO DE MOTOS Y VEHÍCULOS AFINES','MANTENIMIENTO Y REPARACIÓN DE MOTOS DE COMBUSTIÓN Y CONVERSIÓN DEL SISTEMA GNV-GLP']],
 ['PROG-003','CARPINTERÍA METÁLICA',2,['CONSTRUCCIONES METÁLICAS DE CONSUMO CON SOLDADURA POR ARCO ELÉCTRICO EN ACERO','CONSTRUCCIONES METÁLICAS DE CONSUMO EN ALUMINIO CON SOLDADURA ESPECIAL TIG-MIG-MAG-LASER']],
 ['PROG-004','PELUQUERÍA Y BARBERÍA',3,['CORTE DE CABELLOS, PEINADOS Y DISEÑO DE BARBAS','ONDULACIÓN, DECOLORACIÓN Y TINTURACIÓN']],
 ['PROG-005','COMPUTACIÓN E INFORMÁTICA',1,['OFIMÁTICA','DISEÑO GRÁFICO Y PLATAFORMAS DIGITALES']],
 ['PROG-006','CORTE Y ENSAMBLAJE',4,['TÉCNICAS DE TRAZADO, TENDIDO Y CORTE DE PRENDAS DE VESTIR','TÉCNICAS DE CONFECCIÓN DE PRENDAS DE VESTIR']],
 ['PROG-007','MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',6,['INSTALACIÓN DE SISTEMAS ELÉCTRICOS EN EDIFICACIONES','MANTENIMIENTO DE EQUIPOS ELECTRÓNICOS Y SISTEMAS DE SEGURIDAD EN DOMÓTICA']]
];
const PEOPLE=[
 ['alejandrina.ayna','AYNA CABRERA',['GRP-BD-001']],['azucena.ccolla','CCOLLA VILLANUEVA',['GRP-BD-002']],['fidelia.gutierrez','GUTIÉRREZ LOZA',['GRP-BD-003']],
 ['edgar.velasquez','VELÁSQUEZ VILCA',['GRP-BD-004']],['anibal.maquera','MAQUERA GIL',['GRP-BD-005']],['cesario.ccosi','CCOSI QUENAYA',['GRP-BD-006']],
 ['magda.chura','CHURA COAQUIRA',[]],['teofilo.larico','LARICO CANAHUIRE',[]],['rene.chura','CHURA MAMANI',[]],['liz.flores','FLORES LLANOS',[]],['serafin.huanca','HUANCA CASTRO',['GRP-BD-012']],
 ['eloy.paredes','PAREDES FELICIANO',[], 'DIRECTOR'],['carmen.vilca','VILCA PUMA',[], 'SECRETARIA']
];
const displayName=name=>{const p=name.split(',');return p.length===2?p[1].trim()+' '+p[0].trim():name;};
function configure(core,actor){
 core.requireRole(actor,['DIRECTOR']);if(!core.status().authority)throw Error('Configure desde el equipo institucional.');
 if(core.setting('official-2026-configured'))return {alreadyConfigured:true,...core.setting('official-2026-configured')};
 const groups=core.records('groups').filter(g=>/^GRP-BD-\d{3}$/.test(g.id)).sort((a,b)=>a.id.localeCompare(b.id));
 if(groups.length!==12||groups.some(g=>g.moduleId||g.periodId))throw Error('Los grupos de origen no están en el estado esperado. No se aplicó la configuración.');
 if(core.records('grades').concat(core.records('attendance')).some(r=>groups.some(g=>g.id===r.groupId)))throw Error('Hay registros académicos históricos que requieren revisar la vinculación antes de continuar.');
 const personnel=core.records('documentSettings').filter(r=>r.scope.kind==='personnel'&&r.fields.year==='2026');
 for(const [,match]of PEOPLE)if(personnel.filter(p=>p.fields.name.includes(match)).length!==1)throw Error('Personal no identificado: '+match);
 const stages=core.db.prepare("SELECT value FROM settings WHERE key LIKE 'legacy-%'").all().flatMap(r=>JSON.parse(r.value).stores?.staging_importaciones||[]),stageMap=new Map(stages.map(r=>[r.id,r]));
 const academicBefore=JSON.stringify([core.records('students'),core.records('grades'),core.records('attendance')]);
 const result=core.transaction(()=>{
  const backup=core.createBackup(actor,'antes-cuentas-y-modulos-2026'),credentials=[],moduleMap=new Map(),groupPairs=new Map();
  const save=(scope,fields)=>{const old=core.record('documentSettings',D.idFor(scope));return D.saveSettings(core,actor,{scope,fields,rev:old?.rev||null});};
  for(const [programId,programName,source,titles]of PLANS){const oldProgram=core.record('programs',programId);if(!oldProgram)throw Error('Carrera de origen no encontrada: '+programId);if(oldProgram.nombre!==programName)core.write(actor,'programs',{...oldProgram,nombre:programName},oldProgram.rev);
   for(let index=1;index<=2;index++){const original=core.record('documentSettings',`curriculum:MOD-2026-SOURCE-${source}-${index}`);if(!original)throw Error('Falta el plan original del consolidado.');const fields=original.fields,moduleId=`MOD-2026-AFICHE-${programId.slice(-3)}-${index}`;
    core.write(actor,'modules',{id:moduleId,nombre:titles[index-1],programaId:programId,academicYear:'2026',source:'AFICHE_OFICIAL_2026'});
    const uncertain=programId==='PROG-002'||(programId==='PROG-003'&&index===2),units=JSON.parse(fields.unitsJson).map(u=>uncertain&&u.code!=='EFSRT'?{...u,referenceName:u.name,name:`${u.code}: denominación pendiente de confirmar`,hours:null,credits:null,confirmed:false,fechaInicio:'',fechaFin:''}:u);
    save({kind:'curriculum',target:moduleId},{...fields,nombre:titles[index-1],programName,turno:'',nivelFormativo:fields.nivelFormativo||'Auxiliar Técnico',unitsJson:JSON.stringify(units)});moduleMap.set(programId+':'+index,{moduleId,units});
   }
  }
  for(const sourceGroup of groups){const existing=core.records('enrollments').filter(e=>e.groupId===sourceGroup.id&&e.active),sourceRows=existing.map(e=>stageMap.get(e.legacy?.stagingId));if(sourceRows.some(r=>!r))throw Error('No se encontró el origen de alguna matrícula.');const unique=k=>[...new Set(sourceRows.map(r=>r[k]).filter(Boolean))];if(unique('turnoOriginal').length!==1||unique('modalidadOriginal').length!==1)throw Error('El aula tiene turnos o modalidades mezcladas.');const turno=sourceGroup.programId==='PROG-005'?'':unique('turnoOriginal')[0],modalidad=unique('modalidadOriginal')[0],ids=[];
   // La doble fila de un mismo alumno queda conservada y excluida, nunca borrada.
   const seen=new Set();for(const e of existing){if(seen.has(e.studentId))core.write(actor,'enrollments',{...e,active:false,moduleState:'EXCLUDED',provisional:true,moduleCorrection:{action:'EXCLUDE',reason:'Duplicidad de matrícula de origen; registro conservado.',at:new Date().toISOString(),by:actor.id}},e.rev);else seen.add(e.studentId);}
   for(let index=1;index<=2;index++){const plan=moduleMap.get(sourceGroup.programId+':'+index),periodId=index===1?'2026-I':'2026-II',id=index===1?sourceGroup.id:sourceGroup.id+'-M2',name=`Grupo ${sourceGroup.id.slice(-3)} · Módulo ${index===1?'I':'II'}`;let group;
    if(index===1)group=core.saveGroup(actor,{id,rev:core.record('groups',id).rev,name,moduleId:plan.moduleId,periodId,units:plan.units.map(u=>u.code),section:'',turno});
    else{group=core.write(actor,'groups',{id,name,programId:sourceGroup.programId,moduleId:plan.moduleId,periodId,units:plan.units.map(u=>u.code),section:'',turno,modalidad,closed:false,sourceGroupId:sourceGroup.id});}
    group=core.write(actor,'groups',{...group,modalidad,sourceTurno:unique('turnoOriginal')[0],sourceGroupId:sourceGroup.id,provisionalModules:true,teacherAssignmentPending:!PEOPLE.some(p=>p[2].includes(sourceGroup.id))},group.rev);ids.push(id);
    const teacher=PEOPLE.find(p=>p[2].includes(sourceGroup.id)),person=teacher&&personnel.find(p=>p.fields.name.includes(teacher[1]));save({kind:'group',target:id},{ciclo:'Auxiliar Técnico',seccion:'',turno,modalidad,periodClase:periodId,teacherName:person?displayName(person.fields.name):''});
    if(index===1){for(const old of core.records('enrollments').filter(e=>e.groupId===id)){core.write(actor,'enrollments',{...old,provisional:true,moduleState:old.active?'PROVISIONAL':'EXCLUDED',moduleAssignmentSource:'Autorización de dirección: matrícula provisional en ambos módulos; revisar pertenencia.'},old.rev);if(old.active)save({kind:'enrollment',target:old.id},{condition:'G'});}}
    else{const originals=core.records('enrollments').filter(e=>e.groupId===sourceGroup.id&&e.active);for(const e of originals){const recordId=crypto.randomUUID(),value={id:recordId,createdAt:new Date().toISOString(),studentId:e.studentId,groupId:id,periodId,moduleId:plan.moduleId,startDate:null,active:true,provisional:true,moduleState:'PROVISIONAL',sourceEnrollmentId:e.id,moduleAssignmentSource:'Autorización de dirección: matrícula provisional en ambos módulos; revisar pertenencia.'};value.code=require('./role-policy.cjs').enrollmentCode(core,e.studentId,recordId);core.write(actor,'enrollments',value);save({kind:'enrollment',target:recordId},{condition:'G'});}}
   }
   groupPairs.set(sourceGroup.id,ids);
  }
  for(const [username,match,sourceGroups,assignedRole]of PEOPLE){const p=personnel.find(p=>p.fields.name.includes(match)).fields,role=assignedRole||'DOCENTE',assignments=sourceGroups.flatMap(gid=>groupPairs.get(gid).map(groupId=>({groupId,units:core.record('groups',groupId).units}))),existing=core.users().find(u=>u.username===username),name=displayName(p.name),prefix=username.split('.')[0],password=prefix[0].toUpperCase()+prefix.slice(1)+'2026!';if(existing&&(existing.name!==name||existing.role!==role))throw Error('El nombre de usuario ya pertenece a otra persona: '+username);
   core.saveUser(actor,{...(existing?{id:existing.id,version:existing.version}:{}),username,name,role,description:p.specialty+(role==='DOCENTE'&&!assignments.length?' · Aulas y turno pendientes de asignación':''),assignmentPending:role==='DOCENTE'&&!assignments.length,assignments,...(!existing?{password}:{})});credentials.push({name,username,password:existing?'Contraseña existente conservada':password,role,assignedGroups:assignments.length});
  }
  // Archivar catálogos reemplazados preserva su trazabilidad y las operaciones firmadas.
  for(const r of core.records('documentSettings').filter(r=>r.scope.kind==='curriculum'&&r.scope.target.startsWith('MOD-2026-SOURCE-'))){if(core.records('groups').some(g=>g.moduleId===r.scope.target))throw Error('El catálogo anterior está en uso.');core.write(actor,'documentSettings',{...r,archived:true,supersededBy:'AFICHE_OFICIAL_2026'},r.rev);}
  for(const entity of ['programs','modules'])for(const r of core.records(entity)){const used=core.records('groups').some(g=>g[entity==='programs'?'programId':'moduleId']===r.id);if(!used&&((entity==='programs'&&r.id.startsWith('PROG-2026-SOURCE-'))||(entity==='modules'&&(r.id.startsWith('MOD-2026-SOURCE-')||/^MOD-\d{3}$/.test(r.id)))))core.write(actor,entity,{...r,archived:true},r.rev);}
  if(JSON.stringify([core.records('students'),core.records('grades'),core.records('attendance')])!==academicBefore)throw Error('Se alteró información académica ajena a las matrículas.');const health=core.databaseHealth(actor);if(!health.healthy)throw Error('La configuración no superó la integridad: '+health.errors.map(r=>r.message).join('; '));
  const report={at:new Date().toISOString(),backup:backup.filename,programs:7,modules:14,configuredGroups:24,activeProvisionalEnrollments:core.records('enrollments').filter(e=>e.active&&e.provisional).length,credentials};core.setting('official-2026-configured',{...report,credentials:credentials.map(({password,...p})=>p)});core.audit('CONFIGURACION_AFICHE_2026',actor,{...report,credentials:credentials.map(({password,...p})=>p)});return report;
 });
 return result;
}
if(require.main===module){const {OfflineCore}=require('./offline-core.cjs'),directory=path.resolve(process.argv[2]||path.join(__dirname,'../private-data')),core=new OfflineCore(directory);try{const actor=core.users().find(u=>u.active&&u.role==='DIRECTOR'),result=configure(core,actor);if(!result.alreadyConfigured){const privateReport={...result};fs.writeFileSync(path.join(directory,'ACCESOS_PERSONAL_2026.json'),JSON.stringify(privateReport,null,2),{mode:0o600});}console.log(JSON.stringify({...result,credentials:result.credentials?.map(({password,...p})=>p)},null,2));}finally{core.close();}}
module.exports={configure,PLANS,PEOPLE};
