/**
 * Configuración de Identidad y Marca Institucional (Branding)
 * Módulo: M02 / M06 — Emblema y Membrete Oficial del CETPRO
 * Catálogo Universal de Posicionamiento para los 21 Documentos Oficiales
 */

const ATTENDANCE_COORDS = Object.freeze({
  x: 38.0,
  y: 755.0,
  width: 48.0,
  height: 46.8
});

const EVALUATION_COORDS = Object.freeze({
  x: 45.0,
  y: 1105.0,
  width: 52.0,
  height: 50.7
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
   * Calibrado armónico mediante auditoría geométrica estricta hoja por hoja.
   */
  templates: Object.freeze({
    // TMPL-01: Nómina de Matrícula Oficial A4 Vertical (595.3 x 841.9 pt)
    // Esquina superior derecha: Simetría frente al Escudo Nacional (x: 59, y: 755)
    'TMPL-01': Object.freeze({
      x: 485.0,
      y: 752.0,
      width: 58.0,
      height: 56.5
    }),

    // TMPL-02: Ficha Individual de Matrícula A4 Horizontal (841.9 x 595.3 pt)
    // Esquina superior derecha: Al ras con el borde de la tabla (776 pt) y nivelado con MINEDU
    'TMPL-02': Object.freeze({
      x: 728.0,
      y: 525.0,
      width: 48.0,
      height: 46.8
    }),

    // TMPL-03: Consolidado de Matrícula A3 Vertical (841.9 x 1190.5 pt)
    // Cabecera superior izquierda: Despeje total de la fila 5 de la tabla (y: 1120.6)
    'TMPL-03': Object.freeze({
      x: 45.0,
      y: 1128.0,
      width: 46.0,
      height: 44.8
    }),

    // TMPL-04: Carátula / Portada A4 Vertical (595.3 x 841.9 pt)
    // Centrado horizontal geométrico perfecto sobre el membrete
    'TMPL-04': Object.freeze({
      x: 257.6,
      y: 742.0,
      width: 80.0,
      height: 78.0
    }),

    // TMPL-05..10: Registro Auxiliar de Asistencia A3 Horizontal (1190.55 x 841.89 pt)
    // Centrado verticalmente respecto al cuadro informativo de 4 filas (y: 753.6..804.5)
    'TMPL-05': ATTENDANCE_COORDS,
    'TMPL-06': ATTENDANCE_COORDS,
    'TMPL-07': ATTENDANCE_COORDS,
    'TMPL-08': ATTENDANCE_COORDS,
    'TMPL-09': ATTENDANCE_COORDS,
    'TMPL-10': ATTENDANCE_COORDS,

    // TMPL-11..17: Registro Auxiliar de Evaluación A3 Vertical (841.89 x 1190.55 pt)
    // Cabecera superior izquierda en franja limpia sobre el cuadro de capacidades
    'TMPL-11': EVALUATION_COORDS,
    'TMPL-12': EVALUATION_COORDS,
    'TMPL-13': EVALUATION_COORDS,
    'TMPL-14': EVALUATION_COORDS,
    'TMPL-15': EVALUATION_COORDS,
    'TMPL-16': EVALUATION_COORDS,
    'TMPL-17': EVALUATION_COORDS,

    // TMPL-18: Acta de Evaluación EFSRT A3 Vertical (841.89 x 1190.55 pt)
    // Centrado horizontal majestuoso sobre el título oficial
    'TMPL-18': Object.freeze({
      x: 388.9,
      y: 990.0,
      width: 64.0,
      height: 62.4
    }),

    // TMPL-19: Acta Modular A3 Horizontal (1190.55 x 841.89 pt)
    // Esquina superior derecha: Simetría perfecta frente al Escudo MINEDU izquierdo (x: 50)
    'TMPL-19': Object.freeze({
      x: 1085.0,
      y: 720.0,
      width: 58.0,
      height: 56.5
    }),

    // TMPL-20: Certificado Modular A4 Horizontal (841.89 x 595.28 pt)
    // Centrado geométrico exacto al interior del cajetín normativo rotulado "LOGO" (x: 55..164, y: 414..488)
    'TMPL-20': Object.freeze({
      x: 74.0,
      y: 416.0,
      width: 70.0,
      height: 68.2
    }),

    // TMPL-21: Título Técnico Profesional A4 Horizontal (841.89 x 595.28 pt)
    // Centrado geométrico exacto al interior del cajetín normativo oficial
    'TMPL-21': Object.freeze({
      x: 74.0,
      y: 416.0,
      width: 70.0,
      height: 68.2
    })
  })
});
