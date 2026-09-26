import { initializeV2Candidate, getV2CandidateDB, V2_CANDIDATE_CONFIG } from './candidate-db.js';
import { CandidateRepository, CandidateEnrollmentRepository } from './candidate-repositories.js';
import { V2GroupAssignmentService, V2DocumentDataService, V2ReadinessService, auditV2Candidate, V2CandidateStorageService } from './candidate-services.js';

export const escapeCandidateHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const main = () => document.querySelector('#candidate-main');
const repo = name => new CandidateRepository(name);
const table = (headers, rows) => `<div class="table-responsive"><table class="candidate-table"><thead><tr>${headers.map(h=>`<th>${escapeCandidateHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const metric = (label,value) => `<div class="candidate-metric"><span>${escapeCandidateHtml(label)}</span><strong>${escapeCandidateHtml(value)}</strong></div>`;
const download = (text,name) => { const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); };

async function dashboard() {
  const names=['estudiantes','matriculas','grupos_academicos','programas','modulos','periodos','unidades'];
  const values=await Promise.all(names.map(name=>repo(name).list()));
  main().innerHTML=`<h1>Inicio — candidata v2</h1><div class="candidate-alert">Build aislado. Ninguna acción usa CETPRO_DB productiva.</div><div class="candidate-grid">${names.map((n,i)=>metric(n,values[i].length)).join('')}</div>`;
}

async function students() {
  const rows=await repo('estudiantes').list();
  main().innerHTML=`<h1>Estudiantes</h1><p>${rows.length} registros</p><input id="student-search" placeholder="Buscar por nombre o documento"><div id="students-list"></div>`;
  const render=q=>{const query=q.trim().toLocaleLowerCase('es');const filtered=rows.filter(x=>!query||JSON.stringify([x.nombres,x.apellidoPaterno,x.apellidoMaterno,x.numeroDocumento]).toLocaleLowerCase('es').includes(query)).slice(0,100);document.querySelector('#students-list').innerHTML=table(['ID','Apellidos y nombres','Documento','Acción'],filtered.map(x=>`<tr><td>${escapeCandidateHtml(x.id)}</td><td>${escapeCandidateHtml([x.apellidoPaterno,x.apellidoMaterno,x.nombres].filter(Boolean).join(' '))}</td><td>${escapeCandidateHtml(x.numeroDocumento||'')}</td><td><button class="candidate-student-open" data-student-id="${escapeCandidateHtml(x.id)}">Ficha</button></td></tr>`));document.querySelectorAll('.candidate-student-open').forEach(button=>button.addEventListener('click',()=>studentDetail(button.dataset.studentId)));};
  render('');document.querySelector('#student-search').addEventListener('input',e=>render(e.target.value));
}

async function studentDetail(studentId) {
  const student=await repo('estudiantes').getById(studentId);if(!student)throw new Error('Estudiante no encontrado.');
  main().innerHTML=`<h1>Ficha de estudiante</h1><form id="student-v2-edit" class="candidate-form"><label>ID<input value="${escapeCandidateHtml(student.id)}" disabled></label><label>Documento<input value="${escapeCandidateHtml(student.numeroDocumento||'')}" disabled></label>${['apellidoPaterno','apellidoMaterno','nombres'].map(f=>`<label>${f}<input name="${f}" value="${escapeCandidateHtml(student[f]||'')}"></label>`).join('')}<button type="submit">Guardar en candidata</button><button type="button" id="student-v2-back">Volver</button></form><div id="student-v2-status"></div>`;
  document.querySelector('#student-v2-back').addEventListener('click',students);
  document.querySelector('#student-v2-edit').addEventListener('submit',async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target));const db=getV2CandidateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(['estudiantes','auditoria'],'readwrite');const timestamp=new Date().toISOString();tx.objectStore('estudiantes').put({...student,...values,fechaActualizacion:timestamp});tx.objectStore('auditoria').add({id:`AUD-V2-STUDENT-${crypto.randomUUID()}`,timestamp,entidad:'ESTUDIANTE',entidadId:student.id,accion:'MODIFICACION_CANDIDATA'});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});document.querySelector('#student-v2-status').textContent='Ficha guardada y auditada en la DB candidata.';});
}

async function enrollments() {
  const [rows,groups]=await Promise.all([repo('matriculas').list(),repo('grupos_academicos').list()]);const groupMap=new Map(groups.map(g=>[g.id,g]));
  main().innerHTML=`<h1>Matrículas</h1><p>${rows.length} registros; relación autoritativa por grupoId.</p>${table(['ID','Estudiante','Programa','Grupo visible','groupId'],rows.map(x=>{const g=groupMap.get(x.grupoId);return `<tr><td>${escapeCandidateHtml(x.id)}</td><td>${escapeCandidateHtml(x.estudianteId)}</td><td>${escapeCandidateHtml(x.programaId)}</td><td>${escapeCandidateHtml(g?.codigoVisible||g?.sourceGroupCode||'')}</td><td><code>${escapeCandidateHtml(x.grupoId)}</code></td></tr>`}))}`;
}

