---
name: audit-source
description: Audita una fuente CETPRO sin modificarla, conservando trazabilidad de archivo, hoja, fila, valores y hashes.
---
# Audit Source

1. Calcular SHA-256 de la fuente.
2. No modificar el original.
3. Identificar estructura, encabezados, hojas, rangos y tipos.
4. Registrar anomalías sin "corregir" por intuición.
5. Para datos tabulares, conservar `archivo/hoja/fila` como origen.
6. Separar conteo de filas, identidades candidatas y matrículas candidatas.
7. Emitir informe de hallazgos y bloqueos.
