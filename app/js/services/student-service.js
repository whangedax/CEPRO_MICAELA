/**
 * Servicio de Negocio para la Gestión de Estudiantes
 * Módulo: M03 - Estudiantes
 */

import { StudentRepository } from '../repositories/student-repository.js';
import { AuditService } from './audit-service.js';
import { ValidationError, ImportConflictError } from './error-service.js';

export const StudentService = {
  repo: new StudentRepository(),

  /**
   * Crea un nuevo estudiante con ID técnico estable EST-...
   * @param {object} studentData
   * @param {string} [operator='SECRETARIA_LOCAL']
   * @returns {Promise<object>} Estudiante creado
   */
  async createStudent(studentData, operator = 'SECRETARIA_LOCAL') {
    if (!studentData) {
      throw new ValidationError('Los datos del estudiante son obligatorios.');
    }

    const tipoDocumento = (studentData.tipoDocumento || 'DNI').toUpperCase().trim();
    const numeroDocumento = studentData.numeroDocumento !== undefined && studentData.numeroDocumento !== null
      ? String(studentData.numeroDocumento).trim()
      : '';

    if (!numeroDocumento) {
      throw new ValidationError('El número de documento es obligatorio.');
    }

    const nombres = (studentData.nombres || '').trim();
    const apellidoPaterno = (studentData.apellidoPaterno || '').trim();
    const apellidoMaterno = (studentData.apellidoMaterno || '').trim();
    const nombresCompletoOriginal = (studentData.nombresCompletoOriginal || `${apellidoPaterno} ${apellidoMaterno}, ${nombres}`).trim();

    if (!nombres && !nombresCompletoOriginal) {
      throw new ValidationError('Los nombres del estudiante son obligatorios.');
    }

    // Validación de fecha de nacimiento no futura
    if (studentData.fechaNacimiento) {
      const birthDate = new Date(studentData.fechaNacimiento);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthDate > today) {
        throw new ValidationError('La fecha de nacimiento no puede ser una fecha futura.');
      }
    }

    // Comprobar si ya existe un estudiante con el mismo documento
    const existing = await this.repo.getByDocument(tipoDocumento, numeroDocumento);
    if (existing) {
      throw new ImportConflictError(`Ya existe un estudiante registrado con el ${tipoDocumento} N° ${numeroDocumento}. No se permite duplicación silenciosa.`, {
        existingStudent: existing
      });
    }

    // Generación de ID técnico estable EST-YYYYMMDD-XXXXX
    const dateStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(10000 + Math.random() * 90000);
    const id = studentData.id || `EST-${dateStr}-${randSuffix}`;

    const now = new Date().toISOString();

    const newStudent = {
      id,
      idEstudiante: id,
      tipoDocumento,
      numeroDocumento, // Conservado obligatoriamente como STRING con ceros iniciales
      apellidoPaterno,
      apellidoMaterno,
      nombres,
      nombresCompletoOriginal,
      sexo: (studentData.sexo || 'H').toUpperCase(),
      fechaNacimiento: studentData.fechaNacimiento || null,
      telefono: studentData.telefono ? String(studentData.telefono).trim() : '',
      correo: studentData.correo ? String(studentData.correo).trim() : '',
      direccion: studentData.direccion ? String(studentData.direccion).trim() : '',
      estado: studentData.estado || 'ACTIVO',
      fuente: studentData.fuente || 'MANUAL',
      observaciones: studentData.observaciones || '',
      fechaCreacion: now,
      fechaActualizacion: now
    };

    await this.repo.create(newStudent);

    await AuditService.record({
      entidad: 'ESTUDIANTES',
      idEntidad: id,
      accion: 'CREACION',
      estadoNuevo: newStudent,
      origen: { usuarioOperador: operator, pantalla: 'Estudiantes/Alta' }
    });

    return newStudent;
  },

  /**
   * Obtiene un estudiante por su ID técnico EST-...
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getStudentById(id) {
    return this.repo.getById(id);
  },

  /**
   * Busca estudiantes por término y filtros
   * @param {string} query
   * @param {object} filters
   * @returns {Promise<object[]>}
   */
  async searchStudents(query = '', filters = {}) {
    return this.repo.searchStudents(query, filters);
  },

  /**
   * Edita los datos de un estudiante conservando su ID técnico
   * @param {object} studentData
   * @param {string} [operator='SECRETARIA_LOCAL']
   */
  async updateStudent(studentData, operator = 'SECRETARIA_LOCAL') {
    if (!studentData || !studentData.id) {
      throw new ValidationError('El ID del estudiante es obligatorio para actualizar.');
    }

    const current = await this.repo.getById(studentData.id);
    if (!current) {
      throw new ValidationError(`Estudiante ${studentData.id} no encontrado.`);
    }

    if (studentData.fechaNacimiento) {
      const birthDate = new Date(studentData.fechaNacimiento);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthDate > today) {
        throw new ValidationError('La fecha de nacimiento no puede ser una fecha futura.');
      }
    }

    // Si cambió el número de documento, verificar que no colisione con otro
    if (studentData.numeroDocumento && String(studentData.numeroDocumento).trim() !== current.numeroDocumento) {
      const newDoc = String(studentData.numeroDocumento).trim();
      const existing = await this.repo.getByDocument(studentData.tipoDocumento || current.tipoDocumento, newDoc);
      if (existing && existing.id !== current.id) {
        throw new ImportConflictError(`El número de documento ${newDoc} ya pertenece a otro estudiante.`);
      }
    }

    const updated = {
      ...current,
      ...studentData,
      id: current.id, // Preservar ID técnico inalterado
      numeroDocumento: studentData.numeroDocumento !== undefined ? String(studentData.numeroDocumento).trim() : current.numeroDocumento,
      nombresCompletoOriginal: current.nombresCompletoOriginal, // Preservar trazabilidad de origen
      fechaActualizacion: new Date().toISOString()
    };

    await this.repo.update(updated);

    await AuditService.record({
      entidad: 'ESTUDIANTES',
      idEntidad: updated.id,
      accion: current.numeroDocumento !== updated.numeroDocumento ? 'CAMBIO_DOCUMENTO' : 'MODIFICACION',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: { usuarioOperador: operator, pantalla: 'Estudiantes/Edición' }
    });

    return updated;
  },

  /**
   * Desactivación lógica (Soft Delete) de un estudiante
   * @param {string} id
   * @param {string} [operator='SECRETARIA_LOCAL']
   */
  async deactivateStudent(id, operator = 'SECRETARIA_LOCAL') {
    const current = await this.repo.getById(id);
    if (!current) {
      throw new ValidationError(`Estudiante ${id} no encontrado.`);
    }

    const updated = {
      ...current,
      estado: 'INACTIVO',
      fechaActualizacion: new Date().toISOString()
    };

    await this.repo.update(updated);

    await AuditService.record({
      entidad: 'ESTUDIANTES',
      idEntidad: id,
      accion: 'DESACTIVACION',
      estadoAnterior: current,
      estadoNuevo: updated,
      origen: { usuarioOperador: operator, pantalla: 'Estudiantes/Desactivación' }
    });

    return updated;
  }
};
