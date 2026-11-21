'use strict';

const fs = require('fs');
const path = require('path');
const PDFLib = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const { rgb, degrees } = PDFLib;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const BANNER_DEMO_COLOR = rgb(0.55, 0.14, 0.14);
const BANNER_DRAFT_COLOR = rgb(0.62, 0.22, 0.08);
const TABLE_HEADER_FILL = rgb(0.95, 0.95, 0.95);
const TABLE_TOTAL_FILL = rgb(0.97, 0.97, 0.97);

const BASE_PDF_FILES = {
  'TMPL-22': 'BASE_01_RD_TITULO_2026.pdf',
  'TMPL-21': 'BASE_02_TITULO_AUXILIAR_2026.pdf',
  'TMPL-20': 'BASE_03B_CERTIFICADO_MODULAR_2026.pdf',
  'TMPL-23': 'BASE_04_CERTIFICADO_EGRESADO_2026.pdf',
  'TMPL-19': 'BASE_05_ACTA_EVALUACION_2026.pdf',
  'TMPL-01': 'BASE_06_NOMINA_MATRICULA_2026.pdf',
};

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre',
];

// Tabla estándar Code 39 (44 símbolos: 0-9, A-Z, -, ., espacio, $, /, +, %, *).
// Cada carácter son 9 elementos alternados barra/espacio (0=angosto 1x, 1=ancho 2.5x).
const CODE39_TABLE = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100',
};

let manifestCache = null;

function resolveRoot(root) {
  return root || path.resolve(__dirname, '..');
}

function loadManifest(root) {
  if (manifestCache) return manifestCache;
  const manifestPath = path.join(resolveRoot(root), 'app/data/pdf-manifests/official-2026-boxes.json');
  manifestCache = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifestCache;
}

const TEMPLATE_FONT_KEYS = {
  'TMPL-20': new Set(['arial', 'arialBold', 'arialBlack', 'calibri', 'calibriBold', 'arialNarrow']),
  'TMPL-21': new Set(['arial', 'arialBold', 'calibri', 'calibriBold', 'centurySchoolbookBold', 'bookosBold', 'cambriaBold']),
};

async function embedInstitutionalFonts(root, pdfDoc, templateId = null) {
  pdfDoc.registerFontkit(fontkit);
  const fontsDir = path.join(resolveRoot(root), 'app/operational/assets/fonts');
  const publicFontsDir = path.join(resolveRoot(root), 'public/fonts');
  const winFontsDir = process.platform === 'win32'
    ? path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')
    : '';
  const allowed = templateId && TEMPLATE_FONT_KEYS[templateId] ? TEMPLATE_FONT_KEYS[templateId] : null;

  const specs = [
    ['arial', path.join(fontsDir, 'arial.ttf'), 'arial.ttf'],
    ['arialBold', path.join(fontsDir, 'arialbd.ttf'), 'arialbd.ttf'],
    ['arialNarrow', path.join(fontsDir, 'ARIALN.TTF'), 'ARIALN.TTF'],
    ['arialNarrowBold', path.join(fontsDir, 'ARIALNB.TTF'), 'ARIALNB.TTF'],
    ['arialBlack', path.join(fontsDir, 'ariblk.ttf'), 'ariblk.ttf'],
    ['bookos', path.join(fontsDir, 'BOOKOS.TTF'), 'BOOKOS.TTF'],
    ['bookosBold', path.join(fontsDir, 'BOOKOSB.TTF'), 'BOOKOSB.TTF'],
    ['brush', path.join(fontsDir, 'BRUSHSCI.TTF'), 'BRUSHSCI.TTF'],
    ['calibri', path.join(fontsDir, 'calibri.ttf'), 'calibri.ttf'],
    ['calibriBold', path.join(fontsDir, 'calibrib.ttf'), 'calibrib.ttf'],
    ['calibriLight', path.join(fontsDir, 'calibril.ttf'), 'calibril.ttf'],
    ['cambriaBold', path.join(fontsDir, 'cambriab.ttf'), 'cambriab.ttf'],
    ['centurySchoolbook', path.join(fontsDir, 'CENSCBK.TTF'), 'CENSCBK.TTF'],
    ['centurySchoolbookBold', path.join(fontsDir, 'SCHLBKB.TTF'), 'SCHLBKB.TTF'],
    ['dmSerif', path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'), null],
    ['plusJakarta', path.join(fontsDir, 'PlusJakartaSans-Regular.ttf'), null],
    ['plusJakartaVar', path.join(publicFontsDir, 'PlusJakartaSans-Variable.ttf'), null],
  ];

  const fonts = {};
  for (const [key, filePath, winFile] of specs) {
    if (allowed && !allowed.has(key)) continue;
    let resolved = fs.existsSync(filePath) ? filePath : null;
    if (!resolved && winFile && winFontsDir) {
      const candidate = path.join(winFontsDir, winFile);
      if (fs.existsSync(candidate)) resolved = candidate;
    }
    if (!resolved) continue;
    fonts[key] = await pdfDoc.embedFont(fs.readFileSync(resolved), { subset: false });
  }
  const fallback = fonts.arial || fonts.calibri || Object.values(fonts)[0];
  fonts.regular = fonts.arial || fallback;
  fonts.bold = fonts.arialBold || fonts.calibriBold || fallback;
  return fonts;
}

function cleanText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function presentText(val) {
  const s = cleanText(val);
  if (!s || s === 'null' || s === 'undefined' || s === 'PENDIENTE') return '';
  return s;
}

function normalizeGlyphText(text, font) {
  const raw = String(text ?? '').replace(/[\r\n\t]+/g, ' ');
  if (!font || typeof font.encodeText !== 'function') return raw;
  const fallbackMap = {
    '“': '"', '”': '"', '‘': "'", '’': "'",
    '–': '-', '—': '-', '‐': '-', '−': '-',
    'º': '°', '°': 'o', '…': '...', '•': '-', '\u00A0': ' ',
  };
  let out = '';
  for (const ch of raw) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch (_) {
      const mapped = fallbackMap[ch];
      let replaced = false;
      if (mapped) {
        try { font.encodeText(mapped); out += mapped; replaced = true; } catch (_) {}
      }
      if (!replaced) {
        const ascii = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let ok = true;
        for (const a of ascii) {
          try { font.encodeText(a); } catch (_) { ok = false; break; }
        }
        out += ok ? ascii : ' ';
      }
    }
  }
  return out;
}

function safeWidth(font, text, size) {
  return font.widthOfTextAtSize(normalizeGlyphText(text, font), size);
}

function fontMetricsRatio(font) {
  try {
    const h = font.heightAtSize(10, { descender: true });
    if (h > 0) return h / 10;
  } catch (_) {}
  return 1.15;
}

