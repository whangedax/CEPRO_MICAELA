/**
 * Configuración de Identidad y Marca Institucional (Branding)
 * Módulo: M02 / M06 — Emblema y Membrete Oficial del CETPRO
 * Catálogo Universal de Posicionamiento para los 21 Documentos Oficiales
 */

const ATTENDANCE_COORDS = Object.freeze({
  x: 48.0,
  y: 745.0,
  width: 68.0,
  height: 66.2
});

const EVALUATION_COORDS = Object.freeze({
  x: 42.0,
  y: 748.0,
  width: 68.0,
  height: 66.2
});

export const BRANDING_CONFIG = Object.freeze({
  institutionId: 'INST-001',
  institutionName: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"',
  denominacionCorta: 'CETPRO MICAELA BASTIDAS PUYUCAWA - SAN MIGUEL',
  lema: 'Tecnología · Capacitación · Producción',
  logoUrl: '/app/img/logo-cetpro.jpg',
  enabledInPdfs: true,
  aspectRatio: 465 / 453, // Ancho / Alto original del emblema (~1.026)

  /**
   * Coordenadas y dimensiones (en puntos tipográficos PDF) por plantilla
   * Sistema de coordenadas PDF: Origen (0,0) en la esquina inferior izquierda.
   */
  templates: Object.freeze({
    // TMPL-01: Nómina de Matrícula Oficial A4 Vertical (595.3 x 841.9 pt)
    // Esquina superior derecha: Simetría frente al Escudo Nacional (x: 59, y: 755)
    'TMPL-01': Object.freeze({
      x: 485.0,
      y: 752.0,
      width: 60.0,
      height: 58.5
    }),

    // TMPL-02: Ficha Individual de Matrícula A4 Horizontal (841.9 x 595.3 pt)
    // Esquina superior derecha sobre tabla de datos del estudiante
    'TMPL-02': Object.freeze({
      x: 730.0,
      y: 518.0,
      width: 58.0,
      height: 56.5
    }),

    // TMPL-03: Consolidado de Matrícula A3 Vertical (841.9 x 1190.5 pt)
    // Esquina superior izquierda antes del título institucional
    'TMPL-03': Object.freeze({
      x: 55.0,
      y: 1120.0,
      width: 62.0,
      height: 60.4
    }),

    // TMPL-04: Carátula / Portada A4 Vertical (595.3 x 841.9 pt)
    // Centrado horizontal en cabecera: (595.28 - 80) / 2 = 257.6, sobre y=721
    'TMPL-04': Object.freeze({
      x: 257.6,
      y: 742.0,
      width: 80.0,
      height: 78.0
    }),

    // TMPL-05..10: Registro Auxiliar de Asistencia A3 Horizontal (1190.55 x 841.89 pt)
    // Esquina superior izquierda antes de "PROGRAMA DE ESTUDIOS:" (x: 162, y: 795)
    'TMPL-05': ATTENDANCE_COORDS,
    'TMPL-06': ATTENDANCE_COORDS,
    'TMPL-07': ATTENDANCE_COORDS,
    'TMPL-08': ATTENDANCE_COORDS,
    'TMPL-09': ATTENDANCE_COORDS,
    'TMPL-10': ATTENDANCE_COORDS,

    // TMPL-11..17: Registro Auxiliar de Evaluación A3 Horizontal (1190.55 x 841.89 pt)
    // Esquina superior izquierda antes de "PROGRAMA DE ESTUDIOS:" (x: 128, y: 770)
    'TMPL-11': EVALUATION_COORDS,
    'TMPL-12': EVALUATION_COORDS,
    'TMPL-13': EVALUATION_COORDS,
    'TMPL-14': EVALUATION_COORDS,
    'TMPL-15': EVALUATION_COORDS,
    'TMPL-16': EVALUATION_COORDS,
    'TMPL-17': EVALUATION_COORDS,

    // TMPL-18: Acta de Evaluación EFSRT A3 Vertical (841.89 x 1190.55 pt)
    // Cabecera superior izquierda sobre "CETPRO :" (x: 51, y: 917)
    'TMPL-18': Object.freeze({
      x: 55.0,
      y: 955.0,
      width: 70.0,
      height: 68.2
    }),

    // TMPL-19: Acta Modular A3 Horizontal (1190.55 x 841.89 pt)
    // Cabecera superior izquierda del acta (x: 55, y: 745) a la izquierda de "ACTA DE EVALUACIÓN MODULAR"
    'TMPL-19': Object.freeze({
      x: 55.0,
      y: 745.0,
      width: 68.0,
      height: 66.2
    }),

    // TMPL-20: Certificado Modular A4 Horizontal (841.89 x 595.28 pt)
    // Cabecera superior izquierda / membrete oficial
    'TMPL-20': Object.freeze({
      x: 55.0,
      y: 515.0,
      width: 60.0,
      height: 58.5
    }),

    // TMPL-21: Título Técnico Profesional A4 Horizontal (841.89 x 595.28 pt)
    // Cabecera superior izquierda
    'TMPL-21': Object.freeze({
      x: 75.0,
      y: 485.0,
      width: 65.0,
      height: 63.3
    })
  })
});
