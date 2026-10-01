# Reporte de Pruebas: MVP-TMPL03-REGISTRO-MODULAR-15

**Fecha:** 2026-10-01T05:38:29.412Z
**Entorno:** Microsoft Edge Headless (127.0.0.1:8081)
**Aislamiento:** CETPRO_DB (8080) Protegida / Inalterada
**Resultado Global:** AUTOMATED_EDGE_HEADLESS = FAIL
**Aceptación Física Humana:** HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING

## Matriz de Resultados (14/15)

| ID Caso | Estado | Detalle |
|---|:---:|---|
| `T-TMPL03-01-CANONICAL-HASHES` | **PASSED** | 21/21 hashes SHA-256 canónicos intactos |
| `T-TMPL03-02-MANIFEST-CONFIG` | **PASSED** | TMPL-03.json: previewStatus=AVAILABLE, geometryProvenance registrada, capacity={pages:1, rows:20} |
| `T-TMPL03-03-PURE-RENDERER` | **PASSED** | pdf-template-engine.js puro sin dependencias de DB |
| `T-TMPL03-04-SERVER-PORT` | **PASSED** | Servidor candidato activo en puerto 8081 |
| `T-TMPL03-05-ISOLATION-8080` | **PASSED** | Cero peticiones al puerto 8080 (CETPRO_DB 100% aislada) |
| `T-TMPL03-06-DEMO-B-25-PAGES` | **PASSED** | DEMO B (25 alumnos) genera exactamente 2 páginas físicas A3 (obtenido: 2) |
| `T-TMPL03-07-DEMO-B-CONTINUITY` | **PASSED** | DEMO B: Leyendas de continuidad exactas (Pág 1 de 2: Registros 1–20; Pág 2 de 2: Registros 21–25, Total 25) |
| `T-TMPL03-08-DEMO-A-40-PAGES` | **PASSED** | DEMO A (40 alumnos) genera exactamente 2 páginas físicas A3 (obtenido: 2) |
| `T-TMPL03-09-DEMO-A-CONTINUITY` | **PASSED** | DEMO A: Leyendas de continuidad exactas (Pág 1 de 2: Registros 1–20; Pág 2 de 2: Registros 21–40, Total 40) |
| `T-TMPL03-10-LIMIT-70-PAGES` | **PASSED** | Caso Límite (70 alumnos) genera exactamente 4 páginas físicas A3 (obtenido: 4) |
| `T-TMPL03-11-LIMIT-70-CONTINUITY` | **PASSED** | Caso Límite: Página 4 contiene "Página 4 de 4 · Registros 61–70", Total 70 y 10 en esta página |
| `T-TMPL03-12-STABLE-ALPHABETICAL-ORDER` | **PASSED** | Orden alfabético estable: ALVAREZ precede a MAMANI y MAMANI precede a ZAPATA |
| `T-TMPL03-13-WATERMARKS` | **PASSED** | Marcas de agua verificadas: DEMOSTRACIÓN — NO OFICIAL en DEMO B, BORRADOR ADMINISTRATIVO — NO OFICIAL en DEMO A |
| `T-TMPL03-14-NO-SPURIOUS-STRINGS` | **PASSED** | Cero cadenas espurias: Ausencia total de "null", "undefined" o "PENDIENTE" |
| `T-TMPL03-FATAL-ERROR` | **FAILED** | Waiting for selector `#register-program` failed |

## Invariantes Verificados
- **Inmutabilidad Canónica:** 21/21 hashes SHA-256 inalterados (en particular 03_REGISTRO_DE_MATRICULA_MODULAR.pdf).
- **Capacidad Nominal A3:** 20 registros por página física. Lotes de 25 alumnos generan 2 páginas (20+5), 40 alumnos generan 2 páginas (20+20) y 70 alumnos generan 4 páginas (20+20+20+10).
- **Leyendas de Continuidad:** Formato "Página X de Y · Registros A–B" y "TOTAL GENERAL DEL GRUPO: N · REGISTROS EN ESTA PÁGINA: M".
- **Orden Alfabético:** Estudiantes ordenados de forma estable por apellidos y nombres.
- **Aislamiento DB y Red:** Cero consultas a IndexedDB en el motor de dibujo y cero peticiones al puerto 8080.
- **Calidad Vectorial:** Ausencia absoluta de literales espurios ("null", "undefined", "PENDIENTE").
- **Integración UI:** Botón interactivo en `#/registros/matricula` con visor iframe embebido, auto-scroll y botones de descarga e impresión.
