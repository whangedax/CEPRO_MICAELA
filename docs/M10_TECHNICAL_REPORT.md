# INFORME TÉCNICO M10 — MOTOR DOCUMENTAL INSTITUCIONAL

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Módulo:** M10 — Motor Documental Institucional  
**Estado de Modificación de DB Productiva (`CETPRO_DB`):** 100% INTACTA (0 docus, 0 escrituras)  
**Entorno Aislado de Pruebas:** `CETPRO_M10_TEST_DB`  
**Fecha:** 2026-09-12  

---

## 1. RESUMEN EJECUTIVO Y ALCANCE DE M10

El módulo M10 implementa la **infraestructura común del motor documental** del sistema y una **vertical slice de pruebas (TEST_ONLY)** para demostración técnica de 2 plantillas:
- **`TMPL-01` (`01_NOMINA_DE_MATRICULA.xlsx`, hoja `'Nómina'`):** Plantilla de composición vertical.
- **`TMPL-03` (`03_REGISTRO_DE_MATRICULA_MODULAR.xlsx`, hoja `'REGISTRO DE MATRICULA MODULAR'`):** Plantilla de composición horizontal.

### Garantías Fundamentales de M10:
1. **Fuentes Inmutables:** Los 21 archivos `.xlsx` y 21 `.png` originales permanecen inalterados con verificación de hashes SHA-256 al 100%.
2. **Sin Emisión Oficial:** Mientras `academicClosureAllowed = false`, el servicio `DocumentService` prohíbe de forma estricta la emisión de documentos oficiales (`generateOfficialDocument` arroja `ValidationError`).
3. **Cero Escrituras en Previews:** Las vistas previas (`DRAFT_PREVIEW` y `TEST_PREVIEW`) operan de forma puramente calculada y **NO escriben registros en el store `documentos`**.
4. **Regla B-006 Intacta:** Se prohíbe inventar folios, números de registro, series o correlativos institucionales.
5. **Renderizado HTML5 / CSS / SVG Offline:** Renderizado dinámico semántico sin dependencias externas (npm/CDN/Canvas).

---

## 2. ARQUITECTURA DEL MOTOR

```
DocumentsView (#/documentos)
       │
       ▼
DocumentService
       ├──► TemplateRegistry (Catálogo 21 fuentes, hashes)
       ├──► FieldMappingEngine (Mapeo declarativo sourcePath -> target)
       │       └──► TransformEngine (Transformaciones técnicas permitidas)
       └──► DocumentRenderEngine (Generador HTML5/SVG con escapeHtml)
               └──► VisualComparison (Modos SIDE_BY_SIDE y OVERLAY con opacidad)
```

---

## 3. COMPONENTES IMPLEMENTADOS

- **`TemplateRegistry` (`app/js/services/template-registry.js`):** Catálogo declarativo con los nombres reales de hoja extraídos de XML. Mantiene estrictamente `sourceOrientation = 'NO_CONFIRMADO'` y `sourcePaperSize = 'NO_CONFIRMADO'` para las 21 fuentes, separando explícitamente el perfil de renderizado `renderProfile` (`origin: 'DERIVADO_DE_REFERENCIA_VISUAL'`) para `TMPL-01` (PORTRAIT) y `TMPL-03` (LANDSCAPE), y `null` para las 19 plantillas `NOT_IMPLEMENTED`.
- **`PrintEngine` (`app/js/services/document-render-engine.js`):** Servicio de impresión dinámica que consume `renderProfile` por plantilla sin imponer un formato A4/orientación global a fuentes no confirmadas.
- **`TransformEngine` (`app/js/services/transform-engine.js`):** Soporta `IDENTITY`, `UPPERCASE`, `LOWERCASE`, `FORMAT_DATE`, `JOIN_NAME`, `FORMAT_NUMBER`, `MULTILINE`. Rechaza `AVERAGE`, `PASS_FAIL`, `CALCULATE_ATTENDANCE`, `EFSRT_COMPLIANCE`, `INFER_MODULE`, `INFER_PERIOD`, `GENERATE_FOLIO`.
- **`FieldMappingEngine` (`app/js/services/field-mapping-engine.js`):** Reglas declarativas por plantilla que distinguen `requiredForPreview` de `requiredForOfficial`. Inserta marcadores `[PENDIENTE]` en modo `DRAFT_PREVIEW`.
- **`DocumentService` (`app/js/services/document-service.js`):** Coordina previews read-only sin persistencia en IndexedDB y bloquea emisión oficial.
- **`DocumentRenderEngine` (`app/js/services/document-render-engine.js`):** Construye HTML5/SVG semántico con protección XSS.
- **`DocumentsView` (`app/js/ui/documents-view.js`):** Interfaz UI en `#/documentos` con selector de plantilla, visor comparativo Lado a Lado / Superposición Overlay y botón de impresión alimentado por `PrintEngine`.

