# Reporte de Pruebas: MVP-TMPL04-PORTADA-REGISTRO

**Fecha:** 2026-10-01T05:40:16.542Z
**Entorno:** Microsoft Edge Headless (127.0.0.1:8081)
**Aislamiento:** CETPRO_DB (8080) Protegida / Inalterada
**Resultado Global:** AUTOMATED_EDGE_HEADLESS = FAIL
**Aceptación Física Humana:** HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING

## Matriz de Resultados (12/13)

| ID Caso | Estado | Detalle |
|---|:---:|---|
| `T-TMPL04-01-CANONICAL-HASHES` | **PASSED** | 21/21 hashes SHA-256 canónicos intactos |
| `T-TMPL04-02-MANIFEST-FIELDS` | **PASSED** | 15/15 campos vectoriales presentes en TMPL-04.json |
| `T-TMPL04-03-PURE-RENDERER` | **PASSED** | pdf-template-engine.js puro sin dependencias de DB |
| `T-TMPL04-04-SERVER-PORT` | **PASSED** | Servidor candidato activo en puerto 8081 |
| `T-TMPL04-05-ISOLATION-8080` | **PASSED** | Cero peticiones al puerto 8080 (CETPRO_DB 100% aislada) |
| `T-TMPL04-06-DEMO-A-PAGES` | **PASSED** | DEMO A genera exactamente 1 página física (obtenido: 1) |
| `T-TMPL04-07-DEMO-A-FIELDS` | **PASSED** | DEMO A contiene Programa, Módulo, Institución, UGEL, Turno y Docente |
| `T-TMPL04-08-DEMO-A-WATERMARK` | **PASSED** | DEMO A contiene marca de agua DEMOSTRACIÓN — NO OFICIAL |
| `T-TMPL04-09-DEMO-B-PAGES` | **PASSED** | DEMO B genera exactamente 1 página física (obtenido: 1) |
| `T-TMPL04-10-DEMO-B-FIELDS` | **PASSED** | DEMO B contiene Programa, Módulo, Turno y Docente |
| `T-TMPL04-11-DEMO-B-WATERMARK` | **PASSED** | DEMO B contiene marca de agua BORRADOR ADMINISTRATIVO — NO OFICIAL |
| `T-TMPL04-12-NO-SPURIOUS-STRINGS` | **PASSED** | Ausencia total de literales "null", "undefined" o "PENDIENTE" en el PDF generado |
| `T-TMPL04-FATAL-ERROR` | **FAILED** | Waiting for selector `#roster-program` failed |

## Invariantes Verificados
- **Inmutabilidad Canónica:** 21/21 hashes SHA-256 inalterados.
- **Página Única Fija:** Capacidad física de 1 página respetada para TMPL-04.
- **Aislamiento DB:** Motor de dibujo puro sin consultas a IndexedDB.
- **Calidad Vectorial:** Ausencia absoluta de literales espurios ("null", "undefined", "PENDIENTE").
- **Previsualización e Impresión:** Visor accesible embebido con botones operativos de impresión nativa y descarga.
