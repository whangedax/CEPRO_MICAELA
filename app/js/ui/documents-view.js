/**
 * Espacio documental productivo común (#/documentos).
 * Categorización en 4 Etapas del Ciclo Académico con selectores secundarios para UDs.
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
    subtitle: 'Nómina, ficha, portada y registro inicial',
    icon: 'bi-pencil-square',
    badge: '4 documentos',
    templates: ['TMPL-01', 'TMPL-02', 'TMPL-04', 'TMPL-03']
  },
  {
    id: 'ETAPA_2',
    number: '2',
    title: 'Registro Auxiliar Docente',
    shortTitle: '2. Registro Auxiliar',
    subtitle: 'Seguimiento: Asistencia (UD1-UD6) y Evaluación (UD1-UD7)',
    icon: 'bi-calendar-check',
    badge: '2 controles (13 UDs)',
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
    badge: '2 documentos (B-006)',
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
        .stage-nav-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.85rem;
          margin-bottom: 1.5rem;
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
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 1rem 1.15rem;
          transition: all 0.2s ease;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          user-select: none;
        }
        .stage-nav-pill:hover {
          border-color: #3b82f6;
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .stage-nav-pill.active {
          background: #eff6ff;
          border: 2.5px solid #1d4ed8;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.15);
        }
        .doc-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.15rem;
        }
        @media (max-width: 850px) {
          .doc-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .doc-item-card {
          cursor: pointer;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 1.25rem;
          background: #ffffff;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          box-sizing: border-box;
          user-select: none;
        }
        .doc-item-card:hover {
          border-color: #3b82f6;
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .doc-item-card.active-template {
          border: 2.5px solid #1d4ed8;
          background: #eff6ff;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.15);
        }
        .ud-pills-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          align-items: center;
          margin-top: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .ud-selector-pill {
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ud-selector-pill:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
        }
        .ud-selector-pill.active-ud {
          background: #2563eb;
          color: #ffffff;
          border-color: #1d4ed8;
          box-shadow: 0 2px 4px rgba(37,99,235,0.25);
        }
        .doc-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .doc-badge-primary { background: #dbeafe; color: #1e40af; }
        .doc-badge-success { background: #d1fae5; color: #065f46; }
        .doc-badge-warning { background: #fef3c7; color: #92400e; }
        .doc-badge-info { background: #e0f2fe; color: #0369a1; }
        .doc-badge-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .doc-selector-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 1.25rem;
        }
        .doc-selector-select {
          flex: 1;
          min-width: 320px;
          max-width: 600px;
          padding: 0.45rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          color: #1e293b;
        }
      </style>

      <div class="documents-module-container p-4">
        <!-- Encabezado Principal -->
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom gap-2">
          <div>
            <h2 class="m-0 text-primary d-flex align-items-center gap-2">
              <i class="bi bi-folder2-open"></i>
              <span>Panel Documental Institucional</span>
            </h2>
            <p class="text-muted m-0 small">Catálogo oficial ministerial organizado en 4 etapas del ciclo formativo.</p>
          </div>
          <span class="badge ${isDemoRuntime() ? 'bg-warning text-dark' : 'bg-primary'} p-2 fs-6">
            <i class="bi bi-${isDemoRuntime() ? 'flask' : 'shield-check'} me-1"></i>
            ${isDemoRuntime() ? 'DEMOSTRACIÓN — NO OFICIAL' : 'MODO CANDIDATO V2 (8081)'}
          </span>
        </div>

        <!-- Barra de Navegación por Etapas (4 Pestañas) -->
        <div class="stage-nav-grid" id="document-stage-tabs" role="tablist">
          ${this._renderStageNav()}
        </div>

        <!-- Contenedor Principal de la Etapa Seleccionada -->
        <div class="card mb-4 shadow-sm" style="border: 1px solid #e2e8f0; border-radius: 10px;">
          <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary fs-6 px-2 py-1" style="background: #2563eb; color: #fff; border-radius: 6px;">ETAPA ${DOCUMENT_STAGES.find(s => s.id === this.activeStageId)?.number || '1'}</span>
              <h5 class="m-0 text-dark fw-bold" style="font-size: 1.15rem;">${DOCUMENT_STAGES.find(s => s.id === this.activeStageId)?.title || ''}</h5>
            </div>
            <div class="small text-muted">${DOCUMENT_STAGES.find(s => s.id === this.activeStageId)?.subtitle || ''}</div>
          </div>
          <div class="card-body p-3">
            <!-- Selector canónico semántico con <optgroup> para accesibilidad y pruebas -->
            <div class="doc-selector-toolbar">
              <div class="d-flex align-items-center gap-2" style="flex: 1;">
                <label class="form-label fw-bold small text-muted m-0" for="doc-template-select" style="white-space: nowrap;">
                  <i class="bi bi-funnel me-1 text-primary"></i>Selector canónico:
                </label>
                <select id="doc-template-select" class="doc-selector-select">
                  ${this._renderOptGroups()}
                </select>
              </div>
              <div>
                <span class="doc-badge-pill doc-badge-primary">
                  <i class="bi bi-file-earmark-check me-1"></i>Plantilla activa: <strong>${escapeHtml(this.selectedTemplateId)}</strong>
                </span>
              </div>
            </div>

            <!-- Panel de Controles / Tarjetas según la Etapa Activa -->
            <div id="stage-cards-container" class="mb-3">
              ${this._renderStageCards()}
            </div>

            <!-- Controles contextuales específicos de la plantilla -->
            <div id="doc-context-controls" class="mt-3 pt-3 border-top">
              ${this._renderContextControls(currentTemplate)}
            </div>
          </div>
        </div>

        <!-- Espacio de Vista Previa -->
        <div class="card shadow-sm">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <span class="fw-bold text-dark small">
              <i class="bi bi-eye me-1"></i>Visor documental: <strong>${escapeHtml(currentTemplate?.name || this.selectedTemplateId)}</strong>
            </span>
            <span class="badge bg-secondary small">${escapeHtml(currentTemplate?.templateId || '')}</span>
          </div>
          <div class="card-body p-3 overflow-auto" id="doc-render-workspace" style="min-height: 500px; background-color: #f8f9fa;">
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
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge ${isActive ? 'bg-primary' : 'bg-secondary'} small">ETAPA ${stage.number}</span>
            <small class="text-muted">${stage.badge}</small>
          </div>
          <div class="fw-bold text-dark mb-1"><i class="bi ${stage.icon} me-1 text-primary"></i>${escapeHtml(stage.title)}</div>
          <div class="text-muted" style="font-size: 0.75rem; line-height: 1.2;">${escapeHtml(stage.subtitle)}</div>
        </div>`;
    }).join('');
  }

  _renderOptGroups() {
    return `
      <optgroup label="ETAPA 1: MATRÍCULA E INICIO DE GRUPO">
        <option value="TMPL-01" ${this.selectedTemplateId === 'TMPL-01' ? 'selected' : ''}>TMPL-01 - Nómina de Matrícula</option>
        <option value="TMPL-02" ${this.selectedTemplateId === 'TMPL-02' ? 'selected' : ''}>TMPL-02 - Ficha de Matrícula</option>
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
        <div class="doc-item-card ${isTmpl01 ? 'active-template' : ''}" data-select-tmpl="TMPL-01" role="button" tabindex="0" title="Seleccionar Nómina de Matrícula (TMPL-01)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-people me-1 text-primary"></i>Nómina de Matrícula</h6>
            <span class="badge bg-primary">TMPL-01</span>
          </div>
          <p class="small text-muted mb-3">Consolidado oficial de matrícula modular por grupo académico con paginación reglamentaria de 30 en 30.</p>
          <div class="d-flex justify-content-between align-items-center">
            ${isTmpl01
              ? '<span class="badge bg-primary px-3 py-2"><i class="bi bi-check-circle-fill me-1"></i>Activo</span>'
              : '<span class="text-muted small"><i class="bi bi-cursor me-1"></i>Clic para seleccionar</span>'}
          </div>
        </div>

        <!-- Ficha de Matrícula (TMPL-02) -->
        <div class="doc-item-card ${isTmpl02 ? 'active-template' : ''}" data-select-tmpl="TMPL-02" role="button" tabindex="0" title="Seleccionar Ficha de Matrícula (TMPL-02)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-person-badge me-1 text-success"></i>Ficha de Matrícula</h6>
            <span class="badge bg-success">TMPL-02</span>
          </div>
          <p class="small text-muted mb-3">Ficha individual con datos personales y académicos del estudiante. Generación directa mediante búsqueda en tiempo real.</p>
          <div class="d-flex justify-content-between align-items-center">
            ${isTmpl02
              ? '<span class="badge bg-success px-3 py-2 text-white"><i class="bi bi-check-circle-fill me-1"></i>Activo</span>'
              : '<span class="text-muted small"><i class="bi bi-cursor me-1"></i>Clic para seleccionar</span>'}
          </div>
        </div>

        <!-- Portada de Carpeta Pedagógica (TMPL-04) -->
        <div class="doc-item-card ${isTmpl04 ? 'active-template' : ''}" data-select-tmpl="TMPL-04" role="button" tabindex="0" title="Seleccionar Portada de Carpeta (TMPL-04)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-journal-bookmark me-1 text-info"></i>Portada de Carpeta</h6>
            <span class="badge bg-info text-dark">TMPL-04</span>
          </div>
          <p class="small text-muted mb-3">Carátula oficial de asistencia y evaluación con datos institucionales, módulo y docente responsable.</p>
          <div class="d-flex justify-content-between align-items-center">
            ${isTmpl04
              ? '<span class="badge bg-info px-3 py-2 text-dark"><i class="bi bi-check-circle-fill me-1"></i>Activo</span>'
              : '<span class="text-muted small"><i class="bi bi-cursor me-1"></i>Clic para seleccionar</span>'}
          </div>
        </div>

        <!-- Registro de Matrícula Modular (TMPL-03) -->
        <div class="doc-item-card ${isTmpl03 ? 'active-template' : ''}" data-select-tmpl="TMPL-03" role="button" tabindex="0" title="Seleccionar Registro Modular (TMPL-03)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-card-checklist me-1 text-warning"></i>Registro de Matrícula Modular</h6>
            <span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>En Revisión Técnica</span>
          </div>
          <p class="small text-muted mb-3">Formato ministerial con enmascaramiento vectorial limpio (20 en 20) y reporte administrativo alternativo.</p>
          <div class="d-flex justify-content-between align-items-center">
            ${isTmpl03
              ? '<span class="badge bg-warning px-3 py-2 text-dark"><i class="bi bi-check-circle-fill me-1"></i>Activo</span>'
              : '<span class="text-muted small"><i class="bi bi-cursor me-1"></i>Clic para seleccionar</span>'}
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

    // Pills de Asistencia UD1..UD6
    const asistenciaPills = [1, 2, 3, 4, 5, 6].map(n => {
      const tmplId = `TMPL-${String(n + 4).padStart(2, '0')}`;
      const isSelected = this.selectedTemplateId === tmplId;
      return `<button type="button" class="ud-selector-pill ${isSelected ? 'active-ud' : ''}" data-select-tmpl="${tmplId}" title="Asistencia Unidad Didáctica ${n}">UD${n}</button>`;
    }).join(' ');

    // Pills de Evaluación UD1..UD7
    const evaluacionPills = [1, 2, 3, 4, 5, 6, 7].map(n => {
      const tmplId = `TMPL-${String(n + 10).padStart(2, '0')}`;
      const isSelected = this.selectedTemplateId === tmplId;
      return `<button type="button" class="ud-selector-pill ${isSelected ? 'active-ud' : ''}" data-select-tmpl="${tmplId}" title="Evaluación Unidad Didáctica ${n}">UD${n}</button>`;
    }).join(' ');

    return `
      <div class="doc-cards-grid">
        <!-- Control de Asistencia (TMPL-05 a TMPL-10) -->
        <div class="doc-item-card ${isAsistencia ? 'active-template' : ''}" data-select-tmpl="${currentAsistenciaTmpl}" role="button" tabindex="0" title="Seleccionar Control de Asistencia Modular">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-calendar2-week me-1 text-primary"></i>Control de Asistencia Modular</h6>
              <div class="text-xs text-muted">Agrupa TMPL-05 a TMPL-10 (40 sesiones)</div>
            </div>
            <span class="badge ${isAsistencia ? 'bg-primary' : 'bg-light text-dark border'}">${isAsistencia ? this.selectedTemplateId : 'TMPL-05..10'}</span>
          </div>
          <p class="small text-muted mb-2">Seleccione la Unidad Didáctica para emitir el registro de asistencia correspondiente:</p>
          <div class="d-flex flex-wrap gap-1 align-items-center mb-3">
            <span class="small fw-bold text-secondary me-1">UD:</span>
            ${asistenciaPills}
          </div>
          <div class="d-flex gap-2">
            <a href="#/asistencia" class="btn btn-sm btn-outline-primary"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Registro de Asistencia</a>
          </div>
        </div>

        <!-- Registro de Evaluación Auxiliar (TMPL-11 a TMPL-17) -->
        <div class="doc-item-card ${isEvaluacion ? 'active-template' : ''}" data-select-tmpl="${currentEvaluacionTmpl}" role="button" tabindex="0" title="Seleccionar Registro de Evaluación Auxiliar">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-card-checklist me-1 text-success"></i>Registro de Evaluación Auxiliar</h6>
              <div class="text-xs text-muted">Agrupa TMPL-11 a TMPL-17 (Indicadores de Logro)</div>
            </div>
            <span class="badge ${isEvaluacion ? 'bg-success' : 'bg-light text-dark border'}">${isEvaluacion ? this.selectedTemplateId : 'TMPL-11..17'}</span>
          </div>
          <p class="small text-muted mb-2">Seleccione la Unidad Didáctica para emitir el registro de evaluación correspondiente:</p>
          <div class="d-flex flex-wrap gap-1 align-items-center mb-3">
            <span class="small fw-bold text-secondary me-1">UD:</span>
            ${evaluacionPills}
          </div>
          <div class="d-flex gap-2">
            <a href="#/evaluacion" class="btn btn-sm btn-outline-success"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Registro de Evaluación</a>
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
        <div class="doc-item-card ${isTmpl18 ? 'active-template' : ''}" data-select-tmpl="TMPL-18" role="button" tabindex="0" title="Seleccionar Consolidado de EFSRT (TMPL-18)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-briefcase me-1 text-success"></i>Consolidado de EFSRT</h6>
            <span class="badge bg-success">TMPL-18</span>
          </div>
          <p class="small text-muted mb-3">Consolidado de Experiencias Formativas en Situaciones Reales de Trabajo. Cuadrícula de 40 estudiantes con 9 criterios y salvaguarda B-005 (celdas limpias).</p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm ${isTmpl18 ? 'btn-success text-white' : 'btn-outline-success'}" data-select-tmpl="TMPL-18">Seleccionar</button>
            <a href="#/efsrt" class="btn btn-sm btn-outline-secondary"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Consolidado EFSRT</a>
          </div>
        </div>

        <!-- Acta de Evaluación Modular (TMPL-19) -->
        <div class="doc-item-card ${isTmpl19 ? 'active-template' : ''}" data-select-tmpl="TMPL-19" role="button" tabindex="0" title="Seleccionar Acta de Evaluación Modular (TMPL-19)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-file-earmark-spreadsheet me-1 text-primary"></i>Acta de Evaluación Modular</h6>
            <span class="badge bg-primary">TMPL-19</span>
          </div>
          <p class="small text-muted mb-3">Acta oficial de 2 páginas físicas A3 landscape (partición 20+20 filas, hasta 40 estudiantes, cálculo de unidades aprobadas y cuadro estadístico).</p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm ${isTmpl19 ? 'btn-primary' : 'btn-outline-primary'}" data-select-tmpl="TMPL-19">Seleccionar</button>
            <a href="#/evaluacion" class="btn btn-sm btn-outline-secondary"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir y Generar Acta Modular</a>
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
        <div class="doc-item-card ${isTmpl20 ? 'active-template' : ''}" data-select-tmpl="TMPL-20" role="button" tabindex="0" title="Seleccionar Certificado Modular (TMPL-20)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-mortarboard me-1 text-secondary"></i>Certificado Modular</h6>
            <span class="badge bg-secondary"><i class="bi bi-lock-fill me-1"></i>Requiere Libro/Folio (B-006)</span>
          </div>
          <p class="small text-muted mb-3">Documento oficial de acreditación modular ministerial (2 páginas físicas, 55 campos mapeados). Emisión bloqueada por salvaguardas B-002 y B-006 hasta registro oficial.</p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm ${isTmpl20 ? 'btn-secondary text-white' : 'btn-outline-secondary'}" data-select-tmpl="TMPL-20">Ver Estado de Bloqueo</button>
          </div>
        </div>

        <!-- Título Técnico (TMPL-21) -->
        <div class="doc-item-card ${isTmpl21 ? 'active-template' : ''}" data-select-tmpl="TMPL-21" role="button" tabindex="0" title="Seleccionar Título Técnico (TMPL-21)">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-award me-1 text-secondary"></i>Título Técnico</h6>
            <span class="badge bg-secondary"><i class="bi bi-lock-fill me-1"></i>Requiere Código REGISTRA (B-006)</span>
          </div>
          <p class="small text-muted mb-3">Acreditación de egreso y titulación técnica oficial. Emisión bloqueada por salvaguarda B-006 hasta asignación ministerial de código REGISTRA.</p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm ${isTmpl21 ? 'btn-secondary text-white' : 'btn-outline-secondary'}" data-select-tmpl="TMPL-21">Ver Estado de Bloqueo</button>
          </div>
        </div>
      </div>
    `;
  }

  _renderContextControls(template) {
    if (!template) return '<div class="alert alert-secondary mb-0">Plantilla no disponible.</div>';
    if (template.templateId === 'TMPL-01') {
      const groupOptions = this.groups.map(g =>
        `<option value="${escapeHtml(g.id)}" ${g.id === this.selectedGroupId ? 'selected' : ''}>${escapeHtml(g.visibleCode)} — ${escapeHtml(g.programaNombre || '')} (${g.enrollmentCount} matrículas)</option>`
      ).join('');
      return `
        <div class="card p-3 mb-2 border-0 bg-light" style="border-radius: 8px;">
          <div class="row align-items-end g-3">
            <div class="col-md-6 col-lg-5">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select">
                <i class="bi bi-collection me-1 text-primary"></i>Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select form-select-sm">
                ${groupOptions || '<option value="">No hay grupos disponibles</option>'}
              </select>
            </div>
            <div class="col-md-6 col-lg-7 d-flex flex-wrap gap-2 align-items-center">
              <button id="doc-generate-tmpl01-btn" type="button" class="btn btn-primary btn-sm" ${!this.selectedGroupId ? 'disabled' : ''}>
                <i class="bi bi-file-earmark-pdf me-1"></i>Generar Nómina Oficial
              </button>
              <button id="doc-generate-btn" type="button" class="btn btn-secondary btn-sm" style="display: none;" disabled aria-disabled="true">Generar Nómina</button>
            </div>
          </div>
          <div id="doc-group-status" class="mt-2 small text-muted" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-primary"></i>Generación directa con paginación reglamentaria de 30 en 30 sobre la plantilla ministerial TMPL-01.
          </div>
        </div>`;
    }
    if (template.templateId === 'TMPL-04') {
      const groupOptions = this.groups.map(g =>
        `<option value="${escapeHtml(g.id)}" ${g.id === this.selectedGroupId ? 'selected' : ''}>${escapeHtml(g.visibleCode)} — ${escapeHtml(g.programaNombre || '')} (${g.enrollmentCount} matrículas)</option>`
      ).join('');
      return `
        <div class="card p-3 mb-2 border-0 bg-light" style="border-radius: 8px;">
          <div class="row align-items-end g-3">
            <div class="col-md-6 col-lg-5">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select">
                <i class="bi bi-journal-bookmark me-1 text-info"></i>Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select form-select-sm">
                ${groupOptions || '<option value="">No hay grupos disponibles</option>'}
              </select>
            </div>
            <div class="col-md-6 col-lg-7 d-flex flex-wrap gap-2 align-items-center">
              <button id="doc-generate-tmpl04-btn" type="button" class="btn btn-info text-white btn-sm" ${!this.selectedGroupId ? 'disabled' : ''}>
                <i class="bi bi-file-earmark-check me-1"></i>Generar Portada
              </button>
            </div>
          </div>
          <div id="doc-group-status" class="mt-2 small text-muted" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-info"></i>Carátula oficial de carpeta pedagógica con datos confirmados de institución, programa, módulo y docente.
          </div>
        </div>`;
    }
    if (template.templateId === 'TMPL-03') {
      const groupOptions = this.groups.map(g =>
        `<option value="${escapeHtml(g.id)}" ${g.id === this.selectedGroupId ? 'selected' : ''}>${escapeHtml(g.visibleCode)} — ${escapeHtml(g.programaNombre || '')} (${g.enrollmentCount} matrículas)</option>`
      ).join('');
      return `
        <div class="card p-3 mb-2 border-0 bg-light" style="border-radius: 8px;">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>En Revisión Técnica</span>
            <small class="text-muted">Plantilla ministerial calibrada (20 en 20). Salida alternativa en formato administrativo.</small>
          </div>
          <div class="row align-items-end g-3">
            <div class="col-md-6 col-lg-5">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select">
                <i class="bi bi-card-checklist me-1 text-warning"></i>Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select form-select-sm">
                ${groupOptions || '<option value="">No hay grupos disponibles</option>'}
              </select>
            </div>
            <div class="col-md-6 col-lg-7 d-flex flex-wrap gap-2 align-items-center">
              <button id="doc-generate-tmpl03-oficial-btn" type="button" class="btn btn-primary btn-sm" ${!this.selectedGroupId ? 'disabled' : ''}>
                <i class="bi bi-file-earmark-ruled me-1"></i>Generar Registro Modular (TMPL-03 Oficial)
              </button>
              <button id="doc-generate-tmpl03-alt-btn" type="button" class="btn btn-outline-secondary btn-sm" ${!this.selectedGroupId ? 'disabled' : ''}>
                <i class="bi bi-table me-1"></i>Reporte Administrativo Alternativo
              </button>
            </div>
          </div>
          <div id="doc-group-status" class="mt-2 small text-muted" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-warning"></i>Seleccione el formato deseado para visualizarlo en el visor integrado.
          </div>
        </div>`;
    }
    if (template.templateId >= 'TMPL-05' && template.templateId <= 'TMPL-10') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 4;
      return `
        <div class="alert alert-info mb-3" id="doc-context-status">
          <div class="fw-bold"><i class="bi bi-calendar2-week me-1"></i>Registro de Asistencia — Unidad Didáctica ${udNum} (${template.templateId})</div>
          <div>Formato ministerial de 40 sesiones para el seguimiento de asistencia estudiantil. Operativo desde la vista de Asistencia.</div>
        </div>
        <a href="#/asistencia" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Asistencia (UD${udNum})</a>`;
    }
    if (template.templateId >= 'TMPL-11' && template.templateId <= 'TMPL-17') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 10;
      return `
        <div class="alert alert-info mb-3" id="doc-context-status">
          <div class="fw-bold"><i class="bi bi-card-checklist me-1"></i>Registro de Evaluación Auxiliar — Unidad Didáctica ${udNum} (${template.templateId})</div>
          <div>Evaluación por indicadores de logro y calificación vigesimal. Operativo desde la vista de Evaluación.</div>
        </div>
        <a href="#/evaluacion" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Evaluación (UD${udNum})</a>`;
    }
    if (template.templateId === 'TMPL-18') {
      return `
        <div class="alert alert-info mb-3" id="doc-context-status">
          <div class="fw-bold"><i class="bi bi-briefcase me-1"></i>Consolidado de EFSRT (TMPL-18)</div>
          <div>Experiencias Formativas en Situaciones Reales de Trabajo (40 estudiantes, 9 criterios, salvaguarda B-005 con celdas limpias).</div>
        </div>
        <a href="#/efsrt" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Consolidado EFSRT (TMPL-18)</a>`;
    }
    if (template.templateId === 'TMPL-19') {
      return `
        <div class="alert alert-info mb-3" id="doc-context-status">
          <div class="fw-bold"><i class="bi bi-file-earmark-spreadsheet me-1"></i>Acta de Evaluación Modular (TMPL-19)</div>
          <div>Plantilla canónica disponible para vista previa técnica e impresión (2 páginas físicas A3 landscape, partición 20+20 filas, cálculo de UDs aprobadas y cuadro estadístico).</div>
        </div>
        <a href="#/evaluacion" class="btn btn-primary btn-sm"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir Evaluación y Generar Acta (TMPL-19)</a>`;
    }
    if (template.templateId === 'TMPL-20') {
      return `
        <div class="alert alert-secondary mb-3" id="doc-context-status">
          <div class="fw-bold"><i class="bi bi-lock-fill me-1"></i>Certificado Modular (TMPL-20) — EMISIÓN BLOQUEADA</div>
          <div>Mapeo vectorial físico completado (55 campos). Emisión oficial bloqueada bajo salvaguardas B-002 y B-006: requiere Libro y Folio oficial.</div>
        </div>
        <button class="btn btn-secondary btn-sm" disabled aria-disabled="true"><i class="bi bi-lock-fill me-1"></i>Bloqueado por B-006 (Libro/Folio)</button>`;
    }
    if (template.templateId === 'TMPL-21') {
      return `
        <div class="alert alert-secondary mb-3" id="doc-context-status">
          <div class="fw-bold"><i class="bi bi-lock-fill me-1"></i>Título Técnico (TMPL-21) — EMISIÓN BLOQUEADA</div>
          <div>Mapeo vectorial completado. Emisión oficial bloqueada bajo salvaguarda B-006: requiere Código REGISTRA ministerial oficial.</div>
        </div>
        <button class="btn btn-secondary btn-sm" disabled aria-disabled="true"><i class="bi bi-lock-fill me-1"></i>Bloqueado por B-006 (Código REGISTRA)</button>`;
    }
    if (template.contextType === 'ENROLLMENT') {
      return `
        <label class="form-label fw-bold small" for="doc-context-search">Buscar estudiante / matrícula</label>
        <input id="doc-context-search" class="form-control form-control-sm" type="search" autocomplete="off"
          value="${escapeHtml(this.searchQuery)}" placeholder="DNI, apellidos y nombres, matrícula, programa o grupo">
        <div id="doc-search-status" class="small text-muted mt-2">Escriba un criterio para buscar matrículas.</div>
        <div id="doc-flow-state" class="small fw-bold text-primary mt-2" aria-live="polite">${escapeHtml(this._stateMessage())}</div>
        <div id="doc-search-results" class="list-group mt-2"></div>
        <div id="doc-context-summary" class="mt-3"></div>
        <div id="doc-document-status" class="mt-2" aria-live="polite"></div>
        <button id="doc-generate-btn" class="btn btn-secondary btn-sm mt-3" disabled aria-disabled="true">Generar Ficha de Matrícula</button>
        <p class="small text-muted mt-3 mb-0">Los datos académicos no confirmados permanecen vacíos.</p>`;
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
      return `<div class="text-center py-5 text-muted">
        <i class="bi bi-people fs-1 d-block mb-2 text-primary opacity-50"></i>
        <h6 class="fw-bold mb-1">Nómina de Matrícula (TMPL-01)</h6>
        <p class="small mb-0">Seleccione un grupo académico arriba y haga clic en <strong>Generar Nómina Oficial</strong> para visualizarla en este visor.</p>
      </div>`;
    }
    if (template?.templateId === 'TMPL-03') {
      return `<div class="text-center py-5 text-muted">
        <i class="bi bi-card-checklist fs-1 d-block mb-2 text-warning opacity-50"></i>
        <h6 class="fw-bold mb-1">Registro de Matrícula Modular (TMPL-03)</h6>
        <p class="small mb-0">Seleccione un grupo académico y haga clic en <strong>Generar Registro Modular (TMPL-03 Oficial)</strong> o en <strong>Reporte Administrativo Alternativo</strong>.</p>
      </div>`;
    }
    if (template?.templateId === 'TMPL-04') {
      return `<div class="text-center py-5 text-muted">
        <i class="bi bi-journal-bookmark fs-1 d-block mb-2 text-info opacity-50"></i>
        <h6 class="fw-bold mb-1">Portada de Carpeta Pedagógica (TMPL-04)</h6>
        <p class="small mb-0">Seleccione un grupo académico arriba y haga clic en <strong>Generar Portada</strong> para visualizarla en este visor.</p>
      </div>`;
    }
    if (template?.contextType === 'ENROLLMENT') {
      return `<div class="text-center py-5 text-muted">
        <i class="bi bi-person-badge fs-1 d-block mb-2 text-success opacity-50"></i>
        <h6 class="fw-bold mb-1">Ficha de Matrícula (TMPL-02)</h6>
        <p class="small mb-0">Busque un estudiante por DNI o apellidos y haga clic en <strong>Generar Ficha de Matrícula</strong> para visualizarla en este visor.</p>
      </div>`;
    }
    if (template?.templateId >= 'TMPL-05' && template?.templateId <= 'TMPL-10') return `<div class="text-center py-5 text-muted"><p>El Registro de Asistencia (${escapeHtml(template?.name)}) se genera desde la sección Registro Académico (Asistencia).</p></div>`;
    if (template?.templateId >= 'TMPL-11' && template?.templateId <= 'TMPL-17') return `<div class="text-center py-5 text-muted"><p>El Registro de Evaluación (${escapeHtml(template?.name)}) se genera desde la sección Registro Académico (Evaluación).</p></div>`;
    if (template?.templateId === 'TMPL-18') return '<div class="text-center py-5 text-muted"><p>El Consolidado de EFSRT (TMPL-18) se genera desde la sección Prácticas / EFSRT.</p></div>';
    if (template?.templateId === 'TMPL-19') return '<div class="text-center py-5 text-muted"><p>El Acta de Evaluación Modular (TMPL-19) se genera desde la sección Registro Académico (Evaluación).</p></div>';
    if (template?.templateId === 'TMPL-20') return '<div class="text-center py-5 text-muted"><p>El Certificado Modular (TMPL-20) requiere Libro, Folio y firmas oficiales registradas (Salvaguarda B-006).</p></div>';
    if (template?.templateId === 'TMPL-21') return '<div class="text-center py-5 text-muted"><p>El Título Técnico (TMPL-21) requiere Código REGISTRA ministerial oficial (Salvaguarda B-006).</p></div>';
    return `<div class="text-center py-5 text-muted"><p>${escapeHtml(template?.name || 'Esta plantilla')} — ${escapeHtml(template?.previewStatus || 'NOT_IMPLEMENTED')}.</p></div>`;
  }

  _bindEvents(container) {
    const templateSelect = container.querySelector('#doc-template-select');
    const searchInput = container.querySelector('#doc-context-search');
    const generateButton = container.querySelector('#doc-generate-btn');

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
    container.querySelectorAll('.stage-nav-pill').forEach(pill => {
      pill.onclick = async () => {
        const stageId = pill.getAttribute('data-stage-id');
        if (stageId && stageId !== this.activeStageId) {
          this.activeStageId = stageId;
          const stage = DOCUMENT_STAGES.find(s => s.id === stageId);
          if (stage && !stage.templates?.includes(this.selectedTemplateId)) {
            // Seleccionar por defecto la primera plantilla de la etapa
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
        // Permitir navegación normal si el clic fue en un enlace <a> interno
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

    const groupSelect = container.querySelector('#doc-group-select');
    if (groupSelect) {
      groupSelect.onchange = event => {
        this.selectedGroupId = event.target.value;
        const g = this.groups.find(item => item.id === this.selectedGroupId);
        if (g) this.selectedGroupCode = g.visibleCode;
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

    if (searchInput) searchInput.oninput = async event => this._searchEnrollments(container, event.target.value);
    if (generateButton) generateButton.onclick = async () => this._generateSelectedDocument(container);
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
            aria-label="Seleccionar matrícula ${escapeHtml(enrollment.id || '')}" aria-pressed="false">
            <span class="d-flex justify-content-between align-items-start gap-3">
              <span><strong>${escapeHtml(enrollment.estudianteNombreCompleto || '')}</strong>
                <span class="d-block small">Documento: ${escapeHtml(enrollment.estudianteDocumento || '')}</span>
                <span class="d-block small">Programa: ${escapeHtml(enrollment.programaNombre || '')}</span>
                <span class="d-block small">Matrícula: ${escapeHtml(enrollment.id || '')} · Grupo: ${escapeHtml(enrollment.grupoCode || '')}</span>
              </span>
              <span class="badge bg-primary">Seleccionar</span>
            </span>
          </button>`).join('');
        results.querySelectorAll('.document-context-result').forEach(button => {
          button.onclick = async () => this._selectEnrollment(container, button.getAttribute('data-context-id'));
        });
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
    container.querySelectorAll('.document-context-result').forEach(button => {
      const isSelected = button.getAttribute('data-context-id') === this.selectedEnrollmentId;
      button.classList.toggle('active', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    if (summary) summary.innerHTML = `<div class="alert alert-info small mb-0">
      <div class="fw-bold mb-2">MATRÍCULA SELECCIONADA</div>
      <div><strong>Estudiante:</strong> ${escapeHtml(selected.estudianteNombreCompleto || '')}</div>
      <div><strong>Documento:</strong> ${escapeHtml(selected.estudianteDocumento || '')}</div>
      <div><strong>Programa:</strong> ${escapeHtml(selected.programaNombre || '')}</div>
      <div><strong>Matrícula:</strong> ${escapeHtml(selected.id)}</div>
      <div><strong>Grupo:</strong> ${escapeHtml(selected.grupoCode || '')}</div>
    </div>`;
    const status = container.querySelector('#doc-document-status');
    if (status) status.innerHTML = '<div class="small text-muted">Comprobando datos del documento…</div>';
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
    return `<div class="alert alert-warning small mb-0" id="doc-preflight-summary">
      <div class="fw-bold">Estado del documento</div>
      <div>Datos disponibles: ${preflight.availableFields.length}</div>
      <div>Datos pendientes: ${pending.length}</div>
      <div>${preflight.canPreview ? 'Vista previa permitida. Emisión oficial bloqueada.' : 'Vista previa bloqueada hasta completar los datos necesarios.'}</div>
      ${pending.length ? `<details id="doc-field-details" class="mt-2"><summary>Campos pendientes</summary><ul class="mb-0 mt-1">
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
    workspace.innerHTML = '<div class="text-center py-5 text-muted">Generando documento…</div>';
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
    workspace.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
      <h6 class="text-primary mb-0">${escapeHtml(title)}</h6>
      <div class="d-flex gap-2">
        <button id="doc-print-pdf-btn" type="button" class="btn btn-sm btn-outline-dark"><i class="bi bi-printer me-1"></i>Imprimir</button>
        <a href="${this.pdfBlobUrl}" download="${escapeHtml(safeName)}" class="btn btn-sm btn-success"><i class="bi bi-download me-1"></i>Descargar PDF</a>
      </div></div>
      <iframe title="${escapeHtml(finalIframeTitle)}" src="${this.pdfBlobUrl}" width="100%" height="700px" style="border: none;"></iframe>`;
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
      if (status) status.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    if (status) status.innerHTML = '<span class="text-primary"><i class="spinner-border spinner-border-sm me-1"></i>Generando Nómina Oficial…</span>';
    if (workspace) workspace.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-2" role="status"></div><p>Generando Nómina Oficial…</p></div>';
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
      if (status) status.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Nómina generada con éxito (${rows.length} matrículas, ${pageCount} página(s)).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar TMPL-01', error);
      if (status) status.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar la nómina: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl04(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    if (status) status.innerHTML = '<span class="text-primary"><i class="spinner-border spinner-border-sm me-1"></i>Generando Portada de Carpeta…</span>';
    if (workspace) workspace.innerHTML = '<div class="text-center py-5 text-muted"><div class="spinner-border text-info mb-2" role="status"></div><p>Generando Portada de Carpeta…</p></div>';
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
      if (status) status.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Portada generada con éxito.</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar TMPL-04', error);
      if (status) status.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar la portada: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl03(container, isAlt = false) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    const label = isAlt ? 'Reporte Administrativo' : 'Registro Modular Oficial (TMPL-03)';
    if (status) status.innerHTML = `<span class="text-primary"><i class="spinner-border spinner-border-sm me-1"></i>Generando ${label}…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-warning mb-2" role="status"></div><p>Generando ${label}…</p></div>`;
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
      if (status) status.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>${label} generado con éxito (${rows.length} matrículas).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar TMPL-03', error);
      if (status) status.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el documento: ${escapeHtml(error.message)}</div>`;
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
