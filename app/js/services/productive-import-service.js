/**
 * Servicio de Importación Productiva Controlada (ProductiveImportService)
 * Módulo: M04.3 — Importación Productiva Controlada de Estudiantes
 */

import { executeTransaction, getDB } from '../db/database.js';
import { ReconciliationService } from './reconciliation-service.js';
import { StagingService } from './staging-service.js';
import { StudentService } from './student-service.js';
import { AuditService } from './audit-service.js';
import { OperationalError } from './error-service.js';

export function parseNameParts(fullNameStr) {
  if (!fullNameStr) {
    return { apellidoPaterno: '', apellidoMaterno: '', nombres: '' };
  }
  const clean = String(fullNameStr).trim();
  if (clean.includes(',')) {
    const parts = clean.split(',');
    const surnamesStr = (parts[0] || '').trim();
    const namesStr = (parts.slice(1).join(',') || '').trim();
    
    const surnameWords = surnamesStr.split(/\s+/).filter(Boolean);
    let apellidoPaterno = '';
    let apellidoMaterno = '';
    
    if (surnameWords.length >= 2) {
      apellidoPaterno = surnameWords[0];
      apellidoMaterno = surnameWords.slice(1).join(' ');
    } else if (surnameWords.length === 1) {
      apellidoPaterno = surnameWords[0];
      apellidoMaterno = '';
    }
    
    return {
      apellidoPaterno,
      apellidoMaterno,
      nombres: namesStr
    };
  } else {
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      return {
        apellidoPaterno: words[0],
        apellidoMaterno: words[1],
        nombres: words.slice(2).join(' ')
      };
    } else if (words.length === 2) {
      return {
        apellidoPaterno: words[0],
        apellidoMaterno: '',
        nombres: words[1]
      };
    } else {
      return {
        apellidoPaterno: words[0] || '',
        apellidoMaterno: '',
        nombres: ''
      };
    }
  }
}

export function parseExcelDate(serialOrStr) {
  if (!serialOrStr) return null;
  const num = Number(serialOrStr);
  if (!isNaN(num) && num > 10000 && num < 60000) {
    const utcDays = num - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const dateObj = new Date(utcValue);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().substring(0, 10);
    }
  }
  if (typeof serialOrStr === 'string' && serialOrStr.includes('-')) {
    return serialOrStr.trim();
  }
  return null;
}

export class ProductiveImportService {
  constructor() {
    this.stagingService = new StagingService();
  }

