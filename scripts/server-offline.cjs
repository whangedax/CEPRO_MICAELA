const path=require('node:path'),fs=require('node:fs');
const {createService}=require('./offline-http.cjs');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.env.CETPRO_DATA_DIR||path.join(root,'private-data'));
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Se necesita Node.js 24 o posterior.');
fs.mkdirSync(directory,{recursive:true});
const lock=path.join(directory,'server-lock.json');
if(fs.existsSync(lock)){let running=false;try{process.kill(JSON.parse(fs.readFileSync(lock,'utf8')).pid,0);running=true;}catch{}if(running)throw new Error('Ya existe un servicio usando esta base local.');}
const service=createService({root,directory,backupFile:path.join(root,'CETPRO_BACKUP_2026-09-15 (2).json')});service.core.ensureDailyBackup();fs.writeFileSync(lock,JSON.stringify({pid:process.pid}));
const ports=process.env.CETPRO_PORT?[Number(process.env.CETPRO_PORT)]:[8080,8081];const servers=ports.map(port=>{const server=service.server();server.on('error',e=>{console.error(`Puerto ${port}: ${e.message}`);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`CETPRO: http://127.0.0.1:${port}/ · Configuración, documentos y operación local`));return server;});
function stop(){for(const server of servers)server.close();service.core.close();if(fs.existsSync(lock))fs.unlinkSync(lock);}
process.on('SIGINT',()=>{stop();process.exit(0);});process.on('SIGTERM',()=>{stop();process.exit(0);});
