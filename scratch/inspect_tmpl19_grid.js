const fs = require('fs');

async function inspectGrid() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const H = 841.8898;
  const W = 1190.5512;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    const hLines = [];
    const vLines = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjs.OPS.constructPath) {
        const pList = ops.argsArray[i][2] || ops.argsArray[i][1];
        if (pList) {
          const keys = Object.keys(pList).map(k => Number(k)).sort((a,b) => a-b);
          const vals = keys.map(k => pList[k]);
          if (vals.length === 4) {
            const [x1, y1, x2, y2] = vals;
            if (Math.abs(y1 - y2) < 0.2) {
              hLines.push({ topY: H - y1, pdfY: y1, x1: Math.min(x1, x2), x2: Math.max(x1, x2), w: Math.abs(x2 - x1) });
            } else if (Math.abs(x1 - x2) < 0.2) {
              vLines.push({ x: x1, topY1: H - Math.max(y1, y2), topY2: H - Math.min(y1, y2), pdfY1: Math.min(y1, y2), pdfY2: Math.max(y1, y2), h: Math.abs(y2 - y1) });
            }
          }
        }
      }
    }
    hLines.sort((a,b) => a.topY - b.topY);
    vLines.sort((a,b) => a.x - b.x);

    console.log(`\n=== PAGE ${p} GRID ===`);
    console.log(`Horizontal lines: ${hLines.length}`);
    const tableHLines = hLines.filter(l => l.w > 300);
    console.log(`Main horizontal dividers (w > 300): ${tableHLines.length}`);
    tableHLines.forEach((l, idx) => {
      console.log(`  H[${idx}] topY=${l.topY.toFixed(2)} (pdfY=${l.pdfY.toFixed(2)}) x=[${l.x1.toFixed(1)} .. ${l.x2.toFixed(1)}] w=${l.w.toFixed(1)}`);
    });

    console.log(`Main vertical dividers (h > 100):`);
    const tableVLines = vLines.filter(l => l.h > 100);
    tableVLines.forEach((l, idx) => {
      console.log(`  V[${idx}] x=${l.x.toFixed(2)} topY=[${l.topY1.toFixed(1)} .. ${l.topY2.toFixed(1)}] h=${l.h.toFixed(1)}`);
    });
  }
}

inspectGrid().catch(console.error);
