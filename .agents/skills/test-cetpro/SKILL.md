---
name: test-cetpro
description: Ejecuta pruebas funcionales y de regresión del Sistema CETPRO y registra evidencia reproducible.
---
# Test CETPRO

1. Leer `tests/TEST_MATRIX.md`.
2. Usar datos sintéticos salvo que el caso exija explícitamente datos reales ya validados.
3. Probar UI, consola, IndexedDB, recarga y errores.
4. Verificar que no haya llamadas de red obligatorias.
5. Para impresión, revisar vista previa y CSS de impresión; la impresión física requiere validación humana.
6. Registrar resultado en `tests/results/` y actualizar el estado del módulo.
