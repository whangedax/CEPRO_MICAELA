const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const scratchDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\3d692a52-da89-4158-a53b-05a0109624c6\\scratch\\bd_unzipped';
const appDataDir = 'C:\\Users\\whangedax\\.gemini\\antigravity\\brain\\3d692a52-da89-4158-a53b-05a0109624c6\\scratch';

function unzipFile(filePath) {
  const buf = fs.readFileSync(filePath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return null;

  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdCount = buf.readUInt16LE(eocd + 10);
  const files = {};

  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const filenameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);

    const filename = buf.toString('utf8', pos + 46, pos + 46 + filenameLen);
    pos += 46 + filenameLen + extraLen + commentLen;

    if (filename.endsWith('/')) continue;

    const localFilenameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFilenameLen + localExtraLen;

    const compData = buf.slice(dataOffset, dataOffset + compSize);
    let uncompData;
    if (method === 0) {
      uncompData = compData;
    } else if (method === 8) {
      uncompData = zlib.inflateRawSync(compData);
    } else {
      continue;
    }
    files[filename] = uncompData.toString('utf8');
  }
  return files;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const matches = xml.match(/<si>(.*?)<\/si>/gs) || [];
  for (const m of matches) {
    let text = '';
    const tMatches = m.match(/<t[^>]*>(.*?)<\/t>/gs) || [];
    for (const tm of tMatches) {
      const val = tm.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      text += val;
    }
    strings.push(text.trim());
  }
  return strings;
}

function parseStyles(xml) {
  if (!xml) return { numFmts: {}, cellXfs: [] };
  const numFmts = {};
  const numFmtMatches = xml.match(/<numFmt[^>]+>/g) || [];
  for (const nf of numFmtMatches) {
    const idM = nf.match(/numFmtId="(\d+)"/);
    const codeM = nf.match(/formatCode="([^"]+)"/);
    if (idM && codeM) {
      numFmts[idM[1]] = codeM[1];
    }
  }

  const cellXfs = [];
  const xfMatches = xml.match(/<xf[^>]+>/g) || [];
  for (const xf of xfMatches) {
    const nfIdM = xf.match(/numFmtId="(\d+)"/);
    cellXfs.push({
      numFmtId: nfIdM ? nfIdM[1] : '0',
      formatCode: numFmts[nfIdM ? nfIdM[1] : '0'] || 'General'
    });
  }
  return { numFmts, cellXfs };
}

function parseWorkbook(xml, relsXml) {
  const sheets = [];
  if (!xml) return sheets;
  const rels = {};
  if (relsXml) {
    const rMatches = relsXml.match(/<Relationship[^>]+>/g) || [];
    for (const rm of rMatches) {
      const idM = rm.match(/Id="([^"]+)"/);
      const targetM = rm.match(/Target="([^"]+)"/);
      if (idM && targetM) rels[idM[1]] = targetM[1];
    }
  }
  const sMatches = xml.match(/<sheet[^>]+>/g) || [];
  for (const sm of sMatches) {
    const nameM = sm.match(/name="([^"]+)"/);
    const rIdM = sm.match(/r:id="([^"]+)"/);
    if (nameM) {
      const name = nameM[1];
      const rId = rIdM ? rIdM[1] : null;
      let target = rels[rId] || '';
      if (!target.startsWith('xl/')) {
        target = 'xl/' + target.replace(/^\//, '');
      }
      sheets.push({ name, target });
    }
  }
  return sheets;
}

const files = fs.readdirSync(scratchDir).filter(f => f.endsWith('.xlsx'));
console.log('=== AUDITORÍA PROFUNDA DE CELDAS Y FORMATOS OOXML (DOCUMENTOS) ===\n');