function truncateToWidth(text, font, size, maxWidth) {
  const safe = normalizeGlyphText(text, font);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  const ell = '...';
  let lo = 0;
  let hi = safe.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const cand = safe.slice(0, mid) + ell;
    if (font.widthOfTextAtSize(cand, size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? safe.slice(0, lo) + ell : safe.slice(0, 1);
}

function drawFittedSingleLine(page, text, box, font, opts = {}) {
  const safe0 = normalizeGlyphText(cleanText(text), font);
  if (!safe0) return 0;
  const {
    maxSize = 11,
    minSize = 5,
    align = 'left',
    valign = 'middle',
    paddingX = 2,
    paddingY = 1,
    color = BLACK,
    baselineY = null,
    underline = false,
    exactSize = false,
  } = opts;

  const availW = Math.max(4, box.w - paddingX * 2);
  const availH = Math.max(4, box.h - paddingY * 2);
  const ratio = fontMetricsRatio(font);
  let size;
  if (exactSize || typeof baselineY === 'number') {
    size = maxSize;
  } else {
    size = Math.min(maxSize, availH / ratio);
    size = Math.max(minSize, Math.floor(size * 4) / 4);
  }

  while (size > minSize && font.widthOfTextAtSize(safe0, size) > availW) {
    size = Math.max(minSize, +(size - 0.25).toFixed(2));
  }

  let drawStr = safe0;
  if (font.widthOfTextAtSize(drawStr, size) > availW) {
    while (size > 3.75 && font.widthOfTextAtSize(drawStr, size) > availW) {
      size = +(size - 0.25).toFixed(2);
    }
    if (font.widthOfTextAtSize(drawStr, size) > availW) {
      drawStr = truncateToWidth(drawStr, font, size, availW);
    }
  }

  const tw = font.widthOfTextAtSize(drawStr, size);
  let x = box.x + paddingX;
  if (align === 'center') x = box.x + (box.w - tw) / 2;
  else if (align === 'right') x = box.x + box.w - paddingX - tw;

  let y;
  if (typeof baselineY === 'number') {
    y = baselineY;
  } else if (valign === 'top') {
    y = box.y + box.h - paddingY - size * 0.85;
  } else if (valign === 'bottom') {
    y = box.y + paddingY + size * 0.2;
  } else {
    y = box.y + (box.h - size * 0.72) / 2;
  }

  page.drawText(drawStr, { x, y, size, font, color });
  if (underline) {
    page.drawLine({
      start: { x, y: y - 2 },
      end: { x: x + tw, y: y - 2 },
      thickness: 0.75,
      color,
    });
  }
  return size;
}

function wrapParagraphWords(text, font, size, maxWidth) {
  const words = normalizeGlyphText(text, font).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else if (line) {
      lines.push(line);
      if (font.widthOfTextAtSize(w, size) <= maxWidth) {
        line = w;
      } else {
        line = '';
        let chunk = '';
        for (const ch of w) {
          if (font.widthOfTextAtSize(chunk + ch, size) <= maxWidth) chunk += ch;
          else { if (chunk) lines.push(chunk); chunk = ch; }
        }
        line = chunk;
      }
    } else {
      let chunk = '';
      for (const ch of w) {
        if (font.widthOfTextAtSize(chunk + ch, size) <= maxWidth) chunk += ch;
        else { if (chunk) lines.push(chunk); chunk = ch; }
      }
      line = chunk;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedBlock(page, text, box, font, opts = {}) {
  const clean = cleanText(text);
  if (!clean) return 0;
  const {
    maxSize = 9,
    minSize = 4.5,
    align = 'left',
    valign = 'middle',
    paddingX = 2,
    paddingY = 2,
    lineHeight = 1.2,
    color = BLACK,
  } = opts;

  const availW = Math.max(6, box.w - paddingX * 2);
  const availH = Math.max(6, box.h - paddingY * 2);
  let chosenSize = minSize;
  let chosenLines = [];

  for (let s = maxSize; s >= minSize; s = +(s - 0.25).toFixed(2)) {
    const lines = wrapParagraphWords(clean, font, s, availW);
    const totalH = lines.length * s * lineHeight;
    chosenSize = s;
    chosenLines = lines;
    if (totalH <= availH) break;
  }

  const step = chosenSize * lineHeight;
  const maxLines = Math.max(1, Math.floor(availH / step));
  if (chosenLines.length > maxLines) {
    chosenLines = chosenLines.slice(0, maxLines);
    chosenLines[maxLines - 1] = truncateToWidth(chosenLines[maxLines - 1], font, chosenSize, availW);
  }

  const blockH = chosenLines.length * step;
  let topY;
  if (valign === 'top') topY = box.y + box.h - paddingY - chosenSize * 0.85;
  else if (valign === 'bottom') topY = box.y + paddingY + blockH - chosenSize * 0.85;
  else topY = box.y + box.h - (box.h - blockH) / 2 - chosenSize * 0.85;

  for (let i = 0; i < chosenLines.length; i++) {
    const ln = chosenLines[i];
    const lw = font.widthOfTextAtSize(ln, chosenSize);
    let x = box.x + paddingX;
    if (align === 'center') x = box.x + (box.w - lw) / 2;
    else if (align === 'right') x = box.x + box.w - paddingX - lw;
    const y = topY - i * step;
    page.drawText(ln, { x, y, size: chosenSize, font, color });
  }
  return topY - chosenLines.length * step;
}

// Dibuja párrafos justificados con soporte para tramos con fuentes mezcladas [{ text, font }].
function drawJustifiedParagraphs(page, paragraphs, box, defaultFont, opts = {}) {
  const {
    size = 10,
    lineHeight = 1.32,
    paragraphGap = 5,
    align = 'justify',
    color = BLACK,
  } = opts;

  let cursorY = box.y + box.h - size;
  const step = size * lineHeight;

  for (const para of paragraphs) {
    const segments = Array.isArray(para) ? para : [{ text: String(para || ''), font: defaultFont }];
    const tokens = [];
    for (const seg of segments) {
      const f = seg.font || defaultFont;
      const parts = normalizeGlyphText(cleanText(seg.text), f).split(/\s+/).filter(Boolean);
      for (const word of parts) {
        const w = f.widthOfTextAtSize(word, size);
        // Pegar puntuación inicial de cierre/separación al token precedente sin espacio intermedio
        if (/^[.,;:!?)\]}”’»]+$/.test(word) && tokens.length > 0) {
          const prev = tokens[tokens.length - 1];
          prev.parts.push({ word, font: f, width: w });
          prev.width += w;
        } else {
          tokens.push({ parts: [{ word, font: f, width: w }], width: w });
        }
      }
    }
    if (!tokens.length) continue;

    const spaceW = defaultFont.widthOfTextAtSize(' ', size);
    const lines = [];
    let current = [];
    let currentW = 0;

    for (const tok of tokens) {
      const addW = current.length ? spaceW + tok.width : tok.width;
      if (current.length && currentW + addW > box.w) {
        lines.push(current);
        current = [tok];
        currentW = tok.width;
      } else {
        current.push(tok);
        currentW += addW;
      }
    }
    if (current.length) lines.push(current);

    for (let li = 0; li < lines.length; li++) {
      if (cursorY < box.y) break;
      const lineToks = lines[li];
      const isLast = li === lines.length - 1;
      const wordsW = lineToks.reduce((acc, t) => acc + t.width, 0);
      const gaps = lineToks.length - 1;
      let gapW = spaceW;
      if (align === 'justify' && !isLast && gaps > 0) {
        const extra = (box.w - wordsW) / gaps;
        if (extra <= spaceW * 3.2) gapW = extra;
      }
      let x = box.x;
      if (align === 'center') x = box.x + (box.w - (wordsW + gaps * spaceW)) / 2;
      else if (align === 'right') x = box.x + box.w - (wordsW + gaps * spaceW);

      for (const tok of lineToks) {
        let tx = x;
        for (const sub of tok.parts) {
          page.drawText(sub.word, { x: tx, y: cursorY, size, font: sub.font, color });
          tx += sub.width;
        }
        x += tok.width + gapW;
      }
      cursorY -= step;
    }
    cursorY -= paragraphGap;
  }
  return cursorY;
}

function drawRotatedHeaderText(page, text, box, font, opts = {}) {
  const clean = cleanText(text);
  if (!clean) return;
  const { maxSize = 6.2, minSize = 4.2, paddingY = 3, color = BLACK } = opts;
  const availLen = Math.max(10, box.h - paddingY * 2);
  let size = maxSize;
  let lines = wrapParagraphWords(clean, font, size, availLen);

  while ((lines.length > 2 || lines.length * size * 1.1 > box.w - 1) && size > minSize) {
    size = +(size - 0.25).toFixed(2);
    lines = wrapParagraphWords(clean, font, size, availLen);
  }
  if (lines.length > 2) {
    lines = [lines[0], truncateToWidth(lines.slice(1).join(' '), font, size, availLen)];
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const xOffset = lines.length === 1
      ? box.w / 2 + size * 0.3
      : (i === 0 ? box.w * 0.36 + size * 0.2 : box.w * 0.8 + size * 0.2);
    page.drawText(ln, {
      x: Math.min(box.x + box.w - 1, box.x + xOffset),
      y: box.y + paddingY,
      size,
      font,
      color,
      rotate: degrees(90),
    });
  }
}

function drawCode39Barcode(page, code, box, fonts = {}) {
  const raw = cleanText(code).toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '');
  const payload = raw || 'PENDIENTE';
  const encoded = `*${payload}*`;

  const quietX = Math.max(5, Math.min(12, box.w * 0.04));
  const labelH = Math.min(9.5, Math.max(7, box.h * 0.28));
  const availW = Math.max(20, box.w - quietX * 2);
  const ratio = 2.5;
  const unitsPerChar = 6 + 3 * ratio; // 13.5 unidades por carácter
  const totalUnits = encoded.length * unitsPerChar + (encoded.length - 1) * 1;
  const narrow = availW / totalUnits;
  const wide = narrow * ratio;

  const barY = box.y + labelH + 1;
  const barH = Math.max(8, box.h - labelH - 2.5);
  let x = box.x + quietX;

  for (let i = 0; i < encoded.length; i++) {
    const pattern = CODE39_TABLE[encoded[i]] || CODE39_TABLE['-'];
    for (let j = 0; j < 9; j++) {
      const w = pattern[j] === '1' ? wide : narrow;
      if (j % 2 === 0) {
        page.drawRectangle({ x, y: barY, width: w, height: barH, color: BLACK });
      }
      x += w;
    }
    x += narrow; // brecha inter-carácter
  }

  const labelFont = typeof fonts?.widthOfTextAtSize === 'function'
    ? fonts
    : (fonts?.arial || fonts?.calibri || fonts?.regular || fonts?.bold || null);
  if (labelFont) {
    drawFittedSingleLine(page, encoded, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: labelH,
    }, labelFont, { maxSize: 7.2, minSize: 4.5, align: 'center', valign: 'bottom', paddingX: 2, paddingY: 0.5 });
  }
}

function applyStatusBanner(page, doc, fonts) {
  const isDemo = Boolean(doc?.demoMode || doc?.demoFill);
  const isDraft = !isDemo && Boolean(doc?.preflight && !doc.preflight.complete);
  if (!isDemo && !isDraft) return;
  const label = isDemo
    ? 'DOCUMENTO EN MODO DEMOSTRACIÓN — SIN VALIDEZ OFICIAL'
    : 'BORRADOR — PENDIENTE DE DATOS OBLIGATORIOS';
  const { width, height } = page.getSize();
  const font = fonts.arialBold || fonts.bold || fonts.regular;
  drawFittedSingleLine(
    page,
    label,
    { x: 18, y: height - 14, w: width - 36, h: 11 },
    font,
    { maxSize: 7, minSize: 5, align: 'center', valign: 'middle', color: isDemo ? BANNER_DEMO_COLOR : BANNER_DRAFT_COLOR }
  );
}

function parseDateParts(rawDate, fallbackIso) {
  const txt = presentText(rawDate) || presentText(fallbackIso) || new Date().toISOString().slice(0, 10);
  let y = 2026;
  let m = 1;
  let d = 1;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(txt);
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(txt);
  if (iso) {
    y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]);
  } else if (dmy) {
    d = Number(dmy[1]); m = Number(dmy[2]); y = Number(dmy[3]);
  } else {
    const dt = new Date(txt);
    if (!Number.isNaN(dt.getTime())) {
      y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
    }
  }
  const monthIdx = Math.max(0, Math.min(11, m - 1));
  const monthLower = SPANISH_MONTHS[monthIdx];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const yyyy = String(y);
  return {
    dayNum: d,
    dd,
    mm,
    yyyy,
    monthLower,
    monthUpper: monthLower.toUpperCase(),
    dmy: `${dd}/${mm}/${yyyy}`,
    longDayMonth: `${d} de ${monthLower}`,
  };
}

function emissionFallbackDate(doc) {
  return doc?.parameters?.emissionDate
    || doc?.group?.fechaFin
    || doc?.module?.fechaFin
    || `${new Date().getFullYear()}-12-18`;
}

function normalizeSex(raw) {
  const s = cleanText(raw).toUpperCase();
  if (s === 'F' || s === 'FEMENINO' || s === 'MUJER') return 'M';
  if (s === 'HOMBRE' || s === 'MASCULINO') return 'H';
  return s;
}

function formatZero2(val) {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (!Number.isFinite(n)) return cleanText(val);
  return String(Math.round(n)).padStart(2, '0');
}

