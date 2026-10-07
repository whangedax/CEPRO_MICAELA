const fs=require('node:fs'),path=require('node:path');
const {OfflineCore}=require('./offline-core.cjs'),D=require('./offline-documents.cjs'),{renderPDF}=require('./offline-pdf.cjs');
const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'demo-data');
async function main(){
 const c=new OfflineCore(directory);try{
  if(c.status().initialized&&!c.setting('documentDemo'))throw Error('La carpeta demo contiene otra institución; no se modificó.');
  if(!c.status().initialized){
   c.setup({username:'demo.director',name:'Director ficticio DEMO',password:'DemoCETPRO2026!',institutionName:'CETPRO DEMOSTRACIÓN - DATOS FICTICIOS'});c.setting('documentDemo',true);
   const director=c.users()[0],units=['UD1','UD2','UD3','UD4','UD5','UD6','UD7','EFSRT'];
   const group=c.saveGroup(director,{name:'DEMO · Ofimática · Grupo A',programId:'PROG-005',moduleId:'MOD-009',periodId:'2026-I DEMO',units});
   const teacherUser=c.saveUser(director,{username:'demo.docente',name:'Andrea Docente DEMO',password:'DemoCETPRO2026!',role:'DOCENTE',assignments:[{groupId:group.id,units}]});const teacher=c.user(teacherUser.id);
   c.saveUser(director,{username:'demo.secretaria',name:'Lucía Secretaria DEMO',password:'DemoCETPRO2026!',role:'SECRETARIA'});
   const put=(kind,target,fields,unit)=>D.saveSettings(c,director,{scope:{kind,...(target?{target}:{}),...(unit?{unit}:{})},fields,rev:null});
   put('institution',null,{nombre:'CETPRO DEMOSTRACIÓN - DATOS FICTICIOS',tipoGestion:'PÚBLICA',codigoModular:'DEMO001',dre:'DRE DEMO',ugel:'UGEL DEMO',region:'Lima - DEMO',departamento:'Lima - DEMO',provincia:'Lima - DEMO',distrito:'Distrito DEMO',lugar:'Local de demostración',direccion:'Avenida ficticia 123 - DEMO',telefono:'DEMO',resolucionAutorizacion:'RD-DEMO-001',resolucionConversion:'RD-DEMO-002',directorNombre:'Director ficticio DEMO',secretariaNombre:'Lucía Secretaria DEMO',coordinadorNombre:'Coordinación ficticia DEMO'});
   put('program','PROG-005',{nivelFormativo:'Auxiliar técnico - DEMO',tipoPlan:'Plan de demostración',resolucionPrograma:'RD-P-DEMO',officialTitleText:'AUXILIAR TÉCNICO EN OFIMÁTICA - DEMO'});
   put('module','MOD-009',{hours:210,credits:7,efsrtHours:30,competence:'Gestiona documentos digitales y herramientas de oficina.',resolucionAutorizacion:'RD-M-DEMO',presenceStates:'P,T',absenceStates:'F,J',absenceDenominator:'PROGRAMADAS',approvalMinimum:13});
   put('group',group.id,{ciclo:'Auxiliar técnico - DEMO',seccion:'A',turno:'Mañana',modalidad:'Presencial - DEMO',fechaInicio:'2026-03-02',fechaFin:'2026-07-31',periodClase:'Marzo a julio - DEMO',teacherName:'Andrea Docente DEMO',efsrtInicio:'2026-06-01',efsrtFin:'2026-07-24'});
   const titles=['Entorno digital y archivos','Procesador de textos','Hojas de cálculo','Presentaciones digitales','Comunicación y colaboración','Seguridad de la información','Proyecto de ofimática'];
   for(let i=0;i<7;i++){
    put('unit',group.id,{name:titles[i],capacity:'Aplica herramientas digitales en tareas de oficina con orden y precisión.',competence:'Gestiona información y documentos digitales.',indicator1:'Identifica herramientas y funciones de la aplicación.',indicator2:'Organiza los archivos y recursos de trabajo.',indicator3:'Ejecuta procedimientos según la tarea propuesta.',indicator4:'Revisa resultados y corrige errores.',indicator5:'Presenta el producto digital y explica su elaboración.'},units[i]);
    put('unitCurriculum',group.id,{hours:30,credits:1},units[i]);
   }
   const names=[['Álvarez','Demo','Ana'],['Castro','Demo','Bruno'],['Díaz','Demo','Carla'],['Flores','Demo','Diego'],['García','Demo','Elena'],['Huamán','Demo','Felipe'],['López','Demo','Gabriela'],['Mendoza','Demo','Hugo'],['Pérez','Demo','Isabel'],['Ramírez','Demo','Javier'],['Torres','Demo','Karina'],['Vargas','Demo','Luis']];
   const dates=['2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-13'];
   for(let i=0;i<names.length;i++){
    const [lastName1,lastName2,firstNames]=names[i],student=c.saveStudent(director,{name:`${lastName1} ${lastName2}, ${firstNames} (DEMO)`,document:`DEMO${String(i+1).padStart(4,'0')}`,documentType:'DEMO',lastName1,lastName2,firstNames:firstNames+' (DEMO)',sex:i%2?'H':'M',birthDate:`${1998+i%6}-${String(i%9+1).padStart(2,'0')}-15`});
    const enrollment=c.enroll(director,{studentId:student.id,groupId:group.id,startDate:'2026-03-02'}),grade=12+i%8;
    put('enrollment',enrollment.id,{condition:['G','P','B'][i%3],emissionDate:'2026-07-31'});
    put('registry',enrollment.id,{registerCode:`REG-DM${String(i+1).padStart(3,'0')}`,registryBook:'LIBRO DEMO',registryFolio:String(i+1).padStart(3,'0'),registryNumber:`D${i+1}`,registryDate:'2026-07-31',registryAsiento:`ASIENTO DEMO ${i+1}`});
    put('practice',enrollment.id,{companyName:'OFICINA FICTICIA DEMO',companyAddress:'Calle de ejemplo 123 - DEMO',criterion1:2,criterion2:2,criterion3:2,criterion4:2,criterion5:3,criterion6:2,criterion7:1,criterion8:2,criterion9:1,efsrtFinalGrade:17});
    put('closure',enrollment.id,{modularGrade:grade,approvedUnitsCount:grade>=13?7:0,failedUnitsCount:grade>=13?0:7,observations:'Registro ficticio de demostración'});
    for(let u=0;u<7;u++){
     const rows=Array.from({length:5},(_,k)=>['IA1','IA2','IA3','','RECOVERY'].map((component,j)=>({enrollmentId:enrollment.id,indicator:`IL${k+1}${component?'.'+component:''}`,value:component==='RECOVERY'?(grade<13?14:null):Math.min(20,grade+(j+k+u)%3),clear:component==='RECOVERY'&&grade>=13}))).flat();rows.push({enrollmentId:enrollment.id,indicator:'RESULTADO_UD',value:grade});c.saveAcademic(teacher,'grades',{groupId:group.id,unit:units[u],rows});
     for(let d=0;d<dates.length;d++){const value=(i+d)%11===0?'F':(i+d)%9===0?'J':(i+d)%7===0?'T':'P';c.saveAcademic(teacher,'attendance',{groupId:group.id,unit:units[u],date:dates[d],session:'1',rows:[{enrollmentId:enrollment.id,value}]});}
    }
   }
   c.setting('documentDemoGroup',group.id);
  }
  const director=c.users().find(u=>u.role==='DIRECTOR'),groupId=c.setting('documentDemoGroup'),enrollmentId=c.records('enrollments')[0].id;
  const combined=await PDFDocument.create(),out=path.join(root,'output/pdf'),temporary=path.join(root,'tmp/pdfs/demo');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(temporary,{recursive:true});
  for(let n=1;n<=21;n++){const templateId=`TMPL-${String(n).padStart(2,'0')}`,doc=c.document(director,{templateId,groupId,...([2,20,21].includes(n)?{enrollmentId}:{})});if(!doc.preflight.complete)throw Error(templateId+' tiene pendientes: '+JSON.stringify(doc.preflight.missing));const bytes=await renderPDF(root,doc,director,{auditFile:path.join(temporary,templateId+'.audit.json')});fs.writeFileSync(path.join(temporary,`${templateId}.pdf`),bytes);const part=await PDFDocument.load(bytes);for(const page of await combined.copyPages(part,part.getPageIndices()))combined.addPage(page);}
  const file=path.join(out,'CETPRO_FORMATOS_RELLENADOS_DEMO.pdf');fs.writeFileSync(file,await combined.save());console.log(JSON.stringify({pdf:file,pages:combined.getPageCount(),students:c.records('students').length,groupId,users:['demo.director','demo.docente','demo.secretaria'],password:'DemoCETPRO2026!'}));
 }finally{c.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
