# Auditoría de Identidades y Documentos Fuente — Módulo M04.2

**Sistema Académico CETPRO Público "Micaela Bastidas Puyucawa"**  
**Fecha:** 11 de Septiembre de 2026  
**Lote de Importación:** `IMP-BD-2026-001`  
**Fuente Principal:** `sources/raw/BD.zip` (SHA-256: `011be02c60e5a6ea...`)  
**Estado Final M04.2:** **M04.2 VERIFICADO — IDENTIDADES Y DOCUMENTOS CONCILIADOS**

---

## 1. Tabla de Cierre Matemático de Identidades y Filas Candidatas

Se establece la matriz matemática exacta del padrón de importaciones extraído de `sources/raw/BD.zip`:

| CONCEPTO MATEMÁTICO | VALOR EXACTO | DEFINICIÓN Y FÓRMULA MATEMÁTICA |
| :--- | :---: | :--- |
| **`FILAS_CANDIDATAS`** | **295** | Total de filas físicas en Excel con datos de estudiantes ingresadas a staging. |
| **`FILAS_CON_DOCUMENTO`** | **293** | Filas que poseen un valor de documento DNI en origen (válido o atípico). |
| **`FILAS_SIN_DOCUMENTO`** | **2** | Filas con datos de estudiante pero con celda DNI vacía. |
| **`DOCUMENTOS_DISTINTOS_NO_VACIOS`** | **267** | $|\{ \text{DNI} \mid \text{DNI} \neq \text{vacío} \}| = 267$ números de documento distintos. |
| **`IDENTIDADES_CONFIRMADAS_POR_DOCUMENTO`** | **267** | Personas que poseen un documento de identidad único en la fuente (246 DNI de 8 dígitos + 21 DNI atípicos). |
| **`IDENTIDADES_INDETERMINADAS_SIN_DOCUMENTO`** | **2** | Personas candidatas sin documento DNI registradas como identidades independientes. |
| **`PERSONAS_CANDIDATAS_TOTALES`** | **269** | $\text{IDENTIDADES\_CONFIRMADAS} + \text{IDENTIDADES\_INDETERMINADAS} = 267 + 2 = 269$. |

### Fórmula de Cierre de Identidades:
$$\text{PERSONAS\_CANDIDATAS\_TOTALES} = \text{IDENTIDADES\_CONFIRMADAS\_POR\_DOCUMENTO} + \text{IDENTIDADES\_INDETERMINADAS\_SIN\_DOCUMENTO}$$
$$269 = 267 + 2$$

---

## 2. Definición Conceptual de Tipos de Identidad

Para evitar ambigüedades entre conteos estimados y confirmados, se norman las siguientes definiciones técnicas:

1. **`IDENTIDAD_CONFIRMADA_POR_DOCUMENTO` (267):** Identidad respaldada biunívocamente por un número de documento de identidad único en el origen (incluye los 21 documentos atípicos, los cuales forman parte de este conjunto de 267 documentos distintos).
2. **`IDENTIDAD_INDETERMINADA` (2):** Candidato a estudiante que carece de documento DNI en origen. No puede elevarse a "confirmada" ni asignársele DNI sintético.
3. **`PERSONA_CANDIDATA_TOTAL` (269):** La suma estricta de identidades confirmadas por documento más identidades indeterminadas sin documento ($267 + 2 = 269$).

---

## 3. Aclaración Formal del Origen del Número 268 y Ajuste M04.2

### Declaración Técnica M04.2:
> **"SUPERADO POR M04.2: El número 268 reportado en M00.1 / M04 provino de sumar 267 DNI únicos más 1 persona estimada sin documento ($267 + 1 = 268$), asumiendo erróneamente que las 2 filas sin DNI correspondían a 1 sola persona por compartir el apellido paterno. En M04.2 se rectifica formalmente: al ser 2 personas distintas con nombres y apellidos maternos diferentes, la matemática exacta de identidades candidatas totales es 269 ($267 + 2 = 269$)."**

---

## 4. Clasificación Técnicamente Rigurosa del Conteo Histórico (274)

Se establece la distinción formal exigida por las reglas de auditoría:

- **HECHO DEMOSTRADO:** La fuente autoritativa `sources/raw/BD.zip` contiene exactamente **295 filas candidatas**, **293 filas con documento**, **267 documentos DNI no vacíos distintos** y **2 filas sin documento independientes** (Total **269 personas candidatas**). Existen **6 grupos de DNI** con discrepancias ortográficas reales de nombre en origen.
- **HIPÓTESIS:** El reporte histórico de 274 pudo originarse al deduplicar superficialmente por texto completo de nombre sobre los 267 DNI más los 6 registros con variaciones de nombre ($267 + 1 \text{ anómalo} + 6 = 274$).
- **CONTEO HISTÓRICO NO REPRODUCIBLE:**
  > **`"274 = CONTEO HISTÓRICO NO REPRODUCIBLE CON LAS FUENTES VIGENTES"`**  
  > (No existe script ni evidencia del algoritmo legado que produjo 274 en las fuentes recibidas).

