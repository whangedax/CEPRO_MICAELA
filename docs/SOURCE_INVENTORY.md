# Inventario Detallado de Fuentes Originales (M00.1)

## 1. Resumen de Fuentes Analizadas

| Fuente | Tipo | Ubicación | SHA-256 | Estado / Observación |
|---|---|---|---|---|
| `BD.zip` | Archivo comprimido con 12 Excel | `sources/raw/BD.zip` | `011be02c60e5a6ea8743a6eb2ddc7e5f143c9360f86a510d141e35063df2ddfa` | INMUTABLE. 12 archivos auditados. Total 295 filas de matrícula útiles. |
| `CARRERAS.jpeg` | Imagen de referencia curricular | `sources/raw/CARRERAS.jpeg` | `1f43e0e267475e14a476b5aafc5fad5972c53897d468e61a218b0324b72c42b6` | INMUTABLE. Transcripción oficial de 7 programas y 14 módulos. |
| `PAQUETE_MAESTRO_CETPRO.zip` | Paquete de referencia histórica | `sources/legacy/PAQUETE_MAESTRO_CETPRO.zip` | `7eb7bd45f76380c6b6fa4ef09be023b9ce2d6479b077fd67e0f2b5435c5cb62a` | Legado inalterable. Únicamente consulta conceptual. |
| Plantillas 01–21 | 21 Hojas XLSX institucionales | `sources/templates/originals/xlsx/` | Ver [CATALOGO_PLANTILLAS.md](file:///c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/sources/templates/CATALOGO_PLANTILLAS.md) | 21/21 verificadas con 100% coincidencia de SHA-256. |

---

## 2. Inspección Detallada de los 12 Archivos Excel (`BD.zip`)

| # | Nombre de Archivo | Hoja Útil | Encabezado Real | Fila Hdr | Reg. Útiles | Programa Sugerido (`CARRERAS.jpeg`) | Turno / Obs. |
|---:|---|---|---|---:|---:|---|---|
| 1 | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | `PB.M-PB.T-PB.T-` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 5 | 36 | Peluquería y Barbería | MAÑANA |
| 2 | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | `PB.M-PB.T-PB.T-` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 5 | 15 | Peluquería y Barbería | TARDE |
| 3 | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | `PB.M-PB.T-PB.T-` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 5 | 24 | Peluquería y Barbería | NOCHE |
| 4 | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | `Automotriz` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 5 | 17 | Mecánica Automotriz | No especificado |
| 5 | `3. MEC MOTOS PROF ANIBAL.xlsx` | `MECANICA. MOTOS` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 6 | 25 | Mecánica de Motos y Vehículos Afines | No especificado |
| 6 | `CARPENTERIA METALICA.xlsx` | `C.METALICA` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 5 | 20 | Carpintería Metálica | Tipografía en título: CARPENTERIA |
| 7 | `COMPUTACION PRESENCIAL 2026.xlsx` | `COMPUTACION .  PRESENCIAL -VIR` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 6 | 26 | Computación e Informática | PRESENCIAL M.J.V.S. |
| 8 | `COMPUTACION VIRTUAL 2026 -.xlsx` | `COMPUTACION .  PRESENCIAL -VIR` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 69 | 70 | Computación e Informática | VIRTUAL (Comienza en fila 64) |
| 9 | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | `C.E.M-T-N.` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 6 | 28 | Corte y Ensamblaje | MAÑANA |
| 10 | `CORTE  ENSAMBLAJE NOCHE.xlsx` | `C.E.M-T-N.` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 6 | 7 | Corte y Ensamblaje | MOCHE (Errata por NOCHE) |
| 11 | `CORTE  ENSAMBLAJE TARDE.xlsx` | `C.E.M-T-N.` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 7 | 20 | Corte y Ensamblaje | TARDE (MJVS) |
| 12 | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | `Electricidad` | N°, DNI, APELLIDOS Y NOMBRES, SEXSO H-M, FECHA, EDEAD, N° CEL | 5 | 7 | Mantenimiento de Sistemas Eléctricos | No especificado |

### 2.1 Estadísticas Globales de Matrículas e Identidades (`BD.zip`)
- **Total de filas de matrícula útiles auditadas**: **295**.
- **Documentos vacíos**: **2** registros.
- **Documentos potencialmente inválidos** (longitud distinta a 8 dígitos numéricos o caracteres anómalos): **21** registros (ej: DNI de 7 dígitos como `2443504`, `2399315`, `2557768`).
- **DNI distintos encontrados**: **267**.
- **DNI repetidos entre múltiples listas de matrícula**: **22** DNI aparecen en 2 o más archivos/turnos.
- **DNI con discrepancias en la escritura del nombre**: **7** casos detectados entre distintas listas.
- **Estimación SEGURA de Personas Únicas**: **268** personas (calculado como DNI válidos de 8 dígitos únicos + nombres únicos para registros con DNI anómalo/vacío).

---

## 3. Transcripción Oficial de `CARRERAS.jpeg`

### Encabezado Institucional
- **Dependencia**: PERÚ - Ministerio de Educación | Dirección Regional de Educación | UGEL San Román
- **Institución**: CENTRO DE EDUCACIÓN TÉCNICA PRODUCTIVA PÚBLICO "MICAELA BASTIDAS PUYUCAWA" - SAN MIGUEL
- **Título**: PROGRAMA DE ESTUDIOS

### Inventario Estructurado de Programas y Módulos Curriculares (7 Programas / 14 Módulos)

1. **MECÁNICA AUTOMOTRIZ**
   - **MÓDULO I**: MANTENIMIENTO Y REPARACIÓN DE SISTEMA DE SUSPENSIÓN, DIRECCIÓN, FRENOS Y TRANSMISIÓN
   - **MÓDULO II**: DIAGNÓSTICO Y MANTENIMIENTO DEL MOTOR DE COMBUSTIÓN INTERNA DE LOS VEHÍCULOS AUTOMOTRICES

2. **MECÁNICA DE MOTOS Y VEHÍCULOS AFINES**
   - **MÓDULO I**: MANTENIMIENTO Y REPARACIÓN DE SISTEMA DE SUSPENSIÓN, DIRECCIÓN, FRENOS, TRANSMISIÓN, SISTEMA ELÉCTRICO Y SISTEMA ELECTRÓNICO DE MOTOS Y VEHÍCULOS AFINES
   - **MÓDULO II**: MANTENIMIENTO Y REPARACIÓN DE MOTOS DE COMBUSTIÓN Y CONVERSIÓN DEL SISTEMA GNV-GLP

3. **CARPINTERÍA METÁLICA**
   - **MÓDULO I**: CONSTRUCCIONES METÁLICAS DE CONSUMO CON SOLDADURA POR ARCO ELÉCTRICO EN ACERO.
   - **MÓDULO II**: CONSTRUCCIONES METÁLICAS DE CONSUMO EN ALUMINIO CON SOLDADURA ESPECIAL TIG-MIG-MAG-LASER.

4. **PELUQUERÍA Y BARBERÍA**
   - **MÓDULO I**: CORTE DE CABELLOS, PEINADOS Y DISEÑO DE BARBAS
   - **MÓDULO II**: ONDULACIÓN, DECOLORACIÓN, Y TINTURACIÓN

5. **COMPUTACIÓN E INFORMÁTICA**
   - **MÓDULO I**: OFIMÁTICA
   - **MÓDULO II**: DISEÑO GRÁFICO Y PLATAFORMAS DIGITALES

6. **CORTE Y ENSAMBLAJE**
   - **MÓDULO I**: TÉCNICAS DE TRAZADO, TENDIDO Y CORTE DE PRENDAS DE VESTIR
   - **MÓDULO II**: TÉCNICAS DE CONFECCIÓN DE PRENDAS DE VESTIR

7. **MANTENIMIENTO DE SISTEMAS ELÉCTRICOS**
   - **MÓDULO I**: INSTALACIÓN DE SISTEMAS ELÉCTRICOS EN EDIFICACIONES.
   - **MÓDULO II**: MANTENIMIENTO DE EQUIPOS ELECTRÓNICOS Y SISTEMAS DE SEGURIDAD EN DOMÓTICA

### Contrastación de Nomenclatura (`BD.zip` vs `CARRERAS.jpeg`)

| Nombre en `BD.zip` | Nombre Oficial en `CARRERAS.jpeg` | Estado de Homologación |
|---|---|---|
| `PB` / `PELUQUERIA` | `PELUQUERÍA Y BARBERÍA` | PENDIENTE (Mapeo visual en staging) |
| `AUTOMOTRIZ` | `MECÁNICA AUTOMOTRIZ` | PENDIENTE (Mapeo visual en staging) |
| `MEC MOTOS` / `MECANICA. MOTOS` | `MECÁNICA DE MOTOS Y VEHÍCULOS AFINES` | PENDIENTE (Mapeo visual en staging) |
| `CARPENTERIA METALICA` / `METALICA` | `CARPINTERÍA METÁLICA` | PENDIENTE (Corrección ortográfica en staging) |
| `COMPUTACION` | `COMPUTACIÓN E INFORMÁTICA` | PENDIENTE (Mapeo visual en staging) |
| `CORTE ENSAMBLAJE` | `CORTE Y ENSAMBLAJE` | PENDIENTE (Mapeo visual en staging) |
| `ELECTRICIDAD` | `MANTENIMIENTO DE SISTEMAS ELÉCTRICOS` | PENDIENTE (Mapeo visual en staging) |

---

## 4. Agrupación y Clasificación del Catálogo de 21 Plantillas

Las 21 plantillas oficiales de `sources/templates/originals/xlsx/` se agrupan en las siguientes categorías operativas:

### Grupo 1: Matrícula y Registro Modular (Plantillas 01–04)
- `01_NOMINA_DE_MATRICULA.xlsx`
- `02_FICHA_DE_MATRICULA.xlsx`
- `03_REGISTRO_DE_MATRICULA_MODULAR.xlsx`
- `04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.xlsx`

### Grupo 2: Asistencia y Evaluación (Plantillas 05–17)
- Asistencia: `05_ASISTENCIA_UD1.xlsx` a `10_ASISTENCIA_UD6.xlsx` (As-1 a As-6).
- Evaluación: `11_EVALUACION_IL_UD1.xlsx` a `17_EVALUACION_UD7.xlsx` (IL/UD1 a UD7).
- **Bloqueo Explicito**: **`ASISTENCIA_UD7` (As-7) NO EXISTE** en el paquete original recibido y queda **BLOQUEADA**.

### Grupo 3: EFSRT y Documentos Finales (Plantillas 18–21)
- `18_CONSOLIDADO_EFSRT.xlsx`
- `19_ACTA_DE_EVALUACION_MODULAR.xlsx`
- `20_CERTIFICADO_MODULAR.xlsx`
- `21_TITULO_AUXILIAR_TECNICO.xlsx`
