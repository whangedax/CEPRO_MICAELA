# Plan candidato de activación de schema v2

Este plan no activa ni autoriza la migración.

1. Congelar build y ventana exclusiva; cerrar todas las pestañas del sistema.
2. Crear `USER_EXPORT` y `PRE_MIGRATION_BACKUP` v1, verificar hash, 17 stores, 893 registros, 0 incidencias y copia externa recuperable.
3. Conectar `CONFIG.DB.VERSION=2`, `database/schema` y exactamente el migrador probado en una versión candidata explícita; no duplicar lógica.
4. Añadir repositorio `GroupAcademicRepository` y queries `matriculas.grupoId`.
5. Cambiar `GroupAssignmentService`, `DocumentDataService`, asistencia, evaluación, readiness/cierre y sus vistas conforme a la auditoría de dependencias.
6. Promover backup/restore/integrity auditor a contrato activo de 18 stores y bloquear backups v1 en runtime v2 salvo flujo de recuperación supervisado.
7. Startup: detectar marker, validar version=2/stores/índices/conteos/referencias antes de habilitar escrituras; ante fallo, modo bloqueado de recuperación.
8. Ejecutar upgrade una sola vez, cerrar/reabrir y hacer post-readback: 18 stores, 12 grupos, 295 enlaces, 0 diferencias inesperadas, INV-G01–G18 y 0 huérfanos.
9. Validar funciones candidatas y aceptación física Edge. Solo después habilitar operación normal.

Los 8 grupos `REVIEW_REQUIRED` requieren revisión administrativa de procedencia de turno/modalidad; no bloquean la integridad estructural ni autorizan inferencias. B-002 y B-007 mantienen periodo/currículo vacíos. B-004 solo podrá cerrarse con asignaciones oficiales posteriores y confirmadas.
