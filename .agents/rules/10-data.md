# Regla CETPRO — datos e identidad

## Identidad
- `ID_ESTUDIANTE` es una clave técnica estable generada por el sistema.
- DNI/documento se almacena como texto, nunca como número.
- Un mismo documento en varias fuentes no autoriza fusión automática si hay conflictos.
- Los nombres no constituyen clave de identidad.
- Nunca completar ceros, fechas, sexo, teléfono, correo o dirección por deducción.

## Matrícula
- Estudiante y Matrícula son entidades diferentes.
- Un estudiante puede tener varias matrículas en periodos/grupos/programas/módulos distintos.
- Repetición de un estudiante entre listas no es por sí sola un error.
- No asignar Módulo I/II por inferencia desde la carrera.

## Importación
Cada fila importada conserva: archivo, hoja, fila, valores originales y hash/lote de origen.
Clasificar filas en estados como: candidata válida, coincidencia, conflicto, pendiente de revisión o rechazada.
La reimportación del mismo lote no debe crear identidades nuevas indebidas.

## Borrado
Preferir estados activos/inactivos o anulaciones trazables. Evitar borrado físico de registros académicos ya usados en otras entidades.
