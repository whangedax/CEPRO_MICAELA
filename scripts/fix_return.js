const fs = require('fs');
['tests/m01_tests.js', 'tests/m02_tests.js', 'tests/m03_tests.js', 'tests/m04_tests.js'].forEach(f => {
  const p = require('path').join(__dirname, '..', f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/if \(item === 'vendor'\) return;/g, "if (item === 'vendor') return [];");
    fs.writeFileSync(p, content);
  }
});
console.log('Fixed return');
