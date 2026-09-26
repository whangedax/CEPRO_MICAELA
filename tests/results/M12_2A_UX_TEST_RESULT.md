# Evidencia reproducible — M12.2A-UX

Fecha: 2026-09-14

## Alcance

Normalización de `#/documentos` como flujo productivo común, sin modificar el motor PDF, AutoFit, geometrías, manifiestos ni archivos canónicos. No se implementó TMPL-03 ni M12.2B.

## Auditoría previa de controles

| Clasificación | Controles encontrados antes del cambio | Disposición M12.2A-UX |
|---|---|---|
| A. Productivos | selector de plantilla; búsqueda de matrícula; resultados; selección; resumen; generación TMPL-02 | Conservados dentro del shell común |
| B. Técnicos | selector “Modo de datos”; generación técnica TMPL-02 | Retirados de la UX normal |
| C. Fixtures | TMPL-01 1/10/30; datos sintéticos TMPL-02 | Retirados de `DocumentsView`; conservados en tests |
| D. Debug | modos de render, SIDE_BY_SIDE, OVERLAY, opacidad, segmentación y diagnóstico | Retirados de la UX normal; los motores/pruebas técnicos permanecen |
| E. Visor común | espacio de vista previa, iframe y descarga | Unificados; se añadió acción de impresión del PDF visible |

## Arquitectura verificada

- `TemplateRegistry`: TMPL-01 declara `contextType = GROUP` y `renderer = renderTMPL01`; TMPL-02 declara `contextType = ENROLLMENT` y `renderer = renderTMPL02`.
- `DocumentsView`: selector común, controles por tipo de contexto, resumen común, un botón de generación, visor y acciones de descarga/impresión.
- `DocumentDataService`: único acceso académico de la vista productiva; búsqueda y construcción read-only del contexto por `matriculaId`.
- TMPL-01: mensaje “Nómina pendiente de conexión productiva por grupo.” y generación deshabilitada.

## Pruebas automatizadas

```text
node tests/m12_2a_ux_tests.js
TOTAL=15, PASSED=15, FAILED=0
```

```text
node scripts/verify_project.js
699/699 pruebas exitosas en 29 suites, FAILED=0
```

Se comprobaron los hashes esperados:

- PDF TMPL-01: `938bc91b7b4734aed3c0eb4d73d80a776d14940ca86ce3fe73928cdd65e0e1b2`.
- Geometría TMPL-01: `18bcaf2a0533e33e82b34a85c90aac49b53874cfbd8d42dcb5adef94d28e411f`.
- PDF TMPL-02: `63a712ba063118d7e6147952420f003b0a890a8fa7565c906b2cad37cd12e914`.
- Geometría TMPL-02: `67247c99f7bb51f869b1dc6b0447847c24113af2ef2055a293638e1b9ebaa38b`.

## Validación runtime aislada

Comando: `node scripts/verify_m12_2_runtime.js` sobre `http://127.0.0.1:8080/app/index.html#/documentos`.

- TMPL-02: búsqueda productiva, selección, resumen, botón único, PDF real, iframe y descarga verificados.
- No aparecen selector de modo ni términos técnicos/fixtures en el texto visible.
- TMPL-01: aviso productivo pendiente visible, generación deshabilitada y cero fixtures visibles.
- Conteos antes/después: idénticos; `documentos = 0`, `periodos = 0`.
- Errores de `app/js`: 0.
- Incidencia no bloqueante ya registrada: 404 de `/favicon.ico`.

## Límite

Esta evidencia usa Chromium headless aislado. No constituye validación física en Microsoft Edge; esa comprobación queda a cargo del usuario.
