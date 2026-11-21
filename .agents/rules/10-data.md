---
trigger: model_decision
description: Cambios de datos académicos, SQLite, importación, backups o sincronización.
---
# Integridad de datos
Consulta los contratos pertinentes de `docs/contracts/` y `docs/DATA_MODEL.md`
mediante búsqueda puntual antes de cambiar persistencia.
No mezclar bases reales con QA ni alterar reglas académicas por inferencia.
Comprueba identidad, matrícula, contexto académico y aislamiento por rol/año
cuando el cambio los afecte. Una operación UI no debe duplicar autoridad de datos.
