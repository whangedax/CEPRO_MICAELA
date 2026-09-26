const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function getVerticallyCenteredBaseline(font, fontSize, box, pageHeight) {
  const ascent = (font.embedder.font.Ascender / 1000) * fontSize;
  const descent = (font.embedder.font.Descender / 1000) * fontSize;
  const pdfLibBottomY = pageHeight - box.y - box.h;
  return pdfLibBottomY + (box.h / 2) - ((ascent + descent) / 2);
}

async function verify() {
  const pageHeight = 841.89;
  const pdfBytes = fs.readFileSync(path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf'));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const testBoxes = [
    { key: 'institution.name', x: 134.2, y: 124.0, w: 327.8, h: 22.0, font: boldFont, size: 10.5, text: '"MICAELA BASTIDAS PUYUCAWA"', align: 'center' },
    { key: 'program.name', x: 134.2, y: 352.1, w: 327.8, h: 45.1, font: boldFont, size: 10, text: 'COMPUTACIÓN E INFORMÁTICA', align: 'center' },
    { key: 'module.name', x: 134.2, y: 426.2, w: 327.8, h: 45.1, font: boldFont, size: 10, text: 'OFIMÁTICA', align: 'center' },
    { key: 'institution.dre', x: 265.5, y: 486.0, w: 195.5, h: 16.0, font, size: 8.5, text: 'LIMA METROPOLITANA', align: 'left' },
    { key: 'institution.ugel', x: 265.5, y: 516.0, w: 195.5, h: 16.0, font, size: 8.5, text: 'UGEL 05 SJL/EA', align: 'left' },
    { key: 'institution.tipoGestion', x: 265.5, y: 546.0, w: 195.5, h: 16.0, font, size: 8.5, text: 'PÚBLICA DE GESTIÓN DIRECTA', align: 'left' },
    { key: 'group.ciclo', x: 265.5, y: 576.0, w: 195.5, h: 16.0, font, size: 8.5, text: 'AUXILIAR TÉCNICO', align: 'left' },
    { key: 'curriculum.hours', x: 198.3, y: 606.0, w: 67.2, h: 16.0, font, size: 8.0, text: '300 HORAS', align: 'center' },
    { key: 'curriculum.credits', x: 393.8, y: 606.0, w: 67.2, h: 16.0, font, size: 8.0, text: '12 CRÉDITOS', align: 'center' },
    { key: 'period.fechaInicio', x: 198.3, y: 636.0, w: 67.2, h: 16.0, font, size: 8.0, text: '17/03/2026', align: 'center' },
    { key: 'period.fechaTermino', x: 393.8, y: 636.0, w: 67.2, h: 16.0, font, size: 8.0, text: '24/07/2026', align: 'center' },
    { key: 'group.turno', x: 198.3, y: 666.0, w: 67.2, h: 16.0, font, size: 8.0, text: 'MAÑANA', align: 'center' },
    { key: 'group.seccion', x: 393.8, y: 666.0, w: 67.2, h: 16.0, font, size: 8.0, text: 'ÚNICA', align: 'center' },
    { key: 'teacher.name', x: 198.3, y: 696.0, w: 262.7, h: 16.0, font, size: 8.5, text: 'PROF. ALEJANDRO QUISPE HUAMÁN', align: 'left' },
    { key: 'period.year', x: 265.5, y: 731.0, w: 64.1, h: 16.0, font: boldFont, size: 9.0, text: '2026', align: 'center' }
  ];

  for (const b of testBoxes) {
    const baseline = getVerticallyCenteredBaseline(b.font, b.size, b, pageHeight);
    const textWidth = b.font.widthOfTextAtSize(b.text, b.size);
    let startX = b.x;
    if (b.align === 'center') startX = b.x + (b.w - textWidth) / 2;
    else if (b.align === 'right') startX = b.x + b.w - textWidth;
    else startX = b.x + 4;

    console.log(`[${b.key}] baseline=${baseline.toFixed(1)}, startX=${startX.toFixed(1)}, width=${textWidth.toFixed(1)}`);
    page.drawText(b.text, {
      x: startX,
      y: baseline,
      size: b.size,
      font: b.font,
      color: rgb(0, 0, 0)
    });
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(path.resolve('tmp/test_tmpl04_verified.pdf'), out);
  console.log('Saved tmp/test_tmpl04_verified.pdf successfully');
}

verify().catch(console.error);
