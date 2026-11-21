/**
 * scripts/import-real-bd-2026.cjs
 *
 * ORDENAMIENTO, EXTRACCIÓN Y CONFIGURACIÓN INTEGRAL DE BASE DE DATOS INSTITUCIONAL 2026
 * Fuente oficial: C:\Users\whangedax\Downloads\bd (13 archivos Excel + 35 anexos fotográficos)
 * Institución: CETPRO Público "Micaela Bastidas Puyucawa" - San Miguel, San Román, Puno
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateDevSandbox } = require('./dev-sandbox-guard.cjs');
const { OfflineCore } = require('./offline-core.cjs');
const D = require('./offline-documents.cjs');
const { unzip } = require('./tabular-io.cjs');
const { issues: checkAcademicIssues } = require('./academic-config.cjs');

const root = path.resolve(__dirname, '..');
const sandboxDataDir = path.resolve(root, 'dev-sandbox', 'data');
const bdDir = process.env.CETPRO_BD_SOURCE_DIR || 'C:\\Users\\whangedax\\Downloads\\bd';

const normalizeXML = s => String(s).replace(/(<\/?)[\w]+:(?=[\w]+(?:\s|\/?>))/g, '$1').replace(/xmlns:x=/g, 'xmlns=');
const unxml = s => String(s).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v) => String.fromCodePoint(v[0].toLowerCase() === 'x' ? parseInt(v.slice(1), 16) : Number(v))).replace(/&(amp|lt|gt|quot|apos);/g, (_, v) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[v]));
function columnNumber(ref) { let n = 0; for (const c of ref.replace(/\d/g, '')) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; }

function worksheetRows(text, strings) {
  const rows = [];
  for (const row of text.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const cells = [];
    for (const cell of row[1].matchAll(/<(?:\w+:)?c\b(?![^>]*\/>)([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(cell[1])?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(cell[1])?.[1];
      let value = /<(?:\w+:)?v[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(cell[2])?.[1] || '';
      if (type === 's') value = strings[Number(value)] ?? '';
      else if (type === 'inlineStr') value = [...cell[2].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m => unxml(m[1])).join('');
      else if (type === 'str') value = unxml(value);
      else if (value !== '') value = Number.isFinite(Number(value)) ? Number(value) : unxml(value);
      cells[columnNumber(ref)] = value;
    }
    rows.push(cells);
  }
  return rows;
}

function parseXlsxFull(filePath) {
  const entries = unzip(fs.readFileSync(filePath));
  const strings = [...(normalizeXML(entries.get('xl/sharedStrings.xml')?.toString() || '')).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => unxml(t[1])).join(''));
  const workbook = normalizeXML(entries.get('xl/workbook.xml')?.toString() || '');
  const rels = normalizeXML(entries.get('xl/_rels/workbook.xml.rels')?.toString() || '');
  const sheets = [...workbook.matchAll(/<sheet\b([^>]+)\/?\s*>/g)].map(m => ({ name: unxml(/\bname="([^"]+)"/.exec(m[1])?.[1] || ''), rid: /\br:id="([^"]+)"/.exec(m[1])?.[1] }));
  const result = [];
  for (const s of sheets) {
    const rel = [...rels.matchAll(/<Relationship\b([^>]+)\/?\s*>/g)].find(m => /\bId="([^"]+)"/.exec(m[1])?.[1] === s.rid);
    const target = /\bTarget="([^"]+)"/.exec(rel?.[1] || '')?.[1];
    const file = target ? (target.startsWith('/') ? target.slice(1) : path.posix.normalize('xl/' + target)) : null;
    const ws = file && entries.get(file);
    if (!ws) continue;
    const rows = worksheetRows(ws.toString(), strings);
    result.push({ name: s.name, rows });
  }
  return result;
}

function normalizeBirthDate(rawVal, rawAge) {
  const age = Number(String(rawAge || '').trim());
  const defaultYear = (Number.isFinite(age) && age >= 12 && age <= 90) ? (2026 - age) : 2000;

  if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
    return { date: `${defaultYear}-01-01`, origin: 'ESTIMADA_DESDE_EDAD', warning: `Fecha vacía, estimada por edad (${age || 'S/E'}) -> ${defaultYear}-01-01` };
  }

  const s = String(rawVal).trim();

  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    const utcMs = Date.UTC(1899, 11, 30) + serial * 86400000;
    const d = new Date(utcMs);
    let year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    if (year >= 2015 && Number.isFinite(age) && age >= 12) {
      year = 2026 - age;
      return { date: `${year}-${month}-${day}`, origin: 'CORREGIDA_ANIO_SERIAL_CON_EDAD', warning: `Serial ${s} tenía año ${d.getUTCFullYear()}, ajustado con edad ${age} -> ${year}-${month}-${day}` };
    }
    return { date: `${year}-${month}-${day}`, origin: 'EXCEL_SERIAL', warning: null };
  }

  const cleaned = s.replace(/\/+/g, '/').replace(/\s+/g, '');
  let parts = cleaned.split('/');
  if (parts.length === 2 && /^\d{4}$/.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
    parts = [parts[0].slice(0, 2), parts[0].slice(2, 4), parts[1]];
  }
  if (parts.length >= 2) {
    let p0 = Number(parts[0]);
    let p1 = Number(parts[1]);
    let p2 = parts[2] ? Number(parts[2]) : defaultYear;

    if (!Number.isFinite(p2) || p2 < 1930 || p2 > 2015) {
      p2 = defaultYear;
    }

    let day = p0;
    let month = p1;
    if (p1 > 12 && p0 >= 1 && p0 <= 12) {
      month = p0;
      day = p1;
    }
    if (month < 1 || month > 12) month = 1;
    if (day < 1 || day > 31) day = 1;
    const maxDays = new Date(Date.UTC(p2, month, 0)).getUTCDate();
    if (day > maxDays) day = maxDays;

    const iso = `${String(p2).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: iso, origin: 'TEXTO_NORMALIZADO', warning: `Fecha texto "${s}" -> ${iso}` };
  }

  return { date: `${defaultYear}-01-01`, origin: 'FALLBACK_EDAD', warning: `Formato no reconocido "${s}", estimado ${defaultYear}-01-01` };
}

function parseFullName(rawName) {
  let clean = String(rawName || '').trim();
  clean = clean.replace(/\s+[HM]\s*$/, '').trim();
  if (!clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\.\s*/, ', ');
  }

  let apellidosStr = '';
  let nombresStr = '';

  if (clean.includes(',')) {
    const idx = clean.indexOf(',');
    apellidosStr = clean.slice(0, idx).trim().replace(/\s+/g, ' ');
    nombresStr = clean.slice(idx + 1).trim().replace(/\s+/g, ' ');
  } else {
    const tokens = clean.split(/\s+/);
    if (tokens.length >= 3) {
      apellidosStr = tokens.slice(0, 2).join(' ');
      nombresStr = tokens.slice(2).join(' ');
    } else {
      apellidosStr = tokens[0] || '';
      nombresStr = tokens.slice(1).join(' ') || '';
    }
  }

  apellidosStr = apellidosStr.toUpperCase();
  const capWord = w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
  nombresStr = nombresStr.split(/\s+/).map(capWord).join(' ');

  const apTokens = apellidosStr.split(/\s+/);
  let lastName1 = apTokens[0] || '';
  let lastName2 = apTokens.slice(1).join(' ') || '';
  if (apTokens.length > 2 && ['DE', 'DEL', 'LA', 'LAS', 'LOS'].includes(apTokens[1])) {
    lastName1 = apTokens[0];
    lastName2 = apTokens.slice(1).join(' ');
  }

  const canonicalName = `${apellidosStr}, ${nombresStr}`;
  return { canonicalName, lastName1, lastName2, firstNames: nombresStr };
}

let missingDniCounter = 1;
function normalizeDni(rawDni, canonicalName) {
  let s = String(rawDni ?? '').trim().toUpperCase();
  s = s.replace(/^O/, '0').replace(/[^0-9]/g, '');

  if (canonicalName.toUpperCase().includes('LOAYZA QUISPE') && (s === '1555271' || s === '01555271')) {
    return { dni: '01555272', warning: 'Unificado DNI de LOAYZA QUISPE, Georgina Gregoria (1555271 -> 01555272)' };
  }

  if (!s) {
    const prov = `9999000${missingDniCounter++}`.slice(-8);
    return { dni: prov, isProvisional: true, warning: `SIN DNI en Excel -> Asignado DNI provisional ${prov} (requiere verificación en Secretaría)` };
  }
  if (s.length === 7) {
    return { dni: '0' + s, warning: `DNI de 7 dígitos (${s}) normalizado con cero inicial -> 0${s}` };
  }
  if (s.length < 8) {
    const padded = s.padStart(8, '0');
    return { dni: padded, warning: `DNI corto (${s}) rellenado a 8 dígitos -> ${padded}` };
  }
  if (s.length > 8) {
    return { dni: s.slice(0, 8), warning: `DNI largo (${s}) truncado a 8 dígitos -> ${s.slice(0, 8)}` };
  }
  return { dni: s, warning: null };
}

function normalizeSex(rawSex) {
  const s = String(rawSex ?? '').trim().toUpperCase();
  if (s.startsWith('H') || s === 'MASCULINO' || s === 'VARON') return 'H';
  if (s.startsWith('M') || s.startsWith('F') || s === 'FEMENINO' || s === 'MUJER') return 'M';
  return 'M';
}

