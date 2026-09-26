/**
 * Punto de Entrada Principal de la Aplicación (App Bootstrap)
 * Módulo: M01 - Núcleo Local
 */

import { CONFIG } from './config.js';
import { ActiveStorageService as StorageService } from './services/active-storage-service.js';
import { ErrorService } from './services/error-service.js';
import { Router } from './router.js';
import { Layout } from './ui/layout.js';
import { Notifications } from './ui/notifications.js';

import { CatalogService } from './services/catalog-service.js';
import { PeriodService } from './services/period-service.js';
import { DemoRuntimeService } from './services/demo-runtime-service.js';
import { RUNTIME_TARGETS, getRuntimeTarget, isDemoRuntime } from './services/runtime-target-service.js';

class App {
  constructor() {
    this.router = null;
    this.pendingRestore = null;
  }

  downloadJson(json, filename) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  showRestorePreflight(container, fileName, info) {
    container.replaceChildren();
    const rows = [
      ['Archivo', fileName], ['Fecha', info.createdAt],
      ['Versión del backup', String(info.formatVersion)], ['Versión del esquema', String(info.schemaVersion)],
      ['Stores', String(info.stores || Object.keys(info.counts || {}).length)],
      ['Registros', String(info.totalRecords)], ['Checksum SHA-256', info.checksum || 'No disponible'],
      ['Entorno', info.environment || 'REAL'], ['Oficial', info.official === false ? 'NO' : 'SÍ'],
      ['Estado de integridad', `SHA-256 verificado · ${info.referentialIssues} incidencias`]
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      row.append(strong, document.createTextNode(value));
      container.append(row);
    }
  }

  async init() {
    console.log(`Iniciando ${CONFIG.APP_NAME} v${CONFIG.APP_VERSION}...`);

    try {
      // 1. Inicializar Manejadores de Errores Globales
      this.initGlobalErrorHandler();

      // 2. Inicializar la persistencia seleccionada explícitamente por el build.
      const dbStatus = await StorageService.init();
      console.log('Persistencia IndexedDB inicializada:', dbStatus);
      if (CONFIG.IS_V2_CANDIDATE) {
        await DemoRuntimeService.resumeIfRequested();
        if (!isDemoRuntime() && globalThis.location?.hash.startsWith('#/demo')) {
          await DemoRuntimeService.enter({ reset: false });
        }
      }

      // 3. Inicializar Catálogos Oficiales (7 Programas / 14 Módulos / 1 Institución - Idempotente)
      const catalogStatus = CONFIG.IS_V2_CANDIDATE
        ? { programsCount: (await CatalogService.listPrograms()).length,
            modulesCount: (await CatalogService.listModules()).length,
            seeded: false, readOnlyStartup: true }
        : await CatalogService.initializeCatalogs();
      console.log('Catálogos inicializados:', catalogStatus);


      // 4. Inicializar Componentes de UI y Notificaciones
      Notifications.init();
      Layout.init();
      DemoRuntimeService.applyVisualState();

      // 4. Configurar Eventos Delegados de UI (Botonera, Respaldos)
      this.bindEvents();

      // 5. Inicializar Enrutador por Hash (#)
      this.router = new Router((routeInfo) => {
        Layout.renderView(routeInfo);
      });
      this.router.init();

      // Notificación inicial de éxito
      Notifications.success(CONFIG.IS_V2_CANDIDATE
        ? (isDemoRuntime() ? 'Modo demostración listo. Todos los datos visibles son simulados.' : 'Sistema Académico listo para operación local.')
        : `Sistema Académico conectado (${dbStatus.dbName} v${dbStatus.version})`);

    } catch (err) {
      const handled = ErrorService.handleError(err, 'AppBootstrap');
      Notifications.error(handled.userMessage);
    }
  }

  initGlobalErrorHandler() {
    window.onerror = (message, source, lineno, colno, error) => {
      const errObj = error || new Error(message);
      const handled = ErrorService.handleError(errObj, 'WindowError');
      Notifications.error(handled.userMessage);
      return true;
    };

    window.onunhandledrejection = (event) => {
      const errObj = event.reason || new Error('Unhandled Promise Rejection');
      const handled = ErrorService.handleError(errObj, 'UnhandledRejection');
      Notifications.error(handled.userMessage);
    };
  }

