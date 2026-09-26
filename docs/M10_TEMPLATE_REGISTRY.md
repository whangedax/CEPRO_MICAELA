# REGISTRO DE PLANTILLAS DOCUMENTALES M10 (TemplateRegistry)

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Módulo:** M10 — Motor Documental Institucional  

---

## 1. ESPECIFICACIÓN DEL REGISTRO

`TemplateRegistry` administra el catálogo oficial de las 21 plantillas institucionales recibidas.

### Atributos Declarativos por Plantilla:
- `templateId`: Código opaco unívoco (`TMPL-01` a `TMPL-21`).
- `code`: Denominación del archivo original.
- `sheetName`: Nombre real de la hoja extraído físicamente del XML de los `.xlsx`.
- `sourceHash`: Hash SHA-256 inmutable de la fuente.
- `sourceOrientation` / `sourcePaperSize`: Preservados estrictamente como **`NO_CONFIRMADO`** (hechos contractuales del XLSX).
- `renderProfile`: Configuración técnica de renderizado/impresión para `TMPL-01`, `TMPL-02` y `TMPL-03`, o `null` para las 18 plantillas restantes.
- `implementationStatus`: `READY_FOR_PREVIEW` para `TMPL-01`, `TMPL-02` y `TMPL-03`; `NOT_IMPLEMENTED` para las demás 18 plantillas.
- `contextType`: contexto productivo requerido por el shell común. M12.2A-UX declara `GROUP` para TMPL-01 y `ENROLLMENT` para TMPL-02. Tipos previstos: `STUDENT`, `ENROLLMENT`, `GROUP`, `MODULE`, `CLOSURE` y `DOCUMENT`.
- `renderer`: operación del motor PDF asociada a la plantilla.
- `requiredFields`: campos que deben existir en el contexto antes de generar.
- `blockers`: bloqueos institucionales o técnicos aplicables.

---

## 2. MATRIZ DEL CATÁLOGO (21 PLANTILLAS)

| ID | Código Original | Hoja Real XML | Tipo | Estado M10 | Módulo Roadmap |
|:---:|---|---|:---:|:---:|:---:|
| `TMPL-01` | `01_NOMINA_DE_MATRICULA.xlsx` | `Nómina` | NÓMINA | `READY_FOR_PREVIEW` | M11 |
| `TMPL-02` | `02_FICHA_DE_MATRICULA.xlsx` | `FICHA DE MATRICULA` | FICHA | `READY_FOR_PREVIEW` | M12 |
| `TMPL-03` | `03_REGISTRO_DE_MATRICULA_MODULAR.xlsx` | `REGISTRO DE MATRICULA MODULAR` | MATRÍCULA | `READY_FOR_PREVIEW` | M11 |
| `TMPL-04` | `04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.xlsx` | `Portada - Regis. Eva.` | PORTADA | `NOT_IMPLEMENTED` | M11 |
| `TMPL-05` | `05_ASISTENCIA_UD1.xlsx` | `As-1` | ASISTENCIA | `NOT_IMPLEMENTED` | M12 |
| `TMPL-06` | `06_ASISTENCIA_UD2.xlsx` | `As-2` | ASISTENCIA | `NOT_IMPLEMENTED` | M12 |
| `TMPL-07` | `07_ASISTENCIA_UD3.xlsx` | `As-3` | ASISTENCIA | `NOT_IMPLEMENTED` | M12 |
| `TMPL-08` | `08_ASISTENCIA_UD4.xlsx` | `As-4` | ASISTENCIA | `NOT_IMPLEMENTED` | M12 |
| `TMPL-09` | `09_ASISTENCIA_UD5.xlsx` | `As-5` | ASISTENCIA | `NOT_IMPLEMENTED` | M12 |
| `TMPL-10` | `10_ASISTENCIA_UD6.xlsx` | `As-6` | ASISTENCIA | `NOT_IMPLEMENTED` | M12 |
| `TMPL-11` | `11_EVALUACION_IL_UD1.xlsx` | `IL` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-12` | `12_EVALUACION_UD2.xlsx` | `UD2` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-13` | `13_EVALUACION_UD3.xlsx` | `UD3` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-14` | `14_EVALUACION_UD4.xlsx` | `UD4` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-15` | `15_EVALUACION_UD5.xlsx` | `UD5` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-16` | `16_EVALUACION_UD6.xlsx` | `UD6` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-17` | `17_EVALUACION_UD7.xlsx` | `UD7` | EVALUACIÓN | `NOT_IMPLEMENTED` | M12 |
| `TMPL-18` | `18_CONSOLIDADO_EFSRT.xlsx` | `EFSRT` | EFSRT | `NOT_IMPLEMENTED` | M13 |
| `TMPL-19` | `19_ACTA_DE_EVALUACION_MODULAR.xlsx` | `ACTA` | ACTA | `NOT_IMPLEMENTED` | M13 |
| `TMPL-20` | `20_CERTIFICADO_MODULAR.xlsx` | `CERTIFICADO` | CERTIFICADO | `NOT_IMPLEMENTED` | M13 |
| `TMPL-21` | `21_TITULO_AUXILIAR_TECNICO.xlsx` | `TITULO` | TÍTULO | `NOT_IMPLEMENTED` | M13 |

