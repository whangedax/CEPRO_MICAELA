/** ACADEMIC-CONTEXT-01: grupos reales y módulo confirmado, sin inferencias. */
import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { ProgramRepository } from '../repositories/program-repository.js';
import { ModuleRepository } from '../repositories/module-repository.js';
import { getDB } from '../db/database.js';
import { ValidationError, OperationalError } from './error-service.js';
import { CONFIG } from '../config.js';
import { V2GroupAssignmentService } from '../v2-candidate/candidate-services.js';

const moduleIdOf = enrollment => enrollment.moduloId || null;
const periodIdOf = enrollment => enrollment.periodoId || null;

export class GroupAssignmentService {
  constructor({ enrollmentRepo, programRepo, moduleRepo, dbProvider } = {}) {
    this.enrollmentRepo = enrollmentRepo || new EnrollmentRepository();
    this.programRepo = programRepo || new ProgramRepository();
    this.moduleRepo = moduleRepo || new ModuleRepository();
    this.dbProvider = dbProvider || getDB;
  }

  async listGroups() {
    if (CONFIG.IS_V2_CANDIDATE) {
      const rows = await new V2GroupAssignmentService(this.dbProvider).listGroups();
      const groups = rows.map(group => ({
        groupId: group.id,
        groupCode: group.codigoVisible || group.sourceGroupCode || group.id,
        sourceGroupCode: group.sourceGroupCode || null,
        programaId: group.programaId,
        program: group.program,
        moduloId: group.moduloId || null,
        module: group.module,
        periodoId: group.periodoId || null,
        enrollmentCount: group.enrollmentCount,
        enrollmentIds: [],
        status: group.contextInconsistencies?.length || group.estado === 'INCONSISTENT' ? 'INCONSISTENTE' :
          group.estado === 'REVIEW_REQUIRED' ? 'REVISION_REQUERIDA' :
          (group.moduloId ? 'ASIGNADO_CONFIRMADO' : 'SIN_ASIGNAR')
      }));
      return { groups, groupsTotal: groups.length,
        groupsAssigned: groups.filter(item => item.status === 'ASIGNADO_CONFIRMADO').length,
        groupsUnassigned: groups.filter(item => item.status === 'SIN_ASIGNAR').length,
        groupsInconsistent: groups.filter(item => item.status === 'INCONSISTENTE').length,
        groupsReviewRequired: groups.filter(item => item.status === 'REVISION_REQUERIDA').length,
        b004CandidateForPhysicalConfirmation: false, b004Resolved: false };
    }
    const [enrollments, programs, modules] = await Promise.all([
      this.enrollmentRepo.list(), this.programRepo.list(), this.moduleRepo.list()
    ]);
    const byCode = new Map();
    for (const enrollment of enrollments) {
      const code = String(enrollment.grupoCode || '').trim();
      if (!code) throw new OperationalError('Hay matrículas sin grupo registrado; no se puede inferir un grupo.');
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push(enrollment);
    }
    const programMap = new Map(programs.map(program => [program.id, program]));
    const moduleMap = new Map(modules.map(module => [module.id, module]));
    const groups = [...byCode].map(([groupCode, members]) => {
      const programIds = new Set(members.map(member => member.programaId));
      const moduleIds = new Set(members.map(moduleIdOf));
      const periodIds = new Set(members.map(periodIdOf));
      const programaId = programIds.size === 1 ? [...programIds][0] : null;
      const moduloId = moduleIds.size === 1 ? [...moduleIds][0] : null;
      const program = programaId ? programMap.get(programaId) : null;
      const module = moduloId ? moduleMap.get(moduloId) : null;
      let status = 'INCONSISTENTE';
      if (programIds.size === 1 && program && moduleIds.size === 1 && periodIds.size === 1) {
        if (moduloId === null) status = 'SIN_ASIGNAR';
        else if (module && module.programaId === programaId) status = 'ASIGNADO_CONFIRMADO';
      }
      return {
        groupCode, programaId, program: program ? { ...program } : null,
        moduloId, module: module ? { ...module } : null,
        periodoId: periodIds.size === 1 ? [...periodIds][0] : null,
        enrollmentIds: members.map(member => member.id).sort(),
        enrollmentCount: members.length, status
      };
    }).sort((a, b) => a.groupCode.localeCompare(b.groupCode));
    return {
      groups,
      groupsTotal: groups.length,
      groupsAssigned: groups.filter(group => group.status === 'ASIGNADO_CONFIRMADO').length,
      groupsUnassigned: groups.filter(group => group.status === 'SIN_ASIGNAR').length,
      groupsInconsistent: groups.filter(group => group.status === 'INCONSISTENTE').length,
      b004CandidateForPhysicalConfirmation: groups.length > 0 &&
        groups.every(group => group.status === 'ASIGNADO_CONFIRMADO'),
      b004Resolved: false // confirmación física del usuario sigue siendo necesaria
    };
  }

