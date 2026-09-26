const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_DIR = path.join(ROOT, 'app/data/pdf-manifests');
const PDF_DIR = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES');
const load = id => JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, `TMPL-${String(id).padStart(2,'0')}.json`), 'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function run() {
  const results=[]; const check=(id,passed,detail='')=>{const row={id,passed:Boolean(passed),detail};results.push(row);console.log(`[${row.passed?'PASSED':'FAILED'}] ${id}: ${detail}`);};
  const manifests=Array.from({length:21},(_,i)=>load(i+1));
  const files=fs.readdirSync(PDF_DIR).filter(name=>/^\d\d_.*\.pdf$/i.test(name)).sort();
  check('T-NDB-ARCH-01',manifests.length===21&&new Set(manifests.map(m=>m.templateId)).size===21,'21 manifiestos independientes');
  check('T-NDB-ARCH-02',manifests.every((m,i)=>m.canonicalPdf.endsWith(files[i])&&digest(path.join(PDF_DIR,files[i]))===m.sha256),'hash 21/21');
  check('T-NDB-ARCH-03',manifests.reduce((n,m)=>n+m.pages.length,0)===24,'24 páginas, sin síntesis');
  check('T-NDB-ARCH-04',!files.some(name=>/ASISTENCIA.*UD7|AS-?7/i.test(name))&&files.some(name=>/^17_EVALUACION_UD7/.test(name)),'sin As-7; Evaluación UD7 existe');
  const engine=fs.readFileSync(path.join(ROOT,'app/js/services/pdf-template-engine.js'),'utf8');
  const binding=fs.readFileSync(path.join(ROOT,'app/js/services/document-binding-service.js'),'utf8');
  const resolver=fs.readFileSync(path.join(ROOT,'app/js/services/document-field-resolver.js'),'utf8');
  check('T-NDB-ARCH-05',!engine.includes('indexedDB')&&!engine.includes('Repository')&&!engine.includes('getDB'),'renderer sin DB/repositorios');
  check('T-NDB-ARCH-06',engine.includes("error.code = 'FIELD_OVERFLOW'")&&!engine.includes('Omitiendo campo'),'overflow explícito, sin omisión');
  check('T-NDB-ARCH-07',binding.includes('provenance: field.provenance')&&resolver.includes('canonicalKey resuelta más de una vez'),'provenance y unicidad');
  check('T-NDB-ARCH-07B',binding.includes('styleByPhysicalBox')&&binding.includes('getV2PdfManifest(templateId)'),'estilo físico enlazado sin alterar geometría legacy');
  check('T-NDB-ARCH-08',!engine.includes('eval(')&&!engine.includes('new Function')&&!engine.includes('http://')&&!engine.includes('https://'),'runtime offline y sin ejecución dinámica');
  check('T-NDB-A-01',load(1).capacity.rows===30&&load(1).capacity.pages===1,'TMPL-01 capacidad 30/una página');
  check('T-NDB-A-02',load(2).fields.length===11&&load(2).fields.find(f=>f.canonicalKey==='student.fullName')?.styleProfile==='PRIMARY_PERSON_NAME','TMPL-02 11 bindings/nombre primario');
  check('T-NDB-A-03',load(3).previewStatus==='REVIEW_REQUIRED'&&load(3).capacity===null&&load(3).fields.length===0,'TMPL-03 fail-closed');
  check('T-NDB-A-04',load(4).fields.length===2&&load(4).fields.every(f=>['program.name','module.name'].includes(f.canonicalKey)),'TMPL-04 solo cajas inequívocas');
  for(let id=5;id<=10;id++) check(`T-NDB-B-${id}`,load(id).contextType==='ATTENDANCE'&&load(id).capacity.rows===40&&load(id).previewStatus==='BLOCKED_BY_SOURCE',`TMPL-${id} individual, B-002/B-004/B-007`);
  check('T-NDB-B-11',manifests.slice(4,10).every(m=>m.fields.some(f=>f.canonicalKey==='attendance.mark')&&m.fields.every(f=>f.geometryStatus==='REVIEW_REQUIRED')),'asistencia preparada sin inventar sesiones/geometría');
  check('T-NDB-C-01',load(11).capacity.rows===47&&load(11).capacity.indicators===5,'UD1 capacidad 47');
  check('T-NDB-C-02',manifests.slice(11,17).every(m=>m.capacity.rows===40&&m.capacity.indicators===5),'UD2-UD7 capacidad 40 individual');
  check('T-NDB-C-03',manifests.slice(10,17).every(m=>m.blockers.includes('B-002')&&m.blockers.includes('B-003')),'evaluación derivada bloqueada');
  check('T-NDB-D-01',load(18).contextType==='EFSRT'&&load(18).capacity.rows===40&&load(18).capacity.criteria===9&&load(18).blockers.includes('B-005'),'EFSRT estructura física, norma bloqueada');
  check('T-NDB-E-01',load(19).pages.length===2&&JSON.stringify(load(19).capacity.pageRows)==='[20,20]'&&load(19).blockers.length===5,'Acta 20+20, sin página 3');
  check('T-NDB-F-01',load(20).capacity.detailRows===8&&load(20).blockers.includes('B-006'),'Certificado 8 filas, emisión bloqueada');
  check('T-NDB-G-01',load(21).contextType==='TITLE'&&load(21).pages.length===2&&load(21).blockers.includes('B-006'),'Título preparado, emisión bloqueada');
  check('T-NDB-SAFE-01',manifests.every(m=>m.previewStatus!=='READY_OFFICIAL'),'ninguna plantilla oficial');
  check('T-NDB-SAFE-02',manifests.slice(4).every(m=>m.fields.every(f=>f.overflowPolicy==='FIELD_OVERFLOW')),'fit fail-closed en familias B-G');
  const contract=fs.readFileSync(path.join(ROOT,'app/js/services/document-field-contract.js'),'utf8');
  check('T-NDB-SAFE-03',contract.includes("REVIEW_REQUIRED: 'REVIEW_REQUIRED'")&&contract.includes("UNMAPPED: 'UNMAPPED'"),'estados universales');
  const statusSource=fs.readFileSync(path.join(ROOT,'app/js/services/template-registry.js'),'utf8');
  check('T-NDB-SAFE-04',statusSource.includes("officialIssueStatus = 'BLOCKED'")&&statusSource.includes("'TMPL-21': ['TITLE'"),'catálogo 21 con emisión bloqueada');
  const viewSource=fs.readFileSync(path.join(ROOT,'app/js/ui/documents-view.js'),'utf8');
  check('T-NDB-SAFE-05',viewSource.includes('Estado de vista previa:')&&viewSource.includes('Emisión oficial:')&&viewSource.includes('Bloqueos:'),'shell común expone estado y bloqueos');
  check('T-NDB-SAFE-06',!viewSource.includes('SIDE_BY_SIDE')&&!viewSource.includes('OVERLAY')&&!viewSource.includes('TEST_ONLY'),'UX normal sin controles de ingeniería');
  const fitModule=await import(`${pathToFileURL(path.join(ROOT,'app/js/services/document-fit-service.js')).href}?night=${Date.now()}`);
  const fit=new fitModule.DocumentFitService();
  for(const [id,key] of [[1,'rows'],[5,'rows'],[11,'rows'],[12,'rows'],[18,'rows'],[20,'detailRows']]){
    const manifest=load(id),max=manifest.capacity[key];
    check(`T-NDB-FIT-${id}-EMPTY`,fit.validateCapacity(manifest,{[key]:0}).valid,'vacío');
    check(`T-NDB-FIT-${id}-ONE`,fit.validateCapacity(manifest,{[key]:1}).valid,'un registro');
    check(`T-NDB-FIT-${id}-MAX`,fit.validateCapacity(manifest,{[key]:max}).valid,'capacidad máxima');
    let rejected=false;try{fit.validateCapacity(manifest,{[key]:max+1});}catch(error){rejected=error.code==='CAPACITY_EXCEEDED';}
    check(`T-NDB-FIT-${id}-PLUS`,rejected,'capacidad+1 controlada');
  }
  const box={width:180,height:15,paddingX:2}; const measure=(value,size)=>[...value].length*size*.52;
  const fitSamples=['ANA','MARÍA ÑUSTA O’CONNOR','1234567','01234567','CE-A19X4','MECÁNICA DE MOTOS Y VEHÍCULOS AFINES'];
  check('T-NDB-FIT-TEXT',fitSamples.every(value=>fit.fitText({text:value,box,styleProfile:'PRIMARY_PERSON_NAME',measure}).status==='FIT'),'nombres, Ñ, tildes, apóstrofe y documentos');
  check('T-NDB-FIT-EMPTY',fit.fitText({text:'',box,styleProfile:'TABLE_TEXT',measure}).status==='EMPTY','vacío permitido');
  let overflow=false;try{fit.fitText({text:'NOMBRE '.repeat(100),box,styleProfile:'PRIMARY_PERSON_NAME',measure});}catch(error){overflow=error.code==='FIELD_OVERFLOW';}
  check('T-NDB-FIT-OVERFLOW',overflow,'texto largo no desaparece');
  return {total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
}
const { pathToFileURL } = require('url');
module.exports={name:'NIGHT-DOCUMENT-BUILD-01',run};
