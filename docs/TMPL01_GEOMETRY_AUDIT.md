# AUDITORÍA GEOMÉTRICA FÍSICA (TMPL-01 NÓMINA INSTITUCIONAL)

Esta auditoría describe el diseño espacial exacto y la topología física extraída del PDF canónico final `PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf` y la verificación histórica en `LEEME_IMPRESION.txt`.

## 1. ARQUITECTURA PDF NATIVA CONGELADA
El paradigma final y definitivo de TMPL-01 es PDF NATIVO mediante pdf-lib manipulando el PDF canónico original a través de coordenadas mapeadas matemáticamente. Los enfoques SVG, HTML y Raster PNG han sido rechazados definitivamente por deriva geométrica e imprecisión tipográfica al escalar en Edge.

- **Asset Canónico:** sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf
- **Páginas:** Dimensiones y ratio A4 exacto conservado nativamente del PDF exportado. 1 sola página.
- **Capacidad Física:** 30 estudiantes. Cualquier cantidad >30 produce bloqueo por sobrecapacidad; PAGE_2 está formalmente descartada.
- **AcroForm:** El documento final no posee formularios, widgets ni Javascript.

## 2. GEOMETRÍA DEL ÁREA IMPRIMIBLE (PRINT AREA)
- **Contenedor A4 (`.document-page`):** 210mm x 297mm.
- **Márgenes Físicos (Padding):**
  - Top: 3.048 mm
  - Bottom: 3.048 mm
  - Right: 3.048 mm
  - Left: 9.398 mm
- **Área Imprimible (`.tmpl-01-print-area`):** 197.554 mm de ancho.
- **Underlay (`.tmpl-01-underlay`):** Se coloca dentro del área imprimible con `width: 100%; height: auto;`.

## 3. COORDENADAS DE DATOS VARIABLES (OVERLAYS)
Las coordenadas CSS (`top %`, `left %`) se aplican relativas a `.tmpl-01-print-area`.

### 3.1. Cabecera (PAGE 1)
- **Región:** Left: 15.0%, Top: 8.8%
- **UGEL:** Left: 33.0%, Top: 8.8%
- **CETPRO:** Left: 57.0%, Top: 8.8%
- **Código Modular:** Left: 75.0%, Top: 11.5%
- **Programa:** Left: 16.0%, Top: 19.5%
- **Módulo:** Left: 6.0%, Top: 22.0%
- **Periodo (Y Group Code):** Left: 83.0%, Top: 22.0%

### 3.2. Tabla de Estudiantes (PAGE 1 - 30 max)
- **Top Fila 1:** 29.5%
- **Incremento (Row Height):** 1.83% por fila.
- **Left % por Columna:**
  - N° Ord: 1.0%
  - Código: 6.0%
  - Nombres: 14.5%
  - Sexo: 51.5%
  - F. Nac: 57.5%
  - Condición: 67.5%
  - N° Unidades Didácticas: 75.0%
  - N° de Créditos: 85.0%

*(Las columnas de Documento/DNI y Observación fueron removidas, ya que no pertenecen al PDF final canónico).*