---

## 3. HECHOS Y ESTRUCTURA DE COMPAGINADO (TMPL-01)

Confirmado en auditoría XML M10.3-A/B únicamente para `TMPL-01`:
- **Worksheet**: `Nómina`
- **PrintArea**: `B1:Q106`
- **PrintTitles**: `13:14` (filas repetidas en impresión)
- **ManualPageBreak**: Fila 53 (`<brk id="53"/>`)
- **PageSetup**: `paperSize = 9` (A4), `orientation = portrait`, `scale = 84`

### Compaginado Condicional Lógico y Control de Overflow (M10.3-C):
- **Página 1 (B1:Q53)**: Capacidad visual = 30 estudiantes.
- **Página 2 (B54:Q106)**: Continuación para 31 a 60 estudiantes.
- **Regla de Paginación y Overflow**:
  - `0–30 estudiantes`: `pageCount = 1`, `printAllowedForPreview = true`. Renderiza 1 página A4.
  - `31–60 estudiantes`: `pageCount = 2`, `printAllowedForPreview = true`. Renderiza 2 páginas A4 con salto físico CSS (`page-break-before: always`).
  - `>60 estudiantes`: `renderedCount = 60`, `overflowCount = totalStudents - 60`, `status = CAPACITY_EXCEEDED`, `printAllowedForPreview = false`. Renderiza 2 páginas oficializadas (máximo 60 estudiantes en `PAGE_1`/`PAGE_2`). Los registros excedentes permanecen 100% preservados en el sistema y se listan en un panel técnico informativo `no-print` ("REGISTROS FUERA DE CAPACIDAD CONFIRMADA"). La opción de impresión se bloquea estrictamente para evitar imprimir nóminas incompletas sin validar páginas adicionales. NO se crea `PAGE_3`.

*Nota:* Estos hechos aplican **únicamente a TMPL-01** y no se propagan a las demás plantillas.

---

## 4. REGLA DE UX DOCUMENTAL COMÚN (M12.2A-UX)

Ninguna plantilla nueva puede crear una interfaz independiente dentro de `DocumentsView`. Debe declarar `templateId`, `name`, `contextType`, `renderer`, `requiredFields` y `blockers`, y reutilizar la secuencia común:

`PLANTILLA → CONTEXTO REAL → SELECCIÓN → RESUMEN → GENERAR PDF → VISTA PREVIA → DESCARGAR / IMPRIMIR`.

Estado actual:

| Plantilla | contextType | renderer | Estado productivo en UX |
|---|---|---|---|
| `TMPL-01` | `GROUP` | `renderTMPL01` | Bloqueada hasta conexión productiva por grupo en M12.2B |
| `TMPL-02` | `ENROLLMENT` | `renderTMPL02` | Habilitada mediante `DocumentDataService.buildEnrollmentContext(matriculaId)` |

Las herramientas de fixtures, comparación y diagnóstico permanecen en pruebas o herramientas técnicas separadas; no forman parte del flujo normal de Secretaría.
