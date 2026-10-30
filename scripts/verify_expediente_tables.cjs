const fs = require('fs');
const path = require('path');

const targetDocs = [
  '01_DATOS_INSTITUCIONALES.md',
  '02_PROGRAMAS_CURRICULARES.md',
  '03_PERSONAL_DOCENTE.md',
  '04_CALENDARIO_HORARIOS.md',
  '05_REGLAS_EVALUACION.md',
  '06_CONFIGURACION_EFSRT.md',
  '07_DOCUMENTOS_OFICIALES.md'
];

let totalErrors = 0;

for (const docName of targetDocs) {
  const filePath = path.join(__dirname, '../docs/expediente-configuracion', docName);
  if (!fs.existsSync(filePath)) {
    console.log('[SKIP] File not found yet: ' + docName);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inTable = false;
  let tableHeaderCols = 0;
  let lineNum = 0;
  let docErrors = 0;

  for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cols = trimmed.split('|').slice(1, -1);
      if (!inTable) {
        inTable = true;
        tableHeaderCols = cols.length;
        if (tableHeaderCols !== 8) {
          console.error('[ERROR] ' + docName + ':' + lineNum + ' Table header has ' + tableHeaderCols + ' columns instead of 8.');
          docErrors++;
          totalErrors++;
        }
      } else {
        if (cols.every(c => c.trim().match(/^:?-+:?$/))) {
          continue;
        }
        if (cols.length !== 8) {
          console.error('[ERROR] ' + docName + ':' + lineNum + ' Row has ' + cols.length + ' columns instead of 8. Content: ' + trimmed.substring(0, 60) + '...');
          docErrors++;
          totalErrors++;
        }
      }
    } else {
      inTable = false;
      tableHeaderCols = 0;
    }
  }

  if (docErrors === 0) {
    console.log('[PASS] ' + docName + ': All tables have exactly 8 columns.');
  } else {
    console.log('[FAIL] ' + docName + ': Found ' + docErrors + ' table column errors.');
  }
}

console.log('\nVerification finished. Total errors: ' + totalErrors);
process.exit(totalErrors === 0 ? 0 : 1);
