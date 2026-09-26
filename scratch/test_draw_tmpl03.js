const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function getVerticallyCenteredBaseline(font, fontSize, box, pageHeight) {
  const ascent = (font.embedder.font.Ascender / 1000) * fontSize;
  const descent = (font.embedder.font.Descender / 1000) * fontSize;
  const pdfLibBottomY = pageHeight - box.y - box.h;
  return pdfLibBottomY + (box.h / 2) - ((ascent + descent) / 2);
}

async function testRender() {
  const pdfPath = path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  console.log(`Page size: ${width} x ${height}`);

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cols = [
    { key: 'institution.ugel', x: 41.0, w: 33.0, align: 'center', size: 6.5 },
    { key: 'institution.codigoModular', x: 74.0, w: 42.0, align: 'center', size: 6.5 },
    { key: 'institution.nombre', x: 116.0, w: 78.0, align: 'left', size: 6.0 },
    { key: 'program.nombre', x: 194.0, w: 68.0, align: 'left', size: 6.0 },
    { key: 'group.ciclo', x: 262.0, w: 50.0, align: 'center', size: 6.5 },
    { key: 'institution.resolucionPrograma', x: 312.0, w: 76.0, align: 'center', size: 6.0 },
    { key: 'module.nombre', x: 388.0, w: 72.0, align: 'left', size: 6.0 },
    { key: 'student.tipoDocumento', x: 460.0, w: 65.0, align: 'center', size: 6.5 },
    { key: 'student.numeroDocumento', x: 525.0, w: 48.0, align: 'center', size: 7.0 },
    { key: 'student.apellidoPaterno', x: 573.0, w: 52.0, align: 'left', size: 6.5 },
    { key: 'student.apellidoMaterno', x: 625.0, w: 55.0, align: 'left', size: 6.5 },
    { key: 'student.nombres', x: 680.0, w: 62.0, align: 'left', size: 6.5 },
    { key: 'student.sexo', x: 742.0, w: 32.0, align: 'center', size: 7.0 },
    { key: 'student.fechaNacimiento', x: 774.0, w: 52.0, align: 'center', size: 6.5 }
  ];

  const sampleStudent = {
    'institution.ugel': 'UGEL 05',
    'institution.codigoModular': '0645804',
    'institution.nombre': 'MICAELA BASTIDAS',
    'program.nombre': 'COMPUTACIÓN E INFORMÁTICA',
    'group.ciclo': 'AUXILIAR TÉCNICO',
    'institution.resolucionPrograma': 'R.D. 0123-2024-ED',
    'module.nombre': 'OFIMÁTICA',
    'student.tipoDocumento': 'DNI',
    'student.numeroDocumento': '72345678',
    'student.apellidoPaterno': 'QUISPE',
    'student.apellidoMaterno': 'MAMANI',
    'student.nombres': 'JUAN CARLOS',
    'student.sexo': 'M',
    'student.fechaNacimiento': '15/04/1998'
  };

  const startY = 153.0;
  const rowH = 35.1;

  for (let r = 0; r < 20; r++) {
    const boxY = startY + r * rowH;
    for (const c of cols) {
      const text = sampleStudent[c.key] || '';
      const font = regularFont;
      const size = c.size;
      const textWidth = font.widthOfTextAtSize(text, size);
      let startX = c.x + 2;
      if (c.align === 'center') startX = c.x + (c.w - textWidth) / 2;
      else if (c.align === 'right') startX = c.x + c.w - textWidth - 2;

      const baseline = getVerticallyCenteredBaseline(font, size, { x: c.x, y: boxY, h: rowH, w: c.w }, height);
      page.drawText(text, {
        x: startX,
        y: baseline,
        size,
        font,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Draw footer legends
  page.drawText('Página 1 de 1 · Registros 1–20', {
    x: 40,
    y: 25,
    size: 7.5,
    font: boldFont,
    color: rgb(0.32, 0.12, 0.12)
  });
  page.drawText('TOTAL GENERAL DEL GRUPO: 20 · REGISTROS EN ESTA PÁGINA: 20', {
    x: 220,
    y: 25,
    size: 7.0,
    font: regularFont,
    color: rgb(0.32, 0.12, 0.12)
  });
  page.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
    x: 40,
    y: 12,
    size: 7.0,
    font: boldFont,
    color: rgb(0.48, 0.18, 0.18)
  });

  const out = await pdfDoc.save();
  const outPath = path.resolve('tmp/test_tmpl03_verified.pdf');
  fs.writeFileSync(outPath, out);
  console.log('Successfully rendered and verified test TMPL-03 to:', outPath);
}

testRender().catch(console.error);
