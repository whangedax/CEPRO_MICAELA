# Mecánica Automotriz — catálogo documental 2026

Estado: `documentado_con_conflictos`. Identificador interno propuesto: `AUTO`. Fuente única: `BD CEPRO DOCUMENTOS.pdf`, páginas PDF 2–19 (numeración digital, no folio manuscrito). Este archivo es un catálogo para revisión/importación en staging; los conflictos siguientes impiden activar automáticamente el plan completo en producción. Los IDs AUTO-* son técnicos propuestos; no son códigos oficiales. Se normalizaron acentos, espacios y errores evidentes de OCR sin cambiar el alcance del desempeño.

## Identidad y perfil

| Campo | Valor extraído | Página |
|---|---|---|
| Institución | CETPRO Micaela Bastidas | 4 |
| Código modular | 1027648 | 4 |
| DRE / UGEL | Puno / San Román | 3–4 |
| Programa | Mecánica Automotriz | 3–5 |
| Código de programa impreso | G21 (verificado visualmente en p.4); itinerario deja raya | 4–5, 18 |
| Ciclo / modalidad | Auxiliar técnico / presencial | 4–5 |
| Formación dual o alternancia | null; la celda contiene 0, no es una modalidad válida a importar | 4–5 |
| Sector / familia | Comercio / Actividad Automotriz | 4 |
| Actividad económica | Comercio al por mayor y al por menor y reparación de vehículos automotores y motocicletas | 4 |
| Docente de programación | Edgar Velasquez Vilca | 3 |
| Año | 2026 | 2–3 |
| Créditos declarados | 40 | 5, 18 |
| Horas declaradas alternativas | 1024 en programa/elementos; 1056 en programación e itinerario | 3, 5, 14, 16, 18 |

Perfil de egreso (síntesis, no nueva competencia): auxiliar técnico capaz de realizar mantenimiento y reparación de vehículos; usar TIC, buscar y analizar información, comunicarse efectivamente, liderar emprendimientos sostenibles y contribuir a la convivencia democrática. Ámbitos: talleres automotrices locales, venta de automóviles, equipos mecánicos municipales y regionales y taller institucional (p.4).

## Competencias específicas del perfil

| ID interno | Código fuente | Descripción | Página |
|---|---|---|---|
| AUTO-UC1 | UC1 | Realizar el mantenimiento y reparación de los sistemas de frenos, dirección, suspensión y transmisión de vehículos automotrices, según el manual del fabricante, procedimientos establecidos y normativa vigente. | 4–5 |
| AUTO-UC2 | UC2 | Realizar el mantenimiento, reparación y configuración electrónica del motor de combustión interna de los vehículos automotores convencionales y con asistencia electrónica, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 4–5 |
| AUTO-UC3 | UC3 | Realizar el mantenimiento y reparación del sistema eléctrico y electrónico de vehículos automotrices de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 4–5 |
| AUTO-UC4 | UC4 | Desarrollar la conversión del sistema de combustible de vehículos automotrices convencionales, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 4–5 |

## Competencias de empleabilidad

| ID interno | Código fuente del programa | Denominación | Descripción | Página |
|---|---|---|---|---|
| AUTO-CE1 | CE1 | Tecnologías de información | Manejar herramientas informáticas de las TIC para buscar y analizar información, comunicarse y realizar procedimientos o tareas vinculados al área profesional, de acuerdo con los requerimientos de su entorno laboral. | 4, 6 |
| AUTO-CE2 | CE2 | Emprendimiento | Identificar nuevas oportunidades de proyectos o negocios que generen valor y sean sostenibles, organizando y distribuyendo recursos, con creatividad, liderazgo y ética; innovar en bienes, servicios, procesos o productos. | 4, 6 |
| AUTO-CE3 | CE3 | Comunicación efectiva | Expresar claramente conceptos, ideas, sentimientos, hechos y opiniones oralmente y por escrito para interactuar en contextos sociales y laborales diversos. | 4, 6 |
| AUTO-CE4 | CE4 | Ética | Establecer relaciones con respeto y justicia y contribuir a una convivencia democrática orientada al bien común, diversidad y dignidad de las personas en su contexto laboral. | 4, 6 |

La numeración de CE cambia en organización modular/itinerario: TIC aparece como CE2, emprendimiento como CE3 en p.13, mientras p.18 repite CE2/TIC en la fila de emprendimiento. Se conserva la relación semántica propuesta; confirmar antes de asignar FK oficiales.

## Módulos, unidades didácticas y programación

M1: **Mantenimiento y reparación de sistemas de frenos, dirección, suspensión y transmisión**. M2: **Diagnóstico y mantenimiento del motor de combustión interna de los vehículos automotrices**. Nombres y contenidos en pp.3, 13–18.