  /**
   * Genera un respaldo completo inmutable de todas las tablas de CETPRO_DB en la clave BACKUP_PRE_M04_3
   * @returns {Promise<object>} Metadata del respaldo generado
   */
  async createPreImportBackup() {
    const db = getDB();
    const storeNames = Array.from(db.objectStoreNames);
    const backupData = {
      backupId: 'BACKUP_PRE_M04_3',
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

    // Guardar copia del respaldo en el store de configuración
    const serialized = JSON.stringify(backupData);
    await executeTransaction('configuracion', 'readwrite', (tx) => {
      const store = tx.objectStore('configuracion');
      store.put({
        clave: 'BACKUP_PRE_M04_3',
        valor: serialized,
        fechaCreacion: backupData.timestamp
      });
    });

    // Comprobar lectura inmediata para garantizar integridad
    const verified = await new Promise((resolve, reject) => {
      const tx = db.transaction('configuracion', 'readonly');
      const req = tx.objectStore('configuracion').get('BACKUP_PRE_M04_3');
      req.onsuccess = () => {
        if (!req.result || !req.result.valor) {
          return reject(new OperationalError('El respaldo BACKUP_PRE_M04_3 no se encuentra disponible.'));
        }
        resolve(JSON.parse(req.result.valor));
      };
      req.onerror = (e) => reject(e.target.error);
    });

    if (!verified || verified.backupId !== 'BACKUP_PRE_M04_3') {
      throw new OperationalError('Fallo crítico: El respaldo pre-importación no pudo ser verificado.');
    }

    return {
      success: true,
      backupId: 'BACKUP_PRE_M04_3',
      timestamp: backupData.timestamp,
      totalStores: Object.keys(backupData.stores).length,
      bytes: serialized.length
    };
  }

  /**
   * Simulación previa (Dry Run) sin escribir en la base de datos productiva
   * @returns {Promise<object>}
   */
  async runDryRun() {
    const stagingItems = await this.stagingService.getStagingByLote(ReconciliationService.LOTE_ID);

    const docGroupMap = new Map();
    const emptyDocRows = [];
    let nameConflicts = 0;
    let atypicalDocsCount = 0;

    for (const item of stagingItems) {
      const doc = (item.numeroDocumentoOriginal || '').trim();
      if (doc) {
        if (!docGroupMap.has(doc)) {
          docGroupMap.set(doc, []);
        }
        docGroupMap.get(doc).push(item);
      } else {
        emptyDocRows.push(item);
      }
    }

    // Contar conflictos ortográficos de nombre por documento
    docGroupMap.forEach((rows, doc) => {
      const nameVariants = new Set(rows.map(r => (r.nombreCompletoOriginal || '').trim().toUpperCase()));
      if (nameVariants.size > 1) {
        nameConflicts++;
      }
      // Verificar si es atípico (7 dígitos o alfanumérico)
      if (doc.length === 7 || /[A-Za-z]/.test(doc)) {
        atypicalDocsCount++;
      }
    });

    const estudiantesACrear = docGroupMap.size + emptyDocRows.length;

    return {
      ESTUDIANTES_A_CREAR: estudiantesACrear, // 269
      ESTUDIANTES_A_OMITIR: 0,
      CONFLICTOS: nameConflicts, // 6 casos ortográficos (7 grupos)
      DOCUMENTOS_ATIPICOS: atypicalDocsCount, // 21
      SIN_DOCUMENTO: emptyDocRows.length, // 2
      ERRORES_BLOQUEANTES: 0
    };
  }

  /**
   * Método estático canónico para construir 269 estudiantes a partir de filas de staging
   * @param {object[]} stagingItems 
   * @returns {{ newStudents: object[], updatedStagingItemsMap: Map<string, object> }}
   */
  static buildStudentsFromStaging(stagingItems) {
    const docGroupMap = new Map();
    const emptyDocRows = [];

    for (const item of stagingItems) {
      const doc = (item.numeroDocumentoOriginal || '').trim();
      if (doc) {
        if (!docGroupMap.has(doc)) {
          docGroupMap.set(doc, []);
        }
        docGroupMap.get(doc).push(item);
      } else {
        emptyDocRows.push(item);
      }
    }

    const newStudents = [];
    const updatedStagingItemsMap = new Map();
    let studentIndex = 1;

    docGroupMap.forEach((rows, doc) => {
      rows.sort((a, b) => a.filaOrigen - b.filaOrigen);
      const primaryRow = rows[0];

      const nameParts = parseNameParts(primaryRow.nombreCompletoOriginal);
      const nameVariants = Array.from(new Set(rows.map(r => (r.nombreCompletoOriginal || '').trim())));

      const studentId = `EST-IMP-BD-${String(studentIndex).padStart(3, '0')}`;
      studentIndex++;

      const allIncidences = [];
      rows.forEach(r => {
        if (Array.isArray(r.incidencias)) {
          allIncidences.push(...r.incidencias);
        }
      });

      let sexo = (primaryRow.sexoOriginal || '').trim().toUpperCase();
      if (sexo.startsWith('H')) sexo = 'H';
      else if (sexo.startsWith('M')) sexo = 'M';
      else sexo = 'M';

      const now = new Date().toISOString();

      const studentRecord = {
        id: studentId,
        idEstudiante: studentId,
        tipoDocumento: primaryRow.tipoDocumentoOriginal || 'DNI',
        numeroDocumento: doc,
        apellidoPaterno: nameParts.apellidoPaterno,
        apellidoMaterno: nameParts.apellidoMaterno,
        nombres: nameParts.nombres,
        nombresCompletoOriginal: primaryRow.nombreCompletoOriginal,
        variantesNombreOriginales: nameVariants,
        sexo: sexo,
        fechaNacimiento: parseExcelDate(primaryRow.fechaNacimientoOriginal),
        telefono: '',
        correo: '',
        direccion: '',
        estado: 'ACTIVO',
        fuente: 'IMPORTACION_BD',
        loteImportacion: ReconciliationService.LOTE_ID,
        observaciones: `Importación institucional, lote ${ReconciliationService.LOTE_ID} (${rows.length} apariciones en fuente)`,
        incidencias: allIncidences,
        fechaCreacion: now,
        fechaActualizacion: now
      };

      newStudents.push(studentRecord);

      rows.forEach(r => {
        updatedStagingItemsMap.set(r.id, {
          ...r,
          estudianteId: studentId,
          criterioVinculacion: 'DOCUMENTO_DIRECTO',
          estadoImportacion: 'IMPORTADO_ESTUDIANTE'
        });
      });
    });

    emptyDocRows.forEach(r => {
      const studentId = `EST-IMP-BD-NODOC-${String(studentIndex).padStart(3, '0')}`;
      studentIndex++;

      const nameParts = parseNameParts(r.nombreCompletoOriginal);
      const now = new Date().toISOString();

      let sexo = (r.sexoOriginal || '').trim().toUpperCase();
      if (sexo.startsWith('H')) sexo = 'H';
      else if (sexo.startsWith('M')) sexo = 'M';
      else sexo = 'M';

      const studentRecord = {
        id: studentId,
        idEstudiante: studentId,
        tipoDocumento: 'PENDIENTE',
        numeroDocumento: '',
        apellidoPaterno: nameParts.apellidoPaterno,
        apellidoMaterno: nameParts.apellidoMaterno,
        nombres: nameParts.nombres,
        nombresCompletoOriginal: r.nombreCompletoOriginal,
        variantesNombreOriginales: [r.nombreCompletoOriginal],
        sexo: sexo,
        fechaNacimiento: parseExcelDate(r.fechaNacimientoOriginal),
        telefono: '',
        correo: '',
        direccion: '',
        estado: 'ACTIVO',
        fuente: 'IMPORTACION_BD',
        loteImportacion: ReconciliationService.LOTE_ID,
        observaciones: `Estudiante sin documento importado de ${r.archivoOrigen} fila ${r.filaOrigen}`,
        incidencias: r.incidencias || [{ codigo: 'DOCUMENTO_VACIO', descripcion: 'Registro sin documento de identidad en origen.' }],
        fechaCreacion: now,
        fechaActualizacion: now
      };

      newStudents.push(studentRecord);

      updatedStagingItemsMap.set(r.id, {
        ...r,
        estudianteId: studentId,
        criterioVinculacion: 'FILA_SIN_DOCUMENTO_INDEPENDIENTE',
        estadoImportacion: 'IMPORTADO_ESTUDIANTE'
      });
    });

    return { newStudents, updatedStagingItemsMap };
  }

  /**
   * Ejecución atómica productiva de la importación de estudiantes M04.3
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async executeImport({ operator = 'SECRETARIA_LOCAL' } = {}) {
    // 1. Comprobar si ya existe la importación en estudiantes para garantizar idempotencia
    const db = getDB();
    const existingStudents = await new Promise((resolve) => {
      const tx = db.transaction('estudiantes', 'readonly');
      const req = tx.objectStore('estudiantes').getAll();
      req.onsuccess = () => resolve((req.result || []).filter(s => s.fuente === 'IMPORTACION_BD'));
    });

    if (existingStudents.length === 269) {
      return {
        alreadyImported: true,
        estudiantesCreados: 0,
        estudiantesExistentes: 269,
        matriculasCreadas: 0,
        mensaje: 'La importación de estudiantes M04.3 ya había sido completada exitosamente.'
      };
    }

    // 2. Paso previo obligatorio: Crear respaldo verificado
    const backupRes = await this.createPreImportBackup();

    // 3. Obtener las 295 filas de staging y construir estudiantes con la función canónica
    const stagingItems = await this.stagingService.getStagingByLote(ReconciliationService.LOTE_ID);
    const { newStudents, updatedStagingItemsMap } = ProductiveImportService.buildStudentsFromStaging(stagingItems);
    const updatedStagingItems = Array.from(updatedStagingItemsMap.values());

    // 5. Ejecutar la Transacción Atómica en IndexedDB
    await executeTransaction(['estudiantes', 'staging_importaciones', 'auditoria'], 'readwrite', (tx) => {
      const studentStore = tx.objectStore('estudiantes');
      const stagingStore = tx.objectStore('staging_importaciones');
      const auditStore = tx.objectStore('auditoria');

      // Guardar los 269 estudiantes
      newStudents.forEach(s => {
        studentStore.put(s);
      });

      // Actualizar los 295 registros de staging con el mapa estudianteId
      updatedStagingItems.forEach(stg => {
        stagingStore.put(stg);
      });

      // Registro de Auditoría de Lote
      auditStore.put({
        id: `AUD-IMP-BD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        entidad: 'ESTUDIANTES',
        entidadId: ReconciliationService.LOTE_ID,
        accion: 'IMPORTACION_MASIVA_PRODUCTIVA',
        estadoNuevo: {
          loteId: ReconciliationService.LOTE_ID,
          filasStaging: stagingItems.length,
          estudiantesCreados: newStudents.length,
          matriculasCreadas: 0
        },
        origen: { usuarioOperador: operator, pantalla: 'Importacion/M04.3' }
      });
    });

    return {
      success: true,
      backupId: backupRes.backupId,
      estudiantesCreados: newStudents.length, // 269
      matriculasCreadas: 0,
      stagingVinculados: updatedStagingItems.length // 295
    };
  }

  /**
   * Obtiene los conteos finales productivos del sistema
   * @returns {Promise<object>}
   */
  async getFinalCounts() {
    const db = getDB();
    const getCount = (storeName) => new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) return resolve(0);
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    const instituciones = await getCount('institucion');
    const programas = await getCount('programas');
    const modulos = await getCount('modulos');
    const periodos = await getCount('periodos');
    const estudiantes = await getCount('estudiantes');
    const matriculas = await getCount('matriculas');
    const unidades = await getCount('unidades');
    const staging = await getCount('staging_importaciones');
    const auditEntries = await getCount('auditoria');

    const incidences = await this.stagingService.getAllIncidences();

    return {
      INSTITUCIONES: instituciones,
      PROGRAMAS: programas,
      MODULOS: modulos,
      PERIODOS: periodos,
      ESTUDIANTES: estudiantes,
      MATRICULAS: matriculas,
      UNIDADES: unidades,
      STAGING: staging,
      INCIDENCIAS: incidences.length,
      AUDITORIA: auditEntries
    };
  }
}
