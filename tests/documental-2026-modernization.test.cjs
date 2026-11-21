const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const PDFLib = require('pdf-lib');

const ROOT = path.resolve(__dirname, '..');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const DocumentSettings = require('../scripts/offline-documents.cjs');
const Contracts = require('../scripts/document-contracts.cjs');
const { renderPDF } = require('../scripts/offline-pdf.cjs');
const { createService } = require('../scripts/offline-http.cjs');
const { drawCode39Barcode } = require('../scripts/documental-2026-engine.cjs');
const { matchesSyncModule } = require('../scripts/sync-modules.cjs');

const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cepro-doc2026-qa-'));
after(() => {
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
});

let cachedPdfjs = null;
async function getPdfJs() {
  if (!cachedPdfjs) cachedPdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return cachedPdfjs;
}

async function inspectPdf(bytes) {
  const pdfjs = await getPdfJs();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useSystemFonts: true,
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
  }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items.map(it => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      h: it.height,
      tr: it.transform,
    }));
    pages.push({
      pageNumber: p,
      width: page.view[2] - page.view[0],
      height: page.view[3] - page.view[1],
      items,
      text: items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim(),
    });
  }
  return { numPages: pdf.numPages, pages, fullText: pages.map(p => p.text).join('\n') };
}

function decodePageContentStreams(pdfDoc, pageIndex) {
  const page = pdfDoc.getPages()[pageIndex];
  const contents = page.node.Contents();
  if (!contents) return [];
  const refs = typeof contents.asArray === 'function' ? contents.asArray() : [contents];
  const out = [];
  for (const ref of refs) {
    const stream = page.node.context.lookup(ref);
    if (!stream || !stream.contents) continue;
    let buf;
    try {
      buf = Buffer.from(PDFLib.decodePDFRawStream(stream).decode());
    } catch {
      try {
        buf = zlib.inflateSync(Buffer.from(stream.contents));
      } catch {
        buf = Buffer.from(stream.contents);
      }
    }
    out.push(buf.toString('latin1'));
  }
  return out;
}

function makeSyntheticName(idx) {
  const last1 = ['ALVAREZ', 'BENITEZ', 'CCAMA', 'DELGADO', 'ESPINOZA', 'FLORES', 'GUTIERREZ', 'HUAMAN', 'INCA', 'JIMENEZ', 'LIMA', 'MAMANI', 'NUÑEZ', 'ORIHUELA', 'PARICAHUA', 'QUISPE', 'RAMOS', 'SUCASACA', 'TICONA', 'URIBE', 'VILCA', 'ZEA'];
  const last2 = ['APAZA', 'CALLATA', 'CONDORI', 'CHURA', 'HUANCA', 'PAREDES', 'PEÑA', 'ROQUE', 'VALENCIA', 'YUPANQUI'];
  const first = ['Ana María', 'Carlos Daniel', 'Diana Lucía', 'Edwin José', 'Gladys Pilar', 'Héctor Ángel', 'Karina Sofía', 'Luis Óscar', 'Mónica Elena', 'Rubén Darío'];
  const a1 = last1[idx % last1.length];
  const a2 = last2[Math.floor(idx / last1.length) % last2.length];
  const fn = first[(idx * 3) % first.length];
  return `${a1} ${a2} S${String(idx + 1).padStart(2, '0')}, ${fn}`;
}

function splitParts(fullName) {
  const [ap = '', nom = ''] = String(fullName).split(',');
  const parts = ap.trim().split(/\s+/).filter(Boolean);
  return {
    lastName1: parts[0] || '',
    lastName2: parts.slice(1).join(' ') || '',
    firstNames: nom.trim(),
  };
}

function createDoc2026Sandbox(label, { programId = 'PROG-005', includeM2 = true, m1Hours = 528, m1Credits = 22, m2Hours = 528, m2Credits = 22 } = {}) {
  const dir = fs.mkdtempSync(path.join(sandboxRoot, `${label}-`));
  const core = new OfflineCore(dir);
  core.setup({
    username: 'director',
    password: 'Director-2026-Safe!',
    name: 'Eloy Valerio Paredes Feliciano',
    institutionName: 'CETPRO MICAELA BASTIDAS',
  });
  const director = core.users()[0];
  const put = (kind, target, fields, unit) =>
    DocumentSettings.saveSettings(core, director, {
      scope: { kind, ...(target ? { target } : {}), ...(unit ? { unit } : {}) },
      fields,
      rev: core.record('documentSettings', DocumentSettings.idFor({ kind, target, unit }))?.rev || null,
    });

  put('institution', null, {
    nombre: 'CETPRO MICAELA BASTIDAS',
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

  const program = core.records('programs').find(p => p.id === programId);
  assert.ok(program, `Programa ${programId} debe existir`);
  const modList = core.records('modules')
    .filter(m => (m.programaId || m.programId) === programId)
    .sort((a, b) => (a.numeroModulo || 99) - (b.numeroModulo || 99) || String(a.id).localeCompare(String(b.id)));
  const mod1 = modList[0];
  const mod2 = modList[1];
  assert.ok(mod1 && mod2, `M1 y M2 deben existir para ${programId}`);

  put('program', program.id, {
    nivelFormativo: 'Auxiliar Técnico',
    tipoPlan: 'Modular',
    resolucionPrograma: 'RD N° 2053-2025-DUGEL-SR',
    officialTitleText: `AUXILIAR TÉCNICO EN ${program.nombre}`,
  });

  const unitsM1 = ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'UD6', 'EFSRT'];
  const unitsM2 = ['UD1', 'UD2', 'UD3', 'UD4', 'UD5', 'EFSRT'];

  put('module', mod1.id, {
    hours: m1Hours,
    credits: m1Credits,
    efsrtHours: 192,
    competence: `Competencia técnica del módulo I de ${program.nombre}.`,
    resolucionAutorizacion: 'RD N° 2053-2025-DUGEL-SR',
    presenceStates: 'P,T',
    absenceStates: 'F,J',
    absenceDenominator: 'REGISTRADAS',
    approvalMinimum: 13,
  });

  const group1 = core.saveGroup(director, {
    name: `${program.id}-M1-A`,
    programId: program.id,
    moduleId: mod1.id,
    periodId: '2026-I',
    units: unitsM1,
    section: 'A',
    turno: 'MAÑANA',
  });
  put('group', group1.id, {
    ciclo: 'Auxiliar Técnico',
    seccion: 'A',
    turno: 'MAÑANA',
    modalidad: 'PRESENCIAL',
    fechaInicio: '2026-03-16',
    fechaFin: '2026-07-24',
    periodClase: '2026-I',
    teacherName: 'Docente Principal 2026',
    efsrtInicio: '2026-06-22',
    efsrtFin: '2026-07-24',
  });

  const configureUnits = (group, totalH, totalC) => {
    const curricular = group.units.filter(u => u !== 'EFSRT');
    const efsrtH = totalH > 0 ? 192 : 0;
    const efsrtC = totalC > 0 ? 4 : 0;
    const remH = Math.max(0, totalH - efsrtH);
    const remC = Math.max(0, totalC - efsrtC);
    const baseH = curricular.length ? Math.floor(remH / curricular.length) : 0;
    const baseC = curricular.length ? Math.floor(remC / curricular.length) : 0;
    let accH = 0;
    let accC = 0;
    for (let idx = 0; idx < curricular.length; idx++) {
      const u = curricular[idx];
      const isLast = idx === curricular.length - 1;
      const uH = totalH > 0 ? (isLast ? remH - accH : baseH) : 0;
      const uC = totalC > 0 ? (isLast ? remC - accC : baseC) : 0;
      accH += uH;
      accC += uC;
      put('unit', group.id, {
        name: `Unidad Didáctica ${u} de ${program.codigo || program.id}`,
        capacity: `Aplica estándares técnicos y de calidad en ${u}.`,
        competence: `Competencia específica ${u}`,
        indicator1: `Indicador 1 (${u})`,
        indicator2: `Indicador 2 (${u})`,
        indicator3: `Indicador 3 (${u})`,
        indicator4: `Indicador 4 (${u})`,
        indicator5: `Indicador 5 (${u})`,
      }, u);
      put('unitCurriculum', group.id, { hours: uH, credits: uC }, u);
    }
    put('unit', group.id, {
      name: 'Experiencias Formativas en Situaciones Reales de Trabajo',
      capacity: 'Consolida desempeños técnicos en situaciones reales de trabajo.',
      competence: 'Desempeño laboral supervisado',
    }, 'EFSRT');
    put('unitCurriculum', group.id, { hours: efsrtH, credits: efsrtC }, 'EFSRT');
  };
  configureUnits(group1, m1Hours, m1Credits);

  let group2 = null;
  if (includeM2) {
    put('module', mod2.id, {
      hours: m2Hours,
      credits: m2Credits,
      efsrtHours: 192,
      competence: `Competencia técnica del módulo II de ${program.nombre}.`,
      resolucionAutorizacion: 'RD N° 2053-2025-DUGEL-SR',
      presenceStates: 'P,T',
      absenceStates: 'F,J',
      absenceDenominator: 'REGISTRADAS',
      approvalMinimum: 13,
    });
    group2 = core.saveGroup(director, {
      name: `${program.id}-M2-A`,
      programId: program.id,
      moduleId: mod2.id,
      periodId: '2026-II',
      units: unitsM2,
      section: 'A',
      turno: 'MAÑANA',
    });
    put('group', group2.id, {
      ciclo: 'Auxiliar Técnico',
      seccion: 'A',
      turno: 'MAÑANA',
      modalidad: 'PRESENCIAL',
      fechaInicio: '2026-08-10',
      fechaFin: '2026-12-18',
      periodClase: '2026-II',
      teacherName: 'Docente Principal 2026',
      efsrtInicio: '2026-11-16',
      efsrtFin: '2026-12-18',
    });
    configureUnits(group2, m2Hours, m2Credits);
  }

  const assignments = [
    { groupId: group1.id, units: group1.units },
    ...(group2 ? [{ groupId: group2.id, units: group2.units }] : []),
  ];
  const teacherRow = core.saveUser(director, {
    username: 'docente.qa',
    password: 'Docente-2026-Safe!',
    name: 'Docente Principal 2026',
    role: 'DOCENTE',
    assignments,
  });
  const secretaryRow = core.saveUser(director, {
    username: 'secretaria.qa',
    password: 'Secretaria-2026-Safe!',
    name: 'Carmen Vilca Puma',
    role: 'SECRETARIA',
  });
  const docente = core.user(teacherRow.id);
  const secretaria = core.user(secretaryRow.id);

  function addStudentTo(group, {
    name,
    document,
    sex = 'M',
    birthDate = '2003-05-14',
    condition = 'G',
    withGrades = true,
    gradeScore = 17,
    startDate = group.periodId === '2026-II' ? '2026-08-10' : '2026-03-16',
    registry = {},
  }) {
    let student = core.records('students').find(s => s.document === document);
    if (!student) {
      const parts = splitParts(name);
      student = core.saveStudent(director, {
        document,
        documentType: 'DNI',
        name,
        lastName1: parts.lastName1,
        lastName2: parts.lastName2,
        firstNames: parts.firstNames,
        sex,
        birthDate,
      });
    }
    const enrollment = core.enroll(director, {
      studentId: student.id,
      groupId: group.id,
      startDate,
    });
    put('enrollment', enrollment.id, { condition, emissionDate: '2026-12-18' });
    put('practice', enrollment.id, {
      companyName: 'EMPRESA TECNOLÓGICA SAN ROMÁN S.A.C.',
      companyAddress: 'JR. TACNA N° 310, JULIACA',
      criterion1: 3, criterion2: 2, criterion3: 2, criterion4: 3, criterion5: 3,
      criterion6: 3, criterion7: 1, criterion8: 2, criterion9: 1,
      efsrtFinalGrade: gradeScore,
    });
    const curricular = group.units.filter(u => u !== 'EFSRT');
    put('closure', enrollment.id, {
      modularGrade: gradeScore,
      approvedUnitsCount: withGrades ? curricular.length : 0,
      failedUnitsCount: 0,
      observations: '',
    });
    if (Object.keys(registry).length) {
      put('registry', enrollment.id, registry);
    }
    if (withGrades) {
      for (const u of curricular) {
        const rows = [];
        for (let i = 1; i <= 5; i++) {
          for (const comp of ['IA1', 'IA2', 'IA3', '']) {
            rows.push({
              enrollmentId: enrollment.id,
              indicator: `IL${i}${comp ? '.' + comp : ''}`,
              value: gradeScore,
            });
          }
        }
        rows.push({ enrollmentId: enrollment.id, indicator: 'RESULTADO_UD', value: gradeScore });
        core.saveAcademic(docente, 'grades', { groupId: group.id, unit: u, rows });
      }
    }
    return { student, enrollment };
  }

  return {
    dir,
    core,
    director,
    docente,
    secretaria,
    program,
    mod1,
    mod2,
    group1,
    group2,
    put,
    addStudentTo,
    close() {
      core.close();
    },
  };
}

function httpRequest(baseUrl, method, route, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, baseUrl);
    const payload = body !== undefined ? JSON.stringify(body) : null;
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload !== null ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(process.env.CETPRO_INSTANCE_SECRET ? { 'X-CETPRO-Instance-Secret': process.env.CETPRO_INSTANCE_SECRET } : {}),
    };
    const req = http.request(url, { method, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        const ct = String(res.headers['content-type'] || '');
        const parsed = ct.includes('application/json') ? JSON.parse(raw.toString('utf8') || '{}') : null;
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw });
      });
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

