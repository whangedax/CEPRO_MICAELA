# Uso del sistema local por cuentas individuales

## Documentos dinámicos — actualización del 6 de octubre de 2026

El arranque de esta versión es `scripts/server-offline.cjs`; `npm start` y el archivo BAT lo usan. El archivo `scripts/server.js` del sistema anterior se conserva como referencia y no es el arranque de esta versión.

1. Dirección abre **Datos de documentos** y completa la institución, programa, módulo, horas, créditos, fechas y datos registrales. Los valores anteriores disponibles se muestran antes de editar.
2. Secretaría completa datos de matrícula, expedición y las fichas de estudiantes: documento, nombres separados, sexo y nacimiento cuando el formato los requiere.
3. El docente configura capacidad e indicadores de sus unidades. La matriz de notas tiene cinco bloques IA1/IA2/IA3/IL/R y el logro de unidad, como las plantillas. Se guarda un conjunto de celdas en una transacción; no se calculan promedios ni resultados por suposición.
4. En **Documentos**, seleccionar grupo, plantilla y estudiante cuando corresponde. **Actualizar vista previa** muestra el PDF real con navegación de páginas y zoom. A un lado se indican los parámetros completos y pendientes.
5. Descargar obtiene exactamente el PDF mostrado. **Entregar** solo se habilita cuando están completos los parámetros; si los datos cambiaron tras la vista previa, debe actualizarse antes de entregar.
6. **Entregas y revisión** conserva el PDF exacto, sus parámetros y su revisión. Secretaría registra recepción/observaciones; dirección puede marcarlo revisado. Las entregas y la configuración también viajan por la sincronización cifrada. Una revisión interna no equivale a emisión oficial.

Las plantillas de asistencia calculan totales y porcentajes solo con los estados y denominador que dirección configure en el módulo. Las estadísticas de acta usan la nota mínima de aprobación configurada; no se aplica una regla institucional inventada. Las recuperaciones vacías no se transforman en cero. Se conservan las notas con decimales.

EFSRT se configura mediante sus nueve criterios, empresa, dirección y calificación confirmada. Un docente necesita asignación expresa de EFSRT para preparar ese consolidado. El certificado incorpora las unidades, horas, créditos, capacidades y la fila EFSRT; el título usa denominación y datos registrales autorizados. Los campos sin fuente quedan pendientes y vacíos.

Se verificaron los 21 documentos con datos de ensayo en las pruebas de llenado y se inspeccionaron sus 24 páginas renderizadas. La configuración real de la institución debe completarse con sus valores correctos; las pruebas no introducen esos valores ficticios en la base operativa.

## Inicio en este equipo

Ejecuta `INICIAR_SISTEMA_CETPRO.bat` y abre `http://127.0.0.1:8080/`. El servicio actual requiere Node.js 24 o posterior. No requiere internet durante el uso.

La primera pantalla ofrece dos opciones:

1. **Equipo institucional:** crear el usuario y la contraseña de dirección. No existe contraseña universal. En esta instalación se puede incorporar el respaldo institucional existente. La base del navegador anterior permanece intacta.
2. **Equipo de secretaría o docente:** descargar una solicitud y llevarla a dirección. No crear otra dirección independiente para la misma institución.

La nueva base se guarda en `private-data/cetpro.sqlite`, separada del IndexedDB anterior. El servicio no publica por HTTP la base, los respaldos ni sus claves. La carpeta privada debe permanecer bajo la cuenta de Windows responsable del equipo; una persona con control administrativo del sistema operativo puede acceder a sus archivos.

## Preparación por dirección

1. En **Grupos**, comprobar y configurar periodo, módulo y unidades existentes. Se mantienen los catálogos de programas y módulos del proyecto. Es posible crear grupos para nuevos periodos; no cambiar el periodo de un grupo que ya tiene registros académicos.
2. En **Cuentas y asignaciones**, crear una cuenta por persona. Para docentes seleccionar solo sus grupos y unidades. Puede asignarse más de un grupo y limitar las unidades dentro de cada uno.
3. En **Sincronización**, importar la solicitud del equipo nuevo, elegir su cuenta y generar una vinculación cifrada.
4. Confirmar con el destinatario la huella institucional mostrada. El equipo nuevo la introduce para aceptar la vinculación y entrar con su cuenta.
5. Descargar los cambios para ese equipo, entregarlos por USB y pedir que los reciba. Esta actualización contiene el padrón y la estructura dentro de su alcance.

La autorización offline de los equipos vinculados dura 90 días y se renueva al recibir una actualización institucional. Para recuperación de contraseña o autorización vencida, el usuario puede descargar otra solicitud desde el login; dirección restablece la contraseña de la cuenta, genera una nueva vinculación y el usuario la importa desde **Renovar autorización o recuperar acceso**. Una vinculación anterior no puede aplicarse otra vez.

