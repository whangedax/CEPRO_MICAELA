/**
 * Servicio de Recuperación Controlada de CETPRO_DB desde Staging (StagingRecoveryService)
 * Módulo: RECOVERY-01
 *
 * Permite al usuario en un navegador/perfil nuevo (como Edge) hidratar la base productiva
 * (269 estudiantes y 295 matrículas) desde las 295 filas de staging_importaciones
 * de forma manual, explícita y 100% determinista sin modificar las fuentes ni los periodos existentes.
 */

import { executeTransaction, getDB } from '../db/database.js';
import { ReconciliationService } from './reconciliation-service.js';
import { StagingService } from './staging-service.js';
import { ProductiveImportService } from './productive-import-service.js';
import { EnrollmentService } from './enrollment-service.js';
import { ValidationError, OperationalError } from './error-service.js';

export class StagingRecoveryService {
  constructor() {
    this.stagingService = new StagingService();
  }

  /**
   * Evalúa si la base de datos cumple las precondiciones estrictas y exactas para RECOVERY-01
   * @returns {Promise<object>}
   */
  async evaluatePreconditions() {
    const db = getDB();

    const getCount = (storeName) => new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) return resolve(0);
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    const institucion = await getCount('institucion');
    const programas = await getCount('programas');
    const modulos = await getCount('modulos');
    const periodos = await getCount('periodos');
    const staging = await getCount('staging_importaciones');
    const estudiantes = await getCount('estudiantes');
    const matriculas = await getCount('matriculas');

