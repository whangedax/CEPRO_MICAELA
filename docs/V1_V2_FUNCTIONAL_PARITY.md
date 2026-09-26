# V2-FUNCTIONAL-PARITY-01 — matriz de comportamiento

Fecha: 2026-09-15. Base de comparación: misma interfaz `app/js/app.js` en `app/index.html` (8080, `CETPRO_DB` v1) y `app-v2/index.html` (8081, `CETPRO_V2_CANDIDATE` v2). PARITY indica reutilización de la vista y comportamiento probado; PARTIAL indica deuda explícita; INTENTIONALLY_BLOCKED significa que no se permite operación sin fuente/autoridad. La apertura de una ruta por sí sola no demuestra paridad.

| FEATURE | V1 | V2 | PARITY_STATUS | MISSING_IN_V2 | ACTION_REQUIRED |
|---|---|---|---|---|---|
| Inicio | Dashboard maduro | Mismo Dashboard; 295/295, 7/14 | PARITY | Ninguna función de vista | Verificar visualmente Edge |
| Estudiantes | Ficha, edición, filtros, estado, borrado lógico | Misma `StudentsView`, padrón 269 | PARITY | Ninguna función de vista | Probar edición/desactivación solo en aislada antes de promoción |
| Matrículas | Consulta/filtros/ficha 295 | Misma `EnrollmentsView`; grupoCode visible + groupId | PARITY de consulta | Ninguna función de consulta | Auditar futuros write paths por groupId |
| Programas y módulos | Catálogos 7/14 y navegación | Misma vista; grupos abiertos por groupId | PARITY | Ninguna función de vista | Edge físico |
| Grupos | Asignación confirmada por código legado | Misma UI; 12 entidades/8 revisión, apertura por groupId | PARTIAL | Ensayo transaccional v2 de impacto obsoleto | Gate de escritura groupId; B-004 abierta |
| Registro académico | Vistas asistencia/evaluación | Mismas pantallas | INTENTIONALLY_BLOCKED | Write paths heredados por grupoCode | Adaptar groupId y cerrar B-002/B-004/B-007 |
| EFSRT | Vista y servicio maduros | Misma pantalla | INTENTIONALLY_BLOCKED | Habilitación académica | Fuente oficial y gate de identidad groupId |
| Cierre | Diagnóstico y bloqueos | Misma pantalla | INTENTIONALLY_BLOCKED | Emisión oficial | Cerrar prerrequisitos académicos |
| Documentos | Motor común, TMPL-02 PDF Blob | Mismo motor y pdf-lib; TMPL-02 real end-to-end | PARITY TMPL-02 | TMPL-01/03–21 siguen bloqueadas en ambos | Edge PDF; binding GROUP posterior |
| Incidencias | Staging M04 y filtros | Misma vista, 295 registros, HTML escapado | PARITY | Auditor v2 no integrado en la vista madura | Gate de incidencias GROUP posterior |
| Respaldo | Export/preflight/confirmación/prebackup/restore/readback | Misma UX, backend schema2/manifiesto18/checksum | PARTIAL | Verificación física de archivo y escenarios cuota/crash | Ensayo backup/restore Edge aislado |
| Configuración | Perfil institucional/labels humanos | Misma UI/INST-001; crear periodo deshabilitado | PARTIAL | Alta académica deliberadamente bloqueada | Fuente y gate posterior; no modificar registro aquí |

El aparente texto `PÚBLICOMICAELA` era presentación en la UI simplificada retirada: ésta montaba `denominacionVisible` (valor institucional con salto de línea entre «PÚBLICO» y «MICAELA») en un `<input type=text>`, que no representa saltos de línea; el perfil almacenado conserva el separador y `nombre`/`tipoGestion` son campos distintos. La vista compartida usa `<textarea>` para ese campo y preserva la separación. No se corrigió ni sobrescribió el registro de fuente.

Las únicas diferencias permitidas entre builds son nombre/versión de DB, schema 17→18, `grupoId`/`grupos_academicos` como autoridad, manifest backup v2 y rótulo explícito de candidata/aislamiento. Todo cambio académico adicional exige gate específico.

## Evidencia ejecutable

`tests/v2_functional_parity_01.regression.js`: 38 comprobaciones headless sobre copia candidata, ruta + interacción documental + preflight UX (18 stores/checksum visibles) + snapshot completo previo/posterior + XSS sintético en staging, red externa interceptada/bloqueada, 0 solicitudes externas, 0 errores JS/HTTP. Conteos esperados: 18 stores, 269 estudiantes, 295 matrículas, 295 staging, 12 grupos, 7 programas, 14 módulos, periodos=0, unidades=0, módulos asignados=0. Los 21 registros de plantillas permanecen en el mismo registry; no significa que las 21 puedan emitirse.

## Riesgos y siguiente gate

La validación visual/física Edge del usuario sigue pendiente. Antes de activar v2 se requiere adaptar todos los write paths académicos heredados que reciben `grupoCode`, probar asignación v2 con impacto/fallo de auditoría y cerrar el gate de backup/restore operativo en Edge. Esta matriz no autoriza migrar `CETPRO_DB` ni completar fuentes académicas.
