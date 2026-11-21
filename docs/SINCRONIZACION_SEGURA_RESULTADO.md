# Reparación de sincronización y actualización de datos

Fecha: 2026-11-13. Fuente vigente: `C:/CETPRO/CETPRO_MODERNIZACION_V2`.
Desarrollo y pruebas previas en copia aislada `dev-sandbox/sync-repair` del worktree.

## Cambios

- Un flujo común Enviar/Recibir para Dirección, Secretaría y Docente, con capacidades
  obtenidas del servidor y destinatarios permitidos. Configuración y unidades para
  administrativos; el docente conserva su alcance académico autorizado.
- Paquetes firmados/cifrados compartidos como mensaje WhatsApp o archivo `.cetpro`.
  El mensaje incluye resumen legible y código; nunca incluye la clave de intercambio.
- Clave explícita de 8–200 caracteres, compartida por separado, sin clave pública
  predeterminada. Los paquetes grandes se adjuntan como archivo.
- Pegar código o cargar archivo → validar y revisar → confirmar. La revisión no
  modifica datos; el token de confirmación expira y verifica usuario/contexto/estado.
- Motor existente de merge, respaldo, firmas, permisos, conflictos e idempotencia.
  Se conservan registros ajenos al paquete y diferencias concurrentes; no se restaura
  ni reemplaza la base de destino.
- Categorías con dependencias autorizadas y cadena de revisiones firmadas. Un filtro
  de aula no exporta configuración de otras aulas. Se conserva la propagación de
  actualizaciones institucionales de cuentas y desactivaciones.
- Archivo lógico de unidades con notas, asistencias o documentos mediante operación
  versionada sincronizable, conservando el historial en los equipos receptores.
- `#/datos`: capacidades por perfil, contrato CSV/XLSX/JSON reparado, lectura sin
  contenido anterior, revisión detallada, avisos/omitidos y confirmación explícita.
  Formatos, categoría, aula/unidad, acciones y revisiones se validan en servidor.
- Reimportar un directorio docente idéntico no crea cuentas ni cambia revisiones;
  una descripción vacía en la tabla no borra la descripción existente.
- Herramientas anteriores de equipos/carpetas y conflictos quedan en opciones
  avanzadas; se retiraron los controles WhatsApp duplicados.

## Verificaciones

| Comprobación | Resultado |
| --- | --- |
| Regresión de intercambio, WhatsApp, módulos, tablas, unidades y recorridos críticos | 53/53, exit 0 |
| QA HTTP existente de sincronización y configuración académica | 43/43, exit 0 |
| Recorrido de navegador en tres perfiles | 15 escenarios, exit 0, cero excepciones JS |
| Mensaje con resumen y código íntegro | Suite segura 11/11; auditoría independiente aprobada |
| TypeScript y build en staging | Aprobados; permanece aviso de bundle >500 KB |
| Build en el proyecto local integrado | Aprobado, exit 0; mismo aviso de bundle |
| Auditoría independiente | Aprobada; fallos inyectados confirman rollback y reintento |

El navegador comprobó generación por los tres perfiles, cambio de canal e invalidación
del código anterior, descarga real de `.cetpro`, rechazo de destinatario incorrecto,
recepción/confirmación por destinatario correcto, importación de JSON y respeto a
propuestas docentes frente a actualización administrativa. Se comprobó el contenido
con encabezado legible, no solo el bloque técnico.

Pruebas adicionales: clave/firma/institución incorrectas, mensajes dañados/excesivos,
previews antiguos, revisiones sucesivas, conflictos que conservan la nota local,
repetición de paquetes, preservación de registros no incluidos y ceros en notas.

## Uso

En `#/sincronizacion`: elegir categoría, destinatario, medio y clave → generar →
copiar mensaje o descargar archivo. El receptor elige Recibir, pega/carga, introduce
la misma clave, revisa y confirma. Los conflictos permanecen para revisión autorizada.

En `#/datos`: elegir tabla/formato y aula cuando corresponda → exportar o cargar
archivo → previsualizar → confirmar cambios permitidos. Secretaría/Dirección reciben
notas y asistencias docentes por paquetes de Sincronización; la tabla no concede
permisos nuevos de edición. Las altas docentes de alumnos siguen como propuestas.

## Integración y límites

Respaldo de código previo en:
`C:/CETPRO/CETPRO_MODERNIZACION_V2/.agents/local-backups/sync-repair-20261113-092259/`.

Integración selectiva de 21 archivos de código/pruebas con comparación SHA-256 contra
la copia original capturada y respaldo previo. Los demás cambios de Antigravity,
datos institucionales, credenciales, bases e instaladores se conservan.

La evidencia sintética se guarda en `docs/sync/evidence/`. Los scripts de prueba son
`tests/sync-transfer-safe.test.cjs`, `tests/data-transfer-safe.test.cjs` y
`tests/sync-transfer-ui.cjs`, además de la regresión existente.

No se enviaron mensajes reales por WhatsApp, no se probó una memoria USB física ni
se certificó Electron empaquetado. WhatsApp requiere envío manual y conexión para
transportar el mensaje; la generación y aplicación del paquete son locales.
Reiniciar el backend de desarrollo si ya estaba abierto para cargar las nuevas rutas.
No se generaron instaladores ni se ejecutaron migraciones destructivas.