    // Verificar si hay registros TEST_ONLY
    const testOnlyCount = await new Promise((resolve) => {
      if (!db.objectStoreNames.contains('estudiantes')) return resolve(0);
      const tx = db.transaction('estudiantes', 'readonly');
      const req = tx.objectStore('estudiantes').getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        const testCount = items.filter(i => (i.id && String(i.id).includes('TEST')) || (i.observaciones && String(i.observaciones).includes('TEST_ONLY'))).length;
        resolve(testCount);
      };
      req.onerror = () => resolve(0);
    });

    const counts = {
      dbName: db.name,
      institucion,
      programas,
      modulos,
      periodos,
      staging,
      estudiantes,
      matriculas,
      testOnlyCount
    };

    if (db.name !== 'CETPRO_DB') {
      return { canRecover: false, reason: `El nombre de la base de datos es "${db.name}" en lugar de "CETPRO_DB".`, counts };
    }

    if (institucion !== 1) {
      return { canRecover: false, reason: `El store "institucion" contiene ${institucion} registros (se requiere exactamente 1).`, counts };
    }

    if (programas !== 7) {
      return { canRecover: false, reason: `El store "programas" contiene ${programas} registros (se requieren exactamente 7).`, counts };
    }

    if (modulos !== 14) {
      return { canRecover: false, reason: `El store "modulos" contiene ${modulos} registros (se requieren exactamente 14).`, counts };
    }

    if (staging !== 295) {
      return { canRecover: false, reason: `El store "staging_importaciones" contiene ${staging} registros (se requieren exactamente 295).`, counts };
    }

    if (estudiantes !== 0 || matriculas !== 0) {
      return { canRecover: false, reason: `La base productiva contiene datos (${estudiantes} estudiantes, ${matriculas} matrículas). Se requieren estrictamente 0 estudiantes y 0 matrículas.`, counts };
    }

    if (testOnlyCount !== 0) {
      return { canRecover: false, reason: `Se detectaron ${testOnlyCount} registros marcados como TEST_ONLY en la base de datos.`, counts };
    }

    return {
      canRecover: true,
      reason: 'Base de datos apta para recuperación controlada RECOVERY-01 desde Staging.',
      counts
    };
  }

  /**
   * Crea el respaldo completo inmutable en la clave BACKUP_PRE_RECOVERY_FROM_STAGING
   */
  async createPreRecoveryBackup() {
    const db = getDB();
    const storeNames = Array.from(db.objectStoreNames);
    const backupData = {
      backupId: 'BACKUP_PRE_RECOVERY_FROM_STAGING',
      timestamp: new Date().toISOString(),
      dbName: db.name,
      version: db.version,
      stores: {}
    };

    for (const storeName of storeNames) {
      const items = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
      backupData.stores[storeName] = items;
    }

    const serialized = JSON.stringify(backupData);

    await executeTransaction('configuracion', 'readwrite', (tx) => {
      const store = tx.objectStore('configuracion');
      store.put({
        clave: 'BACKUP_PRE_RECOVERY_FROM_STAGING',
        valor: serialized,
        fechaCreacion: backupData.timestamp
      });
    });

    const verified = await new Promise((resolve, reject) => {
      const tx = db.transaction('configuracion', 'readonly');
      const req = tx.objectStore('configuracion').get('BACKUP_PRE_RECOVERY_FROM_STAGING');
      req.onsuccess = () => {
        if (!req.result || !req.result.valor) {
          return reject(new OperationalError('El respaldo BACKUP_PRE_RECOVERY_FROM_STAGING no pudo ser verificado.'));
        }
        resolve(JSON.parse(req.result.valor));
      };
      req.onerror = (e) => reject(e.target.error);
    });

    if (!verified || verified.backupId !== 'BACKUP_PRE_RECOVERY_FROM_STAGING') {
      throw new OperationalError('Fallo crítico al verificar el respaldo pre-recuperación.');
    }

    return {
      success: true,
      backupId: 'BACKUP_PRE_RECOVERY_FROM_STAGING',
      timestamp: backupData.timestamp,
      totalStores: Object.keys(backupData.stores).length,
      bytes: serialized.length
    };
  }

  /**
   * Ejecuta la recuperación de 269 estudiantes y 295 matrículas a partir de staging_importaciones
   * invocando los constructores canónicos de M04/M05
   * @param {object} [options]
   */
  async executeRecovery({ operator = 'SECRETARIA_LOCAL' } = {}) {
    const evalRes = await this.evaluatePreconditions();
    if (!evalRes.canRecover) {
      throw new ValidationError(`RECUPERACIÓN RECHAZADA: ${evalRes.reason}`);
    }

    // 1. Crear respaldo preventivo interno
    const backupRes = await this.createPreRecoveryBackup();

    // 2. Obtener los 295 registros de staging
    const stagingItems = await this.stagingService.getStagingByLote(ReconciliationService.LOTE_ID);

    // 3. Invocar ÚNICA FUENTE CANÓNICA M04 (ProductiveImportService.buildStudentsFromStaging) para 269 estudiantes
    const { newStudents, updatedStagingItemsMap: stgWithStudents } = ProductiveImportService.buildStudentsFromStaging(stagingItems);

    // 4. Invocar ÚNICA FUENTE CANÓNICA M05 (EnrollmentService.buildEnrollmentsFromStaging) para 295 matrículas
    const { newEnrollments, updatedStagingItemsMap: finalStagingItemsMap } = EnrollmentService.buildEnrollmentsFromStaging(stgWithStudents);

    const finalStagingItems = Array.from(finalStagingItemsMap.values());

    // --- C. ESCRITURA ATÓMICA TRANSACCIONAL ---
    await executeTransaction(['estudiantes', 'matriculas', 'staging_importaciones', 'auditoria'], 'readwrite', (tx) => {
      const studentStore = tx.objectStore('estudiantes');
      const matStore = tx.objectStore('matriculas');
      const stgStore = tx.objectStore('staging_importaciones');
      const audStore = tx.objectStore('auditoria');

      newStudents.forEach(s => studentStore.put(s));
      newEnrollments.forEach(m => matStore.put(m));
      finalStagingItems.forEach(stg => stgStore.put(stg));

      audStore.put({
        id: `AUD-RECOVERY-STAGING-${Date.now()}`,
        timestamp: new Date().toISOString(),
        entidad: 'BASE_DATOS',
        entidadId: ReconciliationService.LOTE_ID,
        accion: 'RECUPERACION_PRODUCTIVA_STAGING',
        estadoNuevo: {
          loteId: ReconciliationService.LOTE_ID,
          filasStaging: finalStagingItems.length,
          estudiantesCreados: newStudents.length,
          matriculasCreadas: newEnrollments.length,
          backupId: backupRes.backupId
        },
        origen: { usuarioOperador: operator, pantalla: 'Configuracion/RECOVERY-01' }
      });
    });

    // --- D. VERIFICACIÓN POST-COMMIT FÍSICA EN INDEXEDDB ---
    const db = getDB();
    const postReadback = await new Promise((resolve, reject) => {
      const tx = db.transaction(['estudiantes', 'matriculas', 'staging_importaciones', 'programas'], 'readonly');
      const studentReq = tx.objectStore('estudiantes').getAll();
      const matReq = tx.objectStore('matriculas').getAll();
      const stgReq = tx.objectStore('staging_importaciones').getAll();

      tx.oncomplete = () => {
        resolve({
          students: studentReq.result || [],
          enrollments: matReq.result || [],
          staging: stgReq.result || []
        });
      };
      tx.onerror = (e) => reject(e.target.error || new OperationalError('Error al leer IndexedDB post-commit.'));
    });

    if (postReadback.students.length !== 269) {
      throw new OperationalError(`RECOVERY FALLIDA EN COMMIT FÍSICO: IndexedDB reporta ${postReadback.students.length} estudiantes en lugar de 269.`);
    }
    if (postReadback.enrollments.length !== 295) {
      throw new OperationalError(`RECOVERY FALLIDA EN COMMIT FÍSICO: IndexedDB reporta ${postReadback.enrollments.length} matrículas en lugar de 295.`);
    }
    if (postReadback.staging.length !== 295) {
      throw new OperationalError(`RECOVERY FALLIDA EN COMMIT FÍSICO: IndexedDB reporta ${postReadback.staging.length} registros de staging en lugar de 295.`);
    }

    const progCounts = {};
    postReadback.enrollments.forEach(m => {
      progCounts[m.programaId] = (progCounts[m.programaId] || 0) + 1;
    });

    const isBreakdownValid = progCounts['PROG-001'] === 17 &&
                             progCounts['PROG-002'] === 25 &&
                             progCounts['PROG-003'] === 20 &&
                             progCounts['PROG-004'] === 75 &&
                             progCounts['PROG-005'] === 96 &&
                             progCounts['PROG-006'] === 55 &&
                             progCounts['PROG-007'] === 7;

    if (!isBreakdownValid) {
      throw new OperationalError(`RECOVERY FALLIDA EN VERIFICACIÓN POST-COMMIT: Distribución por programas errónea.`);
    }

    const allModuloNull = postReadback.enrollments.every(m => m.moduloId === null);
    const allPeriodoNull = postReadback.enrollments.every(m => m.periodoId === null);
    if (!allModuloNull || !allPeriodoNull) {
      throw new OperationalError(`RECOVERY FALLIDA EN VERIFICACIÓN POST-COMMIT: moduloId o periodoId no son null.`);
    }

    const isStgSynced = postReadback.staging.every(s => {
      const mat = postReadback.enrollments.find(m => m.id === s.matriculaId);
      return mat && s.programaCodigo === mat.programaId;
    });
    if (!isStgSynced) {
      throw new OperationalError(`RECOVERY FALLIDA EN VERIFICACIÓN POST-COMMIT: programaCodigo en staging no coincide.`);
    }

    return {
      success: true,
      backupId: backupRes.backupId,
      estudiantesCreados: postReadback.students.length, // 269
      matriculasCreadas: postReadback.enrollments.length, // 295
      stagingTotal: postReadback.staging.length, // 295
      postCommitVerified: true
    };
  }
}
