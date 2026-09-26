const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: EDGE,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });

  const pdfData = fs.readFileSync(path.resolve('tmp/test_tmpl04_rendered.pdf')).toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="http://127.0.0.1:8081/vendor/pdfjs/pdf.min.js"></script>
      <style>body { margin: 0; background: #555; display: flex; justify-content: center; } canvas { box-shadow: 0 0 10px rgba(0,0,0,0.5); margin: 20px; }</style>
    </head>
    <body>
      <canvas id="pdf-canvas"></canvas>
      <script>
        const raw = atob("${pdfData}");
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        pdfjsLib.getDocument({ data: uint8 }).promise.then(pdf => {
          return pdf.getPage(1).then(page => {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.getElementById('pdf-canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            return page.render({ canvasContext: ctx, viewport }).promise;
          });
        }).then(() => {
          window.RENDERED = true;
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForFunction('window.RENDERED === true', { timeout: 10000 });
  const canvas = await page.$('#pdf-canvas');
  const pngPath = path.resolve('tmp/test_tmpl04_rendered.png');
  await canvas.screenshot({ path: pngPath });
  console.log('Saved rendered preview to:', pngPath);
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