Las horas y créditos siguientes se transcribieron del itinerario p.18 y se contrastaron visualmente con p.3; las fechas provienen de p.3. EFSRT se modela como experiencia, no como una UD técnica adicional. El vínculo capacidad–UD se toma de p.13. No usar las cifras distintas de pp.14–17 como reemplazo silencioso.

| Módulo | ID interno | Unidad/experiencia | Capacidad propuesta | Cr.T | Cr.P | Cr.total | HT | HP | H.total | Inicio | Término | Fuente |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---|
| AUTO-M1 | AUTO-UD01 | Organiza el aula taller automotriz | AUTO-M1-C01 | 1 | 1 | 2 | 16 | 32 | 48 | 2026-03-16 | 2026-03-25 | 3, 13, 18 |
| AUTO-M1 | AUTO-UD02 | Mantenimiento del sistema de frenos, dirección y suspensión | AUTO-M1-C02 | 2 | 2 | 4 | 32 | 64 | 96 | 2026-03-26 | 2026-04-20 | 3, 13, 18 |
| AUTO-M1 | AUTO-UD03 | Mantenimiento del sistema de transmisión | AUTO-M1-C03 | 2 | 2 | 4 | 32 | 64 | 96 | 2026-04-21 | 2026-05-14 | 3, 13, 18 |
| AUTO-M1 | AUTO-UD04 | Aplicación de herramientas informáticas | AUTO-M1-C04 | 1 | 1 | 2 | 16 | 32 | 48 | 2026-05-15 | 2026-05-26 | 3, 13, 18 |
| AUTO-M1 | AUTO-UD05 | Metodologías para el emprendimiento | AUTO-M1-C05 | 1 | 1 | 2 | 16 | 32 | 48 | 2026-05-27 | 2026-06-05 | 3, 13, 18 |
| AUTO-M1 | AUTO-EFSRT01 | Experiencias formativas en situaciones reales de trabajo | null | 0 | 6 | 6 | 0 | 192 | 192 | 2026-06-08 | 2026-07-24 | 3, 13, 18 |
| AUTO-M2 | AUTO-UD06 | Diagnóstico y mantenimiento de motores combustión interna Otto y Diesel | AUTO-M2-C01 | 2 | 2 | 4 | 32 | 64 | 96 | 2026-08-10 | 2026-08-26 | 3, 13, 18 |
| AUTO-M2 | AUTO-UD07 | Diagnóstico y mantenimiento del sistema de lubricación y refrigeración | AUTO-M2-C02 | 1 | 1 | 2 | 16 | 32 | 48 | 2026-08-27 | 2026-09-10 | 3, 13, 18 |
| AUTO-M2 | AUTO-UD08 | Diagnóstico y mantenimiento del sistema de distribución y alimentación | AUTO-M2-C03 | 2 | 2 | 4 | 32 | 64 | 96 | 2026-09-11 | 2026-10-05 | 3, 13, 18 |
| AUTO-M2 | AUTO-UD09 | Comunicación para las buenas relaciones interpersonales | AUTO-M2-C04 | 1 | 1 | 2 | 16 | 32 | 48 | 2026-10-06 | 2026-10-16 | 3, 13, 18 |
| AUTO-M2 | AUTO-UD10 | Ética para la buena convivencia | AUTO-M2-C05 | 1 | 1 | 2 | 16 | 32 | 48 | 2026-10-19 | 2026-10-29 | 3, 13, 18 |
| AUTO-M2 | AUTO-EFSRT02 | Experiencias formativas en situaciones reales de trabajo | null | 0 | 6 | 6 | 0 | 192 | 192 | 2026-11-03 | 2026-12-17 | 3, 13, 18 |

Totales calculados desde p.18: M1 = 20 créditos, 528 horas; M2 = 20 créditos, 528 horas; programa = 40 créditos (14 teóricos + 26 prácticos), 1056 horas (224 HT + 832 HP). Técnicas: 20 créditos / 480 h; empleabilidad: 8 / 192 h; EFSRT: 12 / 384 h. Equivalencia impresa: 16 HT por crédito teórico y 32 HP por crédito práctico. No convertir estas equivalencias en regla global para otras carreras sin comprobarlas.

## Capacidades normalizadas

Las capacidades se registran una vez, aunque reaparecen en resúmenes y elementos del módulo. Las referencias a pp.10–12 corroboran el texto, no crean nuevas capacidades. La vinculación de UC3 C3 a UC2 requiere resolución institucional.

