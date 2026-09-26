# Guía del Entorno Aislado de Pruebas `CETPRO_M08_TEST_DB` (M08)

## 1. Propósito de Aislamiento
Garantizar que todo el desarrollo funcional, pruebas de laboratorio y validaciones del módulo M08 (EFSRT) se ejecuten en una base de datos aislada en memoria o con `dbOverride`, manteniendo la base de datos productiva `CETPRO_DB` con `EFSRT = 0` y `PERIODOS = 0`.

---

## 2. Configuración de Base de Datos de Prueba
- **Nombre en Pruebas:** `CETPRO_M08_TEST_DB` / `MockIndexedDBStore`
- **Prefijo de Fixtures:** `TEST_ONLY` / `MAT-TEST-` / `MOD-TEST-`
- **Persistencia Productiva:** CERO registros `TEST_ONLY` en `CETPRO_DB`.

---

## 3. Matriz de Cobertura de Pruebas M08
Las 30 pruebas automatizadas en `tests/m08_tests.js` cubren:
- Integridad productiva (`T-M08-01`, `T-M08-28`, `T-M08-29`).
- Aislamiento transaccional (`T-M08-02`, `T-M08-05`).
- Bloqueo por prerrequisitos académicos (`T-M08-03`, `T-M08-04`).
- Validaciones contractuales de horas, fechas y notas (`T-M08-07` a `T-M08-17`).
- Formato de ID técnico robusto (`T-M08-18`).
- Desacoplamiento de creación, edición y anulación (`T-M08-19` a `T-M08-22`).
- Multiplicidad técnica y flexibilidad de índices (`T-M08-23`, `T-M08-24`).
- Respeto al bloqueo B-005 (`T-M08-25` a `T-M08-27`).
- Desacoplamiento de UI e integración de regresión (`T-M08-06`, `T-M08-30`).