Un equipo ya vinculado no se reasigna a otra persona: utilizar una instalación/carpeta de datos separada.

## Secretaría

- Registrar o actualizar estudiantes; el documento se conserva como texto, incluidos ceros iniciales.
- Matricular en un grupo configurado e indicar fecha real de ingreso.
- Para retiro o traslado usar la acción de la matrícula. Un traslado crea una matrícula nueva; las notas y marcas anteriores siguen vinculadas a la matrícula original.
- Consultar notas y asistencia recibidas. Secretaría no modifica las notas ni las marcas del docente.
- Preparar documentos administrativos habilitados y consolidar los paquetes de docentes en el equipo institucional.

Si secretaría usa un equipo separado, entrega sus cambios al institucional. Desde el institucional se distribuye la actualización al docente. Se evita que varios equipos compartan o reemplacen directamente el mismo archivo SQLite.

## Docente

- **Notas:** seleccionar uno de sus grupos, unidad e indicador. Escala de captura existente: 0–20. Tab/Enter facilita el ingreso. Una celda nueva vacía es pendiente y cero es una calificación. Borrar una nota registrada requiere confirmación y conserva su historial.
- **Asistencia:** seleccionar unidad, fecha y sesión. Marcas operativas P/F/J/T; acción masiva de presentes con revisión previa. Una sesión anterior al ingreso no se convierte automáticamente en falta.
- Se muestra confirmación de guardado solo al completar la escritura. Una falla conserva los campos para corregir o reintentar.
- **Mis documentos:** preparar únicamente las plantillas de su función y datos de sus asignaciones. La autorización se verifica también en el servicio, aunque se modifiquen los IDs de una petición.
- **Sincronización:** exportar cambios y entregarlos al equipo institucional; recibir el archivo de respuesta para confirmar la recepción y actualizar padrón/estructura.

En computadoras completamente aisladas no hay recepción automática. Consultar la fecha de última sincronización; no considerar datos locales como información institucional actualizada hasta recibir confirmación.

## Intercambio por USB

1. El remitente descarga un paquete `.cetpro`.
2. El destinatario selecciona el archivo en **Recibir cambios**.
3. Se verifica institución, equipo destino, emisor, firma, permisos y versiones; se presenta un resumen.
4. Al aplicar se crea una copia real previa. Altas, modificaciones, auditoría y recepción se guardan en una transacción.
5. El destinatario responde con un paquete para confirmar los cambios recibidos.

Los paquetes usan X25519 para acordar la clave, AES-256-GCM para cifrado autenticado y firmas Ed25519. Las credenciales solo se transportan en la vinculación separada, cifrada para su equipo; no forman parte del padrón ni de los avances.

Los paquetes llevan historial de operaciones con revisión base. Los repetidos no duplican registros; una actualización antigua no revierte cambios posteriores. Una edición incompatible se conserva para revisión. Los registros que dependen de una matrícula/revisión ausente quedan pendientes: recibir primero su base y volver a importar el paquete. Las fechas de las computadoras no deciden qué nota gana.

Dirección resuelve conflictos con motivo. Se conserva la propuesta recibida, el valor previo y la decisión. La siguiente respuesta comunica la resolución al equipo que envió el dato. Si ese equipo hizo cambios nuevos mientras tanto, no se reemplazan silenciosamente.

Las cuentas desactivadas o reasignadas se actualizan en los equipos remotos al recibir el paquete institucional o una nueva vinculación. No existe revocación instantánea en un equipo aislado.

## Migración del sistema anterior

Dirección puede leer `CETPRO_V2_CANDIDATE` o `CETPRO_DB` del navegador en el mismo origen, e incorporar los registros de etapa 2 de localStorage. También puede seleccionar un respaldo JSON.

Revisar el conteo antes de confirmar. La migración:

- Conserva los IDs de estudiantes y matrículas y los registros existentes en la nueva base.
- Convierte evaluaciones/asistencias de IndexedDB y los bloques de etapa 2 identificables.
- Archiva todas las fuentes originales; las referencias ambiguas no se convierten por suposición.
- Presenta diferencias y duplicidades históricas en **Respaldo y migración**.
- No elimina los almacenes anteriores ni borra el almacenamiento del navegador.

El respaldo inicial tiene 269 estudiantes y 295 matrículas. Se detectó una duplicidad de documento en la fuente: ambos IDs históricos y sus matrículas se conservan para conciliación. No autoriza duplicados nuevos durante matrícula manual.

Los datos anteriores almacenados en otro puerto, navegador o perfil necesitan su respaldo/exportación correspondiente: IndexedDB pertenece a su origen y perfil. No se deben borrar datos del navegador para intentar migrarlos.

## Documentos

