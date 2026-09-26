# SCHEMA-V2-GROUP-01B — ensayo con backup real de Edge

Fecha: 2026-09-15. Estado: **COMPLETADO EN COPIAS AISLADAS; NO ES UNA MIGRACIÓN PRODUCTIVA**.

El archivo original se trató como solo lectura y no se copió a documentación, resultados ni fixtures. SHA-256 físico: `5a792e65c67b249d45de71b0ea9b5de37e79b0e4a9a5bbd118ef1404d69e58f6`. Preflight existente: `CETPRO_BACKUP`, formatVersion 2, schemaVersion 1, manifiesto exacto de 17 stores, checksum canónico `f3a8e0a01a892102fcb084b015161429659f55100099866eca35fc8b66f4b4ae`, 893 registros y 0 incidencias referenciales.

## Inventario real v1

| Store | Registros | Store | Registros |
|---|---:|---|---:|
| asistencia | 0 | auditoria | 10 |
| configuracion | 2 | docentes | 0 |
| documentos | 0 | efsrt | 0 |
| estudiantes | 269 | evaluacion | 0 |
| indicadores | 0 | institucion | 1 |
| matricula_unidades | 0 | matriculas | 295 |
| modulos | 14 | periodos | 0 |
| programas | 7 | staging_importaciones | 295 |
| unidades | 0 |  |  |

## Estado académico observado

Hay 12 `groupCode` distintos. Vector, en orden técnico `GRP-BD-001` a `GRP-BD-012`: `[36,15,24,17,25,20,26,70,28,7,20,7]`. Cada grupo contiene un único `programaId`. Las 295 matrículas tienen `moduloId` nulo y `periodoId` nulo; periodos y unidades permanecen en 0.

Turnos no pendientes aparecen en los grupos 001–003 y 009–011; modalidades no pendientes aparecen en 007–008. No existe procedencia por campo `academicContextSources`, por lo que el migrador correctamente no elevó esos valores. Sección no está informada. No se reparó ni infirió ningún dato.

## Restore, migración y comparación

El backup se restauró en una DB v1 de nombre `CETPRO_SCHEMA_V2_REAL_BACKUP_MIGRATION_TEST_V1_*`. Backup → DB v1 → nueva exportación produjo igualdad semántica exacta.

Sobre esa copia se ejecutó sin variantes el migrador de SCHEMA-V2-GROUP-01A. Resultado: 18 stores, 12 `GRUPO_ACADEMICO`, 295 matrículas enlazadas y 0 diferencias inesperadas. Las únicas diferencias autorizadas fueron `matricula.grupoId`, el migration marker y el nuevo store.

| IDs técnicos | Programa | Matrículas | Estado | Motivo de revisión |
|---|---|---:|---|---|
| GAC-V1-GRP-BD-001 | PROG-004 | 36 | REVIEW_REQUIRED | TURNO_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-002 | PROG-004 | 15 | REVIEW_REQUIRED | TURNO_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-003 | PROG-004 | 24 | REVIEW_REQUIRED | TURNO_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-004 | PROG-001 | 17 | ACTIVO | — |
| GAC-V1-GRP-BD-005 | PROG-002 | 25 | ACTIVO | — |
| GAC-V1-GRP-BD-006 | PROG-003 | 20 | ACTIVO | — |
| GAC-V1-GRP-BD-007 | PROG-005 | 26 | REVIEW_REQUIRED | MODALIDAD_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-008 | PROG-005 | 70 | REVIEW_REQUIRED | MODALIDAD_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-009 | PROG-006 | 28 | REVIEW_REQUIRED | TURNO_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-010 | PROG-006 | 7 | REVIEW_REQUIRED | TURNO_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-011 | PROG-006 | 20 | REVIEW_REQUIRED | TURNO_REVIEW_REQUIRED |
| GAC-V1-GRP-BD-012 | PROG-007 | 7 | ACTIVO | — |

En los 12 grupos: `sourceGroupCode` conserva el código correspondiente; `moduloId`, `periodoId`, `turno`, `modalidad` y `seccion` quedaron nulos. INV-G01–INV-G18: **PASS individual**. Auditor v2: 0 huérfanos.

## Backup/restore v2 y runtime candidato

La copia migrada exportó un backup formatVersion 2/schemaVersion 2 con 18 stores, 12 grupos, 295 matrículas y 3 registros de configuración (los 2 originales más el marker). Checksum validado. La restauración en `CETPRO_SCHEMA_V2_REAL_BACKUP_MIGRATION_TEST_V2_RESTORE_*` fue semánticamente idéntica.

El runtime candidato abrió estudiantes, matrículas, programas, grupos y configuración; construyó contexto ENROLLMENT y `buildGroupContext(groupId)`; mantuvo `period={}` y `curriculum.units=[]`. `listGroups()` y `openGroup()` usaron `grupos_academicos`/`group.id`. `assignModule({groupId,...})` se probó solo como `dryRun`, con snapshot idéntico antes/después.

Resultado dedicado: **38/38**, cero red externa y sin salida de nombres o documentos personales. `CONFIG.DB.VERSION=1`; `app.js` y `database.js` no importan módulos v2. `CETPRO_DB` no fue abierta por el migrador, restaurada, migrada ni modificada.

`READY_FOR_V2_ACTIVATION = YES` significa únicamente que el candidato cumplió el gate técnico definido. La activación física continúa prohibida hasta autorización y ejecución separadas.
