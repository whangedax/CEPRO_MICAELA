# Auditoría de tipografía y artefactos

Fecha: 9 de octubre de 2026.

Se revisaron los 21 formatos y sus 24 páginas base con datos sintéticos. Se compararon los estilos de las casillas de los libros originales, se extrajeron los textos PDF y se renderizaron las páginas con Poppler. Los originales institucionales se conservaron.

## Correcciones

- Eliminados pies de diagnóstico añadidos por el sistema: cantidades de registros, capacidades de plantilla, identificadores de pruebas y leyendas de borrador. Las líneas, logos, títulos, columnas y etiquetas institucionales siguen en el PDF original.
- Nómina: las casillas de datos personales y matrícula usan Calibri, como C15:J16 del libro. Los demás campos mantienen su perfil.
- Registro de matrícula: los datos del estudiante usan Arial regular, como I6:M9. Se corrigió el uso general de Calibri en esas casillas.
- Evaluación: nombre de programa, módulo, unidad, capacidad e indicadores usan Calibri Light con negrita según C2:C11. Al no existir un archivo separado de Calibri Light Bold en este equipo, la negrita se reproduce mediante relleno y contorno de 0,12 puntos, sin duplicar el texto. Las notas e instrumentos usan Arial regular, como sus casillas de origen.
- Asistencia y EFSRT: se corrigieron negritas en marcas y criterios cuando las casillas originales usan letra regular. El mes se abrevia a tres letras únicamente si una columna aislada no admite el nombre completo; no desaparece.
- Certificado y título: el nombre del estudiante usa Cambria en negrita. Se restauró la jerarquía de tamaño del nombre, institución y denominación, partiendo del tamaño nominal del libro y ajustándolo a la altura y anchura reales del PDF. En el certificado, horas y créditos incluyen su unidad de medida para evitar números sin contexto.
- Sexo en el registro: el formato pide F/M; la nómina usa H/M. La conversión se realiza al imprimir, sin modificar el sexo del estudiante en la base.
- Identificación docente: los nombres en un margen sin etiqueta se muestran como “Docente: …”. Las continuaciones repiten la identificación del docente o coordinador donde corresponde a cada hoja o juego de hojas.
- Se eliminaron capturas de errores que podían ocultar nombres, meses o campos largos. Un desbordamiento bloquea el PDF con el nombre del campo, conservando el dato completo para corregirlo.

## Medidas del conjunto base

Los tamaños siguientes son puntos efectivos de los campos dinámicos, no el tamaño nominal de todas las letras del libro. El PDF original mantiene su propio texto estático. Un valor largo puede requerir una reducción dentro del mínimo del campo; los límites se verifican con métricas de la fuente usada.

| Formato | Páginas | Casillas medidas | Fuentes dinámicas | Tamaño efectivo |
|---|---:|---:|---|---|
| TMPL-01 | 1 | 33 | ArialMT, Calibri | 4.6–8.0 pt |
| TMPL-02 | 1 | 46 | ArialMT, Arial-BoldMT | 8.0–8.0 pt |
| TMPL-03 | 1 | 18 | ArialMT, Arial-BoldMT | 4.0–7.5 pt |
| TMPL-04 | 1 | 15 | Arial-BoldMT, ArialMT | 8.5–9.5 pt |
| TMPL-05 | 1 | 13 | Arial-BoldMT, ArialMT | 5.2–8.5 pt |
| TMPL-06 | 1 | 13 | Arial-BoldMT, ArialMT | 5.2–8.5 pt |
| TMPL-07 | 1 | 13 | Arial-BoldMT, ArialMT | 5.2–8.5 pt |
| TMPL-08 | 1 | 13 | Arial-BoldMT, ArialMT | 5.2–8.5 pt |
| TMPL-09 | 1 | 13 | Arial-BoldMT, ArialMT | 5.2–8.5 pt |
| TMPL-10 | 1 | 13 | Arial-BoldMT, ArialMT | 5.2–8.5 pt |
| TMPL-11 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-12 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-13 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-14 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-15 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-16 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-17 | 1 | 34 | Arial-BoldMT, Calibri-Light, ArialMT | 6.5–8.5 pt |
| TMPL-18 | 1 | 20 | Arial-BoldMT, ArialMT | 4.8–8.5 pt |
| TMPL-19 | 2 | 49 | Arial-BoldMT, ArialMT | 6.0–8.5 pt |
| TMPL-20 | 2 | 53 | ArialMT, Arial-BoldMT, Cambria-Bold | 6.6–20.5 pt |
| TMPL-21 | 2 | 5 | Cambria-Bold, ArialMT | 7.0–16.2 pt |

## Pruebas y límites

Se verifica la fuente y el tamaño realmente enviados al dibujo, además de su medida previa. El historial de medidas está en `tests/offline-artifacts/typography`, carpeta de revisión local ignorada por Git.

Las pruebas cubren los 21 formatos completos, los 21 con parámetros vacíos, ausencia de leyendas ajenas, notas decimales, textos largos, códigos extensos, encabezados rotados, errores de desbordamiento, meses estrechos, alumnos matriculados tardíamente y paginación de alumnos y sesiones. Las continuaciones se comprueban con 49 estudiantes. También se comprueban permisos y conservación de las entregas.

La auditoría de las aulas utiliza una instantánea SQLite: 326 documentos de 24 aulas generados sin errores de generación, con integridad correcta y sin cambios en los registros de la instantánea. Los parámetros institucionales pendientes permanecen pendientes; una vista previa no significa que una entrega esté completa.

Los resultados validan los datos y extremos probados. Un texto arbitrariamente largo no se recorta ni se inventa para que parezca válido: se informa el campo que debe corregirse. No se rellenan firmas, sellos ni fotografías inexistentes.

Verificación final: 36 pruebas automatizadas aprobadas entre tipografía, llenado dinámico y calendario; revisión visual de las 24 páginas base. Las pruebas de desbordamiento también comprueban que el rechazo no requiere recorrer repetidamente todos los tamaños cuando el texto ya falla al mínimo.
