/**
 * utils/documentTemplates.ts
 * 
 * Catálogo Oficial y Metadatos de las Plantillas Documentales de CEPRO_MICAELA 2.0
 * (21 formatos MINEDU TMPL-01..21 + extensiones institucionales 2026 TMPL-22..23).
 * Basado estrictamente en:
 * - scripts/document-contracts.cjs
 * - app/data/pdf-manifests/TMPL-01..21.json
 * - app/js/services/document-info-catalog.js
 * 
 * 100% Offline — Sin datos inventados ni dependencias externas.
 */

export interface TemplateMetadata {
  id: string; // 'TMPL-01'..'TMPL-23'
  number: number; // 1..23
  name: string; // Nombre oficial devuelto por el backend
  shortName: string;
  category: TemplateCategory;
  scope: 'Módulo' | 'Unidad' | 'Práctica EFSRT';
  requiredMode: 'MODULE' | 'UNIT' | 'PRACTICE';
  targetUnitIndex?: number; // 0 para UD1, 1 para UD2, etc.
  isIndividual: boolean; // Requiere selección de estudiante específico (enrollmentId)
  paperFormat: 'A4 Vertical' | 'A4 Horizontal' | 'A3 Vertical' | 'A3 Horizontal';
  pagesCount: number;
  pageCount?: number;
  orientation?: 'portrait' | 'landscape';
  official2026Support?: boolean;
  extension?: boolean;
  requirements?: string[];
  normative: string;
  description: string;
  rolesAllowed: ('DIRECTOR' | 'SECRETARIA' | 'DOCENTE')[];
}

export type TemplateCategory =
  | 'Matrícula y Registro'
  | 'Carpeta Pedagógica'
  | 'Control de Asistencia'
  | 'Evaluación por Competencias'
  | 'Prácticas Preprofesionales'
  | 'Actas y Titulación'
  | 'CERTIFICACION';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'Matrícula y Registro',
  'Carpeta Pedagógica',
  'Control de Asistencia',
  'Evaluación por Competencias',
  'Prácticas Preprofesionales',
  'Actas y Titulación',
  'CERTIFICACION',
];

