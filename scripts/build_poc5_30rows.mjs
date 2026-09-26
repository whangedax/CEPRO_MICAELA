import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { generatePOC_Test_01, generatePOC_Test_10, generatePOC_Test_30, generatePOC_Test_31 } from '../app/js/poc/pdf-draw-poc.js';

global.PDFLib = { PDFDocument, rgb, StandardFonts };

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

// Mock auto-fit dependency for Node environment
global.window = {
  getComputedStyle: () => ({
    getPropertyValue: () => '16px'
  })
};

async function build() {
  const t1 = await generatePOC_Test_01();
  try { fs.writeFileSync('TMPL01_TEST_01.pdf', t1.pdfBytes); console.log('TMPL01_TEST_01.pdf Generado con exito'); } catch (e) { console.error('No se pudo escribir TMPL01_TEST_01.pdf', e.message); }

  const t10 = await generatePOC_Test_10();
  try { fs.writeFileSync('TMPL01_TEST_10.pdf', t10.pdfBytes); console.log('TMPL01_TEST_10.pdf Generado con exito'); } catch (e) { console.error('No se pudo escribir TMPL01_TEST_10.pdf', e.message); }

  const t30 = await generatePOC_Test_30();
  try { fs.writeFileSync('TMPL01_TEST_30.pdf', t30.pdfBytes); console.log('TMPL01_TEST_30.pdf Generado con exito'); } catch (e) { console.error('No se pudo escribir TMPL01_TEST_30.pdf', e.message); }
  
  const results = {
    test01: t1.finalFixture,
    test10: t10.finalFixture,
    test30: t30.finalFixture
  };
  fs.writeFileSync('scratch/summary_results.json', JSON.stringify(results, null, 2));

  const t31 = await generatePOC_Test_31();
  if (t31.metrics && t31.metrics.length > 0) {
    console.log('TEST 31: Overflow controlado comprobado');
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
