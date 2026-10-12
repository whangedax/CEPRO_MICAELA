# Preparación del CETPRO para producción

El paquete contiene el programa, las plantillas, sus dependencias y Node.js. No contiene alumnos, contraseñas institucionales, claves de vinculación ni la base de este equipo. La verificación técnica del programa y la confirmación de los datos institucionales son pasos distintos.

Actualización posterior del 12 de octubre: se aplicó la limpieza autorizada descrita en `BD_Y_LIMPIEZA_PRODUCCION.md`. Las marcas de simulación identificadas fueron retiradas o restauradas desde su historial; el aula, alumnos y cuentas de desarrollo quedaron archivados. La inspección actual no mantiene esos elementos como pendientes operativos. Los informes anteriores se conservan como evidencia de lo encontrado antes de la limpieza. Siguen pendientes los planes, matrículas y parámetros institucionales sin confirmar.

## Antes de comenzar a operar

1. Dirección ejecuta `VERIFICAR_PRODUCCION_CETPRO.bat` en la instalación institucional. La comprobación es de solo lectura y deja el detalle privado en `private-data/production-readiness.json`. Código 0: sin pendientes detectados; 2: pendientes institucionales; 1: no pudo completar la inspección. Que termine sin pendientes no sustituye la validación institucional.
2. Confirmar las asistencias de las ocho combinaciones de aula/unidad señaladas en el informe del 12 de octubre. Hubo simulaciones anteriores; no reconstruir faltas o presentes por suposición. Contrastar con listas originales o un respaldo válido. Conservar el historial y registrar los cambios por las funciones normales del sistema. El informe conserva estas alertas históricas incluso después de corregir los registros; adjuntar el acta de revisión de Dirección al cierre de la auditoría.
3. Confirmar los planes pendientes: 16 unidades de tres módulos tienen denominaciones propuestas. Revisar también horas, créditos, calendario y turnos. Los datos sin documento de respaldo deben seguir pendientes.
4. Revisar las 588 matrículas provisionales, registradas en ambos módulos por indicación previa. Confirmar la pertenencia o excluir solamente del módulo incorrecto. No borrar al alumno ni reemplazar las notas de sus otras matrículas.
5. Revisar las asignaciones provisionales autorizadas el 12 de octubre: Magda tiene las aulas 007 y 008 de Computación; Teófilo el grupo 010 de Corte (noche), René el 011 (tarde) y Liz el 009 (mañana), cada uno con ambos módulos y sus unidades. Se pueden corregir desde **Usuarios y asignaciones**. Computación conserva su turno pendiente por diferencias entre las fuentes. Cambiar las contraseñas iniciales y retirar/desactivar las cuentas de prueba desde la vista general, conservando su historial. No distribuir las cuentas de ensayo como accesos reales.
6. Completar institución, resoluciones, sección, fechas, fichas de alumnos, capacidad e indicadores, EFSRT y datos registrales según los campos pendientes de cada PDF. Previsualizar y revisar antes de entregar; el sistema rechaza entregas incompletas o ficticias.
7. Crear un respaldo y guardar otra copia en una unidad externa protegida. Ensayar su restauración en una carpeta separada. Los respaldos contienen datos personales y claves: no publicarlos ni enviarlos como archivos de intercambio.

## Instalar y actualizar

- Copiar el paquete completo a una carpeta local con permisos de escritura. No ejecutar la base desde una carpeta compartida, USB o servicio que sincronice archivos automáticamente. Se intercambian paquetes de cambios, no el SQLite completo.
- En el equipo institucional existente: detener el servicio, crear/conservar un respaldo verificado y actualizar el programa conservando su carpeta `private-data`. No sustituir esa carpeta por una instalación vacía.
- En una instalación institucional nueva: abrir `INICIAR_SISTEMA_CETPRO.bat`. Para recuperar la misma institución, detener el servicio y restaurar su respaldo con `runtime\node.exe scripts\restore-offline.cjs RUTA_DEL_RESPALDO`. Crear una nueva Dirección independiente generaría otra institución y otras claves; sus paquetes no serían intercambiables.
- En cada equipo docente o de Secretaría: abrir el programa, descargar su solicitud y llevarla al equipo institucional. Dirección vincula la cuenta existente y entrega la autorización. Confirmar la huella institucional y recibir el primer paquete con las aulas autorizadas. Cada equipo conserva su base y sus claves propias.
- La exportación entrega cambios; no equivale a confirmación de recepción. Importar primero en vista previa, comprobar el ámbito y aplicar. Si hay conflictos, Dirección decide con motivo; no sobrescribir toda la base.
- La autorización de un equipo vinculado dura 90 días. Recibir actualizaciones institucionales la renueva; Dirección puede renovar el acceso desde una nueva solicitud si venció. Conservar un calendario de intercambios y comprobar la hora de Windows.
- Verificar que Windows tenga Arial, Calibri, Calibri Light y Cambria, las fuentes usadas por las plantillas. Si falta una fuente, instalarla de una fuente autorizada; el sistema rechaza generar el documento en vez de cambiar silenciosamente su aspecto.

## Mantenimiento durante los años siguientes

Crear cada año mediante **Configuración por año**, revisar sus nuevas fechas y asignaciones y conservar los identificadores e historiales del año anterior. No reutilizar un grupo cambiándole el periodo cuando tiene registros académicos.

Las copias automáticas y el historial se conservan; revisar espacio libre periódicamente y mantener copias externas verificadas. No borrar operaciones antiguas directamente con SQLite: sus identificadores evitan duplicados y participan en confirmaciones de sincronización. Si un archivo de intercambio supera 32 MB, enviar por aula/unidad y comprobar la recepción de cada uno.

Antes de cada actualización repetir las pruebas de roles, importación y restauración en una copia. Registrar versión del paquete y fecha de despliegue. Conservar un equipo institucional responsable de las cuentas, autorizaciones y resolución de conflictos.

## Alcance de la auditoría

Las pruebas verifican los casos incluidos y rechazos seguros. No demuestran que los datos capturados sean verdaderos ni garantizan ausencia absoluta de errores futuros. Dirección debe firmar la revisión de datos, permisos y formatos antes de usar documentos oficiales.
