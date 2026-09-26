# SCHEMA-V2-GROUP-01A — resultado reproducible

Fecha: 2026-09-15. Comandos: `node --check` para esquema/migrador/backup-lab/suite; `node scripts/verify_project.js`.

Resultado final: **848/848 PASSED, 0 FAILED, 37 suites**. Suite SCHEMA-V2-GROUP-01A: **28/28** descubierta automáticamente.

Evidencia: schema objetivo 2/18 stores; índice `matriculas.grupoId`; 12 grupos/295 relaciones; vector histórico exacto; 269 estudiantes/295 staging/0 periodos/0 unidades; IDs reproducibles y sourceGroupCode exacto; módulo/periodo no inferidos; marker sin PII; auditor 0 huérfanos; equivalencia pre/post. Siete abortos reabrieron versión 1 sin store/índice/cambios parciales. Backup schema2/18, restore y round-trip v1→v2 verificados. Multiaño permite etiquetas repetidas con IDs opacos distintos.

Performance orientativa bajo runner global, dataset 5.000 matrículas/1.000 estudiantes/50 grupos: upgrade ~1.333 s, auditoría ~4,9 ms, backup v2 ~349 ms, restore v2 ~2.076 s. Cero red externa.

Protección productiva: migrador y backup-lab rechazan literalmente `CETPRO_DB`; `app.js` y `database.js` no importan módulos v2; `CONFIG.DB.VERSION=1`. Edge no fue abierto ni leído. No se asignaron módulos/periodos, no se creó currículo y no se modificaron PDFs/datos reales.
