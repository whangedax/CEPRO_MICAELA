# MODELO DE ASISTENCIA Y CONTRATO DE DOMINIO (M06)

**Módulo:** M06 — ASISTENCIA  
**Entidad Principal:** `ASISTENCIA` (Prefijo `ASIS-`)  

---

## 1. ESPECIFICACIÓN DE ENTIDAD Y CONTEXTO COMPUESTO

Cada registro de asistencia se vincula a una matrícula individual dentro del contexto de una sesión lectiva de un Grupo Técnico de Origen y Unidad Didáctica específica.

```json
{
  "id": "ASIS-1757639400-X7K9P",
  "matriculaId": "MAT-IMP-BD-001",
  "estudianteId": "EST-20260911-3A9F",
  "grupoCode": "GRP-BD-001",
  "unidadId": "UNID-TEST-001",
  "fecha": "2026-09-12",
  "horas": 0,
  "estado": "Presente",
  "observaciones": "",
  "creadoEn": "2026-09-12T00:24:00.000Z",
  "actualizadoEn": "2026-09-12T00:24:00.000Z"
}
```

### Reglas Inviolables de Dominio:
1. **Vinculación por `matriculaId` y `estudianteId`:** Un registro de asistencia NUNCA se asocia únicamente a un número de DNI o nombre en texto plano. En estudiantes con múltiples matrículas, la asistencia solo afecta la matrícula correspondiente al grupo seleccionado.
2. **Clave Lógica de Sesión Inequívoca:** La combinación `(matriculaId + unidadId + fecha)` define la clave lógica de unicidad. El sistema actualiza el registro existente si se vuelve a guardar para el mismo contexto en lugar de duplicar filas.
3. **Estados de Marcación Permitidos (`DATA_CONTRACTS.md`):**
   - `Presente`: El estudiante asistió a la sesión.
   - `Falta`: Inasistencia a la sesión.
   - `Tardanza`: Ingreso posterior con tolerancia.
   - `Justificado`: Inasistencia sustentada documentalmente.

---

## 2. FLUJO DE CONTROL Y PRERREQUISITOS OBLIGATORIOS

Antes de proceder con cualquier inserción o modificación de datos en la entidad `ASISTENCIA`, la capa de servicio `AttendanceService` invoca obligatoriamente:

```javascript
const readiness = await this.readinessService.canRegisterAttendance(matriculaId);
if (!readiness.ready) {
  throw new OperationalError(`Asistencia bloqueada: ${readiness.missing.join(', ')}`);
}
```

En la base productiva `CETPRO_DB`, este control bloquea la escritura debido a:
- `PERIODO`: Faltante (`periodoId = null`).
- `MODULO`: Faltante (`moduloId = null`).
- `UNIDADES`: Faltante (`UNIDADES = 0`).

---

## 3. TRAZABILIDAD E INMUTABILIDAD EN AUDITORÍA

Toda operación sobre la tienda `asistencia` produce un evento de bitácora append-only en la tienda `auditoria` a través de `AuditService`:

- `REGISTRO_ASISTENCIA`: Alta de asistencia por sesión.
- `EDICION_ASISTENCIA`: Modificación de estado u observaciones.
- `ANULACION_ASISTENCIA`: Marcado de registro con `estado = 'ANULADO'`.
