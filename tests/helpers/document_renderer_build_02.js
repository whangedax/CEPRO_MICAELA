const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const PDFLib = require('pdf-lib');
const ROOT = path.resolve(__dirname, '../..');
const manifest = id => JSON.parse(fs.readFileSync(path.join(ROOT,'app/data/pdf-manifests',`TMPL-${String(id).padStart(2,'0')}.json`),'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pdfFile = m => path.join(ROOT, m.canonicalPdf.replace(/^\//,''));

function fixtureRows(count) {
  return Array.from({length:count},(_,i)=>({
    'student.fullName': `ESTUDIANTE DE PRUEBA ${String(i+1).padStart(2,'0')}`,
    'student.documentNumber': i % 2 ? '01234567' : 'ABC01234',
    'enrollment.code': `M${String(i+1).padStart(6,'0')}`,
    'attendance.presentCount':'1','attendance.absentCount':'0',
    'evaluation.unitResult':'18','efsrt.companyName':'EMPRESA DE PRUEBA',
    'efsrt.companyAddress':'UBICACIÓN DE PRUEBA','efsrt.finalGrade':'18',
    'curriculum.unit.name':`UNIDAD DE PRUEBA ${i+1}`
  }));
}
const resolved = {
  'program.name':{status:'RESOLVED',value:'PROGRAMA DE PRUEBA CON NOMBRE EXTENSO'},
  'period.name':{status:'RESOLVED',value:'2026-I'},
  'module.name':{status:'RESOLVED',value:'MÓDULO DE PRUEBA CON NOMBRE EXTENSO'},
  'curriculum.unit.name':{status:'RESOLVED',value:'UNIDAD DIDÁCTICA DE PRUEBA EXTENSA'},
  'document.registerCode':{status:'RESOLVED',value:'ABC01234'},
  'student.fullName':{status:'RESOLVED',value:"ESTUDIANTE DE PRUEBA ÑANDÚ O'CONNOR"},
  'document.officialTitleText':{status:'RESOLVED',value:'AUXILIAR TÉCNICO DE PRUEBA'}
};

async function runBlock(name, ids, representative, capacityKey, max) {
  const results=[]; const check=(id,ok,detail)=>{const row={id:`T-DRB-${name}-${id}`,passed:Boolean(ok),detail};results.push(row);console.log(`[${row.passed?'PASSED':'FAILED'}] ${row.id}: ${detail}`);};
  const before=new Map(ids.map(id=>[id,digest(pdfFile(manifest(id)))]));
  const registry=await import(`${pathToFileURL(path.join(ROOT,'app/js/services/v2-document-manifest-registry.js')).href}?${name}-${Date.now()}`);
  const fitModule=await import(`${pathToFileURL(path.join(ROOT,'app/js/services/document-fit-service.js')).href}?${name}-${Date.now()}`);
  for(const id of ids){
    const m=manifest(id), fields=registry.physicalFieldsOf(m);
    check(`${id}-MANIFEST`,m.rendererStatus==='RENDERER_IMPLEMENTED'&&m.officialIssueStatus==='BLOCKED','renderer técnico separado de emisión oficial');
    check(`${id}-GEOMETRY`,fields.length>0&&fields.every(f=>f.geometryStatus==='VERIFIED'),'solo cajas VERIFIED se expanden');
    check(`${id}-BOUNDS`,fields.every(f=>{const p=m.pages.find(p=>p.number===f.page);return p&&f.x>=0&&f.y>=0&&f.x+f.width<=p.width+.5&&f.y+f.height<=p.height+.5;}),'cajas dentro de página');
  }
  const m=manifest(representative), fit=new fitModule.DocumentFitService();
  if(max>0){
    for(const n of [...new Set([0,1,max])]) check(`CAP-${n}`,fit.validateCapacity(m,{[capacityKey]:n}).valid,`${capacityKey}=${n}`);
    let capacity=false;try{fit.validateCapacity(m,{[capacityKey]:max+1});}catch(e){capacity=e.code==='CAPACITY_EXCEEDED';}
    check('CAP-PLUS',capacity,`${max+1} falla antes de pintar`);
  } else check('CAP-NA',!m.capacity?.[capacityKey],'plantilla sin tabla no inventa capacidad');
  const fields=registry.physicalFieldsOf(m).filter(f=>f.source==='rows');
  const repeated=fields.filter(f=>f.canonicalKey==='student.fullName');
  if(repeated.length>2){const groups=Object.values(Object.groupBy(repeated,f=>f.page));check('TABLE-DRIFT',groups.every(group=>group.every((f,i,a)=>i===0||f.y>=a[i-1].y+a[i-1].height-.02)),'primera/media/última por página sin drift ni overlap');}

  global.window={location:{origin:'http://cetpro.local'},PDFLib};
  const engineModule=await import(`${pathToFileURL(path.join(ROOT,'app/js/services/pdf-template-engine.js')).href}?${name}-${Date.now()}`);
  const engine=new engineModule.PdfTemplateEngine();
  engine._loadResource=async url=>fs.readFileSync(path.join(ROOT,new URL(url).pathname.replace(/^\//,'')));
  for(const n of [...new Set([1,max].filter(n=>n>0))]){
    const blob=await engine.renderFromManifest(m.templateId,resolved,fixtureRows(n),{[capacityKey]:n});
    const output=await PDFLib.PDFDocument.load(await blob.arrayBuffer());
    const rendered=Buffer.from(await blob.arrayBuffer());
    check(`RENDER-${n}`,output.getPageCount()===m.pages.length&&rendered.length>0&&digest(pdfFile(m))!==crypto.createHash('sha256').update(rendered).digest('hex'),'PDF nuevo conserva páginas canónicas y contiene overlay');
  }
  let overflow=false;try{await engine.renderFromManifest(m.templateId,{...resolved,'program.name':{status:'RESOLVED',value:'X'.repeat(2000)}},fixtureRows(1),{[capacityKey]:1});}catch(e){overflow=e.code==='FIELD_OVERFLOW';}
  if(ids.some(id=>id>=4&&id<=10)) check('OVERFLOW',overflow,'texto RESOLVED largo falla FIELD_OVERFLOW');
  check('HASH',ids.every(id=>digest(pdfFile(manifest(id)))===before.get(id)),'PDF canónicos intactos');
  delete global.window;
  return {total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
}
module.exports={runBlock};
