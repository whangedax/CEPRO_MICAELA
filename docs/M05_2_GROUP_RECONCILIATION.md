# INFORME DE RECONCILIACIÓN DE GRUPOS Y MATRÍCULAS PRODUCTIVAS (M05.2)

**Fecha:** 2026-09-11  
**Módulo:** `M05.2 — RECONCILIACIÓN DE GRUPOS Y MATRÍCULAS PRODUCTIVAS`  
**Estado:** `M05.2 VERIFICADO — GRUPOS Y MATRÍCULAS RECONCILIADOS`

---

## 1. IDENTIFICACIÓN DEL ORIGEN DE LA DISCREPANCIA (CAUSA RAÍZ)

### Causa Raíz Identificada:
- En [app/js/services/enrollment-service.js](file:///c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/app/js/services/enrollment-service.js), la constante de datos estáticos `FILE_GROUP_MAP` contenía valores de propiedad `count` prefijados manualmente (`30, 25, 14, 45, 23, 24, 30, 30, 23, 18, 13, 20`).
- Si bien la suma de ambos vectores daba 295 matrículas totales, dichos números hardcodeados no reflejaban el conteo físico exacto de filas staging por archivo extraídas en la auditoría física XML de M04.1.
- Además, en la asignación predeterminada de metadatos se inferían turnos y modalidades para archivos que carecían de evidencia explícita en su denominación o contenido original.

### Medida de Reparación Transaccional Realizada:
- Se creó la rutina de respaldo `createPreM05_2Backup()` registrando el snapshot inmutable `BACKUP_PRE_M05_2` en el store `configuracion`.
- Se corrigió `FILE_GROUP_MAP` en `enrollment-service.js` para derivar determinísticamente la relación `idStaging` $\rightarrow$ `archivoOrigen` $\rightarrow$ `grupoCode`.
- Se eliminaron todas las inferencias de Turno y Modalidad no respaldadas por evidencia explícita de fuente, asignando `PENDIENTE` a los faltantes.

---

## 2. TABLA DE RECONCILIACIÓN FÍSICA FRENTE A DATOS PRODUCTIVOS (295 MATRÍCULAS)

| GRUPO_TÉCNICO | ARCHIVO_ORIGEN | PROGRAMA OFICIAL | STAGING_ESPERADO | STAGING_REAL | MATRICULAS_REALES | DIFERENCIA | TURNO_CONFIRMADO | MODALIDAD_CONFIRMADA |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GRP-BD-001` | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | PELUQUERÍA Y BARBERÍA | 36 | 36 | 36 | 0 | MAÑANA | `PENDIENTE` |
| `GRP-BD-002` | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | PELUQUERÍA Y BARBERÍA | 15 | 15 | 15 | 0 | TARDE | `PENDIENTE` |
| `GRP-BD-003` | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | PELUQUERÍA Y BARBERÍA | 24 | 24 | 24 | 0 | NOCHE | `PENDIENTE` |
| `GRP-BD-004` | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | MECÁNICA AUTOMOTRIZ | 17 | 17 | 17 | 0 | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-005` | `3. MEC MOTOS PROF ANIBAL.xlsx` | MECÁNICA DE MOTOS Y VEHÍCULOS AFINES | 25 | 25 | 25 | 0 | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-006` | `CARPENTERIA METALICA.xlsx` | CARPINTERÍA METÁLICA | 20 | 20 | 20 | 0 | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-007` | `COMPUTACION PRESENCIAL 2026.xlsx` | COMPUTACIÓN E INFORMÁTICA | 26 | 26 | 26 | 0 | `PENDIENTE` | PRESENCIAL |
| `GRP-BD-008` | `COMPUTACION VIRTUAL 2026 -.xlsx` | COMPUTACIÓN E INFORMÁTICA | 70 | 70 | 70 | 0 | `PENDIENTE` | VIRTUAL |
| `GRP-BD-009` | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | CORTE Y ENSAMBLAJE | 28 | 28 | 28 | 0 | MAÑANA | `PENDIENTE` |
| `GRP-BD-010` | `CORTE  ENSAMBLAJE NOCHE.xlsx` | CORTE Y ENSAMBLAJE | 7 | 7 | 7 | 0 | NOCHE | `PENDIENTE` |
| `GRP-BD-011` | `CORTE  ENSAMBLAJE TARDE.xlsx` | CORTE Y ENSAMBLAJE | 20 | 20 | 20 | 0 | TARDE | `PENDIENTE` |
| `GRP-BD-012` | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | MANTENIMIENTO DE SISTEMAS ELÉCTRICOS | 7 | 7 | 7 | 0 | `PENDIENTE` | `PENDIENTE` |
| **TOTAL** | **12 Archivos Excel** | **7 Programas Oficiales** | **295** | **295** | **295** | **0** | | |

---

## 3. AUDITORÍA DE REGISTRO D-007 Y REGLAS DE DECISIONES

- Se corrigió la procedencia documental de la decisión `D-007` en el reporte de auditoría: fue establecida en el módulo `M01` (Núcleo Local y Estructura de Excepciones/Auditoría) y NO en el módulo futuro M07.
- Se agregaron las decisiones inmutables `D-031` (Reconciliación determinista de conteos por grupo `[36,15,24,17,25,20,26,70,28,7,20,7]`) y `D-032` (Eliminación de inferencias en turno y modalidad).
- Se confirmó la unicidad absoluta de las 32 decisiones registradas (`D-001` a `D-032`) y de las 14 incidencias en `ISSUES.md`.

---

## 4. CONTEOS PRODUCTIVOS FINALES TRAS M05.2

* **INSTITUCIONES:** `1`
* **PROGRAMAS:** `7`
* **MÓDULOS:** `14`
* **PERIODOS:** `0`
* **ESTUDIANTES:** `269`
* **MATRÍCULAS:** `295`
* **UNIDADES:** `0`
* **STAGING:** `295`

Vector exacto de matrículas por Grupo Técnico:  
`[36, 15, 24, 17, 25, 20, 26, 70, 28, 7, 20, 7]` (Suma = 295)
