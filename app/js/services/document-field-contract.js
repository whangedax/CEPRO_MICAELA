/** Declaración única de fuentes documentales; no consulta IndexedDB ni infiere datos. */
export const FIELD_STATUSES = Object.freeze({
  CONFIRMED: 'CONFIRMED', MISSING: 'MISSING', UNCONFIRMED: 'UNCONFIRMED',
  BLOCKED: 'BLOCKED', REVIEW_REQUIRED: 'REVIEW_REQUIRED', UNMAPPED: 'UNMAPPED',
  NOT_APPLICABLE: 'NOT_APPLICABLE', FIXED_IN_TEMPLATE: 'FIXED_IN_TEMPLATE'
});
export const SOURCE_CATEGORIES = Object.freeze([
  'institution', 'student', 'enrollment', 'program', 'module', 'period',
  'curriculum', 'attendance', 'evaluation', 'academicRecord', 'efsrt', 'closure',
  'certification', 'title', 'document', 'group'
]);

const define = (key, label, status = FIELD_STATUSES.CONFIRMED, blocker = null, requiredForPreview = false, requiredForOfficialIssue = true) =>
  Object.freeze({ key, label, source: key, requiredForPreview, requiredForOfficialIssue,
    status, blocker, emptyPolicy: 'BLANK', formatter: null });
const confirmed = (key, label, preview = false) => define(key, label, FIELD_STATUSES.CONFIRMED, null, preview);
const unconfirmed = (key, label) => define(key, label, FIELD_STATUSES.UNCONFIRMED);
const blocked = (key, label, blocker) => define(key, label, FIELD_STATUSES.BLOCKED, blocker);
const fixed = (key, label, blocker = null) => Object.freeze({ key, label, source: 'template',
  requiredForPreview: false, requiredForOfficialIssue: Boolean(blocker),
  status: FIELD_STATUSES.FIXED_IN_TEMPLATE, blocker, emptyPolicy: 'BLANK', formatter: null });

