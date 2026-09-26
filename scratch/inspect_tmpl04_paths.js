const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve(__dirname, '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();
  
  const OPS = pdfjs.OPS;
  // Let's find rect, lineTo, etc.
  console.log('--- GRAPHICS PATHS ---');
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.rectangle) {
      console.log(`RECT: x=${args[0].toFixed(1)}, y=${args[1].toFixed(1)}, w=${args[2].toFixed(1)}, h=${args[3].toFixed(1)}`);
    } else if (fn === OPS.constructPath) {
      const opsPath = args[0];
      const coords = args[1];
      console.log(`PATH: ops=${opsPath.length}, coords=${coords.length}`);
      // let's print coords
      let cIdx = 0;
      for (const pOp of opsPath) {
        if (pOp === OPS.moveTo) {
          console.log(`  moveTo(${coords[cIdx].toFixed(1)}, ${coords[cIdx+1].toFixed(1)})`);
          cIdx += 2;
        } else if (pOp === OPS.lineTo) {
          console.log(`  lineTo(${coords[cIdx].toFixed(1)}, ${coords[cIdx+1].toFixed(1)})`);
          cIdx += 2;
        } else if (pOp === OPS.rectangle) {
          console.log(`  rect(${coords[cIdx].toFixed(1)}, ${coords[cIdx+1].toFixed(1)}, ${coords[cIdx+2].toFixed(1)}, ${coords[cIdx+3].toFixed(1)})`);
          cIdx += 4;
        }
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
