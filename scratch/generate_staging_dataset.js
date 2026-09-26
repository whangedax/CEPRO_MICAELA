const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoPath = 'c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2';
const appDataDir = 'C:/Users/whangedax/.gemini/antigravity/brain/3d692a52-da89-4158-a53b-05a0109624c6/scratch';

// Re-run scratch/audit_m04_rows.js to generate detail
console.log("Running audit_m04_rows.js...");
execSync(`node "${path.join(appDataDir, 'audit_m04_rows.js')}"`, { cwd: repoPath, stdio: 'inherit' });

// Check in repoPath scratch first, then appDataDir
let rowsJsonPath = path.join(repoPath, 'scratch/audit_rows_detail.json');
if (!fs.existsSync(rowsJsonPath)) {
  rowsJsonPath = path.join(appDataDir, 'audit_rows_detail.json');
}

const detailedRows = JSON.parse(fs.readFileSync(rowsJsonPath, 'utf8'));

// Ensure app/js/data directory exists
const dataDir = path.join(repoPath, 'app/js/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Convert to ES Module data file: app/js/data/staging-data.js
const outPath = path.join(dataDir, 'staging-data.js');

const jsContent = `/**
 * Dataset estático trazable M04 extraído directamente de sources/raw/BD.zip
 * Lote: IMP-BD-2026-001
 * SHA-256 de BD.zip verificado.
 */

export const STAGING_DATA = ${JSON.stringify(detailedRows, null, 2)};
`;

fs.writeFileSync(outPath, jsContent, 'utf8');
console.log(`Generated app/js/data/staging-data.js with ${detailedRows.length} rows (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
