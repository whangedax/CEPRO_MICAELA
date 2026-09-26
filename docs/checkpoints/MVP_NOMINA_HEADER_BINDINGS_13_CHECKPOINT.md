# Checkpoint Formal — MVP-NOMINA-HEADER-BINDINGS-13

Fecha: 2026-09-17

## Alcance ejecutado y verificado

- Mapeo vectorial de 8 campos físicos de cabecera en TMPL-01 (`TMPL01_PDF_FIELDS.json`).
- AutoFit tipográfico dinámico y seguro (8pt nominal a 4.0pt/5.0pt mínimo según caja) en `pdf-template-engine.js`.
- Tratamiento limpio de valores no asignados o `PENDIENTE`: las celdas quedan vacías, sin imprimir literales `undefined`, `null` ni `PENDIENTE`.
- Extensión del Formulario B (`academic-configuration-view.js`) y servicio (`mvp-admin-service.js`) para capturar y persistir Turno, Ciclo y Sección en `grupos_academicos` bajo firma obligatoria de procedencia (`sourceType`, `sourceDescription`, `confirmedBy`) y registro inmutable en `auditoria`.
- Saneamiento y purga controlada de periodos espurios en `CETPRO_V2_CANDIDATE` vía `tools/sanitize-candidate-db.html`.
- Verificación de nómina multipágina limpia de 70 alumnos (3 páginas físicas 30 + 30 + 10) sin periodos/fechas asignadas.
- Preservación estricta de aislamiento: `CETPRO_DB` (puerto 8080) y producción v1 100% intocados.
- Inmutabilidad de los 21 PDFs canónicos (21/21 hashes SHA-256 idénticos).

## Línea base SHA-256 de archivos intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/TMPL01_PDF_FIELDS.json` | `a1ec6fb249be998769447d0f481ba49eed112a6df48fddcfa2a09fc43429b63c` |
| `app/js/services/pdf-template-engine.js` | `bd434529a59dff12ba3f0c3e98c302eb8373651aaa5e4be1c846097a9234d200` |
| `app/js/ui/academic-configuration-view.js` | `7d71cdb4ff825965d70e825799d5211877620ec4c106fa221bb9700befca4691` |
| `app/js/services/mvp-admin-service.js` | `7e7cadbb35a5250e09453c68e331c406e02bd58bbe907d04818fbdd8846ab46c` |
| `tools/sanitize-candidate-db.html` | `7e51944c2735fbcaa2bbf3ddec153c7ac60006102d4c463ad85db2e3555fff35` |
| `tests/mvp_nomina_header_bindings_13.regression.js` | `ea4ac59db15d2c3320c33ab7d824ea16d760244ebe8de4b48cf67ca5b52d34b9` |
| `tests/mvp_sanitization_verification.regression.js` | `4fff2eb97797587cdb38a0ed786e6e6969704bd90c703f93cbe9ada97d356b80` |
| `scripts/start-edge-physical-acceptance.cmd` | `473f30965e638dbbc1922c2a843513a948e9c8bcfe70360a0494cfd586ae5fba` |
| PDF canónico TMPL-01 | `938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2` |

## Matriz de Resultados de Suites Automatizadas

| Suite de Pruebas | Entorno / Runner | Casos Ejecutados | Resultado |
|---|---|---|---|
| `mvp_nomina_header_bindings_13.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 15 / 15 | **PASSED (100%)** |
| `mvp_sanitization_verification.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 10 / 10 | **PASSED (100%)** |
| `mvp_nomina_continuation_physical_12.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 31 / 31 | **PASSED (100%)** |
| Verificación de Hashes Canónicos 21/21 | Node.js crypto SHA-256 | 21 / 21 | **PASSED (21/21 MATCH)** |

## Estado de Invariantes de la Base Candidata (`CETPRO_V2_CANDIDATE`)

- **Estudiantes:** 269 registros reales únicos.
- **Matrículas:** 295 registros (relación 1:1 con staging).
- **Grupos Académicos:** 12 grupos.
- **Periodos:** 0 registros (`periodos.count() === 0`).
- **Unidades:** 0 registros (`unidades.count() === 0`).
- **Referencias huérfanas en grupos:** 0 (`periodoId === null`).

## Verificación de Lanzadores Locales y Modo DEMO

- **Lanzador Windows:** `scripts/start-edge-physical-acceptance.cmd` opera 100% offline con rutas relativas (`cd /d "%~dp0.."`), iniciando ambos servidores sin colisiones (8080 para v1 y 8081 para v2/DEMO/QA).
- **Modo DEMO (`http://127.0.0.1:8081/#/demo`):** Carga determinista de 40 estudiantes sintéticos (`EST-DEMO-001` a `EST-DEMO-040`), 65 matrículas, 2 grupos, periodo DEMO y 12 unidades didácticas simuladas. Cada registro tiene `official = false` y `demo = true`. Cero exposición de PII real.
- **Herramienta de Saneamiento Web:** `http://127.0.0.1:8081/tools/sanitize-candidate-db.html` operativa y verificada.

## Certificación

- `AUTOMATED_EDGE_HEADLESS = PASS`
- `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING`