async function programs() {
  const [programs,modules,groups]=await Promise.all([repo('programas').list(),repo('modulos').list(),repo('grupos_academicos').list()]);
  main().innerHTML=`<h1>Programas y módulos</h1><p>${programs.length} programas · ${modules.length} módulos · navegación a ${groups.length} grupos por ID.</p>${table(['Programa','Módulos','Grupos'],programs.map(p=>`<tr><td>${escapeCandidateHtml(p.nombre||p.id)}</td><td>${modules.filter(m=>m.programaId===p.id).map(m=>escapeCandidateHtml(m.nombre||m.id)).join('<br>')}</td><td>${groups.filter(g=>g.programaId===p.id).map(g=>`<a href="#/grupos?groupId=${encodeURIComponent(g.id)}">${escapeCandidateHtml(g.codigoVisible)}</a>`).join('<br>')}</td></tr>`))}`;
}

async function groupsView() {
  const groups=await new V2GroupAssignmentService().listGroups();
  main().innerHTML=`<h1>Grupos académicos</h1><p>${groups.length} entidades; toda acción conserva groupId.</p>${table(['Código visible','Programa','Matrículas','Módulo','Periodo','Turno','Modalidad','Sección','Estado','Revisión','Acción'],groups.map(g=>`<tr data-group-id="${escapeCandidateHtml(g.id)}"><td>${escapeCandidateHtml(g.codigoVisible||g.sourceGroupCode)}</td><td>${escapeCandidateHtml(g.program?.nombre||g.programaId)}</td><td>${g.enrollmentCount}</td><td>${escapeCandidateHtml(g.module?.nombre||'Sin asignar')}</td><td>${escapeCandidateHtml(g.period?.nombre||'Sin asignar')}</td><td>${escapeCandidateHtml(g.turno||'—')}</td><td>${escapeCandidateHtml(g.modalidad||'—')}</td><td>${escapeCandidateHtml(g.seccion||'—')}</td><td class="${g.estado==='REVIEW_REQUIRED'?'candidate-review':'candidate-ok'}">${escapeCandidateHtml(g.estado)}</td><td>${escapeCandidateHtml((g.reviewReasons||[]).join(', ')||'—')}</td><td><button class="candidate-group-open" data-group-id="${escapeCandidateHtml(g.id)}">Consultar</button></td></tr>`))}<div id="candidate-group-detail"></div>`;
  document.querySelectorAll('.candidate-group-open').forEach(button=>button.addEventListener('click',async()=>{const context=await new V2DocumentDataService().buildGroupContext(button.dataset.groupId);document.querySelector('#candidate-group-detail').innerHTML=`<div class="candidate-alert"><strong>groupId:</strong> ${escapeCandidateHtml(context.group.id)} · <strong>Matrículas:</strong> ${context.enrollments.length} · <strong>Programa:</strong> ${escapeCandidateHtml(context.program.nombre||context.program.id)} · <strong>Estado:</strong> ${escapeCandidateHtml(context.group.estado)}</div>`;}));
}

async function blocked(title,body) { main().innerHTML=`<h1>${escapeCandidateHtml(title)}</h1><div class="candidate-alert">${escapeCandidateHtml(body)}</div>`; }

async function documents() {
  const rows=(await repo('matriculas').list()).slice(0,20);
  main().innerHTML=`<h1>Documentos</h1><div class="candidate-alert">TMPL-01 continúa bloqueada por B-002/B-004/B-007. TMPL-02 conserva contexto ENROLLMENT.</div>${table(['Matrícula','Grupo','Contexto'],rows.map(x=>`<tr><td>${escapeCandidateHtml(x.id)}</td><td>${escapeCandidateHtml(x.grupoId)}</td><td><button class="candidate-enrollment-context" data-enrollment-id="${escapeCandidateHtml(x.id)}">Validar ENROLLMENT</button></td></tr>`))}<div id="document-context-status"></div>`;
  document.querySelectorAll('.candidate-enrollment-context').forEach(button=>button.addEventListener('click',async()=>{const c=await new V2DocumentDataService().buildEnrollmentContext(button.dataset.enrollmentId);document.querySelector('#document-context-status').textContent=`Contexto válido: matrícula ${c.enrollment.id}; groupId ${c.group.id}; periodo/currículo bloqueados.`;}));
}

async function issues() {
  const [audit,groups]=await Promise.all([auditV2Candidate(),new V2GroupAssignmentService().listGroups()]);const review=groups.filter(g=>g.estado==='REVIEW_REQUIRED');
  main().innerHTML=`<h1>Incidencias</h1>${metric('Incidencias referenciales',audit.issueCount)}${metric('Grupos REVIEW_REQUIRED',review.length)}${table(['Grupo','Motivos'],review.map(g=>`<tr><td>${escapeCandidateHtml(g.codigoVisible)}</td><td>${escapeCandidateHtml(g.reviewReasons.join(', '))}</td></tr>`))}`;
}

