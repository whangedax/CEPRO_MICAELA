const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importLines = content.split('\n').filter(l => l.trim().startsWith('import'));
  
  // Extract all imported specifiers
  const importedSymbols = new Set([
    'window', 'document', 'console', 'localStorage', 'sessionStorage', 'alert', 'confirm',
    'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', 'Date',
    'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Error',
    'TypeError', 'SyntaxError', 'RangeError', 'ReferenceError', 'Set', 'Map', 'URL',
    'URLSearchParams', 'Event', 'CustomEvent', 'Element', 'HTMLElement', 'HTMLInputElement',
    'HTMLSelectElement', 'FormData', 'Blob', 'FileReader', 'Image', 'Audio', 'parseInt',
    'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'btoa',
    'atob', 'indexedDB', 'IDBDatabase', 'IDBTransaction', 'IDBIndex', 'IDBObjectStore',
    'IDBKeyRange', 'IDBCursor', 'this', 'super', 'exports', 'module', 'require'
  ]);

  // Regex to match imports: import { A, B } from '...'; import C from '...';
  for (const imp of importLines) {
    const namedMatch = imp.match(/import\s+\{([^}]+)\}/);
    if (namedMatch) {
      namedMatch[1].split(',').forEach(s => {
        const parts = s.trim().split(/\s+as\s+/);
        importedSymbols.add(parts[parts.length - 1].trim());
      });
    }
    const defaultMatch = imp.match(/import\s+([A-Za-z0-9_$]+)\s+from/);
    if (defaultMatch) {
      importedSymbols.add(defaultMatch[1].trim());
    }
  }

  // Also collect functions and const/let/var declared at top level
  const declarations = content.match(/(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g) || [];
  for (const decl of declarations) {
    const sym = decl.replace(/(?:function|class|const|let|var)\s+/, '').trim();
    importedSymbols.add(sym);
  }

  // Find PascalCase or camelCase global calls like SomeService.method or someFunc()
  const lines = content.split('\n');
  const issues = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) continue;
    
    // Check function calls: fooFunc(...)
    const funcCalls = line.matchAll(/\b([A-Z][A-Za-z0-9_$]*|[a-z][A-Za-z0-9_$]*)\s*\(/g);
    for (const match of funcCalls) {
      const sym = match[1];
      if (!importedSymbols.has(sym) && !['if', 'for', 'while', 'switch', 'catch', 'typeof', 'void', 'delete'].includes(sym)) {
        issues.push({ line: i + 1, symbol: sym, context: line.trim() });
      }
    }

    // Check class usages: New ClassName() or ClassName.staticMethod
    const classUsages = line.matchAll(/\b([A-Z][A-Za-z0-9_$]*)\./g);
    for (const match of classUsages) {
      const sym = match[1];
      if (!importedSymbols.has(sym)) {
        issues.push({ line: i + 1, symbol: sym, context: line.trim() });
      }
    }
  }

  if (issues.length > 0) {
    console.log(`=== ${filePath} ===`);
    issues.forEach(iss => console.log(`  Line ${iss.line}: '${iss.symbol}' might be undefined -> ${iss.context}`));
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
      checkFile(fullPath);
    }
  }
}

scanDir('c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/app/js');
