/**
 * Espacio documental productivo común (#/documentos).
 * Centro de Emisión Documental orientado a Secretaría Académica.
 * Categorización en 4 Etapas del Ciclo Académico con flujo guiado de 3 pasos.
 * Mantiene 100% de compatibilidad hacia atrás con selectores y pruebas existentes.
 */
import { TemplateRegistry } from '../services/template-registry.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';
import { DocumentDataService } from '../services/document-data-service.js';
import { DocumentValidationService } from '../services/document-validation-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';
import { MvpAdminService } from '../services/mvp-admin-service.js';
import { MvpPdfService } from '../services/mvp-pdf-service.js';

export const DOCUMENT_STATES = Object.freeze({
  IDLE: 'IDLE',
  SEARCHING: 'SEARCHING',
  RESULTS: 'RESULTS',
  SELECTED: 'SELECTED',
  GENERATING: 'GENERATING',
  READY: 'READY',
  ERROR: 'ERROR'
});

const GROUP_PENDING_MESSAGE = 'La nómina administrativa está disponible en la sección Nóminas.';

/**
 * Catálogo estructurado de las 4 etapas del ciclo formativo
 */
export const DOCUMENT_STAGES = Object.freeze([
  {
    id: 'ETAPA_1',
    number: '1',
    title: 'Matrícula e Inicio',
    shortTitle: '1. Matrícula',
    subtitle: 'Nómina oficial, fichas de matrícula y portadas de carpeta',
    icon: 'bi-pencil-square',
    badge: '4 documentos oficiales',
    templates: ['TMPL-01', 'TMPL-02', 'TMPL-04', 'TMPL-03']
  },
  {
    id: 'ETAPA_2',
    number: '2',
    title: 'Registro Auxiliar Docente',
    shortTitle: '2. Aula y Asistencia',
    subtitle: 'Seguimiento: Asistencia (UD1-UD6) y Evaluación (UD1-UD7)',
    icon: 'bi-calendar-check',
    badge: '13 UDs operativas',
    templates: [
      'TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10',
      'TMPL-11', 'TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17'
    ]
  },
  {
    id: 'ETAPA_3',
    number: '3',
    title: 'Cierre Modular y Prácticas',
    shortTitle: '3. Cierre y Prácticas',
    subtitle: 'Consolidado EFSRT y Acta Oficial de Evaluación Modular',
    icon: 'bi-check2-circle',
    badge: '2 documentos',
    templates: ['TMPL-18', 'TMPL-19']
  },
  {
    id: 'ETAPA_4',
    number: '4',
    title: 'Certificación y Egreso',
    shortTitle: '4. Certificación',
    subtitle: 'Certificado modular y titulación técnica oficial',
    icon: 'bi-award',
    badge: 'Trámite oficial',
    templates: ['TMPL-20', 'TMPL-21']
  }
]);

function getStageIdForTemplate(templateId) {
  if (['TMPL-01', 'TMPL-02', 'TMPL-03', 'TMPL-04'].includes(templateId)) return 'ETAPA_1';
  if (templateId >= 'TMPL-05' && templateId <= 'TMPL-17') return 'ETAPA_2';
  if (['TMPL-18', 'TMPL-19'].includes(templateId)) return 'ETAPA_3';
  if (['TMPL-20', 'TMPL-21'].includes(templateId)) return 'ETAPA_4';
  return 'ETAPA_1';
}

export class DocumentsView {
  constructor() {
    this.registry = new TemplateRegistry();
    this.pdfEngine = new PdfTemplateEngine();
    this.documentDataService = new DocumentDataService();
    this.documentValidationService = new DocumentValidationService(this.registry);
    this.adminService = new MvpAdminService();
    this.mvpPdf = new MvpPdfService();
    this.groups = [];
    this.selectedGroupId = null;
    this.selectedTemplateId = 'TMPL-01';
    this.activeStageId = 'ETAPA_1';
    this.selectedAsistenciaUD = 1; // 1 a 6
    this.selectedEvaluacionUD = 1; // 1 a 7
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedEnrollmentId = null;
    this.previewEligibility = false;
    this.selectedGroupCode = null;
    this.documentState = DOCUMENT_STATES.IDLE;
    this.pdfBlobUrl = null;
    this.searchRevision = 0;
    this.operationRevision = 0;
    this.docFilterQuery = '';
  }