function pickStudentGrade(grades, enrollmentId, unitCode) {
  if (!Array.isArray(grades)) return null;
  const hit = grades.find(r => r.enrollmentId === enrollmentId && r.unit === unitCode && r.indicator === 'RESULTADO_UD');
  if (hit && hit.value !== null && hit.value !== undefined && hit.value !== '') {
    const n = Number(hit.value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function renderTmpl22(pdfDoc, doc, fonts) {
  const page = pdfDoc.getPages()[0];
  const left = 70.9;
  const width = 595.32 - left - 70.8; // 453.62pt
  const fReg = fonts.bookos || fonts.arial;
  const fBold = fonts.bookosBold || fonts.arialBold;
  const fArial = fonts.arial || fReg;
  const fArialB = fonts.arialBold || fBold;

  const p = doc.parameters || {};
  const traj = doc.trajectory || {};
  const progName = presentText(doc.program?.nombre || doc.program?.name || traj.programName) || 'PROGRAMA DE ESTUDIOS';
  const studentName = presentText(doc.students?.[0]?.student?.name) || 'ESTUDIANTE POR CONFIRMAR';
  const registerCode = presentText(p.registerCode) || 'PENDIENTE';
  const resNumber = presentText(p.resolutionNumber) || '001-2026-D-CETPRO-MB';
  const expNumber = presentText(p.expedienteNumber || p.registryNumber || p.registerCode) || '001-2026';
  const emDate = parseDateParts(p.emissionDate, emissionFallbackDate(doc));
  const directorName = presentText(doc.institution?.directorNombre) || 'Prof. Eloy Valerio PAREDES FELICIANO';
  const progRes = presentText(doc.program?.resolucionPrograma) || 'RD N° 2053-2025-DUGEL-SR';
  const normAuth = /2053-2025/i.test(progRes) ? progRes : `${progRes} y RD N° 2053-2025-DUGEL-SR`;

  const m1 = traj.module1 || {};
  const m2 = traj.module2 || {};
  const m1Name = presentText(m1.moduleName) || 'Módulo I';
  const m2Name = presentText(m2.moduleName) || 'Módulo II';
  const h1 = Number(m1.hours) || 0;
  const c1 = Number(m1.credits) || 0;
  const h2 = Number(m2.hours) || 0;
  const c2 = Number(m2.credits) || 0;
  const totHours = Number(traj.totalHours) || (h1 + h2);
  const totCredits = Number(traj.totalCredits) || (c1 + c2);

  let y = 720;
  drawFittedSingleLine(
    page,
    `RESOLUCIÓN DIRECTORAL N.º ${resNumber}`,
    { x: left, y: y - 16, w: width, h: 16 },
    fBold,
    { maxSize: 11.5, minSize: 8.5, align: 'center', underline: true }
  );
  y -= 28;

  drawFittedSingleLine(
    page,
    `San Miguel, ${emDate.dd} de ${emDate.monthLower} del ${emDate.yyyy}`,
    { x: left, y: y - 14, w: width, h: 14 },
    fReg,
    { maxSize: 9.8, minSize: 7.5, align: 'right' }
  );
  y -= 22;

  y = drawJustifiedParagraphs(page, [
    [
      { text: 'Visto el expediente N° ', font: fReg },
      { text: expNumber, font: fBold },
      { text: ' sobre expedición y registro de título de Auxiliar Técnico.', font: fReg },
    ],
  ], { x: left, y: y - 40, w: width, h: 40 }, fReg, { size: 9.8, lineHeight: 1.28, paragraphGap: 3 });

  drawFittedSingleLine(page, 'CONSIDERANDO:', { x: left, y: y - 14, w: width, h: 14 }, fBold, { maxSize: 10, minSize: 8 });
  y -= 14;

  y = drawJustifiedParagraphs(page, [
    [
      { text: 'Que, el(la) egresado(a) ', font: fReg },
      { text: studentName, font: fBold },
      { text: ' ha culminado y aprobado satisfactoriamente los módulos formativos del Programa de Estudios de ', font: fReg },
      { text: progName, font: fBold },
      { text: ', quedando inscrito con Código de Registro Institucional ', font: fReg },
      { text: registerCode, font: fBold },
      { text: ', conforme al siguiente plan modular culminado:', font: fReg },
    ],
  ], { x: left, y: y - 90, w: width, h: 90 }, fReg, { size: 9.5, lineHeight: 1.26, paragraphGap: 4 });

  // Tabla centrada 4 filas (Cabecera + 01 + 02 + TOTAL)
  const tblW = 420;
  const tblX = left + (width - tblW) / 2;
  const colWidths = [32, 260, 64, 64];
  const rowH = 19;
  const rowsData = [
    { cells: ['N°', 'MÓDULOS', 'HORAS', 'CRÉDITOS'], header: true },
    { cells: ['01', m1Name, String(h1), String(c1)], header: false },
    { cells: ['02', m2Name, String(h2), String(c2)], header: false },
    { cells: ['', 'TOTAL', String(totHours), String(totCredits)], total: true },
  ];

  y -= 4;
  for (const r of rowsData) {
    const rowY = y - rowH;
    let cx = tblX;
    for (let c = 0; c < 4; c++) {
      const cw = colWidths[c];
      const fill = r.header ? TABLE_HEADER_FILL : (r.total ? TABLE_TOTAL_FILL : undefined);
      page.drawRectangle({
        x: cx,
        y: rowY,
        width: cw,
        height: rowH,
        borderWidth: 0.6,
        borderColor: BLACK,
        ...(fill ? { color: fill } : {}),
      });
      const fontCell = (r.header || r.total) ? fArialB : fArial;
      const align = c === 1 && !r.header && !r.total ? 'left' : 'center';
      drawFittedSingleLine(
        page,
        r.cells[c],
        { x: cx, y: rowY, w: cw, h: rowH },
        fontCell,
        { maxSize: 8.5, minSize: 5.5, align, paddingX: 4 }
      );
      cx += cw;
    }
    y = rowY;
  }
  y -= 10;

  y = drawJustifiedParagraphs(page, [
    [
      { text: 'De conformidad con la Ley N.º 28044 Ley General de Educación, el D.S. N.º 011-2012-ED, la RVM N° 178-2018-MINEDU, el D.S. N.º 004-2019-MINEDU, la RVM N° 188-2020-MINEDU y la ', font: fReg },
      { text: normAuth, font: fBold },
      { text: ' que autoriza el programa de estudios;', font: fReg },
    ],
  ], { x: left, y: y - 72, w: width, h: 72 }, fReg, { size: 9.4, lineHeight: 1.25, paragraphGap: 5 });

  drawFittedSingleLine(page, 'SE RESUELVE:', { x: left, y: y - 14, w: width, h: 14 }, fBold, { maxSize: 10, minSize: 8 });
  y -= 14;

  y = drawJustifiedParagraphs(page, [
    [
      { text: 'Artículo 1°.- AUTORIZAR,', font: fBold },
      { text: ' la Expedición y Registro de Título de Auxiliar Técnico, en el Programa de Estudio de ', font: fReg },
      { text: progName, font: fBold },
      { text: ' a don (ña) ', font: fReg },
      { text: studentName, font: fBold },
      { text: '; el mismo queda REGISTRADO con: Código de Registro Institucional ', font: fReg },
      { text: registerCode + '.', font: fBold },
    ],
    [
      { text: 'Artículo 2°.- REMITIR', font: fBold },
      { text: ' la presente Resolución, a la Unidad de Gestión Educativa Local San Román para el registro correspondiente.', font: fReg },
    ],
  ], { x: left, y: y - 115, w: width, h: 115 }, fReg, { size: 9.5, lineHeight: 1.26, paragraphGap: 5 });

  const sigTop = Math.min(y - 6, 155);
  drawFittedSingleLine(page, 'REGÍSTRESE Y COMUNÍQUESE:', { x: left, y: sigTop - 12, w: width, h: 12 }, fBold, { maxSize: 9.5, minSize: 7.5, align: 'left' });

  const sigCenterW = 240;
  const sigBoxX = left + (width - sigCenterW) / 2;
  const lineY = Math.max(92, sigTop - 52);
  page.drawLine({ start: { x: sigBoxX + 20, y: lineY }, end: { x: sigBoxX + sigCenterW - 20, y: lineY }, thickness: 0.75, color: BLACK });
  drawFittedSingleLine(page, directorName, { x: sigBoxX, y: lineY - 13, w: sigCenterW, h: 12 }, fBold, { maxSize: 8.8, minSize: 6.5, align: 'center' });
  drawFittedSingleLine(page, 'DIRECTOR', { x: sigBoxX, y: lineY - 24, w: sigCenterW, h: 11 }, fBold, { maxSize: 8.5, minSize: 6.5, align: 'center' });
  drawFittedSingleLine(page, 'CETPRO “MICAELA BASTIDAS”', { x: sigBoxX, y: lineY - 35, w: sigCenterW, h: 11 }, fReg, { maxSize: 8.5, minSize: 6.5, align: 'center' });

  drawFittedSingleLine(page, 'EVPF/ D', { x: left, y: 48, w: 120, h: 10 }, fArialB, { maxSize: 7.5, minSize: 6 });
  drawFittedSingleLine(page, 'DCETPRO-MB', { x: left, y: 38, w: 120, h: 10 }, fArial, { maxSize: 7.5, minSize: 6 });
}

async function renderTmpl21(pdfDoc, doc, fonts, manifest) {
  const [page1, page2] = pdfDoc.getPages();
  const anv = (manifest.bases && manifest.bases.TMPL_21 && manifest.bases.TMPL_21.anverso) || {};
  const rev = (manifest.bases && manifest.bases.TMPL_21 && manifest.bases.TMPL_21.reverso) || {};
  const p = doc.parameters || {};

  const studentName = presentText(p.tituladoName || doc.students?.[0]?.student?.name) || 'ESTUDIANTE POR CONFIRMAR';
  const rawProg = presentText(doc.program?.nombre || doc.program?.name) || 'PROGRAMA DE ESTUDIOS';
  const rawTitle = presentText(p.officialTitleText || doc.program?.officialTitleText);
  const fullTitle = rawTitle
    ? (/AUXILIAR\s+T[ÉE]CNICO/i.test(rawTitle) ? rawTitle.toUpperCase() : `AUXILIAR TÉCNICO EN ${rawTitle.toUpperCase()}`)
    : `AUXILIAR TÉCNICO EN ${rawProg.toUpperCase()}`;
  const referenceResolution = presentText(
    p.referenceResolution || doc.program?.resolucionPrograma || doc.module?.resolucionAutorizacion
  );
  const registerCode = presentText(p.registerCode);
  const ugelCode = presentText(p.ugelCode);
  const emDate = parseDateParts(p.emissionDate, emissionFallbackDate(doc));
  const dateLineText = `Dado en San Miguel, a los ${emDate.dayNum} días del mes de ${emDate.monthLower} del ${emDate.yyyy}.`;

  const fCalibri = fonts.calibri || fonts.arial || fonts.regular;
  const fCalibriB = fonts.calibriBold || fonts.arialBold || fonts.bold;
  const fArialB = fonts.arialBold || fonts.calibriBold || fonts.bold;
  const fScholaB = fonts.centurySchoolbookBold || fonts.bookosBold || fonts.cambriaBold || fArialB;

  // A — Portada (posición vertical rotada 90°, costado derecho del recuadro de fotografía)
  if (registerCode) {
    const vc = anv.verticalCodeA || { x: 734.52, centerY: 492.38, boxH: 113.76, size: 7.2 };
    const safeVert = normalizeGlyphText(cleanText(registerCode), fCalibri);
    let vSize = vc.size || 7.2;
    const maxVertLen = vc.boxH || 113.76;
    while (vSize > 4.5 && fCalibri.widthOfTextAtSize(safeVert, vSize) > maxVertLen) {
      vSize = Math.max(4.5, +(vSize - 0.25).toFixed(2));
    }
    const tw = fCalibri.widthOfTextAtSize(safeVert, vSize);
    if(tw>maxVertLen)throw new Error('El código institucional excede el espacio de impresión del título.');
    page1.drawText(safeVert, {
      x: vc.x ?? 734.52,
      y: (vc.centerY ?? 492.38) - tw / 2,
      size: vSize,
      font: fCalibri,
      color: BLACK,
      rotate: degrees(90),
    });
  }

  // C — Resolución de referencia (debajo del nombre del CETPRO)
  const refBox = anv.referenceResolutionC || { x: 64.92, y: 400, w: 646, h: 14, baselineY: 405.36, size: 10 };
  drawFittedSingleLine(page1, referenceResolution, { ...refBox, h: Math.max(refBox.h || 14, 18) }, fArialB, {
    maxSize: refBox.size || 10, minSize: 6.5, align: 'center', baselineY: refBox.baselineY ?? 405.36,
  });

  // D — [Nombres y APELLIDOS DEL TITULADO] en Century Schoolbook Negrita
  const nameBox = anv.studentName || { x: 64.92, y: 325, w: 573, h: 28, baselineY: 337.2, size: 21.64 };
  drawFittedSingleLine(page1, studentName, { ...nameBox, h: Math.max(nameBox.h || 28, 34) }, fScholaB, {
    maxSize: nameBox.size || 21.64, minSize: 10, align: 'center', baselineY: nameBox.baselineY ?? 337.2,
  });

  // E — AUXILIAR TÉCNICO EN [PROGRAMA DE ESTUDIOS] en Calibri Negrita
  const progBox = anv.titleProgram || { x: 95.84, y: 254, w: 630, h: 28, baselineY: 265.2, size: 21.64 };
  drawFittedSingleLine(page1, fullTitle, { ...progBox, h: Math.max(progBox.h || 28, 34) }, fCalibriB, {
    maxSize: progBox.size || 21.64, minSize: 9, align: 'center', baselineY: progBox.baselineY ?? 265.2,
  });

  // F — Fecha de emisión en Calibri alineada a celda H19 (x=369.48)
  const dateBox = anv.dateLine || { x: 369.48, y: 196, w: 356, h: 18, baselineY: 203.16, size: 14.43 };
  drawFittedSingleLine(page1, dateLineText, { ...dateBox, h: Math.max(dateBox.h || 18, 24) }, fCalibri, {
    maxSize: dateBox.size || 14.43, minSize: 8.5, align: 'left', baselineY: dateBox.baselineY ?? 203.16, paddingX: 0,
  });

  // Director dinámico (si se modificó en Configuración o en la emisión respecto al preimpreso)
  const directorText = presentText(p.directorName || doc.institution?.directorNombre);
  if (directorText) {
    const normDirector = directorText
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/^(profesor|prof|lic)\.?\s*/i, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    if (normDirector && normDirector !== 'eloyvalerioparedesfeliciano') {
      const dirBoxes = [
        { page: page1, cover: { x: 250, y: 116.5, w: 226, h: 12 }, baselineY: 118.91, size: 9 },
        { page: page2, cover: { x: 258, y: 162.5, w: 228, h: 12 }, baselineY: 165.00, size: 9.2 },
      ];
      for (const { page, cover, baselineY, size } of dirBoxes) {
        page.drawRectangle({ x: cover.x, y: cover.y, width: cover.w, height: cover.h, color: WHITE });
        drawFittedSingleLine(page, directorText, { ...cover, h: 16 }, fCalibriB, {
          maxSize: size, minSize: 6.5, align: 'center', baselineY,
        });
      }
    }
  }

  // Reverso: A (Registro Institucional), B (Registro UGEL) y A (pie izquierdo literal sin código de barras)
  const regBox = rev.registerCodeBox || { x: 276.48, y: 348, w: 220, h: 18, baselineY: 354, size: 10.1 };
  const ugelBox = rev.ugelCodeBox || { x: 276.48, y: 288, w: 220, h: 18, baselineY: 294.24, size: 10.1 };
  const footBox = rev.footerCodeBox || { x: 93.12, y: 98, w: 180, h: 10, baselineY: 101.88, size: 5.53 };

  if (registerCode) {
    drawFittedSingleLine(page2, registerCode, { ...regBox, h: Math.max(regBox.h || 18, 20) }, fCalibri, {
      maxSize: regBox.size || 10.1, minSize: 7, align: 'left', baselineY: regBox.baselineY ?? 354, paddingX: 0,
    });
  }
  if (ugelCode) {
    drawFittedSingleLine(page2, ugelCode, { ...ugelBox, h: Math.max(ugelBox.h || 18, 20) }, fCalibri, {
      maxSize: ugelBox.size || 10.1, minSize: 7, align: 'left', baselineY: ugelBox.baselineY ?? 294.24, paddingX: 0,
    });
  }
  if (registerCode) {
    drawFittedSingleLine(page2, registerCode, footBox, fCalibri, {
      maxSize: footBox.size || 5.53, minSize: 4.5, align: 'left', baselineY: footBox.baselineY ?? 101.88, paddingX: 0,
    });
  }
}

function drawRotatedWrappedBlock(page, text, box, font, opts = {}) {
  const clean = cleanText(text);
  if (!clean) return;
  const {
    maxSize = 9.5,
    minSize = 4.8,
    align = 'center',
    paddingX = 4,
    paddingY = 6,
    lineHeight = 1.2,
    color = BLACK,
  } = opts;

  const availLen = Math.max(12, box.h - paddingY * 2);
  const availThick = Math.max(8, box.w - paddingX * 2);
  let chosenSize = minSize;
  let chosenLines = [];

  for (let s = maxSize; s >= minSize; s = +(s - 0.25).toFixed(2)) {
    const lines = wrapParagraphWords(clean, font, s, availLen);
    const totalThick = lines.length * s * lineHeight;
    chosenSize = s;
    chosenLines = lines;
    if (totalThick <= availThick) break;
  }

  const step = chosenSize * lineHeight;
  const maxLines = Math.max(1, Math.floor(availThick / step));
  if (chosenLines.length > maxLines) {
    chosenLines = chosenLines.slice(0, maxLines);
    chosenLines[maxLines - 1] = truncateToWidth(chosenLines[maxLines - 1], font, chosenSize, availLen);
  }

  const blockThick = chosenLines.length * step;
  const startX = box.x + (box.w - blockThick) / 2 + chosenSize * 0.85;
  for (let i = 0; i < chosenLines.length; i++) {
    const ln = chosenLines[i];
    const lw = font.widthOfTextAtSize(ln, chosenSize);
    let y = box.y + paddingY;
    if (align === 'center') y = box.y + (box.h - lw) / 2;
    else if (align === 'right') y = box.y + box.h - paddingY - lw;
    page.drawText(ln, {
      x: startX + i * step,
      y,
      size: chosenSize,
      font,
      color,
      rotate: degrees(90),
    });
  }
}

function toTitleCaseSpanish(str) {
  const minor = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'para', 'con', 'a', 'al']);
  return cleanText(str)
    .split(/\s+/)
    .filter(Boolean)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function formatStudentNameForCert(rawName) {
  const clean = cleanText(rawName);
  if (!clean) return '';
  if (clean.includes(',')) {
    const [leftRaw, ...rest] = clean.split(',');
    const left = cleanText(leftRaw);
    const right = cleanText(rest.join(' '));
    if (!right) return left;
    const leftIsUpper = left === left.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(left);
    const rightIsUpper = right === right.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(right);
    if (rightIsUpper && !leftIsUpper) {
      return `${toTitleCaseSpanish(left)} ${right.toUpperCase()}`;
    }
    return `${toTitleCaseSpanish(right)} ${left.toUpperCase()}`;
  }
  const tokens = clean.split(/\s+/).filter(Boolean);
  const allUpper = clean === clean.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(clean);
  if (allUpper && tokens.length >= 3) {
    return `${toTitleCaseSpanish(tokens.slice(2).join(' '))} ${tokens.slice(0, 2).join(' ').toUpperCase()}`;
  }
  if (tokens.length >= 3) {
    const upperIdx = tokens.findIndex((t, i) => i > 0 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t) && t.length > 1);
    if (upperIdx > 0) {
      return `${toTitleCaseSpanish(tokens.slice(0, upperIdx).join(' '))} ${tokens.slice(upperIdx).join(' ').toUpperCase()}`;
    }
    return `${toTitleCaseSpanish(tokens.slice(0, -2).join(' '))} ${tokens.slice(-2).join(' ').toUpperCase()}`;
  }
  return clean;
}

function formatCertResolution(rawRes) {
  const clean = cleanText(rawRes).replace(/N[º°]/g, 'N°');
  if (!clean) return '';
  if (/^R\.?\s*D\.?\s+/i.test(clean)) {
    return clean.replace(/^R\.?\s*D\.?\s+/i, 'RESOLUCIÓN DIRECTORAL ');
  }
  return clean;
}

function formatCertDirector(rawDir) {
  const clean = cleanText(rawDir);
  if (!clean) return '';
  if (clean.includes(',')) return clean;
  const m = /^(Prof\.|Lic\.|Mg\.|Ing\.|Dr\.)?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[a-záéíóúñ]+|\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\s+([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})+)$/.exec(clean);
  if (m) {
    return `${cleanText(`${m[1] || ''} ${m[2]}`)}, ${m[3]}`;
  }
  return clean;
}

