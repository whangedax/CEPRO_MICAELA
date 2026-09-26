/**
 * Repositorio Base reutilizable para IndexedDB
 * Módulo: M01 - Núcleo Local
 */

import { getDB, executeTransaction } from '../db/database.js';
import { IntegrityError, OperationalError } from '../services/error-service.js';

export class BaseRepository {
  /**
   * @param {string} storeName - Nombre del Object Store en IndexedDB
   */
  constructor(storeName) {
    if (!storeName) {
      throw new OperationalError('El repositorio requiere especificar un storeName válido.');
    }
    this.storeName = storeName;
  }

  /**
   * Inserta un nuevo registro en el Object Store
   * @param {object} item
   * @returns {Promise<object>}
   */
  async create(item) {
    if (!item || !item.id) {
      throw new IntegrityError(`El objeto a insertar en ${this.storeName} debe tener una propiedad 'id'.`);
    }

    await executeTransaction(this.storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(this.storeName);
      store.add(item);
    });

    return item;
  }

  /**
   * Guarda un registro en el Object Store (Alias para inserción / actualización)
   * @param {object} item
   * @returns {Promise<object>}
   */
  async save(item) {
    return this.create(item);
  }

  /**
   * Obtiene un registro por su ID de clave primaria
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    const db = getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = (event) => {
        reject(new OperationalError(`Error al consultar ${this.storeName} por ID ${id}: ${event.target.error?.message}`));
      };
    });
  }

  /**
   * Lista todos los registros del store, aplicando opcionalmente un filtro
   * @param {function(object): boolean} [filterFn]
   * @returns {Promise<object[]>}
   */
  async list(filterFn = null) {
    const db = getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result || [];
        if (typeof filterFn === 'function') {
          results = results.filter(filterFn);
        }
        resolve(results);
      };

      request.onerror = (event) => {
        reject(new OperationalError(`Error al listar registros de ${this.storeName}: ${event.target.error?.message}`));
      };
    });
  }

  /**
   * Busca registros mediante un índice específico
   * @param {string} indexName
   * @param {any} key
   * @returns {Promise<object[]>}
   */
  async getByIndex(indexName, key) {
    const db = getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (!store.indexNames.contains(indexName)) {
        return reject(new OperationalError(`El índice ${indexName} no existe en ${this.storeName}`));
      }
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject(new OperationalError(`Error al buscar en el índice ${indexName} de ${this.storeName}: ${event.target.error?.message}`));
      };
    });
  }

  /**
   * Actualiza un registro existente
   * @param {object} item
   * @returns {Promise<object>}
   */
  async update(item) {
    if (!item || !item.id) {
      throw new IntegrityError(`No se puede actualizar en ${this.storeName} un objeto sin ID.`);
    }

    await executeTransaction(this.storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(this.storeName);
      store.put(item);
    });

    return item;
  }

  /**
   * Anulación lógica o borrado de registro
   * @param {string} id
   * @param {boolean} [softDelete=true]
   */
  async delete(id, softDelete = true) {
    const existing = await this.getById(id);
    if (!existing) return false;

    if (softDelete && existing.estado !== undefined) {
      existing.estado = 'ANULADO';
      await this.update(existing);
      return true;
    }

    await executeTransaction(this.storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(this.storeName);
      store.delete(id);
    });

    return true;
  }
}
