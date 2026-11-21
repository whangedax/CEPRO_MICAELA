#!/usr/bin/env node
/**
 * scripts/load-comp-tarde-2026.cjs
 *
 * Carga idempotente de las 4 secciones (A, B, C, D) en Turno Tarde
 * para PROG-005 (COMPUTACIÓN E INFORMÁTICA) / MOD-009 (Ofimática) / 2026-I,
 * usando exclusivamente la API de dominio de OfflineCore.
 *
 * Uso:
 *   node scripts/load-comp-tarde-2026.cjs --dry-run
 *   node scripts/load-comp-tarde-2026.cjs --apply
 *   node scripts/load-comp-tarde-2026.cjs --apply --dir dev-sandbox/data
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROGRAM_ID = 'PROG-005';
const PROGRAM_NAME = 'COMPUTACIÓN E INFORMÁTICA';
const MODULE_ID = 'MOD-009';
const PERIOD_ID = '2026-I';
const TURNO = 'Tarde';
const START_DATE = '2026-03-16';
const END_DATE = '2026-07-24';
const EFSRT_START = '2026-05-18';
const EFSRT_END = '2026-07-24';
const UNITS = ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'];
const DIRECTOR_USERNAME = 'eloy.paredes';
const TEACHER_USERNAME = 'magda.chura';

const EXPECTED_COUNTS = { A: 25, B: 29, C: 22, D: 21 };

const SANITIZATION_LOG = {
  omitted: [
    'T1 #26: 01555271 LOAYZA QUISPE, Georgina Gregoria (duplicado de digitación de T1 #11 01555272, mismo nombre y cel 999526586)',
    'T2 #26: 74602518 LORICO PACHA,Chistian Paul (DNI duplicado de T2 #22 74602518 LARICO PACHA, Cristhian Paul)',
    'T3 #2: 02420748 CALSIN QUISPE ,Ines Belen (duplicado inter-sección de T2 #6 02420748 CALSIN QUISPE, Ynes Belen, conservada en Sección B)',
  ],
  corrected: [
    'T1 #15: 60069368 MAMANI LIPA, Mirian Lisbeth -> fecha limpiada 26/06/2006* -> 2006-06-26',
    'T2 #5: 2443504 CALLI CHIRA, Rina Luz -> DNI normalizado a texto 8 dígitos 02443504',
    'T4 #18: 75953551 QUISPE VARGAS, Luz Delia -> fecha corregida 29/00/1999 -> 1999-01-29',
    'T4 #21: 75515461 SAAVEDRA MAMANI, Katherine Korayma M -> removida M sobrante final',
    'Normalización de espacios alrededor de comas en T1 #16, T3 #4, T3 #20, T4 #9, T4 #12, T4 #19 y celular "—" -> ""',
  ],
  preservedForHumanReview: [
    'T1 #21: 71307653 SHUAN CRUZ, Marcelo Jhamilt -> sexo "M" preservado según padrón/baseline',
    'T3 #16: 01335945 VELASQUEZ VELASQUEZ, Aalfredo -> grafía "Aalfredo" preservada según padrón/baseline',
  ],
};

const PADRON_SECTIONS = {
  A: [
    { dni: '61624013', name: 'APAZA MAMANI, Alexsander A.', sex: 'H', birthDate: '2006-02-13', celular: '916541504' },
    { dni: '42559679', name: 'APAZA MONROY, Libia', sex: 'M', birthDate: '1984-08-12', celular: '990494915' },
    { dni: '61817178', name: 'AZAÑO QUISPE, Lesly Aisen', sex: 'M', birthDate: '2009-09-21', celular: '' },
    { dni: '74166495', name: 'AZAÑO QUISPE, Yeni Marizol', sex: 'M', birthDate: '1995-08-22', celular: '983895505' },
    { dni: '73810112', name: 'CALCINA LARICO, Roxana Jeydi', sex: 'M', birthDate: '2002-01-20', celular: '971935327' },
    { dni: '40835808', name: 'CHAHUARA CORDOVA, Magda', sex: 'M', birthDate: '1980-06-04', celular: '944971140' },
    { dni: '01704242', name: 'CONDORI SUCAPUCA, Serafin Arcangel', sex: 'H', birthDate: '1969-10-24', celular: '942780463' },
    { dni: '31610935', name: 'CRUZ AGUILAR, Juana', sex: 'M', birthDate: '1960-06-24', celular: '960605320' },
    { dni: '48538958', name: 'CRUZ SEJJE, Veronica', sex: 'M', birthDate: '1995-01-14', celular: '999007946' },
    { dni: '75226890', name: 'HILASACA CALQUEHUANCA, Jean Marco', sex: 'H', birthDate: '2001-04-01', celular: '936236138' },
    { dni: '01555272', name: 'LOAYZA QUISPE, Georgina Gregoria', sex: 'M', birthDate: '1975-01-02', celular: '999526586' },
    { dni: '75606132', name: 'MACHACA ADCO, Maopele', sex: 'H', birthDate: '2008-09-26', celular: '941474066' },
    { dni: '61536461', name: 'MAMANI CHAMBI, Yenefer Carmen', sex: 'M', birthDate: '2008-11-30', celular: '970141204' },
    { dni: '01341752', name: 'MAMANI LIMACHI, Huber', sex: 'H', birthDate: '1977-08-10', celular: '925920065' },
    { dni: '60069368', name: 'MAMANI LIPA, Mirian Lisbeth', sex: 'M', birthDate: '2006-06-26', celular: '906115546' },
    { dni: '70334786', name: 'MAMANI QUILLA, Leonidas', sex: 'H', birthDate: '1995-12-22', celular: '928275516' },
    { dni: '61575525', name: 'QUEA MAMANI, Royan Nadher', sex: 'H', birthDate: '2009-06-16', celular: '972198913' },
    { dni: '75253262', name: 'QUISPE CALLA, Mitwars Jesus', sex: 'H', birthDate: '2005-04-18', celular: '981048636' },
    { dni: '44110994', name: 'QUISPE MAMANI, Beatriz Mariela', sex: 'M', birthDate: '1987-03-03', celular: '963201391' },
    { dni: '61537255', name: 'QUISPE MAMANI, Camila Victoria', sex: 'M', birthDate: '2009-01-23', celular: '926355638' },
    { dni: '71307653', name: 'SHUAN CRUZ, Marcelo Jhamilt', sex: 'M', birthDate: '1996-09-23', celular: '982815220' },
    { dni: '70668130', name: 'TITO SUXSU, Naomi Dalila', sex: 'M', birthDate: '1998-03-11', celular: '901390562' },
    { dni: '61816977', name: 'USCAMAYTA YUCRA, Heydy Milagros', sex: 'M', birthDate: '2005-06-20', celular: '967351675' },
    { dni: '75736037', name: 'YUCRA JULLIRI, Ruth Danitza', sex: 'M', birthDate: '2002-01-01', celular: '927493387' },
    { dni: '60486539', name: 'ZEGARRA LAURA, Marco Antonio', sex: 'H', birthDate: '2000-12-18', celular: '982500080' },
  ],
  B: [
    { dni: '44551412', name: 'APAZA QUINTO, Yuli Monica', sex: 'M', birthDate: '1987-09-13', celular: '951445079' },
    { dni: '72969332', name: 'BERNEDO CASTELLANOS, Zulma', sex: 'M', birthDate: '1995-01-05', celular: '983320038' },
    { dni: '42145625', name: 'BUSTINZA CASTRO, Esperanza', sex: 'M', birthDate: '1983-12-15', celular: '976212195' },
    { dni: '76372642', name: 'CALLI CHIRA, Milton', sex: 'H', birthDate: '1995-10-23', celular: '937221022' },
    { dni: '02443504', name: 'CALLI CHIRA, Rina Luz', sex: 'M', birthDate: '1976-10-30', celular: '943817449' },
    { dni: '02420748', name: 'CALSIN QUISPE, Ynes Belen', sex: 'M', birthDate: '1967-01-21', celular: '951811881' },
    { dni: '75733061', name: 'CANAZA MAMANI, Ronal Arnol', sex: 'H', birthDate: '2000-12-13', celular: '' },
    { dni: '71739880', name: 'CARCASI CONDORI, Doris Karina', sex: 'M', birthDate: '2003-05-28', celular: '948992815' },
    { dni: '40076652', name: 'CHATA CALLA, Felix Bonifacio', sex: 'H', birthDate: '1976-05-02', celular: '951646872' },
    { dni: '44989775', name: 'COAQUIRA ROQUE, Noemi Martha', sex: 'M', birthDate: '1988-01-20', celular: '951033838' },
    { dni: '42297700', name: 'COLCA ILAQUITA, Humberto', sex: 'H', birthDate: '1981-06-13', celular: '958473708' },
    { dni: '60765225', name: 'COLCA MAMANI, Giuliana Fiorella', sex: 'M', birthDate: '2006-07-01', celular: '929782486' },
    { dni: '02167706', name: 'COLQUEHUANCA COLQUEHUANCA, Maximo Odon', sex: 'H', birthDate: '1970-11-18', celular: '937381040' },
    { dni: '61158720', name: 'CONDORI MONRROY, Gabriela Luz', sex: 'M', birthDate: '2007-10-02', celular: '996349479' },
    { dni: '75327959', name: 'CORIMAYHUA MAMANI, Mireya Paola', sex: 'M', birthDate: '2001-06-18', celular: '936207962' },
    { dni: '44044489', name: 'CUEVAS CERPA, Nely', sex: 'M', birthDate: '1987-01-15', celular: '951252216' },
    { dni: '71052950', name: 'FLORES TICONA, Edu Rex', sex: 'H', birthDate: '1997-11-26', celular: '' },
    { dni: '75803970', name: 'HANCO CHOQUE, Dina Lizbeth', sex: 'M', birthDate: '2006-03-26', celular: '963861500' },
    { dni: '75343072', name: 'HILASACA COLQUEHUANCA, Yuly Noemi', sex: 'M', birthDate: '1998-11-07', celular: '929400710' },
    { dni: '43959434', name: 'HUANCA QUISPE, Ardiles', sex: 'H', birthDate: '1986-06-10', celular: '932387547' },
    { dni: '01314585', name: 'JAHUIRA HUARCAYA, Antonia Clara', sex: 'M', birthDate: '1972-01-09', celular: '' },
    { dni: '74602518', name: 'LARICO PACHA, Cristhian Paul', sex: 'H', birthDate: '2004-06-17', celular: '940327220' },
    { dni: '72220030', name: 'LEON LIMA, Licet Dina', sex: 'M', birthDate: '1999-01-31', celular: '910516612' },
    { dni: '70127765', name: 'LIPA CCAMA, Ruth Heiny', sex: 'M', birthDate: '1994-06-22', celular: '984634300' },
    { dni: '02362279', name: 'LLANOS COAQUIRA, Simon Benigno', sex: 'H', birthDate: '1958-10-08', celular: '987000109' },
    { dni: '45686475', name: 'LUQUE ADCO, John German', sex: 'H', birthDate: '1988-07-20', celular: '930216009' },
    { dni: '73236176', name: 'MAMANI ALTAMIRANO, Paolo Rolianov', sex: 'H', birthDate: '2006-01-05', celular: '970451486' },
    { dni: '61255428', name: 'MAMANI APAZA, Deybis Angel', sex: 'H', birthDate: '2008-01-12', celular: '951889950' },
    { dni: '42721518', name: 'MAMANI GUTIERREZ, Bertha', sex: 'M', birthDate: '1984-09-05', celular: '980412208' },
  ],
  C: [
    { dni: '02557472', name: 'SALAS TICONA, Juana', sex: 'M', birthDate: '1966-06-23', celular: '' },
    { dni: '41269110', name: 'CANAZA ZAPATA, Sonia Monica', sex: 'M', birthDate: '1982-03-25', celular: '' },
    { dni: '01317644', name: 'QUISPE COILA, Sabina', sex: 'M', birthDate: '1972-12-22', celular: '' },
    { dni: '70459541', name: 'SALDIVAR CALSIN, Franz Gregory', sex: 'H', birthDate: '1990-08-15', celular: '930509394' },
    { dni: '40509996', name: 'SALDIVAR MONTEAGUDO, Omar Eddy', sex: 'H', birthDate: '1977-08-26', celular: '954850818' },
    { dni: '72250654', name: 'TAZA CHANBI, Roger', sex: 'H', birthDate: '1996-06-02', celular: '959677805' },
    { dni: '76275229', name: 'TICONA MULLISACA, Leydy Noelia', sex: 'M', birthDate: '2005-11-01', celular: '969308254' },
    { dni: '40577474', name: 'TICONA QUISPE, Irma Lilia', sex: 'M', birthDate: '1979-06-14', celular: '' },
    { dni: '40370098', name: 'USCAMAYTA CHIPANA, Julia Carina', sex: 'M', birthDate: '1979-12-03', celular: '910661394' },
    { dni: '74409851', name: 'USCAMAYTA YUCRA, Antonia Dianicia', sex: 'M', birthDate: '2001-04-20', celular: '952363361' },
    { dni: '02029135', name: 'VALENCIA PAMPA, Leo Bladimir', sex: 'H', birthDate: '1972-03-22', celular: '968488882' },
    { dni: '75876975', name: 'VALORA QUISPE, Karen Vanesa', sex: 'M', birthDate: '2000-05-22', celular: '917688109' },
    { dni: '02442832', name: 'VARGAS ARIAS, Joel leonid', sex: 'H', birthDate: '1976-07-15', celular: '955634999' },
    { dni: '40361347', name: 'VARGAS MAMANI, Tania Rina', sex: 'M', birthDate: '1979-09-09', celular: '968462390' },
    { dni: '01335945', name: 'VELASQUEZ VELASQUEZ, Aalfredo', sex: 'H', birthDate: '1976-01-07', celular: '' },
    { dni: '73216690', name: 'VELASQUEZ TICONA, Erick Leiton', sex: 'H', birthDate: '2001-09-09', celular: '' },
    { dni: '72342527', name: 'VELASQUEZ TICONA, Stiven Yamir', sex: 'H', birthDate: '2008-10-01', celular: '' },
    { dni: '44373442', name: 'VILCA AYQUE, Soledad', sex: 'M', birthDate: '1987-05-29', celular: '972473110' },
    { dni: '42686793', name: 'VILCA CANAZA, Severino', sex: 'H', birthDate: '1980-02-17', celular: '992209222' },
    { dni: '02031064', name: 'VILLASANTE CCOSI, Antonio', sex: 'H', birthDate: '1973-07-05', celular: '943100528' },
    { dni: '60250970', name: 'YTO PELINCO, Noely Yanira', sex: 'M', birthDate: '2007-01-25', celular: '973893882' },
    { dni: '44155924', name: 'YUNGA YUPANQUI, Sonia Yaneth', sex: 'M', birthDate: '1986-07-25', celular: '' },
  ],
  D: [
    { dni: '43708106', name: 'MAMANI MAMANI, Eduardo', sex: 'H', birthDate: '1979-12-18', celular: '931535493' },
    { dni: '40286796', name: 'MAMANI PANDIA, Natividad Mirian', sex: 'M', birthDate: '1979-09-08', celular: '918211129' },
    { dni: '74242375', name: 'MAMANI RIOS, Daphet Ochery', sex: 'M', birthDate: '2005-06-30', celular: '951228969' },
    { dni: '01267078', name: 'NUÑEZ CURO, Eduardo', sex: 'H', birthDate: '1967-10-13', celular: '951416668' },
    { dni: '76860837', name: 'NUÑEZ MAMANI, Miguel Angel', sex: 'H', birthDate: '1997-02-12', celular: '916879713' },
    { dni: '75894240', name: 'NUÑEZ MAMANI, Yeny Erika', sex: 'M', birthDate: '1999-05-03', celular: '930135795' },
    { dni: '74581455', name: 'ORTIZ SACACA, Jose Luis', sex: 'H', birthDate: '2005-05-16', celular: '953372459' },
    { dni: '40673624', name: 'PAMPA VALENCIA, Juana', sex: 'M', birthDate: '1980-12-04', celular: '931955526' },
    { dni: '70482776', name: 'PAXI CONDORI, Hilda', sex: 'M', birthDate: '1990-12-25', celular: '921863288' },
    { dni: '01700773', name: 'PINEDA HERRERA, Victor', sex: 'H', birthDate: '1965-02-26', celular: '951932057' },
    { dni: '40829291', name: 'PONCE MAMANCHURA, Juana Lidia', sex: 'M', birthDate: '1981-03-19', celular: '978016220' },
    { dni: '60908480', name: 'PUMA CONDORI, Christopher Jhonatan', sex: 'H', birthDate: '2006-11-21', celular: '' },
    { dni: '76054081', name: 'PUMA CONDORI, Julio Cesar', sex: 'H', birthDate: '1995-02-20', celular: '970133657' },
    { dni: '71994871', name: 'QUECARA QUISPE, Jhon Franklin', sex: 'H', birthDate: '1997-02-02', celular: '950840594' },
    { dni: '73445267', name: 'QUISPE CARCAHUSTO, Dianet Amelia', sex: 'M', birthDate: '1998-12-28', celular: '910772061' },
    { dni: '45858443', name: 'QUISPE OTAZU, Nohelia Paola', sex: 'M', birthDate: '1989-03-28', celular: '910330016' },
    { dni: '70064458', name: 'QUISPE QUISPE, Jonas', sex: 'H', birthDate: '2001-05-16', celular: '991758609' },
    { dni: '75953551', name: 'QUISPE VARGAS, Luz Delia', sex: 'M', birthDate: '1999-01-29', celular: '930908289' },
    { dni: '60654395', name: 'QUISPE VIZA, Kevin Dany', sex: 'H', birthDate: '2008-07-24', celular: '914582488' },
    { dni: '41936060', name: 'RIOS VILCAPAZA, Beliña', sex: 'M', birthDate: '1983-04-23', celular: '987955885' },
    { dni: '75515461', name: 'SAAVEDRA MAMANI, Katherine Korayma', sex: 'M', birthDate: '2005-04-11', celular: '932079827' },
  ],
};

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
  const sectionCounts = {};
  let total = 0;

  for (const section of ['A', 'B', 'C', 'D']) {
    const rows = PADRON_SECTIONS[section];
    if (!Array.isArray(rows) || rows.length !== EXPECTED_COUNTS[section]) {
      throw new Error(
        `Conteo inválido en sección ${section}: esperado ${EXPECTED_COUNTS[section]}, obtenido ${rows ? rows.length : 0}`
      );
    }
    sectionCounts[section] = rows.length;
    for (const row of rows) {
      total += 1;
      if (!/^\d{8}$/.test(row.dni)) {
        throw new Error(`DNI inválido en sección ${section}: ${row.dni} (${row.name})`);
      }
      if (seenDnis.has(row.dni)) {
        throw new Error(`DNI duplicado en padrón saneado: ${row.dni} (${row.name})`);
      }
      seenDnis.add(row.dni);
      if (!row.name || !row.name.includes(',')) {
        throw new Error(`Formato de nombre inesperado en sección ${section}: ${row.name}`);
      }
      if (!['H', 'M'].includes(row.sex)) {
        throw new Error(`Sexo inválido en sección ${section}: ${row.sex} (${row.dni})`);
      }
      if (!isValidIsoDate(row.birthDate)) {
        throw new Error(`Fecha inválida en sección ${section}: ${row.birthDate} (${row.dni})`);
      }
      if (row.celular !== '' && !/^\d{9}$/.test(row.celular)) {
        throw new Error(`Celular inválido en sección ${section}: ${row.celular} (${row.dni})`);
      }
    }
  }

  if (total !== 97) {
    throw new Error(`Total de padrón inválido: esperado 97, obtenido ${total}`);
  }
  return { total, uniqueDnis: seenDnis.size, sectionCounts };
}

function buildProfile2026(row, parts) {
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
    turno: 'TARDE',
  };
}

function main() {
  const { apply, dir } = parseCliArgs(process.argv.slice(2));
  const validation = validatePadron();

  console.log('=== VALIDACIÓN INTERNA DEL PADRÓN SANEADO ===');
  console.log(`Modo: ${apply ? 'APPLY (escritura vía OfflineCore)' : 'DRY-RUN (solo simulación)'}`);
  console.log(`Secciones: A=${validation.sectionCounts.A}, B=${validation.sectionCounts.B}, C=${validation.sectionCounts.C}, D=${validation.sectionCounts.D} | Total=${validation.total} | DNIs únicos=${validation.uniqueDnis}`);
  console.log('Omitidos (3):');
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

  // Evitar re-siembra involuntaria desde baseline al instanciar OfflineCore
  process.env.CETPRO_SKIP_BASELINE_SEED = '1';
  const { OfflineCore } = require('./offline-core.cjs');
  const core = new OfflineCore(dir, null);

  try {
    core.db.exec('PRAGMA busy_timeout = 10000;');

    const director = core.users().find((u) => u.username === DIRECTOR_USERNAME && u.role === 'DIRECTOR' && u.active);
    if (!director) throw new Error(`No se encontró director activo (${DIRECTOR_USERNAME}).`);

    const teacher = core.users().find((u) => u.username === TEACHER_USERNAME && u.role === 'DOCENTE' && u.active);
    if (!teacher) throw new Error(`No se encontró docente activo (${TEACHER_USERNAME}).`);

    const summary = {
      createdGroups: 0,
      reusedGroups: 0,
      updatedGroupSettings: 0,
      assignedTeacherGroups: 0,
      createdStudents: 0,
      reusedStudents: 0,
      createdEnrollments: 0,
      reusedEnrollments: 0,
      groupsBySection: {},
      enrollmentsBySection: {},
    };

    for (const section of ['A', 'B', 'C', 'D']) {
      let group = core.records('groups').find((g) => {
        if (g.archived) return false;
        if (g.programId !== PROGRAM_ID || g.moduleId !== MODULE_ID || g.periodId !== PERIOD_ID) return false;
        if (core.groupSection(g) !== section) return false;
        const gTurno = normalizeTurno(g.turno || core.record('documentSettings', `group:${g.id}`)?.fields?.turno || '');
        return gTurno === TURNO;
      });

      if (!group) {
        group = core.saveGroup(director, {
          programId: PROGRAM_ID,
          moduleId: MODULE_ID,
          periodId: PERIOD_ID,
          section,
          turno: TURNO,
          name: `${PROGRAM_NAME} · Turno ${TURNO} · Sección ${section}`,
          units: UNITS,
        });
        summary.createdGroups += 1;
      } else {
        summary.reusedGroups += 1;
      }

      const freshTeacher = core.user(teacher.id);
      const alreadyAssigned = (freshTeacher?.assignments || []).some(
        (a) =>
          a.groupId === group.id &&
          a.section === section &&
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

      const cfgKey = `group:${group.id}`;
      const existingCfg = core.record('documentSettings', cfgKey);
      const currentFields = existingCfg?.fields || {};
      const desiredFields = {
        ...currentFields,
        ciclo: currentFields.ciclo || 'Auxiliar Técnico',
        modalidad: currentFields.modalidad || 'Presencial',
        seccion: section,
        turno: TURNO,
        periodClase: PERIOD_ID,
        fechaInicio: START_DATE,
        fechaFin: END_DATE,
        efsrtInicio: EFSRT_START,
        efsrtFin: EFSRT_END,
        teacherName: teacher.name,
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

      summary.groupsBySection[section] = group.id;
      summary.enrollmentsBySection[section] = 0;

      for (const row of PADRON_SECTIONS[section]) {
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
            profile2026: buildProfile2026(row, parts),
          });
          summary.createdStudents += 1;
        } else {
          if (student.name.toUpperCase() !== row.name.toUpperCase()) {
            throw new Error(
              `Conflicto de identidad para DNI ${row.dni}: en BD="${student.name}" vs padrón="${row.name}"`
            );
          }
          if (student.archived || !student.active) {
            throw new Error(`El estudiante ${row.dni} (${student.name}) existe en BD pero está inactivo o archivado.`);
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
        summary.enrollmentsBySection[section] += 1;
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