async function renderTmpl20(pdfDoc, doc, fonts, manifest) {
  const [page1, page2] = pdfDoc.getPages();
  const anv = (manifest?.bases?.TMPL_20?.anverso) || {};
  const rev = (manifest?.bases?.TMPL_20?.reverso) || {};
  const p = doc.parameters || {};

  const fArial = fonts.arial || fonts.calibri || fonts.regular;
  const fArialB = fonts.arialBold || fonts.calibriBold || fonts.bold;
  const fArialBlack = fonts.arialBlack || fArialB;
  const fCalibri = fonts.calibri || fArial;
  const fCalibriB = fonts.calibriBold || fArialB;

  const studentName = formatStudentNameForCert(presentText(p.certStudentName || doc.students?.[0]?.student?.name)) || 'ESTUDIANTE POR CONFIRMAR';
  const moduleName = presentText(doc.module?.nombre || doc.module?.nombreOficial) || 'MÓDULO FORMATIVO';
  const programName = presentText(doc.program?.nombre || doc.program?.name) || 'PROGRAMA DE ESTUDIOS';
  const referenceResolution = formatCertResolution(presentText(
    p.certReferenceResolution || p.referenceResolution || doc.program?.resolucionPrograma || doc.module?.resolucionAutorizacion
  ));
  const registerCode = presentText(p.certRegisterCode || p.registerCode) || 'PENDIENTE';
  const startD = parseDateParts(doc.group?.fechaInicio || doc.module?.fechaInicio, '2026-03-16');
  const endD = parseDateParts(doc.group?.fechaFin || doc.module?.fechaFin, '2026-07-24');
  const emD = parseDateParts(p.certEmissionDate || p.emissionDate, emissionFallbackDate(doc));
  const semesterLabel = presentText(p.semesterLabel || p.certSemesterLabel) || 'I Semestre';
  const directorText = formatCertDirector(presentText(p.certDirectorName || p.directorName || doc.institution?.directorNombre));
  const rawInst = presentText(p.institutionName || p.certInstitutionName || p.companyName);
  const efsrtInstitution = (!rawInst || /^NO\s+CORRESPONDE$/i.test(rawInst)) ? 'CETPRO Micaela Bastidas' : rawInst;

  // Construir filas del reverso primero para garantizar que página 1 sume exactamente créditos y horas de página 2
  const enrId = doc.students?.[0]?.enrollment?.id;
  const unitRows = (doc.units || [])
    .filter(u => String(u.code || '').toUpperCase() !== 'EFSRT')
    .map(u => ({
      ud: presentText(u.name || u.code),
      credits: Number(u.credits ?? 0) || 0,
      hours: Number(u.hours ?? 0) || 0,
      capacity: presentText(u.capacity),
      grade: formatZero2(pickStudentGrade(doc.grades, enrId, u.code)),
    }));
  const detailRows = [...unitRows];
  const hasEfsrt = doc.module?.efsrtHours != null || doc.efsrtUnit?.hours != null || presentText(p.efsrtFinalGrade) !== '';
  if (hasEfsrt) {
    detailRows.push({
      ud: 'EFSRT',
      credits: Number(doc.efsrtUnit?.credits ?? 0) || 0,
      hours: Number(doc.module?.efsrtHours ?? doc.efsrtUnit?.hours ?? 0) || 0,
      capacity: presentText(doc.efsrtUnit?.capacity) || 'Consolidar, integrar y ampliar conocimientos, habilidades y actitudes en situaciones reales de trabajo.',
      grade: formatZero2(p.efsrtFinalGrade),
    });
  }
  const maxRows = (rev.rows && rev.rows.length) || 8;
  if (detailRows.length > maxRows) {
    throw new Error(`El módulo supera las ${maxRows} filas permitidas en el Certificado Modular Oficial.`);
  }

  const totalCredits = detailRows.length
    ? detailRows.reduce((s, r) => s + (Number(r.credits) || 0), 0)
    : (Number(doc.module?.credits ?? 0) || 0);
  const totalHours = detailRows.length
    ? detailRows.reduce((s, r) => s + (Number(r.hours) || 0), 0)
    : (Number(doc.module?.hours ?? 0) || 0);

  // Anverso — Página 1 (A4 horizontal 842.04 x 595.32)
  if (referenceResolution) {
    drawFittedSingleLine(
      page1,
      referenceResolution,
      { x: 70.92, y: 455, w: 661.36, h: 16 },
      fArial,
      { maxSize: 9.96, minSize: 6.5, align: 'center', baselineY: 460.3, exactSize: true }
    );
  }

  drawFittedSingleLine(
    page1,
    registerCode,
    { x: 70.92, y: 394, w: 661.36, h: 18 },
    fCalibri,
    { maxSize: 12, minSize: 7.5, align: 'center', baselineY: 398.23, exactSize: true }
  );

  if (registerCode && registerCode !== 'PENDIENTE') {
    const vc = anv.registerCodeVertical || { x: 799.06, centerY: 443.36, boxH: 105, size: 6 };
    const safeVert = normalizeGlyphText(cleanText(registerCode), fCalibri);
    let vSize = vc.size || 6;
    const maxVertLen = vc.boxH || 105;
    while (vSize > 4 && fCalibri.widthOfTextAtSize(safeVert, vSize) > maxVertLen) {
      vSize = Math.max(4, +(vSize - 0.25).toFixed(2));
    }
    const tw = fCalibri.widthOfTextAtSize(safeVert, vSize);
    page1.drawText(safeVert, {
      x: vc.x ?? 799.06,
      y: (vc.centerY ?? 443.36) - tw / 2,
      size: vSize,
      font: fCalibri,
      color: BLACK,
      rotate: degrees(90),
    });
  }

  drawFittedSingleLine(
    page1,
    studentName,
    { x: 152.78, y: 374, w: 580, h: 24 },
    fCalibriB,
    { maxSize: 15.96, minSize: 9, align: 'left', baselineY: 379.75, paddingX: 0, exactSize: true }
  );

  drawFittedSingleLine(
    page1,
    moduleName,
    { x: 70.92, y: 308, w: 722.4, h: 36 },
    fArialBlack,
    { maxSize: 21.96, minSize: 12.5, align: 'center', baselineY: 316.27, exactSize: true }
  );

  drawFittedSingleLine(
    page1,
    programName.toUpperCase(),
    { x: 110, y: 256, w: 666, h: 28 },
    fArialBlack,
    { maxSize: 18, minSize: 10, align: 'center', baselineY: 261.77, exactSize: true }
  );

  drawFittedSingleLine(
    page1,
    `Desarrollado del ${startD.dmy} al ${endD.dmy} con un total de ${totalCredits} créditos`,
    { x: 70.92, y: 228, w: 722.16, h: 22 },
    fArial,
    { maxSize: 14.04, minSize: 8.5, align: 'left', baselineY: 233.21, paddingX: 0, exactSize: true }
  );

  drawFittedSingleLine(
    page1,
    `Equivalente a ${totalHours} Horas – ${semesterLabel}.`,
    { x: 70.92, y: 202, w: 722.16, h: 22 },
    fArial,
    { maxSize: 14.04, minSize: 8.5, align: 'left', baselineY: 207.77, paddingX: 0, exactSize: true }
  );

  drawFittedSingleLine(
    page1,
    `San Miguel ${emD.dayNum} de ${emD.monthLower} del ${emD.yyyy}`,
    { x: 420, y: 176, w: 363.48, h: 22 },
    fArialB,
    { maxSize: 14.04, minSize: 8.5, align: 'right', baselineY: 182.45, paddingX: 0, exactSize: true }
  );

  if (directorText) {
    drawFittedSingleLine(
      page1,
      directorText,
      { x: 243.1, y: 114, w: 400, h: 18 },
      fArial,
      { maxSize: 12, minSize: 7.5, align: 'center', baselineY: 118.58, exactSize: true }
    );
  }

  // Reverso — Página 2
  const cicloText = toTitleCaseSpanish(presentText(doc.group?.ciclo || doc.program?.nivelFormativo) || 'Auxiliar Técnico');
  drawFittedSingleLine(
    page2,
    cicloText,
    { x: 190.94, y: 506, w: 330, h: 18 },
    fArialBlack,
    { maxSize: 12, minSize: 8, align: 'left', baselineY: 511.18, paddingX: 0, exactSize: true }
  );

  const modlText = toTitleCaseSpanish(presentText(doc.group?.modalidad) || 'Presencial');
  drawFittedSingleLine(
    page2,
    modlText,
    { x: 619.54, y: 506, w: 173.5, h: 18 },
    fArialBlack,
    { maxSize: 12, minSize: 8, align: 'left', baselineY: 511.18, paddingX: 0, exactSize: true }
  );

  drawFittedSingleLine(
    page2,
    moduleName.toUpperCase(),
    { x: 134.9, y: 486, w: 658.18, h: 22 },
    fArialBlack,
    { maxSize: 14.04, minSize: 8, align: 'left', baselineY: 490.66, paddingX: 0, exactSize: true }
  );

  const ucBox = rev.uc || { x: 71.4, y: 132.74, w: 65.3, h: 313.64 };
  drawRotatedWrappedBlock(
    page2,
    presentText(doc.module?.competence || doc.module?.competencia),
    ucBox,
    fCalibri,
    { maxSize: 8.04, minSize: 5.5, align: 'left', paddingX: 2.5, paddingY: 0.48, lineHeight: 1.24 }
  );

  const fallbackRows = [
    { ud: { x: 136.7, y: 410.11, w: 186.99, h: 36.27 }, credits: { x: 323.69, y: 410.11, w: 48.36, h: 36.27 }, hours: { x: 372.05, y: 410.11, w: 36, h: 36.27 }, capacity: { x: 408.05, y: 410.11, w: 308.09, h: 36.27 }, grade: { x: 716.14, y: 410.11, w: 76.94, h: 36.27 } },
    { ud: { x: 136.7, y: 374.83, w: 186.99, h: 35.28 }, credits: { x: 323.69, y: 374.83, w: 48.36, h: 35.28 }, hours: { x: 372.05, y: 374.83, w: 36, h: 35.28 }, capacity: { x: 408.05, y: 374.83, w: 308.09, h: 35.28 }, grade: { x: 716.14, y: 374.83, w: 76.94, h: 35.28 } },
    { ud: { x: 136.7, y: 339.67, w: 186.99, h: 35.16 }, credits: { x: 323.69, y: 339.67, w: 48.36, h: 35.16 }, hours: { x: 372.05, y: 339.67, w: 36, h: 35.16 }, capacity: { x: 408.05, y: 339.67, w: 308.09, h: 35.16 }, grade: { x: 716.14, y: 339.67, w: 76.94, h: 35.16 } },
    { ud: { x: 136.7, y: 304.39, w: 186.99, h: 35.28 }, credits: { x: 323.69, y: 304.39, w: 48.36, h: 35.28 }, hours: { x: 372.05, y: 304.39, w: 36, h: 35.28 }, capacity: { x: 408.05, y: 304.39, w: 308.09, h: 35.28 }, grade: { x: 716.14, y: 304.39, w: 76.94, h: 35.28 } },
    { ud: { x: 136.7, y: 266.21, w: 186.99, h: 38.18 }, credits: { x: 323.69, y: 266.21, w: 48.36, h: 38.18 }, hours: { x: 372.05, y: 266.21, w: 36, h: 38.18 }, capacity: { x: 408.05, y: 266.21, w: 308.09, h: 38.18 }, grade: { x: 716.14, y: 266.21, w: 76.94, h: 38.18 } },
    { ud: { x: 136.7, y: 223.73, w: 186.99, h: 42.48 }, credits: { x: 323.69, y: 223.73, w: 48.36, h: 42.48 }, hours: { x: 372.05, y: 223.73, w: 36, h: 42.48 }, capacity: { x: 408.05, y: 223.73, w: 308.09, h: 42.48 }, grade: { x: 716.14, y: 223.73, w: 76.94, h: 42.48 } },
    { ud: { x: 136.7, y: 178.25, w: 186.99, h: 45.48 }, credits: { x: 323.69, y: 178.25, w: 48.36, h: 45.48 }, hours: { x: 372.05, y: 178.25, w: 36, h: 45.48 }, capacity: { x: 408.05, y: 178.25, w: 308.09, h: 45.48 }, grade: { x: 716.14, y: 178.25, w: 76.94, h: 45.48 } },
    { ud: { x: 136.7, y: 132.74, w: 186.99, h: 45.51 }, credits: { x: 323.69, y: 132.74, w: 48.36, h: 45.51 }, hours: { x: 372.05, y: 132.74, w: 36, h: 45.51 }, capacity: { x: 408.05, y: 132.74, w: 308.09, h: 45.51 }, grade: { x: 716.14, y: 132.74, w: 76.94, h: 45.51 } },
  ];
  const rowBoxes = (rev.rows && rev.rows.length) ? rev.rows : fallbackRows;

  for (let i = 0; i < Math.min(detailRows.length, rowBoxes.length); i++) {
    const rb = rowBoxes[i];
    const item = detailRows[i];
    drawWrappedBlock(page2, item.ud, rb.ud, fCalibri, {
      maxSize: 12, minSize: 7.5, align: 'left', valign: 'middle', paddingX: 3.72, paddingY: 2, lineHeight: 1.22,
    });
    drawFittedSingleLine(page2, String(item.credits), rb.credits, fCalibri, {
      maxSize: 14.04, minSize: 9, align: 'center', valign: 'middle', exactSize: true,
    });
    drawFittedSingleLine(page2, String(item.hours), rb.hours, fCalibri, {
      maxSize: 14.04, minSize: 9, align: 'center', valign: 'middle', exactSize: true,
    });
    drawWrappedBlock(page2, item.capacity, rb.capacity, fCalibri, {
      maxSize: 6.96, minSize: 4.8, align: 'left', valign: 'middle', paddingX: 3.72, paddingY: 1.5, lineHeight: 1.24,
    });
    drawFittedSingleLine(page2, item.grade, rb.grade, fArial, {
      maxSize: 14.04, minSize: 9, align: 'center', valign: 'middle', exactSize: true,
    });
  }

  drawFittedSingleLine(
    page2,
    efsrtInstitution,
    { x: 74.64, y: 68, w: 714, h: 36 },
    fArial,
    { maxSize: 14.04, minSize: 9, align: 'left', baselineY: 90.024, paddingX: 0, exactSize: true }
  );
}

