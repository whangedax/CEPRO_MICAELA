ACTÚA COMO ARQUITECTO DE SISTEMAS, ESPECIALISTA EN MICROSOFT EXCEL 365, MODELADO UML, BASES DE DATOS RELACIONALES, VBA, UX PARA PERSONAL ADMINISTRATIVO Y DISEÑO DE DIAGRAMAS TÉCNICOS.

OBJETIVO

Crear una guía visual completa, profesional y permanente de la arquitectura del nuevo libro académico CETPRO que construiremos desde cero en Microsoft Excel 365.

El sistema final será un libro `.xlsm`, fácil de utilizar por una secretaria, con bases de datos internas, validaciones, motores de cálculo y 21 plantillas institucionales imprimibles.

REGLA FUNDAMENTAL

No utilizar, mencionar, consultar ni representar ningún libro Excel anterior.

Las únicas referencias documentales válidas son las 21 plantillas institucionales que adjunto. Estas plantillas ya están corregidas y serán las salidas oficiales del nuevo sistema.

No rediseñar las plantillas. No crear formatos aproximados. Deben representarse como documentos oficiales que reciben datos desde el nuevo motor documental.

TIPO DE RESULTADO

No utilizar generación de imágenes mediante IA para escribir los textos del diagrama, porque puede deformarlos.

Construir diagramas técnicos vectoriales usando Mermaid, SVG, HTML/CSS, diagrams.net, Graphviz o una herramienta equivalente.

Entregar:

1. `01_ARQUITECTURA_GENERAL_CETPRO.svg`
2. `01_ARQUITECTURA_GENERAL_CETPRO.png`, en alta resolución.
3. `01_ARQUITECTURA_GENERAL_CETPRO.pdf`, tamaño A3 horizontal.
4. `01_ARQUITECTURA_GENERAL_CETPRO.mmd` o archivo fuente editable.
5. `02_MODELO_DATOS_CETPRO.svg`
6. `03_FLUJO_SECRETARIA.svg`
7. `04_FLUJO_DOCUMENTOS.svg`
8. `LEYENDA_ARQUITECTURA.md`

Todos los textos deben estar en español, ser legibles y estar correctamente escritos.

DISEÑO VISUAL

Usar un estilo institucional, limpio y técnico:

- Fondo blanco.
- Azul para hojas visibles.
- Verde para catálogos y datos maestros.
- Amarillo o naranja claro para datos transaccionales.
- Morado para motores internos.
- Gris para plantillas institucionales.
- Rojo únicamente para errores, bloqueos y validaciones fallidas.
- Cilindros para bases de datos.
- Figuras de hoja para pestañas de Excel.
- Rectángulos redondeados para procesos.
- Rombos para decisiones.
- Figuras de documento para plantillas y PDF.
- Flechas sólidas para flujo de datos.
- Flechas punteadas para controles, auditoría y respaldos.

Incluir una leyenda de colores y símbolos.

No amontonar todo en una sola línea. Usar capas y bloques claramente separados. El texto debe poder leerse al imprimir en A3 horizontal.

DIAGRAMA 1: ARQUITECTURA GENERAL DEL LIBRO

Dividir el gráfico maestro en seis capas verticales.

CAPA 1. USUARIO

Representar:

- Secretaria.
- Dirección.
- Docente.

La secretaria registra estudiantes, matrículas y datos académicos, además de generar documentos.

El docente proporciona asistencia, evaluaciones y datos de EFSRT.

Dirección revisa, firma y autoriza documentos finales.

CAPA 2. HOJAS VISIBLES

Mostrar exactamente estas cinco hojas:

1. `INICIO`
2. `ESTUDIANTES`
3. `MATRÍCULAS`
4. `REGISTRO ACADÉMICO`
5. `DOCUMENTOS`

Conexiones:

- `INICIO` permite acceder a las otras cuatro hojas.
- `ESTUDIANTES` registra y consulta personas.
- `MATRÍCULAS` vincula estudiantes con periodos, programas y módulos.
- `REGISTRO ACADÉMICO` permite registrar asistencia, evaluación y EFSRT.
- `DOCUMENTOS` selecciona estudiante, grupo, periodo y documento para imprimir.