export const DOCUMENT_FIELDS = Object.freeze({
  'institution.nombre': confirmed('institution.nombre', 'Nombre CETPRO', true),
  'institution.tipoGestion': confirmed('institution.tipoGestion', 'Tipo de Gestión'),
  'institution.resolucion': confirmed('institution.resolucion', 'Resoluciones'),
  'institution.dre': unconfirmed('institution.dre', 'DRE'),
  'institution.codigoModular': unconfirmed('institution.codigoModular', 'Código Modular'),
  'institution.departamento': unconfirmed('institution.departamento', 'Departamento'),
  'institution.provincia': unconfirmed('institution.provincia', 'Provincia'),
  'institution.distrito': unconfirmed('institution.distrito', 'Distrito'),
  'institution.direccion': confirmed('institution.direccion', 'Dirección'),
  'institution.telefono': confirmed('institution.telefono', 'Teléfono'),
  'institution.resolucionCreacion': unconfirmed('institution.resolucionCreacion', 'Resolución de creación'),
  'institution.resolucionConversion': unconfirmed('institution.resolucionConversion', 'Resolución de conversión'),
  'institution.resolucionPrograma': unconfirmed('institution.resolucionPrograma', 'Resolución del programa'),
  'institution.resolucionModulo': unconfirmed('institution.resolucionModulo', 'Resolución del módulo'),
  'program.nombre': confirmed('program.nombre', 'Programa de estudios', true),
  'program.nivelFormativo': unconfirmed('program.nivelFormativo', 'Nivel Formativo'),
  'program.tipoPlan': unconfirmed('program.tipoPlan', 'Tipo de Plan de estudios'),
  'student.numeroDocumento': confirmed('student.numeroDocumento', 'Número de Documento'),
  'student.apellidosNombres': confirmed('student.apellidosNombres', 'Apellidos y nombres', true),
  'student.apellidoPaterno': confirmed('student.apellidoPaterno', 'Apellido paterno'),
  'student.apellidoMaterno': confirmed('student.apellidoMaterno', 'Apellido materno'),
  'student.nombres': confirmed('student.nombres', 'Nombres'),
  'student.fechaNacimiento': confirmed('student.fechaNacimiento', 'Fecha de nacimiento'),
  'enrollment.grupoCode': confirmed('enrollment.grupoCode', 'Grupo técnico'),
  'enrollment.seccion': unconfirmed('enrollment.seccion', 'Sección'),
  'module.nombre': blocked('module.nombre', 'Módulo Formativo', 'B-004'),
  'period.nombre': blocked('period.nombre', 'Periodo Lectivo / Académico', 'B-007'),
  'period.fechaInicio': blocked('period.fechaInicio', 'Fecha de inicio', 'B-007'),
  'period.fechaFin': blocked('period.fechaFin', 'Fecha de término', 'B-007'),
  'period.clase': unconfirmed('period.clase', 'Periodo de Clase'),
  'curriculum.units': blocked('curriculum.units', 'Unidades Didácticas', 'B-002'),
  'curriculum.subsanacionUnits': blocked('curriculum.subsanacionUnits', 'Unidades de Subsanación', 'B-002'),
  'curriculum.credits': blocked('curriculum.credits', 'Créditos', 'B-002'),
  'curriculum.hours': blocked('curriculum.hours', 'Horas', 'B-002'),
  'curriculum.capabilities': blocked('curriculum.capabilities', 'Capacidades', 'B-002'),
  'curriculum.indicators': blocked('curriculum.indicators', 'Indicadores de Logro', 'B-002'),
  'academicRecord.attendance': blocked('academicRecord.attendance', 'Asistencia', 'B-002'),
  'academicRecord.absencePercent': blocked('academicRecord.absencePercent', 'Porcentaje de inasistencias', 'B-003'),
  'academicRecord.evaluations': blocked('academicRecord.evaluations', 'Evaluaciones', 'B-002'),
  'academicRecord.outcome': blocked('academicRecord.outcome', 'Resultado académico', 'B-003'),
  'efsrt.experiences': blocked('efsrt.experiences', 'Experiencias EFSRT', 'B-005'),
  'efsrt.hours': blocked('efsrt.hours', 'Horas EFSRT', 'B-005'),
  'efsrt.company': blocked('efsrt.company', 'Empresa EFSRT', 'B-005'),
  'closure.result': blocked('closure.result', 'Resultado de cierre', 'B-006'),
  'closure.registrationCode': blocked('closure.registrationCode', 'Código de registro institucional', 'B-006'),
  'closure.orderNumber': unconfirmed('closure.orderNumber', 'Número de orden del estudiante'),
  'template.fixedPeriodLegend': fixed('template.fixedPeriodLegend', 'Leyenda fija AÑO 2026 - I', 'B-007'),
  'template.nivelFormativoLabel': fixed('template.nivelFormativoLabel', 'Rótulo Nivel Formativo'),
  'template.tipoPlanLabel': fixed('template.tipoPlanLabel', 'Rótulo Tipo de Plan de estudios')
});

const keys = (...items) => Object.freeze(items.map(key => DOCUMENT_FIELDS[key]));
const ud = ['program.nombre', 'period.nombre', 'module.nombre', 'curriculum.units', 'student.apellidosNombres'];

