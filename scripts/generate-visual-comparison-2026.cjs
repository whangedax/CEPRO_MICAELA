'use strict';

process.env.CETPRO_SKIP_BASELINE_SEED = '1';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const { OfflineCore } = require('./offline-core.cjs');
const DocumentSettings = require('./offline-documents.cjs');
const { renderPDF } = require('./offline-pdf.cjs');

const OUT_DIR = path.join(
  'C:',
  'Users',
  'whangedax',
  '.gemini',
  'antigravity',
  'brain',
  '8997df4d-0954-4b37-a2da-85454d9e21f9',
  'visual-comparison-2026'
);
const BASE_PDF_DIR = path.join(ROOT, 'sources', 'templates', 'PLANTILLAS_PDF_IMPRIMIR', 'PDF_OFICIALES_2026');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const BASE_PDF_MAP = {
  'TMPL-22': 'BASE_01_RD_TITULO_2026.pdf',
  'TMPL-21': 'BASE_02_TITULO_AUXILIAR_2026.pdf',
  'TMPL-20': 'BASE_03B_CERTIFICADO_MODULAR_2026.pdf',
  'TMPL-23': 'BASE_04_CERTIFICADO_EGRESADO_2026.pdf',
  'TMPL-19': 'BASE_05_ACTA_EVALUACION_2026.pdf',
  'TMPL-01': 'BASE_06_NOMINA_MATRICULA_2026.pdf',
};

const M1_UNITS = [
  { code: 'UD1', name: 'Sistema Operativo', hours: 56, credits: 3, capacity: 'Gestiona entornos operativos, archivos y utilidades de escritorio con seguridad.' },
  { code: 'UD2', name: 'Microsoft Word', hours: 56, credits: 3, capacity: 'Elabora documentos institucionales y técnicos aplicando estilos y formatos.' },
  { code: 'UD3', name: 'Microsoft Excel', hours: 64, credits: 3, capacity: 'Procesa hojas de cálculo, fórmulas, tablas dinámicas y reportes estadísticos.' },
  { code: 'UD4', name: 'Microsoft PowerPoint', hours: 56, credits: 3, capacity: 'Diseña presentaciones multimedia efectivas para exposiciones técnicas.' },
  { code: 'UD5', name: 'Comunicación para el desarrollo personal y profesional', hours: 52, credits: 2, capacity: 'Comunica ideas con asertividad y redacta documentos administrativos.' },
  { code: 'UD6', name: 'Aplicaciones de herramientas informáticas', hours: 52, credits: 2, capacity: 'Integra herramientas colaborativas en la nube y ofimática productiva.' },
];

const M2_UNITS = [
  { code: 'UD1', name: 'CorelDraw', hours: 72, credits: 4, capacity: 'Diseña gráficos vectoriales e identidad visual publicitaria.' },
  { code: 'UD2', name: 'Photoshop', hours: 72, credits: 4, capacity: 'Edita y retoca imágenes digitales con acabado profesional.' },
  { code: 'UD3', name: 'Plataformas digitales', hours: 72, credits: 4, capacity: 'Implementa aulas virtuales, portales web y herramientas colaborativas.' },
  { code: 'UD4', name: 'Plan de negocios', hours: 60, credits: 3, capacity: 'Formula propuestas de emprendimiento tecnológico sostenible.' },
  { code: 'UD5', name: 'Comportamiento ético', hours: 60, credits: 3, capacity: 'Aplica principios éticos y ciudadanía responsable en el trabajo.' },
];

