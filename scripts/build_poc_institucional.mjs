import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { _generatePOC_V4, generatePOC_Test_Institucional } from '../app/js/poc/pdf-draw-poc.js';

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
  const { pdfBytes, metrics } = await generatePOC_Test_Institucional();
  fs.writeFileSync('TMPL01_TEST_INSTITUCIONAL.pdf', pdfBytes);
  console.log('Test Institucional Generado con exito');
  console.table(metrics);
}

build().catch(console.error);
