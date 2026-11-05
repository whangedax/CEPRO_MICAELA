# Modelo relacional propuesto para integrar la extracción

## Alcance y estado

Este documento es una propuesta de arquitectura. No representa el esquema existente de CEPRO_MICAELA: en el ZIP recibido hay un PDF de planes de estudio, no código, migraciones, DDL ni una conexión a la BD. Adaptar tipos y nombres al motor real antes de generar migraciones. Los identificadores descritos son internos, no códigos oficiales.

El paquete documental contiene datos curriculares y de programación. No contiene por sí solo todo el estado operativo de un sistema académico. Separar catálogos curriculares, programación de una oferta y resultados de estudiantes evita que un cambio de docente o fecha altere el currículo.

## Convenciones

- `id`: UUID del destino generado una sola vez al aceptar un registro. Los identificadores estables de los archivos son claves de intercambio y no se presumen UUID ni códigos oficiales; resolverlos con `mapa_identidad_importacion`. Nunca usar el número actual de fila como identidad.
- `codigo_interno`: identificador estable del sistema, único dentro de su ámbito; no reemplaza `codigo_fuente`.
- `codigo_fuente`: cadena literal del documento; nullable, no convertir a entero ni quitar ceros, puntos o guiones.
- Importar cadenas en UTF-8, normalización Unicode NFC; conservar acentos y también el texto literal de origen.
- Horas y créditos: `NUMERIC`, nunca punto flotante. No inferir equivalencias horas/créditos.
- Fechas confirmadas: tipo `DATE`, ISO 8601. Si falta o es dudosa, `NULL` y valor literal en evidencia; nunca inventar el primer día de un mes.
- Borrado lógico de catálogos con referencias; no eliminar historial académico en cascada.
- `NULL` significa desconocido/no documentado. `0` y `false` son valores explícitos. Un campo vacío no equivale a ninguno de ellos.

## Entidades y restricciones

