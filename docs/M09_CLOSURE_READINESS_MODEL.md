# MODELO DE DIAGNÓSTICO DE CIERRE ACADÉMICO M09

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Documento:** Modelo de Diagnóstico Técnico de Cierre Académico  
**Módulo:** M09  

---

## 1. CONCEPTO Y SEPARACIÓN SEMÁNTICA

El modelo de cierre académico en M09 se basa estrictamente en la separación entre **Completitud de Contexto Técnico** (`technicalContextComplete`) y **Autorización Institucional de Cierre** (`academicClosureAllowed`).

```
[Datos Observados]  ──►  technicalContextComplete (true/false)
                                  │
                                  ▼
                         Bloqueos Normativos (B-002, B-003, B-004, B-005, B-007)
                                  │
                                  ▼
                         academicClosureAllowed = ALWAYS FALSE
```

### Principio Inflexible:
- `technicalContextComplete = true` significa únicamente que la matrícula cuenta con periodo asignado, módulo asignado y al menos 1 unidad/indicador configurado en su modelo técnico de prueba.
- `academicClosureAllowed = false` prevalece en TODOS los casos, impidiendo la emisión de documentos o cierre formal de matrículas mientras no exista aprobación institucional explícita.

---

## 2. DIMENSIONES TÉCNICAS DEL MODELO

| Dimensión | Valores Posibles | Significado Técnico |
| :--- | :--- | :--- |
| **`configurationStatus`** | `COMPLETE` / `INCOMPLETE` | Indica si la matrícula posee `periodoId` y `moduloId` asignados. |
| **`dataCoverageStatus`** | `OBSERVED` / `NONE` | Refleja la existencia de registros observados de asistencia, evaluaciones o EFSRT. |
| **`rulesStatus`** | `BLOCKED` | Indica que existen bloqueos normativos vigentes que impiden el cierre. |
| **`technicalContextComplete`** | `boolean` | `true` si periodo, módulo, unidades e indicadores existen; `false` de lo contrario. |
| **`academicClosureAllowed`** | `false` | **Estrictamente `false`**. No existe autorización para el cierre académico real. |

---

## 3. PROHIBICIONES EXPRESAS DE INFERENCIA ACADÉMICA

El modelo M09 prohíbe explícitamente:
1. Declarar "asistencia suficiente" o "asistencia insuficiente".
2. Calcular porcentajes de asistencia requerida.
3. Calcular notas finales, promedios ponderados o redondeos.
4. Declarar condición de "Aprobado", "Desaprobado", "Apto", "No Apto" o "Egresado".
5. Validar o convalidar horas o experiencias EFSRT.

Toda la información se presenta como **Conteos Observados**.