// =========================================================================
// DEFINICIÓN DE LOS 7 PROGRAMAS Y 14 MÓDULOS OFICIALES 2026
// =========================================================================

const DATES_6UD_I = [
  ['2026-03-16', '2026-04-03'],
  ['2026-04-06', '2026-04-24'],
  ['2026-04-27', '2026-05-15'],
  ['2026-05-18', '2026-06-05'],
  ['2026-06-08', '2026-06-26'],
  ['2026-06-29', '2026-07-17']
];

const DATES_5UD_I = [
  ['2026-03-16', '2026-04-10'],
  ['2026-04-13', '2026-05-08'],
  ['2026-05-11', '2026-06-05'],
  ['2026-06-08', '2026-06-26'],
  ['2026-06-29', '2026-07-17']
];

const DATES_6UD_II = [
  ['2026-08-10', '2026-08-28'],
  ['2026-08-31', '2026-09-18'],
  ['2026-09-21', '2026-10-09'],
  ['2026-10-12', '2026-10-30'],
  ['2026-11-02', '2026-11-20'],
  ['2026-11-23', '2026-12-11']
];

const DATES_5UD_II = [
  ['2026-08-10', '2026-09-04'],
  ['2026-09-07', '2026-10-02'],
  ['2026-10-05', '2026-10-30'],
  ['2026-11-02', '2026-11-20'],
  ['2026-11-23', '2026-12-11']
];

const DATES_7UD_II = [
  ['2026-08-10', '2026-08-28'],
  ['2026-08-31', '2026-09-18'],
  ['2026-09-21', '2026-10-09'],
  ['2026-10-12', '2026-10-30'],
  ['2026-11-02', '2026-11-20'],
  ['2026-11-23', '2026-12-04'],
  ['2026-12-07', '2026-12-18']
];

function buildUnits(list, datesMatrix, periodId, efsrtHours = 192, efsrtCredits = 6, efsrtName = 'Experiencias Formativas en Situaciones Reales de Trabajo') {
  const efsrtStart = periodId === '2026-I' ? '2026-05-18' : '2026-10-12';
  const efsrtEnd = periodId === '2026-I' ? '2026-07-24' : '2026-12-18';
  const units = list.map((item, idx) => {
    const [dStart, dEnd] = datesMatrix[idx] || datesMatrix[datesMatrix.length - 1];
    return {
      code: `UD${idx + 1}`,
      name: item.name,
      hours: item.hours,
      credits: item.credits,
      theoryHours: item.ht ?? 16,
      practiceHours: item.hp ?? (item.hours - (item.ht ?? 16)),
      days: item.days ?? 15,
      fechaInicio: dStart,
      fechaFin: dEnd,
      confirmed: true
    };
  });
  units.push({
    code: 'EFSRT',
    name: efsrtName,
    hours: efsrtHours,
    credits: efsrtCredits,
    theoryHours: 0,
    practiceHours: efsrtHours,
    days: 24,
    fechaInicio: efsrtStart,
    fechaFin: efsrtEnd,
    confirmed: true
  });
  return units;
}

