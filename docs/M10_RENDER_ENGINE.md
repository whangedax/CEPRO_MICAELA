# MOTOR DE RENDERIZADO WEB Y COMPARACIÓN VISUAL M10 (DocumentRenderEngine)

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Módulo:** M10 — Motor Documental Institucional  

---

## 1. ESTRATEGIA DE RENDERIZADO HTML5 / CSS GRID / SVG

El motor documental de M10 implementa renderizado dinámico web basado en **HTML5 semántico, CSS Grid / Flexbox y SVG** 100% offline.

### Ventajas Técnicas:
1. **0 Dependencias Externas:** No requiere Microsoft Excel, bibliotecas npm ni CDNs.
2. **Seguridad XSS Absoluta:** Toda inyección de texto variable utiliza la función desacoplada `escapeHtml()` de `app/js/utils/dom-utils.js`.
3. **Fidelidad Impresa:** Estilos declarativos `@media print` en A4 para salida física perfecta vía `window.print()`.

---

## 2. HERRAMIENTAS DE COMPARACIÓN VISUAL EN UI

`DocumentsView` (`#/documentos`) ofrece dos modos interactivos de comparación frente al PNG de referencia inmutable:

1. **Modo Lado a Lado (SIDE_BY_SIDE):** Muestra a la izquierda la imagen PNG de referencia original y a la derecha el render HTML5/CSS calculado por el motor.
2. **Modo Superposición (OVERLAY):** Superpone la capa de renderizado HTML sobre la imagen PNG con un deslizador de opacidad en tiempo real (0% a 100%).

---

## 3. INFRAESTRUCTURA DE IMPRESIÓN DINÁMICA (`PrintEngine`)

`PrintEngine` (`app/js/services/document-render-engine.js`) consume la propiedad `renderProfile` de la plantilla implementada y genera reglas CSS `@page` dinámicas para la salida en impresión sin imponer un tamaño/orientación global a las 21 fuentes:

```javascript
// Ejemplo de generación dinámica de reglas @page por plantilla
const printCSS = printEngine.generatePrintCSS(template);
// TMPL-01 => @media print { @page { size: a4 portrait; margin: 10mm; } }
// TMPL-03 => @media print { @page { size: a4 landscape; margin: 10mm; } }
// NOT_IMPLEMENTED (renderProfile: null) => '' (0 reglas inventadas)
```

Las propiedades contractuales de fuente `sourceOrientation` y `sourcePaperSize` se conservan intactas como `NO_CONFIRMADO`.

---

## 4. SEGMENTACIÓN VISUAL DE PNG Y CONTROL DE OVERFLOW DE TMPL-01 (M10.3-B / M10.3-C)

### Paginación Condicional y Control de Overflow:
- `DocumentRenderEngine` trata a `TMPL-01` como un **único documento lógico**.
- Genera automáticamente 1 página A4 (para 0–30 estudiantes) o 2 páginas A4 (para 31–60 estudiantes) con salto físico `@media print` (`page-break-before: always`).
- Para >60 estudiantes (`CAPACITY_EXCEEDED`):
  - Renderiza **exactamente 60 registros** dentro de las páginas oficiales (`PAGE_1` y `PAGE_2`).
  - Muestra un panel técnico fuera del área de impresión (`no-print overflow-technical-panel`) titulado "REGISTROS FUERA DE CAPACIDAD CONFIRMADA" con la lista de estudiantes excedentes (`overflowList`), sus `matriculaId`s e información descriptiva.
  - No genera `PAGE_3` ni deforma la plantilla.
  - Bloquea la impresión (`printAllowedForPreview = false`) y deshabilita el botón de impresión en la UI para prevenir la salida de nóminas incompletas sin validación institucional de páginas adicionales.

### Segmentación CSS del PNG Original de Referencia:
- El archivo `01_NOMINA_DE_MATRICULA.png` contiene 2 páginas físicas verticalmente concatenadas (1086px x 2334px).
- Sin modificar la imagen ni crear archivos fuentes nuevos, los modos `SIDE_BY_SIDE` y `OVERLAY` aplican segmentación visual vía CSS (`position: absolute`, `top: 0%` para Pág 1 y `top: -100%` para Pág 2 dentro de contenedor con `overflow: hidden`).
- El usuario puede alternar la vista entre `Página 1` y `Página 2` evaluando cada segmento contra su correspondiente render HTML de página.


