#!/usr/bin/env node
/**
 * scripts/load-5-carreras-2026.cjs
 *
 * Carga idempotente de las 5 carreras restantes (9 grupos, 176 matrículas) para 2026-I:
 *  - Electricidad (PROG-007 / MOD-013): Turno Mañana A (8) -> serafin.huanca
 *  - Mecánica Automotriz (PROG-001 / MOD-001): Turno Tarde A (21) + Convenio Lampa Mañana A (8) -> edgar.velasquez
 *  - Mecánica de Motos (PROG-002 / MOD-003): Turno Mañana A (32) -> anibal.maquera
 *  - Carpintería Metálica (PROG-003 / MOD-005): Turno Tarde A (24) + Convenio Lampa Mañana A (4) -> cesario.ccosi
 *  - Peluquería y Barbería (PROG-004 / MOD-007): Mañana A (35, reabriendo G-18ad9a02), Tarde B (18), Noche C (26) -> alejandrina.ayna, azucena.ccolla, fidelia.gutierrez
 *
 * Uso:
 *   node scripts/load-5-carreras-2026.cjs --dry-run
 *   node scripts/load-5-carreras-2026.cjs --apply
 *   node scripts/load-5-carreras-2026.cjs --apply --dir dev-sandbox/data
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PERIOD_ID = '2026-I';
const START_DATE = '2026-03-16';
const END_DATE = '2026-07-24';
const EFSRT_START = '2026-05-18';
const EFSRT_END = '2026-07-24';
const DIRECTOR_USERNAME = 'eloy.paredes';

const UNITS_6 = ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'EFSRT'];
const UNITS_7 = ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'];

const SANITIZATION_LOG = {
  omittedIntraCareerDuplicates: [
    'PB_M #37: 61537279 MAMANI CERPA,Cythia Lisbeth (conservada en PB_T #5 Turno Tarde)',
    'PB_T #11: 60250871 POMARI APAZA, Nory Yoselin (conservada en PB_M #25 Turno Mañana)',
    'PB_N #4: 60394378 BAEZ CACERES, Katy Lisbeth (conservada en PB_M #4 Turno Mañana)',
    'PB_N #9: 02167706 COLQUEHUANCA COLQUEHUANCA, Maximo Odon (conservado en PB_M #11 Turno Mañana)',
    'PB_N #26: 60250871 POMARI APAZA, Nory Yoselin (conservada en PB_M #25 Turno Mañana)',
  ],
  pendingDniAssigned: [
    'PB_N #15: LIPE MACHACA, Deysi Caterin -> 99990001 (documentType: PENDIENTE)',
    'PB_N #16: MAMANI APAZA, Clina -> 99990002 (documentType: PENDIENTE)',
    'AUTO_CONV #3: CAYO HUANCA, Edger -> 99990003 (documentType: PENDIENTE, sin sexo ni f. nac.)',
  ],
  corrected: [
    'AUTO_T #17: 73689632 QUISPESAYHUA CALSINA, Cladimer -> 27/09/1997† -> 1997-09-27',
    'AUTO_T #20: 40678359 TURPO BUSTINZA, Julio Cesar -> 02/09/1977† -> 1977-09-02',
    'CARP_T #8: 42170066 COAQUIRA TICONA, Walter -> 23/82/ -> 1984-01-23 (verificado en baseline)',
    'PB_M #32: 60765527 SUCASACA TIPULA, Dania Carmen -> 17/07/2026 -> 2007-07-17 (verificado en baseline)',
    '6 DNIs de 7 dígitos completados a 8 dígitos string: 02442438, 02430303, 01342626, 02366890, 02155094, 09501589',
    'Normalización de comas/espacios en nombres (PARICAHUA MAMANI, MAMANI HUANCA, ORIHUELA ORDOÑEZ, etc.)',
    'CARP_T #12 (74518624 HERRERA CHOQUE, Adler Samir) procesado primero en ELEC_M con celular 941088788',
  ],
  preservedForHumanReview: [
    'CARP_T #13: 01318199 HERRERA QUISPE, Edwin -> celular de 8 dígitos 94755146',
    '75957355: MOTOS_M #19 (PAMPA ANACAYO, Simion) vs CARP_T #21 (PAMPA ARACAYO, Simon) -> ficha única compartida',
    'PB_M #30 (60170628 RODRIGUEZ HUARACHI, Ada Jhermaydy) y PB_T #9 (60658826 MOLINA COAQUIRA, Rosa Beatriz): sexo H preservado',
    'PB_T #7 (61766405 MAQUE CANAZA, Martin Ebani): sexo M preservado',
  ],
};

const GROUPS_SPEC = [
  {
    key: 'ELEC_M',
    programId: 'PROG-007',
    programName: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',
    moduleId: 'MOD-013',
    units: UNITS_7,
    section: 'A',
    turno: 'Mañana',
    isConvenio: false,
    convenioName: '',
    name: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS · Turno Mañana · Sección A',
    teacherUsername: 'serafin.huanca',
    expectedCount: 8,
    rows: [
      { dni: '48221394', name: 'BENITES CRUZ, Jhon Neffy', sex: 'H', birthDate: '1993-03-25', celular: '974928474' },
      { dni: '41224454', name: 'CHAMBI TITO, Jesus Gonzalo', sex: 'H', birthDate: '1982-01-11', celular: '989060164' },
      { dni: '74518624', name: 'HERRERA CHOQUE, Adler Samir', sex: 'H', birthDate: '2010-08-10', celular: '941088788' },
      { dni: '46951035', name: 'PARICAHUA MAMANI, Yoan Irvin', sex: 'H', birthDate: '1991-04-06', celular: '' },
      { dni: '40829291', name: 'PONCE MAMANCHURA, Juana Lidia', sex: 'M', birthDate: '1981-03-19', celular: '978016220' },
      { dni: '77289125', name: 'QUISPE PILCO, Jean Franco', sex: 'H', birthDate: '2002-06-20', celular: '935443002' },
      { dni: '46729819', name: 'QUISPE SONCCO, Michael Carlos', sex: 'H', birthDate: '1990-11-15', celular: '951008026' },
      { dni: '45515273', name: 'SEGURA CCOICCA, Alex Walter', sex: 'H', birthDate: '1988-12-13', celular: '940684124' },
    ],
  },
  {
    key: 'AUTO_T',
    programId: 'PROG-001',
    programName: 'MECÁNICA AUTOMOTRIZ',
    moduleId: 'MOD-001',
    units: UNITS_6,
    section: 'A',
    turno: 'Tarde',
    isConvenio: false,
    convenioName: '',
    name: 'MECÁNICA AUTOMOTRIZ · Turno Tarde · Sección A',
    teacherUsername: 'edgar.velasquez',
    expectedCount: 21,
    rows: [
      { dni: '41436523', name: 'AQUISE QUISPE, Fredy', sex: 'H', birthDate: '1982-06-25', celular: '974424087' },
      { dni: '75711332', name: 'ARACCA SUMARI, Klever Edu', sex: 'H', birthDate: '2005-07-01', celular: '955205436' },
      { dni: '75659439', name: 'CALIZAYA VASQUEZ, Ronald Briam', sex: 'H', birthDate: '2000-04-09', celular: '908699070' },
      { dni: '75609203', name: 'CALSIN CARI, Jose Manuel', sex: 'H', birthDate: '2007-04-07', celular: '950974318' },
      { dni: '75609202', name: 'CALSIN CARI, Marco Antonio', sex: 'H', birthDate: '2005-04-28', celular: '950974318' },
      { dni: '41773570', name: 'CALSIN CARI, Salustiano', sex: 'H', birthDate: '1981-08-23', celular: '950974318' },
      { dni: '73801531', name: 'CHAMBILLA CASTILLO, Liseth Damaris', sex: 'M', birthDate: '2005-05-01', celular: '916863601' },
      { dni: '62741321', name: 'CHIPANA LEON, Luis Angel', sex: 'H', birthDate: '2011-02-08', celular: '951898678' },
      { dni: '71502088', name: 'CHOQUE TORRES, Luis Eloy', sex: 'H', birthDate: '2002-06-20', celular: '950395126' },
      { dni: '43108312', name: 'CONDORI CHURATA, Edwin', sex: 'H', birthDate: '1985-07-22', celular: '919151229' },
      { dni: '75486125', name: 'DIANDERAS PUMA, Jose Luis', sex: 'H', birthDate: '2000-11-17', celular: '907352803' },
      { dni: '60179226', name: 'GALARZA QUISPE, Franklin Froilan', sex: 'H', birthDate: '2007-10-04', celular: '932220151' },
      { dni: '61320709', name: 'HUANCCO CHOQUE, Luis Angel', sex: 'H', birthDate: '2008-03-19', celular: '921839881' },
      { dni: '46344621', name: 'MAMANI HANCCO, Walter Jose', sex: 'H', birthDate: '1990-05-28', celular: '910529110' },
      { dni: '42708901', name: 'MAMANI HUANCA, Efrain Godofredo', sex: 'H', birthDate: '1984-09-23', celular: '973234676' },
      { dni: '44868575', name: 'QUISPE QUISPE, Edgar', sex: 'H', birthDate: '1988-01-17', celular: '969701119' },
      { dni: '73689632', name: 'QUISPESAYHUA CALSINA, Cladimer', sex: 'H', birthDate: '1997-09-27', celular: '947219955' },
      { dni: '70358059', name: 'RAMOS QUEA, Maicol Stiu', sex: 'H', birthDate: '1998-07-11', celular: '945782638' },
      { dni: '76840057', name: 'SANCA QUISPE, Jose Armando', sex: 'H', birthDate: '2004-01-18', celular: '978696775' },
      { dni: '40678359', name: 'TURPO BUSTINZA, Julio Cesar', sex: 'H', birthDate: '1977-09-02', celular: '' },
      { dni: '71823835', name: 'VILCA GUTIERREZ, Ivan Rey', sex: 'H', birthDate: '2002-07-28', celular: '935080478' },
    ],
  },
  {
    key: 'AUTO_CONV',
    programId: 'PROG-001',
    programName: 'MECÁNICA AUTOMOTRIZ',
    moduleId: 'MOD-001',
    units: UNITS_6,
    section: 'A',
    turno: 'Mañana',
    isConvenio: true,
    convenioName: 'Convenio Lampa',
    name: 'MECÁNICA AUTOMOTRIZ · Convenio Lampa · Turno Mañana · Sección A',
    teacherUsername: 'edgar.velasquez',
    expectedCount: 8,
    rows: [
      { dni: '61938328', name: 'CALISAYA SUPO, Agustin', sex: 'H', birthDate: '2009-04-22', celular: '935490912' },
      { dni: '02442438', name: 'CALSIN QUISPE, Yohn Eloy', sex: 'H', birthDate: '1970-12-21', celular: '924606291' },
      { dni: '99990003', documentType: 'PENDIENTE', name: 'CAYO HUANCA, Edger', sex: '', birthDate: '', celular: '' },
      { dni: '61816305', name: 'LIMA CONDORI, Jhon William', sex: 'H', birthDate: '2009-07-04', celular: '932131556' },
      { dni: '61705328', name: 'MULLUNI HALANOCA, Junior Alex', sex: 'H', birthDate: '2009-09-28', celular: '914259186' },
      { dni: '61705250', name: 'TICONA CONDORI, Abad Santiago', sex: 'H', birthDate: '2009-05-21', celular: '980499411' },
      { dni: '62368920', name: 'ZELA APAZA, William Froilan', sex: 'H', birthDate: '2010-03-05', celular: '906078759' },
      { dni: '61705267', name: 'VILCA AVALOS, Maykol', sex: 'H', birthDate: '2009-06-17', celular: '906892333' },
    ],
  },
  {
    key: 'MOTOS_M',
    programId: 'PROG-002',
    programName: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
    moduleId: 'MOD-003',
    units: UNITS_6,
    section: 'A',
    turno: 'Mañana',
    isConvenio: false,
    convenioName: '',
    name: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES · Turno Mañana · Sección A',
    teacherUsername: 'anibal.maquera',
    expectedCount: 32,
    rows: [
      { dni: '62895065', name: 'AINES MAMANI, Aron Esteban', sex: 'H', birthDate: '2011-07-03', celular: '942285622' },
      { dni: '41436523', name: 'AQUISE QUISPE, Fredy', sex: 'H', birthDate: '1982-06-25', celular: '974424087' },
      { dni: '76438745', name: 'ARCE ADCO, Jorge Miguel', sex: 'H', birthDate: '2000-03-25', celular: '991617834' },
      { dni: '48770886', name: 'ATAMARI MACEDO, Alan Zolon', sex: 'H', birthDate: '1990-08-04', celular: '940210605' },
      { dni: '80023474', name: 'CHECCA VILCA, Rene Abelardo', sex: 'H', birthDate: '1974-02-12', celular: '938885890' },
      { dni: '72992934', name: 'CHOQUE AQUINO, Leonardo Josue', sex: 'H', birthDate: '2009-01-19', celular: '967071550' },
      { dni: '75911546', name: 'CHOQUE ÑAUPA, William Jose', sex: 'H', birthDate: '2005-03-17', celular: '987006179' },
      { dni: '70144925', name: 'COLOMA MAMANI, Jhon Alexander', sex: 'H', birthDate: '1994-10-15', celular: '995548384' },
      { dni: '75994465', name: 'COLQUE MAMANI, Wilson Brayan', sex: 'H', birthDate: '2002-05-20', celular: '928452965' },
      { dni: '02167706', name: 'COLQUEHUANCA COLQUEHUANCA, Maximo Odon', sex: 'H', birthDate: '1970-11-18', celular: '937381040' },
      { dni: '60180828', name: 'DIAZ HUARCAYA, Gennry Alexander', sex: 'H', birthDate: '2007-08-27', celular: '963019523' },
      { dni: '01323604', name: 'FLORES MAMANI, Willy Walter', sex: 'H', birthDate: '1974-09-23', celular: '951707611' },
      { dni: '41299707', name: 'GUEVARA MACHACA, Nestor', sex: 'H', birthDate: '1977-01-09', celular: '968405335' },
      { dni: '61881264', name: 'HALLASI MORALES, Alan Ronald', sex: 'H', birthDate: '2009-12-17', celular: '930601219' },
      { dni: '45686475', name: 'LUQUE ADCO, John German', sex: 'H', birthDate: '1988-07-20', celular: '930216008' },
      { dni: '74592553', name: 'MAMANI JUARES, Tonny Inder', sex: 'H', birthDate: '1999-12-28', celular: '979901286' },
      { dni: '77276884', name: 'OJEDA CALLA, Olger Joel', sex: 'H', birthDate: '1995-09-10', celular: '952180751' },
      { dni: '02430303', name: 'ORTIZ CALSINA, Elias', sex: 'H', birthDate: '1972-11-01', celular: '988910006' },
      { dni: '75957355', name: 'PAMPA ANACAYO, Simion', sex: 'H', birthDate: '1994-06-01', celular: '924374468' },
      { dni: '70323960', name: 'PARRILLO QUISPE, Oliver', sex: 'H', birthDate: '1994-04-30', celular: '997322775' },
      { dni: '71485602', name: 'PEREZ CHAMBI, Javier', sex: 'H', birthDate: '1992-01-10', celular: '930604201' },
      { dni: '62438164', name: 'QUISPE CALLA, Jhoel Ramiro', sex: 'H', birthDate: '2010-08-17', celular: '910697323' },
      { dni: '01342626', name: 'QUISPE COILA, Freddy', sex: 'H', birthDate: '1977-07-24', celular: '' },
      { dni: '02366890', name: 'QUISPE GUTIERREZ, Simon Teodoro', sex: 'H', birthDate: '1963-02-18', celular: '951247943' },
      { dni: '01305534', name: 'QUISPE PACOMPIA, Gumercindo', sex: 'H', birthDate: '1968-01-13', celular: '973044738' },
      { dni: '77289125', name: 'QUISPE PILCO, Jean Franco', sex: 'H', birthDate: '2002-06-20', celular: '935443002' },
      { dni: '44868575', name: 'QUISPE QUISPE, Edgar', sex: 'H', birthDate: '1988-01-17', celular: '969701119' },
      { dni: '62741376', name: 'RAMOS JUARES, Yan Marco', sex: 'H', birthDate: '2011-02-18', celular: '964452123' },
      { dni: '63071970', name: 'RUELAS CONDORI, Mark Esthif', sex: 'H', birthDate: '2012-03-12', celular: '920888817' },
      { dni: '40678359', name: 'TURPO BUSTINZA, Julio Cesar', sex: 'H', birthDate: '1977-09-02', celular: '930108961' },
      { dni: '72002989', name: 'VILCA CHINO, Rios Quinto', sex: 'H', birthDate: '2005-05-01', celular: '921704009' },
      { dni: '75479564', name: 'YANA PANCA, Pedro Luis', sex: 'H', birthDate: '2000-06-29', celular: '931527393' },
    ],
  },
  {
    key: 'CARP_T',
    programId: 'PROG-003',
    programName: 'CARPINTERÍA METÁLICA',
    moduleId: 'MOD-005',
    units: UNITS_7,
    section: 'A',
    turno: 'Tarde',
    isConvenio: false,
    convenioName: '',
    name: 'CARPINTERÍA METÁLICA · Turno Tarde · Sección A',
    teacherUsername: 'cesario.ccosi',
    expectedCount: 24,
    rows: [
      { dni: '45651460', name: 'AYAMAMANI ITO, Wilber', sex: 'H', birthDate: '1989-04-07', celular: '995582216' },
      { dni: '44303563', name: 'CALSIN ZELA, Nicolas', sex: 'H', birthDate: '1987-03-20', celular: '951214772' },
      { dni: '47063223', name: 'CANAZA MAMANI, Johaan Rommel', sex: 'H', birthDate: '1991-06-18', celular: '' },
      { dni: '75733061', name: 'CANAZA MAMANI, Ronal Arnol', sex: 'H', birthDate: '2001-12-13', celular: '' },
      { dni: '01314505', name: 'CARTAGENA MAMANI, Jose Eulogio', sex: 'H', birthDate: '1970-01-21', celular: '927400332' },
      { dni: '44476988', name: 'CHARCA QUISPE, David', sex: 'H', birthDate: '1983-04-10', celular: '' },
      { dni: '44304624', name: 'CHOQUE APAZA, Fredy', sex: 'H', birthDate: '1986-06-28', celular: '929693841' },
      { dni: '42170066', name: 'COAQUIRA TICONA, Walter', sex: 'H', birthDate: '1984-01-23', celular: '935006612' },
      { dni: '42454447', name: 'COLCA BEDOYA, Hector', sex: 'H', birthDate: '1964-04-15', celular: '951537373' },
      { dni: '60179226', name: 'GALARZA QUISPE, Franklin Froilan', sex: 'H', birthDate: '2007-10-04', celular: '932220151' },
      { dni: '41607835', name: 'HANCCO RAMOS, Braulio Alipio', sex: 'H', birthDate: '1980-07-03', celular: '956331757' },
      { dni: '74518624', name: 'HERRERA CHOQUE, Adler Samir', sex: 'H', birthDate: '2010-08-10', celular: '941088788' },
      { dni: '01318199', name: 'HERRERA QUISPE, Edwin', sex: 'H', birthDate: '1973-01-18', celular: '94755146' },
      { dni: '72859053', name: 'LARICO VILCA, Lennin Darlyn', sex: 'H', birthDate: '2001-01-14', celular: '924487946' },
      { dni: '62196409', name: 'MAMANI FLORES, Alex Maycol', sex: 'H', birthDate: '2009-10-27', celular: '' },
      { dni: '02037218', name: 'MAMANI MAMANI, Facundo', sex: 'H', birthDate: '1965-01-05', celular: '940568080' },
      { dni: '76109864', name: 'MAMANI PARI, Nelson', sex: 'H', birthDate: '1997-09-24', celular: '961254904' },
      { dni: '42207287', name: 'NINA APAZA, Augusto', sex: 'H', birthDate: '1981-08-05', celular: '951934819' },
      { dni: '75431319', name: 'OJEDA CALLA, Rommel Joel', sex: 'H', birthDate: '2002-03-20', celular: '995456862' },
      { dni: '46943584', name: 'PACCARA MACHACA, Elias', sex: 'H', birthDate: '1989-05-24', celular: '954016751' },
      { dni: '75957355', name: 'PAMPA ARACAYO, Simon', sex: 'H', birthDate: '1994-06-01', celular: '924274468' },
      { dni: '40829291', name: 'PONCE MAMANCHURA, Juana Lidia', sex: 'M', birthDate: '1981-03-19', celular: '978016220' },
      { dni: '01342626', name: 'QUISPE COILA, Freddy', sex: 'H', birthDate: '1977-07-24', celular: '' },
      { dni: '40678359', name: 'TURPO BUSTINZA, Julio Cesar', sex: 'H', birthDate: '1977-09-02', celular: '' },
    ],
  },
  {
    key: 'CARP_CONV',
    programId: 'PROG-003',
    programName: 'CARPINTERÍA METÁLICA',
    moduleId: 'MOD-005',
    units: UNITS_7,
    section: 'A',
    turno: 'Mañana',
    isConvenio: true,
    convenioName: 'Convenio Lampa',
    name: 'CARPINTERÍA METÁLICA · Convenio Lampa · Turno Mañana · Sección A',
    teacherUsername: 'cesario.ccosi',
    expectedCount: 4,
    rows: [
      { dni: '02155094', name: 'AHUMADA TORRES, Bernardo Filiberto', sex: 'H', birthDate: '1972-08-20', celular: '' },
      { dni: '60663912', name: 'APAZA QUISPE, Elvis', sex: 'H', birthDate: '2008-09-14', celular: '957188111' },
      { dni: '62368883', name: 'AVALOS SALAZAR, Ronald Edu', sex: 'H', birthDate: '2009-12-27', celular: '910276765' },
      { dni: '60619094', name: 'HUANCOLLO MACHACA, Jhon Fredy', sex: 'H', birthDate: '2008-05-05', celular: '913589529' },
    ],
  },
  {
    key: 'PB_M',
    programId: 'PROG-004',
    programName: 'PELUQUERÍA Y BARBERÍA',
    moduleId: 'MOD-007',
    units: UNITS_7,
    section: 'A',
    turno: 'Mañana',
    isConvenio: false,
    convenioName: '',
    name: 'PELUQUERÍA Y BARBERÍA · Turno Mañana · Sección A',
    teacherUsername: 'alejandrina.ayna',
    expectedCount: 35,
    rows: [
      { dni: '74957137', name: 'ABADO CHAMBI, Delfina', sex: 'M', birthDate: '2004-01-10', celular: '903250925' },
      { dni: '73342801', name: 'ALVAREZ QUISPE, Soledad', sex: 'M', birthDate: '1997-11-27', celular: '939668815' },
      { dni: '44532203', name: 'ANCO CONDORI, Lila', sex: 'M', birthDate: '1987-12-11', celular: '934756655' },
      { dni: '60394378', name: 'BAEZ CACERES, Katy Lisbeth', sex: 'M', birthDate: '2009-01-01', celular: '997942789' },
      { dni: '60304525', name: 'CABRERA LARICO, Nayeli Lisbeth', sex: 'M', birthDate: '2007-07-29', celular: '952712361' },
      { dni: '60256172', name: 'CALLOAPAZA CONDORI, Franklin Roy', sex: 'H', birthDate: '2007-04-04', celular: '943395009' },
      { dni: '72128314', name: 'CANSAYA HUAMANI, Sintia', sex: 'M', birthDate: '1994-03-17', celular: '927893042' },
      { dni: '71500944', name: 'CATUNTA QUISPE, Sussan Marleny', sex: 'M', birthDate: '1996-08-16', celular: '977416979' },
      { dni: '60518472', name: 'CHUQUIMAMANI MAMANI, Sherli Denaly', sex: 'M', birthDate: '2007-05-08', celular: '975443361' },
      { dni: '62063033', name: 'COAQUIRA COAQUIRA, Vilma Elizabeth', sex: 'M', birthDate: '2008-09-14', celular: '991490308' },
      { dni: '02167706', name: 'COLQUEHUANCA COLQUEHUANCA, Maximo Odon', sex: 'H', birthDate: '1970-11-18', celular: '937381040' },
      { dni: '61466701', name: 'GOMEZ CHUQUICALLATA, Nayeli Carmen', sex: 'M', birthDate: '2008-10-19', celular: '' },
      { dni: '45859053', name: 'GUTIERREZ QUISPE, Jhon Saul', sex: 'H', birthDate: '1989-07-03', celular: '907804070' },
      { dni: '73424123', name: 'HUAMAN LAURA, Yenifer Meliza', sex: 'M', birthDate: '1995-08-13', celular: '951840856' },
      { dni: '45936591', name: 'JILAPA CALSIN, Ada Merced', sex: 'M', birthDate: '1989-09-24', celular: '951240698' },
      { dni: '60836436', name: 'LOAZA CAHUANA, Luz Marina', sex: 'M', birthDate: '2006-08-02', celular: '921261131' },
      { dni: '74771666', name: 'MAMANI HUANCA, Jhulisa Karen', sex: 'M', birthDate: '2000-02-16', celular: '970560636' },
      { dni: '61536272', name: 'MAMANI LLUNGO, Candy Melisa', sex: 'M', birthDate: '2008-11-16', celular: '906858603' },
      { dni: '76699406', name: 'MAMANI LUQUE, Reyna Lucrecia', sex: 'M', birthDate: '2004-10-30', celular: '950593337' },
      { dni: '74325144', name: 'MAMANI ZAMATA, Yenifer Jhamilet', sex: 'M', birthDate: '2005-09-19', celular: '973882895' },
      { dni: '40133476', name: 'OJEDA POMA, Alcina', sex: 'M', birthDate: '1979-04-10', celular: '952700135' },
      { dni: '60644395', name: 'PACCO HUAMAN, Maily Laila', sex: 'M', birthDate: '2008-06-11', celular: '916666761' },
      { dni: '02416163', name: 'PILCO TURPO, Beatriz', sex: 'M', birthDate: '1976-08-22', celular: '916857199' },
      { dni: '47564195', name: 'PINTO SUXO, Erika', sex: 'M', birthDate: '1992-10-14', celular: '968008209' },
      { dni: '60250871', name: 'POMARI APAZA, Nory Yoselin', sex: 'M', birthDate: '2008-06-05', celular: '967720975' },
      { dni: '75253262', name: 'QUISPE CALLA, Mitward Jesus', sex: 'H', birthDate: '2005-04-18', celular: '981048636' },
      { dni: '61537381', name: 'QUISPE LUQUE, Luz Dayanna', sex: 'M', birthDate: '2009-02-06', celular: '990558123' },
      { dni: '60453620', name: 'QUISPE QUISPE, Evelin Yulisa', sex: 'M', birthDate: '2006-12-14', celular: '914310168' },
      { dni: '70064460', name: 'QUISPE QUISPE, Judith', sex: 'M', birthDate: '1997-08-01', celular: '916538847' },
      { dni: '60170628', name: 'RODRIGUEZ HUARACHI, Ada Jhermaydy', sex: 'H', birthDate: '2007-09-18', celular: '957192473' },
      { dni: '61321277', name: 'SUCAPUCA MACHACA, Lizeth Monica', sex: 'M', birthDate: '2008-04-26', celular: '947527242' },
      { dni: '60765527', name: 'SUCASACA TIPULA, Dania Carmen', sex: 'M', birthDate: '2007-07-17', celular: '935457551' },
      { dni: '78006716', name: 'SUPA LLACCOLLA, Yesabela', sex: 'M', birthDate: '2000-05-03', celular: '' },
      { dni: '72294647', name: 'TRUJILLO CONDORI, Yesica', sex: 'M', birthDate: '1998-11-01', celular: '972818113' },
      { dni: '60178280', name: 'TURPO CALLI, Liz Magali', sex: 'M', birthDate: '2007-08-22', celular: '929438066' },
    ],
  },
  {
    key: 'PB_T',
    programId: 'PROG-004',
    programName: 'PELUQUERÍA Y BARBERÍA',
    moduleId: 'MOD-007',
    units: UNITS_7,
    section: 'B',
    turno: 'Tarde',
    isConvenio: false,
    convenioName: '',
    name: 'PELUQUERÍA Y BARBERÍA · Turno Tarde · Sección B',
    teacherUsername: 'azucena.ccolla',
    expectedCount: 18,
    rows: [
      { dni: '61650359', name: 'ALVAREZ ZELA, Edith Mariela', sex: 'M', birthDate: '2009-04-18', celular: '' },
      { dni: '61784063', name: 'CALSIN TUPA, Vanessa', sex: 'M', birthDate: '2009-04-14', celular: '983553104' },
      { dni: '71739880', name: 'CARCASI CONDORI, Doris Karina', sex: 'M', birthDate: '2003-05-28', celular: '948992815' },
      { dni: '02432780', name: 'HUANCA ROSAS, Adela Vilma', sex: 'M', birthDate: '1971-11-14', celular: '963753155' },
      { dni: '61537279', name: 'MAMANI CERPA, Cynthia Lisbeth', sex: 'M', birthDate: '2009-02-06', celular: '972322458' },
      { dni: '43706451', name: 'MAMANI LEON, Ana Maria', sex: 'M', birthDate: '1986-08-24', celular: '961747219' },
      { dni: '61766405', name: 'MAQUE CANAZA, Martin Ebani', sex: 'M', birthDate: '2009-02-15', celular: '963393823' },
      { dni: '71522298', name: 'MESTAS CAYO, Lilia Luz', sex: 'M', birthDate: '2003-01-23', celular: '' },
      { dni: '60658826', name: 'MOLINA COAQUIRA, Rosa Beatriz', sex: 'H', birthDate: '2008-11-03', celular: '910864952' },
      { dni: '09501589', name: 'ORIHUELA ORDOÑEZ, Ronald Angel', sex: 'H', birthDate: '1968-11-28', celular: '951027130' },
      { dni: '61566901', name: 'PUMA QUISPE, Edith Medali', sex: 'M', birthDate: '2008-08-20', celular: '978203563' },
      { dni: '46963432', name: 'QUISPE OBLITAS, Judith', sex: 'M', birthDate: '1992-04-22', celular: '948732570' },
      { dni: '61849890', name: 'TIPULA CHIPANA, Jennifer Karen', sex: 'M', birthDate: '2009-08-18', celular: '913861775' },
      { dni: '76050761', name: 'TORRES CALCINA, Deysy Yanet', sex: 'M', birthDate: '2000-10-16', celular: '994190011' },
      { dni: '61536241', name: 'TURPO VILCA, Rita Edith', sex: 'M', birthDate: '2008-09-22', celular: '901519813' },
      { dni: '48350272', name: 'YUJRA MAMANI, Edward', sex: 'H', birthDate: '1991-09-21', celular: '928357486' },
      { dni: '60349260', name: 'ZENTENO INCAHUANACO, Jhoel Wilber', sex: 'H', birthDate: '2007-11-22', celular: '974291378' },
      { dni: '72911920', name: 'CHARAJA VIRACOCHA, Silvia Eugenia', sex: 'M', birthDate: '1995-06-01', celular: '' },
    ],
  },
  {
    key: 'PB_N',
    programId: 'PROG-004',
    programName: 'PELUQUERÍA Y BARBERÍA',
    moduleId: 'MOD-007',
    units: UNITS_7,
    section: 'C',
    turno: 'Noche',
    isConvenio: false,
    convenioName: '',
    name: 'PELUQUERÍA Y BARBERÍA · Turno Noche · Sección C',
    teacherUsername: 'fidelia.gutierrez',
    expectedCount: 26,
    rows: [
      { dni: '75266002', name: 'TINTAYA HUANCA, Luz Marina', sex: 'M', birthDate: '1997-10-04', celular: '941677657' },
      { dni: '75980849', name: 'APAZA CALLASACA, Deysi Yenifer', sex: 'M', birthDate: '2007-04-10', celular: '910813033' },
      { dni: '62950551', name: 'ARI SUCASACA, Lucero Maryori', sex: 'M', birthDate: '2011-12-22', celular: '977765141' },
      { dni: '61570242', name: 'CAHUAPAZA ROQUE, Nilyan Ruth', sex: 'M', birthDate: '2009-06-01', celular: '989601425' },
      { dni: '42196034', name: 'CAIRA CENTENO, Cesar Isais', sex: 'H', birthDate: '1981-10-24', celular: '976769192' },
      { dni: '44868573', name: 'CHIPANA CHOQUEPATA, Jenny', sex: 'M', birthDate: '1988-02-17', celular: '953939292' },
      { dni: '70364231', name: 'COAQUIRA CONDORI, Lizbeth', sex: 'M', birthDate: '2001-08-17', celular: '995757576' },
      { dni: '46299677', name: 'CONDORI MAMANI, Eddie Merced', sex: 'M', birthDate: '1989-09-24', celular: '907386802' },
      { dni: '75327959', name: 'CORIMAYHUA MAMANI, Mireya Paola', sex: 'M', birthDate: '2001-06-18', celular: '936207962' },
      { dni: '61783590', name: 'CUTIRE HANCCO, Evelin Anyela', sex: 'M', birthDate: '2009-03-18', celular: '920148861' },
      { dni: '46668818', name: 'HUAROTO CABRERA, Liz Alejandra', sex: 'M', birthDate: '1990-07-10', celular: '983568095' },
      { dni: '48304092', name: 'LEON JACHO, Hilda Marleni', sex: 'M', birthDate: '1994-07-20', celular: '977775888' },
      { dni: '99990001', documentType: 'PENDIENTE', name: 'LIPE MACHACA, Deysi Caterin', sex: 'M', birthDate: '2009-10-04', celular: '964679800' },
      { dni: '99990002', documentType: 'PENDIENTE', name: 'MAMANI APAZA, Clina', sex: 'M', birthDate: '2008-07-05', celular: '974343041' },
      { dni: '76254504', name: 'MAMANI CHAMBI, Julio Cesar', sex: 'H', birthDate: '2000-11-10', celular: '937115918' },
      { dni: '02037218', name: 'MAMANI MAMANI, Facundo', sex: 'H', birthDate: '1965-01-05', celular: '940568080' },
      { dni: '40286796', name: 'MAMANI PANDIA, Natividad Mirian', sex: 'M', birthDate: '1979-09-08', celular: '918211129' },
      { dni: '47768368', name: 'MAMANI QUIROZ, Lourdes', sex: 'M', birthDate: '1993-06-09', celular: '918024701' },
      { dni: '45892420', name: 'OLIVARES CCAPATINTA, Griselda', sex: 'M', birthDate: '1987-07-22', celular: '982679616' },
      { dni: '60177008', name: 'PACCI MAMANI, Deysi Lisbeth', sex: 'M', birthDate: '2006-06-30', celular: '925240003' },
      { dni: '70064470', name: 'QUISPE QUISPE, Esther Noemi', sex: 'M', birthDate: '1998-12-21', celular: '994841266' },
      { dni: '70291474', name: 'TINTAYA CONDORI, Alcides', sex: 'H', birthDate: '1998-01-23', celular: '918830975' },
      { dni: '46910723', name: 'YANA MACHACA, Josefina', sex: 'M', birthDate: '1991-05-01', celular: '902277797' },
      { dni: '77046941', name: 'MAMANI CANAZA, Yeny Yesica', sex: 'M', birthDate: '1995-02-13', celular: '' },
      { dni: '47105067', name: 'POMA CANAZA, Dany Yaneth', sex: 'M', birthDate: '1991-07-11', celular: '973715586' },
      { dni: '62083475', name: 'POMARI LIMACHE, Medalith Shilene', sex: 'M', birthDate: '2010-09-23', celular: '989565190' },
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
  if (year > 2020) return false;
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
  const seenIntraCareer = new Set();
  const uniqueBatchDnis = new Set();
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
      const intraKey = `${spec.programId}:${row.dni}`;
      if (seenIntraCareer.has(intraKey)) {
        throw new Error(`Duplicado intra-carrera detectado: ${intraKey} (${row.name})`);
      }
      seenIntraCareer.add(intraKey);
      uniqueBatchDnis.add(row.dni);

      if (!row.name || !row.name.includes(',')) {
        throw new Error(`Nombre sin coma en ${spec.key}: ${row.name}`);
      }
      if (!['', 'H', 'M'].includes(row.sex)) {
        throw new Error(`Sexo inválido en ${spec.key}: ${row.sex} (${row.dni})`);
      }
      if (row.birthDate !== '' && !isValidIsoDate(row.birthDate)) {
        throw new Error(`Fecha inválida en ${spec.key}: ${row.birthDate} (${row.dni})`);
      }
      if (row.celular !== '' && !/^\d{8,9}$/.test(row.celular)) {
        throw new Error(`Celular inválido en ${spec.key}: ${row.celular} (${row.dni})`);
      }
    }
  }

  if (total !== 176) {
    throw new Error(`Total de padrón inválido: esperado 176, obtenido ${total}`);
  }
  return { total, uniqueDnis: uniqueBatchDnis.size, counts };
}

function buildProfile2026(row, parts, spec) {
  return {
    documentoIdentidad: row.dni,
    apellidoPaterno: parts.lastName1,
    apellidoMaterno: parts.lastName2,
    nombres: parts.firstNames,
    sexo: row.sex,
    fechaNacimiento: row.birthDate,
    telefono: row.celular || '',
    programaEstudios: spec.programName,
    nivelFormativo: 'AUXILIAR TÉCNICO',
    especialidad: 'MÓDULO I',
    turno: spec.turno.toUpperCase(),
  };
}

function main() {
  const { apply, dir } = parseCliArgs(process.argv.slice(2));
  const validation = validatePadron();

  console.log('=== VALIDACIÓN INTERNA PADRÓN 5 CARRERAS RESTANTES 2026 ===');
  console.log(`Modo: ${apply ? 'APPLY (escritura vía OfflineCore)' : 'DRY-RUN (solo simulación)'}`);
  console.log(
    `Grupos: ${Object.entries(validation.counts).map(([k, v]) => `${k}=${v}`).join(', ')} | Total matrículas=${validation.total} | DNIs únicos en lote=${validation.uniqueDnis}`
  );
  console.log('Omitidos intra-carrera (5):');
  for (const item of SANITIZATION_LOG.omittedIntraCareerDuplicates) console.log(`  - ${item}`);
  console.log('Documentos PENDIENTE (3):');
  for (const item of SANITIZATION_LOG.pendingDniAssigned) console.log(`  - ${item}`);
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
      reopenedGroups: 0,
      updatedGroupSettings: 0,
      assignedTeacherGroups: 0,
      createdStudents: 0,
      reusedStudents: 0,
      reusedMultiCareerStudents: [],
      createdEnrollments: 0,
      reusedEnrollments: 0,
      groupsByKey: {},
      enrollmentsByKey: {},
    };

    for (const spec of GROUPS_SPEC) {
      const teacher = core.users().find((u) => u.username === spec.teacherUsername && u.role === 'DOCENTE' && u.active);
      if (!teacher) throw new Error(`No se encontró docente activo (${spec.teacherUsername}) para ${spec.key}.`);

      const targetConvKey = normalizeConvenioKey(spec.convenioName);
      let group = core.records('groups').find((g) => {
        if (g.archived) return false;
        if (g.programId !== spec.programId || g.moduleId !== spec.moduleId || g.periodId !== PERIOD_ID) return false;
        if (core.groupSection(g) !== spec.section) return false;
        const cfgFields = core.record('documentSettings', `group:${g.id}`)?.fields || {};
        const gTurno = normalizeTurno(g.turno || cfgFields.turno || '');
        if (gTurno !== spec.turno) return false;
        const gConvKey = normalizeConvenioKey(g.convenioName || cfgFields.convenio || '');
        return gConvKey === targetConvKey;
      });

      if (!group) {
        group = core.saveGroup(director, {
          programId: spec.programId,
          moduleId: spec.moduleId,
          periodId: PERIOD_ID,
          section: spec.section,
          turno: spec.turno,
          isConvenio: spec.isConvenio,
          convenioName: spec.convenioName,
          name: spec.name,
          units: spec.units,
        });
        summary.createdGroups += 1;
      } else {
        summary.reusedGroups += 1;
      }

      if (group.closed) {
        group = core.closure(director, {
          groupId: group.id,
          closed: false,
          rev: group.rev,
          reason: 'Reapertura oficial para matrícula 2026-I',
        });
        summary.reopenedGroups += 1;
      }

      const freshTeacher = core.user(teacher.id);
      const alreadyAssigned = (freshTeacher?.assignments || []).some(
        (a) =>
          a.groupId === group.id &&
          a.section === spec.section &&
          a.periodId === PERIOD_ID &&
          spec.units.every((u) => (a.units || []).includes(u))
      );
      if (!alreadyAssigned) {
        core.reassignGroupTeacher(director, {
          groupId: group.id,
          teacherId: teacher.id,
          units: spec.units,
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
        seccion: spec.section,
        turno: spec.turno,
        periodClase: PERIOD_ID,
        fechaInicio: START_DATE,
        fechaFin: END_DATE,
        efsrtInicio: EFSRT_START,
        efsrtFin: EFSRT_END,
        teacherName: teacher.name,
        ...(spec.isConvenio ? { convenio: spec.convenioName } : {}),
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
            documentType: row.documentType || 'DNI',
            name: row.name,
            lastName1: parts.lastName1,
            lastName2: parts.lastName2,
            firstNames: parts.firstNames,
            sex: row.sex,
            birthDate: row.birthDate,
            active: true,
            profile2026: buildProfile2026(row, parts, spec),
          });
          summary.createdStudents += 1;
        } else {
          if (student.archived || !student.active) {
            throw new Error(`El estudiante ${row.dni} (${student.name}) existe en BD pero está inactivo o archivado.`);
          }
          const activeEnrolls = core.records('enrollments').filter((e) => e.studentId === student.id && e.active);
          const conflictSameCareer = activeEnrolls.find((e) => {
            if (e.groupId === group.id) return false;
            const otherGroup = core.record('groups', e.groupId);
            return otherGroup && !otherGroup.archived && otherGroup.programId === spec.programId;
          });
          if (conflictSameCareer) {
            throw new Error(
              `Duplicado intra-carrera bloqueado para ${row.dni} (${student.name}): ya está en ${conflictSameCareer.groupId} (${spec.programId})`
            );
          }
          if (activeEnrolls.some((e) => e.groupId !== group.id)) {
            summary.reusedMultiCareerStudents.push(`${row.dni} (${student.name}) -> ${spec.key}`);
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