Se reutilizan los 21 PDF y el motor del proyecto. El servidor construye el contexto a partir de los registros autorizados y ofrece el PDF en su formato existente. Las tablas extensas se dividen en páginas según capacidad; asistencia se divide también por bloques de sesiones.

La ficha, certificado y título requieren seleccionar una matrícula concreta. Las plantillas de asistencia/evaluación exigen su unidad configurada y permitida. Los campos sin información confirmada permanecen vacíos; no se calculan ponderaciones, resultados finales, EFSRT, horas ni créditos no configurados.

Los PDFs se generan sin marcas de agua. La emisión institucional de actas, certificados y títulos requiere completar y validar las condiciones académicas y de fuente ya identificadas en el proyecto. No se añadieron firmas ni aprobaciones ficticias. El reporte HTML permite revisar los datos además del PDF de formato original.

## Copias y recuperación

Dirección crea una copia completa desde **Respaldo y migración**. También se crea antes de cada importación, migración y resolución de conflictos. Se guarda en `private-data/backups/` con checksum e incluye claves, credenciales derivadas, registros, operaciones, recepción e historial. Custodiar esa carpeta; no compartirla como paquete de sincronización.

Para recuperar, detener el servicio y ejecutar:

```powershell
node scripts/restore-offline.cjs "C:\ruta\respaldo.json"
```

En el paquete que incluye el motor, si `node` no está en PATH, usar `runtime\node.exe` en lugar de `node`.

El proceso verifica el checksum y la estructura, crea una copia del estado previo y restaura en una transacción. El servicio debe estar detenido. Recuperar únicamente en el equipo al que pertenecen sus claves y cuentas.

## Instalación y actualización

Usar el paquete de distribución que genera `scripts/build-offline-package.cjs`. Excluye las bases, claves, respaldos históricos personales, pruebas y archivos del navegador. Cada nueva computadora genera su propia identidad y después se vincula con dirección.

Para actualizar una instalación existente: detener el servicio, copiar una copia de seguridad completa fuera del equipo, actualizar archivos del programa y conservar íntegra `private-data/`. No copiar la carpeta privada de dirección a los equipos docentes. No sustituir bases completas para sincronizar.

Esta entrega usa transporte USB. El servicio escucha solo en loopback; la conexión automática por LAN queda fuera de esta entrega y necesita un transporte autenticado adicional. No basta con abrir el puerto a toda la red.

## Verificación

`npm run test:offline`: pruebas del servicio, credenciales, aislamiento, tres instalaciones, fusión, conflictos, cierre, migración, recuperación, renovación y generación de los 21 PDF.

`npm run test:offline-ui`: prueba en Edge invisible con base aislada del login, migración inicial, menús por rol, notas, asistencia, PDF con una nota real del ensayo y resolución móvil. Evidencia local en `tests/offline-artifacts/`; las pruebas no modifican la base operativa.

Antes de uso institucional general, probar el circuito USB en las computadoras reales, confirmar las asignaciones y revisar los formatos impresos. Las pruebas automatizadas no sustituyen la aceptación institucional de documentos oficiales.

## Auditoría, cuentas e intercambio de tablas — 6 de octubre de 2026

Dirección administra todos los roles y vincula los equipos. Secretaría registra docentes y sus aulas; no puede crear ni modificar cuentas de dirección o secretaría. En su equipo separado prepara altas docentes, las envía por USB y el equipo institucional las activa. Las contraseñas no se incluyen en las listas Excel de profesores. Para editar cuentas ya consolidadas desde un equipo separado, utilice el equipo institucional.

Cada docente recibe sus grupos, carrera, periodo y unidades. Sus selectores de configuración contienen solo capacidad e indicadores de sus unidades y EFSRT cuando está asignado. No aparecen formularios institucionales, registrales ni de cuentas.

**Actualizar y exportar datos** descarga plantillas o tablas actuales en JSON, CSV y Excel .xlsx y admite tablas pegadas desde Excel. Seleccione grupo y unidad; el catálogo muestra los códigos compatibles. No se aceptan fórmulas ni macros. Las plantillas contienen una fila de ejemplo marcada EJEMPLO_NO_IMPORTAR que se omite; sustituya esa acción por ACTUALIZAR para utilizar la fila. DNI debe ser texto, incluidas sus ocho cifras. Fechas AAAA-MM-DD, sexo H/M o conversión explícita M/F. Máximo 32 MB y 12000 filas por importación.

Exporte los datos actuales antes de corregirlos: conserve los identificadores y revisiones. Revise el resumen, corrija los errores y aplique. Se crea una copia privada antes de cada lote; el lote se guarda en una transacción. Una revisión antigua no sobrescribe el registro actual. Los cambios de notas y asistencias corresponden al docente; dirección y secretaría pueden exportarlos para consulta. Una celda de nota vacía queda sin importar; el cero sí es una nota. Para borrar una nota use la pantalla de notas con su confirmación y auditoría.

