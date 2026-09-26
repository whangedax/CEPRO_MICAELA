const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const VIEW_PATH = path.join(ROOT, 'app/js/ui/documents-view.js');
const results = [];

function record(id, description, passed) {
  results.push({ id, description, passed });
  console.log(`[${passed ? 'PASSED' : 'FAILED'}] ${id}: ${description}`);
}

function makeElement() {
  const attributes = new Map();
  const classes = new Set();
  return {
    innerHTML: '', textContent: '', disabled: false, className: '', style: {}, dataset: {}, value: '',
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    classList: { toggle(name, active) { active ? classes.add(name) : classes.delete(name); } },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function makeHarness() {
  const elements = {
    '#doc-generate-btn': makeElement(),
    '#doc-search-status': makeElement(),
    '#doc-document-status': makeElement(),
    '#doc-search-results': makeElement(),
    '#doc-context-summary': makeElement(),
    '#doc-render-workspace': makeElement(),
    '#doc-flow-state': makeElement()
  };
  const resultButtons = new Map();
  elements['#doc-search-results'].querySelectorAll = () => {
    const ids = Array.from(elements['#doc-search-results'].innerHTML.matchAll(/data-context-id="([^"]+)"/g), match => match[1]);
    return ids.map(id => {
      if (!resultButtons.has(id)) {
        const button = makeElement();
        button.setAttribute('data-context-id', id);
        resultButtons.set(id, button);
      }
      return resultButtons.get(id);
    });
  };
  const container = {
    querySelector(selector) { return elements[selector] || null; },
    querySelectorAll(selector) {
      return selector === '.document-context-result' ? elements['#doc-search-results'].querySelectorAll() : [];
    }
  };
  return { container, elements, resultButtons };
}

const enrollmentA = {
  id: 'MAT-A', estudianteNombreCompleto: 'PERSONA A', estudianteDocumento: '11111111',
  programaNombre: 'PROGRAMA A', grupoCode: 'GRUPO-A'
};
const enrollmentB = {
  id: 'MAT-B', estudianteNombreCompleto: 'PERSONA B', estudianteDocumento: '22222222',
  programaNombre: 'PROGRAMA B', grupoCode: 'GRUPO-B'
};
function contextFor(enrollment) {
  return {
    institution: { id: 'INST-001', nombre: 'CETPRO REAL', tipoGestion: 'PÚBLICA', resolucion: 'RESOLUCIÓN' },
    student: { id: `EST-${enrollment.id}`, numeroDocumento: enrollment.estudianteDocumento,
      apellidosNombres: enrollment.estudianteNombreCompleto },
    enrollment: { id: enrollment.id },
    program: { id: `PROG-${enrollment.id}`, nombre: enrollment.programaNombre },
    source: { enrollmentId: enrollment.id, groupCode: enrollment.grupoCode }
  };
}

async function runIntegrationGate01Tests() {
  results.length = 0;
  console.log('\n==================================================');
  console.log('INTEGRATION-GATE-01 — ESTADO DOCUMENTAL');
  console.log('==================================================\n');

  const module = await import(`${pathToFileURL(VIEW_PATH).href}?gate=${Date.now()}`);
  const view = new module.DocumentsView();
  const harness = makeHarness();
  let searchMatches = [enrollmentA];
  const builtIds = [];
  let renderedContext = null;
  view.documentDataService = {
    async searchEnrollments() { return searchMatches; },
    async buildEnrollmentContext(id) { builtIds.push(id); return contextFor(id === enrollmentA.id ? enrollmentA : enrollmentB); }
  };
  view.pdfEngine = {
    async renderTMPL02(context) { renderedContext = context; return new Blob(['%PDF-1.7'], { type: 'application/pdf' }); }
  };
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:integration-gate';
  URL.revokeObjectURL = () => {};

  try {
    view.selectedTemplateId = 'TMPL-02';
    view._syncGenerateButton(harness.container);
    record('T-IG01-01', 'TMPL-02 sin selección mantiene disabled real', harness.elements['#doc-generate-btn'].disabled === true);

    await view._searchEnrollments(harness.container, 'PERSONA A');
    record('T-IG01-02', 'Buscar no equivale a seleccionar', view.documentState === module.DOCUMENT_STATES.RESULTS && view.selectedEnrollmentId === null && harness.elements['#doc-generate-btn'].disabled);

    await view._selectEnrollment(harness.container, enrollmentA.id);
    record('T-IG01-03', 'Seleccionar guarda únicamente matriculaId', view.selectedEnrollmentId === enrollmentA.id && !Object.hasOwn(view, 'selectedContext'));
    record('T-IG01-04', 'El resumen corresponde al ID seleccionado', harness.elements['#doc-context-summary'].innerHTML.includes('MAT-A') && harness.elements['#doc-context-summary'].innerHTML.includes('PERSONA A'));
    record('T-IG01-05', 'Generar se habilita solo en SELECTED', view.documentState === module.DOCUMENT_STATES.SELECTED && harness.elements['#doc-generate-btn'].disabled === false);

    await view._generateSelectedDocument(harness.container);
    record('T-IG01-06', 'Generar llama buildEnrollmentContext con el ID elegido', builtIds.length === 2 && builtIds.every(id => id === enrollmentA.id));
    record('T-IG01-07', 'El PDF usa ese contexto y llega al visor', renderedContext?.enrollment?.id === enrollmentA.id && view.documentState === module.DOCUMENT_STATES.READY && harness.elements['#doc-render-workspace'].innerHTML.includes('blob:integration-gate'));

    searchMatches = [enrollmentB];
    await view._searchEnrollments(harness.container, 'PERSONA B');
    await view._selectEnrollment(harness.container, enrollmentB.id);
    const originalConsoleError = console.error;
    let consoleErrorRegistered = false;
    console.error = () => { consoleErrorRegistered = true; };
    view.documentDataService.buildEnrollmentContext = async () => { throw new Error('servicio no disponible'); };
    await view._generateSelectedDocument(harness.container);
    console.error = originalConsoleError;
    record('T-IG01-08', 'El error se muestra y se registra técnicamente', consoleErrorRegistered && view.documentState === module.DOCUMENT_STATES.ERROR && harness.elements['#doc-render-workspace'].innerHTML.includes('No se pudo generar la ficha: servicio no disponible'));
    view.documentDataService.buildEnrollmentContext = async id => {
      builtIds.push(id);
      return contextFor(id === enrollmentA.id ? enrollmentA : enrollmentB);
    };

    view.selectedTemplateId = 'TMPL-01';
    view._resetContext();
    view._syncGenerateButton(harness.container);
    record('T-IG01-09', 'TMPL-01 tiene botón realmente disabled y apariencia inactiva', harness.elements['#doc-generate-btn'].disabled && harness.elements['#doc-generate-btn'].className.includes('btn-secondary'));

    const source = fs.readFileSync(VIEW_PATH, 'utf8');
    record('T-IG01-10', 'TMPL-01 no genera fixtures productivos', !/TEST-0001|ESTUDIANTE DE PRUEBA|ESTUDIANTE FIXTURE|MAT-TEST|15\/03\/2005/.test(source));

    view.selectedTemplateId = 'TMPL-02';
    searchMatches = [enrollmentA];
    await view._searchEnrollments(harness.container, 'A');
    await view._selectEnrollment(harness.container, enrollmentA.id);
    view.selectedTemplateId = 'TMPL-01';
    view._resetContext();
    record('T-IG01-11', 'Cambiar plantilla limpia la selección anterior', view.selectedEnrollmentId === null && view.documentState === module.DOCUMENT_STATES.IDLE);

    view.selectedTemplateId = 'TMPL-02';
    searchMatches = [enrollmentA];
    await view._searchEnrollments(harness.container, 'A');
    await view._selectEnrollment(harness.container, enrollmentA.id);
    searchMatches = [enrollmentB];
    await view._searchEnrollments(harness.container, 'B');
    record('T-IG01-12', 'Una búsqueda nueva invalida la selección anterior', view.selectedEnrollmentId === null && view.documentState === module.DOCUMENT_STATES.RESULTS && harness.elements['#doc-generate-btn'].disabled);

    view.selectedEnrollmentId = enrollmentA.id;
    view.documentState = module.DOCUMENT_STATES.SELECTED;
    view.selectedTemplateId = 'TMPL-01';
    const callsBefore = builtIds.length;
    await view._generateSelectedDocument(harness.container);
    record('T-IG01-13', 'No se genera con contexto de otra plantilla', builtIds.length === callsBefore && view._canGenerate(view.registry.getById('TMPL-01')) === false);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }

  const passed = results.filter(result => result.passed).length;
  const failed = results.length - passed;
  console.log(`\nRESUMEN INTEGRATION-GATE-01: TOTAL=${results.length}, PASSED=${passed}, FAILED=${failed}\n`);
  return { suite: 'INTEGRATION-GATE-01', total: results.length, passed, failed };
}

module.exports = { runIntegrationGate01Tests };
if (require.main === module) runIntegrationGate01Tests().then(result => { if (result.failed) process.exitCode = 1; });
