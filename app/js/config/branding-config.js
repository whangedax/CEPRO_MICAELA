/**
 * Configuración de Identidad y Marca Institucional (Branding)
 * Módulo: M02 / M06 — Emblema y Membrete Oficial del CETPRO
 */

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
    // TMPL-04: Carátula / Portada A4 Vertical (595.28 x 841.89 pt)
    // Centrado horizontal en cabecera: (595.28 - 80) / 2 = 257.6, sobre y=721
    'TMPL-04': Object.freeze({
      x: 257.6,
      y: 742.0,
      width: 80.0,
      height: 78.0
    }),

    // TMPL-05..10: Registro de Asistencia A3 Horizontal (1190.55 x 841.89 pt)
    // Esquina superior izquierda antes de "PROGRAMA DE ESTUDIOS" (x: 162, y: 795)
    'TMPL-05': Object.freeze({
      x: 48.0,
      y: 745.0,
      width: 68.0,
      height: 66.2
    }),

    // TMPL-11..17: Registro de Evaluación A3 Horizontal (1190.55 x 841.89 pt)
    // Esquina superior izquierda antes de "PROGRAMA DE ESTUDIOS" (x: 127.95, y: 1071 en rotado / 752 en vertical)
    'TMPL-11': Object.freeze({
      x: 42.0,
      y: 748.0,
      width: 68.0,
      height: 66.2
    }),

    // TMPL-18: EFSRT A3 Vertical (841.89 x 1190.55 pt)
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
    })
  })
});
