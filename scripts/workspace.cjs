// Selección de trabajo por sesión: no modifica cuentas ni permisos firmados.
const fail=(text,status=403)=>{throw Object.assign(new Error(text),{status});};
const yearOf=g=>/^\d{4}/.exec(g.periodId||'')?.[0]||g.periodId||'SIN-PERIODO';
const MODULE_TEMPLATES=new Set(['TMPL-01','TMPL-02','TMPL-03','TMPL-04','TMPL-19','TMPL-20','TMPL-21','TMPL-22','TMPL-23']);
const { unitDateRange } = require('./unit-date-range.cjs');
function units(core,user,g){const reference=require('./reference-defaults.cjs'),ref=reference.get(core,g.moduleId),plan=require('./offline-documents.cjs').curriculumFor(core,g),rows=plan?.unitsJson?JSON.parse(plan.unitsJson):[];return (g.units||[]).filter(code=>user.role!=='DOCENTE'||core.assignment(user,g.id,code)).map(code=>{const dates=unitDateRange(core,g,code);const u={code,...reference.merge(ref.units.find(u=>u.code===code),rows.find(u=>u.code===code)),...core.record('documentSettings',`unit:${g.id}:${code}`)?.fields,...core.record('documentSettings',`unitCurriculum:${g.id}:${code}`)?.fields};return {...u,fechaInicio:dates.fechaInicio,fechaFin:dates.fechaFin,hours:typeof u.hours==='number'?u.hours:0,credits:typeof u.credits==='number'?u.credits:0,capacity:u.capacity||'',indicator1:u.indicator1||'',indicator2:u.indicator2||''};});}
function templatesFor(core,user,context,templates){if(!context||context.overview||!context.mode)return templates;if(context.mode==='MODULE')return templates.filter(id=>MODULE_TEMPLATES.has(id));if(context.mode==='PRACTICE')return templates.filter(id=>id==='TMPL-18');const g=core.record('groups',context.groupId),index=g?.units.filter(u=>u!=='EFSRT').indexOf(context.unit)??-1;return templates.filter(id=>id===(index<6?`TMPL-${String(5+index).padStart(2,'0')}`:'TMPL-05')||index>=0&&index<7&&id===`TMPL-${String(11+index).padStart(2,'0')}`);}
function plannedUnitSummaries(curriculum) {
  if (!curriculum?.unitsJson) return;
  let units;
  try {
    units = JSON.parse(curriculum.unitsJson);
  } catch {
    return;
  }
  if (!Array.isArray(units)) return;
  return units.filter(unit => typeof unit?.code === 'string').map(({code, name}) => ({
    code, name: typeof name === 'string' ? name : undefined
  }));
}
function options(core, user) {
  const groups = core.scoped(user, 'groups').filter(g => !g.archived);
  const modules = core.scoped(user, 'modules');
  const programs = core.scoped(user, 'programs');
  const enrollments = core.scoped(user, 'enrollments');
  const activeStudents = new Map();
  for (const enrollment of enrollments.filter(row => row.active)) {
    if (!activeStudents.has(enrollment.groupId)) activeStudents.set(enrollment.groupId, new Set());
    activeStudents.get(enrollment.groupId).add(enrollment.studentId);
  }
  const stats = [];
  for (const year of new Set(groups.map(yearOf))) {
    for (const program of programs) {
      const programGroups = groups.filter(g => yearOf(g) === year && g.programId === program.id);
      const students = new Set(programGroups.flatMap(g => [...(activeStudents.get(g.id) || [])]));
      stats.push({ year, programId: program.id, students: students.size });
    }
  }
  const canViewPlans = user.role === 'DIRECTOR' || user.role === 'SECRETARIA';
  const calendar = canViewPlans ? core.records('documentSettings').filter(r => !r.archived) : [];
  const configuredTargets = kind => calendar.filter(r => r.scope?.kind === kind).map(r => r.scope.target).filter(Boolean);
  return {
    role: user.role,
    assignmentPending: !!user.assignmentPending,
    years: [...new Set([...groups.map(yearOf), ...configuredTargets('academicYear')])],
    periods: [...new Set([...groups.map(g => g.periodId), ...configuredTargets('academicPeriod')].filter(Boolean))],
    stats,
    groups: groups.map(g => {
      const groupConfig = core.record('documentSettings', 'group:' + g.id)?.fields || {};
      const period = core.record('documentSettings', 'academicPeriod:' + g.periodId)?.fields || {};
      return {
        id: g.id, name: require('./role-policy.cjs').groupName(core, g),
        section: g.section || groupConfig.seccion || 'A1',
        teacherName: groupConfig.teacherName || '',
        studentCount: activeStudents.get(g.id)?.size || 0,
        programId: g.programId, moduleId: g.moduleId, periodId: g.periodId, year: yearOf(g),
        turno: groupConfig.turno || g.turno || '', modalidad: groupConfig.modalidad || g.modalidad || '',
        isConvenio: Boolean(g.isConvenio || groupConfig.convenio),
        convenioName: String(g.convenioName || groupConfig.convenio || '').trim(),
        fechaInicio: g.fechaInicio || groupConfig.fechaInicio || period.fechaInicio,
        fechaFin: g.fechaFin || groupConfig.fechaFin || period.fechaFin,
        units: units(core, user, g)
      };
    }),
    modules: modules.filter(m => !m.archived).map(m => {
      const config = core.record('documentSettings', 'module:' + m.id)?.fields || {};
      const plan = canViewPlans ? core.record('documentSettings', 'curriculum:' + m.id) : null;
      const curriculum = plan && !plan.archived ? plan.fields : null;
      return {
        id: m.id, nombre: m.nombre, programId: m.programaId || m.programId,
        periodId: curriculum?.periodId || (canViewPlans ? m.periodId : undefined),
        plannedUnits: plannedUnitSummaries(curriculum), hours: m.hours || config.hours || 0, credits: m.credits || config.credits || 0
      };
    }),
    programs: programs.map(p => ({id: p.id, nombre: p.nombre}))
  };
}
function groupIds(core,user,context){const groups=core.scoped(user,'groups').filter(g=>!g.archived);if(!context||context.overview)return new Set(groups.map(g=>g.id));return new Set(groups.filter(g=>(!context.year||yearOf(g)===context.year)&&(!context.periodId||g.periodId===context.periodId)&&(!context.programId||g.programId===context.programId)&&(!context.moduleId||g.moduleId===context.moduleId)&&(!context.groupId||g.id===context.groupId)).map(g=>g.id));}
function select(core,user,input){if(input.overview){if(user.role==='DOCENTE')fail('El docente debe seleccionar un módulo de sus aulas.');return {overview:true};}const clean=Object.fromEntries(['year','periodId','programId','moduleId','groupId','mode','unit'].filter(k=>input[k]).map(k=>[k,String(input[k])]));if(!clean.year||!clean.programId||!clean.moduleId)fail('Seleccione año, carrera y módulo.',400);if(!groupIds(core,user,clean).size)fail(clean.periodId?'El módulo o aula no está disponible para su cuenta en el periodo seleccionado.':'El módulo o aula no pertenece a su cuenta.');if(clean.mode){if(!['UNIT','MODULE','PRACTICE'].includes(clean.mode)||!clean.groupId)fail('Seleccione aula y espacio de trabajo.',400);if(clean.mode==='PRACTICE')clean.unit='EFSRT';if(clean.mode==='MODULE'){if(clean.unit)fail('Los documentos del módulo incluyen todas sus unidades.',400);}else{if(!clean.unit||clean.mode==='UNIT'&&clean.unit==='EFSRT')fail('Seleccione una unidad didáctica válida.',400);if(!core.record('groups',clean.groupId)?.units.includes(clean.unit))fail('La unidad no pertenece al aula.');core.requireGroup(user,clean.groupId,clean.unit);}}else if(clean.unit)fail('Seleccione el espacio de trabajo de la unidad.',400);return clean;}
function dashboard(core,user,context){const d=core.dashboard(user);if(!context||context.overview)return {...d,workspace:context||null};const ids=groupIds(core,user,context),groups=d.groups.filter(g=>ids.has(g.id)),enrollments=d.enrollments.filter(e=>ids.has(e.groupId)),students=new Set(enrollments.map(e=>e.studentId)),programs=new Set(groups.map(g=>g.programId)),modules=new Set(groups.map(g=>g.moduleId));return {...d,workspace:{...context,unitName:context.unit&&context.groupId?units(core,user,core.record('groups',context.groupId)).find(u=>u.code===context.unit)?.name:''},templates:templatesFor(core,user,context,d.templates),groups,enrollments,students:d.students.filter(s=>students.has(s.id)),programs:d.programs.filter(p=>programs.has(p.id)),modules:d.modules.filter(m=>modules.has(m.id)),grades:d.grades.filter(r=>ids.has(r.groupId)&&(!context.unit||r.unit===context.unit)),attendance:d.attendance.filter(r=>ids.has(r.groupId)&&(!context.unit||r.unit===context.unit)),submissions:d.submissions.filter(r=>ids.has(r.groupId)&&(context.mode==='MODULE'&&user.role!=='DOCENTE'?true:context.mode==='MODULE'?MODULE_TEMPLATES.has(r.templateId):!context.unit||r.unit===context.unit)),studentRequests:d.studentRequests.filter(r=>ids.has(r.groupId)),conflicts:d.conflicts.filter(r=>ids.has(r.operation?.body?.value?.groupId))};}
function filterConfiguration(core,user,context,config){if(!context||context.overview)return config;const ids=groupIds(core,user,context),enrollments=new Set(core.scoped(user,'enrollments').filter(e=>ids.has(e.groupId)).map(e=>e.id)),scope=s=>{if(!s?.kind)return false;if(context.mode==='UNIT')return ['unit','unitCurriculum'].includes(s.kind)&&s.unit===context.unit&&ids.has(s.target);if(context.mode==='PRACTICE')return s.kind==='practice'&&enrollments.has(s.target);if(context.mode==='MODULE'&&['unit','unitCurriculum','practice'].includes(s.kind))return false;return s.kind==='institution'||s.kind==='academicYear'&&s.target===context.year||s.kind==='academicPeriod'&&[...ids].some(id=>core.record('groups',id)?.periodId===s.target)||['program','module','curriculum','moduleDefaults'].includes(s.kind)&&[context.programId,context.moduleId].includes(s.target)||['group','unit','unitCurriculum'].includes(s.kind)&&ids.has(s.target)||['enrollment','registry','practice','closure'].includes(s.kind)&&enrollments.has(s.target);};const allowed=kind=>!context.mode||context.mode==='UNIT'?(!context.mode||['unit','unitCurriculum'].includes(kind)):context.mode==='PRACTICE'?kind==='practice':!['unit','unitCurriculum','practice'].includes(kind);return {...config,schema:Object.fromEntries(Object.entries(config.schema).filter(([kind])=>allowed(kind))),catalog:config.catalog.filter(t=>templatesFor(core,user,context,[t.id]).length),...(Array.isArray(config.extendedCatalog)?{extendedCatalog:config.extendedCatalog.filter(t=>templatesFor(core,user,context,[t.id]).length)}:{}),settings:config.settings.filter(r=>scope(r.scope)),defaults:Object.fromEntries(Object.entries(config.defaults).filter(([key])=>scope({kind:key.split(':')[0],target:key.split(':')[1],unit:key.split(':')[2]})))};}
function assertGroup(core,user,context,id){if(context&&!context.overview&&id&&!groupIds(core,user,context).has(id))fail('Esta aula está fuera del módulo seleccionado. Cambie de módulo para trabajar con ella.');}
function guard(core,user,context,route,body){if(!context||context.overview)return;let group=body.groupId;if(['/api/enrollments/module','/api/enrollments/retire'].includes(route))group=core.record('enrollments',body.id)?.groupId;
 if(['/api/grades','/api/attendance','/api/attendance/simulate-unit','/api/attendance/clear-unit'].includes(route)){if(context.mode&&context.mode!=='UNIT')fail('Seleccione una unidad didáctica para registrar notas o asistencia.');assertUnit(context,body.unit);}
 if(['/api/document','/api/document/pdf','/api/document/submit'].includes(route)&&context.mode){if(!templatesFor(core,user,context,[body.templateId]).length)fail('La plantilla no corresponde al espacio seleccionado. Use Documentos del módulo o cambie de unidad.');if(context.mode==='UNIT'){const g=core.record('groups',body.groupId),codes=g?.units.filter(u=>u!=='EFSRT')||[],n=Number(String(body.templateId).slice(5)),selected=n>=5&&n<=10?(body.unit||codes[n-5]):n>=11&&n<=17?codes[n-11]:body.unit;assertUnit(context,selected);}}
 if(['/api/grades','/api/attendance','/api/attendance/simulate-unit','/api/attendance/clear-unit','/api/document','/api/document/pdf','/api/document/submit','/api/closure','/api/enrollments','/api/enrollments/module','/api/enrollments/retire'].includes(route)){if(!(['/api/enrollments','/api/enrollments/module','/api/enrollments/retire'].includes(route)&&['DIRECTOR','SECRETARIA'].includes(user.role)))assertGroup(core,user,context,group);}
 if(route==='/api/document/submission-pdf'||route==='/api/document/review'){const s=core.record('documentSubmissions',body.id);assertGroup(core,user,context,s?.groupId);if(s&&context.mode&&!(user.role!=='DOCENTE'&&context.mode==='MODULE')&&!templatesFor(core,user,context,[s.templateId]).length)fail('La entrega pertenece a otro espacio de trabajo.');if(s?.unit)assertUnit(context,s.unit);}
 if(route==='/api/document/configuration'&&body.scope){const s=body.scope;if(['group','unit','unitCurriculum'].includes(s?.kind))assertGroup(core,user,context,s.target);if(['unit','unitCurriculum'].includes(s?.kind)){if(context.mode&&context.mode!=='UNIT')fail('Seleccione la unidad cuyos parámetros desea editar.');assertUnit(context,s.unit);}if(context.mode==='UNIT'&&!['unit','unitCurriculum','curriculum','moduleDefaults','academicYear','academicPeriod','personnel'].includes(s?.kind))fail('Esta configuración corresponde al módulo completo. Cambie de espacio para editarla.');if(s?.kind==='practice'&&context.mode&&context.mode!=='PRACTICE')fail('Seleccione el espacio EFSRT para evaluar sus criterios.');if(['enrollment','registry','practice','closure'].includes(s?.kind))assertGroup(core,user,context,core.record('enrollments',s.target)?.groupId);if(['program','module'].includes(s?.kind)&&s.target!==context[s.kind+'Id'])fail('Seleccione el módulo al que pertenecen esos datos.');}
}
function assertUnit(context,unit){if(context?.unit&&unit!==context.unit)fail('La unidad está fuera de la selección actual. Cambie de unidad para continuar.');}
function projectDocument(core,user,context,input){const doc=core.document(user,input);if(!context?.unit)return doc;const {fingerprint,...result}=doc;result.units=doc.units.filter(u=>u.code===context.unit);if(result.module.unitsJson)result.module={...result.module,unitsJson:JSON.stringify(JSON.parse(result.module.unitsJson).filter(u=>u.code===context.unit))};const ignored=new Set(['module.curriculumConsistency']);if(context.mode==='PRACTICE'||doc.unitData?.confirmed!==false)ignored.add('module.planConfirmed');const fields=doc.preflight.fields.filter(f=>!ignored.has(f.key)),missing=doc.preflight.missing.filter(f=>!ignored.has(f.key));result.preflight={fields,missing,total:fields.length,filled:fields.length-missing.length,complete:missing.length===0};result.fingerprint=require('node:crypto').createHash('sha256').update(JSON.stringify({...result,preflight:undefined})).digest('hex');return result;}
function scopedCore(core,user,context){if(!context||context.overview)return core;const proxy=Object.create(core);proxy.workspaceContext=context;proxy.transaction=fn=>core.transaction(fn);proxy.listUsers=actor=>require('./account-context.cjs').list(core,actor,context);proxy.saveUser=(actor,input)=>{const ids=groupIds(core,actor,context),assignments=(input.assignments||[]).filter(a=>ids.has(a.groupId)).map(a=>({...a,units:context.unit?a.units.filter(u=>u===context.unit):a.units}));return require('./account-context.cjs').save(core,actor,context,{...input,assignments});};proxy.scoped=(actor,entity)=>{const rows=core.scoped(actor,entity),ids=groupIds(core,actor,context);if(entity==='groups')return rows.filter(r=>ids.has(r.id));if(['enrollments','grades','attendance','studentRequests','documentSubmissions'].includes(entity))return rows.filter(r=>ids.has(r.groupId)&&(!context.unit||!['grades','attendance','documentSubmissions'].includes(entity)||r.unit===context.unit));if(entity==='students'){const students=new Set(core.scoped(actor,'enrollments').filter(e=>ids.has(e.groupId)).map(e=>e.studentId));return rows.filter(r=>students.has(r.id));}return rows;};proxy.requireGroup=(actor,id,unit)=>{assertGroup(core,actor,context,id);if(unit)assertUnit(context,unit);return core.requireGroup(actor,id,unit);};return proxy;}
module.exports={options,select,dashboard,filterConfiguration,guard,assertGroup,groupIds,yearOf,scopedCore,units,templatesFor,assertUnit,document:projectDocument,unitDateRange};
