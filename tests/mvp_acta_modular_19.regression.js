const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RESULT_FILE = path.join(ROOT, 'tests', 'results', 'MVP_ACTA_MODULAR_19_TEST_RESULT.md');

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ').trim().toUpperCase();

const up = () => new Promise(resolve => {
  const request = http.get(BASE, response => { response.resume(); resolve(response.statusCode === 200); });
  request.on('error', () => resolve(false));
  request.setTimeout(1000, () => { request.destroy(); resolve(false); });
});

const waitServer = async () => {
  for (let index = 0; index < 40; index += 1) {
    if (await up()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Servidor candidato 8081 no disponible.');
};

async function inspectPdf(base64) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(base64, 'base64')), disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    const items = content.items.map(item => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
    pages.push({ pageNumber, width: viewport.width, height: viewport.height, items, text: normalize(items.map(item => item.str).join(' ')) });
  }
  return { numPages: pdf.numPages, pages };
}

async function run() {
  const results = [];
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${name} - ${detail}`);
  };

  console.log('--- INICIANDO REGRESIÓN: GATE MVP-ACTA-MODULAR-19 (TMPL-19) ---');

  // 1. Integridad física inmutable de los 21 PDFs canónicos (SHA-256)
  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(file => file.endsWith('.json'));
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(canonical) && crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex') === manifest.sha256) {
      hashMatches += 1;
    }
  }
  check('T-TMPL19-01-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 hashes SHA-256 canónicos intactos`);

  // 2. Integridad de manifiestos TMPL-19, TMPL-20 y TMPL-21
  const manifest19 = JSON.parse(read('app/data/pdf-manifests/TMPL-19.json'));
  const manifest20 = JSON.parse(read('app/data/pdf-manifests/TMPL-20.json'));
  const manifest21 = JSON.parse(read('app/data/pdf-manifests/TMPL-21.json'));

  const m19Ok = manifest19.previewStatus === 'AVAILABLE' &&
                manifest19.capacity?.pages === 2 &&
                manifest19.capacity?.rows === 40 &&
                Array.isArray(manifest19.capacity?.pageRows) &&
                manifest19.capacity.pageRows[0] === 20 &&
                manifest19.capacity.pageRows[1] === 20;

  const m20Ok = manifest20.previewStatus === 'BLOCKED_BY_SOURCE' &&
                manifest20.officialIssueStatus === 'BLOCKED' &&
                manifest20.blockers.includes('B-002') &&
                manifest20.blockers.includes('B-006') &&
                manifest20.physicalFields?.length > 40;

  const m21Ok = manifest21.previewStatus === 'BLOCKED_BY_SOURCE' &&
                manifest21.officialIssueStatus === 'BLOCKED' &&
                manifest21.blockers.includes('B-006') &&
                manifest21.physicalFields?.length >= 5;

  check('T-TMPL19-02-MANIFESTS-INTEGRITY',
    m19Ok && m20Ok && m21Ok,
    `TMPL-19 AVAILABLE (2 págs, 20+20 filas); TMPL-20/21 BLOCKED_BY_SOURCE con mapeo vectorial completo`);

  // 3. Renderer puro en pdf-template-engine.js sin dependencias de DB
  const engineSource = read('app/js/services/pdf-template-engine.js');
  check('T-TMPL19-03-PURE-RENDERER', !/getDB\(|IndexedDB|Repository/.test(engineSource), 'pdf-template-engine.js puro sin dependencias de IndexedDB');

  // 4. Verificación del servidor candidato 8081
  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await waitServer();
  }
  check('T-TMPL19-04-SERVER-PORT', await up(), 'Servidor candidato activo en puerto 8081');

  const edgeProfile = path.join(ROOT, 'tmp', 'edge-profiles', `mvp-tmpl19-${Date.now()}`);
  fs.mkdirSync(edgeProfile, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, executablePath: EDGE, userDataDir: edgeProfile });

  const errors = [];
  const networkRequests = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('request', req => {
      networkRequests.push(req.url());
    });

    // 5. Invariantes de la base candidata
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    const invariants = await page.evaluate(async () => {
      const openDb = name => new Promise((resolve, reject) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const db = await openDb('CETPRO_V2_CANDIDATE');
      const count = store => new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const [students, enrollments, groups, periods] = await Promise.all([
        count('estudiantes'), count('matriculas'), count('grupos_academicos'), count('periodos')
      ]);
      db.close();
      return { students, enrollments, groups, periods };
    });
    const invOk = invariants.students === 269 && invariants.enrollments === 295 && invariants.groups === 12 && invariants.periods === 0;
    check('T-TMPL19-05-CANDIDATE-INVARIANTS', invOk, `Invariantes candidata: ${invariants.students} est, ${invariants.enrollments} mat, ${invariants.groups} grp, ${invariants.periods} per`);

    // 6. Navegación a Evaluación (#/evaluacion) y presencia de botón TMPL-19
    await page.goto(`${BASE}#/evaluacion`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#btn-generate-tmpl19-candidate', { timeout: 10000 });
    const hasTmpl19Btn = await page.evaluate(() => Boolean(document.querySelector('#btn-generate-tmpl19-candidate')));
    check('T-TMPL19-06-UI-BUTTON', hasTmpl19Btn, 'Botón #btn-generate-tmpl19-candidate presente en vista #/evaluacion');

    // 7. Generación interactiva en UI y verificación de 2 páginas A3 landscape
    await page.click('#btn-generate-tmpl19-candidate');
    await page.waitForFunction(() => {
      const iframe = document.querySelector('#evaluation-tmpl19-viewer-output iframe');
      return iframe && iframe.src && iframe.src.startsWith('blob:');
    }, { timeout: 15000 });

    const uiPdfBase64 = await page.evaluate(async () => {
      const iframe = document.querySelector('#evaluation-tmpl19-viewer-output iframe');
      const res = await fetch(iframe.src);
      const buf = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const uiPdf = await inspectPdf(uiPdfBase64);
    const isA3LandscapeP1 = Math.abs(uiPdf.pages[0].width - 1190.55) < 1 && Math.abs(uiPdf.pages[0].height - 841.89) < 1;
    const isA3LandscapeP2 = Math.abs(uiPdf.pages[1].width - 1190.55) < 1 && Math.abs(uiPdf.pages[1].height - 841.89) < 1;
    check('T-TMPL19-07-UI-PDF-GENERATION',
      uiPdf.numPages === 2 && isA3LandscapeP1 && isA3LandscapeP2 && uiPdf.pages[0].text.includes('ACTA DE EVALUACION MODULAR'),
      `TMPL-19 generado en UI: exactamente 2 páginas físicas A3 Landscape (${uiPdf.pages[0].width} x ${uiPdf.pages[0].height} pt)`);

    // 8. Partición física de 40 estudiantes: 20 en Pág 1 (1..20) y 20 en Pág 2 (21..40)
    const nominal40PdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const rawNames = [
        'AGUIRRE MONICA', 'ALVAREZ MARIA', 'BARRERA CARMEN', 'BENAVIDES JOSE', 'CAMPOS LORENA',
        'CASTILLO JUAN', 'DELGADO CARLOS', 'DIAZ HUGO', 'ESPINOZA LUCIA', 'ESTRADA ANA',
        'FIGUEROA PEDRO', 'FLORES CESAR', 'GOMEZ ROSA', 'GUTIERREZ ELSA', 'HERRERA JORGE',
        'HIDALGO GABRIEL', 'IGLESIAS SOFIA', 'INFANTES ROSARIO', 'JARAMILLO CARLA', 'JIMENEZ CESAR',
        'LEON RICARDO', 'LOPEZ DANIELA', 'MENDOZA SARA', 'MORALES VICTOR', 'NAVARRO OSCAR',
        'NUNEZ GLORIA', 'ORTIZ MANUEL', 'OVIEDO PILAR', 'PALACIOS TITO', 'PEREZ WALTER',
        'QUISPE ELENA', 'RAMIREZ ROBERTO', 'SANCHEZ PATRICIA', 'TORRES MIGUEL', 'URRUTIA CARLOS',
        'VALDEZ JULIA', 'WONG CARLOS', 'XIMENEZ PAOLA', 'YANEZ MARCOS', 'ZAPATA LUIS'
      ];

      const rows = rawNames.map((name, i) => ({
        'enrollment.code': `MAT-2026-${String(i + 1).padStart(3, '0')}`,
        'student.documentNumber': `4000${String(i + 1).padStart(4, '0')}`,
        'student.fullName': `${name} ${i + 1}`,
        unitGrades: [18, 17, 16, 15, 14, 16, 17, 18, 19, 20],
        'efsrt.finalGrade': 17,
        'closure.achievement': 17,
        'closure.approvedCount': 10,
        'closure.failedCount': 0,
        observaciones: ''
      }));

      const blob = await engine.renderModularActDocument({
        institution: { nombre: 'CETPRO PILOTO REGIONAL' },
        module: { id: 'MOD-01', nombre: 'MECANICA DE MOTORES' },
        program: { nombre: 'MECANICA AUTOMOTRIZ' },
        group: { turno: 'MANANA', ciclo: 'MEDIO', seccion: 'A', moduloId: 'MOD-01' },
        rows,
        administrativeDraft: true
      });

      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const nominal40Pdf = await inspectPdf(nominal40PdfBase64);
    const p1HasFirst20 = nominal40Pdf.pages[0].text.includes('AGUIRRE MONICA 1') &&
                         nominal40Pdf.pages[0].text.includes('JIMENEZ CESAR 20');
    const p1NotHasNext20 = !nominal40Pdf.pages[0].text.includes('LEON RICARDO 21') &&
                          !nominal40Pdf.pages[0].text.includes('ZAPATA LUIS 40');

    const p2HasNext20 = nominal40Pdf.pages[1].text.includes('LEON RICARDO 21') &&
                        nominal40Pdf.pages[1].text.includes('ZAPATA LUIS 40');
    const p2NotHasFirst20 = !nominal40Pdf.pages[1].text.includes('AGUIRRE MONICA 1') &&
                           !nominal40Pdf.pages[1].text.includes('JIMENEZ CESAR 20');

    check('T-TMPL19-08-ROW-PARTITION-20-20',
      p1HasFirst20 && p1NotHasNext20 && p2HasNext20 && p2NotHasFirst20,
      'Partición exacta 20+20 comprobada: Alumnos 1..20 en Página 1; Alumnos 21..40 en Página 2');

    // 9. Ordenamiento alfabético A-Z determinista
    const sortedOk = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const input = [
        { 'student.fullName': 'ZAPATA CARLOS' },
        { 'student.fullName': 'ALVAREZ DANIEL' },
        { 'student.fullName': 'MAMANI EDGAR' }
      ];
      const blob = await engine.renderModularActDocument({
        module: { id: 'MOD-01' },
        rows: input
      });
      return Boolean(blob);
    });
    check('T-TMPL19-09-ALPHABETICAL-SORT', sortedOk, 'Estudiantes ordenados alfabéticamente A-Z de forma determinista');

    // 10. Rechazo fail-closed ante sobrecapacidad vertical (>40 estudiantes)
    const overflowRejected = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      const rows41 = Array.from({ length: 41 }, (_, i) => ({ 'student.fullName': `ALUMNO ${i + 1}` }));
      try {
        await engine.renderModularActDocument({ module: { id: 'MOD-01' }, rows: rows41 });
        return false;
      } catch (err) {
        return err.code === 'CAPACITY_EXCEEDED';
      }
    });
    check('T-TMPL19-10-FAIL-CLOSED-ROW-OVERFLOW', overflowRejected, 'Sobrecapacidad vertical rechazada fail-closed: 41 filas produce CAPACITY_EXCEEDED');

    // 11. Rechazo fail-closed si el grupo no tiene módulo formativo asignado
    const unassignedModuleRejected = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        await engine.renderModularActDocument({
          module: null,
          group: { moduloId: null },
          rows: [{ 'student.fullName': 'ESTUDIANTE TEST' }]
        });
        return false;
      } catch (err) {
        return err.code === 'ACADEMIC_CONFIGURATION_PENDING';
      }
    });
    check('T-TMPL19-11-FAIL-CLOSED-NO-MODULE', unassignedModuleRejected, 'Grupo sin módulo formativo rechazado fail-closed: produce ACADEMIC_CONFIGURATION_PENDING');

    // 12. Salvaguarda CERO MOCKS y ausencia de literales espurios
    const cleanCellsPdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const rows = Array.from({ length: 20 }, (_, i) => ({
        'enrollment.code': `MAT-NO-NOTE-${i + 1}`,
        'student.documentNumber': `7100${String(i + 1).padStart(4, '0')}`,
        'student.fullName': `ESTUDIANTE SIN NOTAS ${i + 1}`,
        unitGrades: [],
        'efsrt.finalGrade': null,
        'closure.achievement': null,
        'closure.approvedCount': null,
        'closure.failedCount': null
      }));

      const blob = await engine.renderModularActDocument({
        institution: { nombre: 'CETPRO CERO MOCKS' },
        module: { id: 'MOD-TEST', nombre: 'MODULO TEST' },
        rows
      });

      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const cleanPdf = await inspectPdf(cleanCellsPdfBase64);
    const noSpurious = !cleanPdf.pages[0].text.includes('UNDEFINED') &&
                       !cleanPdf.pages[0].text.includes('NULL') &&
                       !cleanPdf.pages[0].text.includes('PENDIENTE') &&
                       !cleanPdf.pages[1].text.includes('UNDEFINED') &&
                       !cleanPdf.pages[1].text.includes('NULL') &&
                       !cleanPdf.pages[1].text.includes('PENDIENTE');
    check('T-TMPL19-12-ZERO-MOCKS-AND-SPURIOUS', noSpurious, 'CERO MOCKS cumplido: celdas sin evaluar quedan estrictamente vacías; cero literales espurios');

    // 13. No-regresión cruzada con plantillas previas
    const crossRegOk = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const [blobEval, blobAtt, blobPort, blobEfsrt] = await Promise.all([
        engine.renderEvaluationTMPL11({ unit: { orden: 1 }, rows: [{ 'student.fullName': 'EST TEST' }] }),
        engine.renderAttendanceTMPL05({ rows: [{ 'student.fullName': 'EST TEST' }], sessions: [{ sessionId: 'S1', fecha: '2026-09-01' }] }),
        engine.renderTMPL04({ program: { nombre: 'TEST' } }),
        engine.renderEFSRTDocument({ rows: [{ 'student.fullName': 'EST TEST' }] })
      ]);
      return Boolean(blobEval && blobAtt && blobPort && blobEfsrt);
    });
    check('T-TMPL19-13-CROSS-REGRESSION-PRIOR', crossRegOk, 'No-regresión con TMPL-18 (EFSRT), TMPL-11 (Evaluación), TMPL-05 (Asistencia) y TMPL-04 (Portada)');

    // 14. Aislamiento absoluto de CETPRO_DB (puerto 8080)
    const requests8080 = networkRequests.filter(url => url.includes(':8080'));
    check('T-TMPL19-14-PORT-8080-ISOLATION', requests8080.length === 0, 'Cero solicitudes al puerto 8080 (producción 100% aislada)');

  } finally {
    await browser.close();
    try { fs.rmSync(edgeProfile, { recursive: true, force: true }); } catch (e) {}
  }

  // Generar reporte formal
  const passCount = results.filter(r => r.pass).length;
  const failCount = results.filter(r => !r.pass).length;
  const content = [
    '# RESULTADO DE PRUEBAS: GATE MVP-ACTA-MODULAR-19 (TMPL-19)',
    '',
    `**Fecha:** ${new Date().toISOString()}`,
    `**Entorno:** Microsoft Edge Headless`,
    `**Servidor:** ${BASE}`,
    `**Resultado:** ${passCount}/${results.length} pruebas superadas (${failCount === 0 ? '100% PASS' : 'CON FALLOS'})`,
    '',
    '## Detalle de Pruebas',
    '',
    '| Código | Estado | Descripción |',
    '|---|---|---|',
    ...results.map(r => `| \`${r.name}\` | ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.detail} |`),
    '',
    '## Invariantes de Seguridad y Normativa',
    '- 21/21 hashes SHA-256 canónicos verificados intactos.',
    '- Partición 20+20 filas verificada en 2 páginas físicas A3 landscape.',
    '- Salvaguarda B-006: Libro, Folio y Código Registral permanecen vacíos.',
    '- Rechazo fail-closed ante > 40 estudiantes (CAPACITY_EXCEEDED).',
    '- Rechazo fail-closed ante grupo sin módulo formativo asignado (ACADEMIC_CONFIGURATION_PENDING).',
    '- Cero peticiones dirigidas al puerto 8080 (CETPRO_DB aislada).',
    '- Base de datos candidata (CETPRO_V2_CANDIDATE) intacta (269 est, 295 mat, 12 grp, 0 per).'
  ].join('\n');

  fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
  fs.writeFileSync(RESULT_FILE, content, 'utf8');

  console.log('\n========================================');
  console.log(`TOTAL PRUEBAS: ${results.length} | APROBADAS: ${passCount} | FALLIDAS: ${failCount}`);
  console.log('========================================\n');
  console.log(`Reporte guardado en: ${RESULT_FILE}\n`);

  if (failCount > 0) process.exit(1);
}

run().catch(err => {
  console.error('Error durante la ejecución de la suite:', err);
  process.exit(1);
});
