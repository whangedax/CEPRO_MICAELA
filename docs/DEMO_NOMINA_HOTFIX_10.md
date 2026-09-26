# DEMO-NOMINA-HOTFIX-10

Fecha: 2026-09-16

## Resultado A–N

- **A. Causa raíz:** el PDF se generaba, pero el visor se insertaba después de la tabla de 25 estudiantes, fuera del viewport, sin estado visible de progreso/resultado/error.
- **B. Archivos corregidos:** `app/js/ui/nominas-view.js`; regresión `tests/demo_nomina_hotfix_10.regression.js`; runner seguro y documentación del gate.
- **C. Ruta final:** `http://127.0.0.1:8081/#/nominas?groupId=GAC-DEMO-B`, alcanzada desde `#/demo → Grupos → Nómina`.
- **D. groupId DEMO B:** `GAC-DEMO-B`.
- **E. Cantidad resuelta:** 25 matrículas y 25 estudiantes.
- **F. Preflight:** aprobado, 25/30; no requiere periodo/módulo oficial en DEMO.
- **G. Blob PDF:** válido, cabecera `%PDF-`.
- **H. Visor:** visible y desplazado al área activa inmediatamente después de generar.
- **I. Descarga:** `DEMO_NOMINA_BORRADOR_GRUPO_DEMO_B.pdf` disponible.
- **J. Impresión:** botón y handler comprobados en Edge.
- **K. DEMO A:** 40 matrículas; TMPL-01 conserva `CAPACITY_EXCEEDED`; reporte administrativo completo contiene 40.
- **L. Pruebas:** suite dedicada Edge 22/22; regresión segura 511/511 en 18 suites.
- **M. Errores JS propios:** 0; solicitudes externas: 0.
- **N. Candidata real:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos, 0 unidades, 0 asistencia; fingerprint antes/después idéntico.

Producción continúa en `CETPRO_DB` schema v1. No se ejecutó migración, restore ni emisión oficial.