---

## 5. Auditoría Profunda OOXML de Celdas y Formatos (Las 295 Celdas de Documento)

Se inspeccionó la estructura XML interna (`xl/worksheets/sheetN.xml` y `xl/styles.xml`) de las 295 celdas de la Columna B (Documento):

| TIPO DE CELDA OOXML | CANTIDAD DE CELDAS | VALOR XML CRUDO (`<v>`) | FORMATO DE CELDA (`formatCode`) | INTERPRETACIÓN TÉCNICA |
| :--- | :---: | :---: | :---: | :--- |
| **`shared string` (`t="s"`)** | **119** | Índice numérico (ej. `<v>14</v>`) | `General` | Texto directo extraído de `xl/sharedStrings.xml`. Conserva exactamente la cadena original. |
| **`numeric` (sin atributo `t`)** | **174** | Entero directo (ej. `<v>47933074</v>`) | `General` (ID 0) | Valor numérico crudo. **Ninguna celda tiene formato personalizado de ceros a la izquierda (ej. `00000000`).** |
| **`blank` (sin nodo `<c>` o `<v>`)** | **2** | *Vacio* | `General` | Celdas de DNI totalmente en blanco (Filas sin documento). |
| **TOTAL** | **295** | — | — | **100% de las 295 celdas de documento auditadas en XML.** |

### Hallazgo Sobre Ceros Iniciales y Formato de Excel:
- Se comprobó mediante inspección de `xl/styles.xml` que **ninguna de las 174 celdas numéricas posee un `formatCode` de relleno de ceros (como `00000000` o `0000000`)**. Todas tienen formato `General`.
- Por tanto, las 20 celdas de DNI de 7 dígitos están almacenadas nativamente como números de 7 dígitos en el XML (ej. `<v>9501589</v>`). No existen ceros a la izquierda ocultos por formato de máscara de Excel.

---

## 6. Clasificación de los 21 Documentos Atípicos

Los 21 documentos DNI que difieren del estándar de 8 dígitos numéricos se clasifican sin alteración:

| CATEGORÍA ATÍPICA | CANTIDAD | EJEMPLO ENMASCARADO | TIPO OOXML | FORMATODE CELDA | MANEJO EN STAGING |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`7_DIGITOS`** | **20** | `95***89` | `numeric` | `General` | Almacenado como texto exacto de 7 dígitos (`"9501589"`). Etiquetado con `DOCUMENTO_FORMATO_ATIPICO`. |
| **`MAS_DE_8_DIGITOS`** | **0** | — | — | — | Ninguno en el padrón. |
| **`ALFANUMERICOS`** | **1** | `O2***18` | `shared string` | `General` | Texto original con letra O inicial (`"O2037218"`). Etiquetado con `DOCUMENTO_FORMATO_ATIPICO`. |
| **`OTROS`** | **0** | — | — | — | Ninguno en el padrón. |
| **TOTAL ATÍPICOS** | **21** | — | — | — | **Suma exacta de documentos atípicos = 21.** |

---

## 7. Demostración Matemática Coherente de Documentos Repetidos

- **Documentos Repetidos Distintos:** $|\{ \text{DNI} \mid \text{count}(\text{DNI}) > 1 \}| = \mathbf{22}$.
- **Filas Pertenecientes a DNI Repetidos:** $\mathbf{48}$ filas de staging.
- **Apariciones / Matrículas Adicionales:** $48 - 22 = \mathbf{26}$ repeticiones adicionales.

### Ecuación de Coherencia Matemática:
$$\text{FILAS\_CON\_DOCUMENTO} - \text{REPETICIONES\_ADICIONALES} = \text{DOCUMENTOS\_DISTINTOS\_NO\_VACIOS}$$
$$293 - 26 = 267$$

$$\text{COHERENCIA MATEMÁTICA DEMOSTRADA AL 100\%}$$

---

## 8. Preservación Autónoma de los 2 Documentos Vacíos

Las 2 filas con DNI en blanco pertenecen a:
1. `STG-BD-2026-245` (Fila 18 de `CORTE ENSAMBLAJE MAÑANA.xlsx`): `"MAMANI CHAHUARA, Lizet Fredisvinda"`
2. `STG-BD-2026-248` (Fila 21 de `CORTE ENSAMBLAJE MAÑANA.xlsx`): `"MAMANI MENDOZA, Fanny"`

- **NO se unifican ni fusionan por compartir el apellido "MAMANI".**
- **NO se genera ningún DNI sintético o artificial.**
- Permanecen como **2 Identidades Indeterminadas Independientes** (`IDENTIDADES_INDETERMINADAS_SIN_DOCUMENTO = 2`).

---

## 9. Verificación de Almacenamiento Staging vs Productivo

```text
staging_importaciones = 295 (Lote IMP-BD-2026-001)
estudiantes           = 0
matriculas            = 0
unidades              = 0
```

---

## 10. Estado Final M04.2

```text
M04.2 VERIFICADO — IDENTIDADES Y DOCUMENTOS CONCILIADOS
```