| ID interno | Código fuente | Competencia padre propuesta | Módulo | Tipo | Capacidad | Página principal |
|---|---|---|---|---|---|---|
| AUTO-M1-C01 | UC1 C1 | AUTO-UC1 | AUTO-M1 | técnica | Organizar, en el área de trabajo, las herramientas, instrumentos, equipos y materiales del taller automotriz, teniendo en cuenta las especificaciones de calidad con seguridad e higiene. | 7 |
| AUTO-M1-C02 | UC1 C2 | AUTO-UC1 | AUTO-M1 | técnica | Ejecutar el mantenimiento de los componentes del sistema de frenos, dirección y suspensión en base a las especificaciones técnicas con seguridad e higiene. | 7 |
| AUTO-M1-C03 | UC1 C3 | AUTO-UC1 | AUTO-M1 | técnica | Ejecutar el mantenimiento de los componentes del sistema de transmisión, de acuerdo a las especificaciones técnicas con seguridad e higiene. | 7 |
| AUTO-M1-C04 | CE2 C1 | AUTO-CE1 | AUTO-M1 | empleabilidad | Manejar herramientas informáticas de las TIC, para buscar y analizar información; comunicarse y realizar procedimientos o tareas vinculados al área profesional, de acuerdo con los requerimientos de su entorno laboral. | 7 |
| AUTO-M1-C05 | CE2 C2 | AUTO-CE2 | AUTO-M1 | empleabilidad | Identificar nuevas oportunidades de proyectos o negocios que generen valor y sean sostenibles, tomando en cuenta el programa de estudios y las necesidades del cliente considerando un proceso metodológico, sea sostenible y preserve el ambiente. | 7 |
| AUTO-M2-C01 | UC2 C1 | AUTO-UC2 | AUTO-M2 | técnica | Realiza y verifica el funcionamiento de los motores de combustión interna Otto y Diesel del vehículo, teniendo en cuenta las especificaciones técnicas, seguridad laboral y cuidado del medio ambiente. | 8 |
| AUTO-M2-C02 | UC2 C2 | AUTO-UC2 | AUTO-M2 | técnica | Realizar el diagnóstico de fallas y ejecutando el mantenimiento del sistema de lubricación y refrigeración del motor, de acuerdo a las especificaciones técnicas del fabricante. | 8 |
| AUTO-M2-C03 | UC2 C3 / UC3 C3 | null; propuesta AUTO-UC2 | AUTO-M2 | técnica | Realizar el diagnóstico de fallas y ejecutando el mantenimiento del sistema distribución y alimentación del motor, de acuerdo a especificaciones técnicas del fabricante. | 8 |
| AUTO-M2-C04 | CE3 C3 | AUTO-CE3 | AUTO-M2 | empleabilidad | Expresar de manera clara conceptos, ideas, sentimientos, hechos y opiniones, en forma oral y escrita para comunicarse e interactuar con otras personas en contextos sociales y laborales diversos. | 8 |
| AUTO-M2-C05 | CE4 C4 | AUTO-CE4 | AUTO-M2 | empleabilidad | Establecer relaciones con respeto y justicia en los ámbito personal, colectivo e institucional contribuyendo a una convivencia democrática, orientada al bien común que considere la diversidad y dignidad de las personas, teniendo en cuenta las consideraciones aplicadas en su contexto laboral. | 9 |

## Indicadores de logro de capacidad

Cada fila pertenece a una sola capacidad por ID interno. Los códigos C1 I1, etc., se repiten entre módulos y no son una clave única. La fuente repite C3 I1 para dos desempeños distintos de comunicación: se conservan ambas filas, con IDs distintos. Se retiene el verbo en infinitivo cuando así figura en la fuente.

