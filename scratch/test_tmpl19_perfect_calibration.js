const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function renderCalibratedAct() {
  const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const pdfDoc = await PDFDocument.load(buf);
  const [page1, page2] = pdfDoc.getPages();
  const { height: H1, width: W1 } = page1.getSize();
  const { height: H2, width: W2 } = page2.getSize();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const color = rgb(0, 0, 0);

  const fitText = (text, font, box, pageHeight, opts = {}) => {
    let size = opts.maxFontSize || 8.0;
    const minSize = opts.minFontSize || 4.5;
    while (size > minSize && font.widthOfTextAtSize(text, size) > box.w - 4) {
      size -= 0.25;
    }
    const textWidth = font.widthOfTextAtSize(text, size);
    let x = box.x + 2;
    if (opts.align === 'center') {
      x = box.x + (box.w - textWidth) / 2;
    }
    const y = pageHeight - (box.y + box.h / 2 + size / 3);
    return { text, x, y, size };
  };

  // Cabecera Izquierda (Página 1)
  const drawFit = (page, text, font, box, pageH, opts) => {
    if (!text) return;
    const f = fitText(text, font, box, pageH, opts);
    page.drawText(f.text, { x: f.x, y: f.y, size: f.size, font, color });
  };

  drawFit(page1, 'CETPRO PILOTO REGIONAL', boldFont, { x: 170.0, y: 141.3, w: 340.0, h: 23.6 }, H1, { maxFontSize: 8.5 });
  drawFit(page1, 'PÚBLICA DE GESTIÓN DIRECTA', regularFont, { x: 170.0, y: 164.9, w: 160.0, h: 23.6 }, H1, { maxFontSize: 7.5 });
  drawFit(page1, '1359872', boldFont, { x: 425.0, y: 164.9, w: 88.0, h: 23.6 }, H1, { maxFontSize: 8.0, align: 'center' });
  drawFit(page1, 'R.D. N° 0456-2018-ED', regularFont, { x: 170.0, y: 188.5, w: 105.0, h: 23.7 }, H1, { maxFontSize: 7.0 });
  drawFit(page1, 'R.D. N° 0122-2022-DRELM', regularFont, { x: 425.0, y: 188.5, w: 88.0, h: 23.7 }, H1, { maxFontSize: 7.0 });

  drawFit(page1, 'DRE LIMA METROPOLITANA', regularFont, { x: 125.0, y: 235.8, w: 95.0, h: 23.6 }, H1, { maxFontSize: 7.0 });
  drawFit(page1, 'UGEL 03', regularFont, { x: 284.0, y: 235.8, w: 225.0, h: 23.6 }, H1, { maxFontSize: 7.5 });
  drawFit(page1, 'LIMA', regularFont, { x: 125.0, y: 259.4, w: 150.0, h: 23.6 }, H1, { maxFontSize: 7.5 });
  drawFit(page1, 'LIMA', regularFont, { x: 340.0, y: 259.4, w: 170.0, h: 23.6 }, H1, { maxFontSize: 7.5 });
  drawFit(page1, 'BREÑA', regularFont, { x: 125.0, y: 283.0, w: 150.0, h: 23.6 }, H1, { maxFontSize: 7.5 });
  drawFit(page1, 'BREÑA', regularFont, { x: 340.0, y: 283.0, w: 170.0, h: 23.6 }, H1, { maxFontSize: 7.5 });
  drawFit(page1, 'JR. TALLERES 450, BREÑA', regularFont, { x: 125.0, y: 306.6, w: 385.0, h: 23.7 }, H1, { maxFontSize: 7.5 });

  // Cabecera Derecha (Página 1)
  drawFit(page1, 'COMPUTACIÓN E INFORMÁTICA', boldFont, { x: 968.0, y: 164.9, w: 200.0, h: 23.6 }, H1, { maxFontSize: 8.0 });
  drawFit(page1, 'TÉCNICO', regularFont, { x: 1072.0, y: 188.5, w: 98.0, h: 23.7 }, H1, { maxFontSize: 7.5, align: 'center' });
  drawFit(page1, 'OFIMÁTICA AVANZADA', boldFont, { x: 968.0, y: 235.8, w: 200.0, h: 23.6 }, H1, { maxFontSize: 8.0 });
  drawFit(page1, 'R.D. N° 0899-2023-ED', regularFont, { x: 1072.0, y: 259.4, w: 98.0, h: 23.6 }, H1, { maxFontSize: 6.5, align: 'center' });
  drawFit(page1, 'A', regularFont, { x: 1072.0, y: 283.0, w: 98.0, h: 23.6 }, H1, { maxFontSize: 7.5, align: 'center' });
  drawFit(page1, 'NOCHE', regularFont, { x: 1072.0, y: 306.6, w: 98.0, h: 23.7 }, H1, { maxFontSize: 7.5, align: 'center' });
  drawFit(page1, '15 CRÉD. / 240 HRS', boldFont, { x: 1072.0, y: 330.3, w: 98.0, h: 20.7 }, H1, { maxFontSize: 6.5, align: 'center' });

  // UDs (4 UDs reales en este módulo)
  const units = [
    { nombre: 'GESTIÓN DOCUMENTAL', creditos: 4, horas: 64, capacidad: 'Gestionar documentación administrativa según normas institucionales.' },
    { nombre: 'HOJAS DE CÁLCULO', creditos: 4, horas: 64, capacidad: 'Desarrollar soluciones avanzadas mediante funciones y macros.' },
    { nombre: 'PRESENTACIONES DE IMPACTO', creditos: 3, horas: 48, capacidad: 'Elaborar presentaciones dinámicas interactivas.' },
    { nombre: 'BASES DE DATOS OFIMÁTICAS', creditos: 4, horas: 64, capacidad: 'Diseñar y mantener bases de datos relacionales locales.' }
  ];

  const udColsP1 = [
    { x: 513.77, w: 32.8 }, { x: 546.57, w: 32.8 }, { x: 579.37, w: 32.8 },
    { x: 612.18, w: 32.8 }, { x: 644.98, w: 32.8 }, { x: 677.78, w: 32.8 },
    { x: 710.59, w: 32.8 }, { x: 743.39, w: 27.75 }, { x: 771.14, w: 27.75 }, { x: 798.88, w: 21.26 }
  ];
  const udColsP2 = [
    { x: 518.14, w: 31.06 }, { x: 549.20, w: 31.05 }, { x: 580.25, w: 31.06 },
    { x: 611.31, w: 31.05 }, { x: 642.36, w: 31.05 }, { x: 673.41, w: 31.06 },
    { x: 704.47, w: 31.05 }, { x: 735.52, w: 26.27 }, { x: 761.79, w: 26.26 }, { x: 788.05, w: 20.13 }
  ];

  for (let u = 0; u < units.length; u++) {
    const unit = units[u];
    // P1 header rotated
    page1.drawText(unit.nombre.slice(0, 42), {
      x: udColsP1[u].x + udColsP1[u].w / 2 + 2.5,
      y: H1 - 325,
      size: 6.0,
      font: regularFont,
      color,
      rotate: degrees(90)
    });
    // P1 credit/hour
    const chStr = `${unit.creditos} / ${unit.horas}`;
    const twP1 = boldFont.widthOfTextAtSize(chStr, 5.5);
    page1.drawText(chStr, {
      x: udColsP1[u].x + (udColsP1[u].w - twP1) / 2,
      y: H1 - 364,
      size: 5.5,
      font: boldFont,
      color
    });

    // P2 header rotated
    page2.drawText(unit.nombre.slice(0, 32), {
      x: udColsP2[u].x + udColsP2[u].w / 2 + 2.5,
      y: H2 - 175,
      size: 6.0,
      font: regularFont,
      color,
      rotate: degrees(90)
    });
    // P2 credit
    const cStr = String(unit.creditos);
    const twP2 = boldFont.widthOfTextAtSize(cStr, 6.5);
    page2.drawText(cStr, {
      x: udColsP2[u].x + (udColsP2[u].w - twP2) / 2,
      y: H2 - 213,
      size: 6.5,
      font: boldFont,
      color
    });
  }

  // Estudiantes 1..40
  const rawNames = [
    'AGUIRRE MONICA', 'ALVAREZ MARIA', 'BARRERA CARMEN', 'BENAVIDES JOSE', 'CAMPOS LORENA',
    'CASTILLO JUAN', 'DELGADO CARLOS', 'DIAZ HUGO', 'ESPINOZA LUCIA', 'ESTRADA ANA',
    'FIGUEROA PEDRO', 'FLORES CESAR', 'GOMEZ ROSA', 'GUTIERREZ ELSA', 'HERRERA JORGE',
    'HIDALGO GABRIEL', 'IGLESIAS SOFIA', 'INFANTES ROSARIO', 'JARAMILLO CARLA', 'JIMENEZ CESAR',
    'LEON RICARDO', 'LOPEZ DANIELA', 'MENDOZA SARA', 'MORALES VICTOR', 'NAVARRO OSCAR',
    'NUNEZ GLORIA', 'ORTIZ MANUEL', 'OVIEDO PILAR', 'PALACIOS TITO', 'PEREZ WALTER',
    'QUISPE ELENA', 'RAMIREZ ROBERTO', 'SANCHEZ PATRICIA', 'TORRES MIGUEL', 'URRUTIA CARLOS',
    'VALDEZ JULIA', 'WONG CARLOS', 'XIMENEZ PAOLA', 'YANEZ MARCOS', 'ZAPATA LUIS'
  ];

  const students = rawNames.map((n, i) => ({
    doc: `7000${String(i + 1).padStart(4, '0')}`,
    name: `${n} ${i + 1}`,
    // Only 4 notes for the 4 units!
    grades: [16, 15, 17, 14],
    efsrt: 16,
    logro: 16,
    apr: 4,
    des: 0
  }));

  // Página 1 (filas 0..19)
  for (let i = 0; i < 20; i++) {
    const s = students[i];
    const rowY = 371.84 + i * 20.79;
    const textY = H1 - (rowY + 13.5);

    // DNI
    const twDoc = regularFont.widthOfTextAtSize(s.doc, 7.5);
    page1.drawText(s.doc, { x: 43.52 + (77.68 - twDoc) / 2, y: textY, size: 7.5, font: regularFont, color });

    // Nombre
    page1.drawText(s.name, { x: 125.0, y: textY, size: 7.5, font: regularFont, color });

    // Notas de las 4 UDs reales (columnas 5..10 quedan 100% vacías)
    for (let u = 0; u < units.length; u++) {
      const gStr = String(s.grades[u]).padStart(2, '0');
      const tw = regularFont.widthOfTextAtSize(gStr, 7.5);
      page1.drawText(gStr, { x: udColsP1[u].x + (udColsP1[u].w - tw) / 2, y: textY, size: 7.5, font: regularFont, color });
    }

    // EFSRT
    const efsrtStr = String(s.efsrt).padStart(2, '0');
    const twE = regularFont.widthOfTextAtSize(efsrtStr, 7.5);
    page1.drawText(efsrtStr, { x: 820.14 + (35.61 - twE) / 2, y: textY, size: 7.5, font: regularFont, color });

    // Logro
    const logroStr = String(s.logro).padStart(2, '0');
    const twL = boldFont.widthOfTextAtSize(logroStr, 7.5);
    page1.drawText(logroStr, { x: 855.75 + (37.46 - twL) / 2, y: textY, size: 7.5, font: boldFont, color });

    // Aprobadas (4)
    const aprStr = String(s.apr).padStart(2, '0');
    const twA = regularFont.widthOfTextAtSize(aprStr, 7.5);
    page1.drawText(aprStr, { x: 893.21 + (37.46 - twA) / 2, y: textY, size: 7.5, font: regularFont, color });

    // Desaprobadas (0)
    const desStr = String(s.des).padStart(2, '0');
    const twD = regularFont.widthOfTextAtSize(desStr, 7.5);
    page1.drawText(desStr, { x: 930.67 + (32.8 - twD) / 2, y: textY, size: 7.5, font: regularFont, color });
  }

  // Página 2 (filas 20..39)
  for (let i = 20; i < 40; i++) {
    const idx = i - 20;
    const s = students[i];
    const rowY = 220.06 + idx * 17.57;
    const textY = H2 - (rowY + 11.5);

    // DNI
    const twDoc = regularFont.widthOfTextAtSize(s.doc, 7.0);
    page2.drawText(s.doc, { x: 72.98 + (73.54 - twDoc) / 2, y: textY, size: 7.0, font: regularFont, color });

    // Nombre
    page2.drawText(s.name, { x: 150.0, y: textY, size: 7.0, font: regularFont, color });

    // Notas de las 4 UDs reales
    for (let u = 0; u < units.length; u++) {
      const gStr = String(s.grades[u]).padStart(2, '0');
      const tw = regularFont.widthOfTextAtSize(gStr, 7.0);
      page2.drawText(gStr, { x: udColsP2[u].x + (udColsP2[u].w - tw) / 2, y: textY, size: 7.0, font: regularFont, color });
    }

    // EFSRT
    const efsrtStr = String(s.efsrt).padStart(2, '0');
    const twE = regularFont.widthOfTextAtSize(efsrtStr, 7.0);
    page2.drawText(efsrtStr, { x: 808.18 + (33.71 - twE) / 2, y: textY, size: 7.0, font: regularFont, color });

    // Logro
    const logroStr = String(s.logro).padStart(2, '0');
    const twL = boldFont.widthOfTextAtSize(logroStr, 7.0);
    page2.drawText(logroStr, { x: 841.89 + (35.46 - twL) / 2, y: textY, size: 7.0, font: boldFont, color });

    // Aprobadas (4)
    const aprStr = String(s.apr).padStart(2, '0');
    const twA = regularFont.widthOfTextAtSize(aprStr, 7.0);
    page2.drawText(aprStr, { x: 877.35 + (35.46 - twA) / 2, y: textY, size: 7.0, font: regularFont, color });

    // Desaprobadas (0)
    const desStr = String(s.des).padStart(2, '0');
    const twD = regularFont.widthOfTextAtSize(desStr, 7.0);
    page2.drawText(desStr, { x: 912.81 + (31.06 - twD) / 2, y: textY, size: 7.0, font: regularFont, color });
  }

  // Página 2: Tabla intermedia UNIDAD DIDÁCTICA y CAPACIDAD (empieza en topY = 592.7)
  for (let k = 0; k < units.length; k++) {
    const u = units[k];
    const topY = 592.7 + k * 13.82;
    const textY = H2 - (topY + 9.5);
    page2.drawText(u.nombre, { x: 54.0, y: textY, size: 6.0, font: boldFont, color });
    page2.drawText(u.capacidad, { x: 438.0, y: textY, size: 6.0, font: regularFont, color });
  }

  // Página 2: Cuadro estadístico (SOLO para las 4 UDs reales)
  const statCols = [
    { x: 518.14, w: 31.06 }, { x: 549.20, w: 31.05 }, { x: 580.25, w: 31.06 },
    { x: 611.31, w: 31.05 }, { x: 642.36, w: 31.05 }, { x: 673.41, w: 31.06 },
    { x: 704.47, w: 31.05 }, { x: 735.52, w: 26.27 }, { x: 761.79, w: 26.26 }, { x: 788.05, w: 20.13 },
    { x: 808.18, w: 33.71 }, { x: 841.89, w: 35.46 }, { x: 877.35, w: 35.46 }, { x: 912.81, w: 31.06 }
  ];

  for (let u = 0; u < units.length; u++) {
    const col = statCols[u];
    const aprStr = '40';
    const desStr = '00';
    const retStr = '00';

    const twA = boldFont.widthOfTextAtSize(aprStr, 7.0);
    page2.drawText(aprStr, { x: col.x + (col.w - twA) / 2, y: H2 - (697.51 + 10.0), size: 7.0, font: boldFont, color });

    const twD = regularFont.widthOfTextAtSize(desStr, 7.0);
    page2.drawText(desStr, { x: col.x + (col.w - twD) / 2, y: H2 - (711.88 + 10.0), size: 7.0, font: regularFont, color });

    const twR = regularFont.widthOfTextAtSize(retStr, 7.0);
    page2.drawText(retStr, { x: col.x + (col.w - twR) / 2, y: H2 - (726.77 + 10.0), size: 7.0, font: regularFont, color });
  }

  // EFSRT, Logro, Aprobadas, Desaprobadas en estadística
  // EFSRT (col 10)
  const colEFSRT = statCols[10];
  const twAe = boldFont.widthOfTextAtSize('40', 7.0);
  page2.drawText('40', { x: colEFSRT.x + (colEFSRT.w - twAe) / 2, y: H2 - (697.51 + 10.0), size: 7.0, font: boldFont, color });
  page2.drawText('00', { x: colEFSRT.x + (colEFSRT.w - twAe) / 2, y: H2 - (711.88 + 10.0), size: 7.0, font: regularFont, color });
  page2.drawText('00', { x: colEFSRT.x + (colEFSRT.w - twAe) / 2, y: H2 - (726.77 + 10.0), size: 7.0, font: regularFont, color });

  // Logro (col 11)
  const colLogro = statCols[11];
  page2.drawText('40', { x: colLogro.x + (colLogro.w - twAe) / 2, y: H2 - (697.51 + 10.0), size: 7.0, font: boldFont, color });
  page2.drawText('00', { x: colLogro.x + (colLogro.w - twAe) / 2, y: H2 - (711.88 + 10.0), size: 7.0, font: regularFont, color });
  page2.drawText('00', { x: colLogro.x + (colLogro.w - twAe) / 2, y: H2 - (726.77 + 10.0), size: 7.0, font: regularFont, color });

  const bytes = await pdfDoc.save();
  const outPdf = path.join(__dirname, 'calibrated_tmpl19_preview.pdf');
  fs.writeFileSync(outPdf, bytes);
  console.log(`Saved: ${outPdf}`);

  // Screenshot to PNG for visual verification
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });

  const base64 = Buffer.from(bytes).toString('base64');
  const html = `
    <!DOCTYPE html>
    <html>
    <head><script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head>
    <body style="margin:0; background:#eee;">
      <div id="container"></div>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const raw = atob("${base64}");
        const uint8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8Array[i] = raw.charCodeAt(i);
        pdfjsLib.getDocument({ data: uint8Array }).promise.then(async doc => {
          for (let pNum = 1; pNum <= doc.numPages; pNum++) {
            const p = await doc.getPage(pNum);
            const viewport = p.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.id = 'canvas-p-' + pNum;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            document.getElementById('container').appendChild(canvas);
            const ctx = canvas.getContext('2d');
            await p.render({ canvasContext: ctx, viewport }).promise;
          }
          window.rendered = true;
        });
      </script>
    </body>
    </html>
  `;
  await page.setContent(html);
  await page.waitForFunction('window.rendered === true', { timeout: 30000 });

  const elP1 = await page.$('#canvas-p-1');
  const png1 = path.join(__dirname, 'tmpl19_calibrated_page1.png');
  await elP1.screenshot({ path: png1 });
  console.log(`Saved P1 PNG: ${png1}`);

  const elP2 = await page.$('#canvas-p-2');
  const png2 = path.join(__dirname, 'tmpl19_calibrated_page2.png');
  await elP2.screenshot({ path: png2 });
  console.log(`Saved P2 PNG: ${png2}`);

  await browser.close();
}

renderCalibratedAct().catch(console.error);
