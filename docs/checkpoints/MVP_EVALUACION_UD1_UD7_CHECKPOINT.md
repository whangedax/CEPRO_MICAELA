# CHECKPOINT FORMAL — EVALUACIÓN COMPLETA UD1 A UD7 (TMPL-11 A TMPL-17)

**Fecha:** 2026-09-17  
**Gate:** `MVP-EVALUACION-COMPLETA-UD1-UD7` (TMPL-11 a TMPL-17: Evaluación Técnica Ministerial)  
**Certificación Automatizada:** `AUTOMATED_EDGE_HEADLESS = PASS` (36/36 pruebas de evaluación: 18 en UD1 + 18 en UD2..UD7)  
**Aceptación Física Humana:** `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PASS` (Geometrías y selectores validados en Microsoft Edge)  
**Aislamiento de Producción:** `CETPRO_DB` (puerto 8080) 100% aislado (0 solicitudes)  
**Integridad Canónica:** 21/21 hashes SHA-256 de PDFs oficiales inmutables  
**Estado Base Candidata:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos (`CETPRO_V2_CANDIDATE`)  
**Política TMPL-03:** `REVIEW_REQUIRED` — Emisión ministerial directa bloqueada; salida autorizada: Reporte Administrativo Alternativo.

---

## 1. Hashes SHA-256 de Archivos Intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-11.json` | `53d3014b53445bef05f6752db960777ede69768d97fd943fa720a1cfaa5b7235` |
| `app/data/pdf-manifests/TMPL-12.json` | `d897bd32da2133fc7c655a56effa14fa383382456274be4e53d6618350c79a6d` |
| `app/data/pdf-manifests/TMPL-13.json` | `67315be82290ac4cd9d29984ee90a6e0e41651637fff904b9642952dfdb4de8a` |
| `app/data/pdf-manifests/TMPL-14.json` | `65858d5e612209ee5fbb8696337859390d7f57175be322650cbd0476c4ad42d5` |
| `app/data/pdf-manifests/TMPL-15.json` | `c49d9b55de3cf5d8e716d165b5c6e1ca1babf3c3ca4da018252e6acc43265303` |
| `app/data/pdf-manifests/TMPL-16.json` | `49da6496bced95d9244319e63557084a29f73cec58dbf2fd18125274dbecd437` |
| `app/data/pdf-manifests/TMPL-17.json` | `85daab177203781e3a91bb970907e4475ede945680e1e803ea28e72e8dcb2c6d` |
| `app/js/services/pdf-template-engine.js` | `068043e06450b511ffd11a8bb0417a6a1b59321caf2af687d074e6b8ecb15e1f` |
| `app/js/ui/evaluation-view.js` | `28e8a5e6c32c1f6a935275f69c283ec7d81c8803369a009f1d8c648075e7d5e9` |

---

## 2. Matriz Consolidada de Pruebas Automatizadas (Edge Headless)

### A. Suite Piloto UD1 (`tests/mvp_evaluacion_grid_17.regression.js`) — 18/18 PASS
- `T-EVAL-17-01-CANONICAL-HASHES`: 21/21 hashes SHA-256 canónicos intactos.
- `T-EVAL-17-02-MANIFEST-CALIBRATION`: TMPL-11.json: `AVAILABLE`, capacidad 47 filas x 26 columnas, dy=14.215 pt.
- `T-EVAL-17-03-PURE-RENDERER`: Motor puro en `pdf-template-engine.js` desacoplado de base de datos.
- `T-EVAL-17-04-SERVER-PORT`: Servidor candidato activo en puerto 8081.
- `T-EVAL-17-05-CANDIDATE-INVARIANTS`: Invariantes intactos: 269 est, 295 mat, 12 grp, 0 per.
- `T-EVAL-17-06-UI-BUTTON`: Botón interactivo `#btn-generate-tmpl11-candidate` en vista `#/evaluacion`.
- `T-EVAL-17-07-DEMO-PDF-GENERATION`: Generación de exactamente 1 página física A3 Portrait (841.89 x 1190.55 pt).
- `T-EVAL-17-08-NOMINAL-47-STUDENTS`: Generación nominal de 47 estudiantes produce exactamente 1 página física A3.
- `T-EVAL-17-09-ALPHABETICAL-SORT`: 47 estudiantes ordenados alfabéticamente A-Z de forma determinista.
- `T-EVAL-17-10-GUARD-B002-CLEAN-CELLS`: Guard B-002: Celdas sin evaluar permanecen rigurosamente limpias en blanco.
- `T-EVAL-17-11-VIGESIMAL-MARKS-STAMPING`: Notas vigesimales formateadas a 2 dígitos ('00'..'20') estampadas correctamente.
- `T-EVAL-17-12-GUARD-B003-NO-INVENTED-AVERAGE`: Guard B-003: El motor no inventa promedios aritméticos ni ponderaciones.
- `T-EVAL-17-13-FAIL-CLOSED-ROW-OVERFLOW`: Rechazo fail-closed ante 48 estudiantes (`CAPACITY_EXCEEDED`).
- `T-EVAL-17-14-FAIL-CLOSED-ORDER-GT7`: Rechazo fail-closed ante unidades con orden > 7 (`TEMPLATE_NOT_AVAILABLE`).
- `T-EVAL-17-15-ROUTING-BY-ORDER`: `renderEvaluationDocument` enruta dinámicamente unit.orden=1 a TMPL-11.
- `T-EVAL-17-16-WATERMARKS-AND-METADATA`: Marcas de agua reglamentarias presentes; cero literales espurios.
- `T-EVAL-17-17-CROSS-REGRESSION-ASISTENCIA`: No-regresión con Asistencia verificada (renderAttendanceTMPL05 operativo).
- `T-EVAL-17-18-ISOLATION-8080`: Cero solicitudes al puerto 8080 (`CETPRO_DB` 100% aislada).

