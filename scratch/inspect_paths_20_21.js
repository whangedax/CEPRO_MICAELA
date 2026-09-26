const fs = require('fs');

async function inspectPaths(pdfPath, label) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log(`\n======================================================`);
  console.log(`VECTOR PATHS INSPECTION: ${label}`);
  console.log(`======================================================`);

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const H = page.view[3];
    const W = page.view[2];
    const ops = await page.getOperatorList();
    console.log(`\n--- PAGE ${p} (Total Ops: ${ops.fnArray.length}) ---`);

    const hLines = [];
    const vLines = [];
    const rects = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === pdfjs.OPS.constructPath) {
        const pList = args[2] || args[1];
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
          } else if (vals.length === 8 || vals.length === 10) {
            rects.push(vals);
          }
        }
      }
    }

    hLines.sort((a, b) => a.topY - b.topY || a.x1 - b.x1);
    vLines.sort((a, b) => a.x - b.x || a.topY1 - b.topY1);

    console.log(`Horizontal lines found: ${hLines.length}`);
    hLines.forEach((l, idx) => {
      console.log(`  [H${idx.toString().padStart(2)}] topY=${l.topY.toFixed(1).padStart(6)} (pdfY=${l.pdfY.toFixed(1).padStart(6)}) x=[${l.x1.toFixed(1).padStart(6)} .. ${l.x2.toFixed(1).padStart(6)}] w=${l.w.toFixed(1)}`);
    });

    console.log(`Vertical lines found: ${vLines.length}`);
    vLines.forEach((l, idx) => {
      console.log(`  [V${idx.toString().padStart(2)}] x=${l.x.toFixed(1).padStart(6)} topY=[${l.topY1.toFixed(1).padStart(6)} .. ${l.topY2.toFixed(1).padStart(6)}] h=${l.h.toFixed(1)}`);
    });
  }
}

async function main() {
  await inspectPaths('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/20_CERTIFICADO_MODULAR.pdf', 'TMPL-20 CERTIFICADO MODULAR');
  await inspectPaths('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/21_TITULO_AUXILIAR_TECNICO.pdf', 'TMPL-21 TITULO AUXILIAR TECNICO');
}

main().catch(console.error);