| Entidad | Campos principales | Relaciones y restricciones |
|---|---|---|
| `institucion` | id, nombre_oficial, codigo_modular, sede, dre, ugel | Código modular como texto; variantes de nombre se resuelven mediante alias y evidencia. |
| `institucion_alias` | id, institucion_id, texto_alias, fuente_id | No crear una segunda institución por una variante abreviada. |
| `documento_fuente` | id, nombre, sha256, paginas_total, fecha_documento, fecha_recepcion | SHA-256 único para bytes exactos; nueva edición = nueva fuente, no sobrescribir. |
| `evidencia` | id, documento_id, pagina_pdf, region, texto_literal, texto_normalizado, metodo, estado_revision | `pagina_pdf` entre 1 y el total; región opcional; método OCR/transcripción; revisión separada de extracción. |
| `programa_estudio` | id, institucion_id, codigo_interno, nombre_canonico, codigo_cnof | UNIQUE(institucion_id,codigo_interno); CNOF nullable. |
| `programa_alias` | id, programa_id, nombre_literal, evidencia_id | Resolver nombres variantes, sin unir programas distintos por palabras similares. |
| `plan_estudio` | id, programa_id, version, anio_referencia, ciclo_formativo, modalidad, familia_productiva, sector_economico, actividad_economica, perfil_egreso, estado | UNIQUE(programa_id,version); versión inmutable cuando tiene matrículas; año no basta como versión. |
| `unidad_competencia` | id, plan_id, codigo_fuente, descripcion, tipo | Tipo específica/empleabilidad; el código UC1 o CE1 solamente es único dentro del plan y tipo. |
| `modulo` | id, plan_id, codigo_interno, codigo_fuente, orden, nombre, horas_declaradas, creditos_declarados | UNIQUE(plan_id,codigo_interno); `orden` no es una clave de negocio. |
| `modulo_competencia` | modulo_id, competencia_id, alcance, evidencia_id | PK compuesta; M:N. Una competencia puede alcanzar más de un módulo; no asignarla por proximidad OCR. |
| `capacidad` | id, plan_id, codigo_interno, codigo_fuente, descripcion, tipo, estado | UNIQUE(plan_id,codigo_interno); no asumir que C1 identifica lo mismo en módulos distintos. |
| `capacidad_competencia` | capacidad_id, competencia_id, evidencia_id | PK compuesta; permite varios vínculos documentados sin duplicar la capacidad. |
| `capacidad_modulo` | capacidad_id, modulo_id, evidencia_id | PK compuesta; usar si la fuente formula capacidades dentro del módulo. |
| `indicador_competencia` | id, competencia_id, codigo_interno, codigo_fuente, descripcion, orden, estado | UNIQUE(competencia_id,codigo_interno); indicador de logro de UC/CE, por ejemplo del Anexo 8. Su padre es la competencia, no una capacidad inferida. |
| `indicador_capacidad` | id, capacidad_id, codigo_interno, codigo_fuente, descripcion, orden, estado | UNIQUE(capacidad_id,codigo_interno); indicador formulado para una capacidad. No crear registros a partir de cada línea de OCR. |
| `correspondencia_indicadores` | indicador_competencia_id, indicador_capacidad_id, tipo_relacion, evidencia_id, estado | Opcional, M:N y con evidencia; semejanza de textos no demuestra equivalencia. No copiar ni fusionar ambos niveles. |
| `unidad_didactica` | id, modulo_id, codigo_interno, codigo_fuente, nombre, tipo, orden, horas_teoricas, horas_practicas, horas_total, creditos_teoricos, creditos_practicos, creditos_total | Tipo específica/empleabilidad/EFSRT/otro documentado; totales separados de sus componentes. |
| `ud_capacidad` | ud_id, capacidad_id, evidencia_id | PK compuesta; una UD puede desarrollar varias capacidades. |
| `ud_indicador_capacidad` | ud_id, indicador_capacidad_id, evidencia_id | Opcional: solo con asignación explícita; no duplicar el indicador para añadir el vínculo. |
| `ud_indicador_competencia` | ud_id, indicador_competencia_id, evidencia_id | Opcional: vínculo explícito distinto del anterior; no inferir que todos los indicadores de una UC corresponden a todas sus UD. |
| `contenido_ud` | id, ud_id, orden, descripcion, tipo, evidencia_id | Contenidos, actividades, recursos, metodologías y requisitos se distinguen mediante tipo; no convertirlos en indicadores. |
| `ambito_desempeno` | id, plan_id, descripcion, evidencia_id | Campos laborales del perfil; no son empresas con convenio confirmado. |
| `persona_docente` | id, nombres_documentados, estado_identidad | Nombre por sí solo no acredita cuenta de usuario ni identidad única. DNI/contacto ausentes = NULL. |
| `oferta_academica` | id, plan_id, periodo_id, sede_id, turno_id, seccion, estado | Plan de referencia obligatorio; sección/turno no se inventan. |
| `oferta_modulo` | id, oferta_id, modulo_id, fecha_inicio, fecha_fin | Fechas pertenecen a la oferta, no al módulo curricular reutilizable. |
| `programacion_ud` | id, oferta_modulo_id, ud_id, fecha_inicio, fecha_fin, horas_programadas | Controles de fechas y solapamiento; casos concurrentes requieren regla explícita. |
| `asignacion_docente` | id, docente_id, oferta_id, modulo_id, ud_id, desde, hasta, evidencia_id | Ámbito exacto cuando se conoce. Una lista de docentes de carrera no permite asignarles automáticamente todos los turnos. |
| `periodo_academico` | id, codigo, anio, inicio, fin, estado | Código único institucional; no inventar semestres por una tabla con dos módulos. |
| `regla_evaluacion_version` | id, institucion_id, version, contenido, vigencia_inicio, vigencia_fin, estado | Reglas configurables aprobadas; nota mínima/escala/ponderaciones desconocidas = NULL. |
| `matricula` | id, estudiante_id, oferta_id, estado, fecha | Datos operativos fuera del seed curricular. Requiere fuente propia. |
| `evaluacion_indicador_capacidad` | id, matricula_id, indicador_capacidad_id, instrumento_id, intento, resultado, fecha, regla_version_id | UNIQUE según política de intentos; mantener vínculo al plan vigente de matrícula. |
| `evaluacion_indicador_competencia` | id, matricula_id, indicador_competencia_id, instrumento_id, intento, resultado, fecha, regla_version_id | Solo si una política aprobada evalúa este nivel. No duplicar resultados ni calcular ambos niveles con una misma nota sin regla explícita. |
| `asistencia` | id, matricula_id, sesion_id, estado | Depende de sesiones reales, no se genera desde fechas de UD. |
| `importacion_lote` | id, fuente_sha256, paquete_version, estado, creado_por, aprobado_por, fecha | Distingue preparado, validado, aprobado, aplicado, revertido y rechazado. |
| `mapa_identidad_importacion` | namespace_paquete, tipo_entidad, clave_archivo, ambito_archivo, entidad_destino_id, destino_id, estado | UNIQUE(destino_id,namespace_paquete,tipo_entidad,clave_archivo,ambito_archivo); ámbito no nulo: clave de plan para currículo o clave de institución para catálogos raíz. Persistir la correspondencia clave estable → UUID del destino. No es una tabla temporal de lote. |
| `importacion_fila` | id, lote_id, tipo_entidad, clave_importacion, payload_sha256, entidad_destino_id, accion, errores | UNIQUE(lote_id,tipo_entidad,clave_importacion); trazabilidad del resultado. |
| `vinculo_evidencia` | entidad_tipo, entidad_id, campo, evidencia_id | Trazabilidad por campo para datos compilados desde varias páginas. |
| `incidencia_dato` | id, entidad_tipo, clave_candidata, campo, tipo, valores_observados, paginas, estado, resolucion, resuelto_por | Duda OCR, contradicción, ausencia, código repetido, total discordante o relación no demostrada. |

