const fs = require('fs');
const path = require('path');

const scratchDir = path.resolve('./scratch/tmpl01_unzipped');
const sheetXml = fs.readFileSync(path.join(scratchDir, 'xl/worksheets/sheet33.xml'), 'utf8');
const ssXml = fs.readFileSync(path.join(scratchDir, 'xl/sharedStrings.xml'), 'utf8');

const tMatches = ssXml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
const strings = tMatches.map(t => t.replace(/^<t[^>]*>/, '').replace(/<\/t>$/, ''));

const cellMatches = sheetXml.match(/<c\s+r="[A-Z0-9]+"[^>]*>[\s\S]*?<\/c>/g) || [];

const rowData = {};

cellMatches.forEach(cellXml => {
  const rMatch = cellXml.match(/r="([A-Z0-9]+)"/);
  const tMatch = cellXml.match(/t="([^"]+)"/);
  const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);

  const ref = rMatch ? rMatch[1] : '';
  const type = tMatch ? tMatch[1] : '';
  const val = vMatch ? vMatch[1] : '';

  const col = ref.replace(/\d+/, '');
  const row = parseInt(ref.match(/\d+/)[0], 10);

  let cellText = '';
  if (type === 's' && val !== '') {
    cellText = strings[parseInt(val, 10)] || '';
  } else {
    cellText = val;
  }

  if (cellText.trim() && row <= 110) {
    if (!rowData[row]) rowData[row] = [];
    rowData[row].push(`${col}:${cellText}`);
  }
});

console.log('--- DETALLE DE FILAS 1 A 110 ---');
Object.keys(rowData).sort((a,b) => parseInt(a) - parseInt(b)).forEach(r => {
  console.log(`Fila ${r.padStart(3, ' ')}:`, rowData[r].join(' | '));
});