/** 01/02 son contratos activos; 03–21 son cobertura preliminar, NO renderizable. */
export const TEMPLATE_FIELD_CONTRACTS = Object.freeze({
  'TMPL-01': keys('institution.nombre', 'institution.tipoGestion', 'institution.codigoModular',
    'institution.resolucionCreacion', 'institution.resolucionConversion', 'institution.provincia',
    'institution.distrito', 'institution.direccion', 'program.nombre', 'module.nombre',
    'institution.resolucionModulo', 'period.fechaInicio', 'period.fechaFin', 'enrollment.seccion',
    'student.apellidosNombres', 'student.fechaNacimiento', 'curriculum.units', 'curriculum.credits'),
  'TMPL-02': keys('institution.nombre', 'institution.dre', 'institution.codigoModular',
    'institution.departamento', 'institution.provincia', 'institution.distrito',
    'institution.tipoGestion', 'institution.resolucion', 'program.nombre', 'module.nombre',
    'period.nombre', 'student.numeroDocumento', 'student.apellidosNombres',
    'period.clase', 'curriculum.units', 'curriculum.subsanacionUnits', 'curriculum.credits', 'curriculum.hours',
    'program.nivelFormativo', 'program.tipoPlan', 'template.nivelFormativoLabel',
    'template.tipoPlanLabel', 'template.fixedPeriodLegend'),
  'TMPL-03': keys('institution.codigoModular', 'institution.nombre', 'program.nombre',
    'institution.resolucionPrograma', 'module.nombre', 'student.numeroDocumento',
    'student.apellidoPaterno', 'student.apellidoMaterno', 'student.nombres', 'student.fechaNacimiento',
    'template.fixedPeriodLegend'),
  'TMPL-04': keys('program.nombre', 'module.nombre', 'institution.dre', 'institution.tipoGestion'),
  'TMPL-05': keys(...ud, 'student.numeroDocumento', 'academicRecord.attendance', 'academicRecord.absencePercent'),
  'TMPL-06': keys(...ud, 'student.numeroDocumento', 'academicRecord.attendance', 'academicRecord.absencePercent'),
  'TMPL-07': keys(...ud, 'student.numeroDocumento', 'academicRecord.attendance', 'academicRecord.absencePercent'),
  'TMPL-08': keys(...ud, 'student.numeroDocumento', 'academicRecord.attendance', 'academicRecord.absencePercent'),
  'TMPL-09': keys(...ud, 'student.numeroDocumento', 'academicRecord.attendance', 'academicRecord.absencePercent'),
  'TMPL-10': keys(...ud, 'student.numeroDocumento', 'academicRecord.attendance', 'academicRecord.absencePercent'),
  'TMPL-11': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-12': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-13': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-14': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-15': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-16': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-17': keys(...ud, 'curriculum.capabilities', 'curriculum.indicators', 'academicRecord.evaluations'),
  'TMPL-18': keys('institution.nombre', 'module.nombre', 'efsrt.hours', 'efsrt.experiences',
    'efsrt.company', 'student.apellidosNombres'),
  'TMPL-19': keys('institution.nombre', 'institution.tipoGestion', 'institution.codigoModular',
    'institution.resolucionCreacion', 'institution.resolucionConversion', 'institution.dre',
    'institution.provincia', 'institution.distrito', 'institution.direccion', 'program.nombre',
    'module.nombre', 'period.nombre', 'curriculum.units', 'curriculum.credits', 'curriculum.hours',
    'academicRecord.outcome', 'student.numeroDocumento', 'student.apellidosNombres'),
  'TMPL-20': keys('program.nombre', 'module.nombre', 'curriculum.units', 'curriculum.credits',
    'curriculum.hours', 'curriculum.capabilities', 'closure.result', 'closure.registrationCode', 'closure.orderNumber'),
  'TMPL-21': keys('closure.result', 'closure.registrationCode', 'closure.orderNumber')
});

export function readSource(context, source) {
  if (!source || source === 'template') return '';
  if (source === 'institution.resolucion') {
    const separate = [context?.institution?.resolucionAutorizacion1, context?.institution?.resolucionAutorizacion2]
      .map(value => typeof value === 'string' ? value.trim() : '').filter(Boolean);
    if (separate.length) return separate.join(' / ');
  }
  const segments = source.split('.');
  if (!SOURCE_CATEGORIES.includes(segments[0])) return '';
  let value = context;
  for (const segment of segments) value = value?.[segment];
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.length ? value : '';
  return typeof value === 'object' ? '' : String(value);
}

export function resolveDocumentFields(templateId, context = {}) {
  const fields = TEMPLATE_FIELD_CONTRACTS[templateId] || [];
  const confirmedSources = new Set(context.confirmedSources || []);
  return fields.map(field => {
    const raw = readSource(context, field.source);
    const confirmed = field.status === FIELD_STATUSES.CONFIRMED || confirmedSources.has(field.source);
    const status = field.status === FIELD_STATUSES.FIXED_IN_TEMPLATE ? FIELD_STATUSES.FIXED_IN_TEMPLATE
      : field.blocker ? FIELD_STATUSES.BLOCKED
        : !confirmed ? FIELD_STATUSES.UNCONFIRMED
          : raw === '' ? FIELD_STATUSES.MISSING : FIELD_STATUSES.CONFIRMED;
    const value = status === FIELD_STATUSES.CONFIRMED ? raw : '';
    return { ...field, status, value, emptyReason: status === FIELD_STATUSES.BLOCKED ? field.blocker
      : status === FIELD_STATUSES.UNCONFIRMED ? 'sin fuente oficial'
        : status === FIELD_STATUSES.MISSING ? 'dato ausente' : null };
  });
}

export function buildFieldCoverage() {
  return Object.values(DOCUMENT_FIELDS).map(field => ({ ...field,
    templates: Object.entries(TEMPLATE_FIELD_CONTRACTS)
      .filter(([, fields]) => fields.some(item => item.key === field.key))
      .map(([templateId]) => templateId) }));
}
