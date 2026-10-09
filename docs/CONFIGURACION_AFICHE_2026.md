# Configuración según afiche oficial — 8 de octubre de 2026

Se conservan las siete carreras del afiche y sus catorce módulos. Mecánica Automotriz y Mecánica de Motos permanecen separadas. Los catálogos del consolidado anterior que quedaron reemplazados se archivan; sus datos y operaciones firmadas se conservan.

Los doce grupos de origen mantienen sus identificadores como aulas del módulo I. Se crea un aula hermana para el módulo II, con la misma carrera y modalidad. La autorización de dirección permite registrar provisionalmente al alumnado en ambos módulos: no acredita que el alumno haya cursado o aprobado alguno. Los códigos e identificadores originales se conservan. Las fechas de ingreso desconocidas siguen pendientes.

Hay 588 matrículas provisionales activas: 294 por módulo. La doble matrícula original de Computación Virtual se conserva excluida como duplicidad, sin borrar al alumno. No se fusionaron personas con documentos repetidos ni se modificaron notas o asistencias existentes.

## Cuentas

Se crean once cuentas docentes, una de dirección y una de secretaría. Sus accesos iniciales están en `private-data/ACCESOS_PERSONAL_2026.md` y `.json`; no se incorporan a Git ni al paquete público. Las contraseñas se almacenan en las cuentas mediante scrypt. La relación de accesos legible es un archivo privado para su entrega al personal.

Alejandrina, Azucena, Fidelia, Édgar, Aníbal, Cesario y Serafín reciben sus aulas de ambos módulos. Magda, Teófilo, René y Liz tienen cuenta y carrera descriptiva, pero sus aulas están pendientes por instrucción del usuario. Sus paneles no muestran estudiantes de otras personas. Dirección puede completar sus asignaciones desde Usuarios y asignaciones; la casilla Aulas pendientes permite conservar estas cuentas antes de confirmar su distribución.

Los turnos y modalidades de origen se recuperan de los registros de importación. Computación conserva grupos presencial y virtual, pero su turno queda vacío por indicación del usuario. Corte y Ensamblaje conserva los turnos reales de sus listas; no se asigna un turno a ninguno de sus tres docentes hasta confirmarlo. Las secciones siguen vacías, sin inventar letras.

## Correcciones de módulo

Dirección y secretaría tienen en Matrículas filtros por aula, estudiante y estado. Confirmar módulo elimina el estado provisional. Quitar de este módulo excluye únicamente esa matrícula. Restaurar reutiliza el mismo identificador y sus notas y asistencias, si no existe otra matrícula activa equivalente. Estas operaciones usan revisiones, transacciones, auditoría y sincronización firmada.

El docente no puede cambiar la pertenencia a módulos. Los estudiantes excluidos no aparecen en el registro activo del módulo; su historial sigue disponible. Las actualizaciones de exclusión y restauración viajan al equipo docente sin sustituir sus notas.

## Documentos

Los nombres de carreras y módulos corresponden al afiche. El plan detallado de unidades de Motos y del segundo módulo de Carpintería no quedó confirmado por ese afiche: se conserva la referencia anterior y se señalan las denominaciones, horas y créditos por completar. Tampoco se inventan indicadores, capacidades, resoluciones ni datos de expedición.

Las actas y certificados requieren confirmar la pertenencia al módulo. Las vistas previas y los registros docentes continúan disponibles. Los parámetros faltantes y diferencias de sumas se muestran en el panel.

La prueba con datos reales detectó un nombre de unidad que excedía la cabecera rotada del acta. Se ajustó en varias líneas en ambas páginas, conservando el nombre completo, el mínimo de cuatro puntos y los límites de la columna. Una regresión comprueba el contenido y la geometría de ambas cabeceras.

Para intercambiar estas estructuras, los equipos deben utilizar la versión 3.7.0 o posterior. Los respaldos anteriores a la configuración se conservan en la carpeta privada.
