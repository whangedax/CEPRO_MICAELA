# Modelo de Datos y Especificación EFSRT (M08)

## 1. Especificación de Entidad EFSRT (Entidad 14)

```json
{
  "id": "EFSRT-550e8400-e29b-41d4-a716-446655440000",
  "matriculaId": "MAT-IMP-BD-001",
  "moduloId": "MOD-001",
  "empresa": "Taller Técnico Automotriz S.A.C.",
  "horasRealizadas": 120,
  "fechaInicio": "2026-04-01",
  "fechaFin": "2026-06-30",
  "nota": 17,
  "estado": "REGISTRADO",
  "observacion": "Prácticas en mantenimiento preventivo",
  "estadoLogico": "ACTIVO",
  "creadoEn": "2026-09-12T15:15:00.000Z",
  "actualizadoEn": "2026-09-12T15:15:00.000Z"
}
```

---

## 2. Índices de Persistencia IndexedDB (`efsrt`)

| Índice | Unique | Propósito |
|---|---|---|
| `id` | `true` (KeyPath) | Clave primaria primaria del registro EFSRT |
| `matriculaId` | `false` | Búsqueda por matrícula (Permite multiplicidad técnica) |
| `moduloId` | `false` | Búsqueda y filtrado por módulo curricular |

---

## 3. Desacoplamiento de Reglas Académicas

1. **Multiplicidad Técnica (`unique: false`):** IndexedDB no impide el registro de más de una experiencia EFSRT para la misma matrícula. Esto proporciona flexibilidad de motor sin declarar oficialidad académica de múltiples experiencias.
2. **Edición vs Creación:** Las operaciones `registerEfsrt` y `updateEfsrt` están desacopladas en API y UI.
3. **Anulación Lógica:** Se marca `estadoLogico: 'ANULADO'` sin borrado físico directo en la UI, conservando historial auditado.
