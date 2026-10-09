const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  
  const pdfBytes = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/05_ASISTENCIA_UD1.pdf');
  const base64 = pdfBytes.toString('base64');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="canvas"></canvas>
      <script type="module">
        import * as pdfjsLib from 'http://127.0.0.1:8080/app/operational/pdfjs/pdf.mjs';
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'http://127.0.0.1:8080/app/operational/pdfjs/pdf.worker.mjs';
        const raw = atob("${base64}");
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        const p = await doc.getPage(1);
        const viewport = p.getViewport({ scale: 1.5 });
        const canvas = document.getElementById('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await p.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        window.rendered = true;
      </script>
    </body>
    </html>
  `;
  await page.setContent(html);
  await page.waitForFunction(() => window.rendered === true, { timeout: 15000 });
  await page.screenshot({ path: 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\1c4aceed-e368-46ee-9dfd-d2dbefdec7b1\\RAW_TEMPLATE_05.png', clip: { x: 0, y: 0, width: 800, height: 300 } });
  console.log('✓ Captura de plantilla original guardada');
  await browser.close();
})();
