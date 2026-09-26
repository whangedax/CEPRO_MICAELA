const fs = require('fs');

async function checkPaths() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page2 = await doc.getPage(2);
  const opList = await page2.getOperatorList();
  
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === pdfjs.OPS.constructPath) {
      const data = opList.argsArray[i][1];
      console.log(`Path [${i}]: length=${data.length}, sample=${JSON.stringify(Array.from(data).slice(0, 8))}`);
    }
  }
}
checkPaths();
