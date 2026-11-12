const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { OfflineCore, publicUser, fail } = require('./offline-core.cjs');
const { renderPDF } = require('./offline-pdf.cjs');
const DocumentSettings = require('./offline-documents.cjs');
const Workspace=require('./workspace.cjs');
const AccountContext=require('./account-context.cjs');
const {DataUpdateService}=require('./data-update-service.cjs');
const InstitutionalNetwork = require('./institutional-network.cjs');
const CeproBdCatalog = require('./cepro-bd-catalog.cjs');
const FichaRegistro2026 = require('./ficha-registro-2026.cjs');
const SyncWhatsApp = require('./sync-whatsapp.cjs');
const isPublicAdmissionRoute = (pathname) => {
  return pathname === '/admision-qr' ||
         pathname === '/ficha-2026' ||
         pathname === '/admision-2026' ||
         pathname === '/api/admission-ficha/standalone-html' ||
         pathname === '/api/public/admission-ficha/standalone-html' ||
         pathname.startsWith('/api/public/admission-ficha/') ||
         pathname === '/api/public/ficha-registro-2026';
};
function createService({ root, directory, backupFile }) {
  const core = new OfflineCore(directory, backupFile);
  const updates=new DataUpdateService(core,root);
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
  async function handler(req, res) {
    try {
      const rawRoute = ((req.url || '/').split('?')[0].replace(/\/+$/, '') || '/');
      if (rawRoute === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      const isPrivateLanHost = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(req.headers.host || '');
      const isPublicAdmission = isPublicAdmissionRoute(rawRoute) || (isPrivateLanHost && (rawRoute === '/' || rawRoute === '/index.html'));
      // El servicio es local: no confía en Host arbitrario, pero permite acceso a admisión desde la LAN privada.
      if (isPublicAdmission) {
        if (!/^(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])(:\d+)?$/.test(req.headers.host || '')) fail('Host no permitido.', 403);
      } else {
        if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) fail('Host no permitido.', 403);
      }
      const isAllowedOrigin = isPublicAdmission || !req.headers.origin ||
        req.headers.origin === 'null' ||
        req.headers.origin === `http://${req.headers.host}` ||
        /^http:\/\/(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(req.headers.origin);
      if (!isAllowedOrigin) fail('Origen no permitido.', 403);
      if (req.headers.origin && isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CETPRO-Instance-Secret');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      }
      const url = new URL(req.url, `http://${req.headers.host}`), route = url.pathname;
      if (rawRoute === '/admision-qr' || rawRoute === '/ficha-2026' || rawRoute === '/admision-2026' || (isPrivateLanHost && (rawRoute === '/' || rawRoute === '/index.html'))) {
        const config = FichaRegistro2026.getConfig(core, null);
        const html = FichaRegistro2026.generateStandaloneAdmissionHtml(config);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(html);
        return;
      }
      if (route.startsWith('/api/')) {
        if (!isPublicAdmission && process.env.CETPRO_INSTANCE_SECRET) {
          const reqSecret = req.headers['x-cetpro-instance-secret'];
          if (reqSecret !== process.env.CETPRO_INSTANCE_SECRET) {
            fail('Acceso no autorizado: Secreto de instancia inválido o ausente.', 401);
          }
        }
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
        if(route==='/api/exchange/recover'&&req.method==='POST')return json(res,200,core.recoverExchange(body));
        if (route === '/api/login' && req.method === 'POST') return json(res, 200, core.login(body, req.socket.remoteAddress));
        if (route === '/api/network/invitation/validate' && req.method === 'POST') return json(res, 200, InstitutionalNetwork.validateInvitation(core, body));
        if (route === '/api/network/invitation/accept' && req.method === 'POST') return json(res, 200, InstitutionalNetwork.acceptInvitationAndLink(core, body));
        if (route === '/api/public/admission-ficha/info' && req.method === 'GET') return json(res, 200, FichaRegistro2026.getPublicInfo(core, url.searchParams));
        if (route === '/api/public/admission-ficha/config' && req.method === 'GET') return json(res, 200, FichaRegistro2026.getConfig(core, null));
        if ((route === '/api/admission-ficha/standalone-html' || route === '/api/public/admission-ficha/standalone-html') && req.method === 'GET') {
          const config = FichaRegistro2026.getConfig(core, null);
          const html = FichaRegistro2026.generateStandaloneAdmissionHtml(config);
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': 'attachment; filename="ficha_admision_2026.html"',
            'Cache-Control': 'no-store'
          });
          res.end(html);
          return;
        }
        if (route === '/api/public/admission-ficha/qr' && req.method === 'POST') {
          const textToEncode = String(body.text || body.url || FichaRegistro2026.getConfig(core, null).admissionUrl);
          return json(res, 200, { ok: true, qrSvg: FichaRegistro2026.generateQrSvg(textToEncode) });
        }
        if ((route === '/api/public/admission-ficha/submit' || route === '/api/public/ficha-registro-2026') && req.method === 'POST') {
          return json(res, 201, FichaRegistro2026.submitPublicFicha(core, body, req.socket?.remoteAddress));
        }
        if (route === '/api/public/admission-ficha/pdf' && req.method === 'POST') {
          const pdfBuffer = await FichaRegistro2026.renderFichaRegistro2026PDF(root, body, core);
          const docNum = body.documentoIdentidad || body.profile?.documentoIdentidad || '2026';
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="FICHA_REGISTRO_2026_${docNum}.pdf"`,
            'Cache-Control': 'no-store'
          });
          res.end(pdfBuffer);
          return;
        }
        const token = (req.headers.authorization || '').replace(/^Bearer /, ''), user = core.authenticate(token);
        const session=core.sessions.get(token),context=session.workspace||null;
        if(route==='/api/workspace/options'&&req.method==='GET')return json(res,200,Workspace.options(core,user));
        if(route==='/api/workspace'&&req.method==='POST'){session.workspace=Workspace.select(core,user,body);return json(res,200,session.workspace);}
        Workspace.guard(core,user,context,route,body);
        const scopedUpdates=new DataUpdateService(Workspace.scopedCore(core,user,context),root);scopedUpdates.previews=updates.previews;
        if(['/api/data/export','/api/data/template'].includes(route)&&context&&!context.overview){body.options={...(body.options||{}),groupId:body.options?.groupId||context.groupId,unit:context.unit?(body.options?.unit||context.unit):body.options?.unit};if(body.options.unit)Workspace.assertUnit(context,body.options.unit);Workspace.assertGroup(core,user,context,body.options.groupId);}
        if(route==='/api/exchange/export'&&context&&!context.overview){if(body.groupId)Workspace.assertGroup(core,user,context,body.groupId);body={...body,moduleId:context.moduleId,groupId:body.groupId||context.groupId,unit:context.unit||body.unit};}
        if (route === '/api/me' && req.method === 'GET') return json(res, 200, publicUser(user));
        if (route === '/api/dashboard' && req.method === 'GET') return json(res, 200, Workspace.dashboard(core,user,user.role!=='DOCENTE'&&url.searchParams.get('overview')==='1'?{overview:true}:context));
        if(route==='/api/academic/configuration'&&req.method==='GET')return json(res,200,require('./academic-config.cjs').configuration(core,user));
        if (route === '/api/academic/documentary-catalog' && req.method === 'GET') return json(res, 200, CeproBdCatalog.getCatalog(core, user, url.searchParams));
        if(route==='/api/data/catalog'&&req.method==='GET'){const catalog=updates.catalog(user);if(context?.mode&&context.mode!=='UNIT')catalog.kinds=catalog.kinds.map(k=>({...k,canImport:['notas','asistencias'].includes(k.kind)?false:k.canImport}));return json(res,200,catalog);}
        if(route==='/api/document/configuration'&&req.method==='GET')return json(res,200,Workspace.filterConfiguration(core,user,context,DocumentSettings.configuration(core,user)));
        if (route === '/api/users' && req.method === 'GET') return json(res,200,url.searchParams.get('context')==='1'?AccountContext.list(core,user,context):core.listUsers(user));
        if((route==='/api/database/health'||route==='/api/system/health')&&req.method==='GET')return json(res,200,core.databaseHealth(user));
        if (route === '/api/network/status' && req.method === 'GET') return json(res, 200, InstitutionalNetwork.getNetworkStatus(core, user));
        if (route === '/api/audit' && req.method === 'GET') { core.requireRole(user, ['DIRECTOR']); return json(res, 200, core.db.prepare('SELECT value FROM audit ORDER BY rowid DESC LIMIT 100').all().map(r => JSON.parse(r.value))); }
        if (route === '/api/backups' && req.method === 'GET') { core.requireRole(user, ['DIRECTOR']); return json(res, 200, core.listBackups(user)); }
        if (route === '/api/backup/download' && req.method === 'GET') {
          core.requireRole(user, ['DIRECTOR']);
          const filename = url.searchParams.get('filename');
          const bytes = core.readBackupFile(user, filename);
          const contentType = filename && filename.endsWith('.cetpro-backup') ? 'application/octet-stream' : 'application/json; charset=utf-8';
          res.writeHead(200, { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${path.basename(filename)}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          res.end(bytes);
          return;
        }
        if (route === '/api/admission-ficha/config' && req.method === 'GET') return json(res, 200, FichaRegistro2026.getConfig(core, user));
        if (route === '/api/admission-ficha/submissions' && req.method === 'GET') return json(res, 200, FichaRegistro2026.listSubmissionsAndStudents(core, user));
        if (route === '/api/admission-ficha/generate-sample-whatsapp' && req.method === 'GET') return json(res, 200, FichaRegistro2026.generateSampleWhatsApp(core, user, {}));
        if (route === '/api/admission-ficha/standalone-html' && req.method === 'GET') {
          core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
          const config = FichaRegistro2026.getConfig(core, user);
          const html = FichaRegistro2026.generateStandaloneAdmissionHtml(config);
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': 'attachment; filename="ficha_admision_2026.html"',
            'Cache-Control': 'no-store'
          });
          res.end(html);
          return;
        }
        if (route.startsWith('/api/secretaria/fichas-registro/pdf/') && req.method === 'GET') {
          core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
          const docId = route.split('/').pop();
          const pdfBuffer = await FichaRegistro2026.renderFichaRegistro2026PDF(root, { documentoIdentidad: docId }, core);
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="FICHA_2026_${docId}.pdf"`,
            'Cache-Control': 'no-store'
          });
          res.end(pdfBuffer);
          return;
        }
        if (req.method !== 'POST') fail('Ruta no encontrada.', 404);
        if(route==='/api/data/export'||route==='/api/data/template'){const file=scopedUpdates.export(user,body.kind,body.format,body.options||{},route.endsWith('/template'));res.writeHead(200,{'Content-Type':file.type,'Content-Disposition':`attachment; filename="CETPRO_${body.kind}.${body.format||'csv'}"`,'Cache-Control':'no-store'});res.end(file.bytes);return;}
        if (route === '/api/document/pdf') {
          const doc = Workspace.document(core,user,context,body);if(body.fingerprint&&body.fingerprint!==doc.fingerprint)fail('Los datos cambiaron. Actualice la vista previa.',409);const bytes = await renderPDF(root, doc, user);
          const isDemo = Boolean(doc.demoMode || doc.demoFill); const isDraft = !isDemo && !doc.preflight?.complete; const statusSuffix = isDemo ? 'DEMOSTRACION' : (isDraft ? 'BORRADOR' : 'COMPLETADO');
          res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${doc.templateId}_${statusSuffix}.pdf"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(bytes); return;
        }
        if(route==='/api/document/submit'){
          const doc=Workspace.document(core,user,context,body);if(body.fingerprint!==doc.fingerprint)fail('Los datos cambiaron después de la vista previa. Actualícela antes de entregar.',409);
          if(!doc.preflight.complete)fail('Hay campos pendientes. Complete los datos señalados antes de entregar.',422);
          return json(res,200,core.submitDocument(user,doc,await renderPDF(root,doc,user)));
        }
        if(route==='/api/document/submission-pdf'){
          const bytes=core.submissionPDF(user,body.id);res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store'});res.end(bytes);return;
        }
        if (route === '/api/admission-ficha/pdf' && req.method === 'POST') {
          core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
          const pdfBuffer = await FichaRegistro2026.renderFichaRegistro2026PDF(root, body, core);
          const docNum = body.documentoIdentidad || body.profile?.documentoIdentidad || '2026';
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="FICHA_2026_${docNum}.pdf"`,
            'Cache-Control': 'no-store'
          });
          res.end(pdfBuffer);
          return;
        }
        let result;
        switch (route) {
          case '/api/academic/documentary-catalog/save-program': result = CeproBdCatalog.saveProgramCatalog(core, user, body); break;
          case '/api/academic/documentary-catalog/resolve-issue': result = CeproBdCatalog.resolveIssue(core, user, body); break;
          case '/api/academic/documentary-catalog/save-parameter': result = CeproBdCatalog.saveParameter(core, user, body); break;
          case '/api/academic/documentary-catalog/sync-to-curriculum': result = CeproBdCatalog.syncToCurriculum(core, user, body); break;
          case '/api/academic/reference/apply':result=require('./reference-defaults.cjs').apply(core,user,body);break;
          case '/api/academic/year': result=require('./academic-config.cjs').cloneYear(core,user,body);break;
          case '/api/logout': result = core.logout(token); break;
          case '/api/password': result = core.changePassword(user, body); break;
          case '/api/users/reject-request':result=core.rejectAccountRequest(user,body);break;
          case '/api/users/archive':result=AccountContext.remove(core,user,context,body);break;
          case '/api/students/archive':result=core.archiveStudent(user,body);break;
          case '/api/exchange/export':result=core.exchangePackage(user,body);break;
          case '/api/exchange/preview':result=core.importPackage(user,body.package,false,body.passphrase);break;
          case '/api/exchange/import':result=core.importPackage(user,body.package,true,body.passphrase);break;
          case '/api/users': result = AccountContext.save(core,user,context,body); break;
          case '/api/users/accept-request':result=core.acceptRegistrationRequest(user,body);break;
          case '/api/students/accept-request':result=core.acceptStudentRequest(user,body);break;
          case '/api/data/preview':if(context?.mode&&context.mode!=='UNIT'&&['notas','asistencias'].includes(body.kind))fail('Seleccione una unidad para importar sus notas o asistencias.');result=scopedUpdates.preview(user,body);scopedUpdates.previews.get(result.token).workspaceKey=JSON.stringify(context);break;
          case '/api/data/apply':if(scopedUpdates.previews.get(body.token)?.workspaceKey!==undefined&&scopedUpdates.previews.get(body.token).workspaceKey!==JSON.stringify(context))fail('Cambió el módulo. Revise el archivo nuevamente antes de aplicar.',409);result=scopedUpdates.apply(user,body.token);break;
          case '/api/students': result = core.saveStudent(user, body); break;
          case '/api/groups': result = core.saveGroup(user, body); break;
          case '/api/enrollments': result = core.enroll(user, body); break;
          case '/api/enrollments/retire': result = core.retireEnrollment(user, body); break;
          case '/api/enrollments/module': result=require('./module-enrollments.cjs').correctModule(core,user,body);break;
          case '/api/grades': result = core.saveAcademic(user, 'grades', body); break;
          case '/api/attendance': result = core.saveAcademic(user, 'attendance', body); break;
          case '/api/attendance/simulate-unit': result = core.simulateUnitAttendance(user, body); break;
          case '/api/attendance/clear-unit': result = core.clearUnitAttendance(user, body); break;
          case '/api/closure': result = core.closure(user, body); break;
          case '/api/provision': result = core.provision(user, body); break;
          case '/api/sync/export': result = core.packageFor(user, body.deviceId); break;
          case '/api/sync/preview': result = core.importPackage(user, body.package, false); break;
          case '/api/sync/import': result = core.importPackage(user, body.package, true); break;
          case '/api/conflicts/resolve': result = core.resolve(user, body); break;
          case '/api/backup': core.requireRole(user, ['DIRECTOR']); result = core.createBackup(user, body.label || 'manual'); break;
          case '/api/backup/export-encrypted': core.requireRole(user, ['DIRECTOR']); result = core.exportEncryptedBackup(user, body); break;
          case '/api/backup/inspect': core.requireRole(user, ['DIRECTOR']); result = core.inspectBackup(user, body); break;
          case '/api/restore': core.requireRole(user, ['DIRECTOR']); result = core.restoreBackup(user, body); break;
          case '/api/legacy/import': result = core.importLegacy(user, body); break;
          case '/api/document': result = Workspace.document(core,user,context,body); break;
          case '/api/document/configuration': result=DocumentSettings.saveSettings(core,user,body);break;
          case '/api/document/review':result=core.reviewDocument(user,body);break;
          case '/api/network/kit': result = InstitutionalNetwork.createKit(core, user, body, root); break;
          case '/api/network/export-batch': result = InstitutionalNetwork.prepareBatchExport(core, user, body); break;
          case '/api/network/scan': result = InstitutionalNetwork.scanUsb(core, user, body); break;
          case '/api/network/import-batch': result = InstitutionalNetwork.importBatch(core, user, body); break;
          case '/api/network/revoke': result = InstitutionalNetwork.revokeDevice(core, user, body); break;
          case '/api/network/replace': result = InstitutionalNetwork.replaceDevice(core, user, body, root); break;
          case '/api/network/whatsapp/export': result = SyncWhatsApp.exportForWhatsApp(core, user, body); break;
          case '/api/network/whatsapp/import': result = SyncWhatsApp.importFromWhatsApp(core, user, body); break;
          case '/api/admission-ficha/config': result = FichaRegistro2026.updateConfig(core, user, body); break;
          case '/api/admission-ficha/import-whatsapp':
          case '/api/secretaria/fichas-registro/importar-texto':
            result = FichaRegistro2026.importWhatsAppFicha(core, user, body); break;
          case '/api/admission-ficha/generate-sample-whatsapp':
            result = FichaRegistro2026.generateSampleWhatsApp(core, user, body); break;
          case '/api/admission-ficha/save-and-enroll':
          case '/api/secretaria/fichas-registro/confirmar-guardar':
            result = FichaRegistro2026.saveAndEnrollFicha(core, user, body); break;
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
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.svg':'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", 'Referrer-Policy': 'no-referrer' });
      fs.createReadStream(file).pipe(res);
    } catch (error) { if (!res.headersSent) json(res, error.status || 400, { error: error.message }); else res.end(); }
  }
  return { core, handler, server: () => http.createServer(handler) };
}
module.exports = { createService };