Aclarar visualmente que la secretaria utiliza solamente estas cinco hojas.

CAPA 3. CONFIGURACIÓN Y CATÁLOGOS

Representar como tablas internas protegidas:

- `BD_INSTITUCIÓN`
- `BD_PERIODOS`
- `BD_PROGRAMAS`
- `BD_MÓDULOS`
- `BD_UNIDADES`
- `BD_INDICADORES`
- `BD_DOCENTES`
- `CONFIGURACIÓN`

Relaciones:

- Un programa contiene varios módulos.
- Un módulo contiene varias unidades didácticas.
- Una unidad puede contener hasta cinco indicadores de logro.
- Un periodo contiene muchas matrículas.
- Los docentes pueden estar asignados a uno o varios grupos.
- La configuración establece reglas de notas, asistencia, impresión y rutas de respaldo.

CAPA 4. BASES TRANSACCIONALES

Representar:

- `BD_ESTUDIANTES`
- `BD_MATRÍCULAS`
- `BD_MATRÍCULA_UNIDADES`
- `BD_ASISTENCIA`
- `BD_EVALUACIÓN`
- `BD_EFSRT`
- `BD_DOCUMENTOS`
- `BD_AUDITORÍA`

Relaciones obligatorias:

- Un estudiante puede tener varias matrículas.
- Cada matrícula pertenece a un periodo, programa y módulo.
- Una matrícula puede contener varias unidades mediante `BD_MATRÍCULA_UNIDADES`.
- Cada asistencia pertenece a una matrícula, una unidad y una fecha.
- Cada evaluación pertenece a una matrícula, unidad, indicador y actividad.
- Cada registro EFSRT pertenece a una matrícula.
- Cada documento generado debe quedar registrado en `BD_DOCUMENTOS`.
- Las operaciones importantes deben quedar registradas en `BD_AUDITORÍA`.

Mostrar claves primarias y relaciones usando IDs estables:

- `ID_ESTUDIANTE`
- `ID_MATRICULA`
- `ID_PERIODO`
- `ID_PROGRAMA`
- `ID_MODULO`
- `ID_UNIDAD`
- `ID_INDICADOR`
- `ID_DOCENTE`
- `ID_DOCUMENTO`

Los números de DNI y códigos que puedan contener ceros iniciales deben identificarse como campos de texto.

CAPA 5. MOTORES INTERNOS

Representar los siguientes procesos:

1. `MOTOR DE BÚSQUEDA`
2. `MOTOR DE MATRÍCULA`
3. `MOTOR DE ASISTENCIA`
4. `MOTOR DE EVALUACIÓN`
5. `MOTOR EFSRT`
6. `MOTOR DE CIERRE ACADÉMICO`
7. `MOTOR DE DOCUMENTOS`
8. `VALIDADOR PREIMPRESIÓN`
9. `MOTOR PDF E IMPRESIÓN`
10. `RESPALDO Y AUDITORÍA`

Mostrar que:

- Las hojas visibles escriben en las bases mediante validaciones.
- Los catálogos alimentan los formularios y listas desplegables.
- Los motores consultan las bases, pero las plantillas nunca escriben en ellas.
- El cierre académico calcula unidades aprobadas, desaprobadas, retiradas, promedios y habilitación de documentos.
- El validador bloquea documentos incompletos.
- El motor documental llena copias de las plantillas.
- Las macros se usan únicamente para navegación, actualización, generación, impresión, PDF y respaldo.
- Las fórmulas estructuradas realizan búsquedas, controles y cálculos.
- No colocar datos manualmente dentro de las plantillas.

CAPA 6. DOCUMENTOS INSTITUCIONALES

Representar exactamente las 21 plantillas, agrupadas de esta manera:

GRUPO A. MATRÍCULA

