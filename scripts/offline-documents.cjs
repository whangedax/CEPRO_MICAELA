const crypto=require('node:crypto');
const path=require('node:path');
const {SETTINGS_FIELDS,TEMPLATE_PARAMETERS,catalog,extendedCatalog,programAcronymFor,templateName}=require('./document-contracts.cjs');
const {policyFor,enrollmentCode}=require('./role-policy.cjs');
const err=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const present=v=>v!==undefined&&v!==null&&v!==''&&v!=='PENDIENTE';
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(`${v}T00:00:00Z`))&&new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)===v;
const SPANISH_MONTH_NAMES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
function computeMonthsLabel(spans, fInicio, fFin) {
 if (Array.isArray(spans) && spans.length > 0) {
  const names = [...new Set(spans.map(s => String(s.monthName || '').toUpperCase()))].filter(Boolean);
  if (names.length > 0) return names.join(' - ');
 }
 if (fInicio && typeof fInicio === 'string') {
  const parts1 = fInicio.split('-');
  const m1 = parseInt(parts1[1], 10) - 1;
  let m2 = m1;
  if (fFin && typeof fFin === 'string') {
   const parts2 = fFin.split('-');
   m2 = parseInt(parts2[1], 10) - 1;
  }
  if (m1 >= 0 && m1 < 12) {
   if (m2 >= 0 && m2 < 12 && m1 !== m2) {
    return `${SPANISH_MONTH_NAMES[m1]} - ${SPANISH_MONTH_NAMES[m2]}`;
   }
   return SPANISH_MONTH_NAMES[m1];
  }
 }
 return '';
}
function idFor(scope){if(!scope?.kind)return '';return `${scope.kind}:${scope.target||'institution'}${scope.unit?':'+scope.unit:''}`;}
function visible(core,user,value,incomingEnrollments=new Map()){
 const s=value?.scope;if(!s?.kind||!SETTINGS_FIELDS[s.kind])return false;if(user.role!=='DOCENTE')return true;
 if(s.kind==='institution')return true;
 if(s.kind==='academicYear')return user.assignments.some(a=>a.periodId?.slice(0,4)===s.target);
 if(s.kind==='academicPeriod')return user.assignments.some(a=>a.periodId===s.target);
 if(s.kind==='curriculum')return user.assignments.some(a=>a.moduleId===s.target);
 if(s.kind==='moduleDefaults')return user.assignments.some(a=>a.moduleId===s.target);
 if(s.kind==='group'||s.kind==='unit'||s.kind==='unitCurriculum')return core.record('groups',s.target)?core.assignment(user,s.target,['unit','unitCurriculum'].includes(s.kind)?s.unit:null):user.assignments.some(a=>a.groupId===s.target&&(!['unit','unitCurriculum'].includes(s.kind)||a.units.includes(s.unit)));
 if(s.kind==='program')return user.assignments.some(a=>a.programId===s.target);
 if(s.kind==='module')return user.assignments.some(a=>a.moduleId===s.target);
 if(['enrollment','registry','practice','closure'].includes(s.kind)){const e=core.record('enrollments',s.target)||incomingEnrollments.get(s.target);return !!e&&user.assignments.some(a=>a.groupId===e.groupId&&(!a.periodId||!e.periodId||a.periodId===e.periodId)&&(s.kind!=='practice'||a.units.includes('EFSRT')));}
 return false;
}
function authorize(core,actor,scope){
 if(!scope?.kind||!SETTINGS_FIELDS[scope.kind])err('Ámbito documental inválido.');
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
  else if(typeof value!=='string'||value.length>(field.type==='json'?100000:2000))err(`Texto inválido: ${field.label}.`);
  if((key==='approvalMinimum'||key==='efsrtFinalGrade'||key==='modularGrade')&&typeof value==='number'&&value>20)err('La calificación debe estar entre 0 y 20.');
  if(field.type==='date'&&!validDate(value))err(`Fecha inválida: ${field.label}.`);
  if(field.type==='select'&&!field.options.includes(value))err(`Opción inválida: ${field.label}.`);
  fields[key]=typeof value==='string'?value.trim():value;
 }
 if(fields.fechaInicio&&fields.fechaFin&&fields.fechaInicio>fields.fechaFin)err('La fecha de término debe ser posterior al inicio.');
 if(input.scope.kind==='institution'&&Object.hasOwn(input.fields,'nombre')&&!present(fields.nombre))err('El nombre institucional no puede quedar vacío.');
 if(input.scope.kind==='unitCurriculum'){const g=core.record('groups',input.scope.target),p=core.record('documentSettings','academicPeriod:'+g.periodId)?.fields;for(const key of ['fechaInicio','fechaFin'])if(fields[key]&&((p?.fechaInicio&&fields[key]<p.fechaInicio)||(p?.fechaFin&&fields[key]>p.fechaFin)))err('La fecha de la unidad debe estar dentro del periodo académico.');}
 require('./academic-config.cjs').validate(core,input.scope,fields);
 return {id:idFor(input.scope),scope:input.scope,fields};
}
function saveSettings(core,actor,input){
 return core.transaction(()=>{
  const value=validateSettings(core,actor,input);
  if(value.scope.kind==='registry')validateRegistryChange(core,value);
  const saved=core.write(actor,'documentSettings',value,input.rev);
  require('./academic-config.cjs').synchronize(core,actor,saved);
  if(input.scope.kind==='institution'&&present(value.fields.nombre))core.setting('institution',{...core.setting('institution'),name:value.fields.nombre});
  return saved;
 });
}
const TITLE_CODE = /^(\d{6})-AT-(\d{8})-([A-Z]{2,6})(\d{2})-(\d{4})$/;
const TITLE_SEGMENTS = ['registryCorrelative','registryLevelCode','programAcronym','registryShortRef','registryCodeYear'];
const CERT_SEGMENTS = ['certCorrelative','certLevelCode','certProgramAcronym','certShortRef','certCodeYear'];

function validateRegistryChange(core,{id,scope,fields}){
 const previous=core.record('documentSettings',id)?.fields||{};
 const enrollment=core.record('enrollments',scope.target);
 const student=core.record('students',enrollment?.studentId);
 const studentDni=String(student?.documentNumber||student?.document||'');

 const registerCode=Object.hasOwn(fields,'registerCode')?fields.registerCode:previous.registerCode;
 if(registerCode&&registerCode!==previous.registerCode){
  const parts=TITLE_CODE.exec(registerCode);
  if(parts||Object.hasOwn(fields,'titleEmissionDate')){
   if(!parts||Number(parts[1])===0||Number(parts[5])<1000)err('Ingrese un código institucional válido: seis dígitos, AT, DNI, sigla con referencia de dos dígitos y año.');
   if(studentDni!==parts[2])err('El DNI del código institucional debe coincidir con el estudiante seleccionado.');
   if(titleCorrelativeTaken(core,scope.target,registerCode,parts))err('Ese correlativo ya está registrado para ese año. Revise el libro y elija otro.',409);
   const normalized=[parts[1],'AT',parts[3],parts[4],parts[5]];
   for(const [i,key] of TITLE_SEGMENTS.entries())fields[key]=normalized[i];
  }
 }

 const certRegisterCode=Object.hasOwn(fields,'certRegisterCode')?fields.certRegisterCode:previous.certRegisterCode;
 if(certRegisterCode&&certRegisterCode!==previous.certRegisterCode){
  const parts=TITLE_CODE.exec(certRegisterCode);
  if(!parts||Number(parts[1])===0||Number(parts[5])<1000)err('Ingrese un código de certificado válido: seis dígitos, AT, DNI, sigla con referencia de dos dígitos y año.');
  if(studentDni!==parts[2])err('El DNI del código de certificado debe coincidir con el estudiante seleccionado.');
  if(certCorrelativeTaken(core,scope.target,certRegisterCode,parts))err('Ese correlativo de certificado ya está registrado para ese año. Elija otro.',409);
  const normalized=[parts[1],'AT',parts[3],parts[4],parts[5]];
  for(const [i,key] of CERT_SEGMENTS.entries())fields[key]=normalized[i];
 }
}

function titleCorrelativeTaken(core,enrollmentId,registerCode,parts){
 const enrollment=core.record('enrollments',enrollmentId);
 const programId=core.record('groups',enrollment?.groupId)?.programId;
 const taken=(code,otherEnrollmentId)=>{
  if(otherEnrollmentId===enrollmentId)return false;
  const other=TITLE_CODE.exec(code||'');
  if(!other||other[1]!==parts[1]||other[5]!==parts[5])return false;
  // A program's two module enrollments can refer to the same institutional title.
  if(code===registerCode&&programId){
   const linked=core.record('enrollments',otherEnrollmentId);
   if(linked?.studentId===enrollment.studentId&&core.record('groups',linked.groupId)?.programId===programId)return false;
  }
  return true;
 };
 return core.records('documentSettings').some(r=>!r.archived&&r.scope?.kind==='registry'&&taken(r.fields?.registerCode,r.scope.target))||
  core.records('documentEmissions').some(r=>!r.demoMode&&!r.isDraft&&r.templateId!=='TMPL-20'&&taken(r.registerCode,r.enrollmentId));
}

function certCorrelativeTaken(core,enrollmentId,certRegisterCode,parts){
 const taken=(code,otherEnrollmentId)=>{
  if(otherEnrollmentId===enrollmentId)return false;
  const other=TITLE_CODE.exec(code||'');
  return Boolean(other&&other[1]===parts[1]&&other[5]===parts[5]);
 };
 return core.records('documentSettings').some(r=>!r.archived&&r.scope?.kind==='registry'&&taken(r.fields?.certRegisterCode,r.scope.target))||
  core.records('documentEmissions').some(r=>!r.demoMode&&!r.isDraft&&r.templateId==='TMPL-20'&&taken(r.registerCode,r.enrollmentId));
}