export const OFFICIAL_TEMPLATES: TemplateMetadata[] = [
  {
    id: 'TMPL-01',
    number: 1,
    name: 'Nómina de matrícula',
    shortName: 'Nómina Oficial',
    category: 'Matrícula y Registro',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: false,
    paperFormat: 'A4 Vertical',
    pagesCount: 1,
    pageCount: 1,
    orientation: 'portrait',
    official2026Support: true,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Padrón legal de estudiantes matriculados en el módulo formativo para remisión ante la UGEL.',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA'],
  },
  {
    id: 'TMPL-02',
    number: 2,
    name: 'Ficha de matrícula',
    shortName: 'Ficha Individual',
    category: 'Matrícula y Registro',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: true,
    paperFormat: 'A4 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Ficha individualizada del estudiante con plan de unidades didácticas y datos personales.',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA'],
  },
  {
    id: 'TMPL-03',
    number: 3,
    name: 'Registro de matrícula modular',
    shortName: 'Registro Modular',
    category: 'Matrícula y Registro',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Libro y padrón consolidado de matrículas del periodo lectivo institucional.',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA'],
  },
  {
    id: 'TMPL-04',
    number: 4,
    name: 'Portada de carpeta docente',
    shortName: 'Portada de Carpeta',
    category: 'Carpeta Pedagógica',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: false,
    paperFormat: 'A4 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Carátula oficial de la carpeta pedagógica con datos del docente, horario, horas y créditos.',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-05',
    number: 5,
    name: 'Asistencia UD1',
    shortName: 'Asistencia UD1',
    category: 'Control de Asistencia',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 0,
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro de asistencia diaria para la Unidad Didáctica 1 (hasta 44 sesiones lectivas).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-06',
    number: 6,
    name: 'Asistencia UD2',
    shortName: 'Asistencia UD2',
    category: 'Control de Asistencia',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 1,
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro de asistencia diaria para la Unidad Didáctica 2 (hasta 35 sesiones lectivas).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-07',
    number: 7,
    name: 'Asistencia UD3',
    shortName: 'Asistencia UD3',
    category: 'Control de Asistencia',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 2,
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro de asistencia diaria para la Unidad Didáctica 3 (hasta 38 sesiones lectivas).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-08',
    number: 8,
    name: 'Asistencia UD4',
    shortName: 'Asistencia UD4',
    category: 'Control de Asistencia',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 3,
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro de asistencia diaria para la Unidad Didáctica 4 (hasta 44 sesiones lectivas).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-09',
    number: 9,
    name: 'Asistencia UD5',
    shortName: 'Asistencia UD5',
    category: 'Control de Asistencia',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 4,
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro de asistencia diaria para la Unidad Didáctica 5 (hasta 44 sesiones lectivas).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-10',
    number: 10,
    name: 'Asistencia UD6',
    shortName: 'Asistencia UD6',
    category: 'Control de Asistencia',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 5,
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro de asistencia diaria para la Unidad Didáctica 6 (hasta 40 sesiones lectivas).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-11',
    number: 11,
    name: 'Evaluación UD1',
    shortName: 'Evaluación UD1',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 0,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 1 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-12',
    number: 12,
    name: 'Evaluación UD2',
    shortName: 'Evaluación UD2',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 1,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 2 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-13',
    number: 13,
    name: 'Evaluación UD3',
    shortName: 'Evaluación UD3',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 2,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 3 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-14',
    number: 14,
    name: 'Evaluación UD4',
    shortName: 'Evaluación UD4',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 3,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 4 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-15',
    number: 15,
    name: 'Evaluación UD5',
    shortName: 'Evaluación UD5',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 4,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 5 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-16',
    number: 16,
    name: 'Evaluación UD6',
    shortName: 'Evaluación UD6',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 5,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 6 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-17',
    number: 17,
    name: 'Evaluación UD7',
    shortName: 'Evaluación UD7',
    category: 'Evaluación por Competencias',
    scope: 'Unidad',
    requiredMode: 'UNIT',
    targetUnitIndex: 6,
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Registro auxiliar de evaluación de aprendizajes para la Unidad 7 (5 indicadores de logro).',
    rolesAllowed: ['DIRECTOR', 'DOCENTE'],
  },
  {
    id: 'TMPL-18',
    number: 18,
    name: 'Consolidado EFSRT',
    shortName: 'Consolidado EFSRT',
    category: 'Prácticas Preprofesionales',
    scope: 'Práctica EFSRT',
    requiredMode: 'PRACTICE',
    isIndividual: false,
    paperFormat: 'A3 Vertical',
    pagesCount: 1,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Consolidado de Experiencias Formativas en Situaciones Reales de Trabajo (9 criterios normados).',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA', 'DOCENTE'],
  },
  {
    id: 'TMPL-19',
    number: 19,
    name: 'Acta de evaluación modular',
    shortName: 'Acta Modular Oficial',
    category: 'Actas y Titulación',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: false,
    paperFormat: 'A3 Horizontal',
    pagesCount: 2,
    pageCount: 2,
    orientation: 'landscape',
    official2026Support: true,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Acta oficial de evaluación de las unidades del módulo formativo para visado de la UGEL.',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA'],
  },
  {
    id: 'TMPL-20',
    number: 20,
    name: 'Certificado modular',
    shortName: 'Certificado Modular',
    category: 'Actas y Titulación',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: true,
    paperFormat: 'A4 Horizontal',
    pagesCount: 2,
    pageCount: 2,
    orientation: 'landscape',
    official2026Support: true,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Certificado oficial expedido al estudiante por culminación exitosa de un módulo formativo.',
    rolesAllowed: ['DIRECTOR', 'SECRETARIA'],
  },
  {
    id: 'TMPL-21',
    number: 21,
    name: 'Título',
    shortName: 'Título Oficial',
    category: 'Actas y Titulación',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: true,
    paperFormat: 'A4 Horizontal',
    pagesCount: 2,
    pageCount: 2,
    orientation: 'landscape',
    official2026Support: true,
    normative: 'R.V.M. N° 188-2020-MINEDU',
    description: 'Título a nombre de la Nación expedido para egresados de programas modulares autorizados.',
    rolesAllowed: ['DIRECTOR'],
  },
];

