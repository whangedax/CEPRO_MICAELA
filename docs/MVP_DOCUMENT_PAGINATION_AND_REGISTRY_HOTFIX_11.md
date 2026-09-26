# MVP-DOCUMENT-PAGINATION-AND-REGISTRY-HOTFIX-11

Fecha: 2026-09-16

## Resultado A–T

- **A. Causa raíz del Registro:** el Blob se generaba, pero `register-output` estaba después de la tabla larga y no existía estado visible; la acción parecía inerte.
- **B. Solución:** visor antes de la tabla, scroll automático, estado accesible, errores visibles, descarga e impresión; nómina administrativa multipágina separada del renderer canónico.
- **C. Máximo probado:** 300 matrículas.
- **D. Política:** `DocumentPaginationPolicy` con `SINGLE_PAGE_FIXED`, `PAGINATE_BY_TEMPLATE_COPY`, `FIXED_PAGE_COUNT`, `SINGLE_RECORD` y `BLOCK_ON_OVERFLOW`; entradas explícitas TMPL-01–21.
- **E. DEMO B:** 25 → 1 página.
- **F. DEMO A:** 40 → 2 páginas (30+10).
- **G. Sintético 70:** 3 páginas (30+30+10), orden/cardinalidad exactos.
- **H. Sintético 300:** 10 páginas de 30, sin duplicados ni omisiones.
- **I. Registro PDF:** completo para 25/40/70/300; 300 → 19 páginas tabulares.
- **J. Registro CSV:** exactamente 25/40/70/300 filas de datos.
- **K. Visor:** visible en Edge para nómina y registro.
- **L. Descarga:** disponible con nombres administrativos explícitos.
- **M. Impresión:** handlers ejecutados en Edge headless; impresión física humana sigue pendiente.
- **N. Errores JS/promesas:** 0.
- **O. Red externa:** 0 solicitudes.
- **P. Hashes:** 21/21 PDF canónicos intactos.
- **Q. Candidata:** 269 estudiantes, 295 matrículas, 12 grupos, 0 periodos, 0 unidades, 0 asistencia; fingerprint idéntico.
- **R. Archivos:** política central, motor PDF, vistas de nómina/registro, suites/runners y documentación.
- **S. Suite dedicada:** 34/34.
- **T. Regresión segura:** 545/545 en 19 suites.

TMPL-01 canónica conserva 30 y `CAPACITY_EXCEEDED`. TMPL-03 permanece `REVIEW_REQUIRED`. TMPL-19, TMPL-20 y TMPL-21 conservan exactamente dos páginas. Producción permanece `CETPRO_DB` schema v1 y no fue abierta, migrada ni escrita.