  async render(container) {
    if (!container) return;
    this.activeStageId = getStageIdForTemplate(this.selectedTemplateId);

    // Cargar grupos académicos para selectores de Etapa 1
    if (!this.groups || this.groups.length === 0) {
      try {
        this.groups = await this.adminService.listGroupSummaries();
      } catch (err) {
        console.warn('[DocumentsView] Error cargando grupos:', err);
        this.groups = [];
      }
    }
    if (this.groups.length > 0 && !this.selectedGroupId) {
      this.selectedGroupId = this.groups[0].id;
      this.selectedGroupCode = this.groups[0].visibleCode;
    } else if (this.selectedGroupId) {
      const g = this.groups.find(item => item.id === this.selectedGroupId);
      if (g) this.selectedGroupCode = g.visibleCode;
    }

    // Sincronizar UDs activas si el templateId seleccionado es de Etapa 2
    if (this.selectedTemplateId >= 'TMPL-05' && this.selectedTemplateId <= 'TMPL-10') {
      this.selectedAsistenciaUD = (parseInt(this.selectedTemplateId.replace('TMPL-', ''), 10) - 4);
    } else if (this.selectedTemplateId >= 'TMPL-11' && this.selectedTemplateId <= 'TMPL-17') {
      this.selectedEvaluacionUD = (parseInt(this.selectedTemplateId.replace('TMPL-', ''), 10) - 10);
    }

    const currentTemplate = this.registry.getById(this.selectedTemplateId);

    container.innerHTML = `
      <style>
        .documents-module-container {
          max-width: 1300px;
          margin: 0 auto;
        }
        .hero-banner {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          border-radius: 14px;
          color: #ffffff;
          padding: 1.6rem 1.85rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.18);
        }
        .flow-stepper {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 768px) {
          .flow-stepper {
            grid-template-columns: 1fr;
          }
        }
        .stepper-item {
          padding: 0.95rem 1.15rem;
          border-radius: 10px;
          border: 2px solid #cbd5e1;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }
        .stepper-item.active {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .stepper-item.completed {
          border-color: #059669;
          background: #f0fdf4;
        }
        .stepper-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.92rem;
          background: #e2e8f0;
          color: #334155;
          flex-shrink: 0;
        }
        .stepper-item.active .stepper-badge {
          background: #2563eb;
          color: #ffffff;
        }
        .stepper-item.completed .stepper-badge {
          background: #059669;
          color: #ffffff;
        }
        .stage-nav-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.95rem;
          margin-bottom: 1.35rem;
        }
        @media (max-width: 1100px) {
          .stage-nav-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .stage-nav-grid {
            grid-template-columns: 1fr;
          }
        }
        .stage-nav-pill {
          cursor: pointer;
          border: 2px solid #94a3b8;
          border-radius: 12px;
          padding: 1.15rem 1.25rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          user-select: none;
        }
        .stage-nav-pill:hover {
          border-color: #2563eb;
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12);
        }
        .stage-nav-pill.active {
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
          border: 3px solid #1d4ed8;
          box-shadow: 0 0 0 3.5px rgba(37, 99, 235, 0.2), 0 8px 18px rgba(29, 78, 216, 0.15);
        }
        .stage-pill-title {
          font-size: 1.08rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.35rem;
          line-height: 1.3;
        }
        .stage-pill-subtitle {
          font-size: 0.85rem;
          color: #334155;
          line-height: 1.35;
          font-weight: 500;
        }
        .doc-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 850px) {
          .doc-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .doc-item-card {
          cursor: pointer;
          border: 2px solid #94a3b8;
          border-radius: 12px;
          padding: 1.35rem 1.45rem;
          background: #ffffff;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 3px 10px rgba(0,0,0,0.05);
          box-sizing: border-box;
          user-select: none;
          position: relative;
          min-height: 220px;
          overflow: hidden;
        }
        .doc-item-card.card-accent-ugel { border-top: 5px solid #1d4ed8; }
        .doc-item-card.card-accent-student { border-top: 5px solid #059669; }
        .doc-item-card.card-accent-teacher { border-top: 5px solid #0284c7; }
        .doc-item-card.card-accent-review { border-top: 5px solid #d97706; }
        .doc-item-card.card-accent-eval { border-top: 5px solid #4f46e5; }
        .doc-item-card.card-accent-lock { border-top: 5px solid #64748b; }

        .doc-item-card:hover {
          border-color: #2563eb;
          background: #f8fafc;
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.09);
        }
        .doc-item-card.active-template {
          border: 3.5px solid #1d4ed8;
          background: #f0f7ff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.22), 0 10px 28px rgba(29, 78, 216, 0.16);
        }
        .doc-item-card.filtered-out {
          opacity: 0.35;
          filter: grayscale(80%);
        }
        .card-doc-title {
          font-size: 1.18rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0.45rem 0 0.4rem 0;
          line-height: 1.3;
        }
        .card-doc-desc {
          font-size: 0.92rem;
          color: #1e293b;
          line-height: 1.48;
          font-weight: 450;
          margin-bottom: 1.15rem;
        }
        .card-footer-action {
          border-top: 2px solid #e2e8f0;
          padding-top: 0.85rem;
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ud-pills-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          align-items: center;
          margin-top: 0.5rem;
          margin-bottom: 0.85rem;
        }
        .ud-selector-pill {
          padding: 0.5rem 0.95rem;
          border-radius: 8px;
          border: 2px solid #94a3b8;
          background: #ffffff;
          font-size: 0.9rem;
          font-weight: 800;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ud-selector-pill:hover {
          background: #eff6ff;
          border-color: #2563eb;
          color: #1d4ed8;
          transform: translateY(-1px);
        }
        .ud-selector-pill.active-ud {
          background: #1d4ed8;
          color: #ffffff;
          border-color: #1d4ed8;
          box-shadow: 0 3px 8px rgba(29, 78, 216, 0.3);
        }
        .ud-selector-pill.active-ud-blue {
          background: #1d4ed8;
          color: #ffffff;
          border-color: #1d4ed8;
          box-shadow: 0 3px 8px rgba(29, 78, 216, 0.35);
        }
        .ud-selector-pill.active-ud-green {
          background: #059669;
          color: #ffffff;
          border-color: #059669;
          box-shadow: 0 3px 8px rgba(5, 150, 105, 0.35);
        }
        .doc-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 800;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .doc-badge-primary { background: #dbeafe; color: #1e40af; border: 1.5px solid #bfdbfe; }
        .doc-badge-success { background: #d1fae5; color: #065f46; border: 1.5px solid #a7f3d0; }
        .doc-badge-warning { background: #fef3c7; color: #92400e; border: 1.5px solid #fde68a; }
        .doc-badge-info { background: #e0f2fe; color: #0369a1; border: 1.5px solid #bae6fd; }
        .doc-badge-secondary { background: #f1f5f9; color: #334155; border: 1.5px solid #cbd5e1; }
        .doc-selector-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1.15rem;
          background: #f8fafc;
          border: 2px solid #cbd5e1;
          border-radius: 10px;
          margin-bottom: 1.35rem;
        }
        .doc-selector-select {
          flex: 1;
          min-width: 280px;
          max-width: 520px;
          padding: 0.5rem 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #0f172a;
        }
        .context-step-box {
          background: #f8fafc;
          border: 2px solid #94a3b8;
          border-radius: 12px;
          overflow: hidden;
        }
      </style>

      <div class="documents-module-container p-3 p-md-4">
        <!-- Hero Header Secretaría -->
        <div class="hero-banner">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge bg-white text-primary fw-bold px-2 py-1" style="font-size: 0.78rem; letter-spacing: 0.5px;">SECRETARÍA ACADÉMICA</span>
                <span class="badge ${isDemoRuntime() ? 'bg-warning text-dark' : 'bg-light text-primary'} px-2 py-1" style="font-size: 0.78rem;">
                  <i class="bi bi-${isDemoRuntime() ? 'flask' : 'shield-check'} me-1"></i>
                  ${isDemoRuntime() ? 'DEMOSTRACIÓN — NO OFICIAL' : 'MODO CANDIDATO V2 (8081)'}
                </span>
              </div>
              <h3 class="fw-bold mb-1 d-flex align-items-center gap-2" style="font-size: 1.65rem;">
                <i class="bi bi-file-earmark-ruled-fill"></i>
                <span>Centro de Emisión Documental</span>
              </h3>
              <p class="mb-0 text-white-50" style="font-size: 0.92rem;">Emisión oficial de nóminas, fichas de matrícula, registros auxiliares y actas ministeriales.</p>
            </div>
            <!-- Buscador Rápido de Documentos para Secretaría -->
            <div style="min-width: 290px; max-width: 440px; flex: 1;">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white border-0 text-primary"><i class="bi bi-search"></i></span>
                <input type="search" id="doc-quick-search" class="form-control border-0" placeholder="Buscar documento (ej. nómina, ficha, carpeta, asistencia)..." value="${escapeHtml(this.docFilterQuery || '')}" autocomplete="off" style="font-size: 0.9rem; padding: 0.55rem 0.75rem;">
                ${this.docFilterQuery ? '<button class="btn btn-light border-0" id="doc-quick-search-clear" type="button" title="Limpiar filtro"><i class="bi bi-x-circle"></i></button>' : ''}
              </div>
              <div class="text-white-50 mt-1 d-flex justify-content-between" style="font-size: 0.75rem;">
                <span>Filtro instantáneo de plantillas</span>
                <span><strong>${this.selectedTemplateId}</strong> activa</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Flujo Visual de 3 Pasos -->
        <div class="flow-stepper">
          <div class="stepper-item ${this.activeStageId ? 'active' : ''}">
            <div class="stepper-badge">1</div>
            <div>
              <div class="fw-bold text-dark" style="font-size: 0.95rem;">Paso 1: Elija el Documento</div>
              <div class="text-secondary" style="font-size: 0.82rem;">Seleccione la etapa y el formato ministerial</div>
            </div>
          </div>
          <div class="stepper-item ${(this.selectedGroupId || this.selectedEnrollmentId) ? 'active' : ''}">
            <div class="stepper-badge">2</div>
            <div>
              <div class="fw-bold text-dark" style="font-size: 0.95rem;">Paso 2: Datos de Emisión</div>
              <div class="text-secondary" style="font-size: 0.82rem;">Indique el grupo académico o busque al estudiante</div>
            </div>
          </div>
          <div class="stepper-item ${this.pdfBlobUrl ? 'completed' : ''}">
            <div class="stepper-badge">${this.pdfBlobUrl ? '<i class="bi bi-check"></i>' : '3'}</div>
            <div>
              <div class="fw-bold text-dark" style="font-size: 0.95rem;">Paso 3: Revisión y Descarga</div>
              <div class="text-secondary" style="font-size: 0.82rem;">Previsualice, descargue o imprima en PDF</div>
            </div>
          </div>
        </div>

        <!-- Barra de Navegación por Etapas (Paso 1) -->
        <div class="stage-nav-grid" id="document-stage-tabs" role="tablist">
          ${this._renderStageNav()}
        </div>

        <!-- Contenedor Principal: Paso 1 y Paso 2 -->
        <div class="card mb-4 shadow-sm" style="border: 2px solid #cbd5e1; border-radius: 14px; overflow: hidden;">
          <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="border-bottom: 2px solid #e2e8f0 !important;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary fs-6 px-3 py-1 fw-bold" style="background: #1d4ed8; color: #fff; border-radius: 8px;">ETAPA ${DOCUMENT_STAGES.find(s => s.id === this.activeStageId)?.number || '1'}</span>
              <h5 class="m-0 text-dark fw-bold" style="font-size: 1.22rem; color: #0f172a;">${DOCUMENT_STAGES.find(s => s.id === this.activeStageId)?.title || ''}</h5>
            </div>
            <div class="text-secondary fw-semibold" style="font-size: 0.9rem;">${DOCUMENT_STAGES.find(s => s.id === this.activeStageId)?.subtitle || ''}</div>
          </div>
          <div class="card-body p-3 p-md-4">
            <!-- Barra de Selección Canónica con <optgroup> para compatibilidad de accesibilidad y pruebas -->
            <div class="doc-selector-toolbar">
              <div class="d-flex align-items-center gap-2" style="flex: 1; min-width: 280px;">
                <label class="form-label fw-bold text-secondary m-0 d-flex align-items-center gap-1" for="doc-template-select" style="white-space: nowrap; font-size: 0.88rem;">
                  <i class="bi bi-bookmark-star-fill text-primary"></i> Acceso por código MINEDU:
                </label>
                <select id="doc-template-select" class="form-select doc-selector-select">
                  ${this._renderOptGroups()}
                </select>
              </div>
              <div>
                <span class="doc-badge-pill doc-badge-primary">
                  <i class="bi bi-file-earmark-check-fill me-1"></i>Plantilla activa: <strong>${escapeHtml(this.selectedTemplateId)}</strong>
                </span>
              </div>
            </div>

            <!-- Catálogo de Tarjetas Documentales de la Etapa -->
            <div class="mb-2">
              <div class="fw-bold text-dark small mb-3 text-uppercase tracking-wider d-flex align-items-center gap-2" style="font-size: 0.85rem; letter-spacing: 0.5px;">
                <i class="bi bi-grid-fill text-primary"></i>
                <span>Documentos disponibles en esta etapa (haga clic para seleccionar):</span>
              </div>
              <div id="stage-cards-container">
                ${this._renderStageCards()}
              </div>
            </div>

            <!-- Paso 2: Controles contextuales específicos para emisión -->
            <div id="doc-context-controls" class="mt-4 pt-4 border-top" style="border-top: 2px solid #e2e8f0 !important;">
              ${this._renderContextControls(currentTemplate)}
            </div>
          </div>
        </div>

        <!-- Paso 3: Espacio de Vista Previa y Descarga -->
        <div class="card shadow-sm" style="border: 2px solid #cbd5e1; border-radius: 14px; overflow: hidden;">
          <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="border-bottom: 2px solid #e2e8f0 !important;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success rounded-circle p-1" style="width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem;">3</span>
              <span class="fw-bold text-dark" style="font-size: 1.05rem;">
                <i class="bi bi-eye-fill me-1 text-primary"></i>Visor y Descarga Oficial: <strong>${escapeHtml(currentTemplate?.name || this.selectedTemplateId)}</strong>
              </span>
            </div>
            <span class="badge bg-light text-dark border px-2 py-1 fw-bold" style="font-size: 0.85rem;">${escapeHtml(currentTemplate?.templateId || '')}</span>
          </div>
          <div class="card-body p-3 overflow-auto" id="doc-render-workspace" style="min-height: 520px; background-color: #f8fafc;">
            ${this._renderEmptyWorkspace(currentTemplate)}
          </div>
        </div>
      </div>`;

    this._bindEvents(container);
    this._syncGenerateButton(container);
  }

  _renderStageNav() {
    return DOCUMENT_STAGES.map(stage => {
      const isActive = stage.id === this.activeStageId;
      return `
        <div class="stage-nav-pill ${isActive ? 'active' : ''}" data-stage-id="${stage.id}" role="tab" aria-selected="${isActive}">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge ${isActive ? 'bg-primary' : 'bg-secondary'} px-2 py-1 fw-bold" style="font-size: 0.78rem;">ETAPA ${stage.number}</span>
            <span class="badge bg-light text-secondary border fw-semibold" style="font-size: 0.72rem;">${stage.badge}</span>
          </div>
          <div class="stage-pill-title"><i class="bi ${stage.icon} me-1 text-primary"></i>${escapeHtml(stage.title)}</div>
          <div class="stage-pill-subtitle">${escapeHtml(stage.subtitle)}</div>
        </div>`;
    }).join('');
  }

  _renderOptGroups() {
    return `
      <optgroup label="ETAPA 1: MATRÍCULA E INICIO DE GRUPO">
        <option value="TMPL-01" ${this.selectedTemplateId === 'TMPL-01' ? 'selected' : ''}>TMPL-01 - Nómina de Matrícula (Oficial UGEL)</option>
        <option value="TMPL-02" ${this.selectedTemplateId === 'TMPL-02' ? 'selected' : ''}>TMPL-02 - Ficha de Matrícula (Expediente del Alumno)</option>
        <option value="TMPL-04" ${this.selectedTemplateId === 'TMPL-04' ? 'selected' : ''}>TMPL-04 - Portada de Carpeta Pedagógica</option>
        <option value="TMPL-03" ${this.selectedTemplateId === 'TMPL-03' ? 'selected' : ''}>TMPL-03 - Registro de Matrícula Modular [En Revisión]</option>
      </optgroup>
      <optgroup label="ETAPA 2: REGISTRO AUXILIAR DOCENTE (SEGUIMIENTO)">
        <option value="TMPL-05" ${this.selectedTemplateId === 'TMPL-05' ? 'selected' : ''}>TMPL-05 - Asistencia UD1</option>
        <option value="TMPL-06" ${this.selectedTemplateId === 'TMPL-06' ? 'selected' : ''}>TMPL-06 - Asistencia UD2</option>
        <option value="TMPL-07" ${this.selectedTemplateId === 'TMPL-07' ? 'selected' : ''}>TMPL-07 - Asistencia UD3</option>
        <option value="TMPL-08" ${this.selectedTemplateId === 'TMPL-08' ? 'selected' : ''}>TMPL-08 - Asistencia UD4</option>
        <option value="TMPL-09" ${this.selectedTemplateId === 'TMPL-09' ? 'selected' : ''}>TMPL-09 - Asistencia UD5</option>
        <option value="TMPL-10" ${this.selectedTemplateId === 'TMPL-10' ? 'selected' : ''}>TMPL-10 - Asistencia UD6</option>
        <option value="TMPL-11" ${this.selectedTemplateId === 'TMPL-11' ? 'selected' : ''}>TMPL-11 - Evaluación Indicadores UD1</option>
        <option value="TMPL-12" ${this.selectedTemplateId === 'TMPL-12' ? 'selected' : ''}>TMPL-12 - Evaluación UD2</option>
        <option value="TMPL-13" ${this.selectedTemplateId === 'TMPL-13' ? 'selected' : ''}>TMPL-13 - Evaluación UD3</option>
        <option value="TMPL-14" ${this.selectedTemplateId === 'TMPL-14' ? 'selected' : ''}>TMPL-14 - Evaluación UD4</option>
        <option value="TMPL-15" ${this.selectedTemplateId === 'TMPL-15' ? 'selected' : ''}>TMPL-15 - Evaluación UD5</option>
        <option value="TMPL-16" ${this.selectedTemplateId === 'TMPL-16' ? 'selected' : ''}>TMPL-16 - Evaluación UD6</option>
        <option value="TMPL-17" ${this.selectedTemplateId === 'TMPL-17' ? 'selected' : ''}>TMPL-17 - Evaluación UD7</option>
      </optgroup>
      <optgroup label="ETAPA 3: CIERRE MODULAR Y PRÁCTICAS">
        <option value="TMPL-18" ${this.selectedTemplateId === 'TMPL-18' ? 'selected' : ''}>TMPL-18 - Consolidado de EFSRT</option>
        <option value="TMPL-19" ${this.selectedTemplateId === 'TMPL-19' ? 'selected' : ''}>TMPL-19 - Acta de Evaluación Modular</option>
      </optgroup>
      <optgroup label="ETAPA 4: CERTIFICACIÓN Y EGRESO">
        <option value="TMPL-20" ${this.selectedTemplateId === 'TMPL-20' ? 'selected' : ''}>TMPL-20 - Certificado Modular [Requiere Libro/Folio]</option>
        <option value="TMPL-21" ${this.selectedTemplateId === 'TMPL-21' ? 'selected' : ''}>TMPL-21 - Título Técnico [Requiere Código REGISTRA]</option>
      </optgroup>
    `;
  }

