# Resultado de pruebas — INTEGRATION-GATE-01

Fecha: 2026-09-14  
Resultado: **APROBADO — 13/13 pruebas específicas, 0 fallos**

Verificación integral: **712/712 pruebas exitosas en 30 suites; FAILED = 0**.

## Causa corregida

El flujo anterior mostraba resultados como filas accionables sin una señal inequívoca de selección, conservaba simultáneamente un ID y un contexto completo, y terminaba silenciosamente si faltaba contexto al pulsar Generar. Además, TMPL-01 tenía `disabled` pero conservaba apariencia primaria. Esto hacía posible interpretar una búsqueda como selección y un clic sin salida como fallo del PDF.

La reparación introduce estados explícitos, una acción visible `Seleccionar`, resumen `MATRÍCULA SELECCIONADA`, almacenamiento exclusivo de `matriculaId`, reconstrucción/validación del contexto al generar y error visible `No se pudo generar la ficha: ...`. TMPL-01 usa estado visual secundario e inactivo.

## Casos específicos

| ID | Verificación | Resultado |
|---|---|---|
| T-IG01-01 | TMPL-02 sin selección mantiene `disabled` real | PASSED |
| T-IG01-02 | Buscar no equivale a seleccionar | PASSED |
| T-IG01-03 | Seleccionar guarda únicamente `matriculaId` | PASSED |
| T-IG01-04 | Resumen corresponde al ID seleccionado | PASSED |
| T-IG01-05 | Generar se habilita solo en `SELECTED` | PASSED |
| T-IG01-06 | Generar llama `buildEnrollmentContext` con el ID elegido | PASSED |
| T-IG01-07 | El contexto elegido llega al PDF y al visor | PASSED |
| T-IG01-08 | Error visible y registro técnico en consola | PASSED |
| T-IG01-09 | TMPL-01 realmente deshabilitada y visualmente inactiva | PASSED |
| T-IG01-10 | TMPL-01 no usa fixtures productivos | PASSED |
| T-IG01-11 | Cambiar plantilla limpia la selección | PASSED |
| T-IG01-12 | Buscar B invalida una selección previa A | PASSED |
| T-IG01-13 | No se genera con contexto de otra plantilla | PASSED |

## Runtime aislado

- Búsqueda y selección de `MAT-IMP-BD-001`: correctas.
- PDF: Blob `application/pdf`, tamaño positivo, iframe Blob y descarga disponibles.
- TMPL-01: mensaje de pendiente productivo y botón realmente deshabilitado.
- Persistencia documental: conteos idénticos antes/después; `documentos = 0`, `periodos = 0`.
- Errores de aplicación JavaScript: 0. Se conserva únicamente el 404 cosmético de `favicon.ico` (I-050).

La auditoría completa de los 11 módulos se documenta en `docs/INTEGRATION_GATE_01_OPERATIONAL_AUDIT.md`.
