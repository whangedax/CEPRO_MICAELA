# BACKUP-HARDENING-01 — arquitectura de respaldo

Fecha: 2026-09-15. Alcance: `CETPRO_DB` schema v1; no crea v2, `grupos_academicos`, periodos, currículo ni asignaciones. Todas las restauraciones automatizadas se probaron en bases con nombres aislados; no se abrió/restauró el perfil Edge.

## Auditoría del mecanismo anterior

`StorageService.exportBackup()` enumeraba los stores físicos y los leía con una transacción separada por store. Guardaba versión de aplicación, timestamp, nombre/versión de DB, número de stores, conteos y datos, pero no tenía `format`, versión de formato, manifiesto nominal contractual, checksum ni validación referencial. Una modificación concurrente podía producir un snapshot entre estados.

`restoreBackup()` recorría las claves presentes en el JSON, omitía silenciosamente stores desconocidos/ausentes y ejecutaba `clear()+put()` en una transacción distinta por store. Si fallaba N de M, 1..N-1 ya podían quedar confirmados. Tampoco comprobaba conteos declarados, claves duplicadas, schema antes de escribir, integridad post-restore ni readback. La UI `#/respaldo` solo exportaba; no había preflight, confirmación ni restauración segura. Los snapshots internos de importación/recuperación son artefactos históricos especializados y no sustituyen el nuevo envelope externo.

## Flujo endurecido

1. **Export:** compara por nombre los 17 stores de `SCHEMA_V1`; verifica `db.version=1`; lee todos en una única transacción `readonly`; construye envelope v2; calcula SHA-256 canónico; vuelve a validar checksum, claves, índices únicos y referencias antes de entregar JSON.
2. **Preflight:** parsea con máximo 50 MiB, sin `eval`/`Function`; metadata interna manda sobre el nombre del archivo. Exige formato, formatVersion, schemaVersion, manifiesto exacto, keyPaths, arrays, counts, SHA-256, unicidad y referencialidad. Cero escrituras.
3. **Pre-restore:** genera un envelope completo del destino con `origin=PRE_RESTORE_BACKUP`, lo valida y, en DB productiva, exige un callback que lo descargue/guarde antes de escribir. Si generación, validación o aceptación falla, no abre la transacción de restore.
4. **Restore:** una sola transacción `readwrite` sobre los 17 stores. Encola `clear` y `add`; cualquier request, excepción o cierre aborta todo. La validación lógica íntegra ya ocurrió antes de `clear`.
5. **Readback:** tras commit, el flujo productivo cierra y reabre la conexión, vuelve a leer los 17 stores, compara SHA-256 semántico de todos los IDs/valores, revalida claves/referencias y solo entonces muestra “Restauración completada correctamente”.

Stores v1 exactos: `asistencia`, `auditoria`, `configuracion`, `docentes`, `documentos`, `efsrt`, `estudiantes`, `evaluacion`, `indicadores`, `institucion`, `matricula_unidades`, `matriculas`, `modulos`, `periodos`, `programas`, `staging_importaciones`, `unidades`. No basta `length=17`; nombre y keyPath deben coincidir.

## UX y seguridad

`#/respaldo` separa **Crear respaldo** de **Restaurar respaldo**. Seleccionar un archivo muestra archivo, fecha, versión de backup, schema, registros y estado SHA-256/referencial. El botón queda deshabilitado hasta preflight válido. Restaurar exige el texto de confirmación: “Esta acción reemplazará los datos actuales después de crear un respaldo de seguridad previo.” Cancelar realiza cero escrituras.

Los campos de archivo/preflight se muestran con `textContent`/`createTextNode`; JSON siempre es datos, nunca código. No se usa HTML del archivo, red, CDN, `eval` ni `Function`. El límite es 50 MiB con rechazo explícito. El origen no incluye secretos del navegador. El navegador puede iniciar y validar el archivo `PRE_RESTORE_BACKUP`, pero no ofrece confirmación criptográfica de que el sistema operativo terminó de grabarlo en disco; antes de una primera restauración Edge real se requiere validación física del flujo de descarga. No se ejecutó tal restore en esta tarea.

## Rendimiento y extensibilidad

Prueba sintética local: 5 años, 1.000 estudiantes, 5.000 matrículas y 5.000 staging (11.018 registros totales). Se observó exportación aproximada entre 279–634 ms y restore+validaciones entre 1.667–3.014 ms (ejecución aislada vs runner global). Son cifras del entorno de prueba, no SLA. No existe límite artificial de 295 filas. El costo es O(registros + bytes canonicalizados), con memoria proporcional al backup, acotada por 50 MiB.

Un futuro store (`grupos_academicos`, currículo u otro) exige nueva versión de schema/formato compatible, inclusión explícita en manifiesto, export, restore, reglas referenciales y round-trip antes de ser productivo. El importador v1 rechaza schema 2; nunca ejecuta migración al restaurar.
