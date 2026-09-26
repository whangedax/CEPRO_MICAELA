# AUDITORÍA FÍSICA Y PLAN DE LA FICHA DE MATRÍCULA (TMPL-02)

Esta auditoría describe el diseño espacial exacto y la topología física extraída de la fuente canónica oficial para la Ficha de Matrícula Individual.

## 1. ANATOMÍA FÍSICA DEL PDF CANÓNICO
- **Fuente Canónica:** `sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf`
- **Hash SHA-256:** `63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914`
- **Páginas:** 1
- **Dimensiones:** 841.890 pt x 595.304 pt (A4 Horizontal / Landscape)
- **Formularios/AcroForm:** Inexistentes (0 campos detectados).
- **Widgets/Anotaciones:** Inexistentes.
- **JavaScript/Cifrado:** Ninguno / Falso.
- **Topología Base:** El archivo original ha sido analizado mediante `pdf-lib` y `pdf2json`, demostrando ser 100% plano, con los rotulos incrustados y sin estructura rellenable.

## 2. INVENTARIO VISUAL Y MAPEO DE CAMPOS (RECONCILIACIÓN SEMÁNTICA)

A continuación se detalla la tabla definitiva con todos los campos visibles en la Ficha de Matrícula y su estado actual:

| CAMPO VISIBLE | TIPO: FIJO / VARIABLE | FUENTE | ESTADO | BLOQUEO | SE IMPRIME EN TEST_ONLY |
|---|---|---|---|---|---|
| FICHA DE MATRÍCULA | FIJO | PDF | N/A | - | SÍ |
| AÑO 2026 - I | FIJO | PDF | N/A | - | SÍ |
| Nombre del CETPRO: | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Nombre del CETPRO* | VARIABLE | institucion (CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA") | CONFIRMADO | - | SÍ |
| DRE | FIJO | PDF | N/A | - | SÍ |
| *(Valor) DRE* | VARIABLE | institucion.dre | NO CONFIRMADO | - | NO |
| Código Modular | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Código Modular* | VARIABLE | institucion.codigoModular | NO CONFIRMADO | - | NO |
| Tipo de Gestión | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Tipo de Gestión* | VARIABLE | institucion (PÚBLICA) | FUENTE PARCIAL | - | SÍ |
| Departamento | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Departamento* | VARIABLE | institucion.departamento | NO CONFIRMADO | - | NO |
| Provincia | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Provincia* | VARIABLE | institucion.provincia | NO CONFIRMADO | - | NO |
| Distrito | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Distrito* | VARIABLE | institucion (SAN MIGUEL) | FUENTE PARCIAL | - | SÍ |
| Resolución Directorial | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Resolución Directorial* | VARIABLE | institucion.resolucion | NO CONFIRMADO | - | NO |
| Programa de estudios | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Programa de estudios* | VARIABLE | programas.nombre | CONFIRMADO | - | SÍ |
| Periódo Lectivo | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Periódo Lectivo* | VARIABLE | periodos.nombre | PENDIENTE | B-007 | NO |
| Módulo Formativo | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Módulo Formativo* | VARIABLE | modulos.nombre | PENDIENTE | B-004 | NO |
| Periódo de Clase | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Periódo de Clase* | VARIABLE | NO CONFIRMADO | NO CONFIRMADO | - | NO |
| Nivel Formativo | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Nivel Formativo* | VARIABLE | programas.nivel | CONFIRMADO | - | SÍ |
| Periódo Académico | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Periódo Académico* | VARIABLE | periodos.academico | PENDIENTE | B-007 | NO |
| Tipo de Plan de estudios | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Tipo de Plan de estudios* | VARIABLE | programas.planTipo | CONFIRMADO | - | SÍ |
| Número de Documento | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Número de Documento* | VARIABLE | estudiantes.documento | CONFIRMADO | - | SÍ |
| Apellidos y nombres | FIJO | PDF | N/A | - | SÍ |
| *(Valor) Apellidos y nombres* | VARIABLE | estudiantes.nombreCompleto | CONFIRMADO | - | SÍ |
| UNIDADES DIDÁCTICAS | FIJO | PDF | N/A | - | SÍ |
| *(Tabla 1) Valores UD* | VARIABLE | unidades | PENDIENTE | B-002 | NO |
| UNIDADES DIDÁCTICAS DE SUBSANACIÓN | FIJO | PDF | N/A | - | SÍ |
| *(Tabla 2) Valores UD Subsanación* | VARIABLE | unidades | PENDIENTE | B-002 | NO |
| DIRECCIÓN (Firma, pos firma y sello) | FIJO | PDF | N/A | - | SÍ |
| ESTUDIANTE (Firma) | FIJO | PDF | N/A | - | SÍ |

*Nota sobre textos fijos vs variables:* Términos como "PÚBLICA", "AUXILIAR TÉCNICO" o el "Código Modular" en formato numérico no están integrados fijamente en el PDF. Son espacios limpios (variables) que deberán inyectarse solo cuando haya confirmación.

## 3. NOTAS DE AUDITORÍA FÍSICA

### Documento de Identidad
El campo se denomina "Número de Documento" y no "DNI". Se conservará exactamente el valor textual (alfanumérico, longitud variable, sin prefijos de ceros ni conversiones numéricas).

### Tablas de Datos Curriculares (Unidades)
No son cuadros de calificaciones. Están diseñados para registrar datos de currículo de matrícula. Están impedidas de llenarse por `B-002`.

### Tolerancia AutoFit
El algoritmo de `AutoFit` (heredado de M11) no aplicará ningún truncamiento, "..." o compresión horizontal. Si el texto no cabe en su `minFontSize`, el sistema emitirá un rechazo de fila.

### Firmas
El PDF documenta exclusivamente dos firmas: `DIRECCIÓN` y `ESTUDIANTE`. No se infieren otras autoridades.

## 4. EVALUACIÓN DE BLOQUEOS (B-002, B-004, B-007)
El impacto sobre TMPL-02 es masivo:
- **Vista Previa TEST_ONLY:** Se puede generar dejando los campos bloqueados en BLANCO. La plantilla se imprimirá con los datos institucionales, de programa y personales correctos, pero sin datos académicos, sin módulo y sin periodo.
- **Emisión Oficial:** Está completamente IMPEDIDA. No se puede generar una "Ficha de Matrícula" legal si el estudiante no tiene módulo (B-004) ni unidades asignadas (B-002).

## 5. REUTILIZACIÓN DEL MOTOR PDF NATIVO
**Sí, TMPL-02 es un candidato perfecto para la arquitectura PDF Nativa (M11.17).**
- **Reutilizable:** El flujo `load()`, dibujo mediante `page.drawText()`, motor métrico `AutoFit`, y la estrategia de no modificar AcroForm ni depender de widgets. 
- **Específico de TMPL-02:** Coordenadas JSON del layout, uso estricto en A4 Landscape (a diferencia de TMPL-01 A4 Portrait), y el tratamiento de iteración para Unidades (no estudiantes). No se requieren campos multilínea complejos ni marcas "X" explícitas (a menos que se deban insertar en el futuro), ni fotos embebidas.

## 6. CAPACIDAD FÍSICA CONFIRMADA
**Exactamente 1 alumno por página.** El documento abarca toda el área horizontal.

### 6.1 Cajas vectoriales autorizadas para M12.1

Las coordenadas usan origen superior izquierdo para mantener compatibilidad con `_fitTextToBox()`; fueron derivadas de las líneas H/V del PDF vectorial y se convierten a coordenadas PDF al dibujar.

| Campo | x | y | width | height | align | maxFontSize | minFontSize | paddingX |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| `institution.name` | 222.064 | 79.216 | 246.928 | 23.264 | left | 8 | 5.5 | 5 |
| `program.name` | 222.064 | 157.424 | 246.928 | 23.952 | left | 8 | 5.5 | 5 |
| `student.documentNumber` | 609.232 | 231.424 | 169.776 | 18.304 | center | 8 | 5.5 | 5 |
| `student.fullName` | 222.064 | 249.728 | 556.944 | 21.120 | left | 8 | 5.5 | 5 |

## 7. CONFIRMACIÓN READ-ONLY PRODUCTIVA
La base productiva no ha sido escrita: `estudiantes = 269`, `matriculas = 295`, `staging = 295`, `periodos = 0`, `documentos = 0`. Las 295 matrículas continúan teniendo `moduloId = null` y `periodoId = null`.

## 8. RIESGOS
El riesgo principal para la funcionalidad de este componente recae sobre las reglas B-002 y B-004. Si la institución nunca suministra el catálogo de unidades curriculares, TMPL-02 emitirá un documento permanentemente en blanco en sus cuadros de mayor tamaño.
