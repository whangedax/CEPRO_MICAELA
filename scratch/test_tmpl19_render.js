const fs = require('fs');
const path = require('path');

async function testRender() {
  const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');
  const buf = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const pdfDoc = await PDFDocument.load(buf);
  const pages = pdfDoc.getPages();
  console.log(`Loaded canonical PDF. Num pages: ${pages.length}`);

  const page1 = pages[0];
  const page2 = pages[1];
  const { width: W1, height: H1 } = page1.getSize();
  const { width: W2, height: H2 } = page2.getSize();
  console.log(`Page 1: ${W1} x ${H1}`);
  console.log(`Page 2: ${W2} x ${H2}`);

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Test drawing headers on Page 1
  page1.drawText('CETPRO PILOTO REGIONAL', { x: 55, y: H1 - 157, size: 9, font: boldFont, color: rgb(0,0,0) });
  page1.drawText('COMPUTACIÓN E INFORMÁTICA', { x: 1012, y: H1 - 180, size: 8, font: boldFont, color: rgb(0,0,0) });
  page1.drawText('OFIMÁTICA AVANZADA', { x: 1012, y: H1 - 251, size: 8, font: boldFont, color: rgb(0,0,0) });

  // Test drawing UD headers (rotated)
  const udColsP1 = [
    { x: 513.77, w: 32.8 }, { x: 546.57, w: 32.8 }, { x: 579.37, w: 32.8 },
    { x: 612.18, w: 32.8 }, { x: 644.98, w: 32.8 }, { x: 677.78, w: 32.8 },
    { x: 710.59, w: 32.8 }, { x: 743.39, w: 27.75 }, { x: 771.14, w: 27.75 }, { x: 798.88, w: 21.26 }
  ];

  udColsP1.forEach((col, idx) => {
    // Draw rotated text bottom-to-top
    page1.drawText(`UD ${idx + 1}: Gest. Doc.`, {
      x: col.x + col.w / 2 + 3,
      y: H1 - 325,
      size: 6.5,
      font: regularFont,
      color: rgb(0,0,0),
      rotate: degrees(90)
    });
    // Draw credit/hour
    page1.drawText('4 / 64', {
      x: col.x + (col.w - 20) / 2,
      y: H1 - 365,
      size: 6,
      font: boldFont,
      color: rgb(0,0,0)
    });
  });

  // Test rows on Page 1 (first 20 students)
  for (let i = 0; i < 20; i++) {
    const rowY = 371.84 + i * 20.79;
    const textY = H1 - (rowY + 14.5);
    page1.drawText(`700000${String(i+1).padStart(2,'0')}`, { x: 45, y: textY, size: 7.5, font: regularFont });
    page1.drawText(`ESTUDIANTE EJEMPLO PAGINA UNO ${i + 1}`, { x: 125, y: textY, size: 7.5, font: regularFont });
    // draw UD notes
    udColsP1.forEach(col => {
      page1.drawText('16', { x: col.x + (col.w - 10) / 2, y: textY, size: 7.5, font: regularFont });
    });
    // EFSRT
    page1.drawText('17', { x: 820.14 + (35.61 - 10) / 2, y: textY, size: 7.5, font: regularFont });
    // Logro
    page1.drawText('16', { x: 855.75 + (37.46 - 10) / 2, y: textY, size: 7.5, font: boldFont });
    // Aprobadas
    page1.drawText('10', { x: 893.21 + (37.46 - 10) / 2, y: textY, size: 7.5, font: regularFont });
    // Desaprobadas
    page1.drawText('00', { x: 930.67 + (32.8 - 10) / 2, y: textY, size: 7.5, font: regularFont });
  }

  // Test rows on Page 2 (students 21..40)
  const udColsP2 = [
    { x: 518.14, w: 31.06 }, { x: 549.20, w: 31.05 }, { x: 580.25, w: 31.06 },
    { x: 611.31, w: 31.05 }, { x: 642.36, w: 31.05 }, { x: 673.41, w: 31.06 },
    { x: 704.47, w: 31.05 }, { x: 735.52, w: 26.27 }, { x: 761.79, w: 26.26 }, { x: 788.05, w: 20.13 }
  ];

  udColsP2.forEach((col, idx) => {
    page2.drawText(`UD ${idx + 1}: Gest. Doc.`, {
      x: col.x + col.w / 2 + 3,
      y: H2 - 175,
      size: 6.5,
      font: regularFont,
      color: rgb(0,0,0),
      rotate: degrees(90)
    });
    page2.drawText('4', {
      x: col.x + (col.w - 6) / 2,
      y: H2 - 213,
      size: 6.5,
      font: boldFont,
      color: rgb(0,0,0)
    });
  });

  for (let i = 20; i < 40; i++) {
    const idx = i - 20;
    const rowY = 220.06 + idx * 17.57;
    const textY = H2 - (rowY + 12.5);
    page2.drawText(`700000${String(i+1).padStart(2,'0')}`, { x: 75, y: textY, size: 7, font: regularFont });
    page2.drawText(`ESTUDIANTE EJEMPLO PAGINA DOS ${i + 1}`, { x: 150, y: textY, size: 7, font: regularFont });
    udColsP2.forEach(col => {
      page2.drawText('15', { x: col.x + (col.w - 10) / 2, y: textY, size: 7, font: regularFont });
    });
    page2.drawText('16', { x: 808.18 + (33.71 - 10) / 2, y: textY, size: 7, font: regularFont });
    page2.drawText('15', { x: 841.89 + (35.46 - 10) / 2, y: textY, size: 7, font: boldFont });
    page2.drawText('10', { x: 877.35 + (35.46 - 10) / 2, y: textY, size: 7, font: regularFont });
    page2.drawText('00', { x: 912.81 + (31.06 - 10) / 2, y: textY, size: 7, font: regularFont });
  }

  // Stats table on Page 2
  const statCols = [
    { x: 518.14, w: 31.06 }, { x: 549.20, w: 31.05 }, { x: 580.25, w: 31.06 },
    { x: 611.31, w: 31.05 }, { x: 642.36, w: 31.05 }, { x: 673.41, w: 31.06 },
    { x: 704.47, w: 31.05 }, { x: 735.52, w: 26.27 }, { x: 761.79, w: 26.26 }, { x: 788.05, w: 20.13 },
    { x: 808.18, w: 33.71 }, { x: 841.89, w: 35.46 }, { x: 877.35, w: 35.46 }, { x: 912.81, w: 31.06 }
  ];

  statCols.forEach(col => {
    page2.drawText('40', { x: col.x + (col.w - 12) / 2, y: H2 - (697.51 + 10.5), size: 7.5, font: boldFont });
    page2.drawText('00', { x: col.x + (col.w - 12) / 2, y: H2 - (711.88 + 10.5), size: 7.5, font: regularFont });
    page2.drawText('00', { x: col.x + (col.w - 12) / 2, y: H2 - (726.77 + 10.5), size: 7.5, font: regularFont });
  });

  const bytes = await pdfDoc.save();
  const outPath = path.join(__dirname, 'test_tmpl19_out.pdf');
  fs.writeFileSync(outPath, bytes);
  console.log(`Saved output PDF to ${outPath}. Size: ${bytes.length} bytes.`);
}

testRender().catch(console.error);
