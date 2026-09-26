# Fuentes y límites
BD.zip contiene 12 archivos .xlsx y 300 filas con nombre y orden según revisión previa. No son 300 personas únicas confirmadas. No hay tablas estructuradas. M00/M04 deben recalcular conteos desde los originales.
Antecedentes: 7 DNI vacíos; 21 no vacíos con longitud diferente a ocho; 22 valores de DNI repetidos en 48 filas; 13 celdas FECHA no tipadas como fechas; 26 teléfonos vacíos. Hay códigos de sexo heterogéneos. No corregir por deducción. Guardar archivo/hoja/fila, valor y formato originales; la fecha debe confirmar su significado antes de usarla como nacimiento.
Computación virtual tiene encabezado en fila 69 y datos A70:G140. No usar fila inicial fija para todos los archivos. Piloto recomendado: lista PB tarde de 15 registros A6:G20; no contar filas vacías prenumeradas.
Un repetido dentro de virtual requiere revisar identidad porque difieren nombre/teléfono. Repetidos entre grupos pueden ser una persona con varias matrículas. Tipo/número confirmado es clave candidata de identidad; los nombres no autorizan fusión automática.
La fotografía muestra 7 programas con 2 módulos académicos cada uno. Son 14 módulos curriculares, distintos de M00–M15 de construcción. Nombres y equivalencias deben confirmarse oficialmente. No identifica unidades, reglas, créditos, horas o el módulo matriculado de cada persona.

## Preparación de importación
Mantener staging externo o temporal no oficial con clave origen archivo/hoja/fila, datos originales, datos propuestos, motivo y decisión. Reconciliar las 300 filas en categorías mutuamente excluyentes: alta válida, coincidencia, actualización pendiente/autorizada, rechazada/en revisión. Separar incidencias múltiples de conteos de registros. Guardar solo lotes confirmados mediante M03. Reimportar produce cero identidades nuevas indebidas. No inventar un ID de alumno institucional a partir del orden de lista.

## Plantillas
Los 21 nombres proceden de la especificación. Sus archivos Excel oficiales no están incluidos. La matriz PLANTILLAS.csv queda NO_RECIBIDA hasta inspección. No reutilizar plantillas de trabajos anteriores por similitud de nombre. Pedir originales oficiales corregidos y preservar su diseño.
Las guías PDF originales se incluyen como referencia; el estado real lo determinan ESTADO_ACTUAL.md y las evidencias. Una especificación que dice «adjunto» no prueba recepción del archivo.
