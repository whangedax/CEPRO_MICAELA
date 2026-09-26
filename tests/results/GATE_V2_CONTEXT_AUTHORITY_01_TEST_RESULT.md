# GATE-V2-CONTEXT-AUTHORITY-01 — evidencia reproducible

Fecha: 2026-09-15. Fuente de prueba: `tests/gate_v2_context_authority_01.regression.js`. Únicamente registros sintéticos `*-SYNTH-*` escritos en `CETPRO_V2_CONTEXT_AUTHORITY_LAB` schema2; se cierra y elimina esta DB aislada al terminar. El backup real se usa solo para el bootstrap de la candidata; no se incluyen nombres, documentos ni payloads personales en esta evidencia.

- `node --check` de archivos JS modificados: sin errores.
- Suite dedicada: 27/27, failed=0. Cubre groupId válido/inexistente, programa cruzado, módulo/periodo nulos o confirmados, snapshot igual/divergente, no elevación legacy, REVIEW_REQUIRED vs inconsistencia, groupCode repetido, rechazo de clave textual, Registro/Evaluación/EFSRT/Cierre/DocumentData GROUP, catálogo TMPL-02/TMPL-01, dashboard, aislamiento, conteos y rollback después de encolar `group.put`, más bloqueo transaccional de snapshot propuesto divergente y review sin modificación parcial.
- Paridad funcional v2: 38/38, failed=0; TMPL-02 real → Blob PDF/visor/descarga, TMPL-01 bloqueada.
- `node scripts/verify_project.js`: 989/989, 41 suites, failed=0.
- Candidata headless: estudiantes 269, matrículas 295, grupos 12, programas 7, módulos 14, periodos 0, unidades 0, object stores 18. Conteos iguales antes/después de navegar y probar; no hubo asignación ni creación académica real.
- Aislamiento: configuración productiva default schema1, runtime 8081 allowlisted `CETPRO_V2_CANDIDATE` schema2; no ruta de prueba abre CETPRO_DB productiva.

No constituye autorización de migración o activación de v2. Validación física Edge del gate pendiente; B-002/B-004/B-007 continúan abiertos.
