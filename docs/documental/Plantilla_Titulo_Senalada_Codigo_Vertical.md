# Plantilla de título de Auxiliar Técnico — códigos señalados y variables

**Institución:** Centro de Educación Técnico-Productiva Público Micaela Bastidas  
**Origen:** `Plantilla_Titulo_Senalada_Codigo_Vertical.pdf` (4 páginas)  
**Uso:** transcripción a Markdown del título, el reverso y la guía de códigos.

> **Nota de formato:** Markdown no permite reproducir de manera nativa un campo de texto rotado verticalmente ni los formularios editables de un PDF. Por ello, el código vertical se señala como **A — posición vertical, lado derecho de la portada** y los datos editables se representan con `{{variables}}`. Se conservan abajo los valores del ejemplo original.

---

## Página 1 de 4 — Anverso del título (portada)

**A — CÓDIGO DE REGISTRO INSTITUCIONAL (colocado verticalmente, en el borde superior derecho)**  
Código mostrado en el PDF: `000333-AT-30425346-CE25-2026`  
**Variable:** `{{codigo_institucional}}`

<div align="center">

**REPÚBLICA DEL PERÚ**  
**MINISTERIO DE EDUCACIÓN**  
**CENTRO DE EDUCACIÓN TÉCNICO-PRODUCTIVA MICAELA BASTIDAS**  
**C — R.D. Nº 2053-2025-DUGEL-SR**

</div>

**EL DIRECTOR DEL CENTRO DE EDUCACIÓN TÉCNICO-PRODUCTIVA PÚBLICO MICAELA BASTIDAS**

Por cuanto;

**D — [Nombres y APELLIDOS DEL TITULADO]**  
Variable: `{{nombre_titulado}}`

Ha cumplido satisfactoriamente con las normas y disposiciones reglamentarias vigentes, se le otorga el Título de;

**E — AUXILIAR TÉCNICO EN [PROGRAMA DE ESTUDIOS]**  
Variable: `{{programa_estudios}}` (denominación completa del título).

**POR TANTO:**  
Se expide el presente título para que se le reconozca como tal.

**F — Dado en San Miguel, a los 18 días del mes de diciembre del 2026**  
Variable: `{{fecha_emision}}`

**PROF. Eloy Valerio, PAREDES FELICIANO**  
DIRECTOR  
CETPRO MICAELA BASTIDAS

**C — Variable de resolución de referencia:** `{{resolucion_referencia}}`.

*Nota del PDF:* «PLANTILLA DE TRABAJO: A vertical en portada = A en reverso y pie. Campos editables (A-F).»

---

## Página 2 de 4 — Reverso del título

### A — CÓDIGO DE REGISTRO INSTITUCIONAL

**N.º `000333-AT-30425346-CE25-2026`**  
Variable: `{{codigo_institucional}}`  
*Variable del CETPRO.*

### B — CÓDIGO DE REGISTRO UGEL

**N.º `000333-AT-00333-CE25-2026`**  
Variable: `{{codigo_registro_ugel}}`  
*Registro asignado por UGEL.*

**PROF. Eloy Valerio, PAREDES FELICIANO**  
DIRECTOR  
CETPRO MICAELA BASTIDAS

**A — Código en el pie del reverso:** `000333-AT-30425346-CE25-2026`  
Variable: `{{codigo_institucional}}`

> **A = el mismo valor en todas sus apariciones.** El código institucional de la portada (vertical), el del registro institucional en el reverso y el que aparece al pie del reverso son idénticos.

---

## Página 3 de 4 — Diccionario de códigos

Señales A–C sobre el título: cada parte se explica con el valor observado en el PDF.

### A — REGISTRO INSTITUCIONAL

**Ejemplo original:** `000333-AT-30425346-CE25-2026`

**Estructura observada:**

```text
000333 - AT - 30425346 - CE 25 - 2026
   │      │       │        │  │      │
   │      │       │        │  │      └─ Año final del código
   │      │       │        │  └──────── Referencia corta de 2 dígitos
   │      │       │        └─────────── Sigla del programa
   │      │       └──────────────────── DNI del titulado
   │      └──────────────────────────── Nivel: Auxiliar Técnico
   └─────────────────────────────────── Correlativo institucional
```

**Patrón:** `NNNNNN-AT-DNI-SIGLA+2_DÍGITOS-AÑO`

