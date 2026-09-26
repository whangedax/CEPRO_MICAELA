const fs = require('fs');

let code = fs.readFileSync('app/js/ui/documents-view.js', 'utf8');

const start = code.indexOf('container.innerHTML = `');
const end = code.indexOf('this._bindEvents(container);');

const newHTML = `
    const isTMPL01 = this.selectedTemplateId === 'TMPL-01';
    
    let controlsHtml = '';
    
    if (isTMPL01) {
      controlsHtml = \`
        <div class="card mb-4 shadow-sm">
          <div class="card-body">
            <div class="row g-3 align-items-center">
              <div class="col-md-6">
                <label class="form-label fw-bold small">Plantilla Documental:</label>
                <select id="doc-template-select" class="form-select form-select-sm">
                  \${templateOptions}
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold me-2">Fixture de prueba (TEST_ONLY):</label>
                <select id="fixture-size-select" class="form-select form-select-sm d-inline-block w-auto">
                  <option value="1" \${this.testFixtureSize === 1 ? 'selected' : ''}>1 Estudiante</option>
                  <option value="10" \${this.testFixtureSize === 10 ? 'selected' : ''}>10 Estudiantes</option>
                  <option value="30" \${this.testFixtureSize === 30 ? 'selected' : ''}>30 Estudiantes (Full)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      \`;
    } else {
      controlsHtml = \`
        <div class="card mb-4 shadow-sm">
          <div class="card-body">
            <div class="row g-3 align-items-center">
              <div class="col-md-3">
                <label class="form-label fw-bold small">Plantilla Documental (21 Fuentes):</label>
                <select id="doc-template-select" class="form-select form-select-sm">
                  \${templateOptions}
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label small fw-bold me-2">Modo de Renderizado:</label>
                <select id="doc-mode-select" class="form-select form-select-sm d-inline-block w-auto">
                  <option value="DRAFT_PREVIEW" \${this.selectedMode === 'DRAFT_PREVIEW' ? 'selected' : ''}>Preview Borrador (Sin Datos)</option>
                  <option value="TEST_PREVIEW" \${this.selectedMode === 'TEST_PREVIEW' ? 'selected' : ''}>Preview Técnico (Test Fixtures)</option>
                  <option value="DEBUG_BOXES" \${this.selectedMode === 'DEBUG_BOXES' ? 'selected' : ''}>Auditoría Geométrica (DEBUG_BOXES)</option>
                  <option value="CANONICAL_UNDERLAY_ONLY" \${this.selectedMode === 'CANONICAL_UNDERLAY_ONLY' ? 'selected' : ''}>Underlay Canónico Puro</option>
                </select>
              </div>

              <div class="col-md-3">
                <label class="form-label fw-bold small">Modo de Visualización:</label>
                <select id="doc-comparison-select" class="form-select form-select-sm" \${!isImplemented ? 'disabled' : ''}>
                  <option value="NORMAL_RENDER" \${this.comparisonMode === 'NORMAL_RENDER' ? 'selected' : ''}>Vista Normal de Secretaría (Render)</option>
                  <option value="SIDE_BY_SIDE" \${this.comparisonMode === 'SIDE_BY_SIDE' ? 'selected' : ''}>Lado a Lado (Modo Auditoría Visual)</option>
                  <option value="OVERLAY" \${this.comparisonMode === 'OVERLAY' ? 'selected' : ''}>Superposición (Modo Auditoría Visual)</option>
                </select>
                <div class="row gx-2">
                  <div class="col-md-3">
                    <div class="p-2 border rounded text-center mb-2 bg-white">
                      <div class="small text-muted fw-bold mb-1">PAGE_1</div>
                      <div class="h5 mb-0 text-primary" id="diag-rendered-count">0</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="p-2 border rounded text-center mb-2 bg-white">
                      <div class="small text-muted fw-bold mb-1">OVERFLOW</div>
                      <div class="h5 mb-0 text-danger" id="diag-overflow-count">0</div>
                    </div>
                  </div>
                </div>

                <div class="col-md-12 text-muted mt-2 border-top pt-2" style="font-family: monospace; font-size: 0.85em;">
                  M11_RUNTIME_BUILD = M11.11<br>
                  underlaySrc = <span id="diag-underlay-src">N/A</span><br>
                  underlayNaturalWidth = <span id="diag-underlay-w">N/A</span><br>
                  underlayNaturalHeight = <span id="diag-underlay-h">N/A</span><br>
                  selectedMode = <span id="diag-selected-mode">N/A</span><br>
                  pageCount = <span id="diag-page-count">1</span>
                </div>
              </div>

              <div class="col-md-3 text-end pt-3">
                <button id="doc-print-btn" class="btn btn-outline-dark btn-sm w-100" \${!isImplemented ? 'disabled' : ''}>
                  <i class="bi bi-printer me-1"></i>Imprimir Render
                </button>
              </div>
            </div>

            <div class="row mt-3 pt-2 border-top align-items-center">
              <div class="col-md-6 \${this.selectedMode !== 'TEST_PREVIEW' ? 'd-none' : ''}">
                <label class="form-label small fw-bold me-2">Fixture TEST_ONLY (Número de Estudiantes):</label>
                <select id="fixture-size-select" class="form-select form-select-sm d-inline-block w-auto">
                  <option value="0" \${this.testFixtureSize === 0 ? 'selected' : ''}>0 Estudiantes → Tabla Limpia</option>
                  <option value="1" \${this.testFixtureSize === 1 ? 'selected' : ''}>1 Estudiante → 1 Página</option>
                  <option value="10" \${this.testFixtureSize === 10 ? 'selected' : ''}>10 Estudiantes → 1 Página</option>
                  <option value="30" \${this.testFixtureSize === 30 ? 'selected' : ''}>30 Estudiantes → 1 Página</option>
                  <option value="31" \${this.testFixtureSize === 31 ? 'selected' : ''}>31 Estudiantes → 2 Páginas</option>
                  <option value="60" \${this.testFixtureSize === 60 ? 'selected' : ''}>60 Estudiantes → 2 Páginas</option>
                  <option value="61" \${this.testFixtureSize === 61 ? 'selected' : ''}>61 Estudiantes → Capacidad Superada (>60)</option>
                </select>
              </div>

              <div id="page-segment-controls" class="col-md-6 \${this.comparisonMode === 'NORMAL_RENDER' ? 'd-none' : ''}">
                <label class="form-label small fw-bold me-2">Página de Auditoría Segmentada:</label>
                <div class="btn-group btn-group-sm" role="group">
                  <button type="button" id="btn-seg-page1" class="btn \${this.selectedPageSegment === 1 ? 'btn-primary' : 'btn-outline-primary'}">Página 1</button>
                  <button type="button" id="btn-seg-page2" class="btn \${this.selectedPageSegment === 2 ? 'btn-primary' : 'btn-outline-primary'}">Página 2</button>
                </div>
              </div>
            </div>

            <div id="overlay-controls-row" class="row mt-3 pt-2 border-top align-items-center \${this.comparisonMode !== 'OVERLAY' ? 'd-none' : ''}">
              <div class="col-md-6">
                <label for="opacity-range" class="form-label small fw-bold">Opacidad de Render sobre PNG Original (\${Math.round(this.overlayOpacity * 100)}%):</label>
                <input type="range" class="form-range" id="opacity-range" min="0" max="1" step="0.05" value="\${this.overlayOpacity}">
              </div>
              <div class="col-md-6 text-end">
                <span class="badge bg-secondary">Comparando con PNG Segmentado Inmutable</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- M11.9 Diagnóstico en Edge Real -->
        <div id="diagnostic-m11-9" class="no-print alert alert-warning small mb-3 border-warning shadow-sm">
          <strong>Runtime build:</strong> M11.9-EDGE<br>
          <strong>selectedTemplateId:</strong> <span id="diag-template-id">\${escapeHtml(this.selectedTemplateId)}</span><br>
          <strong>fixtureSelected:</strong> <span id="diag-fixture-selected">\${this.testFixtureSize}</span><br>
          <strong>fixtureStudents.length:</strong> <span id="diag-fixture-length">0</span>
        </div>
      \`;
    }

    container.innerHTML = \`
      <div class="documents-module-container p-4">
        <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <div>
            <h2 class="m-0 text-primary"><i class="bi bi-file-earmark-pdf me-2"></i>Motor Documental Institucional (M10)</h2>
            <p class="text-muted m-0 small">Infraestructura común de plantillas, mapeo declarativo, renderizado HTML5/SVG y paginación condicional.</p>
          </div>
          <div>
            <span class="badge bg-danger p-2 fs-6">
              <i class="bi bi-lock-fill me-1"></i>EMISIÓN OFICIAL BLOQUEADA
            </span>
          </div>
        </div>

        <div class="alert alert-warning border-warning shadow-sm mb-4">
          <h5 class="alert-heading fs-6 fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Reglas Institucionales de Emisión Bloqueadas (B-004 / B-007)</h5>
          <p class="small mb-1">La emisión oficial de documentos (TMPL-01 Nómina) permanece <strong>BLOQUEADA</strong> (academicClosureAllowed = false). Documento no habilitado para emisión oficial: falta periodo académico oficial y asignación oficial de módulo.</p>
          <ul class="small mb-0 ps-3">
            <li><strong>B-004:</strong> Asignación oficial de Módulo I / Módulo II por grupo pendiente.</li>
            <li><strong>B-007:</strong> Resolución institucional de apertura del Periodo Académico oficial pendiente.</li>
          </ul>
        </div>

        \${controlsHtml}

        <!-- Visor del Render Documental -->
        <div class="card shadow-sm">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <span class="fw-bold text-dark small"><i class="bi bi-eye me-1"></i>Visor Documental (\${currentTemplate ? escapeHtml(currentTemplate.code) : ''})</span>
            <span class="badge \${isImplemented ? 'bg-success' : 'bg-secondary'}">\${isImplemented ? 'DOCUMENTO LÓGICO ÚNICO' : 'PLANTILLA NO IMPLEMENTADA EN M10'}</span>
          </div>
          <div class="card-body p-3 overflow-auto" id="doc-render-workspace" style="min-height: 500px; background-color: #f8f9fa;">
            <!-- Contenido dinámico renderizado por JS -->
          </div>
        </div>
      </div>
    \`;
`;

code = code.substring(0, start) + newHTML + code.substring(end);
fs.writeFileSync('app/js/ui/documents-view.js', code);