async function renderTmpl23(pdfDoc, doc, fonts, manifest) {
  const page = pdfDoc.getPages()[0];
  const boxes = manifest.bases.TMPL_23.anverso;
  const p = doc.parameters || {};
  const traj = doc.trajectory || {};
  const studentName = presentText(doc.students?.[0]?.student?.name) || 'ESTUDIANTE POR CONFIRMAR';
  const progName = presentText(doc.program?.nombre || doc.program?.name || traj.programName) || 'PROGRAMA DE ESTUDIOS';
  const totalHours = doc.program?.totalHours ?? traj.totalHours ?? doc.module?.hours ?? 0;
  const totalCredits = doc.program?.totalCredits ?? traj.totalCredits ?? doc.module?.credits ?? 0;

  const gradDate = parseDateParts(p.graduationDate || p.emissionDate, emissionFallbackDate(doc));
  const emDate = parseDateParts(p.emissionDate, emissionFallbackDate(doc));
  const teacherName = presentText(p.specialtyTeacher || doc.teacher || doc.group?.teacherName) || 'DOCENTE DE ESPECIALIDAD';

  const fName = fonts.brush || fonts.cambriaBold || fonts.arialBold;
  const fBody = fonts.bookos || fonts.calibri || fonts.arial;
  const fBodyB = fonts.bookosBold || fonts.calibriBold || fonts.arialBold;
  const fReg = fonts.calibri || fonts.arial;
  const fBold = fonts.calibriBold || fonts.arialBold;

  // "Otorgado a :" está impreso en x=379..508.8, y=397.25; bodyBox termina arriba en y=354.96.
  // Ubicamos [Apellidos, Nombres] exactamente en y=358..391 sin solapar ambos bloques.
  drawFittedSingleLine(
    page,
    studentName,
    { x: 150.45, y: 358, w: 630.55, h: 33 },
    fName,
    { maxSize: 23, minSize: 12, align: 'center', valign: 'middle' }
  );

  drawJustifiedParagraphs(page, [
    [
      { text: 'Por haber cumplido con las normas Tecnológicas satisfactoriamente en la Especialidad de ', font: fBody },
      { text: progName, font: fBodyB },
      { text: ', en el CETPRO “Micaela Bastidas Puyucawa” con una Duración de ', font: fBody },
      { text: `${totalHours} Horas`, font: fBodyB },
      { text: ', y un Total de ', font: fBody },
      { text: `${totalCredits} Créditos`, font: fBodyB },
      { text: ', habiendo sido declarado(a) Egresado(a) el día ', font: fBody },
      { text: gradDate.longDayMonth, font: fBodyB },
      { text: ' del año ', font: fBody },
      { text: `${gradDate.yyyy}.`, font: fBodyB },
    ],
  ], boxes.bodyBox, fBody, { size: 12.2, lineHeight: 1.42, paragraphGap: 4 });

  drawFittedSingleLine(
    page,
    `San Miguel, ${emDate.dd} de ${emDate.monthLower} del ${emDate.yyyy}`,
    boxes.dateBox,
    fReg,
    { maxSize: 11, minSize: 8, align: 'right', valign: 'middle' }
  );

  const sBox = boxes.teacherSignBox;
  const lineY = 87.96;
  page.drawLine({
    start: { x: sBox.x + 35, y: lineY },
    end: { x: sBox.x + sBox.w - 35, y: lineY },
    thickness: 0.75,
    color: BLACK,
  });
  drawFittedSingleLine(page, teacherName, { x: sBox.x, y: lineY - 14, w: sBox.w, h: 13 }, fBold, {
    maxSize: 9.2, minSize: 6.5, align: 'center',
  });
  drawFittedSingleLine(page, `DOCENTE — ${progName}`, { x: sBox.x, y: lineY - 26, w: sBox.w, h: 12 }, fReg, {
    maxSize: 8.2, minSize: 5.5, align: 'center',
  });
}

