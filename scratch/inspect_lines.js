const fs = require('fs');

async function checkLines() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();
  
  // Find lines or rectangles
  console.log('Total ops:', ops.fnArray.length);
  // Look for constructPath or rectangle
  let rects = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    // 19 is constructPath
    if (fn === pdfjs.OPS.constructPath) {
      const opsList = args[0];
      const data = args[1];
      for (let j = 0; j < data.length; j += 2) {
        const x = data[j];
        const y = data[j+1];
        if (x >= 770 && x <= 835 && y > 1000) {
          rects.push({ x: Math.round(x), y: Math.round(y) });
        }
      }
    }
  }
  console.log('Path coordinates near date header:', JSON.stringify(rects.slice(0, 30)));
}

checkLines().catch(console.error);
