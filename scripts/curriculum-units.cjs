/**
 * scripts/curriculum-units.cjs
 * 
 * Gestión flexible de Unidades Didácticas (UDs), Indicadores de Logro Pedagógicos (IL1 a IL5)
 * y Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT).
 * 
 * Regla de Oro Institucional:
 * NUNCA eliminar físicamente una UD que contenga calificaciones registradas.
 * En su lugar, aplicar archivo lógico (archived: true) garantizando la trazabilidad histórica de UGEL.
 */

const DocumentSettings = require('./offline-documents.cjs');

/**
 * Agrega una nueva Unidad Didáctica a la malla curricular de un módulo o aula.
 * @param {object} core - Instancia de OfflineCore
 * @param {object} actor - Usuario con rol DIRECTOR o DOCENTE autorizado
 * @param {object} input - { moduleId, groupId, unit: { code, name, hours, credits, fechaInicio, fechaFin } }
 */
function addCurriculumUnit(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR', 'DOCENTE']);

  const unit = input.unit;
  if (!unit || !unit.code || !unit.name) {
    throw new Error('El código y nombre de la unidad didáctica son obligatorios.');
  }

  const cleanCode = String(unit.code).trim().toUpperCase();
  const hours = Number(unit.hours || 0);
  const credits = Number(unit.credits || 0);

  if (hours <= 0 || credits <= 0) {
    throw new Error('Las horas y créditos de la unidad deben ser valores numéricos positivos.');
  }

  return core.transaction(() => {
    let group = null;
    let moduleId = input.moduleId;

    if (input.groupId) {
      group = core.record('groups', input.groupId);
      if (!group) throw new Error('El aula o grupo especificado no existe.');
      if (actor.role === 'DOCENTE' && !core.assignment(actor, group.id)) {
        throw new Error('No tiene autorización para modificar esta aula.', 403);
      }
      if (!moduleId) moduleId = group.moduleId;
    }

    // 1. Primero actualizar el currículo del módulo si existe
    if (moduleId) {
      const currRecord = core.record('documentSettings', `curriculum:${moduleId}`);
      if (currRecord && currRecord.fields?.unitsJson) {
        let planUnits = [];
        try { planUnits = JSON.parse(currRecord.fields.unitsJson); } catch {}
        if (!planUnits.some(u => u.code === cleanCode)) {
          planUnits.push({
            code: cleanCode,
            name: unit.name,
            hours,
            credits,
            fechaInicio: unit.fechaInicio || '',
            fechaFin: unit.fechaFin || '',
            active: true
          });

          DocumentSettings.saveSettings(core, actor, {
            scope: currRecord.scope,
            rev: currRecord.rev,
            fields: {
              ...currRecord.fields,
              unitsJson: JSON.stringify(planUnits)
            }
          });
        }
      }
    }

    // 2. Si se especificó un grupo, agregarlo a la lista de unidades del aula
    if (group) {
      const existingUnits = group.units || [];
      if (!existingUnits.includes(cleanCode)) {
        const updatedUnits = [...existingUnits, cleanCode];
        core.saveGroup(actor, { ...group, units: updatedUnits });
      }
    }

    core.audit('CURRICULUM_UNIT_ADDED', actor, {
      code: cleanCode,
      name: unit.name,
      hours,
      credits,
      groupId: input.groupId,
      moduleId
    });

    return {
      success: true,
      code: cleanCode,
      message: `Unidad didáctica ${cleanCode} agregada exitosamente.`
    };
  });
}

/**
 * Retira una Unidad Didáctica respetando la regla de archivo lógico si existen notas.
 * @param {object} core - Instancia de OfflineCore
 * @param {object} actor - Usuario con rol DIRECTOR
 * @param {object} input - { groupId, moduleId, unitCode }
 */
