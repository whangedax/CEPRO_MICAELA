const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const scratchDir = path.join(ROOT, 'scratch/tmpl01_unzipped');
const pngPath = path.join(ROOT, 'sources/templates/previews/01_NOMINA_DE_MATRICULA.png');

console.log('==================================================');
console.log('AUDITORÍA FÍSICA PROFUNDA TMPL-01 (01_NOMINA_DE_MATRICULA)');
console.log('==================================================\n');

// 1. Workbook XML
const workbookXml = fs.readFileSync(path.join(scratchDir, 'xl/workbook.xml'), 'utf8');
console.log('1. WORKBOOK.XML - CANTIDAD DE HOJAS:');
const sheetMatches = workbookXml.match(/<sheet\s+[^>]*\/>/g) || [];
sheetMatches.forEach((s, i) => console.log(`   Hoja ${i + 1}: ${s}`));

// Print area / Print titles in workbook.xml
const definedNames = workbookXml.match(/<definedName\s+[^>]*>[\s\S]*?<\/definedName>/g) || [];
console.log('\n2. DEFINED NAMES (PRINT AREA / PRINT TITLES):');
definedNames.forEach(d => console.log('  ', d));

// 2. Worksheet XML (sheet33.xml)
const sheetXml = fs.readFileSync(path.join(scratchDir, 'xl/worksheets/sheet33.xml'), 'utf8');

const dimMatch = sheetXml.match(/<dimension\s+ref="([^"]+)"/);
console.log('\n3. DIMENSIÓN USADA (dimension ref):', dimMatch ? dimMatch[1] : 'No encontrada');

// Page breaks
const rowBreaksMatch = sheetXml.match(/<rowBreaks[\s\S]*?<\/rowBreaks>/);
console.log('\n4. ROW BREAKS (PAGINACIÓN MANUAL EN EXCEL):');
console.log(rowBreaksMatch ? rowBreaksMatch[0] : '   Sin rowBreaks explícitos en sheet33.xml');

const colBreaksMatch = sheetXml.match(/<colBreaks[\s\S]*?<\/colBreaks>/);
console.log('\n5. COL BREAKS:');
console.log(colBreaksMatch ? colBreaksMatch[0] : '   Sin colBreaks explícitos en sheet33.xml');

// Page setup & Print options
const pageSetupMatch = sheetXml.match(/<pageSetup[\s\S]*?\/>/);
console.log('\n6. PAGE SETUP:');
console.log(pageSetupMatch ? pageSetupMatch[0] : '   Sin pageSetup explícito');

const printOptionsMatch = sheetXml.match(/<printOptions[\s\S]*?\/>/);
console.log('\n7. PRINT OPTIONS:');
console.log(printOptionsMatch ? printOptionsMatch[0] : '   Sin printOptions explícito');

// 3. Shared strings
const sharedStringsPath = path.join(scratchDir, 'xl/sharedStrings.xml');
let strings = [];
if (fs.existsSync(sharedStringsPath)) {
  const ssXml = fs.readFileSync(sharedStringsPath, 'utf8');
  const tMatches = ssXml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  strings = tMatches.map(t => t.replace(/^<t[^>]*>/, '').replace(/<\/t>$/, ''));
}

// 4. Map cell values in sheet33.xml
console.log('\n8. BÚSQUEDA DE TÍTULOS Y CABECERAS "NÓMINA DE MATRÍCULA" Y ESTRUCTURA DE FILAS:');

const cellMatches = sheetXml.match(/<c\s+r="[A-Z0-9]+"[^>]*>[\s\S]*?<\/c>/g) || [];

const textCells = [];
cellMatches.forEach(cellXml => {
  const rMatch = cellXml.match(/r="([A-Z0-9]+)"/);
  const tMatch = cellXml.match(/t="([^"]+)"/);
  const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);

  const ref = rMatch ? rMatch[1] : '';
  const type = tMatch ? tMatch[1] : '';
  const val = vMatch ? vMatch[1] : '';

  let cellText = '';
  if (type === 's' && val !== '') {
    const strIdx = parseInt(val, 10);
    cellText = strings[strIdx] || '';
  } else {
    cellText = val;
  }

  if (cellText) {
    textCells.push({ ref, text: cellText });
    if (cellText.toLowerCase().includes('nómina') || cellText.toLowerCase().includes('nomina') || cellText.toLowerCase().includes('matrícula') || cellText.toLowerCase().includes('matricula')) {
      console.log(`   Celda ${ref}: "${cellText}"`);
    }
  }
});

// Let's inspect first row and last row of populated cells
const rowIndices = textCells.map(c => {
  const m = c.ref.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}).filter(n => n > 0);

const minRow = Math.min(...rowIndices);
const maxRow = Math.max(...rowIndices);
console.log(`\n9. RANGO REAL CON DATOS EN EXCEL: Fila inicial = ${minRow}, Fila final = ${maxRow}`);

// Let's check headers in different row ranges to see where block 1 and block 2 are located
console.log('\n10. ANÁLISIS DE BLOQUES DE CONTENIDO EN EXCEL POR FILAS:');
textCells.forEach(c => {
  const row = parseInt(c.ref.match(/\d+/)[0], 10);
  if (c.text.toUpperCase().includes('NÓMINA') || c.text.toUpperCase().includes('ESTUDIANTE') || c.text.toUpperCase().includes('NRO') || c.text.toUpperCase().includes('PROGRAMA') || c.text.toUpperCase().includes('DIRECTOR')) {
    console.log(`   Fila ${row} [Celda ${c.ref}]: "${c.text}"`);
  }
});

// PNG Dimensions
const pngBuf = fs.readFileSync(pngPath);
const width = pngBuf.readUInt32BE(16);
const height = pngBuf.readUInt32BE(20);
console.log('\n==================================================');
console.log('11. PNG DE REFERENCIA (01_NOMINA_DE_MATRICULA.png)');
console.log('==================================================');
console.log(`Dimensiones PNG: ${width}px de ancho x ${height}px de alto (Ratio: ${(height / width).toFixed(2)})`);

