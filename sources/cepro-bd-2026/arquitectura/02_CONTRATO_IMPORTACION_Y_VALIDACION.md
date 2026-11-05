# Contrato propuesto de importación y validación

## Estado

Especificación técnica propuesta, no importador ejecutado. Los `.md` son fuente organizada para revisión e implementación; no son SQL ni prueban compatibilidad con una BD no proporcionada. El estado documental y el estado de aprobación son distintos.

## Estados de un dato

| Estado | Significado | Uso |
|---|---|---|
| `extraido` | Texto recuperado de una página; puede contener OCR. | Staging solamente. |
| `verificado_fuente` | Texto y relaciones cotejados con la imagen del documento. | Candidato a catálogo, sujeto a contradicciones. |
| `pendiente_validacion` | Lectura, asociación o validez administrativa sin resolver. | Excluido de la carga activa. |
| `conflictivo` | La fuente contiene valores incompatibles. | Excluido hasta resolución documentada. |
| `aprobado_institucion` | Responsable competente confirmó contenido y aplicación. | Habilitado para seed si pasan controles técnicos. |
| `aplicado` | Transacción de importación confirmada en un destino conocido. | Estado de importación, no de extracción. |

Un dato no se convierte en `aprobado_institucion` porque esté escrito en un Markdown ni porque un agente haya corregido su ortografía. El cotejo visual prueba la transcripción; no prueba vigencia o aprobación administrativa.

## Registro mínimo de intercambio

Cada capacidad e indicador debe poder representarse mediante estos campos. Un importador puede producir JSON/CSV/SQL a partir de tablas revisadas, pero debe respetar la semántica.

| Campo | Tipo/semántica | Obligatorio para activar |
|---|---|---|
| `clave_importacion` | Cadena estable asignada y persistida por entidad y versión. | Sí. |
| `tipo_entidad` | Catálogo controlado: competencia, módulo, capacidad, indicador_competencia, indicador_capacidad, UD, etc. | Sí. |
| `programa_ref` | Clave interna resuelta del programa. | Sí para currículo. |
| `plan_ref` | Versión curricular inequívoca. | Sí para currículo. |
| `modulo_refs` | Lista de referencias documentadas. | Cuando corresponde; nunca adivinar por C1. |
| `competencia_refs` | Lista de referencias UC/CE resueltas dentro del plan. | Para capacidades si documentado; duda bloquea la asociación. |
| `nivel_indicador` | `competencia` o `capacidad`; NULL para otras entidades. | Sí para cualquier indicador. |
| `competencia_padre_ref` | UC/CE padre resuelta dentro del plan. | Sí para indicador de competencia; NULL como padre para indicador de capacidad. |
| `capacidad_ref` | Referencia de la capacidad padre. | Sí para indicador de capacidad; NULL para indicador de competencia. |
| `codigo_fuente` | Texto literal; NULL cuando no existe. | No inventar. |
| `texto_literal` | Transcripción de origen. | Sí para contenidos documentales. |
| `texto_normalizado` | Corrección explícita de formato/OCR, sin cambiar el sentido. | Sí al cargar si se usa presentación normalizada. |
| `fuente_sha256` | Huella del PDF. | Sí. |
| `pagina_pdf` | Número de página de archivo empezando en 1; lista si compilado. | Sí. |
| `estado_dato` | Uno de los estados definidos. | Sí. |
| `observaciones` | Dudas y decisiones. | Cuando exista diferencia o ambigüedad. |

Distinguir siempre `id` o clave estable del paquete de `codigo_fuente`: una clave generada para organizar los archivos no es un código documental. Los códigos transcritos conservan su valor literal. Si una extracción no asigna clave técnica estable, hacerlo en staging y publicar una tabla revisable antes de aplicar.

Persistir el mapa `destino_id + namespace_paquete + tipo_entidad + ambito_archivo + clave_archivo → UUID_destino` y reutilizarlo en cada lote. `ambito_archivo` no admite NULL: usar clave de plan para currículo y clave de institución para catálogos raíz. `destino_id` distingue entornos de prueba/producción sin confundir sus UUID. Las referencias entre archivos se resuelven primero contra ese mapa; si una clave apunta a varios UUID o no resuelve, bloquearla. Generar un UUID nuevo solo al crear una entidad nueva aceptada, nunca en cada reimportación. Una corrección del código fuente no cambia la clave estable; una nueva versión curricular sí se identifica de forma explícita. Guardar alias/migraciones de claves si alguna debe cambiar.

## Identidad y deduplicación

1. Resolver primero institución, programa y versión de plan; después módulo y competencia. Resolver indicadores de competencia contra su UC/CE. Resolver capacidades contra sus vínculos documentados y, después, indicadores de capacidad contra su capacidad. No buscar una capacidad inexistente para un indicador del Anexo 8.
2. Construir una clave de candidato con el ámbito completo: institución + programa + versión + tipo + código de fuente + módulo/competencia cuando corresponda. Si no hay código fiable, usar una clave interna persistida y evidencia, no un número calculado con el orden actual de filas.
3. Calcular una firma de comparación del texto normalizado (NFC, espacios unificados, minúsculas solo para comparar), sin eliminar palabras, números, tildes ni negaciones. La firma solo propone coincidencias.
4. Coincidencia exacta del mismo ámbito y significado: un registro canónico y varias evidencias. Conservar las apariciones; no crear dos capacidades porque una reaparece en organización modular y en anexo de capacidades.
5. Mismo código y texto distinto: incidencia, no `UPSERT` destructivo. Mismo texto y ámbito distinto: conservar ambos hasta validar si son la misma entidad curricular.
6. Indicadores idénticos con padres distintos no se fusionan automáticamente. Los indicadores de competencia y los de capacidad se conservan en tipos/tablas distintos, incluso si comparten texto o numeración. Una correspondencia entre niveles es opcional y requiere evidencia; nunca constituye conversión o duplicación automática.
7. Actividades, contenidos, criterios y recursos se clasifican por su encabezado y función; no se cargan como indicador solo por usar un verbo.
8. Un documento nuevo puede completar evidencia de un registro, pero no debe modificar un currículo ya utilizado sin versionado explícito.

