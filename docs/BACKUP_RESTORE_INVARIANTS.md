# Invariantes de backup y restore

| ID | Regla |
|---|---|
| BRI-001 | Export contiene `format=CETPRO_BACKUP`, formatVersion y schemaVersion explícitos. |
| BRI-002 | Schema v1 exige exactamente los 17 nombres y keyPaths de `SCHEMA_V1`; faltantes/extra se rechazan. |
| BRI-003 | Cada count coincide con el array exportado y cada clave primaria es válida/única. |
| BRI-004 | SHA-256 se verifica antes de abrir una transacción de escritura. |
| BRI-005 | Matrícula, módulo, periodo, unidad, indicador y registros académicos pasan auditoría referencial en memoria. |
| BRI-006 | Un archivo es datos: nunca se evalúa ni se inserta como HTML. Máximo 50 MiB. |
| BRI-007 | Restore usa una única transacción `readwrite` para todos los stores: todo o nada. |
| BRI-008 | Restore productivo requiere confirmación explícita; cancelar produce cero escrituras. |
| BRI-009 | Antes de restore productivo se genera/verifica/entrega `PRE_RESTORE_BACKUP`; cualquier fallo detiene el proceso. |
| BRI-010 | Después del commit se reabre la DB productiva y se comparan stores/counts/IDs/valores mediante hash semántico. |
| BRI-011 | El readback repite unicidad y referencialidad; éxito solo se comunica si no hay incidencias. |
| BRI-012 | Nombre de archivo, fecha visible o número de registros no reemplazan metadata/checksum internos. |
| BRI-013 | Legacy solo se convierte en memoria si su schema y manifiesto exacto pueden validarse; no se reescribe. |
| BRI-014 | Restore nunca cambia `db.version` ni crea stores; schema incompatible falla cerrado. |
| BRI-015 | Round-trip A→backup→B→backup preserva semánticamente stores, claves, valores y relaciones. |
| BRI-016 | Toda entidad futura debe integrarse en manifest/export/restore/schemaVersion/integrityCheck y pruebas adversariales. |

Casos adversariales automatizados T-BH01-01–24: válido; checksum alterado; truncado; store faltante/inesperado; clave duplicada; referencia huérfana; schema incompatible; fallo después de limpiar primer store, en mitad, en último store y antes de commit; prebackup fallido; legacy seguro; preflight/cancelación UI; round-trip 269/295/295; 0/0, 1/1; y 5.000 matrículas multianuales. En todo rechazo/fallo se compara el hash semántico de la DB destino antes/después.
