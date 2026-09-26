const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const PDFLib = require('pdf-lib');

const ROOT = path.resolve(__dirname, '..');
const outputArg = process.argv.find(arg => arg.startsWith('--output-dir='));
const prefixArg = process.argv.find(arg => arg.startsWith('--prefix='));
const OUTPUT_DIR = outputArg ? path.resolve(outputArg.slice('--output-dir='.length)) : path.join(ROOT, 'output', 'pdf');
const PREFIX = prefixArg ? prefixArg.slice('--prefix='.length).replace(/[^A-Z0-9_-]/gi, '') : '';
const ALLOW_MISSING_DIAGNOSTICS = process.argv.includes('--allow-missing-diagnostics');

function confirmed(value) { return { status: 'RESOLVED', value }; }

async function main() {
  global.window = { location: { origin: 'http://127.0.0.1:8081', href: 'http://127.0.0.1:8081/' }, PDFLib };
  const moduleUrl = `${pathToFileURL(path.join(ROOT, 'app/js/services/pdf-template-engine.js')).href}?qa=${Date.now()}`;
  const { PdfTemplateEngine } = await import(moduleUrl);
  const engine = new PdfTemplateEngine();
  engine._loadResource = async url => {
    const pathname = new URL(url).pathname.replace(/^\//, '').replaceAll('/', path.sep);
    const target = path.resolve(ROOT, pathname);
    if (!target.startsWith(`${ROOT}${path.sep}`)) throw new Error('RESOURCE_OUTSIDE_WORKSPACE');
    return fs.readFileSync(target);
  };

  const cases = [
    ['NORMAL', 'JUAN PEREZ', 'AUXILIAR TÉCNICO DE PRUEBA'],
    ['LONG_TEXT', "MARÍA DEL CARMEN O'CONNOR QUISPE DE LA CRUZ", 'AUXILIAR TÉCNICO EN ACTIVIDAD PRODUCTIVA DE PRUEBA EXTENSA']
  ];
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const [variant, studentName, titleText] of cases) {
    const blob = await engine.renderTMPL21({ resolvedFieldSet: {
      'student.fullName': confirmed(studentName),
      'document.officialTitleText': confirmed(titleText),
      'document.registerCode': confirmed('ABC01234')
    }});
    const bytes = Buffer.from(await blob.arrayBuffer());
    const filename = `${PREFIX}TMPL-21_${variant}_TEST_ONLY.pdf`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), bytes);
    const diagnostics = engine.lastRenderDiagnostics;
    if ((!diagnostics && !ALLOW_MISSING_DIAGNOSTICS) || diagnostics?.fields.some(field => !['DRAWN', 'FIELD_OVERFLOW', 'GEOMETRY_CONFLICT'].includes(field.status))) {
      throw new Error(`DIAGNOSTICS_INCOMPLETE: ${variant}`);
    }
  }
  console.log(`PHYSICAL_QA_ARTIFACTS_WRITTEN=${cases.length}`);
  console.log(`OUTPUT_DIR=${OUTPUT_DIR}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
