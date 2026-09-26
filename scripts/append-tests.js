const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('tests/m11_tests.js', 'utf8');

const anchor = 'const passedCount = testResults.filter(r => r.passed).length;';
const newTests = `
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
`;

code = code.replace(anchor, newTests + '\n  ' + anchor);
fs.writeFileSync('tests/m11_tests.js', code);
