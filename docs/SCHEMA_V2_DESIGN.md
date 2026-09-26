# SCHEMA-V2-GROUP-01A — diseño de schema 2

Estado: **probado solo en bases aisladas**. `app/js/db/database.js`, `app/js/db/schema.js` y `CONFIG.DB.VERSION` siguen en 1. El archivo de diseño `schema-v2-design.js` no es importado por el bootstrap productivo.

Schema v2 conserva los 17 stores de v1 sin eliminar ni renombrar ninguno y añade `grupos_academicos` (18 total). `matriculas` conserva todos sus índices y añade `grupoId` no único para consultas por pertenencia.

## Store `grupos_academicos`

KeyPath: `id`, sin autoincremento. Índices no únicos:

| Índice | Motivo |
|---|---|
| `programaId` | Listar/administrar grupos por programa |
| `moduloId` | Consultar asignación confirmada; admite ausencia |
| `periodoId` | Separar cohortes multiaño; admite ausencia |
| `sourceGroupCode` | Trazabilidad/búsqueda secundaria; deliberadamente no unique |
| `estado` | Operación y revisión administrativa |

`sourceGroupCode` no es identidad global. Grupos futuros pueden compartir `codigoVisible` o una referencia de origen y mantener IDs distintos. No se diseñó índice único compuesto prematuro: turno, modalidad, sección y periodo pueden estar pendientes y la regla institucional de unicidad aún no está confirmada.

## Activación futura

La activación productiva requerirá una tarea separada que, después de USER_EXPORT y PRE_MIGRATION_BACKUP verificados, cambie conscientemente `CONFIG.DB.VERSION` y conecte el handler probado. Esta fase no lo hace. El restaurador schema 2 vive en `SchemaV2BackupLabService`, exige nombres `CETPRO_SCHEMA_V2_*`/`CETPRO_V2_*` y no está disponible en `#/respaldo` productivo v1.
