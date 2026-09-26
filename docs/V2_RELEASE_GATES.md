# Gates de liberación v2

| Gate | Estado | Evidencia / bloqueo |
|---|---|---|
| R1 schema/integridad | PASS | schema 2 aislado + auditor read-only |
| R2 autoridad groupId | PASS | candidata y regresión |
| R3 backup/restore | PASS técnico | laboratorio aislado; aceptación real pendiente |
| R4 offline | PASS técnico | cero dependencia runtime externa |
| R5 renderers | PASS técnico | TMPL-04–21; emisión bloqueada |
| R6 fuentes académicas | BLOCKED | B-001…B-007; especialmente B-002/B-004/B-007 |
| R7 aceptación física Edge | NOT_EXECUTED | requiere revisión humana |
| R8 paquete Windows portable | NOT_EXECUTED | solo plan documentado |
| R9 migración productiva | NOT_EXECUTED | prohibida en este gate |
| R10 auditoría post-migración | NOT_EXECUTED | depende de R9 |

`READY_FOR_PRODUCTION = NO`.
