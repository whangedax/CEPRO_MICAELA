# Checkpoint Formal — MVP-TMPL04-PORTADA-REGISTRO-14

Fecha: 2026-09-17

## Alcance ejecutado y verificado

- Mapeo vectorial de 15 campos físicos de cabecera y cuerpo en `TMPL-04` (`app/data/pdf-manifests/TMPL-04.json`).
- Renderizado vectorial puro en `pdf-template-engine.js` (`renderTMPL04`) sin consultas a IndexedDB ni dependencias de repositorios (`!/getDB\(|IndexedDB|Repository/.test(engineSource) === true`).
- AutoFit dinámico (5.5pt a 9.0pt/10.0pt) con política de seguridad tipográfica *fail-closed* ante desbordamiento (`FIELD_OVERFLOW`).
- Limpieza estricta de valores: celdas no asignadas permanecen en blanco limpio sin literales espurios (`undefined`, `null`, `PENDIENTE`).
- Inyección de datos desde el contexto del grupo: Institución (Nombre, DRE, UGEL, Tipo de Gestión), Programa y Módulo confirmados, Turno, Ciclo, Sección y Docente asignado.
- Marcas de agua institucionales contextuales: `"BORRADOR ADMINISTRATIVO — NO OFICIAL"` en candidata v2 y `"DEMOSTRACIÓN — NO OFICIAL"` en modo DEMO.
- Integración en la interfaz de usuario: botón **"Generar Portada (TMPL-04)"** en Nóminas por grupo (`app/js/ui/nominas-view.js`), estado visible de carga (`aria-busy`), auto-scroll accesible, visor embebido en `iframe` y botones operativos de Descargar PDF e Imprimir.
- Integración en el catálogo documental común (`app/js/ui/documents-view.js`).
- Preservación estricta de aislamiento: `CETPRO_DB` (puerto 8080) y producción v1 100% intocadas.
- Inmutabilidad canónica de los 21 PDFs institucionales (21/21 hashes SHA-256 verificados e idénticos).

## Línea base SHA-256 de archivos intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-04.json` | `65ba5d7803f4f096dafab8f0dfd387ca9d6d3730dc44920a900f314113c6556d` |
| `app/js/services/pdf-template-engine.js` | `aedc257ed4eb4451f715c20dee287c4752ec5a253324450463112f5db83c18cc` |
| `app/js/ui/nominas-view.js` | `ef889f4f9431d5f494c0e0650238ef2a738e7aa0b2741b5fd5ae4a03d0163b77` |
| `app/js/ui/documents-view.js` | `4ba7dd49febfa8fc765da3dcb15e95b27349e0120db29053c3ca4e6884552ea2` |
| `tests/mvp_tmpl04_portada.regression.js` | `f0874e97c74d2d50cf84b4da903d8ec093e6ad0c94be54032cd0152c080d1deb` |
| `tests/results/MVP_TMPL04_PORTADA_TEST_RESULT.md` | `9abfe374a68ad3d6313d12cddc44de9c0495dcc004bca641cabaa54b661b494b` |
| PDF canónico TMPL-04 (`04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.pdf`) | `1661ba65e85219c6fcaffaa6966328da80725758a2f6dc3a0ee2e3374df6042f` |

## Matriz de Resultados de Suites Automatizadas

| Suite de Pruebas | Entorno / Runner | Casos Ejecutados | Resultado |
|---|---|---|---|
| `mvp_tmpl04_portada.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 15 / 15 | **PASSED (100%)** |
| `mvp_nomina_header_bindings_13.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 15 / 15 | **PASSED (100%)** |
| `mvp_sanitization_verification.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 10 / 10 | **PASSED (100%)** |
| `mvp_nomina_continuation_physical_12.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 31 / 31 | **PASSED (100%)** |
| Verificación de Hashes Canónicos 21/21 | Node.js crypto SHA-256 | 21 / 21 | **PASSED (21/21 MATCH)** |

## Estado de Invariantes de la Base Candidata (`CETPRO_V2_CANDIDATE`)

- **Estudiantes:** 269 registros reales únicos.
- **Matrículas:** 295 registros (relación 1:1 con staging).
- **Grupos Académicos:** 12 grupos.
- **Periodos:** 0 registros (`periodos.count() === 0`).
- **Unidades:** 0 registros (`unidades.count() === 0`).
- **Referencias huérfanas en grupos:** 0 (`periodoId === null`).
- **Aislamiento de Producción:** `CETPRO_DB` en puerto 8080 intocada, cero lecturas/escrituras.

## Certificación

- `AUTOMATED_EDGE_HEADLESS = PASS`
- `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PASS`