  _renderStageCards() {
    switch (this.activeStageId) {
      case 'ETAPA_1':
        return this._renderEtapa1Cards();
      case 'ETAPA_2':
        return this._renderEtapa2Cards();
      case 'ETAPA_3':
        return this._renderEtapa3Cards();
      case 'ETAPA_4':
        return this._renderEtapa4Cards();
      default:
        return this._renderEtapa1Cards();
    }
  }

  _renderEtapa1Cards() {
    const isTmpl01 = this.selectedTemplateId === 'TMPL-01';
    const isTmpl02 = this.selectedTemplateId === 'TMPL-02';
    const isTmpl04 = this.selectedTemplateId === 'TMPL-04';
    const isTmpl03 = this.selectedTemplateId === 'TMPL-03';

    return `
      <div class="doc-cards-grid">
        <!-- Nómina de Matrícula (TMPL-01) -->
        <div class="doc-item-card card-accent-ugel ${isTmpl01 ? 'active-template' : ''}" data-select-tmpl="TMPL-01" role="button" tabindex="0" title="Seleccionar Nómina de Matrícula (TMPL-01)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-primary">
                <i class="bi bi-building me-1"></i>🏛️ Trámite Oficial UGEL
              </span>
              <span class="badge bg-primary fs-6 px-2 py-1">TMPL-01</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-people-fill me-1 text-primary"></i>Nómina Oficial de Matrícula
            </h5>
            <p class="card-doc-desc">
              Padrón oficial de estudiantes matriculados por grupo académico. Foliado ministerial de 30 en 30 para archivo y elevación formal a UGEL.
            </p>
          </div>
          <div class="card-footer-action">
            ${isTmpl01
              ? '<span class="badge bg-primary px-3 py-2 text-white fw-bold" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill me-1"></i>✓ SELECCIONADO PARA EMITIR</span>'
              : '<span class="text-primary fw-bold" style="font-size: 0.9rem;"><i class="bi bi-hand-index-thumb me-1"></i>👉 Clic para seleccionar</span>'}
            <span class="fw-bold text-secondary small">Grupo completo</span>
          </div>
        </div>

        <!-- Ficha de Matrícula (TMPL-02) -->
        <div class="doc-item-card card-accent-student ${isTmpl02 ? 'active-template' : ''}" data-select-tmpl="TMPL-02" role="button" tabindex="0" title="Seleccionar Ficha de Matrícula (TMPL-02)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-success">
                <i class="bi bi-person-badge me-1"></i>👤 Expediente del Alumno
              </span>
              <span class="badge bg-success fs-6 px-2 py-1">TMPL-02</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-person-lines-fill me-1 text-success"></i>Ficha Individual de Matrícula
            </h5>
            <p class="card-doc-desc">
              Ficha personal con datos completos del estudiante, procedencia y programa formativo para firma de matrícula y archivo institucional.
            </p>
          </div>
          <div class="card-footer-action">
            ${isTmpl02
              ? '<span class="badge bg-success px-3 py-2 text-white fw-bold" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill me-1"></i>✓ SELECCIONADO PARA EMITIR</span>'
              : '<span class="text-success fw-bold" style="font-size: 0.9rem;"><i class="bi bi-hand-index-thumb me-1"></i>👉 Clic para seleccionar</span>'}
            <span class="fw-bold text-secondary small">Por estudiante</span>
          </div>
        </div>

        <!-- Portada de Carpeta Pedagógica (TMPL-04) -->
        <div class="doc-item-card card-accent-teacher ${isTmpl04 ? 'active-template' : ''}" data-select-tmpl="TMPL-04" role="button" tabindex="0" title="Seleccionar Portada de Carpeta (TMPL-04)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-info">
                <i class="bi bi-journal-text me-1"></i>📂 Carpeta Docente
              </span>
              <span class="badge bg-info text-dark fs-6 px-2 py-1">TMPL-04</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-journal-bookmark-fill me-1 text-info"></i>Portada de Carpeta Pedagógica
            </h5>
            <p class="card-doc-desc">
              Carátula formal de asistencia y evaluación con datos institucionales, programa, módulo formativo y docente responsable.
            </p>
          </div>
          <div class="card-footer-action">
            ${isTmpl04
              ? '<span class="badge bg-info px-3 py-2 text-dark fw-bold" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill me-1"></i>✓ SELECCIONADO PARA EMITIR</span>'
              : '<span class="text-secondary fw-bold" style="font-size: 0.9rem;"><i class="bi bi-hand-index-thumb me-1"></i>👉 Clic para seleccionar</span>'}
            <span class="fw-bold text-secondary small">Por grupo</span>
          </div>
        </div>

        <!-- Registro de Matrícula Modular (TMPL-03) -->
        <div class="doc-item-card card-accent-review ${isTmpl03 ? 'active-template' : ''}" data-select-tmpl="TMPL-03" role="button" tabindex="0" title="Seleccionar Registro Modular (TMPL-03)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-warning">
                <i class="bi bi-hourglass-split me-1"></i>⚠️ En Revisión Técnica
              </span>
              <span class="badge bg-warning text-dark fs-6 px-2 py-1">TMPL-03</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-card-checklist me-1 text-warning"></i>Registro de Matrícula Modular
            </h5>
            <p class="card-doc-desc">
              Formato complementario de control y foliación ministerial por grupo académico (20 filas por página o reporte administrativo).
            </p>
          </div>
          <div class="card-footer-action">
            ${isTmpl03
              ? '<span class="badge bg-warning px-3 py-2 text-dark fw-bold" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill me-1"></i>✓ SELECCIONADO PARA EMITIR</span>'
              : '<span class="text-secondary fw-bold" style="font-size: 0.9rem;"><i class="bi bi-hand-index-thumb me-1"></i>👉 Clic para seleccionar</span>'}
            <span class="fw-bold text-secondary small">20 por página</span>
          </div>
        </div>
      </div>
    `;
  }

  _renderEtapa2Cards() {
    const isAsistencia = this.selectedTemplateId >= 'TMPL-05' && this.selectedTemplateId <= 'TMPL-10';
    const isEvaluacion = this.selectedTemplateId >= 'TMPL-11' && this.selectedTemplateId <= 'TMPL-17';
    const currentAsistenciaTmpl = 'TMPL-' + String(this.selectedAsistenciaUD + 4).padStart(2, '0');
    const currentEvaluacionTmpl = 'TMPL-' + String(this.selectedEvaluacionUD + 10).padStart(2, '0');

    // Pills de Asistencia UD1..UD6 con estilo activo azul
    const asistenciaPills = [1, 2, 3, 4, 5, 6].map(n => {
      const tmplId = `TMPL-${String(n + 4).padStart(2, '0')}`;
      const isSelected = isAsistencia && this.selectedTemplateId === tmplId;
      return `<button type="button" class="ud-selector-pill ${isSelected ? 'active-ud active-ud-blue' : ''}" data-select-tmpl="${tmplId}" title="Asistencia Unidad Didáctica ${n} (${tmplId})">${isSelected ? '<i class="bi bi-check2"></i> ' : ''}UD ${n}</button>`;
    }).join(' ');

    // Pills de Evaluación UD1..UD7 con estilo activo verde esmeralda
    const evaluacionPills = [1, 2, 3, 4, 5, 6, 7].map(n => {
      const tmplId = `TMPL-${String(n + 10).padStart(2, '0')}`;
      const isSelected = isEvaluacion && this.selectedTemplateId === tmplId;
      return `<button type="button" class="ud-selector-pill ${isSelected ? 'active-ud active-ud-green' : ''}" data-select-tmpl="${tmplId}" title="Evaluación Unidad Didáctica ${n} (${tmplId})">${isSelected ? '<i class="bi bi-check2"></i> ' : ''}UD ${n}</button>`;
    }).join(' ');

    return `
      <div class="doc-cards-grid">
        <!-- Control de Asistencia (TMPL-05 a TMPL-10) -->
        <div class="doc-item-card card-accent-ugel ${isAsistencia ? 'active-template' : ''}" data-select-tmpl="${currentAsistenciaTmpl}" role="button" tabindex="0" title="Seleccionar Control de Asistencia Modular">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-primary">
                <i class="bi bi-calendar-check me-1"></i>📅 Seguimiento Diario
              </span>
              <span class="badge ${isAsistencia ? 'bg-primary' : 'bg-light text-dark border'} fs-6 px-2 py-1">${isAsistencia ? this.selectedTemplateId : 'TMPL-05..10'}</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-calendar2-week-fill me-1 text-primary"></i>Control de Asistencia Modular
            </h5>
            <p class="card-doc-desc">
              Hojas oficiales de asistencia ministerial (40 sesiones en formato A3 landscape). Seleccione la Unidad Didáctica para emitir el formato:
            </p>
            <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
              <span class="fw-bold text-dark me-1" style="font-size: 0.9rem;">Unidad Didáctica:</span>
              ${asistenciaPills}
            </div>
          </div>
          <div class="card-footer-action">
            ${isAsistencia
              ? `<span class="badge bg-primary px-3 py-2 text-white fw-bold" style="font-size: 0.85rem; background: #1d4ed8 !important;"><i class="bi bi-check-circle-fill me-1"></i>✓ ACTIVO: UD ${this.selectedAsistenciaUD} (${this.selectedTemplateId})</span>`
              : `<span class="text-primary fw-bold" style="font-size: 0.9rem;"><i class="bi bi-hand-index-thumb me-1"></i>👉 Clic para seleccionar</span>`
            }
            <span class="fw-bold text-secondary small">40 sesiones · A3</span>
          </div>
        </div>

        <!-- Registro de Evaluación Auxiliar (TMPL-11 a TMPL-17) -->
        <div class="doc-item-card card-accent-student ${isEvaluacion ? 'active-template' : ''}" data-select-tmpl="${currentEvaluacionTmpl}" role="button" tabindex="0" title="Seleccionar Registro de Evaluación Auxiliar">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-success">
                <i class="bi bi-check2-square me-1"></i>📊 Calificaciones Vigesimales
              </span>
              <span class="badge ${isEvaluacion ? 'bg-success' : 'bg-light text-dark border'} fs-6 px-2 py-1">${isEvaluacion ? this.selectedTemplateId : 'TMPL-11..17'}</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-clipboard-check-fill me-1 text-success"></i>Registro de Evaluación Auxiliar
            </h5>
            <p class="card-doc-desc">
              Calificaciones vigesimales por criterios e indicadores de logro de la capacidad terminal. Seleccione la Unidad Didáctica para emitir:
            </p>
            <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
              <span class="fw-bold text-dark me-1" style="font-size: 0.9rem;">Unidad Didáctica:</span>
              ${evaluacionPills}
            </div>
          </div>
          <div class="card-footer-action">
            ${isEvaluacion
              ? `<span class="badge bg-success px-3 py-2 text-white fw-bold" style="font-size: 0.85rem; background: #059669 !important;"><i class="bi bi-check-circle-fill me-1"></i>✓ ACTIVO: UD ${this.selectedEvaluacionUD} (${this.selectedTemplateId})</span>`
              : `<span class="text-success fw-bold" style="font-size: 0.9rem;"><i class="bi bi-hand-index-thumb me-1"></i>👉 Clic para seleccionar</span>`
            }
            <span class="fw-bold text-secondary small">Escala vigesimal · A3</span>
          </div>
        </div>
      </div>
    `;
  }

