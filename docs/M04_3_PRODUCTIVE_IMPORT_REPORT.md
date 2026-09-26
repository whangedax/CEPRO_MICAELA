# INFORME TÉCNICO M04.3: IMPORTACIÓN PRODUCTIVA CONTROLADA DE ESTUDIANTES

**Fecha de Ejecución:** 2026-09-11  
**Lote de Importación:** `IMP-BD-2026-001`  
**Estado de Importación:** `M04.3 IMPORTACIÓN DE ESTUDIANTES COMPLETADA — APTO PARA M05`

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO

Se ha completado por primera vez la carga productiva masiva controlada de **personas/estudiantes** a la base de datos `CETPRO_DB` partiendo de los datos auditados en `staging_importaciones` (extraídos de los 12 libros Excel de `sources/raw/BD.zip`).

* **Total Filas Fuente en Staging:** `295`
* **Total Estudiantes Creados en Producción:** `269`
* **Total Matrículas Creadas:** `0` (Estricta postergación para M05)
* **Total Unidades Didácticas Creadas:** `0`
* **Integridad de Fuentes:** Archivos `sources/raw/BD.zip` y `sources/raw/CARRERAS.jpeg` inalterados (SHA-256 inmutable).

---

## 2. DESGLOSE Y AGRUPAMIENTO DE IDENTIDADES

$$\text{PERSONAS\_CANDIDATAS\_TOTALES} = \text{IDENTIDADES\_CONFIRMADAS\_POR\_DOCUMENTO} + \text{IDENTIDADES\_INDETERMINADAS\_SIN\_DOCUMENTO}$$

$$269 = 267 + 2$$

1. **267 Identidades Diferenciadas por Documento No Vacío:**
   * Agrupadas biunívocamente por valor documental textual (`numeroDocumentoOriginal`).
   * Todas las filas con el mismo número de documento apuntan al mismo `idEstudiante` técnico (`EST-IMP-BD-001` a `EST-IMP-BD-267`).
   * **Inclusiones de Documentos Atípicos (21):**
     * **20 documentos de 7 dígitos:** Importados exactamente en 7 caracteres textuales (sin anteponer ceros no presentes en el XML fuente).
     * **1 documento alfanumérico (`O2037218`):** Importado textualmente sin alteración.
     * **Incidencia activa:** `DOCUMENTO_FORMATO_ATIPICO` conservada para revisión humana.

2. **2 Identidades Independientes Sin Documento:**
   * `CORTE ENSAMBLAJE MAÑANA.xlsx` | Hoja 1 | Fila 18: `"MAMANI CHAHUARA, Lizet"` (`EST-IMP-BD-NODOC-268`)
   * `CORTE ENSAMBLAJE MAÑANA.xlsx` | Hoja 1 | Fila 21: `"MAMANI MENDOZA, Fanny"` (`EST-IMP-BD-NODOC-269`)
   * `numeroDocumento`: `""` / `null` (Sin DNI sintético ni falso como `00000000` o `SIN_DNI`).
   * **Incidencia activa:** `DOCUMENTO_VACIO` conservada para revisión humana.

---

## 3. RESPALDO PREVIO Y SIMULACIÓN DRY-RUN

### 3.1 Respaldo Inmutable (`BACKUP_PRE_M04_3`)
* **Momento de Ejecución:** Previo a cualquier escritura en el store `estudiantes`.
* **Identificador de Respaldo:** `BACKUP_PRE_M04_3`.
* **Ubicación:** Store `configuracion` (Clave: `BACKUP_PRE_M04_3`).
* **Verificación:** Transacción de lectura sobre `BACKUP_PRE_M04_3` ejecutada con éxito previo a iniciar la importación.

### 3.2 Simulación Dry-Run
```markdown
ESTUDIANTES_A_CREAR = 269
ESTUDIANTES_A_OMITIR = 0
CONFLICTOS = 6 (Casos ortográficos reales en mismo DNI)
DOCUMENTOS_ATIPICOS = 21 (20 de 7 dígitos + 1 alfanumérico)
SIN_DOCUMENTO = 2
ERRORES_BLOQUEANTES = 0
```

