# APP-V2-CANDIDATE-01 — evidencia

Suite dedicada: **36/36**, FAILED=0.

Runner global final: **922/922 pruebas exitosas en 39 suites**, FAILED=0.

- Startup explícito `CETPRO_V2_CANDIDATE`, schema 2/18 stores.
- Datos reales: 269 estudiantes, 295 matrículas/staging, 12 grupos, 7 programas, 14 módulos, 0 periodos/unidades.
- 8 REVIEW_REQUIRED y 4 ACTIVO.
- Repository/groupId/ENROLLMENT/GROUP/readiness/auditor/dual-source: PASS.
- Backup v2 + prebackup + restore + readback: PASS.
- Multiaño con etiqueta repetida y asignación autoritativa solo al grupo: PASS.
- XSS: escapado; sin `eval`, `Function` o `insertAdjacentHTML`; 0 alertas.
- Rendimiento observado: 5.000 matrículas/300 grupos, `listGroups()` ~75–111 ms (orientativo, no SLA).
- 12 vistas: 0 errores JS, 0 warnings propios, 0 HTTP 4xx/5xx.
- 8080 y 8081 coexistieron.
- `CONFIG.DB.VERSION=1`; bootstrap productivo sin imports v2/candidatos.

La validación física visual en Microsoft Edge queda pendiente según `V2_EDGE_ACCEPTANCE_PLAN.md`.
