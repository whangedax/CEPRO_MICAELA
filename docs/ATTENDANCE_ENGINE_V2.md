# Motor de asistencia v2

Estado: **IMPLEMENTADO Y PROBADO EN LABORATORIO; NO HABILITADO PRODUCTIVAMENTE**. Gate `ATTENDANCE-ENGINE-V2-07`, 2026-09-16.

## Alcance y límite operativo

El motor captura asistencia por `groupId + periodoId + unidadId + sessionId + matriculaId`. `grupoCode`, nombres, DNI y posiciones de fila no son identidad académica. La interfaz real `#/registro` permanece bloqueada porque la candidata no contiene periodos ni unidades productivas ni módulos asignados a grupos. La herramienta separada `/tools/attendance-qa.html` solo se sirve en `127.0.0.1:8081`, usa `CETPRO_V2_ATTENDANCE_LAB_QA`, datos sintéticos y no está enlazada al menú.

`CETPRO_DB` continúa en schema 1. `CETPRO_V2_CANDIDATE` continúa siendo solo lectura para este gate. Las únicas escrituras admitidas por `AttendanceV2Repository` tienen nombres `CETPRO_V2_ATTENDANCE_LAB_*` y schema 2.

## Componentes

- `AttendanceSessionService`: crea/carga sesiones y coordina el guardado completo.
- `AttendanceMarkService`: mantiene el borrador local, los cambios individuales y “marcar todos presentes”.
- `AttendanceSummaryService`: entrega únicamente conteos operativos.
- `AttendanceV2Repository`: consultas y transacción IndexedDB atómica.
- `AttendanceDocumentContextService`: convierte grupo, matrículas, estudiantes, sesiones y marcas en contexto para TMPL-05–10.
- `SystemIntegrityService`: reporta huérfanos, cruces y duplicados; nunca repara.

## Flujo transaccional

La edición ocurre en memoria. `saveSessionWithMarks` abre una sola transacción sobre `asistencia`, `auditoria`, `grupos_academicos`, `matriculas`, `periodos`, `modulos` y `unidades`. Antes de escribir revalida grupo activo, autoridad de periodo/módulo, pertenencia de unidad, membresía activa completa, versión de sesión y ausencia de duplicados. Sesión, marcas cambiadas y auditoría se confirman juntas o se abortan juntas.

La concurrencia usa `session.version`. Una ventana con versión antigua recibe `STALE_SESSION` y no sobrescribe. No existe borrado físico de sesiones; la anulación futura requerirá regla y auditoría explícitas.

## UX QA

La matriz sintética presenta 40 matrículas y cinco sesiones. Solo la sesión activa es editable; los controles nativos conservan Tab/Shift+Tab y `aria-label`. Incluye marcar todos, limpiar, guardar, cancelar/recargar, dirty state, advertencia al cambiar de sesión o salir, horas opcionales, observación de texto plano y PDF TMPL-05 `TEST_ONLY`. La tabla usa scroll horizontal y no depende del color para comunicar estado.

## Resultado técnico

El guardado, recarga, edición controlada, aislamiento de dos matrículas de una misma persona, versionado, rollback en siete puntos, backup/restore, integridad, XSS, offline, capacidades PDF y escalas 40×30, 100×50 y 300×50 están cubiertos por `ATTENDANCE_ENGINE_V2_07`. La política académica oficial sigue bloqueada por B-003.
