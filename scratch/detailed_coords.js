const fs = require('fs');

async function checkDetails() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  console.log('--- DETALLES FILAS TMPL-18 ---');
  const buf18 = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/18_CONSOLIDADO_EFSRT.pdf');
  const doc18 = await pdfjs.getDocument({ data: new Uint8Array(buf18), disableWorker: true }).promise;
  const p18 = await doc18.getPage(1);
  const tc18 = await p18.getTextContent();
  const items18 = tc18.items.map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));
  
  // Headers detail
  console.log('Header items with positions:');
  items18.filter(it => it.y >= 880 && it.y <= 925).forEach(it => {
    if (it.str.trim()) console.log(`  y=${it.y}, x=${it.x}: "${it.str}"`);
  });

  // Table columns position
  console.log('\nColumn headers (y ~ 829):');
  items18.filter(it => it.y >= 815 && it.y <= 840).forEach(it => {
    if (it.str.trim()) console.log(`  y=${it.y}, x=${it.x}: "${it.str}"`);
  });

  console.log('\n--- DETALLES PÁGINA 1 Y 2 TMPL-19 ---');
  const buf19 = fs.readFileSync('sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf');
  const doc19 = await pdfjs.getDocument({ data: new Uint8Array(buf19), disableWorker: true }).promise;
  
  // Page 1 rows
  const p19_1 = await doc19.getPage(1);
  const tc19_1 = await p19_1.getTextContent();
  const items19_1 = tc19_1.items.map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));
  const rows1 = items19_1.filter(it => it.x >= 20 && it.x <= 40 && /^\d+$/.test(it.str.trim())).sort((a, b) => b.y - a.y);
  console.log(`Pág 1: ${rows1.length} filas encontradas: primera en y=${rows1[0]?.y}, última en y=${rows1[rows1.length - 1]?.y}`);

  // Page 2 rows
  const p19_2 = await doc19.getPage(2);
  const tc19_2 = await p19_2.getTextContent();
  const items19_2 = tc19_2.items.map(it => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));
  const rows2 = items19_2.filter(it => it.x >= 50 && it.x <= 70 && /^\d+$/.test(it.str.trim())).sort((a, b) => b.y - a.y);
  console.log(`Pág 2: ${rows2.length} filas encontradas: primera en y=${rows2[0]?.y}, última en y=${rows2[rows2.length - 1]?.y}`);

  console.log('\nPage 2 Signatures & Bottom:');
  items19_2.filter(it => it.y < 160).forEach(it => {
    if (it.str.trim()) console.log(`  P2 y=${it.y}, x=${it.x}: "${it.str}"`);
  });
}

checkDetails().catch(console.error);
