# DOCUMENT-CONTRACT-01 — Resultado reproducible

Fecha: 2026-09-15. Suite específica: **10/10 aprobadas, FAILED = 0**.

Verificación integral: **722/722 pruebas exitosas en 31 suites; FAILED = 0**.

| ID | Comprobación | Resultado |
|---|---|---|
| T-DC01-01 | Fuente declarada y política `BLANK` en los campos de 21 plantillas | PASSED |
| T-DC01-02 | Ausencia de valor devuelve `""` y bloquea preview incompleto | PASSED |
| T-DC01-03 | Contrato sin fallbacks sintéticos | PASSED |
| T-DC01-04 | B-002 vacía unidades, créditos y horas | PASSED |
| T-DC01-05 | B-004 vacía módulo | PASSED |
| T-DC01-06 | B-007 vacía periodo | PASSED |
| T-DC01-07 | Dato confirmado llega al contexto y preview ≠ emisión | PASSED |
| T-DC01-08 | Cambio de `institution.nombre` llega a TMPL-01 y TMPL-02 | PASSED |
| T-DC01-09 | TMPL-02 sigue usando matrícula real, `buildEnrollmentContext` y preflight | PASSED |
| T-DC01-10 | PDF TMPL-02 y XLSX originales mantienen hashes 21/21 | PASSED |

La regresión runtime aislada de `scripts/verify_m12_2_runtime.js` confirma búsqueda y selección de `MAT-IMP-BD-001`, resumen visible del preflight con pendientes desplegables, visor Blob PDF, descarga y store `documentos=0` antes/después; TMPL-01 sigue realmente deshabilitada. No se declara validación física Edge de este cambio: corresponde al usuario.
