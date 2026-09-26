const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const { PdfTemplateEngine } = await import('../app/js/services/pdf-template-engine.js');
  const engine = new PdfTemplateEngine();

  const students = [
    { apellidosNombres: 'CONDORI SAGAGA, JUAN PEDRO', tipoDocumento: 'DNI', numeroDocumento: '2557768', sexo: 'H', fechaNacimiento: '1973-12-28' },
    { apellidosNombres: 'MAMANI SOSI, YESICA MARTHY', tipoDocumento: 'DNI', numeroDocumento: '70017927', sexo: 'M', fechaNacimiento: '1989-07-21' },
    { apellidosNombres: 'MAMANI MENDOZA, FANNY', tipoDocumento: 'DNI', numeroDocumento: '46466712', sexo: 'M', fechaNacimiento: '1990-07-15' },
    { apellidosNombres: 'RAMOS CONDORI, GREGORIO', tipoDocumento: 'DNI', numeroDocumento: '44547615', sexo: 'H', fechaNacimiento: '1987-09-01' },
    { apellidosNombres: 'VARGAS CHOQUE, INGRITH KARELY', tipoDocumento: 'DNI', numeroDocumento: '61400229', sexo: 'M', fechaNacimiento: '2008-07-01' },
    { apellidosNombres: 'VILCA GUTIERREZ, FORTUNATA', tipoDocumento: 'DNI', numeroDocumento: '44544568', sexo: 'M', fechaNacimiento: '1987-10-03' },
    { apellidosNombres: 'VILCA GUTIERREZ, MADELY FLOR', tipoDocumento: 'DNI', numeroDocumento: '71823811', sexo: 'M', fechaNacimiento: '2005-02-25' }
  ];

  const payload = {
    institution: {
      nombreInstitucion: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
      ugel: 'UGEL SAN ROMÁN',
      codigoModular: '455454'
    },
    program: { nombre: 'CARPINTERÍA METÁLICA' },
    group: { ciclo: 'MEDIO' },
    rows: students,
    demoMode: false
  };

  const blob = await engine.renderAdministrativeTMPL03({
    ...payload,
    studentsList: students
  });

  const pdfBuf = Buffer.from(await blob.arrayBuffer());
  const outPdf = path.join(__dirname, 'test_recalibrated_tmpl03.pdf');
  fs.writeFileSync(outPdf, pdfBuf);
  console.log('PDF saved to:', outPdf, 'bytes:', pdfBuf.length);

  // Render to image via Edge
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1700 });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body style="margin:0; background:#f0f0f0;">
      <canvas id="pdf-canvas" style="box-shadow:0 2px 8px rgba(0,0,0,0.15); margin:20px;"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const base64 = "${pdfBuf.toString('base64')}";
        const raw = atob(base64);
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8Array[i] = raw.charCodeAt(i);
        pdfjsLib.getDocument({ data: uint8Array }).promise.then(async doc => {
          const p = await doc.getPage(1);
          const viewport = p.getViewport({ scale: 1.4 });
          const canvas = document.getElementById('pdf-canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await p.render({ canvasContext: ctx, viewport }).promise;
          window.rendered = true;
        }).catch(err => {
          console.error(err);
          window.renderError = err.message;
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForFunction('window.rendered === true || window.renderError', { timeout: 30000 });
  const err = await page.evaluate(() => window.renderError);
  if (err) throw new Error('Render error: ' + err);

  const canvas = await page.$('#pdf-canvas');
  const outPng = path.join(__dirname, 'tmpl03_recalibrated_preview.png');
  await canvas.screenshot({ path: outPng });
  console.log('Preview image saved to:', outPng);

  await browser.close();
}

main().catch(console.error);
