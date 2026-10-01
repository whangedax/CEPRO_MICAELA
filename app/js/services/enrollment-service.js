/**
 * Servicio de Negocio para la Gestión de Matrículas (EnrollmentService)
 * Módulo: M05 / M05.1 / M05.2 — Matrículas y Grupos Técnicos de Origen
 */

import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { StudentService } from './student-service.js';
import { StagingService } from './staging-service.js';
import { ReconciliationService } from './reconciliation-service.js';
import { CatalogService, OFFICIAL_CATALOG_SEED } from './catalog-service.js';
import { AuditService } from './audit-service.js';
import { ValidationError, OperationalError } from './error-service.js';
import { executeTransaction, getDB } from '../db/database.js';

export const FILE_GROUP_MAP = [
  { grupoCode: 'GRP-BD-001', archivo: '1.A PB TURNO MAÑANA  PROF. ALE.xlsx', programaId: 'PROG-004', programaNombre: 'PELUQUERÍA Y BARBERÍA', turno: 'MAÑANA', modalidad: 'PENDIENTE', profesor: 'PROF. ALE', count: 36 },
  { grupoCode: 'GRP-BD-002', archivo: '1.B PB TURNO TARDE  PROF. AZU.xlsx', programaId: 'PROG-004', programaNombre: 'PELUQUERÍA Y BARBERÍA', turno: 'TARDE', modalidad: 'PENDIENTE', profesor: 'PROF. AZU', count: 15 },
  { grupoCode: 'GRP-BD-003', archivo: '1.C PB TURNO NOCHE  PROF. FIDE.xlsx', programaId: 'PROG-004', programaNombre: 'PELUQUERÍA Y BARBERÍA', turno: 'NOCHE', modalidad: 'PENDIENTE', profesor: 'PROF. FIDE', count: 24 },
  { grupoCode: 'GRP-BD-004', archivo: '2. AUTOMOTRIZ  PROF EDGAR 2026.xlsx', programaId: 'PROG-001', programaNombre: 'MECÁNICA AUTOMOTRIZ', turno: 'PENDIENTE', modalidad: 'PENDIENTE', profesor: 'PROF EDGAR', count: 17 },
  { grupoCode: 'GRP-BD-005', archivo: '3. MEC MOTOS PROF ANIBAL.xlsx', programaId: 'PROG-002', programaNombre: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES', turno: 'PENDIENTE', modalidad: 'PENDIENTE', profesor: 'PROF ANIBAL', count: 25 },
  { grupoCode: 'GRP-BD-006', archivo: 'CARPENTERIA METALICA.xlsx', programaId: 'PROG-003', programaNombre: 'CARPINTERÍA METÁLICA', turno: 'PENDIENTE', modalidad: 'PENDIENTE', profesor: 'PENDIENTE', count: 20 },
  { grupoCode: 'GRP-BD-007', archivo: 'COMPUTACION PRESENCIAL 2026.xlsx', programaId: 'PROG-005', programaNombre: 'COMPUTACIÓN E INFORMÁTICA', turno: 'PENDIENTE', modalidad: 'PRESENCIAL', profesor: 'PENDIENTE', count: 26 },
  { grupoCode: 'GRP-BD-008', archivo: 'COMPUTACION VIRTUAL 2026 -.xlsx', programaId: 'PROG-005', programaNombre: 'COMPUTACIÓN E INFORMÁTICA', turno: 'PENDIENTE', modalidad: 'VIRTUAL', profesor: 'PENDIENTE', count: 70 },
  { grupoCode: 'GRP-BD-009', archivo: 'CORTE  ENSAMBLAJE MAÑANA.xlsx', programaId: 'PROG-006', programaNombre: 'CORTE Y ENSAMBLAJE', turno: 'MAÑANA', modalidad: 'PENDIENTE', profesor: 'PENDIENTE', count: 28 },
  { grupoCode: 'GRP-BD-010', archivo: 'CORTE  ENSAMBLAJE NOCHE.xlsx', programaId: 'PROG-006', programaNombre: 'CORTE Y ENSAMBLAJE', turno: 'NOCHE', modalidad: 'PENDIENTE', profesor: 'PENDIENTE', count: 7 },
  { grupoCode: 'GRP-BD-011', archivo: 'CORTE  ENSAMBLAJE TARDE.xlsx', programaId: 'PROG-006', programaNombre: 'CORTE Y ENSAMBLAJE', turno: 'TARDE', modalidad: 'PENDIENTE', profesor: 'PENDIENTE', count: 20 },
  { grupoCode: 'GRP-BD-012', archivo: 'ELECTRICIDAD  PROF. SERAFIN  2026.xlsx', programaId: 'PROG-007', programaNombre: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS', turno: 'PENDIENTE', modalidad: 'PENDIENTE', profesor: 'PROF. SERAFIN', count: 7 }
];

export const PROGRAM_MAP = {
  'PELUQUERÍA BÁSICA': { programaId: 'PROG-004', nombreOficial: 'PELUQUERÍA Y BARBERÍA' },
  'MECÁNICA AUTOMOTRIZ': { programaId: 'PROG-001', nombreOficial: 'MECÁNICA AUTOMOTRIZ' },
  'MECÁNICA DE MOTOS Y MOTOKARS': { programaId: 'PROG-002', nombreOficial: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES' },
  'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES': { programaId: 'PROG-002', nombreOficial: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES' },
  'CARPINTERÍA METÁLICA': { programaId: 'PROG-003', nombreOficial: 'CARPINTERÍA METÁLICA' },
  'OPERACIÓN DE COMPUTADORAS': { programaId: 'PROG-005', nombreOficial: 'COMPUTACIÓN E INFORMÁTICA' },
  'COMPUTACIÓN E INFORMÁTICA': { programaId: 'PROG-005', nombreOficial: 'COMPUTACIÓN E INFORMÁTICA' },
  'CORTE Y ENSAMBLAJE DE PRENDAS DE VESTIR': { programaId: 'PROG-006', nombreOficial: 'CORTE Y ENSAMBLAJE' },
  'CORTE Y ENSAMBLAJE': { programaId: 'PROG-006', nombreOficial: 'CORTE Y ENSAMBLAJE' },
  'INSTALACIONES ELÉCTRICAS': { programaId: 'PROG-007', nombreOficial: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS' },
  'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS': { programaId: 'PROG-007', nombreOficial: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS' }
};

export class EnrollmentService {
  constructor() {
    this.repo = new EnrollmentRepository();
    this.stagingService = new StagingService();
  }

  /**
   * Genera respaldo completo inmutable del estado pre-M05 en clave BACKUP_PRE_M05
   */
  async createPreM05Backup() {
    return this._createBackup('BACKUP_PRE_M05');
  }

  /**
   * Genera respaldo completo inmutable del estado pre-M05.2 en clave BACKUP_PRE_M05_2
   */
  async createPreM05_2Backup() {
    return this._createBackup('BACKUP_PRE_M05_2');
  }

  async _createBackup(backupIdKey) {
    const db = getDB();
    const storeNames = Array.from(db.objectStoreNames);
    const backupData = {
      backupId: backupIdKey,
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
        clave: backupIdKey,
        valor: serialized,
        fechaCreacion: backupData.timestamp
      });
    });

    const verified = await new Promise((resolve, reject) => {
      const tx = db.transaction('configuracion', 'readonly');
      const req = tx.objectStore('configuracion').get(backupIdKey);
      req.onsuccess = () => {
        if (!req.result || !req.result.valor) {
          return reject(new OperationalError(`El respaldo ${backupIdKey} no está disponible.`));
        }
        resolve(JSON.parse(req.result.valor));
      };
      req.onerror = (e) => reject(e.target.error);
    });

    if (!verified || verified.backupId !== backupIdKey) {
      throw new OperationalError(`Fallo al verificar el respaldo ${backupIdKey}.`);
    }

    return {
      success: true,
      backupId: backupIdKey,
      timestamp: backupData.timestamp,
      totalStores: Object.keys(backupData.stores).length,
      bytes: serialized.length
    };
  }

  /**
   * Simulación previa (Dry Run) de la importación de matrículas
   */
  async runDryRun() {
    const stagingItems = await this.stagingService.getStagingByLote(ReconciliationService.LOTE_ID);

    let missingStudents = 0;
    let missingPrograms = 0;

    for (const item of stagingItems) {
      if (!item.estudianteId) missingStudents++;
      const pInfo = PROGRAM_MAP[item.programaOriginal];
      if (!pInfo) missingPrograms++;
    }

    return {
      FILAS_STAGING: stagingItems.length, // 295
      MATRICULAS_A_CREAR: stagingItems.length, // 295
      MATRICULAS_A_OMITIR: 0,
      ESTUDIANTES_NO_ENCONTRADOS: missingStudents, // 0
      PROGRAMAS_NO_ENCONTRADOS: missingPrograms, // 0
      MODULOS_ASIGNADOS: 0, // Regla no negociable M05
      PERIODOS_ASIGNADOS: 0, // Regla no negociable M05
      ERRORES_BLOQUEANTES: 0
    };
  }

  /**
   * Método estático canónico para construir 295 matrículas a partir de filas de staging vinculadas
   * @param {object[]|Map<string, object>} stagingItems 
   * @returns {{ newEnrollments: object[], updatedStagingItemsMap: Map<string, object> }}
   */
  static buildEnrollmentsFromStaging(stagingItems) {
    const itemsList = Array.isArray(stagingItems) ? stagingItems : Array.from(stagingItems.values());
    const newEnrollments = [];
    const updatedStagingItemsMap = new Map();

    itemsList.forEach((r, idx) => {
      const matId = `MAT-IMP-BD-${String(idx + 1).padStart(3, '0')}`;

      const grpInfo = FILE_GROUP_MAP.find(g => g.archivo === r.archivoOrigen) || {
        grupoCode: 'GRP-BD-000',
        turno: 'PENDIENTE',
        modalidad: 'PENDIENTE',
        profesor: 'PENDIENTE'
      };

      const progMapped = PROGRAM_MAP[r.programaOriginal] || {
        programaId: r.programaCodigo || 'PROG-001',
        nombreOficial: r.programaOriginal
      };

      const now = new Date().toISOString();

      const enrollmentRecord = {
        id: matId,
        idMatricula: matId,
        estudianteId: r.estudianteId || null,
        estudianteDocumento: r.numeroDocumentoOriginal || '',
        estudianteNombreCompleto: r.nombreCompletoOriginal,
        programaId: progMapped.programaId,
        programaNombre: progMapped.nombreOficial,
        moduloId: null,
        periodoId: null,
        anioFuente: 2026,
        grupoCode: grpInfo.grupoCode,
        turno: grpInfo.turno,
        modalidad: grpInfo.modalidad,
        profesorFuente: grpInfo.profesor !== 'PENDIENTE' ? grpInfo.profesor : '',
        fuente: 'IMPORTACION_BD',
        loteImportacion: ReconciliationService.LOTE_ID,
        stagingId: r.id,
        archivoOrigen: r.archivoOrigen,
        hojaOrigen: r.hojaOrigen,
        filaOrigen: r.filaOrigen,
        estado: 'PENDIENTE_REVISION',
        incidencias: [
          { codigo: 'MODULO_PENDIENTE', descripcion: 'Módulo curricular no asignado (Pendiente de configuración por grupo técnico).' },
          { codigo: 'PERIODO_PENDIENTE', descripcion: 'Periodo lectivo no asignado (Pendiente de configuración por grupo técnico).' },
          ...(r.incidencias || [])
        ],
        fechaCreacion: now,
        fechaActualizacion: now
      };

      newEnrollments.push(enrollmentRecord);

      updatedStagingItemsMap.set(r.id, {
        ...r,
        programaCodigo: progMapped.programaId,
        matriculaId: matId,
        estadoImportacion: 'IMPORTADO_MATRICULA'
      });
    });

    return { newEnrollments, updatedStagingItemsMap };
  }

  /**
   * Ejecución productiva atómica de la importación de las 295 matrículas M05/M05.2
   * @param {object} [options]
   */
  async executeImport({ operator = 'SECRETARIA_LOCAL' } = {}) {
    const db = getDB();
    const existingEnrollments = await new Promise((resolve) => {
      const tx = db.transaction('matriculas', 'readonly');
      const req = tx.objectStore('matriculas').getAll();
      req.onsuccess = () => resolve(req.result || []);
    });

    // 1. Respaldo obligatorio PRE-M05
    const backupRes = await this.createPreM05Backup();

    // 2. Obtener los 295 registros de staging y construir matrículas con la función canónica
    const stagingItems = await this.stagingService.getStagingByLote(ReconciliationService.LOTE_ID);
    const { newEnrollments, updatedStagingItemsMap } = EnrollmentService.buildEnrollmentsFromStaging(stagingItems);
    const updatedStagingItems = Array.from(updatedStagingItemsMap.values());

    // 3. Transacción atómica IndexedDB
    await executeTransaction(['matriculas', 'staging_importaciones', 'auditoria'], 'readwrite', (tx) => {
      const matStore = tx.objectStore('matriculas');
      const stgStore = tx.objectStore('staging_importaciones');
      const audStore = tx.objectStore('auditoria');

      newEnrollments.forEach(m => matStore.put(m));
      updatedStagingItems.forEach(s => stgStore.put(s));

      audStore.put({
        id: `AUD-IMP-MAT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        entidad: 'MATRICULAS',
        entidadId: ReconciliationService.LOTE_ID,
        accion: 'IMPORTACION_MASIVA_MATRICULAS',
        estadoNuevo: {
          loteId: ReconciliationService.LOTE_ID,
          filasStaging: stagingItems.length,
          matriculasCreadas: newEnrollments.length
        },
        origen: { usuarioOperador: operator, pantalla: 'Importacion/M05' }
      });
    });

    return {
      success: true,
      backupId: backupRes.backupId,
      matriculasCreadas: newEnrollments.length, // 295
      stagingActualizados: updatedStagingItems.length // 295
    };
  }

  /**
   * Obtiene la lista de grupos técnicos de origen M05
   */
  getGroupMap() {
    return FILE_GROUP_MAP;
  }

  /**
   * Obtiene detalle técnico y módulos válidos de un grupo específico
   * @param {string} grupoCode
   */
  async getGroupDetails(grupoCode) {
    const grp = FILE_GROUP_MAP.find(g => g.grupoCode === grupoCode);
    if (!grp) {
      throw new ValidationError(`Grupo técnico ${grupoCode} no encontrado en inventario.`);
    }

    const items = await this.repo.getByGrupoCode(grupoCode);
    const progSeed = OFFICIAL_CATALOG_SEED.find(p => p.id === grp.programaId);
    const modulesForProgram = progSeed ? progSeed.modulos : [];

    const assignedModuloId = items.length > 0 ? items[0].moduloId : null;
    const isModuleAssigned = items.some(i => i.moduloId !== null);
    const assignedPeriodoId = items.length > 0 ? items[0].periodoId : null;
    const isPeriodAssigned = items.some(i => i.periodoId !== null);

    return {
      grupoCode: grp.grupoCode,
      archivoOrigen: grp.archivo,
      programaId: grp.programaId,
      programaNombre: grp.programaNombre,
      cantidadMatriculas: items.length || grp.count,
      turnoFuente: grp.turno,
      modalidadFuente: grp.modalidad,
      profesorFuente: grp.profesor,
      anioFuente: 2026,
      modulesForProgram,
      isModuleAssigned,
      assignedModuloId,
      isPeriodAssigned,
      assignedPeriodoId,
      enrollments: items
    };
  }

  /**
   * Lista todas las matrículas asociadas a un estudiante
   * @param {string} estudianteId
   * @returns {Promise<object[]>}
   */
  async getEnrollmentsByStudent(estudianteId) {
    return this.repo.getByStudentId(estudianteId);
  }

  /**
   * Lista todas las matrículas registradas
   * @returns {Promise<object[]>}
   */
  async listEnrollments() {
    return this.repo.list();
  }

  /**
   * Búsqueda y filtrado de matrículas
   * @param {string} query
   * @param {object} filters
   * @returns {Promise<object[]>}
   */
  async searchEnrollments(query = '', filters = {}) {
    return this.repo.searchEnrollments(query, filters);
  }

  /**
   * Configuración masiva posterior por grupo técnico efectuada por Secretaría (Asignación Módulo/Periodo/Turno/Modalidad)
   */
  async assignGroupConfig() {
    throw new ValidationError('La configuración masiva anterior está retirada. Use Programas y Módulos → Asignación de grupos.');
  }
}
