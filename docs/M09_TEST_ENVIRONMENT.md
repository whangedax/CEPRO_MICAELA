# ENTORNO AISLADO DE PRUEBAS M09 — CETPRO_M09_TEST_DB

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Documento:** Entorno Aislado de Pruebas M09  
**Nombre de DB de Pruebas:** `CETPRO_M09_TEST_DB`  

---

## 1. GARANTÍA DE AISLAMIENTO

El desarrollo y verificación del módulo M09 se ejecuta en un entorno totalmente aislado de la base de datos de producción `CETPRO_DB`.

- **`CETPRO_DB` (Producción):** Permanece 100% intacta. Contiene 269 estudiantes y 295 matrículas activas. `periodoId` y `moduloId` son `null` para las 295 matrículas. CERO registros `TEST_ONLY`.
- **`CETPRO_M09_TEST_DB` (Entorno de Pruebas):** Base de datos en memoria / aislada utilizada para simular matrículas completas con periodos, módulos, unidades, indicadores, asistencias, evaluaciones y registros EFSRT marcados como `TEST_ONLY`.

---

## 2. COMPORTAMIENTO DE TEST_DB EN DIAGNÓSTICO

En `CETPRO_M09_TEST_DB`:
- Se demuestra la capacidad técnica de calcular `technicalContextComplete = true`.
- Sin embargo, `academicClosureAllowed` permanece en **`false`**.
- La dimensión `rulesStatus` permanece en **`BLOCKED`**.
- No se emiten juicios de egreso ni aprobación sobre fixtures de prueba.

---

## 3. PROCEDIMIENTO DE VERIFICACIÓN READ-ONLY

Para demostrar que M09 es 100% read-only:
1. Se obtienen los conteos de todos los stores de `CETPRO_DB` antes de abrir `#/cierre`.
2. Se navega a `#/cierre` y se consulta el diagnóstico técnico de una o múltiples matrículas.
3. Se vuelven a obtener los conteos de todos los stores de `CETPRO_DB`.
4. **Resultado obligatorio:** Ningún conteo cambia (0 deltas en todos los stores, incluyendo `auditoria`).
