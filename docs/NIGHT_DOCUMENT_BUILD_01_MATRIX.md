# NIGHT-DOCUMENT-BUILD-01 — matriz final de las 21 plantillas

Fecha: 2026-09-15. `MANIFEST=YES` significa manifiesto independiente existente, no renderer ni emisión. `PREFLIGHT=PREPARED` indica reglas estructurales/capacidad listas pero contexto o fuente bloqueados. Todos los estados oficiales permanecen `BLOCKED`.

| TMPL | NOMBRE | CONTEXT_TYPE | MANIFEST | RENDERER | PREFLIGHT | DATA_BINDING | FIT_TEST | PREVIEW_STATUS | OFFICIAL_ISSUE_STATUS | BLOCKERS | OBSERVACIONES |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TMPL-01 | Nómina de Matrícula | GROUP | YES | `renderTMPL01` | PARTIAL | PARTIAL | 0/1/30/31 | PARTIAL | BLOCKED | B-002, B-004, B-007, I-049 | Una página, máximo 30; conexión productiva GROUP aún deshabilitada |
| TMPL-02 | Ficha de Matrícula | ENROLLMENT | YES | `renderTMPL02` | IMPLEMENTED | 11 cajas | vacío/textos/overflow | IMPLEMENTED_PREVIEW | BLOCKED | B-002, B-004, B-007 | Preview real por `matriculaId`; nombre primario con perfil propio |
| TMPL-03 | Registro de Matrícula Modular | GROUP | YES | NONE | REVIEW_REQUIRED | NONE | fail-closed | REVIEW_REQUIRED | BLOCKED | B-004, B-007, I-049 | Capacidad/zona inferior no certificadas |
| TMPL-04 | Portada de Registro Asistencia y Evaluación | GROUP_MODULE | YES | NONE | PARTIAL | programa/módulo | fail-closed | PARTIAL | BLOCKED | B-004, B-007 | Solo dos cajas inequívocas; docente/autoridad no enlazados |
| TMPL-05 | Asistencia UD1 | ATTENDANCE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-007 | Geometría de escritura pendiente |
| TMPL-06 | Asistencia UD2 | ATTENDANCE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-007 | Manifiesto individual |
| TMPL-07 | Asistencia UD3 | ATTENDANCE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-007 | Manifiesto individual |
| TMPL-08 | Asistencia UD4 | ATTENDANCE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-007 | Manifiesto individual |
| TMPL-09 | Asistencia UD5 | ATTENDANCE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-007 | Manifiesto individual |
| TMPL-10 | Asistencia UD6 | ATTENDANCE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-001, B-002, B-004, B-007 | No se creó As-7 |
| TMPL-11 | Evaluación Indicadores UD1 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/47/48 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-007 | 47 filas, 5 indicadores |
| TMPL-12 | Evaluación UD2 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-007 | 40 filas, 5 indicadores |
| TMPL-13 | Evaluación UD3 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-007 | 40 filas, 5 indicadores |
| TMPL-14 | Evaluación UD4 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-007 | 40 filas, 5 indicadores |
| TMPL-15 | Evaluación UD5 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-007 | 40 filas, 5 indicadores |
| TMPL-16 | Evaluación UD6 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-007 | 40 filas, 5 indicadores |
| TMPL-17 | Evaluación UD7 | EVALUATION | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-001, B-002, B-003, B-004, B-007 | Evaluación existe; asistencia UD7 no existe |
| TMPL-18 | Consolidado EFSRT | EFSRT | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-004, B-005 | 40 filas/9 criterios visibles; semántica no inferida |
| TMPL-19 | Acta de Evaluación Modular | CLOSURE | YES | NONE | PREPARED | BLOCKED | 0/1/40/41 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-003, B-004, B-005, B-007 | Dos páginas 20+20; sin página 3 |
| TMPL-20 | Certificado Modular | CERTIFICATION | YES | NONE | PREPARED | BLOCKED | 0/1/8/9 | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-006, B-007 | Ocho filas; sin número/elegibilidad/emisión inventados |
| TMPL-21 | Título Auxiliar Técnico | TITLE | YES | NONE | PREPARED | BLOCKED | fail-closed | BLOCKED_BY_SOURCE | BLOCKED | B-002, B-004, B-006, B-007 | Dos páginas; no genera título oficial |

El renderer común no consulta IndexedDB. TMPL-03–21 no se presentan como preview funcional: sus manifiestos y preflight preparan el límite técnico y hacen visibles los bloqueos, sin fabricar datos, cajas ni reglas.
