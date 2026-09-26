# Fuentes

`raw/` contiene originales de datos que no deben modificarse.
`reference/` contiene especificaciones históricas útiles para reconstruir requisitos.
`legacy/` conserva el paquete y reglas antiguas basadas en Excel/VBA únicamente como trazabilidad.
`templates/` contiene las 21 plantillas institucionales recibidas, sus vistas previas, auditoría e integridad.

## Regla para plantillas

- Los XLSX de `sources/templates/originals/xlsx/` son inmutables.
- Las PNG de `sources/templates/previews/` son evidencia visual para comparación.
- `sources/templates/CATALOGO_PLANTILLAS.md` contiene inventario y SHA-256.
- Antes de una emisión real, la institución debe confirmar la vigencia normativa del formato correspondiente.
- No crear una plantilla `ASISTENCIA_UD7`: no existe en la fuente recibida.