---

## 4. REGLAS APLICADAS Y TRATAMIENTO DE INCIDENCIAS

### 4.1 Conflictos Ortográficos de Nombre (6 Casos Reales / 7 Grupos)
Para los documentos que presentaron variaciones de nombre entre listas (ej: `QUISPE CALLA, MITWARD JESUS` vs `QUISPE CALLA, MITWARS JESUS`):
* Se creó **1 sola persona por documento**.
* Se seleccionó como nombre operativo la **primera aparición física/cronológica** de la fuente.
* Se registraron todas las variantes originales en el arreglo `variantesNombreOriginales`.
* Se mantuvo la incidencia activa **`NOMBRE_DIFERENTE_MISMO_DOCUMENTO`** para auditoría.

### 4.2 Desacoplamiento Académico
* **NO se asignó programa** (`programaId`) a la entidad personal estudiante.
* **NO se asignó módulo** (`Módulo I` o `Módulo II`).
* Toda la procedencia académica permanece en `staging_importaciones` lista para ser convertida en matrículas en **M05**.

---

## 5. MAPA STAGING → ESTUDIANTE Y TRANSACCIONALIDAD

* Cada una de las 295 filas de `staging_importaciones` fue actualizada dentro de la transacción con:
  * `estudianteId`: ID técnico asignado (`EST-IMP-BD-...`).
  * `criterioVinculacion`: `'DOCUMENTO_DIRECTO'` o `'FILA_SIN_DOCUMENTO_INDEPENDIENTE'`.
  * `estadoImportacion`: `'IMPORTADO_ESTUDIANTE'`.
* **Cardinalidad de Relación:** `STAGING N : 1 ESTUDIANTE` (demostrada y corregida por M04.4).
* **Atomicidad:** La inserción de los 269 estudiantes, actualización de los 295 staging y el registro de auditoría de lote se ejecutó en una transacción única `executeTransaction(['estudiantes', 'staging_importaciones', 'auditoria'], 'readwrite', ...)`.
* **Idempotencia:** Reejecutar M04.3 sobre la base importada reconoce los 269 estudiantes existentes y no genera duplicados.

---

## 6. CONTEOS FINALES PRODUCTIVOS

| Entidad / Store | Conteo Esperado | Conteo Real | Estado |
| :--- | :--- | :--- | :--- |
| **INSTITUCIONES** | `1` | `1` | OK |
| **PROGRAMAS** | `7` | `7` | OK |
| **MÓDULOS** | `14` | `14` | OK |
| **PERIODOS** | `0` | `0` | **CORREGIDO POR M04.4 (LIMPIO EN PRODUCCIÓN)** |
| **ESTUDIANTES** | `269` | `269` | **VERIFICADO** |
| **MATRÍCULAS** | `0` | `0` | **POSTERGADO A M05** |
| **UNIDADES** | `0` | `0` | OK |
| **STAGING** | `295` | `295` | **MAPEADO N:1 OK** |

---

## 7. AUDITORÍA Y MATRIZ DE PRUEBAS T-M04.3

Se ejecutó la matriz automatizada `tests/m04_3_tests.js` (T-M04.3-01 a T-M04.3-22):
* **Resultado:** 22 de 22 Pruebas Aprobadas (100% PASS).
* **Demostración de Reversión:** Respaldo `BACKUP_PRE_M04_3` verificado y funcional en entornos de prueba aislados.

---

## 8. CONCLUSIÓN Y ESTADO FINAL

### **M04.3 IMPORTACIÓN DE ESTUDIANTES COMPLETADA — APTO PARA M05**

* Base de datos productiva cargada con **269 estudiantes**.
* **0 matrículas** en producción.
* **M05** autorizado conceptualmente para la creación de la estructura académica de matrículas y asignaciones.
