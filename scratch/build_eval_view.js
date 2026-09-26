const fs = require('fs');
let content = fs.readFileSync('app/js/ui/evaluation-view.js.BACKUP_ARRANQUE', 'utf8');

// 1. Add import
content = content.replace(
  "import { AttendanceView } from './attendance-view.js';",
  "import { AttendanceView } from './attendance-view.js';\nimport { PdfTemplateEngine } from '../services/pdf-template-engine.js';"
);

// 2. Add templateEngine to constructor
content = content.replace(
  "this.enrollmentService = options.enrollmentService || new EnrollmentService();",
  "this.enrollmentService = options.enrollmentService || new EnrollmentService();\n    this.templateEngine = options.templateEngine || new PdfTemplateEngine();\n    this.blobUrl = null;"
);

// 3. Add button and output in _renderProductionBlockedUI
const blockedOld = '<button id="btn-activate-eval-test-env-inline" class="btn btn-warning" style="padding:0.6rem 1.2rem; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">🧪</i> Probar Flujo Completo en Entorno Aislado</button>\n        </div>';

const blockedNew = '<button id="btn-generate-tmpl11-candidate" class="btn btn-success" style="padding:0.6rem 1.2rem; background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">📄</i> Generar Registro de Evaluación (TMPL-11)</button>\n          <button id="btn-activate-eval-test-env-inline" class="btn btn-warning" style="padding:0.6rem 1.2rem; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">🧪</i> Probar Flujo Completo en Entorno Aislado</button>\n        </div>\n        <div id="evaluation-tmpl11-viewer-output" style="display:none; margin-top:1.5rem; text-align:left;"></div>';

content = content.replace(blockedOld, blockedNew);

// 4. Bind event in _bindEvents
const bindAnchor = 'if (btnExit) btnExit.onclick = toggleMode;';
const bindNew = 'if (btnExit) btnExit.onclick = toggleMode;\n\n    const btnTmpl11 = container.querySelector("#btn-generate-tmpl11-candidate");\n    if (btnTmpl11) {\n      btnTmpl11.onclick = () => this._generateTmpl11Preview(container);\n    }';
content = content.replace(bindAnchor, bindNew);

// 5. Append method from file
const methodCode = fs.readFileSync('scratch/tmpl11_method.txt', 'utf8');
content = content.replace(/\n\}\s*$/, methodCode);

fs.writeFileSync('app/js/ui/evaluation-view.js', content, 'utf8');
console.log('evaluation-view.js successfully built! Total length:', content.length);
