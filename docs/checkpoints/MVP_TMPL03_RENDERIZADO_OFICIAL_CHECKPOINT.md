# Checkpoint: RECUPERACION-TMPL03-RENDERIZADO-OFICIAL

**Fecha:** 2026-09-17T19:30:00-05:00  
**Gate:** Recuperación y Renderizado Obligatorio de TMPL-03 sobre PDF Oficial Ministerial  
**Resultado:** AUTOMATED_EDGE_HEADLESS = PASS (16/16)  
**Aceptación Humana:** HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING  

## Resumen Ejecutivo

Se recuperó y habilitó la emisión obligatoria de TMPL-03 (Registro de Matrícula Modular) directamente sobre el binario canónico ministerial `03_REGISTRO_DE_MATRICULA_MODULAR.pdf` mediante enmascaramiento vectorial limpio, eliminando el bloqueo previo `REVIEW_REQUIRED`.

## Técnica de Enmascaramiento Vectorial

- **Parche blanco:** `drawRectangle({x: 18.0, y: 35.0, width: 21.5, height: 1010.0, color: rgb(1,1,1)})` neutraliza los 32 textos "15" preimpresos corruptos del PDF ministerial.
- **Numeración correlativa real:** `pageOffset` asegura continuidad 1..20, 21..40, etc. entre páginas.
- **Desglose de fecha de nacimiento:** 3 subcolumnas (Día: w=16, Mes: w=16, Año: w=20 pt) para evitar colisiones con las subdivisiones preimpresas.

## Hashes SHA-256 de Archivos Modificados

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-03.json` | `9e41c024cf892fd33f3e12206793bab3d86929efab3d08fa24178490a437420b` |
| `app/js/services/pdf-template-engine.js` | `17bd4c26521abe7d1d35d59018b20cf7306a7a1067a64a35f9a544e65b8face6` |
| `app/js/ui/enrollment-register-view.js` | `e13a1e5b7ea99dcec4c1389caa60ae05fdb07094058f7853136d47dbdae427ef` |
| `app/js/services/template-registry.js` | `1a31f362f6f42935c83b8a3d1bcb9310b1b36d991359dfb0809f14ea7f5400df` |
| `app/js/services/mvp-admin-service.js` | `f07e3da08d4596a61d03181fe5112f4c86d4cc0f13f70909f1843153a4db1f95` |
| `tests/mvp_tmpl03_registro.regression.js` | `f61241a821ad211f01e096f1291c6f8bb0f1ef6120c3695b79970ef45248b112` |

## Matriz de Pruebas (16/16 PASS)

| ID Caso | Estado | Detalle |
|---|:---:|---|
| `T-TMPL03-01-CANONICAL-HASHES` | **PASSED** | 21/21 hashes SHA-256 canónicos intactos |
| `T-TMPL03-02-MANIFEST-CONFIG` | **PASSED** | TMPL-03.json: previewStatus=AVAILABLE, geometryProvenance registrada, capacity={pages:1, rows:20} |
| `T-TMPL03-03-PURE-RENDERER` | **PASSED** | pdf-template-engine.js puro sin dependencias de DB |
| `T-TMPL03-04-SERVER-PORT` | **PASSED** | Servidor candidato activo en puerto 8081 |
| `T-TMPL03-05-ISOLATION-8080` | **PASSED** | Cero peticiones al puerto 8080 (CETPRO_DB 100% aislada) |
| `T-TMPL03-06-DEMO-B-25-PAGES` | **PASSED** | DEMO B (25 alumnos) genera exactamente 2 páginas físicas A3 |
| `T-TMPL03-07-DEMO-B-CONTINUITY` | **PASSED** | Leyendas de continuidad exactas (Pág 1 de 2: Registros 1–20; Pág 2 de 2: Registros 21–25) |
| `T-TMPL03-08-DEMO-A-40-PAGES` | **PASSED** | DEMO A (40 alumnos) genera exactamente 2 páginas físicas A3 |
| `T-TMPL03-09-DEMO-A-CONTINUITY` | **PASSED** | Leyendas de continuidad exactas (Pág 1 de 2: Registros 1–20; Pág 2 de 2: Registros 21–40) |
| `T-TMPL03-10-LIMIT-70-PAGES` | **PASSED** | Caso Límite (70 alumnos) genera exactamente 4 páginas físicas A3 |
| `T-TMPL03-11-LIMIT-70-CONTINUITY` | **PASSED** | Página 4: "Página 4 de 4 · Registros 61–70", Total 70 |
| `T-TMPL03-12-STABLE-ALPHABETICAL-ORDER` | **PASSED** | Orden alfabético estable: ALVAREZ < MAMANI < ZAPATA |
| `T-TMPL03-13-WATERMARKS` | **PASSED** | Marcas de agua DEMOSTRACIÓN y BORRADOR ADMINISTRATIVO verificadas |
| `T-TMPL03-14-NO-SPURIOUS-STRINGS` | **PASSED** | Cero cadenas espurias ("null", "undefined", "PENDIENTE") |
| `T-TMPL03-15-UI-BUTTON-ENABLED` | **PASSED** | Botón TMPL-03 habilitado y operativo en UI |
| `T-TMPL03-16-UI-OFFICIAL-MINISTERIAL-REPORT` | **PASSED** | Emisión oficial TMPL-03 generada sobre PDF ministerial con iframe y descarga/impresión operativas |

## Invariantes Verificados

- **Inmutabilidad Canónica:** 21/21 hashes SHA-256 de PDF ministeriales inalterados.
- **Capacidad Nominal A3:** 20 registros por página física. 25→2 pág, 40→2 pág, 70→4 pág.
- **Enmascaramiento Vectorial:** Parche blanco en x=18..40, y=35..1045 neutraliza 100% de "15" corruptos.
- **Numeración Correlativa:** Páginas múltiples mantienen correlatividad consecutiva (1..20, 21..40, etc.).
- **Desglose de Fecha:** Día/Mes/Año en subcolumnas separadas sin colisión.
- **Aislamiento DB y Red:** Cero consultas a IndexedDB y cero peticiones al puerto 8080.
- **Orden Alfabético:** Estudiantes ordenados de forma estable por apellidos y nombres.
- **Integración UI:** Botón `#register-tmpl03` habilitado con visor iframe, descarga e impresión.
