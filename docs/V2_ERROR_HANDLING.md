# Manejo de errores v2

Errores funcionales deben tener código estable y mensaje comprensible. Desbordes documentales producen `FIELD_OVERFLOW`; exceso de filas produce `CAPACITY_EXCEEDED`; referencias inválidas se reportan por el auditor. No se permite truncamiento, omisión silenciosa, `catch` vacío ni registro de nombres/documentos personales. Una operación transaccional falla cerrada y revierte completa.
