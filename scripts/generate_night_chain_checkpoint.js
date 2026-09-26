const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const files=[
  ...Array.from({length:18},(_,i)=>`app/data/pdf-manifests/TMPL-${String(i+4).padStart(2,'0')}.json`),
  'app/js/services/pdf-template-engine.js','app/js/services/v2-document-manifest-registry.js','app/js/services/template-registry.js','app/js/services/system-integrity-service.js',
  'scripts/audit_pdf_geometry_boxes.py','scripts/apply_document_renderer_geometry.js','scripts/verify_v2_system_health.js','scripts/generate_night_chain_checkpoint.js','scripts/cleanup_renderer_build_02_temp.js',
  'tests/helpers/document_renderer_build_02.js',...['a','b','c','d','e','f','g'].map(x=>`tests/document_renderer_build_02_${x}.regression.js`),'tests/night_v2_end_to_end_hardening_03.regression.js',
  'tests/results/DOCUMENT_RENDERER_BUILD_02_TEST_RESULT.md','tests/results/NIGHT_V2_END_TO_END_HARDENING_03_TEST_RESULT.md','tests/TEST_MATRIX.md',
  'docs/PROJECT_STATE.md','docs/DECISIONS.md','docs/ISSUES.md','docs/FEATURE_TEST_COVERAGE.md','docs/DOCUMENT_RENDERER_BUILD_02_RESULT.md','docs/NIGHT_CHAIN_DOCUMENTS_HARDENING_04_REPORT.md',
  'docs/V2_SYSTEM_ARCHITECTURE.md','docs/V2_DATA_AUTHORITY.md','docs/V2_INTEGRITY_MODEL.md','docs/V2_ERROR_HANDLING.md','docs/V2_OFFLINE_RUNTIME.md','docs/OFFLINE_PORTABILITY_PLAN.md','docs/V2_RELEASE_GATES.md'
];
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex');
if(files.some(file=>!fs.existsSync(path.join(ROOT,file))))throw new Error('Checkpoint: falta un archivo declarado.');
const lines=['# NIGHT-CHAIN-DOCUMENTS-HARDENING-04 — checkpoint','','Fecha: 2026-09-15','Estado: PASS técnico; READY_FOR_PRODUCTION=NO.','','Evidencia: Fase 1 101/101; Fase 2 21/21; global 1171/1171 en 50 suites; 21 PDF canónicos intactos. CETPRO_DB no fue abierta, migrada ni escrita.','','## SHA-256 de archivos modificados','', '| Archivo | SHA-256 |','|---|---|',...files.map(file=>`| \`${file}\` | \`${digest(file)}\` |`),'','No contiene backup real, PII ni fixtures con personas reales.',''];
const target=path.join(ROOT,'docs/checkpoints/NIGHT_CHAIN_DOCUMENTS_HARDENING_04_CHECKPOINT.md');
fs.writeFileSync(target,lines.join('\n'),'utf8');
console.log(`checkpoint files=${files.length}`);