---

## 4. PAGINACIÓN CONDICIONAL Y CONTROL DE OVERFLOW (M10.3-B / M10.3-C)

En la iteración M10.3-C se consolida la semántica de compaginado y overflow para `TMPL-01` ("NÓMINA DE MATRÍCULA"):
1. **Salida Única de Nómina:** `TMPL-01` aparece una sola vez en el catálogo y en la vista de Secretaría como un solo documento lógico.
2. **Hechos Físicos Confirmados en XML:** `PrintArea` B1:Q106, salto manual en fila 53, `paperSize` = 9 (A4 portrait), `scale` = 84. Capacidad máxima confirmada: 60 posiciones (2 páginas).
3. **Comportamiento Paginado**:
   - `0–30 estudiantes`: 1 página A4 (filas 1–53), `pageCount = 1`, `printAllowedForPreview = true`.
   - `31–60 estudiantes`: 2 páginas A4 (filas 1–53 + filas 54–106), `pageCount = 2`, `printAllowedForPreview = true`.
   - `>60 estudiantes`: `renderedCount = 60`, `overflowCount = totalStudents - 60`, `status = CAPACITY_EXCEEDED`, `printAllowedForPreview = false`. Renderiza 2 páginas oficializadas (máximo 60 registros). Los registros excedentes no se insertan en las páginas ni se borran del sistema; se muestran en un panel técnico fuera del documento imprimible (`no-print overflow-technical-panel`). La opción de impresión se bloquea en UI. NO se crea `PAGE_3`.
4. **Segmentación CSS de Referencia PNG:** Los modos `SIDE_BY_SIDE` y `OVERLAY` segmentan la imagen de referencia `01_NOMINA_DE_MATRICULA.png` mediante offset CSS (`PNG_SEGMENT_PAGE_1` y `PNG_SEGMENT_PAGE_2`) permitiendo comparar cada página independientemente sin alterar los archivos de origen.

---

## 5. ESTADO DE PRUEBAS AUTOMATIZADAS M10 (62 PRUEBAS)

La suite automatizada [tests/m10_tests.js](file:///c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/tests/m10_tests.js) contiene **62 pruebas al 100%** que verifican:
- Existencia e inmutabilidad de los 21 `.xlsx` y 21 `.png`.
- Coincidencia al 100% de hashes SHA-256 (Requisito G).
- Preservación estricta de `sourceOrientation = NO_CONFIRMADO` y `sourcePaperSize = NO_CONFIRMADO` en las 21 plantillas (Requisitos A y B).
- `TMPL-01` posee `renderProfile` PORTRAIT derivado de referencia visual sin alterar `sourceOrientation` (Requisito C).
- `TMPL-03` posee `renderProfile` LANDSCAPE derivado de referencia visual sin alterar `sourceOrientation` (Requisito D).
- `PrintEngine` consume `renderProfile` dinámicamente y no impone A4 globalmente (Requisito E).
- Plantillas `NOT_IMPLEMENTED` (TMPL-02..21) mantienen `renderProfile = null` y 0 propiedades inventadas (Requisito F).
- `getPreviewUrl()` produce rutas limpias `/sources/...` y resuelve las 21 vistas previas PNG con HTTP 200 (Requisitos A y B M10.2).
- `DRAFT_PREVIEW` no contiene fixtures `TEST_ONLY` ni datos inventados como "CETPRO INDUSTRIAL PRODUCTIVO" (Requisitos C-G M10.2).
- `TEST_PREVIEW` sí permite fixtures con marcado `TEST_ONLY` (Requisito H M10.2).
- `SIDE_BY_SIDE` y `OVERLAY` cuentan con PNG de referencia e HTML renderizado simultáneos (Requisito I M10.2).
- Paginación condicional de `TMPL-01`: 10 y 30 est -> 1 pág; 31 y 60 est -> 2 págs; 61 est -> `CAPACITY_EXCEEDED` con `renderedCount = 60`, `overflowCount = 1` y `printAllowedForPreview = false` (Pruebas T-M10-42 a T-M10-46).
- Salto físico en impresión A4 y renderizado segmentado por página (Pruebas T-M10-47 a T-M10-49).
- Pruebas M10.3-C (T-M10-52 a T-M10-58): 70 estudiantes (`renderedCount = 60`, `overflowCount = 10`), preservación de registros en payload y panel overflow, ausencia de `PAGE_3`, clase `no-print` en panel overflow y bloqueo estricto del botón de impresión.
- Rechazo de transformaciones prohibidas y folios.
- Previews sin persistencia en IndexedDB (0 escrituras en store `documentos`).
- Sanitización XSS mediante `escapeHtml()`.
- Bloqueo de emisión oficial y preservación de base productiva `CETPRO_DB`.


