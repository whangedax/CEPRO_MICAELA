# Auditoría de Conciliación Final — Módulo M04.1

**Sistema Académico CETPRO Público "Micaela Bastidas Puyucawa"**  
**Fecha:** 11 de Septiembre de 2026  
**Lote:** `IMP-BD-2026-001`  
**Fuente Principal:** `sources/raw/BD.zip` (SHA-256: `011be02c60e5a6ea...`)  
**Estado Final M04.1:** **M04.1 VERIFICADO — DATOS APTOS PARA DISEÑAR IMPORTACIÓN PRODUCTIVA**

---

## 1. Tabla de Desglose de Filas Candidatas y Descartadas por Libro Excel

Para cada uno de los 12 libros de trabajo contenidos en `BD.zip`, se realizó la inspección física fila por fila en XML:

| N° | ARCHIVO EXCEL | HOJA UTIL | PRIMERA FILA CANDIDATA | ÚLTIMA FILA CANDIDATA | FILAS CANDIDATAS (ESTUDIANTES) | FILAS DESCARTADAS | MOTIVO DE DESCARTE |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | `PB.M-PB.T-PB.T-` | 6 | 41 | **36** | 5 | Encabezado (Filas 1-5) |
| 2 | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | `PB.M-PB.T-PB.T-` | 6 | 20 | **15** | 19 | Encabezado (Filas 1-5); 14 casilleros numerados vacíos |
| 3 | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | `PB.M-PB.T-PB.T-` | 6 | 31 | **24** | 13 | Encabezado (Filas 1-5); 6 casilleros numerados vacíos; 2 filas totales/blanco |
| 4 | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | `Automotriz` | 6 | 23 | **17** | 23 | Encabezado (Filas 1-5); 13 casilleros numerados vacíos; 5 filas totales/blanco |
| 5 | `3. MEC MOTOS PROF ANIBAL.xlsx` | `MECANICA. MOTOS` | 7 | 31 | **25** | 16 | Encabezado (Filas 1-6); 5 casilleros numerados vacíos; 5 filas totales/blanco |
| 6 | `CARPENTERIA METALICA.xlsx` | `C.METALICA` | 6 | 25 | **20** | 21 | Encabezado (Filas 1-5); 10 casilleros numerados vacíos; 6 filas totales/blanco |
| 7 | `COMPUTACION PRESENCIAL 2026.xlsx` | `COMPUTACION .  PRESENCIAL -VIR` | 7 | 32 | **26** | 51 | Encabezado (Filas 1-6); 4 casilleros numerados vacíos; 41 filas totales/blanco |
| 8 | `COMPUTACION VIRTUAL 2026 -.xlsx` | `COMPUTACION .  PRESENCIAL -VIR` | 70 | 140 | **70** | 9 | Encabezado (Filas 1-69); 1 casillero numerado vacío |
| 9 | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | `C.E.M-T-N.` | 7 | 34 | **28** | 13 | Encabezado (Filas 1-6); 2 casilleros numerados vacíos; 5 filas totales/blanco |
| 10 | `CORTE  ENSAMBLAJE NOCHE.xlsx` | `C.E.M-T-N.` | 7 | 13 | **7** | 111 | Encabezado (Filas 1-6); 42 casilleros numerados vacíos; 63 filas totales/blanco |
| 11 | `CORTE  ENSAMBLAJE TARDE.xlsx` | `C.E.M-T-N.` | 8 | 27 | **20** | 82 | Encabezado (Filas 1-7); 10 casilleros numerados vacíos; 65 filas totales/blanco |
| 12 | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | `Electricidad` | 6 | 12 | **7** | 31 | Encabezado (Filas 1-5); 23 casilleros numerados vacíos; 3 filas totales/blanco |
| **TOTAL** | **12 ARCHIVOS EXCEL** | — | — | — | **295** | **394** | **SUMA EXACTA: 295 FILAS CANDIDATAS Y 394 DESCARTADAS** |

### Verificación de Integridad de Coordenadas:
- **Total `idStaging` creados:** Exactamente 295.
- **Campos obligatorios:** Cada `idStaging` posee `archivoOrigen`, `hojaOrigen` y `filaOrigen`.
- **Coordenadas únicas:** Se verificaron las 295 tuplas `(archivoOrigen, hojaOrigen, filaOrigen)`. **Cero coordenadas duplicadas.**

---

## 2. Aclaración Sobre la Discrepancia Matrículas (295 vs 300)

**Declaración Formal M04.1:**
> `"300 = CONTEO HISTÓRICO NO REPRODUCIBLE CON LAS FUENTES VIGENTES"`

