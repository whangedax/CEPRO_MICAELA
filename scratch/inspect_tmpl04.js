const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve(__dirname, '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log('Total pages:', doc.numPages);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    console.log('Page view:', page.view);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (item.str.trim()) {
        console.log(`[x=${item.transform[4].toFixed(1)}, y=${item.transform[5].toFixed(1)}] ${item.str}`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