  bindEvents() {
    document.addEventListener('click', async (e) => {
      if (e.target && (e.target.id === 'btn-enter-demo' || e.target.id === 'btn-enter-demo-page')) {
        if (!window.confirm('Se creará o reinicializará exclusivamente CETPRO_V2_DEMO con datos simulados. ¿Continuar?')) return;
        try {
          await DemoRuntimeService.enter({ reset: true });
          Layout.updateDbStatusBadge();
          window.location.hash = '#/demo';
          if (this.router?.currentHash === '#/demo') await Layout.renderView(CONFIG.ROUTES['#/demo']);
          Notifications.success('Modo demostración iniciado. Datos simulados y no oficiales.');
        } catch (err) { Notifications.error(ErrorService.handleError(err, 'DemoEnter').userMessage); }
        return;
      }
      if (e.target && e.target.id === 'btn-reset-demo') {
        if (!window.confirm('Se eliminarán y reconstruirán únicamente los datos de CETPRO_V2_DEMO. ¿Continuar?')) return;
        try {
          await DemoRuntimeService.reset({ stayInDemo: true });
          Layout.updateDbStatusBadge();
          window.location.hash = '#/demo';
          await Layout.renderView(CONFIG.ROUTES['#/demo']);
          Notifications.success('Datos DEMO reconstruidos exactamente desde DEMO_DATASET_V1.');
        } catch (err) { Notifications.error(ErrorService.handleError(err, 'DemoReset').userMessage); }
        return;
      }
      if (e.target && e.target.id === 'btn-exit-demo') {
        try {
          await DemoRuntimeService.exit();
          Layout.updateDbStatusBadge();
          window.location.hash = '#/inicio';
          if (this.router?.currentHash === '#/inicio') await Layout.renderView(CONFIG.ROUTES['#/inicio']);
          Notifications.success('Modo demostración cerrado. Se volvió a la candidata real sin transferir datos.');
        } catch (err) { Notifications.error(ErrorService.handleError(err, 'DemoExit').userMessage); }
        return;
      }
      if (e.target && e.target.id === 'btn-export-backup') {
        try {
          const jsonBackup = await StorageService.exportBackup();
          const info = await StorageService.inspectBackup(jsonBackup);
          const prefix = isDemoRuntime() ? 'CETPRO_DEMO_BACKUP' : 'CETPRO_BACKUP';
          this.downloadJson(jsonBackup, `${prefix}_${new Date().toISOString().substring(0, 10)}.json`);
          Notifications.success(`Respaldo JSON generado: schema ${info.schemaVersion}, ${info.stores || Object.keys(info.counts).length} stores, SHA-256 ${info.checksum.slice(0, 12)}…`);
        } catch (err) {
          const handled = ErrorService.handleError(err, 'BackupExport');
          Notifications.error(handled.userMessage);
        }
      }
      if (e.target && e.target.id === 'btn-restore-backup') {
        if (!this.pendingRestore) return;
        const confirmed = window.confirm(isDemoRuntime()
          ? 'Esta acción reemplazará exclusivamente los datos DEMO después de crear un prebackup DEMO.'
          : 'Esta acción reemplazará los datos actuales después de crear un respaldo de seguridad previo.');
        if (!confirmed) { Notifications.info('Restauración cancelada. No se realizó ninguna escritura.'); return; }
        e.target.disabled = true;
        try {
          const result = await StorageService.restoreBackup(this.pendingRestore.text, null, {
            confirmed: true,
            beforeWrite: async preRestoreJson => {
              this.downloadJson(preRestoreJson, `${isDemoRuntime() ? 'DEMO_' : ''}PRE_RESTORE_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
              return true;
            }
          });
          this.pendingRestore = null;
          document.querySelector('#backup-restore-file').value = '';
          document.querySelector('#backup-restore-preflight').replaceChildren();
          Notifications.success(result.integrityCheck ? 'Restauración completada correctamente.' : 'Restauración requiere revisión de integridad.');
        } catch (err) {
          Notifications.error(ErrorService.handleError(err, 'BackupRestore').userMessage);
          e.target.disabled = false;
        }
      }
    });
    document.addEventListener('change', async (e) => {
      if (!e.target || e.target.id !== 'backup-restore-file') return;
      const button = document.querySelector('#btn-restore-backup');
      const preflight = document.querySelector('#backup-restore-preflight');
      this.pendingRestore = null;
      button.disabled = true;
      preflight.replaceChildren();
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const info = await StorageService.inspectBackup(text);
        const expectedEnvironment = getRuntimeTarget() === RUNTIME_TARGETS.DEMO ? 'DEMO' : 'REAL';
        const sourceEnvironment = info.environment || 'REAL';
        if (sourceEnvironment !== expectedEnvironment) {
          const mismatch = new Error(`BACKUP_ENVIRONMENT_MISMATCH: respaldo ${sourceEnvironment} no puede restaurarse sobre ${expectedEnvironment}.`);
          mismatch.code = 'BACKUP_ENVIRONMENT_MISMATCH';
          throw mismatch;
        }
        this.pendingRestore = { text, fileName: file.name, info };
        this.showRestorePreflight(preflight, file.name, info);
        button.disabled = false;
      } catch (err) {
        const message = document.createElement('p');
        message.className = 'alert alert-danger';
        message.textContent = ErrorService.handleError(err, 'BackupPreflight').userMessage;
        preflight.append(message);
      }
    });
  }
}

// Iniciar también cuando un bootstrap de build importa este módulo después de DOMContentLoaded.
const startApp = () => {
  const app = new App();
  app.init();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp, { once: true });
else startApp();
