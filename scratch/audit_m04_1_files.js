const fs = require('fs');
const path = require('path');

const appDataDir = 'C:/Users/whangedax/.gemini/antigravity/brain/3d692a52-da89-4158-a53b-05a0109624c6/scratch';
const rows = JSON.parse(fs.readFileSync(path.join(appDataDir, 'audit_rows_detail.json'), 'utf8'));

const fileMap = {};

rows.forEach(r => {
  if (!fileMap[r.archivoOrigen]) {
    fileMap[r.archivoOrigen] = {
      archivo: r.archivoOrigen,
      hoja: r.hojaOrigen,
      minRow: r.filaOrigen,
      maxRow: r.filaOrigen,
      count: 0
    };
  }
  const f = fileMap[r.archivoOrigen];
  if (r.filaOrigen < f.minRow) f.minRow = r.filaOrigen;
  if (r.filaOrigen > f.maxRow) f.maxRow = r.filaOrigen;
  f.count++;
});

const summary = JSON.parse(fs.readFileSync(path.join(appDataDir, 'm04_audit_summary.json'), 'utf8'));

let totalCand = 0;
let totalDesc = 0;

console.log('=== TABLA DE FILAS CANDIDATAS Y DESCARTADAS POR ARCHIVO ===\n');

summary.fileDetails.forEach(fd => {
  const fm = fileMap[fd.archivo];
  const cand = fm ? fm.count : 0;
  const desc = fd.totalFilasFisicas - cand;
  totalCand += cand;
  totalDesc += desc;

  let motivo = [];
  if (fd.filaHeader !== null) {
    motivo.push(`Encabezado (Fila 1-${fd.filaHeader})`);
  }
  if (fd.filasNumeradasVacias > 0) {
    motivo.push(`${fd.filasNumeradasVacias} casilleros numerados vacíos`);
  }
  const extraTotal = desc - (fd.filaHeader || 0) - fd.filasNumeradasVacias;
  if (extraTotal > 0) {
    motivo.push(`${extraTotal} filas en blanco/totales`);
  }

  console.log(`Archivo: ${fd.archivo}`);
  console.log(`  Hoja: ${fd.hoja}`);
  console.log(`  Primera Fila Candidata: ${fm ? fm.minRow : 'N/A'}`);
  console.log(`  Última Fila Candidata: ${fm ? fm.maxRow : 'N/A'}`);
  console.log(`  Filas Candidatas: ${cand}`);
  console.log(`  Filas Descartadas: ${desc}`);
  console.log(`  Motivo Descarte: ${motivo.join('; ')}\n`);
});

console.log(`TOTAL FILAS CANDIDATAS: ${totalCand}`);
console.log(`TOTAL FILAS DESCARTADAS: ${totalDesc}`);
