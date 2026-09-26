# DOCUMENT-MASTER-AUDIT-01 — matriz de contextos

Diseño, no selector/servicio implementado. `SelectedContext` debe referenciar una matrícula concreta o una clave de grupo **registrada**, nunca un estudiante aislado para documento académico. Las dependencias entre paréntesis son necesarias, no necesariamente disponibles hoy. `BindingStatus` resume el PDF entero: no confundir con la disponibilidad de una clave individual. `R` = readiness productiva; `C` = ContractStatus predominante. Un PDF puede mezclar campos C/UNCONFIRMED/BLOCKED, por eso esta tabla no sustituye el inventario.

| PDF | ContextType principal; dependencias | Selección/filtro requerido | ContractStatus; SourceReadiness; BindingStatus |
|---|---|---|---|
| 01 | GROUP (INSTITUTION, ENROLLMENT, STUDENT, PROGRAM, MODULE, PERIOD, CURRICULUM) | grupoCode + programa + módulo + periodo + turno/sección registrados; 30 matrículas | Mixto C/U/B002/B004/B007; parcial; técnico previo, productivo incompleto |
| 02 | ENROLLMENT (STUDENT, INSTITUTION, PROGRAM, MODULE, PERIOD, CURRICULUM, DOCUMENT_ISSUE) | `matriculaId` inequívoco | Mixto C/U/B002/B004/B007; 11 campos hoy disponibles; PARTIAL/MAPPED solo en cajas auditadas, preview |
| 03 | GROUP (STUDENT, INSTITUTION, PROGRAM, MODULE, PERIOD) | grupo y módulo vinculados; capacidad REVIEW_REQUIRED | Mixto C/U/B004/B007; parcial; técnico previo, productivo no certificado |
| 04 | GROUP+MODULE (INSTITUTION, PROGRAM, PERIOD, autoridad DOCENTE) | grupo/módulo/periodo | Mixto C/U/B004/B007; parcial; NOT_IMPLEMENTED |
| 05 | ATTENDANCE+GROUP+CURRICULUM (STUDENT, ENROLLMENT, PROGRAM, MODULE, PERIOD) | grupo + UD1 + sesiones | Mixto C/B002/B004/B007; registros no conectados; NOT_IMPLEMENTED |
| 06 | ATTENDANCE+GROUP+CURRICULUM (mismas dependencias) | grupo + UD2 + sesiones | idem; NOT_IMPLEMENTED |
| 07 | ATTENDANCE+GROUP+CURRICULUM (mismas dependencias) | grupo + UD3 + sesiones | idem; NOT_IMPLEMENTED |
| 08 | ATTENDANCE+GROUP+CURRICULUM (mismas dependencias) | grupo + UD4 + sesiones | idem; NOT_IMPLEMENTED |
| 09 | ATTENDANCE+GROUP+CURRICULUM (mismas dependencias) | grupo + UD5 + sesiones | idem; NOT_IMPLEMENTED |
| 10 | ATTENDANCE+GROUP+CURRICULUM (mismas dependencias) | grupo + UD6 + sesiones | idem; NOT_IMPLEMENTED |
| 11 | EVALUATION+GROUP+CURRICULUM (STUDENT, ENROLLMENT, PROGRAM, MODULE, PERIOD) | grupo + UD1 + 5 indicadores + 47 filas | Mixto C/B002/B004/B007; notas no conectadas; NOT_IMPLEMENTED |
| 12 | EVALUATION+GROUP+CURRICULUM (mismas dependencias) | grupo + UD2 + 5 indicadores + 40 filas | idem; NOT_IMPLEMENTED |
| 13 | EVALUATION+GROUP+CURRICULUM (mismas dependencias) | grupo + UD3 + 5 indicadores + 40 filas | idem; NOT_IMPLEMENTED |
| 14 | EVALUATION+GROUP+CURRICULUM (mismas dependencias) | grupo + UD4 + 5 indicadores + 40 filas | idem; NOT_IMPLEMENTED |
| 15 | EVALUATION+GROUP+CURRICULUM (mismas dependencias) | grupo + UD5 + 5 indicadores + 40 filas | idem; NOT_IMPLEMENTED |
| 16 | EVALUATION+GROUP+CURRICULUM (mismas dependencias) | grupo + UD6 + 5 indicadores + 40 filas | idem; NOT_IMPLEMENTED |
| 17 | EVALUATION+GROUP+CURRICULUM (mismas dependencias) | grupo + UD7 + 5 indicadores + 40 filas | idem; NOT_IMPLEMENTED; **As-7 ausente B-001** |
| 18 | EFSRT+GROUP (STUDENT, ENROLLMENT, MODULE, entidad receptora, norma) | grupo/módulo + experiencias ×9 criterios | Mixto C/U/B004/B005; registro técnico sin contexto completo; NOT_IMPLEMENTED |
| 19 | CLOSURE+GROUP (INSTITUTION, STUDENT, ENROLLMENT, PROGRAM, MODULE, PERIOD, CURRICULUM, EVALUATION, EFSRT) | grupo/módulo/periodo + resultados finales; 40 matrículas | Mixto C/U/B002/B004/B007 + norma de cierre; NOT_IMPLEMENTED |
| 20 | CERTIFICATION+ENROLLMENT+DOCUMENT_ISSUE (STUDENT, PROGRAM, MODULE, CURRICULUM, CLOSURE) | matrícula aprobada + elegibilidad + registro oficial | Mixto C/U/B002/B004/B006/B007; NOT_IMPLEMENTED |
| 21 | TITLE+STUDENT+CLOSURE+DOCUMENT_ISSUE (ENROLLMENT, PROGRAM, MODULE, certificación) | estudiante **y expediente/matrículas de egreso** con decisión oficial | Mixto C/U/B002/B004/B006/B007; NOT_IMPLEMENTED |

## Cardinalidad y pertenencia

- Persona: `CETPRO_DB.estudiantes` → documento, nombre, sexo, nacimiento. Relación 1:N con matrículas; si hay 2 matrículas, ambos documentos académicos pueden diferir aunque compartan persona.
- Matrícula: `CETPRO_DB.matriculas` → programa/grupo/turno/sección/condición, y vínculos registrados a módulo y periodo. `moduleId=null`/`periodId=null` **no** se suple por el grupo origen.
- GROUP: lista de `matriculaId` únicos con filtro explícito, orden estable y capacidad verificada por PDF. No seleccionar por DNI (puede ser anómalo) ni por texto fijo 2026-I. Un mismo estudiante en dos matrículas del mismo grupo se revisa según regla administrativa, no se fusiona.
- CURRICULUM: unidades del módulo/programa por fuente oficial y, donde aplica, unidades efectivamente asociadas a la matrícula; el ordinal UD1–UD7 del nombre del PDF no crea unidad productiva.
- ATTENDANCE/EVALUATION/EFSRT: registros pertenecen a matrícula + UD/módulo/periodo según caso; no copiar la nota/ausencia de otra matrícula del mismo estudiante.
- CLOSURE/CERTIFICATION/TITLE: requieren decisión normativa y expediente individual, no solo agregado de notas ni texto del PDF.

El flujo común propuesto y los pasos para llegar a él están en `DOCUMENT_DEPENDENCY_GRAPH.md` y `DOCUMENT_IMPLEMENTATION_ROADMAP.md`.
