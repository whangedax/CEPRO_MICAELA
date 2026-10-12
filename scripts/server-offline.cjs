const path=require('node:path'),fs=require('node:fs');
const {createService}=require('./offline-http.cjs');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.CETPRO_DATA_DIR||path.join(root,'private-data'));
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Se necesita Node.js 24 o posterior.');
fs.mkdirSync(directory,{recursive:true});
const lock=path.join(directory,'server-lock.json');
if(fs.existsSync(lock)){let running=false;try{process.kill(JSON.parse(fs.readFileSync(lock,'utf8')).pid,0);running=true;}catch{}if(running)throw new Error('Ya existe un servicio usando esta base local.');}
const service=createService({root,directory,backupFile:path.join(root,'CETPRO_BACKUP_2026-09-15 (2).json')});service.core.ensureDailyBackup();fs.writeFileSync(lock,JSON.stringify({pid:process.pid}));
const ports=process.env.CETPRO_PORT?[Number(process.env.CETPRO_PORT)]:[8080,8081],servers=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;process.exitCode=code;let pending=servers.length;
 const finish=()=>{if(--pending>0)return;service.core.close();if(fs.existsSync(lock)&&JSON.parse(fs.readFileSync(lock,'utf8')).pid===process.pid)fs.unlinkSync(lock);};
 if(!pending){pending=1;finish();return;}for(const server of servers)server.close(finish);
}
try{for(const port of ports){if(!Number.isInteger(port)||port<1||port>65535)throw Error('Puerto inválido. Use un número entre 1 y 65535.');const server=service.server();servers.push(server);server.on('error',e=>{console.error(`No se pudo iniciar CETPRO en el puerto ${port}: ${e.message}. Cierre el otro servicio o seleccione otro puerto.`);stop(1);});server.listen(port,'127.0.0.1',()=>{if(!stopping)console.log(`CETPRO: http://127.0.0.1:${port}/ · Configuración, documentos y operación local`);});}}catch(e){console.error(e.message);stop(1);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
