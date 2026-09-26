const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log('Pages:', doc.numPages);
  const page = await doc.getPage(1);
  console.log('Page view:', page.view);

  const content = await page.getTextContent();
  console.log('Text items count:', content.items.length);
  const items = content.items.map(item => ({
    x: Number(item.transform[4].toFixed(1)),
    y: Number(item.transform[5].toFixed(1)),
    w: Number((item.width || 0).toFixed(1)),
    h: Number((item.height || 0).toFixed(1)),
    str: item.str.trim()
  })).filter(i => i.str);

  console.log('\n--- ALL TEXT ITEMS ---');
  for (const it of items) {
    console.log(`[x=${it.x}, y=${it.y}, w=${it.w}, h=${it.h}] "${it.str}"`);
  }
}

main().catch(console.error);
