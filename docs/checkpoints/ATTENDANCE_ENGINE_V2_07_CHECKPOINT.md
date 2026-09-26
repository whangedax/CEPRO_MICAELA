# ATTENDANCE-ENGINE-V2-07 — checkpoint

Fecha: 2026-09-16  
Estado: PASS técnico; `ATTENDANCE_ENGINE_IMPLEMENTED=YES`; `PRODUCTIVE_ATTENDANCE_ENABLED=NO`; `OFFICIAL_ATTENDANCE_POLICY=BLOCKED_B003`.

Evidencia: suite específica 50/50; regresión global 1287/1287 en 53 suites; failed=0; 21 PDF canónicos intactos. Runtime candidato antes/después: schema 2, 18 stores, 269/295/295/12/7/14/0/0 y `asistencia=0`. Las escrituras ATT07 ocurrieron exclusivamente en DBs `CETPRO_V2_ATTENDANCE_LAB_*`; CETPRO_DB no fue abierta con schema2, migrada, restaurada ni escrita.

## SHA-256 principal

| Archivo | SHA-256 |
|---|---|
| `app/js/services/attendance-v2-domain.js` | `2d13fff95b55ff128be3fc5dcf4ec504af03671b2b8b2d04b3dc7436ab238d3c` |
| `app/js/repositories/attendance-v2-repository.js` | `d7ec39d0124638bdbaf1f23810b869a322bea004fe00587a23ccbf948076e5b6` |
| `app/js/services/attendance-session-service.js` | `e832e89abe13343dc308abdbf385a87e5851599ab546b10223aa340e96afbaba` |
| `app/js/services/attendance-mark-service.js` | `3b9b678010521895928ac121e9e2bd0b2ab71cf2fcc459bb11932c05fda82659` |
| `app/js/services/attendance-summary-service.js` | `d78faf43af07ee413d8124ce8780cdeba0c1cf9c87aa0d6816899cabb15c1754` |
| `app/js/services/attendance-document-context-service.js` | `9b2c02ff7e81c5cfa4fc2af7d3bec8272630cc644b1752a69973e6d18b5ee1ac` |
| `app/js/services/document-data-service.js` | `934115001ef0d56f9abf553c99bcd2a3aeca31de4f475c624af0d9eea215ab7d` |
| `app/js/services/system-integrity-service.js` | `95873b6f5706628810ac095edd72b93bebdaba86fac71737e75fa2401daee5ca` |
| `app/js/services/document-fit-service.js` | `344adab6ac948c7b1454108f8bd373e928ee56254c097c7e25234885fa7eb430` |
| `app/data/pdf-manifests/TMPL-05.json` | `3edb2dcaba59dd2d9107dd8748711f83832e1858c0a9875249264b1ebc3e7f7c` |
| `app/data/pdf-manifests/TMPL-06.json` | `f8338a3ece5d12592f7a1dac0f2df782f8073fbcbf12273ffd185e3fee1ec2cd` |
| `app/data/pdf-manifests/TMPL-07.json` | `3d8138bc20e765c3bae60acd752c9b17280cebef531cecd9477f5d34b3d53891` |
| `app/data/pdf-manifests/TMPL-08.json` | `6119a7588eb57e0dd09a9315622c63aa61a5e9d3ef7470da4e9c48d186524520` |
| `app/data/pdf-manifests/TMPL-09.json` | `3a86bc6cc125d30778eaf295d2806eba841288b54276bb64eb08a4a437eb5b07` |
| `app/data/pdf-manifests/TMPL-10.json` | `891c401b09a16d297b338bef14b09d025ab8504d36a39047aa5a7aadddba004d` |
| `tools/attendance-qa.html` | `c2a3c96808409fdd9e5617ad3cee1daacb9c66690725c813f0f69e6d428041e5` |
| `tools/attendance-qa.css` | `248533622857ffee7eb5eb0b78caac733307c8a19f9b2a87c44cf3bff3759b30` |
| `tools/attendance-qa.js` | `199e88b4e114245c8e15a77e1c2f89f690969673d4e3aabfbc5fef32598389a2` |
| `tests/attendance_engine_v2_07.regression.js` | `e18b212eb2df291e2c98e2e053a92fd19bd712ecb056ddeb617f65a484fa386c` |
| `docs/ATTENDANCE_ENGINE_V2.md` | `d6398631583f5589b84514619d545b188ce45fb64bf8a7137d5850dd966da934` |
| `docs/ATTENDANCE_DATA_MODEL.md` | `4333e28bfe1275d4d3037c72a7f99eeeca21661ff2ba29e4d29ab9751e497945` |
| `docs/ATTENDANCE_POLICY_BOUNDARY.md` | `1707e1a791df81276f69f4867f765231db64a7b2feef0c1391710b709cb9f24c` |
| `docs/ATTENDANCE_DOCUMENT_BINDING.md` | `87feb775abdc09f30b6204e2215ff5cb2183043bb9b2eb270630d9171667df07` |
| `tests/results/ATTENDANCE_ENGINE_V2_07_TEST_RESULT.md` | `f9f08feff5f3fd463ce9b6ff9071a37951b0e168da59ef3d2280fe0ee6a39209` |

No contiene backup real, nombres, documentos personales ni payloads de `CETPRO_V2_CANDIDATE`. Los datos de prueba son sintéticos.
