const { PDFDocument, StandardFonts } = require('pdf-lib');
(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"';
  [8.0, 7.0, 6.5, 6.4, 6.3].forEach(s => console.log(s + ' pt:', font.widthOfTextAtSize(text, s)));
})();