| ID interno | Capacidad padre | Código fuente | Indicador | Páginas |
|---|---|---|---|---|
| AUTO-M1-C01-I01 | AUTO-M1-C01 | C1 I1 | Organiza el área de trabajo del taller automotriz, de acuerdo a los estándares de calidad. | 7, 10 |
| AUTO-M1-C01-I02 | AUTO-M1-C01 | C1 I2 | Practica seleccionando las herramientas, instrumentos y equipos de trabajo del taller automotriz, considerando las especificaciones de seguridad laboral en el uso adecuado. | 7, 10 |
| AUTO-M1-C02-I01 | AUTO-M1-C02 | C2 I1 | Verifica las posibles averías de los componentes de frenos, dirección y suspensión determinando el tipo de reparación que requiere considerando los procedimientos técnicos con seguridad e higiene. | 7, 10 |
| AUTO-M1-C02-I02 | AUTO-M1-C02 | C2 I2 | Ejecuta mantenimiento a los componentes, realizando la regulación, purgado, verifica fugas del sistema de frenos, de acuerdo a los procedimientos técnicos del desmontaje con seguridad e higiene. | 7, 10 |
| AUTO-M1-C02-I03 | AUTO-M1-C02 | C2 I3 | Efectúa operaciones de mantenimiento desmontado y armado de los componentes de la dirección comprobando su funcionamiento, de acuerdo a los procedimientos técnicos del desmontaje con seguridad e higiene. | 7, 10 |
| AUTO-M1-C02-I04 | AUTO-M1-C02 | C2 I4 | Efectúa las operaciones desmontaje-montaje para dar mantenimiento a la suspensión del vehículo de acuerdo a los procedimientos técnicos del desmontaje con seguridad e higiene. | 7, 10 |
| AUTO-M1-C03-I01 | AUTO-M1-C03 | C3 I1 | Verifica las averías en el sistema de transmisión, determinando el tipo de reparación que requiere considerando los procedimientos técnicos con seguridad e higiene. | 7, 10 |
| AUTO-M1-C03-I02 | AUTO-M1-C03 | C3 I2 | Efectúa mantenimiento elemental a los componentes embrague, caja de velocidades, árbol y conjunto diferencial del sistema de transmisión, acuerdo a los procedimientos técnicos del desmontaje con seguridad e higiene. | 7, 10 |
| AUTO-M1-C04-I01 | AUTO-M1-C04 | CE1 I1 | Evalúa la información de la red considerando su calidad, fiabilidad y pertinencia. | 7, 10 |
| AUTO-M1-C04-I02 | AUTO-M1-C04 | CE1 I2 | Utiliza aplicaciones de informáticas para la comunicación, colaboración y almacenamiento de información en el desarrollo de tareas vinculadas a su programa de estudios. | 7, 10 |
| AUTO-M1-C04-I03 | AUTO-M1-C04 | CE1 I3 | Contribuye el aprendizaje entre iguales en medios digitales respetando fuentes, de manera ética y responsable. | 7, 10 |
| AUTO-M1-C05-I01 | AUTO-M1-C05 | CE2 I1 | Identifica las oportunidades que generen ideas de proyectos o negocios nuevos, mejorar en procesos, productos o servicios ya existentes, de manera ética, utilizando metodologías que promuevan la creatividad e innovación, analizando la rentabilidad obtenida. | 7, 10 |
| AUTO-M1-C05-I02 | AUTO-M1-C05 | CE2 I2 | Propone el plan de acción del emprendimiento, asumiendo su rol de liderazgo y tomando en cuenta principios éticos, obligaciones tributarias y contables, normas establecidas para la protección de la propiedad. | 7, 10 |
| AUTO-M1-C05-I03 | AUTO-M1-C05 | CE2 I3 | Diseña el monitoreo para el cumplimiento del plan de acción, utilizando diferentes metodologías para la mejora continua, recursos para la sostenibilidad y escalamiento de su emprendimiento. | 7, 10 |
| AUTO-M2-C01-I01 | AUTO-M2-C01 | C1 I1 | Identifica las partes del motor Otto y Diesel, tomando en cuenta las normas de seguridad laboral y cuidado del medio ambiente. | 8, 11 |
| AUTO-M2-C01-I02 | AUTO-M2-C01 | C1 I2 | Reconoce la función de los mecanismos del motor de combustión interna Otto y Diesel, tomando en cuenta las normas de seguridad laboral. | 8, 11 |
| AUTO-M2-C01-I03 | AUTO-M2-C01 | C1 I3 | Diagnostica y localiza las fallas del motor, definiendo el tipo de mantenimiento o cambio que necesita, considerando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C01-I04 | AUTO-M2-C01 | C1 I4 | Ejecuta el mantenimiento a los mecanismos del motor Otto y Diesel, empleando las herramientas, equipos medios y técnicas establecidas, considerando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C02-I01 | AUTO-M2-C02 | C2 I1 | Reconoce el funcionamiento de los componentes del sistema de lubricación y refrigeración, tomando en cuenta las normas de seguridad laboral. | 8, 11 |
| AUTO-M2-C02-I02 | AUTO-M2-C02 | C2 I2 | Diagnostica y localiza las fallas de sistema de lubricación y refrigeración de los motores de combustión interna, definiendo el tipo de mantenimiento o cambio que necesita, considerando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C02-I03 | AUTO-M2-C02 | C2 I3 | Ejecuta el mantenimiento de sistema de lubricación de motores de combustión interna, empleando las herramientas, equipos medios y técnicas establecidas, aplicando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C02-I04 | AUTO-M2-C02 | C2 I4 | Ejecuta el mantenimiento de sistema de refrigeración de motores de combustión interna, empleando las herramientas, equipos medios y técnicas establecidas, aplicando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C03-I01 | AUTO-M2-C03 | C3 I1 | Reconoce el funcionamiento de los componentes del sistema de distribución, tomando en cuenta las normas de seguridad laboral. | 8, 11 |
| AUTO-M2-C03-I02 | AUTO-M2-C03 | C3 I2 | Diagnostica y localiza las fallas de sistema de distribución de los motores de combustión interna, definiendo el tipo de mantenimiento o cambio que necesita, considerando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C03-I03 | AUTO-M2-C03 | C3 I3 | Ejecuta el mantenimiento de sistema de distribución de motores de combustión interna, empleando las herramientas, equipos medios y técnicas establecidas, aplicando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C03-I04 | AUTO-M2-C03 | C3 I4 | Reconoce el funcionamiento de los componentes del sistema de alimentación, tomando en cuenta las normas de seguridad laboral. | 8, 11 |
| AUTO-M2-C03-I05 | AUTO-M2-C03 | C3 I5 | Diagnostica y localiza las fallas de sistema de alimentación de los motores de combustión interna, definiendo el tipo de mantenimiento o cambio que necesita, considerando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C03-I06 | AUTO-M2-C03 | C3 I6 | Ejecuta el mantenimiento de sistema de alimentación de motores de combustión interna, empleando las herramientas, equipos medios y técnicas establecidas, aplicando las normas de seguridad e higiene industrial en el taller. | 8, 11 |
| AUTO-M2-C04-I01 | AUTO-M2-C04 | C3 I1 | Utilizar estrategias de escucha activa y asertiva en contextos sociales y laborales, sin estereotipos de género u otro. | 8–9, 12 |
| AUTO-M2-C04-I02 | AUTO-M2-C04 | C3 I2 | Organizar información de manera oral y escrita en contextos sociales y laborales, de manera objetiva y empática. | 8–9, 12 |
| AUTO-M2-C04-I03 | AUTO-M2-C04 | C3 I1 (repetido en fuente) | Expresar de manera clara conceptos, ideas, sentimientos y hechos en forma oral y escrita a través de distintos medios, incluyendo los medios virtuales utilizando el lenguaje de acuerdo a los contextos sociales y laborales, sin estereotipos de género u otro. | 8–9, 12 |
| AUTO-M2-C05-I01 | AUTO-M2-C05 | C4 I1 | Actúa con honestidad, honradez, integridad y ética en los múltiples roles que asume, fomentando una cultura transparente orientada al bien común, en contextos sociales y laborales. | 8–9, 12 |
| AUTO-M2-C05-I02 | AUTO-M2-C05 | C4 I2 | Contribuye al establecimiento de relaciones justas, basadas en el respeto de los derechos de la persona, en cumplimiento de las obligaciones y de las normas que aseguren una convivencia democrática. | 8–9, 12 |
| AUTO-M2-C05-I03 | AUTO-M2-C05 | C4 I3 | Aplica los códigos de ética en su quehacer profesional, de manera autónoma con responsabilidad y haciendo uso eficiente de los recursos. | 8–9, 12 |

