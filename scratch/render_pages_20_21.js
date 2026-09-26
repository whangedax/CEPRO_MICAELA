const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function renderPdfPages(pdfPath, prefix) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  const pdfBuf = fs.readFileSync(pdfPath);
  const base64 = pdfBuf.toString('base64');

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
            const viewport = p.getViewport({ scale: 1.5 });
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

  await page.setContent(html);
  await page.waitForFunction('window.rendered === true || window.error', { timeout: 30000 });
  const numPages = await page.evaluate(() => window.numPages);

  for (let pNum = 1; pNum <= numPages; pNum++) {
    const el = await page.$(`#canvas-page-${pNum}`);
    const outPng = path.join(__dirname, `${prefix}_page_${pNum}.png`);
    await el.screenshot({ path: outPng });
    console.log(`Saved: ${outPng}`);
  }

  await browser.close();
}

async function main() {
  await renderPdfPages('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/20_CERTIFICADO_MODULAR.pdf', 'tmpl20');
  await renderPdfPages('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/21_TITULO_AUXILIAR_TECNICO.pdf', 'tmpl21');
}

main().catch(console.error);
