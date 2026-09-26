# INFORME DE AUDITORÍA POST-MATRÍCULA Y REVISIÓN DE INTEGRIDAD (M05.1)

**Fecha:** 2026-09-11  
**Módulo:** `M05.1 — CIERRE DE MATRÍCULAS Y PREPARACIÓN DE CONFIGURACIÓN ACADÉMICA`  
**Estado:** `M05.1 VERIFICADO — MATRÍCULAS ÍNTEGRAS Y CONFIGURACIÓN MANUAL PREPARADA`

---

## 1. AUDITORÍA DE DEISIONES (`docs/DECISIONS.md`)

Se realizó la auditoría completa de inmutabilidad y unicidad de IDs de decisiones en `docs/DECISIONS.md`. Cada decisión registrada posee un identificador único correlativo (`D-001` al `D-030`) sin colisiones entre módulos.

| ID | Módulo Origen | Descripción | Estado | Duplicado (Sí/No) |
| :--- | :--- | :--- | :--- | :---: |
| `D-001` | M01 | Migrar a HTML/CSS/JS puro + IndexedDB | CONFIRMADA | No |
| `D-002` | M01 | Mantener Persona/Estudiante separada de Matrícula | CONFIRMADA | No |
| `D-003` | M01 | No asignar Módulo I/II por inferencia | CONFIRMADA | No |
| `D-004` | M01 | Conservar paquete Excel/VBA como legado | CONFIRMADA | No |
| `D-005` | M01 | Definir IDs estables con prefijos de entidad | CONFIRMADA | No |
| `D-006` | M01 | Esquema IndexedDB `CETPRO_DB` v1 con 17 stores | CONFIRMADA | No |
| `D-007` | M07 | Auditoría append-only y categorías de excepción | CONFIRMADA | No |
| `D-008` | M00 | Prohibir invención de plantilla As-7 | CONFIRMADA | No |
| `D-009` | M00.1 | Aprobar inventario y mapeo M00.1 | CONFIRMADA | No |
| `D-010` | M01 | Hash routing nativo (`#/seccion`) | CONFIRMADA | No |
| `D-011` | M01 | Servidor estático Node.js `scripts/dev-server.js` | CONFIRMADA | No |
| `D-012` | M01 | Preservar discrepancia 295 vs 300 para M04 | CONFIRMADA | No |
| `D-013` | M02 | Inicialización idempotente de catálogo oficial M02 | CONFIRMADA | No |
| `D-014` | M02 | Preservar `nombreOriginalFuente` en catálogo | CONFIRMADA | No |
| `D-015` | M02 | Validación cronológica en periodos | CONFIRMADA | No |
| `D-016` | M03 | Adopción obligatoria de `escapeHtml()` en UI | CONFIRMADA | No |
| `D-017` | M03 | Pruebas M03 en base aislada `CETPRO_TEST_DB` | CONFIRMADA | No |
| `D-018` | M03 | Normalización NFD exclusivamente para búsquedas | CONFIRMADA | No |
| `D-019` | M04 | Conciliación de recuento 295 vs 300 matrículas | CONFIRMADA | No |
| `D-020` | M04 | Conciliación de identidades 268 vs 274 personas | CONFIRMADA | No |
| `D-021` | M04 | Ingesta aislada en `staging_importaciones` | CONFIRMADA | No |
| `D-022` | M04.2 | Cierre matemático M04.2 (269 candidatas) | CONFIRMADA | No |
| `D-023` | M04.3 | Importación productiva M04.3 (269 estudiantes) | CONFIRMADA | No |
| `D-024` | M04.3 | Postergación de matrículas a M05 (`MATRICULAS = 0`) | CONFIRMADA | No |
| `D-025` | M04.4 | Cardinalidad `STAGING N:1 ESTUDIANTE` en M04.4 | CONFIRMADA | No |
| `D-026` | M04.4 | Snapshot inmutable `BACKUP_PRE_M04_3` | CONFIRMADA | No |
| `D-027` | M05 | Importación atómica 1:1 de 295 matrículas desde Staging | CONFIRMADA | No |
| `D-028` | M05 | Postergación de módulo/periodo (`moduloId = null`, `periodoId = null`) | CONFIRMADA | No |
| `D-029` | M05.1 | Clasificación de agrupaciones fuente como "Grupos Técnicos de Origen" | CONFIRMADA | No |
| `D-030` | M05.1 | Habilitación de asignación diferida manual por grupo en Secretaría | CONFIRMADA | No |

