/**
 * Sistema de Notificaciones Toast de UI
 * Módulo: M01 - Núcleo Local
 */

export const Notifications = {
  containerId: 'toast-container',

  init() {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
  },

  /**
   * Muestra un mensaje toast en la interfaz
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} [type='info']
   * @param {number} [duration=4000] - Tiempo en ms antes de desaparecer
   */
  show(message, type = 'info', duration = 4000) {
    this.init();
    const container = document.getElementById(this.containerId);

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = this.getIcon(type);

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Cerrar notificación');
    closeBtn.onclick = () => this.dismiss(toast);

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  },

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  },

  getIcon(type) {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  },

  info(msg, dur) { this.show(msg, 'info', dur); },
  success(msg, dur) { this.show(msg, 'success', dur); },
  warning(msg, dur) { this.show(msg, 'warning', dur); },
  error(msg, dur) { this.show(msg, 'error', dur); }
};
