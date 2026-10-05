/**
 * Catálogo Oficial y Pedagógico de Información Documental (DocumentInfoCatalog)
 * Proporciona el contenido detallado para cada plantilla oficial (TMPL-01 a TMPL-21):
 * 1. ¿Qué es este documento?
 * 2. ¿Qué contiene?
 * 3. ¿Para qué sirve?
 * 4. Responsabilidades por Rol (Docente, Secretaría, Director) y Módulos Formativos.
 * 
 * 100% Offline — Sin dependencias externas.
 */

export const DOCUMENT_INFO_CATALOG = Object.freeze({
  'TMPL-01': {
    id: 'TMPL-01',
    code: '01_NOMINA_DE_MATRICULA',
    name: 'Nómina Oficial de Matrícula',
    stage: 'Etapa 1 · Matrícula e Inicio',
    module: 'Módulo Formativo I y II',
    badge: '🏛️ Trámite Oficial UGEL',
    badgeColor: '#1d4ed8',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Documento público y legal de inscripción formal de estudiantes.',
        description: 'La Nómina Oficial de Matrícula es el instrumento legal expedido por el CETPRO que registra formalmente la lista de estudiantes inscritos en un programa de estudios y módulo formativo para un periodo lectivo determinado.',
        normativa: 'R.V.M. N° 188-2020-MINEDU / Lineamientos Académicos Generales para los CETPRO.',
        tipo: 'Formato Oficial Ministerial foliado de 30 estudiantes por página.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Datos institucionales: Código Modular, DRE, UGEL, nombre del CETPRO y denominación.',
          'Identificación académica: Programa de Estudios, Módulo, Periodo Lectivo, Turno y Grupo.',
          'Padrón de estudiantes (filas numeradas del 1 al 30 por folio): Número de DNI, apellidos y nombres completos, sexo (M/F), fecha de nacimiento y edad.',
          'Condición de matrícula: Ingresante, promovido o regular.',
          'Pie de firma con cargo del Director General y de la Secretaría Académica.'
        ],
        observation: 'Foliación estricta y correlativa. Cada bloque de 30 estudiantes genera un folio formal para remisión.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Remisión obligatoria ante la UGEL correspondiente para la validación y visado del inicio académico.',
          'Sustento de la meta de atención y asignación presupuestal del personal docente.',
          'Garantía jurídica de que el estudiante se encuentra legalmente matriculado para efectos de certificación futura.',
          'Registro maestro para cotejar traslados, convalidaciones y subsanaciones de nómina.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👩‍💼 Secretaría Académica: Consolida inscripciones, asigna turnos y genera la nómina oficial.',
        roleSign: '👨‍💼 Director General: Refrenda y firma la nómina para elevar a la UGEL.',
        docenteAction: '👨‍🏫 Docente: Recibe el padrón oficial generado en esta nómina para su aula.',
        prerequisites: 'Estudiantes debidamente registrados en el sistema con DNI y asignados a un grupo académico activo.'
      }
    ]
  },

  'TMPL-02': {
    id: 'TMPL-02',
    code: '02_FICHA_DE_MATRICULA',
    name: 'Ficha Individual de Matrícula',
    stage: 'Etapa 1 · Matrícula e Inicio',
    module: 'Expediente Único por Módulo',
    badge: '👤 Expediente del Alumno',
    badgeColor: '#059669',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Contrato y constancia personal de matrícula del estudiante.',
        description: 'Es la cédula individual que suscribe el estudiante (o su apoderado) al formalizar su ingreso al programa técnico del CETPRO, detallando sus condiciones sociodemográficas y formativas.',
        normativa: 'Directiva Interna de Admisión y Matrícula / R.M. N° 058-2018-MINEDU.',
        tipo: 'Ficha personal en orientación horizontal (Landscape) A4.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Filiación del alumno: DNI, nombres, apellidos, lugar y fecha de nacimiento, estado civil y domicilio actual.',
          'Datos de contacto: Teléfono, celular, correo electrónico y contacto de emergencia.',
          'Antecedentes educativos: Grado de instrucción previo (Primaria, Secundaria completa, Superior).',
          'Detalle formativo: Código de matrícula, programa, módulo elegido, turno y fecha de registro.',
          'Espacios para foto digital, huella dactilar, firma del estudiante y sello de Secretaría.'
        ],
        observation: 'Documento base para la apertura del legajo personal en el archivo de Secretaría.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Acredita la condición de alumno activo frente a cualquier requerimiento administrativo.',
          'Constituye el expediente individual exigido en auditorías de control y supervisión educativa.',
          'Facilita el contacto inmediato con el alumno o sus familiares ante cualquier eventualidad.',
          'Sirve como constancia física entregable al estudiante como comprobante de su inscripción.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👩‍💼 Secretaría Académica: Emite e imprime la ficha al momento de recibir los requisitos.',
        roleSign: '👨‍💼 Alumno y Secretaría: Suscriben el compromiso de permanencia y respeto a las normas del CETPRO.',
        docenteAction: '👨‍🏫 Docente: Puede consultar los antecedentes y datos de contacto de sus alumnos matriculados.',
        prerequisites: 'Registro del estudiante en el sistema con datos personales y matrícula asignada.'
      }
    ]
  },

  'TMPL-03': {
    id: 'TMPL-03',
    code: '03_REGISTRO_DE_MATRICULA_MODULAR',
    name: 'Registro de Matrícula Modular',
    stage: 'Etapa 1 · Matrícula e Inicio',
    module: 'Control Modular Integral',
    badge: '📋 Registro Administrativo',
    badgeColor: '#d97706',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Libro y sábana de control modular administrativo por grupo.',
        description: 'Es el registro oficial complementario que consolida la información modular de matrícula para archivo físico y cotejo permanente de los módulos cursados por cada cohorte estudiantil.',
        normativa: 'Compendio de Formatos de Gestión CETPRO / R.V.M. N° 188-2020-MINEDU.',
        tipo: 'Registro modular administrativo institucional.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Membrete oficial del CETPRO y código modular del servicio educativo.',
          'Programa de estudios, ciclo formativo (Auxiliar Técnico o Técnico) y código de módulo.',
          'Nómina de alumnos ordenada alfabéticamente con DNI, edad y condición de procedencia.',
          'Espacio de observaciones para registrar traslados, convalidaciones, retiros o reingresos.',
          'Firmas de apertura de registro por Secretaría y Dirección.'
        ],
        observation: 'Permite un seguimiento rápido de la conformación de grupos de 20 a 30 alumnos.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Permite la verificación rápida de matrículas vigentes sin necesidad de abrir expedientes individuales.',
          'Sirve de libro de respaldo físico ante caídas de fluido eléctrico o revisiones de archivo pasivo.',
          'Facilita la conciliación con el sistema ministerial (SIAGIE / REGISTRA).'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👩‍💼 Secretaría Académica: Elabora el registro y actualiza las novedades de los matriculados.',
        roleSign: '👨‍💼 Dirección General: Da visto bueno al cierre del proceso de matrícula del periodo.',
        docenteAction: '👨‍🏫 Docente: Verifica la correspondencia de la lista oficial con los asistentes en aula.',
        prerequisites: 'Matrículas procesadas y validadas en el periodo académico.'
      }
    ]
  },

  'TMPL-04': {
    id: 'TMPL-04',
    code: '04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION',
    name: 'Portada de Registro Asistencia y Evaluación',
    stage: 'Etapa 1 / 2 · Carpeta Pedagógica',
    module: 'Portada Oficial de Aula',
    badge: '📂 Carpeta Pedagógica Docente',
    badgeColor: '#7c3aed',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Carátula oficial de la carpeta técnico-pedagógica del docente.',
        description: 'Es la portada formal que encabeza el legajo técnico de aula. Contiene la identificación completa del CETPRO, el programa formativo, el módulo en desarrollo y los datos del docente responsable.',
        normativa: 'Guía de Organización de la Carpeta Técnico-Pedagógica Institucional.',
        tipo: 'Portada oficial a color con escudo y membrete institucional.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Identificación institucional: Logo oficial CETPRO, denominación, UGEL y DRE.',
          'Área y Programa de Estudios: Ej. Computación e Informática, Peluquería, Confección Textil, etc.',
          'Módulo Formativo: Nombre del módulo, número de créditos y total de horas pedagógicas.',
          'Contexto de Aula: Ciclo formativo, turno (Mañana, Tarde, Noche), grupo y periodo lectivo.',
          'Firma y datos del Docente de Especialidad a cargo del aula.'
        ],
        observation: 'Se imprime al inicio de cada módulo para aperturar el cuaderno de campo y los registros auxiliares.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Presentación formal del expediente pedagógico en visitas de monitoreo de la Dirección o Especialistas de UGEL.',
          'Identifica de forma unívoca la documentación de aula en el archivo docente y de secretaría.',
          'Garantiza la trazabilidad del docente a cargo del grupo formativo durante el año lectivo.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👨‍🏫 Docente de Especialidad: Genera su portada directamente con los datos de su aula asignada.',
        roleSign: '👨‍🏫 Docente: Firma y rubrica su carátula para su archivo y control de Dirección.',
        docenteAction: '👩‍💼 Secretaría / Dirección: Verifican la coincidencia de los módulos y horas planificadas.',
        prerequisites: 'Estar logueado como docente con carrera y grupo seleccionados.'
      }
    ]
  },

  'TMPL-05': {
    id: 'TMPL-05',
    code: '05_CONTROL_ASISTENCIA_MODULAR_UD1',
    name: 'Control de Asistencia Modular — Unidad Didáctica 1',
    stage: 'Etapa 2 · Aula y Asistencia',
    module: 'Unidad Didáctica 1 (UD1)',
    badge: '📅 Asistencia Diaria UD1',
    badgeColor: '#2563eb',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Registro del porcentaje de asistencia y permanencia en la UD 1.',
        description: 'Control diario de asistencia de los estudiantes matriculados en la primera Unidad Didáctica del módulo formativo, calculando porcentajes de asistencia, faltas y justificaciones.',
        normativa: 'Reglamento Interno del CETPRO — Control de Asistencia y Permanencia (Mínimo 70% de asistencia para aprobación).',
        tipo: 'Cuadrícula oficial de asistencia por sesiones de clase.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Lista completa de estudiantes del grupo con DNI y nombres.',
          'Columnas de sesiones diarias con marcación: Puntual (• / P), Falta (F), Tardanza (T), Justificada (J).',
          'Cálculo automático de: Total de Asistencias, Total de Inasistencias y % de Asistencia Efectiva.',
          'Alerta de límite de inasistencias (artículo 30%: más del 30% de faltas causa retiro automático).',
          'Firma del docente de la especialidad al pie del registro.'
        ],
        observation: 'Se actualiza sesión por sesión y se sincroniza automáticamente con la base de datos.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Determina la condición de habilitado o inhabilitado por inasistencias para la evaluación final.',
          'Sustento pedagógico ante reclamos o justificaciones médicas de los estudiantes.',
          'Reporte mensual de permanencia estudiantil requerido por Secretaría Académica.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👨‍🏫 Docente: Registra diariamente la asistencia y emite el reporte al culminar la UD1.',
        roleSign: '👨‍🏫 Docente: Firma y entrega el consolidado a Secretaría al cierre de la unidad.',
        docenteAction: '👩‍💼 Secretaría: Consolida los porcentajes para verificar condición de retiro en el acta.',
        prerequisites: 'Estudiantes del grupo registrados y sesiones de clase configuradas.'
      }
    ]
  },

  'TMPL-11': {
    id: 'TMPL-11',
    code: '11_REGISTRO_EVALUACION_AUXILIAR_UD1',
    name: 'Registro Auxiliar de Evaluación — Unidad Didáctica 1',
    stage: 'Etapa 2 · Aula y Evaluación',
    module: 'Unidad Didáctica 1 (UD1)',
    badge: '📝 Calificaciones UD1',
    badgeColor: '#059669',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Registro oficial de notas y capacidades terminales de la UD 1.',
        description: 'Instrumento técnico-pedagógico donde el docente consigna los calificativos vigesimales (0 a 20) obtenidos por los estudiantes en los indicadores de logro correspondientes a la Unidad Didáctica 1.',
        normativa: 'R.V.M. N° 188-2020-MINEDU — Evaluación Formativa por Competencias en la Educación Técnico-Productiva.',
        tipo: 'Cuadro de notas por capacidades e indicadores con cálculo de promedio final.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Datos del programa de estudios, módulo, nombre de la UD 1, créditos y docente.',
          'Lista de estudiantes del grupo.',
          'Columnas para Indicadores de Logro / Capacidades Específicas de la UD.',
          'Nota de Recuperación / Evaluación de Subsanación si corresponde.',
          'Promedio Final de la UD (escala vigesimal: mínimo aprobatorio 12 o 13 según ciclo) y condición final (Aprobado / Desaprobado).'
        ],
        observation: 'Notas protegidas con validación vigesimal estricta (0-20 entero).'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Evidencia oficial del logro de aprendizajes del estudiante durante la Unidad Didáctica 1.',
          'Alimenta directamente el Acta Oficial de Evaluación Modular (TMPL-19).',
          'Sustento de notas ante el estudiante para retroalimentación formativa y aclaraciones.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👨‍🏫 Docente: Registra las notas continuas y genera el registro auxiliar final de la UD.',
        roleSign: '👨‍🏫 Docente: Firma el registro auxiliar y lo remite formalmente a Secretaría.',
        docenteAction: '👩‍💼 Secretaría: Traslada los promedios al Acta Modular oficial sin alterar los valores.',
        prerequisites: 'Calificaciones ingresadas mediante el modal de notas de la UD1.'
      }
    ]
  },

  'TMPL-16': {
    id: 'TMPL-16',
    code: '16_CONTROL_ASISTENCIA_MODULAR',
    name: 'Control de Asistencia Modular (UD 1 a UD 6)',
    stage: 'Etapa 2 · Asistencia y Aula',
    module: 'Consolidado Modular Completo',
    badge: '📅 Asistencia Modular General',
    badgeColor: '#1d4ed8',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Consolidado general de asistencia de todas las unidades didácticas del módulo.',
        description: 'Es el documento integral que reúne el porcentaje de asistencia acumulado por el estudiante a lo largo de todas las Unidades Didácticas (UD1 a UD6) que conforman el módulo formativo.',
        normativa: 'Directiva de Gestión Académica / Control de Permanencia MINEDU.',
        tipo: 'Sábana modular de asistencia por sesiones de aprendizaje.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Cabecera con identificación completa del CETPRO, ciclo, módulo, docente y horario.',
          'Listado ordenado de matriculados.',
          'Resumen de asistencias efectivas e inasistencias desglosadas por cada UD del módulo.',
          'Porcentaje final ponderado de asistencia del módulo completo.',
          'Firma del docente de especialidad y fecha de cierre.'
        ],
        observation: 'Imprescindible para el cierre del módulo antes de ingresar al periodo de prácticas (EFSRT).'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Determina si el alumno cumplió con el 70% mínimo de asistencia exigido por norma para aprobar el módulo.',
          'Permite a Secretaría detectar casos de deserción temprana o abandono justificado.',
          'Documento de archivo obligatorio para la carpeta de titulación y egreso.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👨‍🏫 Docente: Emite el consolidado final tras registrar las asistencias de las UDs.',
        roleSign: '👨‍🏫 Docente: Firma el consolidado y lo eleva a Secretaría Académica.',
        docenteAction: '👩‍💼 Secretaría: Comprueba que ningún alumno inhabilitado sea procesado en el Acta.',
        prerequisites: 'Asistencias registradas en el sistema para las UDs del módulo.'
      }
    ]
  },

  'TMPL-17': {
    id: 'TMPL-17',
    code: '17_REGISTRO_EVALUACION_AUXILIAR',
    name: 'Registro Auxiliar de Evaluación de los Aprendizajes (UD 1 a UD 7)',
    stage: 'Etapa 2 · Evaluación y Aula',
    module: 'Consolidado de Calificaciones Modular',
    badge: '📝 Registro de Evaluación General',
    badgeColor: '#059669',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Sábana integral de notas de todas las unidades didácticas del módulo.',
        description: 'Es el instrumento consolidado donde se presentan los promedios de todas las Unidades Didácticas (UD1 a UD7) del módulo formativo, permitiendo apreciar el rendimiento académico global de la sección.',
        normativa: 'R.V.M. N° 188-2020-MINEDU — Disposiciones de Evaluación y Certificación en CETPRO.',
        tipo: 'Registro auxiliar oficial de calificaciones en escala vigesimal.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Datos institucionales, código de programa, nombre del módulo formativo, turno y aula.',
          'Nómina de alumnos.',
          'Promedio de cada una de las Unidades Didácticas (UD1, UD2, UD3, UD4, UD5, UD6, UD7).',
          'Promedio Modular Ponderado (calificación final del componente formativo en CETPRO).',
          'Condición académica de cada estudiante: Aprobado (Promedio >= 12), Desaprobado, o En Recuperación.'
        ],
        observation: 'Documento maestro que da origen formal a las notas que figurarán en el Acta Final.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Sustento probatorio de las notas que el docente entrega a Secretaría Académica.',
          'Permite la publicación oficial de notas para conocimiento y verificación de los estudiantes.',
          'Base indispensable para que Secretaría y Dirección elaboren el Acta Oficial de Evaluación Modular (TMPL-19).'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👨‍🏫 Docente: Es el único facultado para registrar y calcular estas notas.',
        roleSign: '👨‍🏫 Docente: Firma y entrega el registro a Secretaría en los plazos fijados por cronograma.',
        docenteAction: '👩‍💼 Secretaría / Dirección: Verifican y recepcionan formalmente para la emisión del Acta.',
        prerequisites: 'Calificaciones ingresadas para las unidades didácticas del módulo formativo.'
      }
    ]
  },

  'TMPL-18': {
    id: 'TMPL-18',
    code: '18_FICHA_CONSOLIDADO_EFSRT',
    name: 'Ficha y Consolidado de EFSRT (Prácticas Preprofesionales)',
    stage: 'Etapa 3 · Cierre Modular y Prácticas',
    module: 'Experiencias Formativas en Situaciones Reales de Trabajo',
    badge: '💼 Prácticas Preprofesionales',
    badgeColor: '#0891b2',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Registro del cumplimiento de horas de prácticas preprofesionales en empresas.',
        description: 'Documento que certifica que el estudiante ha desarrollado y aprobado las Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT), cumpliendo las horas prácticas normadas en centros laborales o proyectos institucionales.',
        normativa: 'Ley N° 28044 / R.V.M. N° 188-2020-MINEDU — Lineamientos de EFSRT en la ETP.',
        tipo: 'Ficha de seguimiento y acta consolidada de horas y calificación de prácticas.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Datos del estudiante y programa de estudios.',
          'Razón Social de la empresa / centro de prácticas / taller donde realizó las EFSRT.',
          'Total de horas cronológicas y créditos acumulados de prácticas en el módulo.',
          'Calificación obtenida por el supervisor de la empresa o docente coordinador de prácticas.',
          'Condición final: Aprobado (Cumplió horas y competencias) o Pendiente.'
        ],
        observation: 'Requisito no negociable para tener derecho a la emisión del Acta Modular y Certificación.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Acredita la vinculación laboral real del estudiante con el sector productivo.',
          'Requisito indispensable para que Secretaría pueda cerrar el Acta de Evaluación Modular (TMPL-19).',
          'Forma parte del expediente de titulación que se eleva a la DRE / MINEDU.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👩‍💼 Secretaría Académica / Coordinador de EFSRT: Verifica convenios y registra las horas prácticas.',
        roleSign: '👨‍💼 Director y Secretaría: Visan la culminación satisfactoria de las prácticas del alumno.',
        docenteAction: '👨‍🏫 Docente: Puede actuar como tutor o supervisor técnico de las prácticas de su grupo.',
        prerequisites: 'Constancia de prácticas emitida por la empresa o informe final de proyecto productivo.'
      }
    ]
  },

  'TMPL-19': {
    id: 'TMPL-19',
    code: '19_ACTA_EVALUACION_MODULAR',
    name: 'Acta Oficial de Evaluación Modular',
    stage: 'Etapa 3 · Cierre Modular y Prácticas',
    module: 'Cierre del Módulo Formativo',
    badge: '🏛️ Acta Oficial Ministerial',
    badgeColor: '#dc2626',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Instrumento público definitivo e inalterable de cierre de módulo.',
        description: 'Es el documento público oficial con valor legal que certifica los calificativos finales de todos los estudiantes en un módulo técnico, integrando tanto el componente académico del aula como las prácticas preprofesionales (EFSRT).',
        normativa: 'Directiva Nacional de Evaluación y Titulación / R.V.M. N° 188-2020-MINEDU.',
        tipo: 'Acta oficial ministerial con foliado y casilleros de notas inmodificables.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Encabezado de Estado: República del Perú, DRE, UGEL, Código Modular y Denominación Oficial.',
          'Detalle del Módulo: Nombre, periodo de inicio y término, créditos y total de horas.',
          'Nómina de estudiantes con DNI y calificaciones finales en cada Unidad Didáctica.',
          'Calificación obtenida en las Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT).',
          'Promedio Modular Final y Condición (Aprobado / Desaprobado / Retirado).',
          'Firmas formales de: Docente Responsable, Secretaría Académica y Director General.'
        ],
        observation: 'Una vez emitida y firmada, no admite enmendaduras ni tachaduras.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Es el único sustento legal ante el MINEDU y la UGEL para la emisión de Certificados Modulares y Títulos.',
          'Se custodia en el archivo permanente del CETPRO de forma vitalicia (archivo histórico).',
          'Permite la emisión de certificados oficiales solicitados por los egresados a lo largo de su vida profesional.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👩‍💼 Secretaría Académica: Consolida las notas del docente y las horas de EFSRT para emitir el Acta.',
        roleSign: '👨‍💼 Director General, Secretaría y Docente: Suscriben el acta oficial de forma mancomunada.',
        docenteAction: '👨‍🏫 Docente: Verifica que sus calificaciones auxiliares coincidan fielmente con el acta antes de firmar.',
        prerequisites: 'Notas de aula concluidas (TMPL-17) y horas de EFSRT validadas (TMPL-18).'
      }
    ]
  },

  'TMPL-20': {
    id: 'TMPL-20',
    code: '20_CERTIFICADO_MODULAR',
    name: 'Certificado Modular Oficial',
    stage: 'Etapa 4 · Certificación y Egreso',
    module: 'Certificación de Competencias Laborales',
    badge: '🏆 Certificado Oficial con Valor Laboral',
    badgeColor: '#1d4ed8',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Certificado oficial que acredita la adquisición de competencias de un módulo.',
        description: 'Documento oficial con valor oficial para el mercado laboral que se otorga al estudiante que aprueba satisfactoriamente todas las capacidades y prácticas de un módulo formativo específico.',
        normativa: 'R.V.M. N° 188-2020-MINEDU — Catálogo Nacional de la Oferta Formativa (CNOF).',
        tipo: 'Certificado oficial con numeración correlativa y código de registro institucional.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Nombres y apellidos completos del estudiante y número de DNI.',
          'Nombre del Programa de Estudios y Denominación del Módulo Formativo aprobado.',
          'Número de créditos y total de horas cronológicas/pedagógicas cursadas.',
          'Código de Registro en el Libro de Certificados Modulares de Secretaría.',
          'Fecha de expedición y firmas oficiales del Director General y de Secretaría Académica.'
        ],
        observation: 'Permite la inserción laboral progresiva del estudiante antes de terminar toda la carrera.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Habilita al estudiante para postular a puestos laborales demostrando competencias técnicas específicas.',
          'Requisito acumulativo para tramitar posteriormente el Título de Auxiliar Técnico o Técnico.',
          'Válido a nivel nacional ante empleadores públicos y privados.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👩‍💼 Secretaría Académica: Verifica el Acta Modular aprobada, asigna número de registro y emite.',
        roleSign: '👨‍💼 Director General: Refrenda y sella el certificado oficial.',
        docenteAction: '👨‍🏫 Docente: Su evaluación aprobada en aula es la base que originó este certificado.',
        prerequisites: 'Estudiante con condición de Aprobado en el Acta Oficial de Evaluación Modular (TMPL-19).'
      }
    ]
  },

  'TMPL-21': {
    id: 'TMPL-21',
    code: '21_TITULO_TECNICO',
    name: 'Título de Auxiliar Técnico / Técnico Oficial',
    stage: 'Etapa 4 · Certificación y Egreso',
    module: 'Culminación del Plan de Estudios Completo',
    badge: '🎓 Titulación Oficial MINEDU',
    badgeColor: '#047857',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Máximo grado formativo otorgado a nombre de la Nación por el CETPRO.',
        description: 'Es el título oficial a Nombre de la Nación conferido al egresado que ha culminado y aprobado la totalidad de los módulos formativos y créditos de su plan de estudios, alcanzando el perfil de egreso normado.',
        normativa: 'Ley N° 28044 / R.V.M. N° 188-2020-MINEDU — Reglamento de Titulación Técnica.',
        tipo: 'Diploma Oficial de Título Profesional con marco y registro ante el MINEDU / REGISTRA.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Fórmula de Ley: "A Nombre de la Nación".',
          'Datos del egresado: Nombres y apellidos completos y documento de identidad (DNI).',
          'Nivel formativo alcanzado: Auxiliar Técnico (mínimo 40 créditos / 950 horas) o Técnico (mínimo 80 créditos / 1900 horas).',
          'Nombre del Programa de Estudios oficial registrado en el CNOF.',
          'Resolución Directoral de Expedición de Título y Código de Registro Nacional.',
          'Firma solemne del Director General del CETPRO.'
        ],
        observation: 'Competencia exclusiva de emisión de la Dirección General del CETPRO.'
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Acredita el ejercicio legal de la profesión técnica a nivel nacional e internacional.',
          'Permite la convalidación de estudios superiores y progresión académica en Institutos o Universidades.',
          'Acceso a plazas laborales especializadas en el sector público (carrera pública) y privado.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: '👨‍💼 Director General: Competencia exclusiva de emisión y suscripción del Título a Nombre de la Nación.',
        roleSign: '👨‍💼 Director General: Firma, sella y eleva la resolución a la DRE / MINEDU para inscripción en REGISTRA.',
        docenteAction: '👩‍💼 Secretaría Académica: Arma el expediente de titulación con todas las actas y certificados.',
        prerequisites: 'Aprobación de la totalidad de módulos formativos y créditos del programa de estudios.'
      }
    ]
  }
});

