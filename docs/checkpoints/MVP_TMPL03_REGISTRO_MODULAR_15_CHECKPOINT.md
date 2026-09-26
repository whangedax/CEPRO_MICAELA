# Checkpoint Formal — MVP-TMPL03-REGISTRO-MODULAR-15

Fecha: 2026-09-17

## Alcance ejecutado y verificado

- **Auditoría Geométrica A3 y Manifiesto Vectorial (`TMPL-03.json`):**
  * Página física A3 vertical canónica (841.89 × 1190.55 pt).
  * Capacidad nominal fijada en 20 registros útiles por página física (`capacity: { pages: 1, rows: 20 }`).
  * Estado de vista previa habilitado: `previewStatus: "AVAILABLE"`.
  * 14 campos vectoriales físicos verificados con paso vertical regular de 35.1 pt y `repeat: 20`.
- **Motor de Renderizado Físico (`pdf-template-engine.js`):**
  * Implementación de `renderTMPL03(payload)` (renderizado de página física A3 única hasta 20 filas con AutoFit dinámico).
  * Implementación de `renderAdministrativeTMPL03(payload)` (salida administrativa multipágina mediante clonación de páginas base A3).
  * Soporte integrado en `renderDocument({ documentType: 'TMPL-03', ... })`.
  * Desglose robusto de nombres de estudiantes (`_splitStudentName`) en Apellido Paterno, Apellido Materno y Nombres.
  * Inyección de leyendas de continuidad exactas en cada página física:
    - `Página X de Y · Registros A–B` en (x=40, y=25).
    - `TOTAL GENERAL DEL GRUPO: N · REGISTROS EN ESTA PÁGINA: M` en (x=240, y=25).
    - `BORRADOR ADMINISTRATIVO — NO OFICIAL` en (x=40, y=12).
    - `DEMOSTRACIÓN — NO OFICIAL` en (x=240, y=12) en modo DEMO.
  * AutoFit dinámico y política de seguridad fail-closed ante `FIELD_OVERFLOW`.
  * Celdas vacías limpias: cero cadenas espurias (`null`, `undefined`, `PENDIENTE`).
- **Integración en la Interfaz de Usuario:**
  * `app/js/ui/enrollment-register-view.js`: botón **"Generar Registro Modular (TMPL-03)"** (`#register-tmpl03`), estado accesible `aria-busy`, auto-scroll al visor, despliegue de `iframe` con Blob PDF y botones funcionales de Imprimir y Descargar.
  * `app/js/ui/documents-view.js`: actualización del enlace y estado de disponibilidad para TMPL-03 en el catálogo documental.
- **Suite de Pruebas Automatizadas en Microsoft Edge Headless (`tests/mvp_tmpl03_registro.regression.js`):**
  * 16/16 pruebas superadas (100%).
  * Partición exacta: DEMO B (25 alumnos → 20 + 5 = 2 pág.), DEMO A (40 alumnos → 20 + 20 = 2 pág.), Caso Límite (70 alumnos → 20 + 20 + 20 + 10 = 4 pág.).
  * Orden alfabético estable verificado.
  * Aislamiento total de producción: puerto 8080 y `CETPRO_DB` 100% protegidos.
- **Inmutabilidad Canónica:** 21/21 hashes SHA-256 intactos.

## Línea base SHA-256 de archivos intervenidos

| Archivo | SHA-256 |
|---|---|
| `app/data/pdf-manifests/TMPL-03.json` | `3e61b530aaac511b39c523a8d67a1dd38cbb328365b1297eed5acf9d8f6b8f0d` |
| `app/js/services/pdf-template-engine.js` | `d32bfdb974bd1a29631f3f3396da74d67b4001d6fbc71d7b26cc632278defe39` |
| `app/js/ui/enrollment-register-view.js` | `c532badb6c9d463ba091062f78a6ae32536091a1aa2eb48906cc33756e593875` |
| `app/js/ui/documents-view.js` | `0f82abf9ff2d5f341cb9086de83cd49c93453bc46627b8162d564ffc84f407f5` |
| `tests/mvp_tmpl03_registro.regression.js` | `2c7ba3a12ad37032e12eadda6b77f0a892d8be5dfabf556ec292f15d19e350e6` |
| `tests/results/MVP_TMPL03_REGISTRO_TEST_RESULT.md` | `52a9066800b976e94ad42e90ba9a570fb5b7bd5444b77fba5303d04d412b582b` |
| PDF canónico TMPL-03 (`03_REGISTRO_DE_MATRICULA_MODULAR.pdf`) | `96989f5ada138388826079a5741b70598fc43b61b2bed084b92f70c17fcd813a` |

## Matriz de Resultados de Suites Automatizadas

| Suite de Pruebas | Entorno / Runner | Casos Ejecutados | Resultado |
|---|---|---|---|
| `mvp_tmpl03_registro.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 16 / 16 | **PASSED (100%)** |
| `mvp_tmpl04_portada.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 15 / 15 | **PASSED (100%)** |
| `mvp_nomina_header_bindings_13.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 15 / 15 | **PASSED (100%)** |
| `mvp_sanitization_verification.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 10 / 10 | **PASSED (100%)** |
| `mvp_nomina_continuation_physical_12.regression.js` | Microsoft Edge headless (`Edg/153.0.4234.32`) | 31 / 31 | **PASSED (100%)** |
| Verificación de Hashes Canónicos 21/21 | Node.js crypto SHA-256 | 21 / 21 | **PASSED (21/21 MATCH)** |

## Estado de Invariantes de la Base Candidata (`CETPRO_V2_CANDIDATE`)

- **Estudiantes:** 269 registros reales únicos.
- **Matrículas:** 295 registros intactos.
- **Grupos Académicos:** 12 grupos.
- **Periodos:** 0 registros (`periodos.count() === 0`).
- **Unidades:** 0 registros (`unidades.count() === 0`).
- **Referencias huérfanas en grupos:** 0.
- **Aislamiento de Producción:** `CETPRO_DB` en puerto 8080 intocada, cero peticiones.

## Certificación

- `AUTOMATED_EDGE_HEADLESS = PASS`
- `HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PASS`