function removeCurriculumUnit(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR']);

  const unitCode = String(input.unitCode || '').trim().toUpperCase();
  if (!unitCode) throw new Error('Indique el código de la unidad a retirar.');

  return core.transaction(() => {
    // 1. Verificar si existen notas registradas para esta unidad
    const existingGrades = core.records('grades').filter(g => {
      const matchGroup = !input.groupId || g.groupId === input.groupId;
      return matchGroup && g.unit === unitCode;
    });

    const belongsToUnit = record => (!input.groupId || record.groupId === input.groupId) && record.unit === unitCode;
    const existingAttendance = core.records('attendance').filter(belongsToUnit);
    const existingDocuments = core.records('documentSubmissions').filter(belongsToUnit);
    const hasRecordedGrades = existingGrades.length + existingAttendance.length + existingDocuments.length > 0;

    if (input.groupId) {
      const group = core.record('groups', input.groupId);
      if (!group) throw new Error('El grupo no existe.');

      if (hasRecordedGrades) {
        // APLICAR ARCHIVO LÓGICO: Nunca borrar
        const archivedUnits = [...(group.archivedUnits || [])];
        if (!archivedUnits.includes(unitCode)) archivedUnits.push(unitCode);

        // Actualizar registro en SQLite preservando el array físico units para integridad referencial
        core.write(actor, 'groups', {
          ...group,
          archivedUnits
        }, group.rev);

        core.audit('CURRICULUM_UNIT_ARCHIVED', actor, {
          unitCode,
          groupId: group.id,
          preservedGradesCount: existingGrades.length,
          preservedAttendanceCount: existingAttendance.length,
          preservedDocumentsCount: existingDocuments.length,
          reason: 'Preservación histórica de calificaciones, asistencias y documentos registrados'
        });

        return {
          success: true,
          action: 'ARCHIVED',
          unitCode,
          preservedGradesCount: existingGrades.length,
          preservedAttendanceCount: existingAttendance.length,
          preservedDocumentsCount: existingDocuments.length,
          message: `La unidad ${unitCode} tiene registros académicos. Se archivó lógicamente sin perder notas, asistencias ni documentos.`
        };
      } else {
        // Si NO hay notas, remoción limpia del aula
        const activeUnits = (group.units || []).filter(u => u !== unitCode);
        core.saveGroup(actor, { ...group, units: activeUnits });

        core.audit('CURRICULUM_UNIT_REMOVED', actor, {
          unitCode,
          groupId: group.id,
          reason: 'Sin notas previas'
        });

        return {
          success: true,
          action: 'REMOVED',
          unitCode,
          message: `Unidad didáctica ${unitCode} retirada limpiamente de la lista activa.`
        };
      }
    }

    return { success: true };
  });
}

/**
 * Guarda y actualiza los Indicadores de Logro Pedagógicos (IL1 a IL5) de una Unidad Didáctica.
 */
function saveIndicators(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR', 'DOCENTE']);
  const { groupId, unitCode, indicators } = input;

  if (!groupId || !unitCode) {
    throw new Error('Identificadores de aula y unidad didáctica requeridos.');
  }

  if (actor.role === 'DOCENTE' && !core.assignment(actor, groupId, unitCode)) {
    throw new Error('No tiene asignación en esta unidad didáctica para configurar sus indicadores.', 403);
  }

  const fields = {};
  for (let i = 1; i <= 5; i++) {
    const key = `indicator${i}`;
    if (indicators && Object.hasOwn(indicators, key)) {
      fields[key] = String(indicators[key] || '').trim();
    }
  }

  const scope = { kind: 'unit', target: groupId, unit: unitCode };
  const existing = core.record('documentSettings', `unit:${groupId}:${unitCode}`);

  const saved = DocumentSettings.saveSettings(core, actor, {
    scope,
    rev: existing?.rev || null,
    fields: { ...(existing?.fields || {}), ...fields }
  });

  core.audit('INDICATORS_UPDATED', actor, {
    groupId,
    unitCode,
    indicatorsCount: Object.keys(fields).length
  });

  return {
    success: true,
    scope,
    fields: saved.fields,
    message: 'Indicadores de logro (IL1 a IL5) guardados exitosamente.'
  };
}

/**
 * Configura los parámetros y criterios 1 al 9 de EFSRT.
 */
function savePracticeSettings(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR', 'DOCENTE']);
  const { groupId, enrollmentId, practiceFields } = input;
  const targetId = enrollmentId || groupId;

  if (!targetId) throw new Error('Identificador de matrícula o aula requerido.');

  if (actor.role === 'DOCENTE') {
    const gid = groupId || core.record('enrollments', enrollmentId)?.groupId;
    if (!gid || !core.assignment(actor, gid, 'EFSRT')) {
      throw new Error('No tiene asignación de prácticas EFSRT en esta aula.', 403);
    }
  }

  const scope = { kind: 'practice', target: targetId, unit: 'EFSRT' };
  const existing = core.record('documentSettings', `practice:${targetId}:EFSRT`);

  const allowedKeys = [
    'companyName',
    'companyAddress',
    'efsrtFinalGrade',
    ...Array.from({ length: 9 }, (_, i) => `criterion${i + 1}`)
  ];

  const fields = {};
  for (const k of allowedKeys) {
    if (practiceFields && Object.hasOwn(practiceFields, k)) {
      fields[k] = practiceFields[k];
    }
  }

  const saved = DocumentSettings.saveSettings(core, actor, {
    scope,
    rev: existing?.rev || null,
    fields: { ...(existing?.fields || {}), ...fields }
  });

  core.audit('PRACTICE_SETTINGS_UPDATED', actor, {
    groupId,
    fieldsUpdated: Object.keys(fields)
  });

  return {
    success: true,
    scope,
    fields: saved.fields,
    message: 'Parámetros de prácticas EFSRT actualizados exitosamente.'
  };
}

module.exports = {
  addCurriculumUnit,
  removeCurriculumUnit,
  saveIndicators,
  savePracticeSettings
};
