# Checklist de activación futura v2

Este checklist no autoriza ni ejecuta la activación.

- [ ] Aprobación administrativa y ventana exclusiva.
- [ ] Cerrar todas las pestañas 8080/Edge y bloquear escrituras.
- [ ] Crear USER_EXPORT y PRE_MIGRATION_BACKUP v1; verificar hash, 17 stores, 893 registros y 0 incidencias.
- [ ] Confirmar copia externa recuperable del backup.
- [ ] Congelar build candidato aprobado y hashes del checkpoint.
- [ ] Promover conscientemente DB_VERSION 2, schema, repositorios, servicios, backup, auditor y startup; sin autodetección.
- [ ] Ejecutar migrador probado una sola vez.
- [ ] Reabrir: 18 stores, 12 grupos, 295 grupoId, `unexpectedDifferences=0`, INV-G01–G18 y 0 huérfanos.
- [ ] Validar las 12 vistas, configuración, TMPL-02 ENROLLMENT, backup/restore y modo offline.
- [ ] Confirmar 8 REVIEW_REQUIRED sin corrección automática.
- [ ] Validación y aceptación física Edge por usuario autorizado.
- [ ] Ante fallo post-commit, no downgrade: aplicar `SCHEMA_V2_RECOVERY_PLAN.md`.
