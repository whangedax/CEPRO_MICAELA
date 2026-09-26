import { SchemaV2BackupLabService } from '/app/js/services/schema-v2-backup-lab-service.js';
import { AttendanceV2Repository } from '/app/js/repositories/attendance-v2-repository.js';
import { AttendanceMarkService } from '/app/js/services/attendance-mark-service.js';
import { AttendanceSummaryService } from '/app/js/services/attendance-summary-service.js';
import { AttendanceDocumentContextService } from '/app/js/services/attendance-document-context-service.js';
import { PdfTemplateEngine } from '/app/js/services/pdf-template-engine.js';

const ORIGIN='http://127.0.0.1:8081';
const DB_NAME='CETPRO_V2_ATTENDANCE_LAB_QA';
const CONTEXT=Object.freeze({groupId:'GAC-ATT-QA',periodoId:'PER-ATT-QA',unidadId:'UNI-ATT-QA'});
const SESSION_DEFS=Object.freeze(Array.from({length:5},(_,index)=>({
  sessionId:`ATS-00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,
  ...CONTEXT,fecha:`2026-09-0${index+1}`,ordenSesion:index+1,horasProgramadas:4,estado:'ACTIVA',version:0
})));
const states=['SIN_REGISTRO','PRESENTE','AUSENTE','JUSTIFICADA'];
const labels={SIN_REGISTRO:'— Sin registro',PRESENTE:'P · Presente',AUSENTE:'F · Ausente',JUSTIFICADA:'J · Justificada'};
const el=id=>document.getElementById(id);
let db=null, repository=null, active=0, drafts=[], enrollments=[], students=[], blobUrl=null;
const markService=new AttendanceMarkService();
const summaryService=new AttendanceSummaryService();

if(location.origin!==ORIGIN){document.body.textContent='QA bloqueada: use exactamente http://127.0.0.1:8081.';throw new Error('QA_ORIGIN_FORBIDDEN');}

function transact(stores,mode,work){return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Transacción QA fallida.'));tx.onabort=tx.onerror;work(tx);});}
function request(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function seed(){
  const exists=await request(db.transaction('grupos_academicos','readonly').objectStore('grupos_academicos').get(CONTEXT.groupId));
  if(exists)return;
  const now=new Date().toISOString();
  await transact(['programas','modulos','periodos','unidades','grupos_academicos','estudiantes','matriculas'],'readwrite',tx=>{
    tx.objectStore('programas').add({id:'PRO-ATT-QA',nombre:'PROGRAMA SINTÉTICO QA',estado:'ACTIVO'});
    tx.objectStore('modulos').add({id:'MOD-ATT-QA',programaId:'PRO-ATT-QA',nombre:'MÓDULO SINTÉTICO QA',estado:'ACTIVO'});
    tx.objectStore('periodos').add({id:CONTEXT.periodoId,nombre:'PERIODO SINTÉTICO QA',estado:'ACTIVO'});
    tx.objectStore('unidades').add({id:CONTEXT.unidadId,moduloId:'MOD-ATT-QA',nombre:'UNIDAD SINTÉTICA QA',orden:1,estado:'ACTIVO'});
    tx.objectStore('grupos_academicos').add({id:CONTEXT.groupId,codigoVisible:'ATT-QA',sourceGroupCode:'ATT-QA',programaId:'PRO-ATT-QA',moduloId:'MOD-ATT-QA',periodoId:CONTEXT.periodoId,estado:'ACTIVO',createdAt:now,updatedAt:now});
    for(let i=1;i<=40;i++){
      const suffix=String(i).padStart(3,'0'),studentId=`EST-ATT-QA-${suffix}`,enrollmentId=`MAT-ATT-QA-${suffix}`;
      tx.objectStore('estudiantes').add({id:studentId,apellidoPaterno:'SINTÉTICO',apellidoMaterno:`QA${suffix}`,nombres:`ESTUDIANTE ${suffix}`,numeroDocumento:`QA${String(i).padStart(6,'0')}`,estado:'ACTIVO'});
      tx.objectStore('matriculas').add({id:enrollmentId,estudianteId:studentId,programaId:'PRO-ATT-QA',grupoCode:'ATT-QA',grupoId:CONTEXT.groupId,estado:'ACTIVO'});
    }
  });
}
async function load(){
  const context=await repository.loadDocumentContext(CONTEXT);
  enrollments=context.enrollments.sort((a,b)=>a.id.localeCompare(b.id));
  const studentById=new Map(context.students.map(item=>[item.id,item]));
  students=enrollments.map(item=>studentById.get(item.estudianteId));
  drafts=[];
  for(const definition of SESSION_DEFS){
    const saved=await repository.getSessionById(definition.sessionId);
    const marks=saved?await repository.listMarksBySession(definition.sessionId):[];
    drafts.push(markService.createDraft({session:saved||definition,enrollmentIds:enrollments.map(item=>item.id),existingMarks:marks}));
  }
  render();
}
function render(){
  const select=el('active-session');select.replaceChildren();
  SESSION_DEFS.forEach((session,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`${session.fecha} · Sesión ${index+1}`;option.selected=index===active;select.append(option);});
  const head=el('head');while(head.children.length>3)head.lastElementChild.remove();
  SESSION_DEFS.forEach((session,index)=>{const th=document.createElement('th');th.textContent=`${session.fecha}${index===active?' · ACTIVA':''}`;head.append(th);});
  const body=el('body');body.replaceChildren();
  enrollments.forEach((enrollment,rowIndex)=>{
    const tr=document.createElement('tr');
    const base=[String(rowIndex+1),enrollment.id,[students[rowIndex]?.apellidoPaterno,students[rowIndex]?.apellidoMaterno,students[rowIndex]?.nombres].filter(Boolean).join(' ')];
    base.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
    drafts.forEach((draft,sessionIndex)=>{
      const td=document.createElement('td'),control=document.createElement('select');control.dataset.row=String(rowIndex);control.dataset.session=String(sessionIndex);control.setAttribute('aria-label',`Estado ${enrollment.id} sesión ${sessionIndex+1}`);control.disabled=sessionIndex!==active;if(sessionIndex===active)control.classList.add('active-cell');
      states.forEach(state=>{const option=document.createElement('option');option.value=state;option.textContent=labels[state];option.selected=draft.marks[rowIndex].estadoRegistro===state;control.append(option);});
      control.addEventListener('change',changeCell);td.append(control);
      if(sessionIndex===active){
        const hours=document.createElement('input');hours.type='number';hours.min='0';hours.step='0.5';hours.placeholder='Horas';hours.value=draft.marks[rowIndex].horasRegistradas??'';hours.setAttribute('aria-label',`Horas ${enrollment.id}`);hours.addEventListener('change',()=>{drafts[sessionIndex]=markService.changeMark(drafts[sessionIndex],enrollment.id,{horasRegistradas:hours.value});updateDirty();updateSummary();});
        const observation=document.createElement('input');observation.type='text';observation.maxLength=500;observation.placeholder='Observación';observation.value=draft.marks[rowIndex].observacion||'';observation.setAttribute('aria-label',`Observación ${enrollment.id}`);observation.addEventListener('change',()=>{drafts[sessionIndex]=markService.changeMark(drafts[sessionIndex],enrollment.id,{observacion:observation.value});updateDirty();});
        td.append(hours,observation);
      }
      tr.append(td);
    });body.append(tr);
  });
  updateSummary();updateDirty();
}
function changeCell(event){const sessionIndex=Number(event.target.dataset.session),row=Number(event.target.dataset.row);active=sessionIndex;drafts[sessionIndex]=markService.changeMark(drafts[sessionIndex],enrollments[row].id,{estadoRegistro:event.target.value});render();}
function updateDirty(){const dirty=drafts.some(item=>item.dirty);el('dirty').textContent=dirty?'CAMBIOS SIN GUARDAR':'SIN CAMBIOS';el('dirty').classList.toggle('changed',dirty);}
function updateSummary(){const draft=drafts[active];const summary=summaryService.summarize({sessions:draft.session.version?[draft.session]:[],marks:draft.marks});for(const key of ['present','absent','justified','unmarked','marked'])el(key).textContent=String(summary[`${key}Count`]);el('sessions').textContent=String(drafts.filter(item=>item.session.version>0).length);}
function status(message,isError=false){el('status').textContent=message;el('status').style.color=isError?'#a30000':'#1f4b3f';}
async function save(){try{el('save-session').disabled=true;const result=await repository.saveSessionWithMarks({session:drafts[active].session,marks:drafts[active].marks,expectedVersion:drafts[active].session.version||0,operator:'ATTENDANCE_QA'});drafts[active]=markService.createDraft({session:result.session,enrollmentIds:enrollments.map(item=>item.id),existingMarks:result.marks});status(`Sesión ${active+1} guardada atómicamente · ${result.marks.length} marcas · audit=${result.auditId}.`);render();}catch(error){status(`No se guardó ningún cambio: ${error.message}`,true);}finally{el('save-session').disabled=false;}}
async function generatePdf(){try{const context=await new AttendanceDocumentContextService({repository}).buildAttendanceDocumentContext({...CONTEXT,testOnly:true});const blob=await new PdfTemplateEngine().renderFromManifest(context.templateId,context.resolvedFieldSet,context.rows,{rows:context.rows.length,sessions:context.sessions.length});if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);const link=el('download');link.href=blobUrl;link.download='TMPL-05_ATTENDANCE_TEST_ONLY.pdf';link.hidden=false;status(`TMPL-05 TEST_ONLY preparado: ${context.rows.length} filas, ${context.sessions.length} sesiones. No oficial.`);}catch(error){status(`PDF bloqueado de forma controlada: ${error.code||error.message}`,true);}}

el('active-session').addEventListener('change',event=>{const next=Number(event.target.value);if(drafts[active]?.dirty&&!confirm('Hay CAMBIOS SIN GUARDAR. ¿Descartar el borrador de esta sesión y cambiar?')){event.target.value=String(active);return;}if(drafts[active]?.dirty)load().then(()=>{active=next;render();status('Borrador descartado al cambiar de sesión.');});else{active=next;render();}});
el('mark-all').addEventListener('click',()=>{drafts[active]=markService.markAllPresent(drafts[active]);render();});
el('clear-session').addEventListener('click',()=>{drafts[active]={...drafts[active],dirty:true,marks:drafts[active].marks.map(mark=>({...mark,estadoRegistro:'SIN_REGISTRO',horasRegistradas:null,observacion:''}))};render();});
el('save-session').addEventListener('click',save);el('reload').addEventListener('click',()=>load().then(()=>status('Cambios locales descartados; datos recargados.')).catch(error=>status(error.message,true)));el('pdf').addEventListener('click',generatePdf);
addEventListener('beforeunload',event=>{if(drafts.some(item=>item.dirty)){event.preventDefault();event.returnValue='';}if(blobUrl)URL.revokeObjectURL(blobUrl);});

try{el('origin').textContent=location.origin;db=await SchemaV2BackupLabService.createEmptyDatabase(DB_NAME);await seed();repository=new AttendanceV2Repository(()=>db);await load();status('Laboratorio listo. Cinco sesiones sintéticas; seleccione una y capture 40 matrículas.');}catch(error){status(`QA no inicializada: ${error.message}`,true);document.querySelectorAll('button,select').forEach(control=>control.disabled=true);}
