# MATRIZ DE MAPEO DE MATRÍCULAS Y TRAZABILIDAD FUENTE (M05 / M05.1 / M05.2)

**Fecha:** 2026-09-11  
**Módulo:** `M05.2 — RECONCILIACIÓN DE GRUPOS Y MATRÍCULAS PRODUCTIVAS`

---

## 1. ESQUEMA GENERAL DE TRAZABILIDAD

$$\text{STAGING} \xrightarrow{1:1} \text{MATRÍCULA} \rightarrow \text{ESTUDIANTE} + \text{PROGRAMA} + \text{GRUPO TÉCNICO DE ORIGEN}$$

Cada una de las **295 matrículas** producidas almacena de forma inmutable las coordenadas exactas de su origen en la hoja de cálculo de `BD.zip`:

- `stagingId` (ID de la fila de staging)
- `archivoOrigen` (Nombre del archivo Excel)
- `hojaOrigen` (Nombre de la pestaña/hoja)
- `filaOrigen` (Número de fila física en el Excel)

---

## 2. MATRIZ RECONCILIADA DE MAPEO POR GRUPO TÉCNICO DE ORIGEN (12 GRUPOS)

| Grupo Técnico | Archivo Origen | Programa Oficial | Código Prog. | Matrículas | Turno Fuente | Modalidad Fuente | Módulo Curricular | Periodo Lectivo |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GRP-BD-001` | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | PELUQUERÍA Y BARBERÍA | `PROG-004` | 36 | MAÑANA | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-002` | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | PELUQUERÍA Y BARBERÍA | `PROG-004` | 15 | TARDE | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-003` | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | PELUQUERÍA Y BARBERÍA | `PROG-004` | 24 | NOCHE | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-004` | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | MECÁNICA AUTOMOTRIZ | `PROG-001` | 17 | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-005` | `3. MEC MOTOS PROF ANIBAL.xlsx` | MECÁNICA DE MOTOS Y VEHÍCULOS AFINES | `PROG-002` | 25 | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-006` | `CARPENTERIA METALICA.xlsx` | CARPINTERÍA METÁLICA | `PROG-003` | 20 | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-007` | `COMPUTACION PRESENCIAL 2026.xlsx` | COMPUTACIÓN E INFORMÁTICA | `PROG-005` | 26 | `PENDIENTE` | PRESENCIAL | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-008` | `COMPUTACION VIRTUAL 2026 -.xlsx` | COMPUTACIÓN E INFORMÁTICA | `PROG-005` | 70 | `PENDIENTE` | VIRTUAL | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-009` | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | CORTE Y ENSAMBLAJE | `PROG-006` | 28 | MAÑANA | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-010` | `CORTE  ENSAMBLAJE NOCHE.xlsx` | CORTE Y ENSAMBLAJE | `PROG-006` | 7 | NOCHE | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-011` | `CORTE  ENSAMBLAJE TARDE.xlsx` | CORTE Y ENSAMBLAJE | `PROG-006` | 20 | TARDE | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-012` | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | MANTENIMIENTO DE SISTEMAS ELÉCTRICOS | `PROG-007` | 7 | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| **TOTAL** | **12 Archivos Excel** | **7 Programas Oficiales** | | **295** | | | | |

---

## 3. RESUMEN DE MODULARIDAD Y PERIODIZACIÓN DIFERIDA

1. **Estado Inicial:**
   - Módulo Curricular: `moduloId = null` (`Módulo: Pendiente`)
   - Periodo Lectivo: `periodoId = null` (`Periodo: Pendiente`)
   - Estado de Registro: `PENDIENTE_REVISION`
   - Incidencias Activas: `MODULO_PENDIENTE`, `PERIODO_PENDIENTE`

2. **Procedimiento de Asignación por Grupo:**
   - La asignación efectuada posteriormente por Secretaría actualizará masivamente las matrículas de un `grupoCode` especificando el `moduloId` (filtrado a los 2 módulos de su programa) o `periodoId`, resolviendo automáticamente las incidencias pendientes asociadas.