  async getGroup(groupCode) {
    if (CONFIG.IS_V2_CANDIDATE) {
      const opened = await new V2GroupAssignmentService(this.dbProvider).getGroup(groupCode);
      const summary = await this.listGroups();
      const row = summary.groups.find(item => item.groupId === groupCode);
      if (!row) throw new ValidationError('El grupo académico no existe.');
      return { ...row, enrollmentIds: opened.enrollments.map(item => item.id).sort() };
    }
    const summary = await this.listGroups();
    const group = summary.groups.find(item => item.groupCode === groupCode);
    if (!group) throw new ValidationError('El grupo seleccionado no tiene matrículas reales.');
    return group;
  }

  async modulesForProgram(programaId) {
    if (!programaId) return [];
    return (await this.moduleRepo.getByProgramId(programaId)).map(module => ({ ...module }));
  }

  /**
   * La confirmación de UI no basta: revalidar módulo, programa, grupo y estado
   * dentro de una única transacción IDB con auditoría atómica.
   */
  async assignModule({ groupCode, groupId, moduloId, confirmed = false, changeConfirmed = false,
    expectedProgramId, expectedCount, expectedPreviousModuloId = null,
    expectedPeriodId, expectedEnrollmentIds, operator = 'SECRETARIA_LOCAL' } = {}) {
    if (CONFIG.IS_V2_CANDIDATE) {
      if (!groupId || groupCode) throw new ValidationError('La asignación v2 exige groupId y prohíbe groupCode como identidad.');
      return new V2GroupAssignmentService(this.dbProvider).assignModule({
        groupId, moduloId, confirmed, operator, changeConfirmed,
        expectedProgramId, expectedCount, expectedPreviousModuloId, expectedPeriodId
      }).then(result => ({ ...result, affectedCount: 0 }));
    }
    const code = String(groupCode || '').trim();
    const targetId = String(moduloId || '').trim();
    if (!code || !targetId) throw new ValidationError('Seleccione un grupo real y un módulo oficial.');
    if (confirmed !== true) throw new ValidationError('Debe confirmar explícitamente la asignación antes de guardarla.');
    if (!expectedProgramId || !Number.isInteger(expectedCount) || expectedCount < 1) {
      throw new ValidationError('El resumen de impacto del grupo está incompleto; vuelva a abrirlo.');
    }

    const db = this.dbProvider();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['matriculas', 'programas', 'modulos', 'auditoria'], 'readwrite');
      const enrollmentStore = tx.objectStore('matriculas');
      const moduleStore = tx.objectStore('modulos');
      const programStore = tx.objectStore('programas');
      let failure = null;
      let outcome = null;
      const abort = error => {
        failure = error;
        try { tx.abort(); } catch { reject(error); }
      };
      tx.oncomplete = () => resolve(outcome);
      tx.onabort = () => reject(failure || new OperationalError('La asignación de grupo se canceló; no hubo cambios parciales.'));
      tx.onerror = () => { /* onabort entrega el error final */ };

