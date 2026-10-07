const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false }).format(new Date()).replace(/[ :]/g,'-');
const destination = path.join(root, 'exports', `CETPRO_OFFLINE_${stamp}`);
fs.mkdirSync(destination, { recursive: true });
function copy(relative) {
  const from = path.join(root, relative), to = path.join(destination, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.cpSync(from, to, { recursive: true });
}
for (const relative of ['app/operational', 'app/img/logo-cetpro.jpg', 'app/data/pdf-manifests', 'app/data/TMPL01_PDF_FIELDS.json', 'app/data/TMPL02_PDF_FIELDS.json','app/data/document-responsibility-boxes.json',
  'scripts/role-policy.cjs','scripts/update-schema.cjs','scripts/tabular-io.cjs','scripts/data-update-service.cjs','scripts/server-offline.cjs', 'scripts/offline-core.cjs', 'scripts/offline-http.cjs', 'scripts/offline-pdf.cjs','scripts/offline-documents.cjs','scripts/document-contracts.cjs', 'scripts/restore-offline.cjs',
  'INICIAR_SISTEMA_CETPRO.bat', 'docs/GUIA_SISTEMA_OFFLINE.md','docs/AUDITORIA_FORMATOS_Y_ROLES.md','docs/VERIFICACION_OFFLINE.md']) copy(relative);
for (const file of ['pdf-template-engine.js','document-binding-service.js','document-fit-service.js','v2-document-manifest-registry.js','document-pagination-policy.js']) copy(`app/js/services/${file}`);
for (const module of ['pdf-lib','@pdf-lib','pako','tslib']) copy(`node_modules/${module}`);
const pdfs = new Set();
for (const file of fs.readdirSync(path.join(root, 'app/data/pdf-manifests'))) if (/^TMPL-\d+\.json$/.test(file)) pdfs.add(JSON.parse(fs.readFileSync(path.join(root, 'app/data/pdf-manifests', file), 'utf8')).canonicalPdf.replace(/^\//,''));
for (const pdf of pdfs) copy(pdf);
const nodeLicense = path.join(root, 'exports/NODE_LICENSE');
if (fs.existsSync(nodeLicense)) { fs.mkdirSync(path.join(destination, 'runtime')); fs.copyFileSync(process.execPath, path.join(destination, 'runtime/node.exe')); fs.copyFileSync(nodeLicense, path.join(destination, 'runtime/LICENSE')); }
fs.writeFileSync(path.join(destination, 'package.json'), JSON.stringify({ name:'cetpro-offline', version:'3.2.0', private:true, scripts:{start:'node scripts/server-offline.cjs'}, engines:{node:'>=24'}, dependencies:{'pdf-lib':'^1.17.1','@pdf-lib/fontkit':'^1.1.1'} },null,2));
const files = [];
function inventory(directory) { for (const file of fs.readdirSync(directory, { withFileTypes: true })) { const absolute = path.join(directory,file.name); if (file.isDirectory()) inventory(absolute); else files.push({ path: path.relative(destination,absolute).replace(/\\/g,'/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') }); } }
inventory(destination);
fs.writeFileSync(path.join(destination, 'MANIFEST.json'),JSON.stringify({ app:'CETPRO_OFFLINE', version:'3.2.0', node:fs.existsSync(nodeLicense)?process.version:null, builtAt:new Date().toISOString(), files },null,2));
console.log(destination);
