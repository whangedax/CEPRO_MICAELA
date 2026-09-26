import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
  function getVerticallyCenteredBaseline(y, h, fontSize, font) {
    const ascender = (font.embedder.font.Ascender / 1000) * fontSize;
    const descender = (font.embedder.font.Descender / 1000) * fontSize;
    const textHeight = ascender - descender;
    return y + (h - textHeight) / 2 - descender;
  }
  function fitTextToBox(text, font, boxW, maxFontSize, minFontSize, paddingX) {
    const availableWidth = boxW - (2 * paddingX);
    let fontSize = maxFontSize;
    let textWidth = font.widthOfTextAtSize(text, fontSize);
    while (textWidth > availableWidth && fontSize > minFontSize) {
      fontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(text, fontSize);
    }
    return { fontSize, textWidth, availableWidth };
  }

async function generate() {
  const pdfBytes = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const fieldsMap = JSON.parse(fs.readFileSync('app/data/TMPL01_PDF_FIELDS.json', 'utf8'));

  const data = {
    "header.cetpro": "MICAELA BASTIDAS PUYUCAWA",
    "header.programa": "COMPUTACIÓN E INFORMÁTICA",
    "row01.nombre": "ESTUDIANTE DE PRUEBA UNO",
    "row01.sexo": "M",
    "row01.fechaNacimiento": "15/03/2005"
  };

  const autofitLog = [];

  for (const [key, value] of Object.entries(data)) {
    const box = fieldsMap[key];
    if (!box) continue;

    const { fontSize, textWidth, availableWidth } = fitTextToBox(value, font, box.w, box.maxFontSize, box.minFontSize, box.paddingX);
    
    // Calcular el margen libre
    const freeMarginTotal = availableWidth - textWidth;
    const freeMarginLeft = freeMarginTotal / 2;
    const freeMarginRight = freeMarginTotal / 2;
    
    autofitLog.push({
      campo: key,
      boxWidth: box.w,
      paddingLeft: box.paddingX,
      paddingRight: box.paddingX,
      availableWidth: availableWidth,
      finalFontSize: fontSize,
      finalTextWidth: textWidth,
      freeMarginLeft: freeMarginLeft.toFixed(2),
      freeMarginRight: freeMarginRight.toFixed(2)
    });

    const xAlign = box.x + box.paddingX + (availableWidth - textWidth) / 2;
    const yAlign = getVerticallyCenteredBaseline(box.y, box.h, fontSize, font);

    page.drawText(value, {
      x: xAlign,
      y: yAlign,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0)
    });
  }

  const outBytes = await pdfDoc.save();
  fs.writeFileSync('TMPL01_POC_RESULTADO_V3.pdf', outBytes);
  
  console.log("PDF GENERADO EXITOSAMENTE.");
  console.table(autofitLog);
}

generate().catch(console.error);
