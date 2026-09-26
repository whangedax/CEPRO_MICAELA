# Dependencias de `grupoCode` antes de activar schema v2

Fuente futura del contexto GROUP: `grupos_academicos.id`. `matricula.grupoCode` queda como procedencia/compatibilidad y no puede continuar como autoridad académica.

## MUST_CHANGE_BEFORE_V2_ACTIVATION

- `app/js/db/database.js:initDB`, `app/js/db/schema.js:SCHEMA_V1/applySchemaUpgrade`, `app/js/config.js:CONFIG.DB.VERSION` y startup de `app/js/app.js`: conectar conscientemente schema 2 y el handler probado.
- `app/js/services/storage-service.js`: manifiesto, schemaVersion, backup/restore e integrity check deben usar el contrato activo de 18 stores.
- `app/js/services/referential-audit-service.js`: auditar matrícula→grupo y grupo→programa/módulo/periodo.
- `app/js/repositories/enrollment-repository.js:getByGrupoCode` y consultas de pertenencia: añadir ruta autoritativa `grupoId`.
- `app/js/services/group-assignment-service.js:listGroups/getGroup/assignModule` y `app/js/ui/group-assignment-view.js`: operar por `grupos_academicos.id`; la asignación modifica al grupo y registra auditoría, no 295 snapshots como autoridad permanente.
- `app/js/services/document-data-service.js:buildGroupContext`: aceptar `groupId` y resolver grupo/programa/matrículas/estudiantes/institución.
- `app/js/services/attendance-service.js:registerBatchAttendance`, `app/js/services/evaluation-service.js:registerBatchEvaluation`, `app/js/services/academic-readiness-service.js` y `app/js/services/academic-closure-readiness-service.js`: validar pertenencia y contexto por `grupoId`.
- `app/js/ui/attendance-view.js` y `app/js/ui/evaluation-view.js`: selección interna por `groupId`.

## TEMPORARY_COMPATIBILITY

- `app/js/repositories/enrollment-repository.js:list/searchEnrollments` puede aceptar filtros `grupoCode` durante una ventana de transición, pero debe resolverlos a grupos y no tratarlos como identidad.
- `app/js/services/enrollment-service.js:getGroupDetails` y `FILE_GROUP_MAP`: solo para reconciliación heredada hasta retirar la ruta de importación BD.zip.
- `app/js/services/document-field-contract.js` y contexto ENROLLMENT: `enrollment.grupoCode` puede mantenerse mientras las plantillas muestren el código histórico; el join GROUP usa `grupoId`.

## DISPLAY_ONLY

- `app/js/ui/documents-view.js`, `app/js/ui/enrollments-view.js` y `app/js/ui/students-view.js`: pueden mostrar `grupoCode` como rótulo/origen, pero las acciones y selecciones deben transportar `groupId`.
- Celdas informativas de `attendance-view.js` y `evaluation-view.js` pueden mostrar el código visible después de resolver el grupo por ID.

## PROVENANCE_ONLY

- `app/js/db/schema.js` conserva temporalmente el índice `matriculas.grupoCode` para búsqueda histórica.
- `app/js/services/schema-v2-group-migration-service.js` usa `grupoCode` únicamente para crear `sourceGroupCode` y IDs migrados reproducibles.
- Los literales `FILE_GROUP_MAP` de `enrollment-service.js` documentan la procedencia BD.zip; no son catálogo académico futuro.

## No dual source of truth

Durante la transición, `matricula.moduloId` y `matricula.periodoId` pueden conservarse para readback/compatibilidad, pero después de activar v2 la autoridad GROUP es `grupos_academicos.moduloId/periodoId`. Las escrituras deben actualizar primero el grupo, generar auditoría y derivar cualquier snapshot de matrícula de forma controlada. Se deprecan en fases: lectura comparativa, advertencia ante divergencia, backfill verificado, consumidores por grupoId y, solo tras varios backups/aceptaciones, eliminación en una migración forward-only posterior. No se borra ningún campo en 01B.
