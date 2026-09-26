# Plan exacto de migración v1 → v2

## Ensayo implementado

`upgradeIsolatedDatabaseV1ToV2()` rechaza `CETPRO_DB` y cualquier nombre no marcado como laboratorio. Abre la DB aislada con versión 2 y ejecuta dentro de `onupgradeneeded`:

1. Verificar `oldVersion===1`.
2. Crear `grupos_academicos` e índices.
3. Añadir índice `matriculas.grupoId`.
4. Leer matrículas, estudiantes y programas en la misma upgrade transaction.
5. Validar groupCode, estudiante/programa existente y programa uniforme por grupo.
6. Construir dinámicamente grupos e IDs; no usa 12 ni el vector en producción.
7. Encolar grupos y matrículas que solo añaden `grupoId`.
8. Añadir marker `SCHEMA_MIGRATION_V1_TO_V2_GROUP` a `configuracion` con from/to, timestamp, migrationId y resultado, sin PII.
9. Confirmar la upgrade transaction. Cualquier excepción/request aborta creación de store, índice, grupos, matrículas y marker.

La comparación pre/post exige identidad total en los stores v1; para `matriculas` ignora únicamente el nuevo `grupoId`. En `configuracion` admite únicamente el nuevo marker exigido por la migración; ningún registro previo puede cambiar. Esta es la excepción metadata explícita a INV-G14.

## Flujo productivo futuro — no ejecutado

1. Edge v1: crear USER_EXPORT formatVersion 2/schemaVersion 1 y verificar SHA-256, manifiesto, counts e integridad.
2. Crear/guardar/verificar PRE_MIGRATION_BACKUP separado. Si el navegador/SO no confirma el artefacto operativo, detener.
3. Ejecutar preflight referencial y revisar cualquier módulo/periodo/contexto no nulo.
4. Obtener confirmación administrativa y ventana exclusiva; cerrar otras pestañas.
5. Conectar el handler probado y cambiar explícitamente DB_VERSION a 2 en una versión candidata.
6. Upgrade transaccional; reapertura y auditoría INV-G01..G14.
7. Exportar backup v2, restaurarlo en una DB v2 aislada y comparar antes de habilitar escrituras académicas.
8. Validación física Edge. Si cualquier gate falla, bloquear uso v2 y recuperar desde backup mediante procedimiento autorizado; nunca downgrade in-place.

El marker diagnostica, pero jamás permite saltar checksum, versión, referencias o comparación. El código de laboratorio no está importado por app.js/database.js y no puede disparar `onupgradeneeded` productivo.

## Adaptaciones futuras, no implementadas

- `GroupAssignmentService`: `getGroup(groupId)` y `assignModule({groupId,...})`; dejar `groupCode` solo como display/provenance.
- `DocumentDataService`: `buildGroupContext(groupId)`; shim temporal por sourceGroupCode solo para legado inequívoco, con deprecación.
- Repositorio de matrículas: consultas por índice `grupoId`.
- TMPL-01, TMPL-03, TMPL-04 y TMPL-05–19: contextos GROUP/GROUP+MODULE/ATTENDANCE/EVALUATION deben recibir grupoId; ningún renderer consulta DB o agrupa por texto.
- Readiness, asistencia, evaluación, EFSRT y cierre: propagar ID técnico, no nombres concatenados.