async function backup() {
  main().innerHTML=`<h1>Respaldo schema 2</h1><div class="candidate-alert">Solo formatVersion 2 / schemaVersion 2 / 18 stores.</div><div class="candidate-actions"><button id="export-v2">Exportar v2</button><input id="restore-v2-file" type="file" accept="application/json"><button id="restore-v2">Restaurar v2</button></div><pre id="backup-v2-status"></pre>`;
  const status=document.querySelector('#backup-v2-status');document.querySelector('#export-v2').addEventListener('click',async()=>{const text=await V2CandidateStorageService.exportBackup();const info=await V2CandidateStorageService.inspectBackup(text);download(text,`CETPRO_V2_CANDIDATE_${new Date().toISOString().slice(0,10)}.json`);status.textContent=`Exportado: ${info.stores} stores · checksum ${info.checksum}`;});
  document.querySelector('#restore-v2').addEventListener('click',async()=>{const file=document.querySelector('#restore-v2-file').files[0];if(!file){status.textContent='Seleccione un backup v2.';return;}const text=await file.text();const info=await V2CandidateStorageService.inspectBackup(text);if(!confirm(`Restaurar schema ${info.schemaVersion} / ${info.stores} stores?`))return;const result=await V2CandidateStorageService.restoreBackup(text,undefined,{confirmed:true,beforeWrite:async(pre)=>{download(pre,'PRE_RESTORE_BACKUP_V2_CANDIDATE.json');return true;}});status.textContent=`Restore correcto · audit issues=${result.auditIssueCount}`;});
}

const institutionFields=['nombre','denominacionVisible','tipoGestion','ugel','resolucionAutorizacion1','resolucionAutorizacion2','direccion','telefono','celular1','celular2','dre','codigoModular','departamento','provincia','distrito'];
async function configuration() {
  const profile=(await repo('institucion').list())[0]||{};
  main().innerHTML=`<h1>Configuración institucional</h1><form id="institution-v2" class="candidate-form">${institutionFields.map(f=>`<label>${escapeCandidateHtml(f)}<input name="${f}" value="${escapeCandidateHtml(profile[f]||'')}"></label>`).join('')}<button type="submit">Guardar en candidata</button></form><div id="institution-status"></div>`;
  document.querySelector('#institution-v2').addEventListener('submit',async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target));if(!values.nombre.trim())throw new Error('Nombre obligatorio.');const db=getV2CandidateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(['institucion','auditoria'],'readwrite');const now=new Date().toISOString();tx.objectStore('institucion').put({...profile,...values,id:profile.id||'INST-001',fechaActualizacion:now});tx.objectStore('auditoria').add({id:`AUD-V2-INST-${crypto.randomUUID()}`,timestamp:now,entidad:'INSTITUCION',entidadId:profile.id||'INST-001',accion:'MODIFICACION_CANDIDATA'});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});document.querySelector('#institution-status').textContent='Guardado y auditado en CETPRO_V2_CANDIDATE.';});
}

const routes={
  '#/inicio':dashboard,'#/estudiantes':students,'#/matriculas':enrollments,'#/programas':programs,'#/grupos':groupsView,
  '#/registro':()=>blocked('Registro académico','Infraestructura por groupId preparada. B-002/B-003/B-004/B-007 impiden registrar datos.'),
  '#/efsrt':()=>blocked('EFSRT','B-005 y contexto académico incompleto: sin escrituras.'),
  '#/cierre':async()=>{const g=(await repo('grupos_academicos').list())[0];const d=await new V2ReadinessService().diagnoseGroup(g.id);await blocked('Cierre académico',`academicClosureAllowed=${d.academicClosureAllowed}; bloqueos ${d.blockedRules.join(', ')}.`);},
  '#/documentos':documents,'#/incidencias':issues,'#/respaldo':backup,'#/configuracion':configuration
};
export async function renderCandidateRoute(hash=location.hash) { const key=hash.split('?')[0];document.querySelectorAll('.candidate-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===key));await (routes[key]||dashboard)(); }

async function start() {
  try { const db=await initializeV2Candidate();document.querySelector('#candidate-db-status').textContent=`${db.name} · schema ${db.version} · ${db.objectStoreNames.length} stores`;await renderCandidateRoute();addEventListener('hashchange',()=>renderCandidateRoute().catch(showError)); }
  catch(error){showError(error);}
}
function showError(error){console.error(error);main().innerHTML=`<div class="candidate-alert"><strong>Error candidato:</strong> ${escapeCandidateHtml(error.message)}</div>`;}
start();
