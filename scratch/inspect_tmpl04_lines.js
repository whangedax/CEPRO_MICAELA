const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve(__dirname, '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();
  
  console.log('Page Height = 841.89, Page Width = 595.28');
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === pdfjs.OPS.constructPath) {
      const p = args[1][0];
      if (p) {
        console.log(`LINE/PATH: (${p[1].toFixed(1)}, ${p[2].toFixed(1)}) -> (${p[4].toFixed(1)}, ${p[5].toFixed(1)})`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
