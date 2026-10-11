# Usuarios y asignaciones por contexto

Dirección y Secretaría conservan el contexto al abrir Usuarios: año, carrera, módulo, grupo y, cuando corresponde, unidad. La lista contextual muestra únicamente docentes con una asignación real en ese ámbito. Las cuentas con aulas pendientes y las cuentas administrativas se consultan en la gestión general; no se deduce una asignación a partir de una descripción.

## Crear cuenta

El rol contextual es Docente. El grupo seleccionado y sus unidades se preparan automáticamente: en una unidad se marca esa unidad; en el espacio del módulo se marcan las unidades del grupo para que el gestor pueda revisar y desmarcar las que no correspondan. Se muestra un resumen antes de guardar. Si no se ha seleccionado un grupo, el gestor debe elegir una asignación explícita. Una cuenta contextual nueva sin unidades se rechaza.

Guardar cuenta registra la identidad, la contraseña inicial y las asignaciones. No crea carreras ni grupos. Los grupos se gestionan en Organización.

## Editar o retirar acceso

Editar modifica las asignaciones visibles del contexto y conserva las otras aulas, las otras unidades del mismo grupo y su orden previo. El servidor fusiona las asignaciones y exige la versión actual de la cuenta. Las notas, asistencias y matrículas no se modifican.

“Retirar de este ámbito” quita la asignación contextual con motivo. No elimina la cuenta institucional ni sus otros accesos. Si no queda ninguna asignación, la cuenta permanece con aulas pendientes para su revisión en gestión general. Desactivar una cuenta con otras aulas requiere trabajar en la vista general.

“Gestionar todos los usuarios de la institución” abre expresamente la vista general. Allí Dirección administra los roles institucionales; Secretaría conserva sus permisos de gestión de docentes.

## Verificación

Pruebas de servicio y HTTP: filtro por contexto, creación automática, rechazo de otra aula/unidad y de roles administrativos en contexto, conservación de asignaciones, revisión desactualizada y conservación de registros académicos. Pruebas de interfaz: alta, edición, retiro local y gestión general. Se verifican además las guías de Dirección y Secretaría y las pruebas existentes de seguridad, secciones e intercambio entre equipos.

Las pruebas utilizan bases temporales; los docentes creados durante ellas no se incorporan a la base institucional real.
