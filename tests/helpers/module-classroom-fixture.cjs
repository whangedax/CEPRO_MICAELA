const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {OfflineCore}=require('../../scripts/offline-core.cjs');
const {PROGRAMS_CATALOG,FILE_CLASSROOM_MAPPING}=require('../../scripts/import-real-bd-2026.cjs');

function moduleFixture() {
 const parent=path.join(__dirname,'../../dev-sandbox/data/module-classrooms');
 fs.mkdirSync(parent,{recursive:true});
 const directory=fs.mkdtempSync(path.join(parent,'case-'));
 const core=new OfflineCore(directory,null);
 core.setup({username:'director.modulos',password:'DirectorQA2026!',name:'Dirección sintética de módulos',importBaseline:false});
 const director=core.users()[0],assignments=new Map(),sources=[];
 for(const program of PROGRAMS_CATALOG)for(const module of program.modules) {
  const previous=core.record('modules',module.id);
  core.write(director,'modules',{...previous,nombre:module.nombre,academicYear:'2026'},previous.rev);
  core.write(director,'documentSettings',{id:'curriculum:'+module.id,scope:{kind:'curriculum',target:module.id},
   fields:{year:'2026',periodId:module.periodId,nombre:module.nombre,programName:program.nombre,programCode:program.id,
    turno:module.turno,hours:module.units.reduce((sum,unit)=>sum+unit.hours,0),credits:module.units.reduce((sum,unit)=>sum+unit.credits,0),
    unitsJson:JSON.stringify(module.units)}});
 }
 for(const [periodId,fechaInicio,fechaFin] of [['2026-I','2026-03-16','2026-07-24'],['2026-II','2026-08-10','2026-12-18']]) {
  core.write(director,'documentSettings',{id:'academicPeriod:'+periodId,scope:{kind:'academicPeriod',target:periodId},fields:{year:'2026',fechaInicio,fechaFin}});
 }
 for(const mapping of FILE_CLASSROOM_MAPPING) {
  const plan=PROGRAMS_CATALOG.flatMap(program=>program.modules).find(module=>module.id===mapping.moduleId);
  for(const section of mapping.sections) {
   const source=core.write(director,'groups',{id:section.id,name:'Aula QA '+section.id,
    programId:mapping.programId,moduleId:mapping.moduleId,periodId:'2026-I',
    turno:mapping.turno,modalidad:mapping.modalidad,section:section.section,units:plan.units.map(unit=>unit.code),
    closed:false,archived:false});
   sources.push(source);
   if(!assignments.has(mapping.teacherUsername))assignments.set(mapping.teacherUsername,[]);
   assignments.get(mapping.teacherUsername).push({groupId:source.id,units:source.units});
  }
 }
 let index=0;
 for(const [username,groups] of assignments)core.saveUser(director,{
  username,name:'Docente sintético QA '+(++index),role:'DOCENTE',password:'DocenteQA2026!',assignments:groups
 });
 const secretary=core.saveUser(director,{username:'secretaria.modulos',name:'Secretaría sintética QA',role:'SECRETARIA',password:'SecretariaQA2026!'});
 return{core,director,secretary,sources,directory,mapping:FILE_CLASSROOM_MAPPING,catalog:PROGRAMS_CATALOG};
}
module.exports={moduleFixture};
