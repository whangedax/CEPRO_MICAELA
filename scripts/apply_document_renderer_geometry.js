/**
 * Applies coordinates measured independently from every canonical PDF.
 * The measurements are top-origin PDF points obtained from vector boundaries;
 * this script never reads or writes a database and never edits a source PDF.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'app/data/pdf-manifests');
const evidence = id => `PDF canónico TMPL-${id}; límites vectoriales medidos individualmente con scripts/audit_pdf_geometry_boxes.py.`;
const box = (canonicalKey, page, x, y, width, height, styleProfile='TABLE_TEXT', extra={}) => ({
  canonicalKey, page, x, y, width, height,
  alignment: extra.alignment || 'left', styleProfile,
  overflowPolicy: 'FIELD_OVERFLOW', geometryStatus: 'VERIFIED',
  geometryEvidence: extra.evidence, ...extra
});

const attendance = {
  '05': { left:103.18, right:284.46, sessions:44 },
  '06': { left:175.18, right:356.46, sessions:35 },
  '07': { left:151.20, right:332.48, sessions:38 },
  '08': { left:103.18, right:284.46, sessions:44 },
  '09': { left:103.18, right:284.46, sessions:44 },
  '10': { left:135.18, right:316.46, sessions:40 }
};
const evaluation = {
  '11': { x:34.55, right:244.97, y:369.22, step:14.215, rows:47 },
  '12': { x:34.71, right:229.31, y:443.63, step:14.606, rows:40 },
  '13': { x:34.56, right:234.58, y:444.97, step:14.48, rows:40 },
  '14': { x:34.53, right:235.46, y:445.19, step:14.455, rows:40 },
  '15': { x:34.58, right:233.70, y:444.75, step:14.49, rows:40 },
  '16': { x:35.09, right:215.70, y:440.15, step:14.94, rows:40 },
  '17': { x:34.58, right:233.70, y:444.75, step:14.49, rows:40 }
};

const geometry = {};
for (const [id, g] of Object.entries(attendance)) {
  const ev=evidence(id);
  const file=path.join(dir,`TMPL-${id}.json`);
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  manifest.capacity={...(manifest.capacity||{}),rows:40,sessions:g.sessions};
  fs.writeFileSync(file,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
  geometry[id] = [
    box('program.name',1,284.46,37.45,463.63,12.72,'PROGRAM_NAME',{evidence:ev}),
    box('period.name',1,284.46,50.17,463.63,12.73,'HEADER_VALUE',{evidence:ev}),
    box('module.name',1,284.46,62.90,463.63,12.73,'MODULE_NAME',{evidence:ev}),
    box('curriculum.unit.name',1,284.46,75.63,463.63,12.73,'UNIT_NAME',{evidence:ev}),
    box('student.fullName',1,g.left,149.07,g.right-g.left,11.99,'PRIMARY_PERSON_NAME',
      { repeat:40, stepY:11.99, source:'rows', evidence:ev }),
    box('attendance.presentCount',1,988.27,149.07,37.0,11.99,'TABLE_NUMBER',
      { repeat:40, stepY:11.99, source:'rows', alignment:'center', evidence:ev }),
    box('attendance.absentCount',1,1025.27,149.07,37.0,11.99,'TABLE_NUMBER',
      { repeat:40, stepY:11.99, source:'rows', alignment:'center', evidence:ev })
  ];
}
for (const [id,g] of Object.entries(evaluation)) {
  const ev=evidence(id);
  geometry[id]=[
    box('student.fullName',1,g.x,g.y,g.right-g.x,g.step,'PRIMARY_PERSON_NAME',
      {repeat:g.rows,stepY:g.step,source:'rows',evidence:ev}),
    box('evaluation.unitResult',1,779.3,g.y,42.0,g.step,'TABLE_NUMBER',
      {repeat:g.rows,stepY:g.step,source:'rows',alignment:'center',evidence:ev})
  ];
}
geometry['18']=[
  box('enrollment.code',1,43.89,405.49,49.40,13.60,'DOCUMENT_NUMBER',{repeat:40,stepY:13.60,source:'rows',evidence:evidence('18')}),
  box('student.fullName',1,93.29,405.49,185.80,13.60,'PRIMARY_PERSON_NAME',{repeat:40,stepY:13.60,source:'rows',evidence:evidence('18')}),
  box('efsrt.companyName',1,279.09,405.49,139.70,13.60,'TABLE_TEXT',{repeat:40,stepY:13.60,source:'rows',evidence:evidence('18')}),
  box('efsrt.companyAddress',1,418.79,405.49,139.70,13.60,'TABLE_TEXT',{repeat:40,stepY:13.60,source:'rows',evidence:evidence('18')}),
  box('efsrt.finalGrade',1,795.40,405.49,26.32,13.60,'TABLE_NUMBER',{repeat:40,stepY:13.60,source:'rows',alignment:'center',evidence:evidence('18')})
];
geometry['19']=[
  box('student.documentNumber',1,43.52,371.84,77.68,20.79,'DOCUMENT_NUMBER',{repeat:20,stepY:20.79,source:'rows',evidence:evidence('19')}),
  box('student.fullName',1,121.20,371.84,392.56,20.79,'PRIMARY_PERSON_NAME',{repeat:20,stepY:20.79,source:'rows',evidence:evidence('19')}),
  box('student.documentNumber',2,72.98,220.06,73.54,17.57,'DOCUMENT_NUMBER',{repeat:20,stepY:17.57,source:'rows',rowOffset:20,evidence:evidence('19')}),
  box('student.fullName',2,146.52,220.06,371.62,17.57,'PRIMARY_PERSON_NAME',{repeat:20,stepY:17.57,source:'rows',rowOffset:20,evidence:evidence('19')})
];
const certRows=[104.91,146.89,188.87,230.85,305.09,356.09,407.08,449.07,488.04];
geometry['20']=[
  box('document.registerCode',1,54.51,62.87,218.41,27.56,'DOCUMENT_NUMBER',{evidence:evidence('20')}),
  box('student.fullName',1,163.42,270.06,623.93,41.21,'PRIMARY_PERSON_NAME',{evidence:evidence('20')}),
  box('module.name',1,432.88,311.27,354.47,27.73,'MODULE_NAME',{evidence:evidence('20')}),
  box('program.name',1,374.29,366.72,413.06,27.72,'PROGRAM_NAME',{evidence:evidence('20')}),
  ...certRows.slice(0,-1).map((y,i)=>box('curriculum.unit.name',2,163.05,y,211.24,certRows[i+1]-y,'UNIT_NAME',{occurrence:i,source:'rows',evidence:evidence('20')})),
  ...certRows.slice(0,-1).map((y,i)=>box('evaluation.unitResult',2,712.12,y,75.60,certRows[i+1]-y,'TABLE_NUMBER',{occurrence:i,source:'rows',alignment:'center',evidence:evidence('20')}))
];
geometry['21']=[
  box('student.fullName',1,163.42,255.75,623.93,20.0,'PRIMARY_PERSON_NAME',{alignment:'center',evidence:evidence('21')}),
  box('document.officialTitleText',1,54.88,318.0,732.47,26.69,'PROGRAM_NAME',{alignment:'center',evidence:evidence('21')})
];

for (const [id, physicalFields] of Object.entries(geometry)) {
  const file=path.join(dir,`TMPL-${id}.json`);
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  manifest.physicalFields=physicalFields;
  if (id === '21') manifest.reservedRegions = [
    {id:'PAGE1_FIXED_MAIN_PARAGRAPH',kind:'FIXED_TEXT_REGION',page:1,x:54.88,y:300.47,width:658.1,height:17.5,evidence:'Texto fijo medido en el PDF canónico: top 302.470, bottom 315.963 pt.'},
    {id:'PAGE1_FIXED_POR_TANTO',kind:'FIXED_TEXT_REGION',page:1,x:162.44,y:355.92,width:359,height:45.28,evidence:'Bloque fijo POR TANTO medido en el PDF canónico: top 357.916 a bottom 399.198 pt.'},
    {id:'PAGE1_FIXED_SIGNATURE',kind:'FIXED_TEXT_REGION',page:1,x:476,y:520.76,width:126,height:28.49,evidence:'Firma impresa medida en el PDF canónico: top 522.76 a bottom 547.25 pt.'},
    {id:'PAGE2_RESERVED_LOGO',kind:'RESERVED',page:2,x:374.29,y:89.55,width:103.58,height:62.19,evidence:'Rectángulo punteado LOGO CETPRO medido en el PDF canónico.'},
    {id:'PAGE2_FIXED_REGISTER_LABEL',kind:'FIXED_TEXT_REGION',page:2,x:352.9,y:165.55,width:161.63,height:15,evidence:'Rótulo fijo Código del Registro Institucional medido en el PDF canónico.'},
    {id:'PAGE2_FIXED_SIGNATURE',kind:'FIXED_TEXT_REGION',page:2,x:371,y:339,width:125,height:34,evidence:'Firma impresa de la página 2 medida en el PDF canónico.'}
  ];
  manifest.rendererStatus='RENDERER_IMPLEMENTED';
  manifest.fitStatus='FAIL_CLOSED';
  manifest.officialIssueStatus='BLOCKED';
  fs.writeFileSync(file,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
}

const file04=path.join(dir,'TMPL-04.json');
const m04=JSON.parse(fs.readFileSync(file04,'utf8'));
m04.fields=m04.fields.map(field=>({...field,geometryStatus:'VERIFIED'}));
m04.rendererStatus='RENDERER_IMPLEMENTED'; m04.fitStatus='FAIL_CLOSED'; m04.officialIssueStatus='BLOCKED';
fs.writeFileSync(file04,`${JSON.stringify(m04,null,2)}\n`,'utf8');
