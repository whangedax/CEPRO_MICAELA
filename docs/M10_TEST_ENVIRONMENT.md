# ENTORNO AISLADO DE PRUEBAS M10 — CETPRO_M10_TEST_DB

**Proyecto:** SISTEMA ACADÉMICO CETPRO  
**Documento:** Guía del Entorno Aislado de Pruebas M10  
**Nombre de DB de Pruebas:** `CETPRO_M10_TEST_DB`  

---

## 1. AISLAMIENTO TOTAL DE PRODUCCIÓN

El desarrollo y verificación de la vertical slice de M10 se ejecuta exclusivamente en el entorno aislado `CETPRO_M10_TEST_DB`.

- **`CETPRO_DB` (Producción):** Permanece 100% intacta. Contiene 269 estudiantes y 295 matrículas. Store `documentos` en 0 registros emitidos. CERO registros `TEST_ONLY`.
- **`CETPRO_M10_TEST_DB` (Pruebas M10):** Fixtures de prueba aislados en memoria marcados explícitamente como `TEST_ONLY`.

---

## 2. PREVIEW NO PERSISTE EN STORE DOCUMENTOS

En M10 se establece formalmente que:
- **`DRAFT_PREVIEW`** y **`TEST_PREVIEW`** son operaciones de cálculo en memoria.
- **NO escriben registros en IndexedDB** (`isPersisted = false`).
- No generan `fechaEmision`, `hashEmitido` ni `operador` como si hubiesen sido emitidos.
- El contrato de la entidad `DOCUMENTOS` representa exclusivamente **emisiones oficiales**, las cuales permanecen bloqueadas.
