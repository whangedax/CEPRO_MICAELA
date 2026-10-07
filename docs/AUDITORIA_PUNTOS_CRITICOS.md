# Auditoría de puntos críticos y correcciones — 6 de octubre de 2026

## Resultado

Se comprobó el circuito completo de dirección, secretaría y docente en bases aisladas. La auditoría sobre la base operativa generó 96 combinaciones de documento y grupo sin errores; 177 combinaciones no son aplicables todavía porque faltan unidades, módulo o matrícula individual. Estos casos requieren configurar datos reales y no se completaron con valores inventados. Los 21 formatos se prueban además con parámetros completos de ensayo.

## Fallos corregidos

- Exportación bloqueada para el docente que utilizaba el equipo institucional o cuando no había un destinatario físico elegido. Ahora todos los roles tienen exportación e importación mediante archivo protegido.
- Secretaría recibía principalmente actualizaciones a través del equipo institucional. El intercambio firmado permite docente → secretaría → docente, mantiene el padrón existente y aplica los registros nuevos o modificados.
- Las aulas y unidades del destinatario se filtran antes de exportar. Los archivos institucionales se destinan a dirección/secretaría; para un docente se selecciona su cuenta. No se incluyen notas ni configuraciones de otras unidades.
- Nuevo grupo asignado podía fallar al recibir notas antes de existir su estructura local. Se valida usando la autorización institucional actualizada y los identificadores recibidos.
- Cambios de contraseña, asignaciones, eliminación y restauración ahora circulan en actualizaciones cifradas exclusivamente para el equipo del usuario. Se rechaza retroceder a una versión antigua de la cuenta.
- El cambio personal de contraseña en un equipo sin internet se conserva localmente y se consolida al recibir su solicitud firmada en el equipo institucional. No puede cambiar la contraseña de otra persona.
- Actualización y eliminación de cuentas docentes desde una secretaría vinculada: solicitud con versión, activación institucional y rechazo con motivo. No se permite eliminar el usuario de la sesión ni el último director.
- Eliminación de alumnos: desactiva el padrón y retira sus matrículas; conserva notas, asistencia y documentos entregados. Restaurar la ficha no recrea una matrícula retirada.
- Ficha de asistencia: acceso directo desde Asistencia y selector de unidad, incluida UD7, con comprobación de permisos en el servidor.
- Plantillas de unidades inexistentes ya no aparecen como opciones. Se puede consultar el historial de retirados mediante la casilla correspondiente.
- Códigos largos de matrícula se ajustan sin truncar tanto en EFSRT como en nómina. EFSRT y acta continúan en páginas adicionales al superar cuarenta alumnos. El acta muestra el código automático y utiliza estadísticas del grupo completo, únicamente con nota mínima confirmada.
- Se impide descargar una vista previa anterior durante una regeneración; al cambiar la selección se limpia el documento mostrado.
- Nombres de grupos editables, filtro de carrera y búsqueda. Campos de estudiantes, cuentas y documentos incluyen ejemplos. Los formularios nuevos limpian sus identificadores de edición.
- Un dato personal borrado no reaparece desde el respaldo legacy; su valor original sigue conservado para auditoría. Se pueden corregir nombres de duplicidades históricas sin fusionar alumnos ni sus matrículas.
- CSV admite notas con coma decimal. Las tablas de estudiantes/docentes exportan registros activos; una tabla no reactiva fichas eliminadas ni modifica matrículas retiradas. El archivo de intercambio mantiene el historial.

## Uso entre computadoras sin internet

1. Instale la misma versión en cada equipo. Cree la institución solo en el equipo de dirección. Los otros equipos descargan su solicitud y se vinculan con dirección desde el login; no creen otra institución independiente.
2. Abra Sincronización. El docente selecciona sus grupos y una clave de archivo de ocho caracteres como mínimo, y pulsa Exportar base para intercambio.
3. Lleve el archivo .cetpro por USB a secretaría o dirección. Introduzca la clave, seleccione el archivo, pulse Revisar y luego Aplicar actualización revisada. Se crea una copia privada antes de modificar datos.
4. Secretaría conserva su información del grupo y agrega los cambios del docente. Para devolver nuevos alumnos o correcciones, seleccione la cuenta del docente como destinatario; solo se exportan sus aulas y unidades.
5. Para enviar solicitudes de creación/actualización/eliminación de usuarios desde secretaría, marque Incluir solicitudes y cambios de usuarios en un archivo institucional. Dirección las activa o rechaza. Los cambios personales de contraseña viajan como solicitudes propias verificadas.
6. Si una cuenta ya está inactiva o perdió el acceso, dirección exporta seleccionando esa cuenta; el equipo vinculado puede recibir la actualización desde Recibir actualización institucional de acceso en el login.
7. Si se editó el mismo registro en dos equipos, se mantienen las dos versiones. Dirección revisa el conflicto con motivo y exporta su decisión; el docente recibe la decisión y la confirmación de recepción.

No se reemplaza SQLite para actualizar otros equipos. JSON/CSV/XLSX y tablas externas se revisan en Actualizar y exportar datos; los archivos de intercambio firmados se reciben en Sincronización. Las actualizaciones no son instantáneas: cada equipo incorpora cambios cuando recibe el archivo.

## Evidencia

Las suites cubren seguridad, documentos, tablas y recorridos críticos; las bases de ensayo se mantienen separadas de private-data y demo-data. La prueba Edge verifica registro/edición/eliminación/restauración de docentes, eliminación de alumno, asistencia, PDF, envío/recepción real desde el panel docente, permisos, tema y pantalla móvil. VERIFICACION_OFFLINE.md contiene el resultado final. Los PDF de auditoría con estudiantes reales permanecen en tmp/pdfs/live-audit y no se incluyen en el paquete distribuible.

## Sincronización guiada — 7 de octubre de 2026, versión 3.4

La pantalla separa Enviar mis datos y Recibir un archivo. Cada recorrido tiene su propia clave y sus resultados; cambiar el archivo o la clave obliga a revisarlo nuevamente. Las acciones se bloquean mientras se procesa un archivo para evitar pulsaciones repetidas.

El sistema prepara una clave de archivo y permite Mostrar o Copiar. Al descargar indica el nombre exacto del archivo y dónde buscarlo. El docente ve sus aulas y qué trabajo guardado se incluye. Dirección y secretaría eligen el destinatario docente para limitar sus aulas y unidades.

Al recibir, el resumen se genera a partir de datos firmados y verificados: persona que envió, fecha, aulas, estudiantes, matrículas, notas, asistencia y otros datos. Los contadores de cambios identifican registros únicos; una misma nota editada varias veces no aparece como varias notas nuevas. El resumen muestra datos nuevos y por actualizar, diferencias conservadas y accesos por revisar. Revisar no modifica la base.

Una clave incorrecta no importa datos. Un archivo repetido no duplica registros y no permite volver a aplicarlo. Después de recibir se mantiene visible la confirmación y se explica cómo enviar una respuesta para confirmar la recepción. Las ayudas describen qué es un archivo .cetpro, cómo llevarlo en USB y dónde importar Excel/CSV. Las opciones de vinculación se dejan al final para el responsable.

Prueba específica Edge: director, secretaría y docente; generación y separación de claves; selección de destinatario y aula; archivo real de un docente vinculado recibido en secretaría; clave incorrecta sin cambios; resumen verificado; nota y asistencia recibidas; copia previa; duplicados y pantalla móvil.