      const groupRequest = enrollmentStore.index('grupoCode').getAll(code);
      const moduleRequest = moduleStore.get(targetId);
      const programRequest = programStore.get(expectedProgramId);
      let pending = 3;
      const validateAndQueue = () => {
        if (--pending !== 0 || failure) return;
        const members = groupRequest.result || [];
        const module = moduleRequest.result;
        const program = programRequest.result;
        if (!members.length || members.length !== expectedCount) {
          abort(new ValidationError('Cambió el número de matrículas del grupo. Revise el impacto antes de guardar.')); return;
        }
        if (!program || members.some(member => member.grupoCode !== code || member.programaId !== expectedProgramId)) {
          abort(new ValidationError('El programa del grupo es inconsistente; no se realizó la asignación.')); return;
        }
        const periodIds = new Set(members.map(periodIdOf));
        if (periodIds.size !== 1 || (expectedPeriodId !== undefined && [...periodIds][0] !== expectedPeriodId)) {
          abort(new ValidationError('El periodo del grupo cambió o es mixto. Revise el impacto antes de guardar.')); return;
        }
        const actualIds = members.map(item => item.id).sort();
        if (expectedEnrollmentIds && (expectedEnrollmentIds.length !== members.length ||
          expectedEnrollmentIds.slice().sort().some((id, index) => id !== actualIds[index]))) {
          abort(new ValidationError('Cambió la composición del grupo. Revise el impacto antes de guardar.')); return;
        }
        if (!module || module.programaId !== expectedProgramId) {
          abort(new ValidationError('El módulo seleccionado no pertenece al programa del grupo.')); return;
        }
        const currentIds = new Set(members.map(moduleIdOf));
        if (currentIds.size !== 1) {
          abort(new ValidationError('El grupo tiene módulos mixtos; requiere revisión administrativa antes de asignar.')); return;
        }
        const previousId = [...currentIds][0];
        if (previousId !== expectedPreviousModuloId) {
          abort(new ValidationError('El módulo actual cambió. Revise la asignación antes de continuar.')); return;
        }
        if (previousId === targetId) {
          abort(new ValidationError('El grupo ya tiene ese módulo; no se realizó ningún cambio.')); return;
        }
        if (previousId && changeConfirmed !== true) {
          abort(new ValidationError('Para cambiar un módulo asignado debe usar la acción explícita Cambiar módulo.')); return;
        }
        const timestamp = new Date().toISOString();
        const action = previousId ? 'CAMBIO_MODULO_GRUPO_CONFIRMADO' : 'ASIGNACION_MODULO_GRUPO_CONFIRMADA';
        for (const member of members) {
          enrollmentStore.put({ ...member, moduloId: targetId,
            incidencias: (member.incidencias || []).filter(issue => issue.codigo !== 'MODULO_PENDIENTE'),
            fechaActualizacion: timestamp });
        }
        const auditId = `AUD-GROUP-${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        tx.objectStore('auditoria').add({
          id: auditId, timestamp, fechaHora: timestamp, entidad: 'MATRICULAS',
          entidadId: code, idEntidad: code, accion: action, tipoOperacion: action,
          estadoAnterior: { groupCode: code, programaId: expectedProgramId, moduloId: previousId },
          estadoNuevo: { groupCode: code, programaId: expectedProgramId, moduloId: targetId,
            matriculasAfectadas: members.length },
          origen: { usuarioOperador: operator, pantalla: 'Programas/AsignacionGrupos' }
        });
        outcome = { groupCode: code, programaId: expectedProgramId,
          previousModuloId: previousId, moduloId: targetId, affectedCount: members.length,
          action, auditId, timestamp };
      };
      groupRequest.onsuccess = validateAndQueue;
      moduleRequest.onsuccess = validateAndQueue;
      programRequest.onsuccess = validateAndQueue;
    });
  }
}
