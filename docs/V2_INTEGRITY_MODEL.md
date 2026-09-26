# Modelo de integridad v2

`SystemIntegrityService` audita schema 2, 18 stores, índices críticos, claves duplicadas, huérfanos y divergencias de doble fuente. Cubre matrícula→estudiante/programa/grupo; grupo→programa/módulo/periodo; unidad→módulo; indicador→unidad; y contextos de asistencia, evaluación, EFSRT y documentos.

El resultado contiene `valid`, conteos e incidencias sin PII. La operación usa una transacción `readonly`, rechaza `CETPRO_DB` y no posee ruta de reparación.
