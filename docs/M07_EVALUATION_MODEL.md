# Modelo de Datos de Evaluación — M07

## 1. Definición de Entidades

### 1.1 Entidad 13: EVALUACIÓN (`evaluacion`)
Representa la captura de un resultado cualitativo/cuantitativo asignado a la matrícula de un estudiante respecto a un indicador de logro de una unidad didáctica.

- **Store IndexedDB**: `evaluacion`
- **KeyPath**: `id` (`EVAL-`)
- **Índices**: `matriculaId` (non-unique), `unidadId` (non-unique), `indicadorId` (non-unique), `batchId` (non-unique).

```json
{
  "id": "EVAL-20260912-7A8B9C0D",
  "batchId": "BATCH-EVAL-20260912-11223344",
  "matriculaId": "MAT-TEST-GRP-BD-001-001",
  "estudianteId": "EST-TEST-001",
  "unidadId": "UNID-TEST-001",
  "indicadorId": "IND-TEST-001",
  "nota": 16.5,
  "fecha": "2026-09-12",
  "observacion": "Demuestra dominio técnico en diagnóstico de fallas",
  "estadoLogico": "ACTIVO",
  "estado": "ACTIVO",
  "creadoEn": "2026-09-12T20:45:00.000Z",
  "actualizadoEn": "2026-09-12T20:45:00.000Z"
}
```

### 1.2 Entidad 6: INDICADORES DE LOGRO (`indicadores`)
Representa el estándar técnico de evaluación perteneciente a una unidad didáctica específica.

- **Store IndexedDB**: `indicadores`
- **KeyPath**: `id` (`IND-`)
- **Índices**: `unidadId` (non-unique).

```json
{
  "id": "IND-TEST-001",
  "unidadId": "UNID-TEST-001",
  "codigo": "IND-01",
  "descripcion": "Identifica los componentes principales del sistema de transmisión",
  "peso": 1.0,
  "estado": "TEST_ONLY"
}
```

---

## 2. Reglas de Negocio y Escala Contractual

### 2.1 Escala Vigesimal Confirmada (0 a 20)
- **Confirmación Contractual**: Autorizada explícitamente en `docs/contracts/DATA_CONTRACTS.md` (Entidad 13: `nota (0-20)` y Sección 3: `escala vigesimal (0 a 20)`).
- **Formatos Válidos**: Números enteros o flotantes mayores o iguales a 0 y menores o iguales a 20 (`0 <= nota <= 20`).
- **Rechazo de Valores**: Notas `< 0`, notas `> 20`, cadenas no numéricas, valores `null` o vacíos lanzan `ValidationError`.

### 2.2 Declaración de Reglas Abiertas Pendientes (Bloqueo B-003)
Permanecen estrictamente **PENDIENTES DE NORMATIVA OFICIAL EN B-003**:
- Nota mínima aprobatoria (ej: 13, 11 o cualitativa);
- Reglas de redondeo y uso de decimales;
- Cálculo de promedios simples o ponderados por unidad/módulo;
- Ponderación de indicadores;
- Evaluaciones de recuperación, subsanación o exámenes sustitutorios;
- Límite o estructura formal de intentos/evidencias por indicador;
- Descuentos o inhabilitación por porcentaje de ausencias;
- Resultado académico final (Aprobado / Desaprobado / Retirado).

---

## 3. Integridad Referencial de Evaluaciones

1. **Vínculo a Matrícula**: Toda evaluación debe referenciar a `matriculaId` válido. No se permite vincular únicamente al estudiante.
2. **Grupo Coherente**: La matrícula debe pertenecer al grupo configurado en el contexto de registro (`matricula.grupoCode === grupoCode`).
3. **Pertenencia de Unidad e Indicador**: El `indicadorId` debe pertenecer a la `unidadId` seleccionada (`indicador.unidadId === unidadId`). La `unidadId` debe pertenecer al módulo del programa.
4. **Idempotencia**: Reenviar un lote con el mismo `batchId` devuelve las evaluaciones existentes sin duplicarlas.
5. **Creación vs. Edición**: Intentar registrar una evaluación mediante creación masiva no se convierte silenciosamente en edición. La edición requiere la invocación explícita de `updateEvaluation(...)` auditando diff.
