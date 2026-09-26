/** Auditor v2 estrictamente read-only. Reporta; nunca corrige ni abre producción por nombre. */
const V2_STORES = Object.freeze(['estudiantes','matriculas','institucion','periodos','programas','modulos','unidades','indicadores','docentes','configuracion','matricula_unidades','asistencia','evaluacion','efsrt','documentos','auditoria','staging_importaciones','grupos_academicos']);
const EXPECTED_INDEXES = Object.freeze({ matriculas:['estudianteId','periodoId','moduloId','grupoCode','estudiante_periodo','grupoId'], grupos_academicos:['programaId','moduloId','periodoId','sourceGroupCode'] });
const setOf=(rows,key='id')=>new Set((rows||[]).map(row=>row[key]));

export function analyzeV2SystemIntegrity(snapshot, metadata={}) {
  const data=Object.fromEntries(V2_STORES.map(name=>[name,snapshot?.[name]||[]]));
  const issues=[]; const add=(code,store,id,reference)=>issues.push({code,store,id,reference});
  for(const [store,rows] of Object.entries(data)){
    const seen=new Set(); for(const row of rows){const key=row?.id??row?.clave;if(key==null)add('PRIMARY_KEY_MISSING',store,null,null);else if(seen.has(key))add('DUPLICATE_PRIMARY_KEY',store,key,null);else seen.add(key);}
  }
  const students=setOf(data.estudiantes), enrollments=new Map(data.matriculas.map(x=>[x.id,x]));
  const programs=setOf(data.programas), modules=new Map(data.modulos.map(x=>[x.id,x]));
  const periods=setOf(data.periodos), groups=new Map(data.grupos_academicos.map(x=>[x.id,x]));
  const units=new Map(data.unidades.map(x=>[x.id,x])), indicators=new Map(data.indicadores.map(x=>[x.id,x]));
  for(const group of groups.values()){
    if(!programs.has(group.programaId))add('GROUP_PROGRAM_ORPHAN','grupos_academicos',group.id,group.programaId);
    if(group.moduloId&&!modules.has(group.moduloId))add('GROUP_MODULE_ORPHAN','grupos_academicos',group.id,group.moduloId);
    if(group.periodoId&&!periods.has(group.periodoId))add('GROUP_PERIOD_ORPHAN','grupos_academicos',group.id,group.periodoId);
    if(group.moduloId&&modules.get(group.moduloId)?.programaId!==group.programaId)add('GROUP_MODULE_PROGRAM_MISMATCH','grupos_academicos',group.id,group.moduloId);
  }
  for(const row of enrollments.values()){
    if(!students.has(row.estudianteId))add('ENROLLMENT_STUDENT_ORPHAN','matriculas',row.id,row.estudianteId);
    if(!programs.has(row.programaId))add('ENROLLMENT_PROGRAM_ORPHAN','matriculas',row.id,row.programaId);
    const group=groups.get(row.grupoId);
    if(!group)add('ENROLLMENT_GROUP_ORPHAN','matriculas',row.id,row.grupoId);
    else {if(group.programaId!==row.programaId)add('ENROLLMENT_GROUP_PROGRAM_MISMATCH','matriculas',row.id,row.grupoId);if(group.sourceGroupCode!==row.grupoCode)add('DUAL_SOURCE_GROUP_DIVERGENCE','matriculas',row.id,row.grupoId);}
  }
  for(const row of modules.values())if(!programs.has(row.programaId))add('MODULE_PROGRAM_ORPHAN','modulos',row.id,row.programaId);
  for(const row of units.values())if(!modules.has(row.moduloId))add('UNIT_MODULE_ORPHAN','unidades',row.id,row.moduloId);
  for(const row of indicators.values())if(!units.has(row.unidadId))add('INDICATOR_UNIT_ORPHAN','indicadores',row.id,row.unidadId);
  for(const store of ['matricula_unidades','asistencia','evaluacion','efsrt','documentos'])for(const row of data[store]){
    if(row.matriculaId&&!enrollments.has(row.matriculaId))add('CONTEXT_ENROLLMENT_ORPHAN',store,row.id,row.matriculaId);
    if(row.grupoId&&!groups.has(row.grupoId))add('CONTEXT_GROUP_ORPHAN',store,row.id,row.grupoId);
    if(row.moduloId&&!modules.has(row.moduloId))add('CONTEXT_MODULE_ORPHAN',store,row.id,row.moduloId);
    if(row.periodoId&&!periods.has(row.periodoId))add('CONTEXT_PERIOD_ORPHAN',store,row.id,row.periodoId);
    if(row.unidadId&&!units.has(row.unidadId))add('CONTEXT_UNIT_ORPHAN',store,row.id,row.unidadId);
    if(row.indicadorId&&!indicators.has(row.indicadorId))add('CONTEXT_INDICATOR_ORPHAN',store,row.id,row.indicadorId);
  }
  const attendanceSessions=new Map(data.asistencia
    .filter(row=>row.recordType==='ATTENDANCE_SESSION')
    .map(row=>[row.sessionId||row.id,row]));
  const activeAttendanceKeys=new Set();
  for(const session of attendanceSessions.values()){
    const sessionId=session.sessionId||session.id;
    const group=groups.get(session.groupId), unit=units.get(session.unidadId);
    if(session.id!==sessionId)add('ATTENDANCE_SESSION_ID_MISMATCH','asistencia',session.id,sessionId);
    if(!group)add('ATTENDANCE_SESSION_GROUP_ORPHAN','asistencia',session.id,session.groupId);
    if(!unit)add('ATTENDANCE_SESSION_UNIT_ORPHAN','asistencia',session.id,session.unidadId);
    if(!periods.has(session.periodoId))add('ATTENDANCE_SESSION_PERIOD_ORPHAN','asistencia',session.id,session.periodoId);
    if(!group||!unit||!periods.has(session.periodoId))continue;
    if(group.periodoId!==session.periodoId)add('ATTENDANCE_SESSION_PERIOD_MISMATCH','asistencia',session.id,session.periodoId);
    if(!group.moduloId||unit.moduloId!==group.moduloId)add('ATTENDANCE_SESSION_UNIT_MODULE_MISMATCH','asistencia',session.id,session.unidadId);
  }
  for(const mark of data.asistencia.filter(row=>row.recordType==='ATTENDANCE_MARK')){
    const session=attendanceSessions.get(mark.sessionId), enrollment=enrollments.get(mark.matriculaId);
    if(!session)add('ATTENDANCE_MARK_SESSION_ORPHAN','asistencia',mark.id,mark.sessionId);
    if(!enrollment)add('ATTENDANCE_MARK_ENROLLMENT_ORPHAN','asistencia',mark.id,mark.matriculaId);
    if(session&&(mark.groupId!==session.groupId||mark.periodoId!==session.periodoId||mark.unidadId!==session.unidadId))
      add('ATTENDANCE_MARK_CONTEXT_MISMATCH','asistencia',mark.id,mark.sessionId);
    if(session&&enrollment&&enrollment.grupoId!==session.groupId)
      add('ATTENDANCE_MARK_GROUP_MEMBERSHIP_MISMATCH','asistencia',mark.id,mark.matriculaId);
    if(mark.estadoLogico!=='ANULADO'){
      const key=`${mark.sessionId}\u0000${mark.matriculaId}`;
      if(activeAttendanceKeys.has(key))add('ATTENDANCE_MARK_DUPLICATE_ACTIVE','asistencia',mark.id,key);
      else activeAttendanceKeys.add(key);
    }
  }
  const stores=metadata.stores||V2_STORES;
  for(const required of V2_STORES)if(!stores.includes(required))add('STORE_MISSING','schema',required,null);
  for(const [store,names] of Object.entries(EXPECTED_INDEXES))for(const name of names)if(metadata.indexes&&!metadata.indexes[store]?.includes(name))add('INDEX_MISSING',store,name,null);
  return {readOnly:true,schemaVersion:metadata.version??2,expectedStoreCount:18,counts:Object.fromEntries(V2_STORES.map(s=>[s,data[s].length])),issueCount:issues.length,valid:issues.length===0,issues};
}

export async function auditV2SystemIntegrity(db) {
  if(!db||db.name==='CETPRO_DB'||db.version!==2)throw new Error('SYSTEM_INTEGRITY solo admite una DB v2 aislada.');
  const stores=[...db.objectStoreNames]; const snapshot={}; const indexes={};
  await new Promise((resolve,reject)=>{const tx=db.transaction(stores,'readonly');let pending=stores.length;tx.onerror=()=>reject(tx.error||new Error('Auditoría v2 fallida.'));tx.onabort=tx.onerror;
    for(const store of stores){const os=tx.objectStore(store);indexes[store]=[...os.indexNames];const req=os.getAll();req.onsuccess=()=>{snapshot[store]=req.result||[];if(--pending===0)resolve();};req.onerror=()=>reject(req.error);}});
  return analyzeV2SystemIntegrity(snapshot,{version:db.version,stores,indexes});
}

export { V2_STORES, EXPECTED_INDEXES };
