/**
 * scripts/seed-complete-simulation.cjs
 * 
 * SIMULACIÓN INTEGRAL CANÓNICA DE DATOS — CEPRO_MICAELA 2.0
 * 
 * Puebla el sandbox de desarrollo (dev-sandbox/data) con datos 100% realistas
 * y canónicos del CETPRO "Micaela Bastidas Puyucawa" (San Román, Puno)
 * para garantizar que las 21 plantillas oficiales MINEDU alcancen:
 * 1. Preflight Complete = true (0 campos faltantes).
 * 2. Emisión física 100% OFICIAL sin marcas de BORRADOR ni DEMOSTRACIÓN.
 * 3. Cobertura irrenunciable de las 7 UDs de Peluquería y Barbería M2 (TMPL-17 y TMPL-05_EXT).
 */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { validateDevSandbox } = require('./dev-sandbox-guard.cjs');
const { OfflineCore } = require('./offline-core.cjs');
const D = require('./offline-documents.cjs');

const root = path.resolve(__dirname, '..');
const sandboxDataDir = path.resolve(root, 'dev-sandbox', 'data');

const id = () => crypto.randomUUID();
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

// Paleta de nombres sintéticos realistas de la región Puno / San Román
const SURNAMES = [
  'QUISPE', 'MAMANI', 'CONDORI', 'FLORES', 'APAZA', 'CHAMBI', 'HUANCA', 'CANAHUA',
  'TICONCA', 'COAQUIRA', 'CALISAYA', 'CANSAYA', 'GUTIERREZ', 'HUALLPA', 'LEQQUE',
  'LOPEZ', 'MEDINA', 'MENDOZA', 'PARICAHUA', 'RAMOS', 'RODRIGUEZ', 'ROQUE',
  'SUCASACA', 'TURPO', 'VALENCIA', 'VILCA', 'ZEA', 'ALVAREZ', 'CASTRO', 'DIAZ',
  'TORRES', 'VARGAS', 'CACERES', 'YUCRA', 'CHOQUE', 'POMA', 'CALLATA', 'PILCO'
];

const MALE_NAMES = [
  'Edwin Rolando', 'Javier Luis', 'Ricardo Miguel', 'Rubén Darío', 'Jorge Luis',
  'Julio César', 'Hernán Alberto', 'Walter Marco', 'César Augusto', 'Fredy Orlando',
  'Marco Antonio', 'David Alejandro', 'Carlos Daniel', 'Oscar Efraín', 'Juan Gabriel',
  'Víctor Hugo', 'Ángel David', 'Alex Bryan', 'Edgar Nelson', 'Ronald Fernando'
];

const FEMALE_NAMES = [
  'Carmen Rosa', 'Diana Maritza', 'Gladys Pilar', 'Miriam Yanet', 'Beatriz Elena',
  'Patricia Roxana', 'Ana María', 'Verónica Soledad', 'Maritza Del Carmen', 'Silvia Karina',
  'Bertha Elena', 'Liliana Maribel', 'Judith Vanessa', 'Norma Ruth', 'Mónica Lucía',
  'Yessica Paola', 'Ruth Noemí', 'Nancy Raquel', 'Gloria Marilú', 'Marleni Edith'
];

function generateStudentsList(prefixDni, count = 30) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const isFemale = i % 2 === 0;
    const lastName1 = SURNAMES[(i * 3) % SURNAMES.length];
    const lastName2 = SURNAMES[(i * 3 + 1) % SURNAMES.length];
    const firstNames = isFemale
      ? FEMALE_NAMES[i % FEMALE_NAMES.length]
      : MALE_NAMES[i % MALE_NAMES.length];
    const sex = isFemale ? 'M' : 'H';
    const birthYear = 1996 + (i % 10);
    const birthMonth = String((i % 12) + 1).padStart(2, '0');
    const birthDay = String((i % 28) + 1).padStart(2, '0');
    const document = String(prefixDni + i).padStart(8, '0');

    list.push({
      document,
      documentType: 'DNI',
      name: `${lastName1} ${lastName2}, ${firstNames}`,
      lastName1,
      lastName2,
      firstNames,
      sex,
      birthDate: `${birthYear}-${birthMonth}-${birthDay}`
    });
  }
  return list;
}

