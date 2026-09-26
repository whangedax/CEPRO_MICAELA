const fs = require('fs');
const execSync = require('child_process').execSync;

const destDir = './scratch/tpl18_unzipped';
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

try {
  execSync(`tar -xf ./sources/templates/originals/xlsx/18_CONSOLIDADO_EFSRT.xlsx -C ${destDir}`);
  const ssPath = `${destDir}/xl/sharedStrings.xml`;
  if (fs.existsSync(ssPath)) {
    const xml = fs.readFileSync(ssPath, 'utf8');
    const strings = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g).map(s => s.replace(/<[^>]+>/g, ''));
    console.log('TOTAL STRINGS:', strings.length);
    console.log(strings.join('\n'));
  } else {
    console.log('sharedStrings.xml not found');
  }
} catch (e) {
  console.error('Error:', e.message);
}
