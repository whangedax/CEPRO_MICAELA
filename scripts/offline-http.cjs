const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore, publicUser, fail } = require('./offline-core.cjs');
const { renderPDF } = require('./offline-pdf.cjs');
const DocumentSettings = require('./offline-documents.cjs');
const {DataUpdateService}=require('./data-update-service.cjs');
function createService({ root, directory, backupFile }) {
  const core = new OfflineCore(directory, backupFile);
  const updates=new DataUpdateService(core,root);
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
  async function handler(req, res) {
    try {
      // El servicio es local: no confía en Host arbitrario ni peticiones desde otros sitios.
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) fail('Host no permitido.', 403);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) fail('Origen no permitido.', 403);
      const url = new URL(req.url, `http://${req.headers.host}`), route = url.pathname;
      if (route.startsWith('/api/')) {
        let body = {};
        if (req.method === 'POST') {
          if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail('Envíe JSON.', 415);
          const buffers = []; let length = 0;
          for await (const buffer of req) { length += buffer.length; if (length > 32 * 1024 * 1024) fail('Archivo demasiado grande (máximo 32 MB).', 413); buffers.push(buffer); }
          try { body = JSON.parse(Buffer.concat(buffers).toString() || '{}'); } catch { fail('JSON inválido.'); }
        }
        if (!['GET', 'POST'].includes(req.method)) fail('Método no permitido.', 405);
        if (route === '/api/status' && req.method === 'GET') return json(res, 200, core.status());
        if (route === '/api/device-request' && req.method === 'GET') return json(res, 200, core.requestDevice());
        if (route === '/api/setup' && req.method === 'POST') return json(res, 200, core.setup(body));
        if (route === '/api/provision/accept' && req.method === 'POST') return json(res, 200, core.acceptProvision(body));
        if (route === '/api/login' && req.method === 'POST') return json(res, 200, core.login(body, req.socket.remoteAddress));
        const token = (req.headers.authorization || '').replace(/^Bearer /, ''), user = core.authenticate(token);
        if (route === '/api/me' && req.method === 'GET') return json(res, 200, publicUser(user));
        if (route === '/api/dashboard' && req.method === 'GET') return json(res, 200, core.dashboard(user));
        if(route==='/api/data/catalog'&&req.method==='GET')return json(res,200,updates.catalog(user));
        if(route==='/api/document/configuration'&&req.method==='GET')return json(res,200,DocumentSettings.configuration(core,user));
        if (route === '/api/users' && req.method === 'GET') return json(res,200,core.listUsers(user));
        if (route === '/api/audit' && req.method === 'GET') { core.requireRole(user, ['DIRECTOR']); return json(res, 200, core.db.prepare('SELECT value FROM audit ORDER BY rowid DESC LIMIT 100').all().map(r => JSON.parse(r.value))); }
        if (req.method !== 'POST') fail('Ruta no encontrada.', 404);
        if(route==='/api/data/export'||route==='/api/data/template'){const file=updates.export(user,body.kind,body.format,body.options||{},route.endsWith('/template'));res.writeHead(200,{'Content-Type':file.type,'Content-Disposition':`attachment; filename="CETPRO_${body.kind}.${body.format||'csv'}"`,'Cache-Control':'no-store'});res.end(file.bytes);return;}
        if (route === '/api/document/pdf') {
          const doc = core.document(user, body);if(body.fingerprint&&body.fingerprint!==doc.fingerprint)fail('Los datos cambiaron. Actualice la vista previa.',409);const bytes = await renderPDF(root, doc, user);
          res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${doc.templateId}_BORRADOR.pdf"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(bytes); return;
        }
        if(route==='/api/document/submit'){
          const doc=core.document(user,body);if(body.fingerprint!==doc.fingerprint)fail('Los datos cambiaron después de la vista previa. Actualícela antes de entregar.',409);
          if(!doc.preflight.complete)fail('Hay campos pendientes. Complete los datos señalados antes de entregar.',422);
          return json(res,200,core.submitDocument(user,doc,await renderPDF(root,doc,user)));
        }
        if(route==='/api/document/submission-pdf'){
          const bytes=core.submissionPDF(user,body.id);res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store'});res.end(bytes);return;
        }
        let result;
        switch (route) {
          case '/api/logout': result = core.logout(token); break;
          case '/api/password': result = core.changePassword(user, body); break;
          case '/api/users': result = core.saveUser(user, body); break;
          case '/api/users/accept-request':result=core.acceptRegistrationRequest(user,body);break;
          case '/api/students/accept-request':result=core.acceptStudentRequest(user,body);break;
          case '/api/data/preview':result=updates.preview(user,body);break;
          case '/api/data/apply':result=updates.apply(user,body.token);break;
          case '/api/students': result = core.saveStudent(user, body); break;
          case '/api/groups': result = core.saveGroup(user, body); break;
          case '/api/enrollments': result = core.enroll(user, body); break;
          case '/api/enrollments/retire': result = core.retireEnrollment(user, body); break;
          case '/api/grades': result = core.saveAcademic(user, 'grades', body); break;
          case '/api/attendance': result = core.saveAcademic(user, 'attendance', body); break;
          case '/api/closure': result = core.closure(user, body); break;
          case '/api/provision': result = core.provision(user, body); break;
          case '/api/sync/export': result = core.packageFor(user, body.deviceId); break;
          case '/api/sync/preview': result = core.importPackage(user, body.package, false); break;
          case '/api/sync/import': result = core.importPackage(user, body.package, true); break;
          case '/api/conflicts/resolve': result = core.resolve(user, body); break;
          case '/api/backup': core.requireRole(user, ['DIRECTOR']); result = core.createBackup(user); break;
          case '/api/legacy/import': result = core.importLegacy(user, body); break;
          case '/api/document': result = core.document(user, body); break;
          case '/api/document/configuration': result=DocumentSettings.saveSettings(core,user,body);break;
          case '/api/document/review':result=core.reviewDocument(user,body);break;
          default: fail('Ruta no encontrada.', 404);
        }
        return json(res, 200, result);
      }
      // El sistema anterior se conserva en disco; sus respaldos y scripts privados no se sirven por HTTP.
      const mapped = ['/', '/index.html', '/app/', '/app/index.html', '/app-v2/', '/app-v2/index.html'].includes(route) ? '/app/operational/index.html' : route;
      const allowed = mapped.startsWith('/app/operational/') || mapped === '/app/img/logo-cetpro.jpg';
      if (!allowed) fail('Recurso no disponible.', 404);
      const file = path.resolve(root, `.${decodeURIComponent(mapped)}`);
      if (!file.startsWith(path.resolve(root) + path.sep)) fail('Ruta inválida.', 403);
      const publicDirectory = path.resolve(root, 'app/operational'), logo = path.resolve(root, 'app/img/logo-cetpro.jpg');
      if (!file.startsWith(publicDirectory + path.sep) && file !== logo) fail('Recurso fuera de la carpeta pública.', 403);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail('Recurso no encontrado.', 404);
      const realFile = fs.realpathSync(file);
      if (!realFile.startsWith(fs.realpathSync(publicDirectory) + path.sep) && realFile !== fs.realpathSync(logo)) fail('Recurso enlazado fuera de la carpeta pública.', 403);
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'Referrer-Policy': 'no-referrer' });
      fs.createReadStream(file).pipe(res);
    } catch (error) { if (!res.headersSent) json(res, error.status || 400, { error: error.message }); else res.end(); }
  }
  return { core, handler, server: () => http.createServer(handler) };
}
module.exports = { createService };
