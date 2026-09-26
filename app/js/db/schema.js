/**
 * Definición centralizada del esquema de IndexedDB (CETPRO_DB v1)
 * Módulo: M00 / M01
 */

export const SCHEMA_V1 = {
  version: 1,
  stores: {
    estudiantes: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'numeroDocumento', keyPath: 'numeroDocumento', options: { unique: false } },
        { name: 'apellidos', keyPath: 'apellidoPaterno', options: { unique: false } }
      ]
    },
    matriculas: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'estudianteId', keyPath: 'estudianteId', options: { unique: false } },
        { name: 'periodoId', keyPath: 'periodoId', options: { unique: false } },
        { name: 'moduloId', keyPath: 'moduloId', options: { unique: false } },
        { name: 'grupoCode', keyPath: 'grupoCode', options: { unique: false } },
        { name: 'estudiante_periodo', keyPath: ['estudianteId', 'periodoId'], options: { unique: false } }
      ]
    },
    institucion: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: []
    },
    periodos: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'nombre', keyPath: 'nombre', options: { unique: true } }
      ]
    },
    programas: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'codigo', keyPath: 'codigo', options: { unique: true } }
      ]
    },
    modulos: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'programaId', keyPath: 'programaId', options: { unique: false } },
        { name: 'codigo', keyPath: 'codigo', options: { unique: false } }
      ]
    },
    unidades: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'moduloId', keyPath: 'moduloId', options: { unique: false } }
      ]
    },
    indicadores: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'unidadId', keyPath: 'unidadId', options: { unique: false } }
      ]
    },
    docentes: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'numeroDocumento', keyPath: 'numeroDocumento', options: { unique: true } }
      ]
    },
    configuracion: {
      keyPath: 'clave',
      autoIncrement: false,
      indexes: []
    },
    matricula_unidades: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'matriculaId', keyPath: 'matriculaId', options: { unique: false } },
        { name: 'unidadId', keyPath: 'unidadId', options: { unique: false } }
      ]
    },
    asistencia: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'matriculaId', keyPath: 'matriculaId', options: { unique: false } },
        { name: 'unidadId', keyPath: 'unidadId', options: { unique: false } },
        { name: 'fecha', keyPath: 'fecha', options: { unique: false } },
        { name: 'sesionId', keyPath: 'sesionId', options: { unique: false } }
      ]
    },
    evaluacion: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'matriculaId', keyPath: 'matriculaId', options: { unique: false } },
        { name: 'unidadId', keyPath: 'unidadId', options: { unique: false } },
        { name: 'indicadorId', keyPath: 'indicadorId', options: { unique: false } }
      ]
    },
    efsrt: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'matriculaId', keyPath: 'matriculaId', options: { unique: false } },
        { name: 'moduloId', keyPath: 'moduloId', options: { unique: false } }
      ]
    },
    documentos: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'tipoDocumento', keyPath: 'tipoDocumento', options: { unique: false } },
        { name: 'referenciaId', keyPath: 'referenciaId', options: { unique: false } },
        { name: 'fechaEmision', keyPath: 'fechaEmision', options: { unique: false } }
      ]
    },
    auditoria: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
        { name: 'entidad', keyPath: 'entidad', options: { unique: false } },
        { name: 'entidadId', keyPath: 'entidadId', options: { unique: false } }
      ]
    },
    staging_importaciones: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'loteId', keyPath: 'loteId', options: { unique: false } },
        { name: 'estado', keyPath: 'estado', options: { unique: false } },
        { name: 'archivoOrigen', keyPath: 'archivoOrigen', options: { unique: false } }
      ]
    }
  }
};

/**
 * Función encargada de crear la estructura física en IndexedDB durante onupgradeneeded
 */
export function applySchemaUpgrade(db, oldVersion, newVersion) {
  if (oldVersion < 1) {
    const storesDef = SCHEMA_V1.stores;
    for (const [storeName, config] of Object.entries(storesDef)) {
      let store;
      if (!db.objectStoreNames.contains(storeName)) {
        store = db.createObjectStore(storeName, {
          keyPath: config.keyPath,
          autoIncrement: config.autoIncrement || false
        });
      } else {
        store = db.transaction.objectStore(storeName);
      }

      for (const idxConfig of config.indexes) {
        if (!store.indexNames.contains(idxConfig.name)) {
          store.createIndex(idxConfig.name, idxConfig.keyPath, idxConfig.options || {});
        }
      }
    }
  }
}
