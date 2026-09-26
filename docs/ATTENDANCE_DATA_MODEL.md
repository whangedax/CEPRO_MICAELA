# Modelo de datos de asistencia v2

## Auditoría del store existente

`asistencia` ya existe desde schema 1 y se reutiliza sin incrementar la versión de DB.

| Propiedad | Contrato existente |
|---|---|
| keyPath | `id` |
| autoIncrement | `false` |
| índices | `matriculaId`, `unidadId`, `fecha`, `sesionId` (no únicos) |
| compatibilidad | los registros legados sin `recordType` continúan legibles; el motor v2 filtra registros tipados |

Antes de este gate, `AttendanceService`/`AttendanceRepository` representaban una fila por marca, consultaban por matrícula/unidad/fecha/sesión y guardaban lotes sin incluir sesión + auditoría en una única transacción. La vista candidata real seguía bloqueada. El nuevo write path no reemplaza ni activa el legado productivo.

## Tipos conceptuales compatibles

Ambos tipos se persisten en `asistencia`; `recordType` evita crear un store o schema 3.

### ATTENDANCE_SESSION

Campos mínimos: `id=sessionId` (`ATS-*`), `sessionId`, alias de índice existente `sesionId`, `groupId`, `periodoId`, `unidadId`, `fecha` ISO `YYYY-MM-DD`, `ordenSesion?`, `horasProgramadas?`, `estado`, `version`, `createdAt`, `updatedAt`.

### ATTENDANCE_MARK

Campos mínimos: `id=attendanceId` (`ATM-*`), `attendanceId`, `sessionId`, alias `sesionId`, `groupId`, `periodoId`, `unidadId`, `matriculaId`, `estadoRegistro`, `horasRegistradas?`, `observacion`, `estadoLogico`, `version`, `createdAt`, `updatedAt`.

## Invariantes

1. Una marca se identifica por su `attendanceId`; la unicidad lógica activa es `(sessionId, matriculaId)`.
2. Una actualización conserva el ID y solo reescribe/audita marcas cuyo estado, horas u observación cambiaron.
3. La membresía se determina por `matriculaId`; nunca por estudiante, DNI o nombre.
4. Todas las matrículas activas del grupo deben estar presentes en el lote; no se aceptan omisiones ni miembros ajenos.
5. Grupo, periodo, módulo y unidad deben formar un único contexto autoritativo.
6. `SIN_REGISTRO` es distinto de `AUSENTE`.
7. Una fecha futura solo puede conservar marcas `SIN_REGISTRO`.
8. La observación es texto plano normalizado de hasta 500 caracteres; las horas son dato numérico no negativo sin política mínima/máxima.
9. La auditoría contiene IDs/contexto/diff mínimo, no nombres ni documentos personales.

## Repositorio

Las lecturas expuestas son `listSessionsByContext`, `getSessionById`, `listMarksBySession`, `listMarksByEnrollment` y `loadDocumentContext`. La única escritura es `saveSessionWithMarks`; exige DB schema 2 con nombre `CETPRO_V2_ATTENDANCE_LAB_*`.

## Cambio de schema

`SCHEMA_CHANGE_REQUIRED = NO`. El contrato cabe en schema 2 existente. `CONFIG.DB.VERSION` permanece en 1 para producción y no existe migración v3.