export const EXTENSION_TEMPLATES: TemplateMetadata[] = [
  {
    id: 'TMPL-22',
    number: 22,
    name: 'Resolución Directoral de Título',
    shortName: 'RD de Título',
    category: 'CERTIFICACION',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: true,
    paperFormat: 'A4 Vertical',
    pagesCount: 1,
    pageCount: 1,
    orientation: 'portrait',
    official2026Support: true,
    extension: true,
    normative: 'R.V.M. N° 188-2020-MINEDU · Emisión 2026',
    description:
      'Resolución Directoral que aprueba el otorgamiento del título; requiere trayectoria completa (M1 + M2), N° de RD, expediente y código de registro institucional.',
    requirements: [
      'Trayectoria modular completa (Módulo I + Módulo II)',
      'N° de Resolución Directoral y fecha de RD',
      'N° de Expediente y fecha de expediente',
      'Código de registro institucional',
    ],
    rolesAllowed: ['DIRECTOR'],
  },
  {
    id: 'TMPL-23',
    number: 23,
    name: 'Certificado de Egresado',
    shortName: 'Certificado Egresado',
    category: 'CERTIFICACION',
    scope: 'Módulo',
    requiredMode: 'MODULE',
    isIndividual: true,
    paperFormat: 'A4 Horizontal',
    pagesCount: 1,
    pageCount: 1,
    orientation: 'landscape',
    official2026Support: true,
    extension: true,
    normative: 'R.V.M. N° 188-2020-MINEDU · Emisión 2026',
    description:
      'Certificado oficial de egresado del programa formativo; requiere trayectoria completa (M1 + M2) con horas totales y fecha de egreso.',
    requirements: [
      'Trayectoria modular completa (Módulo I + Módulo II)',
      'Horas totales del programa (> 0) y créditos acumulados',
      'Fecha de egreso',
      'Fecha de expedición y docente/especialidad',
    ],
    rolesAllowed: ['DIRECTOR', 'SECRETARIA'],
  },
];

export const DOCUMENT_TEMPLATES: TemplateMetadata[] = [
  ...OFFICIAL_TEMPLATES,
  ...EXTENSION_TEMPLATES,
];

export function getTemplateById(id: string): TemplateMetadata | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: TemplateCategory,
  includeExtensions = true
): TemplateMetadata[] {
  const source = includeExtensions ? DOCUMENT_TEMPLATES : OFFICIAL_TEMPLATES;
  return source.filter((t) => t.category === category);
}

export interface FilterTemplatesOptions {
  role?: string;
  groupId?: string;
  unitCode?: string;
  availableUnits?: string[];
  mode?: 'MODULE' | 'UNIT' | 'PRACTICE';
  onlyCurrentUnit?: boolean;
  includeExtensions?: boolean;
}

/**
 * Retorna las plantillas visibles y pertinentes según el rol, aula y unidad didáctica activa.
 * Cumple estrictamente con el RBAC de scripts/offline-core.cjs y la segmentación académica.
 */
export function getVisibleTemplates(options: FilterTemplatesOptions = {}): TemplateMetadata[] {
  const {
    role,
    groupId,
    unitCode,
    availableUnits,
    onlyCurrentUnit = true,
    includeExtensions = false,
  } = options;

  let list = includeExtensions ? DOCUMENT_TEMPLATES : OFFICIAL_TEMPLATES;

  // 1. Filtrar por rol institucional
  if (role) {
    list = list.filter((t) => t.rolesAllowed.includes(role as 'DIRECTOR' | 'SECRETARIA' | 'DOCENTE'));
  }

  // 2. Si no hay grupo activo
  if (!groupId) {
    return list;
  }

  // 3. Filtrar por unidad didáctica activa si aplica
  if (unitCode && onlyCurrentUnit) {
    let unitIndex = -1;
    if (availableUnits && availableUnits.includes(unitCode)) {
      unitIndex = availableUnits.indexOf(unitCode);
    } else {
      const match = unitCode.match(/\d+/);
      if (match) {
        unitIndex = parseInt(match[0], 10) - 1;
      }
    }

    if (unitIndex >= 0) {
      list = list.filter((t) => {
        if (t.scope === 'Unidad') {
          return t.targetUnitIndex === unitIndex;
        }
        return true;
      });
    }
  } else if (availableUnits && availableUnits.length > 0) {
    // Si no hay unidad específica pero tenemos la cantidad de UDs del aula,
    // descartar plantillas para UDs inexistentes en esa aula
    list = list.filter((t) => {
      if (t.scope === 'Unidad' && t.targetUnitIndex !== undefined) {
        return t.targetUnitIndex < availableUnits.length;
      }
      return true;
    });
  }

  return list;
}

