const fs=require('fs');
const path=require('path');
const http=require('http');
const {fork}=require('child_process');
const puppeteer=require('puppeteer');

const ROOT=path.resolve(__dirname,'..');
const BASE='http://127.0.0.1:8081/';
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const up=()=>new Promise(resolve=>{const request=http.get(BASE,response=>{response.resume();resolve(response.statusCode===200);});request.on('error',()=>resolve(false));request.setTimeout(1000,()=>{request.destroy();resolve(false);});});
async function waitServer(){for(let i=0;i<40;i++){if(await up())return;await new Promise(resolve=>setTimeout(resolve,250));}throw new Error('Servidor candidato 8081 no disponible.');}

async function run(){
  const results=[];const check=(id,passed,detail='')=>{const row={id,passed:Boolean(passed),detail};results.push(row);console.log(`[${row.passed?'PASSED':'FAILED'}] ${id}: ${detail}`);};
  const config=read('app/js/config.js'),schema=read('app/js/db/schema.js'),layout=read('app/js/ui/layout.js');
  check('T-ATT07-01-FILES',['app/js/repositories/attendance-v2-repository.js','app/js/services/attendance-session-service.js','app/js/services/attendance-mark-service.js','app/js/services/attendance-summary-service.js','app/js/services/attendance-document-context-service.js','tools/attendance-qa.html'].every(file=>fs.existsSync(path.join(ROOT,file))),'servicios separados y harness presentes');
  check('T-ATT07-02-V1',/VERSION:\s*runtime\?\.dbVersion\s*\|\|\s*1/.test(config)&&/NAME:\s*runtime\?\.dbName\s*\|\|\s*'CETPRO_DB'/.test(config),'CONFIG productiva permanece v1');
  check('T-ATT07-03-STORE',schema.includes("asistencia:")&&schema.includes("{ name: 'sesionId'")&&!read('app/js/db/schema-v2-design.js').includes('version: 3'),'store existente reutilizado; no schema3');
  const capacities=Object.fromEntries(['05','06','07','08','09','10'].map(id=>[id,JSON.parse(read(`app/data/pdf-manifests/TMPL-${id}.json`)).capacity.sessions]));
  check('T-ATT07-04-CAPACITY',JSON.stringify(capacities)===JSON.stringify({'05':44,'06':35,'07':38,'08':44,'09':44,'10':40}),JSON.stringify(capacities));
  check('T-ATT07-05-NO-MENU',!layout.includes('attendance-qa.html'),'harness no enlazado al menú normal');
  check('T-ATT07-06-PROD-BLOCK',read('scripts/dev-server.js').includes("reqPath === '/tools/attendance-qa.html'"),'puerto 8080 deniega herramienta QA');
  check('T-ATT07-07-POLICY',read('app/js/services/attendance-v2-domain.js').includes("status: 'BLOCKED_BY_POLICY'")&&read('app/js/services/attendance-v2-domain.js').includes("blocker: 'B-003'"),'política oficial no inventada');
  check('T-ATT07-08-IDS',read('app/js/services/attendance-v2-domain.js').includes('randomUUID')&&read('app/js/repositories/attendance-v2-repository.js').includes("generateAttendanceId('ATM')"),'IDs ATS/ATM estables');

  let server;if(!await up()){server=fork(require.resolve('../scripts/v2-candidate-server.js'),[],{silent:true});await waitServer();}
  const browser=await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true});
  try{
    const page=await browser.newPage();
    await page.goto(`${BASE}app/data/pdf-manifests/TMPL-05.json`,{waitUntil:'domcontentloaded'});
    const beforeDatabases=await page.evaluate(async()=>indexedDB.databases?await indexedDB.databases():[]);
    await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.deleteDatabase('CETPRO_V2_ATTENDANCE_LAB_QA');request.onsuccess=resolve;request.onerror=resolve;request.onblocked=resolve;}));
    await page.goto(`${BASE}tools/attendance-qa.html`,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>document.querySelectorAll('#body tr').length===40&&document.querySelector('#status')?.textContent.includes('Laboratorio listo'),{timeout:30000});
    check('T-ATT07-09-ORIGIN',await page.$eval('#origin',node=>node.textContent)===BASE.slice(0,-1),'origen 8081 exacto');
    check('T-ATT07-10-UI',await page.$$eval('#body tr',rows=>rows.length)===40&&await page.$$eval('#head th',cells=>cells.length)===8,'40 matrículas y 5 sesiones');
    check('T-ATT07-11-LABEL',await page.$eval('.warning',node=>node.textContent.includes('SINTÉTICOS')&&node.textContent.includes('NO OFICIAL')),'rotulado inequívoco');
    await page.click('#mark-all');
    check('T-ATT07-12-LOCAL',await page.$eval('#present',node=>node.textContent)==='40'&&await page.$eval('#dirty',node=>node.textContent).then(text=>text.includes('SIN GUARDAR')),'marcar todos solo cambia borrador');
    await page.click('#save-session');await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('guardada atómicamente'));
    check('T-ATT07-13-SAVE',await page.$eval('#sessions',node=>node.textContent)==='1'&&await page.$eval('#dirty',node=>node.textContent)==='SIN CAMBIOS','sesión completa persistida');
    await page.click('#reload');await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('recargados'));
    check('T-ATT07-14-RELOAD',await page.$eval('#present',node=>node.textContent)==='40','persistencia tras recarga');
    const xss=await page.evaluate(()=>{window.__attendanceXss=false;const input=document.querySelector('input[aria-label^="Observación"]');input.value='<script>alert(1)</script><img src=x onerror="window.__attendanceXss=true">';input.dispatchEvent(new Event('change',{bubbles:true}));return {executed:window.__attendanceXss,value:input.value};});
    check('T-ATT07-15-XSS',!xss.executed&&xss.value.includes('<script>alert(1)</script>'),'observación tratada como texto');

    const deep=await page.evaluate(async()=>{
      const checks=[];const check=(id,condition,detail='')=>checks.push({id,passed:Boolean(condition),detail});
      const rejects=async(fn,fragment='')=>{try{await fn();return false;}catch(error){return !fragment||String(error.message).includes(fragment);}};
      const {SchemaV2BackupLabService,readV2Snapshot}=await import('/app/js/services/schema-v2-backup-lab-service.js');
      const {AttendanceV2Repository}=await import('/app/js/repositories/attendance-v2-repository.js');
      const {AttendanceSummaryService}=await import('/app/js/services/attendance-summary-service.js');
      const {AttendanceDocumentContextService}=await import('/app/js/services/attendance-document-context-service.js');
      const {analyzeV2SystemIntegrity}=await import('/app/js/services/system-integrity-service.js');
      const {PdfTemplateEngine}=await import('/app/js/services/pdf-template-engine.js');
      const open=name=>new Promise((resolve,reject)=>{const request=indexedDB.open(name,2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      const remove=name=>new Promise(resolve=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=resolve;request.onblocked=resolve;});
      const txDone=(db,names,work)=>new Promise((resolve,reject)=>{const tx=db.transaction(names,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=tx.onerror;work(tx);});
      const getAll=(db,store)=>new Promise((resolve,reject)=>{const request=db.transaction(store,'readonly').objectStore(store).getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>reject(request.error);});
      const seed=async(db,{count=3,prefix='A',sameStudent=false}={})=>{const ids={program:`PRO-${prefix}`,module:`MOD-${prefix}`,period:`PER-${prefix}`,unit:`UNI-${prefix}`,group:`GAC-${prefix}`};await txDone(db,['programas','modulos','periodos','unidades','grupos_academicos','estudiantes','matriculas'],tx=>{tx.objectStore('programas').put({id:ids.program,nombre:`PROGRAMA ${prefix}`,estado:'ACTIVO'});tx.objectStore('modulos').put({id:ids.module,programaId:ids.program,nombre:`MODULO ${prefix}`,estado:'ACTIVO'});tx.objectStore('periodos').put({id:ids.period,nombre:`PERIODO ${prefix}`,estado:'ACTIVO'});tx.objectStore('unidades').put({id:ids.unit,moduloId:ids.module,nombre:`UNIDAD ${prefix}`,orden:1,estado:'ACTIVO'});tx.objectStore('grupos_academicos').put({id:ids.group,codigoVisible:prefix,sourceGroupCode:prefix,programaId:ids.program,moduloId:ids.module,periodoId:ids.period,estado:'ACTIVO'});for(let i=0;i<count;i++){const student=sameStudent?`EST-${prefix}-SHARED`:`EST-${prefix}-${i}`;if(!sameStudent||i===0)tx.objectStore('estudiantes').put({id:student,apellidoPaterno:'SINTETICO',nombres:`QA ${i}`});tx.objectStore('matriculas').put({id:`MAT-${prefix}-${i}`,estudianteId:student,programaId:ids.program,grupoCode:prefix,grupoId:ids.group,estado:'ACTIVO'});}});return {...ids,enrollments:Array.from({length:count},(_,i)=>`MAT-${prefix}-${i}`)};};
      const session=(ids,suffix='1',version=0)=>({sessionId:`ATS-${suffix.padEnd(36,'0').slice(0,36)}`,groupId:ids.group,periodoId:ids.period,unidadId:ids.unit,fecha:'2026-09-01',ordenSesion:1,horasProgramadas:4,estado:'ACTIVA',version});
      const marks=ids=>ids.enrollments.map((matriculaId,index)=>({matriculaId,estadoRegistro:index%4===0?'AUSENTE':index%4===1?'JUSTIFICADA':index%4===2?'SIN_REGISTRO':'PRESENTE',horasRegistradas:null,observacion:''}));
      const labName=`CETPRO_V2_ATTENDANCE_LAB_TEST_${Date.now()}`;const lab=await SchemaV2BackupLabService.createEmptyDatabase(labName);const ids=await seed(lab,{count:3,prefix:'CORE'});const repo=new AttendanceV2Repository(()=>lab);const saveStarted=performanceNow();const first=await repo.saveSessionWithMarks({session:session(ids,'CORE-1'),marks:marks(ids),expectedVersion:0});const firstSaveMs=performanceNow()-saveStarted;
      check('T-ATT07-16-TYPED',first.session.recordType==='ATTENDANCE_SESSION'&&first.marks.every(row=>row.recordType==='ATTENDANCE_MARK'),'sesión y marcas tipadas');
      check('T-ATT07-17-IDENTITY',first.session.id.startsWith('ATS-')&&first.marks.every(row=>row.id.startsWith('ATM-')),'identidades técnicas');
      const summary=new AttendanceSummaryService().summarize({sessions:[first.session],marks:first.marks});
      check('T-ATT07-18-COUNTS',summary.presentCount===0&&summary.absentCount===1&&summary.justifiedCount===1&&summary.unmarkedCount===1&&summary.markedCount===2,'conteos técnicos exactos');
      check('T-ATT07-19-POLICY',summary.officialAbsencePercentage.status==='BLOCKED_BY_POLICY'&&summary.officialAbsencePercentage.value===null,'porcentaje oficial bloqueado');
      const oldId=first.marks[0].id;const changed=first.marks.map((row,index)=>({matriculaId:row.matriculaId,estadoRegistro:index===0?'PRESENTE':row.estadoRegistro,horasRegistradas:row.horasRegistradas,observacion:row.observacion}));const updated=await repo.saveSessionWithMarks({session:first.session,marks:changed,expectedVersion:1});
      check('T-ATT07-20-UPDATE',updated.session.version===2&&updated.marks[0].id===oldId&&updated.marks[0].version===2&&updated.marks[1].version===1&&(await repo.listMarksBySession(first.session.sessionId)).length===3,'solo la marca editada cambia; sin duplicar');
      const attendanceBefore=(await getAll(lab,'asistencia')).length;
      check('T-ATT07-21-DUPLICATE',await rejects(()=>repo.saveSessionWithMarks({session:updated.session,marks:[changed[0],changed[0],changed[2]],expectedVersion:2}),'duplicada')&&(await getAll(lab,'asistencia')).length===attendanceBefore,'duplicado rechazado sin escritura');
      check('T-ATT07-22-FUTURE',await rejects(()=>repo.saveSessionWithMarks({session:{...session(ids,'FUTURE'),fecha:'2999-01-01'},marks:marks(ids),expectedVersion:0}),'futura'),'futuro no admite marcas');
      check('T-ATT07-23-STALE',await rejects(()=>repo.saveSessionWithMarks({session:updated.session,marks:changed,expectedVersion:1}),'STALE_SESSION'),'concurrencia optimista');
      check('T-ATT07-24-CROSS-GROUP',await rejects(()=>repo.saveSessionWithMarks({session:session(ids,'CROSS'),marks:[...marks(ids).slice(0,2),{...marks(ids)[2],matriculaId:'MAT-FOREIGN'}],expectedVersion:0}),'ajena'),'matrícula ajena rechazada');
      await txDone(lab,['modulos','periodos','unidades'],tx=>{tx.objectStore('modulos').put({id:'MOD-OTHER',programaId:ids.program,nombre:'OTRO',estado:'ACTIVO'});tx.objectStore('periodos').put({id:'PER-OTHER',nombre:'OTRO',estado:'ACTIVO'});tx.objectStore('unidades').put({id:'UNI-OTHER',moduloId:'MOD-OTHER',nombre:'OTRA',orden:1,estado:'ACTIVO'});});
      check('T-ATT07-24A-CROSS-UNIT',await rejects(()=>repo.saveSessionWithMarks({session:{...session(ids,'UNIT'),unidadId:'UNI-OTHER'},marks:marks(ids),expectedVersion:0}),'cambió'),'unidad de otro módulo rechazada');
      check('T-ATT07-24A-CROSS-PERIOD',await rejects(()=>repo.saveSessionWithMarks({session:{...session(ids,'PERIOD'),periodoId:'PER-OTHER'},marks:marks(ids),expectedVersion:0}),'cambió'),'periodo ajeno al grupo rechazado');
      check('T-ATT07-24B-MISSING',await rejects(()=>repo.saveSessionWithMarks({session:session(ids,'MISSING'),marks:marks(ids).slice(0,2),expectedVersion:0}),'Faltan'),'ninguna matrícula puede omitirse');
      check('T-ATT07-24C-DATE',await rejects(()=>repo.saveSessionWithMarks({session:{...session(ids,'DATE'),fecha:'2026-02-30'},marks:marks(ids),expectedVersion:0}),'fecha'),'fecha estricta YYYY-MM-DD');
      await txDone(lab,['grupos_academicos'],tx=>tx.objectStore('grupos_academicos').put({id:'GAC-ISO',codigoVisible:'ISO',sourceGroupCode:'ISO',programaId:ids.program,moduloId:ids.module,periodoId:ids.period,estado:'ACTIVO'}));
      await txDone(lab,['matriculas'],tx=>tx.objectStore('matriculas').put({id:'MAT-ISO',estudianteId:'EST-CORE-0',programaId:ids.program,grupoCode:'ISO',grupoId:'GAC-ISO',estado:'ACTIVO'}));
      const isoIds={...ids,group:'GAC-ISO',enrollments:['MAT-ISO']};const iso=await repo.saveSessionWithMarks({session:session(isoIds,'ISO'),marks:[{matriculaId:'MAT-ISO',estadoRegistro:'AUSENTE',horasRegistradas:null,observacion:''}],expectedVersion:0});
      check('T-ATT07-24D-TWO-ENROLLMENTS',iso.marks[0].matriculaId==='MAT-ISO'&&(await repo.listMarksByEnrollment('MAT-CORE-0')).length===1&&(await repo.listMarksByEnrollment('MAT-ISO')).length===1,'mismo estudiante, matrículas y grupos aislados');
      await txDone(lab,['grupos_academicos'],tx=>tx.objectStore('grupos_academicos').put({id:ids.group,codigoVisible:'CORE',sourceGroupCode:'CORE',programaId:ids.program,moduloId:ids.module,periodoId:ids.period,estado:'INACTIVO'}));
      check('T-ATT07-24E-INACTIVE',await rejects(()=>repo.saveSessionWithMarks({session:session(ids,'INACTIVE'),marks:marks(ids),expectedVersion:0}),'cambió'),'grupo inactivo rechazado');
      await txDone(lab,['grupos_academicos'],tx=>tx.objectStore('grupos_academicos').put({id:ids.group,codigoVisible:'CORE',sourceGroupCode:'CORE',programaId:ids.program,moduloId:ids.module,periodoId:ids.period,estado:'ACTIVO'}));
      for(const [index,fault] of ['before','before_first_mark','first_mark','middle','last_mark','audit','before_commit'].entries()){
        const beforeA=(await getAll(lab,'asistencia')).length,beforeU=(await getAll(lab,'auditoria')).length;
        const rejected=await rejects(()=>repo.saveSessionWithMarks({session:session(ids,`FAULT-${index}`),marks:marks(ids),expectedVersion:0,faultAt:fault}),'SIMULATED');
        check(`T-ATT07-ROLLBACK-${index+1}`,rejected&&(await getAll(lab,'asistencia')).length===beforeA&&(await getAll(lab,'auditoria')).length===beforeU,`rollback ${fault}`);
      }
      const contextStarted=performanceNow();const context=await new AttendanceDocumentContextService({repository:repo}).buildAttendanceDocumentContext({groupId:ids.group,periodoId:ids.period,unidadId:ids.unit,testOnly:true});const contextMs=performanceNow()-contextStarted;
      check('T-ATT07-32-DOC',context.templateId==='TMPL-05'&&context.rows.length===3&&context.sessions.length===1&&context.source.authority==='GROUPID_MATRICULAID','contexto documental autoritativo');
      const pdf=await new PdfTemplateEngine().renderFromManifest(context.templateId,context.resolvedFieldSet,context.rows,{rows:context.rows.length,sessions:context.sessions.length});
      check('T-ATT07-33-PDF',pdf instanceof Blob&&pdf.type==='application/pdf'&&pdf.size>1000,'PDF TMPL-05 técnico');
      const exported=await SchemaV2BackupLabService.exportBackup(lab,'ATTENDANCE_ENGINE_V2_07');const restoreName=`CETPRO_V2_ATTENDANCE_LAB_RESTORE_${Date.now()}`;const restored=await SchemaV2BackupLabService.createEmptyDatabase(restoreName);await SchemaV2BackupLabService.restoreBackup(exported,restored);const restoredRepo=new AttendanceV2Repository(()=>restored);const restoredRows=await restoredRepo.listMarksBySession(first.session.sessionId);
      check('T-ATT07-34-BACKUP',restoredRows.length===3&&(await restoredRepo.getSessionById(first.session.sessionId)).version===2,'backup/restore/readback');
      const snapshot=await readV2Snapshot(lab);const integrity=analyzeV2SystemIntegrity(snapshot,{version:2,stores:[...lab.objectStoreNames]});
      check('T-ATT07-35-INTEGRITY',integrity.valid&&integrity.issueCount===0,'integridad tipada válida');
      const bad=structuredClone(snapshot);bad.asistencia.push({...updated.marks[0],id:'ATM-DUPLICATE'});const badReport=analyzeV2SystemIntegrity(bad,{version:2,stores:[...lab.objectStoreNames]});
      check('T-ATT07-36-DUP-AUDIT',badReport.issues.some(issue=>issue.code==='ATTENDANCE_MARK_DUPLICATE_ACTIVE'),'auditor detecta unicidad');
      const orphan=structuredClone(snapshot);orphan.asistencia.push({...updated.marks[0],id:'ATM-ORPHAN',sessionId:'ATS-NO-EXISTE'});const orphanReport=analyzeV2SystemIntegrity(orphan,{version:2,stores:[...lab.objectStoreNames]});
      check('T-ATT07-37-ORPHAN',orphanReport.issues.some(issue=>issue.code==='ATTENDANCE_MARK_SESSION_ORPHAN'),'auditor detecta sesión huérfana');
      const matrixBad=structuredClone(snapshot),baseSession=matrixBad.asistencia.find(row=>row.recordType==='ATTENDANCE_SESSION'&&row.groupId===ids.group),baseMark=matrixBad.asistencia.find(row=>row.recordType==='ATTENDANCE_MARK'&&row.sessionId===baseSession.sessionId);
      matrixBad.asistencia.push(
        {...baseSession,id:'ATS-BAD-GROUP',sessionId:'ATS-BAD-GROUP',sesionId:'ATS-BAD-GROUP',groupId:'GAC-NO-EXISTE'},
        {...baseSession,id:'ATS-BAD-UNIT',sessionId:'ATS-BAD-UNIT',sesionId:'ATS-BAD-UNIT',unidadId:'UNI-NO-EXISTE'},
        {...baseSession,id:'ATS-BAD-MODULE',sessionId:'ATS-BAD-MODULE',sesionId:'ATS-BAD-MODULE',unidadId:'UNI-OTHER'},
        {...baseSession,id:'ATS-BAD-PERIOD',sessionId:'ATS-BAD-PERIOD',sesionId:'ATS-BAD-PERIOD',periodoId:'PER-OTHER'},
        {...baseMark,id:'ATM-BAD-ENROLLMENT',attendanceId:'ATM-BAD-ENROLLMENT',matriculaId:'MAT-NO-EXISTE'},
        {...baseMark,id:'ATM-BAD-CONTEXT',attendanceId:'ATM-BAD-CONTEXT',groupId:'GAC-ISO'},
        {...baseMark,id:'ATM-BAD-MEMBERSHIP',attendanceId:'ATM-BAD-MEMBERSHIP',matriculaId:'MAT-ISO'}
      );
      const matrixReport=analyzeV2SystemIntegrity(matrixBad,{version:2,stores:[...lab.objectStoreNames]});const expectedIssueCodes=['ATTENDANCE_SESSION_GROUP_ORPHAN','ATTENDANCE_SESSION_UNIT_ORPHAN','ATTENDANCE_MARK_ENROLLMENT_ORPHAN','ATTENDANCE_MARK_CONTEXT_MISMATCH','ATTENDANCE_MARK_GROUP_MEMBERSHIP_MISMATCH','ATTENDANCE_SESSION_UNIT_MODULE_MISMATCH','ATTENDANCE_SESSION_PERIOD_MISMATCH'];
      const missingIssueCodes=expectedIssueCodes.filter(code=>!matrixReport.issues.some(issue=>issue.code===code));
      check('T-ATT07-37D-INTEGRITY-MATRIX',missingIssueCodes.length===0,missingIssueCodes.length?`faltan ${missingIssueCodes.join(',')}`:'auditor cubre grupo/unidad/matrícula/contexto/membresía/módulo/periodo');
      const rowLabName=`CETPRO_V2_ATTENDANCE_LAB_ROWS_${Date.now()}`;const rowLab=await SchemaV2BackupLabService.createEmptyDatabase(rowLabName);const rowIds=await seed(rowLab,{count:41,prefix:'ROWS'});const rowRepo=new AttendanceV2Repository(()=>rowLab);
      check('T-ATT07-37B-ROW-CAPACITY',await rejects(()=>new AttendanceDocumentContextService({repository:rowRepo}).buildAttendanceDocumentContext({groupId:rowIds.group,periodoId:rowIds.period,unidadId:rowIds.unit,testOnly:true}),'CAPACITY_EXCEEDED'),'41 estudiantes falla sin truncar');
      const sessionLabName=`CETPRO_V2_ATTENDANCE_LAB_SESSIONS_${Date.now()}`;const sessionLab=await SchemaV2BackupLabService.createEmptyDatabase(sessionLabName);const sessionIds=await seed(sessionLab,{count:1,prefix:'SESS'});await txDone(sessionLab,['asistencia'],tx=>{for(let i=0;i<45;i++){const id=`ATS-CAP-${String(i).padStart(32,'0')}`;tx.objectStore('asistencia').put({id,sessionId:id,sesionId:id,recordType:'ATTENDANCE_SESSION',groupId:sessionIds.group,periodoId:sessionIds.period,unidadId:sessionIds.unit,fecha:`2026-${String(1+Math.floor(i/28)).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`,estado:'ACTIVA',version:1});}});const sessionRepo=new AttendanceV2Repository(()=>sessionLab);
      check('T-ATT07-37C-SESSION-CAPACITY',await rejects(()=>new AttendanceDocumentContextService({repository:sessionRepo}).buildAttendanceDocumentContext({groupId:sessionIds.group,periodoId:sessionIds.period,unidadId:sessionIds.unit,testOnly:true}),'SESSION_CAPACITY_EXCEEDED'),'45 sesiones supera capacidad física TMPL-05');
      const performance=[];for(const [students,sessions] of [[40,30],[100,50],[300,50]]){const start=performanceNow();const generated=Array.from({length:students*sessions},(_,i)=>({estadoRegistro:i%4===0?'AUSENTE':'PRESENTE'}));const summaryStart=performanceNow();new AttendanceSummaryService().summarize({marks:generated});performance.push({students,sessions,buildMs:summaryStart-start,summaryMs:performanceNow()-summaryStart});}
      check('T-ATT07-38-PERF',firstSaveMs<5000&&contextMs<2000&&performance.every(row=>row.buildMs<1000&&row.summaryMs<1000),JSON.stringify({firstSaveMs,contextMs,scales:performance}));
      const afterNames=await indexedDB.databases?.()||[];check('T-ATT07-39-NAMES',afterNames.filter(item=>item.name?.includes('ATTENDANCE_LAB')).every(item=>item.name.startsWith('CETPRO_V2_ATTENDANCE_LAB_')),'solo nombres de laboratorio');
      lab.close();restored.close();rowLab.close();sessionLab.close();await remove(labName);await remove(restoreName);await remove(rowLabName);await remove(sessionLabName);
      return {checks};
      function performanceNow(){return globalThis.performance.now();}
    });
    deep.checks.forEach(row=>check(row.id,row.passed,row.detail));
    const afterDatabases=await page.evaluate(async()=>indexedDB.databases?await indexedDB.databases():[]);
    check('T-ATT07-40-CANDIDATE-UNTOUCHED',!beforeDatabases.some(item=>item.name==='CETPRO_V2_CANDIDATE')&&!afterDatabases.some(item=>item.name==='CETPRO_V2_CANDIDATE'),'el gate no creó ni abrió candidata/producto');
    check('T-ATT07-41-NETWORK',await page.evaluate(()=>performance.getEntriesByType('resource').every(item=>new URL(item.name).hostname==='127.0.0.1')),'sin dependencia de red externa');
  }finally{await browser.close();if(server)server.kill();}
  return {total:results.length,passed:results.filter(row=>row.passed).length,failed:results.filter(row=>!row.passed).length};
}
module.exports={name:'ATTENDANCE_ENGINE_V2_07',run};



