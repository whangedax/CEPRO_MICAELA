import { TEMPLATE_FIELD_CONTRACTS } from './document-field-contract.js';

/**
 * Registro Declarativo de Plantillas Institucionales (TemplateRegistry)
 * Módulo: M10.1 — Motor Documental Institucional (Corrección de Perfiles de Impresión)
 *
 * Distingue estrictamente:
 * 1. Propiedades de Fuente XLSX: sourceOrientation = 'NO_CONFIRMADO', sourcePaperSize = 'NO_CONFIRMADO' (hechos contractuales).
 * 2. Perfil de Renderizado (renderProfile): Origen 'DERIVADO_DE_REFERENCIA_VISUAL' (decisión técnica TEST_ONLY).
 */

export const TEMPLATES_CATALOG = [
  {
    templateId: 'TMPL-01',
    code: '01_NOMINA_DE_MATRICULA',
    name: 'Nómina de Matrícula',
    sourceFile: 'sources/templates/originals/xlsx/01_NOMINA_DE_MATRICULA.xlsx',
    previewFile: 'sources/templates/previews/01_NOMINA_DE_MATRICULA.png',
    sheetName: 'Nómina',
    documentType: 'NOMINA',
    contextType: 'GROUP',
    renderer: 'renderTMPL01',
    requiredFields: ['institution', 'program', 'module', 'period', 'group', 'students'],
    blockers: ['B-004', 'B-007', 'GROUP_CONTEXT_PENDING'],
    sourceHash: 'b88b9d8589e214b07a68100ec9a3ebe9669af3dddfca652a168ab2331937be24',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'DERIVADO_DE_REFERENCIA_VISUAL',
      orientation: 'PORTRAIT',
      paperSize: 'A4'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M11'
  },
  {
    templateId: 'TMPL-02',
    code: '02_FICHA_DE_MATRICULA',
    name: 'Ficha de Matrícula',
    sourceFile: 'sources/templates/originals/xlsx/02_FICHA_DE_MATRICULA.xlsx',
    previewFile: 'sources/templates/previews/02_FICHA_DE_MATRICULA.png',
    sheetName: 'FICHA DE MATRICULA',
    documentType: 'FICHA',
    contextType: 'ENROLLMENT',
    renderer: 'renderTMPL02',
    requiredFields: ['institution', 'student', 'enrollment', 'program'],
    blockers: ['B-002', 'B-004', 'B-007'],
    sourceHash: '551f3890b472797610cecb2852791d38f922f86232d2fd43057b7fd106deb30c',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A4'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-03',
    code: '03_REGISTRO_DE_MATRICULA_MODULAR',
    name: 'Registro de Matrícula Modular',
    sourceFile: 'sources/templates/originals/xlsx/03_REGISTRO_DE_MATRICULA_MODULAR.xlsx',
    previewFile: 'sources/templates/previews/03_REGISTRO_DE_MATRICULA_MODULAR.png',
    sheetName: 'REGISTRO DE MATRICULA MODULAR',
    documentType: 'MATRICULA',
    contextType: 'GROUP',
    renderer: 'renderAdministrativeTMPL03',
    requiredFields: ['institution', 'program', 'module', 'period', 'group', 'students'],
    blockers: [],
    sourceHash: '2213bca61125ab2fa794778696331313f3683af27563d61835dae77f5082a088',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'AVAILABLE',
    roadmapModule: 'M11'
  },
  {
    templateId: 'TMPL-04',
    code: '04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION',
    name: 'Portada de Registro Asistencia y Evaluación',
    sourceFile: 'sources/templates/originals/xlsx/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.xlsx',
    previewFile: 'sources/templates/previews/04_PORTADA_REGISTRO_ASISTENCIA_EVALUACION.png',
    sheetName: 'Portada - Regis. Eva.',
    documentType: 'PORTADA',
    sourceHash: 'e379892305cf139b012b45594ef5462934dc4eb21d63361f0ef0c26dac14e37e',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A4'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M11'
  },
  {
    templateId: 'TMPL-05',
    code: '05_ASISTENCIA_UD1',
    name: 'Asistencia Unidad Didáctica 1',
    sourceFile: 'sources/templates/originals/xlsx/05_ASISTENCIA_UD1.xlsx',
    previewFile: 'sources/templates/previews/05_ASISTENCIA_UD1.png',
    sheetName: 'As-1',
    documentType: 'ASISTENCIA',
    sourceHash: '53441d38c89f8f855b46c2e77e654b9fcfee682a4652cce4e9cb98b7655cc9e1',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-06',
    code: '06_ASISTENCIA_UD2',
    name: 'Asistencia Unidad Didáctica 2',
    sourceFile: 'sources/templates/originals/xlsx/06_ASISTENCIA_UD2.xlsx',
    previewFile: 'sources/templates/previews/06_ASISTENCIA_UD2.png',
    sheetName: 'As-2',
    documentType: 'ASISTENCIA',
    sourceHash: '041b3f5f3254739d0b53a880960aac9851a66be7a1b3e212e0cda5bf3264335c',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-07',
    code: '07_ASISTENCIA_UD3',
    name: 'Asistencia Unidad Didáctica 3',
    sourceFile: 'sources/templates/originals/xlsx/07_ASISTENCIA_UD3.xlsx',
    previewFile: 'sources/templates/previews/07_ASISTENCIA_UD3.png',
    sheetName: 'As-3',
    documentType: 'ASISTENCIA',
    sourceHash: '8eb42cccc8a0071adff4ed3aba14a90febe242aacf9ca31df134285e1e39dba0',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-08',
    code: '08_ASISTENCIA_UD4',
    name: 'Asistencia Unidad Didáctica 4',
    sourceFile: 'sources/templates/originals/xlsx/08_ASISTENCIA_UD4.xlsx',
    previewFile: 'sources/templates/previews/08_ASISTENCIA_UD4.png',
    sheetName: 'As-4',
    documentType: 'ASISTENCIA',
    sourceHash: '7944eef44bfe0ca0befe30edf3df4aa53b84f277f6acf8975b3cb2d89967c8ce',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-09',
    code: '09_ASISTENCIA_UD5',
    name: 'Asistencia Unidad Didáctica 5',
    sourceFile: 'sources/templates/originals/xlsx/09_ASISTENCIA_UD5.xlsx',
    previewFile: 'sources/templates/previews/09_ASISTENCIA_UD5.png',
    sheetName: 'As-5',
    documentType: 'ASISTENCIA',
    sourceHash: '5f1a064a063de93f3b028eafa8d70eb8f26dc36e7e63a9e9f64278ee4c51e450',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-10',
    code: '10_ASISTENCIA_UD6',
    name: 'Asistencia Unidad Didáctica 6',
    sourceFile: 'sources/templates/originals/xlsx/10_ASISTENCIA_UD6.xlsx',
    previewFile: 'sources/templates/previews/10_ASISTENCIA_UD6.png',
    sheetName: 'As-6',
    documentType: 'ASISTENCIA',
    sourceHash: '151c2553013db5651ae4eb1cc4e854103ccf6a64bf1abc5223c9bdd442d06789',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'LANDSCAPE',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-11',
    code: '11_EVALUACION_IL_UD1',
    name: 'Evaluación Indicadores UD1',
    sourceFile: 'sources/templates/originals/xlsx/11_EVALUACION_IL_UD1.xlsx',
    previewFile: 'sources/templates/previews/11_EVALUACION_IL_UD1.png',
    sheetName: 'IL',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL11',
    sourceHash: 'c3099dfcbe7f24198a141dd56918d2d681c40e24f409c3228af52d2514c03d04',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-12',
    code: '12_EVALUACION_UD2',
    name: 'Evaluación Unidad Didáctica 2',
    sourceFile: 'sources/templates/originals/xlsx/12_EVALUACION_UD2.xlsx',
    previewFile: 'sources/templates/previews/12_EVALUACION_UD2.png',
    sheetName: 'UD2',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL12',
    sourceHash: 'e242ded06794b676dd32980cee4723c9541d46c519861b72929a62dd3ded91de',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-13',
    code: '13_EVALUACION_UD3',
    name: 'Evaluación Unidad Didáctica 3',
    sourceFile: 'sources/templates/originals/xlsx/13_EVALUACION_UD3.xlsx',
    previewFile: 'sources/templates/previews/13_EVALUACION_UD3.png',
    sheetName: 'UD3',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL13',
    sourceHash: '4784c692ba69861461edbcddb9d161898e22d8d786dc39b408577312c3da9a5f',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-14',
    code: '14_EVALUACION_UD4',
    name: 'Evaluación Unidad Didáctica 4',
    sourceFile: 'sources/templates/originals/xlsx/14_EVALUACION_UD4.xlsx',
    previewFile: 'sources/templates/previews/14_EVALUACION_UD4.png',
    sheetName: 'UD4',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL14',
    sourceHash: 'cfefcbf16468249ce44d8f69dc6319e00c71fb7ee2dceef9391f0396589ddca9',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-15',
    code: '15_EVALUACION_UD5',
    name: 'Evaluación Unidad Didáctica 5',
    sourceFile: 'sources/templates/originals/xlsx/15_EVALUACION_UD5.xlsx',
    previewFile: 'sources/templates/previews/15_EVALUACION_UD5.png',
    sheetName: 'UD5',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL15',
    sourceHash: 'a71be103fdd95d9baf58c14694b1bcddba66aef27512d4e39b062f2c43cef6e7',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-16',
    code: '16_EVALUACION_UD6',
    name: 'Evaluación Unidad Didáctica 6',
    sourceFile: 'sources/templates/originals/xlsx/16_EVALUACION_UD6.xlsx',
    previewFile: 'sources/templates/previews/16_EVALUACION_UD6.png',
    sheetName: 'UD6',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL16',
    sourceHash: '0e4c1bb71ceced6d7dd2e65936eb29364f2a019e88df432ca492d4d6b091d7df',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-17',
    code: '17_EVALUACION_UD7',
    name: 'Evaluación Unidad Didáctica 7',
    sourceFile: 'sources/templates/originals/xlsx/17_EVALUACION_UD7.xlsx',
    previewFile: 'sources/templates/previews/17_EVALUACION_UD7.png',
    sheetName: 'UD7',
    documentType: 'EVALUACION',
    contextType: 'GROUP',
    renderer: 'renderTMPL17',
    sourceHash: 'b5af0112ae0558f971a53fad0ab7e4b01e3593652ba179f8332f30a08124dc7e',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: {
      origin: 'PDF_CANONICO_AUDITADO',
      orientation: 'PORTRAIT',
      paperSize: 'A3'
    },
    implementationStatus: 'READY_FOR_PREVIEW',
    roadmapModule: 'M12'
  },
  {
    templateId: 'TMPL-18',
    code: '18_CONSOLIDADO_EFSRT',
    name: 'Consolidado EFSRT',
    sourceFile: 'sources/templates/originals/xlsx/18_CONSOLIDADO_EFSRT.xlsx',
    previewFile: 'sources/templates/previews/18_CONSOLIDADO_EFSRT.png',
    sheetName: 'EFSRT',
    documentType: 'EFSRT',
    sourceHash: 'b0ed2ed8ffb9f9d4788e5caff6cb3a8947db85cd0c413fafe7ff47a46be28a11',
    sourceOrientation: 'PORTRAIT',
    sourcePaperSize: 'A3',
    renderProfile: 'TABLE',
    implementationStatus: 'AVAILABLE',
    renderer: 'renderTMPL18',
    roadmapModule: 'M13'
  },
  {
    templateId: 'TMPL-19',
    code: '19_ACTA_DE_EVALUACION_MODULAR',
    name: 'Acta de Evaluación Modular',
    sourceFile: 'sources/templates/originals/xlsx/19_ACTA_DE_EVALUACION_MODULAR.xlsx',
    previewFile: 'sources/templates/previews/19_ACTA_DE_EVALUACION_MODULAR.png',
    sheetName: 'ACTA',
    documentType: 'ACTA',
    sourceHash: 'ba9a003285519cafe555bd09560b60f4fa40072aa8bc05728aa404164621d17d',
    sourceOrientation: 'LANDSCAPE',
    sourcePaperSize: 'A3',
    renderProfile: 'TABLE',
    implementationStatus: 'AVAILABLE',
    renderer: 'renderTMPL19',
    blockers: [],
    roadmapModule: 'M13'
  },
  {
    templateId: 'TMPL-20',
    code: '20_CERTIFICADO_MODULAR',
    name: 'Certificado Modular',
    sourceFile: 'sources/templates/originals/xlsx/20_CERTIFICADO_MODULAR.xlsx',
    previewFile: 'sources/templates/previews/20_CERTIFICADO_MODULAR.png',
    sheetName: 'CERTIFICADO',
    documentType: 'CERTIFICADO',
    sourceHash: '0fbfabd3fea3bb9a98e7563b567dc8b35dd34b87e243b6aa874df3b936789059',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: null,
    implementationStatus: 'NOT_IMPLEMENTED',
    roadmapModule: 'M13'
  },
  {
    templateId: 'TMPL-21',
    code: '21_TITULO_AUXILIAR_TECNICO',
    name: 'Título Auxiliar Técnico',
    sourceFile: 'sources/templates/originals/xlsx/21_TITULO_AUXILIAR_TECNICO.xlsx',
    previewFile: 'sources/templates/previews/21_TITULO_AUXILIAR_TECNICO.png',
    sheetName: 'TITULO',
    documentType: 'TITULO',
    sourceHash: 'd545979cd78bb6ae9aaefd87a66fc4e830ae029d4b63ed15e548bfcbb2b91246',
    sourceOrientation: 'NO_CONFIRMADO',
    sourcePaperSize: 'NO_CONFIRMADO',
    renderProfile: null,
    implementationStatus: 'NOT_IMPLEMENTED',
    roadmapModule: 'M13'
  }
];

