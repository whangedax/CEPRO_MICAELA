# DEMO-OPERATIONAL-MODE-09 — Resultado

Fecha: 2026-09-16  
Estado técnico: PASS  
Emisión académica oficial: NO

## Evidencia ejecutada

- `node --check`: módulos DEMO, runtime, repositorio de asistencia, backup, UI, suite y runner seguro sin errores.
- `DEMO_OPERATIONAL_MODE_09`: **49/49**, `failed=0`.
- Regresión allowlisted v2/DEMO: **489/489 en 17 suites**, `failed=0`.
- Recuperación v1 aislada tras acotar el guard runtime: **37/37**, `failed=0`.
- PDF canónicos: **21/21 SHA-256 intactos**.
- Red externa: **0**; errores de página: **0**; `eval`/`new Function`: **0**.

## Dataset y flujo

`CETPRO_V2_DEMO` usa schema 2/18 stores y `DEMO_DATASET_V1`: 40 estudiantes, 65 matrículas, dos grupos (40/25), 7 programas, 14 módulos, un periodo, 12 unidades, 60 indicadores, cinco sesiones y 200 marcas. Se validaron TMPL-01 para 25, `CAPACITY_EXCEEDED` para 40, reporte completo, registro PDF/CSV, TMPL-02, asistencia save/reload/conteos, contexto TMPL-05, reporte alternativo y cuatro PDFs con watermark.

Los 409 registros del snapshot están marcados `demo=true` y `official=false`. No se incluyó PII real. B-003 continúa `BLOCKED_BY_POLICY`; TMPL-03 y celdas TMPL-05 no certificadas permanecen fail-closed.

## Aislamiento

- Escritura DEMO→candidata: `DEMO_TARGET_VIOLATION`.
- Restore DEMO→REAL: `BACKUP_ENVIRONMENT_MISMATCH` antes de cualquier escritura.
- Backup: `environment=DEMO`, `official=false`, `datasetVersion=DEMO_DATASET_V1`.
- Reset: fingerprint idéntico y sesión restablecida a versión 1.
- Candidata antes/después: fingerprint idéntico; 269 estudiantes, 295 matrículas, 295 staging, 12 grupos, 7 programas, 14 módulos, 0 periodos, 0 unidades y 0 asistencia.

## Nota de regresión global

La primera corrida de `verify_project.js` permitió detectar un guard runtime demasiado amplio. Se corrigió y RECOVERY quedó 37/37. El host de ejecución impidió una segunda corrida global porque las suites históricas abren una IndexedDB de prueba llamada `CETPRO_DB`; se respetó la prohibición de no forzar operaciones sobre ese nombre. Por eso no se declara un total global posterior. La regresión segura explícitamente limitada a candidata v2 read-only, `CETPRO_V2_DEMO` y DBs LAB pasó 489/489.

Resultado: `DEMO_READY=YES`, `REAL_DATA_UNCHANGED=YES`, `OFFICIAL_ACADEMIC_RELEASE=NO`.
