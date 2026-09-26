const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const xlsxDir = path.join(ROOT, 'sources/templates/originals/xlsx');
const pngDir = path.join(ROOT, 'sources/templates/previews');
const hashesFile = path.join(ROOT, 'sources/templates/HASHES_FUENTE.md');
const scratchDir = path.join(ROOT, 'scratch/temp_xlsx_inspect');

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Leer HASHES_FUENTE.md
const hashesContent = fs.readFileSync(hashesFile, 'utf8');
const manifestHashes = {};
const lines = hashesContent.split('\n');
for (const line of lines) {
  const match = line.match(/`([^`]+\.xlsx)`\s*\|\s*`([a-f0-9]{64})`/i);
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

  // Extract XLSX to scratchDir/filename
  const targetUnzipDir = path.join(scratchDir, filename.replace('.xlsx', ''));
  if (fs.existsSync(targetUnzipDir)) {
    fs.rmSync(targetUnzipDir, { recursive: true, force: true });
  }

  // Copy file to temp zip path for Expand-Archive
  const tempZipPath = path.join(scratchDir, `${filename}.zip`);
  fs.copyFileSync(filePath, tempZipPath);

  // Use powershell Expand-Archive
  const psCmd = `powershell -Command "Expand-Archive -Path '${tempZipPath.replace(/'/g, "''")}' -DestinationPath '${targetUnzipDir.replace(/'/g, "''")}' -Force"`;
  execSync(psCmd);
  fs.unlinkSync(tempZipPath);

  // Read xl/workbook.xml
  const workbookXmlPath = path.join(targetUnzipDir, 'xl/workbook.xml');
  const workbookXml = fs.existsSync(workbookXmlPath) ? fs.readFileSync(workbookXmlPath, 'utf8') : '';

  // Extract sheet names
  const sheetMatches = [...workbookXml.matchAll(/<sheet\s+name="([^"]+)"\s+sheetId="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  const sheetNames = sheetMatches.map(m => m[1]);

  // Read active sheet if defined
  let activeSheet = sheetNames[0] || 'N/A';
  const activeTabMatch = workbookXml.match(/<activeTab>(\d+)<\/activeTab>/);
  if (activeTabMatch) {
    const tabIdx = parseInt(activeTabMatch[1], 10);
    if (sheetNames[tabIdx]) activeSheet = sheetNames[tabIdx];
  }

  // Inspect first sheet XML (sheet1.xml)
  const sheet1XmlPath = path.join(targetUnzipDir, 'xl/worksheets/sheet1.xml');
  const sheet1Xml = fs.existsSync(sheet1XmlPath) ? fs.readFileSync(sheet1XmlPath, 'utf8') : '';

  // Dimension / Used range
  const dimMatch = sheet1Xml.match(/<dimension\s+ref="([^"]+)"/);
  const dimension = dimMatch ? dimMatch[1] : 'N/A';

  // Page Setup / Orientation / PaperSize
  const pageSetupMatch = sheet1Xml.match(/<pageSetup([^>]+)\/>/);
  let orientation = 'NO_CONFIRMADO';
  let paperSize = 'NO_CONFIRMADO';
  let paperSizeCode = '';

  if (pageSetupMatch) {
    const setupStr = pageSetupMatch[1];
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

  // Margins
  const marginMatch = sheet1Xml.match(/<pageMargins([^>]+)\/>/);
  let margins = 'N/A';
  if (marginMatch) {
    margins = marginMatch[1].replace(/"/g, '').trim();
  }

  // Merged cells
  const mergedMatches = sheet1Xml.match(/<mergeCell\s+ref="([^"]+)"/g) || [];
  const mergedCount = mergedMatches.length;

  // Drawing / Images
  const drawingMatch = sheet1Xml.match(/<drawing\s+r:id="([^"]+)"/);
  const hasImages = Boolean(drawingMatch);

  // Formulas
  const formulasCount = (sheet1Xml.match(/<f>/g) || []).length;

  results.push({
    filename,
    xlsxExiste: true,
    pngName,
    pngExiste,
    sheetsCount: sheetNames.length,
    sheetNames,
    activeSheet,
    dimension,
    orientation,
    paperSize,
    paperSizeCode,
    margins,
    mergedCount,
    hasImages,
    formulasCount,
    hashXlsx,
    expectedHash,
    hashCoincide
  });
}

fs.writeFileSync(path.join(ROOT, 'scratch/templates_physical_audit.json'), JSON.stringify(results, null, 2));
console.log('Auditoria completada. Resultados en scratch/templates_physical_audit.json');
console.table(results.map(r => ({
  file: r.filename,
  sheets: r.sheetsCount,
  active: r.activeSheet,
  dim: r.dimension,
  orient: r.orientation,
  paper: r.paperSize,
  merged: r.mergedCount,
  hashOK: r.hashCoincide
})));
