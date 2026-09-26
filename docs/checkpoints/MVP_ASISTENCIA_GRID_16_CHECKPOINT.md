# CHECKPOINT FORMAL — GATE MVP-ASISTENCIA-GRID-CALIBRATION-16

**Fecha:** 2026-09-17  
**Gate:** `MVP-ASISTENCIA-GRID-CALIBRATION-16` (Piloto TMPL-05: Asistencia UD1)  
**Certificación Automatizada:** `AUTOMATED_EDGE_HEADLESS = PASS` (19/19 pruebas dedicadas)  
**Aceptación Física Humana:** `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PASS` (Validado en Microsoft Edge)  
**Aislamiento de Producción:** `CETPRO_DB` (puerto 8080) 100% aislado (0 solicitudes)  
**Integridad Canónica:** 21/21 hashes SHA-256 de PDFs oficiales inmutables  
**Estado Base Candidata:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos (`CETPRO_V2_CANDIDATE`)  

---

## 1. Hashes SHA-256 de Archivos Intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-05.json` | `1f78001f939e8f166154908a4118144c2b70eacc88e032b8a2b015ffb6ec7ee5` |
| `app/js/services/pdf-template-engine.js` | `343542e45ec9fb5ef9230c06d29f7ae9de6926a4cb1307dbda693d03c72925a8` |
| `app/js/ui/demo-attendance-view.js` | `44baebd23d3959f964faf3a8d46d89750a1cdd2d04ed67d1c6915a02ea11f061` |
| `app/js/ui/attendance-view.js` | `73f4f69bbd894fcabaefb546fd4086ce1cc79bd5f10a5f31a2d15ec573026268` |

---

## 2. Matriz de Resultados de Pruebas Automatizadas (Edge Headless)

### A. Suite Dedicada (`tests/mvp_asistencia_grid_16.regression.js`) — 19/19 PASS
- `T-ATT-16-01-CANONICAL-HASHES`: 21/21 hashes SHA-256 canónicos intactos.
- `T-ATT-16-02-MANIFEST-CALIBRATION`: TMPL-05.json: `AVAILABLE`, matriz física 40x44, $dx=15.9873$ pt, $dy=11.99$ pt.
- `T-ATT-16-03-PURE-RENDERER`: Motor puro en `pdf-template-engine.js` desacoplado de IndexedDB.
- `T-ATT-16-04-SERVER-PORT`: Servidor candidato activo en puerto 8081.
- `T-ATT-16-05-CANDIDATE-INVARIANTS`: Invariantes intactos: 269 est, 295 mat, 12 grp, 0 per.
- `T-ATT-16-06-DEMO-UI-BUTTON`: Botón interactivo `#demo-att-tmpl05` en vista Asistencia DEMO.
- `T-ATT-16-07-DEMO-PDF-GENERATION`: Generación de exactamente 1 página física A3 Landscape (1190.55 x 841.89 pt).
- `T-ATT-16-08-ALPHABETICAL-SORT`: 40 estudiantes ordenados alfabéticamente A-Z de forma determinista.
- `T-ATT-16-09-GRID-OPERATIONAL-MARKS`: Marcas operativas centradas ("P", "F", "J", "—") en cuadrícula.
- `T-ATT-16-10-TOTALS-COLUMNS`: Totales operativos por fila presentes (80 celdas estampadas: Asistencias y Faltas).
- `T-ATT-16-11-GUARD-B003-PERCENT-BLANK`: Salvaguarda B-003: Casilla de porcentaje oficial en filas estrictamente vacía.
- `T-ATT-16-12-GUARD-B001-ORDER7-REJECTION`: Salvaguarda B-001: Rechazo fail-closed ante UD $> 6$ (`TEMPLATE_NOT_AVAILABLE`).
- `T-ATT-16-13-MAX-CAPACITY-44-SESSIONS`: Capacidad máxima de 44 sesiones renderizada correctamente.
- `T-ATT-16-14-SESSION-CAPACITY-EXCEEDED`: Rechazo fail-closed ante 45 sesiones (`SESSION_CAPACITY_EXCEEDED`).
- `T-ATT-16-15-ROW-CAPACITY-EXCEEDED`: Rechazo fail-closed ante 41 estudiantes (`CAPACITY_EXCEEDED`).
- `T-ATT-16-16-WATERMARKS-AND-CLEAN-CELLS`: Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE).
- `T-ATT-16-17-CANDIDATE-UI-BUTTON`: Botón `#btn-generate-tmpl05-candidate` presente en vista candidata `#/registro`.
- `T-ATT-16-18-CANDIDATE-PREVIEW-RENDER`: Visor iframe con Blob PDF, auto-scroll e impresión operativa en `#/registro`.
- `T-ATT-16-19-ISOLATION-8080`: Cero solicitudes al puerto 8080 (`CETPRO_DB` 100% aislada).

### B. Suites de No-Regresión Cruzada — 65/65 PASS
- Gate 13 (`TMPL-01` Cabeceras y Saneamiento): 15/15 PASS
- Gate 14 (`TMPL-04` Portada de Registro): 15/15 PASS
- Gate 15 (`TMPL-03` Registro de Matrícula Modular Multipágina): 16/16 PASS
- Gate 16 (`TMPL-05` Piloto de Asistencia): 19/19 PASS
- **Total Acumulado:** 65/65 superados (100% PASS).

---

## 3. Verificación de Invariantes y Salvaguardas

1. **Salvaguarda B-001:** Las unidades con orden $> 6$ (como UD7) son rechazadas inmediatamente arrojando `TEMPLATE_NOT_AVAILABLE`.
2. **Salvaguarda B-003:** La columna ministerial de porcentaje de inasistencia permanece estrictamente en blanco en todo el reporte físico.
3. **Invariantes Canónicos:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos en `CETPRO_V2_CANDIDATE`.
4. **Seguridad Operativa:** Cero peticiones o escrituras en la base de datos de producción `CETPRO_DB` en puerto 8080.
