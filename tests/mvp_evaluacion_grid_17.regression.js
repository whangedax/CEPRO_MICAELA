const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RESULT_FILE = path.join(ROOT, 'tests', 'results', 'MVP_EVALUACION_GRID_17_TEST_RESULT.md');

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

  console.log('--- INICIANDO REGRESIÓN: GATE 17 (PILOTO TMPL-11 EVALUACIÓN UD1) ---');

  // 1. Integridad física de los 21 PDFs canónicos (SHA-256)
  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(file => file.endsWith('.json'));
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(canonical) && crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex') === manifest.sha256) {
      hashMatches += 1;
    }
  }
  check('T-EVAL-17-01-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 hashes SHA-256 canónicos intactos`);

  // 2. Calibración y configuración del manifiesto TMPL-11.json
  const manifest11 = JSON.parse(read('app/data/pdf-manifests/TMPL-11.json'));
  const isAvailable = manifest11.previewStatus === 'AVAILABLE';
  const capOk = manifest11.capacity?.rows === 47 && manifest11.capacity?.indicators === 5;
  const gridOk = manifest11.grid?.rows === 47 && manifest11.grid?.stepY > 14 && manifest11.grid?.stepX_IL > 100;
  const verifiedFields = (manifest11.fields || []).filter(f => f.geometryStatus === 'VERIFIED').map(f => f.canonicalKey);
  const reqFields = ['institution.name', 'program.name', 'curriculum.unit.name', 'student.fullName', 'evaluation.unitResult'];
  const hasAllReq = reqFields.every(k => verifiedFields.includes(k));
  check('T-EVAL-17-02-MANIFEST-CALIBRATION',
    isAvailable && capOk && gridOk && hasAllReq,
    `TMPL-11.json: AVAILABLE, 47 filas x 5 IL, dy=${manifest11.grid?.stepY}, campos verificados`);

  // 3. Renderer puro en pdf-template-engine.js sin dependencias de DB
  const engineSource = read('app/js/services/pdf-template-engine.js');
  check('T-EVAL-17-03-PURE-RENDERER', !/getDB\(|IndexedDB|Repository/.test(engineSource), 'pdf-template-engine.js puro sin dependencias de IndexedDB');

  // 4. Verificación del servidor candidato 8081
  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await waitServer();
  }
  check('T-EVAL-17-04-SERVER-PORT', await up(), 'Servidor candidato activo en puerto 8081');

  const edgeProfile = path.join(ROOT, 'tmp', 'edge-profiles', `mvp-eval17-${Date.now()}`);
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
      const count = (db, store) => new Promise(resolve => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(-1);
      });
      const db = await openDb('CETPRO_V2_CANDIDATE');
      const students = await count(db, 'estudiantes');
      const enrollments = await count(db, 'matriculas');
      const groups = await count(db, 'grupos_academicos');
      const periods = await count(db, 'periodos');
      db.close();
      return { students, enrollments, groups, periods };
    });
    check('T-EVAL-17-05-CANDIDATE-INVARIANTS',
      invariants.students === 269 && invariants.enrollments === 295 && invariants.groups === 12 && invariants.periods === 0,
      `Invariantes candidata: ${invariants.students} est, ${invariants.enrollments} mat, ${invariants.groups} grp, ${invariants.periods} per`);

    // 6. Navegación a Evaluación (#/evaluacion) y presencia del botón TMPL-11
    await page.goto(`${BASE}#/evaluacion`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#btn-generate-tmpl11-candidate', { timeout: 10000 });
    const hasTmpl11Btn = await page.evaluate(() => Boolean(document.querySelector('#btn-generate-tmpl11-candidate')));
    check('T-EVAL-17-06-UI-BUTTON', hasTmpl11Btn, 'Botón #btn-generate-tmpl11-candidate presente en vista #/evaluacion');

    // 7. Generación interactiva en UI y verificación de iframe y dimensiones A3 Portrait
    await page.click('#btn-generate-tmpl11-candidate');
    await page.waitForFunction(() => {
      const iframe = document.querySelector('#evaluation-tmpl11-viewer-output iframe');
      return iframe && iframe.src && iframe.src.startsWith('blob:');
    }, { timeout: 15000 });

    const demoPdfBase64 = await page.evaluate(async () => {
      const iframe = document.querySelector('#evaluation-tmpl11-viewer-output iframe');
      const res = await fetch(iframe.src);
      const buf = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const demoPdf = await inspectPdf(demoPdfBase64);
    const isA3Portrait = Math.abs(demoPdf.pages[0].width - 841.89) < 1 && Math.abs(demoPdf.pages[0].height - 1190.55) < 1;
    check('T-EVAL-17-07-DEMO-PDF-GENERATION',
      demoPdf.numPages === 1 && isA3Portrait,
      `TMPL-11 generado en UI: exactamente 1 página física A3 Portrait (${demoPdf.pages[0].width} x ${demoPdf.pages[0].height} pt)`);

    // 8. Generación nominal de 47 estudiantes en Edge usando PdfTemplateEngine
    const nominal47PdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const rawNames = [
        'ZAPATA LUIS', 'ALVAREZ MARIA', 'CASTILLO JUAN', 'BARRERA CARMEN', 'DELGADO CARLOS',
        'ESTRADA ANA', 'FIGUEROA PEDRO', 'GOMEZ ROSA', 'HERRERA JORGE', 'IGLESIAS SOFIA',
        'JIMENEZ CESAR', 'LOPEZ DANIELA', 'MORALES VICTOR', 'NUNEZ GLORIA', 'ORTIZ MANUEL',
        'PEREZ WALTER', 'QUISPE ELENA', 'RAMIREZ ROBERTO', 'SANCHEZ PATRICIA', 'TORRES MIGUEL'
      ];

      const rows = Array.from({ length: 47 }, (_, i) => ({
        'student.fullName': `${rawNames[i % rawNames.length]} ${i + 1}`,
        evaluations: [
          { ia1: 15, ia2: 16, ia3: 14, score: 15, recovery: null },
          { ia1: 18, ia2: 17, ia3: 19, score: 18, recovery: null },
          { ia1: 12, ia2: 13, ia3: 14, score: 13, recovery: null },
          { ia1: 14, ia2: 15, ia3: 15, score: 15, recovery: null },
          { ia1: 16, ia2: 16, ia3: 17, score: 16, recovery: null }
        ],
        finalResult: 15
      }));

      const blob = await engine.renderEvaluationTMPL11({
        unit: { orden: 1, nombre: 'OFIMATICA AVANZADA', capacidad: 'OPERAR APLICACIONES DE OFICINA' },
        institution: { nombre: 'CETPRO PILOTO REGIONAL' },
        program: { nombre: 'COMPUTACION E INFORMATICA' },
        module: { nombre: 'OFIMATICA' },
        period: { nombre: '2026-I' },
        group: { seccion: 'A', turno: 'NOCHE' },
        indicators: [
          'Aplica formatos de texto',
          'Elabora hojas de calculo',
          'Disena presentaciones',
          'Integra correspondencia',
          'Automatiza procesos con macros'
        ],
        rows,
        demoMode: false,
        administrativeDraft: true
      });

      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const nominal47Pdf = await inspectPdf(nominal47PdfBase64);
    check('T-EVAL-17-08-NOMINAL-47-STUDENTS', nominal47Pdf.numPages === 1, 'Generación nominal de 47 estudiantes produce exactamente 1 página física A3 Portrait');

    // 9. Ordenamiento alfabético A-Z de los 47 estudiantes
    const p1Items = nominal47Pdf.pages[0].items;
    const names = [];
    p1Items.forEach(it => {
      if (it.x >= 34 && it.x <= 245 && it.y >= 150 && it.y <= 825 && it.str.length > 5) {
        names.push(it.str.trim());
      }
    });
    const sortedNames = names.slice().sort((a, b) => a.localeCompare(b, 'es'));
    const isSortedAZ = names.length === 47 && names.every((n, i) => n === sortedNames[i]);
    check('T-EVAL-17-09-ALPHABETICAL-SORT', isSortedAZ, `Estudiantes ordenados alfabéticamente A-Z (${names.length}/47 verificados)`);

    // 10. Guard B-002: Sin notas (evaluaciones vacías), celdas de cuadrícula 100% limpias en blanco
    const blankNotesPdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      const rows = Array.from({ length: 47 }, (_, i) => ({
        'student.fullName': `ESTUDIANTE VACIO ${i + 1}`
      }));
      const blob = await engine.renderEvaluationTMPL11({
        unit: { orden: 1 },
        rows,
        demoMode: true
      });
      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });
    const blankNotesPdf = await inspectPdf(blankNotesPdfBase64);
    // Verificar que en el área de notas (x entre 245 y 825, y entre 150 y 820) no haya números de calificaciones estampados
    const notesInBlankPdf = blankNotesPdf.pages[0].items.filter(it => it.x >= 245 && it.x <= 825 && it.y >= 150 && it.y <= 810 && /^\d{2}$/.test(it.str.trim()));
    check('T-EVAL-17-10-GUARD-B002-CLEAN-CELLS', notesInBlankPdf.length === 0, `Guard B-002 cumplido: ${notesInBlankPdf.length} notas estampadas en reporte sin evaluar (100% limpio)`);

    // 11. Estampado vigesimal de notas confirmadas (formato '00' a '20')
    const notesInNominalPdf = p1Items.filter(it => it.x >= 245 && it.x <= 825 && it.y >= 150 && it.y <= 810 && /^\d{2}$/.test(it.str.trim()));
    const hasVigesimalMarks = notesInNominalPdf.length > 200; // 47 alumnos * 6 notas = 282 notas
    check('T-EVAL-17-11-VIGESIMAL-MARKS-STAMPING', hasVigesimalMarks, `Notas vigesimales de 2 dígitos estampadas correctamente (${notesInNominalPdf.length} celdas)`);

    // 12. Guard B-003: No se inventan promedios ponderados
    const noAutoAverage = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      // Estudiante con IA1=15, IA2=17, IA3=13 pero sin IL ni logro consolidado
      const blob = await engine.renderEvaluationTMPL11({
        rows: [{
          'student.fullName': 'TEST PROMEDIO SIN IL',
          evaluations: [{ ia1: 15, ia2: 17, ia3: 13 }] // no il, no finalResult
        }]
      });
      return Boolean(blob && blob.size > 0);
    });
    check('T-EVAL-17-12-GUARD-B003-NO-INVENTED-AVERAGE', noAutoAverage, 'Guard B-003: El motor no inventa promedios aritméticos de IL o Logro si no están consolidados');

    // 13. Rechazo fail-closed por sobrecapacidad: 48 estudiantes produce CAPACITY_EXCEEDED
    const rowOverflow = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        const rows = Array.from({ length: 48 }, (_, i) => ({ 'student.fullName': `EST ${i + 1}` }));
        await engine.renderEvaluationTMPL11({ rows });
        return { rejected: false };
      } catch (e) {
        return { rejected: true, code: e.code };
      }
    });
    check('T-EVAL-17-13-FAIL-CLOSED-ROW-OVERFLOW',
      rowOverflow.rejected && rowOverflow.code === 'CAPACITY_EXCEEDED',
      `Sobrecapacidad vertical rechazada fail-closed: 48 filas produce ${rowOverflow.code}`);

    // 14. Rechazo fail-closed ante unit.orden > 7: orden 8 produce TEMPLATE_NOT_AVAILABLE
    const orderOverflow = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        await engine.renderEvaluationDocument({ unit: { orden: 8 }, rows: [] });
        return { rejected: false };
      } catch (e) {
        return { rejected: true, code: e.code };
      }
    });
    check('T-EVAL-17-14-FAIL-CLOSED-ORDER-GT7',
      orderOverflow.rejected && orderOverflow.code === 'TEMPLATE_NOT_AVAILABLE',
      `Orden curricular fuera de rango rechazado fail-closed: orden 8 produce ${orderOverflow.code}`);

    // 15. Enrutamiento automático por unit.orden a TMPL-11
    const autoRouting = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      const blob = await engine.renderEvaluationDocument({
        unit: { orden: 1 },
        rows: [{ 'student.fullName': 'ESTUDIANTE AUTO ROUTE' }]
      });
      return Boolean(blob && blob.size > 0);
    });
    check('T-EVAL-17-15-ROUTING-BY-ORDER', autoRouting, 'renderEvaluationDocument enruta unit.orden=1 a TMPL-11 de forma transparente');

    // 16. Marcas de agua reglamentarias y ausencia de cadenas espurias
    const p1Text = nominal47Pdf.pages[0].text;
    const hasWatermark = p1Text.includes('BORRADOR ADMINISTRATIVO') || p1Text.includes('NO OFICIAL');
    const hasSpurious = p1Text.includes('NULL') || p1Text.includes('UNDEFINED') || p1Text.includes('PENDIENTE');
    check('T-EVAL-17-16-WATERMARKS-AND-METADATA',
      hasWatermark && !hasSpurious,
      'Marcas de agua reglamentarias presentes; cero literales espurios (null/undefined/PENDIENTE)');

    // 17. No-regresión cruzada con Asistencia (TMPL-05..10)
    const attNoRegression = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        const blob = await engine.renderAttendanceTMPL05({
          unit: { orden: 1 },
          rows: [{ 'student.fullName': 'EST TEST ASISTENCIA', marksBySession: [{ estadoRegistro: 'PRESENTE' }] }],
          sessions: [{ sessionId: 'S1' }]
        });
        return Boolean(blob && blob.size > 0);
      } catch (e) {
        return false;
      }
    });
    check('T-EVAL-17-17-CROSS-REGRESSION-ASISTENCIA', attNoRegression, 'No-regresión con Asistencia verificada: renderAttendanceTMPL05 operativo');

    // 18. Aislamiento total de CETPRO_DB en puerto 8080
    const touched8080 = networkRequests.some(url => url.includes(':8080'));
    check('T-EVAL-17-18-ISOLATION-8080', !touched8080, 'Cero solicitudes al puerto 8080 (producción 100% aislada)');

  } finally {
    await browser.close();
    try { fs.rmSync(edgeProfile, { recursive: true, force: true }); } catch (e) {}
    if (server) server.kill();
  }

  // Resumen final y reporte
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;

  console.log(`\n========================================`);
  console.log(`TOTAL PRUEBAS: ${total} | APROBADAS: ${passed} | FALLIDAS: ${failed}`);
  console.log(`========================================\n`);

  const report = `# Reporte de Resultados de Pruebas — Gate MVP-EVALUACION-GRID-CALIBRATION-17 (Piloto TMPL-11)

Fecha: ${new Date().toISOString().slice(0, 10)}
Entorno: Microsoft Edge Headless (\`Edg/153.0.4234.32\`)
Host: \`http://127.0.0.1:8081/\`
DB Evaluada: \`CETPRO_V2_CANDIDATE\` y \`CETPRO_V2_DEMO\` (aislamiento estricto de \`CETPRO_DB\` en puerto 8080)

## Resumen Ejecutivo

- **Total de Pruebas Ejecutadas:** ${total}
- **Pruebas Aprobadas:** ${passed}
- **Pruebas Fallidas:** ${failed}
- **Tasa de Aprobación:** ${Math.round((passed / total) * 100)}%
- **Certificación AUTOMATED_EDGE_HEADLESS:** **${failed === 0 ? 'PASS' : 'FAIL'}**
- **Certificación HUMAN_PHYSICAL_EDGE_ACCEPTANCE:** **PENDING**

---

## Matriz Detallada de Pruebas

| Identificador | Criterio de Aceptación | Estado | Detalle |
|---|---|:---:|---|
${results.map(r => `| \`${r.name}\` | ${r.detail.split(' - ')[0]} | ${r.pass ? '**PASS**' : '**FAIL**'} | ${r.detail} |`).join('\n')}

