# Evidencia reproducible — M12.1B

- Fecha: 2026-09-14
- Ruta de usuario: `http://127.0.0.1:8080/app/index.html#/documentos`
- Fuente institucional: `FUENTE_FISICA_INSTITUCIONAL_2026`
- PDF canónico TMPL-02 SHA-256: `63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914`
- Persistencia: reconciliación idempotente de `INST-001`; no crea una segunda institución.

## Pruebas automatizadas

- `node tests/m12_1b_tests.js`: 17/17 aprobadas, `FAILED = 0`.
- `node scripts/verify_project.js`: 644/644 aprobadas en 26 suites, `FAILED = 0`.

## Alcance visual

- Cuatro campos M12.1 conservados.
- Nuevos campos: Tipo de Gestión `PÚBLICA` y Resolución Directorial `R.D. N.º 3367-DREP / R.D. N.º 774-DREP`.
- DRE, Código Modular, Departamento, Provincia, Distrito, periodos, módulo y unidades continúan vacíos.
- `AÑO 2026 - I` continúa como contenido fijo del PDF canónico bajo I-046; no representa un periodo en `CETPRO_DB`.

## Estado de validación

- Comprobación técnica en `#/documentos`: TMPL-02 seleccionada, visor PDF Blob y descarga Blob activos.
- B-002, B-004 y B-007 visibles en la UX; 0 errores y 0 advertencias de consola durante la comprobación.
- Render rasterizado de QA: una página A4 Landscape, Gestión y Resolución dentro de sus celdas, sin solapamiento y con los campos bloqueados vacíos.
- Validación física final en Microsoft Edge: pendiente del usuario; no se declara completada.
