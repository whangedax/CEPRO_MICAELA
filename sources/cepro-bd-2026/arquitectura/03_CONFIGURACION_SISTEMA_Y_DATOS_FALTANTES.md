# Configuración del sistema: datos de fuente y valores por confirmar

## Lectura correcta

Las tablas separan los datos observados en el PDF de las decisiones de implementación. Las páginas son del archivo PDF, no la foliación manuscrita. Una transcripción documental no acredita que una resolución vigente autorice la oferta. No se asigna un valor por defecto a un dato académico desconocido.

## Contexto documental observado

| Dato | Valor documentado o referencia | Evidencia/limitación |
|---|---|---|
| Institución | CETPRO Micaela Bastidas; también figura Micaela Bastidas Puyucawa. | PDF pp. 2 y 4; conservar variantes y confirmar nombre oficial antes de emitir certificados. |
| Código modular | `1027648` | PDF p. 4. Texto, no número aritmético; verificar cada aparición contradictoria antes de consolidar. |
| DRE | Puno | PDF p. 2. |
| UGEL | San Román | PDF p. 2. |
| Localidad mencionada | San Miguel – Juliaca | PDF p. 2. No equivale a dirección postal exacta. |
| Año de referencia | 2026 | Portada y programación, pp. 1–3. No implica que todos los valores de fechas impresos sean consistentes. |
| Ciclo formativo observado | Auxiliar Técnico | PDF pp. 2 y 4 para Mecánica Automotriz. No propagar a otra carrera sin su evidencia. |
| Modalidad observada | Presencial | PDF p. 4 para Mecánica Automotriz. Confirmar por cada programa/versión. |
| Mecánica Automotriz | Programa presente | PDF pp. 2–3. |
| Mecánica de Motos y Vehículos Afines | Programa presente | PDF p. 20. |
| Carpintería Metálica | Programa presente | PDF p. 44. |
| Peluquería y Barbería | Programa presente | PDF pp. 67–68. |
| Computación e Informática | Programa presente | PDF pp. 101–102. |
| Corte y Ensamblaje | Programa presente | PDF pp. 122–123. |
| Mantenimiento de Sistemas Eléctricos | Bloque curricular parcial presente | PDF pp. 142–150. Carece de itinerario formativo completo en el material recibido; no activar oferta ni cargar programación/módulos completos a partir de este bloque. |

El bloque de Mantenimiento de Sistemas Eléctricos permanece en staging documental: conservar capacidades e indicadores identificados con evidencia, pero no presentarlo como plan completo ni habilitarlo para carga activa hasta completar y validar el itinerario, las horas, créditos y relaciones requeridas.

Esta tabla es un contexto de configuración, no sustituye los catálogos por carrera extraídos en los demás archivos. En particular, las horas, créditos, nombres de módulos, docentes y fechas deben cargarse desde registros con evidencia propia y resolución de conflictos.

## Parámetros funcionales: no completar sin información

`NULL` es el valor inicial de staging para estos campos si no existe una fuente adicional verificada. No habilitar una funcionalidad que dependa de una regla ausente.

| Grupo | Parámetros necesarios | Estado para este paquete | Efecto de ausencia |
|---|---|---|---|
| Institución | Nombre oficial, denominación para certificados, dirección, contacto institucional, director vigente, resoluciones de autorización, vigencias. | Parcial: nombre/código/contexto; demás por verificar. | No emitir documentos oficiales definitivos con datos inventados. |
| Oferta | Programa autorizado, versión de plan, periodo, sección, cupos, sede, turno, aulas/talleres, docente responsable. | Programación y personal documentales requieren conciliación; cupos y aulas no deben inferirse. | Solo catálogo; no abrir matrícula sin oferta validada. |
| Calendario | Inicio/fin del periodo, días lectivos, horas por sesión, feriados aplicados, suspensiones, reprogramaciones. | Fechas de módulos/UD no representan un calendario de sesiones completo. | No generar asistencia o carga horaria efectiva automáticamente. |
| Créditos/horas | Definición de hora, componentes teoría/práctica, criterios de crédito, redondeos, EFSRT. | Totales y componentes deben conservarse por fuente; política de cálculo no acreditada. | No derivar créditos ni horas ausentes. |
| Evaluación | Escala, nota mínima aprobatoria, nivel de logro, pesos por capacidad/indicador, instrumentos, redondeo, ausencias y exoneraciones. | `NULL`, salvo fuente específica y validación posterior. | Deshabilitar cálculo final/publicación de notas. |
| Recuperación | Intentos, requisitos, fechas, sustitución o conservación de notas, responsables. | `NULL`. | No calcular automáticamente aprobaciones o repitencias. |
| Asistencia | Estados permitidos, tolerancia, porcentaje requerido, justificantes, cómputo por hora/sesión y bloqueos. | `NULL`. | No excluir ni aprobar alumnos por una regla supuesta. |
| EFSRT | Modalidad, centro receptor, convenio, supervisor, periodo efectivo, horas acreditadas, instrumentos, aprobación y evidencias. | Un bloque curricular EFSRT no acredita una práctica realizada. | No certificar cumplimiento desde el plan. |
| Matrícula | Identificación de estudiante, requisitos, cohorte, convalidación, traslado, retiro y reserva. | No están en este seed curricular. | Necesita migración operativa independiente. |
| Certificación | Requisitos acumulados, firmas autorizadas, correlativo, serie, código de verificación, plantillas vigentes. | `NULL` donde no documentado. | No emitir certificados válidos mediante datos de ejemplo. |
| Administración | Flujos de aprobación, cargos y facultades, duración de permisos, suplencias. | Propuesta de roles más abajo; no evidencia de personas autorizadas. | No asignar privilegios desde nombres del PDF. |
| Financiero | Tasas, moneda, conceptos, exoneraciones, pagos, comprobantes. | `NULL`; fuera del alcance de planes de estudio. | No crear deuda ni registrar pagos ficticios. |
| Plataforma | Motor/schema, migraciones, API, compatibilidad de plantillas, almacenamiento, respaldos, auditoría. | No proporcionado en el ZIP. | La compatibilidad de producción sigue sin demostrar. |

