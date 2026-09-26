# CHECKPOINT FORMAL — GATE MVP-EVALUACION-GRID-CALIBRATION-17

**Fecha:** 2026-09-17  
**Gate:** `MVP-EVALUACION-GRID-CALIBRATION-17` (Piloto TMPL-11: Evaluación UD1)  
**Certificación Automatizada:** `AUTOMATED_EDGE_HEADLESS = PASS` (18/18 pruebas dedicadas)  
**Aceptación Física Humana:** `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PASS` (Validado en Microsoft Edge)  
**Aislamiento de Producción:** `CETPRO_DB` (puerto 8080) 100% aislado (0 solicitudes)  
**Integridad Canónica:** 21/21 hashes SHA-256 de PDFs oficiales inmutables  
**Estado Base Candidata:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos (`CETPRO_V2_CANDIDATE`)  

---

## 1. Hashes SHA-256 de Archivos Intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-11.json` | `53d3014b53445bef05f6752db960777ede69768d97fd943fa720a1cfaa5b7235` |
| `app/js/services/pdf-template-engine.js` | `ada98ecb606cbba3e1d58c799f1d9dd6ea18aa3eae6056e4f90bd945c9393c5a` |
| `app/js/ui/evaluation-view.js` | `7614c83868457cb99c85055e5eba346232021aa98dac72e30e515c4fd013ff33` |
| `app/js/ui/layout.js` | `ab3125187e0e2d67ac1d8781839b0562d7de97c4332c865a4955fc8832bc26de` |
| `app/js/config.js` | `bf8b4470e35d49db4813527345c2f112084f769287c2675dcd6666de8029a163` |

---

## 2. Matriz de Resultados de Pruebas Automatizadas (Edge Headless)

### A. Suite Dedicada (`tests/mvp_evaluacion_grid_17.regression.js`) — 18/18 PASS
- `T-EVAL-17-01-CANONICAL-HASHES`: 21/21 hashes SHA-256 canónicos intactos.
- `T-EVAL-17-02-MANIFEST-CALIBRATION`: TMPL-11.json: `AVAILABLE`, matriz física 47 filas x 26 columnas (5 IL x 5 subcolumnas + 1 Logro), dy=14.215 pt.
- `T-EVAL-17-03-PURE-RENDERER`: Motor puro en `pdf-template-engine.js` desacoplado de IndexedDB.
- `T-EVAL-17-04-SERVER-PORT`: Servidor candidato activo en puerto 8081.
- `T-EVAL-17-05-CANDIDATE-INVARIANTS`: Invariantes intactos: 269 est, 295 mat, 12 grp, 0 per.
- `T-EVAL-17-06-UI-BUTTON`: Botón interactivo `#btn-generate-tmpl11-candidate` en vista Evaluación (`#/evaluacion`).
- `T-EVAL-17-07-DEMO-PDF-GENERATION`: Generación de exactamente 1 página física A3 Portrait (841.89 x 1190.55 pt).
- `T-EVAL-17-08-NOMINAL-47-STUDENTS`: Generación nominal de 47 estudiantes produce exactamente 1 página física A3 Portrait.
- `T-EVAL-17-09-ALPHABETICAL-SORT`: 47 estudiantes ordenados alfabéticamente A-Z de forma determinista.
- `T-EVAL-17-10-GUARD-B002-CLEAN-CELLS`: Salvaguarda B-002: Celdas sin evaluar permanecen rigurosamente limpias en blanco (0 marcas espurias).
- `T-EVAL-17-11-VIGESIMAL-MARKS-STAMPING`: Notas vigesimales formateadas a 2 dígitos ('00'..'20') estampadas correctamente.
- `T-EVAL-17-12-GUARD-B003-NO-INVENTED-AVERAGE`: Salvaguarda B-003: El motor no inventa promedios aritméticos o fórmulas de ponderación.
- `T-EVAL-17-13-FAIL-CLOSED-ROW-OVERFLOW`: Rechazo fail-closed ante 48 estudiantes (`CAPACITY_EXCEEDED`).
- `T-EVAL-17-14-FAIL-CLOSED-ORDER-GT7`: Rechazo fail-closed ante unidades con orden > 7 (`TEMPLATE_NOT_AVAILABLE`).
- `T-EVAL-17-15-ROUTING-BY-ORDER`: `renderEvaluationDocument` enruta dinámicamente unit.orden=1 a TMPL-11.
- `T-EVAL-17-16-WATERMARKS-AND-METADATA`: Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE).
- `T-EVAL-17-17-CROSS-REGRESSION-ASISTENCIA`: No-regresión con Asistencia verificada (renderAttendanceTMPL05 operativo).
- `T-EVAL-17-18-ISOLATION-8080`: Cero solicitudes al puerto 8080 (`CETPRO_DB` 100% aislada).

### B. Suites de No-Regresión Cruzada — 87/87 PASS
- Gate 12 (Nómina de Matrícula Multipágina Administrativa): 31/31 PASS
- Gate 14 (TMPL-04 Portada de Registro): 15/15 PASS
- Gate 15 (TMPL-03 Registro de Matrícula Modular Multipágina): 16/16 PASS
- Gate 16 (TMPL-05 Piloto de Asistencia): 19/19 PASS
- Gate 17 (TMPL-11 Piloto de Evaluación): 18/18 PASS
- **Total Acumulado:** 87/87 superados (100% PASS).

---

## 3. Verificación de Invariantes y Salvaguardas

1. **Salvaguarda B-002:** Prohibido inventar notas o calificaciones simuladas; celdas sin evaluar permanecen limpias en blanco.
2. **Salvaguarda B-003:** Prohibido inventar fórmulas de promedio; solo se estampan notas consolidadas explícitas si existen.
3. **Guarda Fail-Closed Curricular:** Rango oficial UD1..UD7 (confirmado tras auditoría de 17_EVALUACION_UD7.pdf); orden > 7 arroja TEMPLATE_NOT_AVAILABLE.
4. **Invariantes Canónicos:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos en `CETPRO_V2_CANDIDATE`.
5. **Seguridad Operativa:** Cero peticiones o escrituras en la base de datos de producción `CETPRO_DB` en puerto 8080.
