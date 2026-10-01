# RESULTADO DE PRUEBAS: GATE MVP-ACTA-MODULAR-19 (TMPL-19)

**Fecha:** 2026-10-01T05:35:43.541Z
**Entorno:** Microsoft Edge Headless
**Servidor:** http://127.0.0.1:8081/
**Resultado:** 14/14 pruebas superadas (100% PASS)

## Detalle de Pruebas

| Código | Estado | Descripción |
|---|---|---|
| `T-TMPL19-01-CANONICAL-HASHES` | ✅ PASS | 21/21 hashes SHA-256 canónicos intactos |
| `T-TMPL19-02-MANIFESTS-INTEGRITY` | ✅ PASS | TMPL-19 AVAILABLE (2 págs, 20+20 filas); TMPL-20/21 BLOCKED_BY_SOURCE con mapeo vectorial completo |
| `T-TMPL19-03-PURE-RENDERER` | ✅ PASS | pdf-template-engine.js puro sin dependencias de IndexedDB |
| `T-TMPL19-04-SERVER-PORT` | ✅ PASS | Servidor candidato activo en puerto 8081 |
| `T-TMPL19-05-CANDIDATE-INVARIANTS` | ✅ PASS | Invariantes candidata: 269 est, 295 mat, 12 grp, 0 per |
| `T-TMPL19-06-UI-BUTTON` | ✅ PASS | Botón #btn-generate-tmpl19-candidate presente en vista #/evaluacion |
| `T-TMPL19-07-UI-PDF-GENERATION` | ✅ PASS | TMPL-19 generado en UI: exactamente 2 páginas físicas A3 Landscape (1190.5512 x 841.8898 pt) |
| `T-TMPL19-08-ROW-PARTITION-20-20` | ✅ PASS | Partición exacta 20+20 comprobada: Alumnos 1..20 en Página 1; Alumnos 21..40 en Página 2 |
| `T-TMPL19-09-ALPHABETICAL-SORT` | ✅ PASS | Estudiantes ordenados alfabéticamente A-Z de forma determinista |
| `T-TMPL19-10-FAIL-CLOSED-ROW-OVERFLOW` | ✅ PASS | Sobrecapacidad vertical rechazada fail-closed: 41 filas produce CAPACITY_EXCEEDED |
| `T-TMPL19-11-FAIL-CLOSED-NO-MODULE` | ✅ PASS | Grupo sin módulo formativo rechazado fail-closed: produce ACADEMIC_CONFIGURATION_PENDING |
| `T-TMPL19-12-ZERO-MOCKS-AND-SPURIOUS` | ✅ PASS | CERO MOCKS cumplido: celdas sin evaluar quedan estrictamente vacías; cero literales espurios |
| `T-TMPL19-13-CROSS-REGRESSION-PRIOR` | ✅ PASS | No-regresión con TMPL-18 (EFSRT), TMPL-11 (Evaluación), TMPL-05 (Asistencia) y TMPL-04 (Portada) |
| `T-TMPL19-14-PORT-8080-ISOLATION` | ✅ PASS | Cero solicitudes al puerto 8080 (producción 100% aislada) |

## Invariantes de Seguridad y Normativa
- 21/21 hashes SHA-256 canónicos verificados intactos.
- Partición 20+20 filas verificada en 2 páginas físicas A3 landscape.
- Salvaguarda B-006: Libro, Folio y Código Registral permanecen vacíos.
- Rechazo fail-closed ante > 40 estudiantes (CAPACITY_EXCEEDED).
- Rechazo fail-closed ante grupo sin módulo formativo asignado (ACADEMIC_CONFIGURATION_PENDING).
- Cero peticiones dirigidas al puerto 8080 (CETPRO_DB aislada).
- Base de datos candidata (CETPRO_V2_CANDIDATE) intacta (269 est, 295 mat, 12 grp, 0 per).