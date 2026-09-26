# INFORME TÉCNICO M05 / M05.1 / M05.2: MATRÍCULAS PRODUCTIVAS Y RECONCILIACIÓN DE GRUPOS

**Fecha de Ejecución:** 2026-09-11  
**Lote de Importación de Matrículas:** `IMP-BD-MAT-2026-001`  
**Estado de Módulo:** `M05.2 VERIFICADO — GRUPOS Y MATRÍCULAS RECONCILIADOS`

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO DE M05 / M05.1 / M05.2

Se ha completado la conversión atómica y trazable de las **295 filas de staging** (`staging_importaciones`) en **295 matrículas productivas** dentro del store `matriculas` de la base de datos local `CETPRO_DB`. Asimismo, se completó la reconciliación estricta M05.2 del vector de matrículas por Grupo Técnico de Origen sustentado en las 295 coordenadas de la auditoría física M04.1.

### Conteos Oficiales en `CETPRO_DB` tras M05.2:
* **INSTITUCIONES:** `1`
* **PROGRAMAS:** `7` (`PROG-001` a `PROG-007`)
* **MÓDULOS:** `14` (`MOD-001` a `MOD-014`)
* **PERIODOS:** `0` (Estrictamente inalterado; periodos lectivos limpios)
* **ESTUDIANTES:** `269` (Permanece inalterado; 0 duplicaciones de personas)
* **MATRÍCULAS:** `295` (Convertidas 1:1 desde las 295 filas de staging)
* **UNIDADES:** `0` (Store `unidades` 100% vacío, B-002 intacto)
* **STAGING IMPORTACIONES:** `295` (Mapeados biunívocamente con `matriculaId`)

---

## 2. CARDINALIDAD Y RELACIONES DEL DOMINIO

$$\text{STAGING (295)} \xrightarrow{1 : 1} \text{MATRÍCULAS (295)}$$

$$\text{ESTUDIANTE (269)} \xrightarrow{1 : N} \text{MATRÍCULAS (295)}$$

1. **Separación Estricta Estudiante vs Matrícula:**
   * Las 295 matrículas pertenecen a los **269 estudiantes** importados en M04.3.
   * **245 estudiantes** tienen **1 matrícula**.
   * **22 estudiantes multi-matrícula** conservan sus **múltiples matrículas** (48 matrículas totales).
   * **2 estudiantes sin DNI** (`EST-IMP-BD-NODOC-268` y `EST-IMP-BD-NODOC-269`) recibieron su matrícula correspondiente vinculada por `estudianteId`.
2. **Unicidad e Trazabilidad Biunívoca:**
   * Cada matrícula contiene `stagingId`, `archivoOrigen`, `hojaOrigen` y `filaOrigen`, permitiendo rastrear el registro de vuelta hasta la celda exacta en Excel.

---

## 3. DESGLOSE DE GRUPOS TÉCNICOS FUENTE RECONCILIADOS (12 GRUPOS)

Las 295 matrículas están distribuidas de forma determinista entre 12 grupos técnicos según el archivo Excel de origen:

| Grupo Código | Archivo Origen | Programa Oficial | Turno | Modalidad | Matrículas |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `GRP-BD-001` | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | PELUQUERÍA Y BARBERÍA | MAÑANA | `PENDIENTE` | 36 |
| `GRP-BD-002` | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | PELUQUERÍA Y BARBERÍA | TARDE | `PENDIENTE` | 15 |
| `GRP-BD-003` | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | PELUQUERÍA Y BARBERÍA | NOCHE | `PENDIENTE` | 24 |
| `GRP-BD-004` | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | MECÁNICA AUTOMOTRIZ | `PENDIENTE` | `PENDIENTE` | 17 |
| `GRP-BD-005` | `3. MEC MOTOS PROF ANIBAL.xlsx` | MECÁNICA DE MOTOS Y VEHÍCULOS AFINES | `PENDIENTE` | `PENDIENTE` | 25 |
| `GRP-BD-006` | `CARPENTERIA METALICA.xlsx` | CARPINTERÍA METÁLICA | `PENDIENTE` | `PENDIENTE` | 20 |
| `GRP-BD-007` | `COMPUTACION PRESENCIAL 2026.xlsx` | COMPUTACIÓN E INFORMÁTICA | `PENDIENTE` | PRESENCIAL | 26 |
| `GRP-BD-008` | `COMPUTACION VIRTUAL 2026 -.xlsx` | COMPUTACIÓN E INFORMÁTICA | `PENDIENTE` | VIRTUAL | 70 |
| `GRP-BD-009` | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | CORTE Y ENSAMBLAJE | MAÑANA | `PENDIENTE` | 28 |
| `GRP-BD-010` | `CORTE  ENSAMBLAJE NOCHE.xlsx` | CORTE Y ENSAMBLAJE | NOCHE | `PENDIENTE` | 7 |
| `GRP-BD-011` | `CORTE  ENSAMBLAJE TARDE.xlsx` | CORTE Y ENSAMBLAJE | TARDE | `PENDIENTE` | 20 |
| `GRP-BD-012` | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | MANTENIMIENTO DE SISTEMAS ELÉCTRICOS | `PENDIENTE` | `PENDIENTE` | 7 |
| **TOTAL** | **12 Archivos Excel** | **7 Programas Oficiales** | | | **295** |

Vector exacto de matrículas por grupo: `[36, 15, 24, 17, 25, 20, 26, 70, 28, 7, 20, 7]`

---

## 4. REGLAS NO NEGOCIABLES CUMPLIDAS

1. **`moduloId = null` (Sin asignación automática de Módulo I/II):**
   * Ninguna matrícula infirió ni asignó sintéticamente `MOD-001` ni ningún módulo curricular en M05.
   * Quedan etiquetadas visiblemente en la interfaz como **`Módulo: Pendiente`**.
2. **`periodoId = null` (Sin creación de periodos ficticios):**
   * Se conservó el año fuente `2026` como metadato, pero **no se creó ningún periodo académico ficticio** (periodos = 0).
3. **Sin docentes ni unidades sintéticas:**
   * Nombres de profesores en archivos se guardaron como cadenas en `profesorFuente`. No se crearon docentes ni unidades sintéticas.
4. **Respaldo PRE-M05_2:**
   * Se creó el snapshot inmutable `BACKUP_PRE_M05_2` en el store `configuracion` previo a cualquier corrección.

---

## 5. ESTADO FINAL

### **M05.2 VERIFICADO — GRUPOS Y MATRÍCULAS RECONCILIADOS**

* Matrículas cargadas: **295**.
* Estudiantes en sistema: **269**.
* Unidades en sistema: **0**.
* Vector por grupos reconciliado al 100%: `[36, 15, 24, 17, 25, 20, 26, 70, 28, 7, 20, 7]`.
