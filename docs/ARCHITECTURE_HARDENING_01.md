# ARCHITECTURE-HARDENING-01 — gate previo a datos académicos

**Adenda SCHEMA-V2-GROUP-01B (2026-09-15):** la decisión B fue ensayada contra una copia del backup real Edge: 12 grupos/295 enlaces, INV-G01–G18 PASS, `unexpectedDifferences=0`, 0 huérfanos y round-trip v2 correcto. Ocho grupos quedan REVIEW_REQUIRED por campos turno/modalidad sin procedencia explícita; no hubo inferencia. CETPRO_DB productiva continúa v1 y no fue abierta por el migrador.

Fecha: 2026-09-15. Alcance: arquitectura, diagnósticos y regresión; no carga académica ni mutación de `CETPRO_DB`. El usuario comprobó parcialmente en Edge `#/grupos`: 12 grupos, 0 asignados; GRP-BD-001/Peluquería y Barbería/36 matrículas; ningún módulo preseleccionado y solo dos opciones del programa. No confirmó asignación. Los conteos 269/295/295/0/0 son el último estado documentado, **no un readback nuevo en esta auditoría**.

## Decisión B: grupo académico first-class antes de datos reales

| Criterio | A: contexto repetido en matrícula, `grupoCode` como clave | B: `GRUPO_ACADEMICO` + `matricula.grupoId` |
|---|---|---|
| Identidad multiperiodo | Código importado puede repetirse; misma etiqueta une cohortes ajenas | ID opaco estable separa 2026-I, II, 2027-I, II aun con etiqueta igual |
| Integridad | Módulo/periodo repetidos en N filas; cambio parcial o mixto posible | Contexto único; matrícula referencia grupo; validación de pertenencia obligatoria |
| Consultas/IndexedDB | Índice `grupoCode` útil en v1 pero ambiguo históricamente | Índices futuros `grupoId`, `periodoId`, `programaId`, código visible + periodo; joins por mapas O(N) |
| Documentos GROUP | Se arma grupo por igualdad de código; hoy no puede unir dos periodos | Contexto de grupo por ID, una fuente para todos los contextos documentales |
| Cambios/auditoría | Actualiza N matrículas + auditoría; riesgo de snapshot obsoleto | Actualiza grupo + auditoría; snapshot/revisión administrativa; matrícula conserva procedencia |
| Respaldo/migración | Sin upgrade inmediato, pero deuda acumulativa | Requiere v2, backup y reconciliación supervisada; simplifica Secretaría después |

El código `GRP-BD-*` es identificador **de la importación BD.zip**, no prueba de unicidad global. Reutilizarlo entre periodos, turnos, secciones, modalidades o módulos uniría históricos. Tampoco sirve una concatenación de nombres como primary key: las etiquetas pueden cambiar, contener acentos o repetirse. Propuesta: `id = UUID` opaco generado una sola vez; `codigoVisible` no único global; `sourceGroupCode`/`grupoCodeOrigen` inmutable para trazabilidad; `programaId`, `moduloId?`, `periodoId?`, `turno?`, `modalidad?`, `seccion?`, `estado`, `fuente`, `createdAt`, `updatedAt`. El operador define límites de cohortes cuando la fuente no los demuestra. No inferir periodo, módulo, turno, sección o modalidad de BD.zip. Un grupo de igual programa/módulo en otro periodo recibe otro ID. `matricula.grupoId` será referencia; los 295 `grupoCode` existentes se conservan como legado/procedencia, no se borran.

Esta es **arquitectura objetivo, no migración realizada**. Es condición previa recomendada a B-004/B-007 y a cualquier asignación académica real. v1 y los 17 stores permanecen intactos. El agrupador v1 ahora marca `INCONSISTENTE` si `periodoId` es mixto, y el write path/UI cotejan periodo y IDs de miembros contra el snapshot abierto; `DocumentDataService` bloquea contexto GROUP mixto. Sigue siendo mitigación transitoria, no identidad definitiva. APIs técnicas que no reciben `expectedEnrollmentIds` conservan compatibilidad pero no tienen ese guard de composición: se prohíbe usarlas para confirmación productiva nueva.

## Contextos documentales compartidos

Un resolved context normalizado usa IDs autoritativos y puede ser `ENROLLMENT`, `GROUP`, `GROUP+MODULE`, `ATTENDANCE+GROUP`, `EVALUATION+GROUP`, `EFSRT+GROUP`, `CLOSURE+GROUP`, `CERTIFICATION+ENROLLMENT` o `TITLE+EXPEDIENTE`. Los 21 PDF auditados en `DOCUMENT_MASTER_AUDIT.md` no autorizan un modelo por plantilla. Un resolver común entrega institución, estudiante/matrícula, grupo, programa, módulo, periodo y hechos académicos solo cuando cada fuente está confirmada; cada contrato selecciona campos y preflight decide emisión. GROUP primero resuelve `grupoId`, valida programa/módulo/periodo y luego une matrícula por ID. Título usa expediente explícito, no datos de un estudiante similar. No se añadió renderer ni binding nuevo en este gate.

## Riesgos y controles

Para varios años, evitar `list()` global en cada tecla: búsquedas/indexes paginados y caché invalidable; no joins O(N²), mapas por ID; renderers consumen contexto resuelto sin consultar DB. En v1, `getAll(grupoCode)` es indexado pero semánticamente ambiguo; futuros índices: `matriculas.grupoId`, `grupos_academicos.periodoId`, `programaId`, índice no único de `codigoVisible`, y consultas compuestas solo si la medición lo exige. No duplicar perfil institucional o currículo completo por matrícula. 295 filas actuales no justifican optimización prematura, sí pruebas de 50 grupos y acumulación multiperiodo.

Los datos de usuario deben pasar por `textContent`/`createElement` o escape contextual; el shell de grupos usa interpolación HTML **escapada** para valores, no `innerHTML` crudo. El auditor reporta IDs/códigos como datos, no ejecuta texto. Sin `eval` ni CDN nuevo en estos cambios; tests headless vigilan solicitudes externas para la suite académica. La herramienta técnica `app/tools_map.html` mantiene una dependencia CDN abierta (I-045), por lo que no se declara offline absoluto de todo el repositorio. IDs técnicos separados de rótulos visibles; previews y PDF usan texto, no HTML de usuario. Una revisión de seguridad completa y pruebas XSS de entradas maliciosas siguen pendientes.

## Gates obligatorios para cada feature futura

A fuente confirmada; B modelo/contrato e invariantes definidos; C servicio probado; D persistencia transaccional y rollback probados si escribe; E integración con resolved context; F regresión global failed=0; G validación física Edge en pantalla productiva; H export/restore e integrityCheck si cambia esquema/datos maestros. Un gate no aplicable se justifica explícitamente; uno fallido detiene el avance. B-002/B-004/B-007 no se cierran por pasar tests. Ver `DOMAIN_INVARIANTS.md`, `FEATURE_TEST_COVERAGE.md` y `MIGRATION_POLICY.md`.

## Adenda SCHEMA-V2-GROUP-01A

La decisión B fue materializada como **ensayo desconectado**: SCHEMA_V2 conserva 17 stores, añade `grupos_academicos` e índice `matriculas.grupoId`; migración, abortos, comparación, auditor y backup schema 2 se probaron solo con nombres de DB aislada. Esto reduce riesgo técnico pero no autoriza migración real: `CONFIG.DB.VERSION`, `database.js` y Edge continúan en v1. B-002/B-004/B-007 siguen abiertas y servicios/documentos productivos aún operan bajo compatibilidad v1.
