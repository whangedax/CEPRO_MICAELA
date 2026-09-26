# Reporte de Resultados de Pruebas — Expansión de Evaluación UD2 a UD7 (TMPL-12 a TMPL-17)

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
| `T-EVAL-EXP-01-CANONICAL-HASHES` | 21/21 hashes SHA-256 canónicos intactos | **PASS** | 21/21 hashes SHA-256 canónicos intactos |
| `T-EVAL-EXP-02-MANIFESTS-CALIBRATION` | TMPL-12 a TMPL-17: AVAILABLE, capacity 40x26, cuadrículas y cajas verificadas | **PASS** | TMPL-12 a TMPL-17: AVAILABLE, capacity 40x26, cuadrículas y cajas verificadas |
| `T-EVAL-EXP-03-PURE-RENDERER` | pdf-template-engine.js puro sin dependencias de IndexedDB | **PASS** | pdf-template-engine.js puro sin dependencias de IndexedDB |
| `T-EVAL-EXP-04-SERVER-PORT` | Servidor candidato activo en puerto 8081 | **PASS** | Servidor candidato activo en puerto 8081 |
| `T-EVAL-EXP-05-CANDIDATE-INVARIANTS` | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per | **PASS** | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per |
| `T-EVAL-EXP-06-UI-CONTROLS` | Selector de unidad y botón de generación presentes en #/evaluacion | **PASS** | Selector de unidad y botón de generación presentes en #/evaluacion |
| `T-EVAL-EXP-07-UI-GENERATION-TMPL12` | TMPL-12 generado en UI: 1 página física A3 Portrait (841.89 x 1190.55 pt) | **PASS** | TMPL-12 generado en UI: 1 página física A3 Portrait (841.89 x 1190.55 pt) |
| `T-EVAL-EXP-08-ALL-6-TEMPLATES-GENERATED` | Generación de TMPL-12..TMPL-17 (UD2..UD7): 6 plantillas con 40 alumnos generadas exitosamente | **PASS** | Generación de TMPL-12..TMPL-17 (UD2..UD7): 6 plantillas con 40 alumnos generadas exitosamente |
| `T-EVAL-EXP-09-ALPHABETICAL-SORT` | Estudiantes ordenados alfabéticamente A-Z (40/40 verificados) | **PASS** | Estudiantes ordenados alfabéticamente A-Z (40/40 verificados) |
| `T-EVAL-EXP-10-GUARD-B002-CLEAN-CELLS` | Guard B-002 cumplido: 0 notas estampadas en reporte sin evaluar (100% limpio) | **PASS** | Guard B-002 cumplido: 0 notas estampadas en reporte sin evaluar (100% limpio) |
| `T-EVAL-EXP-11-VIGESIMAL-MARKS-STAMPING` | Notas vigesimales de 2 dígitos estampadas correctamente (840 celdas) | **PASS** | Notas vigesimales de 2 dígitos estampadas correctamente (840 celdas) |
| `T-EVAL-EXP-12-GUARD-B003-NO-INVENTED-AVERAGE` | Guard B-003: El motor no inventa promedios aritméticos de IL o Logro si no están consolidados | **PASS** | Guard B-003: El motor no inventa promedios aritméticos de IL o Logro si no están consolidados |
| `T-EVAL-EXP-13-FAIL-CLOSED-ROW-OVERFLOW` | Sobrecapacidad vertical rechazada fail-closed: 41 filas en UD2 produce CAPACITY_EXCEEDED | **PASS** | Sobrecapacidad vertical rechazada fail-closed: 41 filas en UD2 produce CAPACITY_EXCEEDED |
| `T-EVAL-EXP-14-FAIL-CLOSED-ORDER-GT7` | Orden curricular fuera de rango rechazado fail-closed: orden 8 produce TEMPLATE_NOT_AVAILABLE | **PASS** | Orden curricular fuera de rango rechazado fail-closed: orden 8 produce TEMPLATE_NOT_AVAILABLE |
| `T-EVAL-EXP-15-DYNAMIC-ROUTING-UD2-UD7` | renderEvaluationDocument enruta unit.orden 2..7 a TMPL-12..17 de forma transparente | **PASS** | renderEvaluationDocument enruta unit.orden 2..7 a TMPL-12..17 de forma transparente |
| `T-EVAL-EXP-16-WATERMARKS-AND-METADATA` | Marcas de agua reglamentarias presentes; cero literales espurios (null/undefined/PENDIENTE) | **PASS** | Marcas de agua reglamentarias presentes; cero literales espurios (null/undefined/PENDIENTE) |
| `T-EVAL-EXP-17-CROSS-REGRESSION-PRIOR` | No-regresión con TMPL-11 (47 filas) y TMPL-05 (Asistencia) verificada | **PASS** | No-regresión con TMPL-11 (47 filas) y TMPL-05 (Asistencia) verificada |
| `T-EVAL-EXP-18-ISOLATION-8080` | Cero solicitudes al puerto 8080 (producción 100% aislada) | **PASS** | Cero solicitudes al puerto 8080 (producción 100% aislada) |

---

## Conclusiones Técnicas de la Expansión de Evaluación UD2 a UD7

1. **Cuadrículas Calibradas de 40 Filas $\times$ 26 Columnas (TMPL-12 a TMPL-17):**
   - Todos los manifiestos (`TMPL-12.json` a `TMPL-17.json`) están en `previewStatus: "AVAILABLE"`, formato A3 Portrait ($841.89 \times 1190.55$ pt), con paso vertical nominal $dy \approx 14.45$ a $14.94$ pt y matriz de 5 Indicadores de Logro $\times$ 5 subcolumnas más Logro Final.
2. **Cumplimiento de Salvaguarda B-002:** Celdas sin notas registradas permanecen 100% limpias en blanco en todas las unidades UD2 a UD7.
3. **Cumplimiento de Salvaguarda B-003:** El motor no calcula promedios aritméticos ficticios.
4. **Validación de Límites Físicos (Fail-Closed):**
   - El sistema procesa nominalmente hasta 40 estudiantes en UD2..UD7 y rechaza 41 estudiantes con `CAPACITY_EXCEEDED` (a diferencia de UD1 que tiene capacidad para 47).
   - Unidades superiores a 7 (ej. UD8) se rechazan de inmediato con `TEMPLATE_NOT_AVAILABLE`.
5. **Enrutamiento Dinámico y No-Regresión:** `renderEvaluationDocument` resuelve de manera transparente cualquier unidad UD1 a UD7 utilizando su correspondiente plantilla canónica, manteniendo compatibilidad total con TMPL-11 y Asistencia (TMPL-05..10).
6. **Inmutabilidad Canónica y Aislamiento:** Los 21 hashes SHA-256 canónicos están verificados al 100% inalterados, constatándose cero interacción con el puerto 8080 o `CETPRO_DB`.