## Indicadores de logro de competencia (nivel distinto)

Estos son indicadores de la UC del programa p.5. No deben mezclarse con los indicadores de capacidad de pp.7–12. La columna padre apunta a competencia, no a capacidad. No se inventa un cruce entre ambos niveles.

| ID interno | Competencia padre | Código fuente | Indicador | Página |
|---|---|---|---|---|
| AUTO-UC1-IL01 | AUTO-UC1 | sin código; orden de fila 1 | Efectúa la limpieza, regulación de los frenos de disco y tambor de accionamiento mecánico o hidráulico, convencional y con asistencia electrónica, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL02 | AUTO-UC1 | sin código; orden de fila 2 | Cambia los elementos de desgaste (pastillas, zapatas, tambores, discos) del sistema de frenos de accionamiento mecánico o hidráulico, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL03 | AUTO-UC1 | sin código; orden de fila 3 | Efectúa el mantenimiento y reparación de la columna de dirección, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL04 | AUTO-UC1 | sin código; orden de fila 4 | Efectúa el mantenimiento y reparación de los muelles elípticos de la suspensión, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL05 | AUTO-UC1 | sin código; orden de fila 5 | Efectúa el mantenimiento y reparación de los amortiguadores y resortes de suspensión, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL06 | AUTO-UC1 | sin código; orden de fila 6 | Efectúa el mantenimiento y reparación de las bolsas de aire de la suspensión, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL07 | AUTO-UC1 | sin código; orden de fila 7 | Efectúa el mantenimiento y reparación de las cajas de dirección con asistencia hidráulica y electrónica, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL08 | AUTO-UC1 | sin código; orden de fila 8 | Efectúa el mantenimiento y reparación del conjunto de embrague, cajas de cambios, conjunto diferencial de vehículos automotrices, de acuerdo con el estado de conservación del vehículo, manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL09 | AUTO-UC1 | sin código; orden de fila 9 | Efectúa el mantenimiento y reparación del sistema de transmisión mecánica incluido el embrague, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL10 | AUTO-UC1 | sin código; orden de fila 10 | Efectúa el mantenimiento y reparación del conjunto diferencial convencional y con asistencia electrónica, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC1-IL11 | AUTO-UC1 | sin código; orden de fila 11 | Efectúa el mantenimiento y reparación de los palieres en vehículos livianos, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL01 | AUTO-UC2 | sin código; orden de fila 1 | Efectúa el mantenimiento y reparación básica a los componentes mecánicos, eléctricos y electrónicos del sistema de lubricación del motor de los vehículos automotrices, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL02 | AUTO-UC2 | sin código; orden de fila 2 | Efectúa el mantenimiento y reparación básica a los componentes mecánicos, eléctricos y electrónicos del sistema de refrigeración del motor de los vehículos automotrices, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL03 | AUTO-UC2 | sin código; orden de fila 3 | Verifica los mecanismos de la distribución del motor de vehículos automotrices, de acuerdo al kilometraje recorrido, manual del fabricante y a procedimientos establecidos. | 5 |
| AUTO-UC2-IL04 | AUTO-UC2 | sin código; orden de fila 4 | Evalúa los sensores y actuadores de vehículos automotrices, realizando el cambio si es necesario, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL05 | AUTO-UC2 | sin código; orden de fila 5 | Evalúa la ECU (Unidad de Control Electrónico) del motor, realizando el cambio si es necesario, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL06 | AUTO-UC2 | sin código; orden de fila 6 | Efectúa el mantenimiento y reparación de los motores Otto de 2 y 4 tiempos de vehículos automotrices, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL07 | AUTO-UC2 | sin código; orden de fila 7 | Efectúa el mantenimiento y reparación de los motores Diesel de 2 y 4 tiempos de vehículos automotrices, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL08 | AUTO-UC2 | sin código; orden de fila 8 | Efectúa el mantenimiento y reparación mecánica, eléctrica y electrónica del motor de ciclo Diesel y sus componentes, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC2-IL09 | AUTO-UC2 | sin código; orden de fila 9 | Efectúa el mantenimiento y reparación de los componentes auxiliares del motor de combustión interna en vehículos pesados, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC3-IL01 | AUTO-UC3 | sin código; orden de fila 1 | Efectúa el mantenimiento y reparación del sistema de carga eléctrica, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC3-IL02 | AUTO-UC3 | sin código; orden de fila 2 | Efectúa el mantenimiento y reparación del sistema de encendido convencional y electrónico, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC3-IL03 | AUTO-UC3 | sin código; orden de fila 3 | Efectúa el mantenimiento y reparación del sistema de iluminación de los circuitos luces, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC3-IL04 | AUTO-UC3 | sin código; orden de fila 4 | Efectúa el mantenimiento y reparación del circuito eléctrico del limpiaparabrisas de vehículos automotrices, de acuerdo con el manual del fabricante y procedimientos establecidos. | 5 |
| AUTO-UC3-IL05 | AUTO-UC3 | sin código; orden de fila 5 | Instala autorradios, antenas, alarmas, equipos de video y televisión, de acuerdo con el manual del fabricante de los equipos y procedimientos establecidos. | 5 |
| AUTO-UC4-IL01 | AUTO-UC4 | sin código; orden de fila 1 | Efectúa la conversión del sistema de combustible al sistema dual de combustible (GNV y GLP) de los motores de combustión interna del motor del vehículo, de acuerdo al manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC4-IL02 | AUTO-UC4 | sin código; orden de fila 2 | Efectúa el mantenimiento y reparación del sistema dual de combustible (GNV y GLP) de los motores de combustión interna del motor del vehículo, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |
| AUTO-UC4-IL03 | AUTO-UC4 | sin código; orden de fila 3 | Efectúa pruebas de estanqueidad del gas en los vehículos convertidos al sistema dual de combustible del motor del vehículo, de acuerdo con el manual del fabricante, procedimientos establecidos y normativa vigente. | 5 |

