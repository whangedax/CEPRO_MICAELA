const fs = require('fs');

async function checkOps() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page2 = await doc.getPage(2);
  const opList = await page2.getOperatorList();
  
  const opNames = Object.fromEntries(Object.entries(pdfjs.OPS).map(([k, v]) => [v, k]));
  const counts = {};
  for (let i = 0; i < opList.fnArray.length; i++) {
    const name = opNames[opList.fnArray[i]] || opList.fnArray[i];
    counts[name] = (counts[name] || 0) + 1;
  }
  console.log(counts);
}
checkOps();
