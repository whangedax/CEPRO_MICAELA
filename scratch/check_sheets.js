const fs = require('fs');
const path = require('path');

const scratchDir = path.resolve('./scratch/tmpl01_unzipped');
const sheetsDir = path.join(scratchDir, 'xl/worksheets');
const files = fs.readdirSync(sheetsDir);
console.log('Archivos en xl/worksheets:', files);

const relsFile = path.join(scratchDir, 'xl/_rels/workbook.xml.rels');
if (fs.existsSync(relsFile)) {
  console.log('\n--- xl/_rels/workbook.xml.rels ---');
  console.log(fs.readFileSync(relsFile, 'utf8'));
}