const EXTRA_STUDENTS = [
  { name: 'ALVAREZ QUISPE, Carmen Rosa', doc: '70812903', sex: 'M', birth: '2004-03-12' },
  { name: 'APAZA MAMANI, Edwin Rolando', doc: '70923415', sex: 'H', birth: '2003-07-25' },
  { name: 'CALISAYA CONDORI, Javier Luis', doc: '71182934', sex: 'H', birth: '2004-11-03' },
  { name: 'CANAHUA HUANCA, Diana Maritza', doc: '71293012', sex: 'M', birth: '2005-01-18' },
  { name: 'CANSAYA HUAMANI, Gladys Pilar', doc: '71384721', sex: 'M', birth: '2004-09-09' },
  { name: 'CHAMBI TICONA, Ricardo Miguel', doc: '71592019', sex: 'H', birth: '2002-12-04' },
  { name: 'COAQUIRA MAMANI, Miriam Yanet', doc: '71829104', sex: 'M', birth: '2001-08-14' },
  { name: 'CONDORI COILA, Rubén Darío', doc: '72201928', sex: 'H', birth: '2003-05-20' },
  { name: 'FLORES CALLATA, Beatriz Elena', doc: '72382910', sex: 'M', birth: '2004-02-28' },
  { name: 'GUTIERREZ VELASQUEZ, Jorge Luis', doc: '72910283', sex: 'H', birth: '2003-10-15' },
  { name: 'HUALLPA CHOQUE, Patricia Roxana', doc: '73920184', sex: 'M', birth: '2005-04-07' },
  { name: 'HUANCA QUISPE, Julio César', doc: '73829102', sex: 'H', birth: '2002-06-30' },
  { name: 'LEQQUE SUCASACA, Ana María', doc: '74291038', sex: 'M', birth: '2003-08-22' },
  { name: 'LOPEZ MAMANI, Verónica Soledad', doc: '74192039', sex: 'M', birth: '2004-12-11' },
  { name: 'MAMANI CALISAYA, Hernán Alberto', doc: '74192830', sex: 'H', birth: '2003-04-01' },
  { name: 'MAMANI CONDORI, Maritza Del Carmen', doc: '74382910', sex: 'M', birth: '2002-09-17' },
  { name: 'MEDINA CCAMA, Walter Marco', doc: '74281920', sex: 'H', birth: '2004-06-05' },
  { name: 'MENDOZA QUISPE, Silvia Karina', doc: '74392019', sex: 'M', birth: '2005-02-14' },
  { name: 'PARICAHUA TICONA, César Augusto', doc: '74910283', sex: 'H', birth: '2002-11-23' },
  { name: 'QUISPE CONDORI, Bertha Elena', doc: '75291049', sex: 'M', birth: '2003-03-31' },
  { name: 'QUISPE MAMANI, Fredy Orlando', doc: '75102938', sex: 'H', birth: '2004-07-19' },
  { name: 'RAMOS CHURA, Liliana Maribel', doc: '75201948', sex: 'M', birth: '2005-05-02' },
  { name: 'RODRIGUEZ PAREDES, Marco Antonio', doc: '75291048', sex: 'H', birth: '2002-10-10' },
  { name: 'ROQUE MAMANI, Judith Vanessa', doc: '75820194', sex: 'M', birth: '2003-12-29' },
  { name: 'SUCASACA APAZA, David Alejandro', doc: '75392018', sex: 'H', birth: '2004-08-08' },
  { name: 'TICONA HUALLPA, Norma Ruth', doc: '76492019', sex: 'M', birth: '2005-03-24' },
  { name: 'TURPO QUISPE, Carlos Daniel', doc: '76920184', sex: 'H', birth: '2003-01-16' },
  { name: 'VALENCIA CUEVA, Mónica Lucía', doc: '76392018', sex: 'M', birth: '2004-10-27' },
  { name: 'VILCA MAMANI, Oscar Efraín', doc: '76820193', sex: 'H', birth: '2004-04-13' },
  { name: 'ZEA CONDORI, Yessica Paola', doc: '77192047', sex: 'M', birth: '2005-06-08' },
];

