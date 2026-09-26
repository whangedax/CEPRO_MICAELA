# PHYSICAL-QA-CORRECTIONS-06 — informe final

Fecha: 2026-09-16  
Estado técnico: COMPLETADO  
Aceptación física humana: `PHYSICAL_ACCEPTANCE = PENDING`

## A. Defecto reproducido TMPL-21 página 1

El PDF sintético previo reprodujo el hallazgo de Edge: `student.fullName` quedaba centrado dentro de una caja iniciada debajo de la línea de “Por cuanto” e invadía el párrafo fijo “Ha cumplido satisfactoriamente…”. `document.officialTitleText` se dibujaba dentro del bloque fijo “POR TANTO”.

## B. Causa raíz

El manifest confundía líneas vectoriales con el borde superior de cajas que continuaban hacia abajo. Las cajas antiguas eran `student.fullName: y=275.75, h=68.94` y `document.officialTitleText: y=344.69, h=64`. Además, `document.registerCode` usaba en página 2 el rectángulo punteado reservado para `LOGO CETPRO`.

## C. Corrección aplicada

Se re-midió el PDF canónico A4 landscape por coordenadas vectoriales y texto fijo. El renderer ahora calcula la caja final de cada texto, exige que permanezca dentro de su caja, la contrasta con regiones `RESERVED/FIXED_TEXT_REGION` y con overlays variables anteriores de la misma página. Un conflicto lanza `GEOMETRY_CONFLICT`; un texto que no cabe lanza `FIELD_OVERFLOW`. No hay truncamiento, elipsis, `scaleX` ni omisión silenciosa.

## D. Cajas modificadas

| Campo | Página | Caja anterior | Caja corregida |
|---|---:|---|---|
| `student.fullName` | 1 | `x=163.42, y=275.75, w=623.93, h=68.94` | `x=163.42, y=255.75, w=623.93, h=20` |
| `document.officialTitleText` | 1 | `x=54.88, y=344.69, w=732.47, h=64` | `x=54.88, y=318, w=732.47, h=26.69` |

## E. Defecto página 2

El código sintético se imprimía dentro del placeholder punteado de `LOGO CETPRO`, encima del área reservada del logo.

## F. Causa y corrección página 2

La caja `x=374.29, y=89.92, w=103.58, h=61.45` correspondía físicamente al logo, no a una caja inequívoca de código. Se eliminó `document.registerCode` de `physicalFields` y se registraron por separado el placeholder de logo, el rótulo fijo del registro y la firma como regiones reservadas/fijas.

## G. Campos REVIEW_REQUIRED

`document.registerCode` conserva `geometryStatus=REVIEW_REQUIRED` y no se pinta. `document.directorSignature` también continúa sin caja física verificable. No se inventó identificación institucional ni otro contenido para la página 2.

## H. Regresión TMPL-19/TMPL-20

- TMPL-19 conserva exactamente dos páginas, distribución 20+20 y casos 1/20/21/40; 41 produce `CAPACITY_EXCEEDED`.
- TMPL-20 conserva exactamente dos páginas y casos 0/1/8; 9 produce `CAPACITY_EXCEEDED`.
- No se modificó ninguna coordenada de estas plantillas.

## I. Regresión TMPL-04/05/11/18

Los hashes de los cuatro manifests permanecen idénticos al checkpoint anterior. Se conservaron capacidades 40/47/40 para TMPL-05/11/18. Porcentaje de inasistencia, IL1–IL5/Logro y criterios EFSRT ambiguos continúan `REVIEW_REQUIRED`; no se inventaron reglas ni geometrías.

## J. Estado TMPL-01/02/03

- TMPL-01 sigue generable solo en QA y bloqueada en la aplicación normal.
- TMPL-02 conserva 11 bindings y el flujo matrícula → preflight → `resolvedFieldSet` → PDF → visor/descarga/impresión.
- TMPL-03 continúa `REVIEW_REQUIRED` y el harness no genera PDF.

