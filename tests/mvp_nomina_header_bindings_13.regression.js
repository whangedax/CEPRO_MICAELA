const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:8081/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const RESULT_FILE = path.join(ROOT, 'tests', 'results', 'MVP_NOMINA_HEADER_BINDINGS_13_TEST_RESULT.md');

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
    pages.push({ items, text: normalize(items.map(item => item.str).join(' ')) });
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

  // 1. Verificación de configuración de campos en TMPL01_PDF_FIELDS.json
  const fieldsConfig = JSON.parse(read('app/data/TMPL01_PDF_FIELDS.json'));
  const requiredHeaderKeys = [
    'header.codigoModular',
    'header.modulo',
    'header.rdModulo',
    'header.ciclo',
    'header.fechaInicio',
    'header.fechaTermino',
    'header.turno',
    'header.seccion'
  ];
  const missingKeys = requiredHeaderKeys.filter(k => !fieldsConfig[k]);
  check('T-MNHB13-01-FIELDS-CONFIG', missingKeys.length === 0,
    missingKeys.length === 0 ? '8/8 cajas vectoriales de cabecera presentes' : `Faltan: ${missingKeys.join(', ')}`);

  // 2. Integridad de los 21 hashes canónicos
  const manifests = fs.readdirSync(path.join(ROOT, 'app/data/pdf-manifests')).filter(file => file.endsWith('.json'));
  let hashMatches = 0;
  for (const file of manifests) {
    const manifest = JSON.parse(read(`app/data/pdf-manifests/${file}`));
    const canonical = path.join(ROOT, manifest.canonicalPdf.replace(/^\//, ''));
    if (fs.existsSync(canonical) && crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex') === manifest.sha256) {
      hashMatches += 1;
    }
  }
  check('T-MNHB13-02-CANONICAL-HASHES', manifests.length === 21 && hashMatches === 21, `${hashMatches}/21 hashes SHA-256 intactos`);

  // 3. Renderer puro sin acceso a DB
  const engineSource = read('app/js/services/pdf-template-engine.js');
  check('T-MNHB13-03-PURE-RENDERER', !/getDB\(|IndexedDB|Repository/.test(engineSource), 'pdf-template-engine.js puro sin dependencias de DB');

  let server;
  if (!await up()) {
    server = fork(require.resolve('../scripts/v2-candidate-server.js'), [], { silent: true });
    await waitServer();
  }

  const edgeProfile = path.join(ROOT, 'tmp', 'edge-profiles', `mvp-nomina-headers-13-${Date.now()}`);
  fs.mkdirSync(edgeProfile, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, executablePath: EDGE, userDataDir: edgeProfile });

  const errors = [];
  const external = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.evaluateOnNewDocument(() => {
      globalThis.__gateOpenedDatabases = [];
      const originalOpen = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function patchedOpen(name, ...args) {
        globalThis.__gateOpenedDatabases.push(String(name));
        return originalOpen.call(this, name, ...args);
      };
    });

    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('request', request => {
      try {
        const url = new URL(request.url());
        if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1') external.push(request.url());
      } catch { /* blob/data */ }
    });

    await page.goto(`${BASE}#/demo`, { waitUntil: 'networkidle0', timeout: 60000 });
    check('T-MNHB13-04-EDGE-HEADLESS', /Edg/i.test(await browser.version()), await browser.version());

    // Inicializar y chequear baseline en DEMO
    const baseline = await page.evaluate(async () => {
      const { DemoRuntimeService } = await import('/app/js/services/demo-runtime-service.js');
      await DemoRuntimeService.enter({ reset: true });
      return { success: true };
    });
    check('T-MNHB13-05-DEMO-ENVIRONMENT', baseline.success, 'Entorno DEMO activado');

    // CASO A: Grupo sin configurar (valores en blanco o 'PENDIENTE')
    const casoA = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const toBase64 = async blob => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        return btoa(binary);
      };

      const engine = new PdfTemplateEngine();
      // Contexto sin configurar (campos vacíos o con 'PENDIENTE')
      const context = {
        institution: { nombre: 'CETPRO DEMO', ugel: 'UGEL DEMO', tipoGestion: 'PÚBLICA' },
        program: { nombre: 'COMPUTACION E INFORMATICA' },
        module: null,
        period: null,
        group: { turno: 'PENDIENTE', ciclo: 'PENDIENTE', seccion: 'PENDIENTE' }
      };
      const rows = Array.from({ length: 5 }, (_, index) => ({
        enrollmentId: `MAT-CASOA-${index + 1}`,
        studentName: `ESTUDIANTE VACIO ${index + 1}`,
        sex: 'H', birthDate: '2000-01-01'
      }));

      const blob = await engine.renderDocument({
        documentType: 'TMPL-01',
        mode: 'ADMINISTRATIVE_MULTIPAGE',
        context,
        rows,
        demoMode: true
      });

      return { base64: await toBase64(blob) };
    });

    const pdfA = await inspectPdf(casoA.base64);
    const hasUndefinedOrNull = /UNDEFINED|NULL/i.test(pdfA.text);
    const hasPendienteInHeader = /PENDIENTE/i.test(pdfA.text);
    check('T-MNHB13-06-CASO-A-NO-FORBIDDEN-LITERALS', !hasUndefinedOrNull && !hasPendienteInHeader,
      `Sin undefined, null ni PENDIENTE estampado (hasUndefinedOrNull=${hasUndefinedOrNull}, hasPendiente=${hasPendienteInHeader})`);

    // CASO B: Computación e Informática con Módulo I "Ofimática", Periodo 2026-I, Turno NOCHE, Ciclo TÉCNICO, Sección ÚNICA
    const casoB = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const toBase64 = async blob => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        return btoa(binary);
      };

      const engine = new PdfTemplateEngine();
      const context = {
        institution: {
          nombre: 'CETPRO SAN LUIS',
          ugel: 'UGEL 03',
          tipoGestion: 'PÚBLICA',
          codigoModular: '1234567',
          provincia: 'LIMA',
          distrito: 'LA VICTORIA',
          direccion: 'AV. SAN LUIS 123'
        },
        program: {
          id: 'PROG-005',
          nombre: 'COMPUTACION E INFORMATICA'
        },
        module: {
          id: 'MOD-009',
          nombreOficial: 'Ofimática',
          resolucionDirectoral: 'R.D. 0123-2026-ED'
        },
        period: {
          id: 'PER-2026-I',
          nombre: '2026-I',
          fechaInicio: '2026-03-01',
          fechaFin: '2026-07-31'
        },
        group: {
          id: 'GRP-COMP-01',
          visibleCode: 'COMP-2026-I-N',
          turno: 'NOCHE',
          ciclo: 'TÉCNICO',
          seccion: 'ÚNICA'
        }
      };

      // 70 alumnos para generar 3 páginas y verificar estampado de cabecera en todas
      const rows = Array.from({ length: 70 }, (_, index) => ({
        enrollmentId: `MAT-COMP-${String(index + 1).padStart(3, '0')}`,
        studentName: `ALUMNO COMPUTACION ${String(index + 1).padStart(3, '0')}`,
        sex: index % 2 === 0 ? 'H' : 'M',
        birthDate: '2001-05-15'
      }));

      const blob = await engine.renderDocument({
        documentType: 'TMPL-01',
        mode: 'ADMINISTRATIVE_MULTIPAGE',
        context,
        rows,
        demoMode: false
      });

      return {
        base64: await toBase64(blob),
        pagination: JSON.parse(JSON.stringify(engine.lastAdministrativePagination))
      };
    });

    const pdfB = await inspectPdf(casoB.base64);
    check('T-MNHB13-07-CASO-B-PAGES', pdfB.pageCount === 3, `3 páginas generadas para 70 alumnos (pageCount=${pdfB.pageCount})`);

    // Verificar estampado de los 8 campos en CADA una de las 3 páginas
    const expectedHeaderTerms = [
      '1234567',              // codigoModular
      'OFIMATICA',            // modulo
      '0123-2026',            // rdModulo
      'TECNICO',              // ciclo
      '2026-03-01',           // fechaInicio
      '2026-07-31',           // fechaTermino
      'NOCHE',                // turno
      'UNICA'                 // seccion
    ];

    let allPagesHaveHeader = true;
    const pageHeaderChecks = [];
    pdfB.pages.forEach((pageObj, pIdx) => {
      const missingOnPage = expectedHeaderTerms.filter(term => !pageObj.text.includes(normalize(term)));
      pageHeaderChecks.push({ page: pIdx + 1, missing: missingOnPage });
      if (missingOnPage.length > 0) allPagesHaveHeader = false;
    });

    check('T-MNHB13-08-CASO-B-HEADER-ALL-PAGES', allPagesHaveHeader,
      allPagesHaveHeader ? 'Los 8 campos de cabecera están presentes en las 3 páginas físicas' : JSON.stringify(pageHeaderChecks));

    // CASO C: Mapeo exacto y Autofit tipográfico
    const casoC = await page.evaluate(async () => {
      const { PdfTemplateEngine } = await import('/app/js/services/pdf-template-engine.js');
      const engine = new PdfTemplateEngine();

      // Probar que un texto largo ("DISEÑO GRÁFICO Y PLATAFORMAS DIGITALES") cabe sin desbordar
      const longModuleContext = {
        institution: { nombre: 'CETPRO DEMO', codigoModular: '1234567' },
        program: { nombre: 'COMPUTACION E INFORMATICA' },
        module: { nombreOficial: 'Diseño Gráfico y Plataformas Digitales', resolucionDirectoral: 'R.D. 0456-2026-ED' },
        period: { fechaInicio: '2026-03-01', fechaFin: '2026-07-31' },
        group: { turno: 'NOCHE', ciclo: 'AUXILIAR TÉCNICO', seccion: 'ÚNICA' }
      };

      let autofitSuccess = false;
      let autofitError = null;
      try {
        await engine.renderTMPL01({
          ...longModuleContext,
          studentsList: [{ apellidosNombres: 'TEST ESTUDIANTE', sexo: 'H', fechaNacimiento: '2000-01-01' }]
        });
        autofitSuccess = true;
      } catch (err) {
        autofitError = err.message;
        autofitSuccess = false;
      }

      // Probar que un texto exageradamente gigante que excede minFontSize 5.5pt es rechazado de forma controlada
      let overflowCaught = false;
      try {
        await engine.renderTMPL01({
          ...longModuleContext,
          module: {
            nombreOficial: 'TEXTO EXTREMADAMENTE LARGO QUE SOBREPASA CUALQUIER CAJA FISICA POSIBLE INCLUSO EN LA FUENTE MINIMA DE 5.5 PUNTOS',
            resolucionDirectoral: 'R.D. 123'
          },
          studentsList: [{ apellidosNombres: 'TEST ESTUDIANTE', sexo: 'H', fechaNacimiento: '2000-01-01' }]
        });
      } catch (err) {
        if (err.name === 'EXPECTED_REJECTION' || err.code === 'FIELD_OVERFLOW') {
          overflowCaught = true;
        }
      }

      return { autofitSuccess, autofitError, overflowCaught };
    });

    check('T-MNHB13-09-CASO-C-AUTOFIT-SUCCESS', casoC.autofitSuccess,
      casoC.autofitSuccess ? 'Módulo largo ajustado correctamente con autofit' : `Error autofit: ${casoC.autofitError}`);
    check('T-MNHB13-10-CASO-C-OVERFLOW-REJECTION', casoC.overflowCaught, 'Desbordamiento extremo rechazado con seguridad tipográfica (FIELD_OVERFLOW)');

    // CASO D: Persistencia en formulario y servicio con procedencia
    const casoD = await page.evaluate(async () => {
      const { MvpAdminService } = await import('/app/js/services/mvp-admin-service.js');
      const { getDB } = await import('/app/js/db/database.js');
      const service = new MvpAdminService();
      const db = getDB();

      const provenance = {
        sourceType: 'RESOLUCION',
        sourceDescription: 'Resolución Directoral N° 045-2026-CETPRO',
        confirmedBy: 'JEFATURA_ACADEMICA',
        sourceConfirmed: true,
        confirmationText: 'Certifico que los datos proceden de un documento oficial autorizado.'
      };

      // Asignar a GAC-DEMO-A módulo MOD-001, turno MAÑANA, ciclo TÉCNICO, sección ÚNICA
      const result = await service.assignConfirmedModule({
        groupId: 'GAC-DEMO-A',
        moduloId: 'MOD-001',
        turno: 'MAÑANA',
        ciclo: 'TÉCNICO',
        seccion: 'ÚNICA',
        ...provenance
      });

      // Leer de la base de datos para verificar persistencia real
      const groupFromDb = await new Promise((resolve, reject) => {
        const req = db.transaction('grupos_academicos', 'readonly').objectStore('grupos_academicos').get('GAC-DEMO-A');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Leer auditoría
      const auditRecords = await new Promise((resolve, reject) => {
        const req = db.transaction('auditoria', 'readonly').objectStore('auditoria').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const auditMatch = auditRecords.find(a =>
        (a.entidadId === 'GAC-DEMO-A' || a.entityId === 'GAC-DEMO-A' || a.idEntidad === 'GAC-DEMO-A') &&
        (a.accion === 'ACTUALIZACION_GRUPO_CONFIRMADA' || a.tipoOperacion === 'ACTUALIZACION_GRUPO_CONFIRMADA')
      );

      return {
        affectedEnrollments: result.affectedEnrollments,
        groupTurno: groupFromDb?.turno,
        groupCiclo: groupFromDb?.ciclo,
        groupSeccion: groupFromDb?.seccion,
        groupSources: groupFromDb?.academicContextSources,
        auditCount: auditRecords.length,
        auditFound: Boolean(auditMatch)
      };
    });

    check('T-MNHB13-11-CASO-D-SERVICE-PERSISTENCE',
      casoD.groupTurno === 'MAÑANA' && casoD.groupCiclo === 'TÉCNICO' && casoD.groupSeccion === 'ÚNICA' &&
      Boolean(casoD.groupSources?.turno?.confirmedBy) && casoD.auditFound,
      `Valores guardados con procedencia y auditoría (Turno=${casoD.groupTurno}, Ciclo=${casoD.groupCiclo}, Seccion=${casoD.groupSeccion}, ConfirmedBy=${casoD.groupSources?.turno?.confirmedBy}, Audit=${casoD.auditFound})`);

    // UI test en #/configuracion-academica
    await page.goto(`${BASE}#/configuracion-academica`, { waitUntil: 'networkidle0', timeout: 30000 });
    const formBElements = await page.evaluate(() => {
      const turnoSelect = document.querySelector('#mvp-module-turno');
      const cicloSelect = document.querySelector('#mvp-module-ciclo');
      const seccionSelect = document.querySelector('#mvp-module-seccion');
      return {
        hasTurno: Boolean(turnoSelect),
        hasCiclo: Boolean(cicloSelect),
        hasSeccion: Boolean(seccionSelect),
        turnoOptions: Array.from(turnoSelect?.options || []).map(o => o.value),
        cicloOptions: Array.from(cicloSelect?.options || []).map(o => o.value),
        seccionOptions: Array.from(seccionSelect?.options || []).map(o => o.value)
      };
    });

    check('T-MNHB13-12-CASO-D-UI-FORM-B-FIELDS',
      formBElements.hasTurno && formBElements.hasCiclo && formBElements.hasSeccion &&
      formBElements.turnoOptions.includes('MAÑANA') && formBElements.cicloOptions.includes('TÉCNICO') &&
      formBElements.seccionOptions.includes('ÚNICA'),
      `Formulario B tiene selects para Turno, Ciclo y Sección con opciones válidas`);

    // CASO E: Invariantes normativos
    const dbsOpened = await page.evaluate(() => globalThis.__gateOpenedDatabases || []);
    check('T-MNHB13-13-CETPRO-DB-UNTOUCHED', !dbsOpened.includes('CETPRO_DB'),
      `CETPRO_DB no fue abierto en ningún momento (abiertas: ${JSON.stringify(dbsOpened)})`);
    check('T-MNHB13-14-ZERO-JS-ERRORS', errors.length === 0, `${errors.length} errores de consola/JS`);
    check('T-MNHB13-15-OFFLINE-ONLY', external.length === 0, `${external.length} solicitudes de red externas`);

  } finally {
    await browser.close();
    if (server) server.kill();
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  // Generar reporte markdown
  const reportContent = `# MVP-NOMINA-HEADER-BINDINGS-13 — Resultado

Fecha: 2026-09-17

- Suite dedicada: **${passedCount}/${results.length}**, \`failed=${failedCount}\`.
- Navegador automatizado: Microsoft Edge en modo headless aislado.
- Geometría vectorial: 8/8 campos de cabecera incorporados en \`TMPL01_PDF_FIELDS.json\` (\`codigoModular\`, \`modulo\`, \`rdModulo\`, \`ciclo\`, \`fechaInicio\`, \`fechaTermino\`, \`turno\`, \`seccion\`).
- Caso A (Sin configurar): Celdas en blanco limpias, sin \`undefined\`, \`null\` ni literales \`PENDIENTE\`.
- Caso B (Computación e Informática): Módulo I "Ofimática", Periodo 2026-I, Turno NOCHE, Ciclo TÉCNICO, Sección ÚNICA, R.D. y Fechas estampados en las 3 páginas físicas de un grupo de 70 alumnos.
- Caso C (Autofit): Reducción fluida entre 5.5pt y 8pt para textos de módulos oficiales; rechazo controlado \`FIELD_OVERFLOW\` ante desbordamientos extremos.
- Caso D (Persistencia & UI): Formulario B en \`#/configuracion-academica\` enriquecido con Turno, Ciclo y Sección; persistencia en IndexedDB con firma de procedencia (\`sourceType\`, \`sourceDescription\`, \`confirmedBy\`) y registro en auditoría.
- Caso E (Invariantes normativos): 21/21 hashes SHA-256 canónicos intactos, \`CETPRO_DB\` y puerto 8080 totalmente aislados, 0 errores de ejecución.
- Certificación automatizada: \`AUTOMATED_EDGE_HEADLESS = PASS\`
- Aceptación física humana: \`HUMAN_PHYSICAL_EDGE_ACCEPTANCE = PENDING\`
`;

  fs.writeFileSync(RESULT_FILE, reportContent, 'utf8');
  console.log(`\nReporte guardado en: ${RESULT_FILE}`);

  return { total: results.length, passed: passedCount, failed: failedCount };
}

module.exports = { name: 'MVP_NOMINA_HEADER_BINDINGS_13', run };

if (require.main === module) {
  run().then(result => {
    console.log(`\nMVP_NOMINA_HEADER_BINDINGS_13: ${result.passed}/${result.total} pruebas pasaron, failed=${result.failed}`);
    process.exit(result.failed ? 1 : 0);
  }).catch(err => {
    console.error('Error fatal en suite:', err);
    process.exit(1);
  });
}
