# Auditoría de formatos, permisos e intercambio offline

Fecha: 6 de octubre de 2026.

Se generaron los 21 formatos a partir de los PDF institucionales y se revisaron las 24 páginas renderizadas con Poppler. Se resolvieron todos los parámetros requeridos con datos ficticios y se extrajeron los valores para contrastar DNI, unidades, resoluciones, créditos, EFSRT, notas decimales y datos registrales. No se modificaron los archivos fuente.

## Fuentes, tamaño y posiciones

La plantilla PDF conserva sus títulos, líneas, logos y estilos. Los libros originales utilizan principalmente Arial, y Calibri en el registro de matrícula. El texto dinámico usa esas fuentes del sistema Windows e incluye Arial Bold donde la caja lo requiere. Los puntos de impresión del PDF pueden diferir del tamaño nominal Excel por la escala de impresión. Se reduce o divide el texto en líneas para que quepa; no se recortan nombres de módulos o unidades silenciosamente. Un dato que excede el tamaño mínimo permitido produce un error para su corrección.

Las cajas están medidas en puntos PDF, con coordenadas x/y desde la esquina superior izquierda. DOCUMENTOS_AUDITORIA.json conserva para cada campo medido fuente, negrita, puntos, caja, límites reales y número de líneas. La tabla siguiente resume el texto dinámico sometido al ajuste de cajas. Las cifras y las cabeceras rotadas que se dibujan directamente se contrastaron mediante extracción y revisión visual; no tienen una prueba universal de colisiones. La auditoría valida este conjunto de datos y el bloqueo de desbordamientos, sin afirmar que cualquier texto arbitrario tendrá idéntico tamaño al original.

|Formato|Documento|Páginas|Cajas medidas|Puntos dinámicos|Dentro de cajas|
|---|---|---:|---:|---|---|
|TMPL-01|Nómina de matrícula|1|111|5.50–8.00|Sí|
|TMPL-02|Ficha de matrícula|1|47|8.00–8.00|Sí|
|TMPL-03|Registro de matrícula modular|1|205|4.80–7.50|Sí|
|TMPL-04|Portada de carpeta docente|1|16|8.00–9.50|Sí|
|TMPL-05|Asistencia UD1|1|184|5.90–8.50|Sí|
|TMPL-06|Asistencia UD2|1|184|5.90–8.50|Sí|
|TMPL-07|Asistencia UD3|1|184|5.90–8.50|Sí|
|TMPL-08|Asistencia UD4|1|184|5.90–8.50|Sí|
|TMPL-09|Asistencia UD5|1|184|5.90–8.50|Sí|
|TMPL-10|Asistencia UD6|1|184|5.90–8.50|Sí|
|TMPL-11|Evaluación UD1|1|286|6.50–8.50|Sí|
|TMPL-12|Evaluación UD2|1|286|6.50–8.50|Sí|
|TMPL-13|Evaluación UD3|1|286|6.50–8.50|Sí|
|TMPL-14|Evaluación UD4|1|286|6.50–8.50|Sí|
|TMPL-15|Evaluación UD5|1|286|6.50–8.50|Sí|
|TMPL-16|Evaluación UD6|1|286|6.50–8.50|Sí|
|TMPL-17|Evaluación UD7|1|286|6.50–8.50|Sí|
|TMPL-18|Consolidado EFSRT|1|174|5.00–8.50|Sí|
|TMPL-19|Acta de evaluación modular|2|47|6.00–8.50|Sí|
|TMPL-20|Certificado modular|2|54|7.00–10.00|Sí|
|TMPL-21|Título|2|6|7.00–10.00|Sí|

## Correcciones efectuadas

- Familias Arial/Calibri incrustadas para el texto dinámico, en vez de depender de Helvetica. Métricas adaptadas a las fuentes TrueType.
- Cabeceras de UD2 a UD7 alineadas con sus cajas reales; nombres largos del módulo ajustados en la ficha, registro y portada.
- Nombres de unidades y capacidades del acta completos; desbordamientos bloqueados en cabeceras rotadas.
- Matrícula, subsanación opcional, empresa y criterios EFSRT, unidad de competencia y reverso del certificado cubiertos por parámetros dinámicos.
- Eliminación de marcas de agua del PDF. Los textos DEMO dentro de los datos ficticios siguen identificando la institución de ensayo.
- Reparación en las copias generadas de referencias gráficas FXE1 inexistentes en cuatro PDF originales (01, 05, 13 y 14).
- Corrección del lector XLSX para prefijos XML y celdas vacías; se conservan columnas y documentos con ceros iniciales.
- Registro de un alumno en varias aulas sin duplicarlo; cuenta docente con varias aulas creada una sola vez.
- Formulario de nuevo grupo movido a Grupos; ya no estaba insertado erróneamente en el mensaje de traslado.

## Responsabilidad por rol

|Rol|Cuentas|Configuración|Datos académicos|
|---|---|---|---|
|Dirección|Todos los roles; vinculación y activación institucional|Institución, carrera, currículo, registro y cierre|Consulta y consolidación; revisa conflictos|
|Secretaría|Solo docentes y sus aulas; altas remotas requieren activación institucional|Grupo y matrícula|Estudiantes, matrícula y recepción documental; consulta notas/asistencia|
|Docente|Sin gestión de cuentas|Sus unidades; EFSRT si está asignado|Notas/asistencia de sus aulas; documentos permitidos y propuestas de alumnos|

La política también se aplica en API y sincronización. Ocultar un menú no es el único control. Una persona con control administrativo de Windows puede acceder a los archivos locales: las cuentas del programa no sustituyen los permisos del equipo.

## Intercambio y continuidad

JSON, CSV, XLSX y tablas pegadas tienen previsualización, errores por fila, revisiones y copia previa. Una transacción fallida se revierte completa. Las plantillas son versión 1, hasta 12000 filas y 32 MB, sin fórmulas ni macros. No se importa directamente otra base SQLite, Access ni archivos .xls. Las listas de docentes excluyen contraseñas y hashes; las claves nuevas se entregan aparte.

Los equipos sin internet intercambian operaciones cifradas por USB a través del equipo institucional. Si se modifica la misma celda en dos equipos se conservan ambos valores y se requiere revisión; la actualización no elimina notas ni asistencias al añadir estudiantes. No hay actualización instantánea sin un medio de comunicación.

Se crearon copias privadas antes de convertir códigos de 297 matrículas operativas y 12 de demostración. Los identificadores internos se mantuvieron; una comparación exacta confirmó que todas las notas y asistencias permanecieron iguales. El código se deriva del documento y ordinal, conservando ceros iniciales. Los datos históricos incompletos siguen señalados como pendientes.

## Verificación

Las suites de seguridad, documentos y tablas cubren 26 escenarios. La prueba de Edge usa una base aislada e incluye login, roles, grupos, matriz de notas, asistencia, PDF, tema persistente y vista móvil. Los resultados definitivos quedan en VERIFICACION_OFFLINE.md.

Evidencia: output/pdf/CETPRO_FORMATOS_RELLENADOS_DEMO.pdf, output/spreadsheets/PLANTILLAS_ACTUALIZACION_CETPRO.xlsx y output/audit/DOCUMENTOS_AUDITORIA.json.
