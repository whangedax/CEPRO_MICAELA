const fs = require('fs');
const path = require('path');

const repoPath = 'c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2';
const appDataDir = 'C:/Users/whangedax/.gemini/antigravity/brain/3d692a52-da89-4158-a53b-05a0109624c6/scratch';

let rowsJsonPath = path.join(appDataDir, 'audit_rows_detail.json');
if (!fs.existsSync(rowsJsonPath)) {
  rowsJsonPath = path.join(repoPath, 'scratch/audit_rows_detail.json');
}

const rows = JSON.parse(fs.readFileSync(rowsJsonPath, 'utf8'));

console.log(`=== AUDITORÍA M04.1 — ANÁLISIS DE DATOS (${rows.length} FILAS) ===\n`);

// 1. Coordinates check
const coordsSet = new Set();
let dupCoords = 0;
rows.forEach(r => {
  const coord = `${r.archivoOrigen}::${r.hojaOrigen}::${r.filaOrigen}`;
  if (coordsSet.has(coord)) {
    console.error(`COORDENADA DUPLICADA DETECTADA: ${coord}`);
    dupCoords++;
  }
  coordsSet.add(coord);
});
console.log(`Coordenadas únicas: ${coordsSet.size} / ${rows.length} (Duplicadas: ${dupCoords})\n`);

// 2. Empty DNI rows inspection
const emptyDniRows = rows.filter(r => !r.numeroDocumentoOriginal || r.numeroDocumentoOriginal.trim() === '');
console.log(`--- FILAS CON DOCUMENTO VACÍO (${emptyDniRows.length}) ---`);
emptyDniRows.forEach(r => {
  console.log(`  ID: ${r.id} | Archivo: ${r.archivoOrigen} | Hoja: ${r.hojaOrigen} | Fila: ${r.filaOrigen} | Nombre: "${r.nombreCompletoOriginal}"`);
});
console.log('');

// 3. Atypical DNI rows inspection (<8 or >8 digits or non-numeric)
const atypicalDniRows = rows.filter(r => {
  const dni = (r.numeroDocumentoOriginal || '').trim();
  const norm = dni.replace(/\D/g, '');
  return dni !== '' && (norm.length !== 8 || dni !== norm);
});
console.log(`--- FILAS CON DOCUMENTO ATÍPICO (${atypicalDniRows.length}) ---`);
atypicalDniRows.forEach(r => {
  console.log(`  ID: ${r.id} | Archivo: ${r.archivoOrigen} | Fila: ${r.filaOrigen} | DNI Orig: "${r.numeroDocumentoOriginal}" | Norm: "${r.numeroDocumentoNormalizado}" | Nombre: "${r.nombreCompletoOriginal}"`);
});
console.log('');

// 4. DNI Grouping Analysis
const dniGroups = {};
rows.forEach(r => {
  const dni = (r.numeroDocumentoNormalizado || r.numeroDocumentoOriginal || '').trim();
  if (dni) {
    if (!dniGroups[dni]) dniGroups[dni] = [];
    dniGroups[dni].push(r);
  }
});

const uniqueDnis = Object.keys(dniGroups);
console.log(`Documentos únicos distintos (excluyendo vacíos): ${uniqueDnis.length}`);

// Valid 8-digit DNI count
const valid8DigitDnis = uniqueDnis.filter(d => d.length === 8 && /^\d+$/.test(d));
console.log(`Documentos DNI únicos válidos de 8 dígitos: ${valid8DigitDnis.length}`);

// Atypical DNI count among unique DNIs
const atypicalUniqueDnis = uniqueDnis.filter(d => d.length !== 8 || !/^\d+$/.test(d));
console.log(`Documentos DNI únicos atípicos: ${atypicalUniqueDnis.length}`);
atypicalUniqueDnis.forEach(d => {
  console.log(`  DNI atípico único: "${d}" (${dniGroups[d].length} apariciones)`);
});
console.log('');

// Multi-matricula DNI groups (repeated DNI)
const multiMatriculaGroups = Object.entries(dniGroups).filter(([dni, group]) => group.length > 1);
console.log(`--- DNI REPETIDOS (MULTI-MATRÍCULA) ---`);
console.log(`Grupos de DNI repetidos (DNI con >1 matrícula): ${multiMatriculaGroups.length}`);
let totalRowsInMultiGroups = 0;
multiMatriculaGroups.forEach(([dni, group]) => {
  totalRowsInMultiGroups += group.length;
});
console.log(`Total de filas pertenecientes a DNI repetidos: ${totalRowsInMultiGroups}`);
console.log(`Total de matrículas 'adicionales' (filasTotales - dniÚnicos en estos grupos): ${totalRowsInMultiGroups - multiMatriculaGroups.length}\n`);

// 5. Name Discrepancy Analysis (7 vs 6 cases)
console.log(`--- ANÁLISIS DE LAS DISCREPANCIAS DE NOMBRE EN MISMO DNI ---`);
const nameDiscrepancyGroups = [];
multiMatriculaGroups.forEach(([dni, group]) => {
  const names = new Set(group.map(r => r.nombreCompletoOriginal.toUpperCase().trim()));
  if (names.size > 1) {
    nameDiscrepancyGroups.push({
      dni,
      count: group.length,
      names: Array.from(names),
      rows: group
    });
  }
});

console.log(`Total grupos de DNI con discrepancias/variaciones de nombre: ${nameDiscrepancyGroups.length}`);
nameDiscrepancyGroups.forEach((g, idx) => {
  const maskedDni = g.dni.substring(0, 2) + '****' + g.dni.substring(6);
  console.log(`Case ${idx + 1}: DNI ${maskedDni} (${g.dni}) | Regs: ${g.count} | Variantes: ${JSON.stringify(g.names)}`);
  g.rows.forEach(r => {
    console.log(`   -> ${r.archivoOrigen} (Fila ${r.filaOrigen}): "${r.nombreCompletoOriginal}"`);
  });
});

fs.writeFileSync(path.join(repoPath, 'scratch/m04_1_audit_math.json'), JSON.stringify({
  totalRows: rows.length,
  coordsUnique: coordsSet.size,
  emptyDniCount: emptyDniRows.length,
  atypicalDniCount: atypicalDniRows.length,
  uniqueDniCount: uniqueDnis.length,
  valid8DigitDnisCount: valid8DigitDnis.length,
  atypicalUniqueDnisCount: atypicalUniqueDnis.length,
  multiMatriculaGroupsCount: multiMatriculaGroups.length,
  totalRowsInMultiGroups,
  extraRowsInMultiGroups: totalRowsInMultiGroups - multiMatriculaGroups.length,
  nameDiscrepancyGroupsCount: nameDiscrepancyGroups.length,
  nameDiscrepancyGroups: nameDiscrepancyGroups.map(g => ({
    dniMasked: g.dni.substring(0, 2) + '****' + g.dni.substring(6),
    dniFull: g.dni,
    count: g.count,
    names: g.names
  }))
}, null, 2));