1. `01_NOMINA_DE_MATRICULA`
2. `02_FICHA_DE_MATRICULA`
3. `03_REGISTRO_DE_MATRICULA_MODULAR`

GRUPO B. PORTADA

4. `04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION`

GRUPO C. ASISTENCIA

5. `05_ASISTENCIA_UD1`
6. `06_ASISTENCIA_UD2`
7. `07_ASISTENCIA_UD3`
8. `08_ASISTENCIA_UD4`
9. `09_ASISTENCIA_UD5`
10. `10_ASISTENCIA_UD6`

GRUPO D. EVALUACIÓN

11. `11_EVALUACION_IL_UD1`
12. `12_EVALUACION_UD2`
13. `13_EVALUACION_UD3`
14. `14_EVALUACION_UD4`
15. `15_EVALUACION_UD5`
16. `16_EVALUACION_UD6`
17. `17_EVALUACION_UD7`

GRUPO E. CIERRE ACADÉMICO

18. `18_CONSOLIDADO_EFSRT`
19. `19_ACTA_DE_EVALUACION_MODULAR`
20. `20_CERTIFICADO_MODULAR`
21. `21_TITULO_AUXILIAR_TECNICO`

Mostrar una observación visual:

“Existen siete plantillas de evaluación, pero solamente seis plantillas de asistencia. La base de datos soportará UD1–UD7. Debe confirmarse si corresponde crear ASISTENCIA UD7”.

CONEXIONES ENTRE BASES Y PLANTILLAS

Representar estas conexiones claramente:

- Nómina recibe datos de institución, periodo, programa, módulo, matrículas y estudiantes.
- Ficha de matrícula recibe institución, estudiante, matrícula y unidades seleccionadas.
- Registro modular recibe institución, programa, módulo, estudiantes y matrículas.
- Portada recibe institución, programa, módulo, periodo y docente.
- Asistencia recibe grupo, estudiantes, unidades, fechas y estados de asistencia.
- Evaluación recibe estudiantes, unidad, capacidad, indicadores, actividades, recuperación y calificaciones.
- EFSRT recibe estudiante, módulo, docente, empresa, dirección, fechas, horas, nueve criterios y calificación final.
- Acta recibe institución, grupo, unidades, créditos, horas, notas, EFSRT y resultados finales.
- Certificado recibe institución, estudiante, módulo, programa, unidades, capacidades, créditos, horas y calificaciones.
- Título recibe institución, estudiante, programa, denominación del título, código de registro y fecha de emisión.

FLUJO DE IMPRESIÓN

Incluir esta secuencia:

`DOCUMENTOS`
→ seleccionar tipo de documento
→ seleccionar estudiante o grupo
→ seleccionar periodo, programa, módulo, sección y turno
→ consultar bases
→ validar información obligatoria
→ si faltan datos, mostrar lista de pendientes
→ si todo está completo, crear copia temporal de la plantilla
→ completar únicamente campos variables
→ conservar intacto el diseño fijo
→ mostrar vista previa
→ imprimir o guardar PDF
→ registrar la emisión en `BD_DOCUMENTOS`
→ registrar la operación en `BD_AUDITORÍA`
→ limpiar la copia temporal.

Mostrar que el diseño fijo incluye:

- Logos.
- Membretes.
- Bordes.
- Colores.
- Tipografías.
- Textos legales.
- Celdas combinadas.
- Márgenes.
- Orientación.
- Áreas de impresión.
- Firmas y sellos.

Mostrar que los datos variables incluyen:

- Datos institucionales.
- Estudiante.
- Matrícula.
- Programa.
- Módulo.
- Unidad.
- Periodo.
- Docente.
- Asistencia.
- Notas.
- EFSRT.
- Fechas.
- Códigos de registro.

DIAGRAMA 2: MODELO RELACIONAL DE DATOS

Crear un diagrama entidad-relación legible.

Relaciones principales:

