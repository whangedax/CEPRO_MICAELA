const fs = require('fs');

async function check() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = tc.items.map(it => ({
    str: it.str,
    x: it.transform[4],
    y: it.transform[5],
    w: it.width,
    h: it.height
  })).filter(it => it.y < 350 && it.str.trim());

  console.log(`Total non-empty items below y < 350: ${items.length}`);
  items.forEach(it => {
    console.log(`y=${it.y.toFixed(2)}, x=${it.x.toFixed(2)}: "${it.str}"`);
  });
}

check().catch(console.error);