const documentAnalysis = [];

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const zip = unzipFile(filePath);
  if (!zip) continue;

  const sstrings = parseSharedStrings(zip['xl/sharedStrings.xml']);
  const styles = parseStyles(zip['xl/styles.xml']);
  const sheets = parseWorkbook(zip['xl/workbook.xml'], zip['xl/_rels/workbook.xml.rels']);

  for (const sheet of sheets) {
    const sheetXml = zip[sheet.target];
    if (!sheetXml) continue;

    const rowMatches = sheetXml.match(/<row[^>]*>(.*?)<\/row>|<row[^>]*\/>/gs) || [];

    for (let i = 0; i < rowMatches.length; i++) {
      const rm = rowMatches[i];
      const rAttr = rm.match(/<row[^>]*r="(\d+)"/);
      const rowNum = rAttr ? parseInt(rAttr[1], 10) : i + 1;

      // Find Col A, B, C cells
      const cellMatches = rm.match(/<c[^>]*>(.*?)<\/c>|<c[^>]*\/>/gs) || [];
      let cellB = null;
      let cellC = null;

      for (const cm of cellMatches) {
        const rM = cm.match(/r="([A-Z]+)(\d+)"/);
        if (rM) {
          if (rM[1] === 'B') cellB = cm;
          if (rM[1] === 'C') cellC = cm;
        }
      }

      // Read Name (Col C)
      let nameVal = '';
      if (cellC) {
        const vM = cellC.match(/<v>(.*?)<\/v>/s);
        const tM = cellC.match(/t="([^"]+)"/);
        if (tM && tM[1] === 's' && vM) {
          nameVal = sstrings[parseInt(vM[1], 10)] || '';
        } else if (vM) {
          nameVal = vM[1];
        }
      }

      // Read DNI (Col B)
      let dniVal = '';
      let ooxmlType = 'blank';
      let rawXmlValue = '';
      let styleIdx = null;
      let numFmtId = '0';
      let formatCode = 'General';

      if (cellB) {
        const tM = cellB.match(/t="([^"]+)"/);
        const sM = cellB.match(/s="(\d+)"/);
        const vM = cellB.match(/<v>(.*?)<\/v>/s);

        ooxmlType = tM ? (tM[1] === 's' ? 'shared string' : tM[1]) : (vM ? 'numeric' : 'blank');
        styleIdx = sM ? parseInt(sM[1], 10) : null;
        rawXmlValue = vM ? vM[1] : '';

        if (styleIdx !== null && styles.cellXfs[styleIdx]) {
          numFmtId = styles.cellXfs[styleIdx].numFmtId;
          formatCode = styles.cellXfs[styleIdx].formatCode;
        }

        if (ooxmlType === 'shared string' && vM) {
          dniVal = sstrings[parseInt(vM[1], 10)] || '';
        } else if (ooxmlType === 'inlineStr') {
          const isM = cellB.match(/<t[^>]*>(.*?)<\/t>/s);
          dniVal = isM ? isM[1] : '';
        } else {
          dniVal = rawXmlValue;
        }
      }

      // Clean name value
      nameVal = nameVal.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
      dniVal = dniVal.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();

      const uName = nameVal.toUpperCase();
      const isHeader = uName.includes('DNI') || uName.includes('APELLIDOS') || uName.includes('CETPRO') || uName.includes('NOMINA') || uName.includes('REGISTRO') || uName.includes('PROFESOR') || uName.includes('TURNO') || uName.includes('MODULO');

      const hasStudentData = !isHeader && (nameVal !== '' || (dniVal !== '' && /^\d+$/.test(dniVal.replace(/\D/g, ''))));

      if (hasStudentData) {
        documentAnalysis.push({
          archivo: file,
          hoja: sheet.name,
          fila: rowNum,
          nombre: nameVal,
          dniVal,
          ooxmlType,
          rawXmlValue,
          styleIdx,
          numFmtId,
          formatCode
        });
      }
    }
  }
}

console.log(`Total filas candidatas inspeccionadas: ${documentAnalysis.length}\n`);

// Breakdown OOXML cell types
const typeCounts = {};
documentAnalysis.forEach(d => {
  typeCounts[d.ooxmlType] = (typeCounts[d.ooxmlType] || 0) + 1;
});
console.log('--- DISTRIBUCIÓN DE TIPOS OOXML EN COLUMNA DOCUMENTO (COL B) ---');
console.table(typeCounts);

