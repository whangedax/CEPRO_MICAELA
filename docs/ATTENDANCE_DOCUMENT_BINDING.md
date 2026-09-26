# Binding documental de asistencia TMPL-05–10

## Flujo

`buildAttendanceDocumentContext({ groupId, unidadId, periodoId })` lee el contexto académico y produce `resolvedFieldSet`, `rows`, matriz por `matriculaId`, sesiones, conteos operativos y trazabilidad de IDs. `PdfTemplateEngine` recibe este resultado; no consulta IndexedDB y el PDF nunca es entrada de datos.

La unidad didáctica selecciona TMPL-05–10 por `orden` 1–6. B-001 impide inventar una séptima plantilla. La salida productiva permanece bloqueada por B-002, B-004 y B-007; B-003 mantiene bloqueada la semántica oficial de inasistencia.

## Capacidades físicas

Medición independiente de límites vectoriales en cada PDF canónico:

| Plantilla | UD | Filas | PHYSICAL_SESSION_CAPACITY |
|---|---:|---:|---:|
| TMPL-05 | 1 | 40 | 44 |
| TMPL-06 | 2 | 40 | 35 |
| TMPL-07 | 3 | 40 | 38 |
| TMPL-08 | 4 | 40 | 44 |
| TMPL-09 | 5 | 40 | 44 |
| TMPL-10 | 6 | 40 | 40 |

El alumno 41 produce `CAPACITY_EXCEEDED`. Una sesión sobre la capacidad propia produce `SESSION_CAPACITY_EXCEEDED`. No se trunca, no se pierde información y no se inventa otra página.

## Campos físicos actuales

Las cajas verificadas permiten cabecera (`program.name`, `period.name`, `module.name`, `curriculum.unit.name`), 40 nombres y los conteos crudos presente/ausente. Estos últimos se rotulan contractualmente `OPERATIONAL_COUNT`. Las fechas y marcas de cada celda permanecen en el contexto lógico, pero no se pintan hasta certificar un binding bidimensional por plantilla; una capacidad medida no equivale a coordenadas de escritura aprobadas.

## QA

El laboratorio demuestra marca persistida → contexto canónico → renderer → PDF TMPL-05 `TEST_ONLY`. Los hashes/originales PDF no se editan. La emisión oficial continúa deshabilitada.
