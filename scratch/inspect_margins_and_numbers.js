const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const xlsxPath = path.resolve(__dirname, '../sources/templates/originals/xlsx/01_NOMINA_DE_MATRICULA.xlsx');
const buf = fs.readFileSync(xlsxPath);

let pos = 0;
const files = {};

while (pos < buf.length - 30) {
  if (buf.readUInt32LE(pos) === 0x04034b50) {
    const compression = buf.readUInt16LE(pos + 8);
    const compressedSize = buf.readUInt32LE(pos + 18);
    const fileNameLen = buf.readUInt16LE(pos + 26);
    const extraLen = buf.readUInt16LE(pos + 28);
    const fileName = buf.toString('utf8', pos + 30, pos + 30 + fileNameLen);
    const dataStart = pos + 30 + fileNameLen + extraLen;
    const rawData = buf.subarray(dataStart, dataStart + compressedSize);
    
    if (compression === 8) {
      try { files[fileName] = zlib.inflateRawSync(rawData).toString('utf8'); } catch(e){}
    } else if (compression === 0) {
      files[fileName] = rawData.toString('utf8');
    }
    pos = dataStart + compressedSize;
  } else {
    pos++;
  }
}

let sheetFile = '';
if (files['xl/_rels/workbook.xml.rels']) {
  const rels = files['xl/_rels/workbook.xml.rels'].match(/<Relationship [^>]*Id="rId33"[^>]*Target="([^"]+)"\/>/);
  if (rels) sheetFile = 'xl/' + rels[1].replace(/^\//, '');
}
if (!sheetFile || !files[sheetFile]) {
  sheetFile = Object.keys(files).find(k => k.startsWith('xl/worksheets/sheet') && !k.includes('_rels')) || 'xl/worksheets/sheet1.xml';
}

const sheetXml = files[sheetFile];

console.log('=== PAGE MARGINS & PAGE SETUP IN XML ===');
const marginsMatch = sheetXml.match(/<pageMargins [^>]*\/>/);
console.log('pageMargins:', marginsMatch ? marginsMatch[0] : 'NOT FOUND');

const setupMatch = sheetXml.match(/<pageSetup [^>]*\/>/);
console.log('pageSetup:', setupMatch ? setupMatch[0] : 'NOT FOUND');

const printOptionsMatch = sheetXml.match(/<printOptions [^>]*\/>/);
console.log('printOptions:', printOptionsMatch ? printOptionsMatch[0] : 'NOT FOUND');

console.log('\n=== INSPECTING CELLS B15 TO B44 (COL B STUDENT ROWS PÁG 1) ===');
// Shared Strings
const sst = [];
if (files['xl/sharedStrings.xml']) {
  const strings = files['xl/sharedStrings.xml'].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  strings.forEach((s) => sst.push(s.replace(/<\/?t[^>]*>/g, '')));
}

for (let r = 15; r <= 44; r++) {
  const cMatch = sheetXml.match(new RegExp(`<c r="B${r}"[^>]*>([\\s\\S]*?)<\\/c>`));
  if (cMatch) {
    const vMatch = cMatch[1].match(/<v>(.*?)<\/v>/);
    const val = vMatch ? vMatch[1] : '';
    const tMatch = cMatch[0].match(/t="([^"]+)"/);
    const t = tMatch ? tMatch[1] : '';
    let disp = val;
    if (t === 's') disp = `"${sst[parseInt(val, 10)]}"`;
    console.log(`Cell B${r}: ${disp}`);
  } else {
    const emptyCellTag = sheetXml.match(new RegExp(`<c r="B${r}"[^>]*\\/>`));
    console.log(`Cell B${r}: ${emptyCellTag ? 'Empty Tag <c r="..."/>' : 'NOT DECLARED IN XML'}`);
  }
}
