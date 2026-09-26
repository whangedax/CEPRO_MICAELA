# Formato `CETPRO_BACKUP` v2

El número **2** es la versión del formato del archivo; `schemaVersion: 1` sigue describiendo el schema productivo actual. No implica `CETPRO_DB` v2.

```json
{
  "format": "CETPRO_BACKUP",
  "formatVersion": 2,
  "schemaVersion": 1,
  "createdAt": "2026-09-15T00:00:00.000Z",
  "appVersion": "...",
  "origin": "USER_EXPORT | PRE_RESTORE_BACKUP",
  "database": "CETPRO_DB",
  "storeManifest": [{ "name": "estudiantes", "keyPath": "id" }],
  "stores": { "estudiantes": [] },
  "counts": { "estudiantes": 0 },
  "integrity": {
    "algorithm": "SHA-256",
    "canonicalization": "JCS-LIKE-SORTED-KEYS-V1",
    "checksum": "64 caracteres hex"
  }
}
```

El ejemplo abrevia el manifiesto: un archivo v1 válido contiene exactamente los 17 nombres/keyPaths contractuales en `storeManifest`, `stores` y `counts`. `counts[name] === stores[name].length`. El checksum cubre todas las propiedades salvo el propio objeto `integrity`; los objetos se serializan con claves ordenadas y los arrays conservan su orden. Los registros exportados por IndexedDB llegan en orden de clave, haciendo reproducible el payload. Timestamps distintos entre dos exportaciones no afectan la comparación semántica de round-trip, que compara `stores` completos.

La versión se lee solo desde metadata interna; el nombre `.json` nunca decide compatibilidad. `formatVersion !== 2`, `schemaVersion !== 1`, algoritmo distinto, checksum inválido, manifiesto diferente, count incorrecto, keyPath incompatible, registro sin clave, clave/índice único duplicado o referencia huérfana abortan antes de escribir.

## Compatibilidad legacy

Se reconoce el envelope histórico `{version,timestamp,dbName,dbVersion,storesCount,storeCounts,stores}` únicamente si `dbVersion=1` y contiene exactamente los 17 stores esperados. Se convierte **en memoria** a formato 2, se calculan counts, manifiesto y un checksum nuevo, y luego se aplican todas las validaciones actuales. El archivo histórico no se modifica ni sobrescribe.

Como el legacy no traía checksum, no es posible demostrar que no fue alterado antes de importarlo; solo se puede demostrar coherencia estructural, unicidad y referencialidad en el momento del preflight. Si falta/sobra un store o no pasa esas reglas, la conversión se considera insegura y se rechaza. Un backup schema 2 no se migra a v1 ni dispara `onupgradeneeded`.