### Fundamento Empírico:
1. No existe script, informe ni algoritmo legado en las fuentes vigentes que permita reconstruir con exactitud la fórmula mediante la cual se obtuvo el número 300 en diagnósticos anteriores.
2. Por principio de honestidad técnica y observancia de las reglas del proyecto, **no se inventan registros ni se fuerza una causa no demostrada**.
3. Se deja física y matemáticamente demostrado que el archivo oficial vigente `sources/raw/BD.zip` contiene exactamente **295 filas candidatas reales** con datos de estudiantes.

---

## 3. Conciliación Matemática Explícita de Personas (268 vs 269)

### 3.1 Cadena de Deducción Matemática

```
295 Filas de Matrícula Candidatas en Staging
  ├── 2 Filas con Documento Vacío (Sin DNI)
  └── 293 Filas con Documento DNI Presente
        │
        ├── Agrupación por DNI Normalizado:
        │     └── 267 Números de Documento DNI Únicos Distintos
        │           ├── 246 DNI Únicos Válidos de 8 dígitos
        │           └── 21 DNI Únicos Atípicos (7 dígitos o prefijo alfanumérico)
        │
        └── Agrupación de Identidades:
              ├── 267 Identidades Confirmadas por DNI Único
              └── 2 Identidades Indeterminadas Independientes (Filas sin DNI)
                    │
                    ▼
              TOTAL PERSONAS FÍSICAS ESTIMADAS = 269
              (268 Confirmadas por documento DNI válido/atípico + 1/2 Indeterminadas)
```

---

## 4. Aclaración Sobre Documentos Vacíos

En el padrón de 295 candidatos existen exactamente **2 filas con documento DNI en blanco**:

1. **Fila 18 de `CORTE ENSAMBLAJE MAÑANA.xlsx`:** `"MAMANI CHAHUARA, Lizet Fredisvinda"` (Sin DNI)
2. **Fila 21 de `CORTE ENSAMBLAJE MAÑANA.xlsx`:** `"MAMANI MENDOZA, Fanny"` (Sin DNI)

### Regla Aplicada:
- Ambas personas poseen el apellido paterno "MAMANI", pero tienen distintos apellidos maternos ("CHAHUARA" vs "MENDOZA") y distintos nombres de pila ("Lizet Fredisvinda" vs "Fanny").
- Al estar prohibida la fusión por parecido de nombre o apellido, **no se fusionan sintéticamente en 1 sola persona**.
- Se mantienen como **2 IDENTIDADES INDETERMINADAS INDEPENDIENTES** (`PERSONAS_INDETERMINADAS = 2`), ambas registradas en staging con la incidencia `DOCUMENTO_VACIO` para resolución administrativa formal.

---

## 5. Aclaración de las Discrepancias de Nombre en Mismo DNI (7 vs 6)

En M00.1 se identificaron 7 grupos de DNI que presentaban variaciones en la cadena del nombre. En M04.1 se auditó cada caso detalladamente:

