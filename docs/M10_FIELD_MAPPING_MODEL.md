# MODELO DE MAPEO DE CAMPOS Y TRANSFORMACIONES M10 (FieldMappingEngine)

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Módulo:** M10 — Motor Documental Institucional  

---

## 1. ESTRUCTURA DE REGLA DE MAPEO DECLARATIVO

```javascript
{
  fieldId: "INSTITUCION_NOMBRE",
  sourcePath: "institution.nombre",
  targetSelector: "institucion-nombre",
  transform: "UPPERCASE",
  requiredForPreview: false,
  requiredForOfficial: true,
  blockedByRule: null
}
```

### Separación Estricta:
- `requiredForPreview`: Define si la ausencia del campo detiene el render de vista previa (por defecto `false`, mostrando marcadores `[PENDIENTE]` en `DRAFT_PREVIEW`).
- `requiredForOfficial`: Define si el campo es obligatorio para una futura emisión oficial (actualmente inalcanzable).
- `blockedByRule`: Identificador de regla de bloqueo vinculada (ej: `B-004`, `B-006`, `B-007`).

---

## 2. TRANSFORMACIONES TÉCNICAS PERMITIDAS

| Transformación | Comportamiento Técnico |
|---|---|
| `IDENTITY` | Retorna el valor en string sin modificaciones. |
| `UPPERCASE` | Convierte la cadena a mayúsculas manteniendo acentuación. |
| `LOWERCASE` | Convierte la cadena a minúsculas. |
| `FORMAT_DATE` | Convierte fecha ISO `YYYY-MM-DD` a formato `DD/MM/YYYY`. |
| `JOIN_NAME` | Concatena `apellidoPaterno`, `apellidoMaterno` y `nombres`. |
| `FORMAT_NUMBER` | Formatea a 2 decimales string (`14.00`). |
| `MULTILINE` | Reemplaza saltos `\n` por etiquetas `<br/>`. |

---

## 3. TRANSFORMACIONES ACADÉMICAS EXPRESAMENTE PROHIBIDAS

El motor rechaza de forma absoluta:
- `AVERAGE` (Fórmulas de promedio de notas).
- `PASS_FAIL` (Dictámenes de Aprobado / Desaprobado).
- `CALCULATE_ATTENDANCE` (Porcentajes de inasistencias de inhabilitación).
- `EFSRT_COMPLIANCE` (Convalidación o suficiencia EFSRT).
- `INFER_MODULE` / `INFER_PERIOD` (Inferencia de datos faltantes).
- `GENERATE_FOLIO` (Invención de folios, correlativos o números oficiales).
