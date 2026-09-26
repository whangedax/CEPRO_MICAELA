# Reporte de Resultados de Pruebas — Expansión Asistencia UD2 a UD6 (TMPL-06 a TMPL-10)

Fecha: 2026-09-21
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
| `T-ATT-EXP-01-CANONICAL-HASHES` | 21/21 hashes SHA-256 canónicos intactos | **PASS** | 21/21 hashes SHA-256 canónicos intactos |
| `T-ATT-EXP-02-MANIFESTS-CALIBRATION` | TMPL-06 a TMPL-10 configurados con AVAILABLE, capacidades 35/38/44/44/40 y campos VERIFIED | **PASS** | TMPL-06 a TMPL-10 configurados con AVAILABLE, capacidades 35/38/44/44/40 y campos VERIFIED |
| `T-ATT-EXP-03-PURE-RENDERER` | pdf-template-engine.js puro sin acoplamiento a base de datos | **PASS** | pdf-template-engine.js puro sin acoplamiento a base de datos |
| `T-ATT-EXP-04-SERVER-PORT` | Servidor candidato activo en puerto 8081 | **PASS** | Servidor candidato activo en puerto 8081 |
| `T-ATT-EXP-05-CANDIDATE-INVARIANTS` | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per | **PASS** | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per |
| `T-ATT-EXP-06-RENDER-TMPL06-UD2` | TMPL-06 (UD2 | **PASS** | TMPL-06 (UD2 - 35 sesiones) renderizado: exactamente 1 pág física A3 |
| `T-ATT-EXP-07-RENDER-TMPL07-UD3` | TMPL-07 (UD3 | **PASS** | TMPL-07 (UD3 - 38 sesiones) renderizado: exactamente 1 pág física A3 |
| `T-ATT-EXP-08-RENDER-TMPL08-UD4` | TMPL-08 (UD4 | **PASS** | TMPL-08 (UD4 - 44 sesiones) renderizado: exactamente 1 pág física A3 |
| `T-ATT-EXP-09-RENDER-TMPL09-UD5` | TMPL-09 (UD5 | **PASS** | TMPL-09 (UD5 - 44 sesiones) renderizado: exactamente 1 pág física A3 |
| `T-ATT-EXP-10-RENDER-TMPL10-UD6` | TMPL-10 (UD6 | **PASS** | TMPL-10 (UD6 - 40 sesiones) renderizado: exactamente 1 pág física A3 |
| `T-ATT-EXP-11-AUTO-ROUTING-BY-ORDER` | renderAttendanceDocument enruta automáticamente según unit.orden (2..6) a la plantilla respectiva | **PASS** | renderAttendanceDocument enruta automáticamente según unit.orden (2..6) a la plantilla respectiva |
| `T-ATT-EXP-12-ALPHABETICAL-SORT` | Estudiantes ordenados alfabéticamente A-Z en TMPL-06 (20 verificados) | **PASS** | Estudiantes ordenados alfabéticamente A-Z en TMPL-06 (20 verificados) |
| `T-ATT-EXP-13-OPERATIONAL-MARKS-AND-TOTALS` | Marcas P (420), F (140) y totales (40 celdas) presentes | **PASS** | Marcas P (420), F (140) y totales (40 celdas) presentes |
| `T-ATT-EXP-14-GUARD-B003-PERCENT-BLANK` | Guard B-003 cumplido: casilla de porcentaje ministerial estrictamente vacía en todas las plantillas | **PASS** | Guard B-003 cumplido: casilla de porcentaje ministerial estrictamente vacía en todas las plantillas |
| `T-ATT-EXP-15-GUARD-B001-ORDER-GT6-REJECT` | Guard B-001 verificado: unit.orden 7 rechazado con TEMPLATE_NOT_AVAILABLE | **PASS** | Guard B-001 verificado: unit.orden 7 rechazado con TEMPLATE_NOT_AVAILABLE |
| `T-ATT-EXP-16-OVERFLOW-SESSION-CAPACITY` | Sobrecapacidad horizontal rechazada con SESSION_CAPACITY_EXCEEDED en las 5 plantillas (TMPL-06: >35, TMPL-07: >38, TMPL-08: >44, TMPL-09: >44, TMPL-10: >40) | **PASS** | Sobrecapacidad horizontal rechazada con SESSION_CAPACITY_EXCEEDED en las 5 plantillas (TMPL-06: >35, TMPL-07: >38, TMPL-08: >44, TMPL-09: >44, TMPL-10: >40) |
| `T-ATT-EXP-17-OVERFLOW-ROW-CAPACITY` | Sobrecapacidad vertical rechazada con CAPACITY_EXCEEDED ante 41 estudiantes (CAPACITY_EXCEEDED) | **PASS** | Sobrecapacidad vertical rechazada con CAPACITY_EXCEEDED ante 41 estudiantes (CAPACITY_EXCEEDED) |
| `T-ATT-EXP-18-WATERMARKS-AND-CLEAN-CELLS` | Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE) en las 5 plantillas | **PASS** | Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE) en las 5 plantillas |
| `T-ATT-EXP-19-ISOLATION-8080` | Cero solicitudes al puerto 8080 (producción 100% aislada) | **PASS** | Cero solicitudes al puerto 8080 (producción 100% aislada) |

---

## Conclusiones Técnicas de la Expansión Asistencia UD2–UD6

1. **Cobertura Vectorial Completa:** Se completó la calibración y habilitación de las 5 plantillas de asistencia restantes (`TMPL-06` a `TMPL-10`), cubriendo la totalidad del rango curricular normativo de unidades didácticas (UD1 a UD6).
2. **Capacidades Físicas Nominales:**
   - `TMPL-06` (UD2): 35 columnas de sesión $\times$ 40 filas ($originX = 356.46$).
   - `TMPL-07` (UD3): 38 columnas de sesión $\times$ 40 filas ($originX = 332.48$).
   - `TMPL-08` (UD4): 44 columnas de sesión $\times$ 40 filas ($originX = 284.46$).
   - `TMPL-09` (UD5): 44 columnas de sesión $\times$ 40 filas ($originX = 284.46$).
   - `TMPL-10` (UD6): 40 columnas de sesión $\times$ 40 filas ($originX = 316.46$).
3. **Mapeo Dinámico y Enrutamiento Automático:** El método puro `renderAttendanceDocument(payload)` resuelve dinámicamente la plantilla adecuada a partir de `unit.orden` (2..6) o código de documento, aplicando en todos los casos la cuadrícula milimétrica exacta.
4. **Cumplimiento de Salvaguardas Normativas:**
   - **B-001:** Se mantiene el rechazo fail-closed (`TEMPLATE_NOT_AVAILABLE`) si `unit.orden > 6` o no existe plantilla física.
   - **B-003:** La columna de porcentaje de inasistencia permanece rigurosamente en blanco en las 5 plantillas, estampando únicamente totales operativos neutros (asistencias y faltas) y marcas centradas ("P", "F", "J", "—").
5. **Rechazo de Sobrecapacidad:** Todas las plantillas validan estrictamente sus límites horizontales de sesión (36 para UD2, 39 para UD3, 45 para UD4/UD5, 41 para UD6) con `SESSION_CAPACITY_EXCEEDED` y el límite vertical de 40 estudiantes con `CAPACITY_EXCEEDED`.
6. **Inmutabilidad Canónica y Aislamiento de Producción:** Los 21 hashes SHA-256 canónicos están verificados al 100% intactos, con cero interacción sobre el puerto 8080 o la base `CETPRO_DB`.
