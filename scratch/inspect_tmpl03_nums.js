const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();

  // Print all numbers in column 1 (x around 25-35)
  console.log('--- NUMBERS IN COLUMN 1 ---');
  const nums = textContent.items.filter(it => it.transform[4] < 45 && it.str.trim());
  nums.sort((a, b) => b.transform[5] - a.transform[5]);
  for (const it of nums) {
    const y_pdf = it.transform[5];
    const y_top = 1190.55 - y_pdf;
    console.log(`y_pdf=${y_pdf.toFixed(1)} (y_top=${y_top.toFixed(1)}): "${it.str.trim()}"`);
  }
}

main().catch(console.error);
