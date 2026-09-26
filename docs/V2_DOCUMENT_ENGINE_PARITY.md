# Paridad documental de candidata v2

La candidata importa el mismo `TemplateRegistry` (21 plantillas), `DocumentsView`, `DocumentDataService`, `DocumentValidationService`, `DocumentBindingService` y `PdfTemplateEngine` que v1, además del mismo `/app/vendor/pdf-lib.min.js` offline y PDF canónico TMPL-02. No hay renderer paralelo en el entrypoint v2.

TMPL-02 sobre una matrícula real candidata pasó la secuencia búsqueda → selección explícita por matrícula ID → join `grupoId`/estudiante/programa/institución → preflight del contrato → generación `Blob(application/pdf)` → iframe Blob → descarga/impresión. La emisión oficial sigue bloqueada; los campos de módulo/periodo/currículo no se rellenan con semejanza o texto fijo. Snapshot 18/18 antes/después idéntico y documentos=0. La validación física del PDF actual en Edge sigue pendiente.

TMPL-01 conserva su renderer probado en la misma engine, pero `DocumentsView` mantiene deshabilitada su generación productiva; `buildGroupContext(groupId)` resuelve el grupo aislado y sus miembros en read-only para un gate futuro. El renderer no se conectó a datos reales. Plantillas 03–21 continúan inventariadas, sin nuevos mappings, contextos productivos o emisión. B-002/B-004/B-007 permanecen abiertas. La leyenda fija de año/periodo del PDF fuente no constituye periodo oficial.

El contrato y las geometrías canónicas existentes no se modificaron en este gate. Queda I-061 (fit/omisión de fixture largo) y aceptación visual/física del PDF antes de cualquier conclusión de emisión oficial.