Un docente propone estudiantes nuevos de sus propias aulas mediante esta pantalla. Secretaría valida y matricula; el profesor no modifica directamente el padrón. La llegada de nuevas matrículas no reemplaza notas ni asistencias. El código automático es MAT-documento-ordinal (ejemplo MAT-00112233-001); el identificador interno de la matrícula se conserva. No edite el código manualmente.

**Modo claro / oscuro** está en el login y en la cabecera; la preferencia queda en ese navegador. Las páginas PDF mantienen fondo blanco.

Sin internet los equipos se actualizan cuando intercambian los archivos cifrados por USB. Las tablas externas y los paquetes de sincronización son flujos distintos. Una tabla no reemplaza el archivo SQLite completo. Si dos equipos cambian una misma celda se conservan las dos versiones para revisión; no existe sincronización instantánea entre computadoras desconectadas.

Consulte AUDITORIA_FORMATOS_Y_ROLES.md para resultados de parámetros, fuentes, posiciones y pruebas. Se mantienen los títulos, logos y estilos del PDF institucional original; se ajusta el texto dinámico a las cajas y se bloquea un texto que no cabe. La ausencia de marca de agua no completa parámetros ni crea una firma o aprobación.

## Intercambio y gestión completos — versión 3.3

Consulte AUDITORIA_PUNTOS_CRITICOS.md. Todos los roles tienen Exportar base para intercambio en Sincronización, con clave de archivo. El archivo institucional es para personal administrativo; para devolver datos a un docente, seleccione su cuenta en Destinatario y el sistema limita las aulas y unidades. Secretaría puede recibir directamente los cambios firmados del docente. Las solicitudes de cuentas se envían marcando Incluir solicitudes y cambios de usuarios; el equipo institucional las confirma. El cambio personal de contraseña se consolida automáticamente al recibir su solicitud válida.

Usuarios y estudiantes tienen Eliminar y Restaurar; la eliminación conserva el historial. En documentos puede incluir retirados para consultar el historial. Desde Asistencia existe Ver y exportar ficha de asistencia; guarde las marcas antes de generar el documento. Grupos permite búsqueda por nombre/carrera/periodo y editar su nombre, sin alterar la estructura que ya tiene notas.

Las claves de usuario e intercambio admiten ocho caracteres como mínimo. Las actualizaciones institucionales renuevan autorización y credenciales; para recuperar una cuenta vinculada desde el login utilice Recibir actualización institucional de acceso. Una vinculación inicial con la misma institución sigue siendo obligatoria.

## Sincronización guiada — 7 de octubre de 2026, versión 3.4

La pantalla separa Enviar mis datos y Recibir un archivo. Cada recorrido tiene su propia clave y sus resultados; cambiar el archivo o la clave obliga a revisarlo nuevamente. Las acciones se bloquean mientras se procesa un archivo para evitar pulsaciones repetidas.

El sistema prepara una clave de archivo y permite Mostrar o Copiar. Al descargar indica el nombre exacto del archivo y dónde buscarlo. El docente ve sus aulas y qué trabajo guardado se incluye. Dirección y secretaría eligen el destinatario docente para limitar sus aulas y unidades.

Al recibir, el resumen se genera a partir de datos firmados y verificados: persona que envió, fecha, aulas, estudiantes, matrículas, notas, asistencia y otros datos. Los contadores de cambios identifican registros únicos; una misma nota editada varias veces no aparece como varias notas nuevas. El resumen muestra datos nuevos y por actualizar, diferencias conservadas y accesos por revisar. Revisar no modifica la base.

Una clave incorrecta no importa datos. Un archivo repetido no duplica registros y no permite volver a aplicarlo. Después de recibir se mantiene visible la confirmación y se explica cómo enviar una respuesta para confirmar la recepción. Las ayudas describen qué es un archivo .cetpro, cómo llevarlo en USB y dónde importar Excel/CSV. Las opciones de vinculación se dejan al final para el responsable.

Prueba específica Edge: director, secretaría y docente; generación y separación de claves; selección de destinatario y aula; archivo real de un docente vinculado recibido en secretaría; clave incorrecta sin cambios; resumen verificado; nota y asistencia recibidas; copia previa; duplicados y pantalla móvil.

## Aulas y secciones — versión 3.5

En Grupos registre periodo, módulo, unidades, sección y turno. Cada sección tiene su aula propia. En Usuarios elija rol Docente; aparecerá Aulas y secciones de este docente. Filtre y marque las unidades permitidas; revise el resumen antes de guardar. Un nuevo periodo no reemplaza la matrícula anterior. Dirección puede comprobar Estado de la base en Respaldo y migración. Consulte AUDITORIA_BASE_Y_SECCIONES.md.
