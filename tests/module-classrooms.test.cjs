const {test}=require('node:test'),assert=require('node:assert/strict');
const {moduleFixture}=require('./helpers/module-classroom-fixture.cjs');
const {prepareModuleClassrooms}=require('../scripts/prepare-module-classrooms.cjs');
const W=require('../scripts/workspace.cjs');
const {createService}=require('../scripts/offline-http.cjs');
const root=require('node:path').resolve(__dirname,'..');
const planFor=(f,id)=>f.catalog.flatMap(program=>program.modules).find(module=>module.id===id);
const snapshot=core=>JSON.stringify(['students','enrollments','grades','attendance'].map(entity=>core.records(entity)));
test('siete carreras y dieciséis aulas M2 con todas sus UDs operativas en tres roles',()=>{
 const f=moduleFixture();
 try{
  const original=snapshot(f.core),credentials=f.core.users().map(({id,salt,digest})=>({id,salt,digest}));
  const result=prepareModuleClassrooms(f.core,f.director);
  assert.equal(result.created.length,16);assert.equal(result.assigned.length,16);
  assert.equal(snapshot(f.core),original);
  assert.deepEqual(f.core.users().map(({id,salt,digest})=>({id,salt,digest})),credentials);
  const programs=new Set();
  for(const mapping of f.mapping)for(const section of mapping.sections)for(const suffix of ['','-M2']){
   const group=f.core.record('groups',section.id+suffix),plan=planFor(f,group.moduleId);
   programs.add(group.programId);
   const teacher=f.core.users().find(user=>user.username===mapping.teacherUsername);
   for(const actor of [f.director,f.core.user(f.secretary.id),teacher]){
    const shown=W.options(f.core,actor).groups.find(item=>item.id===group.id);
    assert(shown,actor.role+' '+group.id);
    assert.deepEqual(shown.units.map(unit=>unit.code),plan.units.map(unit=>unit.code));
    for(const unit of plan.units){
     assert.equal(shown.units.find(item=>item.code===unit.code).name,unit.name);
     const context=W.select(f.core,actor,{year:'2026',periodId:plan.periodId,programId:group.programId,moduleId:group.moduleId,
      groupId:group.id,mode:unit.code==='EFSRT'?'PRACTICE':'UNIT',unit:unit.code});
     const dashboard=W.dashboard(f.core,actor,context);
     assert.equal(dashboard.workspace.periodId,plan.periodId);
     assert.equal(dashboard.workspace.unitName,unit.name);
     assert.deepEqual(dashboard.groups.map(row=>row.id),[group.id]);
    }
   }
  }
  assert.equal(programs.size,7);
  const operations=f.core.operations().length,versions=f.core.users().map(user=>user.version);
  assert.equal(prepareModuleClassrooms(f.core,f.director).created.length,0);
  assert.equal(f.core.operations().length,operations);
  assert.deepEqual(f.core.users().map(user=>user.version),versions);
 }finally{f.core.close()}
});
test('matrículas y avances del M1 se conservan y M2 recibe exclusivamente sus registros',()=>{
 const f=moduleFixture();
 try{
  const mapping=f.mapping.find(item=>item.programId==='PROG-005'),source=f.core.record('groups',mapping.sections[0].id);
  let teacher=f.core.users().find(user=>user.username===mapping.teacherUsername);
  const student=f.core.saveStudent(f.director,{name:'Estudiante sintético QA',document:'88000001'});
  const first=f.core.enroll(f.director,{studentId:student.id,groupId:source.id,startDate:'2026-03-16'});
  f.core.saveAcademic(teacher,'grades',{groupId:source.id,unit:'UD1',indicator:'IL1',rows:[{enrollmentId:first.id,value:12}]});
  f.core.saveAcademic(teacher,'attendance',{groupId:source.id,unit:'UD1',date:'2026-03-16',session:'1',rows:[{enrollmentId:first.id,value:'F'}]});
  const before=snapshot(f.core);prepareModuleClassrooms(f.core,f.director);assert.equal(snapshot(f.core),before);
  const target=f.core.record('groups',source.id+'-M2');
  assert.equal(f.core.records('enrollments').filter(row=>row.groupId===target.id).length,0);
  const second=f.core.enroll(f.core.user(f.secretary.id),{studentId:student.id,groupId:target.id,startDate:'2026-08-10'});
  teacher=f.core.user(teacher.id);
  f.core.saveAcademic(teacher,'grades',{groupId:target.id,unit:'UD1',indicator:'IL1',rows:[{enrollmentId:second.id,value:19}]});
  const payload={year:'2026',periodId:'2026-II',programId:target.programId,moduleId:target.moduleId,groupId:target.id,mode:'UNIT',unit:'UD1'};
  const context=W.select(f.core,teacher,payload),dashboard=W.dashboard(f.core,teacher,context);
  assert.equal(dashboard.grades.length,1);assert.equal(dashboard.grades[0].value,19);
  assert.equal(f.core.records('grades').find(row=>row.enrollmentId===first.id).value,12);
  assert.throws(()=>W.select(f.core,teacher,{...payload,groupId:source.id}),/periodo|disponible/);
  assert.throws(()=>W.guard(f.core,teacher,context,'/api/grades',{groupId:source.id,unit:'UD1'}),/fuera/);
 }finally{f.core.close()}
});
test('asignaciones parciales no se amplían ni se confunden por compartir el código UD1',()=>{
 const f=moduleFixture();
 try{
  const source=f.sources[0],teacher=f.core.users().find(user=>user.username===f.mapping[0].teacherUsername);
  f.core.saveUser(f.director,{...teacher,assignments:teacher.assignments.map(assignment=>assignment.groupId===source.id?{...assignment,units:['UD1']}:assignment)});
  const result=prepareModuleClassrooms(f.core,f.director);
  assert(!f.core.user(teacher.id).assignments.some(assignment=>assignment.groupId===source.id+'-M2'));
  assert(result.skipped.some(row=>row.sourceGroupId===source.id&&row.reason==='ASSIGNMENT_REQUIRES_REVIEW'));
  const target=f.core.record('groups',source.id+'-M2'),current=f.core.user(teacher.id);
  f.core.saveUser(f.director,{...current,assignments:[...current.assignments,{groupId:target.id,units:['UD1']}]});
  const version=f.core.user(teacher.id).version;prepareModuleClassrooms(f.core,f.director);
  assert.deepEqual(f.core.user(teacher.id).assignments.find(assignment=>assignment.groupId===target.id).units,['UD1']);
  assert.equal(f.core.user(teacher.id).version,version);
 }finally{f.core.close()}
});
test('colisiones y aulas archivadas no se sobrescriben ni se reabren',()=>{
 const f=moduleFixture();
 try{
  const first=f.sources[0],second=f.sources[1],plan=planFor(f,f.mapping[0].module2Id);
  const collision=f.core.write(f.director,'groups',{...first,id:first.id+'-M2',name:'Aula reservada QA'});
  const archived=f.core.write(f.director,'groups',{...second,id:second.id+'-M2',moduleId:plan.id,periodId:'2026-II',units:plan.units.map(unit=>unit.code),archived:true,closed:true});
  const result=prepareModuleClassrooms(f.core,f.director);
  assert.deepEqual(f.core.record('groups',collision.id),collision);
  assert.deepEqual(f.core.record('groups',archived.id),archived);
  assert(result.skipped.filter(row=>row.reason==='TARGET_CONFLICT').length>=2);
 }finally{f.core.close()}
});
test('un aula equivalente con ID propio se reutiliza sin duplicar su sección',()=>{
 const f=moduleFixture();
 try{
  const source=f.sources[0],plan=planFor(f,f.mapping[0].module2Id);
  const existing=f.core.write(f.director,'groups',{...source,id:'QA-CUSTOM-M2',moduleId:plan.id,periodId:'2026-II',units:plan.units.map(unit=>unit.code)});
  const result=prepareModuleClassrooms(f.core,f.director);
  assert.equal(f.core.record('groups',source.id+'-M2'),null);
  assert.deepEqual(f.core.record('groups',existing.id),existing);
  assert.equal(result.created.length,15);
 }finally{f.core.close()}
});
test('el servicio prepara M2 al iniciar bajo autoridad y otros roles no ejecutan la reparación',()=>{
 const f=moduleFixture(),directory=f.directory;
 assert.throws(()=>prepareModuleClassrooms(f.core,f.core.user(f.secretary.id)),/permis|autoriz|función/i);
 f.core.close();
 const service=createService({root,directory,backupFile:null});
 try{
  assert.equal(service.core.records('groups').filter(group=>group.periodId==='2026-II').length,16);
  assert.throws(()=>prepareModuleClassrooms(service.core,service.core.users().find(user=>user.role==='DOCENTE')),/permis|autoriz|función/i);
 }finally{service.core.close()}
});
test('una asignación obsoleta de periodo o sección no concede acceso a M2',()=>{
 for(const stale of [{periodId:'2025-I'},{section:'OTRA'}]){
  const f=moduleFixture();
  try{
   const source=f.sources[0],teacher=f.core.users().find(user=>user.username===f.mapping[0].teacherUsername);
   f.core.putUser({...teacher,assignments:teacher.assignments.map(assignment=>
    assignment.groupId===source.id?{...assignment,...stale}:assignment)});
   assert.equal(f.core.assignment(f.core.user(teacher.id),source.id),false);
   prepareModuleClassrooms(f.core,f.director);
   assert(!f.core.user(teacher.id).assignments.some(assignment=>assignment.groupId===source.id+'-M2'));
  }finally{f.core.close()}
 }
});
test('un ID esperado con otra sección o vínculo no sustituye la identidad del aula',()=>{
 for(const mismatch of [{section:'OTRA'},{sourceGroupId:'OTRA-FUENTE'}]){
  const f=moduleFixture();
  try{
   const source=f.sources[0],plan=planFor(f,f.mapping[0].module2Id);
   const target=f.core.write(f.director,'groups',{...source,id:source.id+'-M2',moduleId:plan.id,periodId:'2026-II',
    units:plan.units.map(unit=>unit.code),...mismatch});
   const result=prepareModuleClassrooms(f.core,f.director);
   const teacher=f.core.users().find(user=>user.username===f.mapping[0].teacherUsername);
   assert.deepEqual(f.core.record('groups',target.id),target);
   assert(!teacher.assignments.some(assignment=>assignment.groupId===target.id));
   assert(result.skipped.some(row=>row.sourceGroupId===source.id&&row.reason==='TARGET_CONFLICT'));
  }finally{f.core.close()}
 }
});
test('la configuración M2 y la nueva cuenta llegan a un dispositivo docente por sincronización',()=>{
 const f=moduleFixture(),path=require('node:path'),{OfflineCore}=require('../scripts/offline-core.cjs');
 const remote=new OfflineCore(path.join(f.directory,'remote'),null);
 try{
  prepareModuleClassrooms(f.core,f.director);
  const teacher=f.core.users().find(user=>user.username===f.mapping[0].teacherUsername);
  const invitation=f.core.provision(f.director,{userId:teacher.id,request:remote.requestDevice()});
  remote.acceptProvision({package:invitation,fingerprint:invitation.fingerprint});
  remote.importPackage(remote.users()[0],f.core.packageFor(f.director,remote.status().deviceId),true);
  const actor=remote.users()[0],options=W.options(remote,actor);
  assert(options.groups.some(group=>group.periodId==='2026-II'));
  for(const group of options.groups)assert(teacher.assignments.some(assignment=>assignment.groupId===group.id));
  const target=options.groups.find(group=>group.periodId==='2026-II');
  assert.equal(W.select(remote,actor,{year:'2026',periodId:target.periodId,programId:target.programId,moduleId:target.moduleId,groupId:target.id,mode:'UNIT',unit:'UD1'}).periodId,'2026-II');
  const before=remote.operations().length;
  assert.deepEqual(prepareModuleClassrooms(remote),{created:[],assigned:[],skipped:[]});
  assert.equal(remote.operations().length,before);
 }finally{remote.close();f.core.close()}
});

test('reiniciar el servicio no restablece la asignación M2 retirada por Dirección',()=>{
 const f=moduleFixture();
 try{
  const source=f.sources[0];
  prepareModuleClassrooms(f.core,f.director);
  const teacher=f.core.users().find(user=>user.username===f.mapping[0].teacherUsername);
  const targetId=source.id+'-M2';
  assert(teacher.assignments.some(assignment=>assignment.groupId===targetId));
  f.core.saveUser(f.director,{...teacher,assignments:teacher.assignments.filter(assignment=>assignment.groupId!==targetId)});
  const current=f.core.user(teacher.id);
  prepareModuleClassrooms(f.core,f.director);
  assert.equal(f.core.assignment(f.core.user(teacher.id),targetId),false);
  assert.equal(f.core.user(teacher.id).version,current.version);
 }finally{f.core.close()}
});
