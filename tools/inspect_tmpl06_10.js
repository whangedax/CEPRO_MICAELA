const fs = require('fs');

async function inspectHeaders() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const templates = [
    { name: 'TMPL-05', file: '05_ASISTENCIA_UD1.pdf' },
    { name: 'TMPL-06', file: '06_ASISTENCIA_UD2.pdf' },
    { name: 'TMPL-07', file: '07_ASISTENCIA_UD3.pdf' },
    { name: 'TMPL-08', file: '08_ASISTENCIA_UD4.pdf' },
    { name: 'TMPL-09', file: '09_ASISTENCIA_UD5.pdf' },
    { name: 'TMPL-10', file: '10_ASISTENCIA_UD6.pdf' }
  ];
  
  for (const t of templates) {
    const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/' + t.file);
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true }).promise;
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const headers = textContent.items
      .map(it => ({ str: it.str.trim(), x: Math.round(it.transform[4] * 10) / 10, y: Math.round((vp.height - it.transform[5]) * 10) / 10 }))
      .filter(it => it.y < 120 && it.str.length > 1);
    console.log(`\n=== ${t.name} ===`);
    console.log(headers);
  }
}

inspectHeaders();
