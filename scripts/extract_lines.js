const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const fs = require("fs");

async function extractLines() {
  const data = new Uint8Array(fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf'));
  const loadingTask = pdfjsLib.getDocument({data: data});
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const operatorList = await page.getOperatorList();

  const lines = [];
  let currentTransform = [1, 0, 0, 1, 0, 0];
  let currentPoint = {x: 0, y: 0};
  
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];

    if (fn === pdfjsLib.OPS.transform) {
      currentTransform = args;
    } else if (fn === pdfjsLib.OPS.moveTo) {
      currentPoint = {x: args[0], y: args[1]};
    } else if (fn === pdfjsLib.OPS.lineTo) {
      lines.push({
        x1: currentPoint.x,
        y1: currentPoint.y,
        x2: args[0],
        y2: args[1]
      });
      currentPoint = {x: args[0], y: args[1]};
    } else if (fn === pdfjsLib.OPS.constructPath) {
      const ops = args[0];
      const pts = args[1];
      let pIdx = 0;
      for (let j=0; j<ops.length; j++) {
        if (ops[j] === pdfjsLib.OPS.moveTo) {
          currentPoint = {x: pts[pIdx], y: pts[pIdx+1]};
          pIdx += 2;
        } else if (ops[j] === pdfjsLib.OPS.lineTo) {
          lines.push({
            x1: currentPoint.x,
            y1: currentPoint.y,
            x2: pts[pIdx],
            y2: pts[pIdx+1]
          });
          currentPoint = {x: pts[pIdx], y: pts[pIdx+1]};
          pIdx += 2;
        } else if (ops[j] === pdfjsLib.OPS.rectangle) {
          const rx = pts[pIdx];
          const ry = pts[pIdx+1];
          const rw = pts[pIdx+2];
          const rh = pts[pIdx+3];
          lines.push({type: 'rect', x: rx, y: ry, w: rw, h: rh});
          pIdx += 4;
        }
      }
    }
  }

  // Filter vertical lines
  const vlines = lines.filter(l => Math.abs(l.x1 - l.x2) < 0.1).map(l => l.x1);
  const hlines = lines.filter(l => Math.abs(l.y1 - l.y2) < 0.1).map(l => l.y1);
  
  // Transform y coordinates since pdf is bottom-up, page height is 841.890
  const hlinesConverted = hlines.map(y => 841.890 - y);
  
  fs.writeFileSync('scratch/pdf_geometry.json', JSON.stringify({lines, vlines: [...new Set(vlines.map(v => Math.round(v*10)/10))].sort((a,b)=>a-b), hlines: [...new Set(hlinesConverted.map(v => Math.round(v*10)/10))].sort((a,b)=>a-b)}, null, 2));
  console.log("Extracted geometry.");
}

extractLines().catch(console.error);
