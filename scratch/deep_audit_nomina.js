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

// Shared Strings
const sst = [];
if (files['xl/sharedStrings.xml']) {
  const strings = files['xl/sharedStrings.xml'].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  strings.forEach((s) => {
    sst.push(s.replace(/<\/?t[^>]*>/g, ''));
  });
}

// Worksheet file
let sheetFile = '';
if (files['xl/_rels/workbook.xml.rels']) {
  const rels = files['xl/_rels/workbook.xml.rels'].match(/<Relationship [^>]*Id="rId33"[^>]*Target="([^"]+)"\/>/);
  if (rels) sheetFile = 'xl/' + rels[1].replace(/^\//, '');
}
if (!sheetFile || !files[sheetFile]) {
  sheetFile = Object.keys(files).find(k => k.startsWith('xl/worksheets/sheet') && !k.includes('_rels')) || 'xl/worksheets/sheet1.xml';
}

const sheetXml = files[sheetFile];

console.log('=== MERGED CELLS (ALL) ===');
const merges = sheetXml.match(/<mergeCell ref="([^"]+)"\/>/g) || [];
const mergeRefs = merges.map(m => m.match(/ref="([^"]+)"/)[1]);
mergeRefs.forEach(ref => console.log(ref));

console.log('\n=== COLUMNS LAYOUT / COLS ===');
const cols = sheetXml.match(/<col [^>]*\/>/g) || [];
cols.forEach(c => console.log(c));

console.log('\n=== HEADER ROWS 13 & 14 DETAIL ===');
[13, 14, 66, 67].forEach(rNum => {
  const rowMatch = sheetXml.match(new RegExp(`<row r="${rNum}"[^>]*>([\\s\\S]*?)<\\/row>`));
  if (rowMatch) {
    const cells = rowMatch[1].match(/<c r="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/c>/g) || [];
    console.log(`\nRow ${rNum}:`);
    cells.forEach(c => {
      const ref = c.match(/r="([A-Z0-9]+)"/)[1];
      const typeMatch = c.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : '';
      const vMatch = c.match(/<v>(.*?)<\/v>/);
      const val = vMatch ? vMatch[1] : '';
      let displayVal = val;
      if (type === 's' && sst[parseInt(val, 10)] !== undefined) {
        displayVal = `"${sst[parseInt(val, 10)]}"`;
      }
      console.log(`  ${ref}: ${displayVal}`);
    });
  }
});

console.log('\n=== STUDENT ROW 15 & 16 (FIRST DATA ROWS PÁG 1) ===');
[15, 16, 44].forEach(rNum => {
  const rowMatch = sheetXml.match(new RegExp(`<row r="${rNum}"[^>]*>([\\s\\S]*?)<\\/row>`));
  if (rowMatch) {
    const cells = rowMatch[1].match(/<c r="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/c>/g) || [];
    console.log(`\nRow ${rNum}:`);
    cells.forEach(c => {
      const ref = c.match(/r="([A-Z0-9]+)"/)[1];
      const typeMatch = c.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : '';
      const vMatch = c.match(/<v>(.*?)<\/v>/);
      const val = vMatch ? vMatch[1] : '';
      let displayVal = val;
      if (type === 's' && sst[parseInt(val, 10)] !== undefined) {
        displayVal = `"${sst[parseInt(val, 10)]}"`;
      }
      console.log(`  ${ref}: ${displayVal}`);
    });
  }
});

console.log('\n=== STUDENT ROW 68 & 69 (FIRST DATA ROWS PÁG 2) ===');
[68, 69, 97].forEach(rNum => {
  const rowMatch = sheetXml.match(new RegExp(`<row r="${rNum}"[^>]*>([\\s\\S]*?)<\\/row>`));
  if (rowMatch) {
    const cells = rowMatch[1].match(/<c r="([A-Z0-9]+)"[^>]*>([\s\S]*?)<\/c>/g) || [];
    console.log(`\nRow ${rNum}:`);
    cells.forEach(c => {
      const ref = c.match(/r="([A-Z0-9]+)"/)[1];
      const typeMatch = c.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : '';
      const vMatch = c.match(/<v>(.*?)<\/v>/);
      const val = vMatch ? vMatch[1] : '';
      let displayVal = val;
      if (type === 's' && sst[parseInt(val, 10)] !== undefined) {
        displayVal = `"${sst[parseInt(val, 10)]}"`;
      }
      console.log(`  ${ref}: ${displayVal}`);
    });
  }
});