// Cobertura declarativa común; tipos no confirmados no habilitan producción.
const DOCUMENT_V2_PROFILE = Object.freeze({
  'TMPL-01': ['GROUP','PARTIAL',['B-002','B-004','B-007','I-049']],
  'TMPL-02': ['ENROLLMENT','IMPLEMENTED_PREVIEW',['B-002','B-004','B-007']],
  'TMPL-03': ['GROUP','REVIEW_REQUIRED',['B-004','B-007']],
  'TMPL-04': ['GROUP_MODULE','PARTIAL',['B-004','B-007']],
  'TMPL-05': ['ATTENDANCE','AVAILABLE',['B-002','B-004','B-007']],
  'TMPL-06': ['ATTENDANCE','BLOCKED_BY_SOURCE',['B-002','B-004','B-007']],
  'TMPL-07': ['ATTENDANCE','BLOCKED_BY_SOURCE',['B-002','B-004','B-007']],
  'TMPL-08': ['ATTENDANCE','BLOCKED_BY_SOURCE',['B-002','B-004','B-007']],
  'TMPL-09': ['ATTENDANCE','BLOCKED_BY_SOURCE',['B-002','B-004','B-007']],
  'TMPL-10': ['ATTENDANCE','BLOCKED_BY_SOURCE',['B-001','B-002','B-004','B-007']],
  'TMPL-11': ['EVALUATION','BLOCKED_BY_SOURCE',['B-002','B-003','B-004','B-007']],
  'TMPL-12': ['EVALUATION','BLOCKED_BY_SOURCE',['B-002','B-003','B-004','B-007']],
  'TMPL-13': ['EVALUATION','BLOCKED_BY_SOURCE',['B-002','B-003','B-004','B-007']],
  'TMPL-14': ['EVALUATION','BLOCKED_BY_SOURCE',['B-002','B-003','B-004','B-007']],
  'TMPL-15': ['EVALUATION','BLOCKED_BY_SOURCE',['B-002','B-003','B-004','B-007']],
  'TMPL-16': ['EVALUATION','BLOCKED_BY_SOURCE',['B-002','B-003','B-004','B-007']],
  'TMPL-17': ['EVALUATION','BLOCKED_BY_SOURCE',['B-001','B-002','B-003','B-004','B-007']],
  'TMPL-18': ['EFSRT','AVAILABLE',['B-004','B-005']],
  'TMPL-19': ['CLOSURE','AVAILABLE',[]],
  'TMPL-20': ['CERTIFICATION','BLOCKED_BY_SOURCE',['B-002','B-004','B-006','B-007']],
  'TMPL-21': ['TITLE','BLOCKED_BY_SOURCE',['B-002','B-004','B-006','B-007']]
});
for (const template of TEMPLATES_CATALOG) {
  template.fieldContracts = TEMPLATE_FIELD_CONTRACTS[template.templateId] || [];
  const profile = DOCUMENT_V2_PROFILE[template.templateId];
  template.contextType = profile?.[0] || template.contextType || 'UNDETERMINED';
  template.previewStatus = profile?.[1] || 'NOT_IMPLEMENTED';
  template.officialIssueStatus = 'BLOCKED';
  template.blockers = [...new Set(profile?.[2] || template.blockers || [])];
  const number = Number(template.templateId.slice(-2));
  if (number >= 4 && number <= 21) {
    template.renderer = `renderTMPL${String(number).padStart(2, '0')}`;
    template.implementationStatus = 'RENDERER_IMPLEMENTED_DATA_BLOCKED';
    template.renderProfile = { origin: 'PDF_CANONICO_AUDITADO',
      orientation: template.templateId >= 'TMPL-05' && template.templateId <= 'TMPL-10' ? 'LANDSCAPE' : 'CANONICAL',
      paperSize: 'CANONICAL' };
  }
}

export class TemplateRegistry {
  getAll() {
    return [...TEMPLATES_CATALOG];
  }

  getById(templateId) {
    if (!templateId || typeof templateId !== 'string') return null;
    return TEMPLATES_CATALOG.find(t => t.templateId === templateId.trim()) || null;
  }
}
