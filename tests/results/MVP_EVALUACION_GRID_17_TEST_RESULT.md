# Reporte de Resultados de Pruebas — Gate MVP-EVALUACION-GRID-CALIBRATION-17 (Piloto TMPL-11)

Fecha: 2026-09-21
Entorno: Microsoft Edge Headless (`Edg/153.0.4234.32`)
Host: `http://127.0.0.1:8081/`
DB Evaluada: `CETPRO_V2_CANDIDATE` y `CETPRO_V2_DEMO` (aislamiento estricto de `CETPRO_DB` en puerto 8080)

## Resumen Ejecutivo

- **Total de Pruebas Ejecutadas:** 18
- **Pruebas Aprobadas:** 18
- **Pruebas Fallidas:** 0
- **Tasa de Aprobación:** 100%
- **Certificación AUTOMATED_EDGE_HEADLESS:** **PASS**
- **Certificación HUMAN_PHYSICAL_EDGE_ACCEPTANCE:** **PENDING**

---

## Matriz Detallada de Pruebas

| Identificador | Criterio de Aceptación | Estado | Detalle |
|---|---|:---:|---|
| `T-EVAL-17-01-CANONICAL-HASHES` | 21/21 hashes SHA-256 canónicos intactos | **PASS** | 21/21 hashes SHA-256 canónicos intactos |
| `T-EVAL-17-02-MANIFEST-CALIBRATION` | TMPL-11.json: AVAILABLE, 47 filas x 5 IL, dy=14.215, campos verificados | **PASS** | TMPL-11.json: AVAILABLE, 47 filas x 5 IL, dy=14.215, campos verificados |
| `T-EVAL-17-03-PURE-RENDERER` | pdf-template-engine.js puro sin dependencias de IndexedDB | **PASS** | pdf-template-engine.js puro sin dependencias de IndexedDB |
| `T-EVAL-17-04-SERVER-PORT` | Servidor candidato activo en puerto 8081 | **PASS** | Servidor candidato activo en puerto 8081 |
| `T-EVAL-17-05-CANDIDATE-INVARIANTS` | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per | **PASS** | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per |
| `T-EVAL-17-06-UI-BUTTON` | Botón #btn-generate-tmpl11-candidate presente en vista #/evaluacion | **PASS** | Botón #btn-generate-tmpl11-candidate presente en vista #/evaluacion |
| `T-EVAL-17-07-DEMO-PDF-GENERATION` | TMPL-11 generado en UI: exactamente 1 página física A3 Portrait (841.89 x 1190.55 pt) | **PASS** | TMPL-11 generado en UI: exactamente 1 página física A3 Portrait (841.89 x 1190.55 pt) |
| `T-EVAL-17-08-NOMINAL-47-STUDENTS` | Generación nominal de 47 estudiantes produce exactamente 1 página física A3 Portrait | **PASS** | Generación nominal de 47 estudiantes produce exactamente 1 página física A3 Portrait |
| `T-EVAL-17-09-ALPHABETICAL-SORT` | Estudiantes ordenados alfabéticamente A-Z (47/47 verificados) | **PASS** | Estudiantes ordenados alfabéticamente A-Z (47/47 verificados) |
| `T-EVAL-17-10-GUARD-B002-CLEAN-CELLS` | Guard B-002 cumplido: 0 notas estampadas en reporte sin evaluar (100% limpio) | **PASS** | Guard B-002 cumplido: 0 notas estampadas en reporte sin evaluar (100% limpio) |
| `T-EVAL-17-11-VIGESIMAL-MARKS-STAMPING` | Notas vigesimales de 2 dígitos estampadas correctamente (966 celdas) | **PASS** | Notas vigesimales de 2 dígitos estampadas correctamente (966 celdas) |
| `T-EVAL-17-12-GUARD-B003-NO-INVENTED-AVERAGE` | Guard B-003: El motor no inventa promedios aritméticos de IL o Logro si no están consolidados | **PASS** | Guard B-003: El motor no inventa promedios aritméticos de IL o Logro si no están consolidados |
| `T-EVAL-17-13-FAIL-CLOSED-ROW-OVERFLOW` | Sobrecapacidad vertical rechazada fail-closed: 48 filas produce CAPACITY_EXCEEDED | **PASS** | Sobrecapacidad vertical rechazada fail-closed: 48 filas produce CAPACITY_EXCEEDED |
| `T-EVAL-17-14-FAIL-CLOSED-ORDER-GT7` | Orden curricular fuera de rango rechazado fail-closed: orden 8 produce TEMPLATE_NOT_AVAILABLE | **PASS** | Orden curricular fuera de rango rechazado fail-closed: orden 8 produce TEMPLATE_NOT_AVAILABLE |
| `T-EVAL-17-15-ROUTING-BY-ORDER` | renderEvaluationDocument enruta unit.orden=1 a TMPL-11 de forma transparente | **PASS** | renderEvaluationDocument enruta unit.orden=1 a TMPL-11 de forma transparente |
| `T-EVAL-17-16-WATERMARKS-AND-METADATA` | Marcas de agua reglamentarias presentes; cero literales espurios (null/undefined/PENDIENTE) | **PASS** | Marcas de agua reglamentarias presentes; cero literales espurios (null/undefined/PENDIENTE) |
| `T-EVAL-17-17-CROSS-REGRESSION-ASISTENCIA` | No-regresión con Asistencia verificada: renderAttendanceTMPL05 operativo | **PASS** | No-regresión con Asistencia verificada: renderAttendanceTMPL05 operativo |
| `T-EVAL-17-18-ISOLATION-8080` | Cero solicitudes al puerto 8080 (producción 100% aislada) | **PASS** | Cero solicitudes al puerto 8080 (producción 100% aislada) |

---

## Conclusiones Técnicas del Gate 17 (Piloto TMPL-11)

1. **Cuadrícula Calibrada de 47 Filas $\times$ 26 Columnas:** El manifiesto `TMPL-11.json` cuenta con `previewStatus: "AVAILABLE"`, formato A3 Portrait ($841.89 \times 1190.55$ pt), paso vertical $dy = 14.215$ pt y matriz de 5 Indicadores de Logro $\times$ 5 subcolumnas (IA1, IA2, IA3, IL, R) más la columna de Logro Final.
2. **Cumplimiento de Salvaguarda B-002:** Si los estudiantes no cuentan con evaluaciones registradas formalmente, las celdas de la cuadrícula permanecen 100% en blanco limpio, sin ceros simulados ni cadenas espurias.
3. **Cumplimiento de Salvaguarda B-003:** El motor no calcula ni inventa promedios automáticos de IL o de Logro. Únicamente se estampan notas consolidadas explícitas en escala vigesimal centrada ('00' a '20').
4. **Validación de Límites Físicos (Fail-Closed):**
   - El sistema procesa nominalmente hasta 47 estudiantes en 1 página física y rechaza 48 estudiantes con `CAPACITY_EXCEEDED`.
   - Se validó el rango curricular oficial (UD1 a UD7), rechazando la unidad 8 con `TEMPLATE_NOT_AVAILABLE`.
5. **Inmutabilidad Canónica y Aislamiento:** Los 21 hashes SHA-256 canónicos están verificados al 100% inalterados, constatándose cero interacción con el puerto 8080 o `CETPRO_DB`.
