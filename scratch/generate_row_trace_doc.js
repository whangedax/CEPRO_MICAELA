const fs = require('fs');
const path = require('path');

const repoPath = 'c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2';
const appDataDir = 'C:/Users/whangedax/.gemini/antigravity/brain/3d692a52-da89-4158-a53b-05a0109624c6/scratch';

let rowsJsonPath = path.join(appDataDir, 'audit_rows_detail.json');
if (!fs.existsSync(rowsJsonPath)) {
  rowsJsonPath = path.join(repoPath, 'scratch/audit_rows_detail.json');
}

const rows = JSON.parse(fs.readFileSync(rowsJsonPath, 'utf8'));

let md = `# Matriz de Trazabilidad por Fila — Módulo M04

**Sistema Académico CETPRO Público "Micaela Bastidas Puyucawa"**  
**Lote:** \`IMP-BD-2026-001\`  
**Total Filas Candidatas Analizadas:** 295  

---

## Trazabilidad Biunívoca de Registros (295 Filas Staging)

| N° | ARCHIVO ORIGEN | HOJA | FILA EXCEL | DOCUMENTO | NOMBRE COMPLETO ORIGINAL | CLASIFICACIÓN | INCIDENCIAS DETECTADAS | DECISIÓN EN STAGING |
| :-: | :--- | :--- | :-: | :---: | :--- | :---: | :--- | :--- |
`;

rows.forEach((r, idx) => {
  const n = idx + 1;
  const doc = r.numeroDocumentoOriginal ? `\`${r.numeroDocumentoOriginal}\`` : '*[VACÍO]*';
  const incStr = (r.incidencias && r.incidencias.length > 0) 
    ? r.incidencias.map(i => `\`${i.codigo}\``).join(', ')
    : 'NINGUNA';
  const statusBadge = r.estado === 'LISTO' ? 'CONSERVADO (LISTO)' : 'REVISIÓN (STAGING)';
  
  md += `| ${n} | ${r.archivoOrigen} | ${r.hojaOrigen} | ${r.filaOrigen} | ${doc} | ${r.nombreCompletoOriginal} | REGISTRO_VALIDO | ${incStr} | ${statusBadge} |\n`;
});

fs.writeFileSync(path.join(repoPath, 'docs/M04_ROW_TRACE.md'), md, 'utf8');
console.log(`Generated docs/M04_ROW_TRACE.md with ${rows.length} rows (${(fs.statSync(path.join(repoPath, 'docs/M04_ROW_TRACE.md')).size / 1024).toFixed(1)} KB)`);