// Inspect empty DNI rows
const emptyRows = documentAnalysis.filter(d => d.dniVal === '');
console.log(`\n--- FILAS CON DOCUMENTO VACÍO (${emptyRows.length}) ---`);
emptyRows.forEach(e => {
  console.log(`Archivo: ${e.archivo} | Hoja: ${e.hoja} | Fila: ${e.fila} | Nombre: "${e.nombre}" | Tipo OOXML: ${e.ooxmlType}`);
});

// Inspect numeric cell formats
console.log('\n--- VERIFICACIÓN DE CEROS INICIALES Y FORMATOS DE CELDA NUMÉRICOS ---');
const numericRows = documentAnalysis.filter(d => d.ooxmlType === 'numeric');
console.log(`Filas con celda numéricas (sin t="s"): ${numericRows.length}`);
numericRows.forEach(n => {
  console.log(`  Archivo: ${n.archivo} | Fila: ${n.fila} | DNI raw XML: "${n.rawXmlValue}" | formatCode: "${n.formatCode}" | DNI interpretd: "${n.dniVal}"`);
});

// Inspect 21 atypical documents (<8 digits or non-numeric)
const atypicalRows = documentAnalysis.filter(d => {
  const norm = d.dniVal.replace(/\D/g, '');
  return d.dniVal !== '' && (norm.length !== 8 || d.dniVal !== norm);
});

console.log(`\n--- CLASIFICACIÓN TÉCNICA DE LOS ${atypicalRows.length} DOCUMENTOS ATÍPICOS ---`);
let count7Digits = 0;
let countMore8Digits = 0;
let countAlphanumeric = 0;
let countOthers = 0;

atypicalRows.forEach(a => {
  const norm = a.dniVal.replace(/\D/g, '');
  let cat = 'OTROS';
  if (/^\d{7}$/.test(a.dniVal)) {
    count7Digits++;
    cat = '7_DIGITOS';
  } else if (/^\d{9,}$/.test(a.dniVal)) {
    countMore8Digits++;
    cat = 'MAS_DE_8_DIGITOS';
  } else if (/[a-zA-Z]/.test(a.dniVal)) {
    countAlphanumeric++;
    cat = 'ALFANUMERICOS';
  } else {
    countOthers++;
  }
  const masked = a.dniVal.length > 4 ? a.dniVal.substring(0, 2) + '***' + a.dniVal.substring(a.dniVal.length - 2) : '***';
  console.log(`Fila ${a.fila} en ${a.archivo} | DNI enmascarado: "${masked}" (${a.dniVal.length} chars) | Categoría: ${cat} | OOXML Type: ${a.ooxmlType} | FormatCode: "${a.formatCode}"`);
});

console.log('\n--- RESUMEN CONTEOS ATÍPICOS ---');
console.log(`7_DIGITOS: ${count7Digits}`);
console.log(`MAS_DE_8_DIGITOS: ${countMore8Digits}`);
const cellAuditData = {
  totalCandidates: documentAnalysis.length,
  typeCounts,
  emptyRowsCount: emptyRows.length,
  numericRowsCount: numericRows.length,
  atypicalCounts: {
    '7_DIGITOS': count7Digits,
    'MAS_DE_8_DIGITOS': countMore8Digits,
    'ALFANUMERICOS': countAlphanumeric,
    'OTROS': countOthers,
    'TOTAL': atypicalRows.length
  },
  atypicalRowsDetail: atypicalRows.map(a => ({
    archivo: a.archivo,
    hoja: a.hoja,
    fila: a.fila,
    nombre: a.nombre,
    dniVal: a.dniVal,
    ooxmlType: a.ooxmlType,
    rawXmlValue: a.rawXmlValue,
    numFmtId: a.numFmtId,
    formatCode: a.formatCode
  }))
};

fs.writeFileSync(path.join(appDataDir, 'm04_2_cell_audit.json'), JSON.stringify(cellAuditData, null, 2));

const repoScratch = path.join('c:/CETPRO/PAQUETE_ANTIGRAVITY_CETPRO_V2/scratch');
if (!fs.existsSync(repoScratch)) fs.mkdirSync(repoScratch, { recursive: true });
fs.writeFileSync(path.join(repoScratch, 'm04_2_cell_audit.json'), JSON.stringify(cellAuditData, null, 2));