test('1. Paginación, cardinalidad real, orden alfabético y sin desbordes en TMPL-01 (1, 10, 30, 31, 65 estudiantes)', async () => {
  const expectedPages = [
    [1, 1],
    [10, 1],
    [30, 1],
    [31, 2],
    [65, 3],
  ];

  for (const [count, pagesCount] of expectedPages) {
    const sb = createDoc2026Sandbox(`tmpl01-${count}`, { includeM2: false });
    try {
      const createdNames = [];
      for (let i = 0; i < count; i++) {
        const name = makeSyntheticName(i);
        const dni = String(70000000 + i * 17 + 1);
        createdNames.push(name);
        sb.addStudentTo(sb.group1, {
          name,
          document: dni,
          sex: i % 2 === 0 ? 'M' : 'H',
          condition: i % 10 === 9 ? 'B' : i % 5 === 4 ? 'P' : 'G',
        });
      }

      const doc = sb.core.document(sb.director, {
        templateId: 'TMPL-01',
        groupId: sb.group1.id,
        official2026: true,
      });
      assert.equal(doc.preflight.complete, true, `TMPL-01 (${count}) preflight incompleto: ${JSON.stringify(doc.preflight.missing)}`);
      const bytes = await renderPDF(ROOT, doc, sb.director);
      const parsed = await inspectPdf(bytes);
      assert.equal(parsed.numPages, pagesCount, `TMPL-01 con ${count} estudiantes debe tener ${pagesCount} página(s)`);
      assert.doesNotMatch(parsed.fullText, /BORRADOR|DEMOSTRACIÓN|NaN|undefined|#DIV\/0!/);

      const extractedNums = [];
      const extractedNames = [];
      for (const p of parsed.pages) {
        const numItems = p.items
          .filter(it => it.x >= 49.0 && it.x <= 103.5 && it.y >= 179.5 && it.y <= 499.0 && /^\d+$/.test(it.str.trim()))
          .sort((a, b) => b.y - a.y);
        for (const it of numItems) extractedNums.push(Number(it.str.trim()));

        const nameItems = p.items
          .filter(it => it.x >= 169.0 && it.x <= 324.5 && it.y >= 179.5 && it.y <= 499.0 && it.str.trim().length > 0)
          .sort((a, b) => b.y - a.y);
        for (const it of nameItems) {
          assert.ok(it.x + it.w <= 325.0, `Desborde horizontal en TMPL-01 (${count}): "${it.str}" termina en x=${(it.x + it.w).toFixed(2)}`);
          extractedNames.push(it.str.trim());
        }
      }

      assert.deepEqual(
        extractedNums,
        Array.from({ length: count }, (_, i) => i + 1),
        `Numeración continua 1..${count} esperada en TMPL-01`
      );
      const expectedSorted = createdNames.slice().sort((a, b) => a.localeCompare(b, 'es'));
      assert.deepEqual(extractedNames, expectedSorted, `Orden alfabético esperado en TMPL-01 (${count})`);
      if (count === 65) {
        assert.match(parsed.pages[0].text, /Página 1\/3 \(Total: 65\)/);
        assert.match(parsed.pages[2].text, /Página 3\/3 \(Total: 65\)/);
      }
    } finally {
      sb.close();
    }
  }
});

test('2. Paginación anverso/reverso y cardinalidad en TMPL-19 (1, 10, 30, 31, 65 estudiantes) + sin notas / retirado sin errores', async () => {
  const expectedPages = [
    [1, 2],
    [10, 2],
    [30, 2],
    [31, 4],
    [65, 6],
  ];

  for (const [count, pagesCount] of expectedPages) {
    const sb = createDoc2026Sandbox(`tmpl19-${count}`, { includeM2: false });
    try {
      for (let i = 0; i < count; i++) {
        sb.addStudentTo(sb.group1, {
          name: makeSyntheticName(i),
          document: String(71000000 + i * 19 + 3),
          sex: i % 2 === 0 ? 'M' : 'H',
          withGrades: true,
          gradeScore: 14 + (i % 6),
        });
      }
      const doc = sb.core.document(sb.director, {
        templateId: 'TMPL-19',
        groupId: sb.group1.id,
        official2026: true,
      });
      assert.equal(doc.preflight.complete, true, `TMPL-19 (${count}) preflight incompleto: ${JSON.stringify(doc.preflight.missing)}`);
      const bytes = await renderPDF(ROOT, doc, sb.director);
      const parsed = await inspectPdf(bytes);
      assert.equal(parsed.numPages, pagesCount, `TMPL-19 con ${count} estudiantes debe tener ${pagesCount} página(s)`);
      assert.doesNotMatch(parsed.fullText, /#DIV\/0!|\bNaN\b|\bundefined\b/);

      const extractedNums = [];
      for (const p of parsed.pages) {
        const isAnverso = p.pageNumber % 2 === 1;
        const xMin = isAnverso ? 28.5 : 25.0;
        const xMax = isAnverso ? 43.0 : 41.5;
        const yMin = isAnverso ? 158.0 : 229.0;
        const yMax = isAnverso ? 412.0 : 370.0;
        const nums = p.items
          .filter(it => it.x >= xMin && it.x <= xMax && it.y >= yMin && it.y <= yMax && /^\d+$/.test(it.str.trim()))
          .sort((a, b) => b.y - a.y);
        for (const it of nums) extractedNums.push(Number(it.str.trim()));
      }
      assert.deepEqual(
        extractedNums,
        Array.from({ length: count }, (_, i) => i + 1),
        `Numeración continua 1..${count} esperada en TMPL-19`
      );
    } finally {
      sb.close();
    }
  }

  // Caso límite: 65 estudiantes donde 1 no tiene notas todavía y 1 está retirado
  const sbEdge = createDoc2026Sandbox('tmpl19-edge65', { includeM2: false });
  try {
    let retiredEnr = null;
    for (let i = 0; i < 65; i++) {
      const isUngraded = i === 12;
      const isRetired = i === 44;
      const { enrollment } = sbEdge.addStudentTo(sbEdge.group1, {
        name: makeSyntheticName(i),
        document: String(72000000 + i * 23 + 7),
        withGrades: !isUngraded && !isRetired,
      });
      if (isRetired) retiredEnr = enrollment;
    }
    sbEdge.core.retireEnrollment(sbEdge.director, {
      id: retiredEnr.id,
      rev: retiredEnr.rev,
      date: '2026-04-15',
      reason: 'Retiro voluntario de prueba',
    });

    const docEdge = sbEdge.core.document(sbEdge.director, {
      templateId: 'TMPL-19',
      groupId: sbEdge.group1.id,
      official2026: true,
      includeRetired: true,
    });
    assert.equal(docEdge.students.length, 65);
    const bytes = await renderPDF(ROOT, docEdge, sbEdge.director);
    const parsed = await inspectPdf(bytes);
    assert.equal(parsed.numPages, 6);
    assert.doesNotMatch(parsed.fullText, /#DIV\/0!|\bNaN\b|\bundefined\b|\bnull\b/);

    const extractedNums = [];
    for (const p of parsed.pages) {
      const isAnverso = p.pageNumber % 2 === 1;
      const nums = p.items
        .filter(it => it.x >= (isAnverso ? 28.5 : 25.0) && it.x <= (isAnverso ? 43.0 : 41.5) && it.y >= (isAnverso ? 158.0 : 229.0) && it.y <= (isAnverso ? 412.0 : 370.0) && /^\d+$/.test(it.str.trim()))
        .sort((a, b) => b.y - a.y);
      for (const it of nums) extractedNums.push(Number(it.str.trim()));
    }
    assert.deepEqual(extractedNums, Array.from({ length: 65 }, (_, i) => i + 1));
    assert.ok(parsed.pages[1].text.includes('65'), 'El resumen de matriculados debe mostrar 65');
  } finally {
    sbEdge.close();
  }
});

test('3. Caracteres en español (tildes, Ñ) y nombres extensos renderizan sin error ni pérdida en los 6 formatos 2026', async () => {
  const sb = createDoc2026Sandbox('spanish-long-names', { programId: 'PROG-005', includeM2: true });
  try {
    const longName1 = 'QUISPE CHOQUEHUANCA DE LA CRUZ, María Fernanda Alejandra del Rosario';
    const longName2 = 'NUÑEZ PEÑA, José Ángel Óscar';

    const reg1 = {
      registerCode: '000001-AT-74859612-CI26-2026',
      ugelCode: 'UGEL-SR-2026-000101',
      registryBook: 'LIBRO 01',
      registryFolio: '012',
      registryNumber: '0012',
      registryDate: '2026-12-18',
      registryAsiento: 'ASIENTO N° 012 - FOLIO 012',
      resolutionNumber: '000001-2026-DCETPROMB-SM',
      resolutionDate: '2026-12-18',
      expedienteNumber: 'EXP-012-2026',
      expedienteDate: '2026-12-10',
      graduationDate: '2026-12-15',
      specialtyTeacher: 'Mg. José Ángel Núñez Peña',
    };
    const e1m1 = sb.addStudentTo(sb.group1, { name: longName1, document: '74859612', sex: 'M', registry: reg1 });
    sb.addStudentTo(sb.group2, { name: longName1, document: '74859612', sex: 'M', registry: reg1 });
    const e2m1 = sb.addStudentTo(sb.group1, {
      name: longName2,
      document: '71234568',
      sex: 'H',
      registry: { ...reg1, registerCode: '000002-AT-71234568-CI26-2026', resolutionNumber: '000002-2026-DCETPROMB-SM' },
    });
    sb.addStudentTo(sb.group2, {
      name: longName2,
      document: '71234568',
      sex: 'H',
      registry: { ...reg1, registerCode: '000002-AT-71234568-CI26-2026', resolutionNumber: '000002-2026-DCETPROMB-SM' },
    });

    const checks = [
      { templateId: 'TMPL-01', groupId: sb.group1.id, expectedNames: [longName1, longName2] },
      { templateId: 'TMPL-19', groupId: sb.group1.id, expectedNames: [longName1, longName2] },
      { templateId: 'TMPL-20', groupId: sb.group1.id, enrollmentId: e1m1.enrollment.id, expectedNames: [longName1] },
      { templateId: 'TMPL-21', groupId: sb.group1.id, enrollmentId: e2m1.enrollment.id, expectedNames: [longName2] },
      { templateId: 'TMPL-22', groupId: sb.group1.id, enrollmentId: e1m1.enrollment.id, expectedNames: [longName1] },
      { templateId: 'TMPL-23', groupId: sb.group1.id, enrollmentId: e2m1.enrollment.id, expectedNames: [longName2] },
    ];

    for (const c of checks) {
      const doc = sb.core.document(sb.director, {
        templateId: c.templateId,
        groupId: c.groupId,
        ...(c.enrollmentId ? { enrollmentId: c.enrollmentId } : {}),
        official2026: true,
      });
      assert.equal(doc.preflight.complete, true, `${c.templateId} debe estar completo: ${JSON.stringify(doc.preflight.missing)}`);
      const bytes = await renderPDF(ROOT, doc, sb.director);
      const parsed = await inspectPdf(bytes);
      const normalized = parsed.fullText.replace(/\s+/g, ' ');
      for (const expectedName of c.expectedNames) {
        const expectedInDoc = c.templateId === 'TMPL-20' && expectedName === longName1
          ? 'María Fernanda Alejandra del Rosario QUISPE CHOQUEHUANCA DE LA CRUZ'
          : expectedName;
        assert.ok(normalized.includes(expectedInDoc), `${c.templateId} debe conservar íntegro "${expectedInDoc}". Extraído: ${normalized.slice(0, 400)}`);
      }
      if (c.templateId === 'TMPL-21' || c.templateId === 'TMPL-23') {
        assert.ok(normalized.includes('NUÑEZ PEÑA, José Ángel Óscar'));
      }
    }
  } finally {
    sb.close();
  }
});

test('4. Módulo I, Módulo II, trayectoria M1+M2, TMPL-20/21/22/23 y siglas de los 7 programas (PROG-001..007)', async () => {
  const expectedAcronyms = {
    'PROG-001': 'MA',
    'PROG-002': 'MO',
    'PROG-003': 'CM',
    'PROG-004': 'PB',
    'PROG-005': 'CI',
    'PROG-006': 'CE',
    'PROG-007': 'EE',
  };

  for (const [programId, acronym] of Object.entries(expectedAcronyms)) {
    const sb = createDoc2026Sandbox(`prog-${programId}`, {
      programId,
      includeM2: true,
      m1Hours: 500,
      m1Credits: 20,
      m2Hours: 556,
      m2Credits: 24,
    });
    try {
      assert.equal(Contracts.programAcronymFor(sb.program), acronym, `Sigla esperada para ${programId}`);
      const regCode = DocumentSettings.buildInstitutionalRegisterCode({
        correlative: 1,
        dni: '74125896',
        program: sb.program,
        intakeYear: '2026',
        emissionYear: '2026',
      });
      assert.equal(regCode, `000001-AT-74125896-${acronym}26-2026`);

      const registry = {
        registerCode: regCode,
        ugelCode: `UGEL-SR-2026-${acronym}-01`,
        registryBook: 'LIBRO 01',
        registryFolio: '005',
        registryNumber: '0005',
        registryDate: '2026-12-18',
        registryAsiento: `ASIENTO 005-${acronym}`,
        resolutionNumber: '000005-2026-DCETPROMB-SM',
        resolutionDate: '2026-12-18',
        expedienteNumber: `EXP-005-${acronym}`,
        expedienteDate: '2026-12-10',
        graduationDate: '2026-12-15',
        specialtyTeacher: 'Lic. Docente Especialidad',
      };
      const m1Row = sb.addStudentTo(sb.group1, { name: 'QUISPE APAZA, Lucía Isabel', document: '74125896', registry });
      const m2Row = sb.addStudentTo(sb.group2, { name: 'QUISPE APAZA, Lucía Isabel', document: '74125896', registry });

      const traj = DocumentSettings.resolveProgramTrajectory(sb.core, sb.director, m2Row.enrollment, sb.group2, sb.program);
      assert.equal(traj.hasBothModules, true);
      assert.equal(traj.module1.hours, 500);
      assert.equal(traj.module1.credits, 20);
      assert.equal(traj.module2.hours, 556);
      assert.equal(traj.module2.credits, 24);
      assert.equal(traj.totalHours, 1056);
      assert.equal(traj.totalCredits, 44);

      // TMPL-20 Módulo I y Módulo II
      const docM1 = sb.core.document(sb.director, { templateId: 'TMPL-20', groupId: sb.group1.id, enrollmentId: m1Row.enrollment.id, official2026: true });
      const docM2 = sb.core.document(sb.director, { templateId: 'TMPL-20', groupId: sb.group2.id, enrollmentId: m2Row.enrollment.id, official2026: true });
      assert.equal(docM1.preflight.complete, true);
      assert.equal(docM2.preflight.complete, true);
      const parsedM1 = await inspectPdf(await renderPDF(ROOT, docM1, sb.director));
      const parsedM2 = await inspectPdf(await renderPDF(ROOT, docM2, sb.director));
      assert.ok(parsedM1.fullText.includes(sb.mod1.nombre));
      assert.ok(parsedM2.fullText.includes(sb.mod2.nombre));
      assert.ok(parsedM1.fullText.includes('500'));
      assert.ok(parsedM2.fullText.includes('556'));

      // TMPL-21 official2026
      const doc21 = sb.core.document(sb.director, { templateId: 'TMPL-21', groupId: sb.group2.id, enrollmentId: m2Row.enrollment.id, official2026: true });
      assert.equal(doc21.preflight.complete, true);
      const parsed21 = await inspectPdf(await renderPDF(ROOT, doc21, sb.director));
      assert.equal(parsed21.numPages, 2);
      assert.ok(parsed21.fullText.includes(regCode));
      assert.ok(parsed21.fullText.includes(registry.ugelCode));

      // TMPL-22 RD Título con tabla M1 + M2 y totales
      const doc22 = sb.core.document(sb.director, { templateId: 'TMPL-22', groupId: sb.group2.id, enrollmentId: m2Row.enrollment.id, official2026: true });
      assert.equal(doc22.preflight.complete, true);
      const parsed22 = await inspectPdf(await renderPDF(ROOT, doc22, sb.director));
      assert.equal(parsed22.numPages, 1);
      const assertModuleTextInPdf = (text, moduleName) => {
        if (moduleName.length <= 130) {
          assert.ok(text.includes(moduleName), `Falta módulo completo en PDF: ${moduleName}`);
        } else {
          assert.ok(text.includes(moduleName.slice(0, 120)), `Falta prefijo de módulo extenso en PDF: ${moduleName}`);
          assert.ok(text.includes('...'), `Se esperaba elipsis de ajuste en columna para módulo extenso: ${moduleName}`);
        }
      };
      assertModuleTextInPdf(parsed22.fullText, sb.mod1.nombre);
      assertModuleTextInPdf(parsed22.fullText, sb.mod2.nombre);
      assert.ok(parsed22.fullText.includes('500'));
      assert.ok(parsed22.fullText.includes('556'));
      assert.ok(parsed22.fullText.includes('1056'));
      assert.ok(parsed22.fullText.includes('44'));
      assert.ok(parsed22.fullText.includes(regCode));

      // TMPL-23 Certificado de Egresado con horas/créditos acumulados M1 + M2
      const doc23 = sb.core.document(sb.director, { templateId: 'TMPL-23', groupId: sb.group2.id, enrollmentId: m2Row.enrollment.id, official2026: true });
      assert.equal(doc23.preflight.complete, true);
      const parsed23 = await inspectPdf(await renderPDF(ROOT, doc23, sb.director));
      assert.equal(parsed23.numPages, 1);
      assert.ok(parsed23.fullText.includes('1056 Horas'));
      assert.ok(parsed23.fullText.includes('44 Créditos'));
    } finally {
      sb.close();
    }
  }
});

test('5. Código de barras Code 39 vectorial, autogeneración de códigos/RD, historial SQLite (documentEmissions) y exclusión de sync', async () => {
  // 5a. Prueba unitaria directa de drawCode39Barcode
  const blankPdf = await PDFLib.PDFDocument.create();
  const stdFont = await blankPdf.embedFont(PDFLib.StandardFonts.Helvetica);
  const blankPage = blankPdf.addPage([400, 180]);
  const sampleCode = '000001-AT-74859612-CI26-2026';
  drawCode39Barcode(blankPage, sampleCode, { x: 50, y: 40, w: 220, h: 32 }, stdFont);
  const blankBytes = await blankPdf.save();
  const parsedBlank = await inspectPdf(blankBytes);
  assert.ok(parsedBlank.fullText.includes(`*${sampleCode}*`), 'drawCode39Barcode debe dibujar texto legible *CODE*');
  const loadedBlank = await PDFLib.PDFDocument.load(blankBytes);
  const blankStreams = decodePageContentStreams(loadedBlank, 0).join('\n');
  const expectedBars = (sampleCode.length + 2) * 5;
  const fillOps = (blankStreams.match(/\nh\nf\n/g) || []).length;
  assert.equal(fillOps, expectedBars, `Code 39 debe dibujar exactamente ${expectedBars} barras vectoriales rellenas`);

  // 5b. Prueba integral HTTP + TMPL-21 + sugerencia + documentEmissions + SHA-256 + exclusión de sync
  const sb = createDoc2026Sandbox('http-emissions', { programId: 'PROG-005', includeM2: true });
  let server = null;
  let service = null;
  try {
    const regBase = {
      ugelCode: 'UGEL-SR-2026-99001',
      registryBook: 'LIBRO 01',
      registryFolio: '001',
      registryNumber: '0001',
      registryDate: '2026-12-18',
      registryAsiento: 'ASIENTO 001',
      resolutionDate: '2026-12-18',
      expedienteNumber: 'EXP-001-2026',
      expedienteDate: '2026-12-10',
      graduationDate: '2026-12-15',
      specialtyTeacher: 'Docente Principal 2026',
    };
    const e1 = sb.addStudentTo(sb.group1, { name: 'APAZA CONDORI, Elena Marisol', document: '74859612', registry: regBase });
    const e1m2 = sb.addStudentTo(sb.group2, { name: 'APAZA CONDORI, Elena Marisol', document: '74859612', registry: regBase });
    const e2 = sb.addStudentTo(sb.group1, { name: 'CONDORI MAMANI, Pedro Luis', document: '71234567', registry: regBase });
    sb.addStudentTo(sb.group2, { name: 'CONDORI MAMANI, Pedro Luis', document: '71234567', registry: regBase });
    sb.close();

    service = createService({ root: ROOT, directory: sb.dir });
    server = service.server();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const loginDir = await httpRequest(baseUrl, 'POST', '/api/login', {
      body: { username: 'director', password: 'Director-2026-Safe!' },
    });
    assert.equal(loginDir.status, 200);
    const dirToken = loginDir.body.token;

    // Primera sugerencia -> correlativo 1
    const sug1 = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { groupId: sb.group2.id, enrollmentId: e1m2.enrollment.id, emissionYear: '2026' },
    });
    assert.equal(sug1.status, 200);
    assert.equal(sug1.body.correlative, 1);
    assert.equal(sug1.body.registerCode, '000001-AT-74859612-CI26-2026');
    assert.equal(sug1.body.resolutionNumber, '000001-2026-DCETPROMB-SM');

    // Guardar en documentSettings (registry) -> siguiente sugerencia debe subir a 2 sin colisionar
    const saveReg1 = await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
      token: dirToken,
      body: {
        scope: { kind: 'registry', target: e1m2.enrollment.id },
        fields: {
          registerCode: sug1.body.registerCode,
          resolutionNumber: sug1.body.resolutionNumber,
          referenceResolution: 'R.D. Nº 6789-2028-DUGEL-SR',
          titleEmissionDate: '2029-12-18',
        },
        rev: service.core.record('documentSettings', `registry:${e1m2.enrollment.id}`).rev,
      },
    });
    assert.equal(saveReg1.status, 200);

    // Verificar construcción dinámica de A con segmentos personalizados (diccionario de códigos)
    const customDynamicCode = DocumentSettings.buildInstitutionalRegisterCode({
      correlative: 333,
      levelCode: 'AT',
      dni: '30425346',
      programAcronym: 'CE',
      shortRef: '25',
      codeYear: '2026',
    });
    assert.equal(customDynamicCode, '000333-AT-30425346-CE25-2026');

    const sugCustom = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: {
        groupId: sb.group2.id,
        enrollmentId: e1m2.enrollment.id,
        correlative: '333',
        levelCode: 'AT',
        dni: '30425346',
        programAcronym: 'CE',
        shortRef: '25',
        codeYear: '2026',
      },
    });
    assert.equal(sugCustom.status, 200);
    assert.equal(sugCustom.body.registerCode, '000333-AT-74859612-CE25-2026');

    const sug2 = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { groupId: sb.group1.id, enrollmentId: e2.enrollment.id, emissionYear: '2026' },
    });
    assert.equal(sug2.status, 200);
    assert.equal(sug2.body.correlative, 2);
    assert.equal(sug2.body.registerCode, '000002-AT-71234567-CI26-2026');

    const duplicateCode = await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
      token: dirToken,
      body: {
        scope: { kind: 'registry', target: e2.enrollment.id },
        fields: { registerCode: '000001-AT-71234567-CI26-2026' },
        rev: service.core.record('documentSettings', 'registry:' + e2.enrollment.id).rev,
      },
    });
    assert.equal(duplicateCode.status, 409);

    const nextYear = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { groupId: sb.group1.id, enrollmentId: e2.enrollment.id, codeYear: '2029', shortRef: '07' },
    });
    assert.equal(nextYear.status, 200);
    assert.equal(nextYear.body.registerCode, '000001-AT-71234567-CI07-2029');

    // Verificar que incluso si institution.lugar tiene texto largo ("San Miguel - Juliaca, San Román, Puno"), TMPL-21 imprime "Dado en San Miguel, a los ..."
    const instRec = service.core.record('documentSettings', 'institution:institution');
    if (instRec) {
      await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
        token: dirToken,
        body: {
          scope: { kind: 'institution' },
          fields: { ...instRec.fields, lugar: 'San Miguel - Juliaca, San Román, Puno' },
          rev: instRec.rev,
        },
      });
    }

    // Emitir TMPL-21 vía POST /api/document/pdf con sug1 y verificar plantilla oficial A4, señal A (vertical + 2 reverso), señal B, señal C y SHA-256
    const doc21Res = await httpRequest(baseUrl, 'POST', '/api/document', {
      token: dirToken,
      body: { templateId: 'TMPL-21', groupId: sb.group2.id, enrollmentId: e1m2.enrollment.id, official2026: true },
    });
    assert.equal(doc21Res.status, 200);
    assert.equal(doc21Res.body.preflight.complete, true);

    const pdf21Res = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: dirToken,
      body: {
        templateId: 'TMPL-21',
        groupId: sb.group2.id,
        enrollmentId: e1m2.enrollment.id,
        official2026: true,
        fingerprint: doc21Res.body.fingerprint,
      },
    });
    assert.equal(pdf21Res.status, 200);
    assert.equal(pdf21Res.raw.subarray(0, 5).toString(), '%PDF-');
    const sha21 = crypto.createHash('sha256').update(pdf21Res.raw).digest('hex');

    // Verificar TMPL-21 página 1 (A vertical + C resolución) y página 2 (A registro + B UGEL + A pie literal, sin Code 39)
    const parsed21 = await inspectPdf(pdf21Res.raw);
    assert.equal(parsed21.numPages, 2);
    assert.ok(Math.abs(parsed21.pages[0].width - 792) < 1 && Math.abs(parsed21.pages[0].height - 612) < 1, 'TMPL-21 debe conservar tamaño horizontal 792x612 exacto');
    assert.ok(Math.abs(parsed21.pages[1].width - 792) < 1 && Math.abs(parsed21.pages[1].height - 612) < 1, 'Reverso TMPL-21 debe conservar tamaño horizontal 792x612 exacto');

    const p1VertItems = parsed21.pages[0].items.filter(
      it => it.x >= 725 && it.y >= 430 && Math.abs(it.tr[0]) < 0.01 && Math.abs(it.tr[1]) > 4
    );
    const p1VertText = p1VertItems.map(it => it.str).join('').replace(/\s+/g, '');
    assert.equal(p1VertText, sug1.body.registerCode, 'Pág. 1 debe mostrar señal A (registerCode) rotada verticalmente 90° a la derecha de la foto');

    const p1ResText = parsed21.pages[0].items
      .filter(it => it.y >= 398 && it.y <= 412)
      .map(it => it.str)
      .join(' ');
    assert.match(p1ResText, /6789-2028-DUGEL-SR/, 'Pág. 1 debe renderizar señal C (resolución de referencia)');

    assert.match(parsed21.pages[0].text, /Dado en San Miguel,\s*a los 18 días del mes de diciembre del 2029\./);
    assert.ok(!parsed21.pages[0].text.includes('San Miguel - Juliaca'), 'TMPL-21 debe conservar siempre "Dado en San Miguel, a los ..." sin texto largo de institución');
    assert.equal(parsed21.pages[0].items.filter(it => it.str === sug1.body.registerCode).length, 1);
    assert.equal(parsed21.pages[1].items.filter(it => it.str === sug1.body.registerCode).length, 2);
    assert.ok(!parsed21.pages[0].text.includes('UGEL-SR-2026-99001'));
    assert.ok(!parsed21.pages[1].text.includes('6789-2028-DUGEL-SR'));

    const p2RegTop = parsed21.pages[1].items.filter(it => it.y >= 345 && it.y <= 360).map(it => it.str).join('');
    const p2UgelRow = parsed21.pages[1].items.filter(it => it.y >= 285 && it.y <= 302).map(it => it.str).join('');
    const p2FootLeft = parsed21.pages[1].items.filter(it => it.x <= 120 && it.y >= 90 && it.y <= 115).map(it => it.str).join('');
    assert.ok(p2RegTop.includes(sug1.body.registerCode), 'Reverso debe mostrar señal A en línea de Registro Institucional');
    assert.ok(p2UgelRow.includes('UGEL-SR-2026-99001'), 'Reverso debe mostrar señal B en línea de Registro UGEL');
    assert.ok(p2FootLeft.includes(sug1.body.registerCode), 'Reverso debe repetir señal A en pie inferior izquierdo');
    assert.ok(!parsed21.pages[1].text.includes(`*${sug1.body.registerCode}*`), 'Reverso oficial TMPL-21 no debe dibujar código de barras Code 39');

    // Numeración independiente de Certificado Modular (TMPL-20): inicia en 000001 incluso si Título ya usó 000001
    const sugCert1 = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { templateId: 'TMPL-20', groupId: sb.group1.id, enrollmentId: e2.enrollment.id, emissionYear: '2026' },
    });
    assert.equal(sugCert1.status, 200);
    assert.equal(sugCert1.body.correlative, 1, 'El libro de Certificados Modulares (TMPL-20) debe iniciar en 000001 independiente de Títulos (TMPL-21)');

    // Emitir TMPL-20 Módulo I (I Semestre) vía POST /api/document/submit
    await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
      token: dirToken,
      body: {
        scope: { kind: 'registry', target: e2.enrollment.id },
        fields: {
          certRegisterCode: sugCert1.body.registerCode,
          certEmissionDate: '2026-04-10',
          certReferenceResolution: 'R.D. N° 3107-2023-DUGEL-SR',
          certInstitutionName: '',
        },
        rev: service.core.record('documentSettings', `registry:${e2.enrollment.id}`).rev,
      },
    });
    const doc20Res = await httpRequest(baseUrl, 'POST', '/api/document', {
      token: dirToken,
      body: { templateId: 'TMPL-20', groupId: sb.group1.id, enrollmentId: e2.enrollment.id, official2026: true },
    });
    assert.equal(doc20Res.status, 200);
    assert.equal(doc20Res.body.preflight.complete, true);
    const submitRes = await httpRequest(baseUrl, 'POST', '/api/document/submit', {
      token: dirToken,
      body: {
        templateId: 'TMPL-20',
        groupId: sb.group1.id,
        enrollmentId: e2.enrollment.id,
        official2026: true,
        fingerprint: doc20Res.body.fingerprint,
      },
    });
    assert.equal(submitRes.status, 200);
    const submittedBytesRes = await httpRequest(baseUrl, 'POST', '/api/document/submission-pdf', {
      token: dirToken,
      body: { id: submitRes.body.id },
    });
    assert.equal(submittedBytesRes.status, 200);
    const sha20 = crypto.createHash('sha256').update(submittedBytesRes.raw).digest('hex');

    // Verificar PDF oficial de TMPL-20 M1 (842.04x595.32, sumas exactas 20 cr / 528 h, códigos literales sin barras, San Miguel, CETPRO Micaela Bastidas)
    const parsed20M1 = await inspectPdf(submittedBytesRes.raw);
    assert.equal(parsed20M1.numPages, 2);
    assert.ok(Math.abs(parsed20M1.pages[0].width - 842.04) < 1 && Math.abs(parsed20M1.pages[0].height - 595.32) < 1);
    assert.ok(Math.abs(parsed20M1.pages[1].width - 842.04) < 1 && Math.abs(parsed20M1.pages[1].height - 595.32) < 1);
    const expectedM1Credits = doc20Res.body.units.reduce((s, u) => s + (Number(u.credits) || 0), 0) + (Number(doc20Res.body.efsrtUnit?.credits) || 0);
    const expectedM1Hours = doc20Res.body.units.reduce((s, u) => s + (Number(u.hours) || 0), 0) + (Number(doc20Res.body.module?.efsrtHours ?? doc20Res.body.efsrtUnit?.hours) || 0);
    assert.match(parsed20M1.pages[0].text, new RegExp(`total de ${expectedM1Credits} créditos`));
    assert.match(parsed20M1.pages[0].text, new RegExp(`Equivalente a ${expectedM1Hours} Horas\\s*[-–]\\s*I Semestre\\.`));
    assert.match(parsed20M1.pages[0].text, /San Miguel 10 de abril del 2026/);
    assert.equal(parsed20M1.pages[0].items.filter(it => it.str === sugCert1.body.registerCode).length, 2, 'Anverso TMPL-20 debe incluir el código horizontal centrado y vertical rotado 90°');
    assert.ok(!parsed20M1.pages[0].text.includes(`*${sugCert1.body.registerCode}*`), 'Certificado TMPL-20 no debe incluir código de barras');
    assert.match(parsed20M1.pages[1].text, /EMPRESA TECNOLÓGICA SAN ROMÁN S\.A\.C\./);

    // También sugerir y previsualizar Certificado Módulo II (II Semestre) para el estudiante e1m2 con correlativo 000002
    const sugCert2 = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { templateId: 'TMPL-20', groupId: sb.group2.id, enrollmentId: e1m2.enrollment.id, emissionYear: '2026' },
    });
    assert.equal(sugCert2.status, 200);
    assert.equal(sugCert2.body.correlative, 2);
    await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
      token: dirToken,
      body: {
        scope: { kind: 'registry', target: e1m2.enrollment.id },
        fields: {
          certRegisterCode: sugCert2.body.registerCode,
          certEmissionDate: '2026-12-18',
          certReferenceResolution: 'R.D. N° 3107-2023-DUGEL-SR',
          certInstitutionName: 'EMPRESA ALIADA DEL SUR',
        },
        rev: service.core.record('documentSettings', `registry:${e1m2.enrollment.id}`)?.rev || null,
      },
    });
    const doc20M2Res = await httpRequest(baseUrl, 'POST', '/api/document', {
      token: dirToken,
      body: { templateId: 'TMPL-20', groupId: sb.group2.id, enrollmentId: e1m2.enrollment.id, official2026: true },
    });
    assert.equal(doc20M2Res.status, 200);
    assert.equal(doc20M2Res.body.preflight.complete, true);
    const pdf20M2Res = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: dirToken,
      body: {
        templateId: 'TMPL-20',
        groupId: sb.group2.id,
        enrollmentId: e1m2.enrollment.id,
        official2026: true,
        fingerprint: doc20M2Res.body.fingerprint,
      },
    });
    assert.equal(pdf20M2Res.status, 200);
    const parsed20M2 = await inspectPdf(pdf20M2Res.raw);
    assert.match(parsed20M2.pages[0].text, /Equivalente a 528 Horas\s*[-–]\s*II Semestre\./);
    assert.match(parsed20M2.pages[1].text, /EMPRESA ALIADA DEL SUR/);

    // Verificar persistencia en SQLite (documentEmissions) y filtros GET /api/document/emissions
    const emAll = await httpRequest(baseUrl, 'GET', '/api/document/emissions', { token: dirToken });
    assert.equal(emAll.status, 200);
    assert.equal(emAll.body.length, 3);
    const rec21 = emAll.body.find(r => r.templateId === 'TMPL-21');
    const rec20 = emAll.body.find(r => r.templateId === 'TMPL-20' && r.enrollmentId === e2.enrollment.id);
    const rec20M2 = emAll.body.find(r => r.templateId === 'TMPL-20' && r.enrollmentId === e1m2.enrollment.id);
    assert.ok(rec21 && rec20 && rec20M2);
    assert.equal(rec21.correlative, '000001');
    assert.equal(rec20.correlative, '000001');
    assert.equal(rec20M2.correlative, '000002');
    assert.equal(rec21.titleSnapshot?.correlative, '000001');
    assert.equal(rec21.pdfHash, sha21);
    assert.equal(rec21.official2026, true);
    assert.equal(rec21.meta.source, '/api/document/pdf');
    assert.equal(rec20.pdfHash, sha20);
    assert.equal(rec20.meta.source, '/api/document/submit');

    const emByTmpl = await httpRequest(baseUrl, 'GET', '/api/document/emissions?templateId=TMPL-21', { token: dirToken });
    assert.equal(emByTmpl.body.length, 1);
    assert.equal(emByTmpl.body[0].id, rec21.id);

    const emByGroup = await httpRequest(baseUrl, 'GET', `/api/document/emissions?groupId=${encodeURIComponent(sb.group1.id)}`, { token: dirToken });
    assert.equal(emByGroup.body.length, 1);
    assert.equal(emByGroup.body[0].id, rec20.id);

    const emByEnr = await httpRequest(baseUrl, 'GET', `/api/document/emissions?enrollmentId=${encodeURIComponent(e1m2.enrollment.id)}`, { token: dirToken });
    assert.equal(emByEnr.body.length, 2);

    const emByStudent = await httpRequest(baseUrl, 'GET', `/api/document/emissions?studentId=${encodeURIComponent(e1.student.id)}`, { token: dirToken });
    assert.equal(emByStudent.body.length, 2);

    const emByYear = await httpRequest(baseUrl, 'GET', '/api/document/emissions?year=2026', { token: dirToken });
    assert.equal(emByYear.body.length, 3);

    // Siguiente sugerencia en libro de Certificados debe subir a 3, mientras que libro de Títulos sigue en 2
    const sugCertNext = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { templateId: 'TMPL-20', groupId: sb.group1.id, enrollmentId: e1.enrollment.id, emissionYear: '2026' },
    });
    assert.equal(sugCertNext.status, 200);
    assert.equal(sugCertNext.body.correlative, 3, 'El libro de Certificados debe avanzar a 000003 sin afectar al libro de Títulos');
    const sugTitleNext = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: dirToken,
      body: { templateId: 'TMPL-21', groupId: sb.group1.id, enrollmentId: e1.enrollment.id, emissionYear: '2026', forceNext: true },
    });
    assert.equal(sugTitleNext.status, 200);
    assert.equal(sugTitleNext.body.correlative, 2, 'El libro de Títulos debe seguir en 000002 aunque existan certificados 000001 y 000002');

    // Verificar que documentEmissions NO se expone en paquetes de sincronización ni sync-modules
    assert.equal(matchesSyncModule('documentEmissions', {}, 'config'), false);
    assert.equal(matchesSyncModule('documentEmissions', {}, 'enrollments'), false);
    assert.equal(matchesSyncModule('documentEmissions', {}, 'grades'), false);
    assert.equal(matchesSyncModule('documentEmissions', {}, 'attendance'), false);

    const exRes = await httpRequest(baseUrl, 'POST', '/api/exchange/export', {
      token: dirToken,
      body: { groupId: sb.group2.id, syncModule: 'all', passphrase: 'Exchange-Pass-2026!' },
    });
    assert.equal(exRes.status, 200);
    assert.equal(exRes.body.summary?.counts?.documentEmissions, undefined);
    assert.equal(JSON.stringify(exRes.body).includes(rec21.id), false);
    assert.equal(JSON.stringify(exRes.body).includes(sha21), false);

    // Desencriptar explícitamente el envelope del exchangePackage para asegurar que no contiene documentEmissions
    const env = exRes.body.body.envelope;
    const decKey = crypto.scryptSync('Exchange-Pass-2026!', env.salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', decKey, Buffer.from(env.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(env.tag, 'hex'));
    const decText = Buffer.concat([decipher.update(Buffer.from(env.data, 'base64')), decipher.final()]).toString('utf8');
    const decPayload = JSON.parse(decText);
    assert.ok(Array.isArray(decPayload.operations));
    assert.equal(decPayload.operations.some(op => op.body?.entity === 'documentEmissions'), false);
    assert.equal(decText.includes(rec21.id), false);
    assert.equal(decText.includes(sha21), false);

    // Eliminar emisión rec21 del historial debe liberar su correlativo (000001) para volver a emitir sin colisión
    const del21Res = await httpRequest(baseUrl, 'POST', '/api/document/emissions/delete', {
      token: dirToken,
      body: { id: rec21.id },
    });
    assert.equal(del21Res.status, 200);
    assert.equal(del21Res.body.deleted, true);
    assert.equal(del21Res.body.id, rec21.id);
    assert.equal(del21Res.body.freedCorrelative, '000001');

    const emAfterDelete = await httpRequest(baseUrl, 'GET', '/api/document/emissions', { token: dirToken });
    assert.equal(emAfterDelete.status, 200);
    assert.equal(emAfterDelete.body.some(r => r.id === rec21.id), false, 'El título eliminado no debe seguir en el historial');

    const reuseCorrelativeRes = await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
      token: dirToken,
      body: {
        scope: { kind: 'registry', target: e2.enrollment.id },
        fields: {
          registerCode: `000001-AT-${e2.student.documentNumber}-CO26-2026`,
          ugelCode: '000001-AT-103-CO26-2026',
        },
        rev: service.core.record('documentSettings', `registry:${e2.enrollment.id}`).rev,
      },
    });
    assert.equal(reuseCorrelativeRes.status, 200, 'El correlativo 000001 liberado tras eliminar debe poder reutilizarse');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (service) service.core.close();
  }
});