// Fechas hábiles (lunes a viernes) entre dos rangos
function getBusinessDays(startDateStr, endDateStr, maxDays = 15) {
  const dates = [];
  const current = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  while (current <= end && dates.length < maxDays) {
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

async function runSeed() {
  console.log('========================================================================');
  console.log('   CEPRO_MICAELA 2.0 — SEMBRADOR DE SIMULACIÓN CANÓNICA INTEGRAL        ');
  console.log('========================================================================\n');

  // 1. Guardián de seguridad estricto
  console.log('[1/8] Verificando entorno sandbox autorizado...');
  const guard = validateDevSandbox({ dataDir: sandboxDataDir });
  console.log('✔ Sandbox autorizado:', guard.dataDir);

  const core = new OfflineCore(guard.dataDir, null);

  try {
    // 2. Setup institucional o recuperación del Director
    console.log('[2/8] Configurando perfil institucional y Director...');
    let director;
    if (!core.status().initialized) {
      core.setup({
        username: 'director.dev',
        password: 'DirectorDev2026!',
        name: 'Lic. Eloy Valerio Paredes Feliciano',
        institutionName: 'CETPRO "Micaela Bastidas Puyucawa"',
        importBaseline: false,
      });
      director = core.users().find(u => u.username === 'director.dev');
    } else {
      director = core.users().find(u => u.role === 'DIRECTOR') || core.users()[0];
      // Asegurar nombre institucional canónico
      core.setting('institution', {
        ...core.setting('institution'),
        name: 'CETPRO "Micaela Bastidas Puyucawa"'
      });
      // Actualizar nombre del director si difería
      if (director.name !== 'Lic. Eloy Valerio Paredes Feliciano') {
        const u = core.user(director.id);
        const dirRec = core.record('userDirectory', u.id);
        core.write(director, 'userDirectory', {
          ...u,
          name: 'Lic. Eloy Valerio Paredes Feliciano'
        }, dirRec?.rev || null);
        director = { ...director, name: 'Lic. Eloy Valerio Paredes Feliciano' };
      }
    }
    console.log('✔ Director institucional activo:', director.name);

    const putSettings = (kind, target, fields, unit) => {
      const scope = { kind, ...(target ? { target } : {}), ...(unit ? { unit } : {}) };
      const sId = D.idFor(scope);
      const existing = core.record('documentSettings', sId);
      return D.saveSettings(core, director, { scope, fields, rev: existing ? existing.rev : null });
    };

    // 3. Perfil Institucional completo (17 campos normados)
    console.log('[3/8] Poblando configuración institucional y resoluciones...');
    putSettings('institution', null, {
      nombre: 'CETPRO "Micaela Bastidas Puyucawa"',
      tipoGestion: 'PÚBLICA',
      codigoModular: '1027648',
      dre: 'DRE Puno',
      ugel: 'UGEL San Román',
      region: 'Puno',
      departamento: 'Puno',
      provincia: 'San Román',
      distrito: 'San Miguel',
      lugar: 'San Miguel, San Román, Puno',
      direccion: 'Jr. Tacna N° 245, San Miguel',
      telefono: '051-321456',
      resolucionAutorizacion: 'RD N° 0125-1988-ED',
      resolucionConversion: 'RD N° 0450-2022-DREP',
      directorNombre: 'Lic. Eloy Valerio Paredes Feliciano',
      secretariaNombre: 'Carmen Yovana Vilca Puma',
      coordinadorNombre: 'Lic. Carlos Mamani Quispe'
    });

    // 4. Configuración del Año Lectivo 2026 y Periodos Académicos
    console.log('[4/8] Configurando Año Académico 2026 y Periodos 2026-I y 2026-II...');
    putSettings('academicYear', '2026', {
      institutionJson: JSON.stringify({
        nombre: 'CETPRO "Micaela Bastidas Puyucawa"',
        dre: 'DRE Puno',
        ugel: 'UGEL San Román',
        departamento: 'Puno',
        provincia: 'San Román',
        distrito: 'San Miguel',
        directorNombre: 'Lic. Eloy Valerio Paredes Feliciano',
        resolucionAutorizacion: 'RD N° 0125-1988-ED',
        resolucionConversion: 'RD N° 0450-2022-DREP'
      }),
      calendarJson: JSON.stringify([
        { name: 'Periodo académico (2026-I)', start: '2026-03-02', end: '2026-07-24', detail: 'Primer semestre académico 2026' },
        { name: 'Periodo académico (2026-II)', start: '2026-08-10', end: '2026-12-18', detail: 'Segundo semestre académico 2026' }
      ]),
      hours: 1700,
      credits: 64,
      directoryDate: '2026-03-01',
      directoryPlace: 'San Miguel, San Román, Puno'
    });

    putSettings('academicPeriod', '2026-I', {
      year: '2026',
      fechaInicio: '2026-03-02',
      fechaFin: '2026-07-24',
      hours: 850,
      credits: 32
    });

    putSettings('academicPeriod', '2026-II', {
      year: '2026',
      fechaInicio: '2026-08-10',
      fechaFin: '2026-12-18',
      hours: 850,
      credits: 32
    });

    // 5. Configurar Programas y Módulos Oficiales
    console.log('[5/8] Configurando Programas, Módulos y Currículos canónicos...');

    // A. COMPUTACIÓN E INFORMÁTICA
    let pComp = core.record('programs', 'PROG-005');
    if (!pComp) {
      pComp = core.write(director, 'programs', { id: 'PROG-005', nombre: 'COMPUTACIÓN E INFORMÁTICA', academicYear: '2026' });
    }
    putSettings('program', 'PROG-005', {
      nivelFormativo: 'Auxiliar Técnico',
      tipoPlan: 'Plan de Estudios Modular MINEDU',
      resolucionPrograma: 'RD N° 0045-2019-DREP',
      officialTitleText: 'AUXILIAR TÉCNICO EN COMPUTACIÓN E INFORMÁTICA'
    });

    let mOfim = core.record('modules', 'MOD-009');
    if (!mOfim) {
      mOfim = core.write(director, 'modules', { id: 'MOD-009', nombre: 'Ofimática', programaId: 'PROG-005', academicYear: '2026' });
    } else if (mOfim.academicYear !== '2026' || mOfim.programaId !== 'PROG-005') {
      mOfim = core.write(director, 'modules', { ...mOfim, academicYear: '2026', programaId: 'PROG-005' }, mOfim.rev);
    }

    putSettings('module', 'MOD-009', {
      resolucionAutorizacion: 'RD N° 0450-2022-DREP',
      hours: 440,
      credits: 16,
      efsrtHours: 80,
      presenceStates: 'P,T',
      absenceStates: 'F,J',
      absenceDenominator: 'REGISTRADAS',
      approvalMinimum: 13,
      competence: 'Gestiona aplicaciones informáticas de oficina, administración de documentos electrónicos y herramientas colaborativas en entornos digitales.'
    });

    const compUnits = [
      { code: 'UD1', name: 'Sistema Operativo y Gestión de Archivos', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-03-16', fechaFin: '2026-04-03', confirmed: true },
      { code: 'UD2', name: 'Procesamiento de Textos y Documentos Digitales (Word)', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-04-06', fechaFin: '2026-04-24', confirmed: true },
      { code: 'UD3', name: 'Hojas de Cálculo y Fórmulas Financieras (Excel)', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-04-27', fechaFin: '2026-05-15', confirmed: true },
      { code: 'UD4', name: 'Presentaciones Gráficas Multimedia (PowerPoint)', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-05-18', fechaFin: '2026-06-05', confirmed: true },
      { code: 'UD5', name: 'Comunicación en Entornos Virtuales y Colaborativos', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-06-08', fechaFin: '2026-06-26', confirmed: true },
      { code: 'UD6', name: 'Seguridad Digital y Respaldo de Información', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-06-29', fechaFin: '2026-07-17', confirmed: true },
      { code: 'EFSRT', name: 'Experiencias Formativas en Situaciones Reales de Trabajo', hours: 80, credits: 4, theoryHours: 0, practiceHours: 80, days: 20, fechaInicio: '2026-06-01', fechaFin: '2026-07-24', confirmed: true }
    ];

    putSettings('curriculum', 'MOD-009', {
      year: '2026',
      periodId: '2026-I',
      nombre: 'Ofimática',
      programName: 'COMPUTACIÓN E INFORMÁTICA',
      programCode: 'PROG-005',
      programHours: 1700,
      programCredits: 64,
      nivelFormativo: 'Auxiliar Técnico',
      turno: 'Mañana',
      teacherNames: 'Prof. Martín Valdivia Rodriguez',
      hours: 440,
      credits: 16,
      efsrtHours: 80,
      unitsJson: JSON.stringify(compUnits)
    });

    putSettings('moduleDefaults', 'MOD-009', {
      year: '2026',
      source: 'CNOF - MINEDU 2026',
      notes: 'Valores referenciales canónicos',
      dataJson: JSON.stringify({
        module: { hours: 440, credits: 16, efsrtHours: 80, competence: 'Gestiona aplicaciones informáticas de oficina y documentos digitales.' },
        units: compUnits
      })
    });

    // B. PELUQUERÍA Y BARBERÍA (PROG-004 / PROG-008)
    let pPel = core.record('programs', 'PROG-004');
    if (!pPel) {
      pPel = core.write(director, 'programs', { id: 'PROG-004', nombre: 'PELUQUERÍA Y BARBERÍA', academicYear: '2026' });
    }
    putSettings('program', 'PROG-004', {
      nivelFormativo: 'Auxiliar Técnico',
      tipoPlan: 'Plan de Estudios Modular MINEDU',
      resolucionPrograma: 'RD N° 0045-2019-DREP',
      officialTitleText: 'AUXILIAR TÉCNICO EN PELUQUERÍA Y BARBERÍA'
    });

    let pPel8 = core.record('programs', 'PROG-008');
    if (!pPel8) {
      pPel8 = core.write(director, 'programs', { id: 'PROG-008', nombre: 'PELUQUERÍA Y BARBERÍA', academicYear: '2026' });
    }
    putSettings('program', 'PROG-008', {
      nivelFormativo: 'Auxiliar Técnico',
      tipoPlan: 'Plan de Estudios Modular MINEDU',
      resolucionPrograma: 'RD N° 0045-2019-DREP',
      officialTitleText: 'AUXILIAR TÉCNICO EN PELUQUERÍA Y BARBERÍA'
    });

    // Peluquería M1 (MOD-007)
    let mPel1 = core.record('modules', 'MOD-007');
    if (!mPel1) {
      mPel1 = core.write(director, 'modules', { id: 'MOD-007', nombre: 'Corte de Cabellos, Peinados y Diseño de Barbas', programaId: 'PROG-004', academicYear: '2026' });
    } else if (mPel1.academicYear !== '2026' || mPel1.programaId !== 'PROG-004') {
      mPel1 = core.write(director, 'modules', { ...mPel1, academicYear: '2026', programaId: 'PROG-004' }, mPel1.rev);
    }

    putSettings('module', 'MOD-007', {
      resolucionAutorizacion: 'RD N° 0450-2022-DREP',
      hours: 420,
      credits: 16,
      efsrtHours: 80,
      presenceStates: 'P,T',
      absenceStates: 'F,J',
      absenceDenominator: 'REGISTRADAS',
      approvalMinimum: 13,
      competence: 'Ejecuta técnicas de corte de cabello, peinados y arreglo de barba aplicando normas de bioseguridad.'
    });

    const pel1Units = [
      { code: 'UD1', name: 'Diagnóstico y Tratamiento Capilar', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-03-16', fechaFin: '2026-04-03', confirmed: true },
      { code: 'UD2', name: 'Técnicas de Corte de Cabello', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-04-06', fechaFin: '2026-04-24', confirmed: true },
      { code: 'UD3', name: 'Peinados, Colocación de Postizos y Extensiones', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-04-27', fechaFin: '2026-05-15', confirmed: true },
      { code: 'UD4', name: 'Diseño y Corte de Barba y Bigote', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-05-18', fechaFin: '2026-06-05', confirmed: true },
      { code: 'UD5', name: 'Comunicación para el Desarrollo Personal y Profesional', hours: 50, credits: 2, theoryHours: 15, practiceHours: 35, days: 15, fechaInicio: '2026-06-08', fechaFin: '2026-06-26', confirmed: true },
      { code: 'UD6', name: 'Aplicaciones de Herramientas Informáticas', hours: 50, credits: 2, theoryHours: 15, practiceHours: 35, days: 15, fechaInicio: '2026-06-29', fechaFin: '2026-07-17', confirmed: true },
      { code: 'EFSRT', name: 'Experiencias Formativas en Situaciones Reales de Trabajo - Barbería', hours: 80, credits: 4, theoryHours: 0, practiceHours: 80, days: 20, fechaInicio: '2026-06-01', fechaFin: '2026-07-24', confirmed: true }
    ];

    putSettings('curriculum', 'MOD-007', {
      year: '2026',
      periodId: '2026-I',
      nombre: 'Corte de Cabellos, Peinados y Diseño de Barbas',
      programName: 'PELUQUERÍA Y BARBERÍA',
      programCode: 'PROG-004',
      programHours: 1700,
      programCredits: 64,
      nivelFormativo: 'Auxiliar Técnico',
      turno: 'Tarde',
      teacherNames: 'Prof. María Elena Quispe Chambi',
      hours: 420,
      credits: 16,
      efsrtHours: 80,
      unitsJson: JSON.stringify(pel1Units)
    });

    putSettings('moduleDefaults', 'MOD-007', {
      year: '2026',
      source: 'CNOF - MINEDU 2026',
      notes: 'Valores referenciales canónicos',
      dataJson: JSON.stringify({
        module: { hours: 420, credits: 16, efsrtHours: 80, competence: 'Ejecuta técnicas de corte de cabello y barbería.' },
        units: pel1Units
      })
    });

    // Peluquería M2 (MOD-008 — 7 UDs COMPLETAS + EFSRT)
    let mPel2 = core.record('modules', 'MOD-008');
    if (!mPel2) {
      mPel2 = core.write(director, 'modules', { id: 'MOD-008', nombre: 'Ondulación, Decoloración, y Tinturación', programaId: 'PROG-004', academicYear: '2026' });
    } else if (mPel2.academicYear !== '2026' || mPel2.programaId !== 'PROG-004') {
      mPel2 = core.write(director, 'modules', { ...mPel2, academicYear: '2026', programaId: 'PROG-004' }, mPel2.rev);
    }

    putSettings('module', 'MOD-008', {
      resolucionAutorizacion: 'RD N° 0450-2022-DREP',
      hours: 480,
      credits: 18,
      efsrtHours: 100,
      presenceStates: 'P,T',
      absenceStates: 'F,J',
      absenceDenominator: 'REGISTRADAS',
      approvalMinimum: 13,
      competence: 'Realiza cambios de estructura y color en la fibra capilar (ondulación, decoloración, tinturación) cumpliendo estándares técnicos y ambientales.'
    });

    const pel2Units = [
      { code: 'UD1', name: 'Diagnóstico y Tratamiento Capilar', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-08-10', fechaFin: '2026-09-04', confirmed: true },
      { code: 'UD2', name: 'Anillados y Ondulación Permanente', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-09-07', fechaFin: '2026-10-02', confirmed: true },
      { code: 'UD3', name: 'Alisado Permanente y Reacondicionamiento', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-10-05', fechaFin: '2026-10-30', confirmed: true },
      { code: 'UD4', name: 'Colorimetría y Técnicas de Coloración', hours: 60, credits: 2, theoryHours: 15, practiceHours: 45, days: 15, fechaInicio: '2026-11-02', fechaFin: '2026-11-20', confirmed: true },
      { code: 'UD5', name: 'Técnicas de Decoloración y Efectos de Luz', hours: 50, credits: 2, theoryHours: 15, practiceHours: 35, days: 15, fechaInicio: '2026-11-23', fechaFin: '2026-12-04', confirmed: true },
      { code: 'UD6', name: 'Emprendimiento y Gestión de Salón de Belleza', hours: 50, credits: 2, theoryHours: 15, practiceHours: 35, days: 15, fechaInicio: '2026-12-01', fechaFin: '2026-12-11', confirmed: true },
      { code: 'UD7', name: 'Ética y Ciudadanía en el Trabajo', hours: 40, credits: 2, theoryHours: 15, practiceHours: 25, days: 10, fechaInicio: '2026-12-07', fechaFin: '2026-12-18', confirmed: true },
      { code: 'EFSRT', name: 'Experiencias Formativas en Situaciones Reales de Trabajo - Estilismo', hours: 100, credits: 4, theoryHours: 0, practiceHours: 100, days: 25, fechaInicio: '2026-10-15', fechaFin: '2026-12-18', confirmed: true }
    ];

    putSettings('curriculum', 'MOD-008', {
      year: '2026',
      periodId: '2026-II',
      nombre: 'Ondulación, Decoloración, y Tinturación',
      programName: 'PELUQUERÍA Y BARBERÍA',
      programCode: 'PROG-004',
      programHours: 1700,
      programCredits: 64,
      nivelFormativo: 'Auxiliar Técnico',
      turno: 'Tarde',
      teacherNames: 'Prof. Roxana Condori Apaza',
      hours: 480,
      credits: 18,
      efsrtHours: 100,
      unitsJson: JSON.stringify(pel2Units)
    });

    putSettings('moduleDefaults', 'MOD-008', {
      year: '2026',
      source: 'CNOF - MINEDU 2026',
      notes: 'Valores referenciales canónicos con 7 UDs oficiales',
      dataJson: JSON.stringify({
        module: { hours: 480, credits: 18, efsrtHours: 100, competence: 'Realiza cambios estructurales y cromáticos capilares.' },
        units: pel2Units
      })
    });

    // 6. Crear o actualizar las 3 Aulas Canónicas
    console.log('[6/8] Creando aulas canónicas y asignando personal docente...');

    // Aula 1: Computación
    let groupComp = core.records('groups').find(g => g.id === 'G-SIM-COMP-2026-I');
    if (!groupComp) {
      groupComp = core.write(director, 'groups', {
        id: 'G-SIM-COMP-2026-I',
        name: 'Computación e Informática · Ofimática · Grupo A',
        programId: 'PROG-005',
        moduleId: 'MOD-009',
        periodId: '2026-I',
        section: 'A',
        turno: 'Mañana',
        units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'],
        closed: false
      });
    }

    // Aula 2: Peluquería M1
    let groupPel1 = core.records('groups').find(g => g.id === 'G-SIM-PEL1-2026-I');
    if (!groupPel1) {
      groupPel1 = core.write(director, 'groups', {
        id: 'G-SIM-PEL1-2026-I',
        name: 'Peluquería y Barbería · M1 Corte y Peinado · Grupo A',
        programId: 'PROG-004',
        moduleId: 'MOD-007',
        periodId: '2026-I',
        section: 'A',
        turno: 'Tarde',
        units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'],
        closed: false
      });
    }

    // Aula 3: Peluquería M2 (con las 7 UDs)
    let groupPel2 = core.records('groups').find(g => g.id === 'G-SIM-PEL2-2026-II');
    if (!groupPel2) {
      groupPel2 = core.write(director, 'groups', {
        id: 'G-SIM-PEL2-2026-II',
        name: 'Peluquería y Barbería · M2 Ondulación y Tinturación · Grupo A',
        programId: 'PROG-004',
        moduleId: 'MOD-008',
        periodId: '2026-II',
        section: 'A',
        turno: 'Tarde',
        units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7', 'EFSRT'],
        closed: false
      });
    }

    function upsertUser(username, password, name, role, assignments = []) {
      const existing = core.users().find(u => u.username === username);
      if (existing) {
        const updated = {
          ...existing,
          name,
          assignments,
          version: (existing.version || 0) + 1
        };
        core.putUser(updated);
        const dirRec = core.record('userDirectory', existing.id);
        if (dirRec) {
          core.write(director, 'userDirectory', {
            id: existing.id,
            username,
            name,
            role,
            active: true,
            archived: false,
            assignments,
            version: updated.version
          }, dirRec.rev);
        }
        return updated;
      } else {
        return core.saveUser(director, {
          username,
          password,
          name,
          role,
          active: true,
          assignments
        });
      }
    }

    const userSec = upsertUser('secretaria.dev', 'SecretariaDev2026!', 'Carmen Yovana Vilca Puma', 'SECRETARIA');
    const compAssignments = [{ groupId: groupComp.id, units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'] }];
    const userDocComp = upsertUser('docente.dev', 'DocenteDev2026!', 'Prof. Martín Valdivia Rodriguez', 'DOCENTE', compAssignments);
    const pel1Assignments = [{ groupId: groupPel1.id, units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'] }];
    const userDocPel1 = upsertUser('docente.peluqueria', 'DocentePeluqueria2026!', 'Prof. María Elena Quispe Chambi', 'DOCENTE', pel1Assignments);
    const pel2Assignments = [{ groupId: groupPel2.id, units: ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'UD7', 'EFSRT'] }];
    const userDocPel2 = upsertUser('docente.peluqueria2', 'DocentePeluqueria2026!', 'Prof. Roxana Condori Apaza', 'DOCENTE', pel2Assignments);

    // 7. Configuración documental de Aulas y Unidades Pedagógicas
    console.log('[7/8] Configurando parámetros pedagógicos de Unidades y Aulas...');

    function setupGroupAndUnits(group, units, teacherName, semDates) {
      putSettings('group', group.id, {
        ciclo: 'Auxiliar Técnico',
        seccion: 'A',
        turno: group.turno,
        modalidad: 'Presencial',
        fechaInicio: semDates.fechaInicio,
        fechaFin: semDates.fechaFin,
        periodClase: group.periodId,
        teacherName: teacherName,
        efsrtInicio: semDates.efsrtInicio,
        efsrtFin: semDates.efsrtFin
      });

      for (const u of units) {
        if (u.code === 'EFSRT') continue;
        putSettings('unit', group.id, {
          name: u.name,
          capacity: `Aplica técnicas, procedimientos y normas de seguridad en el desarrollo de capacidades de ${u.name.toLowerCase()}.`,
          competence: `Gestiona procesos técnicos operativos de ${u.name.toLowerCase()} con estándares de calidad.`,
          indicator1: `Organiza el puesto de trabajo, equipos e insumos requeridos para ${u.name.toLowerCase()}.`,
          indicator2: `Ejecuta técnicas y procedimientos operativos en ${u.name.toLowerCase()} con destreza y precisión.`,
          indicator3: `Aplica normas de bioseguridad, ergonomía y cuidado ambiental durante las sesiones de aprendizaje.`,
          indicator4: `Inspecciona la calidad del servicio o producto técnico elaborado corrigiendo inconsistencias.`,
          indicator5: `Explica y sustenta los resultados técnicos alcanzados cumpliendo tiempos y especificaciones.`
        }, u.code);

        putSettings('unitCurriculum', group.id, {
          hours: u.hours,
          credits: u.credits,
          fechaInicio: u.fechaInicio,
          fechaFin: u.fechaFin,
          dateOrigin: 'Plan de estudios curricular aprobado'
        }, u.code);
      }
    }

    setupGroupAndUnits(groupComp, compUnits, 'Prof. Martín Valdivia Rodriguez', {
      fechaInicio: '2026-03-02',
      fechaFin: '2026-07-24',
      efsrtInicio: '2026-06-01',
      efsrtFin: '2026-07-24'
    });

    setupGroupAndUnits(groupPel1, pel1Units, 'Prof. María Elena Quispe Chambi', {
      fechaInicio: '2026-03-02',
      fechaFin: '2026-07-24',
      efsrtInicio: '2026-06-01',
      efsrtFin: '2026-07-24'
    });

    setupGroupAndUnits(groupPel2, pel2Units, 'Prof. Roxana Condori Apaza', {
      fechaInicio: '2026-08-10',
      fechaFin: '2026-12-18',
      efsrtInicio: '2026-10-15',
      efsrtFin: '2026-12-18'
    });

    // 8. Matricular 30 Estudiantes por Aula con Parámetros Registrales, EFSRT y Cierre
    console.log('[8/8] Matriculando 30 estudiantes por aula, asistencias y notas...');

    let globalStudentCounter = 1;

    async function seedStudentsAndAcademics(group, units, studentPrefixDni, codePrefix, companyInfo, semesterEndDate, teacherUser) {
      const studentsData = generateStudentsList(studentPrefixDni, 30);
      const curricularUnits = units.filter(u => u.code !== 'EFSRT');
      const curricularUnitCount = curricularUnits.length;

      console.log(`  -> Matriculando 30 estudiantes en ${group.name}...`);

      const enrollments = [];

      for (let i = 0; i < studentsData.length; i++) {
        const sInfo = studentsData[i];
        let student = core.records('students').find(s => s.document === sInfo.document);
        if (!student) {
          student = core.saveStudent(director, sInfo);
        }

        let enrollment = core.records('enrollments').find(e => e.groupId === group.id && e.studentId === student.id);
        if (!enrollment) {
          enrollment = core.enroll(director, {
            groupId: group.id,
            studentId: student.id,
            startDate: group.fechaInicio || (group.periodId === '2026-I' ? '2026-03-02' : '2026-08-10')
          });
        }

        const cond = i % 10 === 9 ? 'B' : (i % 5 === 4 ? 'P' : 'G');
        const matCode = `MAT-2026-${codePrefix}-${String(i + 1).padStart(3, '0')}`;
        const regCode = `REG-2026-${String(globalStudentCounter).padStart(4, '0')}`;
        const folio = String(globalStudentCounter).padStart(3, '0');
        const regNum = String(globalStudentCounter).padStart(4, '0');
        const asiento = `ASIENTO N° ${folio} - FOLIO ${folio}`;

        if (enrollment.code !== matCode) {
          enrollment = core.write(director, 'enrollments', { ...enrollment, code: matCode }, enrollment.rev);
        }
        enrollments.push(enrollment);

        // Parámetros de matrícula
        putSettings('enrollment', enrollment.id, {
          condition: cond,
          emissionDate: semesterEndDate
        });

        // Parámetros registrales para Título y Certificado
        putSettings('registry', enrollment.id, {
          registerCode: regCode,
          registryBook: 'LIBRO 01',
          registryFolio: folio,
          registryNumber: regNum,
          registryDate: semesterEndDate,
          registryAsiento: asiento
        });

        // Parámetros de prácticas EFSRT (TMPL-18)
        const baseGrade = 16 + (i % 5); // 16 a 20
        putSettings('practice', enrollment.id, {
          companyName: companyInfo.name,
          companyAddress: companyInfo.address,
          criterion1: 3,
          criterion2: 2,
          criterion3: 2,
          criterion4: 3,
          criterion5: 3,
          criterion6: 3,
          criterion7: 1,
          criterion8: 2,
          criterion9: 1,
          efsrtFinalGrade: baseGrade
        });

        // Parámetros de cierre modular (TMPL-19)
        putSettings('closure', enrollment.id, {
          modularGrade: baseGrade,
          approvedUnitsCount: curricularUnitCount,
          failedUnitsCount: 0,
          observations: 'Estudiante aprobado satisfactoriamente en todas las unidades didácticas y prácticas EFSRT.'
        });

        globalStudentCounter++;
      }

      console.log(`  -> Generando sesiones de asistencia y calificaciones para ${curricularUnits.length} UDs...`);

      // Asistencia y Calificaciones por cada Unidad
      core.transaction(() => {
        for (const u of curricularUnits) {
          const bDates = getBusinessDays(u.fechaInicio, u.fechaFin, 14);

          // Asistencia día a día
          for (const date of bDates) {
            for (let i = 0; i < enrollments.length; i++) {
              const e = enrollments[i];
              // 90% P, 5% T, 3% J, 2% F
              const seed = (i * 7 + bDates.indexOf(date) * 11) % 100;
              let val = 'P';
              if (seed >= 98) val = 'F';
              else if (seed >= 95) val = 'J';
              else if (seed >= 90) val = 'T';
              else val = 'P';

              const recId = hash(['attendance', e.id, u.code, [date, '1']]);
              core.putRecord('attendance', {
                id: recId,
                enrollmentId: e.id,
                groupId: group.id,
                periodId: group.periodId,
                moduleId: group.moduleId,
                unit: u.code,
                date: date,
                session: '1',
                value: val,
                pending: false,
                observation: ''
              });
            }
          }

          // Calificaciones vigesimales completas
          for (let i = 0; i < enrollments.length; i++) {
            const e = enrollments[i];
            const studentBaseScore = 14 + ((i * 3) % 7); // 14 a 20

            // 5 Indicadores de Logro
            for (let k = 1; k <= 5; k++) {
              const ilScore = Math.min(20, Math.max(13, studentBaseScore + ((k % 3) - 1)));

              for (const comp of ['IA1', 'IA2', 'IA3']) {
                const compScore = Math.min(20, Math.max(13, ilScore + ((comp === 'IA3' ? 1 : 0))));
                const compId = hash(['grades', e.id, u.code, `IL${k}.${comp}`]);
                core.putRecord('grades', {
                  id: compId,
                  enrollmentId: e.id,
                  groupId: group.id,
                  periodId: group.periodId,
                  moduleId: group.moduleId,
                  unit: u.code,
                  indicator: `IL${k}.${comp}`,
                  value: compScore,
                  pending: false,
                  observation: ''
                });
              }

              const ilId = hash(['grades', e.id, u.code, `IL${k}`]);
              core.putRecord('grades', {
                id: ilId,
                enrollmentId: e.id,
                groupId: group.id,
                periodId: group.periodId,
                moduleId: group.moduleId,
                unit: u.code,
                indicator: `IL${k}`,
                value: ilScore,
                pending: false,
                observation: ''
              });
            }

            // RESULTADO_UD
            const resId = hash(['grades', e.id, u.code, 'RESULTADO_UD']);
            core.putRecord('grades', {
              id: resId,
              enrollmentId: e.id,
              groupId: group.id,
              periodId: group.periodId,
              moduleId: group.moduleId,
              unit: u.code,
              indicator: 'RESULTADO_UD',
              value: studentBaseScore,
              pending: false,
              observation: ''
            });
          }
        }
      });
    }

    // Sembrar Aula 1: Computación
    await seedStudentsAndAcademics(
      groupComp,
      compUnits,
      71000101,
      'COMP',
      { name: 'CENTRO TECNOLÓGICO Y COMERCIAL SAN ROMÁN S.A.C.', address: 'Jr. Mariano Núñez N° 345, Juliaca' },
      '2026-07-24',
      userDocComp
    );

    // Sembrar Aula 2: Peluquería M1
    await seedStudentsAndAcademics(
      groupPel1,
      pel1Units,
      72000101,
      'PEL1',
      { name: 'CENTRO DE ESTÉTICA INTEGRAL GLAMOUR S.A.C.', address: 'Av. Floral N° 456, Juliaca' },
      '2026-07-24',
      userDocPel1
    );

    // Sembrar Aula 3: Peluquería M2 (7 UDs)
    await seedStudentsAndAcademics(
      groupPel2,
      pel2Units,
      73000101,
      'PEL2',
      { name: 'CENTRO DE ESTÉTICA INTEGRAL GLAMOUR S.A.C.', address: 'Av. Floral N° 456, Juliaca' },
      '2026-12-18',
      userDocPel2
    );

    // Guardar referencia en settings para fácil acceso
    core.setting('simulatedCanonicalGroups', {
      computacion: groupComp.id,
      peluqueriaM1: groupPel1.id,
      peluqueriaM2: groupPel2.id,
      seededAt: new Date().toISOString()
    });

    console.log('\n========================================================================');
    console.log('✔ SIMULACIÓN INTEGRAL COMPLETADA EXITOSAMENTE');
    console.log('  - Institución: CETPRO "Micaela Bastidas Puyucawa" (Código Modular 1027648)');
    console.log('  - Director: Lic. Eloy Valerio Paredes Feliciano');
    console.log('  - Secretaría: Carmen Yovana Vilca Puma');
    console.log('  - Aula 1: Computación Ofimática (MOD-009, 30 alumnos, 6 UDs + EFSRT)');
    console.log('  - Aula 2: Peluquería M1 (MOD-007, 30 alumnos, 6 UDs + EFSRT)');
    console.log('  - Aula 3: Peluquería M2 (MOD-008, 30 alumnos, 7 UDs + EFSRT)');
    console.log('  - Total estudiantes sintéticos activos:', core.records('students').length);
    console.log('  - Total matrículas activas:', core.records('enrollments').length);
    console.log('  - Total registros de asistencia:', core.records('attendance').length);
    console.log('  - Total notas vigesimales registradas:', core.records('grades').length);
    console.log('========================================================================\n');

  } finally {
    core.close();
  }
}

runSeed().catch(err => {
  console.error('[ERROR CRÍTICO EN SEMBRADOR]', err);
  process.exitCode = 1;
});

