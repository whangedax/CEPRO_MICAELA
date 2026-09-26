import { PdfTemplateEngine } from '/app/js/services/pdf-template-engine.js';
import { getV2PdfManifest } from '/app/js/services/v2-document-manifest-registry.js';

const AUTHORIZED_ORIGIN='http://127.0.0.1:8081';
if(location.origin!==AUTHORIZED_ORIGIN){document.body.textContent='QA bloqueada: use exactamente http://127.0.0.1:8081.';throw new Error('QA_ORIGIN_FORBIDDEN');}

const REPRESENTATIVE=Object.freeze(['TMPL-01','TMPL-02','TMPL-03','TMPL-04','TMPL-05','TMPL-11','TMPL-18','TMPL-19','TMPL-20','TMPL-21']);
const CAPACITY=Object.freeze({'TMPL-01':30,'TMPL-05':40,'TMPL-11':47,'TMPL-18':40,'TMPL-19':40,'TMPL-20':8});
const PAGE_COUNTS=Object.freeze({'TMPL-01':1,'TMPL-02':1,'TMPL-03':1,'TMPL-04':1,'TMPL-05':1,'TMPL-11':1,'TMPL-18':1,'TMPL-19':2,'TMPL-20':2,'TMPL-21':2});
const engine=new PdfTemplateEngine();
const originalLoad=engine._loadResource.bind(engine);
engine._loadResource=(url,type)=>originalLoad(url.includes('/tools/data/TMPL01_PDF_FIELDS.json')?'/app/data/TMPL01_PDF_FIELDS.json':url,type);
let blobUrl=null;
const el=id=>document.getElementById(id);