test('6. Pruebas negativas (Fail-Closed & RBAC): ugelCode faltante, trayectoria incompleta, SECRETARIA, DOCENTE y fingerprint 409', async () => {
  // 6a. TMPL-21 sin ugelCode + TMPL-22/23 solo M1 + TMPL-23 totalHours === 0
  const sbOnlyM1 = createDoc2026Sandbox('fail-closed-m1', { programId: 'PROG-005', includeM2: false });
  try {
    const row = sbOnlyM1.addStudentTo(sbOnlyM1.group1, {
      name: 'MAMANI QUISPE, Rosa Elena',
      document: '75112233',
      registry: {
        registerCode: '000001-AT-75112233-CI26-2026',
        registryBook: 'LIBRO 01',
        registryFolio: '001',
        registryNumber: '0001',
        registryDate: '2026-12-18',
        registryAsiento: 'ASIENTO 001',
        resolutionNumber: '000001-2026-DCETPROMB-SM',
        resolutionDate: '2026-12-18',
        expedienteNumber: 'EXP-001-2026',
        expedienteDate: '2026-12-10',
        graduationDate: '2026-12-15',
        specialtyTeacher: 'Docente Principal 2026',
      },
    });

    const doc21NoUgel = sbOnlyM1.core.document(sbOnlyM1.director, {
      templateId: 'TMPL-21',
      groupId: sbOnlyM1.group1.id,
      enrollmentId: row.enrollment.id,
      official2026: true,
    });
    assert.equal(doc21NoUgel.preflight.complete, false);
    assert.ok(doc21NoUgel.preflight.missing.some(m => m.key === 'document.ugelCode'), 'Debe faltar document.ugelCode');

    const doc22OnlyM1 = sbOnlyM1.core.document(sbOnlyM1.director, {
      templateId: 'TMPL-22',
      groupId: sbOnlyM1.group1.id,
      enrollmentId: row.enrollment.id,
      official2026: true,
    });
    assert.equal(doc22OnlyM1.preflight.complete, false);
    assert.ok(doc22OnlyM1.preflight.missing.some(m => m.key === 'program.trajectory'));
    assert.ok(doc22OnlyM1.preflight.missing.some(m => m.key === 'program.totalHours'));

    const doc23OnlyM1 = sbOnlyM1.core.document(sbOnlyM1.director, {
      templateId: 'TMPL-23',
      groupId: sbOnlyM1.group1.id,
      enrollmentId: row.enrollment.id,
      official2026: true,
    });
    assert.equal(doc23OnlyM1.preflight.complete, false);
    assert.ok(doc23OnlyM1.preflight.missing.some(m => m.key === 'program.trajectory'));
    assert.ok(doc23OnlyM1.preflight.missing.some(m => m.key === 'program.totalHours'));
  } finally {
    sbOnlyM1.close();
  }

  const sbZeroHours = createDoc2026Sandbox('fail-closed-zero-hours', {
    programId: 'PROG-005',
    includeM2: true,
    m1Hours: 0,
    m1Credits: 0,
    m2Hours: 0,
    m2Credits: 0,
  });
  try {
    const reg = {
      graduationDate: '2026-12-15',
      specialtyTeacher: 'Docente Principal 2026',
    };
    sbZeroHours.addStudentTo(sbZeroHours.group1, { name: 'TICONA APAZA, Marco Antonio', document: '76223344', registry: reg });
    const m2Row = sbZeroHours.addStudentTo(sbZeroHours.group2, { name: 'TICONA APAZA, Marco Antonio', document: '76223344', registry: reg });
    const doc23Zero = sbZeroHours.core.document(sbZeroHours.director, {
      templateId: 'TMPL-23',
      groupId: sbZeroHours.group2.id,
      enrollmentId: m2Row.enrollment.id,
      official2026: true,
    });
    assert.equal(doc23Zero.trajectory.hasBothModules, true);
    assert.equal(doc23Zero.trajectory.totalHours, 0);
    assert.equal(doc23Zero.preflight.complete, false);
    assert.ok(doc23Zero.preflight.missing.some(m => m.key === 'program.trajectory'));
    assert.ok(doc23Zero.preflight.missing.some(m => m.key === 'program.totalHours'));
  } finally {
    sbZeroHours.close();
  }

  // 6b. RBAC HTTP (SECRETARIA, DOCENTE, aislamiento de emisiones, y fingerprint 409)
  const sbHttp = createDoc2026Sandbox('rbac-http', { programId: 'PROG-005', includeM2: true });
  let server = null;
  let service = null;
  try {
    const mod1 = sbHttp.mod1;
    const otherGroup = sbHttp.core.saveGroup(sbHttp.director, {
      name: 'OTRO-AULA-B',
      programId: sbHttp.program.id,
      moduleId: mod1.id,
      periodId: '2026-I',
      units: ['UD1', 'UD2', 'EFSRT'],
      section: 'B',
      turno: 'TARDE',
    });
    const otherTeacherRow = sbHttp.core.saveUser(sbHttp.director, {
      username: 'docente.otro',
      password: 'Docente-Otro-2026!',
      name: 'Docente Otro',
      role: 'DOCENTE',
      assignments: [{ groupId: otherGroup.id, units: otherGroup.units }],
    });
    const otherDocente = sbHttp.core.user(otherTeacherRow.id);

    const fullReg = {
      registerCode: '000001-AT-74998877-CI26-2026',
      ugelCode: 'UGEL-SR-2026-88001',
      registryBook: 'LIBRO 01',
      registryFolio: '010',
      registryNumber: '0010',
      registryDate: '2026-12-18',
      registryAsiento: 'ASIENTO 010',
      resolutionNumber: '000001-2026-DCETPROMB-SM',
      resolutionDate: '2026-12-18',
      expedienteNumber: 'EXP-010-2026',
      expedienteDate: '2026-12-10',
      graduationDate: '2026-12-15',
      specialtyTeacher: 'Docente Principal 2026',
    };
    const eMain1 = sbHttp.addStudentTo(sbHttp.group1, { name: 'QUISPE MAMANI, Sofía Beatriz', document: '74998877', registry: fullReg });
    const eMain2 = sbHttp.addStudentTo(sbHttp.group2, { name: 'QUISPE MAMANI, Sofía Beatriz', document: '74998877', registry: fullReg });
    const eOther = sbHttp.addStudentTo(otherGroup, { name: 'FLORES HUANCA, Diego Armando', document: '73445566', withGrades: false });
    sbHttp.core.saveAcademic(otherDocente, 'grades', {
      groupId: otherGroup.id,
      unit: 'UD1',
      rows: [{ enrollmentId: eOther.enrollment.id, indicator: 'RESULTADO_UD', value: 16 }],
    });
    sbHttp.close();

    service = createService({ root: ROOT, directory: sbHttp.dir });
    server = service.server();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const dirToken = (await httpRequest(baseUrl, 'POST', '/api/login', { body: { username: 'director', password: 'Director-2026-Safe!' } })).body.token;
    const secToken = (await httpRequest(baseUrl, 'POST', '/api/login', { body: { username: 'secretaria.qa', password: 'Secretaria-2026-Safe!' } })).body.token;
    const docToken = (await httpRequest(baseUrl, 'POST', '/api/login', { body: { username: 'docente.qa', password: 'Docente-2026-Safe!' } })).body.token;
    const docOtherToken = (await httpRequest(baseUrl, 'POST', '/api/login', { body: { username: 'docente.otro', password: 'Docente-Otro-2026!' } })).body.token;

    // SECRETARIA bloqueada (403) en TMPL-21, TMPL-22 y campos registrales de DIRECTOR
    for (const tmpl of ['TMPL-21', 'TMPL-22']) {
      const rPreview = await httpRequest(baseUrl, 'POST', '/api/document', {
        token: secToken,
        body: { templateId: tmpl, groupId: sbHttp.group2.id, enrollmentId: eMain2.enrollment.id, official2026: true },
      });
      assert.equal(rPreview.status, 403, `SECRETARIA debe recibir 403 en preview ${tmpl}`);
      const rPdf = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
        token: secToken,
        body: { templateId: tmpl, groupId: sbHttp.group2.id, enrollmentId: eMain2.enrollment.id, official2026: true },
      });
      assert.equal(rPdf.status, 403, `SECRETARIA debe recibir 403 en pdf ${tmpl}`);
    }
    for (const fieldName of ['registerCode', 'ugelCode', 'resolutionNumber']) {
      const rReg = await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
        token: secToken,
        body: {
          scope: { kind: 'registry', target: eMain2.enrollment.id },
          fields: { [fieldName]: 'INTENTO-SECRETARIA' },
          rev: service.core.record('documentSettings', `registry:${eMain2.enrollment.id}`).rev,
        },
      });
      assert.equal(rReg.status, 403, `SECRETARIA debe recibir 403 al editar ${fieldName}`);
    }

    // SECRETARIA autorizada (200) en TMPL-20 y TMPL-23
    for (const [tmpl, grpId, enrId] of [
      ['TMPL-20', sbHttp.group1.id, eMain1.enrollment.id],
      ['TMPL-23', sbHttp.group2.id, eMain2.enrollment.id],
    ]) {
      const okPreview = await httpRequest(baseUrl, 'POST', '/api/document', {
        token: secToken,
        body: { templateId: tmpl, groupId: grpId, enrollmentId: enrId, official2026: true },
      });
      assert.equal(okPreview.status, 200, `SECRETARIA autorizada en ${tmpl}`);
      const okPdf = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
        token: secToken,
        body: { templateId: tmpl, groupId: grpId, enrollmentId: enrId, official2026: true, fingerprint: okPreview.body.fingerprint },
      });
      assert.equal(okPdf.status, 200, `SECRETARIA debe poder emitir PDF ${tmpl}`);
      assert.equal(okPdf.raw.subarray(0, 5).toString(), '%PDF-');
    }

    // DOCENTE bloqueado (403) en TMPL-20..23 y en POST /api/document/register-code/suggest
    for (const tmpl of ['TMPL-20', 'TMPL-21', 'TMPL-22', 'TMPL-23']) {
      const rDoc = await httpRequest(baseUrl, 'POST', '/api/document', {
        token: docToken,
        body: { templateId: tmpl, groupId: sbHttp.group1.id, enrollmentId: eMain1.enrollment.id, official2026: true },
      });
      assert.equal(rDoc.status, 403, `DOCENTE debe recibir 403 en ${tmpl}`);
      const rPdf = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
        token: docToken,
        body: { templateId: tmpl, groupId: sbHttp.group1.id, enrollmentId: eMain1.enrollment.id, official2026: true },
      });
      assert.equal(rPdf.status, 403, `DOCENTE debe recibir 403 en PDF ${tmpl}`);
    }
    const rSug = await httpRequest(baseUrl, 'POST', '/api/document/register-code/suggest', {
      token: docToken,
      body: { groupId: sbHttp.group1.id, enrollmentId: eMain1.enrollment.id, emissionYear: '2026' },
    });
    assert.equal(rSug.status, 403, 'DOCENTE debe recibir 403 en suggest');

    const dirDelProbe = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: dirToken,
      body: { templateId: 'TMPL-11', groupId: sbHttp.group1.id },
    });
    assert.equal(dirDelProbe.status, 200);
    const emListDir = await httpRequest(baseUrl, 'GET', '/api/document/emissions', { token: dirToken });
    const targetDelId = emListDir.body[0]?.id;
    assert.ok(targetDelId);
    const rDelDocente = await httpRequest(baseUrl, 'POST', '/api/document/emissions/delete', {
      token: docToken,
      body: { id: targetDelId },
    });
    assert.equal(rDelDocente.status, 403, 'DOCENTE no debe poder eliminar emisiones del historial');

    // Aislamiento de emisiones entre docentes, roles y grupos
    const dirEm = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: dirToken,
      body: { templateId: 'TMPL-11', groupId: sbHttp.group1.id },
    });
    assert.equal(dirEm.status, 200);
    const t1Em = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: docToken,
      body: { templateId: 'TMPL-11', groupId: sbHttp.group1.id },
    });
    assert.equal(t1Em.status, 200);
    const t2Em = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: docOtherToken,
      body: { templateId: 'TMPL-11', groupId: otherGroup.id },
    });
    assert.equal(t2Em.status, 200);

    const listT1 = await httpRequest(baseUrl, 'GET', '/api/document/emissions', { token: docToken });
    assert.equal(listT1.status, 200);
    assert.equal(listT1.body.length, 1, 'docente.qa solo debe ver su propia emisión');
    assert.equal(listT1.body[0].groupId, sbHttp.group1.id);
    assert.equal(listT1.body[0].templateId, 'TMPL-11');

    const listT2 = await httpRequest(baseUrl, 'GET', '/api/document/emissions', { token: docOtherToken });
    assert.equal(listT2.status, 200);
    assert.equal(listT2.body.length, 1, 'docente.otro solo debe ver su propia emisión');
    assert.equal(listT2.body[0].groupId, otherGroup.id);

    // POST /api/document/pdf con fingerprint desactualizado devuelve 409
    const previewBefore = await httpRequest(baseUrl, 'POST', '/api/document', {
      token: dirToken,
      body: { templateId: 'TMPL-21', groupId: sbHttp.group2.id, enrollmentId: eMain2.enrollment.id, official2026: true },
    });
    assert.equal(previewBefore.status, 200);
    const staleFingerprint = previewBefore.body.fingerprint;

    const mutateReg = await httpRequest(baseUrl, 'POST', '/api/document/configuration', {
      token: dirToken,
      body: {
        scope: { kind: 'registry', target: eMain2.enrollment.id },
        fields: { ugelCode: 'UGEL-SR-2026-ACTUALIZADO' },
        rev: service.core.record('documentSettings', `registry:${eMain2.enrollment.id}`).rev,
      },
    });
    assert.equal(mutateReg.status, 200);

    const conflictPdf = await httpRequest(baseUrl, 'POST', '/api/document/pdf', {
      token: dirToken,
      body: {
        templateId: 'TMPL-21',
        groupId: sbHttp.group2.id,
        enrollmentId: eMain2.enrollment.id,
        official2026: true,
        fingerprint: staleFingerprint,
      },
    });
    assert.equal(conflictPdf.status, 409, 'Fingerprint desactualizado debe devolver 409');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (service) service.core.close();
  }
});
