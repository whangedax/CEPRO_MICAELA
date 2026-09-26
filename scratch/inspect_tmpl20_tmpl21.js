const fs = require('fs');

async function inspect(pdfPath, label) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log(`\n======================================================`);
  console.log(`INSPECTION: ${label} (${pdfPath})`);
  console.log(`Total pages: ${doc.numPages}`);
  console.log(`======================================================`);

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const H = page.view[3];
    const W = page.view[2];
    console.log(`\n--- PAGE ${p} ---`);
    console.log(`Dimensions: width=${W} pt, height=${H} pt (${(W/72*25.4).toFixed(1)} mm x ${(H/72*25.4).toFixed(1)} mm)`);
    console.log(`Orientation: ${W > H ? 'Landscape' : 'Portrait'}, Rotation: ${page.rotate}°`);

    const tc = await page.getTextContent();
    const items = tc.items.map(it => ({
      str: it.str.trim(),
      x: it.transform[4],
      pdfY: it.transform[5],
      topY: H - it.transform[5],
      w: it.width,
      h: it.height
    })).filter(it => it.str);

    items.sort((a, b) => a.topY - b.topY || a.x - b.x);
    console.log(`Text items found: ${items.length}`);
    items.forEach(it => {
      console.log(`[P${p}] topY=${it.topY.toFixed(1).padStart(6)} (pdfY=${it.pdfY.toFixed(1).padStart(6)}) x=${it.x.toFixed(1).padStart(6)} w=${it.w.toFixed(1).padStart(6)}: "${it.str}"`);
    });
  }
}

async function main() {
  await inspect('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/20_CERTIFICADO_MODULAR.pdf', 'TMPL-20 CERTIFICADO MODULAR');
  await inspect('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/21_TITULO_AUXILIAR_TECNICO.pdf', 'TMPL-21 TITULO AUXILIAR TECNICO');
}

main().catch(console.error);
