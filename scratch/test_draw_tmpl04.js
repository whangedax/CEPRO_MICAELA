const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function testRender() {
  const pdfPath = path.resolve(__dirname, '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  console.log(`Page: ${width} x ${height}`);

  // Test draw institution name
  // Box under "CENTRO DE EDUCACIÓN TÉCNICO PRODUCTIVA" (y=720.5)
  // Let's place institution name at y=700 (PDFLib coordinates) or top-down:
  page.drawText('"MICAELA BASTIDAS PUYUCAWA"', {
    x: 134.2 + (327.8 - boldFont.widthOfTextAtSize('"MICAELA BASTIDAS PUYUCAWA"', 11)) / 2,
    y: 698,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0)
  });

  // Programa
  const progText = 'COMPUTACIÓN E INFORMÁTICA';
  page.drawText(progText, {
    x: 134.2 + (327.8 - boldFont.widthOfTextAtSize(progText, 11)) / 2,
    y: 462,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0)
  });

  // Modulo
  const modText = 'OFIMÁTICA';
  page.drawText(modText, {
    x: 134.2 + (327.8 - boldFont.widthOfTextAtSize(modText, 11)) / 2,
    y: 388,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0)
  });

  // DRE (underline at 340.1)
  page.drawText('LIMA METROPOLITANA', { x: 268, y: 342.5, size: 9, font });

  // UGEL (underline at 310.1)
  page.drawText('UGEL 05 SJL/EA', { x: 268, y: 312.5, size: 9, font });

  // TIPO DE GESTIÓN (underline at 280.1)
  page.drawText('PÚBLICA DE GESTIÓN DIRECTA', { x: 268, y: 282.5, size: 8.5, font });

  // CICLO (underline at 250.2)
  page.drawText('AUXILIAR TÉCNICO', { x: 268, y: 252.5, size: 9, font });

  // DURACIÓN (underline 1 at 220.2, underline 2 at 220.2)
  page.drawText('300 HORAS', { x: 200, y: 222.5, size: 8, font });
  page.drawText('12 CRÉDITOS', { x: 396, y: 222.5, size: 8, font });

  // INICIO (underline 1 at 190.2, underline 2 at 190.2)
  page.drawText('17/03/2026', { x: 200, y: 192.5, size: 8, font });
  page.drawText('24/07/2026', { x: 396, y: 192.5, size: 8, font });

  // TURNO (underline 1 at 160.2, underline 2 at 160.2)
  page.drawText('MAÑANA', { x: 200, y: 162.5, size: 8, font });
  page.drawText('A', { x: 420, y: 162.5, size: 8, font });

  // DOCENTE (underline at 130.2)
  page.drawText('PROF. ALEJANDRO QUISPE', { x: 200, y: 132.5, size: 8.5, font });

  // AÑO (underline at 95.0)
  page.drawText('2026', { x: 288, y: 97.5, size: 9, font: boldFont });

  const out = await pdfDoc.save();
  const outPath = path.resolve(__dirname, '../tmp/test_tmpl04_rendered.pdf');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  console.log('Saved test pdf:', outPath);
}

testRender().catch(err => { console.error(err); process.exit(1); });
