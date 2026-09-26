const fs = require('fs');

async function run() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(2);
  const tc = await page.getTextContent();
  const H = 841.89;
  tc.items.forEach(it => {
    const topY = H - it.transform[5];
    if (topY > 670 && topY < 765) {
      console.log(`topY=${topY.toFixed(1)} (pdfY=${it.transform[5].toFixed(1)}) x=${it.transform[4].toFixed(1)} w=${it.width.toFixed(1)}: "${it.str}"`);
    }
  });

  const ops = await page.getOperatorList();
  console.log('\n--- Lines in 680-760 ---');
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjs.OPS.constructPath) {
      const pList = ops.argsArray[i][2] || ops.argsArray[i][1];
      if (pList) {
        const keys = Object.keys(pList).map(k => Number(k)).sort((a,b) => a-b);
        const vals = keys.map(k => pList[k]);
        if (vals.length === 4) {
          const [x1, y1, x2, y2] = vals;
          const topY1 = H - y1;
          const topY2 = H - y2;
          if (topY1 > 670 && topY1 < 765 && topY2 > 670 && topY2 < 765) {
            console.log(`Line: (${x1.toFixed(1)}, ${topY1.toFixed(1)}) -> (${x2.toFixed(1)}, ${topY2.toFixed(1)})`);
          }
        }
      }
    }
  }
}
run().catch(console.error);
