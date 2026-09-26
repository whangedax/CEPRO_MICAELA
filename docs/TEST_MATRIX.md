# Matriz resumida de gates v1/v2

| Gate | Suite | Estado | Pendiente |
|---|---|---|---|
| Arquitectura B (`GRUPO_ACADEMICO/grupoId`) | ARCHITECTURE-HARDENING-01 | Laboratorio validado | Migración productiva no autorizada |
| Backup/restore H | BACKUP-HARDENING-01 | Técnico v1 validado | Descarga/restore Edge físico |
| Migración aislada v1→v2 | SCHEMA-V2-GROUP-01A/01B | 28/28 y 38/38 | Ventana y backup externo productivo |
| Candidata convergente | V2-FUNCTIONAL-PARITY-01 | 38/38 local | Aceptación física Edge y write paths académicos |
| Motor documental | DOCUMENT-CONTRACT-01/DOCUMENT-BINDING-01/V2-FUNCTIONAL-PARITY-01 | TMPL-02 preview probado | PDF Edge, TMPL-01 GROUP y 03–21 bloqueados |
| Capa documental integral candidata | NIGHT-DOCUMENT-BUILD-01 | 21 manifests, fit/capacidad/hashes y estados UX | Geometría/fuentes de 03–21 y aceptación Edge; emisión oficial bloqueada |
| Harness de aceptación física | EDGE-PHYSICAL-ACCEPTANCE-05 | 28/28 técnico; QA 8081 separada, offline, sin DB | Ejecución humana y diez capturas en Microsoft Edge |
| Modo demostración aislado | DEMO-OPERATIONAL-MODE-09 | 49/49; DB DEMO, E2E, documentos, asistencia, backup, reset, aislamiento | Recorrido y firma humana de Jefatura; no autoriza producción |

La matriz no representa aceptación productiva. `verify_project.js` descubre todas las suites `*.regression.js` y calcula el total al ejecutarlas. En este gate, la allowlist segura v2/DEMO pasó 489/489 en 17 suites; el host impidió repetir suites históricas que abren una IndexedDB llamada `CETPRO_DB`, por lo que no se declara un total global posterior ficticio.
