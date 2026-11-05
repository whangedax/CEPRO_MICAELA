# Hallazgos documentales y condiciones de publicación

## Dictamen

**Paquete de extracción para revisión e integración; NO es aprobación de carga en producción.** El documento sí permite construir catálogos académicos con trazabilidad. Sus contradicciones impiden convertir todos los valores en datos activos sin una resolución institucional. El esquema real del sistema no fue entregado: el modelo de datos del paquete es una propuesta de integración, no una migración ejecutada ni compatibilidad comprobada.

Las referencias son páginas físicas del PDF original, numeradas desde 1. `null` significa dato no disponible o no confirmado; no equivale a cero. Los códigos originales se conservan separados de los identificadores internos propuestos.

## Hallazgos confirmados directamente en la imagen

| ID | Página | Hecho observado | Riesgo para la BD | Tratamiento exigido |
|---|---:|---|---|---|
| AUD-001 | 22 | Mecánica de Motos tiene código modular institucional `5705507`; otras secciones identifican `1027648`. | Crear dos instituciones o asignar programa a otra entidad. | Conservar ambas observaciones; no crear una segunda institución automáticamente. Confirmar código institucional antes de activación. |
| AUD-002 | 22 | Motos declara 1088 horas y 40 créditos. | Imponer el total común de 1056 horas a todos los programas. | Validar cargas de Motos contra su itinerario; no sustituir 1088 por 1056 por semejanza con otras carreras. |
| AUD-003 | 38 | En la tabla de elementos de Motos aparecen antropometría del cuerpo humano, tomas de medidas, fibras textiles, tejido/tela y ficha técnica de prenda, al lado del mantenimiento de inyectores. | Introducir contenidos de confección en un módulo mecánico. | Guardar evidencia en cuarentena. No activar esos contenidos ni reasignarlos automáticamente a Corte y Ensamblaje. |
| AUD-004 | 47 | El Anexo 8 de Carpintería Metálica dice institución `CETPRO PUNO` y programa `Técnico–Productiva`; páginas 44 y 50 identifican Carpintería Metálica. | Duplicar institución/programa o perder identificación correcta. | Conservar literal fuente; usar el catálogo como candidato hasta resolución institucional del encabezado. |
| AUD-005 | 68 | Peinados del módulo I muestra 92 horas. Las filas suman 524 horas, pero el total impreso dice 528. | Reportes de carga y certificación incoherentes. | Bloquear publicación de la carga: no cambiar silenciosamente 92 por 96. Contrastar el itinerario y registrar resolución. |
| AUD-006 | 68 | Diagnóstico capilar II inicia `10/08/2025`; Emprendimiento `13/10/2025`; Ética `26/10/2025`; EFSRT II `03/11/2025`. El plan y términos son 2026. | Calendario académico de más de un año por error de plantilla. | Guardar fechas originales en evidencia; fechas canónicas pendientes de confirmación. No reemplazar año por regla global. |
| AUD-007 | 122 | Acabados de confección de prendas de varón inicia `18/10/26` y termina `09/10/26`. | Intervalo temporal inválido. | Bloquear fila de calendario; inicio canónico `null` hasta confirmación. |
| AUD-008 | 105 | Código del programa de Computación e Informática impreso `0.00`. | Utilizar un marcador como código oficial o confundirlo con cero numérico. | Conservar `codigo_fuente='0.00'`; código oficial canónico `null`. No completar con otro código por memoria. |
| AUD-009 | 143 | Título Mantenimiento de Sistemas Eléctricos; descripción y ámbitos mencionan mantenimiento de sistemas electrónicos. | Unificar títulos que pudieran tener alcances formativos distintos. | Mantener título impreso y descripción original, con discrepancia explícita. No renombrar todo el programa a Electrónica sin validación. |
| AUD-010 | 148–150 | Códigos de indicador `C1 I1`, `C1 I2`, etc. se reutilizan en diferentes capacidades técnicas y de empleabilidad. | Colisiones si código original se convierte en clave primaria global. | ID interno compuesto/estable y relación explícita al padre; nunca deduplicar solo por código. |
| AUD-011 | 150 | La última fila de la tabla queda vacía; el archivo termina ahí. | Generar una capacidad ficticia o considerar completa la sección de planificación eléctrica. | No importar fila vacía. Registrar faltante documental; no inventar organización modular/UD/calendario eléctrico. |

La suma de AUD-005 se verificó como `32 + 112 + 92 + 32 + 32 + 32 + 192 = 524`; difiere en 4 horas del total impreso de 528. El módulo II de esa misma hoja suma 528; las dos sumas de filas dan 1052 frente a 1056 total impreso.

## Hallazgos de contraste que deben conservarse en los archivos de carrera

