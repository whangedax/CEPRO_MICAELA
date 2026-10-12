# Plan de empaquetado e instalación en varios equipos

## Paquete común

Preparar una versión portátil para Windows con el programa, Node.js, dependencias locales, las 21 plantillas institucionales, guías y manifiesto SHA256. Se instala copiando la carpeta completa a una ubicación local con permisos de escritura, por ejemplo `C:\CETPRO_LOCAL`. El archivo `INICIAR_SISTEMA_CETPRO.bat` inicia el servicio y abre el navegador; no requiere instalar Node ni conectarse a internet.

El programa y las fuentes institucionales de datos viajan por canales separados. El paquete público no lleva alumnos, contraseñas, bases, respaldos, claves privadas ni datos de ensayo. Las fuentes Arial, Calibri, Calibri Light y Cambria deben estar disponibles en Windows; el sistema informa si falta una fuente requerida.

Cada versión debe incluir número de aplicación, versión de esquema de base y huellas de sus archivos. Verificar el paquete en una carpeta vacía, restaurar una copia en una instalación de ensayo y probar los intercambios antes de distribuirlo.

El paquete portátil preparado en esta revisión es `exports/CETPRO_OFFLINE_2026-10-12-10-33-25`, versión 4.9.0 con esquema 2. Pasó el primer arranque en Edge, el intercambio entre instalaciones independientes, la recuperación de respaldo y la generación de las 21 plantillas. Actualizar todos los equipos a esta versión antes de distribuir los cambios de limpieza.

## Equipo institucional de Dirección

1. Instalar el paquete completo y crear la identidad institucional solo si el CETPRO aún no tiene una instalación institucional.
2. Si ya existe la institución, detener el servicio y recuperar su respaldo verificado, conservando identidad, claves, usuarios e historiales. Actualizar un equipo existente conservando su carpeta de datos.
3. Revisar carreras, módulos, unidades, calendario, grupos, turnos y asignaciones. Cambiar contraseñas iniciales y confirmar los parámetros de los documentos.
4. Crear un respaldo externo y ejecutar la comprobación de producción.
5. Este equipo administra cuentas, vincula computadoras y resuelve conflictos.

## Equipo de Secretaría

1. Instalar el mismo paquete en su carpeta local y elegir la opción de vinculación en la pantalla inicial.
2. Descargar la solicitud de ese equipo y llevarla a Dirección mediante USB.
3. Dirección selecciona la cuenta institucional de Secretaría y genera la vinculación cifrada. Confirmar la huella institucional al aceptarla.
4. Recibir el primer paquete con la información autorizada. Secretaría gestiona padrón y matrículas, recibe documentos y consolida cambios de docentes; sus notas y asistencias son consultas.

## Equipo de cada docente

1. Instalar una carpeta independiente y generar su propia solicitud de vinculación.
2. Dirección vincula la cuenta de ese profesor, con sus aulas y unidades asignadas.
3. Recibir la autorización y la primera actualización. Comprobar que solo aparezcan sus carreras/aulas y que pueda elegir módulo y unidad.
4. Registrar notas y asistencia localmente, revisar documentos y exportar cambios por USB. Al recibir una respuesta institucional se confirma recepción y se actualiza el padrón sin sustituir toda la base.

Cada equipo genera sus propias claves e identidad. La asignación de un alumno nuevo se comunica como matrícula nueva; las notas y asistencias existentes conservan sus identificadores. Las ediciones simultáneas incompatibles quedan como conflicto para Dirección.

## Puesta en marcha gradual

Primero usar tres instalaciones de ensayo: Dirección, Secretaría y un docente. Comprobar matrícula nueva, nota cero, tardanza, cambio de unidad, entrega de PDF, exportación, importación duplicada, conflicto y recuperación de respaldo. Después instalar los demás equipos y documentar su vinculación.

Crear un registro de computadoras, responsable, versión instalada, fecha de último intercambio y fecha de renovación de autorización. Las autorizaciones de equipos vinculados duran 90 días y se renuevan con las actualizaciones institucionales.

## Actualizaciones y recuperación

Detener el servicio, guardar y verificar el respaldo, actualizar solo los archivos del programa y reiniciar. Revisar la versión del esquema y la integridad. Mantener respaldos fuera del disco del equipo y ensayar periódicamente su recuperación. Ante un fallo de migración, conservar los archivos y restaurar una copia verificada con una versión compatible.

No abrir simultáneamente una misma base desde varios equipos, una carpeta compartida o una carpeta sincronizada en la nube. Cada equipo escribe en su propia base. El intercambio usa archivos firmados/cifrados y una vista previa antes de aplicar.

## Instalador gráfico posterior

Cuando se valide el piloto, empaquetar esta misma carpeta en un instalador por usuario. El instalador debe crear accesos directos, comprobar fuentes y espacio, mantener los datos en una carpeta separada de los binarios y conservarlos al actualizar o desinstalar. El primer arranque elegirá Dirección institucional o vinculación a una cuenta existente. La versión portátil permite comenzar las pruebas antes de construir ese instalador gráfico.
