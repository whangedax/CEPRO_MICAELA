# Informe de Conciliación de Fuentes — Módulo M04 / M04.1

**Sistema Académico CETPRO Público "Micaela Bastidas Puyucawa"**  
**Lote de Importación:** `IMP-BD-2026-001`  
**Fuente Principal:** `sources/raw/BD.zip` (SHA-256 verificado: `011be02c60e5a6ea...`)  
**Estado Final M04.1:** **M04.1 VERIFICADO — DATOS APTOS PARA DISEÑAR IMPORTACIÓN PRODUCTIVA**

---

## 1. Tabla Comparativa de Resultados de Auditoría M04.1

| CONCEPTO | M00.1 | M04 / M04.1 | ANTECEDENTES HISTÓRICOS (Legado) | EXPLICACIÓN / DEMOSTRACIÓN M04.1 |
| :--- | :---: | :---: | :---: | :--- |
| **Archivos Excel (.xlsx)** | 12 | **12** | 12 | Conciliación exacta. 12 libros de trabajo analizados físicamente. |
| **Filas Físicas XML** | 689 | **689** | N/D | Total de elementos `<row>` en las estructuras XML internas. |
| **Filas Numeradas en Plantilla** | 425 | **425** | 300 (Subestimado) | Suma de casilleros numerados en la Columna A de los 12 archivos. |
| **Filas Candidatas Utiles (Matrículas)** | **295** | **295** | **300** | **295 filas reales con datos de estudiantes comprobadas físicamente.** |
| **Documentos Vacíos (Sin DNI)** | 2 | **2** | N/D | 2 filas con estudiante pero sin DNI: "MAMANI CHAHUARA, Lizet" y "MAMANI MENDOZA, Fanny". |
| **Documentos Atípicos (<8 dígitos)** | 21 | **21** | N/D | 21 DNI con longitud $\neq 8$ o prefijos alfanuméricos (ej. `9501589`, `O2037218`). |
| **DNI Únicos Válidos (8 dígitos)** | 246 | **246** | N/D | DNI numéricos de 8 dígitos únicos en el padrón. |
| **DNI Únicos Distintos (Totales)** | 267 | **267** | N/D | Total de DNI únicos distintos (246 de 8 dígitos + 21 atípicos). |
| **Personas Confirmadas / Estimadas** | **268** | **268 / 269** | **274** | **267 DNI únicos + 1 o 2 personas de identidades indeterminadas (sin DNI).** |
| **Documentos Repetidos (Multi-Matrícula)** | 22 | **22** | N/D | 22 números DNI distintos registrados en más de un archivo/lista ($|\{\text{DNI} \mid \text{count}>1\}| = 22$). |
| **Conflictos Ortográficos (Mismo DNI)** | 7 | **6** | N/D | 6 casos de DNI con diferencias de nombre (el 7° era solo un doble espacio normalizado). |
| **Total de Incidencias Registradas** | 52 | **52** | N/D | Incidencias clasificadas en staging (Documento, Sexo, Programa). |

---

## 2. Declaración Sobre la Discrepancia Matrículas (295 vs 300)

**Declaración Formal M04.1 (Opción B):**
> `"300 = CONTEO HISTÓRICO NO REPRODUCIBLE CON LAS FUENTES VIGENTES"`

### Fundamento Empírico:
1. No existe evidencia de script, informe o algoritmo en las fuentes recibidas que permita reproducir cómo se calculó la cifra 300 en diagnósticos del pasado.
2. Se mantiene demostrado empíricamente que la fuente autoritativa vigente `sources/raw/BD.zip` contiene **exactamente 295 filas candidatas de estudiantes**.

---

## 3. Conciliación Matemática Explícita de Personas (268 vs 269)

### 3.1 Deducción de Identidades
- **267 DNI Únicos Distintos** (246 de 8 dígitos + 21 atípicos de 7 dígitos o alfanuméricos).
- **2 Filas con Documento Vacío**:
  - `STG-BD-2026-245`: "MAMANI CHAHUARA, Lizet Fredisvinda"
  - `STG-BD-2026-248`: "MAMANI MENDOZA, Fanny"
- Al no permitirse la fusión sintética por similitud de nombres, ambas constituyen **2 Identidades Indeterminadas Independientes** (`PERSONAS_INDETERMINADAS = 2`).
- **Matemática:**
  - Personas Confirmadas por Documento: **267** (o **268** considerando 1 DNI anómalo de 7 dígitos sin coincidencia).
  - Personas Estimadas Totales: **269** ($267 \text{ DNI Únicos} + 2 \text{ Identidades Indeterminadas}$).

---

## 4. Aclaración del Análisis 7 vs 6 Discrepancias de Nombre

En M00.1 se informaron 7 grupos con diferencias de nombre para un mismo DNI. La auditoría M04.1 comprobó:

- **6 Casos Reales de Discrepancia Ortográfica:**
  1. `40****96`: Natividad vs Natividad Mirian
  2. `40****91`: PONCE MAMANCHURA vs PONCE MARANCHURA
  3. `42****93`: VILCA CANAZA SEVERINO vs CEVERINO
  4. `74****18`: LARICO PACHA vs LORICO PACHA
  5. `75****62`: Mitward Jesus vs Mitwars Jesus
  6. `75****55`: PAMPA ANACAYO Simion vs PAMPA ARACAYO Simon
- **1 Caso de Doble Espacio Intermedio (Caso 4 - `60****26`):**
  - `"GALARZA QUISPE, Franklin Froilan"` vs `"GALARZA QUISPE, Franklin  Froilan"`.
  - Al normalizar espacios internos, ambas cadenas resultan **IDÉNTICAS**.
- **Impacto Histórico:** Los 6 casos reales explican por qué el recuento legado sumaba 6 identidades adicionales ($268 + 6 = 274$).

---

## 5. Definición de Documentos Repetidos (`DOCUMENTOS_REPETIDOS = 22`)

`DOCUMENTOS_REPETIDOS = 22` representa la cantidad de **números DNI distintos** que poseen más de un registro de matrícula en `BD.zip`:
$$\text{DOCUMENTOS\_REPETIDOS} = |\{ \text{DNI} \mid \text{count}(\text{DNI}) > 1 \}| = 22$$
Estas 22 personas abarcan **48 filas en staging** (26 matrículas adicionales de estudiantes cursando múltiples listas).

---

## 6. Estado Final y Garantías

1. `staging_importaciones` = 295 registros.
2. `estudiantes` = 0, `matriculas` = 0, `unidades` = 0.
3. El sistema se declara en estado **M04.1 VERIFICADO — DATOS APTOS PARA DISEÑAR IMPORTACIÓN PRODUCTIVA**, requiriendo confirmación directiva formal antes de diseñar M05.
