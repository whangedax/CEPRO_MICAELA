const fs = require('node:fs');
const path = require('node:path');
const field = (key, label, type = 'text', roles = ['DIRECTOR'], options = []) => ({ key, label, type, roles, options });
const ADMIN = ['DIRECTOR','SECRETARIA'], TEACHING = ['DIRECTOR','DOCENTE'];
const SETTINGS_FIELDS = {
  ...require('./academic-config.cjs').schema,
  institution: [field('nombre','Nombre institucional'),field('tipoGestion','Tipo de gestión'),field('codigoModular','Código modular'),field('dre','DRE'),field('ugel','UGEL'),field('region','Región'),field('departamento','Departamento'),field('provincia','Provincia'),field('distrito','Distrito'),field('lugar','Lugar de expedición / servicio'),field('direccion','Dirección'),field('telefono','Teléfono'),field('resolucionAutorizacion','Resolución de creación / autorización'),field('resolucionConversion','Resolución de conversión'),field('directorNombre','Nombre de dirección'),field('secretariaNombre','Nombre de secretaría'),field('coordinadorNombre','Nombre de coordinación')],
  program: [field('nivelFormativo','Nivel formativo'),field('tipoPlan','Tipo de plan'),field('resolucionPrograma','Resolución del programa'),field('officialTitleText','Denominación del título autorizado'),field('sigla','Sigla del programa ({{sigla_programa}})')],
  module: [field('resolucionAutorizacion','Resolución del módulo'),field('hours','Horas del módulo','number'),field('credits','Créditos del módulo','number'),field('efsrtHours','Horas de EFSRT','number'),field('presenceStates','Marcas que cuentan como asistencia','select',['DIRECTOR'],['P','P,T']),field('approvalMinimum','Nota mínima de aprobación confirmada','number'),field('absenceStates','Marcas que cuentan como inasistencia','select',['DIRECTOR'],['F','F,J']),field('absenceDenominator','Base del porcentaje de inasistencia','select',['DIRECTOR'],['PROGRAMADAS','REGISTRADAS']),field('competence','Unidad de competencia')],
  group: [field('ciclo','Ciclo','text',ADMIN),field('seccion','Sección','text',ADMIN),field('turno','Turno','text',ADMIN),field('modalidad','Modalidad','text',ADMIN),field('convenio','Convenio institucional','text',ADMIN),field('fechaInicio','Fecha de inicio','date',ADMIN),field('fechaFin','Fecha de término','date',ADMIN),field('periodClase','Periodo de clase','text',ADMIN),field('teacherName','Docente responsable','text',ADMIN),field('efsrtInicio','Inicio EFSRT','date',ADMIN),field('efsrtFin','Término EFSRT','date',ADMIN)],
  unit: [field('name','Nombre de la unidad didáctica','text',TEACHING),field('capacity','Capacidad de la unidad','textarea',TEACHING),field('competence','Unidad de competencia','textarea',TEACHING),...Array.from({length:5},(_,i)=>field(`indicator${i+1}`,`Descripción del indicador de logro ${i+1}`,'textarea',TEACHING))],
  unitCurriculum: [field('hours','Horas oficiales de la unidad','number'),field('credits','Créditos oficiales de la unidad','number'),field('fechaInicio','Inicio de esta unidad (editable)','date'),field('fechaFin','Fin de esta unidad (editable)','date'),field('dateOrigin','Origen de las fechas','text')],
  enrollment: [field('condition','Condición de matrícula (G/P/B)','select',ADMIN,['G','P','B']),field('emissionDate','Fecha de expedición','date',ADMIN),field('subsanacionUnit','Unidad de subsanación, si corresponde','text',ADMIN),field('subsanacionCredits','Créditos de subsanación','number',ADMIN),field('subsanacionHours','Horas de subsanación','number',ADMIN),field('subsanacionCondition','Condición de subsanación','select',ADMIN,['G','P','B']),],
  registry: [field('titleEmissionDate','Fecha de expedición del título','date',['DIRECTOR']),field('registerCode','Código de registro institucional (A)','text',['DIRECTOR']),field('registryCorrelative','Correlativo institucional (6 dígitos — {{correlativo}})','text',['DIRECTOR']),field('registryLevelCode','Nivel formativo del código ({{nivel_formativo}})','text',['DIRECTOR']),field('programAcronym','Sigla del programa ({{sigla_programa}})','text',['DIRECTOR']),field('registryShortRef','Referencia corta (2 dígitos — {{referencia_corta}})','text',['DIRECTOR']),field('registryCodeYear','Año del código (4 dígitos — {{anio_codigo}})','text',['DIRECTOR']),field('registryBook','Libro de registro','text',['DIRECTOR']),field('registryFolio','Folio de registro','text',['DIRECTOR']),field('registryNumber','Número de registro','text',['DIRECTOR']),field('registryDate','Fecha de registro','date',['DIRECTOR']),field('registryAsiento','Asiento registral','text',['DIRECTOR']),field('ugelCode','Código de registro UGEL (B)','text',['DIRECTOR']),field('referenceResolution','Resolución de referencia en portada (C — {{resolucion_referencia}})','text',['DIRECTOR']),field('resolutionNumber','N° de Resolución Directoral','text',['DIRECTOR']),field('resolutionDate','Fecha de Resolución Directoral','date',['DIRECTOR']),field('expedienteNumber','N° de Expediente','text',['DIRECTOR']),field('expedienteDate','Fecha de Expediente','date',['DIRECTOR']),field('graduationDate','Fecha de egreso','date',ADMIN),field('specialtyTeacher','Docente / Especialidad de certificado','text',ADMIN),field('tituladoName','Nombre del titulado en diploma (D — {{nombre_titulado}}, opcional)','text',['DIRECTOR']),field('officialTitleText','Denominación del título en diploma (E — {{programa_estudios}}, opcional)','text',['DIRECTOR']),field('directorName','Nombre del director firmante (opcional)','text',['DIRECTOR']),field('certRegisterCode','Código de registro de certificado modular','text',ADMIN),field('certCorrelative','Correlativo de certificado modular (6 dígitos)','text',ADMIN),field('certLevelCode','Nivel formativo en certificado modular','text',ADMIN),field('certProgramAcronym','Sigla del programa en certificado modular','text',ADMIN),field('certShortRef','Referencia corta en certificado modular (2 dígitos)','text',ADMIN),field('certCodeYear','Año del código de certificado modular (4 dígitos)','text',ADMIN),field('certEmissionDate','Fecha de emisión de certificado modular','date',ADMIN),field('certReferenceResolution','Resolución de autorización en certificado modular','text',ADMIN),field('certInstitutionName','Institución / empresa EFSRT en certificado modular','text',ADMIN),field('certDirectorName','Nombre del director firmante en certificado modular (opcional)','text',ADMIN),field('certSemesterLabel','Semestre mostrado en certificado modular (opcional)','text',ADMIN),field('certStudentName','Nombre en certificado modular (opcional)','text',ADMIN),],
  practice: [field('companyName','Empresa / institución EFSRT','text',TEACHING),field('companyAddress','Dirección de empresa EFSRT','text',TEACHING),...Array.from({length:9},(_,i)=>field(`criterion${i+1}`,`Criterio EFSRT ${i+1} (máximo ${[3,2,2,3,3,3,1,2,1][i]})`,'number',TEACHING)),field('efsrtFinalGrade','Calificación final EFSRT','number',TEACHING),],
  closure: [field('modularGrade','Logro modular confirmado','number'),field('approvedUnitsCount','Unidades aprobadas confirmadas','number'),field('failedUnitsCount','Unidades desaprobadas confirmadas','number'),field('observations','Observaciones del cierre','textarea')]
};
const NAMES = ['Nómina de matrícula','Ficha de matrícula','Registro de matrícula modular','Portada de carpeta docente',...Array.from({length:6},(_,i)=>`Asistencia UD${i+1}`),...Array.from({length:7},(_,i)=>`Evaluación UD${i+1}`),'Consolidado EFSRT','Acta de evaluación modular','Certificado modular','Título'];
const ADMIN_FIELDS = ['institution.nombre','program.nombre','module.nombre','group.periodId'];
const TEMPLATE_PARAMETERS = {};
for(let n=1;n<=21;n++) {
  const id=`TMPL-${String(n).padStart(2,'0')}`, fields=[...ADMIN_FIELDS];
  if([1,2,3,19].includes(n)) fields.push('institution.codigoModular');
  if(n===1) fields.push('institution.region','institution.ugel','institution.tipoGestion','institution.resolucionAutorizacion','institution.resolucionConversion','institution.provincia','institution.distrito','institution.direccion','module.resolucionAutorizacion','group.ciclo','group.turno','group.seccion','group.fechaInicio','group.fechaFin','students.name','students.sex','students.birthDate','enrollments.code','enrollments.condition','units.name','units.credits');
  if(n===2) fields.push('institution.dre','institution.departamento','institution.provincia','institution.distrito','institution.tipoGestion','institution.resolucionAutorizacion','group.periodClase','program.nivelFormativo','program.tipoPlan','students.name','students.document','units.name','units.hours','units.credits','enrollments.condition');
  if(n===3) fields.push('institution.ugel','program.resolucionPrograma','group.ciclo','students.document','students.documentType','students.lastName1','students.lastName2','students.firstNames','students.sex','students.birthDate');
  if(n===4) fields.push('institution.dre','institution.ugel','institution.tipoGestion','group.ciclo','group.turno','group.seccion','group.fechaInicio','group.fechaFin','module.hours','module.credits','teacher.name');
  if(n>=5&&n<=10) fields.push('unit.name','students.name','attendance.sessions','attendance.marks','module.presenceStates','module.absenceStates','module.absenceDenominator','teacher.name');
  if(n>=11&&n<=17) fields.push('unit.name','unit.capacity',...Array.from({length:5},(_,i)=>`unit.indicator${i+1}`),'students.name','evaluation.components','evaluation.unitResult','teacher.name');
  if(n===18) fields.push('module.efsrtHours','group.efsrtInicio','group.efsrtFin','teacher.name','students.name','enrollments.code','efsrt.companyName','efsrt.companyAddress','efsrt.criteria','efsrt.finalGrade');
  if(n===19) fields.push('institution.tipoGestion','institution.resolucionAutorizacion','institution.resolucionConversion','institution.dre','institution.ugel','institution.region','institution.provincia','institution.distrito','institution.lugar','institution.direccion','module.resolucionAutorizacion','group.ciclo','group.seccion','group.turno','students.document','students.name','units.name','units.capacity','units.credits','units.hours','evaluation.unitResults','module.approvalMinimum','efsrt.finalGrade','closure.modularGrade','closure.approvedUnitsCount','closure.failedUnitsCount');
  if(n===20) fields.push('students.name','document.registerCode','document.emissionDate','group.ciclo','group.modalidad','module.hours','module.credits','units.name','module.competence','units.capacity','units.credits','units.hours','evaluation.unitResults','document.registryBook','document.registryFolio','document.registryNumber','document.registryDate');
  if(n===21) fields.splice(0,fields.length,'students.name','document.officialTitleText','document.emissionDate','document.registerCode','document.registryAsiento');
  TEMPLATE_PARAMETERS[id]=[...new Set(fields)];
}
const PROGRAM_ACRONYMS = {
  'PROG-001': 'MA',
  'PROG-002': 'MO',
  'PROG-003': 'CM',
  'PROG-004': 'PB',
  'PROG-005': 'CI',
  'PROG-006': 'CE',
  'PROG-007': 'EE'
};
const EXTENSION_NAMES = {
  'TMPL-22': 'Resolución Directoral de Título',
  'TMPL-23': 'Certificado de Egresado'
};
const CODE_ACRONYMS = { AUTO: 'MA', MOT: 'MO', CM: 'CM', PB: 'PB', CI: 'CI', CE: 'CE', ELE: 'EE' };
const STOP_WORDS = new Set(['DE', 'Y', 'E', 'LA', 'EL', 'LOS', 'LAS', 'EN', 'DEL', 'CON', 'PARA', 'AL', 'A']);
function programAcronymFor(program) {
  if (!program) return 'PR';
  if (typeof program === 'object') {
    const explicit = String(program.acronym || program.sigla || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (explicit.length >= 2 && explicit.length <= 6) return explicit;
  }
  const ids = typeof program === 'string'
    ? [program]
    : [program.id, program.programId, program.canonicalCode, program.codigo, program.code];
  for (const raw of ids) {
    const key = String(raw || '').trim().toUpperCase();
    if (!key) continue;
    if (PROGRAM_ACRONYMS[key]) return PROGRAM_ACRONYMS[key];
    if (CODE_ACRONYMS[key]) return CODE_ACRONYMS[key];
  }
  const rawName = typeof program === 'string'
    ? program
    : (program.nombre || program.name || program.nombreOficial || '');
  const norm = String(rawName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (norm.includes('AUTOMOTRIZ')) return 'MA';
  if (norm.includes('MOTO')) return 'MO';
  if (norm.includes('CARPINTERIA METALICA')) return 'CM';
  if (norm.includes('PELUQUERIA')) return 'PB';
  if (norm.includes('COMPUTACION')) return 'CI';
  if (norm.includes('CORTE Y ENSAMBLAJE')) return 'CE';
  if (norm.includes('SISTEMAS ELECTRICOS') || norm.includes('ELECTRICIDAD') || norm.includes('ELECTRONICO')) return 'EE';
  if (typeof program === 'object') {
    const rawCode = String(program.codigo || program.code || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (rawCode.length >= 2 && rawCode.length <= 4 && !rawCode.startsWith('PROG')) return rawCode;
  }
  const words = norm.replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;
  if (words.length === 1) return words[0].slice(0, 2).padEnd(2, 'X');
  return 'PR';
}
function templateName(id) {
  const key = String(id || '').trim();
  if (EXTENSION_NAMES[key]) return EXTENSION_NAMES[key];
  const match = /^TMPL-(\d{2})$/.exec(key);
  if (match) {
    const idx = Number(match[1]) - 1;
    if (idx >= 0 && idx < NAMES.length) return NAMES[idx];
  }
  return key;
}
TEMPLATE_PARAMETERS['TMPL-22'] = [
  'institution.directorNombre',
  'students.name',
  'students.documentNumber',
  'program.name',
  'program.officialTitleText',
  'program.totalHours',
  'program.totalCredits',
  'document.registerCode',
  'document.resolutionNumber',
  'document.resolutionDate',
  'document.expedienteNumber',
  'document.expedienteDate'
];
TEMPLATE_PARAMETERS['TMPL-23'] = [
  'institution.directorNombre',
  'students.name',
  'students.documentNumber',
  'program.name',
  'program.totalHours',
  'program.totalCredits',
  'document.graduationDate',
  'document.emissionDate',
  'document.specialtyTeacher'
];
function catalog(root) {
  return Array.from({length:21},(_,i)=>{const id=`TMPL-${String(i+1).padStart(2,'0')}`,manifest=JSON.parse(fs.readFileSync(path.join(root,'app/data/pdf-manifests',`${id}.json`),'utf8'));return {id,name:NAMES[i],parameters:TEMPLATE_PARAMETERS[id],capacity:manifest.capacity||{},pages:manifest.pages,physicalKeys:[...new Set([...(manifest.fields||[]),...(manifest.physicalFields||[])].filter(f=>f.canonicalKey).map(f=>f.canonicalKey))]};});
}
function extendedCatalog(root) {
  const extensions = ['TMPL-22', 'TMPL-23'].map(id => ({
    id,
    name: EXTENSION_NAMES[id],
    parameters: TEMPLATE_PARAMETERS[id],
    capacity: {},
    pages: 1,
    physicalKeys: [],
    extension: true
  }));
  return [...catalog(root), ...extensions];
}
module.exports={SETTINGS_FIELDS,TEMPLATE_PARAMETERS,NAMES,PROGRAM_ACRONYMS,EXTENSION_NAMES,programAcronymFor,templateName,catalog,extendedCatalog};
