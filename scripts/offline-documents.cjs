const crypto=require('node:crypto');
const path=require('node:path');
const {SETTINGS_FIELDS,TEMPLATE_PARAMETERS,catalog}=require('./document-contracts.cjs');
const {policyFor,enrollmentCode}=require('./role-policy.cjs');
const err=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const present=v=>v!==undefined&&v!==null&&v!==''&&v!=='PENDIENTE';
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;
function idFor(scope){return `${scope.kind}:${scope.target||'institution'}${scope.unit?':'+scope.unit:''}`;}
function visible(core,user,value,incomingEnrollments=new Map()){
 const s=value.scope;if(!s||!SETTINGS_FIELDS[s.kind])return false;if(user.role!=='DOCENTE')return true;
 if(s.kind==='institution')return true;
 if(s.kind==='group'||s.kind==='unit'||s.kind==='unitCurriculum')return core.record('groups',s.target)?core.assignment(user,s.target,['unit','unitCurriculum'].includes(s.kind)?s.unit:null):user.assignments.some(a=>a.groupId===s.target&&(!['unit','unitCurriculum'].includes(s.kind)||a.units.includes(s.unit)));
 if(s.kind==='program')return user.assignments.some(a=>a.programId===s.target);
 if(s.kind==='module')return user.assignments.some(a=>a.moduleId===s.target);
 if(['enrollment','registry','practice','closure'].includes(s.kind)){const e=core.record('enrollments',s.target)||incomingEnrollments.get(s.target);return !!e&&user.assignments.some(a=>a.groupId===e.groupId&&(!a.periodId||!e.periodId||a.periodId===e.periodId)&&(s.kind!=='practice'||a.units.includes('EFSRT')));}
 return false;
}
function authorize(core,actor,scope){
 if(!scope||!SETTINGS_FIELDS[scope.kind])err('Ámbito documental inválido.');
 if(['group','unit','unitCurriculum'].includes(scope.kind)){core.requireGroup(actor,scope.target,scope.unit);if(['unit','unitCurriculum'].includes(scope.kind)&&!(core.record('groups',scope.target).units||[]).includes(scope.unit))err('Unidad desconocida.');}
 if(scope.kind==='institution'&&scope.target)err('El perfil institucional es único.');
 if(scope.kind==='program'&&!core.scoped(actor,'programs').some(p=>p.id===scope.target))err('Programa no permitido.',403);
 if(scope.kind==='module'&&!core.scoped(actor,'modules').some(m=>m.id===scope.target))err('Módulo no permitido.',403);
 if(['enrollment','registry','practice','closure'].includes(scope.kind)){const e=core.record('enrollments',scope.target);if(!e)err('Matrícula no encontrada.');core.requireGroup(actor,e.groupId,scope.kind==='practice'&&actor.role==='DOCENTE'?'EFSRT':null);}
 if(!SETTINGS_FIELDS[scope.kind].some(f=>f.roles.includes(actor.role)))err('Estos datos comunes los configura dirección o secretaría.',403);
}
function validateSettings(core,actor,input,checkExisting=true){
 authorize(core,actor,input.scope);if(input.scope.kind==='group'&&Object.hasOwn(input.fields||{},'seccion')){const g=core.record('groups',input.scope.target);if(g&&core.groupSection(g)&&String(input.fields.seccion).trim().toUpperCase()!==core.groupSection(g))err('La sección se administra en Grupos. No cambie el aula desde los parámetros del documento.');}if(!input.fields||typeof input.fields!=='object'||Array.isArray(input.fields))err('Campos inválidos.');
 const old=checkExisting?core.record('documentSettings',idFor(input.scope)):null;
 const fields={...(old?.fields||{})};
 for(const [key,value]of Object.entries(input.fields)){
  const field=SETTINGS_FIELDS[input.scope.kind].find(f=>f.key===key);if(!field||!field.roles.includes(actor.role))err(`No puede editar el parámetro ${key}.`,403);
  if(value===''||value===null){fields[key]='';continue;}
  if(field.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<0)err(`Valor numérico inválido: ${field.label}.`);const maximum=key.startsWith('criterion')?[3,2,2,3,3,3,1,2,1][Number(key.slice(9))-1]:key.endsWith('Grade')?20:null;if(maximum!==null&&value>maximum)err(`${field.label}: supera el máximo ${maximum}.`);}
  else if(typeof value!=='string'||value.length>2000)err(`Texto inválido: ${field.label}.`);
  if((key==='approvalMinimum'||key==='efsrtFinalGrade'||key==='modularGrade')&&typeof value==='number'&&value>20)err('La calificación debe estar entre 0 y 20.');
  if(field.type==='date'&&!validDate(value))err(`Fecha inválida: ${field.label}.`);
  if(field.type==='select'&&!field.options.includes(value))err(`Opción inválida: ${field.label}.`);
  fields[key]=typeof value==='string'?value.trim():value;
 }
 if(fields.fechaInicio&&fields.fechaFin&&fields.fechaInicio>fields.fechaFin)err('La fecha de término debe ser posterior al inicio.');
 if(input.scope.kind==='institution'&&Object.hasOwn(input.fields,'nombre')&&!present(fields.nombre))err('El nombre institucional no puede quedar vacío.');
 return {id:idFor(input.scope),scope:input.scope,fields};
}
function saveSettings(core,actor,input){const value=validateSettings(core,actor,input);return core.transaction(()=>{const saved=core.write(actor,'documentSettings',value,input.rev);if(input.scope.kind==='institution'&&present(value.fields.nombre))core.setting('institution',{...core.setting('institution'),name:value.fields.nombre});return saved;});}
function settings(core,scope){return core.record('documentSettings',idFor(scope))?.fields||{};}
function configuration(core,actor){
 const legacy=core.db.prepare("SELECT value FROM settings WHERE key LIKE 'legacy-%'").all().map(r=>JSON.parse(r.value)).flatMap(s=>s.stores.institucion||[])[0]||{};
 const defaults={'institution:institution':{...legacy,nombre:core.setting('institution').name,resolucionAutorizacion:legacy.resolucionAutorizacion||legacy.resolucionAutorizacion1||'',resolucionConversion:legacy.resolucionConversion||legacy.resolucionAutorizacion2||'',directorNombre:legacy.director||''}};
 for(const g of core.scoped(actor,'groups'))defaults['group:'+g.id]={turno:g.turno||'',modalidad:g.modalidad||'',seccion:core.groupSection(g),ciclo:g.ciclo||''};
 for(const fields of Object.values(defaults))for(const key of Object.keys(fields))if(fields[key]==='PENDIENTE'||fields[key]==='[PENDIENTE]'||fields[key]==='NO_CONFIRMADO')fields[key]='';
 const templates=core.dashboard(actor).templates,allowed=policyFor(actor).settings;
 const schema=Object.fromEntries(Object.entries(SETTINGS_FIELDS).filter(([kind])=>allowed.includes(kind)).map(([kind,fields])=>[kind,fields.filter(f=>f.roles.includes(actor.role))]));
 const filteredDefaults=Object.fromEntries(Object.entries(defaults).filter(([key])=>allowed.includes(key.split(':')[0])));
 return {schema,defaults:filteredDefaults,settings:core.records('documentSettings').filter(r=>allowed.includes(r.scope.kind)&&visible(core,actor,r)),catalog:catalog(path.join(__dirname,'..')).filter(t=>templates.includes(t.id))};
}
function enrich(core,actor,base){
 const g=base.group,inst=settings(core,{kind:'institution'}),prog=settings(core,{kind:'program',target:g.programId}),mod=settings(core,{kind:'module',target:g.moduleId}),group=settings(core,{kind:'group',target:g.id});
 const units=g.units.map((code,index)=>({code,order:index+1})).filter(u=>u.code!=='EFSRT'&&(actor.role!=='DOCENTE'||core.assignment(actor,g.id,u.code))).map(({code,order})=>({code,order,...settings(core,{kind:'unit',target:g.id,unit:code}),...settings(core,{kind:'unitCurriculum',target:g.id,unit:code})}));const selected=units.find(u=>u.code===base.unit)||null;
 const teachers=core.users().filter(u=>u.active&&u.role==='DOCENTE'&&u.assignments.some(a=>a.groupId===g.id&&(!base.unit||a.units.includes(base.unit))));
 const teacher=actor.role==='DOCENTE'?actor.name:group.teacherName||(teachers.length===1?teachers[0].name:'');
 const students=base.students.map(row=>({...row,parameters:{...settings(core,{kind:'enrollment',target:row.enrollment.id}),...settings(core,{kind:'registry',target:row.enrollment.id}),...settings(core,{kind:'practice',target:row.enrollment.id}),...settings(core,{kind:'closure',target:row.enrollment.id}),code:row.enrollment.code||enrollmentCode(core,row.enrollment.studentId,row.enrollment.id)}}));
 const institution={...base.institution,...inst};institution.resolucion=[institution.resolucionAutorizacion||institution.resolucionAutorizacion1||'',institution.resolucionConversion||institution.resolucionAutorizacion2||''].filter(Boolean).join(' / ');if(!present(institution.nombre))institution.nombre=base.institution.name;
 const doc={...base,institution:{...institution,name:institution.nombre},program:{...base.program,...prog},module:{...base.module,...mod},group:{...g,...group,seccion:core.groupSection(g)},units,unitCode:base.unit,unitData:selected,teacher,students,parameters:students.length===1?students[0].parameters:{}};
 doc.preflight=preflight(doc);doc.fingerprint=digest({...doc,preflight:undefined});return doc;
}
function fieldLabel(key){const [scope,name]=key.split('.');const special={'program.nombre':'Programa de estudios','module.nombre':'Módulo formativo','students.name':'Apellidos y nombres de estudiantes','students.document':'Documentos de identidad','students.documentType':'Tipo de documento de identidad','students.sex':'Sexo de estudiantes','students.birthDate':'Fechas de nacimiento','students.lastName1':'Apellidos paternos','students.lastName2':'Apellidos maternos','students.firstNames':'Nombres de estudiantes','teacher.name':'Docente responsable','group.periodId':'Periodo académico','attendance.sessions':'Fechas y sesiones de asistencia','attendance.marks':'Marcas de asistencia por estudiante','evaluation.components':'Instrumentos IA1, IA2, IA3 y calificaciones IL','evaluation.unitResult':'Logro confirmado de la unidad','evaluation.unitResults':'Logros confirmados de todas las unidades','efsrt.criteria':'Nueve criterios de EFSRT','efsrt.finalGrade':'Calificación final EFSRT','document.officialTitleText':'Denominación del título autorizado'};if(special[key])return special[key];const mapped={students:'enrollment',enrollments:'enrollment',units:'unit',document:'registry',efsrt:'practice'}[scope]||scope;const alias={finalGrade:'efsrtFinalGrade'}[name]||name;return SETTINGS_FIELDS[mapped]?.find(f=>f.key===alias)?.label||SETTINGS_FIELDS.unitCurriculum.find(f=>f.key===name)?.label||name;}
function preflight(doc){
 const required=TEMPLATE_PARAMETERS[doc.templateId]||[],missing=[],fields=[];
 const add=(key,value,source,countMissing=1)=>{const ok=present(value);fields.push({key,label:fieldLabel(key),value:ok?value:'',status:ok?'READY':'MISSING',source});if(!ok)missing.push({key,source,count:countMissing});};
 for(const key of required){const [scope,name]=key.split('.');
  if(['institution','program','module','group'].includes(scope)){add(key,doc[scope]?.[name],scope==='group'?'Configuración del grupo':'Configuración documental');continue;}
  if(scope==='teacher'){add(key,doc.teacher,'Cuenta docente / responsable del grupo');continue;}
  if(scope==='unit'){add(key,doc.unitData?.[name],'Configuración de la unidad');continue;}
  if(scope==='students') {const missingRows=doc.students.filter(({student:s})=>!present(({name:s.name,document:s.document,sex:s.sex??s.legacy?.sexo,birthDate:s.birthDate??s.legacy?.fechaNacimiento,lastName1:s.lastName1??s.legacy?.apellidoPaterno,lastName2:s.lastName2??s.legacy?.apellidoMaterno,firstNames:s.firstNames??s.legacy?.nombres,documentType:s.documentType??s.legacy?.tipoDocumento})[name]));add(key,doc.students.length&&missingRows.length===0?`${doc.students.length} estudiantes completos`:null,'Ficha del estudiante',missingRows.length||1);continue;}
  if(scope==='units'){const incomplete=doc.units.filter(u=>!present(u[name]));add(key,doc.units.length&&!incomplete.length?`${doc.units.length} unidades completas`:null,'Configuración de unidades',incomplete.length||1);continue;}
  if(scope==='enrollments'){const incomplete=doc.students.filter(s=>!present(s.parameters[name]));add(key,doc.students.length&&!incomplete.length?`${doc.students.length} matrículas completas`:null,'Parámetros de matrícula',incomplete.length||1);continue;}
  if(scope==='attendance') {const sessions=[...new Set(doc.attendance.map(r=>`${r.date}|${r.session}`))];if(name==='sessions')add(key,sessions.length?`${sessions.length} sesiones`:null,'Asistencia del docente');else{const expected=doc.students.flatMap(s=>sessions.filter(date=>!s.enrollment.startDate||date.slice(0,10)>=s.enrollment.startDate).map(session=>({enrollment:s.enrollment.id,session})));const pending=expected.filter(v=>!doc.attendance.some(r=>r.enrollmentId===v.enrollment&&`${r.date}|${r.session}`===v.session&&present(r.value)));add(key,expected.length&&!pending.length?`${expected.length} marcas`:null,'Asistencia del docente',pending.length||1);}continue;}
  if(scope==='evaluation'){const wanted=name==='components'?Array.from({length:5},(_,i)=>['IA1','IA2','IA3',''].map(c=>`IL${i+1}${c?'.'+c:''}`)).flat():['RESULTADO_UD'];const combos=doc.students.flatMap(s=>(name==='unitResults'?doc.units.map(u=>u.code):[doc.unitCode]).flatMap(unit=>wanted.map(indicator=>({enrollment:s.enrollment.id,unit,indicator}))));const pending=combos.filter(v=>!doc.grades.some(r=>r.enrollmentId===v.enrollment&&r.unit===v.unit&&r.indicator===v.indicator&&present(r.value)));add(key,combos.length&&!pending.length?`${combos.length} valores completos`:null,'Notas confirmadas del docente',pending.length||1);continue;}
  if(scope==='efsrt'||scope==='closure'){const aliases={finalGrade:'efsrtFinalGrade',companyName:'companyName',companyAddress:'companyAddress',modularGrade:'modularGrade',approvedUnitsCount:'approvedUnitsCount',failedUnitsCount:'failedUnitsCount'};const incomplete=doc.students.filter(s=>name==='criteria'?Array.from({length:9},(_,i)=>s.parameters[`criterion${i+1}`]).some(v=>!present(v)):!present(s.parameters[aliases[name]]));add(key,doc.students.length&&!incomplete.length?`${doc.students.length} registros completos`:null,'Parámetros EFSRT / cierre de matrícula',incomplete.length||1);continue;}
  if(scope==='document'){add(key,name==='officialTitleText'?doc.program.officialTitleText:doc.parameters[name],'Datos registrales de la matrícula');}
 }
 if(doc.templateId==='TMPL-02'&&doc.parameters.subsanacionUnit)for(const key of ['subsanacionCredits','subsanacionHours','subsanacionCondition'])add('document.'+key,doc.parameters[key],'Parámetros de subsanación de matrícula');
 return {fields,missing,complete:missing.length===0,filled:fields.length-missing.length,total:fields.length};
}
module.exports={SETTINGS_FIELDS,idFor,visible,validateSettings,saveSettings,configuration,enrich,preflight};