Los indicadores CE de p.6 son 3 por competencia (12 ocurrencias); guardan relación con los de capacidad y no se duplicaron como nuevas capacidades. Diferencia sustantiva en TIC: p.6 indica «Utiliza herramientas de ofimática y especializadas…» y p.7/10 «Utiliza aplicaciones de informáticas para comunicación, colaboración y almacenamiento…». Conservar estas versiones como indicadores de niveles distintos si se carga el nivel CE; no sustituir una redacción por la otra. La tabla siguiente conserva los 12 del nivel CE.

| ID interno | Competencia padre | Orden fuente | Indicador | Página |
|---|---|---:|---|---|
| AUTO-CE1-IL01 | AUTO-CE1 | 1 | Utiliza herramientas de ofimática y especializadas para responder a los requerimientos del entorno laboral, de manera ética, eficiente y responsable. | 6 |
| AUTO-CE1-IL02 | AUTO-CE1 | 2 | Evalúa la información de la red, considerando su calidad, fiabilidad y pertinencia. | 6 |
| AUTO-CE1-IL03 | AUTO-CE1 | 3 | Contribuye al aprendizaje entre iguales en medios digitales respetando fuentes, de manera ética y responsable. | 6 |
| AUTO-CE2-IL01 | AUTO-CE2 | 1 | Identifica las oportunidades que generen ideas de proyectos o negocios nuevos, mejoras en procesos, productos o servicios ya existentes, de manera ética, utilizando metodologías que promuevan la creatividad e innovación. | 6 |
| AUTO-CE2-IL02 | AUTO-CE2 | 2 | Propone el plan de acción del emprendimiento, asumiendo su rol de liderazgo y tomando en cuenta principios éticos, obligaciones tributarias y contables, normas establecidas para la protección de la propiedad. | 6 |
| AUTO-CE2-IL03 | AUTO-CE2 | 3 | Diseña el monitoreo para el cumplimiento del plan de acción, utilizando diferentes metodologías para la mejora continua, recursos para la sostenibilidad y escalamiento de su emprendimiento. | 6 |
| AUTO-CE3-IL01 | AUTO-CE3 | 1 | Utiliza estrategias de escucha activa y asertiva en contextos sociales y laborales, sin estereotipos de género u otro. | 6 |
| AUTO-CE3-IL02 | AUTO-CE3 | 2 | Organiza información de manera oral y escrita en contextos sociales y laborales, de manera objetiva y empática. | 6 |
| AUTO-CE3-IL03 | AUTO-CE3 | 3 | Expresa de manera clara conceptos, ideas, sentimientos y hechos en forma oral y escrita a través de distintos medios, incluyendo los medios virtuales utilizando el lenguaje de acuerdo a los contextos sociales y laborales, sin estereotipos de género u otro. | 6 |
| AUTO-CE4-IL01 | AUTO-CE4 | 1 | Actúa con honestidad, honradez, integridad y ética en los múltiples roles que asume, fomentando una cultura transparente orientada al bien común, en contextos sociales y laborales. | 6 |
| AUTO-CE4-IL02 | AUTO-CE4 | 2 | Contribuye al establecimiento de relaciones justas, basadas en el respeto de los derechos de la persona, en cumplimiento de las obligaciones y de las normas que aseguren una convivencia democrática. | 6 |
| AUTO-CE4-IL03 | AUTO-CE4 | 3 | Aplica los códigos de ética en su quehacer profesional, de manera autónoma con responsabilidad y haciendo uso eficiente de los recursos. | 6 |

