const fs = require('fs');
const path = require('path');

function checkFileImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const usages = [];
  let importsGetDB = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('import') && line.includes('getDB')) {
      importsGetDB = true;
    }
    if (line.includes('getDB(')) {
      usages.push(i + 1);
    }
  }

  if (usages.length > 0) {
    console.log(`${filePath}: used getDB() on lines ${usages.join(', ')}. Imports getDB explicitly: ${importsGetDB}`);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.js')) {
      checkFileImports(fullPath);
    }
  }
}

scanDir('c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/app/js');
