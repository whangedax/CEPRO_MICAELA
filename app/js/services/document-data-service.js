/**
 * Capa única de datos para documentos institucionales.
 * Módulo: M12.2A — TMPL-02 con matrículas reales
 *
 * Este servicio es exclusivamente de lectura. Resuelve las entidades
 * autoritativas por sus IDs y nunca persiste, completa ni infiere datos.
 */

import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { StudentRepository } from '../repositories/student-repository.js';
import { ProgramRepository } from '../repositories/program-repository.js';
import { ModuleRepository } from '../repositories/module-repository.js';
import { PeriodRepository } from '../repositories/period-repository.js';
import { InstitutionService } from './institution-service.js';
import { ValidationError } from './error-service.js';
import { CONFIG } from '../config.js';
import { getDB } from '../db/database.js';
import { AcademicContextAuthorityService } from './academic-context-authority-service.js';
import { AttendanceV2Repository } from '../repositories/attendance-v2-repository.js';
import { AttendanceDocumentContextService } from './attendance-document-context-service.js';

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Lectura IndexedDB fallida.'));
  });
}

function textOrEmpty(value) {
  return value === null || value === undefined ? '' : String(value);
}

function buildStudentDisplayName(student) {
  const surnames = [student?.apellidoPaterno, student?.apellidoMaterno]
    .map(textOrEmpty)
    .map(value => value.trim())
    .filter(Boolean)
    .join(' ');
  const names = textOrEmpty(student?.nombres).trim();

  if (surnames && names) return `${surnames}, ${names}`;
  if (surnames || names) return surnames || names;
  return textOrEmpty(student?.nombresCompletoOriginal).trim();
}

export class DocumentDataService {
  constructor(dependencies = {}) {
    this.enrollmentRepo = dependencies.enrollmentRepo || new EnrollmentRepository();
    this.studentRepo = dependencies.studentRepo || new StudentRepository();
    this.programRepo = dependencies.programRepo || new ProgramRepository();
    this.moduleRepo = dependencies.moduleRepo || new ModuleRepository();
    this.periodRepo = dependencies.periodRepo || new PeriodRepository();
    this.institutionService = dependencies.institutionService || InstitutionService;
  }

  /**
   * Busca matrículas reales. Los campos desnormalizados solo se usan para
   * localizar y rotular resultados; nunca alimentan el payload documental.
   */
  async searchEnrollments(query = '') {
    const results = await this.enrollmentRepo.searchEnrollments(textOrEmpty(query).trim());
    return results.map(enrollment => ({ ...enrollment }));
  }

  /**
   * Construye el contexto documental autoritativo de una matrícula.
   * Joins: matriculas.estudianteId -> estudiantes.id
   *        matriculas.programaId   -> programas.id
   *        matriculas.moduloId     -> modulos.id (solo cuando existe)
   *        matriculas.periodoId    -> periodos.id (solo cuando existe)
   */
  async buildEnrollmentContext(enrollmentId) {
    const normalizedId = textOrEmpty(enrollmentId).trim();
    if (!normalizedId) {
      throw new ValidationError('Debe seleccionar una matrícula para construir el contexto documental.');
    }

    const enrollment = await this.enrollmentRepo.getById(normalizedId);
    if (!enrollment) {
      throw new ValidationError(`La matrícula "${normalizedId}" no existe en ${CONFIG.DB.NAME}.`);
    }
    if (!enrollment.estudianteId) {
      throw new ValidationError(`La matrícula "${normalizedId}" no tiene estudianteId vinculado.`);
    }
    if (!enrollment.programaId) {
      throw new ValidationError(`La matrícula "${normalizedId}" no tiene programaId vinculado.`);
    }

    const groupRecord = CONFIG.IS_V2_CANDIDATE
      ? (await new AcademicContextAuthorityService().resolveEnrollment(normalizedId)).group : null;

    const [studentRecord, programRecord, institutionProfile] = await Promise.all([
      this.studentRepo.getById(enrollment.estudianteId),
      this.programRepo.getById(enrollment.programaId),
      this.institutionService.getInstitutionProfile()
    ]);

    if (!studentRecord) {
      throw new ValidationError(`No existe el estudiante vinculado "${enrollment.estudianteId}".`);
    }
    if (!programRecord) {
      throw new ValidationError(`No existe el programa vinculado "${enrollment.programaId}".`);
    }

    const [moduleRecord, periodRecord] = await Promise.all([
      (CONFIG.IS_V2_CANDIDATE ? groupRecord.moduloId : enrollment.moduloId)
        ? this.moduleRepo.getById(CONFIG.IS_V2_CANDIDATE ? groupRecord.moduloId : enrollment.moduloId) : Promise.resolve(null),
      (CONFIG.IS_V2_CANDIDATE ? groupRecord.periodoId : enrollment.periodoId)
        ? this.periodRepo.getById(CONFIG.IS_V2_CANDIDATE ? groupRecord.periodoId : enrollment.periodoId) : Promise.resolve(null)
    ]);
    if ((CONFIG.IS_V2_CANDIDATE ? groupRecord.moduloId : enrollment.moduloId) && (!moduleRecord || moduleRecord.programaId !== enrollment.programaId)) {
      throw new ValidationError('El módulo de la matrícula no existe o pertenece a otro programa.');
    }
    if ((CONFIG.IS_V2_CANDIDATE ? groupRecord.periodoId : enrollment.periodoId) && !periodRecord) {
      throw new ValidationError('El periodo vinculado a la matrícula no existe.');
    }

    return {
      institution: { ...(institutionProfile || {}) },
      confirmedSources: Array.isArray(institutionProfile?.confirmedSources)
        ? [...institutionProfile.confirmedSources] : [],
      student: {
        id: textOrEmpty(studentRecord.id),
        numeroDocumento: textOrEmpty(studentRecord.numeroDocumento),
        apellidosNombres: buildStudentDisplayName(studentRecord),
        apellidoPaterno: textOrEmpty(studentRecord.apellidoPaterno),
        apellidoMaterno: textOrEmpty(studentRecord.apellidoMaterno),
        nombres: textOrEmpty(studentRecord.nombres),
        sexo: textOrEmpty(studentRecord.sexo),
        fechaNacimiento: textOrEmpty(studentRecord.fechaNacimiento)
      },
      enrollment: { ...enrollment },
      group: groupRecord ? { ...groupRecord } : {},
      program: { ...programRecord },
      module: moduleRecord ? { ...moduleRecord } : {},
      period: periodRecord ? { ...periodRecord } : {},
      units: [],
      curriculum: { units: [], subsanacionUnits: [], credits: '', hours: '' },
      academicRecord: {},
      efsrt: {},
      closure: {},
      source: {
        enrollmentId: textOrEmpty(enrollment.id),
        studentId: textOrEmpty(studentRecord.id),
        groupCode: textOrEmpty(enrollment.grupoCode),
        groupId: textOrEmpty(enrollment.grupoId)
      }
    };
  }