## K. Provenance UX de Configuración

Los cinco campos administrativos conservan sus valores y `confirmedSources`. La interfaz distingue `CONFIRMADO`, `REVISIÓN DE FUENTE`, `VACÍO` y `CAMBIO NUEVO — REQUIERE CONFIRMACIÓN`. La casilla aplica únicamente a cambios nuevos; no confirma ni invalida automáticamente valores existentes.

## L. Suite dedicada

`PHYSICAL_QA_CORRECTIONS_06`: 38/38, failed=0. Incluye cuatro nombres sintéticos, AutoFit, overflow, colisión reservada, regresiones documentales, provenance A/B/C/D, offline/seguridad, hashes y snapshot DB antes/después.

## M. Regresión global

`node scripts/verify_project.js`: 1237/1237 en 52 suites, failed=0. Los totales provienen del runner y no están hardcodeados en su lógica.

## N. Hashes canónicos

21/21 PDF canónicos conservan el SHA-256 declarado en sus manifests. Ningún PDF/XLSX fuente fue sobrescrito, recomprimido o modificado.

## O. Snapshot DB antes/después

`CETPRO_V2_CANDIDATE`: schema 2, 18 stores, 269 estudiantes, 295 matrículas, 295 staging, 12 grupos, 7 programas, 14 módulos, 0 periodos y 0 unidades. El fingerprint completo antes/después fue idéntico; módulos/periodos de grupos permanecen nulos y asistencia/evaluación/EFSRT permanecen en cero. `CETPRO_DB` no fue objetivo de la suite ni de la implementación.

## P. Archivos modificados o creados

- `app/data/pdf-manifests/TMPL-21.json`
- `app/js/services/pdf-template-engine.js`
- `app/js/services/institution-provenance-service.js`
- `app/js/ui/layout.js`
- `scripts/apply_document_renderer_geometry.js`
- `scripts/generate_physical_qa_corrections_06_artifacts.js`
- `tools/document-renderer-qa.js`
- `tests/physical_qa_corrections_06.regression.js`
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/ISSUES.md`, `docs/FEATURE_TEST_COVERAGE.md`
- `tests/TEST_MATRIX.md`, `tests/results/PHYSICAL_QA_CORRECTIONS_06_TEST_RESULT.md`
- Artefactos sintéticos en `output/pdf/`.

## Q. Repetición exacta en Microsoft Edge

1. Mantener producción en 8080 sin ejecutar migraciones ni escrituras.
2. Iniciar la candidata con `scripts/start-v2-candidate.cmd` si 8081 no está activo.
3. Abrir en Microsoft Edge `http://127.0.0.1:8081/tools/document-renderer-qa.html`.
4. Seleccionar `TMPL-21`, `Vista normal` y `Generar vista QA`.
5. En página 1 comprobar que `JUAN PEREZ` está sobre la línea de “Por cuanto” sin tocar el párrafo, y que el título está entre el párrafo y la línea siguiente sin tocar “POR TANTO”.
6. En página 2 comprobar que el placeholder `LOGO CETPRO` y el rótulo `Código del Registro Institucional` no tienen overlay.
7. Seleccionar `Texto largo`, generar y revisar ambas páginas.
8. Seleccionar `Overflow controlado` + `FIELD_OVERFLOW`: debe mostrar error controlado y no crear visor/descarga PDF.
9. Registrar el resultado humano en `docs/EDGE_PHYSICAL_ACCEPTANCE_05.md`; solo el usuario puede cambiar `PHYSICAL_ACCEPTANCE`.

Artefactos de apoyo: `output/pdf/TMPL-21_NORMAL_TEST_ONLY.pdf`, `output/pdf/TMPL-21_LONG_TEXT_TEST_ONLY.pdf` y PNG sintéticos. Estos artefactos no equivalen a aceptación humana.

