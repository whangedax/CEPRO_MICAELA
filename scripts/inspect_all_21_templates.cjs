const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');
const { OfflineCore } = require('./offline-core.cjs');
const { renderPDF } = require('./offline-pdf.cjs');
const { createPdfFixture } = require('../tests/helpers/pdf-fixture.cjs');

async function main() {
  const root = path.resolve('.');
  const outDir = path.join(root, 'tmp/audit_21');
  fs.mkdirSync(outDir, { recursive: true });

  const core = new OfflineCore('private-data');
  const user = core.users().find(u => u.role === 'DIRECTOR') || core.users()[0];
  const group = core.records('groups').find(g => g.id === 'GRP-BD-002-M2') || core.records('groups')[0];
  const enrollments = core.records('enrollments');
  const sampleEnrollment = enrollments.find(e => e.groupId === group.id) || enrollments[0];

  console.log('Using User:', user.name, 'Group:', group.id, 'Enrollment:', sampleEnrollment?.id);

  // Fallback fixture if needed
  let fixture = null;

  const generated = [];

  for (let n = 1; n <= 21; n++) {
    const tid = 'TMPL-' + String(n).padStart(2, '0');
    console.log(`Generating ${tid}...`);
    try {
      let doc;
      let pdfBytes;
      try {
        const docParams = {
          templateId: tid,
          groupId: group.id,
          unit: 'UD1',
          demoFill: false
        };
        if ([2, 20, 21].includes(n) && sampleEnrollment) {
          docParams.enrollmentId = sampleEnrollment.id;
        }
        doc = core.document(user, docParams);
        pdfBytes = await renderPDF(root, doc, user);
      } catch (errDb) {
        console.warn(`Fallback to fixture for ${tid}: ${errDb.message}`);
        if (!fixture) fixture = createPdfFixture(outDir);
        const fDocParams = {
          templateId: tid,
          groupId: fixture.group.id,
          unit: 'UD1',
          ...([2, 20, 21].includes(n) ? { enrollmentId: fixture.enrollment.id } : {})
        };
        doc = fixture.c.document(fixture.director, fDocParams);
        pdfBytes = await renderPDF(root, doc, fixture.director);
      }

      const pdfFile = path.join(outDir, `${tid}.pdf`);
      fs.writeFileSync(pdfFile, pdfBytes);
      generated.push({ templateId: tid, pdfFile });
      console.log(`✓ ${tid} PDF saved (${pdfBytes.length} bytes)`);
    } catch (e) {
      console.error(`✗ Error on ${tid}:`, e.message);
    }
  }

  core.close();
  if (fixture) fixture.c.close();

  console.log(`Total generated PDFs: ${generated.length}/21`);

  // Now render each PDF page to PNG using puppeteer and pdfjs-dist
  const pdfJsPath = path.join(root, 'node_modules/pdfjs-dist/build/pdf.min.mjs');
  const pdfWorkerPath = path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');

  let currentPdfBuffer = null;
  const server = http.createServer((req, res) => {
    if (req.url === '/pdf.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      fs.createReadStream(pdfJsPath).pipe(res);
    } else if (req.url === '/pdf.worker.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      fs.createReadStream(pdfWorkerPath).pipe(res);
    } else if (req.url === '/current.pdf') {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end(currentPdfBuffer);
    } else if (req.url.startsWith('/view/')) {
      const pageNum = req.url.split('/')[2] || '1';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style> body { margin: 0; background: #fff; overflow: hidden; } canvas { display: block; } </style>
</head>
<body>
  <canvas id="pdf-canvas"></canvas>
  <script type="module">
    import * as pdfjsLib from '/pdf.js';
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

    const loadingTask = pdfjsLib.getDocument({ url: '/current.pdf' });
    loadingTask.promise.then(pdf => {
      window.totalPages = pdf.numPages;
      return pdf.getPage(${pageNum});
    }).then(page => {
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.getElementById('pdf-canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      return page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }).then(() => {
      window.pdfRenderComplete = true;
    }).catch(err => {
      console.error(err);
      window.pdfRenderError = err.message;
    });
  </script>
</body>
</html>`);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(r => server.listen(9877, '127.0.0.1', r));

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 2500, height: 1800 });

  for (const item of generated) {
    currentPdfBuffer = fs.readFileSync(item.pdfFile);
    await page.goto('http://127.0.0.1:9877/view/1');
    await page.waitForFunction('window.pdfRenderComplete === true', { timeout: 15000 });
    const totalPages = await page.evaluate(() => window.totalPages);

    const canvasEl = await page.$('#pdf-canvas');
    const page1Png = path.join(outDir, `${item.templateId}-1.png`);
    await canvasEl.screenshot({ path: page1Png });
    console.log(`Rendered ${item.templateId} Page 1 -> ${page1Png}`);

    if (totalPages > 1) {
      for (let p = 2; p <= totalPages; p++) {
        await page.goto(`http://127.0.0.1:9877/view/${p}`);
        await page.waitForFunction('window.pdfRenderComplete === true', { timeout: 15000 });
        const cEl = await page.$('#pdf-canvas');
        const pPng = path.join(outDir, `${item.templateId}-${p}.png`);
        await cEl.screenshot({ path: pPng });
        console.log(`Rendered ${item.templateId} Page ${p} -> ${pPng}`);
      }
    }
  }

  await browser.close();
  server.close();
  console.log('✓ All 21 templates rendered to PNG successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
