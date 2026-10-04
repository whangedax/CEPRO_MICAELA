const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

console.log('=== SINCRONIZANDO HASHES Y ESTADOS DE MANIFIESTOS PDF ===');

for (let i = 1; i <= 21; i++) {
  const numStr = String(i).padStart(2, '0');
  const manifestPath = path.join(ROOT, 'app', 'data', 'pdf-manifests', `TMPL-${numStr}.json`);
  if (!fs.existsSync(manifestPath)) {
    console.error(`No existe el manifiesto: ${manifestPath}`);
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const relativePdf = manifest.canonicalPdf.replace(/^\//, '');
  const pdfPath = path.join(ROOT, relativePdf);

  if (!fs.existsSync(pdfPath)) {
    console.error(`No existe el archivo PDF: ${pdfPath}`);
    continue;
  }

  const actualSha256 = crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
  const oldSha256 = manifest.sha256;
  manifest.sha256 = actualSha256;

  // Asegurar rendererStatus para TMPL-06 a TMPL-10 (asistencia modular UD2-UD6 ya implementada)
  if (i >= 6 && i <= 10 && !manifest.rendererStatus) {
    manifest.rendererStatus = 'RENDERER_IMPLEMENTED';
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`✓ TMPL-${numStr}: SHA-256 actualizado de [${oldSha256.slice(0, 10)}...] a [${actualSha256.slice(0, 10)}...] (rendererStatus: ${manifest.rendererStatus || 'N/A'})`);
}

console.log('=== SINCRONIZACIÓN COMPLETADA CON ÉXITO ===');
