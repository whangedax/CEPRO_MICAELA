const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve(__dirname, '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();
  console.log('Operator count:', ops.fnArray.length);

  // Print text items with detailed font and bbox
  const textContent = await page.getTextContent();
  console.log('\n--- TEXT ITEMS ---');
  for (const item of textContent.items) {
    console.log(`[x=${item.transform[4].toFixed(1)}, y=${item.transform[5].toFixed(1)}, w=${item.width?.toFixed(1)}, h=${item.height?.toFixed(1)}] font=${item.fontName} str="${item.str}"`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