- `BD_PROGRAMAS` 1 a muchos `BD_MÓDULOS`.
- `BD_MÓDULOS` 1 a muchos `BD_UNIDADES`.
- `BD_UNIDADES` 1 a muchos `BD_INDICADORES`.
- `BD_ESTUDIANTES` 1 a muchos `BD_MATRÍCULAS`.
- `BD_PERIODOS` 1 a muchos `BD_MATRÍCULAS`.
- `BD_MÓDULOS` 1 a muchos `BD_MATRÍCULAS`.
- `BD_DOCENTES` 1 a muchos asignaciones o matrículas de grupo.
- `BD_MATRÍCULAS` muchos a muchos `BD_UNIDADES`, resuelto mediante `BD_MATRÍCULA_UNIDADES`.
- `BD_MATRÍCULAS` 1 a muchos `BD_ASISTENCIA`.
- `BD_MATRÍCULAS` 1 a muchos `BD_EVALUACIÓN`.
- `BD_MATRÍCULAS` 1 a muchos `BD_EFSRT`.
- `BD_MATRÍCULAS` 1 a muchos `BD_DOCUMENTOS`.
- Los registros de auditoría observan todas las operaciones, pero no alimentan cálculos ni documentos.

Mostrar entre tres y seis campos esenciales dentro de cada entidad, sin llenar el diagrama con todos los campos.

DIAGRAMA 3: FLUJO DIARIO DE LA SECRETARIA

Representar este recorrido:

Abrir sistema
→ revisar periodo activo
→ buscar estudiante por DNI
→ si no existe, registrarlo
→ crear o consultar matrícula
→ asignar programa, módulo, turno y sección
→ revisar unidades didácticas
→ registrar o importar asistencia
→ registrar o importar notas
→ registrar EFSRT
→ ejecutar cierre académico
→ corregir pendientes
→ seleccionar documento
→ vista previa
→ imprimir o exportar PDF
→ guardar respaldo.

Mostrar mensajes de control:

- Estudiante duplicado.
- Matrícula duplicada.
- Catálogo incompleto.
- Nota fuera de rango.
- Asistencia duplicada.
- Unidad sin capacidad o indicadores.
- EFSRT pendiente.
- Documento no habilitado.
- Documento listo para imprimir.

DIAGRAMA 4: CICLO DE VIDA DE UN DOCUMENTO

Representar:

BORRADOR
→ DATOS INCOMPLETOS
→ VALIDACIÓN
→ LISTO PARA VISTA PREVIA
→ APROBADO
→ IMPRESO/PDF
→ REGISTRADO
→ ANULADO O REEMITIDO, si corresponde.

Una plantilla nunca debe modificar las bases de datos.

CONTROLES TRANSVERSALES

Mostrar en una banda inferior:

- Validaciones de datos.
- Protección de hojas internas.
- IDs estables.
- Control de duplicados.
- Registro de usuario, fecha y hora.
- Copia de seguridad.
- Restauración.
- Control de versiones.
- Pruebas de fórmulas.
- Pruebas de macros.
- Comparación visual de plantillas.
- Prueba de impresión en Microsoft Excel 365.

TÍTULO DEL GRÁFICO PRINCIPAL

“ARQUITECTURA FUNCIONAL DEL NUEVO LIBRO ACADÉMICO CETPRO”

SUBTÍTULO

“Captura de datos, bases internas, procesamiento, documentos institucionales e impresión”

CRITERIOS DE CALIDAD

Antes de entregar:

- Verificar que aparezcan las cinco hojas visibles.
- Verificar que aparezcan todas las bases internas.
- Contar exactamente 21 plantillas.
- Verificar que ninguna plantilla escriba en una base.
- Verificar la dirección de todas las flechas.
- Verificar que los textos estén completos y sin superposición.
- Verificar que el diagrama pueda leerse en tamaño A3.
- Verificar que el SVG sea editable.
- Verificar que PNG, PDF y SVG muestren la misma arquitectura.
- No inventar hojas, relaciones ni formatos adicionales.
- No afirmar que el sistema ya está construido. El gráfico representa la arquitectura que se va a implementar.

Primero presenta una vista previa del diagrama maestro. Después genera y entrega todos los archivos solicitados.