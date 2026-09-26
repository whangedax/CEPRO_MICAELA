# SCHEMA-V2-GROUP-01A — reporte inicial de ensayo

Fecha: 2026-09-15. Suite descubierta: `tests/schema_v2_group_01a.regression.js`.

Resultado dedicado final: **28/28**, DBs Chromium headless aisladas. Migración válida: 18 stores, 12 grupos derivados, 295 matrículas con grupoId; vector `[36,15,24,17,25,20,26,70,28,7,20,7]`; 269 estudiantes, 295 staging, 0 periodos, 0 unidades; módulos/periodos no inferidos; auditor v2 0 incidencias. IDs reproducibles comprobados en dos copias. Guards rechazan `CETPRO_DB` y los módulos v2 no están importados por bootstrap/database.

Abortos: fallo antes de crear store, programa mixto, groupCode vacío, programa inexistente, fallo después de algunos grupos, en matrícula 141 y antes de commit. Cada DB reabrió como v1, sin store nuevo y con snapshot exacto.

Backup/round-trip: backup v1 → upgrade de copia → backup schema 2/18 stores → restore en DB v2 vacía → readback idéntico. Multiaño: cuatro periodos/grupos sintéticos añadidos sin modificar los 12 migrados; dos grupos comparten `codigoVisible` y tienen IDs distintos.

Performance dedicada orientativa: dataset actual sintético upgrade ~114 ms, auditoría ~1 ms, backup ~23 ms, restore ~127 ms. Dataset 5.000 matrículas/1.000 estudiantes/50 grupos: upgrade ~1.084 s, auditoría ~4 ms, backup ~334 ms, restore ~1.846 s. No es SLA.

Seguridad: cero red externa, sin CDN/eval/HTML, strings tratados como datos. `CONFIG.DB.VERSION=1` y `CETPRO_DB` del perfil headless permaneció v1. Microsoft Edge no fue abierto; su continuidad en v1 deriva de no ejecutar ningún código contra ese perfil, no de un readback nuevo.

Runner global final: **848/848, 37 suites, FAILED=0**.