## Contenidos, recursos y perfil docente documentados

Estos datos son descriptivos; no son indicadores nuevos ni lista de inventario patrimonial.

| Módulo / UD | Contenidos y recursos identificados | Fuente |
|---|---|---|
| M1 / UD01 | Normas de convivencia, seguridad e higiene; organización del taller; señalización de áreas y zonas de seguridad; tipos, operación y uso de herramientas, instrumentos y equipos. | 14 |
| M1 / UD02 | Sistemas de frenos, dirección y suspensión: constitución, funcionamiento, diagnóstico, desmontaje/montaje, regulación, mantenimiento y ajustes según fabricante. | 14 |
| M1 / UD03 | Embrague, caja de velocidades, árbol de transmisión y conjunto diferencial: constitución, funcionamiento, diagnóstico, mantenimiento, desmontaje/montaje y regulación. | 14–15 |
| M1 / UD04 | Búsqueda y análisis de información, comunicación/colaboración digital y almacenamiento de información; aprendizaje entre iguales. | 15 |
| M1 / UD05 | Oportunidades de negocio, creatividad e innovación, plan de acción, principios éticos, obligaciones tributarias/contables, propiedad, monitoreo y mejora. | 15 |
| M2 / UD06 | Seguridad y gestión ambiental, combustibles y residuos peligrosos, motores gasolina y Diesel, mantenimiento preventivo/correctivo, análisis de síntomas. | 16 |
| M2 / UD07 | Bomba de aceite, filtro, cárter, conductos, lubricantes; radiador, bomba de agua, termostato, ventilador, refrigerantes; fallas, purga, limpieza y diagnóstico. | 16 |
| M2 / UD08 | Distribución y alimentación del motor, componentes, funcionamiento, diagnóstico y mantenimiento. | 16–17 |
| M2 / UD09–10 | Escucha activa y asertividad, expresión oral/escrita; ética, convivencia democrática, derechos y uso responsable de recursos. | 17 |
| EFSRT M1 | Talleres de suspensión, dirección, frenos y transmisión en el área automotriz. | 13, 15 |
| EFSRT M2 | Talleres de diagnóstico y mantenimiento del motor de combustión interna en el área automotriz. | 13, 17 |

Perfil docente descrito (pp.14, 16): formación técnica y experiencia en diagnóstico, mantenimiento y reparación de vehículos; habilidades pedagógicas para teoría y práctica; herramientas y tecnologías automotrices; seguridad, trabajo en equipo, resolución de problemas y actualización continua. No se extraen títulos mínimos obligatorios que no estén expresamente fijados.

## Empleabilidad transversal y estrategia EFSRT

No tienen capacidad ni indicadores desglosados en las páginas revisadas. No se deben fabricar esos registros ni contarlas como UD adicionales.

