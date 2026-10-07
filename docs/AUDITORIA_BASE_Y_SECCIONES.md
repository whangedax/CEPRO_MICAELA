# Aulas, secciones y protección de datos — 7 de octubre de 2026

Cada aula se identifica por un groupId estable. Carrera, módulo, periodo, nombre de grupo, sección y turno describen ese aula. Grupo 1 / sección A y Grupo 1 / sección B son aulas diferentes con identificadores independientes. No se dividió ni reasignó automáticamente ninguna matrícula existente.

La creación y edición de cuentas contiene un apartado solo para Docente, con filtros de carrera, periodo, módulo, grupo y sección. Las unidades elegidas forman la asignación efectiva; un resumen muestra todas las aulas seleccionadas incluso si un filtro oculta alguna. Las cuentas de dirección/secretaría no presentan asignaciones docentes.

El servidor comprueba que el aula tiene periodo, módulo y unidades válidos. Una sección no puede utilizarse con el identificador de otro grupo. Se agrupan asignaciones repetidas de la misma aula, conservando las unidades. La asignación firmada circula hacia el equipo del docente y controla consultas, notas, asistencia, documentos y archivos de intercambio.

Las secciones que ya tienen matrículas no se cambian por otra sección; se crea otra aula. Un nuevo periodo también utiliza un aula nueva cuando existen registros. Los identificadores de matrículas, notas y asistencia anteriores permanecen estables. Los datos institucionales y del documento toman la sección del aula, sin permitir una contradicción desde el formulario documental.

SQLite mantiene WAL y synchronous FULL, tiempo de espera para bloqueos, versión de esquema y comprobación física al abrir. Guardas de escritura rechazan JSON inválido, identificadores inconsistentes y cuentas con estructura inválida. Los índices por grupo/alumno preparan consultas relacionales. La comprobación para dirección detecta matrículas huérfanas, unidades/períodos incompatibles, identificadores académicos incorrectos, notas/marcas inválidas y asignaciones inválidas.

Se crea una copia privada diaria al iniciar o antes de la primera transacción del día. Los nombres son únicos y las copias no se eliminan automáticamente. Un error de espacio o permisos impide aplicar cambios. Restaurar verifica el checksum y las relaciones dentro de una transacción: un respaldo incompatible se revierte completo y conserva la base anterior.

Resultado operativo: private-data y demo-data superaron la integridad física; no se detectaron relaciones rotas. La base operativa mantiene pendientes históricos de configuración, secciones, documento repetido y una duplicidad de matrícula importada sin periodo definido (MAT-IMP-BD-194 / MAT-IMP-BD-195). Estos registros se conservan hasta que dirección confirme su conciliación. No se fusionaron alumnos ni se trasladaron notas automáticamente.

Pruebas incluyen dos secciones del mismo grupo, aislamiento entre docentes, asignación cifrada, periodo siguiente con matrícula nueva, corrupción JSON, relación huérfana, rollback de recuperación, copia diaria sin duplicar y disco sin espacio sin modificar datos.

Para una operación prolongada: complete los periodos y secciones reales, use aulas nuevas cada periodo y pruebe periódicamente recuperar una copia en una carpeta aislada. Guarde copias externas al disco del sistema y revise el espacio disponible. Esta revisión reduce errores detectables; no sustituye mantenimiento, pruebas de recuperación ni vigilancia del crecimiento del historial.

Se comprobó además que matricular o trasladar a un aula cerrada se rechaza sin retirar la matrícula original. Una fecha de ingreso posterior al término confirmado del grupo requiere utilizar el periodo correspondiente.