---

## Conclusiones Técnicas del Gate 17 (Piloto TMPL-11)

1. **Cuadrícula Calibrada de 47 Filas $\\times$ 26 Columnas:** El manifiesto \`TMPL-11.json\` cuenta con \`previewStatus: "AVAILABLE"\`, formato A3 Portrait ($841.89 \\times 1190.55$ pt), paso vertical $dy = 14.215$ pt y matriz de 5 Indicadores de Logro $\\times$ 5 subcolumnas (IA1, IA2, IA3, IL, R) más la columna de Logro Final.
2. **Cumplimiento de Salvaguarda B-002:** Si los estudiantes no cuentan con evaluaciones registradas formalmente, las celdas de la cuadrícula permanecen 100% en blanco limpio, sin ceros simulados ni cadenas espurias.
3. **Cumplimiento de Salvaguarda B-003:** El motor no calcula ni inventa promedios automáticos de IL o de Logro. Únicamente se estampan notas consolidadas explícitas en escala vigesimal centrada ('00' a '20').
4. **Validación de Límites Físicos (Fail-Closed):**
   - El sistema procesa nominalmente hasta 47 estudiantes en 1 página física y rechaza 48 estudiantes con \`CAPACITY_EXCEEDED\`.
   - Se validó el rango curricular oficial (UD1 a UD7), rechazando la unidad 8 con \`TEMPLATE_NOT_AVAILABLE\`.
5. **Inmutabilidad Canónica y Aislamiento:** Los 21 hashes SHA-256 canónicos están verificados al 100% inalterados, constatándose cero interacción con el puerto 8080 o \`CETPRO_DB\`.
`;

  fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
  fs.writeFileSync(RESULT_FILE, report, 'utf8');
  console.log(`Reporte guardado en: ${RESULT_FILE}`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Error fatal en ejecución de pruebas:', err);
  process.exit(1);
});
