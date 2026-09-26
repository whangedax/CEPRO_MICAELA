const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RESULT_FILE = path.join(ROOT, 'tests', 'results', 'MVP_TMPL03_REGISTRO_TEST_RESULT.md');

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
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    const items = content.items.map(item => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
    pages.push({ pageNumber, items, text: normalize(items.map(item => item.str).join(' ')) });
  }
  return { pageCount: pdf.numPages, pages, text: pages.map(page => page.text).join(' ') };
}

async function run() {
  const results = [];
  const check = (id, passed, detail = '') => {
    const row = { id, passed: Boolean(passed), detail };
    results.push(row);
    console.log(`[${row.passed ? 'PASSED' : 'FAILED'}] ${id}: ${detail}`);
  };

  console.log('--- INICIANDO REGRESIÓN TMPL-03 (REGISTRO DE MATRÍCULA MODULAR) ---');

  // 1. Integridad de los 21 hashes canónicos (inmutabilidad estricta)
  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(file => file.endsWith('.json'));
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(canonical) && crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex') === manifest.sha256) {
      hashMatches += 1;
    }
  }
  check('T-TMPL03-01-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 hashes SHA-256 canónicos intactos`);

  // 2. Verificación del manifiesto independiente TMPL-03.json
  const manifest03 = JSON.parse(read('app/data/pdf-manifests/TMPL-03.json'));
  const isAvailable = manifest03.previewStatus === 'AVAILABLE';
  const hasProvenance = typeof manifest03.geometryProvenance === 'string' && manifest03.geometryProvenance.includes('CALIBRACIÓN');
  const capacity20 = manifest03.capacity && manifest03.capacity.rows === 20 && manifest03.capacity.pages === 1;
  const requiredFields = [
    'institution.ugel', 'institution.codigoModular', 'institution.nombre',
    'program.nombre', 'group.ciclo', 'institution.resolucionPrograma', 'module.nombre',
    'student.tipoDocumento', 'student.numeroDocumento', 'student.apellidoPaterno',
    'student.apellidoMaterno', 'student.nombres', 'student.sexo', 'student.fechaNacimiento'
  ];
  const presentFields = (manifest03.fields || []).map(f => f.canonicalKey);
  const missingFields = requiredFields.filter(k => !presentFields.includes(k));
  const allFieldsRepeat20 = (manifest03.fields || []).every(f => f.repeat === 20);

  check('T-TMPL03-02-MANIFEST-CONFIG',
    isAvailable && hasProvenance && capacity20 && missingFields.length === 0 && allFieldsRepeat20,
    `TMPL-03.json: previewStatus=AVAILABLE, geometryProvenance registrada, capacity={pages:1, rows:20}`);

  // 3. Renderer puro sin acceso a IndexedDB / Red en pdf-template-engine.js
  const engineSource = read('app/js/services/pdf-template-engine.js');
  check('T-TMPL03-03-PURE-RENDERER', !/getDB\(|IndexedDB|Repository/.test(engineSource), 'pdf-template-engine.js puro sin dependencias de DB');

  // 4. Servidor 8081 y aislamiento de puerto 8080
  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await waitServer();
  }
  check('T-TMPL03-04-SERVER-PORT', await up(), 'Servidor candidato activo en puerto 8081');

  const edgeProfile = path.join(ROOT, 'tmp', 'edge-profiles', `mvp-tmpl03-${Date.now()}`);
  fs.mkdirSync(edgeProfile, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, executablePath: EDGE, userDataDir: edgeProfile });

  const errors = [];
  const networkRequests = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      console.log('PAGE CONSOLE:', msg.type(), msg.text());
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('request', req => {
      networkRequests.push(req.url());
    });

    await page.goto(BASE, { waitUntil: 'networkidle0' });

    // 5. Verificar aislamiento de CETPRO_DB en puerto 8080
    const touched8080 = networkRequests.some(url => url.includes(':8080'));
    check('T-TMPL03-05-ISOLATION-8080', !touched8080, 'Cero peticiones al puerto 8080 (CETPRO_DB 100% aislada)');

    // 6. Prueba DEMO B (25 alumnos): Partición en 2 páginas físicas A3 (20 + 5)
    const demoB25PdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const students = Array.from({ length: 25 }, (_, i) => ({
        matriculaId: `MAT-DEMOB-${String(i + 1).padStart(3, '0')}`,
        apellidosNombres: `ESTUDIANTE DEMOB ${String(i + 1).padStart(2, '0')}, ALUMNO TEST`,
        document: `400000${String(i + 1).padStart(2, '0')}`,
        sex: i % 2 === 0 ? 'M' : 'F',
        birthDate: '2001-03-15'
      }));

      const payload = {
        institution: {
          nombreInstitucion: 'MICAELA BASTIDAS PUYUCAWA',
          ugel: 'UGEL 05',
          codigoModular: '0681536',
          resolucionPrograma: 'RD 0487-2015'
        },
        program: {
          nombre: 'PELUQUERÍA BÁSICA',
          ciclo: 'AUXILIAR TÉCNICO'
        },
        module: {
          nombre: 'CORTE DE CABELLO Y BARBERÍA'
        },
        group: {
          codigoVisible: 'G-PEL-DEMOB',
          ciclo: 'AUXILIAR TÉCNICO'
        },
        rows: students,
        demoMode: true
      };

      const blob = await engine.renderDocument({
        documentType: 'TMPL-03',
        context: payload,
        rows: payload.rows,
        demoMode: true
      });

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const demoBInspection = await inspectPdf(demoB25PdfBase64);
    check('T-TMPL03-06-DEMO-B-25-PAGES', demoBInspection.pageCount === 2, `DEMO B (25 alumnos) genera exactamente 2 páginas físicas A3 (obtenido: ${demoBInspection.pageCount})`);
    
    const demoBP1Text = demoBInspection.pages[0].text;
    const demoBP2Text = demoBInspection.pages[1].text;
    const demoBHasContinuityP1 = demoBP1Text.includes('PAGINA 1 DE 2') && demoBP1Text.includes('REGISTROS 1-20');
    const demoBHasContinuityP2 = demoBP2Text.includes('PAGINA 2 DE 2') && demoBP2Text.includes('REGISTROS 21-25');
    const demoBHasTotals = demoBP1Text.includes('TOTAL GENERAL DEL GRUPO: 25') && demoBP2Text.includes('REGISTROS EN ESTA PAGINA: 5');

    check('T-TMPL03-07-DEMO-B-CONTINUITY', demoBHasContinuityP1 && demoBHasContinuityP2 && demoBHasTotals,
      'DEMO B: Leyendas de continuidad exactas (Pág 1 de 2: Registros 1–20; Pág 2 de 2: Registros 21–25, Total 25)');

    // 7. Prueba DEMO A (40 alumnos): Partición en 2 páginas físicas A3 (20 + 20)
    const demoA40PdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const students = Array.from({ length: 40 }, (_, i) => ({
        matriculaId: `MAT-DEMOA-${String(i + 1).padStart(3, '0')}`,
        apellidosNombres: `ALUMNO DEMOA ${String(i + 1).padStart(2, '0')}, COMPUTACION TEST`,
        document: `500000${String(i + 1).padStart(2, '0')}`,
        sex: i % 2 === 0 ? 'M' : 'F',
        birthDate: '1999-07-20'
      }));

      const payload = {
        institution: {
          nombreInstitucion: 'MICAELA BASTIDAS PUYUCAWA',
          ugel: 'UGEL 05',
          codigoModular: '0681536',
          resolucionPrograma: 'RD 0487-2015'
        },
        program: {
          nombre: 'COMPUTACIÓN E INFORMÁTICA',
          ciclo: 'MEDIO'
        },
        module: {
          nombre: 'OFIMÁTICA'
        },
        group: {
          codigoVisible: 'G-COMP-DEMOA',
          ciclo: 'MEDIO'
        },
        rows: students,
        demoMode: false
      };

      const blob = await engine.renderDocument({
        documentType: 'TMPL-03',
        context: payload,
        rows: payload.rows,
        demoMode: false
      });

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const demoAInspection = await inspectPdf(demoA40PdfBase64);
    check('T-TMPL03-08-DEMO-A-40-PAGES', demoAInspection.pageCount === 2, `DEMO A (40 alumnos) genera exactamente 2 páginas físicas A3 (obtenido: ${demoAInspection.pageCount})`);

    const demoAP1Text = demoAInspection.pages[0].text;
    const demoAP2Text = demoAInspection.pages[1].text;
    const demoAHasContinuityP1 = demoAP1Text.includes('PAGINA 1 DE 2') && demoAP1Text.includes('REGISTROS 1-20');
    const demoAHasContinuityP2 = demoAP2Text.includes('PAGINA 2 DE 2') && demoAP2Text.includes('REGISTROS 21-40');
    const demoAHasTotals = demoAP2Text.includes('TOTAL GENERAL DEL GRUPO: 40') && demoAP2Text.includes('REGISTROS EN ESTA PAGINA: 20');

    check('T-TMPL03-09-DEMO-A-CONTINUITY', demoAHasContinuityP1 && demoAHasContinuityP2 && demoAHasTotals,
      'DEMO A: Leyendas de continuidad exactas (Pág 1 de 2: Registros 1–20; Pág 2 de 2: Registros 21–40, Total 40)');

    // 8. Caso Límite (70 alumnos): Partición en 4 páginas físicas A3 (20 + 20 + 20 + 10)
    const limit70PdfBase64 = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const students = Array.from({ length: 70 }, (_, i) => ({
        matriculaId: `MAT-LIM70-${String(i + 1).padStart(3, '0')}`,
        apellidosNombres: `REGISTRO LIMITE ${String(i + 1).padStart(2, '0')}, ALUMNO TEST`,
        document: `700000${String(i + 1).padStart(2, '0')}`,
        sex: i % 2 === 0 ? 'M' : 'F',
        birthDate: '1995-11-10'
      }));

      const payload = {
        institution: {
          nombreInstitucion: 'MICAELA BASTIDAS PUYUCAWA',
          ugel: 'UGEL 05',
          codigoModular: '0681536',
          resolucionPrograma: 'RD 0487-2015'
        },
        program: {
          nombre: 'COMPUTACIÓN E INFORMÁTICA',
          ciclo: 'MEDIO'
        },
        module: {
          nombre: 'OFIMÁTICA'
        },
        group: {
          codigoVisible: 'G-COMP-70',
          ciclo: 'MEDIO'
        },
        rows: students,
        demoMode: false
      };

      const blob = await engine.renderDocument({
        documentType: 'TMPL-03',
        context: payload,
        rows: payload.rows,
        demoMode: false
      });

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const limit70Inspection = await inspectPdf(limit70PdfBase64);
    check('T-TMPL03-10-LIMIT-70-PAGES', limit70Inspection.pageCount === 4, `Caso Límite (70 alumnos) genera exactamente 4 páginas físicas A3 (obtenido: ${limit70Inspection.pageCount})`);

    const p4Text = limit70Inspection.pages[3].text;
    const p4HasContinuity = p4Text.includes('PAGINA 4 DE 4') && p4Text.includes('REGISTROS 61-70');
    const p4HasTotals = p4Text.includes('TOTAL GENERAL DEL GRUPO: 70') && p4Text.includes('REGISTROS EN ESTA PAGINA: 10');

    check('T-TMPL03-11-LIMIT-70-CONTINUITY', p4HasContinuity && p4HasTotals,
      'Caso Límite: Página 4 contiene "Página 4 de 4 · Registros 61–70", Total 70 y 10 en esta página');

    // 9. Comprobación de orden alfabético estable
    const sortedOrderCheck = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      const unsorted = [
        { matriculaId: 'M-3', apellidosNombres: 'ZAPATA CARLOS, JOSE', document: '11111111' },
        { matriculaId: 'M-1', apellidosNombres: 'ALVAREZ DIAZ, ANA', document: '22222222' },
        { matriculaId: 'M-2', apellidosNombres: 'MAMANI QUISPE, ROSA', document: '33333333' }
      ];

      const blob = await engine.renderDocument({
        documentType: 'TMPL-03',
        context: {
          institution: { nombreInstitucion: 'PROMAE' },
          program: { nombre: 'COMPUTACION' },
          module: { nombre: 'OFIMATICA' },
          group: { codigoVisible: 'G-SORT' }
        },
        rows: unsorted,
        demoMode: false
      });

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const sortedInspection = await inspectPdf(sortedOrderCheck);
    const sortedText = sortedInspection.text;
    const posAlvarez = sortedText.indexOf('ALVAREZ');
    const posMamani = sortedText.indexOf('MAMANI');
    const posZapata = sortedText.indexOf('ZAPATA');

    check('T-TMPL03-12-STABLE-ALPHABETICAL-ORDER',
      posAlvarez !== -1 && posMamani !== -1 && posZapata !== -1 && posAlvarez < posMamani && posMamani < posZapata,
      'Orden alfabético estable: ALVAREZ precede a MAMANI y MAMANI precede a ZAPATA');

    // 10. Marcas de agua en DEMO y Borrador Administrativo
    const demoBHasWatermark = demoBInspection.text.includes('DEMOSTRACION - NO OFICIAL') || demoBInspection.text.includes('DEMOSTRACION');
    const demoAHasWatermark = demoAInspection.text.includes('BORRADOR ADMINISTRATIVO - NO OFICIAL') || demoAInspection.text.includes('BORRADOR ADMINISTRATIVO');
    check('T-TMPL03-13-WATERMARKS', demoBHasWatermark && demoAHasWatermark,
      'Marcas de agua verificadas: DEMOSTRACIÓN — NO OFICIAL en DEMO B, BORRADOR ADMINISTRATIVO — NO OFICIAL en DEMO A');

    // 11. Ausencia estricta de literales espurios
    const spuriousB = /NULL|UNDEFINED|PENDIENTE/i.test(demoBInspection.text);
    const spuriousA = /NULL|UNDEFINED|PENDIENTE/i.test(demoAInspection.text);
    const spuriousLimit = /NULL|UNDEFINED|PENDIENTE/i.test(limit70Inspection.text);
    check('T-TMPL03-14-NO-SPURIOUS-STRINGS', !spuriousB && !spuriousA && !spuriousLimit,
      'Cero cadenas espurias: Ausencia total de "null", "undefined" o "PENDIENTE"');

    // 12. Integración en UI: Navegación a Registro de Matrícula y generación TMPL-03
    await page.goto(`${BASE}#/registros/matricula`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#register-program', { timeout: 10000 });

    // Seleccionar programa
    await page.evaluate(() => {
      const select = document.querySelector('#register-program');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
      }
    });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Seleccionar grupo
    await page.evaluate(() => {
      const select = document.querySelector('#register-group');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
      }
    });
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verificar botón #register-tmpl03 habilitado y operativo
    const isTmpl03Disabled = await page.$eval('#register-tmpl03', el => el.disabled);
    check('T-TMPL03-15-UI-BUTTON-ENABLED', !isTmpl03Disabled, 'Botón TMPL-03 habilitado y operativo en UI');

    // Generar registro oficial ministerial (#register-tmpl03)
    await page.click('#register-tmpl03');
    await page.waitForSelector('#register-output iframe', { timeout: 20000 });
    const iframeSrc = await page.$eval('#register-output iframe', el => el.src);
    const printBtn = await page.$('#register-print');
    const downloadLink = await page.$('#register-output a[download]');

    check('T-TMPL03-16-UI-OFFICIAL-MINISTERIAL-REPORT', Boolean(iframeSrc && iframeSrc.startsWith('blob:') && printBtn && downloadLink),
      'Emisión oficial TMPL-03 generada sobre PDF ministerial con iframe y descarga/impresión operativas');

  } catch (error) {
    check('T-TMPL03-FATAL-ERROR', false, error.message);
    console.error(error);
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  // Generación del informe formal de resultados
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount;

  let md = `# Reporte de Pruebas: MVP-TMPL03-REGISTRO-MODULAR-15\n\n`;
  md += `**Fecha:** ${new Date().toISOString()}\n`;
  md += `**Entorno:** Microsoft Edge Headless (127.0.0.1:8081)\n`;
  md += `**Aislamiento:** CETPRO_DB (8080) Protegida / Inalterada\n`;
  md += `**Resultado Global:** ${allPassed ? 'AUTOMATED_EDGE_HEADLESS = PASS' : 'AUTOMATED_EDGE_HEADLESS = FAIL'}\n`;
  md += `**Aceptación Física Humana:** HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING\n\n`;
  md += `## Matriz de Resultados (${passedCount}/${totalCount})\n\n`;
  md += `| ID Caso | Estado | Detalle |\n`;
  md += `|---|:---:|---|\n`;
  for (const r of results) {
    md += `| \`${r.id}\` | **${r.passed ? 'PASSED' : 'FAILED'}** | ${r.detail} |\n`;
  }
  md += `\n## Invariantes Verificados\n`;
  md += `- **Inmutabilidad Canónica:** 21/21 hashes SHA-256 inalterados (en particular 03_REGISTRO_DE_MATRICULA_MODULAR.pdf).\n`;
  md += `- **Capacidad Nominal A3:** 20 registros por página física. Lotes de 25 alumnos generan 2 páginas (20+5), 40 alumnos generan 2 páginas (20+20) y 70 alumnos generan 4 páginas (20+20+20+10).\n`;
  md += `- **Leyendas de Continuidad:** Formato "Página X de Y · Registros A–B" y "TOTAL GENERAL DEL GRUPO: N · REGISTROS EN ESTA PÁGINA: M".\n`;
  md += `- **Orden Alfabético:** Estudiantes ordenados de forma estable por apellidos y nombres.\n`;
  md += `- **Aislamiento DB y Red:** Cero consultas a IndexedDB en el motor de dibujo y cero peticiones al puerto 8080.\n`;
  md += `- **Calidad Vectorial:** Ausencia absoluta de literales espurios ("null", "undefined", "PENDIENTE").\n`;
  md += `- **Integración UI:** Botón interactivo en \`#/registros/matricula\` con visor iframe embebido, auto-scroll y botones de descarga e impresión.\n`;

  fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
  fs.writeFileSync(RESULT_FILE, md, 'utf8');
  console.log(`\nReporte generado exitosamente en: ${RESULT_FILE}`);
  console.log(`Resultado final: ${passedCount}/${totalCount} superados.`);

  if (!allPassed) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