/**
 * Retorna exclusivamente las categorías que tienen al menos una plantilla visible
 */
export function getAvailableCategories(templates: TemplateMetadata[]): TemplateCategory[] {
  const catSet = new Set(templates.map((t) => t.category));
  return TEMPLATE_CATEGORIES.filter((cat) => catSet.has(cat));
}

export const REGISTER_CODE_SEGMENT_KEYS = new Set([
  'registryCorrelative',
  'registryLevelCode',
  'programAcronym',
  'registryShortRef',
  'registryCodeYear',
]);

/**
 * Construye dinámicamente `{{codigo_institucional}}` según el diccionario de códigos (A):
 * `{{correlativo}}-{{nivel_formativo}}-{{dni}}-{{sigla_programa}}{{referencia_corta}}-{{anio_codigo}}`
 */
export function assembleInstitutionalRegisterCode(
  fields: Record<string, string | number | undefined>,
  dni?: string
): string {
  const corrRaw = String(fields.registryCorrelative ?? '').replace(/\D/g, '');
  if (!corrRaw) return String(fields.registerCode ?? '');
  const corr6 = corrRaw.slice(-6).padStart(6, '0');
  const lvl =
    String(fields.registryLevelCode || 'AT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') || 'AT';
  const existingDni = String(fields.registerCode ?? '').split('-')[2] || '';
  const cleanDni = String(dni || existingDni || '').replace(/\D/g, '');
  const dni8 = (cleanDni ? cleanDni.slice(-8) : '00000000').padStart(8, '0');
  const acr =
    String(fields.programAcronym || 'PR')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') || 'PR';
  const ref2 = String(fields.registryShortRef || '25')
    .trim()
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(-2)
    .padStart(2, '0');
  const yr4 = String(fields.registryCodeYear || new Date().getFullYear())
    .trim()
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');
  return `${corr6}-${lvl}-${dni8}-${acr}${ref2}-${yr4}`;
}

/**
 * Aplica actualización en campos registrales manteniendo sincronizados los segmentos de A.
 */
export function applyRegistryFieldChange(
  prev: Record<string, string>,
  key: string,
  value: string,
  dni?: string
): Record<string, string> {
  const next: Record<string, string> = { ...prev, [key]: value };
  if (REGISTER_CODE_SEGMENT_KEYS.has(key)) {
    const assembled = assembleInstitutionalRegisterCode(next, dni);
    if (assembled) next.registerCode = assembled;
  } else if (key === 'registerCode') {
    const m = /^(\d{1,6})-([A-Z0-9]{2,4})-([A-Z0-9]{8})-([A-Z]{2,6})(\d{2})-(\d{4})$/i.exec(
      value.trim()
    );
    if (m) {
      next.registryCorrelative = m[1].padStart(6, '0');
      next.registryLevelCode = m[2].toUpperCase();
      next.programAcronym = m[4].toUpperCase();
      next.registryShortRef = m[5];
      next.registryCodeYear = m[6];
    }
  }
  return next;
}

export const TITLE_SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const PROGRAM_ACRONYMS_FE: Record<string, string> = {
  'PROG-001': 'MA',
  'PROG-002': 'MO',
  'PROG-003': 'CM',
  'PROG-004': 'PB',
  'PROG-005': 'CI',
  'PROG-006': 'CE',
  'PROG-007': 'EE',
};