function splitName(fullName) {
  const [ap = '', nom = ''] = String(fullName).split(',');
  const parts = ap.trim().split(/\s+/).filter(Boolean);
  return {
    lastName1: parts[0] || '',
    lastName2: parts.slice(1).join(' ') || '',
    firstNames: nom.trim(),
  };
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readPngInfo(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = buf.subarray(0, 8).toString('hex');
  assert.equal(sig, '89504e470d0a1a0a', `Archivo PNG inválido: ${filePath}`);
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', `Falta IHDR en ${filePath}`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const size = buf.length;
  return { filePath, width, height, size };
}

function buildRich2026Dataset(core) {
  core.setup({
    username: 'director',
    password: 'Director-Visual-2026!',
    name: 'Prof. Eloy Valerio PAREDES FELICIANO',
    institutionName: 'CETPRO “MICAELA BASTIDAS”',
  });
  const director = core.users()[0];

  const put = (kind, target, fields, unit) =>
    DocumentSettings.saveSettings(core, director, {
      scope: { kind, ...(target ? { target } : {}), ...(unit ? { unit } : {}) },
      fields,
      rev: core.record('documentSettings', DocumentSettings.idFor({ kind, target, unit }))?.rev || null,
    });

  put('institution', null, {
    nombre: 'CETPRO “MICAELA BASTIDAS”',
    tipoGestion: 'PÚBLICA',
    codigoModular: '1027648',
    dre: 'DRE PUNO',
    ugel: 'UGEL SAN ROMÁN',
    region: 'PUNO',
    departamento: 'PUNO',
    provincia: 'SAN ROMÁN',
    distrito: 'SAN MIGUEL',
    lugar: 'SAN MIGUEL',
    direccion: 'JR. MICAELA BASTIDAS N° 245',
    telefono: '051-321456',
    resolucionAutorizacion: 'RD N° 0125-1988-ED',
    resolucionConversion: 'RD N° 0450-2022-DREP',
    directorNombre: 'Prof. Eloy Valerio PAREDES FELICIANO',
    secretariaNombre: 'Carmen Vilca Puma',
    coordinadorNombre: 'Lic. Carlos Mamani Quispe',
  });

  const program = core.records('programs').find(p => p.id === 'PROG-005');
  const mod1 = core.records('modules').find(m => m.id === 'MOD-009');
  const mod2 = core.records('modules').find(m => m.id === 'MOD-010');

  put('program', program.id, {
    nivelFormativo: 'Auxiliar Técnico',
    tipoPlan: 'Modular',
    resolucionPrograma: 'RD N° 2053-2025-DUGEL-SR',
    officialTitleText: 'AUXILIAR TÉCNICO EN COMPUTACIÓN E INFORMÁTICA',
  });

  put('module', mod1.id, {
    hours: 528,
    credits: 22,
    efsrtHours: 192,
    competence: 'Realiza procesos de ofimática, procesamiento de documentos, cálculo financiero y gestión de información digital aplicando seguridad informática.',
    resolucionAutorizacion: 'RD N° 2053-2025-DUGEL-SR',
    presenceStates: 'P,T',
    absenceStates: 'F,J',
    absenceDenominator: 'REGISTRADAS',
    approvalMinimum: 13,
  });

  put('module', mod2.id, {
    hours: 528,
    credits: 22,
    efsrtHours: 192,
    competence: 'Diseña piezas gráficas vectoriales, retoca imágenes digitales, administra plataformas virtuales y formula planes de negocio.',
    resolucionAutorizacion: 'RD N° 2053-2025-DUGEL-SR',
    presenceStates: 'P,T',
    absenceStates: 'F,J',
    absenceDenominator: 'REGISTRADAS',
    approvalMinimum: 13,
  });

  const groupM1 = core.saveGroup(director, {
    name: 'Computación M1 - 2026-I',
    programId: program.id,
    moduleId: mod1.id,
    periodId: '2026-I',
    units: [...M1_UNITS.map(u => u.code), 'EFSRT'],
    section: 'A',
    turno: 'MAÑANA',
  });
  put('group', groupM1.id, {
    ciclo: 'Auxiliar Técnico',
    seccion: 'A',
    turno: 'MAÑANA',
    modalidad: 'PRESENCIAL',
    fechaInicio: '2026-03-16',
    fechaFin: '2026-07-24',
    periodClase: '2026-I',
    teacherName: 'Lic. Gonsalo Guzmán Jordán',
    efsrtInicio: '2026-06-22',
    efsrtFin: '2026-07-24',
  });

  const groupM2 = core.saveGroup(director, {
    name: 'Computación M2 - 2026-II',
    programId: program.id,
    moduleId: mod2.id,
    periodId: '2026-II',
    units: [...M2_UNITS.map(u => u.code), 'EFSRT'],
    section: 'A',
    turno: 'MAÑANA',
  });
  put('group', groupM2.id, {
    ciclo: 'Auxiliar Técnico',
    seccion: 'A',
    turno: 'MAÑANA',
    modalidad: 'PRESENCIAL',
    fechaInicio: '2026-08-10',
    fechaFin: '2026-12-18',
    periodClase: '2026-II',
    teacherName: 'Lic. Gonsalo Guzmán Jordán',
    efsrtInicio: '2026-11-16',
    efsrtFin: '2026-12-18',
  });

  for (const [grp, unitSpecs] of [[groupM1, M1_UNITS], [groupM2, M2_UNITS]]) {
    for (const u of unitSpecs) {
      put('unit', grp.id, {
        name: u.name,
        capacity: u.capacity,
        competence: `Competencia técnica en ${u.name}`,
        indicator1: `Identifica herramientas y entorno de ${u.name}.`,
        indicator2: `Ejecuta prácticas técnicas guiadas de ${u.name}.`,
        indicator3: `Verifica estándares de calidad y seguridad en ${u.name}.`,
        indicator4: `Resuelve casos aplicados de ${u.name}.`,
        indicator5: `Presenta producto final de ${u.name}.`,
      }, u.code);
      put('unitCurriculum', grp.id, { hours: u.hours, credits: u.credits }, u.code);
    }
    put('unit', grp.id, {
      name: 'Experiencias Formativas en Situaciones Reales de Trabajo (EFSRT)',
      capacity: 'Consolida desempeños técnicos en situaciones reales de trabajo aplicando buenas prácticas.',
      competence: 'Desempeño laboral supervisado',
    }, 'EFSRT');
    put('unitCurriculum', grp.id, { hours: 192, credits: 6 }, 'EFSRT');
  }

  const teacherRow = core.saveUser(director, {
    username: 'gonsalo.guzman',
    password: 'Docente-Visual-2026!',
    name: 'Lic. Gonsalo Guzmán Jordán',
    role: 'DOCENTE',
    assignments: [
      { groupId: groupM1.id, units: groupM1.units },
      { groupId: groupM2.id, units: groupM2.units },
    ],
  });
  const docente = core.user(teacherRow.id);

  const rosterSpecs = [
    { name: 'QUISPE CHOQUEHUANCA DE LA CRUZ, María Fernanda Alejandra del Rosario', doc: '74859612', sex: 'M', birth: '2003-08-19', condition: 'G', focal: true },
    { name: 'NUÑEZ PEÑA, José Ángel Óscar', doc: '71234568', sex: 'H', birth: '2002-11-05', condition: 'G' },
    ...EXTRA_STUDENTS.map((s, idx) => ({
      ...s,
      condition: idx % 10 === 9 ? 'B' : idx % 5 === 4 ? 'P' : 'G',
    })),
  ];

  let focalM1 = null;
  let focalM2 = null;
  const m1RowsByUnit = Object.fromEntries(M1_UNITS.map(u => [u.code, []]));

  for (let idx = 0; idx < rosterSpecs.length; idx++) {
    const spec = rosterSpecs[idx];
    const parts = splitName(spec.name);
    const student = core.saveStudent(director, {
      document: spec.doc,
      documentType: 'DNI',
      name: spec.name,
      lastName1: parts.lastName1,
      lastName2: parts.lastName2,
      firstNames: parts.firstNames,
      sex: spec.sex,
      birthDate: spec.birth,
    });
    const enr1 = core.enroll(director, { studentId: student.id, groupId: groupM1.id, startDate: '2026-03-16' });
    put('enrollment', enr1.id, { condition: spec.condition, emissionDate: '2026-12-18' });

    const baseScore = idx === 0 ? 19 : idx === 1 ? 18 : (idx === 29 ? 11 : 14 + (idx % 6));
    const unitGrades = M1_UNITS.map((u, uIdx) => ({
      unit: u.code,
      val: Math.min(20, Math.max(11, baseScore + ((uIdx % 3) - 1))),
    }));
    const approvedCount = unitGrades.filter(g => g.val >= 13).length;
    const failedCount = unitGrades.length - approvedCount;

    put('practice', enr1.id, {
      companyName: 'MUNICIPALIDAD DISTRITAL DE SAN MIGUEL',
      companyAddress: 'PLAZA DE ARMAS S/N, SAN MIGUEL',
      criterion1: 3, criterion2: 2, criterion3: 2, criterion4: 3, criterion5: 3,
      criterion6: 3, criterion7: 1, criterion8: 2, criterion9: 1,
      efsrtFinalGrade: idx === 29 ? 12 : 18,
    });
    put('closure', enr1.id, {
      modularGrade: Math.round(unitGrades.reduce((a, b) => a + b.val, 0) / unitGrades.length),
      approvedUnitsCount: approvedCount,
      failedUnitsCount: failedCount,
      observations: idx === 29 ? 'Requiere recuperación en UD' : '',
    });

    for (const gItem of unitGrades) {
      for (let i = 1; i <= 5; i++) {
        for (const comp of ['IA1', 'IA2', 'IA3', '']) {
          m1RowsByUnit[gItem.unit].push({
            enrollmentId: enr1.id,
            indicator: `IL${i}${comp ? '.' + comp : ''}`,
            value: gItem.val,
          });
        }
      }
      m1RowsByUnit[gItem.unit].push({ enrollmentId: enr1.id, indicator: 'RESULTADO_UD', value: gItem.val });
    }

    if (spec.focal) {
      focalM1 = { student, enrollment: enr1 };
      const enr2 = core.enroll(director, { studentId: student.id, groupId: groupM2.id, startDate: '2026-08-10' });
      put('enrollment', enr2.id, { condition: 'G', emissionDate: '2026-12-18' });
      put('practice', enr2.id, {
        companyName: 'ESTUDIO DIGITAL ALTIPLANO S.A.C.',
        companyAddress: 'AV. EL EJÉRCITO N° 410, JULIACA',
        criterion1: 3, criterion2: 2, criterion3: 2, criterion4: 3, criterion5: 3,
        criterion6: 3, criterion7: 1, criterion8: 2, criterion9: 1,
        efsrtFinalGrade: 19,
      });
      put('closure', enr2.id, {
        modularGrade: 19,
        approvedUnitsCount: M2_UNITS.length,
        failedUnitsCount: 0,
        observations: '',
      });
      for (const u of M2_UNITS) {
        const rows = [];
        for (let i = 1; i <= 5; i++) {
          for (const comp of ['IA1', 'IA2', 'IA3', '']) {
            rows.push({
              enrollmentId: enr2.id,
              indicator: `IL${i}${comp ? '.' + comp : ''}`,
              value: 19,
            });
          }
        }
        rows.push({ enrollmentId: enr2.id, indicator: 'RESULTADO_UD', value: 19 });
        core.saveAcademic(docente, 'grades', { groupId: groupM2.id, unit: u.code, rows });
      }
      const suggested = DocumentSettings.suggestInstitutionalRegistry(core, director, {
        groupId: groupM2.id,
        enrollmentId: enr2.id,
        emissionYear: '2026',
      });
      const regFields = {
        registerCode: suggested.registerCode,
        resolutionNumber: suggested.resolutionNumber,
        referenceResolution: 'R.D. Nº 2053-2025-DUGEL-SR',
        resolutionDate: '2026-12-18',
        expedienteNumber: 'EXP-0142-2026',
        expedienteDate: '2026-12-10',
        ugelCode: `000001-AT-00001-${suggested.programAcronym || 'CI'}${suggested.shortRef || '26'}-${suggested.codeYear || '2026'}`,
        registryBook: 'LIBRO 02',
        registryFolio: '014',
        registryNumber: '0001',
        registryDate: '2026-12-18',
        registryAsiento: 'ASIENTO N° 001 - FOLIO 014',
        graduationDate: '2026-12-15',
        specialtyTeacher: 'Lic. Gonsalo Guzmán Jordán',
      };
      put('registry', enr1.id, regFields);
      put('registry', enr2.id, regFields);
      focalM2 = { student, enrollment: enr2 };
    }
  }

  for (const [unitCode, rows] of Object.entries(m1RowsByUnit)) {
    core.saveAcademic(docente, 'grades', { groupId: groupM1.id, unit: unitCode, rows });
  }

  return { core, director, groupM1, groupM2, focalM1, focalM2 };
}

async function generateComparisonArtifacts() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cepro-visual-2026-'));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let browser = null;
  let server = null;
  let core = null;

  try {
    const dbDir = path.join(tmpDir, 'db');
    const browserProfile = path.join(tmpDir, 'chrome-profile');
    fs.mkdirSync(dbDir, { recursive: true });
    fs.mkdirSync(browserProfile, { recursive: true });

    core = new OfflineCore(dbDir);
    const dataset = buildRich2026Dataset(core);
    const { director, groupM1, groupM2, focalM1, focalM2 } = dataset;

    const specs = [
      { id: 'TMPL-22', title: 'Resolución Directoral de Título', groupId: groupM2.id, enrollmentId: focalM2.enrollment.id, basePages: [1], finalNames: ['final_TMPL-22.png'], compareNames: [{ page: 1, basePage: 1, name: 'compare_TMPL-22.png', label: 'Página única' }] },
      { id: 'TMPL-21', title: 'Título de Auxiliar Técnico', groupId: groupM2.id, enrollmentId: focalM2.enrollment.id, basePages: [1, 2], finalNames: ['final_TMPL-21_p1.png', 'final_TMPL-21_p2.png'], compareNames: [{ page: 1, basePage: 1, name: 'compare_TMPL-21_p1.png', label: 'Anverso (Pág. 1)' }, { page: 2, basePage: 2, name: 'compare_TMPL-21_p2.png', label: 'Reverso Oficial (Pág. 2)' }] },
      { id: 'TMPL-20', title: 'Certificado Modular', groupId: groupM1.id, enrollmentId: focalM1.enrollment.id, basePages: [1, 2], finalNames: ['final_TMPL-20_p1.png', 'final_TMPL-20_p2.png'], compareNames: [{ page: 1, basePage: 1, name: 'compare_TMPL-20_p1.png', label: 'Anverso (Pág. 1)' }, { page: 2, basePage: 2, name: 'compare_TMPL-20_p2.png', label: 'Reverso Unidades/Notas (Pág. 2)' }] },
      { id: 'TMPL-23', title: 'Certificado de Egresado', groupId: groupM2.id, enrollmentId: focalM2.enrollment.id, basePages: [1], finalNames: ['final_TMPL-23.png'], compareNames: [{ page: 1, basePage: 1, name: 'compare_TMPL-23.png', label: 'Página única (M1 + M2)' }] },
      { id: 'TMPL-19', title: 'Acta de Evaluación Modular', groupId: groupM1.id, basePages: [1, 2], finalNames: ['final_TMPL-19_p1.png', 'final_TMPL-19_p2.png', 'final_TMPL-19_p3.png', 'final_TMPL-19_p4.png'], compareNames: [{ page: 1, basePage: 1, name: 'compare_TMPL-19_p1.png', label: 'Anverso Pliego 1 (Pág. 1)' }, { page: 2, basePage: 2, name: 'compare_TMPL-19_p2.png', label: 'Reverso Pliego 1 (Pág. 2)' }, { page: 3, basePage: 1, name: 'compare_TMPL-19_p3.png', label: 'Anverso Pliego 2 (Pág. 3)' }] },
      { id: 'TMPL-01', title: 'Nómina de Matrícula', groupId: groupM1.id, basePages: [1], finalNames: ['final_TMPL-01_p1.png', 'final_TMPL-01_p2.png'], compareNames: [{ page: 1, basePage: 1, name: 'compare_TMPL-01_p1.png', label: 'Página 1 (1..30)' }, { page: 2, basePage: 1, name: 'compare_TMPL-01_p2.png', label: 'Página 2 (31..32)' }] },
    ];

    const pdfRecords = [];
    for (const s of specs) {
      const doc = core.document(director, {
        templateId: s.id,
        groupId: s.groupId,
        ...(s.enrollmentId ? { enrollmentId: s.enrollmentId } : {}),
        official2026: true,
      });
      assert.equal(doc.preflight.complete, true, `${s.id} debe estar completo para captura limpia: ${JSON.stringify(doc.preflight.missing)}`);
      const bytes = await renderPDF(ROOT, doc, director);
      const pdfOutPath = path.join(OUT_DIR, `${s.id}.pdf`);
      fs.writeFileSync(pdfOutPath, bytes);
      pdfRecords.push({ ...s, pdfBytes: bytes, pdfOutPath });
    }

    // Servidor efímero en 127.0.0.1 para pdfjs-dist y buffer PDF actual
    const pdfJsPath = path.join(ROOT, 'node_modules', 'pdfjs-dist', 'build', 'pdf.min.mjs');
    const pdfWorkerPath = path.join(ROOT, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
    let activePdfBuffer = null;

    server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/pdf.min.mjs') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        fs.createReadStream(pdfJsPath).pipe(res);
      } else if (urlPath === '/pdf.worker.min.mjs') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        fs.createReadStream(pdfWorkerPath).pipe(res);
      } else if (urlPath === '/current.pdf') {
        res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' });
        res.end(activePdfBuffer);
      } else if (urlPath.startsWith('/render/')) {
        const pageNum = Number(urlPath.split('/')[2] || '1');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  canvas { display: block; }
</style>
</head>
<body>
  <canvas id="pdf-canvas"></canvas>
  <script type="module">
    import * as pdfjsLib from '/pdf.min.mjs';
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    try {
      const pdf = await pdfjsLib.getDocument({ url: '/current.pdf' }).promise;
      window.totalPages = pdf.numPages;
      const page = await pdf.getPage(${pageNum});
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.getElementById('pdf-canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      window.canvasDims = { width: canvas.width, height: canvas.height };
      window.pdfRenderComplete = true;
    } catch (err) {
      window.pdfRenderError = err?.message || String(err);
    }
  </script>
</body>
</html>`);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
      userDataDir: browserProfile,
    });
    const page = await browser.newPage();

    async function renderPdfPageToPng(pdfBytes, pageNumber, destPngPath) {
      activePdfBuffer = pdfBytes;
      await page.setViewport({ width: 2200, height: 2200, deviceScaleFactor: 1 });
      await page.goto(`${baseUrl}/render/${pageNumber}?t=${Date.now()}`, { waitUntil: 'networkidle0' });
      await page.waitForFunction('window.pdfRenderComplete === true || Boolean(window.pdfRenderError)', { timeout: 25000 });
      const renderErr = await page.evaluate(() => window.pdfRenderError || null);
      if (renderErr) throw new Error(`Error renderizando PDF página ${pageNumber}: ${renderErr}`);
      const dims = await page.evaluate(() => window.canvasDims);
      await page.setViewport({
        width: Math.max(820, dims.width),
        height: Math.max(620, dims.height),
        deviceScaleFactor: 1,
      });
      const canvasEl = await page.$('#pdf-canvas');
      await canvasEl.screenshot({ path: destPngPath });
      return dims;
    }

    const generatedPngs = [];

    for (const rec of pdfRecords) {
      // 1. Renderizar páginas base limpias en tmpDir
      const baseBytes = fs.readFileSync(path.join(BASE_PDF_DIR, BASE_PDF_MAP[rec.id]));
      const basePngByPage = new Map();
      for (const bp of rec.basePages) {
        const bpPath = path.join(tmpDir, `base_${rec.id}_p${bp}.png`);
        await renderPdfPageToPng(baseBytes, bp, bpPath);
        basePngByPage.set(bp, bpPath);
      }

      // 2. Renderizar capturas individuales final_TMPL-*.png
      const finalPngByPage = new Map();
      for (let i = 0; i < rec.finalNames.length; i++) {
        const pageNum = i + 1;
        const outPngPath = path.join(OUT_DIR, rec.finalNames[i]);
        await renderPdfPageToPng(rec.pdfBytes, pageNum, outPngPath);
        finalPngByPage.set(pageNum, outPngPath);
        generatedPngs.push(outPngPath);
      }

      // 3. Renderizar comparativas lado a lado compare_TMPL-*.png
      for (const cmp of rec.compareNames) {
        const basePngDataUri = `data:image/png;base64,${fs.readFileSync(basePngByPage.get(cmp.basePage)).toString('base64')}`;
        const finalPngDataUri = `data:image/png;base64,${fs.readFileSync(finalPngByPage.get(cmp.page)).toString('base64')}`;
        const cmpHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    width: 1960px;
    background: #e2e8f0;
    font-family: "Segoe UI", Arial, sans-serif;
    color: #0f172a;
  }
  .topbar {
    background: #0f172a;
    color: #f8fafc;
    padding: 18px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 4px solid #0284c7;
  }
  .topbar h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.2px; }
  .topbar span { font-size: 14px; color: #bae6fd; font-weight: 600; }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 24px 28px 28px;
    align-items: start;
  }
  .card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
  }
  .card-head {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-head.base { background: #f8fafc; color: #334155; border-bottom: 1px solid #cbd5e1; }
  .card-head.final { background: #ecfeff; color: #0c4a6e; border-bottom: 1px solid #7dd3fc; }
  .sheet { padding: 12px; background: #cbd5e1; }
  .sheet img { width: 100%; height: auto; display: block; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
</style>
</head>
<body>
  <div class="topbar">
    <h1>${escapeHtml(rec.id)} — ${escapeHtml(rec.title)} (${escapeHtml(cmp.label)})</h1>
    <span>CETPRO “MICAELA BASTIDAS” · Comparativa Oficial 2026</span>
  </div>
  <div class="grid">
    <div class="card">
      <div class="card-head base"><span>Plantilla Limpia Original Base</span><span>${escapeHtml(BASE_PDF_MAP[rec.id])} (p.${cmp.basePage})</span></div>
      <div class="sheet"><img src="${basePngDataUri}" /></div>
    </div>
    <div class="card">
      <div class="card-head final"><span>Documento Oficial 2026 Lleno</span><span>${escapeHtml(rec.id)}.pdf (p.${cmp.page})</span></div>
      <div class="sheet"><img src="${finalPngDataUri}" /></div>
    </div>
  </div>
</body>
</html>`;
        await page.setViewport({ width: 1960, height: 1200, deviceScaleFactor: 1 });
        await page.setContent(cmpHtml, { waitUntil: 'load' });
        await page.evaluate(async () => {
          await Promise.all(Array.from(document.images).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));
        });
        const cmpOutPath = path.join(OUT_DIR, cmp.name);
        await page.screenshot({ path: cmpOutPath, fullPage: true });
        generatedPngs.push(cmpOutPath);
      }
    }

    // Validación estricta de todos los PNG generados: width > 800, size > 20KB
    console.log(`Directorio de salida: ${OUT_DIR}`);
    console.log(`PDFs generados (${pdfRecords.length}):`);
    for (const rec of pdfRecords) {
      console.log(`  - ${rec.pdfOutPath} (${fs.statSync(rec.pdfOutPath).size} bytes)`);
    }
    console.log(`PNGs generados y verificados (${generatedPngs.length}):`);
    for (const pngPath of generatedPngs) {
      const info = readPngInfo(pngPath);
      assert.ok(info.width > 800, `PNG demasiado angosto (${info.width}px <= 800): ${pngPath}`);
      assert.ok(info.size > 20 * 1024, `PNG demasiado liviano (${info.size}B <= 20KB): ${pngPath}`);
      console.log(`  - ${info.filePath} [${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB]`);
    }
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    if (server) {
      try { await new Promise(resolve => server.close(resolve)); } catch {}
    }
    if (core) {
      try { core.close(); } catch {}
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    } catch {}
  }
}

generateComparisonArtifacts().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