---

## 2. AUDITORÍA DE INCIDENCIAS (`docs/ISSUES.md`)

Se auditó `docs/ISSUES.md` para garantizar que la incidencia declarada en M05.1 conserve un ID inmutable correlativo (`I-013`) sin sobrescribir o alterar el registro cerrado de `I-012` (Cierre post-importación M04.4).

| ID | Fecha | Descripción | Estado | Resolución / Acción |
| :--- | :--- | :--- | :--- | :--- |
| `I-012` | 2026-09-11 | Cierre de integridad post-importación M04.4 y auditoría de periodos/cardinalidad | `RESUELTO (M04.4)` | Verificado `PERIODOS = 0`, cardinalidad `STAGING N:1 ESTUDIANTE` demostrada al 100%. |
| `I-013` | 2026-09-11 | Matrículas pendientes de configuración de módulo y periodo | `ABIERTO (M05.1)` | 295 matrículas cargadas con `moduloId = null` y `periodoId = null`. Requieren asignación explícita por grupo en Secretaría. |

---

## 3. TABLA AUDITADA DE LOS 12 GRUPOS TÉCNICOS DE ORIGEN

| Grupo Técnico | Archivo Origen | Programa | Cantidad Matrículas | Turno Confirmado | Modalidad Confirmada | Profesor Fuente | Módulo | Periodo |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GRP-BD-001` | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | PELUQUERÍA Y BARBERÍA | 30 | MAÑANA | PRESENCIAL | PROF. ALE | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-002` | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | PELUQUERÍA Y BARBERÍA | 25 | TARDE | PRESENCIAL | PROF. AZU | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-003` | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | PELUQUERÍA Y BARBERÍA | 14 | NOCHE | PRESENCIAL | PROF. FIDE | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-004` | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | MECÁNICA AUTOMOTRIZ | 45 | MAÑANA | PRESENCIAL | PROF EDGAR | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-005` | `3. MEC MOTOS PROF ANIBAL.xlsx` | MECÁNICA DE MOTOS Y VEHÍCULOS AFINES | 23 | `PENDIENTE` | PRESENCIAL | PROF ANIBAL | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-006` | `CARPENTERIA METALICA.xlsx` | CARPINTERÍA METÁLICA | 24 | `PENDIENTE` | PRESENCIAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-007` | `COMPUTACION PRESENCIAL 2026.xlsx` | COMPUTACIÓN E INFORMÁTICA | 30 | MAÑANA | PRESENCIAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-008` | `COMPUTACION VIRTUAL 2026 -.xlsx` | COMPUTACIÓN E INFORMÁTICA | 30 | `PENDIENTE` | VIRTUAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-009` | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | CORTE Y ENSAMBLAJE | 23 | MAÑANA | PRESENCIAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-010` | `CORTE  ENSAMBLAJE NOCHE.xlsx` | CORTE Y ENSAMBLAJE | 18 | NOCHE | PRESENCIAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-011` | `CORTE  ENSAMBLAJE TARDE.xlsx` | CORTE Y ENSAMBLAJE | 13 | TARDE | PRESENCIAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-012` | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | MANTENIMIENTO DE SISTEMAS ELÉCTRICOS | 20 | MAÑANA | PRESENCIAL | PROF. SERAFIN | `PENDIENTE` | `PENDIENTE` |
| **TOTAL** | **12 Archivos Excel** | **7 Programas Oficiales** | **295** | | | | | |

---

## 4. INTEGRIDAD DE CONTEOS PRODUCTIVOS POST-M05.1

Sin intervención manual del usuario, la base productiva `CETPRO_DB` mantiene exactamente los conteos esperados:

* **INSTITUCIONES:** `1`
* **PROGRAMAS:** `7`
* **MÓDULOS:** `14`
* **PERIODOS:** `0`
* **ESTUDIANTES:** `269`
* **MATRÍCULAS:** `295`
* **UNIDADES:** `0`
* **STAGING:** `295`
