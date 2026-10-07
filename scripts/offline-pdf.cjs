const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const PDFLib = require('pdf-lib');
const fontkit=require('@pdf-lib/fontkit');
const {AsyncLocalStorage}=require('node:async_hooks');
const renderContext=new AsyncLocalStorage();
const nativeEmbedFont=PDFLib.PDFDocument.prototype.embedFont;
PDFLib.PDFDocument.prototype.embedFont=async function(font,options){const context=renderContext.getStore();if(context&&[PDFLib.StandardFonts.Helvetica,PDFLib.StandardFonts.HelveticaBold].includes(font)){const bold=font===PDFLib.StandardFonts.HelveticaBold;const family=context.templateId==='TMPL-03'&&!bold?'Calibri':'Arial';const name=family==='Calibri'?'calibri.ttf':bold?'arialbd.ttf':'arial.ttf';const file=path.join(process.env.WINDIR||'C:/Windows','Fonts',name);if(!fs.existsSync(file))throw Error(`Fuente ${family} requerida no disponible en este equipo.`);this.registerFontkit(fontkit);return nativeEmbedFont.call(this,fs.readFileSync(file),{...options,subset:true});}return nativeEmbedFont.call(this,font,options);};
// Mantiene la altura entre líneas calculada por el preflight dentro de cada caja física.
const nativeDrawText=PDFLib.PDFPage.prototype.drawText;
PDFLib.PDFPage.prototype.drawText=function(text,options={}){if(renderContext.getStore()&&/^(BORRADOR|DEMOSTRACI[ÓO]N|DEMO\s*[-—]\s*DATOS FICTICIOS|ACTA DE EVALUACIÓN MODULAR.*EMISIÓN ADMINISTRATIVA)/i.test(text))return;return nativeDrawText.call(this,text,text.includes('\n')&&!options.lineHeight?{...options,lineHeight:(options.size||12)*1.12}:options);};
// Adaptador del motor existente: solo fuentes locales y contexto autorizado por el servicio.
async function renderPDF(root,doc,actor,options={}){return renderContext.run({templateId:doc.templateId},()=>renderPDFInternal(root,doc,actor,options));}
async function renderPDFInternal(root, doc, actor,options) {
  if (!globalThis.window) globalThis.window = Object.freeze({ PDFLib, location: { origin: 'http://127.0.0.1:8080', href: 'http://127.0.0.1:8080/app/index.html' } });
  const { PdfTemplateEngine } = await import(pathToFileURL(path.join(root, 'app/js/services/pdf-template-engine.js')).href);
  const { getV2PdfManifest } = await import(pathToFileURL(path.join(root, 'app/js/services/v2-document-manifest-registry.js')).href);
  const engine = new PdfTemplateEngine();
  const measurements=[];const nativeFit=engine.fitTextOrThrow.bind(engine);
  engine.fitTextOrThrow=function(text,font,box,height,fitOptions){if(/codigo|(?:^|[._])code|numeroDocumento|documentNumber|registerCode|registryNumber|registryFolio/i.test(fitOptions?.fieldKey||''))fitOptions={...fitOptions,breakLongWords:true};let result;try{result=nativeFit(text,font,box,height,fitOptions);}catch(error){if(error.code==='FIELD_OVERFLOW')error.message=`No se puede generar el documento: el campo «${fitOptions?.fieldKey||'dato'}» no cabe en su casilla. Revise su longitud en Datos de documentos. El contenido no se recortó.`;throw error;}const bounds=engine._textBounds(result,height);const fit=bounds.x>=box.x-.5&&bounds.y>=box.y-.5&&bounds.x+bounds.width<=box.x+box.w+.5&&bounds.y+bounds.height<=box.y+box.h+.5;measurements.push({field:fitOptions?.fieldKey||'sin-clave',text:String(text),font:font.name||font.embedder.font.postscriptName,fontSize:result.size,bold:/bold/i.test(font.name||font.embedder.font.postscriptName||''),box,bounds,lines:result.text.split('\n').length,fits:fit});if(!fit)throw Error('Campo fuera de su caja: '+fitOptions?.fieldKey);return result;};
  engine._loadResource = async (resource, type) => {
    const relative = new URL(resource, 'http://localhost').pathname;
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(path.resolve(root) + path.sep) || (!relative.startsWith('/sources/templates/') && !relative.startsWith('/app/data/'))) throw new Error('Fuente documental fuera del catálogo local.');
    const bytes = fs.readFileSync(file); return type === 'json' ? JSON.parse(bytes.toString('utf8')) : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  };
  const n = Number(doc.templateId.slice(5)), unitOrder = n >= 5 && n <= 10 ? doc.units?.find(u=>u.code===doc.unitCode)?.order||1 : n >= 11 && n <= 17 ? n - 10 : 1;
  const sessions = [...new Map(doc.attendance.map(r => [`${r.date}|${r.session}`, { sessionId: `${r.date}|${r.session}`, fecha: r.date }])).values()].sort((a, b) => a.sessionId.localeCompare(b.sessionId));
  const rows = doc.students.map(({ student: s, enrollment: e }) => {
    const scores = doc.grades.filter(r => r.enrollmentId === e.id);
    const evaluations = Array.from({ length: 5 }, (_, i) => Object.fromEntries(['score','ia1','ia2','ia3','recovery'].map(key => [key, scores.find(r => r.indicator === `IL${i + 1}${key === 'score' ? '' : '.' + key.toUpperCase()}`)?.value])));
    const marks=doc.attendance.filter(r=>r.enrollmentId===e.id&&r.value!=null&&(!e.startDate||r.date>=e.startDate)&&(!e.endDate||r.date<=e.endDate));
    const presentStates=doc.module?.presenceStates?.split(',')||[],absentStates=doc.module?.absenceStates?.split(',')||[];
    const presentCount=presentStates.length?marks.filter(m=>presentStates.includes(m.value)).length:null;
    const absentCount=absentStates.length?marks.filter(m=>absentStates.includes(m.value)).length:null;
    const denominator=doc.module?.absenceDenominator==='PROGRAMADAS'?sessions.filter(s=>(!e.startDate||s.fecha>=e.startDate)&&(!e.endDate||s.fecha<=e.endDate)).length:doc.module?.absenceDenominator==='REGISTRADAS'?marks.length:0;
    const absencePercent=absentCount!==null&&denominator?Number((absentCount/denominator*100).toFixed(2)):null;
    return { ...s.legacy, enrollmentId: e.id, matriculaId: e.id, studentName: s.name, apellidosNombres: s.name, studentDisplayName: s.name, numeroDocumento: s.document,
      document: s.document, tipoDocumento:s.documentType??s.legacy?.tipoDocumento??'', apellidoPaterno:s.lastName1??s.legacy?.apellidoPaterno??'',apellidoMaterno:s.lastName2??s.legacy?.apellidoMaterno??'',nombres:s.firstNames??s.legacy?.nombres??'',sexo:s.sex??s.legacy?.sexo??'',fechaNacimiento:s.birthDate??s.legacy?.fechaNacimiento??'',
      retirado:!e.active,'student.fullName': s.name, 'student.document': s.document, 'student.documentNumber': s.document, evaluations, finalResult: scores.find(r => r.indicator === 'RESULTADO_UD')?.value,
      'enrollment.code':doc.students.find(row=>row.enrollment.id===e.id)?.parameters.code||'',
      unitGrades:(doc.units||[]).map(u=>scores.find(r=>r.unit===u.code&&r.indicator==='RESULTADO_UD')?.value),
      ...doc.students.find(row=>row.enrollment.id===e.id)?.parameters,
      'efsrt.finalGrade':doc.students.find(row=>row.enrollment.id===e.id)?.parameters.efsrtFinalGrade,
      criteria:Array.from({length:9},(_,i)=>doc.students.find(row=>row.enrollment.id===e.id)?.parameters[`criterion${i+1}`]),
      presentCount,absentCount,absencePercent,estadoMatricula:e.active?'MATRICULADO':'RETIRADO',
      marksBySession: sessions.map(session => ({ sessionId: session.sessionId, estadoRegistro: ((!e.startDate||session.fecha>=e.startDate)&&(!e.endDate||session.fecha<=e.endDate)?doc.attendance.find(r => r.enrollmentId === e.id && `${r.date}|${r.session}` === session.sessionId)?.value:null) || 'SIN_REGISTRO' })) };
  }).sort((a,b) => a.studentName.localeCompare(b.studentName, 'es'));
  const unit=doc.unitData||{};
  const context = { institution: {...doc.institution,resolucionPrograma:doc.program?.resolucionPrograma}, program: doc.program || {}, module: {...doc.module,horas:doc.module?.hours,creditos:doc.module?.credits,resolucion:doc.module?.resolucionAutorizacion}, group: { ...doc.group, grupoCode: doc.group.id, docente: doc.teacher||'' },
    period: { nombre: doc.group.periodId || '',fechaInicio:doc.group.fechaInicio||'',fechaFin:doc.group.fechaFin||'',fechaTermino:doc.group.fechaFin||'' }, unit: { nombre: unit.name||doc.unitCode||'', orden: unitOrder,capacidad:unit.capacity||'' },
    units:(doc.units||[]).map(u=>({...u,nombre:u.name||'',capacidad:u.capacity||'',competencia:u.competence||'',creditos:u.credits,horas:u.hours})),
    indicators:Array.from({length:5},(_,i)=>unit[`indicator${i+1}`]||''), sessions, teacher: doc.teacher||'',docente:{nombre:doc.teacher||''},document:{teacherName:doc.teacher||''},
    efsrt:{horas:doc.module?.efsrtHours,fechaInicio:doc.group.efsrtInicio,fechaTermino:doc.group.efsrtFin},approvalThreshold:doc.module?.approvalMinimum,
    official: false, administrativeDraft: true };
  const manifest = getV2PdfManifest(doc.templateId), output = await PDFLib.PDFDocument.create();
  const append = async blob => {
    const source = await PDFLib.PDFDocument.load(await blob.arrayBuffer());
    // Cuatro originales referencian FXE1 pero solo definen FXE2 (modo Normal).
    // Repara el recurso en la copia generada; conserva los originales institucionales.
    if(['TMPL-01','TMPL-05','TMPL-13','TMPL-14'].includes(doc.templateId))for(const page of source.getPages()){
      const states=page.node.Resources().lookupMaybe(PDFLib.PDFName.of('ExtGState'),PDFLib.PDFDict);
      if(states&&!states.has(PDFLib.PDFName.of('FXE1')))states.set(PDFLib.PDFName.of('FXE1'),source.context.obj({BM:'Normal',CA:1,ca:1}));
    }
    for (const page of await output.copyPages(source, source.getPageIndices())) output.addPage(page);
  };
  if (doc.templateId === 'TMPL-02') {
    const student = doc.students[0]?.student, enrollment = doc.students[0]?.enrollment;
    const mapping = JSON.parse(fs.readFileSync(path.join(root, 'app/data/TMPL02_PDF_FIELDS.json'), 'utf8'));
    const namespaces = { institution: doc.institution, student: { ...student?.legacy, nombreCompleto: student?.name, apellidosNombres: student?.name, fullName: student?.name, numeroDocumento: student?.document }, enrollment: { ...enrollment?.legacy, id: enrollment?.id }, program: doc.program, module: doc.module, period: context.period, group: context.group };
    const resolvedFieldSet = {};
    for (const box of Object.values(mapping)) { const [namespace, key] = box.contractKey.split('.'); const value = namespaces[namespace]?.[key]; resolvedFieldSet[box.contractKey] = { value, status: value != null && value !== '' && value !== 'PENDIENTE' ? 'CONFIRMED' : 'MISSING' }; }
    const blob=await engine.renderTMPL02({ resolvedFieldSet });const filled=await PDFLib.PDFDocument.load(await blob.arrayBuffer());
    await supplementFicha(filled,engine,doc);await append(new Blob([await filled.save()],{type:'application/pdf'}));
  } else if (doc.templateId === 'TMPL-01') {
    const credits=doc.units?.length&&(doc.units||[]).every(u=>u.credits!==undefined&&u.credits!=='')?(doc.units||[]).reduce((sum,u)=>sum+Number(u.credits),0):null;
    await append(await engine.renderAdministrativeTMPL01({...context,studentsList:rows.map(r=>({...r,codigoMatricula:r.code||'',condicion:r.condition||'',numeroUnidades:doc.units.length||'',creditos:credits}))}));
  } else if (doc.templateId === 'TMPL-03') {
    await append(await engine.renderAdministrativeTMPL03({...context,studentsList:rows,explicitIdentity:true}));
  } else if (doc.templateId === 'TMPL-04') await append(await engine.renderTMPL04(context));
  else if (n >= 5 && n <= 17) {
    const capacity = manifest.capacity?.rows || 40, sessionCapacity = manifest.capacity?.sessions || 44;
    const batches = sessions.length ? Array.from({ length: Math.ceil(sessions.length / sessionCapacity) }, (_, i) => sessions.slice(i * sessionCapacity, (i + 1) * sessionCapacity)) : [[]];
    for (let i = 0; i < Math.max(rows.length, 1); i += capacity) for (const batch of n <= 10 ? batches : [[]]) await append(await engine.renderDocument({ documentType: doc.templateId, context: { ...context, sessions: batch }, rows: rows.slice(i, i + capacity) }));
  } else if(n===18||n===19){
    const capacity=manifest.capacity?.rows||40;for(let i=0;i<Math.max(rows.length,1);i+=capacity)await append(await engine.renderDocument({documentType:doc.templateId,context:{...context,statisticsRows:rows},rows:rows.slice(i,i+capacity)}));
  } else {
    const resolvedFieldSet = { 'institution.name': doc.institution.name, 'program.name': doc.program?.nombre, 'module.name': doc.module?.nombre, 'period.name': doc.group.periodId, 'teacher.name': actor.name,
      'group.ciclo':doc.group.ciclo,'group.modalidad':doc.group.modalidad,'curriculum.module.hours':doc.module?.hours,'curriculum.module.credits':doc.module?.credits,
      'curriculum.unit.competence':doc.module?.competence,'document.officialTitleText':doc.program?.officialTitleText,
      ...Object.fromEntries(['registerCode','emissionDate','registryBook','registryFolio','registryNumber','registryDate','registryAsiento'].map(k=>['document.'+k,doc.parameters?.[k]])),
      ...([20,21].includes(n) ? { 'student.fullName': doc.students[0]?.student.name, 'student.document': doc.students[0]?.student.document } : {}) };
    if(n===20){const enrollment=doc.students[0]?.enrollment.id;const details=(doc.units||[]).map(u=>({'curriculum.unit.name':u.name,'curriculum.unit.credits':u.credits,'curriculum.unit.hours':u.hours,'curriculum.unit.capacity':u.capacity,'evaluation.unitResult':doc.grades.find(r=>r.enrollmentId===enrollment&&r.unit===u.code&&r.indicator==='RESULTADO_UD')?.value}));
      if(details.length>7)throw new Error('El certificado tiene capacidad para siete unidades y la fila EFSRT.');
      const efsrt={'curriculum.unit.name':doc.module?.efsrtHours!=null?'Experiencias formativas en situación real de trabajo':'','curriculum.unit.hours':doc.module?.efsrtHours,'evaluation.unitResult':doc.parameters?.efsrtFinalGrade};
      while(details.length<3)details.push({});details.splice(3,0,efsrt);
      await append(await engine.renderFromManifest(doc.templateId,resolvedFieldSet,details));
    }else{
    const capacity = manifest.capacity?.rows || manifest.capacity?.detailRows || 40;
    for (let i = 0; i < Math.max(rows.length, 1); i += capacity) await append(await engine.renderFromManifest(doc.templateId, resolvedFieldSet, rows.slice(i, i + capacity)));
    }
  }
  const font = await output.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const responsibilities=JSON.parse(fs.readFileSync(path.join(root,'app/data/document-responsibility-boxes.json'),'utf8'))[doc.templateId]||[];
  for(const slot of responsibilities){const text=slot.key==='teacher'?doc.teacher:doc.institution[slot.key];if(!text)continue;const page=output.getPages()[slot.page-1];if(!page)continue;const fit=engine.fitTextOrThrow(text,font,slot,page.getHeight(),{maxFontSize:8,minFontSize:4.5,paddingX:2,align:'center',fieldKey:slot.key});page.drawText(fit.text,{x:fit.x,y:fit.y,size:fit.size,font});}
  for (const [index, page] of output.getPages().entries()) {

    page.drawText(`BORRADOR - NO OFICIAL | ${doc.templateId} | ${index + 1}/${output.getPageCount()}`, { x: 18, y: 8, size: 6, font, color: PDFLib.rgb(.6,.18,.18) });
    if([18,19].includes(n)&&rows.length>(manifest.capacity?.rows||40))page.drawText(`Continuación ${Math.floor(index/(n===19?2:1))+1}/${Math.ceil(rows.length/(manifest.capacity?.rows||40))} · ${rows.length} estudiantes en el grupo`,{x:page.getWidth()-260,y:8,size:6,font,color:PDFLib.rgb(.3,.3,.3)});
    if(doc.templateId==='TMPL-03'){page.drawRectangle({x:280,y:page.getHeight()-53,width:300,height:9,color:PDFLib.rgb(1,1,1)});const title='REGISTRO DE MATRÍCULA INSTITUCIONAL DEL PROGRAMA DE ESTUDIOS '+doc.group.periodId;const fit=engine.fitTextOrThrow(title,font,{x:280,y:44,w:300,h:9},page.getHeight(),{maxFontSize:7,minFontSize:4,paddingX:1,align:'center',fieldKey:'period.legend'});page.drawText(fit.text,{x:fit.x,y:fit.y,size:fit.size,font});}
  }
  const bytes=Buffer.from(await output.save());if(options.auditFile)fs.writeFileSync(options.auditFile,JSON.stringify({templateId:doc.templateId,sourcePdf:manifest.canonicalPdf,pages:output.getPageCount(),fonts:'Arial; Calibri para filas del registro de matrícula',fields:measurements},null,2));return bytes;
}
module.exports = { renderPDF };
async function supplementFicha(pdf,engine,doc){
 const page=pdf.getPages()[0],font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),height=page.getHeight();
 const draw=(value,box,key)=>{if(value==null||value===''||value==='PENDIENTE')return;const fit=engine.fitTextOrThrow(String(value),font,box,height,{maxFontSize:8,minFontSize:4.5,paddingX:3,align:'left',fieldKey:key});page.drawText(fit.text,{x:fit.x,y:fit.y,size:fit.size,font});};
 page.drawRectangle({x:340,y:height-77,width:162,height:15,color:PDFLib.rgb(1,1,1)});draw(doc.group.periodId,{x:340,y:62,w:162,h:15},'period.legend');
 for(const [value,box,key]of [[doc.group.periodId,{x:609.23,y:157.4,w:169.77,h:25.4},'period.lectivo'],[doc.module?.nombre,{x:222.064,y:182.8,w:246.928,h:25.4},'module.name'],[doc.group.periodClase,{x:609.23,y:182.8,w:169.77,h:25.4},'period.class'],[doc.program?.nivelFormativo,{x:222.064,y:208.2,w:246.928,h:23.2},'program.level'],[doc.group.periodId,{x:609.23,y:208.2,w:169.77,h:23.2},'period.academic'],[doc.program?.tipoPlan,{x:222.064,y:231.4,w:246.928,h:18.4},'program.plan']])draw(value,box,key);
 if(doc.units.length>8)throw new Error('La ficha de matrícula contiene ocho posiciones de unidades.');
 const limits=[309.62,331.45,351.16,368.78,387.08,406.8,426.52,446.24,468.08];
 for(const [i,u]of doc.units.entries()){const y=limits[i],h=limits[i+1]-y;for(const [value,x,w,key]of [[u.name,99.17,369.82,'name'],[u.credits,468.99,140.24,'credits'],[u.hours,609.23,63.15,'hours'],[doc.parameters.condition,672.38,106.63,'condition']])draw(value,{x,y,w,h},`unit.${i}.${key}`);}
 if(doc.parameters.subsanacionUnit)for(const [value,x,w,key]of [[doc.parameters.subsanacionUnit,99.17,369.82,'name'],[doc.parameters.subsanacionCredits,468.99,140.24,'credits'],[doc.parameters.subsanacionHours,609.23,63.15,'hours'],[doc.parameters.subsanacionCondition,672.38,106.63,'condition']])draw(value,{x,y:504.72,w,h:21.7},`subsanacion.${key}`);
}