export function inferProgramAcronym(programId?: string, programName?: string): string {
  const pid = String(programId || '').trim().toUpperCase();
  if (pid && PROGRAM_ACRONYMS_FE[pid]) return PROGRAM_ACRONYMS_FE[pid];
  const norm = String(programName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (norm.includes('AUTOMOTRIZ')) return 'MA';
  if (norm.includes('MOTO')) return 'MO';
  if (norm.includes('CARPINTERIA')) return 'CM';
  if (norm.includes('PELUQUERIA') || norm.includes('BARBERIA')) return 'PB';
  if (norm.includes('COMPUTACION')) return 'CO';
  if (norm.includes('CORTE')) return 'CE';
  if (norm.includes('ELECTRIC')) return 'EE';
  return '';
}

const MINOR_SPANISH_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'para', 'con', 'a', 'al']);

function toTitleCaseWords(raw: string, lowercaseConnectors = false): string {
  return String(raw || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, idx) => {
      const lower = w.toLowerCase();
      if (lowercaseConnectors && idx > 0 && MINOR_SPANISH_WORDS.has(lower)) return lower;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Formatea un nombre de estudiante al estilo del título Excel:
 * "Yanet Braulia, SOTA VELASQUEZ" (Nombres en Title Case, APELLIDOS en MAYÚSCULAS).
 */
export function formatStudentNameForTitle(rawName?: string): string {
  const clean = String(rawName || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.includes(',')) {
    const [leftRaw, ...rest] = clean.split(',');
    const left = leftRaw.trim();
    const right = rest.join(' ').trim();
    if (!right) return left;
    const leftIsUpper = left === left.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(left);
    const rightIsUpper = right === right.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(right);
    if (rightIsUpper && !leftIsUpper) {
      return `${toTitleCaseWords(left)}, ${right.toUpperCase()}`;
    }
    return `${toTitleCaseWords(right)}, ${left.toUpperCase()}`;
  }
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 3) {
    const names = parts.slice(0, parts.length - 2).join(' ');
    const surnames = parts.slice(parts.length - 2).join(' ');
    return `${toTitleCaseWords(names)}, ${surnames.toUpperCase()}`;
  }
  if (parts.length === 2) {
    return `${toTitleCaseWords(parts[0])}, ${parts[1].toUpperCase()}`;
  }
  return clean;
}

/**
 * Formatea un nombre de estudiante al estilo del Certificado Modular Oficial:
 * "Romina Leydi PARICAHUA QUISPE" (Nombres en Tipo Título + APELLIDOS en MAYÚSCULAS sin coma).
 */
export function formatStudentNameForCertificate(rawName?: string): string {
  const clean = String(rawName || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.includes(',')) {
    const [leftRaw, ...rest] = clean.split(',');
    const left = leftRaw.trim();
    const right = rest.join(' ').trim();
    if (!right) return left;
    const leftIsUpper = left === left.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(left);
    const rightIsUpper = right === right.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(right);
    if (rightIsUpper && !leftIsUpper) {
      return `${toTitleCaseWords(left, true)} ${right.toUpperCase()}`;
    }
    return `${toTitleCaseWords(right, true)} ${left.toUpperCase()}`;
  }
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 3) {
    const names = parts.slice(0, parts.length - 2).join(' ');
    const surnames = parts.slice(parts.length - 2).join(' ');
    return `${toTitleCaseWords(names, true)} ${surnames.toUpperCase()}`;
  }
  if (parts.length === 2) {
    return `${toTitleCaseWords(parts[0], true)} ${parts[1].toUpperCase()}`;
  }
  return clean;
}

export function formatTitleExpeditionSentence(isoDate?: string, lugar = 'San Miguel'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || '').trim());
  if (!match) {
    return `Dado en ${lugar}, a los __ días del mes de ______ del ____.`;
  }
  const year = match[1];
  const monthIdx = Math.max(0, Math.min(11, Number(match[2]) - 1));
  const day = Number(match[3]);
  return `Dado en ${lugar}, a los ${day} días del mes de ${TITLE_SPANISH_MONTHS[monthIdx]} del ${year}.`;
}

