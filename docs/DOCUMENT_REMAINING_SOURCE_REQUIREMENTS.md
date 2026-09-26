# NIGHT-DOCUMENT-BUILD-01 — fuentes y reglas oficiales pendientes

Fecha: 2026-09-15. Esta deuda no debe completarse por inferencia. La autoridad indicada debe entregar o confirmar una fuente versionada antes de cambiar el estado del campo o del bloqueo.

| Dato o regla faltante | canonicalKeys principales | Plantillas | Store/entidad destino | Autoridad requerida | Bloqueo |
|---|---|---|---|---|---|
| Plantilla física oficial de asistencia UD7, si corresponde | `attendance.*`, `curriculum.unit.*` | nueva As-7; relación con TMPL-17 | catálogo documental; no crear store por sí sola | Jefatura/UGEL | B-001 |
| Plan de estudios completo por programa/módulo: UD, orden, capacidades, indicadores, créditos y horas | `curriculum.unit.*`, `curriculum.capacity.*`, `evaluation.indicator.*` | 01–02, 05–21 | `unidades`, `indicadores`, `matricula_unidades` y versión curricular | Jefatura/UGEL | B-002 |
| Reglas de asistencia/evaluación: sesiones, estados admitidos, porcentaje, ponderación, redondeo, recuperación, subsanación y resultado final | `attendance.*`, `evaluation.*`, `closure.*` | 05–19 | configuración/regla académica versionada; `asistencia`, `evaluacion` | Jefatura/UGEL | B-003 |
| Asignación explícita Módulo I/II para cada grupo real | `module.id`, `module.name` | 01–21 según dependencia | `grupos_academicos.moduloId`; la matrícula solo conserva snapshots legacy | Secretaría/Jefatura | B-004 |
| Reglamento EFSRT: entidad, horas, criterios, convalidación, aprobación y vínculo con cierre | `efsrt.*`, `closure.efsrtStatus` | 18–21 | `efsrt` y regla versionada | Jefatura/UGEL | B-005 |
| Procedimiento de emisión: elegibilidad, correlativo, registro, fecha, firmas, autoridades, reemisión y anulación | `document.issue*`, `document.registerCode`, `document.authority*`, `certification.*`, `title.*` | 20–21 y campos de autoridad de 04/19 | `documentos`, institución/autoridades y registro de emisión | Dirección/Secretaría/UGEL | B-006 |
| Resolución de apertura: ID, denominación, fechas y vigencia del periodo | `period.id`, `period.name`, `period.startDate`, `period.endDate` | 01–20 | `periodos` y `grupos_academicos.periodoId` | Dirección/Jefatura | B-007 |
| Significado/vigencia de la leyenda fija “AÑO 2026 - I” | `period.*` (no dibujado; fijo en fuente) | 02 | decisión documental versionada | Dirección/Jefatura | B-007 / I-046 |
| Semántica oficial de sexo H/M y transformación desde el dato operacional | `student.sex` | 01, 03, 05–19 | contrato de estudiante/documento | Secretaría/Jefatura | I-049 |
| Capacidad y casillas inequívocas de la zona inferior | campos tabulares por confirmar | 03 | manifiesto TMPL-03 | Jefatura/Secretaría con ejemplar físico válido | REVIEW_REQUIRED |
| Duración, inicio, turno, docente y autoridad; segunda fuente que determine las líneas correctas | `module.*`, `period.*`, `group.shift`, `teacher.*`, `document.authority*` | 04 | grupo/docente/institución y manifiesto | Jefatura/Secretaría | B-004/B-007 + REVIEW_REQUIRED |
| Coordenadas certificadas de cada caja variable restante; no basta semejanza entre formatos | claves listadas en cada manifiesto | 05–21 | manifiesto individual por PDF | Responsable documental + validación física | REVIEW_REQUIRED |
| Criterios de cierre y estadísticas oficiales de acta | `closure.*`, `evaluation.finalResult`, estadísticas | 19–21 | servicio/regla de cierre versionada | Jefatura/UGEL | B-002/B-003/B-005/B-007 |
| Condición oficial de egreso y fundamento legal aplicable | `title.graduationStatus`, `title.legalBasis`, `certification.eligibility` | 20–21 | expediente/cierre/emisión | Dirección/UGEL | B-006 |

También sigue pendiente la aceptación física de la candidata en Edge y el gate de write paths por `groupId`. Ninguna entrega de esta tabla autoriza por sí sola la activación de v2: debe pasar por contrato, procedencia, preflight, backup, pruebas y aceptación separada.
