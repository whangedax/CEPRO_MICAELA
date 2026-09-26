const fs = require('fs');

async function analyzeBboxes(path, name) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync(path);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1.0 });
  const ops = await page.getOperatorList();
  
  const verticalLines = [];
  const horizontalLines = [];
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] === pdfjs.OPS.constructPath) {
      const bbox = ops.argsArray[i][2];
      if (bbox && bbox.length >= 4) {
        const [x0, y0, x1, y1] = bbox;
        const w = Math.abs(x1 - x0);
        const h = Math.abs(y1 - y0);
        if (w < 0.5 && h > 50) {
          verticalLines.push({ x: Math.round(x0 * 100) / 100, y0, y1, h });
        } else if (h < 0.5 && w > 100) {
          horizontalLines.push({ y: Math.round((vp.height - y0) * 100) / 100, x0, x1, w });
        }
      }
    }
  }
  
  const uniqueX = [...new Set(verticalLines.map(l => l.x))].sort((a, b) => a - b);
  const diffs = [];
  for (let i = 1; i < uniqueX.length; i++) {
    diffs.push(Math.round((uniqueX[i] - uniqueX[i-1]) * 100) / 100);
  }
  
  const uniqueY = [...new Set(horizontalLines.map(l => l.y))].sort((a, b) => a - b);
  const yDiffs = [];
  for (let i = 1; i < uniqueY.length; i++) {
    yDiffs.push(Math.round((uniqueY[i] - uniqueY[i-1]) * 100) / 100);
  }
  
  console.log(`\n=================== ${name} ===================`);
  console.log('Vertical lines count:', uniqueX.length);
  console.log('X coords:', uniqueX);
  console.log('Column widths (diffs):', diffs);
  console.log('Grid top Y:', uniqueY[0], 'Grid bottom Y:', uniqueY[uniqueY.length - 1]);
  console.log('Row height (common diff):', yDiffs.slice(0, 10));
}

(async () => {
  await analyzeBboxes('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/05_ASISTENCIA_UD1.pdf', 'TMPL-05');
  await analyzeBboxes('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/06_ASISTENCIA_UD2.pdf', 'TMPL-06');
  await analyzeBboxes('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/07_ASISTENCIA_UD3.pdf', 'TMPL-07');
  await analyzeBboxes('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/08_ASISTENCIA_UD4.pdf', 'TMPL-08');
  await analyzeBboxes('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/09_ASISTENCIA_UD5.pdf', 'TMPL-09');
  await analyzeBboxes('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/10_ASISTENCIA_UD6.pdf', 'TMPL-10');
})();
