const { saveSettings } = require('./offline-documents.cjs');

function configuredPlan(core, moduleId, programId, periodId) {
  const module = core.record('modules', moduleId);
  const record = core.record('documentSettings', 'curriculum:' + moduleId);
  const fields = record?.fields;
  if (!module || module.archived || module.programaId !== programId || record?.archived ||
      fields?.year !== '2026' || fields.periodId !== periodId) return null;
  let units;
  try {
    units = JSON.parse(fields.unitsJson);
  } catch {
    return null;
  }
  if (!Array.isArray(units) || !units.length ||
      units.some(unit => typeof unit?.code !== 'string' || !unit.code)) return null;
  const codes = units.map(unit => unit.code);
  if (new Set(codes).size !== codes.length) return null;
  return { periodId: fields.periodId, units: codes };
}

function sameCodes(left, right) {
  return left.length === right.length && right.every(code => left.includes(code));
}

function canExtendAssignments(core, teacher) {
  return (teacher.assignments || []).every(assignment => {
    const group = core.record('groups', assignment.groupId);
    return group && !group.archived && group.periodId && group.moduleId &&
      Array.isArray(assignment.units) && assignment.units.length > 0 &&
      assignment.units.every(code => group.units.includes(code)) &&
      core.assignment(teacher, group.id);
  });
}

// Completa únicamente las correspondencias de aulas publicadas en la carga oficial de 2026.
function prepareModuleClassrooms(core, actor) {
  const summary = { created: [], assigned: [], skipped: [] };
  const status = core.status();
  if (!status.initialized || !status.authority) return summary;
  const users = core.users();
  const director = actor || users.find(user => user.active && !user.archived && user.role === 'DIRECTOR');
  if (!director) return summary;
  core.requireRole(director, ['DIRECTOR']);
  const { FILE_CLASSROOM_MAPPING } = require('./import-real-bd-2026.cjs');
  const changedTeachers = new Map();

  return core.transaction(() => {
    const teachers = core.users();
    for (const mapping of FILE_CLASSROOM_MAPPING) {
      const sourcePlan = configuredPlan(core, mapping.moduleId, mapping.programId, '2026-I');
      const targetPlan = configuredPlan(core, mapping.module2Id, mapping.programId, '2026-II');
      if (!sourcePlan || !targetPlan) continue;

      for (const section of mapping.sections) {
        const source = core.record('groups', section.id);
        if (!source || source.archived || source.programId !== mapping.programId ||
            source.moduleId !== mapping.moduleId || source.periodId !== sourcePlan.periodId) continue;

        const targetId = section.id + '-M2';
        const config = core.record('documentSettings', 'group:' + source.id)?.fields || {};
        const sourceTurn = source.turno || config.turno || mapping.turno;
        const sourceModality = source.modalidad || config.modalidad || mapping.modalidad;
        const normalized = value => String(value || '').trim().toLocaleLowerCase('es');
        const matches = core.records('groups').filter(group => {
          if (group.programId !== mapping.programId || group.moduleId !== mapping.module2Id ||
              group.periodId !== targetPlan.periodId) return false;
          if (group.sourceGroupId && group.sourceGroupId !== source.id) return false;
          const fields = core.record('documentSettings', 'group:' + group.id)?.fields || {};
          return core.groupSection(group) === core.groupSection(source) &&
            normalized(group.turno || fields.turno) === normalized(sourceTurn) &&
            normalized(group.modalidad || fields.modalidad) === normalized(sourceModality);
        });
        const namedTarget = core.record('groups', targetId);
        if (matches.length > 1 || (namedTarget && matches.some(group => group.id !== targetId))) {
          summary.skipped.push({ sourceGroupId: source.id, reason: 'AMBIGUOUS_TARGET' });
          continue;
        }
        let target = namedTarget || matches[0];
        if (target && (target.archived || !matches.some(group => group.id === target.id) || target.programId !== mapping.programId ||
            target.moduleId !== mapping.module2Id || target.periodId !== targetPlan.periodId)) {
          summary.skipped.push({ sourceGroupId: source.id, reason: 'TARGET_CONFLICT' });
          continue;
        }

        if (!target) {
          const period = core.record('documentSettings', 'academicPeriod:' + targetPlan.periodId)?.fields || {};
          target = core.write(director, 'groups', {
            id: targetId, name: source.name, programId: mapping.programId,
            moduleId: mapping.module2Id, periodId: targetPlan.periodId,
            sourceGroupId: source.id, units: targetPlan.units,
            section: core.groupSection(source), turno: source.turno || config.turno || mapping.turno,
            modalidad: source.modalidad || config.modalidad || mapping.modalidad,
            closed: false, archived: false
          });
          const fields = {
            ciclo: config.ciclo || 'Auxiliar Técnico', seccion: target.section,
            turno: target.turno, modalidad: target.modalidad, periodClase: target.periodId
          };
          if (config.teacherName) fields.teacherName = config.teacherName;
          if (period.fechaInicio) fields.fechaInicio = period.fechaInicio;
          if (period.fechaFin) fields.fechaFin = period.fechaFin;
          saveSettings(core, director, { scope: { kind: 'group', target: target.id }, fields, rev: null });
          summary.created.push(target.id);
        } else {
          // Las asignaciones de un aula existente se gestionan desde Cuentas.
          continue;
        }

        const originalTeacher = teachers.find(user => user.username === mapping.teacherUsername &&
          user.active && !user.archived && user.role === 'DOCENTE');
        if (!originalTeacher || target.closed) continue;
        const teacher = changedTeachers.get(originalTeacher.id) || originalTeacher;
        if (teacher.assignments.some(assignment => assignment.groupId === target.id)) continue;
        const sourceAssignment = teacher.assignments.find(assignment => assignment.groupId === source.id);
        if (!sourceAssignment || !canExtendAssignments(core, teacher) ||
            (sourceAssignment.moduleId && sourceAssignment.moduleId !== source.moduleId) ||
            (sourceAssignment.programId && sourceAssignment.programId !== source.programId) ||
            !sameCodes(source.units || [], sourcePlan.units) ||
            !sameCodes(sourceAssignment.units || [], sourcePlan.units) ||
            !target.units.length || target.units.some(code => !targetPlan.units.includes(code))) {
          summary.skipped.push({ sourceGroupId: source.id, reason: 'ASSIGNMENT_REQUIRES_REVIEW' });
          continue;
        }
        changedTeachers.set(teacher.id, {
          ...teacher,
          assignments: [...teacher.assignments, { groupId: target.id, units: [...target.units] }]
        });
        summary.assigned.push({ userId: teacher.id, groupId: target.id });
      }
    }

    for (const teacher of changedTeachers.values()) {
      core.saveUser(director, { ...teacher, version: teacher.version });
    }
    if (summary.created.length || summary.assigned.length) {
      core.audit('MODULE_CLASSROOMS_PREPARED', director, summary);
      core.setting('module-classrooms-prepared-2026', { ...summary, at: new Date().toISOString() });
    }
    return summary;
  });
}

module.exports = { prepareModuleClassrooms };
