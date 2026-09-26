/**
 * Módulo Utilitario para manipulación segura del DOM y prevención de XSS
 * Ubicación: app/js/utils/dom-utils.js
 */

/**
 * Escapa caracteres HTML especiales para prevenir vulnerabilidades XSS
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
