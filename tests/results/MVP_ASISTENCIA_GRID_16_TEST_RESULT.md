# Reporte de Resultados de Pruebas — Gate MVP-ASISTENCIA-GRID-CALIBRATION-16 (Piloto TMPL-05)

Fecha: 2026-09-28
Entorno: Microsoft Edge Headless (`Edg/153.0.4234.32`)
Host: `http://127.0.0.1:8081/`
DB Evaluada: `CETPRO_V2_CANDIDATE` y `CETPRO_V2_DEMO` (aislamiento estricto de `CETPRO_DB` en puerto 8080)

## Resumen Ejecutivo

- **Total de Pruebas Ejecutadas:** 19
- **Pruebas Aprobadas:** 19
- **Pruebas Fallidas:** 0
- **Tasa de Aprobación:** 100%
- **Certificación AUTOMATED_EDGE_HEADLESS:** **PASS**
- **Certificación HUMAN_PHYSICAL_EDGE_ACCEPTANCE:** **PENDING**

---

## Matriz Detallada de Pruebas

| Identificador | Criterio de Aceptación | Estado | Detalle |
|---|---|:---:|---|
| `T-ATT-16-01-CANONICAL-HASHES` | 21/21 hashes SHA-256 canónicos intactos | **PASS** | 21/21 hashes SHA-256 canónicos intactos |
| `T-ATT-16-02-MANIFEST-CALIBRATION` | TMPL-05.json: previewStatus=AVAILABLE, capacity 40x44, cuadrícula calibrada dx=15.9873 dy=11.99 | **PASS** | TMPL-05.json: previewStatus=AVAILABLE, capacity 40x44, cuadrícula calibrada dx=15.9873 dy=11.99 |
| `T-ATT-16-03-PURE-RENDERER` | pdf-template-engine.js puro sin dependencias de base de datos | **PASS** | pdf-template-engine.js puro sin dependencias de base de datos |
| `T-ATT-16-04-SERVER-PORT` | Servidor candidato activo en puerto 8081 | **PASS** | Servidor candidato activo en puerto 8081 |
| `T-ATT-16-05-CANDIDATE-INVARIANTS` | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per | **PASS** | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per |
| `T-ATT-16-06-DEMO-UI-BUTTON` | Botón #demo-att-tmpl05 presente en vista de Asistencia DEMO | **PASS** | Botón #demo-att-tmpl05 presente en vista de Asistencia DEMO |
| `T-ATT-16-07-DEMO-PDF-GENERATION` | TMPL-05 generado en DEMO con éxito: exactamente 1 página física | **PASS** | TMPL-05 generado en DEMO con éxito: exactamente 1 página física |
| `T-ATT-16-08-ALPHABETICAL-SORT` | Estudiantes ordenados alfabéticamente A-Z (40 nombres ordenados) | **PASS** | Estudiantes ordenados alfabéticamente A-Z (40 nombres ordenados) |
| `T-ATT-16-09-GRID-OPERATIONAL-MARKS` | Marcas de cuadrícula estampadas correctamente (P presentes en cuadrícula: 24) | **PASS** | Marcas de cuadrícula estampadas correctamente (P presentes en cuadrícula: 24) |
| `T-ATT-16-10-TOTALS-COLUMNS` | Totales operativos presentes: 80 celdas de asistencia estampadas | **PASS** | Totales operativos presentes: 80 celdas de asistencia estampadas |
| `T-ATT-16-11-GUARD-B003-PERCENT-BLANK` | Guard B-003 cumplido: 0 celdas de porcentaje en filas (estrictamente vacías) | **PASS** | Guard B-003 cumplido: 0 celdas de porcentaje en filas (estrictamente vacías) |
| `T-ATT-16-12-GUARD-B001-ORDER7-REJECTION` | Guard B-001 verificado: orden 7 rechazado con TEMPLATE_NOT_AVAILABLE | **PASS** | Guard B-001 verificado: orden 7 rechazado con TEMPLATE_NOT_AVAILABLE |
| `T-ATT-16-13-MAX-CAPACITY-44-SESSIONS` | Capacidad máxima de 44 sesiones renderizada correctamente (29966 bytes) | **PASS** | Capacidad máxima de 44 sesiones renderizada correctamente (29966 bytes) |
| `T-ATT-16-14-SESSION-CAPACITY-EXCEEDED` | Rechazo fail-closed: 45 sesiones produce SESSION_CAPACITY_EXCEEDED | **PASS** | Rechazo fail-closed: 45 sesiones produce SESSION_CAPACITY_EXCEEDED |
| `T-ATT-16-15-ROW-CAPACITY-EXCEEDED` | Rechazo fail-closed: 41 filas produce CAPACITY_EXCEEDED | **PASS** | Rechazo fail-closed: 41 filas produce CAPACITY_EXCEEDED |
| `T-ATT-16-16-WATERMARKS-AND-CLEAN-CELLS` | Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE) | **PASS** | Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE) |
| `T-ATT-16-17-CANDIDATE-UI-BUTTON` | Botón #btn-generate-tmpl05-candidate presente en vista #/registro de candidata | **PASS** | Botón #btn-generate-tmpl05-candidate presente en vista #/registro de candidata |
| `T-ATT-16-18-CANDIDATE-PREVIEW-RENDER` | Generación y despliegue de iframe con visor en #/registro exitoso | **PASS** | Generación y despliegue de iframe con visor en #/registro exitoso |
| `T-ATT-16-19-ISOLATION-8080` | Cero solicitudes al puerto 8080 (producción 100% aislada) | **PASS** | Cero solicitudes al puerto 8080 (producción 100% aislada) |

---

## Conclusiones Técnicas del Gate 16

1. **Cuadrícula Calibrada de 44 Sesiones:** El manifiesto `TMPL-05.json` cuenta con `previewStatus: "AVAILABLE"`, paso horizontal verificado $dx = 15.9873$ pt y vertical $dy = 11.99$ pt para una matriz física exacta de 40 estudiantes $\times$ 44 columnas.
2. **Cumplimiento de Salvaguarda B-001:** Módulos o programas que declaren unidades de orden $> 6$ son rechazados fail-closed con código `TEMPLATE_NOT_AVAILABLE`, sin inventar plantillas ficticias.
3. **Cumplimiento de Salvaguarda B-003:** La columna de porcentaje de inasistencia ministerial permanece estrictamente en blanco; únicamente se estampan conteos operativos neutros (asistencias y faltas) con marcas centradas ("P", "F", "J", "—").
4. **Límites de Capacidad Físicos:** El sistema acepta y renderiza hasta 44 sesiones y 40 estudiantes, rechazando $45$ sesiones con `SESSION_CAPACITY_EXCEEDED` y $41$ filas con `CAPACITY_EXCEEDED`.
5. **Inmutabilidad y Aislamiento:** Los 21 hashes SHA-256 canónicos permanecen 100% inalterados y se constató cero interacción con el puerto 8080 o `CETPRO_DB`.
