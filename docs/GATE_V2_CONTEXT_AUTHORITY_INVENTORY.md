# GATE-V2-CONTEXT-AUTHORITY-01 — inventario previo a cambios

Fecha: 2026-09-15. Comando reproducible: `rg -n 'CETPRO_DB|grupoCode|moduloId|periodoId|getByGrupoCode|grupo técnico|base productiva' app/js -g '*.js'`. Alcance: `app-v2/index.html` importa `v2-candidate/candidate-entry.js` y luego el `app/js/app.js` compartido; por tanto las ramas compartidas también se clasifican.

| Componente / coincidencias iniciales | Clase | Razón y disposición |
| --- | --- | --- |
| `config.js:17`, `db/database.js`, `db/schema.js`, `db/schema-v2-design.js` | A CORRECT_V2 | Valor productivo por defecto y esquema histórico; runtime candidato allowlisted separado. |
| `v2-candidate/candidate-services.js:20-23,47-48,58-79,101-143`, `candidate-repositories.js:19,28` | A CORRECT_V2 / D TEMPORARY_COMPATIBILITY | La asignación usa `groupId`; `grupoCode` es índice de búsqueda secundaria. Auditar guard dual-source y rollback. |
| `schema-v2-group-migration-service.js`, `storage-service.js`, `staging-recovery-service.js`, `productive-import-service.js` | C PROVENANCE_ONLY / A CORRECT_V2 | Código histórico de migración/backup o recuperación v1 expresamente separada. No ejecutarlo en candidata. |
| `attendance-service.js:93,139-146,185-187,212`; `evaluation-service.js:76-89,154-164,202-203,250` | E MUST_FIX_V2_AUTHORITY | GROUP por `grupoCode`, contexto entrante de matrícula; v2 debe exigir `groupId` y validarlo antes de escritura. |
| `academic-readiness-service.js:44-55,106-137,222-238,291-301`; `academic-closure-readiness-service.js:66-85` | E MUST_FIX_V2_AUTHORITY | Estado de módulo/periodo derivado de snapshots matrícula o grupos textuales. |
| `efsrt-service.js:41,96`, `efsrt-view.js:59-61,264-275` | E MUST_FIX_V2_AUTHORITY | Módulo autodeclarado y texto productivo en candidata. |
| `document-data-service.js:77,95-120,172-190` | E MUST_FIX_V2_AUTHORITY | Fallback `group.moduloId || enrollment.moduloId` y homogeneidad textual; reemplazar por autoridad groupId estricta. |
| `document-data-service.js:151,212`, `documents-view.js:164,205`, `students-view.js:287` | B DISPLAY_ONLY / C PROVENANCE_ONLY | Rótulo y trazabilidad histórica sin decisión académica. |
| `group-assignment-service.js:30-36` | E MUST_FIX_V2_AUTHORITY | `REVIEW_REQUIRED` se rotulaba como corrupción genérica. Rama v1 textual restante es D TEMPORARY_COMPATIBILITY. |
| `enrollment-repository.js:29-31,54,78-83` | D TEMPORARY_COMPATIBILITY / B DISPLAY_ONLY | `grupoCode` para búsqueda secundaria; no GROUP operativo. Filtros `moduloPendiente`/`periodoPendiente` en 69-72 son E y deben consultar grupo. |
| `enrollments-view.js:147-148,208,235` | E MUST_FIX_V2_AUTHORITY | Estado visible basado en snapshots legacy. `grupoCode` en 149,199,230 es B/C. |
| `attendance-view.js:75,112,125,258,347`, `evaluation-view.js:81,121,440`, `efsrt-view.js:59-61`, `closure-view.js:195` | E MUST_FIX_V2_AUTHORITY | Texto productivo y ruta TEST_ONLY textual expuesta en 8081; ocultar test mode v1 en candidata y declarar fuente v2. |
| `layout.js:592,606,616,795-819` | A CORRECT_V2 condicionado / E UX | Procedimientos de recuperación/eliminación restringidos por DB y puerto 8080; deben permanecer invisibles en candidata. Dashboard/prerrequisitos heredan E del servicio de readiness. |
| `enrollment-service.js:16-27,279-297`, `referential-audit-service.js:23-37`, `period-service.js:162,307-328` | D TEMPORARY_COMPATIBILITY | Implementación v1 histórica; ningún flujo académico candidato debe invocarla como autoridad. |

Regla de salida: en candidata, `matricula.grupoId → grupos_academicos.id → programaId/moduloId/periodoId`; `grupoCode` solo display/procedencia/búsqueda. Snapshots legacy iguales no reemplazan grupo; divergentes bloquean como `INCONSISTENCY`; snapshot no nulo con campo group nulo jamás se promueve.