| Segmento | Qué significa en los ejemplos | Variable propuesta |
|---|---|---|
| `000333` | Correlativo de seis dígitos utilizado por el CETPRO. En los ejemplos examinados coincide con la R.D. de expedición. | `{{correlativo}}` |
| `AT` | Nivel formativo: Auxiliar Técnico. | `{{nivel_formativo}}` |
| `30425346` | DNI de la persona titulada (ocho dígitos). | `{{dni}}` |
| `CE` | Sigla de Corte y Ensamblaje en estos ejemplos. | `{{sigla_programa}}` |
| `25` | Referencia corta junto a la sigla del programa; su significado exacto debe confirmarse. | `{{referencia_corta}}` |
| `2026` | Año final que figura en el registro; no se debe asumir que es el año de estudios. | `{{anio_codigo}}` |

**Construcción dinámica propuesta:**

```text
{{correlativo}}-{{nivel_formativo}}-{{dni}}-{{sigla_programa}}{{referencia_corta}}-{{anio_codigo}}
```

**Variable completa que se repite en el título:**

```text
{{codigo_institucional}}
```

### B — REGISTRO UGEL

**Ejemplo original:** `000333-AT-00333-CE25-2026`

**Partes observadas:** `000333 / AT / 00333 / CE25 / 2026`.

**Variable completa:** `{{codigo_registro_ugel}}`.

> El código UGEL **es independiente** del código institucional y **no debe inventarse**. El documento identifica este campo como registro asignado por la UGEL; no confirma una fórmula oficial para generarlo. El código institucional A tampoco es la R.D. `2053-2025`.

*Nota del PDF:* «El A vertical (portada) y los dos A del reverso son el MISMO código institucional.»

---

## Página 4 de 4 — Cómo utilizar la plantilla

Los campos del título son editables en el PDF original. Cambie los datos de muestra antes de emitir documentos.

### C — RESOLUCIÓN DE REFERENCIA

**Ejemplo original:** `R.D. Nº 2053-2025-DUGEL-SR`

| Fragmento | Significado |
|---|---|
| `R.D. Nº` | Tipo de resolución: Resolución Directoral. |
| `2053` | Número de la resolución citada. |
| `2025` | Año de esa resolución. |
| `DUGEL-SR` | Identificador de la entidad o serie consignado. |

**Variable:** `{{resolucion_referencia}}`.

La R.D. no es el código institucional del título.

### D–F — OTROS CAMPOS EDITABLES

| Señal | Campo | Significado | Variable |
|---|---|---|---|
| **D** | Nombre del titulado | Nombre y apellidos completos. | `{{nombre_titulado}}` |
| **E** | Programa de estudios | Denominación completa del título. | `{{programa_estudios}}` |
| **F** | Fecha de expedición | Lugar, día, mes y año consignados. | `{{fecha_emision}}` |

**Nombre del director:** texto fijo en esta versión del PDF.

### Dónde se cambia cada variable

| Señal | Nombre del campo | Ubicación en la plantilla |
|---|---|---|
| **A** | `codigo_institucional` | Portada: código vertical derecho. Reverso: línea del registro institucional y pie. |
| **B** | `codigo_registro_ugel` | Reverso: segunda línea de registro. |
| **C** | `resolucion_referencia` | Portada: encabezado debajo del nombre del CETPRO. |
| **D** | `nombre_titulado` | Portada: nombre completo del estudiante. |
| **E** | `programa_estudios` | Portada: denominación del título. |
| **F** | `fecha_emision` | Portada: línea de lugar y fecha. |

### Ejemplo mínimo de datos para rellenar

```yaml
codigo_institucional: "000333-AT-30425346-CE25-2026"
codigo_registro_ugel: "000333-AT-00333-CE25-2026"
resolucion_referencia: "R.D. Nº 2053-2025-DUGEL-SR"
nombre_titulado: "[Nombres y APELLIDOS DEL TITULADO]"
programa_estudios: "[PROGRAMA DE ESTUDIOS]"
fecha_emision: "Dado en San Miguel, a los 18 días del mes de diciembre del 2026"
```

> **Importante:** los valores anteriores son los del ejemplo de la plantilla, no números nuevos asignados a un estudiante. Para generar otro título, sustituye los campos por datos reales y confirmados. En particular, el registro UGEL debe consignarse según la asignación de esa entidad.

---

*Fuente: `Plantilla_Titulo_Senalada_Codigo_Vertical.pdf`, páginas 1–4. Guía de variables: ejemplo no oficial del CETPRO Micaela Bastidas.*
