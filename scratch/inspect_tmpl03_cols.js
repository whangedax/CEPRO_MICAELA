const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();

  const vLines = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === pdfjs.OPS.constructPath) {
      const p = args[1][0];
      if (p) {
        const x1 = p[1], y1 = p[2], x2 = p[4], y2 = p[5];
        if (Math.abs(x1 - x2) < 0.5 && Math.abs(y1 - y2) > 20) {
          vLines.push({ x: Number(x1.toFixed(1)), y1: Number(y1.toFixed(1)), y2: Number(y2.toFixed(1)), h: Number(Math.abs(y1 - y2).toFixed(1)) });
        }
      }
    }
  }

  // Deduplicate vertical lines
  const uniqueV = [];
  vLines.sort((a, b) => a.x - b.x);
  for (const l of vLines) {
    if (!uniqueV.some(u => Math.abs(u.x - l.x) < 1.0)) {
      uniqueV.push(l);
    }
  }

  console.log('--- ALL VERTICAL LINES ACROSS PAGE ---');
  for (let i = 0; i < uniqueV.length; i++) {
    const cur = uniqueV[i];
    const next = uniqueV[i + 1];
    const diff = next ? (next.x - cur.x).toFixed(1) : '-';
    console.log(`ColLine ${i}: x=${cur.x}, yRange=[${cur.y1}, ${cur.y2}] (h=${cur.h}) -> width to next: ${diff} pt`);
  }
}

main().catch(console.error);