function settings(core,scope){return core.record('documentSettings',idFor(scope))?.fields||{};}
function splitNameParts(rawName){
 const raw=String(rawName||'').trim();if(!raw)return {lastName1:'',lastName2:'',firstNames:''};
 if(raw.includes(',')){const [ap,nom]=raw.split(','),t=ap.trim().split(/\s+/).filter(Boolean);return {lastName1:t[0]||'',lastName2:t.slice(1).join(' ')||'',firstNames:(nom||'').trim()};}
 const t=raw.split(/\s+/).filter(Boolean);if(t.length>=3)return {lastName1:t[0],lastName2:t[1],firstNames:t.slice(2).join(' ')};if(t.length===2)return {lastName1:t[0],lastName2:'',firstNames:t[1]};return {lastName1:t[0]||'',lastName2:'',firstNames:''};
}
function configuration(core,actor){
 const legacy=core.db.prepare("SELECT value FROM settings WHERE key LIKE 'legacy-%'").all().map(r=>JSON.parse(r.value)).flatMap(s=>s.stores.institucion||[])[0]||{};
 const yearRec=core.records('documentSettings').find(r=>r.scope?.kind==='academicYear'&&!r.archived);const yearInst=yearRec?.fields?.institutionJson?JSON.parse(yearRec.fields.institutionJson):{};
 const defaults={'institution:institution':{...legacy,...yearInst,nombre:core.setting('institution').name,resolucionAutorizacion:yearInst.resolucionAutorizacion||legacy.resolucionAutorizacion||legacy.resolucionAutorizacion1||'',resolucionConversion:yearInst.resolucionConversion||legacy.resolucionConversion||legacy.resolucionAutorizacion2||'',directorNombre:yearInst.directorNombre||legacy.director||''}};
 for(const g of core.scoped(actor,'groups')){const plan=curriculumFor(core,g),period=settings(core,{kind:'academicPeriod',target:g.periodId||plan.periodId}),efsrt=(plan.unitsJson?JSON.parse(plan.unitsJson):[]).find(u=>u.code==='EFSRT')||{};defaults['group:'+g.id]={turno:g.turno||plan.turno||'',modalidad:g.modalidad||'',seccion:core.groupSection(g),ciclo:g.ciclo||plan.nivelFormativo||'',fechaInicio:period.fechaInicio||g.fechaInicio||'',fechaFin:period.fechaFin||g.fechaFin||'',periodClase:g.periodId||'',efsrtInicio:efsrt.fechaInicio||'',efsrtFin:efsrt.fechaFin||''};if(g.programId&&!defaults['program:'+g.programId])defaults['program:'+g.programId]={nivelFormativo:plan.nivelFormativo||'',tipoPlan:'Modular'};}
 for(const g of core.scoped(actor,'groups')){const ref=require('./reference-defaults.cjs').get(core,g.moduleId),plan=curriculumFor(core,g);defaults['module:'+g.moduleId]={...ref.module,...Object.fromEntries(Object.entries(plan).filter(([k])=>SETTINGS_FIELDS.module.some(f=>f.key===k)))};for(const code of g.units||[]){const u=require('./reference-defaults.cjs').merge(ref.units.find(u=>u.code===code),plan.unitsJson?JSON.parse(plan.unitsJson).find(u=>u.code===code):{});defaults['unit:'+g.id+':'+code]=Object.fromEntries(Object.entries(u).filter(([k])=>SETTINGS_FIELDS.unit.some(f=>f.key===k)));defaults['unitCurriculum:'+g.id+':'+code]=Object.fromEntries(Object.entries(u).filter(([k])=>SETTINGS_FIELDS.unitCurriculum.some(f=>f.key===k)));}}
 for(const fields of Object.values(defaults))for(const key of Object.keys(fields))if(fields[key]==='PENDIENTE'||fields[key]==='[PENDIENTE]'||fields[key]==='NO_CONFIRMADO')fields[key]='';
 const templates=core.dashboard(actor).templates,allowed=policyFor(actor).settings;
 const schema=Object.fromEntries(Object.entries(SETTINGS_FIELDS).filter(([kind])=>allowed.includes(kind)).map(([kind,fields])=>[kind,fields.filter(f=>f.roles.includes(actor.role))]));
 const filteredDefaults=Object.fromEntries(Object.entries(defaults).filter(([key])=>allowed.includes(key.split(':')[0])));
 const docRoot=core.root||path.join(__dirname,'..');
 return {schema,defaults:filteredDefaults,settings:core.records('documentSettings').filter(r=>r.scope?.kind&&allowed.includes(r.scope.kind)&&visible(core,actor,r)),catalog:catalog(docRoot).filter(t=>templates.includes(t.id)),extendedCatalog:extendedCatalog(docRoot).filter(t=>templates.includes(t.id))};
}
const DEMO_STUDENT_NAMES = [
 { name: 'ALVAREZ QUISPE, Carmen Rosa', doc: '45812903', sex: 'M', birth: '2004-03-12' },
 { name: 'APAZA MAMANI, Edwin Rolando', doc: '46923415', sex: 'H', birth: '2003-07-25' },
 { name: 'CALISAYA CONDORI, Javier Luis', doc: '47182934', sex: 'H', birth: '2004-11-03' },
 { name: 'CANAHUA HUANCA, Diana Maritza', doc: '48293012', sex: 'M', birth: '2005-01-18' },
 { name: 'CANSAYA HUAMANI, Gladys Pilar', doc: '49384721', sex: 'M', birth: '2004-09-09' },
 { name: 'CHAMBI TICONCA, Ricardo Miguel', doc: '44592019', sex: 'H', birth: '2002-12-04' },
 { name: 'COAQUIRA MAMANI, Miriam Yanet', doc: '43829104', sex: 'M', birth: '2001-08-14' },
 { name: 'CONDORI COILA, Rubén Darío', doc: '47201928', sex: 'H', birth: '2003-05-20' },
 { name: 'FLORES CALLATA, Beatriz Elena', doc: '46382910', sex: 'M', birth: '2004-02-28' },
 { name: 'GUTIERREZ VELASQUEZ, Jorge Luis', doc: '45910283', sex: 'H', birth: '2003-10-15' },
 { name: 'HUALLPA CHOQUE, Patricia Roxana', doc: '48920184', sex: 'M', birth: '2005-04-07' },
 { name: 'HUANCA QUISPE, Julio César', doc: '44829102', sex: 'H', birth: '2002-06-30' },
 { name: 'LEQQUE SUCASACA, Ana María', doc: '47291038', sex: 'M', birth: '2003-08-22' },
 { name: 'LOPEZ MAMANI, Verónica Soledad', doc: '48192039', sex: 'M', birth: '2004-12-11' },
 { name: 'MAMANI CALISAYA, Hernán Alberto', doc: '46192830', sex: 'H', birth: '2003-04-01' },
 { name: 'MAMANI CONDORI, Maritza Del Carmen', doc: '45382910', sex: 'M', birth: '2002-09-17' },
 { name: 'MEDINA CCAMA, Walter Marco', doc: '47281920', sex: 'H', birth: '2004-06-05' },
 { name: 'MENDOZA QUISPE, Silvia Karina', doc: '48392019', sex: 'M', birth: '2005-02-14' },
 { name: 'PARICAHUA TICONCA, César Augusto', doc: '44910283', sex: 'H', birth: '2002-11-23' },
 { name: 'QUISPE CONDORI, Bertha Elena', doc: '46291049', sex: 'M', birth: '2003-03-31' },
 { name: 'QUISPE MAMANI, Fredy Orlando', doc: '47102938', sex: 'H', birth: '2004-07-19' },
 { name: 'RAMOS CHURA, Liliana Maribel', doc: '48201948', sex: 'M', birth: '2005-05-02' },
 { name: 'RODRIGUEZ PAREDES, Marco Antonio', doc: '45291048', sex: 'H', birth: '2002-10-10' },
 { name: 'ROQUE MAMANI, Judith Vanessa', doc: '46820194', sex: 'M', birth: '2003-12-29' },
 { name: 'SUCASACA APAZA, David Alejandro', doc: '47392018', sex: 'H', birth: '2004-08-08' },
 { name: 'TICONCA HUALLPA, Norma Ruth', doc: '48492019', sex: 'M', birth: '2005-03-24' },
 { name: 'TURPO QUISPE, Carlos Daniel', doc: '45920184', sex: 'H', birth: '2003-01-16' },
 { name: 'VALENCIA CUEVA, Mónica Lucía', doc: '46392018', sex: 'M', birth: '2004-10-27' },
 { name: 'VILCA MAMANI, Oscar Efraín', doc: '47820193', sex: 'H', birth: '2004-04-13' },
 { name: 'ZEA CONDORI, Yessica Paola', doc: '48192047', sex: 'M', birth: '2005-06-08' }
];

const DEMO_REFERENCE_UNITS = {
  'PROG-001': {
    'MOD-2026-AFICHE-001-1': { UD1: 'Organiza el aula taller automotriz', UD2: 'Mantenimiento del sistema de frenos, dirección y suspensión', UD3: 'Mantenimiento del sistema de transmisión', UD4: 'Aplicación de herramientas informáticas', UD5: 'Metodologías para el emprendimiento' },
    'MOD-2026-AFICHE-001-2': { UD1: 'Diagnóstico y mantenimiento de motores de combustión interna Otto y Diésel', UD2: 'Diagnóstico y mantenimiento del sistema de lubricación y refrigeración', UD3: 'Diagnóstico y mantenimiento del sistema de distribución y alimentación', UD4: 'Comunicación para las buenas relaciones interpersonales', UD5: 'Ética para la buena convivencia' }
  },
  'PROG-002': {
    'MOD-2026-AFICHE-002-1': { UD1: 'Seguridad en taller y mantenimiento del sistema de frenos y suspensión de motos', UD2: 'Mantenimiento del sistema de dirección y transmisión de motos', UD3: 'Diagnóstico de sistemas eléctricos e iluminación de vehículos menores', UD4: 'Diagnóstico y mantenimiento de sistemas electrónicos de motos', UD5: 'Emprendimiento y gestión de taller de motos' },
    'MOD-2026-AFICHE-002-2': { UD1: 'Mantenimiento y reparación del motor de combustión de motos', UD2: 'Sistema de alimentación, inyección y escape en motocicletas', UD3: 'Instalación y calibración del sistema de conversión GNV-GLP', UD4: 'Diagnóstico y puesta a punto de vehículos menores a gas', UD5: 'Ética y gestión ambiental en el servicio mecánico automotriz' }
  },
  'PROG-003': {
    'MOD-2026-AFICHE-003-1': { UD1: 'Seguridad industrial y organización del taller', UD2: 'Dibujo técnico aplicado', UD3: 'Metrología y trazado', UD4: 'Corte de materiales metálicos', UD5: 'Conformado básico y soldadura inicial', UD6: 'Competencias de empleabilidad' },
    'MOD-2026-AFICHE-003-2': { UD1: 'Seguridad industrial aplicada a soldadura especial y aluminio', UD2: 'Procesos de soldadura TIG en aluminio y aceros especiales', UD3: 'Procesos de soldadura MIG-MAG y corte por plasma', UD4: 'Fabricación de carpintería y cerrajería en aluminio', UD5: 'Tecnología de corte y unión láser', UD6: 'Gestión empresarial y control de calidad en construcciones metálicas' }
  },
  'PROG-004': {
    'MOD-2026-AFICHE-004-1': { UD1: 'Diagnóstico y tratamiento capilar', UD2: 'Corte de cabello', UD3: 'Peinados, colocación de postizos y extensiones', UD4: 'Diseño y corte de barba y bigote', UD5: 'Comunicación para el desarrollo personal y profesional', UD6: 'Aplicaciones de herramientas informáticas' },
    'MOD-2026-AFICHE-004-2': { UD1: 'Diagnóstico y tratamiento capilar', UD2: 'Anillados y ondulación permanente', UD3: 'Alisado permanente', UD4: 'Colorimetría y técnicas de coloración', UD5: 'Técnicas de decoloración', UD6: 'Emprendimiento', UD7: 'Ética y ciudadanía en el trabajo' }
  },
  'PROG-005': {
    'MOD-2026-AFICHE-005-1': { UD1: 'Sistema Operativo', UD2: 'Microsoft Word', UD3: 'Microsoft Excel', UD4: 'Microsoft PowerPoint', UD5: 'Comunicación para el desarrollo personal y profesional', UD6: 'Aplicaciones de herramientas informáticas' },
    'MOD-2026-AFICHE-005-2': { UD1: 'CorelDraw', UD2: 'Photoshop', UD3: 'Plataformas digitales', UD4: 'Plan de negocios', UD5: 'Comportamiento ético' }
  },
  'PROG-006': {
    'MOD-2026-AFICHE-006-1': { UD1: 'Técnicas de diseño y patronaje para confección de textiles para el hogar', UD2: 'Técnicas de tendido y tizado para confección de textiles para el hogar', UD3: 'Técnicas de corte y seguridad en confección de prendas de dama', UD4: 'Habilitado y control de calidad en confección de prendas de dama', UD5: 'Comunicación en el entorno laboral', UD6: 'Herramientas digitales para la confección' },
    'MOD-2026-AFICHE-006-2': { UD1: 'Habilitado de piezas para confección de prendas deportivas', UD2: 'Operatividad de máquinas para confección de prendas deportivas', UD3: 'Operaciones de ensamblaje para confección de prendas de varón', UD4: 'Acabados de confección de prendas de varón', UD5: 'Emprendimiento y gestión de negocios de confección', UD6: 'Ética y ciudadanía en el trabajo' }
  },
  'PROG-007': {
    'MOD-2026-AFICHE-007-1': { UD1: 'Herramientas y equipos del taller', UD2: 'Instrumentos de mediciones eléctricas', UD3: 'Instalaciones eléctricas en edificaciones', UD4: 'Comunicación oral y escrita', UD5: 'Herramientas digitales', UD6: 'Equipos eléctricos y electrónicos' },
    'MOD-2026-AFICHE-007-2': { UD1: 'Sistemas de seguridad y domótica', UD2: 'Mantenimiento de equipos de audio y video', UD3: 'Ideas de negocios', UD4: 'Ética en el trabajo' }
  }
};

