/** Auditoría read-only de los 21 PDF canónicos. No escribe archivos. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument, PDFName } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES');

async function readOne(file, includeText = false) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes = fs.readFileSync(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
  const loaded = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;
  const pages = [];
  for (let number = 1; number <= loaded.numPages; number++) {
    const page = await loaded.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const items = (await page.getTextContent()).items.filter(item => typeof item.str === 'string');
    pages.push({ number, width: Number(viewport.width.toFixed(3)), height: Number(viewport.height.toFixed(3)),
      orientation: viewport.width >= viewport.height ? 'LANDSCAPE' : 'PORTRAIT',
      textItems: items.length, text: includeText ? items.map(item => item.str).join(' ') : undefined });
  }
  return { id: `TMPL-${path.basename(file).slice(0, 2)}`, file: path.basename(file),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    pageCount: pdf.getPageCount(), pages, hasAcroForm: Boolean(pdf.catalog.get(PDFName.of('AcroForm'))),
    sizeBytes: bytes.length };
}

async function run() {
  const files = fs.readdirSync(DIR).filter(name => /^\d\d_.*\.pdf$/i.test(name)).sort();
  if (files.length !== 21) throw new Error(`Se esperaban 21 PDF, se hallaron ${files.length}.`);
  const requested = process.argv.find(arg => /^--id=\d\d$/.test(arg));
  const selected = requested ? files.filter(name => name.startsWith(requested.slice(-2))) : files;
  if (requested && selected.length !== 1) throw new Error(`ID no encontrado: ${requested}`);
  const output = [];
  for (const name of selected) output.push(await readOne(path.join(DIR, name), Boolean(requested)));
  console.log(JSON.stringify(output, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
