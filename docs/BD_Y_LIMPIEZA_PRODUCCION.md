# Base de datos y limpieza de desarrollo

Fecha: 12 de octubre de 2026. Esquema SQLite: versión 2.

## Estructura y controles

Se conserva la estructura y los identificadores existentes para mantener las matrículas, notas, documentos y sincronización de años anteriores. Los datos de cada entidad se almacenan como JSON validado dentro de tablas SQLite; sus relaciones se comprueban en el motor y en los servicios.

| Tabla / entidad | Función |
| --- | --- |
| `settings` | Institución, identidad del equipo, autorizaciones y ajustes locales |
| `users` | Identidad, rol, credenciales derivadas y asignaciones por aula/unidad |
| `records`: programas, módulos y grupos | Oferta, contexto anual, sección, turno y modalidad |
| `records`: estudiantes y matrículas | Padrón y pertenencia de cada alumno a cada módulo/aula |
| `records`: notas y asistencias | Registros identificados por matrícula, unidad e indicador o sesión |
| `records`: configuración y entregas | Parámetros documentales y PDF entregados con su revisión |
| `operations`, `deliveries`, `receipts` | Cambios firmados y confirmación de intercambio por equipo |
| `conflicts` | Valores incompatibles que requieren decisión institucional |
| `audit` | Acciones y valores anteriores para trazabilidad y recuperación |

La versión 2 agrega restricciones para evitar matrículas sin alumno/aula, registros académicos sin matrícula o unidad válida, notas fuera de 0–20, estados de asistencia inválidos y duplicados de notas, sesiones o matrículas activas modernas. La escritura actualiza únicamente el mismo identificador; una colisión en otro identificador se rechaza y no reemplaza registros.

Se mantienen WAL, escritura duradera, transacciones y comprobación física. La migración de índices es atómica y se conserva la versión anterior si falla. Una aplicación antigua no abre una base con esquema más nuevo. La restauración ordena los registros por sus dependencias, valida el resultado y revierte todo si encuentra un error.

## Limpieza aplicada

Se ensayó primero sobre una copia consistente. Antes de cambiar la base real se guardó una copia SQLite completa y un respaldo JSON recuperable. Ambos están dentro de `private-data/backups`; incluyen información privada y claves, y no se distribuyen con el programa.

- Se retiraron del padrón operativo dos alumnos ficticios y del selector el aula de prueba.
- Se desactivaron y archivaron cinco cuentas de desarrollo todavía sin archivar, incluida Amanda por confirmación del usuario. Se conservaron las cuentas institucionales.
- Se retiraron 1.400 marcas de asistencia creadas por simulaciones, dejándolas sin registrar. No se convirtieron en faltas.
- Se restauraron 34 valores anteriores a simulaciones mediante la cadena exacta de revisiones del historial.
- Se limpiaron las notas y marcas restantes del aula de prueba. Las cuatro notas existentes correspondían a esa aula.
- Quedaron 269 estudiantes institucionales y 24 aulas visibles. La integridad estructural pasó y no quedaron revisiones actuales identificadas como simulación.

La eliminación es lógica: los datos ficticios salen de la operación diaria, mientras se conservan identificadores, auditoría y operaciones de retiro. Esto permite que otros equipos reciban la corrección sin volver a incorporar datos antiguos. No se borraron físicamente historiales ni operaciones de sincronización.

La clasificación de una simulación verifica los bloques exactos de escrituras anteriores al evento de simulación, su autor, aula y unidad. Solo corrige la revisión actual cuando coincide con una revisión generada por esos bloques; conserva las modificaciones manuales posteriores. Un bloque ambiguo queda pendiente y no se elimina por suposición. Repetir la limpieza no vuelve a cambiar datos ya corregidos.

El informe privado de resultados es `private-data/LIMPIEZA_DESARROLLO_2026_10_12.json`. Las bases de otros equipos deben recibir los cambios institucionales y confirmar la recepción. No copiar la base SQLite del equipo institucional a cada docente.

La suite interna de 116 casos pasó después de la migración y limpieza. Se agregó y aprobó además una prueba específica de envío de la corrección firmada a una base docente independiente. La corrección institucional conserva su procedencia y no habilita al director o a Secretaría a editar notas desde las pantallas ordinarias.

## Configuración que se conserva

Continúan las matrículas provisionales autorizadas en ambos módulos, las asignaciones docentes provisionales editables, los calendarios de referencia y los campos documentales pendientes. Son configuración institucional por confirmar; no se clasificaron como datos ficticios para borrarlos.

La limpieza no confirma planes, calificaciones, capacidades, indicadores, horas o créditos que no tengan fuente institucional. Dirección debe completar y validar esos datos antes de emitir los documentos oficiales.