  _renderEtapa3Cards() {
    const isTmpl18 = this.selectedTemplateId === 'TMPL-18';
    const isTmpl19 = this.selectedTemplateId === 'TMPL-19';

    return `
      <div class="doc-cards-grid">
        <!-- Consolidado de EFSRT (TMPL-18) -->
        <div class="doc-item-card card-accent-student ${isTmpl18 ? 'active-template' : ''}" data-select-tmpl="TMPL-18" role="button" tabindex="0" title="Seleccionar Consolidado de EFSRT (TMPL-18)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-success">
                <i class="bi bi-briefcase me-1"></i>🏢 Prácticas Pre-Profesionales
              </span>
              <span class="badge bg-success fs-6 px-2 py-1">TMPL-18</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-briefcase-fill me-1 text-success"></i>Consolidado de EFSRT
            </h5>
            <p class="card-doc-desc">
              Experiencias Formativas en Situaciones Reales de Trabajo. Cuadrícula de 40 estudiantes con 9 criterios y cumplimiento de horas mínimas.
            </p>
          </div>
          <div class="card-footer-action">
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm ${isTmpl18 ? 'btn-success text-white' : 'btn-outline-success'} fw-bold px-3 py-2" data-select-tmpl="TMPL-18">
                ${isTmpl18 ? '<i class="bi bi-check-circle me-1"></i>Activo' : 'Seleccionar'}
              </button>
              <a href="#/efsrt" class="btn btn-sm btn-outline-secondary fw-bold px-3 py-2"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir EFSRT</a>
            </div>
            <span class="fw-bold text-secondary small">40 estudiantes</span>
          </div>
        </div>

        <!-- Acta de Evaluación Modular (TMPL-19) -->
        <div class="doc-item-card card-accent-ugel ${isTmpl19 ? 'active-template' : ''}" data-select-tmpl="TMPL-19" role="button" tabindex="0" title="Seleccionar Acta de Evaluación Modular (TMPL-19)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-primary">
                <i class="bi bi-award me-1"></i>📜 Formato Oficial A3
              </span>
              <span class="badge bg-primary fs-6 px-2 py-1">TMPL-19</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-file-earmark-spreadsheet-fill me-1 text-primary"></i>Acta Oficial de Evaluación Modular
            </h5>
            <p class="card-doc-desc">
              Acta oficial de 2 páginas físicas A3 landscape con partición 20+20 filas, cálculo de unidades aprobadas y cuadro estadístico general.
            </p>
          </div>
          <div class="card-footer-action">
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm ${isTmpl19 ? 'btn-primary' : 'btn-outline-primary'} fw-bold px-3 py-2" data-select-tmpl="TMPL-19">
                ${isTmpl19 ? '<i class="bi bi-check-circle me-1"></i>Activo' : 'Seleccionar'}
              </button>
              <a href="#/evaluacion" class="btn btn-sm btn-outline-secondary fw-bold px-3 py-2"><i class="bi bi-box-arrow-up-right me-1"></i>Ir a Actas</a>
            </div>
            <span class="fw-bold text-secondary small">Formato A3 Oficial</span>
          </div>
        </div>
      </div>
    `;
  }

  _renderEtapa4Cards() {
    const isTmpl20 = this.selectedTemplateId === 'TMPL-20';
    const isTmpl21 = this.selectedTemplateId === 'TMPL-21';

    return `
      <div class="doc-cards-grid">
        <!-- Certificado Modular (TMPL-20) -->
        <div class="doc-item-card card-accent-lock ${isTmpl20 ? 'active-template' : ''}" data-select-tmpl="TMPL-20" role="button" tabindex="0" title="Seleccionar Certificado Modular (TMPL-20)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-secondary">
                <i class="bi bi-lock-fill me-1"></i>🔒 Requiere Libro y Folio
              </span>
              <span class="badge bg-secondary fs-6 px-2 py-1">TMPL-20</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-mortarboard-fill me-1 text-secondary"></i>Certificado Modular Oficial
            </h5>
            <p class="card-doc-desc">
              Documento oficial de acreditación modular ministerial (2 páginas físicas). Emisión oficial reservada hasta asignación formal de Libro y Folio institucional.
            </p>
          </div>
          <div class="card-footer-action">
            <button type="button" class="btn btn-sm ${isTmpl20 ? 'btn-secondary text-white' : 'btn-outline-secondary'} fw-bold px-3 py-2" data-select-tmpl="TMPL-20">
              <i class="bi bi-shield-lock me-1"></i>Ver Requisitos
            </button>
            <span class="badge bg-light text-dark border fw-bold">MINEDU</span>
          </div>
        </div>

        <!-- Título Técnico (TMPL-21) -->
        <div class="doc-item-card card-accent-lock ${isTmpl21 ? 'active-template' : ''}" data-select-tmpl="TMPL-21" role="button" tabindex="0" title="Seleccionar Título Técnico (TMPL-21)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-secondary">
                <i class="bi bi-lock-fill me-1"></i>🔒 Requiere Código REGISTRA
              </span>
              <span class="badge bg-secondary fs-6 px-2 py-1">TMPL-21</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-award-fill me-1 text-secondary"></i>Título Técnico Oficial
            </h5>
            <p class="card-doc-desc">
              Acreditación de egreso y titulación técnica oficial. Emisión ministerial reservada hasta recepción y validación del código REGISTRA oficial del MINEDU.
            </p>
          </div>
          <div class="card-footer-action">
            <button type="button" class="btn btn-sm ${isTmpl21 ? 'btn-secondary text-white' : 'btn-outline-secondary'} fw-bold px-3 py-2" data-select-tmpl="TMPL-21">
              <i class="bi bi-shield-lock me-1"></i>Ver Requisitos
            </button>
            <span class="badge bg-light text-dark border fw-bold">MINEDU</span>
          </div>
        </div>
      </div>
    `;
  }

  _renderGroupOptions() {
    if (!this.groups || this.groups.length === 0) {
      return '<option value="">No hay grupos disponibles</option>';
    }

    // Agrupar grupos por Programa de Estudio
    const groupsByProgram = new Map();
    for (const g of this.groups) {
      const progName = g.program?.nombre || g.programaNombre || g.programaOriginal || 'Programas de Estudio General';
      if (!groupsByProgram.has(progName)) {
        groupsByProgram.set(progName, []);
      }
      groupsByProgram.get(progName).push(g);
    }

    // Ordenar programas alfabéticamente
    const sortedPrograms = Array.from(groupsByProgram.keys()).sort((a, b) => a.localeCompare(b, 'es'));

    return sortedPrograms.map(progName => {
      const progGroups = groupsByProgram.get(progName);
      progGroups.sort((a, b) => (a.visibleCode || '').localeCompare(b.visibleCode || '', 'es'));

      const options = progGroups.map(g => {
        const isSelected = g.id === this.selectedGroupId ? 'selected' : '';
        const turnoText = g.turno ? `Turno ${g.turno}` : 'Turno Regular';
        const count = g.enrollmentCount || 0;
        const countText = `${count} ${count === 1 ? 'estudiante' : 'estudiantes'}`;
        const label = `${progName} — Grupo ${g.visibleCode} · ${turnoText} (${countText})`;
        return `<option value="${escapeHtml(g.id)}" ${isSelected}>${escapeHtml(label)}</option>`;
      }).join('');

      return `<optgroup label="🎓 ${escapeHtml(progName)}">${options}</optgroup>`;
    }).join('');
  }

  _renderGroupSummaryCard(selectedGroup) {
    if (!selectedGroup) {
      return `
        <div class="alert alert-warning d-flex align-items-center gap-2 mb-3 p-3 rounded" style="border: 2px solid #fde68a !important;">
          <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
          <div class="fw-semibold">No se ha seleccionado ningún grupo académico. Por favor seleccione uno de la lista superior.</div>
        </div>`;
    }

    const progName = selectedGroup.program?.nombre || selectedGroup.programaNombre || selectedGroup.programaOriginal || 'Programa de Estudio General';
    const count = Number(selectedGroup.enrollmentCount) || 0;
    const turno = selectedGroup.turno || 'Regular / Único';
    const foliosEst = Math.ceil(Math.max(count, 1) / 30);
    const modName = selectedGroup.module?.nombre || selectedGroup.module?.nombreOficial || 'Módulo Oficial de Formación';
    const code = selectedGroup.visibleCode || selectedGroup.id || 'S/C';

    return `
      <div class="card mb-3 shadow-sm" style="border: 2px solid #94a3b8; border-radius: 12px; background: #ffffff; overflow: hidden;">
        <div class="card-header bg-white py-2 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="border-bottom: 2px solid #e2e8f0; background: linear-gradient(90deg, #f8fafc 0%, #ffffff 100%);">
          <div class="d-flex align-items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge bg-primary px-2 py-1 fw-bold" style="font-size: 0.78rem; background: #1d4ed8 !important; color: #ffffff;">GRUPO SELECCIONADO</span>
            <span class="badge bg-dark px-2 py-1 fw-bold font-monospace" style="font-size: 0.82rem; background: #0f172a !important; color: #ffffff;" title="Código Oficial">${escapeHtml(code)}</span>
          </div>
          <span class="badge bg-light text-secondary border fw-bold" style="font-size: 0.78rem; border-color: #cbd5e1 !important; color: #475569;">
            <i class="bi bi-clock-history me-1 text-primary"></i>${escapeHtml(turno)}
          </span>
        </div>
        <div class="card-body p-3">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
            <div style="flex: 1; min-width: 280px;">
              <div class="text-uppercase text-secondary fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px; color: #64748b;">
                <i class="bi bi-mortarboard-fill me-1 text-primary"></i>Carrera / Programa de Estudio:
              </div>
              <div class="fw-extrabold text-dark mt-1" style="font-size: 1.22rem; color: #0f172a; font-weight: 800; line-height: 1.25;">
                ${escapeHtml(progName)}
              </div>
              <div class="text-secondary small mt-2 d-flex align-items-center gap-1" style="font-size: 0.85rem; color: #475569;">
                <i class="bi bi-journal-text text-primary"></i>
                <span>Módulo formativo: <strong class="text-dark" style="color: #0f172a;">${escapeHtml(modName)}</strong></span>
              </div>
            </div>
            <div style="min-width: 260px;">
              <div class="p-2.5 rounded" style="background: #f8fafc; border: 2px solid #cbd5e1; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                  <span class="text-secondary small fw-bold" style="font-size: 0.85rem; color: #475569;"><i class="bi bi-people-fill text-primary me-1"></i>Matriculados:</span>
                  <span class="badge bg-primary px-2.5 py-1 fw-bold" style="font-size: 0.92rem; background: #2563eb !important; color: #ffffff;">${count} alumnos</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                  <span class="text-secondary small fw-bold" style="font-size: 0.85rem; color: #475569;"><i class="bi bi-file-earmark-ruled text-success me-1"></i>Foliación:</span>
                  <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold" style="font-size: 0.82rem; background: #dcfce7; color: #15803d; border-color: #86efac !important;">${foliosEst} pág. (30 por hoja)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  _renderContextControls(template) {
    if (!template) return '<div class="alert alert-secondary mb-0">Plantilla no disponible.</div>';

    // TMPL-01: Nómina de Matrícula (Grupo)
    if (template.templateId === 'TMPL-01') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge bg-primary text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para emitir la Nómina</h5>
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 320px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-collection-fill me-1 text-primary"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-tmpl01-btn" type="button" class="btn btn-primary px-4 py-2 fw-bold" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.95rem;">
                <i class="bi bi-file-earmark-pdf-fill me-1"></i>Generar Nómina Oficial
              </button>
              <button id="doc-generate-btn" type="button" class="btn btn-secondary btn-sm" style="display: none;" disabled aria-disabled="true">Generar Nómina</button>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-primary"></i>Foliación ministerial automática de 30 en 30 para la presentación formal.
          </div>
        </div>`;
    }

