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
function saveSettings(core,actor,input){const value=validateSettings(core,actor,input);return core.transaction(()=>{const saved=core.write(actor,'documentSettings',value,input.rev);require('./academic-config.cjs').synchronize(core,actor,saved);if(input.scope.kind==='institution'&&present(value.fields.nombre))core.setting('institution',{...core.setting('institution'),name:value.fields.nombre});return saved;});}
function settings(core,scope){return core.record('documentSettings',idFor(scope))?.fields||{};}
function configuration(core,actor){
 const legacy=core.db.prepare("SELECT value FROM settings WHERE key LIKE 'legacy-%'").all().map(r=>JSON.parse(r.value)).flatMap(s=>s.stores.institucion||[])[0]||{};
 const defaults={'institution:institution':{...legacy,nombre:core.setting('institution').name,resolucionAutorizacion:legacy.resolucionAutorizacion||legacy.resolucionAutorizacion1||'',resolucionConversion:legacy.resolucionConversion||legacy.resolucionAutorizacion2||'',directorNombre:legacy.director||''}};
 for(const g of core.scoped(actor,'groups'))defaults['group:'+g.id]={turno:g.turno||'',modalidad:g.modalidad||'',seccion:core.groupSection(g),ciclo:g.ciclo||''};
 for(const g of core.scoped(actor,'groups')){const ref=require('./reference-defaults.cjs').get(core,g.moduleId),plan=curriculumFor(core,g);defaults['module:'+g.moduleId]={...ref.module,...Object.fromEntries(Object.entries(plan).filter(([k])=>SETTINGS_FIELDS.module.some(f=>f.key===k)))};for(const code of g.units||[]){const u=require('./reference-defaults.cjs').merge(ref.units.find(u=>u.code===code),plan.unitsJson?JSON.parse(plan.unitsJson).find(u=>u.code===code):{});defaults['unit:'+g.id+':'+code]=Object.fromEntries(Object.entries(u).filter(([k])=>SETTINGS_FIELDS.unit.some(f=>f.key===k)));defaults['unitCurriculum:'+g.id+':'+code]=Object.fromEntries(Object.entries(u).filter(([k])=>SETTINGS_FIELDS.unitCurriculum.some(f=>f.key===k)));}}
 for(const fields of Object.values(defaults))for(const key of Object.keys(fields))if(fields[key]==='PENDIENTE'||fields[key]==='[PENDIENTE]'||fields[key]==='NO_CONFIRMADO')fields[key]='';
 const templates=core.dashboard(actor).templates,allowed=policyFor(actor).settings;
 const schema=Object.fromEntries(Object.entries(SETTINGS_FIELDS).filter(([kind])=>allowed.includes(kind)).map(([kind,fields])=>[kind,fields.filter(f=>f.roles.includes(actor.role))]));
 const filteredDefaults=Object.fromEntries(Object.entries(defaults).filter(([key])=>allowed.includes(key.split(':')[0])));
 return {schema,defaults:filteredDefaults,settings:core.records('documentSettings').filter(r=>allowed.includes(r.scope.kind)&&visible(core,actor,r)),catalog:catalog(path.join(__dirname,'..')).filter(t=>templates.includes(t.id))};
}
const DEMO_STUDENT_NAMES = [
 { name: 'ALVAREZ QUISPE, Carmen Rosa', doc: '45812903', sex: 'F', birth: '2004-03-12' },
 { name: 'APAZA MAMANI, Edwin Rolando', doc: '46923415', sex: 'M', birth: '2003-07-25' },
 { name: 'CALISAYA CONDORI, Javier Luis', doc: '47182934', sex: 'M', birth: '2004-11-03' },
 { name: 'CANAHUA HUANCA, Diana Maritza', doc: '48293012', sex: 'F', birth: '2005-01-18' },
 { name: 'CANSAYA HUAMANI, Gladys Pilar', doc: '49384721', sex: 'F', birth: '2004-09-09' },
 { name: 'CHAMBI TICONCA, Ricardo Miguel', doc: '44592019', sex: 'M', birth: '2002-12-04' },
 { name: 'COAQUIRA MAMANI, Miriam Yanet', doc: '43829104', sex: 'F', birth: '2001-08-14' },
 { name: 'CONDORI COILA, Rubén Darío', doc: '47201928', sex: 'M', birth: '2003-05-20' },
 { name: 'FLORES CALLATA, Beatriz Elena', doc: '46382910', sex: 'F', birth: '2004-02-28' },
 { name: 'GUTIERREZ VELASQUEZ, Jorge Luis', doc: '45910283', sex: 'M', birth: '2003-10-15' },
 { name: 'HUALLPA CHOQUE, Patricia Roxana', doc: '48920184', sex: 'F', birth: '2005-04-07' },
 { name: 'HUANCA QUISPE, Julio César', doc: '44829102', sex: 'M', birth: '2002-06-30' },
 { name: 'LEQQUE SUCASACA, Ana María', doc: '47291038', sex: 'F', birth: '2003-08-22' },
 { name: 'LOPEZ MAMANI, Verónica Soledad', doc: '48192039', sex: 'F', birth: '2004-12-11' },
 { name: 'MAMANI CALISAYA, Hernán Alberto', doc: '46192830', sex: 'M', birth: '2003-04-01' },
 { name: 'MAMANI CONDORI, Maritza Del Carmen', doc: '45382910', sex: 'F', birth: '2002-09-17' },
 { name: 'MEDINA CCAMA, Walter Marco', doc: '47281920', sex: 'M', birth: '2004-06-05' },
 { name: 'MENDOZA QUISPE, Silvia Karina', doc: '48392019', sex: 'F', birth: '2005-02-14' },
 { name: 'PARICAHUA TICONCA, César Augusto', doc: '44910283', sex: 'M', birth: '2002-11-23' },
 { name: 'QUISPE CONDORI, Bertha Elena', doc: '46291049', sex: 'F', birth: '2003-03-31' },
 { name: 'QUISPE MAMANI, Fredy Orlando', doc: '47102938', sex: 'M', birth: '2004-07-19' },
 { name: 'RAMOS CHURA, Liliana Maribel', doc: '48201948', sex: 'F', birth: '2005-05-02' },
 { name: 'RODRIGUEZ PAREDES, Marco Antonio', doc: '45291048', sex: 'M', birth: '2002-10-10' },
 { name: 'ROQUE MAMANI, Judith Vanessa', doc: '46820194', sex: 'F', birth: '2003-12-29' },
 { name: 'SUCASACA APAZA, David Alejandro', doc: '47392018', sex: 'M', birth: '2004-08-08' },
 { name: 'TICONCA HUALLPA, Norma Ruth', doc: '48492019', sex: 'F', birth: '2005-03-24' },
 { name: 'TURPO QUISPE, Carlos Daniel', doc: '45920184', sex: 'M', birth: '2003-01-16' },
 { name: 'VALENCIA CUEVA, Mónica Lucía', doc: '46392018', sex: 'F', birth: '2004-10-27' },
 { name: 'VILCA MAMANI, Oscar Efraín', doc: '47820193', sex: 'M', birth: '2004-04-13' },
 { name: 'ZEA CONDORI, Yessica Paola', doc: '48192047', sex: 'F', birth: '2005-06-08' }
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
 let students=base.students.slice().sort((a,b)=>(a.student?.name||'').localeCompare(b.student?.name||'','es')).map(row=>({...row,parameters:{...settings(core,{kind:'enrollment',target:row.enrollment.id}),...settings(core,{kind:'registry',target:row.enrollment.id}),...settings(core,{kind:'practice',target:row.enrollment.id}),...settings(core,{kind:'closure',target:row.enrollment.id}),code:row.enrollment.code||enrollmentCode(core,row.enrollment.studentId,row.enrollment.id)}}));
 if(isDemo){
  students=DEMO_STUDENT_NAMES.map((item,idx)=>{
   const parts=item.name.split(', '),lastParts=(parts[0]||'').split(' '),lastName1=lastParts[0]||'',lastName2=lastParts.slice(1).join(' ')||'',firstNames=parts[1]||'';
   const sId=`demo-std-${idx+1}`,eId=`demo-enr-${idx+1}`,code=`MAT-2026-${String(idx+1).padStart(3,'0')}`;
   return {
    enrollment:{id:eId,studentId:sId,groupId:g.id,periodId:g.periodId||'2026-II',moduleId:g.moduleId,startDate:null,active:true,code},
    student:{id:sId,name:item.name,document:item.doc,documentType:'DNI',sex:item.sex,birthDate:item.birth,lastName1,lastName2,firstNames,active:true,archived:false},
    parameters:{code,condition:'REGULAR',approvalMinimum:13,efsrtFinalGrade:16,modularGrade:16,approvedUnitsCount:2,failedUnitsCount:0,companyName:'MUNICIPALIDAD DE SAN ROMÁN',companyAddress:'JR. JAUREGUI 123, JULIACA'}
   };
  });
 }
 const institution={...base.institution,...inst,...(year.institutionJson?JSON.parse(year.institutionJson):{})};
 if(isDemo){
  if(!institution.nombre||institution.nombre==='Institución')institution.nombre='CETPRO MICAELA BASTIDAS';
  if(!institution.name)institution.name=institution.nombre;
  if(!institution.dre)institution.dre='DRE PUNO';
  if(!institution.ugel)institution.ugel='UGEL SAN ROMÁN';
  if(!institution.codigoModular)institution.codigoModular='0734567';
  if(!institution.tipoGestion)institution.tipoGestion='PÚBLICA';
  if(!institution.direccion)institution.direccion='JR. TACNA N° 245';
  if(!institution.distrito)institution.distrito='JULIACA';
  if(!institution.provincia)institution.provincia='SAN ROMÁN';
  if(!institution.departamento)institution.departamento='PUNO';
  if(!institution.lugar)institution.lugar='JULIACA';
  if(!institution.resolucionAutorizacion)institution.resolucionAutorizacion='RD N° 0125-1988-ED';
  if(!institution.resolucionConversion)institution.resolucionConversion='RD N° 0450-2022-DREP';
  if(!institution.directorNombre)institution.directorNombre='MG. EDGAR CALLATA CONDORI';
  if(!institution.secretariaNombre)institution.secretariaNombre='MARÍA LÓPEZ TORRES';
 }
 institution.resolucion=[institution.resolucionAutorizacion||institution.resolucionAutorizacion1||'',institution.resolucionConversion||institution.resolucionAutorizacion2||''].filter(Boolean).join(' / ');if(!present(institution.nombre))institution.nombre=base.institution.name;
 const efsrt=plan.find(u=>u.code==='EFSRT')||{};
 const {AcademicCalendarEngine}=require('./academic-calendar-engine.cjs');
 const calendarEngine=new AcademicCalendarEngine();
 let academicDates=[],academicMonthSpans=[];
 const docNum=Number(base.templateId.slice(5));
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
  if(unitDates?.fechaInicio){
   const res=calendarEngine.resolveAcademicDates({fechaInicio:unitDates.fechaInicio,fechaFin:unitDates.fechaFin||undefined,diasClase:g.diasClase||[1,2,3,4,5],targetDays:unitDates.days||undefined,recordedSessions:isDemo?[]:base.attendance});
   if(res.success){academicDates=res.dates;academicMonthSpans=res.monthSpans;}
  }else if(base.attendance?.length){
   const res=calendarEngine.resolveAcademicDates({recordedSessions:base.attendance});
   if(res.success){academicDates=res.dates;academicMonthSpans=res.monthSpans;}
  }
  if(isDemo&&academicDates.length===0){
   const sched = (isSem1 ? demoSchedulesSem1 : demoSchedulesSem2)[base.unit || 'UD1'] || (isSem1 ? demoSchedulesSem1.UD1 : demoSchedulesSem2.UD1);
   const res=calendarEngine.resolveAcademicDates({fechaInicio:sched.fechaInicio,fechaFin:sched.fechaFin,diasClase:[1,2,3,4,5]});
   if(res.success){academicDates=res.dates;academicMonthSpans=res.monthSpans;}
  }
 }
 let attendance=base.attendance;
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
 if(isDemo&&(docNum>=11&&docNum<=19)){
  grades=[];
  for(let sIdx=0;sIdx<students.length;sIdx++){
   const row=students[sIdx];
   const unitList=units.length?units:[{code:base.unit||'UD1'}];
   for(const u of unitList){
    for(let i=1;i<=5;i++){
     grades.push({id:digest(`grade:${row.enrollment.id}:${u.code}:IL${i}`),enrollmentId:row.enrollment.id,groupId:g.id,unit:u.code,indicator:`IL${i}`,value:13+((sIdx*3+i*5)%7)});
    }
    grades.push({id:digest(`grade:${row.enrollment.id}:${u.code}:RESULTADO_UD`),enrollmentId:row.enrollment.id,groupId:g.id,unit:u.code,indicator:'RESULTADO_UD',value:14+((sIdx*2)%6)});
   }
  }
 }
 const modObj={...base.module,...Reference.merge(reference.module,curriculum),...mod,...(isDemo?{presenceStates:mod.presenceStates||'P,T',absenceStates:mod.absenceStates||'F,J',absenceDenominator:mod.absenceDenominator||'REGISTRADAS',approvalMinimum:mod.approvalMinimum||13,hours:mod.hours||528,credits:mod.credits||22}:{})};
  let demoUnitName = selected?.name || '';
  if (!demoUnitName || /pendiente de confirmar/i.test(demoUnitName)) {
   demoUnitName = getDemoUnitName(g.programId, g.moduleId, base.unit || 'UD1', selected?.name);
  }
  const cleanDemoUnitName = demoUnitName.replace(/^UD\d+:\s*/i, '').trim();
  const unitCapacity = selected?.capacity || (isDemo ? `Aplica técnicas, herramientas y normas de seguridad en el desarrollo de competencias de ${cleanDemoUnitName.toLowerCase()}.` : '');
  const unitInd1 = selected?.indicator1 || (isDemo ? `Organiza materiales, equipos y procedimientos técnicos para ${cleanDemoUnitName.toLowerCase()}.` : '');
  const unitInd2 = selected?.indicator2 || (isDemo ? `Ejecuta procesos operativos y destrezas técnicas en ${cleanDemoUnitName.toLowerCase()} con precisión.` : '');
  const unitInd3 = selected?.indicator3 || (isDemo ? `Verifica el control de calidad, acabado final y buenas prácticas ambientales en el taller.` : '');
  const unitData = isDemo ? {
   ...selected,
   code: base.unit || selected?.code || 'UD1',
   name: demoUnitName,
   fechaInicio: (docNum>=5&&docNum<=10&&academicDates.length)?academicDates[0].fecha:(selected?.fechaInicio||''),
   fechaFin: (docNum>=5&&docNum<=10&&academicDates.length)?academicDates[academicDates.length-1].fecha:(selected?.fechaFin||''),
   capacity: unitCapacity,
   indicator1: unitInd1,
   indicator2: unitInd2,
   indicator3: unitInd3
  } : selected;
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
  const doc={...base,attendance,grades,demoFill:isDemo,demoMode:isDemo,institution:{...institution,name:institution.nombre},program:{...base.program,...prog,...(curriculum.programName?{nombre:curriculum.programName}:{}),...(curriculum.nivelFormativo?{nivelFormativo:curriculum.nivelFormativo}:{})},module:modObj,group:{...g,fechaInicio:period.fechaInicio||'',fechaFin:period.fechaFin||'',ciclo:curriculum.nivelFormativo||'',turno:curriculum.turno||'',periodClase:g.periodId,efsrtInicio:efsrt.fechaInicio||'',efsrtFin:efsrt.fechaFin||'',...group,seccion:core.groupSection(g)},units:enrichedUnits,unitCode:base.unit,unitData,teacher,students,academicDates,academicMonthSpans,parameters:students.length===1?students[0].parameters:{}};
 doc.preflight=preflight(doc);
 if(isDemo){
  doc.preflight.complete=true;
  doc.preflight.missing=[];
  doc.preflight.filled=doc.preflight.total;
  for(const f of doc.preflight.fields){f.status='READY';if(!f.value)f.value='Simulado en modo demostración';}
 }
 if(plan.length&&!isDemo){const mismatches=['hours','credits'].filter(key=>plan.every(u=>typeof u[key]==='number')&&typeof curriculum[key]==='number'&&plan.reduce((n,u)=>n+u[key],0)!==curriculum[key]);if(mismatches.length){doc.preflight.fields.push({key:'module.curriculumConsistency',label:'Confirmar totales de horas y créditos del plan',value:'',status:'MISSING',source:'Dirección: las unidades no suman el total declarado del módulo'});doc.preflight.missing.push({key:'module.curriculumConsistency',source:'Configuración por año',count:1});doc.preflight.total++;doc.preflight.complete=false;}}
 doc.warnings=[];if(!isDemo&&doc.students.some(r=>r.enrollment.provisional))doc.warnings.push('Hay matrículas provisionales: confirme la pertenencia al módulo antes de emitir actas o certificados.');if(!isDemo&&plan.some(u=>u.confirmed===false))doc.warnings.push('El afiche confirma el módulo, pero falta confirmar su plan de unidades.');
 if(!isDemo)for(const [key,label,missing] of [['module.planConfirmed','Confirmar unidades del módulo',plan.some(u=>u.confirmed===false)],['enrollments.moduleConfirmed','Confirmar pertenencia al módulo',[19,20,21].includes(Number(doc.templateId.slice(5)))&&doc.students.some(r=>r.enrollment.provisional)]])if(missing){doc.preflight.fields.push({key,label,value:'',status:'MISSING',source:'Dirección: configuración pendiente'});doc.preflight.missing.push({key,source:'Configuración por año / Matrículas',count:1});doc.preflight.total++;doc.preflight.complete=false;}
 doc.fingerprint=digest({...doc,preflight:undefined});return doc;
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
module.exports={curriculumFor,SETTINGS_FIELDS,idFor,visible,validateSettings,saveSettings,configuration,enrich,preflight};
