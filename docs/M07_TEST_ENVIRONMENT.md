# Entorno de Pruebas Aislado — M07 (CETPRO_M07_TEST_DB)

## 1. Aislamiento Estricto de Datos

Para verificar la totalidad de los flujos del motor, servicios e interfaz de evaluación sin contaminar ni alterar la base de datos productiva (`CETPRO_DB`), se utiliza exclusivamente la base de datos aislada:

```
CETPRO_M07_TEST_DB
```

Todos los registros generados o utilizados dentro de esta base poseen la marca explícita:

```
TEST_ONLY
```

### Regla Inviolable de Producción:
Ningún fixture, periodo de prueba, grupo ficticio, unidad o evaluación registrada en `CETPRO_M07_TEST_DB` será transferido ni insertado jamás en `CETPRO_DB`.

---

## 2. Fixtures de Pruebas (`TEST_ONLY`)

El entorno aislado contiene la siguiente estructura ficticia para demostrar el flujo operativo completo:

| ENTIDAD | ID DE PRUEBA | ATRIBUTOS | MARCA |
|---|---|---|---|
| **PERIODO** | `PER-TEST-2026-I` | Periodo Lectivo 2026-I (Aislado) | `TEST_ONLY` |
| **GRUPO** | `GRP-BD-001` | Automotriz - Turno Mañana | `TEST_ONLY` |
| **MÓDULO** | `MOD-TEST-001` | Mantenimiento de Sistemas de Transmisión | `TEST_ONLY` |
| **UNIDAD** | `UNID-TEST-001` | UD1: Diagnóstico de Sistemas | `TEST_ONLY` |
| **UNIDAD** | `UNID-TEST-002` | UD2: Mantenimiento Preventivo | `TEST_ONLY` |
| **UNIDAD** | `UNID-TEST-007` | UD7: Reparación Avanzada | `TEST_ONLY` |
| **UNIDAD EXTRA** | `UNID-TEST-008` | UD8: Unidad Especial Extra (Fuera de UD1–UD7) | `TEST_ONLY` |
| **INDICADOR** | `IND-TEST-001` | Identifica componentes del sistema de transmisión | `TEST_ONLY` |
| **INDICADOR** | `IND-TEST-002` | Ejecuta pruebas de rendimiento | `TEST_ONLY` |
| **INDICADOR EXTRA** | `IND-TEST-008` | Demostración fuera de UD1–UD7 | `TEST_ONLY` |
| **MATRÍCULAS** | `MAT-TEST-GRP-BD-001-001` a `005` | Matrículas de prueba asociadas a `GRP-BD-001` | `TEST_ONLY` |

---

## 3. Demostración de Unidad Extra (`UNID-TEST-008`)

El motor de datos (`EvaluationService` y `EvaluationRepository`) procesa evaluaciones para la unidad didáctica `UNID-TEST-008` e indicador `IND-TEST-008`:
- Se comprueba que el motor es **100% genérico** y no limita la evaluación a UD1–UD7.
- Se confirma que **NO** se crea ninguna plantilla documental oficial ni plantilla `As-8`/`UD8`.

---

## 4. Guía de Ejecución Visual y Pruebas Automatizadas

1. **Pruebas Automatizadas**:
   ```bash
   node tests/m07_tests.js
   node scripts/verify_project.js
   ```
2. **Verificación Visual**:
   - Abrir el servidor local de desarrollo: `http://127.0.0.1:8080/app/index.html`
   - Navegar a `#/registro` -> Pestaña **EVALUACIÓN (M07)**.
   - Alternar al botón **Modo: ENTORNO AISLADO (TEST_DB)**.
   - Probar el flujo completo: Selección de contexto, carga de matrículas, registro masivo idempotente por `batchId`, edición explícita con bitácora de auditoría y anulación.
