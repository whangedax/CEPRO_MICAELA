# NIGHT-DOCUMENT-BUILD-01 — resultado de pruebas

Fecha: 2026-09-15.

- Suite dedicada: **60/60 PASSED, 0 FAILED**.
- Regresión dinámica final: **1049/1049 PASSED, 0 FAILED, 42 suites**.
- `node --check`: todos los JavaScript tocados, sin error de sintaxis.
- PDFs canónicos: **21/21 SHA-256 coincidentes**, 24 páginas físicas, 0 bytes modificados.
- Candidata observada por V2-FUNCTIONAL-PARITY-01: `CETPRO_V2_CANDIDATE`, schema 2, 18 stores, 269 estudiantes, 295 matrículas, 295 staging, 12 grupos, 7 programas, 14 módulos, 0 periodos y 0 unidades.
- Seguridad runtime: snapshot completo antes/después de navegación, preflight y preview idéntico; 0 solicitudes externas, 0 HTTP propios fallidos y 0 errores JS propios en la suite candidata.
- QA PDF sintética: TMPL-02 generó Blob PDF nativo; programa largo, Ñ, tildes, apóstrofo y documento alfanumérico permanecieron dentro de caja; `PRIMARY_PERSON_NAME` apareció en negrita sin alterar la geometría histórica. Los artefactos temporales fueron eliminados.

Cobertura dedicada: manifiesto independiente por las 21 fuentes, 24 páginas sin síntesis, ausencia de As-7, capacidades por familia, `CAPACITY_EXCEEDED`, `FIELD_OVERFLOW`, renderer sin DB/repositorios, resolución única con provenance, estados universales, shell sin controles de ingeniería y emisión oficial bloqueada. Los casos de capacidad 0/1/máximo/máximo+1 se ejercitaron en TMPL-01, 05, 11, 12, 18 y 20; el fit textual cubrió vacío, nombres, Ñ, tildes, apóstrofo y documentos 7/8/alfanuméricos.

No se ejecutó migración real, restore productivo, asignación de módulos, creación de periodos/unidades, escritura académica ni emisión oficial. B-001–B-007 conservan su estado.
