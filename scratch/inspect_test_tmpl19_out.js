const fs = require('fs');

async function check() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('scratch/test_tmpl19_out.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log(`PDF Pages: ${doc.numPages}`);

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const str = tc.items.map(it => it.str).join(' ');
    console.log(`Page ${p} has ${tc.items.length} items. Sample text: ${str.slice(0, 200)}...`);
    // Check specific students
    if (p === 1) {
      console.log('Page 1 has ESTUDIANTE EJEMPLO PAGINA UNO 1:', str.includes('ESTUDIANTE EJEMPLO PAGINA UNO 1'));
      console.log('Page 1 has ESTUDIANTE EJEMPLO PAGINA UNO 20:', str.includes('ESTUDIANTE EJEMPLO PAGINA UNO 20'));
      console.log('Page 1 does NOT have PAGINA DOS:', !str.includes('PAGINA DOS'));
    }
    if (p === 2) {
      console.log('Page 2 has ESTUDIANTE EJEMPLO PAGINA DOS 21:', str.includes('ESTUDIANTE EJEMPLO PAGINA DOS 21'));
      console.log('Page 2 has ESTUDIANTE EJEMPLO PAGINA DOS 40:', str.includes('ESTUDIANTE EJEMPLO PAGINA DOS 40'));
      console.log('Page 2 does NOT have PAGINA UNO:', !str.includes('PAGINA UNO'));
    }
  }
}

check().catch(console.error);