function buildActaStudentsAndStats(doc) {
  const units = (doc.units || []).slice(0, 12);
  const minScore = Number(doc.module?.approvalMinimum) || 13;
  const sorted = (doc.students || []).slice().sort((a, b) =>
    cleanText(a.student?.name).localeCompare(cleanText(b.student?.name), 'es')
  );

  const totAprobados = new Array(units.length).fill(0);
  const totDesaprobados = new Array(units.length).fill(0);
  const totRetirados = new Array(units.length).fill(0);
  let statAprobados = 0;
  let statDesaprobados = 0;
  let statRetirados = 0;

  const computedRows = sorted.map((row, index) => {
    const enr = row.enrollment || {};
    const st = row.student || {};
    const par = row.parameters || {};
    const condRaw = cleanText(par.condition).toUpperCase();
    const isRetired = enr.active === false || condRaw === 'R';

    const scores = units.map(u => pickStudentGrade(doc.grades, enr.id, u.code));
    let udApr = 0;
    let udDes = 0;
    let credApr = 0;
    let hrsApr = 0;
    let puntaje = 0;
    let gradeCount = 0;

    for (let u = 0; u < units.length; u++) {
      const val = scores[u];
      if (isRetired) {
        totRetirados[u]++;
        continue;
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        gradeCount++;
        puntaje += val;
        if (val >= minScore) {
          udApr++;
          credApr += Number(units[u].credits) || 0;
          hrsApr += Number(units[u].hours) || 0;
          totAprobados[u]++;
        } else {
          udDes++;
          totDesaprobados[u]++;
        }
      }
    }

    let sit = '';
    if (isRetired) {
      sit = 'R';
      statRetirados++;
    } else if (gradeCount > 0 && udDes === 0 && udApr >= units.length) {
      sit = 'A';
      statAprobados++;
    } else if (gradeCount > 0) {
      sit = 'D';
      statDesaprobados++;
    }

    const promedio = !isRetired && gradeCount > 0 ? String(Math.round(puntaje / gradeCount)) : '';
    return {
      num: String(index + 1),
      cond: isRetired ? 'R' : (condRaw || 'G'),
      dni: presentText(st.documentNumber || st.document),
      name: presentText(st.name),
      scores: scores.map(v => (isRetired || v === null ? '' : formatZero2(v))),
      udApr: !isRetired && gradeCount > 0 ? String(udApr) : '',
      udDes: !isRetired && gradeCount > 0 ? String(udDes) : '',
      credApr: !isRetired && gradeCount > 0 ? String(credApr) : '',
      hrsApr: !isRetired && gradeCount > 0 ? String(hrsApr) : '',
      puntaje: !isRetired && gradeCount > 0 ? String(Math.round(puntaje)) : '',
      promedio,
      sitA: sit === 'A' ? 'X' : '',
      sitD: sit === 'D' ? 'X' : '',
      sitR: sit === 'R' ? 'X' : '',
      obs: presentText(par.observations),
    };
  });

  return {
    units,
    computedRows,
    stats: {
      matriculados: computedRows.length,
      aprobados: statAprobados,
      desaprobados: statDesaprobados,
      retirados: statRetirados,
      totAprobados,
      totDesaprobados,
      totRetirados,
    },
  };
}

function drawActaRow(page, item, yBot, rowH, colSpecs, unitsCount, fonts) {
  const fArial = fonts.arial || fonts.regular;
  const fArialB = fonts.arialBold || fonts.bold;
  const fNarrow = fonts.arialNarrow || fArial;

  drawFittedSingleLine(page, item.num, { x: colSpecs.num[0], y: yBot, w: colSpecs.num[1], h: rowH }, fArial, { maxSize: 7, minSize: 4.5, align: 'center', paddingX: 0.5 });
  drawFittedSingleLine(page, item.cond, { x: colSpecs.cond[0], y: yBot, w: colSpecs.cond[1], h: rowH }, fArial, { maxSize: 7, minSize: 4.5, align: 'center', paddingX: 0.5 });
  drawFittedSingleLine(page, item.dni, { x: colSpecs.dni[0], y: yBot, w: colSpecs.dni[1], h: rowH }, fArial, { maxSize: 7, minSize: 4.5, align: 'center', paddingX: 1 });
  drawFittedSingleLine(page, item.name, { x: colSpecs.name[0], y: yBot, w: colSpecs.name[1], h: rowH }, fNarrow, { maxSize: 7.2, minSize: 4.2, align: 'left', paddingX: 2 });

  for (let u = 0; u < unitsCount; u++) {
    const ux = colSpecs.udStart + u * colSpecs.udW;
    drawFittedSingleLine(page, item.scores[u] || '', { x: ux, y: yBot, w: colSpecs.udW, h: rowH }, fArial, { maxSize: 7, minSize: 4.5, align: 'center', paddingX: 0.5 });
  }

  const tail = [
    [colSpecs.udApr, item.udApr, fArial],
    [colSpecs.udDes, item.udDes, fArial],
    [colSpecs.credApr, item.credApr, fArial],
    [colSpecs.hrsApr, item.hrsApr, fArial],
    [colSpecs.puntaje, item.puntaje, fArial],
    [colSpecs.promedio, item.promedio, fArialB],
    [colSpecs.sitA, item.sitA, fArialB],
    [colSpecs.sitD, item.sitD, fArialB],
    [colSpecs.sitR, item.sitR, fArialB],
  ];
  for (const [spec, val, font] of tail) {
    drawFittedSingleLine(page, val, { x: spec[0], y: yBot, w: spec[1], h: rowH }, font, { maxSize: 7, minSize: 4.5, align: 'center', paddingX: 0.5 });
  }
  drawFittedSingleLine(page, item.obs, { x: colSpecs.obs[0], y: yBot, w: colSpecs.obs[1], h: rowH }, fNarrow, { maxSize: 6.5, minSize: 4, align: 'left', paddingX: 2 });
}

