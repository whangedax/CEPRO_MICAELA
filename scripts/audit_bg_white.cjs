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
let issuesByFile = {};
let total = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Look for bg-white without dark:bg in the same line/className
    if (l.includes('bg-white') && !l.includes('dark:bg-') && !l.includes('canvas') && !l.includes('print:')) {
      if (!issuesByFile[f]) issuesByFile[f] = [];
      issuesByFile[f].push({ line: idx + 1, text: l.trim().slice(0, 100) });
      total++;
    }
  });
});

console.log('Total bg-white occurrences without dark:bg on same line:', total);
for (const [file, items] of Object.entries(issuesByFile)) {
  console.log(`\n=== ${file} (${items.length}) ===`);
  items.slice(0, 5).forEach(i => console.log(`  Line ${i.line}: ${i.text}`));
}
