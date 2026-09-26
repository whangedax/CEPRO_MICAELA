export async function _generatePOC_V4(fixtureData) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;

  // 1. Cargar PDF Canónico
  const url = '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf';
  const existingPdfBytes = await fetch(url).then(res => {
    if (!res.ok) throw new Error("No se encontró 01_NOMINA_DE_MATRICULA.pdf.");
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize(); // 595.304 x 841.890

  // 2. Cargar fuente
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 3. Cargar manifiesto de campos
  const fieldsRes = await fetch('../app/data/TMPL01_PDF_FIELDS.json');
  const fieldsConfig = await fieldsRes.json();

  // 3.5. Calcular bloque de resumen dinámicamente desde el fixture
  let hombres = 0, mujeres = 0;
  let gratuitos = 0, pagantes = 0, becarios = 0;
  
  for (let i = 1; i <= 30; i++) {
    const nn = String(i).padStart(2, '0');
    const sexo = fixtureData[`row${nn}.sexo`];
    if (sexo === 'M') hombres++;
    if (sexo === 'F') mujeres++;

    const condicion = fixtureData[`row${nn}.condicion`];
    if (condicion === 'G') gratuitos++;
    if (condicion === 'P') pagantes++;
    if (condicion === 'B') becarios++;
  }
  
  const totalSexo = hombres + mujeres;
  if (totalSexo > 0) {
    fixtureData['summary.hombres'] = String(hombres);
    fixtureData['summary.mujeres'] = String(mujeres);
    fixtureData['summary.totalSexo'] = String(totalSexo);
  }

  const totalCondicion = gratuitos + pagantes + becarios;
  if (totalCondicion > 0) {
    fixtureData['summary.gratuitos'] = String(gratuitos);
    fixtureData['summary.pagantes'] = String(pagantes);
    fixtureData['summary.becarios'] = String(becarios);
    fixtureData['summary.totalCondicion'] = String(totalCondicion);
  }

  // Helper: Centrado vertical exacto usando métricas reales
  function getVerticallyCenteredBaseline(font, fontSize, box, pageHeight) {
    const ascent = (font.embedder.font.Ascender / 1000) * fontSize;
    const descent = (font.embedder.font.Descender / 1000) * fontSize;
    const pdfLibBottomY = pageHeight - box.y - box.h;
    
    // Baseline = offset(Y) inferior de la caja + (alto de la caja / 2) - centro tipográfico real
    return pdfLibBottomY + (box.h / 2) - ((ascent + descent) / 2);
  }

  // Función de autofit y renderizado
  function fitTextToBox(text, font, box, options) {
    let currentSize = options.maxFontSize;
    const minSize = options.minFontSize;
    const padding = options.paddingX || 0;
    
    // Padding A CADA LADO
    const availableWidth = box.w - (2 * padding);

    // Reducir fuente hasta que quepa
    while (currentSize >= minSize) {
      const textWidth = font.widthOfTextAtSize(text, currentSize);
      if (textWidth <= availableWidth) {
        break;
      }
      currentSize -= 0.1;
    }

    // Verificar si falló el fit
    const finalWidth = font.widthOfTextAtSize(text, currentSize);
    if (finalWidth > availableWidth) {
      const err = new Error(`El texto "${text}" no cabe en la caja ${box.w}pt con minFontSize ${minSize}. Ancho disponible: ${availableWidth}pt, Ancho texto: ${finalWidth}pt`);
      err.name = 'EXPECTED_REJECTION';
      throw err;
    }

    // Calcular alineación horizontal
    let startX = box.x + padding; // Align left por defecto
    if (options.align === 'center') {
      startX = box.x + (box.w / 2) - (finalWidth / 2);
    } else if (options.align === 'right') {
      startX = box.x + box.w - padding - finalWidth;
    }

    let actualLeftMargin, actualRightMargin;
    if (options.align === 'center') {
      actualLeftMargin = startX - box.x;
      actualRightMargin = (box.x + box.w) - (startX + finalWidth);
    } else if (options.align === 'right') {
      actualLeftMargin = startX - box.x;
      actualRightMargin = padding;
    } else { // left
      actualLeftMargin = padding;
      actualRightMargin = (box.x + box.w) - (startX + finalWidth);
    }

    // Calcular alineación vertical usando el nuevo helper
    const baselineY = getVerticallyCenteredBaseline(font, currentSize, box, height);

    return {
      text: text,
      x: startX,
      y: baselineY,
      size: currentSize,
      finalWidth: finalWidth,
      actualLeftMargin: actualLeftMargin,
      actualRightMargin: actualRightMargin,
      font: font,
      color: rgb(0, 0, 0)
    };
  }

  const metrics = [];

  // 5. Dibujar cada campo
  for (const key of Object.keys(fixtureData)) {
    const text = fixtureData[key];
    const box = fieldsConfig[key];
    
    if (box) {
      const drawArgs = fitTextToBox(text, font, box, {
        maxFontSize: box.maxFontSize,
        minFontSize: box.minFontSize,
        paddingX: box.paddingX,
        align: box.align
      });
      
      metrics.push({
        field: key,
        text: drawArgs.text,
        x: drawArgs.x,
        y: drawArgs.y,
        boxX: box.x,
        boxY: box.y,
        boxWidth: box.w,
        boxHeight: box.h,
        fontName: font.name,
        finalFontSize: drawArgs.size,
        measuredTextWidth: drawArgs.finalWidth,
        paddingLeft: box.paddingX,
        paddingRight: box.paddingX,
        actualLeftMargin: drawArgs.actualLeftMargin,
        actualRightMargin: drawArgs.actualRightMargin
      });
      
      page.drawText(drawArgs.text, {
        x: drawArgs.x,
        y: drawArgs.y,
        size: drawArgs.size,
        font: drawArgs.font,
        color: drawArgs.color
      });
    }
  }

  // 6. Generar PDF V4
  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, metrics, finalFixture: fixtureData };
}

