# Modelo `GRUPO_ACADEMICO`

```text
id                         string, PK técnica
codigoVisible              string, no identidad
sourceGroupCode            string|null, trazabilidad v1/BD.zip
programaId                 string, FK obligatoria
moduloId                   string|null
periodoId                  string|null
turno                      string|null
modalidad                  string|null
seccion                    string|null
estado                     ACTIVO | INACTIVO | REVIEW_REQUIRED
moduleAssignmentStatus     UNASSIGNED | ASSIGNED
periodAssignmentStatus     UNASSIGNED | ASSIGNED
reviewReasons              string[]
source                     objeto de procedencia sin datos personales
createdAt / updatedAt      ISO-8601
```

Para legado v1, el ID reproducible es `GAC-V1-<grupoCode exacto>` (por ejemplo `GAC-V1-GRP-BD-001`). Solo identifica la cohorte creada por esta migración concreta; no declara que el código sea global. Los nuevos grupos deben usar IDs opacos independientes (`GAC-<UUID>` o generador equivalente), aunque repitan etiqueta visible.

`sourceGroupCode` conserva exactamente `matricula.grupoCode`. La matrícula mantiene `grupoCode` y añade `grupoId`; ningún campo previo se elimina o reescribe. `codigoVisible` inicialmente replica la etiqueta histórica únicamente para visualización.

## Derivación estricta

- Programa: se copia solo si todas las matrículas del código comparten un `programaId` existente. Mezcla o inexistencia aborta todo.
- Módulo: cualquier valor previo no nulo se preserva en la matrícula, pero no se eleva al grupo sin confirmación explícita; grupo `moduloId=null`, `REVIEW_REQUIRED`.
- Periodo: no se toma de PDFs ni de textos visibles. En el dataset esperado, `periodoId=null` y B-007 abierta.
- Turno/modalidad/sección: solo se copian si el valor uniforme tiene `academicContextSources[field]` en todas las matrículas aplicables. Vacío/`PENDIENTE` queda null; mezcla o procedencia insuficiente queda null y genera review.
- Estado: faltar módulo/periodo por B-004/B-007 no invalida un grupo; el estado académico de asignación se mantiene separado del estado operativo.

Los contextos y acciones futuras deben resolver por `grupoId`. `sourceGroupCode` queda para trazabilidad, búsqueda secundaria y presentación.
