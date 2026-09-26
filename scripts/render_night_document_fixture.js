const fs = require('fs');
const path = require('path');
const { URL: NodeURL, pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'tmp', 'pdfs', 'night-document-build-01');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'TMPL02_SYNTHETIC_QA.pdf');

if (process.argv.includes('--clean')) {
  const expectedDir = path.join(ROOT, 'tmp', 'pdfs', 'night-document-build-01');
  if (OUTPUT_DIR !== expectedDir) throw new Error('Directorio QA inesperado.');
  for (const name of ['TMPL02_SYNTHETIC_QA.pdf', 'TMPL02_SYNTHETIC_QA.png', 'tmpl03.png', 'tmpl04.png']) {
    const target = path.join(expectedDir, name);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
  console.log('Artefactos QA sintéticos eliminados.');
  process.exit(0);
}

function installFixture() {
  global.URL = NodeURL;
  global.window = {
    location: { href: 'http://127.0.0.1:8081/app/index.html#/documentos' },
    PDFLib: require('pdf-lib')
  };
  global.fetch = async rawUrl => {
    const url = new URL(rawUrl);
    const localPath = path.join(ROOT, decodeURIComponent(url.pathname).replace(/^\//, ''));
    return {
      ok: fs.existsSync(localPath),
      async arrayBuffer() {
        const buffer = fs.readFileSync(localPath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      },
      async json() { return JSON.parse(fs.readFileSync(localPath, 'utf8')); }
    };
  };
}

async function run() {
  installFixture();
  const enginePath = path.join(ROOT, 'app/js/services/pdf-template-engine.js');
  const contractPath = path.join(ROOT, 'app/js/services/document-field-contract.js');
  const bindingPath = path.join(ROOT, 'app/js/services/document-binding-service.js');
  const { PdfTemplateEngine } = await import(`${pathToFileURL(enginePath).href}?qa=${Date.now()}`);
  const { resolveDocumentFields } = await import(pathToFileURL(contractPath).href);
  const { buildResolvedFieldSet } = await import(pathToFileURL(bindingPath).href);
  const context = {
    institution: {
      nombre: 'CETPRO SINTÉTICO QA', tipoGestion: 'PÚBLICA', ugel: 'UGEL QA',
      resolucion: 'R.D. QA', dre: '', codigoModular: '', departamento: '', provincia: '', distrito: ''
    },
    program: { nombre: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES' },
    student: { numeroDocumento: 'A2037218', apellidosNombres: 'MARÍA ÑUSTA O’CONNOR DE PRUEBA' }
  };
  const resolvedFieldSet = buildResolvedFieldSet(resolveDocumentFields('TMPL-02', context));
  const pdf = await new PdfTemplateEngine().renderTMPL02({ ...context, resolvedFieldSet });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, Buffer.from(await pdf.arrayBuffer()));
  console.log(JSON.stringify({ output: OUTPUT_FILE, bytes: pdf.size, type: pdf.type }));
}

run().catch(error => { console.error(error); process.exitCode = 1; });