/**
 * Obtiene la ficha informativa de una plantilla o genera una por defecto
 * @param {string} templateId Ej: 'TMPL-01'
 * @returns {object}
 */
export function getDocumentInfo(templateId) {
  if (DOCUMENT_INFO_CATALOG[templateId]) {
    return DOCUMENT_INFO_CATALOG[templateId];
  }

  // Si es una UD de asistencia (TMPL-06 a TMPL-10)
  if (templateId >= 'TMPL-06' && templateId <= 'TMPL-10') {
    const udNum = parseInt(templateId.replace('TMPL-0', '').replace('TMPL-', ''), 10) - 4;
    return {
      id: templateId,
      code: `${templateId}_CONTROL_ASISTENCIA_UD${udNum}`,
      name: `Control de Asistencia Modular — Unidad Didáctica ${udNum}`,
      stage: 'Etapa 2 · Aula y Asistencia',
      module: `Unidad Didáctica ${udNum} (UD${udNum})`,
      badge: `📅 Asistencia Diaria UD${udNum}`,
      badgeColor: '#2563eb',
      slides: [
        {
          num: 1,
          title: '¿Qué es este documento?',
          icon: '📄',
          highlight: `Control de asistencia diaria de la Unidad Didáctica ${udNum}.`,
          description: `Registro formal de sesiones y horas presenciales de los estudiantes durante el desarrollo de la Unidad Didáctica ${udNum} del módulo técnico.`,
          normativa: 'Reglamento Interno CETPRO — Mínimo 70% de asistencia presencial.',
          tipo: 'Cuadrícula oficial de asistencia por sesiones de clase.'
        },
        {
          num: 2,
          title: '¿Qué contiene?',
          icon: '📊',
          items: [
            'Nómina de estudiantes del grupo con DNI y apellidos.',
            'Matriz de sesiones con estado diario: Asistencia (•), Falta (F), Tardanza (T), Justificación (J).',
            'Porcentaje acumulado de asistencia efectiva para determinar condición de inhabilitado (>30% faltas).',
            'Firma del docente responsable de la UD.'
          ]
        },
        {
          num: 3,
          title: '¿Para qué sirve?',
          icon: '🎯',
          items: [
            'Habilita al estudiante para la evaluación final de la UD.',
            'Reporte de permanencia de estudiantes para secretaría y seguimiento tutorial.',
            'Sustento de asistencia ante reclamos o justificaciones médicas.'
          ]
        },
        {
          num: 4,
          title: 'Responsabilidades por Rol',
          icon: '👥',
          roleEmit: '👨‍🏫 Docente: Registra y emite el control al culminar las sesiones de la unidad.',
          roleSign: '👨‍🏫 Docente: Firma y presenta a Secretaría.',
          docenteAction: '👩‍💼 Secretaría: Consolida los porcentajes para el acta final modular.',
          prerequisites: `Sesiones de la UD ${udNum} programadas y estudiantes matriculados.`
        }
      ]
    };
  }

  // Si es una UD de evaluación (TMPL-12 a TMPL-15)
  if (templateId >= 'TMPL-12' && templateId <= 'TMPL-15') {
    const udNum = parseInt(templateId.replace('TMPL-0', '').replace('TMPL-', ''), 10) - 10;
    return {
      id: templateId,
      code: `${templateId}_REGISTRO_EVALUACION_UD${udNum}`,
      name: `Registro Auxiliar de Evaluación — Unidad Didáctica ${udNum}`,
      stage: 'Etapa 2 · Aula y Evaluación',
      module: `Unidad Didáctica ${udNum} (UD${udNum})`,
      badge: `📝 Calificaciones UD${udNum}`,
      badgeColor: '#059669',
      slides: [
        {
          num: 1,
          title: '¿Qué es este documento?',
          icon: '📄',
          highlight: `Registro auxiliar de calificaciones e indicadores de la Unidad Didáctica ${udNum}.`,
          description: `Instrumento técnico de evaluación en escala vigesimal (0-20) donde el docente asienta los logros en las capacidades de la Unidad Didáctica ${udNum}.`,
          normativa: 'R.V.M. N° 188-2020-MINEDU — Evaluación Formativa por Competencias en CETPRO.',
          tipo: 'Matriz de calificaciones e indicadores de logro.'
        },
        {
          num: 2,
          title: '¿Qué contiene?',
          icon: '📊',
          items: [
            'Datos del programa de estudios, módulo y docente.',
            'Nombres y DNI de los estudiantes.',
            'Calificaciones por indicador de logro de la capacidad específica.',
            'Promedio de la UD (mínimo aprobatorio 12) y condición final (Aprobado / Desaprobado).',
            'Firma del docente de especialidad.'
          ]
        },
        {
          num: 3,
          title: '¿Para qué sirve?',
          icon: '🎯',
          items: [
            'Evidencia formal del avance formativo del estudiante en esta UD.',
            'Alimenta el Acta Oficial de Evaluación Modular (TMPL-19).',
            'Publicación y retroalimentación de calificaciones para los alumnos.'
          ]
        },
        {
          num: 4,
          title: 'Responsabilidades por Rol',
          icon: '👥',
          roleEmit: '👨‍🏫 Docente: Es el responsable exclusivo de la evaluación y notas del aula.',
          roleSign: '👨‍🏫 Docente: Firma y entrega el registro oficial a Secretaría.',
          docenteAction: '👩‍💼 Secretaría: Traslada los promedios al Acta Modular.',
          prerequisites: `Notas registradas en la UD ${udNum} mediante la interfaz del sistema.`
        }
      ]
    };
  }

  // Genérico de contingencia
  return {
    id: templateId,
    code: templateId,
    name: `Documento Oficial ${templateId}`,
    stage: 'Etapa Académica Institucional',
    module: 'Módulo Formativo',
    badge: '📄 Formato Institucional',
    badgeColor: '#4b5563',
    slides: [
      {
        num: 1,
        title: '¿Qué es este documento?',
        icon: '📄',
        highlight: 'Formato institucional oficial del Sistema Académico CETPRO.',
        description: 'Documento técnico normado para la gestión académica y el registro de información oficial del CETPRO.',
        normativa: 'R.V.M. N° 188-2020-MINEDU.',
        tipo: 'Formato ministerial oficial.'
      },
      {
        num: 2,
        title: '¿Qué contiene?',
        icon: '📊',
        items: [
          'Datos institucionales del CETPRO Micaela Bastidas Puyucawa.',
          'Identificación de los estudiantes, programa formativo y ciclo.',
          'Casilleros de información técnica y firmas reglamentarias.'
        ]
      },
      {
        num: 3,
        title: '¿Para qué sirve?',
        icon: '🎯',
        items: [
          'Gestión y soporte al flujo académico del CETPRO.',
          'Evidencia institucional en visitas de supervisión de UGEL.'
        ]
      },
      {
        num: 4,
        title: 'Responsabilidades por Rol',
        icon: '👥',
        roleEmit: 'Emisión por el personal responsable autorizado.',
        roleSign: 'Firma de la autoridad competente según el trámite.',
        docenteAction: 'Uso conforme a la normativa vigente.',
        prerequisites: 'Datos cargados en el sistema.'
      }
    ]
  };
}
