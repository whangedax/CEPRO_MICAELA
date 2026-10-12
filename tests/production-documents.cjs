// Genera documentos reales en una copia consistente, sin escribir en la base de trabajo.
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync,backup}=require('node:sqlite'),{OfflineCore}=require('../scripts/offline-core.cjs'),{renderPDF}=require('../scripts/offline-pdf.cjs');
async function main(){
 const selected=process.argv.find(a=>a.startsWith('--groups='))?.slice(9).split(','),root=path.resolve(__dirname,'..'),out=path.join(__dirname,selected?'offline-artifacts/production-documents-after-assignments':'offline-artifacts/production-documents');fs.mkdirSync(out,{recursive:true});
 const snapshot=fs.mkdtempSync(path.join(out,'snapshot-')),live=new DatabaseSync(path.join(root,'private-data/cetpro.sqlite'),{readOnly:true});
 try{await backup(live,path.join(snapshot,'cetpro.sqlite'));}finally{live.close();}
 const c=new OfflineCore(snapshot),actor=c.users().find(u=>u.active&&!u.archived&&u.role==='DIRECTOR'),report={at:new Date().toISOString(),generated:0,errors:[],pending:0,groups:[]};
 try{
  const before=JSON.stringify(['students','enrollments','grades','attendance'].map(k=>c.records(k)));
  for(const g of c.records('groups').filter(g=>g.moduleId&&g.units?.length&&(!selected||selected.includes(g.id)))){
   const units=g.units.filter(u=>u!=='EFSRT'),en=c.records('enrollments').find(e=>e.groupId===g.id&&e.active);
   for(let n=1;n<=21;n++){
    if([2,20,21].includes(n)&&!en)continue;if(n>=5&&n<=10&&n-5>=units.length||n>=11&&n<=17&&n-11>=units.length)continue;
    const templateId='TMPL-'+String(n).padStart(2,'0');
    try{const doc=c.document(actor,{templateId,groupId:g.id,...([2,20,21].includes(n)?{enrollmentId:en.id}:{})}),key=g.id+'-'+templateId;
     const bytes=await renderPDF(root,doc,actor,{auditFile:path.join(out,key+'.json')});fs.writeFileSync(path.join(out,key+'.pdf'),bytes);report.generated++;if(!doc.preflight.complete)report.pending++;
    }catch(e){report.errors.push({groupId:g.id,templateId,error:e.message});}
   }
   report.groups.push(g.id);console.log(JSON.stringify({group:g.id,generated:report.generated,errors:report.errors.length}));
  }
  report.recordsPreserved=before===JSON.stringify(['students','enrollments','grades','attendance'].map(k=>c.records(k)));report.health=c.databaseHealth(actor).healthy;
  fs.writeFileSync(path.join(out,'REPORT.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,groups:report.groups.length}));if(report.errors.length||!report.recordsPreserved||!report.health)process.exitCode=1;
 }finally{c.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
