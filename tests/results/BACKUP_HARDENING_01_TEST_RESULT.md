# BACKUP-HARDENING-01 — resultado reproducible

Fecha: 2026-09-15.

Comandos: `node --check` sobre StorageService, app, layout, test académico estabilizado y suite BH01; `node scripts/verify_project.js`.

Resultado final: **820/820 PASSED, 0 FAILED, 36 suites**. `BACKUP-HARDENING-01` fue descubierta desde `tests/*.regression.js` y pasó **24/24**.

DBs: nombres `CETPRO_BACKUP_*` aislados en Chromium headless. No se abrió ni restauró el perfil Microsoft Edge del usuario. No se modificó schema v1, PDFs, bindings, módulos, periodos, currículo ni datos académicos reales.

Casos: envelope válido; schemaVersion 1/formatVersion 2; manifiesto nominal 17/17; SHA-256; 269/295/295 sintéticos; 0/0 y 1/1; ceros iniciales, 7/8 caracteres, alfanumérico, tildes, Ñ y apóstrofe; checksum alterado; JSON truncado; store faltante/extra; clave duplicada; referencia huérfana; schema incompatible; abort tras primer clear, mitad, último store y antes de commit; prebackup fallido; legacy seguro en memoria; preflight/cancelación UI cero escrituras; round-trip semántico; schema v1 intacto.

Performance sintética: 5 años, 1.000 estudiantes, 5.000 matrículas, 5.000 staging, 11.018 registros totales. Ejecución aislada: export ~279 ms, restore ~1.667 s. Bajo runner global: export ~634 ms, restore ~3.014 s. Valores aproximados del equipo, no SLA.

Incidencias abiertas: I-062 (confirmación física de descarga PRE_RESTORE_BACKUP/UX Edge antes del primer restore real) e I-063 (cuota/disco/crash de navegador/SO). MIGRATION continúa pendiente: no existe ni se ejecutó CETPRO_DB v2.
