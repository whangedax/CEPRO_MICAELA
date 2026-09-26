# Mapa de Campos desde Fuentes a Entidades (M00.1)

Este documento establece la correspondencia formal entre los campos de las fuentes originales (`BD.zip`, `CARRERAS.jpeg`), el modelo de datos ([DATA_CONTRACTS.md](file:///c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/docs/contracts/DATA_CONTRACTS.md)) y el esquema IndexedDB ([INDEXEDDB_SCHEMA.md](file:///c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/docs/contracts/INDEXEDDB_SCHEMA.md)).

---

## Mapeo Detallado de Campos

| FUENTE | CAMPO ORIGINAL | ENTIDAD DESTINO | CAMPO DESTINO | TRANSFORMACIÓN PERMITIDA | ESTADO |
|---|---|---|---|---|---|
| `BD.zip` | `DNI` (Col B) | `ESTUDIANTES` | `numeroDocumento` | Clean whitespace, almacenar estrictamente como `string`. Si no tiene 8 dígitos o está vacío, registrar con estado `PENDIENTE_REVISION`. | CONFIRMADO |
| `BD.zip` | `APELLIDOS Y NOMBRES` (Col C) | `ESTUDIANTES` | `nombresCompletoOriginal` | Conservar la cadena original completa sin alteraciones para auditoría inmutable. | CONFIRMADO |
| `BD.zip` | `APELLIDOS Y NOMBRES` (Col C) | `ESTUDIANTES` | `apellidoPaterno`, `apellidoMaterno`, `nombres` | Si contiene coma `APELLIDOS, NOMBRES`, separar primer apellido, segundo apellido y nombres. Si no hay coma, no forzar división inductiva. | CONFIRMADO |
| `BD.zip` | `SEXSO H-M` (Col D) | `ESTUDIANTES` | `sexo` | Mapear 'H' -> 'H' (Hombre/Masculino) y 'M' -> 'M' (Mujer/Femenino). Si está vacío, registrar nulo con advertencia. | CONFIRMADO |
| `BD.zip` | `FECHA` (Col E) | `ESTUDIANTES` | `fechaNacimiento` | Convertir número serial de Excel (ej: `33407` -> `1991-06-12`) o string fecha. Valores corruptos (ej: `'23/82/'`) se marcan para revisión. | CONFIRMADO |
| `BD.zip` | `EDEAD` (Col F) | `ESTUDIANTES` | `metadata.edadOrigen` | Guardar como metadato histórico de origen. La edad activa se calcula dinámicamente desde `fechaNacimiento`. | NO_IMPORTAR |
| `BD.zip` | `N° CEL` (Col G) | `ESTUDIANTES` | `telefono` | Limpiar espacios y caracteres no numéricos. Almacenar como `string`. | CONFIRMADO |
| `BD.zip` | `N°` (Col A) | `MATRICULAS` | `metadata.ordenOrigen` | Preservar número correlativo de lista como metadato de origen. | CONFIRMADO |
| `BD.zip` | Nombre de Archivo / Encabezado | `MATRICULAS` | `programaId` | Mapear la especialidad del archivo/hoja al ID del Programa Oficial en `CARRERAS.jpeg`. | CONFIRMADO |
| `BD.zip` | Nombre de Archivo / Turno | `MATRICULAS` | `turno` | Extraer `MAÑANA`, `TARDE`, `NOCHE`, `VIRTUAL` o `PRESENCIAL`. | CONFIRMADO |
| `BD.zip` | Encabezado '2026' | `PERIODOS` | `nombre` | Mapear a Periodo lectivo 2026. | CONFIRMADO |
| `BD.zip` | (No presente en fila) | `MATRICULAS` | `moduloId` | **PROHIBIDO INFERIR**. La asignación a Módulo I vs Módulo II debe ser seleccionada por el usuario o confirmada por la institución. | PENDIENTE |
| `BD.zip` | (No presente en fila) | `ESTUDIANTES` | `direccion`, `correo` | No inferir. Ingreso posterior por la secretaria o usuario. | PENDIENTE |
| `BD.zip` | (No presente en fila) | `MATRICULA_UNIDADES` | `unidadId` | Pendiente de catálogo curricular oficial completado. | PENDIENTE |
| `BD.zip` | (No presente en fila) | `ASISTENCIA` | `estado` | Pendiente de registro de clase por el docente/secretaría. | PENDIENTE |
| `BD.zip` | (No presente en fila) | `ASISTENCIA` | `ASISTENCIA_UD7` | **PROHIBIDO CREAR/INFERIR**. No existe plantilla `As-7` en las 21 fuentes institucionales. | NO_IMPORTAR |
| `BD.zip` | (No presente en fila) | `EVALUACION` | `nota` | Pendiente de evaluaciones por indicador de logro. | PENDIENTE |
| `CARRERAS.jpeg` | `PROGRAMA DE ESTUDIOS` | `PROGRAMAS` | `nombre`, `codigo` | Transcripción literal oficial del programa de estudios. | CONFIRMADO |
| `CARRERAS.jpeg` | `MÓDULO I` / `MÓDULO II` | `MODULOS` | `nombre`, `orden` | Transcripción literal oficial de la denominación del módulo. | CONFIRMADO |
