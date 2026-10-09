# Operación docente por unidad

El aula, módulo y unidad se eligen antes de trabajar. Cada pantalla mantiene ese contexto y los permisos de la cuenta.

1. **Preparar:** revisar el nombre; definir capacidad, competencia e indicadores 1 a 5. Los ejemplos ayudan a describir lo que realmente se enseñará. Dirección administra fechas, horas y créditos.
2. **Asistencia:** escoger la fecha y sesión, registrar Presente, Falta, Falta justificada o Tardanza y guardar. Las celdas vacías siguen sin registrar. La sugerencia inicial usa una fecha del calendario si hoy no corresponde y no tiene registros. Se conservan las sesiones históricas y sus avisos, incluidas las externas a las fechas de referencia.
3. **Evaluación:** trabajar un indicador por pestaña. IA1, IA2 e IA3 son instrumentos; IL es el resultado del indicador; R es recuperación. El resultado de la unidad se confirma en su propia pestaña. Cambiar pestañas conserva lo escrito. Guardar envía únicamente celdas modificadas, con control de versión; cero es válido y vaciar una nota exige confirmación. No se calcula un promedio sin una regla institucional confirmada.
4. **Revisar formatos:** elegir Ficha de asistencia o Registro de evaluación. El sistema lee los datos guardados y muestra el PDF original rellenado, con campos pendientes y sus fuentes. La prueba con alumnos ficticios queda dentro de opciones de prueba y no escribe en la base.
5. **Entregas:** entregar solo después de completar los parámetros requeridos. Se conserva la copia exacta del PDF. La entrega se lleva al equipo institucional mediante Sincronización; generar un PDF no lo envía por sí solo.

## Correspondencia con formatos

- Portada TMPL-04: datos comunes del módulo; se abre en Documentos del módulo. El docente aparece una sola vez en su campo, sin superponerse al turno.
- Asistencia TMPL-05 a TMPL-10: estudiantes matriculados, fechas y sesiones, marcas, totales y docente. UD7 reutiliza una ficha de asistencia compatible con su propio nombre y registros; el catálogo original no contiene una séptima ficha física.
- Evaluación TMPL-11 a TMPL-17: capacidad, cinco indicadores, IA1/IA2/IA3, IL, recuperación y resultado confirmado de la unidad.
- EFSRT TMPL-18: espacio Prácticas del módulo; empresa y dirección de cada estudiante, nueve criterios y calificación final. No se mezcla con la evaluación ordinaria de una UD.
- Documentos administrativos: sus permisos siguen siendo los de Dirección y Secretaría; el docente solo recibe su catálogo autorizado.

## Nombres, origen y edición futura

Se añadieron 16 nombres de trabajo para Motos I/II y Carpintería II, agrupando temas del ZIP y afiche en los códigos existentes. **Son propuestas editables**, no una transcripción de un plan oficialmente aprobado. Motos fotografiado tiene más unidades que el plan provisional; Carpintería II fotografiado difiere del afiche. Se identifica el origen en el selector y el inicio de la unidad. Dirección debe revisar la correspondencia definitiva. No se trasladaron notas ni se cambiaron códigos, alumnos, matrículas, horas o créditos.

El script `scripts/unit-working-names.cjs` crea respaldo y actualiza únicamente nombres pendientes; respeta los nombres ya corregidos. La migración comprueba integridad y que los registros académicos no cambien.

## Verificación

Pruebas de permisos y aislamiento por unidad; guardado entre indicadores, cero válido y conservación de notas de otra unidad; acceso directo desde asistencia a la ficha correcta; revisión de los 21 formatos con métricas de tamaño y fuentes; paginación de alumnos y sesiones; portada sin duplicar docente. Revisiones visuales de portada, asistencia, evaluación y EFSRT.

`node tests/audit-live-teacher-documents.cjs` crea una instantánea SQLite consistente y genera los formatos docentes de las 24 aulas en `tests/offline-artifacts/teacher-live-audit` (carpeta ignorada por Git). Guarda PDF, medidas y un informe de errores, campos pendientes, integridad y conservación de registros. Las copias contienen datos personales y son solo para revisión local.

La generación y la integridad técnica no sustituyen la confirmación institucional de capacidades, indicadores, reglas de asistencia, criterios y datos pendientes. Los campos faltantes bloquean la entrega, sin inventar valores.

Resultado de la revisión del 9 de octubre de 2026: **326 PDF generados de 24 aulas; cero errores de generación; integridad correcta y registros académicos conservados en la instantánea.** Los 326 tenían al menos un parámetro pendiente: son vistas revisables, no entregas completas. Los campos faltantes deben ser completados por el responsable que indica cada pantalla.
