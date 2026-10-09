// Correspondencia de trabajo autorizada por el usuario. No es una transcripción oficial.
const D=require('./offline-documents.cjs');
const names={
 'MOD-2026-AFICHE-002-1':['Frenos, suspensión y seguridad del taller de motos','Dirección y transmisión de motos y vehículos afines','Sistemas eléctricos, iluminación y accesorios de motos','Diagnóstico de sistemas electrónicos de motos','Comunicación y herramientas digitales para el taller'],
 'MOD-2026-AFICHE-002-2':['Motor de combustión y lubricación de motos','Alimentación, inyección y diagnóstico electrónico de motos','Conversión al sistema de combustible GNV-GLP','Mantenimiento y seguridad de sistemas de combustible dual','Plan de negocios y comportamiento ético en el taller'],
 'MOD-2026-AFICHE-003-2':['Seguridad y preparación para soldadura de aluminio','Soldadura TIG en aluminio','Soldadura MIG-MAG en construcciones metálicas','Fabricación y ensamblaje de carpintería de aluminio','Corte y unión con tecnología láser','Control de calidad y gestión del taller']
};
const pending=v=>!v||/pendiente|por confirmar|^Unidad \d+$/i.test(v);
function configureNames(core,actor){core.requireRole(actor,['DIRECTOR']);return core.transaction(()=>{
 const before=JSON.stringify(['students','enrollments','grades','attendance'].map(k=>core.records(k)));let changed=0;
 const backup=core.createBackup(actor,'antes-nombres-unidades-trabajo');
 for(const [id,titles]of Object.entries(names)){
  const r=core.record('documentSettings','curriculum:'+id);if(!r||r.archived)continue;
  const units=JSON.parse(r.fields.unitsJson);let modified=false;
  for(const u of units){const title=titles[Number(u.code.replace('UD',''))-1];if(title&&pending(u.name)){u.name=title;u.nameOrigin='Propuesta editable: agrupación de temas del ZIP y afiche; correspondencia curricular pendiente de aprobación institucional';u.confirmed=false;modified=true;changed++;}}
  if(modified)D.saveSettings(core,actor,{scope:r.scope,rev:r.rev,fields:{unitsJson:JSON.stringify(units)}});
  for(const g of core.records('groups').filter(g=>g.moduleId===id))for(const u of units){const old=core.record('documentSettings',`unit:${g.id}:${u.code}`);if(old&&pending(old.fields.name)&&u.nameOrigin)D.saveSettings(core,actor,{scope:old.scope,rev:old.rev,fields:{name:u.name}});}
 }
 if(before!==JSON.stringify(['students','enrollments','grades','attendance'].map(k=>core.records(k))))throw Error('Cambió un registro académico. Operación cancelada.');
 if(!core.databaseHealth(actor).healthy)throw Error('No se superó la revisión de integridad.');
 const report={changed,backup:backup.filename,at:new Date().toISOString()};core.audit('NOMBRES_UNIDADES_PROPUESTA',actor,report);return report;
});}
if(require.main===module){const {OfflineCore}=require('./offline-core.cjs'),c=new OfflineCore(process.argv[2]||require('node:path').join(__dirname,'../private-data'));try{console.log(JSON.stringify(configureNames(c,c.users().find(u=>u.active&&u.role==='DIRECTOR'))));}finally{c.close();}}
module.exports={names,configureNames};
