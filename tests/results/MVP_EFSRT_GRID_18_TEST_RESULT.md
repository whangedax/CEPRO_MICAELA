# RESULTADO DE PRUEBAS: GATE 18 (PILOTO TMPL-18 CONSOLIDADO EFSRT)

**Fecha:** 2026-09-28T02:20:00.912Z
**Entorno:** Microsoft Edge Headless
**Servidor:** http://127.0.0.1:8081/
**Resultado:** 14/15 pruebas superadas (CON FALLOS)

## Detalle de Pruebas

| Código | Estado | Descripción |
|---|---|---|
| `T-EFSRT-18-01-CANONICAL-HASHES` | ✅ PASS | 21/21 hashes SHA-256 canónicos intactos |
| `T-EFSRT-18-02-MANIFEST-CALIBRATION` | ❌ FAIL | TMPL-18.json: AVAILABLE, 40 filas x 9 criterios, dy=13.6, campos verificados |
| `T-EFSRT-18-03-PURE-RENDERER` | ✅ PASS | pdf-template-engine.js puro sin dependencias de IndexedDB |
| `T-EFSRT-18-04-SERVER-PORT` | ✅ PASS | Servidor candidato activo en puerto 8081 |
| `T-EFSRT-18-05-CANDIDATE-INVARIANTS` | ✅ PASS | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per |
| `T-EFSRT-18-06-UI-BUTTON` | ✅ PASS | Botón #btn-generate-tmpl18-candidate presente en vista #/efsrt |
| `T-EFSRT-18-07-UI-PDF-GENERATION` | ✅ PASS | TMPL-18 generado en UI: exactamente 1 página física A3 Portrait (841.89 x 1190.55 pt) |
| `T-EFSRT-18-08-NOMINAL-40-STUDENTS` | ✅ PASS | Generación nominal de 40 estudiantes produce exactamente 1 página física A3 Portrait |
| `T-EFSRT-18-09-ALPHABETICAL-SORT` | ✅ PASS | Estudiantes ordenados alfabéticamente A-Z de forma determinista |
| `T-EFSRT-18-10-GUARD-B005-CLEAN-CELLS` | ✅ PASS | Guard B-005 cumplido: 0 empresas o notas simuladas (100% limpio en blanco) |
| `T-EFSRT-18-11-MARKS-AND-FINAL-GRADE` | ✅ PASS | Empresa, dirección, criterios y calificación vigesimal estampados correctamente |
| `T-EFSRT-18-12-FAIL-CLOSED-ROW-OVERFLOW` | ✅ PASS | Sobrecapacidad vertical rechazada fail-closed: 41 filas produce CAPACITY_EXCEEDED |
| `T-EFSRT-18-13-WATERMARKS-AND-CLEAN-CELLS` | ✅ PASS | Marcas de agua reglamentarias presentes; cero literales espurios |
| `T-EFSRT-18-14-CROSS-REGRESSION-PRIOR` | ✅ PASS | No-regresión con TMPL-11 (Evaluación), TMPL-05 (Asistencia) y TMPL-04 (Portada) verificada |
| `T-EFSRT-18-15-ISOLATION-8080` | ✅ PASS | Cero solicitudes al puerto 8080 (producción 100% aislada) |

## Invariantes de Seguridad y Normativa
- 21/21 hashes SHA-256 canónicos verificados intactos.
- Salvaguarda B-005: Casillas de empresa, dirección, criterios y nota 100% vacías ante ausencia de prácticas registradas.
- Rechazo fail-closed ante 41 estudiantes (CAPACITY_EXCEEDED).
- Cero peticiones dirigidas al puerto 8080 (CETPRO_DB aislada).
- Base de datos candidata (CETPRO_V2_CANDIDATE) intacta (269 est, 295 mat, 12 grp, 0 per).