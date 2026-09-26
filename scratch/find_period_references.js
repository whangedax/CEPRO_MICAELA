const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function scanDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else if (item.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = scanDir(path.join(ROOT, 'app/js')).concat(scanDir(path.join(ROOT, 'tests')));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.toLowerCase().includes('period') && (l.includes('put') || l.includes('create') || l.includes('save') || l.includes('add') || l.includes('periodos'))) {
      console.log(`${path.relative(ROOT, f)}:${idx+1} -> ${l.trim()}`);
    }
  });
});
