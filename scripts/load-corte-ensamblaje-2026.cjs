#!/usr/bin/env node
/**
 * scripts/load-corte-ensamblaje-2026.cjs
 *
 * Carga idempotente de los 4 grupos de CORTE Y ENSAMBLAJE (PROG-006 / MOD-011 / 2026-I):
 *  - Turno Mañana · Sección A (27) -> Prof. Liz Elvira Flores Llanos
 *  - Turno Tarde  · Sección B (23) -> Prof. René Prudencio Chura Mamani
 *  - Turno Noche  · Sección C (7)  -> Prof. Teófilo Larico Canahuire
 *  - Convenio Lampa · Turno Mañana · Sección A (8) -> Sin docente asignado aún
 *
 * Uso:
 *   node scripts/load-corte-ensamblaje-2026.cjs --dry-run
 *   node scripts/load-corte-ensamblaje-2026.cjs --apply
 *   node scripts/load-corte-ensamblaje-2026.cjs --apply --dir dev-sandbox/data
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROGRAM_ID = 'PROG-006';
const PROGRAM_NAME = 'CORTE Y ENSAMBLAJE';
const MODULE_ID = 'MOD-011';
const PERIOD_ID = '2026-I';
const START_DATE = '2026-03-16';
const END_DATE = '2026-07-24';
const EFSRT_START = '2026-05-18';
const EFSRT_END = '2026-07-24';
const UNITS = ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'];
const DIRECTOR_USERNAME = 'eloy.paredes';

const SANITIZATION_LOG = {
  omitted: [
    'NOCHE #8: 75285529 CHAMBIAQUINO ,Yanela Candy (duplicado de TARDE #2 75285529 CHAMBI AQUINO, Yanela Candy)',
    'NOCHE #9: 73477222 MAMANI HAMCCA ,Elena Ruth (duplicado de TARDE #9 73477222 MAMANI HANCCO, Elena Ruth)',
  ],
  corrected: [
    'MAÑANA #7: 75783638 HUMPIRE PUMA, Sara Sofia -> fecha limpiada 01/01/2005† -> 2005-01-01',
    'TARDE #11: 45034952 MAQUERA MAMANI, Lourdes -> fecha limpiada 01/10/1988† -> 1988-10-01',
    'NOCHE #3: 46466712 MAMANI MENDOZA, Fanny -> sexo normalizado F -> M (requerido por contrato H|M)',
    'MAÑANA #26: 42686793 -> reutiliza registro existente VILCA CANAZA, Severino (Computación Sec. C) con segunda matrícula',
    'TARDE #1 (02420748), #4 (01704242), #6 (75343072), #17 (73445267) -> reutilizan ficha existente con segunda matrícula',
    'Normalización de espacios en comas, capitalización SERRUJO PANENES, Leila Nicol y celular "—" -> ""',
  ],
  preservedForHumanReview: [
    'TARDE #14: 40070256 PARDES CHECALLA, Gregoria (grafía preservada según padrón/baseline)',
    'TARDE #15: 01234101 PARDES CHECALLA, Silvia Elsa (grafía preservada según padrón/baseline)',
    'NOCHE #6: 44544568 VICA GUTIERREZ, Fortunata (grafía preservada según padrón/baseline)',
    'NOCHE #7: 71823811 VICA GUTIERREZ, Madely Flor (grafía preservada según padrón/baseline)',
    'CONVENIO LAMPA: sin docente asignado automáticamente (asignar titular manualmente en Gestión de Grupos)',
  ],
};

const GROUPS_SPEC = [
  {
    key: 'MANANA',
    section: 'A',
    turno: 'Mañana',
    isConvenio: false,
    convenioName: '',
    name: 'CORTE Y ENSAMBLAJE · Turno Mañana · Sección A',
    teacherUsername: 'liz.flores',
    expectedCount: 27,
    rows: [
      { dni: '02444084', name: 'CANAZA ZAPATA, Nestor', sex: 'H', birthDate: '1970-07-06', celular: '991321780' },
      { dni: '41567447', name: 'CHURA MAMANI, Gladys Mery', sex: 'M', birthDate: '1982-09-01', celular: '991969613' },
      { dni: '71593489', name: 'CUENTAS HUMPIRE, Yossely Fiorella', sex: 'M', birthDate: '2004-03-25', celular: '995424290' },
      { dni: '71945100', name: 'CUENTAS RAMOS, George Nestor', sex: 'H', birthDate: '2001-03-25', celular: '983019048' },
      { dni: '75775307', name: 'CUSI CHIPANA, Maria Carmen', sex: 'M', birthDate: '2000-10-29', celular: '978354249' },
      { dni: '60386351', name: 'FLORES TITO, Olinda', sex: 'M', birthDate: '2006-06-15', celular: '970219924' },
      { dni: '75783638', name: 'HUMPIRE PUMA, Sara Sofia', sex: 'M', birthDate: '2005-01-01', celular: '987271578' },
      { dni: '47092116', name: 'LARUTA GUTIERREZ, Paulina', sex: 'M', birthDate: '1992-07-01', celular: '973278027' },
      { dni: '75431320', name: 'LAURA OJEDA, Jhon Lincol', sex: 'H', birthDate: '2005-10-17', celular: '932826770' },
      { dni: '74285117', name: 'LIMAHUAYA BARRANTES, Sandra Zenobia', sex: 'M', birthDate: '2000-10-12', celular: '994190900' },
      { dni: '75537155', name: 'MAMANI CARI, Nilda Elizabeth', sex: 'M', birthDate: '1999-07-01', celular: '968282651' },
      { dni: '02446543', name: 'MAMANI CCAHUA, Eleuterio Leon', sex: 'H', birthDate: '1974-02-20', celular: '956615125' },
      { dni: '02382987', name: 'MAMANI QUISPE, Prudencio', sex: 'H', birthDate: '1952-06-01', celular: '951946191' },
      { dni: '70182488', name: 'MAMANI SONCCO, Noemi Gianela', sex: 'M', birthDate: '1995-10-31', celular: '957072654' },
      { dni: '02554053', name: 'MAMANI TITO, Graciela', sex: 'M', birthDate: '1975-12-21', celular: '917518339' },
      { dni: '01308913', name: 'MARTINEZ CHARAJA, Nancy Marleny', sex: 'M', birthDate: '1968-11-09', celular: '951426227' },
      { dni: '73091446', name: 'PACORI SOTO, Yaneth Yolanda', sex: 'M', birthDate: '1999-01-23', celular: '983115900' },
      { dni: '42546689', name: 'PARI AQUISE, Bilha', sex: 'M', birthDate: '1984-01-14', celular: '965021212' },
      { dni: '40156880', name: 'QUISPE COLQUE, Pedro Claudio', sex: 'H', birthDate: '1978-05-19', celular: '972300000' },
      { dni: '29648905', name: 'QUISPE VARGAS, Rosa Maria', sex: 'M', birthDate: '1974-05-11', celular: '961991184' },
      { dni: '73488846', name: 'RAMIREZ APAZA, Arminda', sex: 'M', birthDate: '1993-02-23', celular: '930635938' },
      { dni: '73361509', name: 'RAMIREZ APAZA, Ruben Jobel', sex: 'H', birthDate: '2000-02-29', celular: '913116605' },
      { dni: '47933074', name: 'TERRAZAS PINTO, Ruth Carmen', sex: 'M', birthDate: '1992-07-05', celular: '927839800' },
      { dni: '74409850', name: 'USCAMAYTA YUCRA, Moises Aaron', sex: 'H', birthDate: '1999-03-06', celular: '900962803' },
      { dni: '02168240', name: 'VERA CANSAYA, Flavio', sex: 'H', birthDate: '1972-06-22', celular: '966978797' },
      { dni: '42686793', name: 'VILCA CANAZA, Severino', sex: 'H', birthDate: '1980-02-17', celular: '992209222' },
      { dni: '73714470', name: 'YANAPA CCARITA, Nilda', sex: 'M', birthDate: '1995-03-20', celular: '910107809' },
    ],
  },
  {
    key: 'TARDE',
    section: 'B',
    turno: 'Tarde',
    isConvenio: false,
    convenioName: '',
    name: 'CORTE Y ENSAMBLAJE · Turno Tarde · Sección B',
    teacherUsername: 'rene.chura',
    expectedCount: 23,
    rows: [
      { dni: '02420748', name: 'CALSIN QUISPE, Ynes Belen', sex: 'M', birthDate: '1967-01-21', celular: '951811881' },
      { dni: '75285529', name: 'CHAMBI AQUINO, Yanela Candy', sex: 'M', birthDate: '2000-05-06', celular: '917840196' },
      { dni: '41797743', name: 'CHIPANA CHOQUEPATA, Rosana', sex: 'M', birthDate: '1983-01-02', celular: '940459862' },
      { dni: '01704242', name: 'CONDORI SUCAPUCA, Serafin Arcangel', sex: 'H', birthDate: '1969-10-24', celular: '942780463' },
      { dni: '75446323', name: 'GONZALES HERRERA, Yasmin Maricruz', sex: 'M', birthDate: '2001-01-05', celular: '968641101' },
      { dni: '75343072', name: 'HILASACA COLQUEHUANCA, Yuly Noemi', sex: 'M', birthDate: '1998-11-07', celular: '929400710' },
      { dni: '73417313', name: 'LUQUE CATUNTA, Maribel', sex: 'M', birthDate: '1999-09-24', celular: '925168784' },
      { dni: '76254504', name: 'MAMANI CHAMBI, Julio Cesar', sex: 'H', birthDate: '2000-11-10', celular: '937115918' },
      { dni: '73477222', name: 'MAMANI HANCCO, Elena Ruth', sex: 'M', birthDate: '1999-07-23', celular: '981763281' },
      { dni: '76968958', name: 'MAQUERA MAMANI, Liz Betsabe', sex: 'M', birthDate: '1996-03-08', celular: '959145002' },
      { dni: '45034952', name: 'MAQUERA MAMANI, Lourdes', sex: 'M', birthDate: '1988-10-01', celular: '942856725' },
      { dni: '01228239', name: 'NAIRA SILVA, Sabina', sex: 'M', birthDate: '1960-01-31', celular: '999314545' },
      { dni: '47848403', name: 'OJEDA CALLA, Fatima', sex: 'M', birthDate: '1990-08-08', celular: '918474484' },
      { dni: '40070256', name: 'PARDES CHECALLA, Gregoria', sex: 'M', birthDate: '1979-01-19', celular: '951664455' },
      { dni: '01234101', name: 'PARDES CHECALLA, Silvia Elsa', sex: 'M', birthDate: '1967-11-04', celular: '951664455' },
      { dni: '63224108', name: 'PAREDES CHECALLA, Laura', sex: 'M', birthDate: '2010-02-15', celular: '976207090' },
      { dni: '73445267', name: 'QUISPE CARCAHUSTO, Dianet Amelia', sex: 'M', birthDate: '1998-12-28', celular: '910772061' },
      { dni: '41439778', name: 'QUISPE SUCARI, Yanina', sex: 'M', birthDate: '1982-06-14', celular: '951490586' },
      { dni: '43786223', name: 'RUELAS QUISPE, Alicia', sex: 'M', birthDate: '1986-10-09', celular: '997540723' },
      { dni: '73303266', name: 'SERRUJO PANENES, Leila Nicol', sex: 'M', birthDate: '2001-01-02', celular: '985042161' },
      { dni: '47215610', name: 'VIZA YANA, Juana Nieves', sex: 'M', birthDate: '1992-03-07', celular: '972344597' },
      { dni: '60908526', name: 'CHOQUE VILCA, Judith Paola', sex: 'M', birthDate: '2006-11-18', celular: '990749745' },
      { dni: '77046941', name: 'MAMANI CANAZA, Yeny Yesica', sex: 'M', birthDate: '1995-02-13', celular: '' },
    ],
  },
  {
    key: 'NOCHE',
    section: 'C',
    turno: 'Noche',
    isConvenio: false,
    convenioName: '',
    name: 'CORTE Y ENSAMBLAJE · Turno Noche · Sección C',
    teacherUsername: 'teofilo.larico',
    expectedCount: 7,
    rows: [
      { dni: '02557768', name: 'CONDORI SACACA, Juan Pedro', sex: 'H', birthDate: '1973-12-28', celular: '953400433' },
      { dni: '70017927', name: 'MAMANI COSI, Yesica Marthy', sex: 'M', birthDate: '1989-07-21', celular: '931122181' },
      { dni: '46466712', name: 'MAMANI MENDOZA, Fanny', sex: 'M', birthDate: '1990-07-15', celular: '951404096' },
      { dni: '44547615', name: 'PAMPAMALLCO CONDORI, Gregorio', sex: 'H', birthDate: '1987-09-04', celular: '955552391' },
      { dni: '61400229', name: 'VARGAS CHOQUE, Ingrith Karely', sex: 'M', birthDate: '2008-07-04', celular: '900456425' },
      { dni: '44544568', name: 'VICA GUTIERREZ, Fortunata', sex: 'M', birthDate: '1987-10-03', celular: '950581000' },
      { dni: '71823811', name: 'VICA GUTIERREZ, Madely Flor', sex: 'M', birthDate: '2005-02-26', celular: '931024955' },
    ],
  },
  {
    key: 'CONVENIO_LAMPA',
    section: 'A',
    turno: 'Mañana',
    isConvenio: true,
    convenioName: 'Convenio Lampa',
    name: 'CORTE Y ENSAMBLAJE · Convenio Lampa · Turno Mañana · Sección A',
    teacherUsername: null,
    expectedCount: 8,
    rows: [
      { dni: '62368861', name: 'ALMANZA TICONA, Lizeth', sex: 'M', birthDate: '2009-11-19', celular: '913555161' },
      { dni: '61705335', name: 'CONDORI TICONA, Eva Noemi', sex: 'M', birthDate: '2009-10-13', celular: '989801600' },
      { dni: '60606225', name: 'JUAREZ QUISOCALA, Linda Yamileth', sex: 'M', birthDate: '2008-05-09', celular: '946853159' },
      { dni: '61938349', name: 'MAMANI SALAZAR, Luz Nadine', sex: 'M', birthDate: '2009-05-28', celular: '989037372' },
      { dni: '61938334', name: 'MAMANI TITO, Nayely Maribel', sex: 'M', birthDate: '2009-04-26', celular: '980837281' },
      { dni: '62368904', name: 'PEREZ LEON, Ruth Fiorela', sex: 'M', birthDate: '2010-02-04', celular: '982906608' },
      { dni: '62368897', name: 'TICONA TICONA, Yamileth Marin', sex: 'M', birthDate: '2010-01-24', celular: '944820290' },
      { dni: '62368934', name: 'YARETA QUISPE, Sayda', sex: 'M', birthDate: '2010-03-23', celular: '966711224' },
    ],
  },
];

function parseCliArgs(argv) {
  let apply = false;
  let dir = path.resolve(__dirname, '..', 'dev-sandbox', 'data');
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--dry-run') apply = false;
    else if (arg === '--dir') {
      const next = argv[i + 1];
      if (!next) throw new Error('Falta el valor para --dir');
      dir = path.resolve(next);
      i += 1;
    } else if (arg.startsWith('--dir=')) {
      dir = path.resolve(arg.slice('--dir='.length));
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }
  return { apply, dir };
}

function isValidIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

function normalizeTurno(value) {
  const t = String(value || '').trim();
  if (/^ma[nñ]ana$/i.test(t)) return 'Mañana';
  if (/^tarde$/i.test(t)) return 'Tarde';
  if (/^noche$/i.test(t)) return 'Noche';
  return t;
}

function normalizeConvenioKey(value) {
  return String(value || '').trim().toUpperCase();
}

function splitFullName(fullName) {
  const clean = String(fullName || '').trim();
  const commaIdx = clean.indexOf(',');
  if (commaIdx === -1) {
    const tokens = clean.split(/\s+/).filter(Boolean);
    return {
      lastName1: tokens[0] || '',
      lastName2: tokens[1] || '',
      firstNames: tokens.slice(2).join(' '),
    };
  }
  const surnamePart = clean.slice(0, commaIdx).trim();
  const firstNames = clean.slice(commaIdx + 1).trim();
  const surnameTokens = surnamePart.split(/\s+/).filter(Boolean);
  return {
    lastName1: surnameTokens[0] || '',
    lastName2: surnameTokens.slice(1).join(' '),
    firstNames,
  };
}

function validatePadron() {
  const seenDnis = new Set();
  const counts = {};
  let total = 0;

  for (const spec of GROUPS_SPEC) {
    if (!Array.isArray(spec.rows) || spec.rows.length !== spec.expectedCount) {
      throw new Error(
        `Conteo inválido en ${spec.key}: esperado ${spec.expectedCount}, obtenido ${spec.rows ? spec.rows.length : 0}`
      );
    }
    counts[spec.key] = spec.rows.length;
    for (const row of spec.rows) {
      total += 1;
      if (!/^\d{8}$/.test(row.dni)) {
        throw new Error(`DNI inválido en ${spec.key}: ${row.dni} (${row.name})`);
      }
      if (seenDnis.has(row.dni)) {
        throw new Error(`DNI duplicado entre grupos de Corte y Ensamblaje: ${row.dni} (${row.name})`);
      }
      seenDnis.add(row.dni);
      if (!row.name || !row.name.includes(',')) {
        throw new Error(`Nombre inesperado en ${spec.key}: ${row.name}`);
      }
      if (!['H', 'M'].includes(row.sex)) {
        throw new Error(`Sexo inválido en ${spec.key}: ${row.sex} (${row.dni})`);
      }
      if (!isValidIsoDate(row.birthDate)) {
        throw new Error(`Fecha inválida en ${spec.key}: ${row.birthDate} (${row.dni})`);
      }
      if (row.celular !== '' && !/^\d{9}$/.test(row.celular)) {
        throw new Error(`Celular inválido en ${spec.key}: ${row.celular} (${row.dni})`);
      }
    }
  }

  if (total !== 65) {
    throw new Error(`Total de padrón inválido: esperado 65, obtenido ${total}`);
  }
  return { total, uniqueDnis: seenDnis.size, counts };
}

function buildProfile2026(row, parts, turnoLabel) {
  return {
    documentoIdentidad: row.dni,
    apellidoPaterno: parts.lastName1,
    apellidoMaterno: parts.lastName2,
    nombres: parts.firstNames,
    sexo: row.sex,
    fechaNacimiento: row.birthDate,
    telefono: row.celular || '',
    programaEstudios: PROGRAM_NAME,
    nivelFormativo: 'AUXILIAR TÉCNICO',
    especialidad: 'MÓDULO I',
    turno: turnoLabel.toUpperCase(),
  };
}

function main() {
  const { apply, dir } = parseCliArgs(process.argv.slice(2));
  const validation = validatePadron();

  console.log('=== VALIDACIÓN INTERNA PADRÓN CORTE Y ENSAMBLAJE 2026 ===');
  console.log(`Modo: ${apply ? 'APPLY (escritura vía OfflineCore)' : 'DRY-RUN (solo simulación)'}`);
  console.log(
    `Grupos: MANANA=${validation.counts.MANANA}, TARDE=${validation.counts.TARDE}, NOCHE=${validation.counts.NOCHE}, CONVENIO_LAMPA=${validation.counts.CONVENIO_LAMPA} | Total=${validation.total} | DNIs únicos=${validation.uniqueDnis}`
  );
  console.log('Omitidos (2):');
  for (const item of SANITIZATION_LOG.omitted) console.log(`  - ${item}`);
  console.log('Corregidos/Normalizados:');
  for (const item of SANITIZATION_LOG.corrected) console.log(`  - ${item}`);
  console.log('Preservados para revisión humana:');
  for (const item of SANITIZATION_LOG.preservedForHumanReview) console.log(`  - ${item}`);

  if (!apply) {
    console.log('\n[DRY-RUN COMPLETADO] No se abrió ni modificó ninguna base SQLite.');
    return;
  }

  const dbFile = path.join(dir, 'cetpro.sqlite');
  if (!fs.existsSync(dbFile)) {
    throw new Error(`No existe la base de datos destino: ${dbFile}`);
  }

  process.env.CETPRO_SKIP_BASELINE_SEED = '1';
  const { OfflineCore } = require('./offline-core.cjs');
  const core = new OfflineCore(dir, null);

  try {
    core.db.exec('PRAGMA busy_timeout = 10000;');

    const director = core.users().find((u) => u.username === DIRECTOR_USERNAME && u.role === 'DIRECTOR' && u.active);
    if (!director) throw new Error(`No se encontró director activo (${DIRECTOR_USERNAME}).`);

    const summary = {
      createdGroups: 0,
      reusedGroups: 0,
      updatedGroupSettings: 0,
      assignedTeacherGroups: 0,
      createdStudents: 0,
      reusedStudents: 0,
      reusedCrossCareerStudents: [],
      createdEnrollments: 0,
      reusedEnrollments: 0,
      groupsByKey: {},
      enrollmentsByKey: {},
    };

    for (const spec of GROUPS_SPEC) {
      let teacher = null;
      if (spec.teacherUsername) {
        teacher = core.users().find((u) => u.username === spec.teacherUsername && u.role === 'DOCENTE' && u.active);
        if (!teacher) throw new Error(`No se encontró docente activo (${spec.teacherUsername}) para ${spec.key}.`);
      }

      const targetConvKey = normalizeConvenioKey(spec.convenioName);
      let group = core.records('groups').find((g) => {
        if (g.archived) return false;
        if (g.programId !== PROGRAM_ID || g.moduleId !== MODULE_ID || g.periodId !== PERIOD_ID) return false;
        if (core.groupSection(g) !== spec.section) return false;
        const cfgFields = core.record('documentSettings', `group:${g.id}`)?.fields || {};
        const gTurno = normalizeTurno(g.turno || cfgFields.turno || '');
        if (gTurno !== spec.turno) return false;
        const gConvKey = normalizeConvenioKey(g.convenioName || cfgFields.convenio || '');
        return gConvKey === targetConvKey;
      });

      if (!group) {
        group = core.saveGroup(director, {
          programId: PROGRAM_ID,
          moduleId: MODULE_ID,
          periodId: PERIOD_ID,
          section: spec.section,
          turno: spec.turno,
          isConvenio: spec.isConvenio,
          convenioName: spec.convenioName,
          name: spec.name,
          units: UNITS,
        });
        summary.createdGroups += 1;
      } else {
        summary.reusedGroups += 1;
      }

      if (teacher) {
        const freshTeacher = core.user(teacher.id);
        const alreadyAssigned = (freshTeacher?.assignments || []).some(
          (a) =>
            a.groupId === group.id &&
            a.section === spec.section &&
            a.periodId === PERIOD_ID &&
            UNITS.every((u) => (a.units || []).includes(u))
        );
        if (!alreadyAssigned) {
          core.reassignGroupTeacher(director, {
            groupId: group.id,
            teacherId: teacher.id,
            units: UNITS,
            exclusive: true,
          });
          summary.assignedTeacherGroups += 1;
        }
      }

      const cfgKey = `group:${group.id}`;
      const existingCfg = core.record('documentSettings', cfgKey);
      const currentFields = existingCfg?.fields || {};
      const desiredFields = {
        ...currentFields,
        ciclo: currentFields.ciclo || 'Auxiliar Técnico',
        modalidad: currentFields.modalidad || 'Presencial',
        seccion: spec.section,
        turno: spec.turno,
        periodClase: PERIOD_ID,
        fechaInicio: START_DATE,
        fechaFin: END_DATE,
        efsrtInicio: EFSRT_START,
        efsrtFin: EFSRT_END,
        ...(spec.isConvenio ? { convenio: spec.convenioName } : {}),
        ...(teacher ? { teacherName: teacher.name } : {}),
      };
      const needsCfgUpdate =
        !existingCfg ||
        Object.keys(desiredFields).some((k) => currentFields[k] !== desiredFields[k]);
      if (needsCfgUpdate) {
        core.write(
          director,
          'documentSettings',
          {
            ...(existingCfg || { id: cfgKey, scope: { kind: 'group', target: group.id } }),
            fields: desiredFields,
          },
          existingCfg ? existingCfg.rev : null
        );
        summary.updatedGroupSettings += 1;
      }

      summary.groupsByKey[spec.key] = group.id;
      summary.enrollmentsByKey[spec.key] = 0;

      for (const row of spec.rows) {
        const parts = splitFullName(row.name);
        let student = core.records('students').find((s) => String(s.document || '').trim() === row.dni);
        if (!student) {
          student = core.saveStudent(director, {
            document: row.dni,
            documentType: 'DNI',
            name: row.name,
            lastName1: parts.lastName1,
            lastName2: parts.lastName2,
            firstNames: parts.firstNames,
            sex: row.sex,
            birthDate: row.birthDate,
            active: true,
            profile2026: buildProfile2026(row, parts, spec.turno),
          });
          summary.createdStudents += 1;
        } else {
          if (student.archived || !student.active) {
            throw new Error(`El estudiante ${row.dni} (${student.name}) existe en BD pero está inactivo o archivado.`);
          }
          const existingEnrolls = core.records('enrollments').filter((e) => e.studentId === student.id && e.active);
          if (existingEnrolls.some((e) => e.groupId !== group.id)) {
            summary.reusedCrossCareerStudents.push(`${row.dni} (${student.name}) -> ${spec.key}`);
          }
          summary.reusedStudents += 1;
        }

        let enrollment = core
          .records('enrollments')
          .find((e) => e.studentId === student.id && e.groupId === group.id && e.active);
        if (!enrollment) {
          enrollment = core.enroll(director, {
            studentId: student.id,
            groupId: group.id,
            startDate: START_DATE,
          });
          summary.createdEnrollments += 1;
        } else {
          summary.reusedEnrollments += 1;
        }
        summary.enrollmentsByKey[spec.key] += 1;
      }
    }

    console.log('\n=== RESULTADO DE APLICACIÓN EN SQLITE ===');
    console.log(`BD destino: ${dbFile}`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    core.close();
  }
}

main();
