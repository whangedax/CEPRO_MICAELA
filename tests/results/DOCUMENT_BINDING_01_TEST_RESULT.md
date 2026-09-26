# DOCUMENT-BINDING-01 — evidencia técnica

Fecha: 2026-09-15. Alcance: enlace `DocumentFieldContract` → `resolvedFieldSet` → preflight → TMPL-02 PDF. Ningún valor de la base Edge del usuario fue modificado o borrado; no se declara validación física Edge del nuevo PDF.

## Geometría read-only

PDF canónico `02_FICHA_DE_MATRICULA.pdf`: SHA-256 `63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914`, una página A4 Landscape. `pdf2json` extrajo líneas horizontales `y=4.951,6.405,7.594,8.738,9.839` y verticales `x=13.879,29.312,38.077,48.688`; escala física 16 pt/unidad. De esas líneas proceden las cinco cajas añadidas: DRE `(609.232,79.216,169.776,23.264)`, código `(222.064,102.480,246.928,19.024)`, departamento `(222.064,121.504,246.928,18.304)`, provincia `(609.232,121.504,169.776,18.304)` y distrito `(222.064,139.808,246.928,17.616)`, en orden `x,y,width,height`. Seis cajas anteriores no se movieron.

## Pruebas reproducibles

- `node tests/document_binding_01_tests.js`: 17/17, FAILED=0. Extracción PDF: `DRE-TEST-CONFIRMADA`, `CM-TEST-001`, `DEP-TEST`, `PROV-TEST`, `DIST-TEST` visibles; dato no confirmado y B-002/B-004/B-007 ausentes. DRE-A y DRE-B aparecen sólo en su generación respectiva. `CONFIRMED+MAPPED` vacío provoca rechazo.
- `pdftoppm -f 1 -l 1 -r 110 -png -singlefile tmp/pdfs/tmpl02_binding_qa.pdf tmp/pdfs/tmpl02_binding_qa`: revisión visual temporal de una página; cinco valores dentro de sus casillas, sin superposición de etiquetas o desplazamiento. Poppler avisó que no tiene fuentes de display `Symbol`/`ArialUnicode`, pero el render resultante fue legible.
- `node scripts/verify_document_binding_runtime.js`: perfil Chromium/IndexedDB aislado, `passed=true`, `jsErrors=[]`. Checkbox desmarcado bloquea el guardado; marcado permite cinco campos y luego se limpia. Recarga e `initializeCatalogs` conservan valores, procedencia y marcador. Preflight: 11 disponibles, 11 mapeados, 0 disponibles sin binding; PDF UI contiene los cinco valores. Nueva construcción de contexto/PDF cambia DRE-A → DRE-B. Antes/después: estudiantes=269, matrículas=295, staging=295, periodos=0, documentos=0. TMPL-01 bloqueada.
- `node --check` de módulos/scripts modificados: OK. `node scripts/verify_project.js`: 753/753, 33 suites, FAILED=0.

La tabla exhaustiva de 196 campos contractuales de 21 plantillas se reproduce con `node scripts/build_document_binding_coverage.js` y está registrada en `docs/DOCUMENT_FIELD_COVERAGE.md`. TMPL-03–21 siguen `NOT_IMPLEMENTED` para datos variables; TMPL-01 sigue sin conexión productiva. B-002, B-004 y B-007 abiertas.
