const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function inspectTmpl19() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf';
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log(`=== TMPL-19 INSPECTION: Total Pages = ${doc.numPages} ===`);

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
    console.log(`Text items count: ${items.length}`);
    items.forEach(it => {
      console.log(`[P${p}] topY=${it.topY.toFixed(1).padStart(6)} (pdfY=${it.pdfY.toFixed(1).padStart(6)}) x=${it.x.toFixed(1).padStart(6)} w=${it.w.toFixed(1).padStart(6)}: "${it.str}"`);
    });
  }

  // Also render pages to PNG for visual inspection
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1400, height: 1000 });
  const base64 = buf.toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body style="margin:0; background:#eee;">
      <div id="container"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const raw = atob("${base64}");
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8Array[i] = raw.charCodeAt(i);
        pdfjsLib.getDocument({ data: uint8Array }).promise.then(async doc => {
          window.numPages = doc.numPages;
          for (let pNum = 1; pNum <= doc.numPages; pNum++) {
            const p = await doc.getPage(pNum);
            const viewport = p.getViewport({ scale: 1.2 });
            const canvas = document.createElement('canvas');
            canvas.id = 'canvas-page-' + pNum;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            document.getElementById('container').appendChild(canvas);
            const ctx = canvas.getContext('2d');
            await p.render({ canvasContext: ctx, viewport }).promise;
          }
          window.rendered = true;
        }).catch(err => { window.error = err.message; });
      </script>
    </body>
    </html>
  `;

  await p.setContent(html);
  await p.waitForFunction('window.rendered === true || window.error', { timeout: 30000 });
  const numPages = await p.evaluate(() => window.numPages);

  for (let pNum = 1; pNum <= numPages; pNum++) {
    const el = await p.$(`#canvas-page-${pNum}`);
    const outPng = path.join(__dirname, `tmpl19_page_${pNum}.png`);
    await el.screenshot({ path: outPng });
    console.log(`Saved: ${outPng}`);
  }

  await browser.close();
}

inspectTmpl19().catch(console.error);
