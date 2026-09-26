# ACADEMIC-CONTEXT-01 — evidencia de prueba

Fecha: 2026-09-15. Comandos: `node --check app/js/services/group-assignment-service.js`, `node --check app/js/ui/group-assignment-view.js`, `node --check app/js/services/document-data-service.js`, `node --check app/js/ui/layout.js`, `node --check app/js/config.js`, `node --check scripts/verify_academic_context_runtime.js`; `node scripts/verify_academic_context_runtime.js`; `node scripts/verify_project.js`.

DB de prueba: `CETPRO_ACADEMIC_CONTEXT_01_TEST_DB`, 12 códigos `TEST-GRP-*`, 295 matrículas/estudiantes sintéticos, 7 programas/14 módulos sintéticos; **ninguna asignación en la DB productiva del usuario**.

| Casos | Resultado |
|---|---|
| T-AC01-01–04 + 04B: grupos, vector, estado, selector y filtro Matrículas desde DB | 5/5 |
| T-AC01-05–07 + 06A/06B: tabla, apertura, selección, rechazo de confirmación y cancelación sin escritura | 5/5 |
| T-AC01-08–10 + 10B: confirmación, programa cruzado, impacto obsoleto y rollback tras fallo de auditoría | 4/4 |
| T-AC01-11–13: grupo exacto, otro intacto, auditoría y cambio explícito | 3/3 |
| T-AC01-14–16: mixto bloqueado, contexto sin periodo/currículo, DB aislada | 3/3 |
| T-AC01-17–19: consola, recarga y cero Internet obligatorio | 3/3 |
| **Total dedicado** | **23/23, FAILED=0** |

Regresión integral M01–RECOVERY-01: **753/753, 33 suites, FAILED=0**. Suite heredada M05.1 20/20 actualizada para exigir el nuevo flujo transaccional, no para omitir validaciones. La lectura física de los conteos y módulos de **Edge del usuario** queda pendiente: el intento de acceso expiró por autorización de la ventana; no se sustituyó por los datos sintéticos ni por el vector histórico.
