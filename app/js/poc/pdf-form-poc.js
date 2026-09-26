export async function generatePOC() {
  const { PDFDocument, rgb } = PDFLib;

  // 1. Cargar PDF Canónico
  const url = '../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize(); // 595.304 x 841.890

  // Coordenadas en formato origin-top-left (pt) desde TMPL01_FIELD_BOXES.json
  const boxes = {
    cetpro: { x: 386.82, y: 101.31, w: 166.27, h: 14.95 },
    programa: { x: 179.61, y: 176.02, w: 373.48, h: 14.93 },
    row01_nombre: { x: 113.59, y: 244.48, w: 180.13, h: 14.94 },
    row01_sexo: { x: 293.72, y: 244.48, w: 32.73, h: 14.94 },
    row01_fechaNacimiento: { x: 326.45, y: 244.48, w: 60.37, h: 14.94 }
  };

  // Convertir a origin-bottom-left para pdf-lib
  const toPdfRect = (box) => ({
    x: box.x,
    y: height - box.y - box.h,
    width: box.w,
    height: box.h
  });

  // 2. Crear Campos Transparentes
  const cetproField = form.createTextField('header.cetpro');
  cetproField.addToPage(page, { ...toPdfRect(boxes.cetpro), borderWidth: 0 });

  const progField = form.createTextField('header.programa');
  progField.addToPage(page, { ...toPdfRect(boxes.programa), borderWidth: 0 });

  const nombreField = form.createTextField('row01.nombre');
  nombreField.addToPage(page, { ...toPdfRect(boxes.row01_nombre), borderWidth: 0 });

  const sexoField = form.createTextField('row01.sexo');
  sexoField.addToPage(page, { ...toPdfRect(boxes.row01_sexo), borderWidth: 0 });

  const fechaField = form.createTextField('row01.fechaNacimiento');
  fechaField.addToPage(page, { ...toPdfRect(boxes.row01_fechaNacimiento), borderWidth: 0 });

  // 3. Inyectar Datos Fixture
  cetproField.setText('CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"');
  progField.setText('COMPUTACIÓN E INFORMÁTICA');
  nombreField.setText('ESTUDIANTE DE PRUEBA UNO');
  sexoField.setText('M');
  fechaField.setText('15/03/2005');

  // Configurar apariencia de los campos
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  
  const formFields = [cetproField, progField, nombreField, sexoField, fechaField];
  for (const field of formFields) {
    field.defaultUpdateAppearances(font);
    field.enableReadOnly(); // Para evitar que se editen luego del flatten (opcional)
  }

  // 4. Flatten Form
  form.flatten();

  // 5. Generar PDF Bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
