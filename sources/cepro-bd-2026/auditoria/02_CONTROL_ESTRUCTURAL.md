# Control estructural y límites de verificación

Control automático sobre las tablas finales Markdown, con exclusión de bloques de evidencia OCR. Esta comprobación garantiza estructura y referencias presentes, no exactitud académica de cada celda ni compatibilidad con una BD existente.

| Control | Resultado |
|---|---|
| Páginas inventariadas | 150; cobertura por programa y tipo en00_cobertura_fuente.md |
| Archivos de carrera principales | 7 y un complemento eléctrico de indicadores de competencia |
| Capacidades definidas con ID interno | 129 |
| Indicadores de capacidad definidos con ID interno | 378 |
| Indicadores de competencia UC/CE | 258 según conciliación de tablas por carrera |
| IDs de capacidad duplicados | 0 |
| IDs de indicador de capacidad duplicados | 0 |
| Referencias de indicador de capacidad a padre ausente del paquete | 0 |
| Tablas Markdown fuera de evidencia | Sin filas con número de columnas distinto del encabezado |
| Naturaleza de IDs | Propuestos; requieren mapa persistente a IDs de destino |
| Estado de validación en software real | No ejecutada; no se entregó código, esquema ni importador |
| Estado de validación académica institucional | Pendiente para conflictos y textos incompletos |

## Capacidades sin indicador de capacidad documentado

- `MOT-M2C06`: conservar sin indicador inventado; revisar la incidencia de su carrera.
- `MOT-U2C06`: conservar sin indicador inventado; revisar la incidencia de su carrera.

## Qué se comprobó documentalmente

Se recorrieron las 150 páginas con OCR y clasificación de cobertura; se corrigió la orientación por grupos de páginas y se revisaron imágenes de tablas clave y conflictos. Las páginas79 y142 devolvieron inicialmente texto vacío y se recuperaron con una segunda lectura; su contenido no se descartó. Las cifras de tablas y las relaciones se contrastaron en los archivos de carrera con las apariciones repetidas cuando eran útiles. La extracción mantiene incompletos los textos cortados y bloqueos para relaciones o valores contradictorios.

## Lo que esta verificación no certifica

Los indicadores UC/CE se contaron por tabla y se mantuvieron en su nivel; la resolución de vínculos curriculares discutidos requiere revisión institucional. No se creó un catálogo operativo completo de recursos/actividades por UD a partir del OCR: esas relaciones deben cotejarse en la evidencia, especialmente donde hay contaminación de plantilla. Ningún perfil resumido sustituye una descripción oficial literal.

No se ejecutaron migraciones, pruebas funcionales, emisión de certificados, cargas a datos reales ni despliegues. Las pruebas de idempotencia, restauración y permisos descritas en arquitectura son criterios que deberá demostrar la integración futura, no resultados ya obtenidos.
