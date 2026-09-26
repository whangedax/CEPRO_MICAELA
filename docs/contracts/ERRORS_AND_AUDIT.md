# Errores, Estados y Auditoría (M00)

## 1. Taxonomía de Errores del Sistema

Todos los errores capturados o emitidos en el sistema deben pertenecer a una de las siguientes clases/categorías estandarizadas:

1. **`ValidationError`**: Ocurre cuando un dato ingresado por el usuario o importado no cumple con el formato o rango exigido (ej: documento no válido, nota fuera de 0-20, fecha incoherente).
2. **`AuditError`**: Ocurre cuando una operación de cambio de datos intenta ejecutarse sin registrar los metadatos obligatorios de auditoría o viola las reglas de inmutabilidad.
3. **`ConcurrencyError`**: Ocurre cuando se detecta un intento de modificación sobre un registro que cambió en otra transacción simultánea local.
4. **`IntegrityError`**: Ocurre al violar la integridad referencial entre entidades (ej: crear matrícula para un estudiante inexistente).
5. **`ImportConflictError`**: Ocurre durante la reconciliación de datos importados cuando una fila difiere de los datos maestros confirmados (ej: mismo DNI pero distintos apellidos).
6. **`OperationalError`**: Ocurre ante fallos de IndexedDB, cuotas de almacenamiento local o problemas del entorno del navegador.

---

## 2. Estados de Ciclo de Vida de Registros

Cada entidad principal mantendrá un campo `estado` para evitar el borrado físico de registros utilizados históricamente:

- **`ACTIVO`**: Registro plenamente operativo y válido.
- **`INACTIVO`**: Registro deshabilitado administrativamente (ej: docente o programa discontinuado).
- **`ANULADO`**: Registro cancelado o sin efecto legal/académico (ej: matrícula anulada). Se conserva por auditoría.
- **`PENDIENTE_REVISION`**: Registro procedente de importación que presenta inconsistencias y requiere confirmación institucional.
- **`CONFLICTO`**: Registro en staging que entra en colisión con la base de datos maestra.
- **`RECHAZADO`**: Fila descartada durante la importación tras revisión administrativa.

---

## 3. Contrato del Sistema de Auditoría

### 3.1 Estructura del Registro de Auditoría
Toda modificación de datos de negocio debe crear un registro inmutable en el store `auditoria` con la siguiente estructura:

```json
{
  "id": "AUD-20260911-000001",
  "timestamp": "2026-09-11T20:00:00.000Z",
  "tipoOperacion": "CREACION | MODIFICACION | ANULACION | REVISION | EMISION_DOCUMENTO",
  "entidad": "ESTUDIANTES | MATRICULAS | EVALUACION | ...",
  "entidadId": "EST-20260911-8F3A",
  "usuarioOperador": "SECRETARIA_LOCAL",
  "datosPrevios": { ... },
  "datosNuevos": { ... },
  "metadatos": {
    "pantalla": "Estudiantes/Alta",
    "motivo": "Corrección de apellido materno",
    "hashOrigen": "a1b2c3..."
  }
}
```

### 3.2 Reglas Inviolables de Auditoría
- Los registros en el store `auditoria` son **de sólo lectura y adición (`append-only`)**. No se permite modificación ni borrado de auditoría en IndexedDB.
- Las copias de respaldo JSON exportarán la bitácora completa de auditoría verificable mediante checksum.
