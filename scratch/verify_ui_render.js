const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 1800 });

  await page.goto('http://127.0.0.1:8081/#/evaluacion', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#btn-generate-tmpl19-candidate', { timeout: 10000 });
  await page.click('#btn-generate-tmpl19-candidate');

  await page.waitForFunction(() => {
    const iframe = document.querySelector('#evaluation-tmpl19-viewer-output iframe');
    return iframe && iframe.src && iframe.src.startsWith('blob:');
  }, { timeout: 15000 });

  const pdfBase64 = await page.evaluate(async () => {
    const iframe = document.querySelector('#evaluation-tmpl19-viewer-output iframe');
    const res = await fetch(iframe.src);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  });

  const pdfBuf = Buffer.from(pdfBase64, 'base64');
  const outPdf = path.join(__dirname, 'production_tmpl19_preview.pdf');
  fs.writeFileSync(outPdf, pdfBuf);
  console.log(`Saved production PDF: ${outPdf}`);

  // Render both pages using pdf.js inside Edge
  const renderHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        body { margin: 0; background: #333; display: flex; flex-direction: column; align-items: flex-start; gap: 20px; padding: 20px; }
        canvas { background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
      </style>
    </head>
    <body>
      <div id="canvases"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const raw = atob("${pdfBase64}");
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

        async function renderAll() {
          const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
          for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.id = 'page-' + p;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            document.getElementById('canvases').appendChild(canvas);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          }
          window.rendered = true;
        }
        renderAll();
      </script>
    </body>
    </html>
  `;

  await page.setContent(renderHtml);
  await page.waitForFunction(() => window.rendered === true, { timeout: 20000 });

  // Screenshot each page canvas
  const canvas1 = await page.$('#page-1');
  const img1Path = path.join(__dirname, 'prod_tmpl19_page1.png');
  await canvas1.screenshot({ path: img1Path });
  console.log(`Saved Page 1 image: ${img1Path}`);

  const canvas2 = await page.$('#page-2');
  const img2Path = path.join(__dirname, 'prod_tmpl19_page2.png');
  await canvas2.screenshot({ path: img2Path });
  console.log(`Saved Page 2 image: ${img2Path}`);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
