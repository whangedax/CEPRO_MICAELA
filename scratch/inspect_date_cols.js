const fs = require('fs');

async function checkDateCols() {
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
  })).filter(it => it.x > 760 && it.y > 1050);

  console.log('Date header items:');
  items.forEach(it => console.log(`x=${it.x.toFixed(2)}, y=${it.y.toFixed(2)}: "${it.str}"`));
}

checkDateCols().catch(console.error);
