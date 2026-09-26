const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('tests/m11_tests.js', 'utf8');

const anchor = 'const passedCount = testResults.filter(r => r.passed).length;';
const newTests = `
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
    const isClean = !docsViewCode.includes('printBtn.onclick = () => {\\n             const w = window.open(this.pdfBlobUrl);');
    recordTest('T-M11-30', 'documents-view.js no usa printBtn en el camino TMPL-01', isClean);
  } catch(e) {
    recordTest('T-M11-30', 'documents-view.js printBtn check', false, e.message);
  }
`;

code = code.replace(anchor, newTests + '\n  ' + anchor);
fs.writeFileSync('tests/m11_tests.js', code);
