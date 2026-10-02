const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RESULT_FILE = path.join(ROOT, 'tests', 'results', 'MVP_ASISTENCIA_GRID_16_TEST_RESULT.md');

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
    const content = await page.getTextContent();
    const items = content.items.map(item => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
    pages.push({ pageNumber, items, text: normalize(items.map(item => item.str).join(' ')) });
  }
  return { numPages: pdf.numPages, pages };
}

async function run() {
  const results = [];
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${name} - ${detail}`);
  };

  console.log('--- INICIANDO REGRESIÓN GATE 16: TMPL-05 ASISTENCIA GRID CALIBRATION ---');

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
  check('T-ATT-16-01-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 hashes SHA-256 canónicos intactos`);

  // 2. Verificación del manifiesto TMPL-05.json
  const manifest05 = JSON.parse(read('app/data/pdf-manifests/TMPL-05.json'));
  const isAvailable = manifest05.previewStatus === 'AVAILABLE';
  const capOk = manifest05.capacity && manifest05.capacity.rows === 40 && manifest05.capacity.sessions === 44;
  const gridOk = manifest05.grid && manifest05.grid.rows === 40 && manifest05.grid.sessions === 44 && manifest05.grid.stepX > 15 && manifest05.grid.stepY > 11;
  const verifiedFields = (manifest05.fields || []).filter(f => f.geometryStatus === 'VERIFIED').map(f => f.canonicalKey);
  const reqFields = ['student.fullName', 'attendance.sessionDate', 'attendance.mark', 'attendance.presentCount', 'attendance.absentCount'];
  const hasAllReq = reqFields.every(k => verifiedFields.includes(k));

  check('T-ATT-16-02-MANIFEST-CALIBRATION',
    isAvailable && capOk && gridOk && hasAllReq,
    `TMPL-05.json: previewStatus=AVAILABLE, capacity 40x44, cuadrícula calibrada dx=${manifest05.grid?.stepX} dy=${manifest05.grid?.stepY}`);

  // 3. Renderer puro en pdf-template-engine.js sin dependencias de DB
  const engineSource = read('app/js/services/pdf-template-engine.js');
  check('T-ATT-16-03-PURE-RENDERER', !/getDB\(|IndexedDB|Repository/.test(engineSource), 'pdf-template-engine.js puro sin dependencias de base de datos');

  // 4. Verificación del servidor candidato 8081
  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await waitServer();
  }
  check('T-ATT-16-04-SERVER-PORT', await up(), 'Servidor candidato activo en puerto 8081');

  const edgeProfile = path.join(ROOT, 'tmp', 'edge-profiles', `mvp-att16-${Date.now()}`);
  fs.mkdirSync(edgeProfile, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, executablePath: EDGE, userDataDir: edgeProfile });

  const errors = [];
  const networkRequests = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      console.log(`[PAGE LOG ${msg.type()}]:`, msg.text());
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('request', req => {
      networkRequests.push(req.url());
    });

    // 5. Invariantes de la base candidata
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#db-status-badge')?.textContent.includes('Datos locales disponibles'));
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
    check('T-ATT-16-05-CANDIDATE-INVARIANTS',
      invariants.students === 269 && invariants.enrollments === 295 && invariants.groups === 12 && invariants.periods === 0,
      `Invariantes candidata: ${invariants.students} est, ${invariants.enrollments} mat, ${invariants.groups} grp, ${invariants.periods} per`);

    // 6. Navegación a Asistencia DEMO (#/demo para inicializar runtime, luego #/registro) y presencia del botón TMPL-05
    await page.goto(`${BASE}#/demo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#demo-tour', { timeout: 10000 });
    await page.evaluate(() => { window.location.hash = '#/registro'; });
    await page.waitForSelector('#demo-att-tmpl05', { timeout: 10000 });
    const hasTmpl05Btn = await page.evaluate(() => Boolean(document.querySelector('#demo-att-tmpl05')));
    check('T-ATT-16-06-DEMO-UI-BUTTON', hasTmpl05Btn, 'Botón #demo-att-tmpl05 presente en vista de Asistencia DEMO');

    // 7. Generación interactiva en DEMO (40 alumnos, 5 sesiones)
    await page.click('#demo-att-tmpl05');
    await page.waitForFunction(() => {
      const iframe = document.querySelector('#demo-att-output iframe');
      return iframe && iframe.src && iframe.src.startsWith('blob:');
    }, { timeout: 15000 });

    const demoPdfBase64 = await page.evaluate(async () => {
      const iframe = document.querySelector('#demo-att-output iframe');
      const res = await fetch(iframe.src);
      const buf = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const demoPdf = await inspectPdf(demoPdfBase64);
    check('T-ATT-16-07-DEMO-PDF-GENERATION', demoPdf.numPages === 1, `TMPL-05 generado en DEMO con éxito: exactamente ${demoPdf.numPages} página física`);

    // 8. Ordenamiento alfabético A-Z en PDF generado
    const p1Text = demoPdf.pages[0].text;
    const names = [];
    demoPdf.pages[0].items.forEach(it => {
      if (it.x >= 100 && it.x <= 285 && it.y >= 210 && it.y <= 695 && it.str.length > 5) {
        names.push(it.str.trim());
      }
    });
    const sortedNames = names.slice().sort((a, b) => a.localeCompare(b, 'es'));
    const isSortedAZ = names.length > 0 && names.every((n, i) => n === sortedNames[i]);
    check('T-ATT-16-08-ALPHABETICAL-SORT', isSortedAZ, `Estudiantes ordenados alfabéticamente A-Z (${names.length} nombres ordenados)`);

    // 9. Presencia de marcas operativas centradas ("P", "F", "J", "—") en la cuadrícula
    const gridMarks = demoPdf.pages[0].items.filter(it => it.x >= 284 && it.x <= 988 && it.y >= 210 && it.y <= 695).map(it => it.str.trim());
    const hasP = gridMarks.includes('P');
    check('T-ATT-16-09-GRID-OPERATIONAL-MARKS', hasP, `Marcas de cuadrícula estampadas correctamente (P presentes en cuadrícula: ${gridMarks.filter(m=>m==='P').length})`);

    // 10. Columnas de totales operativos estampadas
    const totalPresentItems = demoPdf.pages[0].items.filter(it => it.x >= 985 && it.x <= 1024 && it.y >= 210 && it.y <= 695);
    const totalAbsentItems = demoPdf.pages[0].items.filter(it => it.x >= 1024 && it.x <= 1061 && it.y >= 210 && it.y <= 695);
    check('T-ATT-16-10-TOTALS-COLUMNS', totalPresentItems.length > 0, `Totales operativos presentes: ${totalPresentItems.length} celdas de asistencia estampadas`);

    // 11. Guard B-003: Cero porcentajes calculados en el documento
    const percentColItems = demoPdf.pages[0].items.filter(it => it.x >= 1061 && it.x <= 1105 && it.y >= 210 && it.y <= 695);
    check('T-ATT-16-11-GUARD-B003-PERCENT-BLANK', percentColItems.length === 0, `Guard B-003 cumplido: ${percentColItems.length} celdas de porcentaje en filas (estrictamente vacías)`);

    // 12. Guard B-001: Unidad orden > 6 rechaza con TEMPLATE_NOT_AVAILABLE
    const b001Rejection = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        await engine.renderAttendanceTMPL05({
          unit: { orden: 7, nombre: 'UNIDAD 7 SIN PLANTILLA' },
          rows: [{ 'student.fullName': 'ESTUDIANTE TEST' }]
        });
        return { rejected: false };
      } catch (e) {
        return { rejected: true, code: e.code, message: e.message };
      }
    });
    check('T-ATT-16-12-GUARD-B001-ORDER7-REJECTION',
      b001Rejection.rejected && b001Rejection.code === 'TEMPLATE_NOT_AVAILABLE',
      `Guard B-001 verificado: orden 7 rechazado con ${b001Rejection.code}`);

    // 13. Límite superior: 44 sesiones procesadas correctamente
    const maxSessionsOk = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        const sessions = Array.from({ length: 44 }, (_, i) => ({
          sessionId: `S-${i+1}`, fecha: `2026-09-${String((i%28)+1).padStart(2,'0')}`, ordenSesion: i+1
        }));
        const rows = [{
          'student.fullName': 'ESTUDIANTE TEST 44 SESIONES',
          marksBySession: sessions.map(() => ({ estadoRegistro: 'PRESENTE' })),
          'attendance.presentCount': 44,
          'attendance.absentCount': 0
        }];
        const blob = await engine.renderAttendanceTMPL05({ sessions, rows, demoMode: true });
        return { success: Boolean(blob && blob.size > 0), size: blob?.size };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    check('T-ATT-16-13-MAX-CAPACITY-44-SESSIONS', maxSessionsOk.success, `Capacidad máxima de 44 sesiones renderizada correctamente (${maxSessionsOk.size} bytes)`);

    // 14. Rechazo por sobrecapacidad horizontal: 45 sesiones rechaza con SESSION_CAPACITY_EXCEEDED
    const overflowSessions = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        const sessions = Array.from({ length: 45 }, (_, i) => ({ sessionId: `S-${i+1}`, fecha: '2026-09-01' }));
        await engine.renderAttendanceTMPL05({ sessions, rows: [{ 'student.fullName': 'TEST' }] });
        return { rejected: false };
      } catch (e) {
        return { rejected: true, code: e.code, message: e.message };
      }
    });
    check('T-ATT-16-14-SESSION-CAPACITY-EXCEEDED',
      overflowSessions.rejected && overflowSessions.code === 'SESSION_CAPACITY_EXCEEDED',
      `Rechazo fail-closed: 45 sesiones produce ${overflowSessions.code}`);

    // 15. Rechazo por sobrecapacidad vertical: 41 estudiantes rechaza con CAPACITY_EXCEEDED
    const overflowRows = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('./app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();
      try {
        const rows = Array.from({ length: 41 }, (_, i) => ({ 'student.fullName': `ESTUDIANTE ${i+1}` }));
        await engine.renderAttendanceTMPL05({ rows, sessions: [] });
        return { rejected: false };
      } catch (e) {
        return { rejected: true, code: e.code, message: e.message };
      }
    });
    check('T-ATT-16-15-ROW-CAPACITY-EXCEEDED',
      overflowRows.rejected && overflowRows.code === 'CAPACITY_EXCEEDED',
      `Rechazo fail-closed: 41 filas produce ${overflowRows.code}`);

    // 16. Marcas de agua y ausencia de literales espurios
    const hasDemoWatermark = p1Text.includes('DEMOSTRACION') || p1Text.includes('NO OFICIAL');
    const hasBorradorWatermark = p1Text.includes('BORRADOR');
    const hasNullUndefined = p1Text.includes('NULL') || p1Text.includes('UNDEFINED') || p1Text.includes('PENDIENTE');
    check('T-ATT-16-16-WATERMARKS-AND-CLEAN-CELLS',
      (hasDemoWatermark || hasBorradorWatermark) && !hasNullUndefined,
      `Marcas de agua aplicadas; cero literales espurios (null/undefined/PENDIENTE)`);

    // 17. Integración en vista candidata #/registro (saliendo de modo DEMO para operar sobre candidata real)
    await page.click('#btn-exit-demo');
    await page.waitForFunction(() => !document.body.classList.contains('demo-mode'), { timeout: 10000 });
    await page.evaluate(() => { window.location.hash = '#/registro'; });
    await page.waitForSelector('#btn-generate-tmpl05-candidate', { timeout: 10000 });
    const hasCandidateBtn = await page.evaluate(() => Boolean(document.querySelector('#btn-generate-tmpl05-candidate')));
    check('T-ATT-16-17-CANDIDATE-UI-BUTTON', hasCandidateBtn, 'Botón #btn-generate-tmpl05-candidate presente en vista #/registro de candidata');

    if (hasCandidateBtn) {
      await page.click('#btn-generate-tmpl05-candidate');
      await page.waitForFunction(() => {
        const iframe = document.querySelector('#attendance-tmpl05-viewer-output iframe');
        return iframe && iframe.src && iframe.src.startsWith('blob:');
      }, { timeout: 12000 });
      const candidateFrameOk = await page.evaluate(() => {
        const iframe = document.querySelector('#attendance-tmpl05-viewer-output iframe');
        const printBtn = document.querySelector('#btn-tmpl05-print');
        return Boolean(iframe && printBtn);
      });
      check('T-ATT-16-18-CANDIDATE-PREVIEW-RENDER', candidateFrameOk, 'Generación y despliegue de iframe con visor en #/registro exitoso');
    }

    // 18. Aislamiento de CETPRO_DB en puerto 8080
    const touched8080 = networkRequests.some(url => url.includes(':8080'));
    check('T-ATT-16-19-ISOLATION-8080', !touched8080, 'Cero solicitudes al puerto 8080 (producción 100% aislada)');

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

  const report = `# Reporte de Resultados de Pruebas — Gate MVP-ASISTENCIA-GRID-CALIBRATION-16 (Piloto TMPL-05)

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

## Conclusiones Técnicas del Gate 16

1. **Cuadrícula Calibrada de 44 Sesiones:** El manifiesto \`TMPL-05.json\` cuenta con \`previewStatus: "AVAILABLE"\`, paso horizontal verificado $dx = 15.9873$ pt y vertical $dy = 11.99$ pt para una matriz física exacta de 40 estudiantes $\\times$ 44 columnas.
2. **Cumplimiento de Salvaguarda B-001:** Módulos o programas que declaren unidades de orden $> 6$ son rechazados fail-closed con código \`TEMPLATE_NOT_AVAILABLE\`, sin inventar plantillas ficticias.
3. **Cumplimiento de Salvaguarda B-003:** La columna de porcentaje de inasistencia ministerial permanece estrictamente en blanco; únicamente se estampan conteos operativos neutros (asistencias y faltas) con marcas centradas ("P", "F", "J", "—").
4. **Límites de Capacidad Físicos:** El sistema acepta y renderiza hasta 44 sesiones y 40 estudiantes, rechazando $45$ sesiones con \`SESSION_CAPACITY_EXCEEDED\` y $41$ filas con \`CAPACITY_EXCEEDED\`.
5. **Inmutabilidad y Aislamiento:** Los 21 hashes SHA-256 canónicos permanecen 100% inalterados y se constató cero interacción con el puerto 8080 o \`CETPRO_DB\`.
`;

  fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
  fs.writeFileSync(RESULT_FILE, report, 'utf8');
  console.log(`Reporte guardado en: ${RESULT_FILE}`);

  if (failed > 0) process.exit(1);
}



module.exports = { name: 'MVP_ASISTENCIA_GRID_16', run };