function setStatus(message,kind='neutral',code='-'){
  el('qa-status').textContent=message;el('qa-status').className=`status ${kind}`;el('qa-error-code').textContent=code;
}
function release(){if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null;}el('qa-pdf').hidden=true;el('qa-pdf').removeAttribute('src');el('qa-download').removeAttribute('href');el('qa-download').classList.add('disabled');el('qa-download').setAttribute('aria-disabled','true');}
function confirmed(value){return {status:'RESOLVED',value};}
function resolvedFields(long=false,overflow=false){
  const huge='NOMBRE EXTREMADAMENTE LARGO '.repeat(120);
  return {
    'program.name':confirmed(overflow?huge:(long?'PROGRAMA DE PRUEBA CON NOMBRE EXTENSO PARA VALIDAR AUTOFIT':'PROGRAMA DE PRUEBA')),
    'period.name':confirmed('2026-I - SOLO PRUEBA'),
    'module.name':confirmed(long?'MÓDULO DE PRUEBA CON NOMBRE EXTENSO':'MÓDULO DE PRUEBA'),
    'curriculum.unit.name':confirmed(long?'UNIDAD DIDÁCTICA DE PRUEBA EXTENSA':'UNIDAD DIDÁCTICA DE PRUEBA'),
    'document.registerCode':confirmed('ABC01234'),
    'student.fullName':confirmed(overflow?huge:(long?"MARÍA DEL CARMEN O'CONNOR QUISPE DE LA CRUZ":"JUAN PEREZ")),
    'document.officialTitleText':confirmed(long?'AUXILIAR TÉCNICO EN ACTIVIDAD PRODUCTIVA DE PRUEBA EXTENSA':'AUXILIAR TÉCNICO DE PRUEBA')
  };
}
function rows(count,long=false){return Array.from({length:count},(_,i)=>({
  'student.fullName':long&&i===0?"ESTUDIANTE DE PRUEBA ÑANDÚ O'CONNOR CON NOMBRE EXTENSO":`ESTUDIANTE DE PRUEBA ${String(i+1).padStart(2,'0')} ÑANDÚ`,
  'student.documentNumber':i%2?'01234567':'ABC01234','enrollment.code':`TEST-${String(i+1).padStart(3,'0')}`,
  'attendance.presentCount':'1','attendance.absentCount':'0','evaluation.unitResult':String(11+i%9),
  'efsrt.companyName':'EMPRESA DE PRUEBA','efsrt.companyAddress':'UBICACIÓN DE PRUEBA','efsrt.finalGrade':'18',
  'curriculum.unit.name':`UNIDAD DIDÁCTICA DE PRUEBA ${i+1}`
}));}
function tmpl02Fields(long=false,overflow=false){
  const huge='NOMBRE EXTREMADAMENTE LARGO '.repeat(120);
  const values={'institution.nombre':'CETPRO DE PRUEBA','institution.dre':'DRE PRUEBA','institution.codigoModular':'0123456','institution.tipoGestion':'PÚBLICA','institution.departamento':'PUNO','institution.provincia':'SAN ROMÁN','institution.distrito':'JULIACA','institution.resolucion':'RD TEST_ONLY','program.nombre':'PROGRAMA DE PRUEBA','student.numeroDocumento':'ABC01234','student.apellidosNombres':overflow?huge:(long?"ESTUDIANTE DE PRUEBA ÑANDÚ O'CONNOR CON NOMBRE EXTENSO":"ESTUDIANTE DE PRUEBA ÑANDÚ O'CONNOR")};
  return Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{status:'CONFIRMED',value}]));
}
async function render(templateId,mode,overflowType){
  if(!REPRESENTATIVE.includes(templateId))throw new Error('Plantilla fuera del conjunto QA.');
  if(templateId==='TMPL-03')return {reviewOnly:true,pages:1,rows:0};
  const max=CAPACITY[templateId]||0;const long=mode==='long';const fieldOverflow=mode==='overflow'&&overflowType==='field';const capacityOverflow=mode==='overflow'&&overflowType==='capacity';
  if(mode==='max'&&!max)throw Object.assign(new Error('Esta plantilla no tiene tabla certificada para capacidad máxima.'),{code:'NOT_APPLICABLE'});
  if(capacityOverflow&&!max)throw Object.assign(new Error('CAPACITY_EXCEEDED no aplica: la plantilla no tiene capacidad tabular certificada.'),{code:'NOT_APPLICABLE'});
  const rowCount=capacityOverflow?max+1:(mode==='max'?max:(max?Math.min(3,max):0));
  if(templateId==='TMPL-01'){
    if(capacityOverflow)throw Object.assign(new Error('CAPACITY_EXCEEDED: 31 > 30 en TMPL-01.'),{code:'CAPACITY_EXCEEDED'});
    const people=rows(rowCount||3,long).map(row=>({apellidosNombres:row['student.fullName'],sexo:'F'}));
    if(fieldOverflow)people[0].apellidosNombres='X'.repeat(1500);
    return {blob:await engine.renderTMPL01({institution:{nombre:'CETPRO DE PRUEBA',ugel:'UGEL',tipoGestion:'PÚBLICA'},program:{nombre:'PROGRAMA DE PRUEBA'},studentsList:people}),pages:1,rows:people.length};
  }
  if(templateId==='TMPL-02')return {blob:await engine.renderTMPL02({resolvedFieldSet:tmpl02Fields(long,fieldOverflow)}),pages:1,rows:0};
  const manifest=getV2PdfManifest(templateId);if(!manifest)throw new Error('Manifest QA ausente.');
  return {blob:await engine.renderFromManifest(templateId,resolvedFields(long,fieldOverflow),rows(rowCount,long),max?{[templateId==='TMPL-20'?'detailRows':'rows']:rowCount}:{}),pages:manifest.pages.length,rows:rowCount};
}
async function generate(){
  release();el('qa-review-only').hidden=true;el('qa-empty').hidden=false;
  const templateId=el('qa-template').value;const mode=document.querySelector('input[name="qa-mode"]:checked').value;const overflowType=el('qa-overflow-type').value;
  el('qa-result-template').textContent=templateId;el('qa-pages').textContent='-';el('qa-rows').textContent='-';el('qa-preview-title').textContent=`${templateId} - ${document.querySelector('input[name="qa-mode"]:checked').parentElement.textContent.trim()}`;setStatus('Generando solo en memoria...');el('qa-render').disabled=true;
  try{
    const result=await render(templateId,mode,overflowType);
    if(result.reviewOnly){el('qa-empty').hidden=true;el('qa-review-only').hidden=false;el('qa-pages').textContent='1 (sin generar)';el('qa-rows').textContent='0';setStatus('REVIEW_REQUIRED: no se generó PDF ni geometría.', 'success','REVIEW_REQUIRED');return;}
    if(!(result.blob instanceof Blob)||result.blob.type!=='application/pdf'||!result.blob.size)throw new Error('Salida PDF inválida.');
    const loaded=await window.PDFLib.PDFDocument.load(await result.blob.arrayBuffer());if(loaded.getPageCount()!==PAGE_COUNTS[templateId])throw Object.assign(new Error('Cantidad de páginas distinta del canónico.'),{code:'PAGE_COUNT_MISMATCH'});
    blobUrl=URL.createObjectURL(result.blob);el('qa-pdf').src=blobUrl;el('qa-pdf').hidden=false;el('qa-empty').hidden=true;el('qa-download').href=blobUrl;el('qa-download').download=`${templateId}_${mode}_TEST_ONLY.pdf`;el('qa-download').classList.remove('disabled');el('qa-download').setAttribute('aria-disabled','false');el('qa-pages').textContent=String(result.pages);el('qa-rows').textContent=String(result.rows);setStatus('PDF técnico generado correctamente.', 'success');
  }catch(error){const code=error?.code||error?.name||'ERROR';const expected=['FIELD_OVERFLOW','GEOMETRY_CONFLICT','CAPACITY_EXCEEDED','NOT_APPLICABLE'].includes(code);const controlledMessage={FIELD_OVERFLOW:'El contenido excede el área certificada. No se generó PDF.',GEOMETRY_CONFLICT:'El contenido invade una región fija o variable. No se generó PDF.',CAPACITY_EXCEEDED:'La cantidad de filas excede la capacidad certificada. No se generó PDF.',NOT_APPLICABLE:'Este caso no aplica a la plantilla seleccionada.'}[code];setStatus(expected?`Error controlado: ${controlledMessage}`:`Fallo inesperado: ${error.message}`,expected?'success':'error',code);el('qa-pages').textContent='0';el('qa-rows').textContent='0';if(!expected)console.error('[QA_DOCUMENT_RENDERER]',error);}
  finally{el('qa-render').disabled=false;}
}
el('qa-host').textContent=location.origin;el('qa-render').addEventListener('click',generate);document.querySelectorAll('input[name="qa-mode"]').forEach(input=>input.addEventListener('change',()=>{el('qa-overflow-choice').hidden=input.value!=='overflow'||!input.checked;}));el('qa-template').addEventListener('change',()=>{release();el('qa-review-only').hidden=true;el('qa-empty').hidden=false;setStatus('Plantilla cambiada; genere un caso.');});addEventListener('beforeunload',release);generate();
