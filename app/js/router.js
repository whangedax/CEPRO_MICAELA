/**
 * Enrutador de Navegación por Hash (#)
 * Módulo: M01 - Núcleo Local
 */

import { CONFIG } from './config.js';

export class Router {
  /**
   * @param {function(object): void} onRouteChangedCallback
   */
  constructor(onRouteChangedCallback) {
    this.onRouteChanged = onRouteChangedCallback;
    this.currentHash = null;
  }

  /**
   * Inicializa el enrutador escuchando eventos hashchange
   */
  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange(); // Carga inicial
  }

  /**
   * Procesa el hash actual y redirige de forma segura si no es válido
   */
  handleHashChange() {
    let hash = window.location.hash || CONFIG.DEFAULT_ROUTE;

    // Normalizar hash si viene sin fragmento principal
    if (hash === '#' || hash === '') {
      hash = CONFIG.DEFAULT_ROUTE;
    }

    // Extraer ruta base ignorando parámetros adicionales
    const basePath = hash.split('?')[0];

    let routeInfo = CONFIG.ROUTES[basePath];

    if (!routeInfo) {
      console.warn(`[Router] Ruta no encontrada: "${hash}". Redirigiendo a inicio.`);
      window.location.hash = CONFIG.DEFAULT_ROUTE;
      return;
    }

    this.currentHash = basePath;

    if (typeof this.onRouteChanged === 'function') {
      this.onRouteChanged({
        hash: basePath,
        ...routeInfo
      });
    }
  }

  /**
   * Navega programáticamente a un hash determinado
   * @param {string} hash
   */
  navigate(hash) {
    window.location.hash = hash;
  }
}
