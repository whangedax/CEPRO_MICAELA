const crypto=require('node:crypto');
const {MODULE_LABELS,validateSyncModule}=require('./sync-modules.cjs');
const MAX_PACKAGE=28*1024*1024, TTL=15*60*1000;
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const publicPerson=user=>user?{id:user.id,name:user.name,role:user.role}:null;
function checkActor(core,actor){const current=core.user(actor?.id);if(!current?.active||current.version!==actor.version||!['DIRECTOR','SECRETARIA','DOCENTE'].includes(current.role))fail('La cuenta cambió o no está autorizada. Inicie sesión de nuevo.',403);return current;}
function capabilities(core,actor){
 checkActor(core,actor);
 const people=new Map([...core.records('userDirectory'),...core.users()].map(user=>[user.id,user]));
 return {role:actor.role,modules:Object.entries(MODULE_LABELS).map(([id,label])=>({id,label,description:label,canExport:!(actor.role==='DOCENTE'&&id==='config'),canImport:true})),recipients:[...people.values()].filter(u=>u.active&&!u.archived&&u.id!==actor.id&&(actor.role!=='DOCENTE'||['DIRECTOR','SECRETARIA'].includes(u.role))).map(publicPerson),importPolicy:'Se agregan y actualizan registros autorizados; las diferencias se conservan para revisión. No se restaura ni reemplaza la base de datos.',passphraseRequired:true};
}
function exportTransfer(core,actor,input={}){
 const caps=capabilities(core,actor),module=validateSyncModule(input.syncModule||'all');
 if(!caps.modules.find(m=>m.id===module)?.canExport)fail('Su rol no exporta este módulo.',403);
 if(!['WHATSAPP','USB'].includes(input.channel||'USB'))fail('Canal de intercambio desconocido.');
 if(typeof input.passphrase!=='string'||input.passphrase.length<8||input.passphrase.length>200)fail('Introduzca una clave de intercambio de entre 8 y 200 caracteres.');
 if(input.recipientUserId&&!caps.recipients.some(u=>u.id===input.recipientUserId))fail('Seleccione una cuenta destinataria permitida.',403);
 if(input.groupId)core.requireGroup(actor,input.groupId,input.unit);
 if(input.unit&&!input.groupId)fail('Seleccione un aula para limitar la unidad.');
 const pkg=core.exchangePackage(actor,{syncModule:module,recipientUserId:input.recipientUserId,passphrase:input.passphrase,groupId:input.groupId,unit:input.unit});
 const counts=pkg.summary.counts,summary={module,label:MODULE_LABELS[module],total:Object.values(counts).reduce((a,b)=>a+b,0),counts,dependencies:pkg.summary.dependencies||{},sender:publicPerson(actor),recipient:caps.recipients.find(u=>u.id===input.recipientUserId)||null};
 if(Buffer.byteLength(JSON.stringify(pkg))>MAX_PACKAGE)fail('Archivo demasiado grande. Exporte un aula por separado.',413);
 const {encodePackageToToken}=require('./sync-whatsapp.cjs');
 const token=encodePackageToToken(pkg),tokenText=Buffer.byteLength(token)<=64*1024?token:undefined;
 const titles={programs:'Programas',modules:'Módulos',groups:'Aulas',students:'Estudiantes',enrollments:'Matrículas',grades:'Notas',attendance:'Asistencias',documentSettings:'Configuraciones',documentSubmissions:'Entregas',studentRequests:'Propuestas de estudiantes',userDirectory:'Directorio'};
 const oneLine=value=>String(value||'').replace(/[\r\n]+/g,' ');
 const heading=['CETPRO — Intercambio de información',`Envía: ${oneLine(actor.name)} (${actor.role})`,`Para: ${oneLine(summary.recipient?.name)||'Personal autorizado de la institución'}`,`Contenido: ${summary.label}`,...Object.entries(counts).map(([entity,count])=>`${titles[entity]||entity}: ${count}`),'La clave se comparte por separado. Revise el contenido en el sistema antes de importar.'].join('\n');
 const candidate=tokenText?`${heading}\n\n${tokenText}`:undefined;
 const shareText=candidate&&Buffer.byteLength(candidate)<=64*1024?candidate:tokenText;
 return {package:pkg,tokenText,shareText,summary,fileName:`CETPRO_${module}_${crypto.randomUUID()}.cetpro`,message:tokenText?'Código disponible.':'El lote requiere adjuntar el archivo .cetpro.',instructions:'Comparta el archivo o código y comunique la clave por un canal separado. El receptor debe revisar antes de confirmar.'};
}
// Fingerprint only local revision state; no secret is exposed or returned.
function stateKey(core){return hash(['records','users','operations','receipts','conflicts','settings'].map(table=>core.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()));}
class SyncTransferService{
 constructor(core){this.core=core;this.previews=new Map();}
 prune(){for(const [key,value]of this.previews)if(value.expires<Date.now())this.previews.delete(key);while(this.previews.size>=25)this.previews.delete(this.previews.keys().next().value);}
 preview(actor,input={},context=null){
  checkActor(this.core,actor);this.prune();
  if(input.tokenText&&input.package)fail('Seleccione código o archivo, no ambos.');
  let pkg=input.package;
  if(input.tokenText)pkg=require('./sync-whatsapp.cjs').decodeTokenToPackage(input.tokenText);
  if(!pkg||Buffer.byteLength(JSON.stringify(pkg))>MAX_PACKAGE)fail('Archivo ausente o demasiado grande.',413);
  const module=validateSyncModule(pkg.body?.syncModule||'all');
  const report=this.core.importPackage(actor,pkg,false,input.passphrase);
  const counts=report.description?.counts||{};
  const summary={module,label:MODULE_LABELS[module],total:Object.values(counts).reduce((sum,count)=>sum+count,0),counts,sender:{...report.description.sender,id:pkg.body.certificate.body.user.id},recipient:report.description?.recipient?{...report.description.recipient,id:pkg.body.recipientUserId}:null};
  const previewToken=crypto.randomUUID();
  this.previews.set(previewToken,{actorId:actor.id,version:actor.version,context:hash(context),state:stateKey(this.core),pkg:JSON.parse(JSON.stringify(pkg)),passphrase:input.passphrase,summary,expires:Date.now()+TTL});
  return {previewToken,report,summary};
 }
 import(actor,input={},context=null){
  checkActor(this.core,actor);const saved=this.previews.get(input.previewToken);
  if(!saved||saved.expires<Date.now()||saved.actorId!==actor.id||saved.version!==actor.version||saved.context!==hash(context))fail('La revisión expiró o cambió el contexto. Revise el archivo nuevamente.',409);
  if(saved.state!==stateKey(this.core)){this.previews.delete(input.previewToken);fail('Los datos cambiaron después de revisar. Vuelva a obtener la vista previa.',409);}
  const report=this.core.importPackage(actor,saved.pkg,true,saved.passphrase);
  this.previews.delete(input.previewToken);
  return {report,summary:saved.summary};
 }
}
module.exports={capabilities,exportTransfer,SyncTransferService,MAX_PACKAGE};
