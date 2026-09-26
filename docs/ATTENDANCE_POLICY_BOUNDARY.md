# Frontera de política de asistencia

## Captura técnica disponible

Los estados estables son `PRESENTE`, `AUSENTE`, `JUSTIFICADA` y `SIN_REGISTRO`. Son estados de captura, no resultados académicos. El mapping visual provisional `P/F/J` está marcado `DISPLAY_ONLY_UNCONFIRMED` y nunca se persiste como única semántica.

Los conteos `presentCount`, `absentCount`, `justifiedCount`, `unmarkedCount`, `markedCount` y `sessionCount` son objetivos y operativos. No se denominan porcentaje, condición, aprobación ni inasistencia oficial.

## Contrato bloqueado

Mientras B-003 esté abierta:

```json
{
  "officialAbsencePercentage": {
    "status": "BLOCKED_BY_POLICY",
    "value": null
  }
}
```

No se implementan umbrales 30/70/80, redondeo ni equivalencia de justificación. TMPL-05–10 puede mostrar conteos sintéticos `OPERATIONAL_COUNT` en QA para probar geometría, pero no afirmar que `rawAbsentCount` sea el total normativo.

## Fuente futura requerida

La institución debe confirmar antes de habilitar asistencia productiva:

- denominación y significado oficial de cada estado;
- efecto de ausencias justificadas;
- estados incluidos, ausencias y excluidos;
- fórmula de porcentaje, divisor y tratamiento de `SIN_REGISTRO`;
- regla de redondeo y umbrales;
- significado y límites de horas;
- cierre/anulación de sesión y rectificaciones;
- códigos que deben imprimirse en los PDF.

El contrato `attendancePolicy` reserva `includedStatuses`, `absenceStatuses`, `excludedStatuses`, `roundingRule`, `percentageFormula` y `thresholds`. Esta política se aplicará sobre estados capturados sin reescribir la capa transaccional.