async function renderTmpl19(pdfDoc, doc, fonts, baseBytes) {
  const { units, computedRows, stats } = buildActaStudentsAndStats(doc);
  const numChunks = Math.max(1, Math.ceil(computedRows.length / 30));
  if (numChunks > 1) {
    const srcDoc = await PDFLib.PDFDocument.load(baseBytes);
    for (let c = 1; c < numChunks; c++) {
      const copied = await pdfDoc.copyPages(srcDoc, [0, 1]);
      pdfDoc.addPage(copied[0]);
      pdfDoc.addPage(copied[1]);
    }
  }

  const fArial = fonts.arial || fonts.regular;
  const fArialB = fonts.arialBold || fonts.bold;
  const fNarrow = fonts.arialNarrow || fArial;
  const fNarrowB = fonts.arialNarrowBold || fArialB;

  const progName = presentText(doc.program?.nombre || doc.program?.name);
  const ciclo = presentText(doc.group?.ciclo || doc.program?.nivelFormativo) || 'Auxiliar Técnico';
  const modName = presentText(doc.module?.nombre || doc.module?.nombreOficial);
  const turno = presentText(doc.group?.turno);
  const seccion = presentText(doc.group?.seccion);
  const creditos = String(doc.module?.credits ?? '');
  const horas = String(doc.module?.hours ?? '');
  const fIni = doc.group?.fechaInicio ? parseDateParts(doc.group.fechaInicio).dmy : '';
  const fFin = doc.group?.fechaFin ? parseDateParts(doc.group.fechaFin).dmy : '';
  const periodStr = presentText(doc.group?.periodId);
  const perParts = periodStr.split('-');
  const pIni = perParts[0] || periodStr;
  const pFin = perParts[1] || periodStr;
  const teacherName = presentText(doc.teacher || doc.group?.teacherName);
  const emD = parseDateParts(doc.parameters?.emissionDate, emissionFallbackDate(doc));
  const emText = `San Miguel, ${emD.dd} de ${emD.monthLower} del ${emD.yyyy}`;
  const pages = pdfDoc.getPages();

  const anvSpecs = {
    num: [29.28, 13.08], cond: [42.36, 20.40], dni: [62.76, 60.02], name: [122.78, 173.91],
    udStart: 296.69, udW: 12.60,
    udApr: [447.91, 12.60], udDes: [460.51, 11.64], credApr: [472.15, 13.08], hrsApr: [485.23, 18.84],
    puntaje: [504.07, 15.00], promedio: [519.07, 15.60], sitA: [534.67, 14.52], sitD: [549.19, 15.96],
    sitR: [565.15, 15.63], obs: [580.78, 129.48],
  };
  const revSpecs = {
    num: [25.56, 15.36], cond: [40.92, 21.48], dni: [62.40, 47.54], name: [109.94, 220.95],
    udStart: 330.89, udW: 14.40,
    udApr: [506.47, 14.40], udDes: [520.87, 14.40], credApr: [535.27, 13.32], hrsApr: [548.59, 19.92],
    puntaje: [568.51, 17.79], promedio: [586.30, 15.48], sitA: [601.78, 10.56], sitD: [612.34, 17.04],
    sitR: [629.38, 18.24], obs: [647.62, 117.26],
  };
  const capBands = [[501.6, 17.0], [485.3, 16.3], [468.8, 16.5], [448.7, 20.1]];

  for (let c = 0; c < numChunks; c++) {
    const page1 = pages[c * 2];
    const page2 = pages[c * 2 + 1];
    const chunk = computedRows.slice(c * 30, (c + 1) * 30);

    // Cabecera Anverso alineada a la derecha/debajo de etiquetas preimpresas de BASE_05 p1
    drawFittedSingleLine(page1, progName, { x: 536, y: 551, w: 176, h: 12 }, fArialB, { maxSize: 8.2, minSize: 4.8, align: 'center' });
    drawFittedSingleLine(page1, ciclo, { x: 572, y: 540, w: 138, h: 11 }, fArial, { maxSize: 7.5, minSize: 5 });
    drawWrappedBlock(page1, modName, { x: 574, y: 520, w: 136, h: 18 }, fNarrowB, { maxSize: 7.5, minSize: 4.8, align: 'left', paddingY: 1 });
    drawFittedSingleLine(page1, turno, { x: 574, y: 488, w: 136, h: 11 }, fArial, { maxSize: 7.5, minSize: 5 });
    drawFittedSingleLine(page1, seccion, { x: 578, y: 476, w: 132, h: 11 }, fArial, { maxSize: 7.5, minSize: 5 });
    drawFittedSingleLine(page1, creditos, { x: 580, y: 465, w: 48, h: 11 }, fArialB, { maxSize: 7.5, minSize: 5, align: 'center' });
    drawFittedSingleLine(page1, horas, { x: 664, y: 465, w: 46, h: 11 }, fArialB, { maxSize: 7.5, minSize: 5, align: 'center' });
    drawFittedSingleLine(page1, fIni, { x: 568, y: 450, w: 54, h: 11 }, fArial, { maxSize: 7, minSize: 4.8, align: 'center' });
    drawFittedSingleLine(page1, fFin, { x: 660, y: 450, w: 52, h: 11 }, fArial, { maxSize: 7, minSize: 4.8, align: 'center' });
    drawFittedSingleLine(page1, pIni, { x: 600, y: 438, w: 22, h: 11 }, fArial, { maxSize: 6.5, minSize: 4.5, align: 'center' });
    drawFittedSingleLine(page1, pFin, { x: 658, y: 438, w: 52, h: 11 }, fArial, { maxSize: 6.5, minSize: 4.5, align: 'center' });

    for (let u = 0; u < units.length; u++) {
      const ux = anvSpecs.udStart + u * anvSpecs.udW;
      drawRotatedHeaderText(page1, units[u].name || units[u].code, { x: ux, y: 436.5, w: anvSpecs.udW, h: 120 }, fNarrowB, { maxSize: 5.8, minSize: 4 });
      drawFittedSingleLine(page1, String(units[u].credits ?? ''), { x: ux, y: 418.3, w: anvSpecs.udW, h: 7.8 }, fArial, { maxSize: 6, minSize: 4, align: 'center', paddingX: 0.5, paddingY: 0.5 });
      drawFittedSingleLine(page1, String(units[u].hours ?? ''), { x: ux, y: 411.1, w: anvSpecs.udW, h: 7.2 }, fArial, { maxSize: 6, minSize: 4, align: 'center', paddingX: 0.5, paddingY: 0.5 });
    }

    for (let r = 0; r < Math.min(20, chunk.length); r++) {
      const yBot = 411.07 - (r + 1) * 12.60;
      drawActaRow(page1, chunk[r], yBot, 12.60, anvSpecs, units.length, fonts);
    }

    // Reverso (estudiantes 21..30 del lote + resumen estadístico global)
    drawWrappedBlock(page2, presentText(doc.module?.competence || doc.module?.competencia), { x: 27, y: 500, w: 301, h: 74 }, fNarrow, { maxSize: 7.5, minSize: 4.8, align: 'left', valign: 'middle', paddingX: 3 });

    drawFittedSingleLine(page2, String(stats.matriculados), { x: 718, y: 558.9, w: 31, h: 10.6 }, fArialB, { maxSize: 7.5, minSize: 5, align: 'center' });
    drawFittedSingleLine(page2, String(stats.aprobados), { x: 718, y: 550.0, w: 31, h: 8.8 }, fArialB, { maxSize: 7.5, minSize: 5, align: 'center' });
    drawFittedSingleLine(page2, String(stats.desaprobados), { x: 718, y: 538.8, w: 31, h: 11.1 }, fArialB, { maxSize: 7.5, minSize: 5, align: 'center' });
    drawFittedSingleLine(page2, String(stats.retirados), { x: 718, y: 528.7, w: 31, h: 10.1 }, fArialB, { maxSize: 7.5, minSize: 5, align: 'center' });

    for (let b = 0; b < Math.min(4, units.length, capBands.length); b++) {
      const capText = presentText(units[b].capacity);
      if (!capText) continue;
      drawWrappedBlock(page2, `${units[b].code}: ${capText}`, { x: 606, y: capBands[b][0], w: 158, h: capBands[b][1] }, fNarrow, { maxSize: 6.2, minSize: 4.2, align: 'left', paddingX: 2, paddingY: 1, lineHeight: 1.12 });
    }

    for (let u = 0; u < units.length; u++) {
      const ux = revSpecs.udStart + u * revSpecs.udW;
      drawRotatedHeaderText(page2, units[u].name || units[u].code, { x: ux, y: 404.5, w: revSpecs.udW, h: 171.5 }, fNarrowB, { maxSize: 6.2, minSize: 4.2 });
      drawFittedSingleLine(page2, String(units[u].credits ?? ''), { x: ux, y: 376.9, w: revSpecs.udW, h: 8.8 }, fArial, { maxSize: 6.2, minSize: 4.2, align: 'center', paddingX: 0.5, paddingY: 0.5 });
      drawFittedSingleLine(page2, String(units[u].hours ?? ''), { x: ux, y: 368.7, w: revSpecs.udW, h: 8.2 }, fArial, { maxSize: 6.2, minSize: 4.2, align: 'center', paddingX: 0.5, paddingY: 0.5 });

      drawFittedSingleLine(page2, String(stats.totAprobados[u]), { x: ux, y: 215.45, w: revSpecs.udW, h: 11.40 }, fArialB, { maxSize: 6.8, minSize: 4.5, align: 'center', paddingX: 0.5 });
      drawFittedSingleLine(page2, String(stats.totDesaprobados[u]), { x: ux, y: 204.05, w: revSpecs.udW, h: 11.40 }, fArialB, { maxSize: 6.8, minSize: 4.5, align: 'center', paddingX: 0.5 });
      drawFittedSingleLine(page2, String(stats.totRetirados[u]), { x: ux, y: 192.65, w: revSpecs.udW, h: 11.40 }, fArialB, { maxSize: 6.8, minSize: 4.5, align: 'center', paddingX: 0.5 });
    }

    for (let r = 0; r < Math.min(10, Math.max(0, chunk.length - 20)); r++) {
      const yBot = 368.71 - (r + 1) * 13.80;
      drawActaRow(page2, chunk[20 + r], yBot, 13.80, revSpecs, units.length, fonts);
    }

    drawWrappedBlock(page2, modName, { x: 26.5, y: 148.5, w: 174.5, h: 21 }, fNarrowB, { maxSize: 7.5, minSize: 4.8, align: 'center' });
    drawWrappedBlock(page2, teacherName, { x: 202.5, y: 148.5, w: 185, h: 21 }, fNarrowB, { maxSize: 7.8, minSize: 5, align: 'center' });
    const pageSuffix = numChunks > 1 ? ` (Pliego ${c + 1}/${numChunks})` : '';
    drawFittedSingleLine(page2, emText + pageSuffix, { x: 26.5, y: 92, w: 200, h: 12 }, fArial, { maxSize: 7.5, minSize: 5.5, align: 'left' });
  }
}

