const fs = require('fs');

async function check() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page2 = await doc.getPage(2);
  const content = await page2.getTextContent();
  for (const item of content.items) {
    if (item.transform[5] > 200 && item.transform[5] < 300) {
      console.log(`Text: "${item.str}", x: ${item.transform[4]}, y: ${item.transform[5]}`);
    }
  }
}
check();
