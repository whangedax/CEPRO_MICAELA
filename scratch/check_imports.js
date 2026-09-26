const fs = require('fs');
const path = require('path');

function checkModuleImports(dir) {
  const files = fs.readdirSync(dir, { recursive: true });
  let checkedCount = 0;
  let errors = 0;

  for (const f of files) {
    if (f.endsWith('.js') && !f.includes('BACKUP')) {
      const fullPath = path.join(dir, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const importRel = match[1];
        if (importRel.startsWith('.')) {
          const resolvedPath = path.resolve(path.dirname(fullPath), importRel);
          if (!fs.existsSync(resolvedPath)) {
            console.error('MISSING IMPORT:', importRel, 'in file', fullPath);
            errors++;
          } else {
            checkedCount++;
          }
        }
      }
    }
  }
  console.log('Checked relative JS imports:', checkedCount, 'Errors:', errors);
}

checkModuleImports('./app/js');