## Idempotencia y conflicto

- Clave de lote: hash del documento + versión del paquete + versión del mapeo. Reaplicar exactamente el mismo lote no crea duplicados.
- Resolver claves estables de los archivos con el mapa de identidad permanente antes de calcular altas/cambios; no confundir un ID del paquete con un UUID real.
- Clave de fila persistida y `payload_sha256`: misma clave/mismo payload = sin cambio; misma clave/payload diferente = revisión o nueva versión, nunca sobrescritura silenciosa.
- No usar `TRUNCATE`, borrar toda la carrera ni recrear IDs para actualizar un archivo.
- Ejecutar carga en transacción con aislamiento apropiado; resolver los catálogos padre antes de sus hijos.
- Restricciones UNIQUE/FK del destino deben reforzar la idempotencia, no sustituir el diagnóstico previo.
- Retener manifiesto de IDs creados, actualizados, sin cambio y rechazados. Aplicar control de versión optimista ante cambios concurrentes.

## Validaciones y severidad

| Control | Regla | Resultado ante fallo |
|---|---|---|
| Procedencia | Página válida, fuente exacta, texto/evidencia conservados. | Bloqueo de la fila. |
| Cobertura | Todas las páginas inventariadas y clasificadas, incluidas portadas y páginas ilegibles. | Bloqueo de la afirmación de extracción completa. |
| Jerarquía | Programa/plan resueltos; indicador_competencia con UC/CE padre e indicador_capacidad con capacidad padre. Exigir solo el padre de su nivel y rechazar cruces de plan. | Bloqueo del vínculo/fila afectada. |
| Nombres | Variantes revisadas; no usar fuzzy matching para fusionar automáticamente. | Revisión. |
| Código repetido | Comparar dentro del ámbito, no globalmente. | Conflicto si dos descripciones compiten por la misma identidad. |
| Celdas combinadas | Continuaciones y columnas reconstruidas visualmente. | Revisión del bloque; no rellenar hacia abajo sin comprobar. |
| Fecha | Fecha válida y comienzo ≤ fin, año según fuente; no sustituir 2025/2022 por 2026 sin decisión. | Bloqueo de programación afectada. |
| Intervalos | Solapamientos documentados evaluados; EFSRT concurrente no es automáticamente error. | Revisión, luego regla aprobada. |
| Horas | Si componentes completos y explícitos: teoría + práctica = total. Si no, no calcular ausencia. | Incidencia y bloqueo de importación numérica afectada. |
| Total módulo | Suma de UD completas comparada con total declarado; incluir EFSRT una sola vez. | Incidencia; conservar ambos valores y excluir totales activos sin resolver. |
| Total plan | Suma de módulos comparada con total declarado. | Igual tratamiento; no corregir por reparto proporcional. |
| Créditos | Sumar solo componentes explícitos y equivalentes; no mezclar T/P con total repetido. | Incidencia. |
| Equivalencia | No imponer universalmente 16 h/crédito o 32 h/crédito. | Bloqueo de cálculo derivado sin política validada. |
| Docentes | Nombres documentados no acreditan usuario, DNI ni asignación exacta por UD/turno. | Mantener como referencia; no crear acceso. |
| Reglas académicas | Escala, nota mínima, recuperación y asistencia tienen versión aprobada. | Bloqueo de evaluación/certificación, no de staging curricular. |
| Resultado | Cero referencias huérfanas, cero registros fuera del lote esperado. | Rollback de la transacción. |

## Flujo de aplicación propuesto

1. Registrar fuente y su SHA-256, versión del paquete y alcance elegido.
2. Cargar staging íntegro, incluidas incidencias; validar sintaxis y referencias.
3. Emitir simulación sin escrituras: conteos por entidad/carrera; creaciones; coincidencias; cambios; conflictos; filas excluidas.
4. Cotejar filas dudosas con imágenes y resolver contradicciones con el responsable institucional. Registrar decisión, actor, fecha y evidencia.
5. Mapear al esquema real; respaldar y probar restauración. Ejecutar migración ensayada en un entorno de prueba aislado.
6. Revisar resultados del ensayo y aprobar el lote concreto. Preparar rollback según las IDs afectadas; no borrar registros utilizados por matrículas nuevas.
7. Aplicar mediante transacción y registrar actor, destino, versión del importador y resultado. No enviar datos académicos/personales a terceros como parte de esta carga.
8. Verificar conteos, vínculos y muestras de interfaz/reportes. Reaplicar el lote idéntico y comprobar cero duplicados; esta prueba corresponde al importador real.

## Criterio de salida

Un lote está técnicamente listo cuando el esquema está mapeado, los registros activos no tienen conflictos sin resolver, las sumas y referencias pasan, la simulación es revisable, la aprobación está registrada y el ensayo de aplicación/restauración fue satisfactorio. Un paquete documental puede estar completo para revisión y seguir sin cumplir estas condiciones. No se ejecutó ningún paso sobre una BD de producción durante esta extracción.
