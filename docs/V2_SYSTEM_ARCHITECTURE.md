# Arquitectura del sistema candidato v2

La candidata usa el mismo shell local y offline de v1, pero se abre únicamente mediante configuración explícita `V2_CANDIDATE` sobre `CETPRO_V2_CANDIDATE`, schema 2. El bootstrap productivo conserva `CETPRO_DB`, schema 1.

Capas: UI → servicios de contexto → contratos/ResolvedFieldSet → renderer PDF. Los renderers no consultan IndexedDB. `GRUPO_ACADEMICO` y `matricula.grupoId` son la autoridad contextual; `grupoCode` queda como trazabilidad histórica. El auditor de integridad es de solo lectura y nunca repara.

Estado: técnicamente endurecida en laboratorio; no autorizada para producción mientras existan bloqueos académicos, aceptación física Edge, paquete portable y migración productiva pendientes.
