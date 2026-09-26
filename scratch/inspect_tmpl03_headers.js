const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();

  console.log('Total ops:', ops.fnArray.length);
  // Check transforms
  let currentTransform = [1, 0, 0, 1, 0, 0];
  const allLines = [];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === pdfjs.OPS.transform) {
      // transform: [a, b, c, d, e, f]
      // console.log('transform:', args);
    }
  }

  // Let's print the headers text and their X positions
  const textContent = await page.getTextContent();
  const headerItems = textContent.items.filter(it => it.transform[5] > 1050 && it.str.trim());
  console.log('\n--- HEADERS AT y > 1050 ---');
  headerItems.sort((a, b) => a.transform[4] - b.transform[4]);
  for (const it of headerItems) {
    console.log(`x=${it.transform[4].toFixed(1)}, y=${it.transform[5].toFixed(1)}, str="${it.str.trim()}"`);
  }
}

main().catch(console.error);