async function renderTmpl01(pdfDoc, doc, fonts, baseBytes) {
  const sorted = (doc.students || []).slice().sort((a, b) =>
    cleanText(a.student?.name).localeCompare(cleanText(b.student?.name), 'es')
  );
  const numChunks = Math.max(1, Math.ceil(sorted.length / 30));
  if (numChunks > 1) {
    const srcDoc = await PDFLib.PDFDocument.load(baseBytes);
    for (let c = 1; c < numChunks; c++) {
      const [p] = await pdfDoc.copyPages(srcDoc, [0]);
      pdfDoc.addPage(p);
    }
  }

  const fArial = fonts.arial || fonts.regular;
  const fArialB = fonts.arialBold || fonts.bold;
  const fNarrow = fonts.arialNarrow || fArial;

  const yearStr = String(doc.group?.periodId || doc.group?.fechaInicio || '').slice(0, 4) || String(new Date().getFullYear());
  const acadPeriod = presentText(doc.group?.periodId);
  const progName = presentText(doc.program?.nombre || doc.program?.name);
  const modName = presentText(doc.module?.nombre || doc.module?.nombreOficial);
  const fIni = doc.group?.fechaInicio ? parseDateParts(doc.group.fechaInicio).dmy : '';
  const fFin = doc.group?.fechaFin ? parseDateParts(doc.group.fechaFin).dmy : '';
  const classPeriod = (fIni && fFin) ? `${fIni} al ${fFin}` : (fIni || fFin || acadPeriod);
  const nivel = presentText(doc.program?.nivelFormativo || doc.group?.ciclo) || 'Auxiliar Técnico';
  const formacion = presentText(doc.program?.tipoPlan) || 'Modular';
  const turno = presentText(doc.group?.turno);
  const seccion = presentText(doc.group?.seccion);
  const unitCountStr = doc.units?.length ? String(doc.units.length) : 'SI';
  const modCredits = doc.module?.credits != null
    ? String(doc.module.credits)
    : String((doc.units || []).reduce((s, u) => s + (Number(u.credits) || 0), 0));
  const emD = parseDateParts(doc.parameters?.emissionDate, emissionFallbackDate(doc));
  const emText = `San Miguel, ${emD.dd} de ${emD.monthLower} del ${emD.yyyy}`;

  // Geometría exacta de columnas/filas medida en BASE_06_NOMINA_MATRICULA_2026.pdf
  const colEdges = [49.44, 102.86, 169.22, 323.95, 370.75, 417.19, 461.74, 508.54, 560.62];
  const rowBorders = [
    [498.43, 499.27], [487.75, 488.59], [477.07, 477.91], [466.39, 467.23], [455.71, 456.55],
    [445.03, 445.87], [434.35, 435.19], [423.67, 424.51], [413.83, 414.67], [403.99, 404.83],
    [394.15, 394.99], [384.31, 385.15], [374.45, 375.29], [364.61, 365.45], [354.77, 355.61],
    [344.93, 345.77], [335.09, 335.93], [325.25, 326.09], [315.41, 316.25], [305.57, 306.41],
    [295.73, 296.57], [284.09, 284.93], [272.45, 273.29], [260.81, 261.65], [249.17, 250.01],
    [237.53, 238.37], [225.89, 226.73], [214.25, 215.09], [202.58, 203.42], [190.94, 191.78],
    [180.26, 181.10],
  ];
  const pages = pdfDoc.getPages();

  for (let c = 0; c < numChunks; c++) {
    const page = pages[c];
    const chunk = sorted.slice(c * 30, (c + 1) * 30);

    drawFittedSingleLine(page, yearStr, { x: 419, y: 595, w: 138, h: 11 }, fArialB, { maxSize: 7.5, minSize: 5.5 });
    drawFittedSingleLine(page, progName, { x: 170.9, y: 583, w: 150, h: 12 }, fNarrow, { maxSize: 7.5, minSize: 4.8 });
    drawFittedSingleLine(page, acadPeriod, { x: 419, y: 583, w: 138, h: 12 }, fArial, { maxSize: 7.5, minSize: 5 });
    drawWrappedBlock(page, modName, { x: 170.9, y: 564, w: 150, h: 18 }, fNarrow, { maxSize: 7, minSize: 4.5, paddingY: 1 });
    drawFittedSingleLine(page, classPeriod, { x: 419, y: 564, w: 138, h: 18 }, fArial, { maxSize: 7.2, minSize: 4.8 });
    drawFittedSingleLine(page, nivel, { x: 170.9, y: 552, w: 150, h: 12 }, fArial, { maxSize: 7.2, minSize: 5 });
    drawFittedSingleLine(page, formacion, { x: 419, y: 552, w: 138, h: 12 }, fArial, { maxSize: 7.2, minSize: 5 });
    drawFittedSingleLine(page, turno, { x: 170.9, y: 529, w: 150, h: 11 }, fArial, { maxSize: 7.2, minSize: 5 });
    drawFittedSingleLine(page, seccion, { x: 419, y: 529, w: 138, h: 11 }, fArial, { maxSize: 7.2, minSize: 5 });

    let men = 0;
    let women = 0;
    let grat = 0;
    let pag = 0;
    let bec = 0;

    for (let r = 0; r < chunk.length; r++) {
      const row = chunk[r];
      const st = row.student || {};
      const par = row.parameters || {};
      const num = String(c * 30 + r + 1);
      const dni = presentText(st.documentNumber || st.document);
      const name = presentText(st.name);
      const sex = normalizeSex(st.sex);
      const birth = st.birthDate ? parseDateParts(st.birthDate).dmy : '';
      const cond = cleanText(par.condition || 'G').toUpperCase() || 'G';

      if (sex === 'H') men++;
      else if (sex === 'M') women++;
      if (cond === 'P') pag++;
      else if (cond === 'B') bec++;
      else grat++;

      const yTop = rowBorders[r][0];
      const yBot = rowBorders[r + 1][1];
      const rowH = yTop - yBot;
      const values = [num, dni, name, sex, birth, cond, unitCountStr, modCredits];
      for (let col = 0; col < 8; col++) {
        const cx = colEdges[col];
        const cw = colEdges[col + 1] - cx;
        const align = col === 2 ? 'left' : 'center';
        const fontCell = col === 2 ? fNarrow : fArial;
        drawFittedSingleLine(page, values[col], { x: cx, y: yBot, w: cw, h: rowH }, fontCell, {
          maxSize: 6.8, minSize: 4.5, align, paddingX: col === 2 ? 3 : 1, paddingY: 0.5,
        });
      }
    }

    // Fila 51: contadores del lote en y=137.06, h=11.04
    const ySum = 137.06;
    const hSum = 11.04;
    drawFittedSingleLine(page, String(men), { x: colEdges[1], y: ySum, w: colEdges[2] - colEdges[1], h: hSum }, fArialB, { maxSize: 8, minSize: 5.5, align: 'center' });
    drawFittedSingleLine(page, String(women), { x: colEdges[2], y: ySum, w: colEdges[3] - colEdges[2], h: hSum }, fArialB, { maxSize: 8, minSize: 5.5, align: 'center' });
    drawFittedSingleLine(page, String(chunk.length), { x: colEdges[3], y: ySum, w: colEdges[4] - colEdges[3], h: hSum }, fArialB, { maxSize: 8, minSize: 5.5, align: 'center' });
    drawFittedSingleLine(page, String(grat), { x: colEdges[5], y: ySum, w: colEdges[6] - colEdges[5], h: hSum }, fArialB, { maxSize: 8, minSize: 5.5, align: 'center' });
    drawFittedSingleLine(page, String(pag), { x: colEdges[6], y: ySum, w: colEdges[7] - colEdges[6], h: hSum }, fArialB, { maxSize: 8, minSize: 5.5, align: 'center' });
    drawFittedSingleLine(page, String(bec), { x: colEdges[7], y: ySum, w: colEdges[8] - colEdges[7], h: hSum }, fArialB, { maxSize: 8, minSize: 5.5, align: 'center' });

    const pageNote = numChunks > 1 ? ` · Página ${c + 1}/${numChunks} (Total: ${sorted.length})` : '';
    drawFittedSingleLine(page, emText + pageNote, { x: 55.6, y: 114.4, w: 500.79, h: 11 }, fArial, { maxSize: 8, minSize: 5.5, align: 'left' });
  }
}

async function renderOfficial2026PDF(root, doc, _actor, _options = {}) {
  const baseFile = BASE_PDF_FILES[doc?.templateId];
  if (!baseFile) {
    throw new Error(`Formato oficial 2026 no soportado: ${doc?.templateId}`);
  }
  const appRoot = resolveRoot(root);
  const basePath = path.join(appRoot, 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_OFICIALES_2026', baseFile);
  const baseBytes = fs.readFileSync(basePath);
  const pdfDoc = await PDFLib.PDFDocument.load(baseBytes);
  const manifest = loadManifest(appRoot);
  const fonts = await embedInstitutionalFonts(appRoot, pdfDoc, doc.templateId);

  switch (doc.templateId) {
    case 'TMPL-22':
      await renderTmpl22(pdfDoc, doc, fonts);
      break;
    case 'TMPL-21':
      await renderTmpl21(pdfDoc, doc, fonts, manifest);
      break;
    case 'TMPL-20':
      await renderTmpl20(pdfDoc, doc, fonts, manifest);
      break;
    case 'TMPL-23':
      await renderTmpl23(pdfDoc, doc, fonts, manifest);
      break;
    case 'TMPL-19':
      await renderTmpl19(pdfDoc, doc, fonts, baseBytes);
      break;
    case 'TMPL-01':
      await renderTmpl01(pdfDoc, doc, fonts, baseBytes);
      break;
    default:
      throw new Error(`Formato oficial 2026 no soportado: ${doc.templateId}`);
  }

  for (const page of pdfDoc.getPages()) {
    applyStatusBanner(page, doc, fonts);
  }
  return Buffer.from(await pdfDoc.save(doc.templateId === 'TMPL-20' ? { useObjectStreams: false } : undefined));
}

module.exports = {
  renderOfficial2026PDF,
  drawCode39Barcode,
};