| ID interno propuesto | Código fuente | Modalidad de incorporación | Competencia | Página |
|---|---|---|---|---|
| AUTO-CE5-T | CE5 | Transversal | Liderazgo personal y profesional: articular recursos y potencialidades de cada integrante del equipo logrando trabajo comprometido, colaborativo, creativo, ético, sensible a su contexto social y ambiente, en pro del bien común. | 15, 17 |
| AUTO-CE6-T | CE6 | Transversal | Cultura ambiental: convivir de manera ética, autónoma, responsable y sostenible, previniendo, reduciendo y controlando permanente y progresivamente los impactos ambientales. | 15, 17 |

EFSRT documentadas: ejecución en el CETPRO/taller del programa, con mención interna y externa en p.15. Se describen convenios/acuerdos con organizaciones del sector local y regional; no hay empresas individualizadas ni convenios firmados en este bloque. El programa establece condiciones y requisitos de acceso. El plan EFSRT debe contener capacidades del módulo, actividades, desempeños, responsabilidades y tiempo y ser aprobado por la institución. Se designa docente para acompañamiento y monitoreo, instrumentos de registro, información al estudiante e informe de desempeño. p.15 atribuye evaluación a responsable de empresa y p.17 a criterios del CETPRO: parametrizar el responsable según lugar real y resolución institucional, sin imponer automáticamente una única regla. En p.17 se explicita estrategia de proyectos productivos. Se mencionan áreas de alineamiento/balanceo, suspensión pesada, frenos neumáticos y ensamblaje de chasis/carrocería (p.15); son ambientes propuestos, no evidencias de equipamiento existente.

Control p.19 verificado visualmente: total horas de UD = 672; periodos I y II = 20 créditos/528 horas cada uno; III y IV = 0. 672 corresponde a 480 horas técnicas + 192 de empleabilidad y excluye las 384 EFSRT; no reemplaza el total de programa 1056. La leyenda de colores contiene «fuera del rango», «dentro del límite permitido» y «dentro del rango», pero no fija umbrales numéricos: no codificar umbrales inferidos a partir del color.

## Incidencias y decisiones pendientes

| ID | Incidencia probada | Tratamiento para BD |
|---|---|---|
| AUTO-Q01 | Programa p.5 y elementos pp.14,16 indican 1024 h; programación p.3 e itinerario p.18 indican 1056 h. | Guardar valores alternativos y bloquear publicación del total hasta resolución; cálculo de las filas de p.18 = 1056. |
| AUTO-Q02 | Elementos módulo II p.16 contiene créditos y horas diferentes de p.3/18: UD motores 80 h frente a 96; lubricación 64 frente a 48; distribución 64 frente a 96. | Conservar p.3/18 como versión documentada coherente, sin afirmar aprobación; resolver qué formato tiene vigencia. |
| AUTO-Q03 | Perfil tiene 4 UC; organización modular p.13 solo desarrolla dos módulos que cubren UC1 y UC2. La columna de UC en p.3 sitúa UC2 en primer bloque y UC3/UC4 en segundo. | No inferir módulos 3–4 ni capacidades de electrónica/conversión. UC3 y UC4 quedan documentadas en perfil sin desarrollo modular confirmado. |
| AUTO-Q04 | Distribución/alimentación tiene UC2 C3 en formulación p.8, pero UC3 C3 en pp.11,13,16. | Mantener ambas etiquetas, parent oficial null hasta validación; propuesta semántica UC2. |
| AUTO-Q05 | TIC/Emprendimiento/Comunicación cambian numeración CE entre formatos; itinerario p.18 repite TIC en emprendimiento. | Usar IDs internos y relación propuesta; resolver códigos oficiales. |
| AUTO-Q06 | Comunicación repite C3 I1 para escucha y expresión; no son el mismo texto. | Conservar dos IDs internos; no deduplicar por código. |
| AUTO-Q07 | Indicador de carga eléctrica aparece dos veces idéntico en UC3 p.5. | Consolidado en una fila AUTO-UC3-IL01; conservar dos ocurrencias de procedencia, sin duplicar indicador. |
| AUTO-Q08 | Código G21 verificado visualmente p.4, y raya en itinerario p.18. | Guardar codigo_impreso=G21; confirmar la autoridad/vigencia del código antes de tratarlo como identificador oficial de catálogo. |

## Control de extracción

4 UC del perfil + 4 CE del programa + 2 competencias transversales sin desglose; 2 módulos documentados; 10 UD + 2 EFSRT; 10 capacidades (6 técnicas + 4 de empleabilidad); 34 indicadores de capacidad; 28 indicadores específicos de UC únicos (29 ocurrencias, por repetición de carga); 12 indicadores CE de programa. Las reproducciones de pp.10–17 se trataron como evidencia adicional del mismo registro cuando conservan alcance, no como nuevas filas. Los datos no presentes de evaluación, notas mínimas, matrícula, pagos, usuarios o credenciales son `null`; este PDF curricular no los establece.
