/** Genera manifiestos físicos conservadores 05–21 desde la auditoría aprobada. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const PDF_DIR = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES');
const OUT = path.join(ROOT, 'app/data/pdf-manifests');
const files = fs.readdirSync(PDF_DIR).filter(name => /^\d\d_.*\.pdf$/i.test(name)).sort();
const specs = {
  5:['ATTENDANCE',1,1190.55,841.89,{rows:40},['B-002','B-004','B-007']],
  6:['ATTENDANCE',1,1190.55,841.89,{rows:40},['B-002','B-004','B-007']],
  7:['ATTENDANCE',1,1190.55,841.89,{rows:40},['B-002','B-004','B-007']],
  8:['ATTENDANCE',1,1190.55,841.89,{rows:40},['B-002','B-004','B-007']],
  9:['ATTENDANCE',1,1190.55,841.89,{rows:40},['B-002','B-004','B-007']],
  10:['ATTENDANCE',1,1190.55,841.89,{rows:40},['B-001','B-002','B-004','B-007']],
  11:['EVALUATION',1,841.89,1190.55,{rows:47,indicators:5},['B-002','B-003','B-004','B-007']],
  12:['EVALUATION',1,841.89,1190.55,{rows:40,indicators:5},['B-002','B-003','B-004','B-007']],
  13:['EVALUATION',1,841.89,1190.55,{rows:40,indicators:5},['B-002','B-003','B-004','B-007']],
  14:['EVALUATION',1,841.89,1190.55,{rows:40,indicators:5},['B-002','B-003','B-004','B-007']],
  15:['EVALUATION',1,841.89,1190.55,{rows:40,indicators:5},['B-002','B-003','B-004','B-007']],
  16:['EVALUATION',1,841.89,1190.55,{rows:40,indicators:5},['B-002','B-003','B-004','B-007']],
  17:['EVALUATION',1,841.89,1190.55,{rows:40,indicators:5},['B-001','B-002','B-003','B-004','B-007']],
  18:['EFSRT',1,841.89,1190.55,{rows:40,criteria:9},['B-004','B-005']],
  19:['CLOSURE',2,1190.55,841.89,{rows:40,pageRows:[20,20]},['B-002','B-003','B-004','B-005','B-007']],
  20:['CERTIFICATION',2,841.89,595.28,{detailRows:8},['B-002','B-004','B-006','B-007']],
  21:['TITLE',2,841.89,595.28,null,['B-002','B-004','B-006','B-007']]
};
const logical = {
  ATTENDANCE:['program.name','period.name','module.name','curriculum.unit.name','student.fullName','attendance.sessionDate','attendance.mark','attendance.presentCount','attendance.absentCount','attendance.absencePercent','document.teacherSignature'],
  EVALUATION:['program.name','period.name','module.name','curriculum.unit.name','curriculum.unit.capacity','curriculum.indicator.text','student.fullName','evaluation.indicatorScore','evaluation.indicatorAchievement','evaluation.indicatorRecovery','evaluation.unitResult'],
  EFSRT:['institution.name','module.name','document.teacherName','efsrt.hours','efsrt.startDate','efsrt.endDate','student.fullName','enrollment.code','efsrt.companyName','efsrt.companyAddress','efsrt.criterionScore','efsrt.finalGrade'],
  CLOSURE:['institution.name','program.name','module.name','period.name','student.fullName','student.documentNumber','curriculum.unit.name','evaluation.unitResult','closure.approvedCount','closure.failedCount'],
  CERTIFICATION:['student.fullName','module.name','program.name','curriculum.unit.name','curriculum.unit.credits','curriculum.unit.hours','curriculum.unit.capacity','evaluation.unitResult','document.registerCode'],
  TITLE:['student.fullName','document.officialTitleText','document.registerCode','document.directorSignature']
};
fs.mkdirSync(OUT,{recursive:true});
for (const [rawId,spec] of Object.entries(specs)) {
  const id = Number(rawId); const file = files[id-1]; const [contextType,pageCount,width,height,capacity,blockers]=spec;
  const bytes=fs.readFileSync(path.join(PDF_DIR,file));
  const manifest={templateId:`TMPL-${String(id).padStart(2,'0')}`,canonicalPdf:`/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/${file}`,
    sha256:crypto.createHash('sha256').update(bytes).digest('hex'),pages:Array.from({length:pageCount},(_,i)=>({number:i+1,width,height})),contextType,capacity,
    previewStatus:'BLOCKED_BY_SOURCE',blockers,
    geometryProvenance:'DOCUMENT_MASTER_AUDIT.md; cajas variables identificadas visualmente, coordenadas de escritura no certificadas mientras las fuentes académicas están bloqueadas.',
    fields:logical[contextType].map(canonicalKey=>({canonicalKey,geometryStatus:'REVIEW_REQUIRED',styleProfile:canonicalKey==='student.fullName'?'PRIMARY_PERSON_NAME':'TABLE_TEXT',overflowPolicy:'FIELD_OVERFLOW'}))};
  fs.writeFileSync(path.join(OUT,`${manifest.templateId}.json`),`${JSON.stringify(manifest,null,2)}\n`);
}
console.log(`Manifiestos conservadores generados: ${Object.keys(specs).length}`);
