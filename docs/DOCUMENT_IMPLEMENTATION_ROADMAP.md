# DOCUMENT-MASTER-AUDIT-01 — orden documental recomendado

**Propuesta**, no autorización para iniciar implementación. La secuencia se deduce de los campos visibles de las 21 fuentes PDF, no del orden numérico TMPL. Conservar M00–M15 en `ROADMAP.md` como historial; este plan reorganiza *dependencias documentales* dentro de esos módulos. B-002/B-004/B-007 permanecen abiertos, al igual que B-001/B-003/B-005/B-006 donde corresponde.

| Prioridad / corte | Módulo funcional requerido por PDF | Entregable futuro/criterio de salida | PDF impactados |
|---|---|---|---|
| P0a | Configuración institucional y autoridad documental (M02/M10) | fuentes oficiales trazables para DRE, UGEL, código, domicilio, resoluciones individuales, logo, cargos/firmas; no completar por inferencia | 01–04,18–21 |
| P0b | Identidad + matrícula seleccionada (M03/M05/M10) | resolver estudiante 1:N matrículas; `matriculaId` único; valor/documento exacto y procedencia; no imprimir ID técnico como código oficial | 01–03,05–21 |
| P1a | Grupos, programa y asignación grupo→módulo (M05/M02) | claves/filtros/orden explícitos; administración confirma B-004; capacidad/preflight física por PDF | 01,03–19 |
| P1b | Periodos registrados (M02/M05) | fuente y vigencia oficial B-007; ninguna leyenda `2026-I` substituye una fila DB | 01–02,05–17,19 |
| P1c | Catálogo curricular/unidades/indicadores (M02/M05/M07) | fuente oficial B-002: UD, créditos, horas, capacidades, subsanación, IA/IL; cardinalidad documentada | 01–02,05–17,19–20 |
| P2a | Sesiones/asistencia (M06) | marcas crudas por matrícula+UD; norma para totales/%; siete UD académicas no crean As-7 | 05–10,19 |
| P2b | Evaluación/resultado UD (M07) | indicadores y registros crudos; norma para logro/recuperación/aprobación (B-003) | 11–17,19–20 |
| P2c | EFSRT y receptor externo (M08) | empresa/dirección/horas/fechas y nueve criterios con regla oficial B-005 | 18–20 |
| P3a | Cierre/actas (M09/M13) | decisión académica aprobada, estadísticas auditables y acta con firma/capacidad | 19 |
| P3b | Certificación/registro/autoridades (M13/M14) | elegibilidad, número/correlativo y acto administrativo B-006; ocho unidades máximo en p.2 | 20 |
| P3c | Titulación/emisión documental (M13/M14/M15) | expediente de título, fundamento legal, registro, autoridad y firmas verificadas | 21 |

## Orden de bindings tras los prerrequisitos

1. Unificar `SelectedContext → CanonicalDocumentContext → ResolvedFieldSet → preflight` y validar procedencia de los 11 campos TMPL-02 ya enlazados, **sin** modificar ahora el motor.
2. Con grupos/módulo/periodo autorizados, volver a 01/03/04 y decidir capacidad/sexo/orden con la autoridad; no avanzar 03 hasta aclarar su zona inferior ilegible.
3. Con currículo oficial, completar 02 y luego 05–17 por familias **con manifiestos físicos individuales**, no asumir que UD1/UD7 son equivalentes ni que existe As-7.
4. Con reglas de registro y cierre, abordar 18/19; **20/21 al final**, porque el texto fijo no acredita aprobación ni emisión.

“Podría completarse pronto” significa **solo preview parcial**: 02 ya expone 11 datos reales; 01 puede consumir institución/personas con contexto de grupo pendiente. Ningún PDF completo ni emisión oficial se declara disponible hoy. 03/04 no son atajos si B-004/B-007 faltan. 05–17 requieren B-002, B-004, B-007; 19–21 además resultados/cierre/B-006. No iniciar el siguiente TMPL simplemente porque es el número siguiente.

## QA exigible para cada fase futura

- Confirmación de fuente/valor oficial y proveniencia por `canonicalKey`; tres estados independientes (`ContractStatus`, `SourceReadiness`, `BindingStatus`).
- Selector de matrícula/grupo inequívoco; no cruce de persona entre matrículas; política de orden/faltantes/exceso; ensayo 0, 1, capacidad y capacidad+1 filas, sin nueva página ficticia.
- Manifest físico por caja/página con prueba visual de valor largo, caracteres, escala/AutoFit y no solapamiento; `PRIMARY_PERSON_NAME` se valida en cada espacio real.
- Preview sin escrituras; preflight que impide emisión donde reglas/firmas/autoridades/periodo/currículo no estén confirmados. Revisar fuente PDF y SHA antes de cambios.

Este roadmap no cambia archivos de app, PDFs canónicos, DB, menú ni reglas bloqueadas.
