const fs = require('fs');

async function inspectExactBoxes() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const H = 841.89;

  console.log('=== PAGE 1: TEXT ITEMS IN HEADER (topY < 370) ===');
  const p1 = await doc.getPage(1);
  const tc1 = await p1.getTextContent();
  const items1 = tc1.items.map(it => ({
    str: it.str.trim(),
    x: it.transform[4],
    pdfY: it.transform[5],
    topY: H - it.transform[5],
    w: it.width,
    h: it.height
  })).filter(it => it.str);
  items1.sort((a,b) => a.topY - b.topY || a.x - b.x);
  items1.forEach(it => {
    if (it.topY < 370) {
      console.log(`P1: topY=${it.topY.toFixed(1).padStart(5)} x=${it.x.toFixed(1).padStart(6)} w=${it.w.toFixed(1).padStart(5)}: "${it.str}"`);
    }
  });

  console.log('\n=== PAGE 1: VERTICAL AND HORIZONTAL DIVIDERS IN HEADER (topY < 370) ===');
  const ops1 = await p1.getOperatorList();
  for (let i = 0; i < ops1.fnArray.length; i++) {
    if (ops1.fnArray[i] === pdfjs.OPS.constructPath) {
      const pList = ops1.argsArray[i][2] || ops1.argsArray[i][1];
      if (pList) {
        const keys = Object.keys(pList).map(k => Number(k)).sort((a,b) => a-b);
        const vals = keys.map(k => pList[k]);
        if (vals.length === 4) {
          const [x1, y1, x2, y2] = vals;
          const topY1 = H - y1;
          const topY2 = H - y2;
          if (topY1 < 375 && topY2 < 375) {
            if (Math.abs(y1 - y2) < 0.2) {
              console.log(`H-Line: topY=${topY1.toFixed(1)} x=[${Math.min(x1,x2).toFixed(1)} .. ${Math.max(x1,x2).toFixed(1)}] w=${Math.abs(x2-x1).toFixed(1)}`);
            } else if (Math.abs(x1 - x2) < 0.2) {
              console.log(`V-Line: x=${x1.toFixed(1)} topY=[${Math.min(topY1,topY2).toFixed(1)} .. ${Math.max(topY1,topY2).toFixed(1)}] h=${Math.abs(topY2-topY1).toFixed(1)}`);
            }
          }
        }
      }
    }
  }

  console.log('\n=== PAGE 2: TEXT ITEMS IN MIDDLE TABLE (topY between 560 and 690) ===');
  const p2 = await doc.getPage(2);
  const tc2 = await p2.getTextContent();
  const items2 = tc2.items.map(it => ({
    str: it.str.trim(),
    x: it.transform[4],
    pdfY: it.transform[5],
    topY: H - it.transform[5],
    w: it.width,
    h: it.height
  })).filter(it => it.str);
  items2.sort((a,b) => a.topY - b.topY || a.x - b.x);
  items2.forEach(it => {
    if (it.topY > 560 && it.topY < 690) {
      console.log(`P2: topY=${it.topY.toFixed(1).padStart(5)} x=${it.x.toFixed(1).padStart(6)} w=${it.w.toFixed(1).padStart(5)}: "${it.str}"`);
    }
  });

  console.log('\n=== PAGE 2: LINES IN MIDDLE TABLE (topY between 560 and 690) ===');
  const ops2 = await p2.getOperatorList();
  for (let i = 0; i < ops2.fnArray.length; i++) {
    if (ops2.fnArray[i] === pdfjs.OPS.constructPath) {
      const pList = ops2.argsArray[i][2] || ops2.argsArray[i][1];
      if (pList) {
        const keys = Object.keys(pList).map(k => Number(k)).sort((a,b) => a-b);
        const vals = keys.map(k => pList[k]);
        if (vals.length === 4) {
          const [x1, y1, x2, y2] = vals;
          const topY1 = H - y1;
          const topY2 = H - y2;
          if (topY1 > 560 && topY1 < 690 && topY2 > 560 && topY2 < 690) {
            if (Math.abs(y1 - y2) < 0.2) {
              console.log(`H-Line: topY=${topY1.toFixed(1)} x=[${Math.min(x1,x2).toFixed(1)} .. ${Math.max(x1,x2).toFixed(1)}] w=${Math.abs(x2-x1).toFixed(1)}`);
            } else if (Math.abs(x1 - x2) < 0.2) {
              console.log(`V-Line: x=${x1.toFixed(1)} topY=[${Math.min(topY1,topY2).toFixed(1)} .. ${Math.max(topY1,topY2).toFixed(1)}] h=${Math.abs(topY2-topY1).toFixed(1)}`);
            }
          }
        }
      }
    }
  }
}

inspectExactBoxes().catch(console.error);
