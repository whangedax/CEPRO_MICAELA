/**
 * Helper compartido para resolver el rango de fechas lectivas [fechaInicio, fechaFin]
 * de una Unidad Didáctica en un Aula/Grupo específico.
 * Fuente canónica: documentSettings unitCurriculum > unit > curriculum unitsJson > reference defaults > group > period.
 */
function unitDateRange(core, group, unitCode) {
  if (!group) return { fechaInicio: '2026-03-16', fechaFin: '2026-07-24' };
  const reference = require('./reference-defaults.cjs');
  const ref = reference.get(core, group.moduleId);
  const plan = require('./offline-documents.cjs').curriculumFor(core, group);
  const rows = plan?.unitsJson ? JSON.parse(plan.unitsJson) : [];
  const gConfig = core.record('documentSettings', 'group:' + group.id)?.fields || {};
  const pConfig = core.record('documentSettings', 'academicPeriod:' + group.periodId)?.fields || {};
  const gFechaInicio = group.fechaInicio || gConfig.fechaInicio || pConfig.fechaInicio || null;
  const gFechaFin = group.fechaFin || gConfig.fechaFin || pConfig.fechaFin || null;

  const planUnit = rows.find(u => u.code === unitCode);
  const refUnit = ref?.units?.find(u => u.code === unitCode);
  const merged = reference.merge(refUnit, planUnit) || {};

  const uConfig = core.record('documentSettings', `unit:${group.id}:${unitCode}`)?.fields || {};
  const ucConfig = core.record('documentSettings', `unitCurriculum:${group.id}:${unitCode}`)?.fields || {};

  const fechaInicio = ucConfig.fechaInicio || uConfig.fechaInicio || merged.fechaInicio || gFechaInicio;
  const fechaFin = ucConfig.fechaFin || uConfig.fechaFin || merged.fechaFin || gFechaFin;

  return { fechaInicio, fechaFin, gFechaInicio: gFechaInicio || '2026-03-16', gFechaFin: gFechaFin || '2026-07-24' };
}

module.exports = { unitDateRange };

