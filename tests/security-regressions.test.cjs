const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createService}=require('../scripts/offline-http.cjs');
const root=path.resolve(__dirname,'..');
const parent=path.join(root,'dev-sandbox/data/security-regressions');
fs.mkdirSync(parent,{recursive:true});
test('retiros válidos y rechazo atómico de retiros o traslados anteriores al ingreso',async()=>{
 const fixture=await make();
 const {core,director,request,tokens}=fixture;
 try {
  const group=core.saveGroup(director,{name:'Aula origen QA',programId:'PROG-005',moduleId:'MOD-009',periodId:'2026-I',units:['UD1']});
  const other=core.saveGroup(director,{name:'Aula destino QA',programId:'PROG-005',moduleId:'MOD-009',periodId:'2026-I',units:['UD1']});
  const student=core.saveStudent(director,{name:'Estudiante QA',document:'88888801'});
  const enrollment=core.enroll(director,{groupId:group.id,studentId:student.id,startDate:'2026-03-18'});
  for(const role of ['DIRECTOR','SECRETARIA']) {
   const before=JSON.stringify(core.records('enrollments'));
   for(const targetGroupId of [undefined,other.id]) {
    const response=await request('/api/enrollments/retire',tokens[role],{id:enrollment.id,rev:enrollment.rev,date:'2026-03-17',reason:'Prueba anterior al ingreso',targetGroupId});
    assert.equal(response.status,400);
    assert.match(response.data.error,/anterior.*ingreso/i);
    assert.equal(JSON.stringify(core.records('enrollments')),before);
   }
  }
  assert.equal((await request('/api/enrollments/retire',tokens.DOCENTE,{id:enrollment.id,rev:enrollment.rev,date:'2026-03-18',reason:'Intento sin permiso'})).status,403);
  const valid=await request('/api/enrollments/retire',tokens.SECRETARIA,{id:enrollment.id,rev:enrollment.rev,date:'2026-03-18',reason:'Retiro el mismo día de ingreso'});
  assert.equal(valid.status,200);assert.equal(valid.data.active,false);assert.equal(valid.data.endDate,'2026-03-18');
 } finally {await fixture.close()}
});
test('admisión pública y configuración entregan nombres de todas las carreras',async()=>{
 const fixture=await make();
 try{
  for(const route of ['/api/public/admission-ficha/info','/api/public/admission-ficha/config','/api/admission-ficha/config']) {
   const r=await fixture.request(route,route==='/api/admission-ficha/config'?fixture.tokens.SECRETARIA:undefined);
   assert.equal(r.status,200,JSON.stringify(r.data));
   assert.equal(r.data.programs.length,7);
   for(const program of r.data.programs)assert.equal(program.name,fixture.core.record('programs',program.id).nombre);
  }
 }finally{await fixture.close()}
});
test('restauración fallida conserva sesiones y restauración correcta revoca todos los tokens anteriores',async()=>{
 const fixture=await make();
 const {core,director,request,tokens}=fixture;
 try{
  const backup=core.createBackup(director,'qa-regresion');
  const idle=await fixture.login('docente.qa');
  const actor=core.users().find(u=>u.username==='docente.qa');
  const failed=await request('/api/restore',tokens.DIRECTOR,{source:{backup:{},checksum:'incorrecto'}});
  assert.equal(failed.status,400);
  const corrupt = JSON.parse(fs.readFileSync(path.join(core.directory, 'backups', backup.filename), 'utf8'));
  corrupt.backup.records.push({
    entity:'enrollments',id:'QA-ORPHAN',
    value:JSON.stringify({id:'QA-ORPHAN',studentId:'MISSING',groupId:'MISSING',active:true})
  });
  corrupt.checksum = require('../scripts/offline-core.cjs').hash(corrupt.backup);
  const previousGroups = JSON.stringify(core.records('groups'));
  const rollback = await request('/api/restore',tokens.DIRECTOR,{source:corrupt});
  assert.equal(rollback.status,400);
  assert.equal(core.record('enrollments','QA-ORPHAN'),null);
  assert.equal(JSON.stringify(core.records('groups')),previousGroups);

  for(const token of Object.values(tokens))assert.equal((await request('/api/me',token)).status,200);
  assert.equal((await request('/api/users/archive',tokens.DIRECTOR,{id:actor.id,version:actor.version,reason:'Archivo de prueba'})).status,200);
  const result=await request('/api/restore',tokens.DIRECTOR,{filename:backup.filename});
  assert.equal(result.status,200);assert.equal(result.data.requiresLogin,true);assert.equal(core.sessions.size,0);
  for(const token of [...Object.values(tokens),idle])assert.equal((await request('/api/me',token)).status,401);
  for(const username of ['direccion.qa','secretaria.qa','docente.qa']) {
   const token=await fixture.login(username);
   assert.equal((await request('/api/me',token)).status,200);
  }
 }finally{await fixture.close()}
});
async function make(){
 const directory=fs.mkdtempSync(path.join(parent,'case-'));
 const service=createService({root,directory,backupFile:null});
 const core=service.core;
 core.setup({username:'direccion.qa',password:'ClaveRegresion2026!',name:'Dirección QA',importBaseline:false});
 const director=core.users()[0];
 const assigned=core.saveGroup(director,{name:'Aula asignada QA',programId:'PROG-005',moduleId:'MOD-009',periodId:'2026-I',units:['UD1']});
 core.saveUser(director,{username:'secretaria.qa',password:'ClaveRegresion2026!',name:'Secretaría QA',role:'SECRETARIA'});
 core.saveUser(director,{username:'docente.qa',password:'ClaveRegresion2026!',name:'Docente QA',role:'DOCENTE',assignments:[{groupId:assigned.id,units:['UD1']}]});
 const server=service.server();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const request=async(route,token,body)=>{
  const response=await fetch(url+route,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return{status:response.status,data:await response.json()};
 };
 const login=async username=>{
  const response=await request('/api/login',null,{username,password:'ClaveRegresion2026!'});
  assert.equal(response.status,200,JSON.stringify(response.data));return response.data.token;
 };
 const tokens={DIRECTOR:await login('direccion.qa'),SECRETARIA:await login('secretaria.qa'),DOCENTE:await login('docente.qa')};
 return{core,director,request,tokens,login,close:async()=>{await new Promise(resolve=>server.close(resolve));core.close()}};
}
