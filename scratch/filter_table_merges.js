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
const merges = sheetXml.match(/<mergeCell ref="([^"]+)"\/>/g) || [];
const mergeRefs = merges.map(m => m.match(/ref="([^"]+)"/)[1]);

console.log('=== TABLE MERGES PÁGINA 1 (Rows 13-44) ===');
mergeRefs.filter(r => {
  const m = r.match(/\d+/);
  if (!m) return false;
  const num = parseInt(m[0], 10);
  return num >= 13 && num <= 44;
}).forEach(r => console.log(r));

console.log('\n=== TABLE MERGES PÁGINA 2 (Rows 66-97) ===');
mergeRefs.filter(r => {
  const m = r.match(/\d+/);
  if (!m) return false;
  const num = parseInt(m[0], 10);
  return num >= 66 && num <= 97;
}).forEach(r => console.log(r));
