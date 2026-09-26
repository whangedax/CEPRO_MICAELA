# Deprecación de `grupoCode`

Regla candidata: una acción académica GROUP debe recibir `groupId`. `assertGroupContextKey()` rechaza payloads con `groupCode` como clave primaria.

Autoridad: `grupos_academicos.id`; pertenencia: `matriculas.grupoId`. `AcademicGroupRepository.getBySourceGroupCode()` y `CandidateEnrollmentRepository.getByVisibleGroupCode()` están marcados `@deprecated` y solo sirven para compatibilidad/búsqueda secundaria.

Usos permitidos:

- `DISPLAY_ONLY`: código visible en tablas y documentos.
- `PROVENANCE_ONLY`: `sourceGroupCode` y trazabilidad BD.zip.
- `TEMPORARY_COMPATIBILITY`: resolver una búsqueda visible a uno o más IDs antes de cualquier acción.

Usos prohibidos: asignación, asistencia, evaluación, readiness, cierre o documentos GROUP por texto visible. La regresión falla si `assignModule` vuelve a aceptar `groupCode`.

Durante transición, si grupo y matrícula contienen módulo/periodo no nulos y divergen, el resultado es `INCONSISTENCY`; el grupo es autoridad tras activar v2. No se borran snapshots legacy en esta fase.
