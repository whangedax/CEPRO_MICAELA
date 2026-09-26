const fs = require('fs');

async function run() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page1 = await doc.getPage(1);
  const tc1 = await page1.getTextContent();
  const H = 841.89;
  console.log('=== PAGE 1 HEADERS (topY 140 to 370, x > 500) ===');
  tc1.items.forEach(it => {
    const topY = H - it.transform[5];
    if (topY > 140 && topY < 370 && it.transform[4] > 500) {
      console.log(`topY=${topY.toFixed(1)} x=${it.transform[4].toFixed(1)} w=${it.width.toFixed(1)}: "${it.str}"`);
    }
  });

  const page2 = await doc.getPage(2);
  const tc2 = await page2.getTextContent();
  console.log('\n=== PAGE 2 HEADERS (topY 20 to 220, x > 500) ===');
  tc2.items.forEach(it => {
    const topY = H - it.transform[5];
    if (topY > 20 && topY < 220 && it.transform[4] > 500) {
      console.log(`topY=${topY.toFixed(1)} x=${it.transform[4].toFixed(1)} w=${it.width.toFixed(1)}: "${it.str}"`);
    }
  });
}
run().catch(console.error);