| ID | Programa / fuente | Situación | Tratamiento |
|---|---|---|---|
| AUD-012 | Carpintería Metálica, perfil y formulación pp45–52 | El orden/código de Ética y Emprendimiento no es consistente entre formatos. | No homologar por número CE aislado; mantener texto, código y página, registrar correspondencia propuesta y aprobación pendiente. |
| AUD-013 | Computación, pp103–109 | La denominación Ética y algunos códigos CE/indicadores no corresponden al contenido descrito; hay códigos reutilizados. | No copiar texto de Emprendimiento como definición validada de Ética. Conservar conflicto y relación propuesta aparte. |
| AUD-014 | Corte y Ensamblaje, pp128–130 | Se reutilizan códigos UC4-C1..C3 entre módulos; existen textos parciales y un módulo III vacío. | Claves internas incluyen ámbito/módulo. No completar textos truncados ni crear módulo III activo. |
| AUD-015 | Todos | Capacidades e indicadores reaparecen en formulación, resumen, elementos e itinerario. | Registrar una entidad conceptual con varias evidencias cuando el texto/ámbito coinciden. Si cambia el texto o padre, registrar variante/conflicto, no eliminar por parecido. |
| AUD-016 | Todos | Indicadores de logro de UC/CE del Anexo 8 e indicadores de capacidad de formulación son niveles distintos. | Tablas o atributo de nivel separados; padre obligatorio del nivel correspondiente. No fusionarlos en una lista plana. |

Los archivos por carrera contienen el detalle y la evidencia de estos contrastes. Que dos textos sean similares no demuestra equivalencia académica.

## Errores de extracción que no son errores de la institución

| Página | Resultado OCR | Comprobación | Acción |
|---:|---|---|---|
| 79 | Texto vacío en primera pasada definitiva. | La imagen contiene una tabla de Peluquería. | Recuperar visualmente y contrastar resúmenes; no declarar página en blanco. |
| 142 | Texto vacío. | Portada legible de Mantenimiento de Sistemas Eléctricos 2026. | Leer portada visualmente; no generar datos académicos a partir de su ilustración. |
| 105 | OCR modular `1077648`. | Imagen legible `1027648`. | Transcribir `1027648`; conservar rastro de la corrección técnica. No abrir un conflicto institucional falso. |
| 19, 42, 100, 120 | Pocos caracteres de texto en cuadros de comprobación. | Son cuadros pequeños con cifras y colores. | Verificar cálculos con filas normalizadas y revisión visual, no contar su OCR como transcripción numérica completa. |

## Datos ausentes o no confirmados

| Grupo | Qué puede extraerse | Qué no debe suponerse |
|---|---|---|
| Institución | Denominaciones y alias impresos, DRE Puno, UGEL San Román, código mayoritario 1027648 con conflicto en Motos. | Resolución legal vigente, domicilio oficial completo, contactos oficiales o validez registral actual. |
| Programas | UC, CE, capacidades, indicadores, perfiles, ámbitos y cargas cuando constan. | Aprobación institucional de las discrepancias, equivalencias entre programas o vigencia normativa externa. |
| Planificación | Fechas, turnos, docentes y organización anual impresos. | Que nombres docentes constituyan usuarios con acceso o que un turno habilite automáticamente una sección. |
| Evaluación | Indicadores y descripciones académicas. | Escala de notas, nota mínima, ponderaciones, redondeo, recuperación, asistencia mínima o reglas de certificación no especificadas. |
| Operación | Propuesta de entidades y flujos para implementar. | Matrículas reales, DNI, contactos personales, notas, asistencia, pagos o expedientes de estudiantes. |
| Sistema | Requisitos de integridad, trazabilidad e importación propuestos. | Motor de BD, nombres de tablas reales, API, migraciones, roles existentes, plantillas implementadas o secretos de despliegue. |
| Sección eléctrica | Perfil, UC/CE, indicadores y formulación hasta página150. | UD, cargas por módulo, fechas, EFSRT detallada y recursos no incluidos en esta sección del PDF. |

## Condiciones de aceptación antes de activar datos

1. Resolver por escrito los hallazgos bloqueantes de identidad, calendario, cargas, códigos y textos incompletos, conservando responsable, fecha, valor anterior y evidencia.
2. Mapear el catálogo contra el esquema real del sistema; transformar explícitamente los campos y no importar Markdown mediante interpretación libre.
3. Importar primero a tablas de preparación con estado `pendiente_revision`; ejecutar validación de claves, padres, duplicados, intervalos, sumas y campos obligatorios.
4. Comparar muestras de cada programa con imágenes originales, especialmente celdas combinadas y tablas con códigos repetidos. Mantener los faltantes como `null` y no como cadenas `"null"` en la BD.
5. Activar únicamente registros resueltos. Separar el plan académico 2026 del catálogo permanente y de la asignación docente real.
6. Verificar los flujos de matrícula, evaluación, EFSRT, actas y certificación con datos de prueba y reglas institucionales confirmadas. Una extracción documental no acredita funcionamiento de esos flujos.
7. Ejecutar la carga final con copia de seguridad, transacción, reporte de diferencias, control de acceso y mecanismo de reversión. Este paquete no ejecuta esa operación.

No se han autorizado, publicado ni migrado datos reales o el sistema de producción en esta auditoría.

## Bloque eléctrico incompleto

Páginas142–150 contienen portada, perfil, programa y formulación; faltan organización modular, elementos de módulo e itinerario completo. Los1056h/41cr declarados enp144 no se reconcilian por UD con lo adjunto. UC3 yCE5 están declaradas pero carecen de formulación de capacidades en este bloque. Mantener horas/créditos por UD, nombres de módulo, fechas y asignaciones ausentes como null.
