# CEPRO Micaela — paquete de datos documentales para integración de BD

Versión: 1.0, corte documental 2026. Fuente entregada: ZIP `BD CEPRO DOCUMENTOS.zip`, que contiene un único PDF escaneado de 150 páginas. SHA-256 del PDF: `ba7960b3db9ae24010b8201cc852fa8f6dd3923b66f5586f25cc846ab36a9620`.

## Resultado y estado real

Se organizaron siete programas, 129 capacidades, 378 indicadores de capacidad y 258 indicadores de logro de competencia (UC/CE). Los conteos incluyen registros con observaciones, padres por validar o texto incompleto; no equivalen a registros aprobados para producción. Se conservaron los códigos originales separados de IDs técnicos propuestos y las páginas de procedencia. No se duplicaron automáticamente las apariciones del mismo contenido entre formulación y elementos de módulo.

El paquete está preparado para entregar al equipo que implementa el sistema y realizar una importación de revisión. **No es una migración ejecutable ni una aprobación de carga directa en producción.** La fuente contiene contradicciones; el ZIP no incluye esquema de BD, código, migraciones, importador ni reglas operativas completas. Resolver una contradicción exige una fuente institucional válida, no adivinar el valor más frecuente.

«Logro» en estos archivos significa indicador curricular esperado. No hay evidencia de logros alcanzados por alumnos, notas, asistencia ni prácticas efectivamente realizadas.

## Índice por programa

| Programa | Archivo principal | Páginas PDF | Capacidades | Indicadores de capacidad | Indicadores UC/CE |
|---|---|---:|---:|---:|---:|
| Mecánica Automotriz | [01_mecanica_automotriz.md](carreras/01_mecanica_automotriz.md) | 2–19 | 10 | 34 | 40 |
| Mecánica de Motos y Vehículos Afines | [02_mecanica_motos.md](carreras/02_mecanica_motos.md) | 20–42 | 35 | 147 | 50 |
| Carpintería Metálica | [03_CARPINTERIA_METALICA.md](carreras/03_CARPINTERIA_METALICA.md) | 43–66 | 14 | 42 | 44 |
| Peluquería y Barbería | [04_PELUQUERIA_BARBERIA.md](carreras/04_PELUQUERIA_BARBERIA.md) | 67–100 | 15 | 66 | 34 |
| Computación e Informática | [05_computacion_informatica.md](carreras/05_computacion_informatica.md) | 101–120 | 11 | 35 | 19 |
| Corte y Ensamblaje | [06_corte_ensamblaje.md](carreras/06_corte_ensamblaje.md) | 121–141 | 32 | 32 | 26 |
| Mantenimiento de sistemas eléctricos | [07_mantenimiento_sistemas_electricos.md](carreras/07_mantenimiento_sistemas_electricos.md) y [07b_electricos_indicadores_competencia.md](carreras/07b_electricos_indicadores_competencia.md) | 142–150 | 12 | 22 | 45 |
| **Total de registros extraídos** | | | **129** | **378** | **258** |

Cada archivo incorpora identificación, perfil y competencias, capacidades e indicadores vinculados, módulos, UD, EFSRT, horas, créditos, personal y fechas donde la fuente los permite. El bloque eléctrico es parcial: no contiene organización modular, elementos ni itinerario completo. Los nombres de personas son menciones documentales, no cuentas ni autorizaciones.

## Archivos para configurar e integrar

| Archivo/carpeta | Uso |
|---|---|
| `01_ENTREGA_PARA_ORQUESTADOR.md` | Instrucción concreta para integrar el paquete al sistema existente. |
| `arquitectura/01_MODELO_RELACIONAL_PROPUESTO.md` | Entidades, claves, relaciones, niveles de indicador, versionado y procedencia. |
| `arquitectura/02_CONTRATO_IMPORTACION_Y_VALIDACION.md` | Contrato de carga, staging, claves estables, deduplicación, idempotencia y validaciones. |
| `arquitectura/03_CONFIGURACION_SISTEMA_Y_DATOS_FALTANTES.md` | Parámetros observados, configuración técnica propuesta, reglas no documentadas y flujos por verificar. |
| `auditoria/00_cobertura_fuente.md` | Inventario de las 150 páginas y evidencia de cobertura. |
| `auditoria/01_hallazgos_produccion.md` | Errores de fuente, vacíos, diferencias con OCR y tratamiento de bloqueos. |
| `auditoria/02_CONTROL_ESTRUCTURAL.md` | Conteos y verificaciones mecánicas; no certifica validez académica. |
| `evidencia/*.md` | OCR por página para localizar recursos, actividades, ambientes, metodología, perfiles docentes y textos originales. Material auxiliar que requiere cotejo, excluido de importación automática. |
| `99_INVENTARIO_Y_HUELLAS.md` | Archivos entregados y huellas para comprobar integridad. |

## Reglas de lectura y deduplicación

- Las páginas son posiciones del PDF (1–150), no los folios manuscritos.
- Los IDs de las carreras son propuestas de referencia. Persistir un mapa al identificador real de la BD. No renumerar al ordenar tablas.
- Un código «C1 I1» se repite legítimamente entre capacidades y carreras. No deduplicar por código o texto aislado.
- Los indicadores de competencia UC/CE y los indicadores de capacidad son niveles distintos: padres y tablas separados.
- Los textos de capacidades pueden estar recompuestos de verbo, objeto y condición. Los perfiles resumidos y definiciones sintetizadas son para consulta; para una reproducción literal utilizar el PDF y su evidencia, sin sustituir el texto oficial por una paráfrasis.
- Mantener desconocidos como `null`; no transformarlos en cero, falsa aprobación o contenido generado.
- Las tablas normalizadas no comparten todas el mismo orden de columnas. El adaptador debe mapear por encabezado y ámbito, nunca por posición fija ni tomar todos los bloques Markdown como seeds.
- Fechas en formato fuente y fechas ISO conviven deliberadamente. Conservar literal y normalizar solo fechas válidas confirmadas; los conflictos quedan en staging.
- Repeticiones corroboradas aportan más evidencias a la misma entidad. Las variantes contradictorias se conservan como observaciones; no elegir una silenciosamente.

## Bloqueos principales que el sistema debe reconocer

Hay diferencias de horas y créditos; fechas invertidas y años contradictorios; códigos UC/CE reutilizados o mal rotulados; encabezados institucionales inconsistentes; texto textil dentro del bloque de Motos; y capacidades o indicadores incompletos. Los hallazgos se describen por página y por carrera. El material ajeno de Motos queda en cuarentena y no se reasigna a otra carrera.

El PDF tampoco define de forma suficiente las reglas de evaluación, asistencia, recuperación, certificación, matrículas, permisos personales y operación del software. Se enumeran como dependencias concretas en configuración. La evidencia OCR auxiliar conserva contenido de las 150 páginas, pero no significa que cada recurso o actividad ya tenga una relación UD validada.

## Orden de uso

Leer este índice, la auditoría y el contrato; mapear las entidades al esquema real; importar a staging los registros extraídos con su estado; resolver conflictos con la institución; ensayar las validaciones y flujos; después generar una migración compatible y revisable. La promoción a producción es una fase posterior que no fue ejecutada en este trabajo.
