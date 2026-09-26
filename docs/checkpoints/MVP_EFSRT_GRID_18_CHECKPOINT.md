# CHECKPOINT FORMAL — GATE MVP-EFSRT-GRID-CALIBRATION-18

**Fecha:** 2026-09-17  
**Gate:** `MVP-EFSRT-GRID-CALIBRATION-18` (Piloto TMPL-18: Consolidado de EFSRT)  
**Certificación Automatizada:** `AUTOMATED_EDGE_HEADLESS = PASS` (15/15 pruebas dedicadas)  
**Aceptación Física Humana:** `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING` (Inspección física en Microsoft Edge pendiente)  
**Aislamiento de Producción:** `CETPRO_DB` (puerto 8080) 100% aislado (0 solicitudes)  
**Integridad Canónica:** 21/21 hashes SHA-256 de PDFs oficiales inmutables  
**Estado Base Candidata:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos (`CETPRO_V2_CANDIDATE`)  
**Política TMPL-03:** `REVIEW_REQUIRED` (Emisión ministerial bloqueada; reporte alternativo administrativo operativo).

---

## 1. Hashes SHA-256 de Archivos Intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-18.json` | `c1dead05ab760870f4f19eed758b8a89a56509ec6b4b1c2c55f27374c16da84c` |
| `app/js/services/pdf-template-engine.js` | `54e8af3f2d7d5913cdef76026b18d1f713e604efcd9ffb3e1242624b19758f53` |
| `app/js/services/template-registry.js` | `d372953d3c3d6dba5bc580321a59db62cf8f837804a7c9d7353de5e350357462` |
| `app/js/ui/efsrt-view.js` | `f7ed329302f52a555912ee892baedddb1a1b67dfc299367cd3b27e1a5ec8037a` |

---

## 2. Matriz de Resultados de Pruebas Automatizadas (Edge Headless)

### A. Suite Dedicada (`tests/mvp_efsrt_grid_18.regression.js`) — 15/15 PASS
- `T-EFSRT-18-01-CANONICAL-HASHES`: 21/21 hashes SHA-256 canónicos intactos.
- `T-EFSRT-18-02-MANIFEST-CALIBRATION`: TMPL-18.json: `AVAILABLE`, capacidad 40 filas x 9 criterios, dy=13.6 pt, campos verificados.
- `T-EFSRT-18-03-PURE-RENDERER`: Motor puro en `pdf-template-engine.js` desacoplado de IndexedDB.
- `T-EFSRT-18-04-SERVER-PORT`: Servidor candidato activo en puerto 8081.
- `T-EFSRT-18-05-CANDIDATE-INVARIANTS`: Invariantes intactos: 269 est, 295 mat, 12 grp, 0 per.
- `T-EFSRT-18-06-UI-BUTTON`: Botón interactivo `#btn-generate-tmpl18-candidate` en vista `#/efsrt`.
- `T-EFSRT-18-07-UI-PDF-GENERATION`: Generación en UI de exactamente 1 página física A3 Portrait (841.89 x 1190.55 pt).
- `T-EFSRT-18-08-NOMINAL-40-STUDENTS`: Generación nominal de 40 estudiantes produce exactamente 1 página física A3 Portrait.
- `T-EFSRT-18-09-ALPHABETICAL-SORT`: Estudiantes ordenados alfabéticamente A-Z de forma determinista.
- `T-EFSRT-18-10-GUARD-B005-CLEAN-CELLS`: Salvaguarda B-005 cumplida: 0 empresas o notas simuladas (celdas 100% limpias en blanco).
- `T-EFSRT-18-11-MARKS-AND-FINAL-GRADE`: Empresa, dirección, criterios (0-3 etc.) y calificación vigesimal estampados correctamente.
- `T-EFSRT-18-12-FAIL-CLOSED-ROW-OVERFLOW`: Sobrecapacidad vertical rechazada fail-closed: 41 filas produce `CAPACITY_EXCEEDED`.
- `T-EFSRT-18-13-WATERMARKS-AND-CLEAN-CELLS`: Marcas de agua reglamentarias presentes; cero literales espurios (null/undefined/PENDIENTE).
- `T-EFSRT-18-14-CROSS-REGRESSION-PRIOR`: No-regresión con TMPL-11 (Evaluación), TMPL-05 (Asistencia) y TMPL-04 (Portada) verificada.
- `T-EFSRT-18-15-ISOLATION-8080`: Cero solicitudes al puerto 8080 (`CETPRO_DB` 100% aislada).

---

## 3. Certificación de Salvaguardas Normativas

1. **Salvaguarda B-005 (Cero Prácticas Ficticias):** Celdas de empresa, dirección, criterios y nota final permanecen estrictamente vacías para estudiantes sin práctica registrada. Prohibido terminantemente autocompletar RUCs o talleres simulados.
2. **Capacidad Nominal A3 Portrait:** Exactamente 40 filas calibradas sobre el binario ministerial canónico `18_CONSOLIDADO_EFSRT.pdf` ($dy = 13.6\text{ pt}$).
3. **Inmutabilidad Canónica:** Los 21 archivos oficiales preservan sus hashes SHA-256 originales.
4. **Aislamiento Total:** El puerto 8080 (`CETPRO_DB`) no recibió ninguna solicitud durante las pruebas.
