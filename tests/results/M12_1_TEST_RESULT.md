# Evidencia reproducible — M12.1 TMPL-02

- Fecha: 2026-09-14
- Entorno técnico: Windows, Node.js 24.11.1, `pdf-lib` local 1.17.1
- Ruta de usuario: `http://127.0.0.1:8080/app/index.html#/documentos`
- Fuente: `02_FICHA_DE_MATRICULA.pdf`
- SHA-256: `63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914`
- Datos: fixture sintético `TEST_ONLY`, 1 estudiante
- Persistencia esperada/observada: 0 accesos y 0 escrituras en IndexedDB/store `documentos`

## Pruebas automatizadas

- `node tests/m12_audit_tests.js`: 6/6 aprobadas.
- `node tests/m12_1_tests.js`: 14/14 aprobadas, incluidas 2 regresiones M12.1A sobre la procedencia y preservación de `AÑO 2026 - I`.
- `node scripts/verify_project.js`: 627/627 aprobadas en 25 suites, `FAILED = 0`.

## Validación runtime

- Ruta real `#/documentos`: validada físicamente por el usuario en Microsoft Edge real.
- Selector `TMPL-02 - Ficha de Matrícula [READY]`: visible y funcional.
- Fixture `1 Estudiante`: visible, único y marcado `TEST_ONLY`.
- Botón `Generar vista previa PDF`: genera un Blob y conecta el mismo URL al visor PDF nativo.
- Enlace `Descargar PDF`: presente con nombre `TMPL02_Ficha_Matricula_TEST_ONLY.pdf` y URL Blob local.
- Resultado físico informado: una sola página A4 Landscape; CETPRO, programa, `TEST-0001` y `ESTUDIANTE DE PRUEBA UNO` correctamente posicionados; campos académicos bloqueados vacíos; descarga PDF funcional.

## Reconciliación de procedencia M12.1A

- La extracción textual directa del PDF canónico encuentra una única instancia de `AÑO 2026 - I` antes de ejecutar el renderer.
- La extracción del PDF generado conserva una única instancia de esa leyenda.
- El cuerpo de `renderTMPL02()` no contiene `2026 - I` ni `2026-I`; solo dibuja los cuatro campos variables autorizados.
- La leyenda fija no equivale a un periodo confirmado: `CETPRO_DB` conserva `periodos = 0` y B-007 abierta.
- Emisión oficial TMPL-02: BLOQUEADA. Uso permitido: `TEST_ONLY` / preview.
