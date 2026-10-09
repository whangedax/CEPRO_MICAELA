const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { OfflineCore } = require('./offline-core.cjs');
const { renderPDF } = require('./offline-pdf.cjs');

const root = path.resolve(__dirname, '..');
const core = new OfflineCore('private-data');
const director = core.users().find(u => u.role === 'DIRECTOR');

const ARTIFACT_DIR = 'C:/Users/whangedax/.gemini/antigravity/brain/1c4aceed-e368-46ee-9dfd-d2dbefdec7b1';

async function run() {
  console.log('--- Generando PDFs con nueva cabecera unificada ---');
  
  // 1. Peluquería M2 UD1 (matching user screenshot)
  const peluqueriaDoc = core.document(director, {
    groupId: 'GRP-BD-001-M2',
    templateId: 'TMPL-06',
    unit: 'UD1',
    demoFill: true
  });
  const peluqueriaPdf = await renderPDF(root, peluqueriaDoc, director);
  const peluqueriaPdfPath = path.join(ARTIFACT_DIR, 'DEMO_ASISTENCIA_PELUQUERIA_M2_CORREGIDA.pdf');
  fs.writeFileSync(peluqueriaPdfPath, peluqueriaPdf);
  console.log('Generado:', peluqueriaPdfPath);

  // 2. Mecánica de Motos M2 UD1
  const motosDoc = core.document(director, {
    groupId: 'GRP-BD-005-M2',
    templateId: 'TMPL-06',
    unit: 'UD1',
    demoFill: true
  });
  const motosPdf = await renderPDF(root, motosDoc, director);
  const motosPdfPath = path.join(ARTIFACT_DIR, 'DEMO_ASISTENCIA_MOTOS_M2_CORREGIDA.pdf');
  fs.writeFileSync(motosPdfPath, motosPdf);
  console.log('Generado:', motosPdfPath);

  // 3. Evaluación Peluquería M2 UD1 (TMPL-11)
  const evalDoc = core.document(director, {
    groupId: 'GRP-BD-001-M2',
    templateId: 'TMPL-11',
    unit: 'UD1',
    demoFill: true
  });
  const evalPdf = await renderPDF(root, evalDoc, director);
  const evalPdfPath = path.join(ARTIFACT_DIR, 'DEMO_EVALUACION_PELUQUERIA_M2_CORREGIDA.pdf');
  fs.writeFileSync(evalPdfPath, evalPdf);
  console.log('Generado:', evalPdfPath);

  // 4. Capturar con Puppeteer un screenshot de zoom de la cabecera en el navegador
  console.log('--- Capturando screenshot de zoom de la cabecera corregida ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

  // Convertir PDF a data URI o cargarlo en página HTML con pdfjs
  const pdfBase64 = peluqueriaPdf.toString('base64');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="http://127.0.0.1:8080/app/vendor/pdfjs/pdf.min.js"></script>
    </head>
    <body style="margin:0; background:#f0f2f5;">
      <canvas id="pdf-canvas"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'http://127.0.0.1:8080/app/vendor/pdfjs/pdf.worker.min.js';
        const pdfData = atob('${pdfBase64}');
        const uint8Array = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) uint8Array[i] = pdfData.charCodeAt(i);
        pdfjsLib.getDocument({ data: uint8Array }).promise.then(pdf => {
          return pdf.getPage(1).then(page => {
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.getElementById('pdf-canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            return page.render({ canvasContext: ctx, viewport }).promise.then(() => {
              window.__RENDERED__ = true;
            });
          });
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RENDERED__ === true, { timeout: 15000 });

  // Tomar captura recortada del área superior de la cabecera y tabla informativa
  const zoomPngPath = path.join(ARTIFACT_DIR, 'EVIDENCIA_CABECERA_UNIFICADA_CORREGIDA.png');
  await page.screenshot({
    path: zoomPngPath,
    clip: {
      x: 300,
      y: 0,
      width: 1700,
      height: 380
    }
  });
  console.log('Screenshot guardado en:', zoomPngPath);

  await browser.close();
  console.log('--- Proceso completado exitosamente ---');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
