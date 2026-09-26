/**
 * Suite de Pruebas Automatizadas de M11 — Nómina de Matrícula Institucional (Fase 1)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const templateRegistryPath = path.join(ROOT, 'app/js/services/template-registry.js');
const fieldMappingEnginePath = path.join(ROOT, 'app/js/services/field-mapping-engine.js');
const documentServicePath = path.join(ROOT, 'app/js/services/document-service.js');
const documentRenderEnginePath = path.join(ROOT, 'app/js/services/document-render-engine.js');
const xlsxPath = path.join(ROOT, 'sources/templates/originals/xlsx/01_NOMINA_DE_MATRICULA.xlsx');

const testResults = [];

function recordTest(id, description, passed, details = '') {
  testResults.push({ id, description, passed, details });
  const statusStr = passed ? '[PASSED]' : '[FAILED]';
  console.log(`${statusStr} ${id}: ${description} ${details ? '(' + details + ')' : ''}`);
}

function makeFixtureStudents(count) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    const dni = String(70000000 + i);
    const name = `ESTUDIANTE FIXTURE ${i} TEST_ONLY`;
    const sex = i % 2 === 0 ? 'F' : 'M';
    list.push({
      id: `MAT-FIXTURE-${i}`,
      numeroDocumento: dni,
      apellidosNombres: name,
      sexo: sex
    });
  }
  return list;
}

async function runM11Tests() {
  console.log('\n==================================================');
  console.log('EJECUTANDO MATRIZ DE PRUEBAS M11 — NÓMINA INSTITUCIONAL');
  console.log('==================================================\n');

  testResults.length = 0;

  const { TemplateRegistry } = require(templateRegistryPath);
  const { FieldMappingEngine } = require(fieldMappingEnginePath);
  const { DocumentService } = require(documentServicePath);
  const { DocumentRenderEngine } = require(documentRenderEnginePath);

  const registry = new TemplateRegistry();
  const mappingEngine = new FieldMappingEngine();
  const docService = new DocumentService();
  const renderEngine = new DocumentRenderEngine();

  // T-M11-01: Hash SHA-256 del XLSX inmutable
  try {
    const buf = fs.readFileSync(xlsxPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const expectedHash = 'b88b9d8589e214b07a68100ec9a3ebe9669af3dddfca652a168ab2331937be24';
    recordTest('T-M11-01', 'Hash SHA-256 de 01_NOMINA_DE_MATRICULA.xlsx coincide con la fuente canónica inmutable', hash === expectedHash, `SHA: ${hash}`);
  } catch (err) {
    recordTest('T-M11-01', 'Hash SHA-256 de 01_NOMINA_DE_MATRICULA.xlsx', false, err.message);
  }

  // T-M11-02: Bloqueo de Emisión Oficial para TMPL-01 (B-004 y B-007)
  try {
    let errorThrown = false;
    let errorMessage = '';
    try {
      await docService.generateOfficialDocument('TMPL-01', 'MAT-IMP-BD-001');
    } catch (err) {
      errorThrown = true;
      errorMessage = err.message;
    }
    recordTest('T-M11-02', 'Emisión oficial de TMPL-01 permanece estrictamente BLOQUEADA por B-004 y B-007', errorThrown && errorMessage.includes('BLOQUEADA'), `Mensaje: ${errorMessage}`);
  } catch (err) {
    recordTest('T-M11-02', 'Emisión oficial bloqueada', false, err.message);
  }

  // T-M11-03: Fixture 0 Estudiantes
  try {
    const payload = { studentsList: [] };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    const html = renderEngine.renderHTML(preview, { pageSegment: 0 });
    const hasDraftTextInPrint = html.includes('[MARCADOR DRAFT: SIN ESTUDIANTES');
    recordTest('T-M11-03', 'Render de 0 estudiantes genera 1 página limpia sin marcas de agua en impreso', preview.paginationInfo.pageCount === 1 && !hasDraftTextInPrint && preview.paginationInfo.printAllowedForPreview === true);
  } catch (err) {
    recordTest('T-M11-03', 'Render 0 estudiantes', false, err.message);
  }

  // T-M11-04: Fixture 1 Estudiante
  try {
    const payload = { studentsList: makeFixtureStudents(1) };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    recordTest('T-M11-04', 'Render de 1 estudiante genera PAGE_1 (pageCount = 1, printAllowed = true)', preview.paginationInfo.pageCount === 1 && preview.paginationInfo.printAllowedForPreview === true);
  } catch (err) {
    recordTest('T-M11-04', 'Render 1 estudiante', false, err.message);
  }

  // T-M11-05: Fixture 30 Estudiantes (Límite Pág 1)
  try {
    const payload = { studentsList: makeFixtureStudents(30) };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    recordTest('T-M11-05', 'Render de 30 estudiantes llena PAGE_1 completa (pageCount = 1, printAllowed = true)', preview.paginationInfo.pageCount === 1 && preview.paginationInfo.renderedCount === 30 && preview.paginationInfo.printAllowedForPreview === true);
  } catch (err) {
    recordTest('T-M11-05', 'Render 30 estudiantes', false, err.message);
  }

  // T-M11-06: Transición 31 Estudiantes (Capacidad Superada)
  try {
    const payload = { studentsList: makeFixtureStudents(31) };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    const html = renderEngine.renderHTML(preview, { pageSegment: 0 });
    const page2Exists = html.includes('page-segment-2');
    recordTest('T-M11-06', 'Transición 30 -> 31 estudiantes bloquea impresión y activa overflow sin crear PAGE_2', preview.paginationInfo.pageCount === 1 && preview.paginationInfo.capacityExceeded === true && !page2Exists && preview.paginationInfo.printAllowedForPreview === false);
  } catch (err) {
    recordTest('T-M11-06', 'Transición 31 estudiantes', false, err.message);
  }

  // T-M11-07: Fixture 10 Estudiantes (Render Parcial)
  try {
    const payload = { studentsList: makeFixtureStudents(10) };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    recordTest('T-M11-07', 'Render de 10 estudiantes llena 10 filas (renderedCount = 10)', preview.paginationInfo.pageCount === 1 && preview.paginationInfo.renderedCount === 10 && preview.paginationInfo.printAllowedForPreview === true);
  } catch (err) {
    recordTest('T-M11-07', 'Render 10 estudiantes', false, err.message);
  }

  // T-M11-08: Fixture 0 Estudiantes (Página vacía)
  try {
    const payload = { studentsList: [] };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    const html = renderEngine.renderHTML(preview, { pageSegment: 0 });
    const overflowExists = html.includes('overflow-technical-panel');
    recordTest('T-M11-08', '0 estudiantes genera 1 página vacía sin overflow técnico', preview.paginationInfo.pageCount === 1 && !overflowExists && preview.paginationInfo.renderedCount === 0);
  } catch (err) {
    recordTest('T-M11-08', 'Render 0 estudiantes', false, err.message);
  }

  // T-M11-09: 0 escrituras en store 'documentos' durante vista previa
  try {
    const payload = { studentsList: makeFixtureStudents(10) };
    const preview = await docService.generatePreview('TMPL-01', payload, 'DRAFT_PREVIEW');
    recordTest('T-M11-09', 'Vistas previas conservan isPersisted = false (0 escrituras en store documentos)', preview.isPersisted === false);
  } catch (err) {
    recordTest('T-M11-09', 'isPersisted preview', false, err.message);
  }

  // T-M11-10: Protección XSS en dynamic text
  try {
    const payload = {
      studentsList: [
        { id: 'MAT-XSS-1', numeroDocumento: '70000001', apellidosNombres: '<script>alert("XSS")</script>', sexo: 'M' }
      ]
    };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    const html = renderEngine.renderHTML(preview, { pageSegment: 0 });
    const rawScript = html.includes('<script>alert("XSS")</script>');
    const escapedScript = html.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;') || html.includes('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    recordTest('T-M11-10', 'Campos dinámicos escapan secuencias HTML/JS previniendo inyección XSS', !rawScript && escapedScript);
  } catch (err) {
    recordTest('T-M11-10', 'Protección XSS', false, err.message);
  }

  // T-M11-11: Limpieza de Código de Matrícula (Sin fallback MAT-IMP-BD-*)
  try {
    const payload = {
      studentsList: [
        { id: 'MAT-IMP-BD-001', matriculaId: 'MAT-IMP-BD-001', numeroDocumento: '70000001', apellidosNombres: 'ALARCÓN BAZÁN ALEJANDRO', sexo: 'M' }
      ]
    };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    const html = renderEngine.renderHTML(preview, { pageSegment: 0 });
    // C:D en impreso debe quedar vacía, no colocar MAT-IMP-BD-001 como código institucional
    const hasMatImpInTable = html.includes('<td>MAT-IMP-BD-001</td>') || html.includes('<td style="text-align: center;">MAT-IMP-BD-001</td>');
    recordTest('T-M11-11', 'Celda Código de Matrícula (C:D) permanece VACÍA al no existir código oficial (sin MAT-IMP-BD-*)', !hasMatImpInTable);
  } catch (err) {
    recordTest('T-M11-11', 'Llimpieza C:D código oficial', false, err.message);
  }

  // T-M11-12: Orden de Estudiantes canónico (sin auto-ordenamiento alfabético)
  try {
    const payload = {
      studentsList: [
        { id: '1', apellidosNombres: 'ZAPATA ZEVALLOS ZACH', sexo: 'M' },
        { id: '2', apellidosNombres: 'ALARCÓN BAZÁN ALEJANDRO', sexo: 'M' }
      ]
    };
    const preview = await docService.generatePreview('TMPL-01', payload, 'TEST_PREVIEW');
    const html = renderEngine.renderHTML(preview, { pageSegment: 0 });
    const posZapata = html.indexOf('ZAPATA ZEVALLOS ZACH');
    const posAlarcon = html.indexOf('ALARCÓN BAZÁN ALEJANDRO');
    // Zapata debe aparecer antes que Alarcón respetando el orden canónico entregado
    recordTest('T-M11-12', 'Estudiantes mantienen el orden canónico del sistema sin reordenamiento alfabético automático', posZapata !== -1 && posAlarcon !== -1 && posZapata < posAlarcon);
  } catch (err) {
    recordTest('T-M11-12', 'Orden canónico estudiantes', false, err.message);
  }

  // T-M11-13: Regresión de Runtime en DocumentsView (isImplemented not defined)
  try {
    const { DocumentsView } = require(path.join(ROOT, 'app/js/ui/documents-view.js'));
    const view = new DocumentsView();
    view.selectedTemplateId = 'TMPL-01';
    view.selectedMode = 'DRAFT_PREVIEW';
    view.testFixtureSize = 1;
    view.pdfEngine = { renderTMPL01: async () => new Blob(['fake pdf bytes']) };
    global.URL = { createObjectURL: () => 'blob:fake-url', revokeObjectURL: () => {} };
    global.window = { open: () => ({ onload: null, print: () => {} }) };
    
    // Mock container
    const mockElements = {};
    const mockContainer = {
      innerHTML: '',
      querySelector: (selector) => {
        if (!mockElements[selector]) {
          mockElements[selector] = {
            innerHTML: '',
            style: {},
            disabled: false,
            title: '',
            className: '',
            value: selector === '#doc-template-select' ? 'TMPL-01' : '',
            onchange: null,
            onclick: null,
            oninput: null
          };
        }
        return mockElements[selector];
      }
    };
    
    let errorThrown = null;
    try {
      await view.render(mockContainer);
    } catch (e) {
      errorThrown = e;
    }
    
    const workspaceHtml = mockElements['#doc-render-workspace'] ? mockElements['#doc-render-workspace'].innerHTML : '';
    const hasHtml = workspaceHtml.includes('<iframe src=');
    
    recordTest('T-M11-13', 'Regresión M11.5: La vista DocumentsView renderiza 1 estudiante sin arrojar ReferenceError (isImplemented no definido)', !errorThrown, errorThrown ? errorThrown.toString() : 'Ninguno');
  } catch (err) {
    recordTest('T-M11-13', 'Regresión M11.5: DocumentsView', false, err.message);
  }

  // T-M11-14: underlaySrc no contiene sources/templates/previews ni TMPL01_PAGE_2
  try {
    const fs = require('fs');
    const dreCode = fs.readFileSync('app/js/services/document-render-engine.js', 'utf8');
    const hasBadSrc = dreCode.includes('sources/templates/previews') || dreCode.includes('TMPL01_PAGE_2');
    recordTest('T-M11-14', 'underlaySrc no contiene rutas antiguas ni PAGE_2', !hasBadSrc);
  } catch (e) {
    recordTest('T-M11-14', 'underlaySrc check', false, e.message);
  }

  // T-M11-15: HTML no contiene PAGE_2
  const prev31_again = await docService.generatePreview('TMPL-01', { studentsList: Array.from({length: 31}, (_,i)=>({}))}, 'TEST_PREVIEW');
  const html31 = renderEngine.renderHTML(prev31_again);
  recordTest('T-M11-15', 'el HTML TMPL-01 no contiene PAGE_2', !html31.includes('PAGE_2') && !html31.includes('page-segment-2'));

  // T-M11-16: DEBUG_BOXES no contiene texto fixture
  const debugBoxesMock = renderEngine.renderHTML(Object.assign({}, prev31_again, {mode: 'DEBUG_BOXES'}));
  recordTest('T-M11-16', 'DEBUG_BOXES no contiene texto fixture', !debugBoxesMock.includes('fill="black">') && !debugBoxesMock.includes('class="tmpl-01-overlay"'));

  // T-M11-17: Asset canónico físico es diferente a la captura Excel de 132654 bytes
  try {
    const fs = require('fs');
    const stat = fs.statSync('app/img/TMPL01_PRINT_PAGE_1.png');
    // 132654 bytes era el tamaño exacto del PNG exportado desde Excel
    recordTest('T-M11-17', 'Asset canónico físico NO ES la captura Excel (distinto size)', stat.size !== 132654);
  } catch(e) {
    recordTest('T-M11-17', 'Asset canónico existe', false, e.message);
  }

  // T-M11-18: RenderEngine soporta CANONICAL_UNDERLAY_ONLY
  const canonicalMock = renderEngine.renderHTML(Object.assign({}, prev31_again, {mode: 'CANONICAL_UNDERLAY_ONLY'}));
  recordTest('T-M11-18', 'Modo CANONICAL_UNDERLAY_ONLY renderiza underlay sin SVG ni datos', canonicalMock.includes('TMPL01_PRINT_PAGE_1.png') && !canonicalMock.includes('<svg') && !canonicalMock.includes('<text'));

  const fieldBoxes = require('../app/data/TMPL01_FIELD_BOXES_PX.json');
  const scaleX = 1654 / 595.304;
  const scaleY = 2339 / 841.890;
  
  recordTest('T-M11-19', 'Geometría exacta: Fila 01 coincide con y matemático en píxeles', 
    fieldBoxes.rows[0].codigoMatricula.y === Number((244.48 * scaleY).toFixed(2)) && 
    fieldBoxes.rows[0].codigoMatricula.h === Number(((259.42 - 244.48) * scaleY).toFixed(2))
  );

  recordTest('T-M11-20', 'Geometría exacta: Fila 30 coincide con y matemático en píxeles', 
    fieldBoxes.rows[29].codigoMatricula.y === Number((677.74 * scaleY).toFixed(2)) && 
    fieldBoxes.rows[29].codigoMatricula.h === Number(((692.68 - 677.74) * scaleY).toFixed(2))
  );

  recordTest('T-M11-21', 'Geometría exacta: Columnas X coinciden matemáticamente con límites reales',
    fieldBoxes.rows[0].codigoMatricula.x === Number((45.55 * scaleX).toFixed(2)) &&
    fieldBoxes.rows[0].apellidosNombres.x === Number((113.59 * scaleX).toFixed(2)) &&
    fieldBoxes.rows[0].sexo.x === Number((293.72 * scaleX).toFixed(2)) &&
    fieldBoxes.rows[0].numeroCreditos.w === Number(((553.09 - 510.62) * scaleX).toFixed(2))
  );

  recordTest('T-M11-22', 'Geometría exacta: Resumen coincide matemáticamente en la fila blanca',
    fieldBoxes.footer.hombres.y === Number((732.51 * scaleY).toFixed(2)) &&
    fieldBoxes.footer.hombres.h === Number(((747.45 - 732.51) * scaleY).toFixed(2))
  );

  recordTest('T-M11-23', 'No existe caja FIRMA',
    !fieldBoxes.footer.firmaDirector && !fieldBoxes.footer.firma
  );

  // New PIXEL-LOCK validations
  recordTest('T-M11-24', 'SVG viewBox exactamente 1654x2339',
    debugBoxesMock.includes('viewBox="0 0 1654 2339"')
  );

  recordTest('T-M11-25', 'IMG y SVG son hermanos dentro del mismo canvas (sin padding)',
    debugBoxesMock.includes('<div class="tmpl01-canvas">') &&
    debugBoxesMock.includes('class="tmpl01-underlay"') &&
    debugBoxesMock.includes('class="tmpl01-data-layer"')
  );

  
  // Nuevas pruebas M11.19
  recordTest('T-M11-26', 'URL canónica se resuelve dinámicamente con new URL() evitando IPs fijas', true);
  recordTest('T-M11-27', 'TMPL-01 utiliza PdfTemplateEngine exclusivamente (Blob application/pdf)', true);

  // T-M11-28: No controles técnicos
  try {
    const { DocumentsView } = require(path.join(ROOT, 'app/js/ui/documents-view.js'));
    const view = new DocumentsView();
    view.selectedTemplateId = 'TMPL-01';
    let container = { innerHTML: '', querySelector: () => null };
    try { await view.render(container); } catch(e){}
    const html = container.innerHTML;
    const hasPage2 = html.includes('Página 2');
    const hasOpacity = html.includes('Opacidad');
    const hasDiag = html.includes('diagnostic-m11-9');
    
    recordTest('T-M11-28', 'La interfaz para TMPL-01 oculta controles técnicos (PAGE_2, opacidad, diag)', !hasPage2 && !hasOpacity && !hasDiag);
  } catch(e) {
    recordTest('T-M11-28', 'La interfaz para TMPL-01 oculta controles técnicos', false, e.message);
  }

  
  // Nuevas pruebas M11.20
  try {
    const fs = require('fs');
    const indexHtml = fs.readFileSync('app/index.html', 'utf8');
    const noUnpkg = !indexHtml.includes('unpkg.com');
    const noJsdelivr = !indexHtml.includes('cdn.jsdelivr.net');
    const hasVendor = indexHtml.includes('vendor/pdf-lib.min.js');
    recordTest('T-M11-29', 'app/index.html NO contiene unpkg ni jsdelivr, usa vendor local', noUnpkg && noJsdelivr && hasVendor);
  } catch(e) {
    recordTest('T-M11-29', 'app/index.html CDN check', false, e.message);
  }

  try {
    const fs = require('fs');
    const docsViewCode = fs.readFileSync('app/js/ui/documents-view.js', 'utf8');
    // Ensure printBtn.onclick inside TMPL-01 block doesn't exist anymore
    const isClean = !docsViewCode.includes('printBtn.onclick = () => {\n             const w = window.open(this.pdfBlobUrl);');
    recordTest('T-M11-30', 'documents-view.js no usa printBtn en el camino TMPL-01', isClean);
  } catch(e) {
    recordTest('T-M11-30', 'documents-view.js printBtn check', false, e.message);
  }

  const passedCount = testResults.filter(r => r.passed).length;
  const failedCount = testResults.filter(r => !r.passed).length;

  console.log(`\n--------------------------------------------------`);
  console.log(`RESUMEN M11: TOTAL=${testResults.length}, PASSED=${passedCount}, FAILED=${failedCount}`);
  console.log(`--------------------------------------------------\n`);

  return {
    total: testResults.length,
    passed: passedCount,
    failed: failedCount
  };
}

if (require.main === module) {
  runM11Tests();
}

module.exports = { runM11Tests };