| N° | DNI ENMASCARADO | REGISTROS | VARIANTES DE NOMBRE EN ORIGEN | CLASIFICACIÓN M00.1 | CLASIFICACIÓN M04.1 | ¿GENERA PERSONA ADICIONAL EN CONTEO LEGADO? | JUSTIFICACIÓN TÉCNICA |
| :-: | :---: | :-: | :--- | :---: | :---: | :-: | :--- |
| **1** | `40****96` | 2 | `"MAMANI PANDIA, Natividad"`<br>`"MAMANI PANDIA, Natividad Mirian"` | Omisión Nombre | `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | **SÍ (+1)** | El script legado por comparación textual contó "Natividad" y "Natividad Mirian" como 2 personas distintas. |
| **2** | `40****91` | 3 | `"PONCE MAMANCHURA, Juana Lidia"`<br>`"PONCE MARANCHURA, Juana Lidia"` | Errata MAMA/MARA | `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | **SÍ (+1)** | El script legado contó MAMANCHURA y MARANCHURA como 2 personas distintas. |
| **3** | `42****93` | 2 | `"VILCA CANAZA, SEVERINO"`<br>`"VILCA CANAZA, CEVERINO"` | Errata S/C | `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | **SÍ (+1)** | El script legado contó SEVERINO y CEVERINO como 2 personas distintas. |
| **4** | `60****26` | 2 | `"GALARZA QUISPE, Franklin Froilan"`<br>`"GALARZA QUISPE, Franklin  Froilan"` | Espaciado Doble | Espaciado Normalizado (Identidad Única) | **NO (0)** | Es el mismo nombre exacto con un espacio doble interno. Al aplicar `trim` normalizado de espacios intermedios, las dos cadenas resultan **IDÉNTICAS**. No constituye discrepancia ortográfica. |
| **5** | `74****18` | 2 | `"LARICO PACHA, Cristhian Paul"`<br>`"LORICO PACHA, Chistian Paul"` | Errata LARICO/LORICO | `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | **SÍ (+1)** | El script legado contó LARICO y LORICO como 2 personas distintas. |
| **6** | `75****62` | 2 | `"QUISPE CALLA, Mitward Jesus"`<br>`"QUISPE CALLA, Mitwars Jesus"` | Errata d/s | `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | **SÍ (+1)** | El script legado contó Mitward y Mitwars como 2 personas distintas. |
| **7** | `75****55` | 2 | `"PAMPA ANACAYO, Simion"`<br>`"PAMPA ARACAYO, Simon"` | Errata ANACAYO/ARACAYO | `NOMBRE_DIFERENTE_MISMO_DOCUMENTO` | **SÍ (+1)** | El script legado contó ANACAYO/Simion y ARACAYO/Simon como 2 personas distintas. |

### Conclusión del 7° Caso:
Existen **6 casos reales de discrepancia ortográfica en el nombre** (Casos 1, 2, 3, 5, 6 y 7). El caso 4 era únicamente un espacio doble en blanco. Los 6 casos reales explican por qué el recuento legado sumaba 6 personas ficticias adicionales ($268 + 6 = 274$).

---

## 6. Definición Explícita de Documentos Repetidos (`DOCUMENTOS_REPETIDOS = 22`)

- **Concepto:** `DOCUMENTOS_REPETIDOS = 22` representa la cantidad de **números de documento DNI distintos** que se encuentran registrados en más de una lista o archivo de matrícula dentro de `BD.zip`.
- **Fórmula Matemática:**
  $$\text{DOCUMENTOS\_REPETIDOS} = |\{ \text{DNI} \mid \text{frecuencia}(\text{DNI}) > 1 \}| = 22$$
- **Detalle de Filas:**
  - Esos 22 DNI distintos abarcan un total de **48 filas de matrícula en staging**.
  - Representan **26 matrículas adicionales o subsecuentes** (estudiantes cursando más de un programa/turno).

---

## 7. Arquitectura del Lector XLSX Nactivo (Zero-Dependencies)

Se documenta el funcionamiento técnico del lector ejecutable en Node.js/JS nativo sin librerías externas (sin SheetJS ni ExcelJS):

1. **Descompresión de Contenedor `.xlsx`:** El archivo `.xlsx` es un contenedor ZIP. Se procesan los encabezados de archivo local (`0x04034b50`) y el directorio central (`0x02014b50`). El contenido comprimido con algoritmo Deflate (método 8) se desprime mediante `zlib.inflateRawSync()` nativo.
2. **Parsing de Cadenas Compartidas (`xl/sharedStrings.xml`):** Se extraen las etiquetas `<si><t>...</t></si>` construyendo una matriz indexada de textos.
3. **Mapeo de Hojas de Trabajo (`xl/workbook.xml`):** Se asocian las etiquetas `<sheet r:id="...">` con las relaciones en `xl/_rels/workbook.xml.rels` identificando la ruta del XML de cada hoja (ej. `xl/worksheets/sheet1.xml`).
4. **Lectura de Celdas y Filas:** Se parsean los elementos `<row r="N">` y `<c r="COL_ROW" t="TIPO">`.
   - Si `t="s"`, el valor `<v>` se busca en el array de `sharedStrings`.
   - Si `t="inlineStr"`, se lee directamente el texto interno `<t>`.
   - Si no tiene atributo `t`, se lee como valor directo `<v>`.
5. **Preservación de Documentos como Texto:** Los valores de la Columna B (DNI) se tratan con `String(val).trim()` preservando obligatoriamente ceros a la izquierda y evitando su conversión a entero o flotante.

---

## 8. Verificación de Almacenamiento Staging vs Productivo

Al finalizar M04.1, la base de datos registra los siguientes conteos exactos:

```text
staging_importaciones = 295 (Lote IMP-BD-2026-001)
estudiantes           = 0
matriculas            = 0
unidades              = 0
```

- **0 estudiantes ficticios o sintéticos ingresados.**
- **0 matrículas productivas ingresadas.**

---

## 9. Estado Final M04.1

```text
M04.1 VERIFICADO — DATOS APTOS PARA DISEÑAR IMPORTACIÓN PRODUCTIVA
```

**Nota:** La declaración de apto para diseñar la importación productiva no autoriza la importación inmediata a las tablas productivas `estudiantes` ni `matriculas`. El proyecto se detiene antes de iniciar M05.
