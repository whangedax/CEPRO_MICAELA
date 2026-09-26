const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const xlsxPath = path.join(ROOT, 'sources/templates/originals/xlsx/01_NOMINA_DE_MATRICULA.xlsx');
const pngPath = path.join(ROOT, 'sources/templates/previews/01_NOMINA_DE_MATRICULA.png');

console.log('--- AUDITORÍA FÍSICA TMPL-01 ---');
console.log('XLSX:', xlsxPath);
console.log('PNG:', pngPath);

const tempZipPath = path.join(ROOT, 'scratch/tmpl01_temp.zip');
const scratchDir = path.join(ROOT, 'scratch/tmpl01_unzipped');

fs.copyFileSync(xlsxPath, tempZipPath);

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

try {
  execSync(`powershell -Command "Expand-Archive -Force -Path '${tempZipPath}' -DestinationPath '${scratchDir}'"`);
  console.log('XLSX descomprimido con éxito en scratch/tmpl01_unzipped');
} catch (err) {
  console.error('Error descomprimiendo:', err.message);
}

// 1. Workbook inspection
const workbookXml = fs.readFileSync(path.join(scratchDir, 'xl/workbook.xml'), 'utf8');
console.log('\n==================================================');
console.log('1. WORKBOOK.XML (HOJAS DEL DESPACHO)');
console.log('==================================================');
console.log(workbookXml);

// 2. Sheet1 inspection
const sheet1Xml = fs.readFileSync(path.join(scratchDir, 'xl/worksheets/sheet1.xml'), 'utf8');
console.log('\n==================================================');
console.log('2. SHEET1.XML (INFORMACIÓN DE HOJA Y DIMENSIONES)');
console.log('==================================================');
const dimMatch = sheet1Xml.match(/<dimension\s+ref="([^"]+)"/);
console.log('Dimension ref:', dimMatch ? dimMatch[1] : 'No encontrada');

// Check print area in workbook.xml or definedNames
const definedNamesMatch = workbookXml.match(/<definedNames>[\s\S]*?<\/definedNames>/);
console.log('definedNames in workbook.xml:', definedNamesMatch ? definedNamesMatch[0] : 'Ninguno');

// Check pageBreaks, pageSetup, printOptions in sheet1.xml
const rowBreaksMatch = sheet1Xml.match(/<rowBreaks[\s\S]*?<\/rowBreaks>/);
console.log('rowBreaks:', rowBreaksMatch ? rowBreaksMatch[0] : 'Ninguno');

const colBreaksMatch = sheet1Xml.match(/<colBreaks[\s\S]*?<\/colBreaks>/);
console.log('colBreaks:', colBreaksMatch ? colBreaksMatch[0] : 'Ninguno');

const pageSetupMatch = sheet1Xml.match(/<pageSetup[\s\S]*?\/>/);
console.log('pageSetup:', pageSetupMatch ? pageSetupMatch[0] : 'Ninguno');

const printOptionsMatch = sheet1Xml.match(/<printOptions[\s\S]*?\/>/);
console.log('printOptions:', printOptionsMatch ? printOptionsMatch[0] : 'Ninguno');

// 3. Shared strings
const sharedStringsPath = path.join(scratchDir, 'xl/sharedStrings.xml');
let strings = [];
if (fs.existsSync(sharedStringsPath)) {
  const ssXml = fs.readFileSync(sharedStringsPath, 'utf8');
  const tMatches = ssXml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  strings = tMatches.map(t => t.replace(/^<t[^>]*>/, '').replace(/<\/t>$/, ''));
  console.log('\n==================================================');
  console.log('3. SHARED STRINGS (TOTAL DE STRINGS:', strings.length, ')');
  console.log('==================================================');
  strings.forEach((str, idx) => {
    if (str.toLowerCase().includes('nómina') || str.toLowerCase().includes('nomina') || str.toLowerCase().includes('matrícula') || str.toLowerCase().includes('matricula')) {
      console.log(`String index ${idx}: "${str}"`);
    }
  });
}

// 4. Map cell values in sheet1.xml
console.log('\n==================================================');
console.log('4. CELDAS QUE HACEN REFERENCIA A NÓMINA DE MATRÍCULA');
console.log('==================================================');

const cellMatches = sheet1Xml.match(/<c\s+r="[A-Z0-9]+"[^>]*>[\s\S]*?<\/c>/g) || [];
cellMatches.forEach(cellXml => {
  const rMatch = cellXml.match(/r="([A-Z0-9]+)"/);
  const tMatch = cellXml.match(/t="([^"]+)"/);
  const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);

  const ref = rMatch ? rMatch[1] : '';
  const type = tMatch ? tMatch[1] : '';
  const val = vMatch ? vMatch[1] : '';

  if (type === 's' && val !== '') {
    const strIdx = parseInt(val, 10);
    const strText = strings[strIdx] || '';
    if (strText.toLowerCase().includes('nómina') || strText.toLowerCase().includes('nomina')) {
      console.log(`Celda ${ref} (string index ${strIdx}): "${strText}"`);
    }
  }
});

// Parse image size of 01_NOMINA_DE_MATRICULA.png
const pngBuf = fs.readFileSync(pngPath);
const width = pngBuf.readUInt32BE(16);
const height = pngBuf.readUInt32BE(20);
console.log('\n==================================================');
console.log('5. PNG DE REFERENCIA (01_NOMINA_DE_MATRICULA.png)');
console.log('==================================================');
console.log(`Dimensiones de PNG: ${width}px x ${height}px`);

