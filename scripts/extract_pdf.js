const fs = require('fs');
const PDFParser = require("pdf2json");

let pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
  const page = pdfData.formImage.Pages[0];
  const texts = page.Texts.map(t => {
    return {
      x: t.x,
      y: t.y,
      w: t.w,
      text: decodeURIComponent(t.R[0].T)
    };
  });
  fs.writeFileSync('scratch/pdf_texts.json', JSON.stringify(texts, null, 2));
  console.log("Extracted " + texts.length + " texts.");
});

pdfParser.loadPDF("sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf");
