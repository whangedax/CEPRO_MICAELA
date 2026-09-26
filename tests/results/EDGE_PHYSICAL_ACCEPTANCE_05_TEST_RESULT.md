# EDGE-PHYSICAL-ACCEPTANCE-05 — resultado técnico

Fecha: 2026-09-16  
Estado: `ACCEPTANCE_HARNESS_READY = YES`  
Aceptación física: `PENDING`

## Suite específica

- Suite: `EDGE-PHYSICAL-ACCEPTANCE-05`
- Checks: 28/28
- Failed: 0
- Origen QA: `http://127.0.0.1:8081/tools/document-renderer-qa.html`
- Producción 8080: harness ausente (404)
- Red externa: 0 solicitudes
- Errores JavaScript propios: 0
- HTTP propios fallidos: 0

## Evidencia cubierta

- Nueve plantillas representativas generan PDF técnico válido en memoria y con nombre `TEST_ONLY`.
- TMPL-03 conserva `REVIEW_REQUIRED` sin PDF.
- Texto largo y capacidad máxima se procesan sin estados visuales superpuestos.
- `FIELD_OVERFLOW` y `CAPACITY_EXCEEDED` fallan de forma controlada, sin PDF defectuoso.
- La herramienta no importa repositorios DB, no usa IndexedDB y no crea/modifica bases.
- TMPL-01 permanece bloqueada en la aplicación normal.
- TMPL-02 conserva `matriculaId → preflight → PDF`.
- 8080 y 8081 coexisten; el harness solo se sirve en 8081.
- La candidata muestra Respaldo en modo export-only.

## Regresión final

- `node --check`: PASS en todos los JavaScript modificados.
- `node scripts/verify_project.js`: 1199/1199 en 51 suites.
- Failed: 0.
- PDF canónicos: 21/21 hashes coincidentes.
- Candidata observada por la suite: schema 2, 18 stores, 269 estudiantes, 295 matrículas, 12 grupos, 7 programas, 14 módulos, 0 periodos y 0 unidades.
- Snapshots de navegación/preview/backup: sin escrituras académicas.
- Producción: `CONFIG.DB.VERSION=1`; el harness no abre, migra ni escribe `CETPRO_DB`.

La comprobación automatizada no sustituye la inspección humana en Microsoft Edge.
