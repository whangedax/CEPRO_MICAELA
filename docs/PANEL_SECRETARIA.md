# Panel de Secretaría

Al iniciar una sesión nueva, Secretaría elige año y carrera. Las tarjetas muestran grupos y estudiantes únicos del año, sin contar dos veces a una persona matriculada en ambos módulos. Se pueden buscar carreras por nombre.

Después selecciona módulo y grupo. Su inicio ofrece Estudiantes, Matrículas, Organización del grupo, Documentos del módulo, Recepción de documentos y Actualización de equipos. No necesita entrar a una unidad para matricular o preparar documentos generales.

Consultar unidades permite elegir una unidad didáctica o EFSRT y revisar sus formatos. Secretaría consulta notas y asistencia; el docente mantiene la facultad de modificarlas. El contexto permanece visible y los menús permiten cambiarlo.

Un alumno nuevo registrado desde un grupo pasa a Matrículas con su ficha y grupo preseleccionados. Para reutilizar una ficha de otra carrera se busca por DNI o nombre; el padrón institucional se usa como catálogo de candidatos, sin mezclar las matrículas ni los documentos del grupo actual. Quitar a una persona de un módulo se hace en Matrículas; no se archiva automáticamente su ficha institucional.

Recepción de documentos muestra todas las entregas del grupo seleccionado, incluidas las de sus unidades. Las entregas de otro grupo permanecen separadas. La gestión general permite tareas institucionales y archivos de distintas carreras. Los intercambios siguen sujetos a revisión, permisos y conservación de conflictos existentes.

En Usuarios y asignaciones, si se accede desde una carrera, el filtro de aulas toma esa carrera como selección inicial. Crear y actualizar cuentas conserva las restricciones de Secretaría: cuentas docentes, con grupos y unidades explícitos.

## Validación

- Pruebas de interfaz: elección de carrera/módulo/grupo, nuevo estudiante y matrícula, PDF, consulta de unidad sin edición, gestión general y móvil.
- Pruebas de servicio: recepción de documentos de distintas unidades del mismo grupo; bloqueo del grupo externo; conteos sin duplicación; contexto por año, módulo y unidad; exportación y permisos.
- Las pruebas utilizan bases temporales. No se modifican los registros académicos reales al implementar la interfaz.

La guía Carrera y grupo → Estudiantes → Matrículas → Documentos → Recepción → Actualizar equipos permanece fuera del formulario de cada pantalla, para conservarse incluso cuando se cambian pestañas de configuración. La tarea actual queda resaltada. En los selectores, los pasos dependientes permanecen deshabilitados para evitar abrir tareas con el contexto anterior. Cambiar carrera mantiene el aviso de cambios pendientes.