    // TMPL-04: Portada de Carpeta (Grupo)
    if (template.templateId === 'TMPL-04') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge bg-primary text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para la Portada</h5>
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 320px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-journal-bookmark-fill me-1 text-info"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-tmpl04-btn" type="button" class="btn btn-info text-white px-4 py-2 fw-bold" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.95rem;">
                <i class="bi bi-journal-check me-1"></i>Generar Portada de Carpeta
              </button>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-info"></i>Carátula formal para la carpeta pedagógica con datos del docente e institución.
          </div>
        </div>`;
    }

    // TMPL-03: Registro Modular (Grupo)
    if (template.templateId === 'TMPL-03') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge bg-warning text-dark rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para el Registro Modular</h5>
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 320px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-card-checklist me-1 text-warning"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-tmpl03-oficial-btn" type="button" class="btn btn-primary btn-sm fw-bold px-3 py-2" ${!this.selectedGroupId ? 'disabled' : ''}>
                <i class="bi bi-file-earmark-ruled me-1"></i>Generar Registro Modular (TMPL-03 Oficial)
              </button>
              <button id="doc-generate-tmpl03-alt-btn" type="button" class="btn btn-outline-secondary btn-sm fw-bold px-3 py-2" ${!this.selectedGroupId ? 'disabled' : ''}>
                <i class="bi bi-table me-1"></i>Reporte Administrativo Alternativo
              </button>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-warning"></i>Elija entre la plantilla oficial o el reporte administrativo directo.
          </div>
        </div>`;
    }

    // TMPL-05..10: Asistencia
    if (template.templateId >= 'TMPL-05' && template.templateId <= 'TMPL-10') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 4;
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; background: #1d4ed8 !important;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para el Control de Asistencia</h5>
          </div>

          <div class="d-flex align-items-center justify-content-between p-2.5 px-3 rounded mb-3" style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 10px;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary px-2.5 py-1.5 fw-bold" style="background: #1d4ed8 !important; font-size: 0.85rem;">UD ${udNum}</span>
              <span class="fw-bold text-primary" style="font-size: 0.95rem;">${escapeHtml(template.name)} (${template.templateId})</span>
            </div>
            <span class="badge bg-light text-secondary border fw-bold" style="font-size: 0.8rem; border-color: #bfdbfe !important;">
              <i class="bi bi-calendar2-week me-1 text-primary"></i>40 sesiones · Formato A3
            </span>
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 320px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-collection-fill me-1 text-primary"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-asistencia-btn" type="button" class="btn btn-primary px-4 py-2 fw-bold" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.95rem; background: #1d4ed8; border-color: #1d4ed8;">
                <i class="bi bi-calendar2-check-fill me-1"></i>Generar Asistencia Oficial (UD ${udNum})
              </button>
              <a href="#/asistencia" class="btn btn-outline-primary fw-bold px-3 py-2" style="font-size: 0.92rem;">
                <i class="bi bi-box-arrow-up-right me-1"></i>Abrir Control Diario
              </a>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-primary"></i>Emisión ministerial de la matriz de 40 sesiones con datos del grupo seleccionado.
          </div>
        </div>`;
    }

    // TMPL-11..17: Evaluación
    if (template.templateId >= 'TMPL-11' && template.templateId <= 'TMPL-17') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 10;
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; background: #059669 !important;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para el Registro Auxiliar de Evaluación</h5>
          </div>

          <div class="d-flex align-items-center justify-content-between p-2.5 px-3 rounded mb-3" style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success px-2.5 py-1.5 fw-bold" style="background: #059669 !important; font-size: 0.85rem;">UD ${udNum}</span>
              <span class="fw-bold text-success" style="font-size: 0.95rem;">${escapeHtml(template.name)} (${template.templateId})</span>
            </div>
            <span class="badge bg-light text-secondary border fw-bold" style="font-size: 0.8rem; border-color: #a7f3d0 !important;">
              <i class="bi bi-card-checklist me-1 text-success"></i>Escala Vigesimal · Formato A3
            </span>
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 320px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-collection-fill me-1 text-success"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-evaluacion-btn" type="button" class="btn btn-success px-4 py-2 fw-bold text-white" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.95rem; background: #059669; border-color: #059669;">
                <i class="bi bi-clipboard-check-fill me-1"></i>Generar Registro Auxiliar (UD ${udNum})
              </button>
              <a href="#/evaluacion" class="btn btn-outline-success fw-bold px-3 py-2" style="font-size: 0.92rem;">
                <i class="bi bi-box-arrow-up-right me-1"></i>Abrir Calificaciones
              </a>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-success"></i>Emisión auxiliar con cálculo y desglose vigesimal por criterios de evaluación del programa formativo.
          </div>
        </div>`;
    }

    // TMPL-18: EFSRT
    if (template.templateId === 'TMPL-18') {
      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="alert alert-info mb-3 border-0 bg-white shadow-sm p-3 rounded" id="doc-context-status" style="border: 2px solid #a7f3d0 !important;">
            <div class="fw-bold text-success mb-1" style="font-size: 1.05rem;">
              <i class="bi bi-briefcase-fill me-1"></i>Consolidado de EFSRT (${template.templateId})
            </div>
            <div class="text-dark" style="font-size: 0.92rem;">Experiencias Formativas en Situaciones Reales de Trabajo (40 estudiantes, 9 criterios de evaluación formativa).</div>
          </div>
          <a href="#/efsrt" class="btn btn-success px-4 py-2 fw-bold text-white" style="font-size: 0.95rem;"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Consolidado EFSRT (TMPL-18)</a>
        </div>`;
    }

    // TMPL-19: Acta Modular
    if (template.templateId === 'TMPL-19') {
      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="alert alert-info mb-3 border-0 bg-white shadow-sm p-3 rounded" id="doc-context-status" style="border: 2px solid #bfdbfe !important;">
            <div class="fw-bold text-primary mb-1" style="font-size: 1.05rem;">
              <i class="bi bi-file-earmark-spreadsheet-fill me-1"></i>Acta Oficial de Evaluación Modular (${template.templateId})
            </div>
            <div class="text-dark" style="font-size: 0.92rem;">Plantilla ministerial oficial para vista previa e impresión (formato A3 landscape, 20+20 filas, cuadro de unidades aprobadas y estadística).</div>
          </div>
          <a href="#/evaluacion" class="btn btn-primary px-4 py-2 fw-bold" style="font-size: 0.95rem;"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Evaluación y Generar Acta (TMPL-19)</a>
        </div>`;
    }

    // TMPL-20: Certificado Modular
    if (template.templateId === 'TMPL-20') {
      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="alert alert-secondary mb-3 border-0 bg-white shadow-sm p-3 rounded" id="doc-context-status" style="border: 2px solid #cbd5e1 !important;">
            <div class="fw-bold text-secondary mb-1" style="font-size: 1.05rem;">
              <i class="bi bi-lock-fill me-1"></i>Certificado Modular (TMPL-20) — EMISIÓN RESERVADA
            </div>
            <div class="text-dark" style="font-size: 0.92rem;">Mapeo oficial completado. Conforme a norma MINEDU, la emisión física requiere la asignación previa del Libro y Folio institucional.</div>
          </div>
          <button class="btn btn-secondary px-4 py-2 fw-bold" disabled aria-disabled="true"><i class="bi bi-lock-fill me-1"></i>Bloqueado por B-006 (Libro/Folio)</button>
        </div>`;
    }

    // TMPL-21: Título Técnico
    if (template.templateId === 'TMPL-21') {
      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="alert alert-secondary mb-3 border-0 bg-white shadow-sm p-3 rounded" id="doc-context-status" style="border: 2px solid #cbd5e1 !important;">
            <div class="fw-bold text-secondary mb-1" style="font-size: 1.05rem;">
              <i class="bi bi-lock-fill me-1"></i>Título Técnico (TMPL-21) — EMISIÓN RESERVADA
            </div>
            <div class="text-dark" style="font-size: 0.92rem;">Acreditación ministerial de titulación técnica. Requiere la asignación oficial del Código REGISTRA ministerial antes de su emisión formal.</div>
          </div>
          <button class="btn btn-secondary px-4 py-2 fw-bold" disabled aria-disabled="true"><i class="bi bi-lock-fill me-1"></i>Bloqueado por B-006 (Código REGISTRA)</button>
        </div>`;
    }

    // TMPL-02: Ficha Individual de Matrícula (Enrollment context)
    if (template.contextType === 'ENROLLMENT') {
      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge bg-success text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Busque y Seleccione al Estudiante</h5>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold text-dark mb-1" for="doc-context-search" style="font-size: 0.92rem;">
              <i class="bi bi-search me-1 text-success"></i>Buscar estudiante o matrícula:
            </label>
            <div class="input-group">
              <span class="input-group-text bg-white text-muted" style="border: 2px solid #cbd5e1; border-right: none;"><i class="bi bi-person"></i></span>
              <input id="doc-context-search" class="form-control" type="search" autocomplete="off"
                value="${escapeHtml(this.searchQuery)}" placeholder="Escriba DNI, apellidos y nombres, programa o grupo..." style="border: 2px solid #cbd5e1; border-left: none; font-size: 0.92rem; padding: 0.55rem 0.85rem;">
            </div>
            <div id="doc-search-status" class="text-secondary fw-semibold mt-2" style="font-size: 0.85rem;">Escriba un criterio para buscar matrículas.</div>
            <div id="doc-flow-state" class="fw-bold text-primary mt-1" style="font-size: 0.9rem;" aria-live="polite">${escapeHtml(this._stateMessage())}</div>
          </div>

          <div id="doc-search-results" class="list-group mb-3" style="max-height: 290px; overflow-y: auto;"></div>
          <div id="doc-context-summary" class="mb-3"></div>
          <div id="doc-document-status" class="mb-3" aria-live="polite"></div>

          <div>
            <button id="doc-generate-btn" class="btn btn-secondary px-4 py-2 fw-bold" disabled aria-disabled="true" style="font-size: 0.95rem;">
              <i class="bi bi-file-earmark-pdf-fill me-1"></i>Generar Ficha de Matrícula
            </button>
            <p class="text-secondary fw-semibold mt-2 mb-0" style="font-size: 0.82rem;">Los datos académicos no confirmados permanecen vacíos conforme a directiva.</p>
          </div>
        </div>`;
    }

    const blockers = (template.blockers || []).join(', ') || 'fuente o regla oficial pendiente';
    return `
      <div class="alert alert-info mb-3" id="doc-context-status">
        <div class="fw-bold">${escapeHtml(template.name)}</div>
        <div>Contexto: ${escapeHtml(template.contextType || 'UNDETERMINED')}</div>
        <div>Estado de vista previa: ${escapeHtml(template.previewStatus || 'NOT_IMPLEMENTED')}</div>
        <div>Emisión oficial: ${escapeHtml(template.officialIssueStatus || 'BLOCKED')}</div>
        <div>Bloqueos: ${escapeHtml(blockers)}</div>
      </div>
      <button id="doc-generate-btn" class="btn btn-secondary btn-sm" disabled aria-disabled="true">Generar PDF</button>`;
  }

  _renderEmptyWorkspace(template) {
    if (template?.templateId === 'TMPL-01') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-people fs-1 d-block mb-2 text-primary opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Nómina Oficial de Matrícula (TMPL-01)</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico arriba y haga clic en <strong>Generar Nómina Oficial</strong> para visualizar el documento listo para impresión.
          </p>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-file-earmark-check me-1"></i>Foliación reglamentaria de 30 en 30
          </span>
        </div>`;
    }
    if (template?.templateId === 'TMPL-03') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-card-checklist fs-1 d-block mb-2 text-warning opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Registro de Matrícula Modular (TMPL-03)</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione un grupo académico y haga clic en <strong>Generar Registro Modular (TMPL-03 Oficial)</strong> o en <strong>Reporte Administrativo Alternativo</strong>.
          </p>
          <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-info-circle me-1"></i>Formato con partición de 20 estudiantes
          </span>
        </div>`;
    }
    if (template?.templateId === 'TMPL-04') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-journal-bookmark fs-1 d-block mb-2 text-info opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Portada de Carpeta Pedagógica (TMPL-04)</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione un grupo académico arriba y haga clic en <strong>Generar Portada</strong> para visualizar la carátula institucional.
          </p>
          <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-check2-circle me-1"></i>Carátula para Carpeta Docente
          </span>
        </div>`;
    }
    if (template?.contextType === 'ENROLLMENT') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-person-badge fs-1 d-block mb-2 text-success opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Ficha Individual de Matrícula (TMPL-02)</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Busque un estudiante por DNI o apellidos arriba, selecciónelo y haga clic en <strong>Generar Ficha de Matrícula</strong>.
          </p>
          <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-person-check me-1"></i>Expediente de Matrícula del Alumno
          </span>
        </div>`;
    }
    if (template?.templateId >= 'TMPL-05' && template?.templateId <= 'TMPL-10') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 4;
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-calendar2-week fs-1 d-block mb-2 text-primary opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Control de Asistencia Modular — UD ${udNum} (${template.templateId})</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico arriba y haga clic en <strong>Generar Asistencia Oficial (UD ${udNum})</strong> para emitir la sábana ministerial de 40 sesiones en formato A3 landscape.
          </p>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-calendar-check me-1"></i>Formato Oficial A3 · 40 Sesiones
          </span>
        </div>`;
    }
    if (template?.templateId >= 'TMPL-11' && template?.templateId <= 'TMPL-17') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 10;
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-clipboard-check fs-1 d-block mb-2 text-success opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Registro de Evaluación Auxiliar — UD ${udNum} (${template.templateId})</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico arriba y haga clic en <strong>Generar Registro Auxiliar (UD ${udNum})</strong> para emitir la sábana de calificaciones en escala vigesimal (0 a 20) en formato A3.
          </p>
          <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-clipboard2-data me-1"></i>Formato Oficial A3 · Escala Vigesimal
          </span>
        </div>`;
    }
    if (template?.templateId === 'TMPL-18') return '<div class="text-center py-5 text-muted"><p>El Consolidado de EFSRT (TMPL-18) se gestiona desde la sección Prácticas / EFSRT.</p></div>';
    if (template?.templateId === 'TMPL-19') return '<div class="text-center py-5 text-muted"><p>El Acta de Evaluación Modular (TMPL-19) se gestiona desde la sección Registro Académico (Evaluación).</p></div>';
    if (template?.templateId === 'TMPL-20') return '<div class="text-center py-5 text-muted"><p>El Certificado Modular (TMPL-20) requiere Libro, Folio y firmas oficiales registradas (Norma MINEDU).</p></div>';
    if (template?.templateId === 'TMPL-21') return '<div class="text-center py-5 text-muted"><p>El Título Técnico (TMPL-21) requiere Código REGISTRA ministerial oficial (Norma MINEDU).</p></div>';
    return `<div class="text-center py-5 text-muted"><p>${escapeHtml(template?.name || 'Esta plantilla')} — ${escapeHtml(template?.previewStatus || 'NOT_IMPLEMENTED')}.</p></div>`;
  }

  _bindEvents(container) {
    const templateSelect = container.querySelector('#doc-template-select');
    const searchInput = container.querySelector('#doc-context-search');
    const generateButton = container.querySelector('#doc-generate-btn');
    const quickSearchInput = container.querySelector('#doc-quick-search');
    const quickSearchClear = container.querySelector('#doc-quick-search-clear');

    // Buscador rápido de plantillas para secretaría
    if (quickSearchInput) {
      quickSearchInput.oninput = (e) => {
        this.docFilterQuery = (e.target.value || '').toLowerCase().trim();
        this._filterCardsByQuery(container);
      };
    }
    if (quickSearchClear) {
      quickSearchClear.onclick = () => {
        this.docFilterQuery = '';
        if (quickSearchInput) quickSearchInput.value = '';
        this._filterCardsByQuery(container);
      };
    }

    // Sincronización del selector canónico (<select>)
    if (templateSelect) {
      templateSelect.onchange = async event => {
        this.selectedTemplateId = event.target.value;
        this.activeStageId = getStageIdForTemplate(this.selectedTemplateId);
        this._resetContext();
        await this.render(container);
      };
    }

    // Navegación por pestañas de etapas
    if (typeof container.querySelectorAll === 'function') {
      container.querySelectorAll('.stage-nav-pill').forEach(pill => {
        pill.onclick = async () => {
          const stageId = pill.getAttribute('data-stage-id');
          if (stageId && stageId !== this.activeStageId) {
            this.activeStageId = stageId;
            const stage = DOCUMENT_STAGES.find(s => s.id === stageId);
            if (stage && !stage.templates?.includes(this.selectedTemplateId)) {
              this.selectedTemplateId = stage.templates ? stage.templates[0] : 'TMPL-01';
            }
            this._resetContext();
            await this.render(container);
          }
        };
        pill.onkeydown = event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            pill.click();
          }
        };
      });

      // Clics directos en tarjetas o botones data-select-tmpl
      container.querySelectorAll('[data-select-tmpl]').forEach(el => {
        el.onclick = async event => {
          if (event.target.closest('a')) return;
          event.stopPropagation();
          const tmplId = el.getAttribute('data-select-tmpl');
          if (tmplId) {
            this.selectedTemplateId = tmplId;
            this.activeStageId = getStageIdForTemplate(tmplId);
            this._resetContext();
            await this.render(container);
          }
        };
        el.onkeydown = event => {
          if (event.key === 'Enter' || event.key === ' ') {
            if (event.target.closest('a')) return;
            event.preventDefault();
            el.click();
          }
        };
      });
    }

    const groupSelect = container.querySelector('#doc-group-select');
    if (groupSelect) {
      groupSelect.onchange = event => {
        this.selectedGroupId = event.target.value;
        const g = this.groups.find(item => item.id === this.selectedGroupId);
        if (g) this.selectedGroupCode = g.visibleCode;

        // Actualizar tarjeta resumen en tiempo real
        const cardBox = container.querySelector('#doc-selected-group-card');
        if (cardBox) {
          cardBox.innerHTML = this._renderGroupSummaryCard(g);
        }

        // Sincronizar estado habilitado/deshabilitado de los botones de emisión
        const tmpl01Btn = container.querySelector('#doc-generate-tmpl01-btn');
        if (tmpl01Btn) tmpl01Btn.disabled = !this.selectedGroupId;
        const tmpl04Btn = container.querySelector('#doc-generate-tmpl04-btn');
        if (tmpl04Btn) tmpl04Btn.disabled = !this.selectedGroupId;
        const tmpl03OficialBtn = container.querySelector('#doc-generate-tmpl03-oficial-btn');
        if (tmpl03OficialBtn) tmpl03OficialBtn.disabled = !this.selectedGroupId;
        const tmpl03AltBtn = container.querySelector('#doc-generate-tmpl03-alt-btn');
        if (tmpl03AltBtn) tmpl03AltBtn.disabled = !this.selectedGroupId;
        const asistenciaBtn = container.querySelector('#doc-generate-asistencia-btn');
        if (asistenciaBtn) asistenciaBtn.disabled = !this.selectedGroupId;
        const evaluacionBtn = container.querySelector('#doc-generate-evaluacion-btn');
        if (evaluacionBtn) evaluacionBtn.disabled = !this.selectedGroupId;
      };
    }

    const tmpl01Btn = container.querySelector('#doc-generate-tmpl01-btn');
    if (tmpl01Btn) {
      tmpl01Btn.onclick = async () => this._generateTmpl01(container);
    }

    const tmpl04Btn = container.querySelector('#doc-generate-tmpl04-btn');
    if (tmpl04Btn) {
      tmpl04Btn.onclick = async () => this._generateTmpl04(container);
    }

    const tmpl03OficialBtn = container.querySelector('#doc-generate-tmpl03-oficial-btn');
    if (tmpl03OficialBtn) {
      tmpl03OficialBtn.onclick = async () => this._generateTmpl03(container, false);
    }

    const tmpl03AltBtn = container.querySelector('#doc-generate-tmpl03-alt-btn');
    if (tmpl03AltBtn) {
      tmpl03AltBtn.onclick = async () => this._generateTmpl03(container, true);
    }

    const asistenciaBtn = container.querySelector('#doc-generate-asistencia-btn');
    if (asistenciaBtn) {
      asistenciaBtn.onclick = async () => this._generateTmplAttendance(container);
    }

    const evaluacionBtn = container.querySelector('#doc-generate-evaluacion-btn');
    if (evaluacionBtn) {
      evaluacionBtn.onclick = async () => this._generateTmplEvaluation(container);
    }

    if (searchInput) searchInput.oninput = async event => this._searchEnrollments(container, event.target.value);
    if (generateButton) generateButton.onclick = async () => this._generateSelectedDocument(container);
  }

  _filterCardsByQuery(container) {
    if (typeof container.querySelectorAll !== 'function') return;
    const query = this.docFilterQuery;
    const cards = container.querySelectorAll('.doc-item-card');
    cards.forEach(card => {
      if (!query) {
        card.classList.remove('filtered-out');
        return;
      }
      const text = (card.textContent || '').toLowerCase();
      const match = text.includes(query);
      card.classList.toggle('filtered-out', !match);
    });
  }

  async _searchEnrollments(container, query) {
    const revision = ++this.searchRevision;
    this.operationRevision += 1;
    this.searchQuery = String(query || '').trim();
    this.searchResults = [];
    this.selectedEnrollmentId = null;
    this.previewEligibility = false;
    this._releasePdfUrl();
    const status = container.querySelector('#doc-search-status');
    const results = container.querySelector('#doc-search-results');
    const summary = container.querySelector('#doc-context-summary');
    const documentStatus = container.querySelector('#doc-document-status');
    const generate = container.querySelector('#doc-generate-btn');
    if (summary) summary.innerHTML = '';
    if (documentStatus) documentStatus.innerHTML = '';
    if (results) results.innerHTML = '';
    const workspace = container.querySelector('#doc-render-workspace');
    if (workspace) workspace.innerHTML = this._renderEmptyWorkspace(this.registry.getById(this.selectedTemplateId));
    if (!this.searchQuery) {
      this._setState(container, DOCUMENT_STATES.IDLE);
      if (status) status.textContent = 'Escriba un criterio para buscar matrículas.';
      return;
    }
    this._setState(container, DOCUMENT_STATES.SEARCHING);
    if (status) status.textContent = 'Buscando matrículas…';
    try {
      const matches = await this.documentDataService.searchEnrollments(this.searchQuery);
      if (revision !== this.searchRevision) return;
      this.searchResults = matches.slice(0, 50);
      this._setState(container, DOCUMENT_STATES.RESULTS);
      if (status) status.textContent = matches.length > 50 ? `${matches.length} coincidencias; se muestran las primeras 50.` : `${matches.length} coincidencia(s).`;
      if (results) {
        results.innerHTML = this.searchResults.map(enrollment => `
          <button type="button" class="list-group-item list-group-item-action document-context-result" data-context-id="${escapeHtml(enrollment.id || '')}"
            aria-label="Seleccionar matrícula ${escapeHtml(enrollment.id || '')}" aria-pressed="false" style="border: 2px solid #cbd5e1; border-radius: 8px; margin-bottom: 0.4rem; padding: 0.75rem 1rem;">
            <span class="d-flex justify-content-between align-items-start gap-3">
              <span>
                <strong class="text-primary" style="font-size: 1rem;">${escapeHtml(enrollment.estudianteNombreCompleto || '')}</strong>
                <span class="d-block text-dark mt-1" style="font-size: 0.88rem;"><strong>Doc:</strong> ${escapeHtml(enrollment.estudianteDocumento || 'S/D')} · <strong>Matrícula:</strong> ${escapeHtml(enrollment.id || '')}</span>
                <span class="d-block text-secondary mt-1" style="font-size: 0.85rem;"><strong>Programa:</strong> ${escapeHtml(enrollment.programaNombre || '')} · <strong>Grupo:</strong> ${escapeHtml(enrollment.grupoCode || '')}</span>
              </span>
              <span class="badge bg-primary px-3 py-2 fw-bold" style="font-size: 0.82rem;">Seleccionar</span>
            </span>
          </button>`).join('');
        if (typeof results.querySelectorAll === 'function') {
          results.querySelectorAll('.document-context-result').forEach(button => {
            button.onclick = async () => this._selectEnrollment(container, button.getAttribute('data-context-id'));
          });
        }
      }
    } catch (error) {
      if (revision === this.searchRevision) {
        this._setState(container, DOCUMENT_STATES.ERROR, 'No se pudo completar la búsqueda.');
        if (status) status.textContent = `No se pudo buscar: ${error.message}`;
        console.error('[DocumentsView] Error al buscar matrículas', error);
      }
    }
  }

  async _selectEnrollment(container, enrollmentId) {
    const summary = container.querySelector('#doc-context-summary');
    const selected = this.searchResults.find(result => String(result.id || '') === String(enrollmentId || ''));
    if (!selected?.id) {
      this.selectedEnrollmentId = null;
      this._setState(container, DOCUMENT_STATES.ERROR, 'No se pudo seleccionar la matrícula.');
      if (summary) summary.innerHTML = '<div class="alert alert-danger small">La matrícula elegida ya no está disponible en los resultados.</div>';
      return;
    }
    this.selectedEnrollmentId = String(selected.id);
    this.previewEligibility = false;
    this._setState(container, DOCUMENT_STATES.SELECTED);
    if (typeof container.querySelectorAll === 'function') {
      container.querySelectorAll('.document-context-result').forEach(button => {
        const isSelected = button.getAttribute('data-context-id') === this.selectedEnrollmentId;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
      });
    }
    if (summary) summary.innerHTML = `
      <div class="card bg-white shadow-sm p-3 mb-0" style="border: 2px solid #2563eb !important; border-left: 6px solid #2563eb !important; border-radius: 10px;">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-bold" style="font-size: 0.82rem;">
            <i class="bi bi-person-check-fill me-1"></i>Estudiante Seleccionado
          </span>
          <span class="badge bg-light text-muted border fw-bold">Matrícula: ${escapeHtml(selected.id)}</span>
        </div>
        <h5 class="fw-bold mb-2 text-dark" style="font-size: 1.15rem; color: #0f172a;">${escapeHtml(selected.estudianteNombreCompleto || '')}</h5>
        <div class="row g-2 text-dark" style="font-size: 0.9rem;">
          <div class="col-sm-6"><strong>Documento / DNI:</strong> ${escapeHtml(selected.estudianteDocumento || 'S/D')}</div>
          <div class="col-sm-6"><strong>Grupo Académico:</strong> ${escapeHtml(selected.grupoCode || '')}</div>
          <div class="col-12"><strong>Programa Formativo:</strong> ${escapeHtml(selected.programaNombre || '')}</div>
        </div>
      </div>`;
    const status = container.querySelector('#doc-document-status');
    if (status) status.innerHTML = '<div class="text-secondary fw-semibold" style="font-size: 0.88rem;"><i class="spinner-border spinner-border-sm me-1 text-primary"></i>Comprobando datos del documento…</div>';
    const selectedId = this.selectedEnrollmentId;
    const revision = this.operationRevision;
    try {
      const context = await this.documentDataService.buildEnrollmentContext(selectedId);
      if (revision !== this.operationRevision || this.selectedEnrollmentId !== selectedId || this.selectedTemplateId !== 'TMPL-02') return;
      const preflight = this.documentValidationService.validateDocument('TMPL-02', context);
      this.previewEligibility = preflight.canPreview;
      if (status) status.innerHTML = this._renderDocumentStatus(preflight);
      if (!preflight.canPreview) this._setState(container, DOCUMENT_STATES.ERROR, 'Faltan datos necesarios para la vista previa.');
      else this._syncGenerateButton(container);
    } catch (error) {
      if (revision !== this.operationRevision || this.selectedEnrollmentId !== selectedId) return;
      this.previewEligibility = false;
      if (status) status.innerHTML = `<div class="alert alert-danger small">No se pudo comprobar la ficha: ${escapeHtml(error.message)}</div>`;
      this._setState(container, DOCUMENT_STATES.ERROR, 'No se pudo comprobar la ficha.');
      console.error('[DocumentsView] Error en comprobación documental', error);
    }
  }

  _renderDocumentStatus(preflight) {
    const pending = [...preflight.missingFields, ...preflight.blockedFields]
      .filter((field, index, items) => items.findIndex(item => item.key === field.key) === index);
    const reason = field => field.blocker || field.emptyReason || 'dato pendiente';
    return `<div class="alert alert-warning mb-0" id="doc-preflight-summary" style="border: 2px solid #fde68a; border-radius: 8px; font-size: 0.9rem;">
      <div class="fw-bold mb-1" style="font-size: 0.95rem;"><i class="bi bi-shield-check me-1"></i>Estado del documento</div>
      <div><strong>Datos disponibles:</strong> ${preflight.availableFields.length}</div>
      <div><strong>Datos pendientes:</strong> ${pending.length}</div>
      <div class="mt-1">${preflight.canPreview ? '✓ Vista previa permitida. Emisión oficial bloqueada.' : 'Vista previa bloqueada hasta completar los datos necesarios.'}</div>
      ${pending.length ? `<details id="doc-field-details" class="mt-2"><summary class="fw-bold" style="cursor: pointer;">Ver campos pendientes</summary><ul class="mb-0 mt-1">
        ${pending.map(field => `<li>${escapeHtml(field.label)} — ${escapeHtml(reason(field))}</li>`).join('')}
      </ul></details>` : ''}
    </div>`;
  }

  async _generateSelectedDocument(container) {
    const workspace = container.querySelector('#doc-render-workspace');
    const template = this.registry.getById(this.selectedTemplateId);
    if (!workspace || !template || !this._canGenerate(template)) return;
    const enrollmentId = this.selectedEnrollmentId;
    const operationRevision = ++this.operationRevision;
    this._setState(container, DOCUMENT_STATES.GENERATING);
    workspace.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-2" role="status"></div><p class="fw-bold text-dark">Generando documento oficial en PDF…</p></div>';
    try {
      const context = await this.documentDataService.buildEnrollmentContext(enrollmentId);
      if (operationRevision !== this.operationRevision || this.selectedTemplateId !== template.templateId || this.selectedEnrollmentId !== enrollmentId) return;
      this._validateEnrollmentContext(context, enrollmentId);
      const preflight = this.documentValidationService.validateDocument(template.templateId, context);
      if (!preflight.canPreview) {
        const detail = preflight.warnings[0] || 'faltan datos necesarios';
        throw new Error(`Vista previa bloqueada: ${detail}`);
      }
      const renderDocument = this.pdfEngine[template.renderer];
      if (typeof renderDocument !== 'function') throw new Error('La plantilla seleccionada no tiene generación disponible.');
      const pdf = await renderDocument.call(this.pdfEngine, { ...context,
        resolvedFieldSet: preflight.resolvedFieldSet, demoMode: isDemoRuntime() });
      if (!(pdf instanceof Blob) || pdf.type !== 'application/pdf' || pdf.size === 0) throw new Error('El documento generado no es un PDF válido.');
      this._releasePdfUrl();
      this.pdfBlobUrl = URL.createObjectURL(pdf);
      const safeId = context.source.enrollmentId.replace(/[^A-Za-z0-9_-]/g, '_');
      const downloadName = `${isDemoRuntime() ? 'DEMO_' : ''}TMPL02_Ficha_Matricula_${safeId}.pdf`;
      this._displayPdfInWorkspace(container, pdf, downloadName, 'Ficha de Matrícula', 'Vista previa PDF TMPL-02');
      this._setState(container, DOCUMENT_STATES.READY);
    } catch (error) {
      if (operationRevision !== this.operationRevision) return;
      this._setState(container, DOCUMENT_STATES.ERROR, 'No se pudo generar la ficha.');
      workspace.innerHTML = `<div class="alert alert-danger" role="alert">No se pudo generar la ficha: ${escapeHtml(error.message)}</div>`;
      console.error('[DocumentsView] No se pudo generar la ficha', error);
    }
  }

  _displayPdfInWorkspace(container, blob, fileName, title, iframeTitle = null) {
    const workspace = container.querySelector('#doc-render-workspace');
    if (!workspace) return;
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('El documento generado no es un PDF válido o está vacío.');
    }
    this._releasePdfUrl();
    this.pdfBlobUrl = URL.createObjectURL(blob);
    const safeName = fileName.replace(/[^A-Za-z0-9_.-]/g, '_');
    const finalIframeTitle = iframeTitle || title;
    workspace.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 bg-white rounded border mb-3 shadow-sm" style="border: 2px solid #cbd5e1 !important;">
        <div>
          <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold mb-1" style="font-size: 0.82rem;">
            <i class="bi bi-check-circle-fill me-1"></i>Documento Oficial Generado
          </span>
          <h5 class="text-primary fw-bold mb-0" style="font-size: 1.18rem; color: #1d4ed8;">${escapeHtml(title)}</h5>
        </div>
        <div class="d-flex gap-2">
          <button id="doc-print-pdf-btn" type="button" class="btn btn-outline-dark fw-bold px-3 py-2" style="font-size: 0.92rem; border-width: 2px;">
            <i class="bi bi-printer-fill me-1"></i>Imprimir
          </button>
          <a href="${this.pdfBlobUrl}" download="${escapeHtml(safeName)}" class="btn btn-success fw-bold px-3 py-2" style="font-size: 0.92rem;">
            <i class="bi bi-download me-1"></i>Descargar PDF
          </a>
        </div>
      </div>
      <iframe title="${escapeHtml(finalIframeTitle)}" src="${this.pdfBlobUrl}" width="100%" height="740px" style="border: 2px solid #cbd5e1; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.08);"></iframe>`;

    const printButton = workspace.querySelector('#doc-print-pdf-btn');
    if (printButton) {
      printButton.onclick = () => {
        const frame = workspace.querySelector('iframe');
        if (frame?.contentWindow) {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        }
      };
    }
  }

  async _generateTmpl01(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    if (status) status.innerHTML = '<span class="text-primary fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Nómina Oficial…</span>';
    if (workspace) workspace.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-2" role="status"></div><p class="fw-bold text-dark">Generando Nómina Oficial en PDF…</p></div>';
    try {
      const context = await this.adminService.buildGroupRoster(groupId);
      const { rows, institution, program, group } = context;
      const blob = await this.pdfEngine.renderDocument({
        documentType: 'TMPL-01',
        mode: 'ADMINISTRATIVE_MULTIPAGE',
        context: { ...context, institution, program },
        rows,
        demoMode: isDemoRuntime()
      });
      const pageCount = this.pdfEngine.lastAdministrativePagination?.pageCount || 1;
      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}NOMINA_OFICIAL_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Nómina de Matrícula Oficial — Grupo ${group.visibleCode}`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Nómina generada con éxito (${rows.length} matrículas, ${pageCount} página(s)).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar TMPL-01', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar la nómina: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl04(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    if (status) status.innerHTML = '<span class="text-primary fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Portada de Carpeta…</span>';
    if (workspace) workspace.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border text-info mb-2" role="status"></div><p class="fw-bold text-dark">Generando Portada de Carpeta en PDF…</p></div>';
    try {
      const context = await this.adminService.buildGroupRoster(groupId);
      const { group } = context;
      const blob = await this.pdfEngine.renderDocument({
        documentType: 'TMPL-04',
        context,
        demoMode: isDemoRuntime()
      });
      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}PORTADA_CARPETA_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Portada de Carpeta Pedagógica — Grupo ${group.visibleCode}`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Portada generada con éxito.</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar TMPL-04', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar la portada: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl03(container, isAlt = false) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    const label = isAlt ? 'Reporte Administrativo' : 'Registro Modular Oficial (TMPL-03)';
    if (status) status.innerHTML = `<span class="text-primary fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando ${label}…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-warning mb-2" role="status"></div><p class="fw-bold text-dark">Generando ${label} en PDF…</p></div>`;
    try {
      const context = await this.adminService.buildGroupRoster(groupId);
      const { rows, group } = context;
      let blob;
      let fileName;
      let title;
      if (isAlt) {
        blob = await this.mvpPdf.renderAdministrativeEnrollmentRegister(context);
        fileName = `${isDemoRuntime() ? 'DEMO_' : ''}REGISTRO_ADMINISTRATIVO_${group.visibleCode}.pdf`;
        title = `Registro Administrativo de Matrícula — Grupo ${group.visibleCode}`;
      } else {
        blob = await this.pdfEngine.renderDocument({
          documentType: 'TMPL-03',
          context,
          rows,
          demoMode: isDemoRuntime()
        });
        fileName = `${isDemoRuntime() ? 'DEMO_' : ''}REGISTRO_MODULAR_TMPL03_${group.visibleCode}.pdf`;
        title = `Registro de Matrícula Modular (TMPL-03 Oficial) — Grupo ${group.visibleCode}`;
      }
      this._displayPdfInWorkspace(container, blob, fileName, title);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>${label} generado con éxito (${rows.length} matrículas).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar TMPL-03', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el documento: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmplAttendance(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    const tmplId = this.selectedTemplateId;
    const udNum = parseInt(tmplId.replace('TMPL-', ''), 10) - 4;
    if (status) status.innerHTML = `<span class="text-primary fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Hoja de Asistencia (UD ${udNum})…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-2" role="status"></div><p class="fw-bold text-dark">Generando Hoja de Asistencia (UD ${udNum}) en PDF…</p></div>`;
    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      const { rows, group } = rosterContext;
      const context = {
        ...rosterContext,
        unit: { orden: udNum, nombre: `Unidad Didáctica ${udNum}` }
      };
      const blob = await this.pdfEngine.renderDocument({
        documentType: tmplId,
        context,
        rows,
        demoMode: isDemoRuntime()
      });
      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}ASISTENCIA_UD${udNum}_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Control de Asistencia Modular — UD ${udNum} (${group.visibleCode})`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Asistencia generada con éxito (${rows.length} estudiantes, 40 sesiones A3).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar Asistencia', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar la hoja de asistencia: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmplEvaluation(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    const tmplId = this.selectedTemplateId;
    const udNum = parseInt(tmplId.replace('TMPL-', ''), 10) - 10;
    if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Registro Auxiliar de Evaluación (UD ${udNum})…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-success mb-2" role="status"></div><p class="fw-bold text-dark">Generando Registro de Evaluación (UD ${udNum}) en PDF…</p></div>`;
    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      const { rows, group } = rosterContext;
      const context = {
        ...rosterContext,
        unit: { orden: udNum, nombre: `Unidad Didáctica ${udNum}` }
      };
      const blob = await this.pdfEngine.renderDocument({
        documentType: tmplId,
        context,
        rows,
        demoMode: isDemoRuntime()
      });
      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}EVALUACION_AUXILIAR_UD${udNum}_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Registro Auxiliar de Evaluación — UD ${udNum} (${group.visibleCode})`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Registro de evaluación generado con éxito (${rows.length} estudiantes, escala vigesimal A3).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar Evaluación', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el registro de evaluación: ${escapeHtml(error.message)}</div>`;
    }
  }

  _validateEnrollmentContext(context, enrollmentId) {
    const missing = [];
    if (!context?.student?.id) missing.push('estudiante');
    if (!context?.enrollment?.id) missing.push('matrícula');
    if (!context?.program?.id) missing.push('programa');
    if (!context?.institution || typeof context.institution !== 'object') missing.push('institución');
    if (missing.length) throw new Error(`Faltan datos requeridos: ${missing.join(', ')}.`);
    if (String(context.enrollment.id) !== String(enrollmentId) || String(context.source?.enrollmentId) !== String(enrollmentId)) {
      throw new Error('El contexto devuelto no corresponde a la matrícula seleccionada.');
    }
  }

  _canGenerate(template = this.registry.getById(this.selectedTemplateId)) {
    const actionableState = this.documentState === DOCUMENT_STATES.SELECTED || this.documentState === DOCUMENT_STATES.READY;
    if (!template || !actionableState) return false;
    if (template.contextType === 'ENROLLMENT') return Boolean(this.selectedEnrollmentId && this.previewEligibility);
    if (template.contextType === 'GROUP') return Boolean(this.selectedGroupCode);
    return false;
  }

  _syncGenerateButton(container) {
    const button = container.querySelector('#doc-generate-btn');
    if (!button) return;
    const template = this.registry.getById(this.selectedTemplateId);
    const enabled = this._canGenerate(template);
    button.disabled = !enabled;
    if (typeof button.setAttribute === 'function') button.setAttribute('aria-disabled', String(!enabled));
    button.className = `${enabled ? 'btn btn-primary' : 'btn btn-secondary'} btn-sm${template?.contextType === 'ENROLLMENT' ? ' mt-3' : ''}`;
    button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    button.style.opacity = enabled ? '1' : '.65';
    button.textContent = this.documentState === DOCUMENT_STATES.GENERATING
      ? 'Generando…'
      : template?.contextType === 'GROUP' ? 'Generar Nómina'
        : template?.contextType === 'ENROLLMENT' ? 'Generar Ficha de Matrícula' : 'Generar PDF';
  }

  _setState(container, state, message = '') {
    this.documentState = state;
    const stateElement = container.querySelector('#doc-flow-state');
    if (stateElement) {
      stateElement.dataset.state = state;
      stateElement.textContent = message || this._stateMessage();
    }
    this._syncGenerateButton(container);
  }

  _stateMessage() {
    const messages = {
      [DOCUMENT_STATES.IDLE]: 'Busque una matrícula para comenzar.',
      [DOCUMENT_STATES.SEARCHING]: 'Buscando matrículas…',
      [DOCUMENT_STATES.RESULTS]: 'Seleccione una matrícula de los resultados.',
      [DOCUMENT_STATES.SELECTED]: 'Contexto seleccionado. Puede generar la ficha.',
      [DOCUMENT_STATES.GENERATING]: 'Generando ficha…',
      [DOCUMENT_STATES.READY]: 'Ficha lista para revisar, descargar o imprimir.',
      [DOCUMENT_STATES.ERROR]: 'Ocurrió un error en el flujo documental.'
    };
    return messages[this.documentState] || messages[DOCUMENT_STATES.IDLE];
  }

  _resetContext() {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedEnrollmentId = null;
    this.previewEligibility = false;
    this.selectedGroupCode = null;
    this.documentState = DOCUMENT_STATES.IDLE;
    this.searchRevision += 1;
    this.operationRevision += 1;
    this._releasePdfUrl();
  }

  _releasePdfUrl() {
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
  }
}
