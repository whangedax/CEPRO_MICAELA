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
      try {
        files[fileName] = zlib.inflateRawSync(rawData).toString('utf8');
      } catch(e){}
    } else if (compression === 0) {
      files[fileName] = rawData.toString('utf8');
    }
    pos = dataStart + compressedSize;
  } else {
    pos++;
  }
}

// Shared Strings
const sst = [];
if (files['xl/sharedStrings.xml']) {
  const strings = files['xl/sharedStrings.xml'].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  strings.forEach((s) => {
    const text = s.replace(/<\/?t[^>]*>/g, '');
    sst.push(text);
  });
}

// Find worksheet file for sheet "Nómina"
// Find target in xl/_rels/workbook.xml.rels
let sheetFile = '';
if (files['xl/_rels/workbook.xml.rels']) {
  const rels = files['xl/_rels/workbook.xml.rels'].match(/<Relationship [^>]*Id="rId33"[^>]*Target="([^"]+)"\/>/);
  if (rels) {
    sheetFile = 'xl/' + rels[1].replace(/^\//, '');
  }
}

if (!sheetFile || !files[sheetFile]) {
  sheetFile = Object.keys(files).find(k => k.startsWith('xl/worksheets/sheet') && !k.includes('_rels')) || 'xl/worksheets/sheet1.xml';
}

console.log('Using worksheet file:', sheetFile);

const sheetXml = files[sheetFile];
console.log('\n=== MERGES IN B1:Q106 ===');
const merges = sheetXml.match(/<mergeCell ref="([^"]+)"\/>/g) || [];
merges.forEach(m => {
  const ref = m.match(/ref="([^"]+)"/)[1];
  console.log(`Merged: ${ref}`);
});

console.log('\n=== DUMPING ROWS 1 TO 106 (NON-EMPTY CELLS) ===');
const rows = sheetXml.match(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g) || [];

rows.forEach(r => {
  const rowNum = parseInt(r.match(/r="(\d+)"/)[1], 10);
  if (rowNum <= 106) {
    const cells = r.match(/<c r="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/c>/g) || [];
    const cellDescs = [];
    cells.forEach(c => {
      const ref = c.match(/r="([A-Z0-9]+)"/)[1];
      const typeMatch = c.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : '';
      const vMatch = c.match(/<v>(.*?)<\/v>/);
      const val = vMatch ? vMatch[1] : '';
      const fMatch = c.match(/<f[^>]*>(.*?)<\/f>/);
      const formula = fMatch ? `f:${fMatch[1]}` : '';

      let displayVal = val;
      if (type === 's' && sst[parseInt(val, 10)] !== undefined) {
        displayVal = `"${sst[parseInt(val, 10)]}"`;
      }
      if (displayVal || formula) {
        cellDescs.push(`${ref}=${displayVal} ${formula}`.trim());
      }
    });
    if (cellDescs.length > 0) {
      console.log(`Row ${String(rowNum).padStart(3, ' ')}: ${cellDescs.join(' | ')}`);
    }
  }
});
