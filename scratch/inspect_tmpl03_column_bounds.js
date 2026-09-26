const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = path.resolve('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf');
  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();

  const headers = [
    { name: 'Nº', x: 20 },
    { name: 'UGEL', x: 46 },
    { name: 'CÓDIGO MODULAR', x: 76 },
    { name: 'NOMBRE DEL CETPRO', x: 123 },
    { name: 'PROGRAMA DE ESTUDIOS', x: 196 },
    { name: 'CICLO', x: 262 },
    { name: 'RESOLUCIÓN', x: 315 },
    { name: 'MÓDULO', x: 392 },
    { name: 'TIPO DOC', x: 462 },
    { name: 'N° DNI', x: 539 },
    { name: 'APELLIDO PATERNO', x: 575 },
    { name: 'APELLIDO MATERNO', x: 627 },
    { name: 'NOMBRES', x: 697 },
    { name: 'SEXO', x: 744 },
    { name: 'FECHA NACIMIENTO', x: 786 }
  ];

  console.log('Headers count:', headers.length);
  // Estimate column boundaries:
  const cols = [
    { key: 'col.num', label: 'Nº', x: 18.0, w: 22.0 },
    { key: 'institution.ugel', label: 'UGEL', x: 40.0, w: 34.0 },
    { key: 'institution.codigoModular', label: 'CÓDIGO MODULAR', x: 74.0, w: 42.0 },
    { key: 'institution.nombre', label: 'NOMBRE DEL CETPRO', x: 116.0, w: 78.0 },
    { key: 'program.nombre', label: 'PROGRAMA DE ESTUDIOS', x: 194.0, w: 68.0 },
    { key: 'group.ciclo', label: 'CICLO', x: 262.0, w: 50.0 },
    { key: 'institution.resolucionPrograma', label: 'RESOLUCIÓN', x: 312.0, w: 76.0 },
    { key: 'module.nombre', label: 'MÓDULO', x: 388.0, w: 72.0 },
    { key: 'student.tipoDocumento', label: 'TIPO DOC', x: 460.0, w: 65.0 },
    { key: 'student.numeroDocumento', label: 'N° DNI', x: 525.0, w: 48.0 },
    { key: 'student.apellidoPaterno', label: 'APELLIDO PATERNO', x: 573.0, w: 52.0 },
    { key: 'student.apellidoMaterno', label: 'APELLIDO MATERNO', x: 625.0, w: 55.0 },
    { key: 'student.nombres', label: 'NOMBRES', x: 680.0, w: 62.0 },
    { key: 'student.sexo', label: 'SEXO', x: 742.0, w: 32.0 },
    { key: 'student.fechaNacimiento', label: 'FECHA NACIMIENTO', x: 774.0, w: 52.0 }
  ];

  for (const c of cols) {
    console.log(`[${c.label}] x=${c.x}, w=${c.w}, right=${c.x + c.w}`);
  }
}

main().catch(console.error);