  /**
   * ACADEMIC-CONTEXT-01: contexto de grupo de solo lectura. No se conecta
   * todavía a TMPL-01 ni se resuelve periodo/currículo por similitud.
   */
  async buildGroupContext(groupCode) {
    const code = textOrEmpty(groupCode).trim();
    if (!code) throw new ValidationError('Seleccione un grupo real para construir el contexto.');
    const authority = CONFIG.IS_V2_CANDIDATE ? await new AcademicContextAuthorityService().resolveMembers(code) : null;
    const groupRecord = authority?.group || null;
    const enrollments = CONFIG.IS_V2_CANDIDATE
      ? authority.members
      : await this.enrollmentRepo.getByGrupoCode(code);
    if (!enrollments.length || (CONFIG.IS_V2_CANDIDATE
      ? enrollments.some(item => item.grupoId !== code)
      : enrollments.some(item => item.grupoCode !== code))) {
      throw new ValidationError('El grupo no tiene matrículas reales vinculadas.');
    }
    const programIds = new Set(enrollments.map(item => item.programaId));
    const moduleIds = new Set(enrollments.map(item => item.moduloId || null));
    const periodIds = new Set(enrollments.map(item => item.periodoId || null));
    if (programIds.size !== 1 || (!CONFIG.IS_V2_CANDIDATE && (moduleIds.size !== 1 || periodIds.size !== 1))) {
      throw new ValidationError('El grupo es inconsistente y no puede alimentar documentos oficiales.');
    }
    if (groupRecord && groupRecord.programaId !== [...programIds][0]) throw new ValidationError('INCONSISTENCY: programas divergentes.');
    const programId = groupRecord?.programaId || [...programIds][0];
    const moduleId = CONFIG.IS_V2_CANDIDATE ? groupRecord.moduloId || null : [...moduleIds][0];
    if (!programId || enrollments.some(item => !item.estudianteId)) {
      throw new ValidationError('El grupo tiene vínculos de programa o estudiante incompletos.');
    }
    const [program, module, institution, ...students] = await Promise.all([
      this.programRepo.getById(programId),
      moduleId ? this.moduleRepo.getById(moduleId) : Promise.resolve(null),
      this.institutionService.getInstitutionProfile(),
      ...enrollments.map(item => this.studentRepo.getById(item.estudianteId))
    ]);
    if (!program || (moduleId && (!module || module.programaId !== programId)) || students.some(student => !student)) {
      throw new ValidationError('Falta una fuente vinculada o el módulo no pertenece al programa del grupo.');
    }
    return {
      groupCode: groupRecord?.codigoVisible || code,
      group: groupRecord ? { ...groupRecord } : {},
      program: { ...program },
      module: module ? { ...module } : {},
      enrollments: enrollments.map(item => ({ ...item })),
      students: students.map(student => ({ ...student })),
      institution: { ...(institution || {}) },
      period: {}, units: [], curriculum: { units: [], subsanacionUnits: [], credits: '', hours: '' },
      source: { groupCode: groupRecord?.sourceGroupCode || code, groupId: groupRecord?.id || '', programaId: programId, moduloId: moduleId,
        enrollmentIds: enrollments.map(item => item.id), periodStatus: 'BLOCKED_B007',
        curriculumStatus: 'BLOCKED_B002' }
    };
  }

  /** Contexto canónico TMPL-05–10. Solo lectura; no habilita emisión oficial. */
  async buildAttendanceDocumentContext({ groupId, unidadId, periodoId, testOnly = false }) {
    const repository = new AttendanceV2Repository(() => getDB());
    return new AttendanceDocumentContextService({ repository })
      .buildAttendanceDocumentContext({ groupId, unidadId, periodoId, testOnly });
  }
}
