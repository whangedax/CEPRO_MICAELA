const fs = require('fs');

async function test() {
  const { PdfTemplateEngine } = await import('../app/js/services/pdf-template-engine.js');
  const engine = new PdfTemplateEngine();

  // Mock payload with 25 students (2 pages)
  const students = Array.from({ length: 25 }, (_, i) => ({
    tipoDocumento: 'DNI',
    numeroDocumento: `700000${String(i + 1).padStart(2, '0')}`,
    apellidoPaterno: `PATERNO${i + 1}`,
    apellidoMaterno: `MATERNO${i + 1}`,
    nombres: `NOMBRE${i + 1}`,
    sexo: i % 2 === 0 ? 'M' : 'F',
    fechaNacimiento: '2000-05-15'
  }));

  console.log('Testing renderAdministrativeTMPL03...');
  const blob = await engine.renderAdministrativeTMPL03({
    institution: { nombre: 'CETPRO TEST', ugel: 'UGEL 03', codigoModular: '1234567' },
    program: { nombre: 'COMPUTACION' },
    module: { nombre: 'OFIMATICA' },
    studentsList: students
  });

  const buf = await blob.arrayBuffer();
  fs.writeFileSync('scratch/output_tmpl03_test.pdf', Buffer.from(buf));
  console.log('Generated scratch/output_tmpl03_test.pdf, size:', buf.byteLength);

  // Inspect with pdfjs
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  console.log('Num pages:', doc.numPages);
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items.map(it => it.str).filter(Boolean);
    console.log(`Page ${p} items count:`, items.length);
  }
}

test().catch(console.error);
