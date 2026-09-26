# PHYSICAL-QA-CORRECTIONS-06 — checkpoint

Fecha: 2026-09-16  
Estado: PASS técnico; `PHYSICAL_ACCEPTANCE=PENDING`; `READY_FOR_PRODUCTION=NO`.

Evidencia: suite específica 38/38; regresión global 1237/1237 en 52 suites; failed=0; 21 PDF canónicos intactos. Snapshot `CETPRO_V2_CANDIDATE` antes/después idéntico: schema 2, 18 stores, 269/295/295/12/7/14/0/0. CETPRO_DB no fue objetivo de migración ni escritura.

## SHA-256 principal

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-21.json` | `bd5afb8fe16588677e9e119e6afbffe1d17f5999ca7262a7c9d241fe5d99ca39` |
| `app/js/services/pdf-template-engine.js` | `50471b474935a0f11218a80e03ef29d4db3a4ec52753635ff9c71e90cc40ad1e` |
| `app/js/services/institution-provenance-service.js` | `d7814e7780e38c8035eb97f39e22a32fd13b4a2431a9ef0dc7f55528d1c9064c` |
| `app/js/ui/layout.js` | `5bfeb99d11a49fbf8972a66a2399ec9352c3ba2088e47ec4d6becd2730aa4843` |
| `scripts/apply_document_renderer_geometry.js` | `602ba0533ab9a8d88451c8064438f5c8e1b8204b22453c30f98d5af5b50a401e` |
| `scripts/generate_physical_qa_corrections_06_artifacts.js` | `9ff7911fdfcf58ee37959fd677ac2c54988aa20a03f08c3dccf239738802eae2` |
| `tools/document-renderer-qa.js` | `f52045e757e64f59945fdb1af2ad0cf0a7d314ea1c9e6dd3ecee7981e00d8a52` |
| `tests/physical_qa_corrections_06.regression.js` | `cd199af2d7102cbe96b22c6416d993b543c6df0ff38844d753fc115aec71d1b1` |
| `docs/PHYSICAL_QA_CORRECTIONS_06.md` | `629527a47d24ffc7253e3d23d5f27f48d561e7ac498db5a4ee21cbc6e38cb634` |
| `tests/results/PHYSICAL_QA_CORRECTIONS_06_TEST_RESULT.md` | `f173a874e3cd2beee724a5ae0f29d0c524a996b13c07883ecc9d9db564450ac3` |
| `output/pdf/TMPL-21_NORMAL_TEST_ONLY.pdf` | `c03133598b2c27b91096397f9b2e4e3137a625518edd8b76fd78f5f275729053` |
| `output/pdf/TMPL-21_LONG_TEXT_TEST_ONLY.pdf` | `ea190c3914b47713054800f3ed87f2c6466ecab08fb47f7e73917ab4d720ed8d` |

No contiene backup real ni datos personales. Los PDF/PNG entregables contienen únicamente fixtures sintéticos `TEST_ONLY`.
