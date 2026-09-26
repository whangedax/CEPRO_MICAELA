# NIGHT-CHAIN-DOCUMENTS-HARDENING-04 — checkpoint

Fecha: 2026-09-15
Estado: PASS técnico; READY_FOR_PRODUCTION=NO.

Evidencia: Fase 1 101/101; Fase 2 21/21; global 1171/1171 en 50 suites; 21 PDF canónicos intactos. CETPRO_DB no fue abierta, migrada ni escrita.

## SHA-256 de archivos modificados

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-04.json` | `337d8c77f556451eece7521a30bb48390fb8fa72c49995514655601026194026` |
| `app/data/pdf-manifests/TMPL-05.json` | `d7d467ec4fce2b76f62c0a8ca8b55442f4ee8184a1140cd8e4e36564118fa5ce` |
| `app/data/pdf-manifests/TMPL-06.json` | `5083337653cd4e36a301777b8c48eaca2ce5f9257c6b7c096c18c882640b7762` |
| `app/data/pdf-manifests/TMPL-07.json` | `267dcdf20dd40a42581f9aaa25c55bb636966a17c803ff6c5442659fc4feb596` |
| `app/data/pdf-manifests/TMPL-08.json` | `bd105744d259a2138c25757f27ff76ec7b1cd66b298724e3350104dcc7654cb3` |
| `app/data/pdf-manifests/TMPL-09.json` | `0ef094f9915275b951898da3a3cfde919e0c480164471e0d22df147375069318` |
| `app/data/pdf-manifests/TMPL-10.json` | `32f280affad061d54768b73edbeb81fd32b23561b78a9c865720785dc74d6e77` |
| `app/data/pdf-manifests/TMPL-11.json` | `093d5022bf307b7b8c999174100c391961d54000162970f08af9c12098d076e2` |
| `app/data/pdf-manifests/TMPL-12.json` | `deaea2a2160dd80eed40c7a5ed110fb4cbf42014ff5daac6e7bc865327c34f9d` |
| `app/data/pdf-manifests/TMPL-13.json` | `f7833cd4fd98193e23f89374853062d0f408fd54fed4d3eeaa1c3f75c194214c` |
| `app/data/pdf-manifests/TMPL-14.json` | `5ea42e77031b121a1c0308830275fbd0de4d901cc5f09cff1f3c521271a60a41` |
| `app/data/pdf-manifests/TMPL-15.json` | `6012b15f7cb6f494747e32d027e9d0a11b400165c3a5dbe3acf5215f991e5ba0` |
| `app/data/pdf-manifests/TMPL-16.json` | `b8c3a338564afe40d86c203e4ffe06ca3e446278f024a1183f4a90307e3f000c` |
| `app/data/pdf-manifests/TMPL-17.json` | `2003fc116c126aab79c37e0b3915d864a47badfce4fc5b111325d6c2b81db175` |
| `app/data/pdf-manifests/TMPL-18.json` | `308b39345caff8063a5ed7fa7e72c0409ef5e30f93876b8184385efb3c002520` |
| `app/data/pdf-manifests/TMPL-19.json` | `42f5f8f5731a522a4cc8d254a14ba47dcfc56f99b0143364cbac6462a9c64ccc` |
| `app/data/pdf-manifests/TMPL-20.json` | `7c02ed7402274fa3a85d32a9efc58d60619d18e16eed51c1561b05bdfbe5318f` |
| `app/data/pdf-manifests/TMPL-21.json` | `8ae12964eaf231b7f28d5fce464f35e7604dff4cb5d1d436ba0e268f0c32cdf1` |
| `app/js/services/pdf-template-engine.js` | `09f4b4bffdfe5c29042f91ec34b7b16d3e67a8568977f6427f6dc01764c25050` |
| `app/js/services/v2-document-manifest-registry.js` | `2cfe5f94acfca2664056ffb6079ec1bd8f60111d57e8a251ad4740d557c4e1d2` |
| `app/js/services/template-registry.js` | `b9ab37737afc2eb30980f4b47a94434440b393779bcb9b17b7e7372ea5bb3940` |
| `app/js/services/system-integrity-service.js` | `52321095537d3e1c7131922765de0f9e315a459252abcb8fa7201a1f24c22167` |
| `scripts/audit_pdf_geometry_boxes.py` | `952c23ef6af1178d69ef8728983f2e6b4db906f70a462afc99d3b11864e4be47` |
| `scripts/apply_document_renderer_geometry.js` | `a4ce5931d57c0fa8b16bc0a3e3f3a172026fc36c0cdf6a83e13f669539123c5d` |
| `scripts/verify_v2_system_health.js` | `12f98763d52e7c6b7f919c4f24939eb313ec5c302eac76dbd31f4d7eea217b1a` |
| `scripts/generate_night_chain_checkpoint.js` | `d04f5930ac2bebde85fa82f1877755951ebcca14ed4b094aa96e00f2032ac447` |
| `scripts/cleanup_renderer_build_02_temp.js` | `030b433b30d9d400fcb5278d174cea7640fd732040ea4a910d82dc817227b72f` |
| `tests/helpers/document_renderer_build_02.js` | `39cf98911377245dad8d43ee065dc5a1b09ad813912d124acf4ac7993ff26dde` |
| `tests/document_renderer_build_02_a.regression.js` | `40b036f9b1642234d4be92c41f41435742d1da73206d6bc23d61fd8f86ba8b08` |
| `tests/document_renderer_build_02_b.regression.js` | `1f4802cfdd9ea5002cf4b08ef3b3cb54a2a043f8031cc1cae6555465b7af845b` |
| `tests/document_renderer_build_02_c.regression.js` | `4686143e029bb9cc9d4447cf48a10e0e64f2c80601e39ebe338d1ff5ff681489` |
| `tests/document_renderer_build_02_d.regression.js` | `6cf6a86277b37ce8229780a750b4d472fa535779570c7ebdfa9aba4a080008d4` |
| `tests/document_renderer_build_02_e.regression.js` | `d69b195f986225a06fad103e191710c98972346198fc6df4a92639c62ca44584` |
| `tests/document_renderer_build_02_f.regression.js` | `740f061d2366d085f5c9cc184e2ed47a519c6689884e517539b1256114256ac7` |
| `tests/document_renderer_build_02_g.regression.js` | `b9c01ebb6465575560f7ee48c30eb9768fbc0558340f1d0dab969e5791c9b381` |
| `tests/night_v2_end_to_end_hardening_03.regression.js` | `8b7d82e962ddb12ce85bdece61e3617908451a6dd7af6bfcf64454687e957086` |
| `tests/results/DOCUMENT_RENDERER_BUILD_02_TEST_RESULT.md` | `62d5145a3825e0b7630b9ad0981d4ff46259a78b5c3b209a684c72ea3ac3eb4b` |
| `tests/results/NIGHT_V2_END_TO_END_HARDENING_03_TEST_RESULT.md` | `59e6b1f5fe26ef95afbd3877f79e09f9a1deeb3209d4dcc1581af519513cb581` |
| `tests/TEST_MATRIX.md` | `af28f3580cb69c02e987b2f3460e6089c370d19c1dc4e5d368336149dc473cca` |
| `docs/PROJECT_STATE.md` | `f22e26f926003399a1083e4397320960a97c9d1d72d0b830f20ab5b0c9c74f34` |
| `docs/DECISIONS.md` | `4f40be6303088f213d288704e0e9eb777ff21b5306b2713e7a2b12e15a700eac` |
| `docs/ISSUES.md` | `cbfc08fa03d9a8f060475d71b563aabbd95c5fc79a0c00c228382e7179dbd672` |
| `docs/FEATURE_TEST_COVERAGE.md` | `a779d03c5bbfb0a598c3c887808bba5fa80baac6e247fe3e94b314ff2d53cef5` |
| `docs/DOCUMENT_RENDERER_BUILD_02_RESULT.md` | `c3e60c02658f4a836a7753311707e4b9556582b6315251f0ab495a966f390bc2` |
| `docs/NIGHT_CHAIN_DOCUMENTS_HARDENING_04_REPORT.md` | `d64b94cbb86ff383aa958a79cdf7461c2d74e8685fcc9ebb8e18a9a235d53873` |
| `docs/V2_SYSTEM_ARCHITECTURE.md` | `531969b9effc70f787838d9fa8e289926a39bcb771aefc9f2c1282ef409cdf4d` |
| `docs/V2_DATA_AUTHORITY.md` | `c4c95980183683f2127472623912f09e9971c6e8d5e5747655167eff38067ede` |
| `docs/V2_INTEGRITY_MODEL.md` | `c400dabb5f3104e11cb6138207f50693bab9dea50425c984a5bad0c7a2fe0c5c` |
| `docs/V2_ERROR_HANDLING.md` | `00bb3971d6c661185d3dd622e32ff686abe91e5937142c02d89ca7654ad01d4e` |
| `docs/V2_OFFLINE_RUNTIME.md` | `56659796d9007d422bb34f0f4042119d06879e30b8af8ebb1a0c5d51584dab68` |
| `docs/OFFLINE_PORTABILITY_PLAN.md` | `0b8bcea0b10c3f6a73537e550fc33fa58f1c521b79b1e0c9fbc3a21787d0dae1` |
| `docs/V2_RELEASE_GATES.md` | `72d8b5db576e86e6190c899d9c067f2330f243efe70fe132b6b0a5138cd85852` |

No contiene backup real, PII ni fixtures con personas reales.
