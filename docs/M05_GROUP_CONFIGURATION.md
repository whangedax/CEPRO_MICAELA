# GUÍA Y PROTOCOLO DE CONFIGURACIÓN POR GRUPO TÉCNICO DE ORIGEN (M05.1 / M05.2)

**Fecha:** 2026-09-11  
**Módulo:** `M05.2 — RECONCILIACIÓN DE GRUPOS Y MATRÍCULAS PRODUCTIVAS`

---

## 1. OBJETIVO

Proporcionar a Secretaría un mecanismo administrativo controlado y seguro para asignar el **Módulo Curricular**, el **Periodo Lectivo**, el **Turno** y la **Modalidad** a las matrículas pertenecientes a un **Grupo Técnico de Origen**, garantizando auditoría, confirmación explícita y protección contra sobrescritura accidental.

---

## 2. TABLA OFICIAL RECONCILIADA DE LOS 12 GRUPOS TÉCNICOS

| GRUPO_TÉCNICO | ARCHIVO_ORIGEN | PROGRAMA | CANTIDAD_MATRÍCULAS | TURNO_CONFIRMADO | MODALIDAD_CONFIRMADA | PROFESOR_FUENTE | MÓDULO | PERIODO |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GRP-BD-001` | `1.A PB TURNO MAÑANA  PROF. ALE.xlsx` | PELUQUERÍA Y BARBERÍA | 36 | MAÑANA | `PENDIENTE` | PROF. ALE | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-002` | `1.B PB TURNO TARDE  PROF. AZU.xlsx` | PELUQUERÍA Y BARBERÍA | 15 | TARDE | `PENDIENTE` | PROF. AZU | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-003` | `1.C PB TURNO NOCHE  PROF. FIDE.xlsx` | PELUQUERÍA Y BARBERÍA | 24 | NOCHE | `PENDIENTE` | PROF. FIDE | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-004` | `2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx` | MECÁNICA AUTOMOTRIZ | 17 | `PENDIENTE` | `PENDIENTE` | PROF EDGAR | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-005` | `3. MEC MOTOS PROF ANIBAL.xlsx` | MECÁNICA DE MOTOS Y VEHÍCULOS AFINES | 25 | `PENDIENTE` | `PENDIENTE` | PROF ANIBAL | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-006` | `CARPENTERIA METALICA.xlsx` | CARPINTERÍA METÁLICA | 20 | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-007` | `COMPUTACION PRESENCIAL 2026.xlsx` | COMPUTACIÓN E INFORMÁTICA | 26 | `PENDIENTE` | PRESENCIAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-008` | `COMPUTACION VIRTUAL 2026 -.xlsx` | COMPUTACIÓN E INFORMÁTICA | 70 | `PENDIENTE` | VIRTUAL | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-009` | `CORTE  ENSAMBLAJE MAÑANA.xlsx` | CORTE Y ENSAMBLAJE | 28 | MAÑANA | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-010` | `CORTE  ENSAMBLAJE NOCHE.xlsx` | CORTE Y ENSAMBLAJE | 7 | NOCHE | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-011` | `CORTE  ENSAMBLAJE TARDE.xlsx` | CORTE Y ENSAMBLAJE | 20 | TARDE | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |
| `GRP-BD-012` | `ELECTRICIDAD  PROF. SERAFIN  2026.xlsx` | MANTENIMIENTO DE SISTEMAS ELÉCTRICOS | 7 | `PENDIENTE` | `PENDIENTE` | PROF. SERAFIN | `PENDIENTE` | `PENDIENTE` |
| **TOTAL** | **12 Archivos Excel** | **7 Programas Oficiales** | **295** | | | | | |

---

## 3. REGLAS DE SEGURIDAD E INTEGRIDAD DE GRUPO

1. **Denominación Técnica:**
   - Los códigos `GRP-BD-001` a `GRP-BD-012` representan **Grupos Técnicos de Origen** derivados de las 12 listas Excel de `BD.zip`. NO constituyen clasificaciones institucionales ni secciones oficiales definitivas.

2. **Filtrado Exclusivo de Módulos:**
   - Al seleccionar un grupo técnico en la interfaz, el selector de módulos se filtra dinámicamente para mostrar **únicamente los 2 módulos pertenecientes al programa oficial del grupo**.

3. **Sin Preselección Automática:**
   - Ningún módulo se encuentra preseleccionado por defecto. Secretaría debe elegir explícitamente la opción adecuada.

4. **Gestión de Periodos Academicos:**
   - Si `PERIODOS = 0`, la interfaz indica visiblemente **"Periodo: Pendiente"**. No se crean periodos sintéticos o automáticos (como `2026-I`).

5. **Protección contra Sobrescritura:**
   - Si un grupo ya posee un módulo o periodo asignado previamente, el sistema despliega una advertencia en amarillo.

6. **Vista Previa y Confirmación Explícita:**
   - Antes de ejecutar la transacción, el sistema solicita confirmación formal mediante cuadro de diálogo indicando la cantidad exacta de matrículas afectadas.
