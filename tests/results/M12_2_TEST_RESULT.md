# Evidencia reproducible — M12.2A DocumentDataService

Fecha: 2026-09-14

## Alcance

- `DocumentDataService` exclusivamente de lectura.
- TMPL-02 productiva seleccionada por `matriculaId` en `#/documentos`.
- Joins autoritativos `matricula.estudianteId -> estudiante.id` y `matricula.programaId -> programa.id`.
- B-002, B-004 y B-007 permanecen abiertas.
- TMPL-01 solo se comprueba como regresión; M12.2B no se implementa.

## Datos de prueba

La suite reconstruye en memoria el lote real trazable `IMP-BD-2026-001`, sin abrir ni escribir `CETPRO_DB`:

- 295 filas de staging.
- 269 estudiantes.
- 295 matrículas.
- 295 `moduloId = null`.
- 295 `periodoId = null`.

Se seleccionan dinámicamente tres casos reales y los documentos permanecen enmascarados en logs:

1. estudiante con documento y fecha confirmada;
2. estudiante sin fecha confirmada;
3. estudiante relacionado con múltiples matrículas.

También se comprueba un registro real sin documento.

## Resultado aislado

Comando:

```text
node tests/m12_2_tests.js
```

Resultado: `TOTAL=20, PASSED=20, FAILED=0`.

Regresión integral:

```text
node scripts/verify_project.js
```

Resultado: `684/684` pruebas exitosas en 28 suites, `FAILED=0`.

## Garantías verificadas

- Documento y nombre provienen del estudiante resuelto por ID.
- Programa proviene del programa resuelto por ID.
- No se mezclan identidades entre matrículas múltiples.
- Documento o fecha ausentes permanecen como `""`.
- El renderer ya no contiene ni inyecta `15/03/2005`.
- `module = {}`, `period = {}` y `units = []` bajo los bloqueos actuales.
- Cero llamadas de escritura en los repositorios instrumentados.
- TMPL-02 produce Blob `application/pdf` con contexto productivo.
- TMPL-01 continúa produciendo un PDF de una página.

## Límite de validación

Los conteos anteriores fueron verificados sobre la fuente real reconstruida en memoria. No constituyen una nueva lectura física del perfil de Microsoft Edge del usuario. La validación visual y física final en Edge queda pendiente.

## Verificación runtime aislada

Comando: `node scripts/verify_m12_2_runtime.js`.

- URL: `http://127.0.0.1:8080/app/index.html#/documentos`.
- Modo predeterminado: `PRODUCTIVE`.
- Botón inicialmente deshabilitado y ausencia de `TEST-0001` visible.
- Búsqueda, selección por matrícula y resumen previo funcionales.
- Iframe Blob, enlace de descarga y MIME `application/pdf` verificados.
- Conteos antes/después de generar: idénticos; `documentos = 0`, `periodos = 0`.
- Errores de `app/js`: 0.
- Incidencia ajena al flujo: 404 de `/favicon.ico`.
