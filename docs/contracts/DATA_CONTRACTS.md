# Contratos de Datos del Sistema Académico CETPRO (M00)

## 1. Principios de Entidad e Identidad

### 1.1 Separación Estricta Estudiante vs Matrícula
- **ESTUDIANTE (Persona)**: Entidad que representa la identidad civil del estudiante (Nombres, Apellidos, Tipo/Número de Documento, Fecha de Nacimiento, Sexo, Datos de Contacto).
- **MATRICULA**: Instancia académica de inscripción de una Persona/Estudiante en un Periodo, Programa, Módulo y Grupo específico.
- **Regla de Cardinalidad**: `ESTUDIANTE 1 : N MATRICULAS`. Un estudiante puede registrar múltiples matrículas a lo largo del tiempo o en distintos programas/módulos.
- La repetición de un número de documento en listas históricas no autoriza fusión automática en presencia de conflictos de datos personales.

### 1.2 Reglas de Formato e Inmutabilidad
- **Documentos de Identidad (DNI/CE/Pasaporte)**: Se almacenan obligatoriamente como **texto** (`string`), nunca como tipo numérico, preservando ceros a la izquierda y caracteres no numéricos cuando aplique.
- **Códigos y Teléfonos**: Todo código institucional, código de estudiante, teléfono o valor con ceros iniciales se almacena como `string`.
- **Inmutabilidad de Fuentes**: Los archivos en `sources/raw/` son inalterables. Los procesos de carga procesan datos hacia staging conservando metadatos de trazabilidad (`archivo_origen`, `hoja_origen`, `fila_origen`, `hash_lote`).

---

## 2. Definición de Entidades del Dominio (16 Entidades)

| # | Entidad | Prefijo ID | Clave Primaria | Campos Esenciales | Relaciones |
|---|---|---|---|---|---|
| 1 | **INSTITUCION** | `INST-` | `id` | `nombre`, `denominacionVisible`, `tipoGestion`, `codigoModular`, `dre`, `ugel`, `direccion`, `telefono`, `celular1`, `celular2`, `resolucionAutorizacion1`, `resolucionAutorizacion2`, `resolucion`, `fuente`, `fuenteDescripcion` | 1:N Periodos / Programas |
| 2 | **PERIODOS** | `PER-` | `id` | `nombre` (ej: 2026-I), `fechaInicio`, `fechaFin`, `estado` | 1:N Matrículas |
| 3 | **PROGRAMAS** | `PROG-` | `id` | `codigo`, `nombre`, `tipoCiclo` (Auxiliar Técnico/Técnico), `horasTotales`, `creditosTotales` | 1:N Módulos |
| 4 | **MODULOS** | `MOD-` | `id` | `programaId`, `codigo`, `nombre`, `horas`, `creditos`, `orden` | 1:N Unidades |
| 5 | **UNIDADES** | `UNID-` | `id` | `moduloId`, `codigo`, `nombre`, `horas`, `creditos`, `orden` | 1:N Indicadores |
| 6 | **INDICADORES** | `IND-` | `id` | `unidadId`, `codigo`, `descripcion`, `peso` | 1:N Evaluaciones |
| 7 | **DOCENTES** | `DOC-` | `id` | `tipoDocumento`, `numeroDocumento`, `nombres`, `apellidos`, `especialidad`, `estado` | 1:N Grupos / Módulos |
| 8 | **CONFIGURACION** | `CFG-` | `clave` | `clave`, `valor`, `descripcion`, `actualizadoEn` | Configuración local del sistema |
| 9 | **ESTUDIANTES** | `EST-` | `id` | `tipoDocumento`, `numeroDocumento`, `nombresCompletoOriginal`, `nombres`, `apellidoPaterno`, `apellidoMaterno`, `sexo`, `fechaNacimiento`, `telefono`, `correo`, `direccion`, `estado` | 1:N Matrículas |
| 10 | **MATRICULAS** | `MAT-` | `id` | `estudianteId`, `periodoId`, `programaId`, `moduloId`, `grupoCode`, `turno`, `fechaMatricula`, `estado` | 1:N Asistencia / Evaluaciones / EFSRT |
| 11 | **MATRICULA_UNIDADES** | `MUNID-` | `id` | `matriculaId`, `unidadId`, `estado` (Inscrito/Aprobado/Convalidado/Retirado) | N:M Matrícula - Unidad |
| 12 | **ASISTENCIA** | `ASIS-` | `id` | `matriculaId`, `unidadId` (cualquier unidad oficial o de prueba; plantillas documentales limitadas a UD1-UD6), `sesionId`, `fecha`, `estado` (Presente/Falta/Tardanza/Justificado) | N:1 Matrícula |
| 13 | **EVALUACION** | `EVAL-` | `id` | `matriculaId`, `unidadId`, `indicadorId`, `nota` (0-20), `fecha`, `observacion`, `batchId`, `payloadHash`, `estudianteId`, `estadoLogico`, `estado`, `creadoEn`, `actualizadoEn` | N:1 Matrícula |
| 14 | **EFSRT** | `EFSRT-` | `id` | `matriculaId`, `moduloId`, `empresa`, `horasRealizadas`, `fechaInicio`, `fechaFin`, `nota`, `estado` (Extensiones técnicas: `observacion`, `estadoLogico`, `creadoEn`, `actualizadoEn`) | 1:1 o N:1 Matrícula |
| 15 | **DOCUMENTOS** | `DOCUM-` | `id` | `tipoDocumento` (Nomina/Ficha/Acta/Certificado/Titulo/etc.), `plantillaCodigo`, `referenciaId` (Estudiante/Matricula/Grupo), `fechaEmision`, `hashEmitido`, `operador` | Registro de emisiones |
| 16 | **AUDITORIA** | `AUD-` | `id` | `timestamp`, `tipoOperacion`, `entidad`, `entidadId`, `datosPrevios`, `datosNuevos`, `metadatos` | Bitácora inmutable de cambios |

---

## 3. Formatos y Estándares de Datos

- **Fechas**: Formato string ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Notas**: Almacenadas como números enteros o flotantes de acuerdo a la escala vigesimal (0 a 20), sin redondear prematuramente en almacenamiento.
- **IDs Técnicos**: Cadenas legibles con prefijo y UUIDv4 o timestamp + contador aleatorio determinista (ej: `EST-20260911-8F3A`).
