const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const xlsxDir = path.join(ROOT, 'sources/templates/originals/xlsx');
const pngDir = path.join(ROOT, 'sources/templates/previews');
const catFile = path.join(ROOT, 'sources/templates/CATALOGO_PLANTILLAS.md');
const scratchDir = path.join(ROOT, 'scratch/temp_xlsx_inspect');

const catContent = fs.readFileSync(catFile, 'utf8');
const manifestHashes = {};
const lines = catContent.split('\n');
for (const line of lines) {
  const match = line.match(/\|[^|]+\|\s*`([^`]+\.xlsx)`\s*\|\s*`([a-f0-9]{64})`/i);
  if (match) {
    manifestHashes[match[1]] = match[2];
  }
}

const files = fs.readdirSync(xlsxDir).filter(f => f.endsWith('.xlsx')).sort();

const results = [];

for (const filename of files) {
  const filePath = path.join(xlsxDir, filename);
  const fileBuffer = fs.readFileSync(filePath);
  const hashXlsx = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const expectedHash = manifestHashes[filename] || '';
  const hashCoincide = hashXlsx.toLowerCase() === expectedHash.toLowerCase();

  const pngName = filename.replace('.xlsx', '.png');
  const pngPath = path.join(pngDir, pngName);
  const pngExiste = fs.existsSync(pngPath);

  const targetUnzipDir = path.join(scratchDir, filename.replace('.xlsx', ''));

  // Inspect sheets in targetUnzipDir
  const workbookXmlPath = path.join(targetUnzipDir, 'xl/workbook.xml');
  const workbookXml = fs.existsSync(workbookXmlPath) ? fs.readFileSync(workbookXmlPath, 'utf8') : '';

  const sheetMatches = [...workbookXml.matchAll(/<sheet\s+name="([^"]+)"\s+sheetId="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  const sheetNames = sheetMatches.map(m => m[1]);
  const sheet1Name = sheetNames[0] || 'N/A';

  // Read worksheets/sheet1.xml
  const sheetXmlPath = path.join(targetUnzipDir, 'xl/worksheets/sheet1.xml');
  const sheetXml = fs.existsSync(sheetXmlPath) ? fs.readFileSync(sheetXmlPath, 'utf8') : '';

  // Dimension
  const dimMatch = sheetXml.match(/<dimension\s+ref="([^"]+)"\/>/);
  const dimension = dimMatch ? dimMatch[1] : 'A1';

  // Orientation & paperSize
  let orientation = 'NO_CONFIRMADO';
  let paperSize = 'NO_CONFIRMADO';
  let paperSizeCode = 'N/A';

  const pageSetupMatches = [...sheetXml.matchAll(/<pageSetup([^>]+)\/?>/g)];
  if (pageSetupMatches.length > 0) {
    const setupStr = pageSetupMatches[0][1];
    const orientM = setupStr.match(/orientation="([^"]+)"/);
    if (orientM) orientation = orientM[1];

    const paperM = setupStr.match(/paperSize="([^"]+)"/);
    if (paperM) {
      paperSizeCode = paperM[1];
      if (paperSizeCode === '9') paperSize = 'A4 (9)';
      else if (paperSizeCode === '1') paperSize = 'Letter (1)';
      else paperSize = `Code ${paperSizeCode}`;
    }
  }

  // Check sharedStrings or cell formulas
  const formulasCount = (sheetXml.match(/<f[^>]*>/g) || []).length;

  results.push({
    templateId: `TMPL-${filename.substring(0, 2)}`,
    xlsx: filename,
    xlsxExiste: true,
    png: pngName,
    pngExiste,
    hojas: sheetNames.length,
    hojaPrincipal: sheet1Name,
    orientacionReal: orientation,
    paperSizeReal: paperSize,
    hashXlsx,
    hashManifest: expectedHash,
    hashCoincide,
    dimension,
    formulasCount
  });
}

fs.writeFileSync(path.join(ROOT, 'scratch/templates_physical_audit_v2.json'), JSON.stringify(results, null, 2));
console.log('Auditoria v2 completada.');
console.table(results.map(r => ({
  id: r.templateId,
  xlsx: r.xlsx,
  sheet: r.hojaPrincipal,
  orient: r.orientacionReal,
  paper: r.paperSizeReal,
  hashOK: r.hashCoincide
})));
