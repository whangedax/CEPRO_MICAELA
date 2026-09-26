const fs = require('fs');

async function run() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  console.log('====================================================');
  console.log('AUDITORÍA VECTORIAL DE TMPL-18 (EFSRT)');
  console.log('====================================================');

  const buf18 = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/18_CONSOLIDADO_EFSRT.pdf');
  const doc18 = await pdfjs.getDocument({ data: new Uint8Array(buf18), disableWorker: true }).promise;
  console.log('Total páginas 18:', doc18.numPages);
  const p18 = await doc18.getPage(1);
  const vp18 = p18.getViewport({ scale: 1.0 });
  console.log('Dimensiones 18:', vp18.width, 'x', vp18.height);

  const tc18 = await p18.getTextContent();
  const items18 = tc18.items.map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));

  console.log('\n--- Textos de Cabecera y Columnas (y > 780) ---');
  const headers18 = items18.filter(it => it.y > 780).sort((a, b) => b.y - a.y || a.x - b.x);
  headers18.forEach(it => {
    if (it.str.trim()) console.log(`y=${it.y}, x=${it.x}: "${it.str}"`);
  });

  console.log('\n--- Filas numeradas en columna N° (x < 45) ---');
  const numbers18 = items18.filter(it => it.x >= 20 && it.x <= 45 && it.y < 780 && it.y > 150 && /^\d+$/.test(it.str.trim())).sort((a, b) => b.y - a.y);
  console.log(`Total filas numeradas encontradas: ${numbers18.length}`);
  numbers18.forEach((it, idx) => {
    console.log(`Fila ${idx + 1} (${it.str}): y=${it.y}, x=${it.x}`);
  });

  console.log('\n--- Textos de Pie de Página (y < 200) ---');
  const footers18 = items18.filter(it => it.y <= 200).sort((a, b) => b.y - a.y || a.x - b.x);
  footers18.forEach(it => {
    if (it.str.trim()) console.log(`y=${it.y}, x=${it.x}: "${it.str}"`);
  });

  console.log('\n====================================================');
  console.log('AUDITORÍA VECTORIAL DE TMPL-19 (ACTA DE EVALUACIÓN MODULAR)');
  console.log('====================================================');

  const buf19 = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc19 = await pdfjs.getDocument({ data: new Uint8Array(buf19), disableWorker: true }).promise;
  console.log('Total páginas 19:', doc19.numPages);

  for (let pageNum = 1; pageNum <= doc19.numPages; pageNum++) {
    console.log(`\n>>> PÁGINA ${pageNum} DE TMPL-19 <<<`);
    const page = await doc19.getPage(pageNum);
    const vp = page.getViewport({ scale: 1.0 });
    console.log(`Dimensiones Pág ${pageNum}:`, vp.width, 'x', vp.height);
    const tc = await page.getTextContent();
    const items = tc.items.map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));
    
    // Mostramos agrupados por zonas verticales
    const nonEmpty = items.filter(it => it.str.trim());
    console.log(`Total elementos de texto con contenido: ${nonEmpty.length}`);
    
    console.log(`\n-- Zona Superior (y > 750) Pág ${pageNum} --`);
    nonEmpty.filter(it => it.y > 750).sort((a, b) => b.y - a.y || a.x - b.x).forEach(it => {
      console.log(`y=${it.y}, x=${it.x}: "${it.str}"`);
    });

    console.log(`\n-- Zona Media (400 <= y <= 750) Pág ${pageNum} (primeros 25) --`);
    nonEmpty.filter(it => it.y >= 400 && it.y <= 750).sort((a, b) => b.y - a.y || a.x - b.x).slice(0, 25).forEach(it => {
      console.log(`y=${it.y}, x=${it.x}: "${it.str}"`);
    });

    console.log(`\n-- Zona Inferior (y < 400) Pág ${pageNum} --`);
    nonEmpty.filter(it => it.y < 400).sort((a, b) => b.y - a.y || a.x - b.x).forEach(it => {
      console.log(`y=${it.y}, x=${it.x}: "${it.str}"`);
    });
  }
}

run().catch(console.error);
