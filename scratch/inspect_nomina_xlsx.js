const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const xlsxPath = path.resolve(__dirname, '../sources/templates/originals/xlsx/01_NOMINA_DE_MATRICULA.xlsx');
const buf = fs.readFileSync(xlsxPath);

let pos = 0;
const files = {};

while (pos < buf.length - 30) {
  if (buf.readUInt32LE(pos) === 0x04034b50) { // Local file header signature
    const compression = buf.readUInt16LE(pos + 8);
    const compressedSize = buf.readUInt32LE(pos + 18);
    const fileNameLen = buf.readUInt16LE(pos + 26);
    const extraLen = buf.readUInt16LE(pos + 28);
    const fileName = buf.toString('utf8', pos + 30, pos + 30 + fileNameLen);
    const dataStart = pos + 30 + fileNameLen + extraLen;
    const rawData = buf.subarray(dataStart, dataStart + compressedSize);
    
    if (compression === 8) { // Deflate
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

console.log('=== FILES IN XLSX ZIP ===');
console.log(Object.keys(files));

// Shared Strings
const sst = [];
if (files['xl/sharedStrings.xml']) {
  const strings = files['xl/sharedStrings.xml'].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
  strings.forEach((s, idx) => {
    const text = s.replace(/<\/?t[^>]*>/g, '');
    sst.push(text);
  });
  console.log(`\n=== SHARED STRINGS (Total: ${sst.length}) ===`);
  sst.forEach((str, idx) => {
    console.log(`SST[${idx}]: "${str}"`);
  });
}

// Worksheet 1
if (files['xl/worksheets/sheet1.xml']) {
  const sheetXml = files['xl/worksheets/sheet1.xml'];
  console.log('\n=== MERGED CELLS ===');
  const merges = sheetXml.match(/<mergeCell ref="([^"]+)"\/>/g) || [];
  merges.forEach(m => {
    const ref = m.match(/ref="([^"]+)"/)[1];
    console.log(`Merged: ${ref}`);
  });

  console.log('\n=== CELL VALUES / REFS ===');
  const cells = sheetXml.match(/<c r="([A-Z0-9]+)"[^>]*>(.*?)<\/c>/g) || [];
  cells.forEach(c => {
    const ref = c.match(/r="([A-Z0-9]+)"/)[1];
    const typeMatch = c.match(/t="([^"]+)"/);
    const type = typeMatch ? typeMatch[1] : '';
    const vMatch = c.match(/<v>(.*?)<\/v>/);
    const val = vMatch ? vMatch[1] : '';
    let displayVal = val;
    if (type === 's' && sst[parseInt(val, 10)] !== undefined) {
      displayVal = `"${sst[parseInt(val, 10)]}" (SST[${val}])`;
    }
    console.log(`Cell ${ref}: ${displayVal}`);
  });
}
