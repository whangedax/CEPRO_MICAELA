# Esquema de Persistencia IndexedDB (M00)

## 1. Especificación General de IndexedDB

- **Nombre de Base de Datos**: `CETPRO_DB`
- **Versión Actual**: `1`
- **Política de Acceso**: La capa UI (`app/ui/`) **NUNCA** accede directamente a IndexedDB. Todo acceso debe realizarse a través de Repositorios en `app/data/` invocados por Servicios en `app/services/`.
- **Transaccionalidad**: Las operaciones que involucren múltiples entidades (ej: Matrícula + Matrícula_Unidades + Auditoría) deben ejecutarse en una única transacción de IndexedDB con manejo estricto de `oncomplete` y `onerror`/`onabort`.

---

## 2. Definición de Object Stores e Índices (Versión 1)

### 2.1 `estudiantes`
- **KeyPath**: `id`
- **Índices**:
  - `numeroDocumento`: `{ unique: false }` (Permite auditoría y búsqueda sin fallar en inserciones conflictivas en staging).
  - `apellidos`: `{ unique: false }`

### 2.2 `matriculas`
- **KeyPath**: `id`
- **Índices**:
  - `estudianteId`: `{ unique: false }`
  - `periodoId`: `{ unique: false }`
  - `moduloId`: `{ unique: false }`
  - `grupoCode`: `{ unique: false }`
  - `estudiante_periodo`: `['estudianteId', 'periodoId']`, `{ unique: false }`

### 2.3 `institucion`
- **KeyPath**: `id`

### 2.4 `periodos`
- **KeyPath**: `id`
- **Índices**:
  - `nombre`: `{ unique: true }`

### 2.5 `programas`
- **KeyPath**: `id`
- **Índices**:
  - `codigo`: `{ unique: true }`

### 2.6 `modulos`
- **KeyPath**: `id`
- **Índices**:
  - `programaId`: `{ unique: false }`
  - `codigo`: `{ unique: false }`

### 2.7 `unidades`
- **KeyPath**: `id`
- **Índices**:
  - `moduloId`: `{ unique: false }`

### 2.8 `indicadores`
- **KeyPath**: `id`
- **Índices**:
  - `unidadId`: `{ unique: false }`

### 2.9 `docentes`
- **KeyPath**: `id`
- **Índices**:
  - `numeroDocumento`: `{ unique: true }`

### 2.10 `configuracion`
- **KeyPath**: `clave`

### 2.11 `matricula_unidades`
- **KeyPath**: `id`
- **Índices**:
  - `matriculaId`: `{ unique: false }`
  - `unidadId`: `{ unique: false }`

### 2.12 `asistencia`
- **KeyPath**: `id`
- **Índices**:
  - `matriculaId`: `{ unique: false }`
  - `unidadId`: `{ unique: false }`
  - `fecha`: `{ unique: false }`
  - `sesionId`: `{ unique: false }`

### 2.13 `evaluacion`
- **KeyPath**: `id`
- **Índices**:
  - `matriculaId`: `{ unique: false }`
  - `unidadId`: `{ unique: false }`
  - `indicadorId`: `{ unique: false }`
  - `batchId`: `{ unique: false }`
  - `payloadHash`: `{ unique: false }`

### 2.14 `efsrt`
- **KeyPath**: `id`
- **Índices**:
  - `matriculaId`: `{ unique: false }`
  - `moduloId`: `{ unique: false }`

### 2.15 `documentos`
- **KeyPath**: `id`
- **Índices**:
  - `tipoDocumento`: `{ unique: false }`
  - `referenciaId`: `{ unique: false }`
  - `fechaEmision`: `{ unique: false }`

### 2.16 `auditoria`
- **KeyPath**: `id`
- **Índices**:
  - `timestamp`: `{ unique: false }`
  - `entidad`: `{ unique: false }`
  - `entidadId`: `{ unique: false }`

### 2.17 `staging_importaciones`
- **KeyPath**: `id`
- **Índices**:
  - `loteId`: `{ unique: false }`
  - `estado`: `{ unique: false }`
  - `archivoOrigen`: `{ unique: false }`

---

## 3. Plan de Migración de Esquema

- Todas las migraciones futuras de esquema incrementarán el número de versión (`dbVersion + 1`) en `onupgradeneeded`.
- Queda prohibida la eliminación destructiva de stores existentes durante actualizaciones sin una rutina explícita de migración de datos.
