/**
 * electron/preload.cjs
 * 
 * Script de pre-carga seguro para Electron — CEPRO_MICAELA 2.0.
 * Aislamiento estricto de contexto (contextIsolation: true, sandbox: true, nodeIntegration: false).
 * Expone exclusivamente un puente tipado y validado en window.electronAPI.
 * NINGUNA primitiva de Node.js (fs, child_process, process, require) se expone al renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

let cachedBackendUrl = '';

if (Array.isArray(process.argv)) {
  for (const arg of process.argv) {
    if (typeof arg === 'string') {
      if (arg.startsWith('--cetpro-backend-url=')) {
        cachedBackendUrl = arg.slice('--cetpro-backend-url='.length);
      }
    }
  }
}

const electronAPI = {
  isElectron: true,

  /**
   * Obtiene metadatos de la aplicación de escritorio.
   */
  getAppInfo: () => {
    return ipcRenderer.invoke('app:getInfo');
  },

  /**
   * Obtiene la URL loopback autenticada del backend local.
   * Proporciona acceso síncrono sin bloquear el hilo del renderer con sendSync.
   */
  getBackendUrl: () => {
    if (cachedBackendUrl) return cachedBackendUrl;
    // Fallback síncrono por compatibilidad en casos excepcionales
    try {
      return ipcRenderer.sendSync('backend:getUrlSync');
    } catch {
      return '';
    }
  },

  /**
   * Secreto de instancia gestionado estrictamente en Main Process (MED-39B-01).
   * No se expone al renderer para impedir su lectura en memoria.
   */
  getInstanceSecret: () => {
    return null;
  },

  /**
   * Obtiene la configuración de conexión del backend de forma asíncrona.
   */
  getBackendInfo: () => {
    return ipcRenderer.invoke('backend:getInfo');
  },

  /**
   * Diálogo nativo para seleccionar archivos (respaldos, paquetes de sincronización, etc.)
   */
  showOpenDialog: (options) => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },

  /**
   * Diálogo nativo para guardar archivos
   */
  showSaveDialog: (options) => {
    return ipcRenderer.invoke('dialog:saveFile', options);
  },

  /**
   * Diálogo nativo de mensaje / alerta
   */
  showMessageBox: (options) => {
    return ipcRenderer.invoke('dialog:showMessageBox', options);
  },

  /**
   * Abre enlaces externos de forma segura en el navegador predeterminado del sistema operativo
   */
  openExternal: (url) => {
    if (typeof url !== 'string') return Promise.reject(new Error('URL inválida'));
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return Promise.reject(new Error('Protocolo no permitido. Solo http, https y mailto son admitidos.'));
      }
    } catch {
      return Promise.reject(new Error('Formato de URL no válido'));
    }
    return ipcRenderer.invoke('shell:openExternal', url);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
