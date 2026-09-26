/**
 * Servicio de Gestión de Periodos Académicos
 * Módulo: M02 - Catálogos y Configuración
 */

import { PeriodRepository } from '../repositories/period-repository.js';
import { AuditService } from './audit-service.js';
import { ValidationError } from './error-service.js';
import { getDB, executeTransaction } from '../db/database.js';

export const PeriodService = {
  repo: new PeriodRepository(),

  /**
   * Lista los periodos académicos
   */
  async listPeriods() {
    return this.repo.list();
  },

  /**
   * Crea un nuevo periodo académico validando fechas y campos obligatorios
   * @param {object} periodData
   * @param {string} [operator='SECRETARIA_LOCAL']
   */
  async createPeriod(periodData, operator = 'SECRETARIA_LOCAL') {
    if (!periodData || !periodData.nombre || periodData.nombre.trim() === '') {
      throw new ValidationError('El nombre del periodo es obligatorio.');
    }

    const year = parseInt(periodData.anio, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      throw new ValidationError('El año del periodo debe ser un número válido de 4 dígitos.');
    }

    if (!periodData.fechaInicio || !periodData.fechaFin) {
      throw new ValidationError('Las fechas de inicio y fin son obligatorias.');
    }

    if (new Date(periodData.fechaFin) < new Date(periodData.fechaInicio)) {
      throw new ValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }

    const existingName = await this.repo.getByName(periodData.nombre);
    if (existingName) {
      throw new ValidationError(`Ya existe un periodo registrado con el nombre "${periodData.nombre}".`);
    }

    const id = periodData.id || `PER-${Date.now()}`;
    const record = {
      id,
      idPeriodo: id,
      nombre: periodData.nombre.trim(),
      anio: year,
      fechaInicio: periodData.fechaInicio,
      fechaFin: periodData.fechaFin,
      estado: periodData.estado || 'ACTIVO',
      fechaCreacion: new Date().toISOString()
    };

    await this.repo.create(record);

    await AuditService.record({
      entidad: 'PERIODOS',
      idEntidad: id,
      accion: 'CREACION',
      estadoNuevo: record,
      origen: { usuarioOperador: operator, pantalla: 'Periodos/Alta' }
    });

    return record;
  },

  /**
   * Actualiza un periodo existente
   */
  async updatePeriod(periodData, operator = 'SECRETARIA_LOCAL') {
    if (!periodData || !periodData.id) {
      throw new ValidationError('El ID del periodo es obligatorio.');
    }

    if (periodData.fechaInicio && periodData.fechaFin) {
      if (new Date(periodData.fechaFin) < new Date(periodData.fechaInicio)) {
        throw new ValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      }
    }

    const current = await this.repo.getById(periodData.id);
    if (!current) {
      throw new ValidationError(`Periodo ${periodData.id} no encontrado.`);
    }

    const updated = {
      ...current,
      ...periodData,
      fechaActualizacion: new Date().toISOString()
    };

    await this.repo.update(updated);

    await AuditService.record({
      entidad: 'PERIODOS',
      idEntidad: updated.id,
      accion: 'MODIFICACION',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: { usuarioOperador: operator, pantalla: 'Periodos/Edición' }
    });

    return updated;
  },

  /**
   * Elimina un periodo académico como operación administrativa explícita (No automática).
   * Requiere:
   * - periodId explícito (string)
   * - Verificación estricta de cero matrículas vinculadas (cancela si > 0)
   * - Generación de respaldo preventivo antes de eliminar
   * - motivo de eliminación
   * - operador responsable
   * - Registro en bitácora de auditoría (ANULACION_ADMINISTRATIVA)
   *
   * @param {string} periodId - ID explícito del periodo a eliminar
   * @param {object} [options={}] - { motivo, operador }
   */
  /**
   * Elimina un periodo académico como operación administrativa explícita (No automática).
   * Requiere:
   * - periodId explícito (string)
   * - Verificación estricta de cero matrículas vinculadas (cancela si > 0 o si falla la lectura)
   * - Generación y re-lectura física de respaldo preventivo antes de eliminar
   * - Transacción atómica de eliminación y registro de auditoría (ANULACION_ADMINISTRATIVA)
   * - Verificación de readback físico post-eliminación con manejo de errores
   *
   * @param {string} periodId - ID explícito del periodo a eliminar
   * @param {object} [options={}] - { motivo, operador, requireExactCounts, verifyReadbackCounts }
   */
  async deletePeriodAdmin(periodId, options = {}) {
    if (!periodId || typeof periodId !== 'string' || periodId.trim() === '') {
      throw new ValidationError('Se requiere un ID de periodo explícito para la eliminación administrativa.');
    }

    const motivo = options.motivo || 'ELIMINACION_ADMINISTRATIVA_EXPLICITA';
    const operador = options.operador || 'ADMINISTRADOR_SISTEMA';

    const db = getDB();
    const period = await this.repo.getById(periodId);
    if (!period) {
      throw new ValidationError(`Periodo con ID "${periodId}" no encontrado.`);
    }

    // 1. Verificación estricta de cero matrículas vinculadas (Sin silenciar errores de IndexedDB)
    const enrollments = await new Promise((resolve, reject) => {
      const tx = db.transaction('matriculas', 'readonly');
      const req = tx.objectStore('matriculas').getAll();
      tx.onerror = (e) => reject(new ValidationError(`Error al leer el store de matrículas: ${e?.target?.error?.message || 'Error de IndexedDB'}`));
      tx.onabort = (e) => reject(new ValidationError(`Transacción cancelada al consultar matrículas: ${e?.target?.error?.message || 'Abortada'}`));
      req.onerror = (e) => reject(new ValidationError(`Error en la consulta de matrículas: ${e?.target?.error?.message || 'Error de lectura'}`));
      req.onsuccess = () => resolve(req.result || []);
    });

    const linked = enrollments.filter(e => e.periodoId === periodId);
    if (linked.length > 0) {
      throw new ValidationError(`No se puede eliminar el periodo "${periodId}": posee ${linked.length} matrículas vinculadas.`);
    }

    // 2. Generar respaldo completo en store configuracion y verificar re-lectura física
    const storeNames = Array.from(db.objectStoreNames);
    const backupId = `BACKUP_PRE_REMOVE_PERIOD_${periodId}`;
    const backupData = {
      backupId,
      timestamp: new Date().toISOString(),
      dbName: db.name,
      version: db.version,
      stores: {}
    };

    for (const storeName of storeNames) {
      const items = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        tx.onerror = (e) => reject(new ValidationError(`Error al respaldar store "${storeName}": ${e?.target?.error?.message || 'Error de transacción'}`));
        tx.onabort = (e) => reject(new ValidationError(`Transacción abortada al respaldar "${storeName}": ${e?.target?.error?.message || 'Abortada'}`));
        req.onerror = (e) => reject(new ValidationError(`Error de lectura en store "${storeName}": ${e?.target?.error?.message || 'Error de lectura'}`));
        req.onsuccess = () => resolve(req.result || []);
      });
      backupData.stores[storeName] = items;
    }

    await executeTransaction('configuracion', 'readwrite', (tx) => {
      const store = tx.objectStore('configuracion');
      store.put({
        clave: backupId,
        valor: JSON.stringify(backupData),
        fechaCreacion: backupData.timestamp
      });
    });

    // Re-leer físicamente el respaldo guardado en configuracion para garantizar persistencia real
    const verifiedBackupRecord = await new Promise((resolve, reject) => {
      const tx = db.transaction('configuracion', 'readonly');
      const req = tx.objectStore('configuracion').get(backupId);
      tx.onerror = (e) => reject(new ValidationError(`Error al verificar lectura del respaldo "${backupId}": ${e?.target?.error?.message}`));
      tx.onabort = (e) => reject(new ValidationError(`Transacción abortada al verificar respaldo "${backupId}"`));
      req.onerror = (e) => reject(new ValidationError(`Fallo en la consulta de respaldo "${backupId}"`));
      req.onsuccess = () => resolve(req.result || null);
    });

    if (!verifiedBackupRecord || !verifiedBackupRecord.valor) {
      throw new ValidationError(`ABORTADO: El respaldo preventivo "${backupId}" no se pudo verificar físicamente en el store de configuración.`);
    }

    let parsedBackup;
    try {
      parsedBackup = JSON.parse(verifiedBackupRecord.valor);
    } catch (e) {
      throw new ValidationError(`ABORTADO: El respaldo preventivo "${backupId}" contiene formato JSON no válido.`);
    }

    const backedUpStores = Object.keys(parsedBackup.stores || {});
    if (backedUpStores.length < storeNames.length) {
      throw new ValidationError(`ABORTADO: El respaldo "${backupId}" está incompleto (${backedUpStores.length}/${storeNames.length} stores respaldados).`);
    }

    if (options.requireExactCounts) {
      const perCount = (parsedBackup.stores.periodos || []).length;
      const estCount = (parsedBackup.stores.estudiantes || []).length;
      const matCount = (parsedBackup.stores.matriculas || []).length;
      const stgCount = (parsedBackup.stores.staging_importaciones || []).length;

      const reqP = options.requireExactCounts.periods !== undefined ? options.requireExactCounts.periods : options.requireExactCounts.periodos;
      const reqS = options.requireExactCounts.students !== undefined ? options.requireExactCounts.students : options.requireExactCounts.estudiantes;
      const reqE = options.requireExactCounts.enrollments !== undefined ? options.requireExactCounts.enrollments : options.requireExactCounts.matriculas;
      const reqSt = options.requireExactCounts.staging !== undefined ? options.requireExactCounts.staging : options.requireExactCounts.staging_importaciones;

      if (reqP !== undefined && perCount !== reqP) {
        throw new ValidationError(`ABORTADO: Conteo de periodos en respaldo (${perCount}) no coincide con el requerido (${reqP}).`);
      }
      if (reqS !== undefined && estCount !== reqS) {
        throw new ValidationError(`ABORTADO: Conteo de estudiantes en respaldo (${estCount}) no coincide con el requerido (${reqS}).`);
      }
      if (reqE !== undefined && matCount !== reqE) {
        throw new ValidationError(`ABORTADO: Conteo de matrículas en respaldo (${matCount}) no coincide con el requerido (${reqE}).`);
      }
      if (reqSt !== undefined && stgCount !== reqSt) {
        throw new ValidationError(`ABORTADO: Conteo de staging en respaldo (${stgCount}) no coincide con el requerido (${reqSt}).`);
      }
    }

    // 3. Eliminar el periodo específico y registrar auditoría en una ÚNICA transacción atómica IndexedDB
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.substring(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const auditId = `AUD-${dateStr}-${randomSuffix}`;

    const auditRecord = {
      id: auditId,
      timestamp,
      fechaHora: timestamp,
      entidad: 'PERIODOS',
      entidadId: periodId,
      idEntidad: periodId,
      tipoOperacion: 'ANULACION_ADMINISTRATIVA',
      accion: 'ANULACION_ADMINISTRATIVA',
      datosPrevios: period,
      estadoAnterior: period,
      datosNuevos: null,
      estadoNuevo: null,
      metadatos: { usuarioOperador: operador, motivo: motivo },
      origen: { usuarioOperador: operador, motivo: motivo }
    };

    await executeTransaction(['periodos', 'auditoria'], 'readwrite', (tx) => {
      tx.objectStore('periodos').delete(periodId);
      tx.objectStore('auditoria').add(auditRecord);
    });

    // 4. Verificación Readback Físico Post-Eliminación con manejo estricto de errores
    const postReadback = await new Promise((resolve, reject) => {
      const tx = db.transaction(['periodos', 'estudiantes', 'matriculas', 'staging_importaciones'], 'readonly');
      const perReq = tx.objectStore('periodos').getAll();
      const estReq = tx.objectStore('estudiantes').getAll();
      const matReq = tx.objectStore('matriculas').getAll();
      const stgReq = tx.objectStore('staging_importaciones').getAll();

      tx.onerror = (e) => reject(new ValidationError(`Error en transacción de readback post-eliminación: ${e?.target?.error?.message}`));
      tx.onabort = (e) => reject(new ValidationError(`Transacción de readback post-eliminación abortada: ${e?.target?.error?.message}`));
      perReq.onerror = (e) => reject(new ValidationError(`Error al consultar periodos en readback: ${e?.target?.error?.message}`));
      estReq.onerror = (e) => reject(new ValidationError(`Error al consultar estudiantes en readback: ${e?.target?.error?.message}`));
      matReq.onerror = (e) => reject(new ValidationError(`Error al consultar matrículas en readback: ${e?.target?.error?.message}`));
      stgReq.onerror = (e) => reject(new ValidationError(`Error al consultar staging en readback: ${e?.target?.error?.message}`));

      tx.oncomplete = () => {
        resolve({
          periods: perReq.result || [],
          students: estReq.result || [],
          enrollments: matReq.result || [],
          staging: stgReq.result || []
        });
      };
    });

    if (postReadback.periods.some(p => p.id === periodId)) {
      throw new ValidationError(`ERROR CRÍTICO POST-DELETE: El periodo "${periodId}" aún existe en IndexedDB tras la eliminación.`);
    }

    const nullPeriodCount = postReadback.enrollments.filter(m => m.periodoId === null || m.periodoId === undefined).length;
    const nullModuleCount = postReadback.enrollments.filter(m => m.moduloId === null || m.moduloId === undefined).length;

    if (options.verifyReadbackCounts) {
      const v = options.verifyReadbackCounts;
      if (v.expectedPeriods !== undefined && postReadback.periods.length !== v.expectedPeriods) {
        throw new ValidationError(`ERROR CRÍTICO POST-DELETE: Conteo de periodos (${postReadback.periods.length}) no coincide con el esperado (${v.expectedPeriods}).`);
      }
      if (v.expectedStudents !== undefined && postReadback.students.length !== v.expectedStudents) {
        throw new ValidationError(`ERROR CRÍTICO POST-DELETE: Conteo de estudiantes (${postReadback.students.length}) no coincide con el esperado (${v.expectedStudents}).`);
      }
      if (v.expectedEnrollments !== undefined && postReadback.enrollments.length !== v.expectedEnrollments) {
        throw new ValidationError(`ERROR CRÍTICO POST-DELETE: Conteo de matrículas (${postReadback.enrollments.length}) no coincide con el esperado (${v.expectedEnrollments}).`);
      }
      if (v.expectedStaging !== undefined && postReadback.staging.length !== v.expectedStaging) {
        throw new ValidationError(`ERROR CRÍTICO POST-DELETE: Conteo de staging (${postReadback.staging.length}) no coincide con el esperado (${v.expectedStaging}).`);
      }
      if (v.expectedNullPeriodoId !== undefined && nullPeriodCount !== v.expectedNullPeriodoId) {
        throw new ValidationError(`ERROR CRÍTICO POST-DELETE: Conteo de matrículas con periodoId=null (${nullPeriodCount}) no coincide con el esperado (${v.expectedNullPeriodoId}).`);
      }
      if (v.expectedNullModuloId !== undefined && nullModuleCount !== v.expectedNullModuloId) {
        throw new ValidationError(`ERROR CRÍTICO POST-DELETE: Conteo de matrículas con moduloId=null (${nullModuleCount}) no coincide con el esperado (${v.expectedNullModuloId}).`);
      }
    }

    return {
      success: true,
      periodId,
      backupId,
      auditId,
      remainingPeriods: postReadback.periods.length,
      studentsCount: postReadback.students.length,
      enrollmentsCount: postReadback.enrollments.length,
      stagingCount: postReadback.staging.length,
      nullPeriodCount,
      nullModuleCount,
      postDeleteVerified: true
    };
  }
};