## Propuesta de configuración técnica

Estos valores son una propuesta para la implementación, no datos extraídos del PDF ni configuración ya aplicada.

| Clave propuesta | Valor propuesto | Observación |
|---|---|---|
| `locale` | `es-PE` | Presentación en español de Perú. |
| `timezone` | `America/Lima` | Propuesta para calendarios y auditoría institucional; fechas curriculares siguen siendo `DATE`. |
| `encoding` | `UTF-8` | Mantener tildes y caracteres. |
| `date_exchange_format` | `YYYY-MM-DD` | Intercambio interno; interfaz puede usar día/mes/año. |
| `unknown_numeric_policy` | `NULL` | No sustituir desconocidos por cero. |
| `auto_publish_imports` | `false` | Separar extracción de aprobación/aplicación. |
| `allow_unresolved_curriculum_links` | `false` | No activar registros con padres inciertos. |
| `auto_generate_students` | `false` | El seed curricular no contiene alumnos. |
| `auto_create_user_accounts_from_teachers` | `false` | Un nombre no autoriza cuenta ni acceso. |
| `evaluation_scale` | `NULL` | Requiere regla institucional versionada. |
| `passing_score` | `NULL` | No asumir 11, 13 ni otro valor. |
| `attendance_threshold` | `NULL` | No asumir un porcentaje. |
| `credit_conversion_rule` | `NULL` | No imponer una equivalencia universal. |
| `official_document_series` | `NULL` | Requiere configuración y autorización de emisión. |

No incluir contraseñas, tokens, claves privadas, credenciales de BD o usuarios administradores predeterminados en un Markdown de seed.

## Matriz de permisos propuesta

Los roles son una propuesta, no una lista de cargos vigentes. Aplicar control por institución, oferta, asignación docente y operación, tanto en API como en consultas; ocultar un botón no basta.

| Rol propuesto | Lectura | Escritura | Restricción clave |
|---|---|---|---|
| Administrador técnico | Configuración técnica y auditoría necesaria. | Integraciones y mantenimiento autorizado. | No puede adjudicarse aprobación académica por ser administrador. |
| Responsable académico | Currículo, ofertas y expedientes según alcance. | Proponer/publicar versiones aprobadas; resolver incidencias curriculares. | No modificar versiones ya usadas sin proceso versionado. |
| Secretaría/matrícula | Datos operativos autorizados. | Matrícula y trámites según facultad. | No cambiar criterios de evaluación ni resultados sin flujo formal. |
| Docente | Ofertas/UD y alumnos asignados. | Asistencia y evaluaciones de su asignación, en periodo abierto. | Sin acceso de escritura a otra carrera/turno por compartir nombre de UD. |
| Supervisor EFSRT | Asignaciones y evidencias de práctica autorizadas. | Seguimiento/evaluación en su ámbito. | No acreditar horas no registradas ni modificar el currículo. |
| Estudiante | Su expediente y programación habilitada. | Sus solicitudes/evidencias autorizadas. | Sin acceso a expedientes de otros alumnos. |
| Auditor/consulta | Información autorizada y trazas. | Ninguna mutación de negocio. | Acceso minimizado a datos personales. |

Registrar cambios curriculares, notas, asistencia, matrículas, emisión de documentos y permisos con actor, fecha, valor previo/nuevo y motivo. Cerrar periodos y exigir una reapertura auditada para cambios posteriores, según política aprobada.

## Flujos que deben ensayarse cuando se reciba el sistema

1. Crear institución/programa/versión y oferta validada; matrícula vinculada a la versión correcta.
2. Asignar docentes por ámbito; verificar que otro docente no puede escribir notas ni ver expedientes ajenos.
3. Registrar sesiones y asistencia según calendario real; comprobar cambios y justificaciones.
4. Distinguir indicadores de competencia e indicadores de capacidad; evaluar únicamente los niveles previstos por reglas aprobadas y consolidar capacidades/UD sin doble conteo; ensayar ausencia, desaprobación y recuperación.
5. Registrar y evaluar EFSRT con evidencias de cumplimiento, sin tomar horas planificadas como horas realizadas.
6. Cerrar módulo/periodo, solicitar corrección y comprobar la auditoría de reapertura.
7. Emitir vista previa de reportes/certificados con plantilla vigente y comprobar nombres, códigos, fechas, horas, créditos y firmas autorizadas.
8. Repetir importación del mismo lote sin duplicados; actualizar una versión futura sin alterar el expediente de una matrícula anterior.
9. Restaurar una copia de prueba y reconciliar conteos/vínculos. No basta con que el respaldo exista.

## Información pendiente para completar la integración

Se necesitan DDL/migraciones y versión del motor real, documentación del importador/API, catálogos actuales con IDs, reglas académicas aprobadas, resoluciones y plantillas vigentes, estructura de sedes/turnos/secciones y las fuentes operativas de personas/matrículas/resultados. Esta lista identifica dependencias del sistema; no condiciona la extracción del currículo que sí puede realizarse desde el PDF recibido.
