const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 8081;
const BACKUP = path.join(ROOT, 'CETPRO_BACKUP_2026-09-15 (2).json');
const TYPES = { '.html':'text/html; charset=UTF-8','.css':'text/css; charset=UTF-8','.js':'text/javascript; charset=UTF-8','.json':'application/json; charset=UTF-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf' };

const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
  if (pathname === '/favicon.ico') { res.writeHead(204, { 'Cache-Control': 'no-store' }); res.end(); return; }
  if (pathname === '/_candidate/real-backup') {
    if (!fs.existsSync(BACKUP)) { res.writeHead(503,{'Content-Type':'text/plain'});res.end('Backup candidato no disponible.');return; }
    res.writeHead(200,{'Content-Type':'application/json; charset=UTF-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(BACKUP).pipe(res); return;
  }
  const requestPath = pathname === '/' ? '/app-v2/index.html' : pathname;
  const file = path.resolve(ROOT, `.${requestPath}`);
  if (!file.startsWith(ROOT + path.sep) || !['/app-v2/','/app/','/sources/','/tools/'].some(prefix => requestPath.startsWith(prefix))) {
    res.writeHead(403,{'Content-Type':'text/plain'});res.end('Forbidden');return;
  }
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404,{'Content-Type':'text/plain'});res.end('404');return;}
    res.writeHead(200,{'Content-Type':TYPES[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT,HOST,()=>console.log(`[APP-V2-CANDIDATE-01] http://${HOST}:${PORT}/ · DB=CETPRO_V2_CANDIDATE · schema=2`));
