# Registro, validación e impresión de títulos

## Flujo de trabajo

1. Seleccionar el aula y elegir explícitamente al estudiante. Se puede filtrar por DNI, apellidos o código de matrícula.
2. Dirección ingresa el código institucional confirmado. Puede consultar una propuesta desplegando **Preparar código institucional**. El correlativo propuesto se verifica contra el libro antes de guardar.
3. Registrar el código asignado por UGEL, la resolución que corresponde al programa y la fecha real de expedición. La resolución individual de expedición y el expediente tienen sus propios campos.
4. Guardar y abrir **Vista de impresión**. Revisar la portada y el reverso. Si faltan datos obligatorios, la vista se identifica como borrador.

## Datos a través de los años

- El registro institucional conserva el código completo y sus segmentos, incluidos los ceros iniciales. Para este título de Auxiliar Técnico se usa el patrón NNNNNN-AT-DNI-SIGLA+REFERENCIA-AÑO.
- La sigla, la referencia de dos dígitos y el año registral se confirman al preparar el código. La referencia corta es un dato explícito, pues la guía no establece su significado exacto.
- El control de correlativos usa el año del código e incluye registros guardados y emisiones definitivas de la base local. Revisar ambos al actualizar una base que haya trabajado en paralelo con otra.
- Cuando cambia un programa o resolución, confirmar el valor vigente al preparar un título de la nueva cohorte. La resolución explícita de la matrícula tiene prioridad y permite conservar la aplicable a una cohorte anterior.
- Los valores históricos permanecen en SQLite. Para corregir un código de formato anterior, consultar el libro de registros y reemplazarlo únicamente después de verificarlo. Los PDF archivados se conservan como fueron emitidos.
- Versionar la plantilla si se aprueba un cambio de formato o nivel. Verificar las tres apariciones de A, las posiciones de B y C, la fecha de expedición y ambas caras A4 con datos sintéticos antes de usar la nueva versión.

## Comprobación en el CETPRO

Imprimir a tamaño real en A4 horizontal y revisar anverso y reverso con la impresora institucional. Confirmar que el sentido de giro de la segunda cara y los márgenes coincidan con el papel y el mecanismo dúplex disponibles.