## Relaciones principales

Institución → programa → versión de plan → módulo → unidad didáctica. El plan contiene unidades de competencia; estas tienen indicadores de competencia propios y se relacionan con capacidades. Cada capacidad puede contener indicadores de capacidad. Ambos niveles se almacenan por separado; un indicador de UC/CE no necesita una capacidad para ser válido. Los enlaces M:N permiten asociaciones documentadas entre currículo y UD sin copiar textos en varias tablas.

Oferta → versión de plan y periodo. Oferta → programación de módulos/UD y asignaciones docentes. Matrícula → oferta → versión curricular fija. Resultados → indicadores de esa versión. Esta separación preserva el currículo de estudiantes antiguos.

## Integridad adicional

1. Todos los extremos de un vínculo curricular deben pertenecer al mismo plan. Verificarlo con FK compuestas o validación transaccional; un UUID válido no basta.
2. Un `indicador_capacidad` requiere una capacidad confirmada; un `indicador_competencia` requiere una UC/CE confirmada. No exigir una capacidad al segundo ni inventar un padre para el primero. Una relación dudosa permanece en staging; ningún indicador activo puede quedar sin su padre del nivel correcto.
3. No exigir unicidad global del texto de una capacidad o indicador: puede repetirse legítimamente entre carreras, módulos o versiones.
4. No exigir que UCn coincida numéricamente con Cn o que una UD desarrolle solo una UC; verificar el documento.
5. Las cifras de una tabla no autorizan reconstruir datos ausentes por resta. Guardar la cifra observada y la discrepancia.
6. Fechas y personal de 2026 son datos históricos de esa oferta, no valores predeterminados de años siguientes.
7. Registrar procedencia y decisión de normalización; nunca corregir silenciosamente una fecha que parece errónea.

## Límites de la migración

Antes de producir DDL se necesita el esquema real, motor y versión, restricciones existentes, API o importador disponible y copias de seguridad. El paquete no acredita que todos los campos propuestos existan o que las 21 plantillas del sistema estén implementadas. Los documentos de entrada deben mapearse contra el modelo real antes de cualquier carga.