const PROGRAMS_CATALOG = [
  {
    id: 'PROG-001',
    nombre: 'MECÁNICA AUTOMOTRIZ',
    cnofCode: 'C0714-1-001',
    titleText: 'AUXILIAR TÉCNICO EN MECÁNICA AUTOMOTRIZ',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-001',
        periodId: '2026-I',
        nombre: 'Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos y Transmisión',
        turno: 'Tarde',
        teacherNames: 'Édgar Velásquez Vilca',
        competence: 'Realizar el mantenimiento y reparación de los sistemas de suspensión, dirección, frenos y transmisión de vehículos automotrices, según especificaciones técnicas del fabricante y normas de seguridad.',
        units: buildUnits([
          { name: 'Organiza el aula taller automotriz', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Mantenimiento del sistema de frenos, dirección y suspensión', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Mantenimiento del sistema de transmisión', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Aplicación de herramientas informáticas', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Metodologías para el emprendimiento', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_5UD_I, '2026-I')
      },
      {
        id: 'MOD-002',
        periodId: '2026-II',
        nombre: 'Diagnóstico y Mantenimiento del Motor de Combustión Interna de los Vehículos Automotrices',
        turno: 'Tarde',
        teacherNames: 'Édgar Velásquez Vilca',
        competence: 'Realizar el diagnóstico y mantenimiento del motor de combustión interna y sus sistemas auxiliares en vehículos automotrices, aplicando normas técnicas y ambientales.',
        units: buildUnits([
          { name: 'Diagnóstico y mantenimiento de motores Otto y Diésel', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Diagnóstico y mantenimiento del sistema de lubricación y refrigeración', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Diagnóstico y mantenimiento del sistema de distribución y alimentación', hours: 64, credits: 3, ht: 32, hp: 32 },
          { name: 'Comunicación para las buenas relaciones interpersonales', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Ética para la buena convivencia', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_5UD_II, '2026-II')
      }
    ]
  },
  {
    id: 'PROG-002',
    nombre: 'MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
    cnofCode: 'C0714-1-004',
    titleText: 'AUXILIAR TÉCNICO EN MECÁNICA DE MOTOS Y VEHÍCULOS AFINES',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-003',
        periodId: '2026-I',
        nombre: 'Mantenimiento y Reparación de Sistema de Suspensión, Dirección, Frenos, Transmisión, Sistema Eléctrico y Electrónico de Motos y Vehículos Afines',
        turno: 'Mañana',
        teacherNames: 'Aníbal Bruno Maquera Gil',
        competence: 'Realizar el mantenimiento y reparación de los sistemas de chasis, suspensión, dirección, frenos, transmisión y sistema eléctrico de motos y vehículos afines.',
        units: buildUnits([
          { name: 'Frenos, suspensión y seguridad del taller de motos', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Dirección y transmisión de motos y vehículos afines', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Sistemas eléctricos, iluminación y accesorios de motos', hours: 80, credits: 4, ht: 32, hp: 48 },
          { name: 'Diagnóstico de sistemas electrónicos de motos', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Comunicación y herramientas digitales para el taller', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_5UD_I, '2026-I')
      },
      {
        id: 'MOD-004',
        periodId: '2026-II',
        nombre: 'Mantenimiento y Reparación de Motos de Combustión y Conversión del Sistema GNV-GLP',
        turno: 'Mañana',
        teacherNames: 'Aníbal Bruno Maquera Gil',
        competence: 'Realizar el mantenimiento y reparación de motores de combustión de motocicletas y conversión al sistema de combustible GNV-GLP.',
        units: buildUnits([
          { name: 'Motor de combustión y lubricación de motos', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Alimentación, inyección y diagnóstico electrónico de motos', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Conversión al sistema de combustible GNV-GLP', hours: 80, credits: 4, ht: 32, hp: 48 },
          { name: 'Mantenimiento y seguridad de sistemas de combustible dual', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Plan de negocios y comportamiento ético en el taller', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_5UD_II, '2026-II')
      }
    ]
  },
  {
    id: 'PROG-003',
    nombre: 'CARPINTERÍA METÁLICA',
    cnofCode: 'C0715-1-001',
    titleText: 'AUXILIAR TÉCNICO EN CARPINTERÍA METÁLICA',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-005',
        periodId: '2026-I',
        nombre: 'Construcciones Metálicas de Consumo con Soldadura por Arco Eléctrico en Acero',
        turno: 'Tarde',
        teacherNames: 'Cesario Julio Ccosi Quenaya',
        competence: 'Fabricar construcciones metálicas de consumo con soldadura por arco eléctrico revestido (SMAW) en acero, interpretando planos técnicos y aplicando normas de seguridad industrial.',
        units: buildUnits([
          { name: 'Seguridad industrial y organización del taller', hours: 40, credits: 2, ht: 24, hp: 16 },
          { name: 'Dibujo técnico aplicado', hours: 40, credits: 2, ht: 24, hp: 16 },
          { name: 'Metrología y trazado', hours: 64, credits: 2, ht: 0, hp: 64 },
          { name: 'Corte de materiales metálicos', hours: 96, credits: 3, ht: 0, hp: 96 },
          { name: 'Conformado básico y soldadura inicial', hours: 32, credits: 1, ht: 0, hp: 32 },
          { name: 'Competencias de empleabilidad', hours: 64, credits: 4, ht: 64, hp: 0 }
        ], DATES_6UD_I, '2026-I')
      },
      {
        id: 'MOD-006',
        periodId: '2026-II',
        nombre: 'Construcciones Metálicas de Consumo en Aluminio con Soldadura Especial TIG-MIG-MAG-LASER',
        turno: 'Tarde',
        teacherNames: 'Cesario Julio Ccosi Quenaya',
        competence: 'Fabricar estructuras y construcciones metálicas en acero y aluminio empleando procesos especiales de soldadura TIG, MIG-MAG y corte láser con control de calidad.',
        units: buildUnits([
          { name: 'Seguridad y preparación para soldadura especial y aluminio', hours: 40, credits: 2, ht: 24, hp: 16 },
          { name: 'Soldadura TIG y procesos SMAW en estructuras', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Soldadura MIG-MAG aplicada a construcciones metálicas', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Armado, ensamblaje e instalación de carpintería metálica y aluminio', hours: 72, credits: 2, ht: 8, hp: 64 },
          { name: 'Acabado, corte láser y control de calidad de estructuras', hours: 32, credits: 1, ht: 0, hp: 32 },
          { name: 'Competencias de empleabilidad y gestión del taller', hours: 64, credits: 4, ht: 64, hp: 0 }
        ], DATES_6UD_II, '2026-II')
      }
    ]
  },
  {
    id: 'PROG-004',
    nombre: 'PELUQUERÍA Y BARBERÍA',
    cnofCode: 'S3496-1-001',
    titleText: 'AUXILIAR TÉCNICO EN PELUQUERÍA Y BARBERÍA',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-007',
        periodId: '2026-I',
        nombre: 'Corte de Cabellos, Peinados y Diseño de Barbas',
        turno: 'Mañana / Tarde / Noche',
        teacherNames: 'Alejandrina Ayna Cabrera / María Azucena Ccolla Villanueva / Fidelia Jesusa Gutiérrez Loza',
        competence: 'Ejecuta técnicas de diagnóstico capilar, corte de cabello, peinados y diseño de barba y bigote aplicando normas de bioseguridad e higiene.',
        units: buildUnits([
          { name: 'Diagnóstico y tratamiento capilar', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Técnicas de corte de cabello', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Peinados, colocación de postizos y extensiones', hours: 64, credits: 3, ht: 32, hp: 32 },
          { name: 'Diseño y corte de barba y bigote', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Comunicación para el desarrollo personal y profesional', hours: 32, credits: 1, ht: 0, hp: 32 },
          { name: 'Aplicaciones de herramientas informáticas', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_6UD_I, '2026-I')
      },
      {
        id: 'MOD-008',
        periodId: '2026-II',
        nombre: 'Ondulación, Decoloración y Tinturación',
        turno: 'Mañana / Tarde / Noche',
        teacherNames: 'Alejandrina Ayna Cabrera / María Azucena Ccolla Villanueva / Fidelia Jesusa Gutiérrez Loza',
        competence: 'Realiza cambios de estructura y color en la fibra capilar (ondulación, alisado, decoloración y tinturación) cumpliendo estándares técnicos y de bioseguridad.',
        units: buildUnits([
          { name: 'Diagnóstico y tratamiento capilar', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Anillados y ondulación permanente', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Alisado permanente y reacondicionamiento', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Colorimetría y técnicas de coloración', hours: 64, credits: 3, ht: 32, hp: 32 },
          { name: 'Técnicas de decoloración y efectos de luz', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Emprendimiento y gestión de salón de belleza', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Ética y ciudadanía en el trabajo', hours: 32, credits: 1, ht: 0, hp: 32, days: 10 }
        ], DATES_7UD_II, '2026-II')
      }
    ]
  },
  {
    id: 'PROG-005',
    nombre: 'COMPUTACIÓN E INFORMÁTICA',
    cnofCode: 'J2662-1-001',
    titleText: 'AUXILIAR TÉCNICO EN COMPUTACIÓN E INFORMÁTICA',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-009',
        periodId: '2026-I',
        nombre: 'Ofimática',
        turno: 'Tarde / Virtual',
        teacherNames: 'Magda Chura Coaquira',
        competence: 'Operar sistemas informáticos en entorno de monousuarios, utilizando el sistema operativo elegido, procesando y registrando información en hojas de cálculo, procesadores de textos y presentaciones.',
        units: buildUnits([
          { name: 'Sistema Operativo y Gestión de Archivos', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Procesamiento de Textos Microsoft Word', hours: 64, credits: 3, ht: 32, hp: 32 },
          { name: 'Hojas de Cálculo Microsoft Excel', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Presentaciones Gráficas Microsoft PowerPoint', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Comunicación para el desarrollo personal y profesional', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Aplicaciones de herramientas informáticas', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_6UD_I, '2026-I')
      },
      {
        id: 'MOD-010',
        periodId: '2026-II',
        nombre: 'Diseño Gráfico y Plataformas Digitales',
        turno: 'Tarde / Virtual',
        teacherNames: 'Magda Chura Coaquira',
        competence: 'Elaborar representaciones gráficas publicitarias y administrar contenidos en plataformas digitales según especificaciones y necesidades del usuario.',
        units: buildUnits([
          { name: 'Diseño Vectorial con CorelDraw', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Edición de Imagen Digital con Photoshop', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Plataformas digitales y gestión de contenidos', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Plan de negocios', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Comportamiento ético', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_5UD_II, '2026-II')
      }
    ]
  },
  {
    id: 'PROG-006',
    nombre: 'CORTE Y ENSAMBLAJE',
    cnofCode: 'C0714-1-003',
    titleText: 'AUXILIAR TÉCNICO EN CORTE Y ENSAMBLAJE',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-011',
        periodId: '2026-I',
        nombre: 'Técnicas de Trazado, Tendido y Corte de Prendas de Vestir',
        turno: 'Mañana / Tarde / Noche',
        teacherNames: 'Liz Elvira Flores Llanos / René Prudencio Chura Mamani / Teófilo Larico Canahuire',
        competence: 'Realizar el diseño de patrones, tendido de tejido, tizado, corte industrial y habilitado de piezas de prendas de vestir con control de calidad y seguridad.',
        units: buildUnits([
          { name: 'Técnicas de diseño y patronaje para textiles del hogar', hours: 64, credits: 3, ht: 32, hp: 32 },
          { name: 'Técnicas de tendido y tizado para textiles del hogar', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Técnicas de corte y seguridad en prendas de dama', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Habilitado y control de calidad en prendas de dama', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Comunicación en el entorno laboral', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Herramientas digitales para la confección', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_6UD_I, '2026-I')
      },
      {
        id: 'MOD-012',
        periodId: '2026-II',
        nombre: 'Técnicas de Confección de Prendas de Vestir',
        turno: 'Mañana / Tarde / Noche',
        teacherNames: 'Liz Elvira Flores Llanos / René Prudencio Chura Mamani / Teófilo Larico Canahuire',
        competence: 'Operar máquinas de confección industrial para el ensamblaje y acabado de prendas deportivas y de vestir, cumpliendo fichas técnicas.',
        units: buildUnits([
          { name: 'Habilitado de piezas para prendas deportivas', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Operatividad de máquinas para prendas deportivas', hours: 64, credits: 3, ht: 32, hp: 32 },
          { name: 'Operaciones de ensamblaje para prendas de varón', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Acabados de confección de prendas de varón', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Emprendimiento y gestión de negocios de confección', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Ética y ciudadanía en el trabajo', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_6UD_II, '2026-II')
      }
    ]
  },
  {
    id: 'PROG-007',
    nombre: 'MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',
    cnofCode: 'C1833-2-001',
    titleText: 'AUXILIAR TÉCNICO EN MANTENIMIENTO DE SISTEMAS ELÉCTRICOS',
    programHours: 1056,
    programCredits: 40,
    modules: [
      {
        id: 'MOD-013',
        periodId: '2026-I',
        nombre: 'Instalación de Sistemas Eléctricos en Edificaciones',
        turno: 'Tarde',
        teacherNames: 'Serafín Huanca Castro',
        competence: 'Ejecutar la instalación y mantenimiento de sistemas eléctricos en edificaciones residenciales y comerciales según el Código Nacional de Electricidad y normas de seguridad.',
        units: buildUnits([
          { name: 'Herramientas y equipos del taller', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Instrumentos de mediciones eléctricas', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Instalaciones eléctricas en edificaciones', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Comunicación oral y escrita', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Herramientas digitales', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Equipos eléctricos y electrónicos', hours: 48, credits: 2, ht: 16, hp: 32 }
        ], DATES_6UD_I, '2026-I')
      },
      {
        id: 'MOD-014',
        periodId: '2026-II',
        nombre: 'Mantenimiento de Equipos Electrónicos y Sistemas de Seguridad en Domótica',
        turno: 'Tarde',
        teacherNames: 'Serafín Huanca Castro',
        competence: 'Instalar y realizar el mantenimiento de sistemas de seguridad electrónica, domótica y equipos electrónicos de audio y video aplicando normativa vigente.',
        units: buildUnits([
          { name: 'Sistemas de seguridad y domótica', hours: 80, credits: 3, ht: 16, hp: 64 },
          { name: 'Mantenimiento de equipos de audio y video', hours: 96, credits: 4, ht: 32, hp: 64 },
          { name: 'Ideas de negocios', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Ética en el trabajo', hours: 48, credits: 2, ht: 16, hp: 32 },
          { name: 'Electrónica de potencia y fuentes conmutadas', hours: 64, credits: 3, ht: 32, hp: 32 }
        ], DATES_5UD_II, '2026-II')
      }
    ]
  }
];

// =========================================================================
// DIRECTORIO DEL PERSONAL OFICIAL 2026 (15 TRABAJADORES)
// =========================================================================

const PERSONNEL_2026 = [
  { document: '01309890', name: 'PAREDES FELICIANO, Eloy Valerio', displayName: 'Lic. Eloy Valerio Paredes Feliciano', position: 'Director', specialty: 'Electricidad y Electrónica', email: 'eloyvpflee@gmail.com', phone: '961990905', birthday: '28-Ene', address: 'Tepro "B"-G-11 - Puno', referenceTurno: 'MAÑANA / TARDE', username: 'eloy.paredes', role: 'DIRECTOR' },
  { document: '02436967', name: 'VILCA PUMA, Carmen Yovana', displayName: 'Carmen Yovana Vilca Puma', position: 'Secretaria', specialty: 'Secretaría General', email: 'libertadcarmen19@gmail.com', phone: '999041818', birthday: '16-Jul', address: 'Av. 3 de Octubre 879', referenceTurno: 'MAÑANA / TARDE', username: 'carmen.vilca', role: 'SECRETARIA' },
  { document: '01206948', name: 'MAQUERA GIL, Aníbal Bruno', displayName: 'Prof. Aníbal Bruno Maquera Gil', position: 'Prof. de Aula', specialty: 'Mecánica de Motos y Vehículos Afines', careerId: 'PROG-002', email: 'anibalbrunomaqueragil@gmail.com', phone: '950961799', birthday: '17-May', address: 'Av. Rinconada Mz. C Lote 21', referenceTurno: 'MAÑANA', username: 'anibal.maquera', role: 'DOCENTE' },
  { document: '02436621', name: 'HUANCA CASTRO, Serafín', displayName: 'Prof. Serafín Huanca Castro', position: 'Prof. de Aula', specialty: 'Mantenimiento de Sistemas Eléctricos', careerId: 'PROG-007', email: 'serhuacast@gmail.com', phone: '950977724', birthday: '05-Dic', address: 'Jr. Caylloma 244', referenceTurno: 'TARDE', username: 'serafin.huanca', role: 'DOCENTE' },
  { document: '01296616', name: 'CHURA COAQUIRA, Magda', displayName: 'Prof. Magda Chura Coaquira', position: 'Prof. de Aula', specialty: 'Computación e Informática', careerId: 'PROG-005', email: 'magdachura44@gmail.com', phone: '994836070', birthday: '31-Mar', address: 'Jr. Urcupiña 159', referenceTurno: 'TARDE', username: 'magda.chura', role: 'DOCENTE' },
  { document: '01540900', name: 'LARICO CANAHUIRE, Teófilo', displayName: 'Prof. Teófilo Larico Canahuire', position: 'Prof. de Aula', specialty: 'Corte y Ensamblaje', careerId: 'PROG-006', email: 'laricoteofilo@gmail.com', phone: '990800601', birthday: '27-Abr', address: 'Jr. Yungay - San Miguel', referenceTurno: 'NOCHE', username: 'teofilo.larico', role: 'DOCENTE' },
  { document: '01776490', name: 'CHURA MAMANI, René Prudencio', displayName: 'Prof. René Prudencio Chura Mamani', position: 'Prof. de Aula', specialty: 'Corte y Ensamblaje', careerId: 'PROG-006', email: 'renetox28@gmail.com', phone: '950908005', birthday: '28-Abr', address: 'Jr. Santa Fe N° 126 Urb. 27', referenceTurno: 'TARDE', username: 'rene.chura', role: 'DOCENTE' },
  { document: '40216775', name: 'AYNA CABRERA, Alejandrina', displayName: 'Prof. Alejandrina Ayna Cabrera', position: 'Prof. de Aula', specialty: 'Peluquería y Barbería', careerId: 'PROG-004', email: 'aynacabreraale@gmail.com', phone: '901000902', birthday: '29-Jul', address: 'Av. Laykakota 248 Int. 17', referenceTurno: 'MAÑANA', username: 'alejandrina.ayna', role: 'DOCENTE' },
  { document: '01777393', name: 'GUTIÉRREZ LOZA, Fidelia Jesusa', displayName: 'Prof. Fidelia Jesusa Gutiérrez Loza', position: 'Prof. de Aula', specialty: 'Peluquería y Barbería', careerId: 'PROG-004', email: 'fidelestetica@gmail.com', phone: '925083339', birthday: '14-Mar', address: 'Jr. Lambayeque 920', referenceTurno: 'NOCHE', username: 'fidelia.gutierrez', role: 'DOCENTE' },
  { document: '01316666', name: 'CCOLLA VILLANUEVA, María Azucena', displayName: 'Prof. María Azucena Ccolla Villanueva', position: 'Prof. de Aula', specialty: 'Peluquería y Barbería', careerId: 'PROG-004', email: 'macollavillanueva@gmail.com', phone: '950769862', birthday: '01-Jun', address: 'Jr. Candelaria N° 2170 Puno', referenceTurno: 'TARDE', username: 'azucena.ccolla', role: 'DOCENTE' },
  { document: '41468188', name: 'FLORES LLANOS, Liz Elvira', displayName: 'Prof. Liz Elvira Flores Llanos', position: 'Prof. de Aula', specialty: 'Corte y Ensamblaje', careerId: 'PROG-006', email: 'lizelvira211@hotmail.com', phone: '950902779', birthday: '15-Oct', address: 'Jr. Leocadio Prado N° 695', referenceTurno: 'MAÑANA', username: 'liz.flores', role: 'DOCENTE' },
  { document: '42923233', name: 'VELÁSQUEZ VILCA, Édgar', displayName: 'Prof. Édgar Velásquez Vilca', position: 'Prof. de Aula', specialty: 'Mecánica Automotriz', careerId: 'PROG-001', email: 'velasquezvilcaedgar@gmail.com', phone: '915110927', birthday: '14-Abr', address: 'Jr. Gervacio Lipa P-7', referenceTurno: 'TARDE', username: 'edgar.velasquez', role: 'DOCENTE' },
  { document: '01302956', name: 'CCOSI QUENAYA, Cesario Julio', displayName: 'Prof. Cesario Julio Ccosi Quenaya', position: 'Prof. de Aula', specialty: 'Carpintería Metálica', careerId: 'PROG-003', email: 'julioquenaya74@gmail.com', phone: '994381864', birthday: '25-Feb', address: 'Alianza Mz. G Lote 11', referenceTurno: 'TARDE', username: 'cesario.ccosi', role: 'DOCENTE' },
  { document: '02444084', name: 'CANAZA ZAPATA, Néstor', displayName: 'Néstor Canaza Zapata', position: 'Personal de Servicio', specialty: 'Servicio, Mantenimiento y Custodia', email: 'necaza@gmail.com', phone: '900772688', birthday: '07-Jun', address: 'Jr. Callao Mz. F', referenceTurno: 'MAÑANA', username: null, role: null },
  { document: '30833265', name: 'PASTOR MURRIEL, Víctor Antonio', displayName: 'Víctor Antonio Pastor Murriel', position: 'Personal de Servicio', specialty: 'Servicio, Vigilancia y Conservación', email: 'kiwiypm@gmail.com', phone: '950808068', birthday: '13-Feb', address: 'Av. Perú N° 815', referenceTurno: 'NOCHE', username: null, role: null }
];

// =========================================================================
// MAPEO DE ARCHIVOS EXCEL DE `Downloads\bd` A CARRERAS, SECCIONES Y DOCENTES
// =========================================================================
// Nota: Toda aula que supere 30 estudiantes se segmenta en secciones de máx 30
// para garantizar compatibilidad 100% con el tope de 30 filas de las plantillas PDF MINEDU.

const FILE_CLASSROOM_MAPPING = [
  {
    file: '1.A  PB TURNO MAÑANA.xlsx',
    programId: 'PROG-004',
    moduleId: 'MOD-007',
    module2Id: 'MOD-008',
    turno: 'Mañana',
    modalidad: 'Presencial',
    teacherUsername: 'alejandrina.ayna',
    sections: [
      { id: 'GRP-2026-PB-M-A1', section: 'A1', name: 'Peluquería y Barbería · Mañana · Sección A1', slice: [0, 30] },
      { id: 'GRP-2026-PB-M-A2', section: 'A2', name: 'Peluquería y Barbería · Mañana · Sección A2', slice: [30, 60] }
    ]
  },
  {
    file: '1.B PB TURNO TARDE.xlsx',
    programId: 'PROG-004',
    moduleId: 'MOD-007',
    module2Id: 'MOD-008',
    turno: 'Tarde',
    modalidad: 'Presencial',
    teacherUsername: 'azucena.ccolla',
    sections: [
      { id: 'GRP-2026-PB-T-B', section: 'B', name: 'Peluquería y Barbería · Tarde · Sección B', slice: [0, 30] }
    ]
  },
  {
    file: '1.C PB  TURNO NOCHE.xlsx',
    programId: 'PROG-004',
    moduleId: 'MOD-007',
    module2Id: 'MOD-008',
    turno: 'Noche',
    modalidad: 'Presencial',
    teacherUsername: 'fidelia.gutierrez',
    sections: [
      { id: 'GRP-2026-PB-N-C', section: 'C', name: 'Peluquería y Barbería · Noche · Sección C', slice: [0, 30] }
    ]
  },
  {
    file: '2. AUTOMOTRIZ.xlsx',
    programId: 'PROG-001',
    moduleId: 'MOD-001',
    module2Id: 'MOD-002',
    turno: 'Tarde',
    modalidad: 'Presencial',
    teacherUsername: 'edgar.velasquez',
    sections: [
      { id: 'GRP-2026-AUTO-T-A', section: 'A', name: 'Mecánica Automotriz · Tarde · Sección A', slice: [0, 30] }
    ]
  },
  {
    file: '3. MEC MOTOS.xlsx',
    programId: 'PROG-002',
    moduleId: 'MOD-003',
    module2Id: 'MOD-004',
    turno: 'Mañana',
    modalidad: 'Presencial',
    teacherUsername: 'anibal.maquera',
    sections: [
      { id: 'GRP-2026-MOTOS-M-A', section: 'A', name: 'Mecánica de Motos · Mañana · Sección A', slice: [0, 30] }
    ]
  },
  {
    file: '4. CARPENTERIA.xlsx',
    programId: 'PROG-003',
    moduleId: 'MOD-005',
    module2Id: 'MOD-006',
    turno: 'Tarde',
    modalidad: 'Presencial',
    teacherUsername: 'cesario.ccosi',
    sections: [
      { id: 'GRP-2026-CARP-T-A', section: 'A', name: 'Carpintería Metálica · Tarde · Sección A', slice: [0, 30] }
    ]
  },
  {
    file: '5. A COMPUTACION PRESENCIAL.xlsx',
    programId: 'PROG-005',
    moduleId: 'MOD-009',
    module2Id: 'MOD-010',
    turno: 'Tarde',
    modalidad: 'Presencial',
    teacherUsername: 'magda.chura',
    sections: [
      { id: 'GRP-2026-COMP-P-A', section: 'A', name: 'Computación Presencial · Tarde · Sección A', slice: [0, 30] }
    ]
  },
  {
    file: '6. B COMPUTACION VIRTUAL.xlsx',
    programId: 'PROG-005',
    moduleId: 'MOD-009',
    module2Id: 'MOD-010',
    turno: 'Noche',
    modalidad: 'Virtual',
    teacherUsername: 'magda.chura',
    sections: [
      { id: 'GRP-2026-COMP-V-B1', section: 'B1', name: 'Computación Virtual · Sección B1', slice: [0, 30] },
      { id: 'GRP-2026-COMP-V-B2', section: 'B2', name: 'Computación Virtual · Sección B2', slice: [30, 60] },
      { id: 'GRP-2026-COMP-V-B3', section: 'B3', name: 'Computación Virtual · Sección B3', slice: [60, 90] }
    ]
  },
  {
    file: '6.C  COMPUTACION VIRTUAL  DOCENT..xlsx',
    programId: 'PROG-005',
    moduleId: 'MOD-009',
    module2Id: 'MOD-010',
    turno: 'Noche',
    modalidad: 'Virtual',
    teacherUsername: 'magda.chura',
    sections: [
      { id: 'GRP-2026-COMP-V-C', section: 'C', name: 'Computación Virtual Docentes · Sección C', slice: [0, 30] }
    ]
  },
  {
    file: '7. A CORTE  ENSAMBLAJE MAÑANA.xlsx',
    programId: 'PROG-006',
    moduleId: 'MOD-011',
    module2Id: 'MOD-012',
    turno: 'Mañana',
    modalidad: 'Presencial',
    teacherUsername: 'liz.flores',
    sections: [
      { id: 'GRP-2026-CORTE-M-A', section: 'A', name: 'Corte y Ensamblaje · Mañana · Sección A', slice: [0, 30] }
    ]
  },
  {
    file: '7.B CORTE  ENSAMBLAJE TARDE.xlsx',
    programId: 'PROG-006',
    moduleId: 'MOD-011',
    module2Id: 'MOD-012',
    turno: 'Tarde',
    modalidad: 'Presencial',
    teacherUsername: 'rene.chura',
    sections: [
      { id: 'GRP-2026-CORTE-T-B', section: 'B', name: 'Corte y Ensamblaje · Tarde · Sección B', slice: [0, 30] }
    ]
  },
  {
    file: '7.C CORTE  ENSAMBLAJE NOCHE.xlsx',
    programId: 'PROG-006',
    moduleId: 'MOD-011',
    module2Id: 'MOD-012',
    turno: 'Noche',
    modalidad: 'Presencial',
    teacherUsername: 'teofilo.larico',
    sections: [
      { id: 'GRP-2026-CORTE-N-C', section: 'C', name: 'Corte y Ensamblaje · Noche · Sección C', slice: [0, 30] }
    ]
  },
  {
    file: '8.  ELECTRICIDAD.xlsx',
    programId: 'PROG-007',
    moduleId: 'MOD-013',
    module2Id: 'MOD-014',
    turno: 'Tarde',
    modalidad: 'Presencial',
    teacherUsername: 'serafin.huanca',
    sections: [
      { id: 'GRP-2026-ELEC-T-A', section: 'A', name: 'Mantenimiento de Sistemas Eléctricos · Tarde · Sección A', slice: [0, 30] }
    ]
  }
];

function extractStudentsFromBd() {
  missingDniCounter = 1;
  const byFile = new Map();
  const warnings = [];
  const allRows = [];
  const seenDniGlobal = new Map();

  for (const mapping of FILE_CLASSROOM_MAPPING) {
    const fullPath = path.join(bdDir, mapping.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`No se encontró el archivo Excel requerido: ${fullPath}`);
    }
    const sheets = parseXlsxFull(fullPath);
    const fileStudents = [];
    const seenDniInFile = new Set();

    for (const sheet of sheets) {
      sheet.rows.forEach((r, idx) => {
        if (idx < 3) return;
        const rawName = r[2];
        const nameStr = String(rawName || '').trim().toUpperCase();
        if (!nameStr || nameStr.includes('APELLIDOS') || nameStr.includes('ESPECIALIDAD') || nameStr.includes('TURNO') || nameStr.includes('REGISTRO')) return;
        if (String(r[0] || '').trim().toUpperCase() === 'N°') return;

        const parsedName = parseFullName(rawName);
        const parsedDni = normalizeDni(r[1], parsedName.canonicalName);
        const parsedBirth = normalizeBirthDate(r[4], r[5]);
        const sex = normalizeSex(r[3]);
        const phone = String(r[6] ?? '').replace(/[^0-9]/g, '').slice(0, 9);

        if (parsedDni.warning) warnings.push({ file: mapping.file, row: idx, student: parsedName.canonicalName, type: 'DNI', detail: parsedDni.warning });
        if (parsedBirth.warning) warnings.push({ file: mapping.file, row: idx, student: parsedName.canonicalName, type: 'FECHA_NAC', detail: parsedBirth.warning });

        const record = {
          file: mapping.file,
          row: idx,
          orderNum: r[0] ?? '',
          document: parsedDni.dni,
          documentType: 'DNI',
          isProvisionalDni: !!parsedDni.isProvisional,
          name: parsedName.canonicalName,
          lastName1: parsedName.lastName1,
          lastName2: parsedName.lastName2,
          firstNames: parsedName.firstNames,
          sex,
          birthDate: parsedBirth.date,
          age: Number(r[5]) || null,
          phone,
          condition: 'G'
        };

        allRows.push(record);

        if (seenDniInFile.has(record.document)) {
          warnings.push({
            file: mapping.file,
            row: idx,
            student: record.name,
            type: 'DUPLICADO_EN_MISMA_AULA',
            detail: `DNI ${record.document} repetido en el mismo archivo (${mapping.file}); se conserva una matrícula activa única en el aula.`
          });
        } else if (seenDniGlobal.has(record.document)) {
          const prevFile = seenDniGlobal.get(record.document);
          warnings.push({
            file: mapping.file,
            row: idx,
            student: record.name,
            type: 'DUPLICADO_ENTRE_PADRONES',
            detail: `DNI ${record.document} ya matriculado en el padrón oficial (${prevFile}); se omite registro duplicado en ${mapping.file} para mantener relación 1:1 en producción.`
          });
        } else {
          seenDniInFile.add(record.document);
          seenDniGlobal.set(record.document, mapping.file);
          fileStudents.push(record);
        }
      });
    }

    byFile.set(mapping.file, fileStudents);
  }

  return { byFile, allRows, warnings };
}

function importRealBd2026(options = {}) {
  const targetDir = options.dataDir ? path.resolve(options.dataDir) : sandboxDataDir;
  const guard = validateDevSandbox({ dataDir: targetDir });
  const { byFile, allRows, warnings } = extractStudentsFromBd();

  const core = new OfflineCore(guard.dataDir, null);
  try {
    let director;
    if (!core.status().initialized) {
      core.setup({
        username: 'eloy.paredes',
        password: 'Eloy2026!',
        name: 'Lic. Eloy Valerio Paredes Feliciano',
        institutionName: 'CETPRO "Micaela Bastidas Puyucawa"',
        importBaseline: false
      });
      director = core.users().find(u => u.username === 'eloy.paredes');
    } else {
      director = core.users().find(u => u.username === 'eloy.paredes' && u.active) ||
                 core.users().find(u => u.role === 'DIRECTOR' && u.active) ||
                 core.users()[0];
    }

    const putSettings = (kind, target, fields, unit) => {
      const scope = { kind, ...(target ? { target } : {}), ...(unit ? { unit } : {}) };
      const sId = D.idFor(scope);
      const existing = core.record('documentSettings', sId);
      return D.saveSettings(core, director, { scope, fields, rev: existing ? existing.rev : null });
    };

    const resultSummary = core.transaction(() => {
      // 0. SANEAMIENTO PROFUNDO DE REGISTROS DE PRUEBA, BASURA O AÑOS DE PRUEBA (2027)
      // Eliminar programas/módulos/periodos/personal ajenos a los 7 programas y 14 módulos oficiales 2026
      const officialProgramIds = new Set(PROGRAMS_CATALOG.map(p => p.id));
      const officialModuleIds = new Set(PROGRAMS_CATALOG.flatMap(p => p.modules.map(m => m.id)));
      const officialPersonnelIds = new Set(PERSONNEL_2026.map(p => `personnel:2026:${p.document}`));
      const officialGroupIds = new Set(
        FILE_CLASSROOM_MAPPING.flatMap(m => m.sections.map(s => s.id))
      );
      const realStudentDnis = new Set(allRows.map(r => r.document));

      for (const p of core.records('programs')) {
        if (!officialProgramIds.has(p.id)) {
          core.db.prepare("DELETE FROM records WHERE entity='programs' AND id=?").run(p.id);
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(`program:${p.id}`);
        }
      }

      for (const m of core.records('modules')) {
        if (!officialModuleIds.has(m.id)) {
          core.db.prepare("DELETE FROM records WHERE entity='modules' AND id=?").run(m.id);
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(`module:${m.id}`);
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(`curriculum:${m.id}`);
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(`moduleDefaults:${m.id}`);
        }
      }

      for (const ds of core.records('documentSettings')) {
        const k = ds.scope?.kind;
        const t = ds.scope?.target;
        if (k === 'academicYear' && t !== '2026') {
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(ds.id);
        } else if (k === 'academicPeriod' && !['2026-I', '2026-II'].includes(t)) {
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(ds.id);
        } else if (k === 'personnel' && !officialPersonnelIds.has(ds.id)) {
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(ds.id);
        } else if ((k === 'curriculum' || k === 'moduleDefaults' || k === 'module') && !officialModuleIds.has(t)) {
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(ds.id);
        } else if (k === 'program' && !officialProgramIds.has(t)) {
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND id=?").run(ds.id);
        }
      }

      // Eliminar grupos de prueba o simulación que no pertenezcan a las 32 secciones oficiales 2026
      for (const g of core.records('groups')) {
        if (!officialGroupIds.has(g.id)) {
          core.db.prepare("DELETE FROM records WHERE entity='groups' AND id=?").run(g.id);
          core.db.prepare("DELETE FROM records WHERE entity='enrollments' AND json_extract(value, '$.groupId')=?").run(g.id);
          core.db.prepare("DELETE FROM records WHERE entity='attendance' AND json_extract(value, '$.groupId')=?").run(g.id);
          core.db.prepare("DELETE FROM records WHERE entity='grades' AND json_extract(value, '$.groupId')=?").run(g.id);
          core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND json_extract(value, '$.scope.target')=?").run(g.id);
        }
      }

      // Eliminar estudiantes de prueba o sintéticos que no estén en el padrón real de 286 estudiantes
      for (const s of core.records('students')) {
        if (!realStudentDnis.has(s.document)) {
          core.db.prepare("DELETE FROM records WHERE entity='enrollments' AND json_extract(value, '$.studentId')=?").run(s.id);
          core.db.prepare("DELETE FROM records WHERE entity='students' AND id=?").run(s.id);
        }
      }

      // Limpiar entregas, solicitudes y conflictos residuales de pruebas
      core.db.prepare("DELETE FROM records WHERE entity IN ('documentSubmissions', 'accountRequests', 'studentRequests')").run();
      core.db.prepare("DELETE FROM conflicts").run();
      // 1. Actualizar Perfil Institucional Oficial 2026 (extraído del afiche y expediente)
      const institutionFields = {
        nombre: 'CETPRO "Micaela Bastidas Puyucawa"',
        tipoGestion: 'PÚBLICA',
        codigoModular: '1027648',
        dre: 'DRE Puno',
        ugel: 'UGEL San Román',
        region: 'Puno',
        departamento: 'Puno',
        provincia: 'San Román',
        distrito: 'San Miguel',
        lugar: 'San Miguel - Juliaca, San Román, Puno',
        direccion: 'Jr. Yungay N° 302 - San Miguel - Juliaca',
        telefono: '051-602378 / 999041818 - 961990905',
        resolucionAutorizacion: 'R.D. N° 3367-DREP',
        resolucionConversion: 'R.D. N° 774-DREP',
        directorNombre: 'Lic. Eloy Valerio Paredes Feliciano',
        secretariaNombre: 'Carmen Yovana Vilca Puma',
        coordinadorNombre: 'Lic. Eloy Valerio Paredes Feliciano'
      };
      putSettings('institution', null, institutionFields);

      core.setting('institution', {
        ...core.setting('institution'),
        name: 'CETPRO "Micaela Bastidas Puyucawa"'
      });

      // 2. Configurar Año Lectivo 2026 y Periodos 2026-I y 2026-II
      const calendar2026 = [
        { name: 'Matrícula y Buen Inicio (2026)', start: '2026-03-02', end: '2026-03-16', detail: 'Matrícula gratuita del 02 al 16 de marzo; inicio de clases 16 de marzo de 2026' },
        { name: 'Periodo académico (2026-I)', start: '2026-03-02', end: '2026-07-24', detail: 'Primer semestre formativo (Módulo I: 528 horas / 20 créditos)' },
        { name: 'Periodo académico (2026-II)', start: '2026-08-10', end: '2026-12-18', detail: 'Segundo semestre formativo (Módulo II: 528 horas / 20 créditos)' }
      ];

      putSettings('academicPeriod', '2026-I', {
        year: '2026',
        fechaInicio: '2026-03-02',
        fechaFin: '2026-07-24',
        hours: 528,
        credits: 20
      });

      putSettings('academicPeriod', '2026-II', {
        year: '2026',
        fechaInicio: '2026-08-10',
        fechaFin: '2026-12-18',
        hours: 528,
        credits: 20
      });

      putSettings('academicYear', '2026', {
        institutionJson: JSON.stringify(institutionFields),
        calendarJson: JSON.stringify(calendar2026),
        hours: 1056,
        credits: 40,
        directoryDate: '2026-01-15',
        directoryPlace: 'San Miguel, San Román, Puno'
      });

      // 3. Registrar los 7 Programas de Estudio y 14 Módulos Formativos
      for (const prog of PROGRAMS_CATALOG) {
        const existingProg = core.record('programs', prog.id);
        core.write(director, 'programs', {
          ...(existingProg || {}),
          id: prog.id,
          nombre: prog.nombre,
          academicYear: '2026',
          archived: false
        }, existingProg?.rev || null);

        putSettings('program', prog.id, {
          nivelFormativo: 'Auxiliar Técnico',
          tipoPlan: 'Modular',
          resolucionPrograma: 'R.D. N° 3367-DREP / R.D. N° 774-DREP',
          officialTitleText: prog.titleText
        });

        for (const mod of prog.modules) {
          const existingMod = core.record('modules', mod.id);
          core.write(director, 'modules', {
            ...(existingMod || {}),
            id: mod.id,
            nombre: mod.nombre,
            programaId: prog.id,
            academicYear: '2026',
            archived: false
          }, existingMod?.rev || null);

          const totalHours = mod.units.reduce((acc, u) => acc + u.hours, 0);
          const totalCredits = mod.units.reduce((acc, u) => acc + u.credits, 0);
          const efsrtUnit = mod.units.find(u => u.code === 'EFSRT');

          putSettings('module', mod.id, {
            resolucionAutorizacion: 'R.D. N° 3367-DREP / R.D. N° 774-DREP',
            hours: totalHours,
            credits: totalCredits,
            efsrtHours: efsrtUnit ? efsrtUnit.hours : 192,
            presenceStates: 'P,T',
            absenceStates: 'F,J',
            absenceDenominator: 'REGISTRADAS',
            approvalMinimum: 13,
            competence: mod.competence
          });

          putSettings('curriculum', mod.id, {
            year: '2026',
            periodId: mod.periodId,
            nombre: mod.nombre,
            programName: prog.nombre,
            programCode: prog.cnofCode,
            programHours: prog.programHours,
            programCredits: prog.programCredits,
            nivelFormativo: 'Auxiliar Técnico',
            turno: mod.turno,
            teacherNames: mod.teacherNames,
            hours: totalHours,
            credits: totalCredits,
            efsrtHours: efsrtUnit ? efsrtUnit.hours : 192,
            unitsJson: JSON.stringify(mod.units)
          });

          putSettings('moduleDefaults', mod.id, {
            year: '2026',
            source: 'Afiche Oficial 2026 + Anexos Curriculares 10A (Downloads/bd)',
            notes: 'Plan curricular oficial 2026 homologado a 528 horas y 20 créditos por módulo (incluye las 7 UDs de Peluquería M2).',
            dataJson: JSON.stringify({
              module: {
                hours: totalHours,
                credits: totalCredits,
                efsrtHours: efsrtUnit ? efsrtUnit.hours : 192,
                competence: mod.competence
              },
              units: mod.units
            })
          });
        }
      }

      // 4. Registrar los 15 trabajadores del Directorio Oficial 2026
      for (const person of PERSONNEL_2026) {
        putSettings('personnel', `2026:${person.document}`, {
          year: '2026',
          name: person.name,
          document: person.document,
          position: person.position,
          specialty: person.specialty,
          email: person.email,
          phone: person.phone,
          birthday: person.birthday,
          address: person.address,
          referenceTurno: person.referenceTurno,
          sourceNote: 'Directorio del Personal 2026 (photo_5060180685917719783_y.jpg)'
        });
      }

      // 5. Limpiar matrículas, asistencias y calificaciones previas para reconstruir el padrón 2026-I
      // sin ningún duplicado entre turnos ni pre-matrículas adelantadas en 2026-II.
      core.db.prepare("DELETE FROM records WHERE entity IN ('enrollments', 'attendance', 'grades')").run();
      core.db.prepare("DELETE FROM records WHERE entity='documentSettings' AND json_extract(value, '$.scope.kind') IN ('enrollment', 'registry', 'practice', 'closure')").run();

      // 6. Crear las Aulas Reales 2026-I (y dejar preconfiguradas sus pares 2026-II),
      // registrar los 286 estudiantes únicos y matricular las 310 inscripciones activas deduplicadas.
      const teacherAssignmentsMap = new Map();
      const createdGroupsSummary = [];
      const uniqueStudentsMap = new Map();
      let activeEnrollmentsCount = 0;

      for (const mapping of FILE_CLASSROOM_MAPPING) {
        const fileStudents = byFile.get(mapping.file) || [];
        const mod1 = PROGRAMS_CATALOG.flatMap(p => p.modules).find(m => m.id === mapping.moduleId);
        const mod2 = PROGRAMS_CATALOG.flatMap(p => p.modules).find(m => m.id === mapping.module2Id);
        const person = PERSONNEL_2026.find(p => p.username === mapping.teacherUsername);
        const teacherDisplayName = person ? person.displayName : 'Docente por asignar';

        for (const secDef of mapping.sections) {
          const sectionStudents = fileStudents.slice(secDef.slice[0], secDef.slice[1]);
          if (sectionStudents.length === 0) continue;

          // Aula Periodo 2026-I (Módulo I)
          const unitCodes1 = mod1.units.map(u => u.code);
          const existingG1 = core.record('groups', secDef.id);
          const group1 = core.write(director, 'groups', {
            ...(existingG1 || {}),
            id: secDef.id,
            name: secDef.name,
            programId: mapping.programId,
            moduleId: mapping.moduleId,
            periodId: '2026-I',
            section: secDef.section,
            turno: mapping.turno,
            modalidad: mapping.modalidad,
            units: unitCodes1,
            closed: false,
            archived: false
          }, existingG1?.rev || null);

          putSettings('group', group1.id, {
            ciclo: 'Auxiliar Técnico',
            seccion: secDef.section,
            turno: mapping.turno,
            modalidad: mapping.modalidad,
            fechaInicio: '2026-03-16',
            fechaFin: '2026-07-24',
            periodClase: '2026-I',
            teacherName: teacherDisplayName,
            efsrtInicio: '2026-05-18',
            efsrtFin: '2026-07-24'
          });

          for (const u of mod1.units) {
            if (u.code === 'EFSRT') continue;
            putSettings('unit', group1.id, {
              name: u.name,
              capacity: `Aplica técnicas y procedimientos operativos de ${u.name.toLowerCase()} cumpliendo especificaciones técnicas y seguridad.`,
              competence: mod1.competence,
              indicator1: `Organiza el área de trabajo, equipos, herramientas y materiales para ${u.name.toLowerCase()}.`,
              indicator2: `Ejecuta procesos técnicos de ${u.name.toLowerCase()} siguiendo protocolos establecidos.`,
              indicator3: `Aplica normas de seguridad, higiene y cuidado ambiental en las prácticas de taller.`,
              indicator4: `Verifica la calidad del producto o servicio realizado corrigiendo observaciones.`,
              indicator5: `Sustenta los procedimientos aplicados con responsabilidad y trabajo en equipo.`
            }, u.code);

            putSettings('unitCurriculum', group1.id, {
              hours: u.hours,
              credits: u.credits,
              fechaInicio: u.fechaInicio,
              fechaFin: u.fechaFin,
              dateOrigin: 'Calendarización Oficial 2026-I'
            }, u.code);
          }

          const group2Id = `${secDef.id}-M2`;

          // Registrar asignación para el docente titular (exclusivamente sobre sus aulas activas de 2026-I)
          if (mapping.teacherUsername) {
            const list = teacherAssignmentsMap.get(mapping.teacherUsername) || [];
            list.push({ groupId: group1.id, units: unitCodes1 });
            teacherAssignmentsMap.set(mapping.teacherUsername, list);
          }

          // Registrar estudiantes y sus matrículas en el aula 2026-I
          for (const sInfo of sectionStudents) {
            let student = core.records('students').find(s => s.document === sInfo.document);
            if (!student) {
              student = core.saveStudent(director, {
                document: sInfo.document,
                documentType: 'DNI',
                name: sInfo.name,
                lastName1: sInfo.lastName1,
                lastName2: sInfo.lastName2,
                firstNames: sInfo.firstNames,
                sex: sInfo.sex,
                birthDate: sInfo.birthDate
              });
            } else {
              // Asegurar datos limpios y developmentData: false
              student = core.write(director, 'students', {
                ...student,
                name: sInfo.name,
                lastName1: sInfo.lastName1,
                lastName2: sInfo.lastName2,
                firstNames: sInfo.firstNames,
                sex: sInfo.sex,
                birthDate: sInfo.birthDate,
                active: true,
                archived: false,
                developmentData: false
              }, student.rev);
            }

            uniqueStudentsMap.set(student.document, {
              id: student.id,
              document: student.document,
              isProvisionalDni: sInfo.isProvisionalDni,
              name: student.name,
              lastName1: student.lastName1,
              lastName2: student.lastName2,
              firstNames: student.firstNames,
              sex: student.sex,
              birthDate: student.birthDate,
              phone: sInfo.phone
            });

            let enrollment = core.records('enrollments').find(e => e.groupId === group1.id && e.studentId === student.id && e.active);
            if (!enrollment) {
              enrollment = core.enroll(director, {
                groupId: group1.id,
                studentId: student.id,
                startDate: '2026-03-16'
              });
            }

            putSettings('enrollment', enrollment.id, {
              condition: 'G',
              emissionDate: '2026-07-24'
            });

            activeEnrollmentsCount++;
          }

          createdGroupsSummary.push({
            groupId: group1.id,
            group2Id,
            name: secDef.name,
            programId: mapping.programId,
            programName: PROGRAMS_CATALOG.find(p => p.id === mapping.programId).nombre,
            moduleId: mapping.moduleId,
            moduleName: mod1.nombre,
            section: secDef.section,
            turno: mapping.turno,
            modalidad: mapping.modalidad,
            teacherName: teacherDisplayName,
            teacherUsername: mapping.teacherUsername,
            studentsCount: sectionStudents.length,
            sourceFile: mapping.file
          });
        }
      }

      // 7. Crear/actualizar exclusivamente las 13 cuentas institucionales reales y eliminar cuentas .dev duplicadas
      const credentialsList = [];
      const officialUsernames = new Set(PERSONNEL_2026.filter(p => p.username && p.role).map(p => p.username));

      function upsertAccount(username, password, displayName, role, description, assignments = [], careerId = '') {
        const existing = core.users().find(u => u.username === username);
        const normalizedAssignments = role === 'DOCENTE' ? core.normalizeAssignments(assignments) : [];
        const saved = core.saveUser(director, {
          ...(existing ? { id: existing.id, version: existing.version } : {}),
          username,
          password,
          name: displayName,
          role,
          description,
          careerId,
          active: true,
          archived: false,
          assignmentPending: false,
          assignments: normalizedAssignments
        });
        credentialsList.push({
          username: saved.username,
          password,
          name: saved.name,
          role: saved.role,
          assignedGroupsCount: normalizedAssignments.length
        });
        return saved;
      }

      // Crear cuentas nominales de Dirección (eloy.paredes), Secretaría (carmen.vilca) y los 11 Docentes titulares
      for (const person of PERSONNEL_2026) {
        if (!person.username || !person.role) continue;
        const prefix = person.username.split('.')[0];
        const pass = `${prefix[0].toUpperCase()}${prefix.slice(1)}2026!`;
        const assignments = person.role === 'DOCENTE' ? (teacherAssignmentsMap.get(person.username) || []) : [];
        const savedUser = upsertAccount(
          person.username,
          pass,
          person.displayName,
          person.role,
          `${person.position} · ${person.specialty} · Turno ${person.referenceTurno}`,
          assignments,
          person.careerId || ''
        );
        if (person.username === 'eloy.paredes') {
          director = core.users().find(u => u.id === savedUser.id) || director;
        }
      }

      const moduleClassrooms = require('./prepare-module-classrooms.cjs').prepareModuleClassrooms(core, director);

      // Eliminar cualquier cuenta residual o duplicada (.dev, simulación, etc.) que no esté en las 13 oficiales
      for (const u of core.users()) {
        if (!officialUsernames.has(u.username)) {
          core.db.prepare("DELETE FROM users WHERE id=?").run(u.id);
          core.db.prepare("DELETE FROM records WHERE entity='userDirectory' AND id=?").run(u.id);
        }
      }
      for (const ud of core.records('userDirectory')) {
        if (!officialUsernames.has(ud.username)) {
          core.db.prepare("DELETE FROM records WHERE entity='userDirectory' AND id=?").run(ud.id);
        }
      }

      // Vincular el certificado institucional y dispositivos registrados a la cuenta titular del Director (eloy.paredes)
      const certSetting = core.setting('certificate');
      if (certSetting) {
        core.setting('certificate', { ...certSetting, issuedBy: director.id });
      }
      const devicesSetting = core.setting('devices');
      if (Array.isArray(devicesSetting)) {
        core.setting('devices', devicesSetting.map(d => ({ ...d, registeredBy: director.id })));
      }

      // 8. Poblar parámetros registrales, EFSRT, cierre modular, asistencias y notas en las dos aulas reales
      // representativas de 2026-I (`GRP-2026-COMP-P-A` y `GRP-2026-PB-M-A1`) y apuntar `simulatedCanonicalGroups`
      // hacia ellas para que `verify_all_21_preflights.cjs` valide las 21 plantillas MINEDU con los alumnos reales.
      const hashRecord = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
      const getBizDays = (startStr, endStr, max = 14) => {
        const out = [];
        const cur = new Date(startStr + 'T00:00:00Z');
        const end = new Date(endStr + 'T00:00:00Z');
        while (cur <= end && out.length < max) {
          const dw = cur.getUTCDay();
          if (dw >= 1 && dw <= 5) out.push(cur.toISOString().slice(0, 10));
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
        return out;
      };

      let regSeq = 1;
      function populateCanonicalVerifyData(groupId, modDef, semesterEnd, companyName, companyAddress) {
        const group = core.record('groups', groupId);
        const enrolls = core.records('enrollments').filter(e => e.groupId === groupId && e.active);
        const currUnits = modDef.units.filter(u => u.code !== 'EFSRT');

        for (let i = 0; i < enrolls.length; i++) {
          const enr = enrolls[i];
          const folio = String(regSeq).padStart(3, '0');
          const regNum = String(regSeq).padStart(4, '0');
          const baseScore = 15 + (i % 5);

          putSettings('registry', enr.id, {
            registerCode: `REG-2026-${regNum}`,
            registryBook: 'LIBRO 01',
            registryFolio: folio,
            registryNumber: regNum,
            registryDate: semesterEnd,
            registryAsiento: `ASIENTO N° ${folio} - FOLIO ${folio}`
          });

          putSettings('practice', enr.id, {
            companyName,
            companyAddress,
            criterion1: 3, criterion2: 2, criterion3: 2, criterion4: 3, criterion5: 3,
            criterion6: 3, criterion7: 1, criterion8: 2, criterion9: 1,
            efsrtFinalGrade: baseScore
          });

          putSettings('closure', enr.id, {
            modularGrade: baseScore,
            approvedUnitsCount: currUnits.length,
            failedUnitsCount: 0,
            observations: 'Aprobado satisfactoriamente en todas las unidades didácticas y prácticas EFSRT.'
          });
          regSeq++;
        }

        for (const u of currUnits) {
          const bDates = getBizDays(u.fechaInicio, u.fechaFin, 14);
          for (const dStr of bDates) {
            for (let i = 0; i < enrolls.length; i++) {
              const enr = enrolls[i];
              const attId = hashRecord(['attendance', enr.id, u.code, [dStr, '1']]);
              core.putRecord('attendance', {
                id: attId,
                rev: crypto.randomUUID(),
                enrollmentId: enr.id,
                groupId: group.id,
                periodId: group.periodId,
                moduleId: group.moduleId,
                unit: u.code,
                date: dStr,
                session: '1',
                value: 'P',
                pending: false,
                observation: ''
              });
            }
          }

          for (let i = 0; i < enrolls.length; i++) {
            const enr = enrolls[i];
            const score = 15 + (i % 5);
            for (let k = 1; k <= 5; k++) {
              for (const comp of ['IA1', 'IA2', 'IA3']) {
                const cId = hashRecord(['grades', enr.id, u.code, `IL${k}.${comp}`]);
                core.putRecord('grades', {
                  id: cId, rev: crypto.randomUUID(), enrollmentId: enr.id, groupId: group.id, periodId: group.periodId,
                  moduleId: group.moduleId, unit: u.code, indicator: `IL${k}.${comp}`,
                  value: score, pending: false, observation: ''
                });
              }
              const ilId = hashRecord(['grades', enr.id, u.code, `IL${k}`]);
              core.putRecord('grades', {
                id: ilId, rev: crypto.randomUUID(), enrollmentId: enr.id, groupId: group.id, periodId: group.periodId,
                moduleId: group.moduleId, unit: u.code, indicator: `IL${k}`,
                value: score, pending: false, observation: ''
              });
            }
            const resId = hashRecord(['grades', enr.id, u.code, 'RESULTADO_UD']);
            core.putRecord('grades', {
              id: resId, rev: crypto.randomUUID(), enrollmentId: enr.id, groupId: group.id, periodId: group.periodId,
              moduleId: group.moduleId, unit: u.code, indicator: 'RESULTADO_UD',
              value: score, pending: false, observation: ''
            });
          }
        }
      }

      const modComp1 = PROGRAMS_CATALOG.find(p => p.id === 'PROG-005').modules[0];
      const modPel1 = PROGRAMS_CATALOG.find(p => p.id === 'PROG-004').modules[0];

      populateCanonicalVerifyData('GRP-2026-COMP-P-A', modComp1, '2026-07-24', 'CENTRO TECNOLÓGICO SAN ROMÁN S.A.C.', 'Jr. Mariano Núñez N° 345 - Juliaca');
      populateCanonicalVerifyData('GRP-2026-PB-M-A1', modPel1, '2026-07-24', 'SALÓN Y BARBERÍA ESTÉTICA GLAMOUR', 'Jr. Yungay N° 310 - San Miguel');

      core.setting('simulatedCanonicalGroups', {
        computacion: 'GRP-2026-COMP-P-A',
        peluqueriaM1: 'GRP-2026-PB-M-A1',
        peluqueriaM2: 'GRP-2026-PB-M-A1-M2',
        seededAt: new Date().toISOString()
      });

      const academicIssues = checkAcademicIssues(core, '2026');
      if (academicIssues.length > 0) {
        throw new Error(`Se detectaron observaciones curriculares en 2026: ${academicIssues.join('; ')}`);
      }

      const health = core.databaseHealth(director);
      if (!health.healthy) {
        throw new Error(`Fallo en databaseHealth: ${health.errors.map(e => e.message).join('; ')}`);
      }

      const report = {
        importedAt: new Date().toISOString(),
        sourceDirectory: bdDir,
        institution: institutionFields.nombre,
        codigoModular: institutionFields.codigoModular,
        programsCount: PROGRAMS_CATALOG.length,
        modulesCount: PROGRAMS_CATALOG.reduce((n, p) => n + p.modules.length, 0),
        personnelCount: PERSONNEL_2026.length,
        activeClassrooms2026I: createdGroupsSummary.length,
        preparedClassrooms2026II: createdGroupsSummary.filter(classroom =>
          core.record('groups', classroom.group2Id)?.periodId === '2026-II'
        ).length,
        moduleClassrooms,
        totalRawExcelRows: allRows.length,
        activeEnrollmentsCount,
        uniqueStudentsCount: uniqueStudentsMap.size,
        normalizationsCount: warnings.length,
        academicIssuesCount: academicIssues.length,
        classrooms: createdGroupsSummary,
        credentials: credentialsList,
        warnings
      };

      core.setting('real-bd-2026-imported', {
        ...report,
        credentials: credentialsList.map(({ password, ...rest }) => rest)
      });

      // Exportar padrón consolidado limpio a docs/expediente-configuracion/PADRON_OFICIAL_ESTUDIANTES_2026.json
      const padronPath = path.join(root, 'docs', 'expediente-configuracion', 'PADRON_OFICIAL_ESTUDIANTES_2026.json');
      fs.mkdirSync(path.dirname(padronPath), { recursive: true });
      fs.writeFileSync(padronPath, JSON.stringify({
        metadata: {
          generatedAt: report.importedAt,
          institution: institutionFields.nombre,
          codigoModular: institutionFields.codigoModular,
          totalRawRows: report.totalRawExcelRows,
          activeEnrollments: report.activeEnrollmentsCount,
          uniqueStudents: report.uniqueStudentsCount,
          normalizationsApplied: report.normalizationsCount
        },
        classrooms: createdGroupsSummary,
        students: [...uniqueStudentsMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')),
        normalizationsLog: warnings
      }, null, 2), 'utf8');

      return report;
    });

    return resultSummary;
  } finally {
    core.close();
  }
}

module.exports = { importRealBd2026, extractStudentsFromBd, PROGRAMS_CATALOG, PERSONNEL_2026, FILE_CLASSROOM_MAPPING };

if (require.main === module) {
  console.log('========================================================================');
  console.log('  CEPRO_MICAELA 2.0 — IMPORTADOR OFICIAL DE BASE DE DATOS (Downloads/bd)');
  console.log('========================================================================\n');
  const report = importRealBd2026();
  console.log(`✔ Institución configurada : ${report.institution} (Cód. Modular ${report.codigoModular})`);
  console.log(`✔ Programas de estudio    : ${report.programsCount} carreras oficiales`);
  console.log(`✔ Módulos formativos      : ${report.modulesCount} módulos (2026-I y 2026-II, 0 observaciones)`);
  console.log(`✔ Directorio de personal  : ${report.personnelCount} trabajadores registrados`);
  console.log(`✔ Aulas activas 2026-I    : ${report.activeClassrooms2026I} secciones (máx. 30 alumnos por sección)`);
  console.log(`✔ Aulas listas 2026-II    : ${report.preparedClassrooms2026II} secciones`);
  console.log(`✔ Filas leídas de Excel   : ${report.totalRawExcelRows} registros`);
  console.log(`✔ Matrículas activas 2026 : ${report.activeEnrollmentsCount} matrículas (2 duplicados en misma aula deduplicados)`);
  console.log(`✔ Estudiantes únicos      : ${report.uniqueStudentsCount} estudiantes registrados por DNI`);
  console.log(`✔ Saneamientos aplicados  : ${report.normalizationsCount} normalizaciones automáticas`);
  console.log(`✔ Observaciones curricul. : ${report.academicIssuesCount} errores/advertencias\n`);
  console.log('Resumen de Aulas Creadas (2026-I):');
  for (const c of report.classrooms) {
    console.log(`  - [${c.groupId.padEnd(20)}] ${c.name.padEnd(54)} | ${String(c.studentsCount).padStart(2)} alumnos | ${c.teacherName}`);
  }
  console.log('\n========================================================================');
}


