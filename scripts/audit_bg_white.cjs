const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

const files = walk('src');
let issues = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    const match = l.match(/className=(?:\{`|["'`])([^"'`]+)(?:`\}|["'`])/);
    if (match) {
      const cls = match[1];
      if (cls.includes('bg-white') && !cls.includes('dark:bg') && !cls.includes('canvas') && !cls.includes('print:')) {
        issues.push({ file: f, line: idx + 1, text: cls });
      }
    }
  });
});

console.log('Total bg-white without dark:bg:', issues.length);
issues.forEach(i => console.log(`${i.file}:${i.line} -> ${i.text.slice(0, 80)}`));