export async function generatePOC_V4_Normal() {
  const normalFixture = {
    "header.cetpro": 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
    "header.programa": "COMPUTACIÓN E INFORMÁTICA",
    "row01.nombre": "ESTUDIANTE DE PRUEBA UNO",
    "row01.sexo": "M",
    "row01.fechaNacimiento": "15/03/2005"
  };
  return await _generatePOC_V4(normalFixture);
}

export async function generatePOC_V4_Stress() {
  const stressFixture = {
    "header.cetpro": 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
    "header.programa": "COMPUTACIÓN E INFORMÁTICA",
    "row01.nombre": "APELLIDO PATERNO LARGO APELLIDO MATERNO LARGO, NOMBRES DE PRUEBA",
    "row01.sexo": "M",
    "row01.fechaNacimiento": "15/03/2005"
  };
  return await _generatePOC_V4(stressFixture);
}

export async function generatePOC_Test_Institucional() {
  const instFixture = {
    "header.cetpro": 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
    "header.ugel": "SAN ROMÁN",
    "header.gestionPublica": "X",
    "header.direccion": "JR. YUNGAY N.º 302",
    "header.distrito": "SAN MIGUEL",
    "header.lugar": "JULIACA",
    "header.programa": "COMPUTACIÓN E INFORMÁTICA",
    "row01.nombre": "ESTUDIANTE DE PRUEBA UNO",
    "row01.sexo": "M",
    "row01.fechaNacimiento": "15/03/2005"
  };
  return await _generatePOC_V4(instFixture);
}

function getBaseFixture(count) {
  const fixture = {
    "header.cetpro": 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
    "header.ugel": "SAN ROMÁN",
    "header.gestionPublica": "X",
    "header.direccion": "JR. YUNGAY N.º 302",
    "header.distrito": "SAN MIGUEL",
    "header.lugar": "JULIACA",
    "header.programa": "COMPUTACIÓN E INFORMÁTICA"
  };
  for (let i = 1; i <= count; i++) {
    const nn = String(i).padStart(2, '0');
    if (i <= 30) {
      fixture[`row${nn}.nombre`] = `ESTUDIANTE DE PRUEBA ${nn}`;
      fixture[`row${nn}.sexo`] = i % 2 === 0 ? "F" : "M";
      fixture[`row${nn}.fechaNacimiento`] = `15/03/2005`;
    } else {
      fixture.capacityExceeded = true;
    }
  }
  return fixture;
}

export async function generatePOC_Test_01() {
  return await _generatePOC_V4(getBaseFixture(1));
}

export async function generatePOC_Test_10() {
  return await _generatePOC_V4(getBaseFixture(10));
}

export async function generatePOC_Test_30() {
  return await _generatePOC_V4(getBaseFixture(30));
}

export async function generatePOC_Test_31() {
  return await _generatePOC_V4(getBaseFixture(31));
}