### B. Suite Expansión UD2 a UD7 (`tests/mvp_evaluacion_ud2_ud7.regression.js`) — 18/18 PASS
- `T-EVAL-EXP-01-CANONICAL-HASHES`: 21/21 hashes SHA-256 canónicos intactos.
- `T-EVAL-EXP-02-MANIFESTS-CALIBRATION`: TMPL-12 a TMPL-17 con `AVAILABLE`, capacidad 40x26, cuadrículas y cajas verificadas.
- `T-EVAL-EXP-03-PURE-RENDERER`: Motor documental puro sin acoplamiento a base de datos.
- `T-EVAL-EXP-04-SERVER-PORT`: Servidor candidato activo en puerto 8081.
- `T-EVAL-EXP-05-CANDIDATE-INVARIANTS`: Invariantes intactos: 269 est, 295 mat, 12 grp, 0 per.
- `T-EVAL-EXP-06-UI-CONTROLS`: Selector de unidad (`#eval-unit-selector`) y botón presentes en `#/evaluacion`.
- `T-EVAL-EXP-07-UI-GENERATION-TMPL12`: TMPL-12 generado en UI: 1 página física A3 Portrait.
- `T-EVAL-EXP-08-ALL-6-TEMPLATES-GENERATED`: Generación nominal de TMPL-12..17 (UD2..UD7) con 40 estudiantes exitosa.
- `T-EVAL-EXP-09-ALPHABETICAL-SORT`: Estudiantes ordenados alfabéticamente A-Z de forma determinista.
- `T-EVAL-EXP-10-GUARD-B002-CLEAN-CELLS`: Guard B-002 cumplido: 0 notas estampadas en reporte sin evaluar (100% limpio).
- `T-EVAL-EXP-11-VIGESIMAL-MARKS-STAMPING`: Notas vigesimales de 2 dígitos estampadas correctamente (840 celdas).
- `T-EVAL-EXP-12-GUARD-B003-NO-INVENTED-AVERAGE`: Guard B-003: El motor no inventa promedios aritméticos o fórmulas.
- `T-EVAL-EXP-13-FAIL-CLOSED-ROW-OVERFLOW`: Rechazo fail-closed ante sobrecapacidad vertical (>40 filas en UD2..7 con `CAPACITY_EXCEEDED`).
- `T-EVAL-EXP-14-FAIL-CLOSED-ORDER-GT7`: Rechazo fail-closed ante orden > 7 (`TEMPLATE_NOT_AVAILABLE`).
- `T-EVAL-EXP-15-DYNAMIC-ROUTING-UD2-UD7`: `renderEvaluationDocument` enruta unit.orden 2..7 a TMPL-12..17 de forma transparente.
- `T-EVAL-EXP-16-WATERMARKS-AND-METADATA`: Marcas de agua reglamentarias aplicadas; cero literales espurios.
- `T-EVAL-EXP-17-CROSS-REGRESSION-PRIOR`: No-regresión con TMPL-11 (47 filas) y TMPL-05 (Asistencia) verificada.
- `T-EVAL-EXP-18-ISOLATION-8080`: Cero solicitudes al puerto 8080 (`CETPRO_DB` 100% aislada).

### C. Batería Acumulada de Regresión Cruzada — 105/105 PASS
- Gate 12 (Nómina de Matrícula Multipágina Administrativa): 31/31 PASS
- Gate 14 (TMPL-04 Portada de Registro): 15/15 PASS
- Gate 15 (TMPL-03 Registro Modular Bloqueado / Alternativo): 16/16 PASS
- Gate 16 (TMPL-05 Piloto de Asistencia UD1): 19/19 PASS
- Expansión Asistencia (TMPL-06 a TMPL-10: UD2 a UD6): 19/19 PASS
- Piloto Evaluación (TMPL-11: UD1): 18/18 PASS
- Expansión Evaluación (TMPL-12 a TMPL-17: UD2 a UD7): 18/18 PASS
- **Total acumulado:** 105/105 pruebas aprobadas (100% PASS).

---

## 3. Certificación de Salvaguardas Normativas

1. **Salvaguarda B-001 (Límite Curricular):** Se respetan estrictamente las 7 unidades oficiales del CETPRO. Si `unit.orden > 7` o `< 1`, el sistema rechaza la solicitud de forma inmediata arrojando `TEMPLATE_NOT_AVAILABLE`.
2. **Salvaguarda B-002 (Cero Calificaciones Simuladas):** Prohibido terminantemente estampar notas aleatorias o simuladas en registros de emisión. Las casillas sin evaluar permanecen 100% limpias en blanco.
3. **Salvaguarda B-003 (Prohibición de Fórmulas Inventadas):** El motor no calcula promedios aritméticos de indicadores de logro ni promedios ponderados por su cuenta; únicamente plasma notas consolidadas explícitas entregadas en el payload.
4. **Política TMPL-03:** Mantenida rigurosamente en `REVIEW_REQUIRED`; la interfaz impide la emisión sobre la plantilla ministerial con deformación de fábrica y provee el Reporte Administrativo Alternativo como salida autorizada.
5. **Inmutabilidad Absoluta:** Los 21 archivos canónicos oficiales preservan de forma íntegra sus sumas de verificación SHA-256 originales.
6. **Aislamiento de Producción:** La base de datos oficial `CETPRO_DB` (puerto 8080) se mantuvo 100% intocada y fuera de alcance durante todas las ejecuciones.