function getDemoUnitName(programId, moduleId, code, defaultName) {
  if (defaultName && !/pendiente/i.test(defaultName) && !/^UD\d+:?\s*$/i.test(defaultName)) {
    return defaultName;
  }
  const progMap = DEMO_REFERENCE_UNITS[programId];
  if (progMap) {
    if (progMap[moduleId]?.[code]) return progMap[moduleId][code];
    const isM2 = String(moduleId).endsWith('-2') || String(moduleId).includes('002') || String(moduleId).includes('004') || String(moduleId).includes('006') || String(moduleId).includes('008') || String(moduleId).includes('010') || String(moduleId).includes('012') || String(moduleId).includes('014');
    for (const [mId, uMap] of Object.entries(progMap)) {
      if ((isM2 && mId.endsWith('-2')) || (!isM2 && mId.endsWith('-1'))) {
        if (uMap[code]) return uMap[code];
      }
    }
  }
  return defaultName || (code === 'UD2' ? 'Ofimática y Documentos Electrónicos' : code || 'Unidad Didáctica');
}

function curriculumFor(core,g){
 let curriculum=settings(core,{kind:'curriculum',target:g.moduleId});
 if(!curriculum.nombre){const m=core.record('modules',g.moduleId);if(m){const match=core.records('documentSettings').find(r=>r.scope?.kind==='curriculum'&&(r.scope.target===m.id||(r.fields?.nombre&&r.fields.nombre.toUpperCase()===(m.nombre||'').toUpperCase())));if(match?.fields)curriculum=match.fields;}}
 return curriculum;
}
const REGISTRY_PARAM_KEYS=['registerCode','registryCorrelative','registryLevelCode','programAcronym','registryShortRef','registryCodeYear','registryBook','registryFolio','registryNumber','registryDate','registryAsiento','ugelCode','referenceResolution','resolutionNumber','resolutionDate','expedienteNumber','expedienteDate','graduationDate','specialtyTeacher','tituladoName','officialTitleText','directorName','emissionDate','certRegisterCode','certCorrelative','certLevelCode','certProgramAcronym','certShortRef','certCodeYear','certEmissionDate','certReferenceResolution','certInstitutionName','certDirectorName','certSemesterLabel','certStudentName'];
function pickPresentKeys(source,keys){
 const out={};
 if(!source||typeof source!=='object')return out;
 for(const k of keys)if(present(source[k]))out[k]=source[k];
 return out;
}
function normalizeDni8(rawDni, isDemoFlag=false){
 const clean=String(rawDni??'').trim();
 if((!clean||clean==='PENDIENTE')&&!isDemoFlag)return '';
 if(!clean||clean==='PENDIENTE')return '00000000';
 const digits=clean.replace(/\D/g,'');
 if(digits.length>0&&digits.length===clean.length)return digits.slice(-8).padStart(8,'0');
 if(digits.length>=8)return digits.slice(0,8);
 return clean.replace(/[^A-Za-z0-9]/g,'').toUpperCase().padStart(8,'0').slice(0,8);
}
function buildInstitutionalRegisterCode({correlative,levelCode,dni,program,programAcronym,shortRef,intakeYear,codeYear,emissionYear,demoMode,isDemo,demoFill}={}){
 const corrNum=Number.parseInt(String(correlative??1),10);
 if(!Number.isFinite(corrNum)||corrNum<1)err('El correlativo institucional debe ser un entero positivo.');
 const corr6=String(corrNum).padStart(6,'0');
 const lvl=String(levelCode||'AT').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)||'AT';
 const isDemoFlag=Boolean(demoMode||isDemo||demoFill);
 const rawDni=String(dni??'').trim();
 if((!rawDni||rawDni==='PENDIENTE')&&!isDemoFlag)err('Se requiere el DNI del estudiante para generar el código de registro institucional.');
 const dni8=normalizeDni8(rawDni,isDemoFlag)||'00000000';
 const acronymOverride=String(programAcronym||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
 const acronym=acronymOverride.length>=2?acronymOverride:programAcronymFor(program);
 const yearInput=present(codeYear)?codeYear:emissionYear;
 const emMatch=/\d{4}/.exec(String(yearInput??''));
 const em4=emMatch?emMatch[0]:String(new Date().getFullYear());
 let ref2='';
 if(present(shortRef)){
  const cleanedRef=String(shortRef).trim().replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  if(cleanedRef)ref2=cleanedRef.slice(-2).padStart(2,'0');
 }
 if(!ref2){
  const inMatch4=/\d{4}/.exec(String(intakeYear??''));
  const inDigits=String(intakeYear??'').replace(/\D/g,'');
  ref2=inMatch4?inMatch4[0].slice(-2):(inDigits.length>=2?inDigits.slice(-2):em4.slice(-2));
 }
 return `${corr6}-${lvl}-${dni8}-${acronym}${ref2}-${em4}`;
}
function moduleOrderFor(core,modRecord,group,curriculum,programModules=[]){
 if(modRecord?.numeroModulo===1||modRecord?.numeroModulo===2)return modRecord.numeroModulo;
 if(modRecord?.moduleNumber===1||modRecord?.moduleNumber===2)return modRecord.moduleNumber;
 const tokens=[modRecord?.code,modRecord?.canonicalCode,modRecord?.id,group?.moduleId,group?.id].filter(Boolean).map(v=>String(v).trim());
 for(const t of tokens){
  if(/(?:^|[-_])M1(?=$|[-_])|-1$/i.test(t))return 1;
  if(/(?:^|[-_])M2(?=$|[-_])|-2$/i.test(t))return 2;
  const modMatch=/^MOD-(\d{3})$/i.exec(t);
  if(modMatch)return Number(modMatch[1])%2===1?1:2;
 }
 const modTitle=String(curriculum?.nombre||modRecord?.nombre||modRecord?.nombreOficial||'');
 if(/\bm[oó]dulo\s*(?:ii|2)\b/i.test(modTitle))return 2;
 if(/\bm[oó]dulo\s*(?:i|1)\b/i.test(modTitle))return 1;
 const period=String(group?.periodId||curriculum?.periodId||'');
 if(/-II(?:\b|$)/i.test(period))return 2;
 if(/-I(?:\b|$)/i.test(period))return 1;
 const idx=programModules.findIndex(m=>m.id===group?.moduleId);
 if(idx===0)return 1;
 if(idx===1)return 2;
 return null;
}
function resolveProgramTrajectory(core,actor,enrollment,group,programObj){
 const studentId=enrollment?.studentId;
 const programId=programObj?.id||group?.programId||null;
 const programName=programObj?.nombre||programObj?.name||core.record('programs',programId)?.nombre||'';
 const empty={studentId:studentId||null,programId,programName,module1:null,module2:null,modules:[],totalHours:0,totalCredits:0,hasBothModules:false,missingModules:['Módulo I','Módulo II']};
 if(!studentId||!programId)return empty;
 const Reference=require('./reference-defaults.cjs');
 const scopedGroups=(typeof core.scoped==='function'?core.scoped(actor,'groups'):core.records('groups')).filter(g=>!g.archived);
 const scopedEnrollments=typeof core.scoped==='function'?core.scoped(actor,'enrollments'):core.records('enrollments');
 const groupsById=new Map(scopedGroups.map(g=>[g.id,g]));
 const programModules=core.records('modules').filter(m=>(m.programaId||m.programId)===programId).sort((a,b)=>(a.numeroModulo||99)-(b.numeroModulo||99)||String(a.id).localeCompare(String(b.id)));
 const candidateEnrollments=scopedEnrollments.filter(e=>e.studentId===studentId&&(e.id===enrollment?.id||(e.active!==false&&e.moduleState!=='EXCLUDED')));
 const byOrder={1:[],2:[]};
 for(const e of candidateEnrollments){
  const g=groupsById.get(e.groupId);
  if(!g||g.programId!==programId)continue;
  const modRecord=core.record('modules',g.moduleId)||{};
  const curriculum=curriculumFor(core,g);
  const order=moduleOrderFor(core,modRecord,g,curriculum,programModules);
  if(order!==1&&order!==2)continue;
  const ref=Reference.get(core,g.moduleId);
  const modSettings=settings(core,{kind:'module',target:g.moduleId});
  const period=settings(core,{kind:'academicPeriod',target:g.periodId||curriculum.periodId});
  const enrSettings=settings(core,{kind:'enrollment',target:e.id});
  const practice=settings(core,{kind:'practice',target:e.id});
  const closure=settings(core,{kind:'closure',target:e.id});
  const mergedMod=Reference.merge(Reference.merge(modRecord,Reference.merge(ref.module,curriculum)),modSettings);
  const planUnits=(curriculum.unitsJson?JSON.parse(curriculum.unitsJson):[]).map(u=>Reference.merge(ref.units.find(r=>r.code===u.code),u));
  const unitRows=(g.units||planUnits.map(u=>u.code)).map(code=>({...planUnits.find(u=>u.code===code),...settings(core,{kind:'unitCurriculum',target:g.id,unit:code})}));
  const unitHours=unitRows.map(u=>u.hours).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
  const unitCredits=unitRows.map(u=>u.credits).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
  const rawHours=Number(mergedMod.hours);
  const rawCredits=Number(mergedMod.credits);
  const hours=(Number.isFinite(rawHours)&&rawHours>0)?rawHours:(unitHours.length?unitHours.reduce((a,b)=>a+b,0):(Number.isFinite(rawHours)&&rawHours>=0?rawHours:0));
  const credits=(Number.isFinite(rawCredits)&&rawCredits>0)?rawCredits:(unitCredits.length?unitCredits.reduce((a,b)=>a+b,0):(Number.isFinite(rawCredits)&&rawCredits>=0?rawCredits:0));
  const rawEfsrt=Number(mergedMod.efsrtHours);
  byOrder[order].push({
   order,
   enrollmentId:e.id,
   groupId:g.id,
   periodId:g.periodId||curriculum.periodId||null,
   moduleId:g.moduleId,
   moduleCode:modRecord.code||modRecord.canonicalCode||g.moduleId,
   moduleName:mergedMod.nombre||mergedMod.nombreOficial||curriculum.nombre||g.moduleId,
   hours,
   credits,
   efsrtHours:Number.isFinite(rawEfsrt)&&rawEfsrt>=0?rawEfsrt:0,
   modularGrade:closure.modularGrade??null,
   efsrtFinalGrade:practice.efsrtFinalGrade??null,
   condition:enrSettings.condition||null,
   startDate:e.startDate||period.fechaInicio||g.fechaInicio||null,
   endDate:e.endDate||period.fechaFin||g.fechaFin||null,
   provisional:Boolean(e.provisional),
   active:e.active!==false
  });
 }
 const pickBest=list=>{
  if(!list.length)return null;
  return list.slice().sort((a,b)=>{
   if((a.enrollmentId===enrollment?.id)!==(b.enrollmentId===enrollment?.id))return a.enrollmentId===enrollment?.id?-1:1;
   if(a.active!==b.active)return a.active?-1:1;
   if(a.provisional!==b.provisional)return a.provisional?1:-1;
   return String(b.periodId||'').localeCompare(String(a.periodId||''));
  })[0];
 };
 const module1=pickBest(byOrder[1]);
 const module2=pickBest(byOrder[2]);
 const modules=[module1,module2].filter(Boolean);
 const totalHours=(module1?.hours||0)+(module2?.hours||0);
 const totalCredits=(module1?.credits||0)+(module2?.credits||0);
 const hasBothModules=Boolean(module1&&module2);
 const missingModules=[...(module1?[]:['Módulo I']),...(module2?[]:['Módulo II'])];
 return {studentId,programId,programName,module1,module2,modules,totalHours,totalCredits,hasBothModules,missingModules};
}
function suggestInstitutionalRegistry(core,actor,{groupId,enrollmentId,emissionYear,dni,demoMode,correlative,levelCode,programAcronym,shortRef,codeYear,forceNext,templateId}={}){
 core.requireRole(actor,['DIRECTOR','SECRETARIA']);
 const isCert=String(templateId||'').trim().toUpperCase()==='TMPL-20';
 const enrollment=enrollmentId?core.record('enrollments',enrollmentId):null;
 if(enrollmentId&&!enrollment)err('Matrícula no encontrada.',404);
 const targetGroupId=groupId||enrollment?.groupId;
 const group=targetGroupId?core.record('groups',targetGroupId):null;
 if(enrollment&&enrollment.groupId!==targetGroupId)err('La matrícula seleccionada no pertenece al aula indicada.');
 if(!group)err('Grupo no encontrado.',404);
 core.requireGroup(actor,group.id);
 const student=enrollment?core.record('students',enrollment.studentId):null;
 const baseProgram=core.record('programs',group.programId)||{id:group.programId};
 const progSettings=settings(core,{kind:'program',target:group.programId});
 const modSettings=settings(core,{kind:'module',target:group.moduleId});
 const regSettings=enrollment?settings(core,{kind:'registry',target:enrollment.id}):{};
 const program={...baseProgram,...progSettings};
 const emMatch=/\d{4}/.exec(String(codeYear??(isCert?regSettings.certCodeYear:regSettings.registryCodeYear)??emissionYear??''));
 const resolvedCodeYear=emMatch?emMatch[0]:(/\d{4}/.exec(String(group.periodId||''))?.[0]||String(new Date().getFullYear()));
 let resolvedIntakeYear=resolvedCodeYear;
 if(enrollment){
  const traj=resolveProgramTrajectory(core,actor,enrollment,group,program);
  const yearCandidates=[traj.module1?.periodId,traj.module1?.startDate,enrollment.startDate,group.periodId,traj.module2?.periodId,traj.module2?.startDate]
   .map(v=>/\d{4}/.exec(String(v||''))?.[0])
   .filter(Boolean)
   .sort();
  if(yearCandidates.length)resolvedIntakeYear=yearCandidates[0];
 }else{
  const gMatch=/\d{4}/.exec(String(group.periodId||group.fechaInicio||''));
  if(gMatch)resolvedIntakeYear=gMatch[0];
 }
 const used=new Set();
 for(const r of core.records('documentSettings')){
  if(r.archived||r.scope?.kind!=='registry')continue;
  if(isCert){
   const certCode=r.fields?.certRegisterCode;
   if(typeof certCode==='string'){
    const title=TITLE_CODE.exec(certCode.trim());
    if(title&&title[5]===resolvedCodeYear)used.add(Number(title[1]));
   }
   continue;
  }
  const regCode=r.fields?.registerCode;
  if(typeof regCode==='string'){
   const title=TITLE_CODE.exec(regCode.trim());
   if(title&&title[5]===resolvedCodeYear)used.add(Number(title[1]));
   const m=/^(\d{1,6})-[A-Z]{2,4}-(?:[A-Z0-9]+-)?(\d{4})?$/i.exec(regCode.trim());
   if(m&&(!m[2]||m[2]===resolvedCodeYear))used.add(Number(m[1]));
  }
  const rd=r.fields?.resolutionNumber;
  if(typeof rd==='string'){
   const m=/^(\d{1,6})-(\d{4})(?:-|$)/.exec(rd.trim());
   if(m&&m[2]===resolvedCodeYear)used.add(Number(m[1]));
  }
 }
 for(const r of core.records('documentEmissions')){
  if(r.demoMode||r.isDraft)continue;
  if(isCert&&r.templateId!=='TMPL-20')continue;
  if(!isCert&&r.templateId==='TMPL-20')continue;
  if(typeof r.registerCode==='string'){
   const title=TITLE_CODE.exec(r.registerCode.trim());
   if(title&&title[5]===resolvedCodeYear)used.add(Number(title[1]));
   const m=/^(\d{1,6})-[A-Z]{2,4}-(?:[A-Z0-9]+-)?(\d{4})?$/i.exec(r.registerCode.trim());
   const recYear=m?.[2]||(r.year?String(r.year):null);
   if(m&&(!recYear||recYear===resolvedCodeYear))used.add(Number(m[1]));
  }
  if(!isCert&&typeof r.resolutionNumber==='string'){
   const m=/^(\d{1,6})-(\d{4})(?:-|$)/.exec(r.resolutionNumber.trim());
   if(m&&m[2]===resolvedCodeYear)used.add(Number(m[1]));
  }
 }
 let resolvedCorrelative;
 const savedCorr=isCert?regSettings.certCorrelative:regSettings.registryCorrelative;
 if(!forceNext&&(present(correlative)||present(savedCorr))){
  const rawCorr=present(correlative)?correlative:savedCorr;
  const parsed=Number.parseInt(String(rawCorr),10);
  if(Number.isFinite(parsed)&&parsed>=1)resolvedCorrelative=parsed;
 }
 if(!resolvedCorrelative){
  let maxUsed=0;
  for(const n of used)if(Number.isInteger(n)&&n>maxUsed)maxUsed=n;
  resolvedCorrelative=maxUsed+1;
  while(used.has(resolvedCorrelative))resolvedCorrelative++;
 }
 const correl6=String(resolvedCorrelative).padStart(6,'0');
 const rawLevel=present(levelCode)?levelCode:(isCert?regSettings.certLevelCode:regSettings.registryLevelCode);
 const resolvedLevel=String(rawLevel||'AT').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)||'AT';
 const rawAcronym=present(programAcronym)?programAcronym:(isCert?regSettings.certProgramAcronym:regSettings.programAcronym);
 const resolvedAcronym=(String(rawAcronym||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))||programAcronymFor(program);
 const rawShortRef=present(shortRef)?shortRef:(isCert?regSettings.certShortRef:regSettings.registryShortRef);
 const cleanShortRef=String(rawShortRef||'').trim().replace(/[^A-Za-z0-9]/g,'').toUpperCase();
 const resolvedShortRef=cleanShortRef?cleanShortRef.slice(-2).padStart(2,'0'):resolvedIntakeYear.slice(-2);
 const rawDni=enrollment?(student?.documentNumber??student?.document):dni;
 if(!demoMode&&!/^\d{8}$/.test(String(rawDni??'')))err('El estudiante debe tener un DNI válido de ocho dígitos.');
 const resolvedDni8=normalizeDni8(rawDni,Boolean(demoMode))||'00000000';
 const registerCode=buildInstitutionalRegisterCode({correlative:resolvedCorrelative,levelCode:resolvedLevel,dni:rawDni,program,programAcronym:resolvedAcronym,shortRef:resolvedShortRef,intakeYear:resolvedIntakeYear,codeYear:resolvedCodeYear,emissionYear:resolvedCodeYear,demoMode:Boolean(demoMode)});
 const resolvedRefRes=(isCert?regSettings.certReferenceResolution:'')||regSettings.referenceResolution||progSettings.resolucionPrograma||modSettings.resolucionAutorizacion||'';
 return {correlative:resolvedCorrelative,correlativeFormatted:correl6,levelCode:resolvedLevel,dni:resolvedDni8,programAcronym:resolvedAcronym,shortRef:resolvedShortRef,codeYear:resolvedCodeYear,registerCode,resolutionNumber:`${correl6}-${resolvedCodeYear}-DCETPROMB-SM`,referenceResolution:resolvedRefRes,intakeYear:resolvedIntakeYear,emissionYear:resolvedCodeYear};
}
function enrich(core,actor,base){
 const isDemo=base.demoFill===true;
 const g=base.group,inst=settings(core,{kind:'institution'}),prog=settings(core,{kind:'program',target:g.programId}),mod=settings(core,{kind:'module',target:g.moduleId}),group=settings(core,{kind:'group',target:g.id});
 const curriculum=curriculumFor(core,g);
 let period=settings(core,{kind:'academicPeriod',target:g.periodId});
 if(!period.fechaInicio&&curriculum.periodId){const pRec=core.record('documentSettings',`academicPeriod:${curriculum.periodId}`);if(pRec?.fields)period=pRec.fields;}
 const year=settings(core,{kind:'academicYear',target:String(period.year||g.periodId||'').slice(0,4)});
 const Reference=require('./reference-defaults.cjs'),reference=Reference.get(core,g.moduleId);
 const plan=(curriculum.unitsJson?JSON.parse(curriculum.unitsJson):[]).map(u=>Reference.merge(reference.units.find(r=>r.code===u.code),u));
 const units=g.units.map((code,index)=>({code,order:index+1})).filter(u=>u.code!=='EFSRT'&&(actor.role!=='DOCENTE'||core.assignment(actor,g.id,u.code))).map(({code,order})=>({code,order,...plan.find(u=>u.code===code),...settings(core,{kind:'unit',target:g.id,unit:code}),...settings(core,{kind:'unitCurriculum',target:g.id,unit:code})}));const selected=units.find(u=>u.code===base.unit)||null;
 const teachers=core.users().filter(u=>u.active&&u.role==='DOCENTE'&&u.assignments.some(a=>a.groupId===g.id&&(!base.unit||a.units.includes(base.unit))));
 const teacher=isDemo?(actor.role==='DOCENTE'?actor.name:(group.teacherName||(teachers[0]?.name||'Gonsalo Guzmán Jordán'))):(actor.role==='DOCENTE'?actor.name:group.teacherName||(teachers.length===1?teachers[0].name:''));
 let students=base.students.slice().sort((a,b)=>(a.student?.name||'').localeCompare(b.student?.name||'','es')).map(row=>{
  const s=row.student||{},parsed=splitNameParts(s.name),docStr=String(s.document||'').trim();
  const higherScopeRegistry={
   ...pickPresentKeys(inst,REGISTRY_PARAM_KEYS),
   ...pickPresentKeys(year,REGISTRY_PARAM_KEYS),
   ...pickPresentKeys(period,REGISTRY_PARAM_KEYS),
   ...pickPresentKeys(prog,REGISTRY_PARAM_KEYS),
   ...pickPresentKeys(mod,REGISTRY_PARAM_KEYS),
   ...pickPresentKeys(group,REGISTRY_PARAM_KEYS)
  };
  const enrichedStudent={...s,documentNumber:s.documentNumber??s.document??'',lastName1:s.lastName1??s.legacy?.apellidoPaterno??parsed.lastName1,lastName2:s.lastName2??s.legacy?.apellidoMaterno??parsed.lastName2,firstNames:s.firstNames??s.legacy?.nombres??parsed.firstNames,documentType:s.documentType??s.legacy?.tipoDocumento??(/^\d{8}$/.test(docStr)?'DNI':'')};
  const regParams={...higherScopeRegistry,...settings(core,{kind:'enrollment',target:row.enrollment.id}),...settings(core,{kind:'registry',target:row.enrollment.id}),...settings(core,{kind:'practice',target:row.enrollment.id}),...settings(core,{kind:'closure',target:row.enrollment.id}),code:row.enrollment.code||enrollmentCode(core,row.enrollment.studentId,row.enrollment.id)};
  if(base.templateId!=='TMPL-21'&&!present(regParams.registerCode)&&present(regParams.registryCorrelative)&&present(enrichedStudent.documentNumber)){
   regParams.registerCode=buildInstitutionalRegisterCode({correlative:regParams.registryCorrelative,levelCode:regParams.registryLevelCode,dni:enrichedStudent.documentNumber,program:{...base.program,...prog},programAcronym:regParams.programAcronym,shortRef:regParams.registryShortRef,intakeYear:g.periodId,codeYear:regParams.registryCodeYear,emissionYear:regParams.registryCodeYear||regParams.emissionDate||g.periodId});
  }
  if(present(regParams.registerCode)){
   const m=/^(\d{1,6})-([A-Z0-9]{2,4})-([A-Z0-9]{8})-([A-Z]{2,6})(\d{2})-(\d{4})$/i.exec(String(regParams.registerCode).trim());
   if(m){
    if(!present(regParams.registryCorrelative))regParams.registryCorrelative=m[1].padStart(6,'0');
    if(!present(regParams.registryLevelCode))regParams.registryLevelCode=m[2].toUpperCase();
    if(!present(regParams.programAcronym))regParams.programAcronym=m[4].toUpperCase();
    if(!present(regParams.registryShortRef))regParams.registryShortRef=m[5];
    if(!present(regParams.registryCodeYear))regParams.registryCodeYear=m[6];
   }
  }
  if(!present(regParams.referenceResolution)){
   regParams.referenceResolution=prog.resolucionPrograma||mod.resolucionAutorizacion||'';
  }
  if(base.templateId==='TMPL-21'&&base.official2026===true){
   const registry=settings(core,{kind:'registry',target:row.enrollment.id});
   regParams.registerCode=registry.registerCode||'';
   regParams.ugelCode=registry.ugelCode||'';
   regParams.emissionDate=registry.titleEmissionDate||regParams.emissionDate;
   regParams.tituladoName=registry.tituladoName||regParams.tituladoName||'';
   regParams.officialTitleText=registry.officialTitleText||regParams.officialTitleText||'';
   regParams.referenceResolution=registry.referenceResolution||regParams.referenceResolution||'';
   regParams.directorName=registry.directorName||inst.directorNombre||'';
   if(present(registry.registryCorrelative))regParams.registryCorrelative=registry.registryCorrelative;
   if(present(registry.registryLevelCode))regParams.registryLevelCode=registry.registryLevelCode;
   if(present(registry.programAcronym))regParams.programAcronym=registry.programAcronym;
   if(present(registry.registryShortRef))regParams.registryShortRef=registry.registryShortRef;
   if(present(registry.registryCodeYear))regParams.registryCodeYear=registry.registryCodeYear;
  }
  if(base.templateId==='TMPL-20'&&base.official2026===true){
   const registry=settings(core,{kind:'registry',target:row.enrollment.id});
   let certCode=present(registry.certRegisterCode)?registry.certRegisterCode:'';
   if(!certCode&&present(registry.certCorrelative)&&present(enrichedStudent.documentNumber)){
    certCode=buildInstitutionalRegisterCode({correlative:registry.certCorrelative,levelCode:registry.certLevelCode,dni:enrichedStudent.documentNumber,program:{...base.program,...prog},programAcronym:registry.certProgramAcronym,shortRef:registry.certShortRef,intakeYear:g.periodId,codeYear:registry.certCodeYear,emissionYear:registry.certCodeYear||registry.certEmissionDate||g.periodId});
   }
   if(!certCode&&present(registry.registerCode)){
    certCode=registry.registerCode;
   }
   regParams.registerCode=certCode;
   regParams.certRegisterCode=certCode;
   const certMatch=TITLE_CODE.exec(String(certCode||'').trim());
   if(certMatch){
    regParams.certCorrelative=registry.certCorrelative||certMatch[1];
    regParams.certLevelCode=registry.certLevelCode||'AT';
    regParams.certProgramAcronym=registry.certProgramAcronym||certMatch[3];
    regParams.certShortRef=registry.certShortRef||certMatch[4];
    regParams.certCodeYear=registry.certCodeYear||certMatch[5];
    regParams.registryCorrelative=regParams.certCorrelative;
    regParams.registryLevelCode=regParams.certLevelCode;
    regParams.programAcronym=regParams.certProgramAcronym;
    regParams.registryShortRef=regParams.certShortRef;
    regParams.registryCodeYear=regParams.certCodeYear;
   }
   regParams.emissionDate=registry.certEmissionDate||regParams.emissionDate;
   regParams.certEmissionDate=regParams.emissionDate;
   regParams.referenceResolution=registry.certReferenceResolution||registry.referenceResolution||regParams.referenceResolution||prog.resolucionPrograma||mod.resolucionAutorizacion||'';
   regParams.certReferenceResolution=regParams.referenceResolution;
   regParams.institutionName=registry.certInstitutionName||regParams.companyName||'CETPRO Micaela Bastidas';
   regParams.certInstitutionName=regParams.institutionName;
   regParams.directorName=registry.certDirectorName||registry.directorName||inst.directorNombre||'';
   regParams.certDirectorName=regParams.directorName;
   regParams.certStudentName=registry.certStudentName||regParams.certStudentName||'';
   const modOrder=moduleOrderFor(core,base.module,g.programId);
   const defaultSem=modOrder===2?'II Semestre':'I Semestre';
   regParams.semesterLabel=registry.certSemesterLabel||defaultSem;
   regParams.certSemesterLabel=regParams.semesterLabel;
  }
  return {...row,student:enrichedStudent,parameters:regParams};
 });
 const realSingleRow=base.students.length===1?students[0]:null;
 if(isDemo){
  const demoUnitCount=(units.length||6),demoEndDate=period.fechaFin||'2026-07-31';
  const demoAcronym=programAcronymFor({...base.program,...prog})||'CI';
  const demoRefRes=prog.resolucionPrograma||mod.resolucionAutorizacion||'';
  students=DEMO_STUDENT_NAMES.map((item,idx)=>{
   const parts=item.name.split(', '),lastParts=(parts[0]||'').split(' '),lastName1=lastParts[0]||'',lastName2=lastParts.slice(1).join(' ')||'',firstNames=parts[1]||'';
   const sId=`demo-std-${idx+1}`,eId=`demo-enr-${idx+1}`,code=`MAT-2026-${String(idx+1).padStart(3,'0')}`;
   const corr6=String(idx+1).padStart(6,'0');
   const demoRegCode=`${corr6}-AT-${item.doc}-${demoAcronym}25-2026`;
   const demoUgelCode=`${corr6}-AT-${String(idx+1).padStart(5,'0')}-${demoAcronym}25-2026`;
   const condition=idx%10===9?'B':idx%5===4?'P':'G';
   const baseDemoParams={code,condition,approvalMinimum:13,criterion1:3,criterion2:2,criterion3:2,criterion4:2,criterion5:3,criterion6:2,criterion7:1,criterion8:2,criterion9:1,efsrtFinalGrade:18,modularGrade:14+((idx*2)%6),approvedUnitsCount:demoUnitCount,failedUnitsCount:0,observations:'Aprobado satisfactoriamente',companyName:'MUNICIPALIDAD PROVINCIAL DE SAN ROMÁN',companyAddress:'JR. JÁUREGUI N° 123, JULIACA',emissionDate:demoEndDate,registerCode:demoRegCode,registryCorrelative:corr6,registryLevelCode:'AT',programAcronym:demoAcronym,registryShortRef:'25',registryCodeYear:'2026',ugelCode:demoUgelCode,referenceResolution:demoRefRes,registryBook:'LIBRO 01',registryFolio:String(idx+1).padStart(3,'0'),registryNumber:String(idx+1).padStart(4,'0'),registryDate:demoEndDate,registryAsiento:`ASIENTO N° ${String(idx+1).padStart(3,'0')} - FOLIO ${String(idx+1).padStart(3,'0')}`};
   const rowParams=idx===0&&realSingleRow?{...baseDemoParams,...pickPresentKeys(realSingleRow.parameters,REGISTRY_PARAM_KEYS)}:baseDemoParams;
   return {
    enrollment:{id:eId,studentId:sId,groupId:g.id,periodId:g.periodId||'2026-II',moduleId:g.moduleId,startDate:null,active:true,code},
    student:{id:sId,name:item.name,document:item.doc,documentType:'DNI',sex:item.sex,birthDate:item.birth,lastName1,lastName2,firstNames,active:true,archived:false},
    parameters:rowParams
   };
  });
 }
 const institution={...base.institution,...inst,...(year.institutionJson?JSON.parse(year.institutionJson):{})};
 if(isDemo){
  if(!institution.nombre||institution.nombre==='Institución')institution.nombre='CETPRO MICAELA BASTIDAS';
  if(!institution.name)institution.name=institution.nombre;
  if(!institution.dre)institution.dre='DRE PUNO';
  if(!institution.ugel)institution.ugel='UGEL SAN ROMÁN';
  if(!institution.region)institution.region='PUNO';
  if(!institution.codigoModular)institution.codigoModular='0734567';
  if(!institution.tipoGestion)institution.tipoGestion='PÚBLICA';
  if(!institution.direccion)institution.direccion='JR. TACNA N° 245';
  if(!institution.distrito)institution.distrito='JULIACA';
  if(!institution.provincia)institution.provincia='SAN ROMÁN';
  if(!institution.departamento)institution.departamento='PUNO';
  if(!institution.lugar)institution.lugar='JULIACA';
  if(!institution.telefono)institution.telefono='051-321456';
  if(!institution.resolucionAutorizacion)institution.resolucionAutorizacion='RD N° 0125-1988-ED';
  if(!institution.resolucionConversion)institution.resolucionConversion='RD N° 0450-2022-DREP';
  if(!institution.directorNombre)institution.directorNombre='MG. ELOY PAREDES FELICIANO';
  if(!institution.secretariaNombre)institution.secretariaNombre='CARMEN VILCA PUMA';
  if(!institution.coordinadorNombre)institution.coordinadorNombre='LIC. CARLOS MAMANI QUISPE';
 }
 institution.resolucion=[institution.resolucionAutorizacion||institution.resolucionAutorizacion1||'',institution.resolucionConversion||institution.resolucionAutorizacion2||''].filter(Boolean).join(' / ');if(!present(institution.nombre))institution.nombre=base.institution.name;
 const efsrt=plan.find(u=>u.code==='EFSRT')||{};
 const {AcademicCalendarEngine}=require('./academic-calendar-engine.cjs');
 const calendarEngine=new AcademicCalendarEngine();
 let academicDates=[],academicMonthSpans=[];
 const docNum=Number(base.templateId.slice(5));
 let unitFilteredAttendance=(base.attendance||[]);
 if(docNum>=5&&docNum<=10){
  let unitDates=selected?.fechaInicio?selected:(base.attendance?.length?null:selected);
  const isSem1 = g.periodId === '2026-I' || (!String(g.periodId||'').includes('II') && !String(g.id||'').includes('-M2'));
  const demoSchedulesSem1 = {
    UD1: { fechaInicio: '2026-03-16', fechaFin: '2026-04-03' },
    UD2: { fechaInicio: '2026-04-06', fechaFin: '2026-04-24' },
    UD3: { fechaInicio: '2026-04-27', fechaFin: '2026-05-15' },
    UD4: { fechaInicio: '2026-05-18', fechaFin: '2026-06-05' },
    UD5: { fechaInicio: '2026-06-08', fechaFin: '2026-06-26' },
    UD6: { fechaInicio: '2026-06-29', fechaFin: '2026-07-17' },
    UD7: { fechaInicio: '2026-07-06', fechaFin: '2026-07-24' }
  };
  const demoSchedulesSem2 = {
    UD1: { fechaInicio: '2026-08-10', fechaFin: '2026-09-04' },
    UD2: { fechaInicio: '2026-09-07', fechaFin: '2026-10-02' },
    UD3: { fechaInicio: '2026-10-05', fechaFin: '2026-10-30' },
    UD4: { fechaInicio: '2026-11-02', fechaFin: '2026-11-27' },
    UD5: { fechaInicio: '2026-11-30', fechaFin: '2026-12-18' },
    UD6: { fechaInicio: '2026-11-23', fechaFin: '2026-12-18' },
    UD7: { fechaInicio: '2026-12-01', fechaFin: '2026-12-18' }
  };
  if(isDemo&&(!unitDates?.fechaInicio||!unitDates?.fechaFin)){
   const sched = (isSem1 ? demoSchedulesSem1 : demoSchedulesSem2)[base.unit || 'UD1'] || (isSem1 ? demoSchedulesSem1.UD1 : demoSchedulesSem2.UD1);
   unitDates={...unitDates,fechaInicio:unitDates?.fechaInicio||sched.fechaInicio,fechaFin:unitDates?.fechaFin||sched.fechaFin};
  }
  if (unitDates?.fechaInicio || unitDates?.fechaFin || base.unit) {
   unitFilteredAttendance = (base.attendance || []).filter(a => {
     const d = a.date || a.fecha;
     if (base.unit && a.unit && a.unit !== base.unit) return false;
     if (unitDates?.fechaInicio && d && d < unitDates.fechaInicio) return false;
     if (unitDates?.fechaFin && d && d > unitDates.fechaFin) return false;
     return true;
   });
  }
  const consolidatedMap = new Map();
  const sortedAtt = [...unitFilteredAttendance].sort((a, b) => {
    const timeA = a.updatedAt || a.createdAt || '';
    const timeB = b.updatedAt || b.createdAt || '';
    if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB);
    const revA = Number(a.rev) || 0;
    const revB = Number(b.rev) || 0;
    if (revA !== revB) return revB - revA;
    if (a.session !== '1' && b.session === '1') return 1;
    return 0;
  });
  for (const item of sortedAtt) {
    const d = item.date || item.fecha;
    if (!d || !item.enrollmentId) continue;
    const key = `${item.enrollmentId}|${d}`;
    const prev = consolidatedMap.get(key);
    if (prev && prev.value && (!item.value || item.pending)) continue;
    consolidatedMap.set(key, { ...item, date: d, fecha: d, session: '1' });
  }
  unitFilteredAttendance = Array.from(consolidatedMap.values());
  if(unitDates?.fechaInicio){
   const res=calendarEngine.resolveAcademicDates({fechaInicio:unitDates.fechaInicio,fechaFin:unitDates.fechaFin||undefined,diasClase:g.diasClase||[1,2,3,4,5],targetDays:unitDates.days||undefined,recordedSessions:isDemo?[]:unitFilteredAttendance});
   if(res.success){academicDates=res.dates;academicMonthSpans=res.monthSpans;}
  }else if(unitFilteredAttendance.length){
   const res=calendarEngine.resolveAcademicDates({recordedSessions:unitFilteredAttendance});
   if(res.success){academicDates=res.dates;academicMonthSpans=res.monthSpans;}
  }
  if(isDemo&&academicDates.length===0){
   const sched = (isSem1 ? demoSchedulesSem1 : demoSchedulesSem2)[base.unit || 'UD1'] || (isSem1 ? demoSchedulesSem1.UD1 : demoSchedulesSem2.UD1);
   const res=calendarEngine.resolveAcademicDates({fechaInicio:sched.fechaInicio,fechaFin:sched.fechaFin,diasClase:[1,2,3,4,5]});
   if(res.success){academicDates=res.dates;academicMonthSpans=res.monthSpans;}
  }
 }
 let attendance=(docNum>=5&&docNum<=10)?unitFilteredAttendance:base.attendance;
 if(isDemo&&(docNum>=5&&docNum<=10)&&academicDates.length>0){
  attendance=[];
  for(let sIdx=0;sIdx<students.length;sIdx++){
   const row=students[sIdx];
   for(let dIdx=0;dIdx<academicDates.length;dIdx++){
    const d=academicDates[dIdx];
    const seed=(sIdx*7+dIdx*13)%100;
    let val='P';
    if(seed>=95)val='J';
    else if(seed>=90)val='F';
    else if(seed>=84)val='T';
    else val='P';
    attendance.push({
     id:digest(`attendance:${row.enrollment.id}:${base.unit}:${d.fecha}:1`),
     enrollmentId:row.enrollment.id,
     groupId:g.id,
     periodId:g.periodId||'2026-II',
     moduleId:g.moduleId,
     unit:base.unit,
     date:d.fecha,
     session:'1',
     value:val
    });
   }
  }
 }
 let grades=base.grades;
 if(isDemo&&(docNum>=11&&docNum<=20)){
  grades=[];
  for(let sIdx=0;sIdx<students.length;sIdx++){
   const row=students[sIdx];
   const unitList=units.length?units:[{code:base.unit||'UD1'}];
   for(const u of unitList){
    for(let i=1;i<=5;i++){
     const baseScore=13+((sIdx*3+i*5)%7);
     for(const [cIdx,comp] of ['IA1','IA2','IA3'].entries()){
      const cScore=Math.min(20,Math.max(13,baseScore+(cIdx-1)));
      grades.push({id:digest(`grade:${row.enrollment.id}:${u.code}:IL${i}.${comp}`),enrollmentId:row.enrollment.id,groupId:g.id,unit:u.code,indicator:`IL${i}.${comp}`,value:cScore});
     }
     grades.push({id:digest(`grade:${row.enrollment.id}:${u.code}:IL${i}`),enrollmentId:row.enrollment.id,groupId:g.id,unit:u.code,indicator:`IL${i}`,value:baseScore});
    }
    grades.push({id:digest(`grade:${row.enrollment.id}:${u.code}:RESULTADO_UD`),enrollmentId:row.enrollment.id,groupId:g.id,unit:u.code,indicator:'RESULTADO_UD',value:14+((sIdx*2)%6)});
   }
  }
 }
 const modObj={...base.module,...Reference.merge(reference.module,curriculum),...mod,...(isDemo?{presenceStates:mod.presenceStates||'P,T',absenceStates:mod.absenceStates||'F,J',absenceDenominator:mod.absenceDenominator||'REGISTRADAS',approvalMinimum:mod.approvalMinimum||13,hours:mod.hours||528,credits:mod.credits||22,efsrtHours:mod.efsrtHours||192,resolucionAutorizacion:mod.resolucionAutorizacion||institution.resolucionConversion||'RD N° 0450-2022-DREP',competence:mod.competence||'Realiza procesos operativos y técnicos de la especialidad aplicando normas de seguridad, higiene y control de calidad.'}:{})};
  let demoUnitName = selected?.name || '';
  if (!demoUnitName || /pendiente de confirmar/i.test(demoUnitName)) {
   demoUnitName = getDemoUnitName(g.programId, g.moduleId, base.unit || 'UD1', selected?.name);
  }
  const cleanDemoUnitName = demoUnitName.replace(/^UD\d+:\s*/i, '').trim();
  const unitCapacity = selected?.capacity || (isDemo ? `Aplica técnicas, herramientas y normas de seguridad en el desarrollo de competencias de ${cleanDemoUnitName.toLowerCase()}.` : '');
  const unitInd1 = selected?.indicator1 || (isDemo ? `Organiza materiales, equipos y procedimientos técnicos para ${cleanDemoUnitName.toLowerCase()}.` : '');
  const unitInd2 = selected?.indicator2 || (isDemo ? `Ejecuta procesos operativos y destrezas técnicas en ${cleanDemoUnitName.toLowerCase()} con precisión.` : '');
  const unitInd3 = selected?.indicator3 || (isDemo ? `Verifica el control de calidad, acabado final y buenas prácticas ambientales en el taller.` : '');
  const unitInd4 = selected?.indicator4 || (isDemo ? `Resuelve situaciones operativas y aplica criterios técnicos de mantenimiento en ${cleanDemoUnitName.toLowerCase()}.` : '');
  const unitInd5 = selected?.indicator5 || (isDemo ? `Presenta el producto o servicio terminado cumpliendo estándares técnicos y tiempos establecidos.` : '');
  const resolvedUnitFechaInicio = (docNum>=5&&docNum<=10&&academicDates.length)?academicDates[0].fecha:(selected?.fechaInicio||'');
  const resolvedUnitFechaFin = (docNum>=5&&docNum<=10&&academicDates.length)?academicDates[academicDates.length-1].fecha:(selected?.fechaFin||'');
  const unitMonthsLabel = computeMonthsLabel(academicMonthSpans, resolvedUnitFechaInicio, resolvedUnitFechaFin);
  const unitData = isDemo ? {
   ...selected,
   code: base.unit || selected?.code || 'UD1',
   name: demoUnitName,
   fechaInicio: resolvedUnitFechaInicio,
   fechaFin: resolvedUnitFechaFin,
   unitFechaInicio: resolvedUnitFechaInicio,
   unitFechaFin: resolvedUnitFechaFin,
   unitMonthsLabel,
   capacity: unitCapacity,
   indicator1: unitInd1,
   indicator2: unitInd2,
   indicator3: unitInd3,
   indicator4: unitInd4,
   indicator5: unitInd5
  } : (selected ? {
   ...selected,
   fechaInicio: selected.fechaInicio || resolvedUnitFechaInicio,
   fechaFin: selected.fechaFin || resolvedUnitFechaFin,
   unitFechaInicio: selected.fechaInicio || resolvedUnitFechaInicio,
   unitFechaFin: selected.fechaFin || resolvedUnitFechaFin,
   unitMonthsLabel
  } : null);
  const enrichedUnits = units.map(u => {
   if (!isDemo) return u;
   const uName = getDemoUnitName(g.programId, g.moduleId, u.code, u.name);
   const cleanUName = (uName || '').replace(/^UD\d+:\s*/i, '').trim();
   return {
    ...u,
    name: uName,
    hours: u.hours || 88,
    credits: u.credits || 4,
    capacity: u.capacity || `Desarrolla competencias operativas y destrezas técnicas en ${cleanUName.toLowerCase()}.`
   };
  });
  const efsrtUnit = { ...efsrt, ...settings(core,{kind:'unit',target:g.id,unit:'EFSRT'}), ...settings(core,{kind:'unitCurriculum',target:g.id,unit:'EFSRT'}), ...(isDemo?{hours:modObj.efsrtHours||192,credits:efsrt.credits||6,capacity:efsrt.capacity||'Consolida desempeños técnicos en situaciones reales de trabajo cumpliendo estándares de calidad y seguridad.'}:{}) };
  const progName = curriculum.programName || base.program?.nombre || '';
  const singleEnrollmentRow = base.students.length === 1 && base.students[0]?.enrollment ? base.students[0] : null;
  const trajectory = singleEnrollmentRow ? resolveProgramTrajectory(core, actor, singleEnrollmentRow.enrollment, g, base.program) : null;
  const programObj = {...base.program,...(curriculum.programName?{nombre:curriculum.programName}:{}),...(curriculum.nivelFormativo?{nivelFormativo:curriculum.nivelFormativo}:{}),...prog,...(trajectory&&(docNum===22||docNum===23||base.official2026===true)?{name:progName||base.program?.name||'',totalHours:trajectory.totalHours,totalCredits:trajectory.totalCredits}:{}),...(isDemo?{nivelFormativo:prog.nivelFormativo||curriculum.nivelFormativo||'Auxiliar Técnico',tipoPlan:prog.tipoPlan||'Modular',resolucionPrograma:prog.resolucionPrograma||institution.resolucionAutorizacion||'RD N° 0125-1988-ED',officialTitleText:prog.officialTitleText||`AUXILIAR TÉCNICO EN ${(progName||'COMPUTACIÓN E INFORMÁTICA').toUpperCase()}`}:{})};
  const groupObj = {...g,fechaInicio:period.fechaInicio||'',fechaFin:period.fechaFin||'',ciclo:curriculum.nivelFormativo||'',turno:curriculum.turno||g.turno||'',periodClase:g.periodId,efsrtInicio:efsrt.fechaInicio||'',efsrtFin:efsrt.fechaFin||'',...group,seccion:core.groupSection(g)||group.seccion||'',...(isDemo?{fechaInicio:group.fechaInicio||period.fechaInicio||'2026-03-16',fechaFin:group.fechaFin||period.fechaFin||'2026-07-24',ciclo:group.ciclo||curriculum.nivelFormativo||'Auxiliar Técnico',turno:group.turno||curriculum.turno||g.turno||'MAÑANA',seccion:core.groupSection(g)||group.seccion||'A',modalidad:group.modalidad||g.modalidad||'PRESENCIAL',periodClase:group.periodClase||g.periodId||'2026-I',efsrtInicio:group.efsrtInicio||efsrt.fechaInicio||'2026-06-15',efsrtFin:group.efsrtFin||efsrt.fechaFin||'2026-07-24'}:{})};
  const doc={...base,catalogName:templateName(base.templateId),trajectory,attendance,grades,demoFill:isDemo,demoMode:isDemo,institution:{...institution,name:institution.nombre},program:programObj,module:modObj,group:groupObj,units:enrichedUnits,efsrtUnit,unitCode:base.unit,unitData,teacher,students,academicDates,academicMonthSpans,unitFechaInicio:resolvedUnitFechaInicio,unitFechaFin:resolvedUnitFechaFin,unitMonthsLabel,parameters:(students.length===1||base.students.length===1||[2,20,21,22,23].includes(docNum))?(students[0]?.parameters||{}):{}};
 doc.preflight=preflight(doc);
 if(isDemo){
  doc.preflight.complete=true;
  doc.preflight.missing=[];
  doc.preflight.filled=doc.preflight.total;
  for(const f of doc.preflight.fields){f.status='READY';if(!f.value)f.value='Simulado en modo demostración';}
 }
 if(plan.length&&!isDemo){const mismatches=['hours','credits'].filter(key=>plan.every(u=>typeof u[key]==='number')&&typeof curriculum[key]==='number'&&plan.reduce((n,u)=>n+u[key],0)!==curriculum[key]);if(mismatches.length){doc.preflight.fields.push({key:'module.curriculumConsistency',label:'Confirmar totales de horas y créditos del plan',value:'',status:'MISSING',source:'Dirección: las unidades no suman el total declarado del módulo'});doc.preflight.missing.push({key:'module.curriculumConsistency',source:'Configuración por año',count:1});doc.preflight.total++;doc.preflight.complete=false;}}
 doc.warnings=[];if(!isDemo&&doc.students.some(r=>r.enrollment.provisional))doc.warnings.push('Hay matrículas provisionales: confirme la pertenencia al módulo antes de emitir actas o certificados.');if(!isDemo&&plan.some(u=>u.confirmed===false))doc.warnings.push('El afiche confirma el módulo, pero falta confirmar su plan de unidades.');
 if(!isDemo)for(const [key,label,missing] of [['module.planConfirmed','Confirmar unidades del módulo',plan.some(u=>u.confirmed===false)],['enrollments.moduleConfirmed','Confirmar pertenencia al módulo',[19,20,21,22,23].includes(Number(doc.templateId.slice(5)))&&doc.students.some(r=>r.enrollment.provisional)]])if(missing){doc.preflight.fields.push({key,label,value:'',status:'MISSING',source:'Dirección: configuración pendiente'});doc.preflight.missing.push({key,source:'Configuración por año / Matrículas',count:1});doc.preflight.total++;doc.preflight.complete=false;}
 if(docNum===21&&base.official2026===true&&!isDemo){
  const {registerCode,ugelCode,referenceResolution}=doc.parameters;
  const parsedCode=TITLE_CODE.exec(registerCode||'');
  const documentNumber=String(doc.students[0]?.student?.documentNumber||'');
  for(const [key,label,value,ready] of [
   ['referenceResolution','Resolución de referencia en portada',referenceResolution,present(referenceResolution)],
   ['ugelCode','Código de registro asignado por UGEL',ugelCode,present(ugelCode)],
   ['titleRegisterFormat','Código institucional con DNI y formato válidos',registerCode,!!parsedCode&&Number(parsedCode[1])>0&&Number(parsedCode[5])>=1000&&parsedCode[2]===documentNumber],
   ['titleRegisterUnique','Correlativo disponible en el año del registro',registerCode,!!parsedCode&&!titleCorrelativeTaken(core,doc.students[0]?.enrollment?.id,registerCode,parsedCode)],
  ]){
   const source='Datos del título';
   doc.preflight.fields.push({key:'document.'+key,label,value:ready?value:'',status:ready?'READY':'MISSING',source});
   doc.preflight.total++;
   if(ready)doc.preflight.filled++;
   else{doc.preflight.missing.push({key:'document.'+key,source,count:1});doc.preflight.complete=false;}
  }
  if(!trajectory?.hasBothModules){
   doc.warnings.push(`Trayectoria modular incompleta para titulación oficial 2026: falta ${(trajectory?.missingModules||['Módulo I','Módulo II']).join(' y ')}.`);
  }
 }
 if(docNum===20&&base.official2026===true&&!isDemo){
  const activeCode=doc.parameters.certRegisterCode||doc.parameters.registerCode;
  const parsedCode=TITLE_CODE.exec(activeCode||'');
  const documentNumber=String(doc.students[0]?.student?.documentNumber||'');
  const nonEfsrtUnits=(doc.units||[]).filter(u=>String(u.code||'').toUpperCase()!=='EFSRT');
  const hasEfsrt=doc.module?.efsrtHours!=null||doc.efsrtUnit?.hours!=null||present(doc.parameters?.efsrtFinalGrade);
  const totalRows=nonEfsrtUnits.length+(hasEfsrt?1:0);
  for(const [key,label,value,ready] of [
   ['referenceResolution','Resolución de autorización en certificado',doc.parameters.referenceResolution,present(doc.parameters.referenceResolution)],
   ['certRegisterFormat','Código de certificado con DNI y formato válidos',activeCode,!!parsedCode&&Number(parsedCode[1])>0&&Number(parsedCode[5])>=1000&&parsedCode[2]===documentNumber],
   ['certRegisterUnique','Correlativo de certificado disponible en el año del registro',activeCode,!!parsedCode&&!certCorrelativeTaken(core,doc.students[0]?.enrollment?.id,activeCode,parsedCode)],
   ['certRowLimit','Tabla reverso con máximo 8 filas (hasta 7 UD + EFSRT)',`${totalRows} filas`,totalRows>0&&totalRows<=8],
  ]){
   const source='Datos del certificado';
   doc.preflight.fields.push({key:'document.'+key,label,value:ready?value:'',status:ready?'READY':'MISSING',source});
   doc.preflight.total++;
   if(ready)doc.preflight.filled++;
   else{doc.preflight.missing.push({key:'document.'+key,source,count:1});doc.preflight.complete=false;}
  }
 }
 doc.fingerprint=digest({...doc,preflight:undefined});return doc;
}
function fieldLabel(key){const [scope,name]=key.split('.');const special={'program.nombre':'Programa de estudios','program.name':'Programa de estudios','program.totalHours':'Horas totales del programa (M1 + M2)','program.totalCredits':'Créditos totales del programa (M1 + M2)','module.nombre':'Módulo formativo','students.name':'Apellidos y nombres de estudiantes','students.document':'Documentos de identidad','students.documentNumber':'Número de documento de identidad','students.documentType':'Tipo de documento de identidad','students.sex':'Sexo de estudiantes','students.birthDate':'Fechas de nacimiento','students.lastName1':'Apellidos paternos','students.lastName2':'Apellidos maternos','students.firstNames':'Nombres de estudiantes','teacher.name':'Docente responsable','group.periodId':'Periodo académico','attendance.sessions':'Fechas y sesiones de asistencia','attendance.marks':'Marcas de asistencia por estudiante','evaluation.components':'Instrumentos IA1, IA2, IA3 y calificaciones IL','evaluation.unitResult':'Logro confirmado de la unidad','evaluation.unitResults':'Logros confirmados de todas las unidades','efsrt.criteria':'Nueve criterios de EFSRT','efsrt.finalGrade':'Calificación final EFSRT','document.officialTitleText':'Denominación del título autorizado','document.emissionDate':'Fecha de expedición'};if(special[key])return special[key];const mapped={students:'enrollment',enrollments:'enrollment',units:'unit',document:'registry',efsrt:'practice'}[scope]||scope;const alias={finalGrade:'efsrtFinalGrade'}[name]||name;return SETTINGS_FIELDS[mapped]?.find(f=>f.key===alias)?.label||SETTINGS_FIELDS.unitCurriculum.find(f=>f.key===name)?.label||name;}
function preflight(doc){
 const isOfficial21=doc.templateId==='TMPL-21'&&doc.official2026===true;
 const isOfficial20=doc.templateId==='TMPL-20'&&doc.official2026===true;
 const skipKeys=isOfficial21
  ? new Set(['document.registryAsiento'])
  : isOfficial20
   ? new Set(['document.registryBook','document.registryFolio','document.registryNumber','document.registryDate'])
   : new Set();
 const required=(TEMPLATE_PARAMETERS[doc.templateId]||[]).filter(key=>!skipKeys.has(key)),missing=[],fields=[];
 const add=(key,value,source,countMissing=1)=>{const ok=present(value);fields.push({key,label:fieldLabel(key),value:ok?value:'',status:ok?'READY':'MISSING',source});if(!ok)missing.push({key,source,count:countMissing});};
 for(const key of required){const [scope,name]=key.split('.');
  if(['institution','program','module','group'].includes(scope)){
   if(scope==='program'&&name==='name'){add(key,doc.program?.name||doc.program?.nombre||(doc.templateId==='TMPL-22'?doc.program?.officialTitleText:''),'Configuración documental');continue;}
   if(scope==='program'&&name==='totalHours'&&(doc.templateId==='TMPL-22'||doc.templateId==='TMPL-23')){
    const hrs=doc.trajectory?.hasBothModules?(doc.templateId==='TMPL-23'?(Number(doc.trajectory.totalHours)>0?doc.trajectory.totalHours:null):doc.trajectory.totalHours):null;
    add(key,hrs,doc.trajectory?.hasBothModules?'Trayectoria M1 + M2 (horas totales > 0)':'Trayectoria formativa M1 + M2 incompleta');continue;
   }
   if(scope==='program'&&name==='totalCredits'&&(doc.templateId==='TMPL-22'||doc.templateId==='TMPL-23')){
    const crd=doc.trajectory?.hasBothModules?(doc.trajectory.totalCredits??0):null;
    add(key,crd,'Trayectoria formativa M1 + M2');continue;
   }
   add(key,doc[scope]?.[name],scope==='group'?'Configuración del grupo':'Configuración documental');continue;
  }
  if(scope==='teacher'){add(key,doc.teacher,'Cuenta docente / responsable del grupo');continue;}
  if(scope==='unit'){add(key,doc.unitData?.[name],'Configuración de la unidad');continue;}
  if(scope==='students') {const missingRows=doc.students.filter(({student:s})=>!present(({name:s.name,document:s.document,documentNumber:s.documentNumber??s.document,sex:s.sex??s.legacy?.sexo,birthDate:s.birthDate??s.legacy?.fechaNacimiento,lastName1:s.lastName1??s.legacy?.apellidoPaterno,lastName2:s.lastName2??s.legacy?.apellidoMaterno,firstNames:s.firstNames??s.legacy?.nombres,documentType:s.documentType??s.legacy?.tipoDocumento})[name]));add(key,doc.students.length&&missingRows.length===0?`${doc.students.length} estudiantes completos`:null,'Ficha del estudiante',missingRows.length||1);continue;}
  if(scope==='units'){const incomplete=doc.units.filter(u=>!present(u[name]));add(key,doc.units.length&&!incomplete.length?`${doc.units.length} unidades completas`:null,'Configuración de unidades',incomplete.length||1);continue;}
  if(scope==='enrollments'){const incomplete=doc.students.filter(s=>!present(s.parameters[name]));add(key,doc.students.length&&!incomplete.length?`${doc.students.length} matrículas completas`:null,'Parámetros de matrícula',incomplete.length||1);continue;}
  if(scope==='attendance') {const sessions=[...new Set(doc.attendance.map(r=>`${r.date}|${r.session}`))];if(name==='sessions')add(key,sessions.length?`${sessions.length} sesiones`:null,'Asistencia del docente');else{const expected=doc.students.flatMap(s=>sessions.filter(date=>!s.enrollment.startDate||date.slice(0,10)>=s.enrollment.startDate).map(session=>({enrollment:s.enrollment.id,session})));const pending=expected.filter(v=>!doc.attendance.some(r=>r.enrollmentId===v.enrollment&&`${r.date}|${r.session}`===v.session&&present(r.value)));add(key,expected.length&&!pending.length?`${expected.length} marcas`:null,'Asistencia del docente',pending.length||1);}continue;}
  if(scope==='evaluation'){const wanted=name==='components'?Array.from({length:5},(_,i)=>['IA1','IA2','IA3',''].map(c=>`IL${i+1}${c?'.'+c:''}`)).flat():['RESULTADO_UD'];const combos=doc.students.flatMap(s=>(name==='unitResults'?doc.units.map(u=>u.code):[doc.unitCode]).flatMap(unit=>wanted.map(indicator=>({enrollment:s.enrollment.id,unit,indicator}))));const pending=combos.filter(v=>!doc.grades.some(r=>r.enrollmentId===v.enrollment&&r.unit===v.unit&&r.indicator===v.indicator&&present(r.value)));add(key,combos.length&&!pending.length?`${combos.length} valores completos`:null,'Notas confirmadas del docente',pending.length||1);continue;}
  if(scope==='efsrt'||scope==='closure'){const aliases={finalGrade:'efsrtFinalGrade',companyName:'companyName',companyAddress:'companyAddress',modularGrade:'modularGrade',approvedUnitsCount:'approvedUnitsCount',failedUnitsCount:'failedUnitsCount'};const incomplete=doc.students.filter(s=>name==='criteria'?Array.from({length:9},(_,i)=>s.parameters[`criterion${i+1}`]).some(v=>!present(v)):!present(s.parameters[aliases[name]]));add(key,doc.students.length&&!incomplete.length?`${doc.students.length} registros completos`:null,'Parámetros EFSRT / cierre de matrícula',incomplete.length||1);continue;}
  if(scope==='document'){add(key,name==='officialTitleText'?doc.program.officialTitleText:doc.parameters[name],'Datos registrales de la matrícula');}
 }
 if(doc.templateId==='TMPL-02'&&doc.parameters.subsanacionUnit)for(const key of ['subsanacionCredits','subsanacionHours','subsanacionCondition'])add('document.'+key,doc.parameters[key],'Parámetros de subsanación de matrícula');
 if(doc.templateId==='TMPL-22'||doc.templateId==='TMPL-23'){
  const traj=doc.trajectory;
  const hasBoth=Boolean(traj?.hasBothModules);
  const validHours=doc.templateId==='TMPL-23'?Number(traj?.totalHours)>0:true;
  const ok=hasBoth&&validHours;
  const source=ok?'Trayectoria M1 + M2 verificada':(!hasBoth?`Trayectoria M1 + M2 incompleta: falta ${(traj?.missingModules||['Módulo I','Módulo II']).join(' y ')}`:'Trayectoria M1 + M2 sin horas configuradas (totalHours > 0)');
  fields.push({key:'program.trajectory',label:'Trayectoria completa (Módulo I y Módulo II)',value:ok?`M1 + M2 (${traj.totalHours} h / ${traj.totalCredits} cr)`:'',status:ok?'READY':'MISSING',source});
  if(!ok)missing.push({key:'program.trajectory',source,count:1});
 }
 return {fields,missing,complete:missing.length===0,filled:fields.length-missing.length,total:fields.length};
}
module.exports={curriculumFor,SETTINGS_FIELDS,idFor,visible,validateSettings,saveSettings,configuration,enrich,preflight,computeMonthsLabel,buildInstitutionalRegisterCode,suggestInstitutionalRegistry,resolveProgramTrajectory};
