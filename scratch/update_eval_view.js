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
const blockedOld = `<button id="btn-activate-eval-test-env-inline" class="btn btn-warning" style="padding:0.6rem 1.2rem; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">🧪</i> Probar Flujo Completo en Entorno Aislado</button>
        </div>`;

const blockedNew = `<button id="btn-generate-tmpl11-candidate" class="btn btn-success" style="padding:0.6rem 1.2rem; background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">📄</i> Generar Registro de Evaluación (TMPL-11)</button>
          <button id="btn-activate-eval-test-env-inline" class="btn btn-warning" style="padding:0.6rem 1.2rem; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">🧪</i> Probar Flujo Completo en Entorno Aislado</button>
        </div>
        <div id="evaluation-tmpl11-viewer-output" style="display:none; margin-top:1.5rem; text-align:left;"></div>`;

content = content.replace(blockedOld, blockedNew);

// 4. Bind event in _bindEvents
const bindAnchor = 'if (btnExit) btnExit.onclick = toggleMode;';
const bindNew = `if (btnExit) btnExit.onclick = toggleMode;

    const btnTmpl11 = container.querySelector('#btn-generate-tmpl11-candidate');
    if (btnTmpl11) {
      btnTmpl11.onclick = () => this._generateTmpl11Preview(container);
    }`;
content = content.replace(bindAnchor, bindNew);

// 5. Add _generateTmpl11Preview method before the closing brace
const methodCode = `
  async _generateTmpl11Preview(container) {
    const output = container.querySelector('#evaluation-tmpl11-viewer-output');
    const btn = container.querySelector('#btn-generate-tmpl11-candidate');
    if (!output) return;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try {
      const rows = Array.from({ length: 40 }, (_, i) => ({
        'student.fullName': \`ESTUDIANTE EVALUACIÓN PILOTO \${String(i + 1).padStart(2, '0')}\`,
        evaluations: [
          { ia1: 16, ia2: 15, ia3: 17, score: 16, recovery: null },
          { ia1: 14, ia2: 14, ia3: 15, score: 14, recovery: null },
          { ia1: 18, ia2: 17, ia3: 19, score: 18, recovery: null },
          { ia1: 12, ia2: 13, ia3: 14, score: 13, recovery: null },
          { ia1: 16, ia2: 16, ia3: 17, score: 16, recovery: null }
        ],
        finalResult: 15
      }));
      const blob = await this.templateEngine.renderEvaluationTMPL11({
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
        period: { nombre: '2026-I' },
        module: { nombre: 'OFIMÁTICA AVANZADA' },
        unit: { nombre: 'HERRAMIENTAS OFIMÁTICAS', orden: 1, capacidad: 'Gestionar documentos y hojas de cálculo según estándares.' },
        group: { turno: 'NOCHE', ciclo: 'I', seccion: 'A' },
        institution: { nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"' },
        indicators: [
          'Aplica formatos avanzados de texto y tablas según requerimientos.',
          'Elabora fórmulas complejas y funciones lógicas en hojas de cálculo.',
          'Diseña presentaciones multimedia de alto impacto corporativo.',
          'Integra bases de datos con combinación de correspondencia.',
          'Automatiza procesos repetitivos utilizando macros y plantillas.'
        ],
        rows,
        demoMode: false
      });
      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = URL.createObjectURL(blob);
      output.style.display = 'block';
      output.innerHTML = \`
        <div class="alert alert-success mt-2">
          <strong>TMPL-11 generada exitosamente.</strong> Vista previa técnica sobre plantilla canónica A3 vertical.
        </div>
        <div class="mvp-actions mb-2 d-flex gap-2" style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
          <button id="btn-tmpl11-print" class="btn btn-secondary">Imprimir</button>
          <a class="btn btn-primary" href="\${this.blobUrl}" download="TMPL-11_EVALUACION_PREVIEW.pdf">Descargar PDF</a>
        </div>
        <iframe title="Vista previa TMPL-11" src="\${this.blobUrl}" width="100%" height="750" style="border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      \`;
      output.querySelector('#btn-tmpl11-print').onclick = () => {
        const frame = output.querySelector('iframe');
        frame?.contentWindow?.focus();
        frame?.contentWindow?.print();
      };
      output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      Notifications.error(error.message);
      output.style.display = 'block';
      output.innerHTML = \`<div class="alert alert-danger">\${escapeHtml(error.message)}</div>\`;
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    }
  }
}
\`;

content = content.replace(/\n\}\s*$/, methodCode);

fs.writeFileSync('app/js/ui/evaluation-view.js', content, 'utf8');
console.log('evaluation-view.js written successfully. Length:', content.length);
