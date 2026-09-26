import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { _generatePOC_V4, generatePOC_V4_Normal } from '../app/js/poc/pdf-draw-poc.js';

global.PDFLib = { PDFDocument, rgb, StandardFonts };

// Polyfill fetch para pdf-lib (esquema simple para files locales)
global.fetch = async (url) => {
  let relative = url;
  if (url.startsWith('../')) {
    relative = url.substring(3);
  }
  const bytes = fs.readFileSync(relative);
  return {
    ok: true,
    arrayBuffer: async () => bytes,
    json: async () => JSON.parse(bytes.toString('utf8'))
  };
};

async function build() {
  const { pdfBytes, metrics } = await generatePOC_V4_Normal();
  fs.writeFileSync('TMPL01_POC_RESULTADO_V4.pdf', pdfBytes);
  console.log('V4 Generado con exito');
  console.table(metrics);
}

build().catch(console.error);
