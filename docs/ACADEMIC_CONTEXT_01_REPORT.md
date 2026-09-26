# ACADEMIC-CONTEXT-01 — administración productiva de grupos y módulo

Fecha: 2026-09-15. Estado: **PREPARADA TÉCNICAMENTE, validación física Edge por Secretaría pendiente**. No se asignó ningún módulo real desde esta tarea. No se creó periodo, currículo, store ni plantilla; no se tocaron PDF/bindings.

## A–E. Fuente y grupos

Fuente productiva **única**: `CETPRO_DB.matriculas.grupoCode` (índice `grupoCode`, repositorio `EnrollmentRepository.getByGrupoCode`); vínculo previsto `matriculas.moduloId`. `GroupAssignmentService.listGroups()` lee las matrículas, programas y módulos actuales, agrupa por valor registrado y calcula conteos/estado sin `FILE_GROUP_MAP` ni vector hardcodeado. Grupo sin código, programa mixto, módulo mixto/inexistente o módulo de otro programa = error/`INCONSISTENTE`. Un grupo inconsistente no alimenta documentos.

La siguiente tabla es el **último vector histórico auditado de BD.zip/PROJECT_STATE**, no una lectura física nueva del perfil Edge (la autorización de acceso a esa ventana expiró). La pantalla nueva comprobará dinámicamente el valor actual al abrirse. No usar esta tabla como fuente de selección o asignación:

| Grupo técnico histórico | Programa auditado | Matrículas históricas |
|---|---|---:|
| GRP-BD-001 | Peluquería y Barbería | 36 |
| GRP-BD-002 | Peluquería y Barbería | 15 |
| GRP-BD-003 | Peluquería y Barbería | 24 |
| GRP-BD-004 | Mecánica Automotriz | 17 |
| GRP-BD-005 | Mecánica de Motos y Vehículos Afines | 25 |
| GRP-BD-006 | Carpintería Metálica | 20 |
| GRP-BD-007 | Computación e Informática | 26 |
| GRP-BD-008 | Computación e Informática | 70 |
| GRP-BD-009 | Corte y Ensamblaje | 28 |
| GRP-BD-010 | Corte y Ensamblaje | 7 |
| GRP-BD-011 | Corte y Ensamblaje | 20 |
| GRP-BD-012 | Mantenimiento de Sistemas Eléctricos | 7 |
| **Total histórico** | **12 grupos** | **295** |

El último estado documentado del perfil productivo antes de esta función era 269 estudiantes, 295 matrículas, 295 staging, 0 periodos, 0 unidades y módulos sin asignar. **No** se afirma que `moduloId` siga nulo en los 295: Secretaría podría haber asignado grupos después. Solo una lectura Edge actual puede confirmar esos conteos/estados.

## F–I. UX, transacción y auditoría

Ruta `#/programas` → botón **Asignación de grupos** → `#/grupos`. Tabla: Grupo, Programa, Matrículas, Módulo asignado, Estado, Acción. `SIN_ASIGNAR` permite Asignar; `ASIGNADO_CONFIRMADO` exige **Cambiar módulo** y muestra anterior→nuevo; `INCONSISTENTE` solo muestra revisión requerida. El selector obtiene `modulos` por `programaId` del repositorio, sin auto-seleccionar; seleccionar no escribe. La pantalla muestra impacto y pide confirmación explícita; cancelar no escribe.

`assignModule()` vuelve a leer **dentro de una sola transacción `readwrite`** los stores `matriculas`, `programas`, `modulos`, `auditoria`. Revalida código de grupo, programa de cada matrícula, pertenencia del módulo, N afectadas y módulo anterior frente a la vista; rechaza estado mixto, no-op, cambio no autorizado y resumen obsoleto. Solo entonces pone `moduloId` a **todas y solo** las matrículas del grupo y agrega auditoría en la misma transacción. Si algo falla, aborta todo. El registro lleva timestamp, groupCode, programaId, módulo anterior/nuevo, N y tipo de acción; no incluye estudiante/DNI.

El modal legado de configuración mezclada se retiró de Matrículas y `assignGroupConfig()` ahora rechaza guardados: antes escribía matrícula por matrícula y podía mezclar periodo/turno/modalidad con módulo, sin atomicidad. El filtro de grupos de Matrículas también calcula sus opciones desde las matrículas actuales, no desde `FILE_GROUP_MAP`. La nueva ruta no ofrece periodos ni unidades.

## J. Contexto documental preparado

`DocumentDataService.buildGroupContext(groupCode)` es **read-only y no conectado a TMPL-01**. Comprueba un programa y un módulo uniforme, vínculos a estudiantes y pertenencia del módulo; retorna `groupCode`, `program`, `module`, `enrollments`, `students`, `institution`, `source`. `period={}` y `curriculum.units=[]` continúan explícitamente bloqueados B-007/B-002. Si el grupo es mixto o faltan vínculos, rechaza; no inventa dato académico.

## K–L. Pruebas y B-004

`node --check` sin errores. `node scripts/verify_academic_context_runtime.js`: **23/23** en Chromium/IndexedDB **`CETPRO_ACADEMIC_CONTEXT_01_TEST_DB`** con 12 grupos sintéticos y 295 matrículas: listado, vector, selector de DB, filtro de Matrículas, UI, no preselección, selección sin escritura, confirmación rechazada, cancelación, programa cruzado, aborto por impacto obsoleto y **rollback tras conflicto de auditoría luego de encolar 24 matrículas**, actualización exacta, auditoría, reasignación, inconsistencia, contexto, recarga, consola y offline. La `CETPRO_DB` del perfil headless quedó sin matrículas de prueba; esta comprobación **no** representa el perfil Edge real. `node scripts/verify_project.js`: **753/753, 33 suites, FAILED=0**. Resultado reproducible en `tests/results/ACADEMIC_CONTEXT_01_TEST_RESULT.md`.

`listGroups()` entrega dinámicamente `groupsTotal`, `groupsAssigned`, `groupsUnassigned`, `groupsInconsistent` y `b004CandidateForPhysicalConfirmation`. Esta candidatura solo sería verdadera con todos los grupos consistentes/asignados; `b004Resolved` permanece **false** hasta revisión y confirmación física del usuario/admin. B-004 sigue **ABIERTA**. B-002/B-007 también. Siguiente puerta: abrir `#/grupos` en Edge, cotejar 12 filas/conteos/programas y confirmar individualmente módulos reales **solo por Secretaría**, luego releer conteos/bitácora. No continuar plantillas.
