# Informe de Auditoría M07.1 — Contrato, Idempotencia y Atomicidad de Evaluación

## 1. Auditoría del Contrato Real de Evaluación

Se ha realizado la regularización y auditoría física entre `docs/contracts/DATA_CONTRACTS.md`, `docs/contracts/INDEXEDDB_SCHEMA.md` y el código fuente (`EvaluationRepository` / `EvaluationService`):

| CAMPO | EXISTE EN CONTRATO | EXISTE EN SCHEMA | EXISTE EN CÓDIGO | ORIGEN | JUSTIFICACIÓN TÉCNICA |
|---|---|---|---|---|---|
| `id` | SÍ | SÍ | SÍ | Sistema (`EVAL-*`) | Clave primaria única e inmutable de persisistencia. |
| `batchId` | SÍ | SÍ | SÍ | Transmisión | Identificador técnico de lote para garantizar idempotencia operativa. |
| `payloadHash` | SÍ | SÍ | SÍ | Sistema | Fingerprint determinista DJB2 de 64 bits (`FP-XXXXXXXXYYYYYYYY`) del contenido para detectar conflictos. |
| `matriculaId` | SÍ | SÍ | SÍ | Matrícula (`MAT-*`) | Clave foránea a la matrícula del estudiante. |
| `estudianteId` | SÍ | NO | SÍ | Estudiante (`EST-*`) | Clave foránea opcional de trazabilidad a la persona civil. |
| `unidadId` | SÍ | SÍ | SÍ | Unidad (`UNID-*`) | Unidad Didáctica evaluada. |
| `indicadorId` | SÍ | SÍ | SÍ | Indicador (`IND-*`) | Indicador de logro evaluado. |
| `nota` | SÍ | NO | SÍ | Usuario | Calificación en escala vigesimal contractual (0 a 20). |
| `fecha` | SÍ | NO | SÍ | Formulario | Fecha de la evaluación (ISO `YYYY-MM-DD`). |
| `observacion` | SÍ | NO | SÍ | Usuario | Observaciones cualitativas del docente. |
| `estadoLogico` | SÍ | NO | SÍ | Sistema | `ACTIVO` o `ANULADO` (borrado lógico auditado). |
| `estado` | SÍ | NO | SÍ | Sistema | Alias para compatibilidad de estados. |
| `creadoEn` | SÍ | NO | SÍ | Sistema | Timestamp ISO de creación del registro. |
| `actualizadoEn` | SÍ | NO | SÍ | Sistema | Timestamp ISO de la última modificación. |

---

## 2. Idempotencia y Conflicto de Payload (`IDEMPOTENCY_CONFLICT`)

### 2.1 Mismo `batchId` + Mismo Payload
- Si un lote con exactamente el mismo `batchId` y el mismo `payloadHash` se reenvía (ej. doble clic o reintento de red), el servicio detecta la transmisión previa y devuelve las evaluaciones del lote almacenado **sin duplicar filas ni alterar notas**.

### 2.2 Mismo `batchId` + Payload Diferente
- Si se reenvía el mismo `batchId` conteniendo un valor numérico distinto, otra matrícula o un indicador diferente, `EvaluationService` rechaza la operación inmediatamente lanzando un error estructurado:
  ```
  OperationalError: IDEMPOTENCY_CONFLICT: El batchId 'BATCH-EVAL-XXXX' ya fue procesado previamente con un contenido de evaluación diferente.
  ```
- El lote original almacenado **permanece intacto y no sufre modificaciones**.

---

## 3. Fingerprint Determinista del Lote (`computeBatchFingerprint`)

Para verificar que el contenido académico del lote sea idéntico independientemente del orden de los elementos o de timestamps volátiles, se calcula un fingerprint determinista:
- **Algoritmo Real**: Hashing determinista DJB2 de 64 bits nativo offline (Prefijo `FP-` seguido de 16 caracteres hexadecimales en mayúscula: 2 palabras de 32 bits `h1Hex` y `h2Hex`).
- **Campos incluidos**: `grupoCode`, `unidadId`, `indicadorId`, `fecha`, y la lista de `evaluaciones` (`matriculaId`, `estudianteId`, `nota`, `observacion`).
- **Normalización**: La lista de evaluaciones se ordena determinísticamente por `matriculaId` antes de serializar.
- **Invariancia al orden**: Cambiar el orden de las filas en la interfaz genera exactamente el mismo `payloadHash`.
- **Sensibilidad al contenido**: Modificar una nota o una matrícula altera el `payloadHash` resultante.

---

## 4. Atomicidad y Rollback en Persistencia

- **Validación Atómica Pre-Persistencia**: Todas las validaciones de rango (0-20), duplicados dentro del mismo lote (`seenMatriculas`), verificación de `canRegisterEvaluation` e integridad referencial se ejecutan **antes** de iniciar cualquier escritura en IndexedDB. Si el 6° elemento de 6 es inválido, **0 registros** son guardados (todo o nada).
- **Rollback de Transacción**: En caso de ocurrir un fallo técnico durante la escritura (`store.put`), la transacción se aborta (`tx.abort()`), asegurando que la base de datos no conserve un lote parcialmente guardado. El `batchId` fallido puede ser reintentado posteriormente.

---

## 5. Robustez de Identificadores (`EVAL-*` y `batchId`)

- `generateEvaluationId()` y `generateBatchId()` utilizan el estándar `crypto.randomUUID()` completo en mayúsculas (UUID v4 de 128 bits).
- Antes de persistir una nueva evaluación, se realiza una verificación de colisión pre-persistencia en el repositorio, regenerando la clave en la remota eventualidad de un duplicado.

---

## 6. Estado de Producción `CETPRO_DB`

- **INSTITUCIONES**: 1
- **PROGRAMAS**: 7
- **MÓDULOS**: 14
- **PERIODOS**: 0
- **ESTUDIANTES**: 269
- **MATRÍCULAS**: 295 (295 `moduloId = null`, 295 `periodoId = null`)
- **UNIDADES**: 0
- **ASISTENCIA**: 0
- **EVALUACIÓN**: 0
- **STAGING IMPORTACIONES**: 295
- **CERO registros `TEST_ONLY` en `CETPRO_DB`.**
