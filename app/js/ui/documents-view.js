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
import { Etapa2DataService } from '../services/etapa2-data-service.js';
import { Etapa4DataService } from '../services/etapa4-data-service.js';
import { Notifications } from './notifications.js';
import { AuthService } from '../services/auth-service.js';
import { TeacherContextService } from '../services/teacher-context-service.js';
import { SyncPackageService } from '../services/sync-package-service.js';

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
    this.etapa2DataService = new Etapa2DataService();
    this.etapa4DataService = new Etapa4DataService();
    this._allGroups = [];
    this.groups = [];
    this.selectedGroupId = null;
    this.selectedTemplateId = 'TMPL-01';
    this.activeStageId = 'ETAPA_1';
    this.selectedAsistenciaUD = 1; // 1 a 6
    this.selectedEvaluacionUD = 1; // 1 a 7
    this.selectedEtapa4StudentId = null;
    this.etapa4Students = [];
    this._etapa4LoadedGroupId = null;
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
    // Saneamiento de etapa y plantilla inicial por Rol (RBAC)
    const activeRole = AuthService.getCurrentRole();
    if (activeRole.id === 'DOCENTE') {
      if (this.activeStageId !== 'ETAPA_2' && this.activeStageId !== 'ETAPA_1') {
        this.activeStageId = 'ETAPA_2';
        this.selectedTemplateId = 'TMPL-05';
      } else if (this.activeStageId === 'ETAPA_1' && this.selectedTemplateId !== 'TMPL-04') {
        this.selectedTemplateId = 'TMPL-04';
      }
    } else if (activeRole.id === 'SECRETARIA') {
      if (this.selectedTemplateId === 'TMPL-21') {
        this.selectedTemplateId = 'TMPL-20';
      }
    }
    this.activeStageId = getStageIdForTemplate(this.selectedTemplateId);

    // Cargar grupos académicos para selectores
    if (!this._allGroups || this._allGroups.length === 0) {
      try {
        this._allGroups = await this.adminService.listGroupSummaries();
      } catch (err) {
        console.warn('[DocumentsView] Error cargando grupos:', err);
        this._allGroups = [];
      }
    }

    if (activeRole.id === 'DOCENTE') {
      const activeProg = TeacherContextService.getActiveProgram();
      this.groups = TeacherContextService.filterGroups(this._allGroups, activeProg.id);
      const activeGroupCode = TeacherContextService.getActiveGroupCode();
      const matched = this.groups.find(g => (g.visibleCode === activeGroupCode || (g.id && g.id.includes(activeGroupCode))));
      if (matched) {
        this.selectedGroupId = matched.id;
        this.selectedGroupCode = matched.visibleCode;
      }
    } else {
      this.groups = this._allGroups;
    }

    if (this.groups.length > 0) {
      if (!this.selectedGroupId || !this.groups.some(item => item.id === this.selectedGroupId)) {
        this.selectedGroupId = this.groups[0].id;
        this.selectedGroupCode = this.groups[0].visibleCode;
      } else {
        const g = this.groups.find(item => item.id === this.selectedGroupId);
        if (g) this.selectedGroupCode = g.visibleCode;
      }
    } else {
      this.selectedGroupId = null;
      this.selectedGroupCode = null;
    }

    // Sincronizar UDs activas si el templateId seleccionado es de Etapa 2
    if (this.selectedTemplateId >= 'TMPL-05' && this.selectedTemplateId <= 'TMPL-10') {
      this.selectedAsistenciaUD = (parseInt(this.selectedTemplateId.replace('TMPL-', ''), 10) - 4);
    } else if (this.selectedTemplateId >= 'TMPL-11' && this.selectedTemplateId <= 'TMPL-17') {
      this.selectedEvaluacionUD = (parseInt(this.selectedTemplateId.replace('TMPL-', ''), 10) - 10);
    }

    // Sincronizar estudiantes de Etapa 4 si el template es TMPL-20 o TMPL-21
    if (['TMPL-20', 'TMPL-21'].includes(this.selectedTemplateId) && this.selectedGroupId) {
      if (!this.etapa4Students || this.etapa4Students.length === 0 || this._etapa4LoadedGroupId !== this.selectedGroupId) {
        try {
          const rosterContext = await this.adminService.buildGroupRoster(this.selectedGroupId);
          this.etapa4Students = rosterContext.rows || [];
          this._etapa4LoadedGroupId = this.selectedGroupId;
          if ((!this.selectedEtapa4StudentId || !this.etapa4Students.some(s => String(s.studentId || s.id) === String(this.selectedEtapa4StudentId))) && this.etapa4Students.length > 0) {
            this.selectedEtapa4StudentId = this.etapa4Students[0].studentId || this.etapa4Students[0].id;
          }
        } catch (e) {
          console.warn('[DocumentsView] Error precargando estudiantes para Etapa 4:', e);
          this.etapa4Students = [];
        }
      }
    }

    const currentTemplate = this.registry.getById(this.selectedTemplateId);

    container.innerHTML = `
      <style>
        .documents-module-container {
          max-width: 1360px;
          margin: 0 auto;
        }
        .hero-banner {
          background: linear-gradient(135deg, #090d16 0%, #1e293b 55%, #1e3a8a 100%);
          border-radius: 18px;
          color: #ffffff;
          padding: 1.75rem 2rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.25);
          position: relative;
          overflow: hidden;
        }
        .hero-banner::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .flow-stepper {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 768px) {
          .flow-stepper {
            grid-template-columns: 1fr;
          }
        }
        .stepper-item {
          padding: 1.05rem 1.3rem;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.95rem;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stepper-item:hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .stepper-item.active {
          border-color: #3b82f6;
          background: #f8faff;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.12);
        }
        .stepper-item.completed {
          border-color: #10b981;
          background: #f0fdf4;
        }
        .stepper-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          background: #f1f5f9;
          color: #64748b;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .stepper-item.active .stepper-badge {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.32);
        }
        .stepper-item.completed .stepper-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .stage-nav-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
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
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.25rem 1.35rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #ffffff;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          user-select: none;
          position: relative;
        }
        .stage-nav-pill:hover {
          border-color: #93c5fd;
          background: #f8faff;
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .stage-nav-pill.active {
          background: linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%);
          border: 1.5px solid #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16), var(--shadow-md);
          transform: translateY(-2px);
        }
        .stage-pill-title {
          font-size: 1.08rem;
          font-weight: 700;
          color: var(--neutral-heading);
          margin-bottom: 0.35rem;
          line-height: 1.3;
          letter-spacing: -0.015em;
        }
        .stage-pill-subtitle {
          font-size: 0.85rem;
          color: var(--neutral-muted);
          line-height: 1.45;
          font-weight: 400;
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
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.4rem 1.5rem;
          background: #ffffff;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
          box-sizing: border-box;
          user-select: none;
          position: relative;
          min-height: 220px;
          overflow: hidden;
        }
        .doc-item-card.card-accent-ugel { border-top: 4px solid #2563eb; }
        .doc-item-card.card-accent-student { border-top: 4px solid #10b981; }
        .doc-item-card.card-accent-teacher { border-top: 4px solid #7c3aed; }
        .doc-item-card.card-accent-review { border-top: 4px solid #f59e0b; }
        .doc-item-card.card-accent-eval { border-top: 4px solid #6366f1; }
        .doc-item-card.card-accent-lock { border-top: 4px solid #64748b; }

        .doc-item-card:hover {
          border-color: #93c5fd;
          background: #fcfdff;
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
        }
        .doc-item-card.active-template {
          border: 2px solid #3b82f6;
          background: #f8faff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16), var(--shadow-md);
        }
        .doc-item-card.filtered-out {
          opacity: 0.35;
          filter: grayscale(80%);
        }
        .card-doc-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--neutral-heading);
          margin: 0.5rem 0 0.4rem 0;
          line-height: 1.3;
          letter-spacing: -0.015em;
        }
        .card-doc-desc {
          font-size: 0.88rem;
          color: var(--neutral-muted);
          line-height: 1.5;
          font-weight: 400;
          margin-bottom: 1.15rem;
        }
        .card-footer-action {
          border-top: 1px solid #f1f5f9;
          padding-top: 0.95rem;
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ud-pills-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          margin-top: 0.5rem;
          margin-bottom: 0.85rem;
        }
        .ud-selector-pill {
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ud-selector-pill:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
          transform: translateY(-1px);
        }
        .ud-selector-pill.active-ud {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }
        .ud-selector-pill.active-ud-blue {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }
        .ud-selector-pill.active-ud-green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border-color: #059669;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        }
        .doc-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.7rem;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .doc-badge-primary { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .doc-badge-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .doc-badge-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .doc-badge-info { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .doc-badge-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .doc-selector-toolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.35rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-xs);
        }
        .doc-selector-select {
          flex: 1;
          min-width: 280px;
          max-width: 520px;
          padding: 0.6rem 0.95rem;
          font-size: 0.88rem;
          font-weight: 500;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #1e293b;
          transition: all 0.15s ease;
        }
        .doc-selector-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .context-step-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        /* Modal Interactivo Sábana Etapa 2 (Asistencia y Evaluación) */
        .etapa2-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(5px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .etapa2-modal-dialog {
          width: 98vw;
          max-width: 1450px;
          height: 92vh;
          background: #ffffff;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          border: 1px solid #cbd5e1;
        }
        .etapa2-modal-header {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .etapa2-modal-body {
          padding: 1rem 1.25rem;
          overflow: auto;
          flex: 1;
          background: #ffffff;
        }
        .etapa2-modal-footer {
          padding: 0.85rem 1.5rem;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .etapa2-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.86rem;
        }
        .etapa2-table th, .etapa2-table td {
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.35rem 0.5rem;
          vertical-align: middle;
          white-space: nowrap;
        }
        .etapa2-table thead th {
          position: sticky;
          top: 0;
          background: #f1f5f9;
          z-index: 10;
          font-weight: 700;
          color: #1e293b;
        }
        .etapa2-table .col-sticky-student {
          position: sticky;
          left: 0;
          background: #ffffff;
          z-index: 5;
          min-width: 220px;
          max-width: 280px;
          border-right: 2px solid #cbd5e1 !important;
          box-shadow: 2px 0 4px rgba(0,0,0,0.03);
        }
        .etapa2-table thead .col-sticky-student {
          z-index: 15;
          background: #f1f5f9;
        }
        .att-cell-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          font-weight: 800;
          font-size: 0.82rem;
          border-radius: 4px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s ease;
          user-select: none;
        }
        .att-P { background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; }
        .att-F { background: #fee2e2; color: #b91c1c; border: 1.5px solid #fca5a5; }
        .att-J { background: #fef3c7; color: #b45309; border: 1.5px solid #fcd34d; }
        .att-dash { background: #f1f5f9; color: #94a3b8; border: 1px solid #cbd5e1; }
        .eval-grade-input {
          width: 48px;
          text-align: center;
          font-weight: 800;
          font-size: 0.92rem;
          border-radius: 6px;
          padding: 0.25rem 0.1rem;
          transition: border-color 0.15s, background-color 0.15s;
        }
        .eval-pass { background: #dcfce7 !important; color: #166534 !important; border: 2px solid #86efac !important; }
        .eval-fail { background: #fee2e2 !important; color: #991b1b !important; border: 2px solid #fca5a5 !important; }
        .eval-empty { background: #ffffff; color: #334155; border: 1.5px solid #cbd5e1; }
      </style>

      <div class="documents-module-container p-3 p-md-4">
        <!-- Hero Header Secretaría -->
        ${(() => {
          const currentRole = AuthService.getCurrentRole();
          return `
        <div class="hero-banner">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span class="badge" style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); color: #ffffff; font-weight: 700; font-size: 0.74rem; border: 1px solid rgba(255, 255, 255, 0.25);">
                  ${escapeHtml(currentRole.title.toUpperCase())}
                </span>
                <span class="badge role-badge-${currentRole.id}" style="font-size: 0.74rem; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                  ${currentRole.avatar} ${escapeHtml(currentRole.userName)}
                </span>
                <span class="badge" style="background: rgba(255, 255, 255, 0.14); backdrop-filter: blur(8px); color: #e2e8f0; font-size: 0.74rem; border: 1px solid rgba(255, 255, 255, 0.2);">
                  <i class="bi bi-${isDemoRuntime() ? 'flask' : 'shield-check'} me-1"></i>
                  ${isDemoRuntime() ? 'DEMOSTRACIÓN — NO OFICIAL' : 'OPERACIÓN LOCAL V2 (8081)'}
                </span>
              </div>
              <div class="d-flex align-items-center gap-3">
                <img src="/app/img/logo-cetpro.jpg" alt="Logo CETPRO Micaela Bastidas" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2.5px solid rgba(255, 255, 255, 0.85); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); background: #ffffff;">
                <div>
                  <h3 class="fw-bold mb-0 d-flex align-items-center gap-2" style="font-size: 1.7rem; letter-spacing: -0.025em;">
                    <span>Centro de Emisión Documental</span>
                  </h3>
                  <p class="mb-0" style="color: #cbd5e1; font-size: 0.88rem; font-weight: 500;">
                    CETPRO San Miguel · Micaela Bastidas Puyucawa — Emisión Ministerial
                  </p>
                </div>
              </div>
            </div>
            <!-- Buscador Rápido de Documentos con Estilo Píldora -->
            <div style="min-width: 300px; max-width: 440px; flex: 1;">
              <div style="display: flex; align-items: center; background: rgba(255, 255, 255, 0.95); border-radius: 9999px; padding: 0.4rem 0.95rem; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18); border: 1px solid rgba(255, 255, 255, 0.4);">
                <span style="color: #3b82f6; font-size: 0.95rem; margin-right: 0.5rem; display: flex; align-items: center;"><i class="bi bi-search"></i>🔍</span>
                <input type="search" id="doc-quick-search" placeholder="Buscar documento (ej. nómina, asistencia, UD)..." value="${escapeHtml(this.docFilterQuery || '')}" autocomplete="off" style="border: none; outline: none; background: transparent; font-size: 0.88rem; font-family: inherit; width: 100%; color: #0f172a;">
                ${this.docFilterQuery ? '<button class="btn btn-sm btn-light border-0 py-0 px-1" id="doc-quick-search-clear" type="button" title="Limpiar filtro" style="background:none; color:#64748b; font-size:0.9rem;">✕</button>' : ''}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #94a3b8; margin-top: 0.45rem; padding: 0 0.5rem;">
                <span>Filtrado instantáneo</span>
                <span>Plantilla activa: <strong style="color: #ffffff;">${this.selectedTemplateId}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tarjeta Contextual de Atribuciones del Rol (RBAC) -->
        <div class="card p-3 mb-3 d-flex flex-row align-items-center justify-content-between flex-wrap gap-2" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: var(--shadow-xs);">
          <div class="d-flex align-items-center gap-3">
            <span style="font-size: 1.6rem; line-height: 1; padding: 0.5rem; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">${currentRole.avatar}</span>
            <div>
              <div style="font-weight: 700; color: #0f172a; font-size: 0.92rem; margin-bottom: 0.15rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span>Perfil Activo: ${escapeHtml(currentRole.userName)}</span>
                <span class="user-role-badge role-badge-${currentRole.id}">${escapeHtml(currentRole.title)}</span>
                ${currentRole.id === 'DOCENTE' ? `
                  <span class="badge" style="background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-size: 0.78rem;">
                    👨‍🏫 ESPECIALIDAD: ${escapeHtml(TeacherContextService.getActiveProgram().nombre)}
                  </span>
                ` : ''}
              </div>
              <div style="color: #64748b; font-size: 0.84rem;">
                ${
                  currentRole.id === 'DIRECTOR'
                    ? 'Facultades Plenas: Refrendo de Título Técnico Oficial (TMPL-21), Actas Modulares (TMPL-19) y Certificados (TMPL-20).'
                    : currentRole.id === 'SECRETARIA'
                      ? 'Atribuciones Oficiales: Nóminas (TMPL-01..03), Actas Modulares (TMPL-19) y Certificados Modulares (TMPL-20).'
                      : 'Atribuciones Pedagógicas: Control de Asistencia Modular (TMPL-05..10), Calificaciones auxiliares (TMPL-11..17) y Portada Docente (TMPL-04).'
                }
              </div>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            ${currentRole.id === 'DOCENTE' ? `
              <select id="doc-teacher-classroom-select" class="form-select form-select-sm" style="font-size: 0.82rem; padding: 0.35rem 0.65rem; border-radius: 8px; border: 1.5px solid #3b82f6; font-weight: 700; color: #1e293b;" title="Cambiar Aula / Grupo">
                ${TeacherContextService.getGroupsForProgram().map(g => `
                  <option value="${g.grupoCode}" ${g.grupoCode === TeacherContextService.getActiveGroupCode() ? 'selected' : ''}>👥 ${escapeHtml(g.grupoCode)} · ${escapeHtml(g.turno || g.modalidad || '')} (${g.count} est.)</option>
                `).join('')}
              </select>
              <select id="doc-teacher-program-select" class="form-select form-select-sm" style="font-size: 0.82rem; padding: 0.35rem 0.65rem; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #334155;" title="Cambiar Especialidad Asignada">
                ${TeacherContextService.getPrograms().map(p => `
                  <option value="${p.id}" ${p.id === TeacherContextService.getActiveProgramId() ? 'selected' : ''}>📚 ${escapeHtml(p.nombre)}</option>
                `).join('')}
              </select>
              <button type="button" id="doc-export-notas-sync-btn" class="btn btn-outline-primary btn-sm fw-bold px-2.5 py-1" style="font-size: 0.8rem; border-radius: 8px;" title="Exportar mis notas y asistencias a memoria USB para entregar a Secretaría">
                📦 Exportar Notas (USB)
              </button>
            ` : `
              <button type="button" id="doc-import-notas-sync-btn" class="btn btn-outline-success btn-sm fw-bold px-2.5 py-1" style="font-size: 0.8rem; border-radius: 8px;" title="Consolidar notas y asistencias entregadas en USB por los docentes">
                📥 Consolidar Notas (USB)
              </button>
              <input type="file" id="doc-input-sync-notas" accept=".cetpro,.json" style="display:none;">
            `}
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold px-3 py-1" id="doc-header-switch-role-btn" style="white-space: nowrap; border-radius: 8px;">
              <i class="bi bi-person-badge me-1"></i>Cambiar Perfil
            </button>
          </div>
        </div>`;
        })()}

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
        ${(() => {
          const currentStage = DOCUMENT_STAGES.find(s => s.id === this.activeStageId);
          const currentRole = AuthService.getCurrentRole();
          const stageTitle = (currentRole.id === 'DOCENTE' && this.activeStageId === 'ETAPA_1')
            ? 'Carpeta Pedagógica Docente'
            : (currentStage?.title || '');
          const stageSubtitle = (currentRole.id === 'DOCENTE' && this.activeStageId === 'ETAPA_1')
            ? 'Portada oficial y documentación inicial de aula a cargo del docente'
            : (currentStage?.subtitle || '');
          return `
        <div class="card mb-4" style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="border-bottom: 1px solid #e2e8f0 !important; background: #fafbfc !important;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary px-3 py-1 fw-bold" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; border-radius: 8px; font-size: 0.8rem;">ETAPA ${currentStage?.number || '1'}</span>
              <h5 class="m-0 fw-bold" style="font-size: 1.2rem; color: #0f172a; letter-spacing: -0.015em;">${escapeHtml(stageTitle)}</h5>
            </div>
            <div class="text-secondary" style="font-size: 0.88rem; color: #64748b;">${escapeHtml(stageSubtitle)}</div>
          </div>`;
        })()}
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
            <div id="doc-context-controls" class="mt-4 pt-4 border-top" style="border-top: 1px solid #f1f5f9 !important;">
              ${this._renderContextControls(currentTemplate)}
            </div>
          </div>
        </div>

        <!-- Paso 3: Espacio de Vista Previa y Descarga -->
        <div class="card" style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm);">
          <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="border-bottom: 1px solid #e2e8f0 !important; background: #fafbfc !important;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success rounded-circle p-1" style="width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">3</span>
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
    const role = AuthService.getCurrentRole();
    return DOCUMENT_STAGES
      .filter(stage => AuthService.canAccessStage(stage.id))
      .map(stage => {
        const isActive = stage.id === this.activeStageId;
        const stageBadge = (role.id === 'DOCENTE' && stage.id === 'ETAPA_1')
          ? '1 DOC. PEDAGÓGICO'
          : (role.id === 'DOCENTE' && stage.id === 'ETAPA_2')
            ? '13 FORMATOS AUXILIARES'
            : stage.badge;
        const stageTitle = (role.id === 'DOCENTE' && stage.id === 'ETAPA_1')
          ? 'Carpeta Pedagógica'
          : stage.title;
        const stageSubtitle = (role.id === 'DOCENTE' && stage.id === 'ETAPA_1')
          ? 'Portada y documentación de aula del docente'
          : stage.subtitle;

        return `
        <div class="stage-nav-pill ${isActive ? 'active' : ''}" data-stage-id="${stage.id}" role="tab" aria-selected="${isActive}">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge ${isActive ? 'badge-primary' : 'badge-secondary'} px-2 py-1 fw-bold" style="font-size: 0.74rem;">ETAPA ${stage.number}</span>
            <span class="badge bg-light text-secondary border fw-semibold" style="font-size: 0.72rem;">${stageBadge}</span>
          </div>
          <div class="stage-pill-title"><i class="bi ${stage.icon} me-1 text-primary"></i>${escapeHtml(stageTitle)}</div>
          <div class="stage-pill-subtitle">${escapeHtml(stageSubtitle)}</div>
        </div>`;
    }).join('');
  }

    _renderOptGroups() {
    const role = AuthService.getCurrentRole();

    let etapa1Opts = '';
    if (role.id === 'DOCENTE') {
      etapa1Opts = `<option value="TMPL-04" ${this.selectedTemplateId === 'TMPL-04' ? 'selected' : ''}>TMPL-04 - Portada de Carpeta Pedagógica</option>`;
    } else {
      etapa1Opts = `
        <option value="TMPL-01" ${this.selectedTemplateId === 'TMPL-01' ? 'selected' : ''}>TMPL-01 - Nómina de Matrícula (Oficial UGEL)</option>
        <option value="TMPL-02" ${this.selectedTemplateId === 'TMPL-02' ? 'selected' : ''}>TMPL-02 - Ficha de Matrícula (Expediente del Alumno)</option>
        <option value="TMPL-04" ${this.selectedTemplateId === 'TMPL-04' ? 'selected' : ''}>TMPL-04 - Portada de Carpeta Pedagógica</option>
        <option value="TMPL-03" ${this.selectedTemplateId === 'TMPL-03' ? 'selected' : ''}>TMPL-03 - Registro de Matrícula Modular [En Revisión]</option>
      `;
    }

    const etapa2Opts = `
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
    `;

    const etapa3Opts = `
      <option value="TMPL-18" ${this.selectedTemplateId === 'TMPL-18' ? 'selected' : ''}>TMPL-18 - Consolidado de EFSRT</option>
      <option value="TMPL-19" ${this.selectedTemplateId === 'TMPL-19' ? 'selected' : ''}>TMPL-19 - Acta de Evaluación Modular</option>
    `;

    let etapa4Opts = '';
    if (role.id === 'DIRECTOR') {
      etapa4Opts = `
        <option value="TMPL-20" ${this.selectedTemplateId === 'TMPL-20' ? 'selected' : ''}>TMPL-20 - Certificado Modular [Requiere Libro/Folio]</option>
        <option value="TMPL-21" ${this.selectedTemplateId === 'TMPL-21' ? 'selected' : ''}>TMPL-21 - Título Técnico [Requiere Código REGISTRA]</option>
      `;
    } else if (role.id === 'SECRETARIA') {
      etapa4Opts = `
        <option value="TMPL-20" ${this.selectedTemplateId === 'TMPL-20' ? 'selected' : ''}>TMPL-20 - Certificado Modular [Requiere Libro/Folio]</option>
      `;
    }

    if (role.id === 'DOCENTE') {
      return `
        <optgroup label="REGISTRO AUXILIAR DOCENTE (ASISTENCIA Y EVALUACIÓN)">
          ${etapa2Opts}
        </optgroup>
        <optgroup label="CARPETA PEDAGÓGICA DOCENTE">
          ${etapa1Opts}
        </optgroup>
      `;
    }

    return `
      <optgroup label="ETAPA 1: MATRÍCULA E INICIO DE GRUPO">
        ${etapa1Opts}
      </optgroup>
      <optgroup label="ETAPA 2: REGISTRO AUXILIAR DOCENTE (SEGUIMIENTO)">
        ${etapa2Opts}
      </optgroup>
      <optgroup label="ETAPA 3: CIERRE MODULAR Y PRÁCTICAS">
        ${etapa3Opts}
      </optgroup>
      <optgroup label="ETAPA 4: CERTIFICACIÓN Y EGRESO">
        ${etapa4Opts}
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
    const role = AuthService.getCurrentRole();
    const isTmpl01 = this.selectedTemplateId === 'TMPL-01';
    const isTmpl02 = this.selectedTemplateId === 'TMPL-02';
    const isTmpl04 = this.selectedTemplateId === 'TMPL-04';
    const isTmpl03 = this.selectedTemplateId === 'TMPL-03';

    if (role.id === 'DOCENTE') {
      return `
        <div class="doc-cards-grid" style="grid-template-columns: 1fr; max-width: 580px;">
          <!-- Portada de Carpeta Pedagógica (TMPL-04) -->
          <div class="doc-item-card card-accent-teacher active-template" data-select-tmpl="TMPL-04" role="button" tabindex="0" title="Portada de Carpeta Pedagógica (TMPL-04)">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="doc-badge-pill doc-badge-info">
                  <i class="bi bi-journal-text me-1"></i>📂 Carpeta Pedagógica Docente
                </span>
                <span class="badge bg-info text-dark fs-6 px-2 py-1">TMPL-04</span>
              </div>
              <h5 class="card-doc-title">
                <i class="bi bi-journal-bookmark-fill me-1 text-info"></i>Portada Oficial de Carpeta Pedagógica
              </h5>
              <p class="card-doc-desc">
                Carátula formal de carpeta docente con membrete institucional, programa de estudios, módulo formativo y firma del docente responsable.
              </p>
            </div>
            <div class="card-footer-action">
              <span class="badge bg-info px-3 py-2 text-dark fw-bold" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill me-1"></i>✓ SELECCIONADO PARA EMITIR</span>
              <span class="fw-bold text-secondary small">Por grupo pedagógico</span>
            </div>
          </div>
        </div>
      `;
    }

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

    // Verificar si existen datos guardados en la UD activa
    const attData = this.selectedGroupId ? this.etapa2DataService?.getAttendance(this.selectedGroupId, this.selectedAsistenciaUD) : null;
    const hasAtt = attData && Array.isArray(attData.sessions) && attData.sessions.length > 0;
    const evalData = this.selectedGroupId ? this.etapa2DataService?.getEvaluation(this.selectedGroupId, this.selectedEvaluacionUD) : null;
    const hasEval = evalData && evalData.evaluationsByEnrollment && Object.keys(evalData.evaluationsByEnrollment).length > 0;

    // Pills de Asistencia UD1..UD6 con estilo activo azul
    const asistenciaPills = [1, 2, 3, 4, 5, 6].map(n => {
      const tmplId = `TMPL-${String(n + 4).padStart(2, '0')}`;
      const isSelected = isAsistencia && this.selectedTemplateId === tmplId;
      const uData = this.selectedGroupId ? this.etapa2DataService?.getAttendance(this.selectedGroupId, n) : null;
      const hasUData = uData && Array.isArray(uData.sessions) && uData.sessions.length > 0;
      return `<button type="button" class="ud-selector-pill ${isSelected ? 'active-ud active-ud-blue' : ''}" data-select-tmpl="${tmplId}" title="Asistencia Unidad Didáctica ${n} (${tmplId})">${isSelected ? '<i class="bi bi-check2"></i> ' : ''}UD ${n}${hasUData ? ' •' : ''}</button>`;
    }).join(' ');

    // Pills de Evaluación UD1..UD7 con estilo activo verde esmeralda
    const evaluacionPills = [1, 2, 3, 4, 5, 6, 7].map(n => {
      const tmplId = `TMPL-${String(n + 10).padStart(2, '0')}`;
      const isSelected = isEvaluacion && this.selectedTemplateId === tmplId;
      const uEval = this.selectedGroupId ? this.etapa2DataService?.getEvaluation(this.selectedGroupId, n) : null;
      const hasUEval = uEval && uEval.evaluationsByEnrollment && Object.keys(uEval.evaluationsByEnrollment).length > 0;
      return `<button type="button" class="ud-selector-pill ${isSelected ? 'active-ud active-ud-green' : ''}" data-select-tmpl="${tmplId}" title="Evaluación Unidad Didáctica ${n} (${tmplId})">${isSelected ? '<i class="bi bi-check2"></i> ' : ''}UD ${n}${hasUEval ? ' •' : ''}</button>`;
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
            <div class="d-flex align-items-center gap-1.5">
              ${hasAtt ? '<span class="badge bg-success text-white fw-bold" style="font-size: 0.74rem;"><i class="bi bi-check2-circle me-1"></i>Con marcas</span>' : ''}
              <span class="fw-bold text-secondary small">40 sesiones · A3</span>
            </div>
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
            <div class="d-flex align-items-center gap-1.5">
              ${hasEval ? '<span class="badge bg-success text-white fw-bold" style="font-size: 0.74rem;"><i class="bi bi-check2-circle me-1"></i>Con notas</span>' : ''}
              <span class="fw-bold text-secondary small">Escala vigesimal · A3</span>
            </div>
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
        <div class="doc-item-card card-accent-student ${isTmpl20 ? 'active-template' : ''}" data-select-tmpl="TMPL-20" role="button" tabindex="0" title="Seleccionar Certificado Modular (TMPL-20)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-primary">
                <i class="bi bi-mortarboard-fill me-1"></i>📜 Acreditación Modular Oficial
              </span>
              <span class="badge bg-primary fs-6 px-2 py-1">TMPL-20</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-mortarboard-fill me-1 text-primary"></i>Certificado Modular Oficial
            </h5>
            <p class="card-doc-desc">
              Acreditación oficial por módulo formativo ministerial (2 páginas A4 landscape). Anverso con datos de carrera y foliación; reverso con hasta 8 UDs, competencias y Libro/Folio.
            </p>
          </div>
          <div class="card-footer-action">
            <button type="button" class="btn btn-sm ${isTmpl20 ? 'btn-primary text-white' : 'btn-outline-primary'} fw-bold px-3 py-2" data-select-tmpl="TMPL-20">
              ${isTmpl20 ? '<i class="bi bi-check-circle-fill me-1"></i>✓ Seleccionado' : '<i class="bi bi-hand-index-thumb me-1"></i>👉 Seleccionar'}
            </button>
            <span class="fw-bold text-secondary small">2 Páginas · Individual</span>
          </div>
        </div>

                ${AuthService.getCurrentRole().id === 'DIRECTOR' ? `
        <!-- Título Técnico (TMPL-21) - Exclusivo de Dirección General -->
        <div class="doc-item-card card-accent-ugel ${isTmpl21 ? 'active-template' : ''}" data-select-tmpl="TMPL-21" role="button" tabindex="0" title="Seleccionar Título Técnico (TMPL-21)">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="doc-badge-pill doc-badge-success">
                <i class="bi bi-award-fill me-1"></i>🎓 Egreso y Titulación Oficial
              </span>
              <span class="badge bg-success fs-6 px-2 py-1">TMPL-21</span>
            </div>
            <h5 class="card-doc-title">
              <i class="bi bi-award-fill me-1 text-success"></i>Título Técnico / Auxiliar Técnico
            </h5>
            <p class="card-doc-desc">
              Acreditación de graduación y titulación técnica ministerial del MINEDU (2 páginas A4 landscape). Anverso con nombre y denominación oficial; reverso con Código REGISTRA y Asiento.
            </p>
          </div>
          <div class="card-footer-action">
            <button type="button" class="btn btn-sm ${isTmpl21 ? 'btn-success text-white' : 'btn-outline-success'} fw-bold px-3 py-2" data-select-tmpl="TMPL-21">
              ${isTmpl21 ? '<i class="bi bi-check-circle-fill me-1"></i>✓ Seleccionado' : '<i class="bi bi-hand-index-thumb me-1"></i>👉 Seleccionar'}
            </button>
            <span class="fw-bold text-secondary small">MINEDU · Titulación</span>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  _renderEtapa4StudentOptions() {
    if (!this.etapa4Students || this.etapa4Students.length === 0) {
      return '<option value="">(No hay estudiantes matriculados en este grupo)</option>';
    }
    return this.etapa4Students.map((s, idx) => {
      const sId = s.studentId || s.id;
      const isSelected = String(sId) === String(this.selectedEtapa4StudentId);
      const doc = s.numeroDocumento || s.document || '';
      return `<option value="${escapeHtml(sId)}" ${isSelected ? 'selected' : ''}>${idx + 1}. ${escapeHtml(s.studentName || s.fullName || s.apellidosNombres || 'Estudiante')} ${doc ? `(DNI: ${doc})` : ''}</option>`;
    }).join('');
  }

  _renderEtapa4StudentSummary(selectedGroup) {
    if (!this.selectedEtapa4StudentId || !this.etapa4Students || this.etapa4Students.length === 0) return '';
    const student = this.etapa4Students.find(s => String(s.studentId || s.id) === String(this.selectedEtapa4StudentId));
    if (!student) return '';

    const isTmpl20 = this.selectedTemplateId === 'TMPL-20';
    const regData = isTmpl20
      ? this.etapa4DataService.getCertificado(this.selectedGroupId, this.selectedEtapa4StudentId)
      : this.etapa4DataService.getTitulo(this.selectedGroupId, this.selectedEtapa4StudentId);

    const hasData = Boolean(regData);

    return `
      <div class="card border-0 shadow-sm p-3 mb-3" style="background: #f8fafc; border-left: 4px solid ${isTmpl20 ? '#2563eb' : '#059669'} !important; border-radius: 8px;">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="fw-bold text-dark" style="font-size: 0.95rem;">
            <i class="bi bi-person-badge-fill me-1 text-${isTmpl20 ? 'primary' : 'success'}"></i>${escapeHtml(student.studentName || student.fullName || 'Estudiante')}
          </div>
          <span class="badge ${hasData ? (isTmpl20 ? 'bg-primary' : 'bg-success') : 'bg-secondary'} px-2.5 py-1.5 fw-bold" style="font-size: 0.82rem;">
            ${hasData ? '<i class="bi bi-check2-circle me-1"></i>Datos Registrales Configurados' : '<i class="bi bi-clock me-1"></i>Valores Sugeridos / Pendiente Edición'}
          </span>
        </div>
        <div class="row g-2 text-secondary small" style="font-size: 0.85rem;">
          <div class="col-sm-4">
            <span class="text-muted">Documento:</span> <strong class="text-dark">${escapeHtml(student.numeroDocumento || student.document || '---')}</strong>
          </div>
          ${isTmpl20 ? `
            <div class="col-sm-4">
              <span class="text-muted">Código Certificado:</span> <strong class="text-dark">${escapeHtml(regData?.registerCode || 'CM-2026-0042')}</strong>
            </div>
            <div class="col-sm-4">
              <span class="text-muted">Libro / Folio:</span> <strong class="text-dark">Libro ${escapeHtml(regData?.registryBook || '01')} · Folio ${escapeHtml(regData?.registryFolio || '15')}</strong>
            </div>
          ` : `
            <div class="col-sm-4">
              <span class="text-muted">Código REGISTRA:</span> <strong class="text-dark">${escapeHtml(regData?.registerCode || 'MINEDU-REG-2026-84920')}</strong>
            </div>
            <div class="col-sm-4">
              <span class="text-muted">Asiento:</span> <strong class="text-dark">${escapeHtml(regData?.registryAsiento ? 'Registrado' : 'Sugerido')}</strong>
            </div>
          `}
        </div>
      </div>
    `;
  }

  _renderGroupOptions() {
    if (!this.groups || this.groups.length === 0) {
      return '<option value="">⚠️ No hay grupos disponibles en este entorno (Abra Puerto 8081)</option>';
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

  _getTemplateRowCapacity(templateId) {
    if (templateId === 'TMPL-01') return 30;
    if (templateId === 'TMPL-03') return 20;
    if (templateId === 'TMPL-11') return 47;
    if (templateId >= 'TMPL-05' && templateId <= 'TMPL-17') return 40;
    if (templateId === 'TMPL-18' || templateId === 'TMPL-19') return 40;
    return 30;
  }

  _renderGroupSummaryCard(selectedGroup) {
    if (!selectedGroup) {
      if (!this.groups || this.groups.length === 0) {
        return `
          <div class="alert alert-warning border border-warning shadow-sm mb-3 p-3 rounded-3" style="background-color: #fffbeb; border-color: #fde68a !important;">
            <div class="d-flex align-items-start gap-3">
              <div class="fs-3 text-warning"><i class="bi bi-exclamation-triangle-fill"></i></div>
              <div>
                <h6 class="fw-bold text-dark mb-1">No se detectaron grupos académicos en esta sesión</h6>
                <p class="mb-2 text-secondary small">
                  Está conectado a una sesión sin grupos académicos cargados (por ejemplo, si ingresó por el Puerto 8080 en vez del Puerto 8081).
                </p>
                <a href="http://127.0.0.1:8081/#/documentos" class="btn btn-sm btn-primary fw-bold text-white px-3 py-1.5" style="text-decoration: none;">
                  <i class="bi bi-box-arrow-up-right me-1"></i>Abrir Sistema Académico V2 (Puerto 8081 con 12 Grupos)
                </a>
              </div>
            </div>
          </div>`;
      }
      return `
        <div class="alert alert-warning d-flex align-items-center gap-2 mb-3 p-3 rounded" style="border: 2px solid #fde68a !important;">
          <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
          <div class="fw-semibold">No se ha seleccionado ningún grupo académico. Por favor seleccione uno de la lista superior.</div>
        </div>`;
    }

    const progName = selectedGroup.program?.nombre || selectedGroup.programaNombre || selectedGroup.programaOriginal || 'Programa de Estudio General';
    const count = Number(selectedGroup.enrollmentCount) || 0;
    const turno = selectedGroup.turno || 'Regular / Único';
    const capacity = this._getTemplateRowCapacity(this.selectedTemplateId);
    const foliosEst = Math.ceil(Math.max(count, 1) / capacity);
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
                  <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold" style="font-size: 0.82rem; background: #dcfce7; color: #15803d; border-color: #86efac !important;">${foliosEst} pág. (${capacity} por hoja)</span>
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
      const attData = this.selectedGroupId ? this.etapa2DataService?.getAttendance(this.selectedGroupId, udNum) : null;
      const hasAtt = attData && Array.isArray(attData.sessions) && attData.sessions.length > 0;

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
              ${hasAtt ? '<span class="badge bg-success text-white fw-bold"><i class="bi bi-check2-circle me-1"></i>Asistencia Guardada (' + attData.sessions.length + ' sesiones)</span>' : '<span class="badge bg-light text-secondary border">Plantilla en blanco</span>'}
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
              <button id="doc-generate-asistencia-btn" type="button" class="btn btn-primary px-3 py-2 fw-bold" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.92rem; background: #1d4ed8; border-color: #1d4ed8;">
                <i class="bi bi-calendar2-check-fill me-1"></i>Generar Asistencia (UD ${udNum})
              </button>
              <button id="doc-open-asistencia-modal-btn" type="button" class="btn btn-warning px-3 py-2 fw-bold text-dark" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.92rem; background: #f59e0b; border-color: #d97706;">
                <i class="bi bi-pencil-square me-1"></i>📝 Llenar Asistencia
              </button>
              <button id="doc-demo-asistencia-btn" type="button" class="btn btn-outline-primary fw-bold px-3 py-2" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.92rem;" title="Precargar asistencia de prueba para este grupo y UD">
                <i class="bi bi-lightning-charge-fill me-1"></i>Precargar Demo
              </button>
              ${hasAtt ? '<button id="doc-clear-asistencia-btn" type="button" class="btn btn-outline-danger fw-bold px-2.5 py-2" title="Limpiar datos de asistencia guardados"><i class="bi bi-trash"></i></button>' : ''}
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            ${hasAtt
              ? `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Asistencia registrada para UD ${udNum} (${attData.sessions.length} sesiones). Al generar, se incluirán las marcas P/F/J y totales.</span>`
              : `<i class="bi bi-info-circle me-1 text-primary"></i>Sin asistencia registrada para UD ${udNum}. Puede hacer clic en "📝 Llenar Asistencia" o "⚡ Precargar Demo", o generar la plantilla en blanco.`
            }
          </div>
        </div>`;
    }

    // TMPL-11..17: Evaluación
    if (template.templateId >= 'TMPL-11' && template.templateId <= 'TMPL-17') {
      const udNum = parseInt(template.templateId.replace('TMPL-', ''), 10) - 10;
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();
      const evalData = this.selectedGroupId ? this.etapa2DataService?.getEvaluation(this.selectedGroupId, udNum) : null;
      const hasEval = evalData && evalData.evaluationsByEnrollment && Object.keys(evalData.evaluationsByEnrollment).length > 0;

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
              ${hasEval ? '<span class="badge bg-success text-white fw-bold"><i class="bi bi-check2-circle me-1"></i>Calificaciones Guardadas (5 IL)</span>' : '<span class="badge bg-light text-secondary border">Plantilla en blanco</span>'}
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
              <button id="doc-generate-evaluacion-btn" type="button" class="btn btn-success px-3 py-2 fw-bold text-white" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.92rem; background: #059669; border-color: #059669;">
                <i class="bi bi-clipboard-check-fill me-1"></i>Generar Registro Auxiliar (UD ${udNum})
              </button>
              <button id="doc-open-evaluacion-modal-btn" type="button" class="btn btn-warning px-3 py-2 fw-bold text-dark" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.92rem; background: #f59e0b; border-color: #d97706;">
                <i class="bi bi-pencil-square me-1"></i>📊 Llenar Calificaciones
              </button>
              <button id="doc-demo-evaluacion-btn" type="button" class="btn btn-outline-success fw-bold px-3 py-2" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.92rem;" title="Precargar notas vigesimales de prueba para este grupo y UD">
                <i class="bi bi-lightning-charge-fill me-1"></i>Precargar Demo
              </button>
              ${hasEval ? '<button id="doc-clear-evaluacion-btn" type="button" class="btn btn-outline-danger fw-bold px-2.5 py-2" title="Limpiar calificaciones guardadas"><i class="bi bi-trash"></i></button>' : ''}
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            ${hasEval
              ? `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Calificaciones registradas para UD ${udNum} (5 IL). Al generar, se incluirán las notas vigesimales y Logro final.</span>`
              : `<i class="bi bi-info-circle me-1 text-success"></i>Sin notas registradas para UD ${udNum}. Puede hacer clic en "📊 Llenar Calificaciones" o "⚡ Precargar Demo", o generar la plantilla en blanco.`
            }
          </div>
        </div>`;
    }

    // TMPL-18: EFSRT
    if (template.templateId === 'TMPL-18') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; background: #059669 !important;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para el Consolidado de EFSRT</h5>
          </div>

          <div class="d-flex align-items-center justify-content-between p-2.5 px-3 rounded mb-3" style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success px-2.5 py-1.5 fw-bold" style="background: #059669 !important; font-size: 0.85rem;">EFSRT</span>
              <span class="fw-bold text-success" style="font-size: 0.95rem;">${escapeHtml(template.name)} (${template.templateId})</span>
            </div>
            <span class="badge bg-light text-secondary border fw-bold" style="font-size: 0.8rem; border-color: #a7f3d0 !important;">
              <i class="bi bi-briefcase me-1 text-success"></i>40 estudiantes · 9 criterios · Formato A4 Landscape
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
              <button id="doc-generate-tmpl18-btn" type="button" class="btn btn-success px-4 py-2 fw-bold text-white" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.95rem; background: #059669; border-color: #059669;">
                <i class="bi bi-briefcase-fill me-1"></i>Generar Consolidado EFSRT
              </button>
              <a href="#/efsrt" class="btn btn-outline-success fw-bold px-3 py-2" style="font-size: 0.92rem;">
                <i class="bi bi-box-arrow-up-right me-1"></i>Gestión de Prácticas
              </a>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-success"></i>Emisión ministerial del consolidado de prácticas pre-profesionales con evaluación de criterios formativos.
          </div>
        </div>`;
    }

    // TMPL-19: Acta Modular
    if (template.templateId === 'TMPL-19') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; background: #1d4ed8 !important;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico para el Acta Oficial de Evaluación</h5>
          </div>

          <div class="d-flex align-items-center justify-content-between p-2.5 px-3 rounded mb-3" style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 10px;">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary px-2.5 py-1.5 fw-bold" style="background: #1d4ed8 !important; font-size: 0.85rem;">ACTA OFICIAL</span>
              <span class="fw-bold text-primary" style="font-size: 0.95rem;">${escapeHtml(template.name)} (${template.templateId})</span>
            </div>
            <span class="badge bg-light text-secondary border fw-bold" style="font-size: 0.8rem; border-color: #bfdbfe !important;">
              <i class="bi bi-file-earmark-spreadsheet me-1 text-primary"></i>2 Páginas Físicas A3 Landscape · 20+20 Filas
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
              <button id="doc-generate-tmpl19-btn" type="button" class="btn btn-primary px-4 py-2 fw-bold text-white" ${!this.selectedGroupId ? 'disabled' : ''} style="font-size: 0.95rem; background: #1d4ed8; border-color: #1d4ed8;">
                <i class="bi bi-file-earmark-check-fill me-1"></i>Generar Acta Oficial (TMPL-19)
              </button>
              <a href="#/evaluacion" class="btn btn-outline-primary fw-bold px-3 py-2" style="font-size: 0.92rem;">
                <i class="bi bi-box-arrow-up-right me-1"></i>Registro de Calificaciones
              </a>
            </div>
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-primary"></i>Acta oficial ministerial de dos páginas físicas A3 landscape con cuadro de unidades y estadísticas generales.
          </div>
        </div>`;
    }

    // TMPL-20: Certificado Modular
    if (template.templateId === 'TMPL-20') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();
      const studentOptions = this._renderEtapa4StudentOptions();
      const studentSummary = this._renderEtapa4StudentSummary(selectedGroup);

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; background: #2563eb !important;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico y Estudiante para el Certificado Modular (TMPL-20)</h5>
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 260px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-collection-fill me-1 text-primary"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="flex: 1; min-width: 260px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-etapa4-student-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-person-fill me-1 text-primary"></i>Estudiante del Grupo:
              </label>
              <select id="doc-etapa4-student-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${studentOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-tmpl20-btn" type="button" class="btn btn-primary px-3 py-2 fw-bold text-white" ${!this.selectedGroupId || !this.selectedEtapa4StudentId ? 'disabled' : ''} style="font-size: 0.92rem; background: #2563eb; border-color: #2563eb;">
                <i class="bi bi-file-earmark-check-fill me-1"></i>Generar Certificado (TMPL-20)
              </button>
              <button id="doc-open-etapa4-modal-btn" type="button" class="btn btn-warning px-3 py-2 fw-bold text-dark" ${!this.selectedGroupId || !this.selectedEtapa4StudentId ? 'disabled' : ''} style="font-size: 0.92rem; background: #f59e0b; border-color: #d97706;" title="Editar Libro, Folio, Asiento y UDs">
                <i class="bi bi-pencil-square me-1"></i>📝 Datos Registrales
              </button>
              <button id="doc-demo-etapa4-btn" type="button" class="btn btn-outline-primary fw-bold px-3 py-2" ${!this.selectedGroupId || !this.selectedEtapa4StudentId ? 'disabled' : ''} style="font-size: 0.92rem;" title="Precargar Libro, Folio y UDs con datos demo">
                <i class="bi bi-lightning-charge-fill me-1"></i>Precargar Demo
              </button>
            </div>
          </div>
          <div id="doc-etapa4-student-summary-container">
            ${studentSummary}
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-primary"></i>Acreditación modular ministerial oficial (2 páginas A4 horizontal). Al generar, se incluirán las notas vigesimales de las UDs y la numeración registral.
          </div>
        </div>`;
    }

    // TMPL-21: Título Técnico
    if (template.templateId === 'TMPL-21') {
      const selectedGroup = this.groups.find(g => g.id === this.selectedGroupId);
      const groupOptions = this._renderGroupOptions();
      const studentOptions = this._renderEtapa4StudentOptions();
      const studentSummary = this._renderEtapa4StudentSummary(selectedGroup);

      return `
        <div class="context-step-box p-3 p-md-4">
          <div class="d-flex align-items-center gap-2 mb-3">
            <span class="badge text-white rounded-circle p-2" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; background: #059669 !important;">2</span>
            <h5 class="fw-bold m-0 text-dark" style="font-size: 1.12rem; color: #0f172a;">Paso 2: Seleccione el Grupo Académico y Estudiante para el Título Técnico Oficial (TMPL-21)</h5>
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1; min-width: 260px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-group-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-collection-fill me-1 text-success"></i>Programa y Grupo Académico:
              </label>
              <select id="doc-group-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${groupOptions}
              </select>
            </div>
            <div style="flex: 1; min-width: 260px;">
              <label class="form-label fw-bold small text-dark mb-1" for="doc-etapa4-student-select" style="display: block; font-weight: 700; font-size: 0.88rem; color: #0f172a;">
                <i class="bi bi-person-fill me-1 text-success"></i>Estudiante Titulado:
              </label>
              <select id="doc-etapa4-student-select" class="form-select doc-selector-select" style="max-width: 100%; width: 100%;">
                ${studentOptions}
              </select>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
              <button id="doc-generate-tmpl21-btn" type="button" class="btn btn-success px-3 py-2 fw-bold text-white" ${!this.selectedGroupId || !this.selectedEtapa4StudentId ? 'disabled' : ''} style="font-size: 0.92rem; background: #059669; border-color: #059669;">
                <i class="bi bi-award-fill me-1"></i>Generar Título Oficial (TMPL-21)
              </button>
              <button id="doc-open-etapa4-modal-btn" type="button" class="btn btn-warning px-3 py-2 fw-bold text-dark" ${!this.selectedGroupId || !this.selectedEtapa4StudentId ? 'disabled' : ''} style="font-size: 0.92rem; background: #f59e0b; border-color: #d97706;" title="Editar Código REGISTRA y Asiento">
                <i class="bi bi-pencil-square me-1"></i>📝 Datos Registrales
              </button>
              <button id="doc-demo-etapa4-btn" type="button" class="btn btn-outline-success fw-bold px-3 py-2" ${!this.selectedGroupId || !this.selectedEtapa4StudentId ? 'disabled' : ''} style="font-size: 0.92rem;" title="Precargar Código REGISTRA y Asiento con datos demo">
                <i class="bi bi-lightning-charge-fill me-1"></i>Precargar Demo
              </button>
            </div>
          </div>
          <div id="doc-etapa4-student-summary-container">
            ${studentSummary}
          </div>
          <div id="doc-selected-group-card">
            ${this._renderGroupSummaryCard(selectedGroup)}
          </div>
          <div id="doc-group-status" class="fw-semibold text-secondary" style="font-size: 0.88rem;" aria-live="polite">
            <i class="bi bi-info-circle me-1 text-success"></i>Acreditación de graduación y titulación técnica ministerial (2 páginas A4 horizontal). Al generar, se incluirán el título oficial, código REGISTRA y asiento registral institucional.
          </div>
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
    if (template?.templateId === 'TMPL-18') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-briefcase fs-1 d-block mb-2 text-success opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Consolidado de EFSRT (TMPL-18)</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico arriba y haga clic en <strong>Generar Consolidado EFSRT</strong> para emitir la sábana ministerial con los 9 criterios de evaluación formativa.
          </p>
          <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-check2-circle me-1"></i>Formato Oficial de Prácticas Pre-Profesionales
          </span>
        </div>`;
    }
    if (template?.templateId === 'TMPL-19') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-file-earmark-spreadsheet fs-1 d-block mb-2 text-primary opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Acta Oficial de Evaluación Modular (TMPL-19)</h4>
          <p class="mb-3 text-secondary" style="max-width: 520px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico arriba y haga clic en <strong>Generar Acta Oficial (TMPL-19)</strong> para emitir el acta ministerial de 2 páginas físicas A3 landscape con cuadro de unidades y estadísticas generales.
          </p>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-file-earmark-ruled me-1"></i>Formato Oficial A3 Landscape · 2 Páginas Físicas
          </span>
        </div>`;
    }
    if (template?.templateId === 'TMPL-20') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-mortarboard fs-1 d-block mb-2 text-primary opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Certificado Modular Oficial (TMPL-20)</h4>
          <p class="mb-3 text-secondary" style="max-width: 540px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico y al estudiante arriba, y haga clic en <strong>Generar Certificado (TMPL-20)</strong> para emitir el certificado oficial de 2 páginas físicas A4 landscape con anverso curricular y reverso de calificaciones registrales.
          </p>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-file-earmark-check me-1"></i>Formato Oficial MINEDU · 2 Páginas A4 Horizontal
          </span>
        </div>`;
    }
    if (template?.templateId === 'TMPL-21') {
      return `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-award fs-1 d-block mb-2 text-success opacity-50" style="font-size: 3rem;"></i>
          <h4 class="fw-bold mb-2 text-dark" style="font-size: 1.25rem;">Título Técnico Oficial (TMPL-21)</h4>
          <p class="mb-3 text-secondary" style="max-width: 540px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
            Seleccione el grupo académico y al estudiante titulado arriba, y haga clic en <strong>Generar Título Oficial (TMPL-21)</strong> para emitir el diploma ministerial de titulación con código REGISTRA y asiento registral.
          </p>
          <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-bold" style="font-size: 0.85rem;">
            <i class="bi bi-award me-1"></i>Acreditación Oficial MINEDU · Titulación Técnica
          </span>
        </div>`;
    }
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
      groupSelect.onchange = async event => {
        this.selectedGroupId = event.target.value;
        const g = this.groups.find(item => item.id === this.selectedGroupId);
        if (g) this.selectedGroupCode = g.visibleCode;

        // Actualizar tarjeta resumen en tiempo real
        const cardBox = container.querySelector('#doc-selected-group-card');
        if (cardBox) {
          cardBox.innerHTML = this._renderGroupSummaryCard(g);
        }

        // Si estamos en Etapa 4, actualizar estudiantes del grupo
        if (['TMPL-20', 'TMPL-21'].includes(this.selectedTemplateId) && this.selectedGroupId) {
          try {
            const rosterContext = await this.adminService.buildGroupRoster(this.selectedGroupId);
            this.etapa4Students = rosterContext.rows || [];
            this._etapa4LoadedGroupId = this.selectedGroupId;
            this.selectedEtapa4StudentId = this.etapa4Students[0]?.studentId || this.etapa4Students[0]?.id || null;
            const studentSelect = container.querySelector('#doc-etapa4-student-select');
            if (studentSelect) {
              studentSelect.innerHTML = this._renderEtapa4StudentOptions();
            }
            const summaryBox = container.querySelector('#doc-etapa4-student-summary-container');
            if (summaryBox) {
              summaryBox.innerHTML = this._renderEtapa4StudentSummary(g);
            }
          } catch (e) {
            console.warn('[DocumentsView] Error al actualizar estudiantes en grupo:', e);
          }
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
        const openAttModalBtn = container.querySelector('#doc-open-asistencia-modal-btn');
        if (openAttModalBtn) openAttModalBtn.disabled = !this.selectedGroupId;
        const demoAttBtn = container.querySelector('#doc-demo-asistencia-btn');
        if (demoAttBtn) demoAttBtn.disabled = !this.selectedGroupId;
        const evaluacionBtn = container.querySelector('#doc-generate-evaluacion-btn');
        if (evaluacionBtn) evaluacionBtn.disabled = !this.selectedGroupId;
        const openEvalModalBtn = container.querySelector('#doc-open-evaluacion-modal-btn');
        if (openEvalModalBtn) openEvalModalBtn.disabled = !this.selectedGroupId;
        const demoEvalBtn = container.querySelector('#doc-demo-evaluacion-btn');
        if (demoEvalBtn) demoEvalBtn.disabled = !this.selectedGroupId;
        const tmpl18Btn = container.querySelector('#doc-generate-tmpl18-btn');
        if (tmpl18Btn) tmpl18Btn.disabled = !this.selectedGroupId;
        const tmpl19Btn = container.querySelector('#doc-generate-tmpl19-btn');
        if (tmpl19Btn) tmpl19Btn.disabled = !this.selectedGroupId;
        const tmpl20Btn = container.querySelector('#doc-generate-tmpl20-btn');
        if (tmpl20Btn) tmpl20Btn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
        const tmpl21Btn = container.querySelector('#doc-generate-tmpl21-btn');
        if (tmpl21Btn) tmpl21Btn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
        const openE4ModalBtn = container.querySelector('#doc-open-etapa4-modal-btn');
        if (openE4ModalBtn) openE4ModalBtn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
        const demoE4Btn = container.querySelector('#doc-demo-etapa4-btn');
        if (demoE4Btn) demoE4Btn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
      };
    }

    const etapa4StudentSelect = container.querySelector('#doc-etapa4-student-select');
    if (etapa4StudentSelect) {
      etapa4StudentSelect.onchange = event => {
        this.selectedEtapa4StudentId = event.target.value;
        const g = this.groups.find(item => item.id === this.selectedGroupId);
        const summaryBox = container.querySelector('#doc-etapa4-student-summary-container');
        if (summaryBox) {
          summaryBox.innerHTML = this._renderEtapa4StudentSummary(g);
        }
        const tmpl20Btn = container.querySelector('#doc-generate-tmpl20-btn');
        if (tmpl20Btn) tmpl20Btn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
        const tmpl21Btn = container.querySelector('#doc-generate-tmpl21-btn');
        if (tmpl21Btn) tmpl21Btn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
        const openE4ModalBtn = container.querySelector('#doc-open-etapa4-modal-btn');
        if (openE4ModalBtn) openE4ModalBtn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
        const demoE4Btn = container.querySelector('#doc-demo-etapa4-btn');
        if (demoE4Btn) demoE4Btn.disabled = !this.selectedGroupId || !this.selectedEtapa4StudentId;
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

    const openAttModalBtn = container.querySelector('#doc-open-asistencia-modal-btn');
    if (openAttModalBtn) {
      openAttModalBtn.onclick = async () => this._openAttendanceModal(container);
    }

    const demoAttBtn = container.querySelector('#doc-demo-asistencia-btn');
    if (demoAttBtn) {
      demoAttBtn.onclick = async () => this._preloadDemoAttendance(container);
    }

    const clearAttBtn = container.querySelector('#doc-clear-asistencia-btn');
    if (clearAttBtn) {
      clearAttBtn.onclick = async () => this._clearAttendanceData(container);
    }

    const evaluacionBtn = container.querySelector('#doc-generate-evaluacion-btn');
    if (evaluacionBtn) {
      evaluacionBtn.onclick = async () => this._generateTmplEvaluation(container);
    }

    const openEvalModalBtn = container.querySelector('#doc-open-evaluacion-modal-btn');
    if (openEvalModalBtn) {
      openEvalModalBtn.onclick = async () => this._openEvaluationModal(container);
    }

    const demoEvalBtn = container.querySelector('#doc-demo-evaluacion-btn');
    if (demoEvalBtn) {
      demoEvalBtn.onclick = async () => this._preloadDemoEvaluation(container);
    }

    const clearEvalBtn = container.querySelector('#doc-clear-evaluacion-btn');
    if (clearEvalBtn) {
      clearEvalBtn.onclick = async () => this._clearEvaluationData(container);
    }

    const tmpl18Btn = container.querySelector('#doc-generate-tmpl18-btn');
    if (tmpl18Btn) {
      tmpl18Btn.onclick = async () => this._generateTmpl18(container);
    }

    const tmpl19Btn = container.querySelector('#doc-generate-tmpl19-btn');
    if (tmpl19Btn) {
      tmpl19Btn.onclick = async () => this._generateTmpl19(container);
    }

    const tmpl20Btn = container.querySelector('#doc-generate-tmpl20-btn');
    if (tmpl20Btn) {
      tmpl20Btn.onclick = async () => this._generateTmpl20(container);
    }

    const tmpl21Btn = container.querySelector('#doc-generate-tmpl21-btn');
    if (tmpl21Btn) {
      tmpl21Btn.onclick = async () => this._generateTmpl21(container);
    }

    const openE4ModalBtn = container.querySelector('#doc-open-etapa4-modal-btn');
    if (openE4ModalBtn) {
      openE4ModalBtn.onclick = async () => this._openEtapa4Modal(container);
    }

    const demoE4Btn = container.querySelector('#doc-demo-etapa4-btn');
    if (demoE4Btn) {
      demoE4Btn.onclick = async () => this._preloadDemoEtapa4(container);
    }

    if (searchInput) searchInput.oninput = async event => this._searchEnrollments(container, event.target.value);
    if (generateButton) generateButton.onclick = async () => this._generateSelectedDocument(container);

    const teacherClassroomSelect = container.querySelector('#doc-teacher-classroom-select');
    if (teacherClassroomSelect) {
      teacherClassroomSelect.onchange = async () => {
        TeacherContextService.setActiveGroupCode(teacherClassroomSelect.value);
        this.selectedGroupId = null;
        await this.render(container);
      };
    }

    const teacherProgSelect = container.querySelector('#doc-teacher-program-select');
    if (teacherProgSelect) {
      teacherProgSelect.onchange = async () => {
        TeacherContextService.setActiveProgramId(teacherProgSelect.value);
        this.selectedGroupId = null;
        await this.render(container);
      };
    }

    const headerSwitchBtn = container.querySelector('#doc-header-switch-role-btn');
    if (headerSwitchBtn) {
      headerSwitchBtn.onclick = () => {
        const widget = document.getElementById('user-role-widget');
        if (widget) widget.click();
      };
    }

    const btnExportNotasSync = container.querySelector('#doc-export-notas-sync-btn');
    if (btnExportNotasSync) {
      btnExportNotasSync.onclick = async () => {
        const syncService = new SyncPackageService();
        await syncService.exportTeacherGradesPackage();
      };
    }

    const btnImportNotasSync = container.querySelector('#doc-import-notas-sync-btn');
    const inputSyncNotas = container.querySelector('#doc-input-sync-notas');
    if (btnImportNotasSync && inputSyncNotas) {
      btnImportNotasSync.onclick = () => inputSyncNotas.click();
      inputSyncNotas.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const content = await SyncPackageService.readFileAsText(file);
            const syncService = new SyncPackageService();
            await syncService.importTeacherGradesPackage(content);
            inputSyncNotas.value = '';
            await this.render(container);
          } catch (err) {
            console.error('[DocumentsView] Error consolidando notas:', err);
          }
        }
      };
    }
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
      let { rows, group } = rosterContext;
      const context = {
        ...rosterContext,
        unit: { orden: udNum, nombre: `Unidad Didáctica ${udNum}` }
      };

      // Inyección de asistencia guardada para este grupo y UD
      const storedAtt = this.etapa2DataService?.getAttendance(groupId, udNum);
      if (storedAtt && Array.isArray(storedAtt.sessions) && storedAtt.sessions.length > 0) {
        context.sessions = storedAtt.sessions;
        rows = rows.map(r => {
          const studentMarks = storedAtt.marksByEnrollment?.[r.enrollmentId] || storedAtt.marksByEnrollment?.[r.id];
          if (studentMarks) {
            return {
              ...r,
              marksBySession: studentMarks.marks || [],
              'attendance.presentCount': studentMarks.presentCount,
              'attendance.absentCount': studentMarks.absentCount,
              presentCount: studentMarks.presentCount,
              absentCount: studentMarks.absentCount
            };
          }
          return r;
        });
      }

      const capacity = 40;
      let blob;
      const pageCount = Math.max(1, Math.ceil(rows.length / capacity));

      if (rows.length <= capacity) {
        blob = await this.pdfEngine.renderDocument({
          documentType: tmplId,
          context,
          rows,
          demoMode: isDemoRuntime()
        });
      } else {
        // Paginación multipágina automática para grupos con > 40 estudiantes
        const chunks = [];
        for (let i = 0; i < rows.length; i += capacity) {
          chunks.push(rows.slice(i, i + capacity));
        }

        const { PDFDocument, StandardFonts, rgb } = (typeof window !== 'undefined' && window.PDFLib)
          ? window.PDFLib
          : await import('pdf-lib');
        const mergedDoc = await PDFDocument.create();
        const boldFont = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

        for (let idx = 0; idx < chunks.length; idx++) {
          const chunk = chunks[idx];
          const singleBlob = await this.pdfEngine.renderDocument({
            documentType: tmplId,
            context,
            rows: chunk,
            demoMode: isDemoRuntime()
          });
          const chunkDoc = await PDFDocument.load(await singleBlob.arrayBuffer());
          const [copiedPage] = await mergedDoc.copyPages(chunkDoc, [0]);
          mergedDoc.addPage(copiedPage);

          const startNum = idx * capacity + 1;
          const endNum = startNum + chunk.length - 1;
          copiedPage.drawText(`FOLIO ${idx + 1} DE ${chunks.length} · ESTUDIANTES ${startNum} AL ${endNum} (TOTAL GRUPO: ${rows.length})`, {
            x: 40,
            y: 12,
            size: 7.5,
            font: boldFont,
            color: rgb(0.1, 0.3, 0.6)
          });
        }
        const mergedBytes = await mergedDoc.save();
        blob = new Blob([mergedBytes], { type: 'application/pdf' });
      }

      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}ASISTENCIA_UD${udNum}_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Control de Asistencia Modular — UD ${udNum} (${group.visibleCode})`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Asistencia generada con éxito (${rows.length} estudiantes, ${pageCount} folio(s) A3).</span>`;
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
      let { rows, group } = rosterContext;
      const context = {
        ...rosterContext,
        unit: { orden: udNum, nombre: `Unidad Didáctica ${udNum}` }
      };

      // Inyección de calificaciones guardadas para este grupo y UD
      const storedEval = this.etapa2DataService?.getEvaluation(groupId, udNum);
      if (storedEval) {
        if (Array.isArray(storedEval.indicators)) {
          context.indicators = storedEval.indicators;
        }
        rows = rows.map(r => {
          const studentEval = storedEval.evaluationsByEnrollment?.[r.enrollmentId] || storedEval.evaluationsByEnrollment?.[r.id];
          if (studentEval) {
            return {
              ...r,
              evaluations: studentEval.evaluations || [],
              finalResult: studentEval.finalLogro,
              logro: studentEval.finalLogro
            };
          }
          return r;
        });
      }

      const capacity = tmplId === 'TMPL-11' ? 47 : 40;
      let blob;
      const pageCount = Math.max(1, Math.ceil(rows.length / capacity));

      if (rows.length <= capacity) {
        blob = await this.pdfEngine.renderDocument({
          documentType: tmplId,
          context,
          rows,
          demoMode: isDemoRuntime()
        });
      } else {
        // Paginación multipágina automática para grupos con > 40 (o 47) estudiantes
        const chunks = [];
        for (let i = 0; i < rows.length; i += capacity) {
          chunks.push(rows.slice(i, i + capacity));
        }

        const { PDFDocument, StandardFonts, rgb } = (typeof window !== 'undefined' && window.PDFLib)
          ? window.PDFLib
          : await import('pdf-lib');
        const mergedDoc = await PDFDocument.create();
        const boldFont = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

        for (let idx = 0; idx < chunks.length; idx++) {
          const chunk = chunks[idx];
          const singleBlob = await this.pdfEngine.renderDocument({
            documentType: tmplId,
            context,
            rows: chunk,
            demoMode: isDemoRuntime()
          });
          const chunkDoc = await PDFDocument.load(await singleBlob.arrayBuffer());
          const [copiedPage] = await mergedDoc.copyPages(chunkDoc, [0]);
          mergedDoc.addPage(copiedPage);

          const startNum = idx * capacity + 1;
          const endNum = startNum + chunk.length - 1;
          copiedPage.drawText(`FOLIO ${idx + 1} DE ${chunks.length} · ESTUDIANTES ${startNum} AL ${endNum} (TOTAL GRUPO: ${rows.length})`, {
            x: 40,
            y: 12,
            size: 7.5,
            font: boldFont,
            color: rgb(0.05, 0.4, 0.2)
          });
        }
        const mergedBytes = await mergedDoc.save();
        blob = new Blob([mergedBytes], { type: 'application/pdf' });
      }

      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}EVALUACION_AUXILIAR_UD${udNum}_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Registro Auxiliar de Evaluación — UD ${udNum} (${group.visibleCode})`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Registro de evaluación generado con éxito (${rows.length} estudiantes, ${pageCount} folio(s) A3).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar Evaluación', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el registro de evaluación: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _openAttendanceModal(container) {
    const groupId = this.selectedGroupId;
    if (!groupId) {
      Notifications.show('Seleccione un grupo académico primero.', 'warning');
      return;
    }
    const udNum = this.selectedAsistenciaUD || 1;
    let rosterContext;
    try {
      rosterContext = await this.adminService.buildGroupRoster(groupId);
    } catch (err) {
      Notifications.show('Error al obtener estudiantes: ' + err.message, 'error');
      return;
    }
    const { rows, group } = rosterContext;
    if (!rows || rows.length === 0) {
      Notifications.show('El grupo no tiene estudiantes matriculados.', 'warning');
      return;
    }

    // Cargar o inicializar estructura de 40 sesiones
    let attData = this.etapa2DataService.getAttendance(groupId, udNum);
    if (!attData || !attData.sessions || attData.sessions.length === 0) {
      const sessions = [];
      const curDate = new Date('2026-03-02T08:00:00');
      while (sessions.length < 40) {
        if (curDate.getDay() !== 0 && curDate.getDay() !== 6) {
          const y = curDate.getFullYear();
          const m = String(curDate.getMonth() + 1).padStart(2, '0');
          const d = String(curDate.getDate()).padStart(2, '0');
          sessions.push({ sessionId: sessions.length + 1, fecha: `${y}-${m}-${d}`, day: d });
        }
        curDate.setDate(curDate.getDate() + 1);
      }
      const marksByEnrollment = {};
      rows.forEach(r => {
        const id = r.enrollmentId || r.id;
        marksByEnrollment[id] = {
          marks: sessions.map(s => ({ sessionId: s.sessionId, estadoRegistro: '—' })),
          presentCount: 0,
          absentCount: 0
        };
      });
      attData = { groupId, udNum, sessions, marksByEnrollment };
    }

    const workingData = JSON.parse(JSON.stringify(attData));

    // Crear overlay del modal
    const overlay = document.createElement('div');
    overlay.className = 'etapa2-modal-overlay';
    overlay.id = 'etapa2-attendance-modal';

    const renderTableContent = () => {
      const { sessions, marksByEnrollment } = workingData;
      let theadHtml = `
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th class="col-sticky-student">Estudiante (${rows.length})</th>`;
      sessions.forEach((s, idx) => {
        theadHtml += `
          <th style="width: 32px; text-align: center; font-size: 0.76rem; padding: 0.25rem 0.1rem;" title="Sesión ${s.sessionId} (${s.fecha || ''})">
            <div>S${s.sessionId}</div>
            <div class="text-secondary fw-normal" style="font-size: 0.68rem;">${s.day || (idx + 1)}</div>
          </th>`;
      });
      theadHtml += `
          <th style="width: 55px; text-align: center; color: #166534; background: #f0fdf4;" title="Total Asistencias">Tot. P</th>
          <th style="width: 55px; text-align: center; color: #991b1b; background: #fef2f2;" title="Total Faltas">Tot. F</th>
        </tr>`;

      let tbodyHtml = '';
      rows.forEach((student, sIdx) => {
        const id = student.enrollmentId || student.id;
        const sData = marksByEnrollment[id] || { marks: [], presentCount: 0, absentCount: 0 };
        tbodyHtml += `
          <tr data-student-id="${id}">
            <td style="text-align: center; color: #64748b; font-weight: 600;">${sIdx + 1}</td>
            <td class="col-sticky-student fw-bold text-dark" style="font-size: 0.84rem;">
              <div class="text-truncate" title="${escapeHtml(student.studentName)}">${escapeHtml(student.studentName)}</div>
              <div class="text-muted fw-normal" style="font-size: 0.72rem;">${escapeHtml(student.document || student.numeroDocumento || '')}</div>
            </td>`;
        sessions.forEach((s, jIdx) => {
          const markObj = sData.marks[jIdx] || { estadoRegistro: '—' };
          const state = String(markObj.estadoRegistro || '—').toUpperCase();
          const cls = state === 'P' ? 'att-P' : (state === 'F' ? 'att-F' : (state === 'J' ? 'att-J' : 'att-dash'));
          tbodyHtml += `
            <td style="text-align: center; padding: 2px;">
              <button type="button" class="att-cell-btn ${cls}" data-sidx="${sIdx}" data-jidx="${jIdx}" data-enrollment-id="${id}" title="Sesión ${s.sessionId}: Clic para alternar (P / F / J / —)">${state}</button>
            </td>`;
        });
        tbodyHtml += `
            <td style="text-align: center; font-weight: 800; color: #15803d; background: #f0fdf4;" class="tot-p-cell" id="tot-p-${id}">${sData.presentCount}</td>
            <td style="text-align: center; font-weight: 800; color: #b91c1c; background: #fef2f2;" class="tot-f-cell" id="tot-f-${id}">${sData.absentCount}</td>
          </tr>`;
      });

      return `
        <table class="etapa2-table">
          <thead>${theadHtml}</thead>
          <tbody>${tbodyHtml}</tbody>
        </table>`;
    };

    overlay.innerHTML = `
      <div class="etapa2-modal-dialog">
        <div class="etapa2-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-primary px-3 py-1.5 fw-bold" style="background: #1d4ed8 !important; font-size: 0.9rem;">
              <i class="bi bi-calendar2-check me-1"></i>Asistencia UD ${udNum}
            </span>
            <h5 class="m-0 fw-bold text-dark" style="font-size: 1.15rem;">
              Grupo: <span class="text-primary">${escapeHtml(group.visibleCode)}</span>
            </h5>
            <span class="badge bg-light text-secondary border ms-2">${rows.length} Estudiantes · 40 Sesiones</span>
          </div>
          <button type="button" class="btn-close" id="btn-close-att-modal" aria-label="Cerrar"></button>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between p-2.5 px-3 bg-light border-bottom gap-2">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="small fw-bold text-secondary text-uppercase tracking-wider" style="font-size: 0.78rem;">Acciones Rápidas:</span>
            <button type="button" class="btn btn-sm btn-outline-success fw-bold" id="btn-modal-all-p" title="Marcar todas las 40 sesiones como Presente">
              <i class="bi bi-check-all me-1"></i>Marcar Todos Presente (P)
            </button>
            <button type="button" class="btn btn-sm btn-outline-primary fw-bold" id="btn-modal-demo-att" title="Cargar asistencia realista de demostración">
              <i class="bi bi-lightning-charge me-1"></i>Llenar Demo Realista
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-modal-clear-att" title="Limpiar todas las marcas">
              <i class="bi bi-eraser me-1"></i>Limpiar Todo
            </button>
          </div>
          <div class="d-flex align-items-center gap-2 small text-secondary">
            <span>Leyenda:</span>
            <span class="badge att-P px-2 py-0.5">P = Presente</span>
            <span class="badge att-F px-2 py-0.5">F = Falta</span>
            <span class="badge att-J px-2 py-0.5">J = Justificada</span>
            <span class="badge att-dash px-2 py-0.5">— = En blanco</span>
          </div>
        </div>

        <div class="etapa2-modal-body" id="att-modal-body">
          ${renderTableContent()}
        </div>

        <div class="etapa2-modal-footer">
          <div class="small text-secondary">
            <i class="bi bi-info-circle me-1 text-primary"></i>Haga clic sobre cualquier celda para alternar su estado (P ➔ F ➔ J ➔ —). Los totales se calculan automáticamente.
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-outline-secondary fw-semibold px-3" id="btn-cancel-att-modal">Cancelar</button>
            <button type="button" class="btn btn-primary fw-bold px-4" id="btn-save-att-modal" style="background: #1d4ed8; border-color: #1d4ed8;">
              <i class="bi bi-floppy-fill me-1"></i>Guardar Asistencia
            </button>
            <button type="button" class="btn btn-success fw-bold px-4" id="btn-save-generate-att-modal" style="background: #059669; border-color: #059669;">
              <i class="bi bi-file-earmark-pdf-fill me-1"></i>Guardar y Emitir PDF
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const recalculateTotalsForStudent = (enrollmentId) => {
      const sData = workingData.marksByEnrollment[enrollmentId];
      if (!sData) return;
      let p = 0, f = 0;
      sData.marks.forEach(m => {
        const st = String(m.estadoRegistro || '').toUpperCase();
        if (st === 'P') p++;
        else if (st === 'F') f++;
      });
      sData.presentCount = p;
      sData.absentCount = f;
      const cellP = overlay.querySelector(`#tot-p-${enrollmentId}`);
      const cellF = overlay.querySelector(`#tot-f-${enrollmentId}`);
      if (cellP) cellP.textContent = p;
      if (cellF) cellF.textContent = f;
    };

    // Alternar celdas al hacer clic
    const modalBody = overlay.querySelector('#att-modal-body');
    modalBody.onclick = (e) => {
      const btn = e.target.closest('.att-cell-btn');
      if (!btn) return;
      const enrollmentId = btn.getAttribute('data-enrollment-id');
      const jIdx = parseInt(btn.getAttribute('data-jidx'), 10);
      const sData = workingData.marksByEnrollment[enrollmentId];
      if (!sData || !sData.marks[jIdx]) return;

      const curState = String(sData.marks[jIdx].estadoRegistro || '—').toUpperCase();
      let nextState = 'P';
      if (curState === 'P') nextState = 'F';
      else if (curState === 'F') nextState = 'J';
      else if (curState === 'J') nextState = '—';
      else nextState = 'P';

      sData.marks[jIdx].estadoRegistro = nextState;
      sData.marks[jIdx].state = nextState;

      btn.textContent = nextState;
      btn.className = `att-cell-btn ${nextState === 'P' ? 'att-P' : (nextState === 'F' ? 'att-F' : (nextState === 'J' ? 'att-J' : 'att-dash'))}`;
      recalculateTotalsForStudent(enrollmentId);
    };

    // Marcar Todos Presente
    overlay.querySelector('#btn-modal-all-p').onclick = () => {
      workingData.sessions.forEach((s, jIdx) => {
        rows.forEach(r => {
          const id = r.enrollmentId || r.id;
          if (workingData.marksByEnrollment[id]?.marks[jIdx]) {
            workingData.marksByEnrollment[id].marks[jIdx].estadoRegistro = 'P';
            workingData.marksByEnrollment[id].marks[jIdx].state = 'P';
          }
        });
      });
      rows.forEach(r => recalculateTotalsForStudent(r.enrollmentId || r.id));
      modalBody.innerHTML = renderTableContent();
    };

    // Demo
    overlay.querySelector('#btn-modal-demo-att').onclick = () => {
      const demoResult = this.etapa2DataService.generateDemoAttendance(groupId, udNum, rows);
      if (demoResult) {
        workingData.sessions = demoResult.sessions;
        workingData.marksByEnrollment = demoResult.marksByEnrollment;
        modalBody.innerHTML = renderTableContent();
      }
    };

    // Limpiar Todo
    overlay.querySelector('#btn-modal-clear-att').onclick = () => {
      workingData.sessions.forEach((s, jIdx) => {
        rows.forEach(r => {
          const id = r.enrollmentId || r.id;
          if (workingData.marksByEnrollment[id]?.marks[jIdx]) {
            workingData.marksByEnrollment[id].marks[jIdx].estadoRegistro = '—';
            workingData.marksByEnrollment[id].marks[jIdx].state = '—';
          }
        });
      });
      rows.forEach(r => recalculateTotalsForStudent(r.enrollmentId || r.id));
      modalBody.innerHTML = renderTableContent();
    };

    const closeModal = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    overlay.querySelector('#btn-close-att-modal').onclick = closeModal;
    overlay.querySelector('#btn-cancel-att-modal').onclick = closeModal;

    overlay.querySelector('#btn-save-att-modal').onclick = async () => {
      this.etapa2DataService.saveAttendance(groupId, udNum, workingData);
      closeModal();
      Notifications.show(`✓ Asistencia guardada para UD ${udNum} (${rows.length} estudiantes).`, 'success');
      await this.render(container);
    };

    overlay.querySelector('#btn-save-generate-att-modal').onclick = async () => {
      this.etapa2DataService.saveAttendance(groupId, udNum, workingData);
      closeModal();
      Notifications.show(`✓ Asistencia guardada. Generando PDF oficial…`, 'success');
      await this.render(container);
      await this._generateTmplAttendance(container);
    };
  }

  async _openEvaluationModal(container) {
    const groupId = this.selectedGroupId;
    if (!groupId) {
      Notifications.show('Seleccione un grupo académico primero.', 'warning');
      return;
    }
    const udNum = this.selectedEvaluacionUD || 1;
    let rosterContext;
    try {
      rosterContext = await this.adminService.buildGroupRoster(groupId);
    } catch (err) {
      Notifications.show('Error al obtener estudiantes: ' + err.message, 'error');
      return;
    }
    const { rows, group } = rosterContext;
    if (!rows || rows.length === 0) {
      Notifications.show('El grupo no tiene estudiantes matriculados.', 'warning');
      return;
    }

    let evalData = this.etapa2DataService.getEvaluation(groupId, udNum);
    if (!evalData || !evalData.evaluationsByEnrollment) {
      const indicators = this.etapa2DataService.getDefaultIndicators(udNum);
      const evaluationsByEnrollment = {};
      rows.forEach(r => {
        const id = r.enrollmentId || r.id;
        evaluationsByEnrollment[id] = {
          evaluations: [0, 1, 2, 3, 4].map(() => ({ ia1: null, ia2: null, ia3: null, score: null, recovery: null })),
          finalLogro: null
        };
      });
      evalData = { groupId, udNum, indicators, evaluationsByEnrollment };
    }

    const workingData = JSON.parse(JSON.stringify(evalData));

    const overlay = document.createElement('div');
    overlay.className = 'etapa2-modal-overlay';
    overlay.id = 'etapa2-evaluation-modal';

    const renderTableContent = () => {
      const { indicators, evaluationsByEnrollment } = workingData;
      let theadHtml = `
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th class="col-sticky-student">Estudiante (${rows.length})</th>
          <th style="width: 80px; text-align: center;" title="${escapeHtml(indicators[0] || 'IL1')}">IL 1</th>
          <th style="width: 80px; text-align: center;" title="${escapeHtml(indicators[1] || 'IL2')}">IL 2</th>
          <th style="width: 80px; text-align: center;" title="${escapeHtml(indicators[2] || 'IL3')}">IL 3</th>
          <th style="width: 80px; text-align: center;" title="${escapeHtml(indicators[3] || 'IL4')}">IL 4</th>
          <th style="width: 80px; text-align: center;" title="${escapeHtml(indicators[4] || 'IL5')}">IL 5</th>
          <th style="width: 90px; text-align: center; background: #ecfdf5; color: #065f46;" title="Promedio de los 5 Indicadores">Logro Final</th>
          <th style="width: 95px; text-align: center;">Estado</th>
        </tr>`;

      let tbodyHtml = '';
      rows.forEach((student, sIdx) => {
        const id = student.enrollmentId || student.id;
        const sData = evaluationsByEnrollment[id] || { evaluations: [], finalLogro: null };
        const logro = sData.finalLogro;
        const logroFormatted = logro != null ? String(logro).padStart(2, '0') : '—';
        const isPass = logro != null && logro >= 13;
        const statusBadge = logro != null 
          ? (isPass ? '<span class="badge bg-success">Aprobado</span>' : '<span class="badge bg-danger">Desaprobado</span>')
          : '<span class="badge bg-light text-secondary border">Sin evaluar</span>';

        tbodyHtml += `
          <tr data-student-id="${id}">
            <td style="text-align: center; color: #64748b; font-weight: 600;">${sIdx + 1}</td>
            <td class="col-sticky-student fw-bold text-dark" style="font-size: 0.84rem;">
              <div class="text-truncate" title="${escapeHtml(student.studentName)}">${escapeHtml(student.studentName)}</div>
              <div class="text-muted fw-normal" style="font-size: 0.72rem;">${escapeHtml(student.document || student.numeroDocumento || '')}</div>
            </td>`;

        for (let k = 0; k < 5; k++) {
          const ev = sData.evaluations[k] || { score: null };
          const val = ev.score != null ? ev.score : (ev.ia1 != null ? ev.ia1 : '');
          const cls = val === '' || val == null ? 'eval-empty' : (Number(val) >= 13 ? 'eval-pass' : 'eval-fail');
          tbodyHtml += `
            <td style="text-align: center; padding: 4px;">
              <input type="number" min="0" max="20" step="1" 
                class="form-control form-control-sm eval-grade-input ${cls}" 
                data-enrollment-id="${id}" data-kidx="${k}" 
                value="${val !== '' && val != null ? String(val).padStart(2, '0') : ''}" 
                placeholder="—" />
            </td>`;
        }

        tbodyHtml += `
            <td style="text-align: center; font-weight: 800; font-size: 1.05rem; background: #ecfdf5; color: ${isPass ? '#15803d' : (logro != null ? '#b91c1c' : '#64748b')};" id="logro-${id}">
              ${logroFormatted}
            </td>
            <td style="text-align: center;" id="status-${id}">
              ${statusBadge}
            </td>
          </tr>`;
      });

      return `
        <table class="etapa2-table">
          <thead>${theadHtml}</thead>
          <tbody>${tbodyHtml}</tbody>
        </table>`;
    };

    overlay.innerHTML = `
      <div class="etapa2-modal-dialog">
        <div class="etapa2-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-success px-3 py-1.5 fw-bold" style="background: #059669 !important; font-size: 0.9rem;">
              <i class="bi bi-clipboard-check me-1"></i>Calificaciones UD ${udNum}
            </span>
            <h5 class="m-0 fw-bold text-dark" style="font-size: 1.15rem;">
              Grupo: <span class="text-success">${escapeHtml(group.visibleCode)}</span>
            </h5>
            <span class="badge bg-light text-secondary border ms-2">${rows.length} Estudiantes · Escala Vigesimal (00-20)</span>
          </div>
          <button type="button" class="btn-close" id="btn-close-eval-modal" aria-label="Cerrar"></button>
        </div>

        <div class="d-flex flex-wrap align-items-center justify-content-between p-2.5 px-3 bg-light border-bottom gap-2">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="small fw-bold text-secondary text-uppercase tracking-wider" style="font-size: 0.78rem;">Herramientas:</span>
            <button type="button" class="btn btn-sm btn-outline-success fw-bold" id="btn-modal-demo-eval" title="Generar notas vigesimales de prueba realistas">
              <i class="bi bi-lightning-charge me-1"></i>Llenar Notas Demo
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-modal-clear-eval" title="Borrar todas las calificaciones">
              <i class="bi bi-eraser me-1"></i>Limpiar Todo
            </button>
          </div>
          <div class="d-flex align-items-center gap-3 small">
            <span class="badge bg-success-subtle text-success border border-success fw-semibold">>= 13 Aprobatorio (Verde)</span>
            <span class="badge bg-danger-subtle text-danger border border-danger fw-semibold">< 13 Desaprobatorio (Rojo)</span>
            <span class="text-secondary fw-bold">Logro: Promedio IL1..IL5</span>
          </div>
        </div>

        <div class="etapa2-modal-body" id="eval-modal-body">
          ${renderTableContent()}
        </div>

        <div class="etapa2-modal-footer">
          <div class="small text-secondary">
            <i class="bi bi-info-circle me-1 text-success"></i>Ingrese notas numéricas del 00 al 20. El Logro Final se recalcula instantáneamente.
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-outline-secondary fw-semibold px-3" id="btn-cancel-eval-modal">Cancelar</button>
            <button type="button" class="btn btn-primary fw-bold px-4" id="btn-save-eval-modal" style="background: #1d4ed8; border-color: #1d4ed8;">
              <i class="bi bi-floppy-fill me-1"></i>Guardar Calificaciones
            </button>
            <button type="button" class="btn btn-success fw-bold px-4" id="btn-save-generate-eval-modal" style="background: #059669; border-color: #059669;">
              <i class="bi bi-file-earmark-pdf-fill me-1"></i>Guardar y Emitir PDF
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const recalculateFinalForStudent = (enrollmentId) => {
      const sData = workingData.evaluationsByEnrollment[enrollmentId];
      if (!sData) return;
      let sum = 0, count = 0;
      sData.evaluations.forEach(ev => {
        const val = ev.score != null ? ev.score : (ev.ia1 != null ? ev.ia1 : null);
        if (val != null && !isNaN(val)) {
          sum += Number(val);
          count++;
        }
      });
      const finalLogro = count > 0 ? Math.round(sum / count) : null;
      sData.finalLogro = finalLogro;

      const logroEl = overlay.querySelector(`#logro-${enrollmentId}`);
      const statusEl = overlay.querySelector(`#status-${enrollmentId}`);
      if (logroEl) {
        logroEl.textContent = finalLogro != null ? String(finalLogro).padStart(2, '0') : '—';
        logroEl.style.color = finalLogro != null ? (finalLogro >= 13 ? '#15803d' : '#b91c1c') : '#64748b';
      }
      if (statusEl) {
        statusEl.innerHTML = finalLogro != null
          ? (finalLogro >= 13 ? '<span class="badge bg-success">Aprobado</span>' : '<span class="badge bg-danger">Desaprobado</span>')
          : '<span class="badge bg-light text-secondary border">Sin evaluar</span>';
      }
    };

    const modalBody = overlay.querySelector('#eval-modal-body');
    modalBody.oninput = (e) => {
      const input = e.target.closest('.eval-grade-input');
      if (!input) return;
      const enrollmentId = input.getAttribute('data-enrollment-id');
      const kidx = parseInt(input.getAttribute('data-kidx'), 10);
      let rawVal = input.value.trim();

      let num = rawVal === '' ? null : Number(rawVal);
      if (num != null) {
        if (isNaN(num)) num = null;
        else num = Math.min(20, Math.max(0, Math.round(num)));
      }

      const sData = workingData.evaluationsByEnrollment[enrollmentId];
      if (sData && sData.evaluations[kidx]) {
        sData.evaluations[kidx].score = num;
        sData.evaluations[kidx].ia1 = num;
        sData.evaluations[kidx].ia2 = num;
        sData.evaluations[kidx].ia3 = num;
      }

      input.className = `form-control form-control-sm eval-grade-input ${num == null ? 'eval-empty' : (num >= 13 ? 'eval-pass' : 'eval-fail')}`;
      recalculateFinalForStudent(enrollmentId);
    };

    overlay.querySelector('#btn-modal-demo-eval').onclick = () => {
      const demoResult = this.etapa2DataService.generateDemoEvaluation(groupId, udNum, rows);
      if (demoResult) {
        workingData.indicators = demoResult.indicators;
        workingData.evaluationsByEnrollment = demoResult.evaluationsByEnrollment;
        modalBody.innerHTML = renderTableContent();
      }
    };

    overlay.querySelector('#btn-modal-clear-eval').onclick = () => {
      rows.forEach(r => {
        const id = r.enrollmentId || r.id;
        workingData.evaluationsByEnrollment[id] = {
          evaluations: [0, 1, 2, 3, 4].map(() => ({ ia1: null, ia2: null, ia3: null, score: null, recovery: null })),
          finalLogro: null
        };
      });
      modalBody.innerHTML = renderTableContent();
    };

    const closeModal = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    overlay.querySelector('#btn-close-eval-modal').onclick = closeModal;
    overlay.querySelector('#btn-cancel-eval-modal').onclick = closeModal;

    overlay.querySelector('#btn-save-eval-modal').onclick = async () => {
      this.etapa2DataService.saveEvaluation(groupId, udNum, workingData);
      closeModal();
      Notifications.show(`✓ Calificaciones guardadas para UD ${udNum} (${rows.length} estudiantes).`, 'success');
      await this.render(container);
    };

    overlay.querySelector('#btn-save-generate-eval-modal').onclick = async () => {
      this.etapa2DataService.saveEvaluation(groupId, udNum, workingData);
      closeModal();
      Notifications.show(`✓ Calificaciones guardadas. Generando registro auxiliar PDF…`, 'success');
      await this.render(container);
      await this._generateTmplEvaluation(container);
    };
  }

  async _preloadDemoAttendance(container) {
    const groupId = this.selectedGroupId;
    if (!groupId) {
      Notifications.show('Seleccione un grupo académico primero.', 'warning');
      return;
    }
    const udNum = this.selectedAsistenciaUD || 1;
    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      this.etapa2DataService.generateDemoAttendance(groupId, udNum, rosterContext.rows);
      Notifications.show(`✓ Asistencia de prueba generada para UD ${udNum} (${rosterContext.rows.length} estudiantes). Generando PDF…`, 'success');
      await this.render(container);
      await this._generateTmplAttendance(container);
    } catch (err) {
      Notifications.show('Error al precargar demo: ' + err.message, 'error');
    }
  }

  async _clearAttendanceData(container) {
    const groupId = this.selectedGroupId;
    if (!groupId) return;
    const udNum = this.selectedAsistenciaUD || 1;
    this.etapa2DataService.clearAttendance(groupId, udNum);
    Notifications.show(`Asistencia limpiada para UD ${udNum}.`, 'info');
    await this.render(container);
  }

  async _preloadDemoEvaluation(container) {
    const groupId = this.selectedGroupId;
    if (!groupId) {
      Notifications.show('Seleccione un grupo académico primero.', 'warning');
      return;
    }
    const udNum = this.selectedEvaluacionUD || 1;
    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      this.etapa2DataService.generateDemoEvaluation(groupId, udNum, rosterContext.rows);
      Notifications.show(`✓ Calificaciones de prueba generadas para UD ${udNum} (${rosterContext.rows.length} estudiantes). Generando PDF…`, 'success');
      await this.render(container);
      await this._generateTmplEvaluation(container);
    } catch (err) {
      Notifications.show('Error al precargar demo: ' + err.message, 'error');
    }
  }

  async _clearEvaluationData(container) {
    const groupId = this.selectedGroupId;
    if (!groupId) return;
    const udNum = this.selectedEvaluacionUD || 1;
    this.etapa2DataService.clearEvaluation(groupId, udNum);
    Notifications.show(`Calificaciones limpiadas para UD ${udNum}.`, 'info');
    await this.render(container);
  }

  async _generateTmpl18(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Consolidado de EFSRT (TMPL-18)…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-success mb-2" role="status"></div><p class="fw-bold text-dark">Generando Consolidado de EFSRT en PDF…</p></div>`;
    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      const { rows, group } = rosterContext;
      const capacity = 40;
      let blob;
      const pageCount = Math.max(1, Math.ceil(rows.length / capacity));

      if (rows.length <= capacity) {
        blob = await this.pdfEngine.renderTMPL18({
          ...rosterContext,
          studentsList: rows,
          rows,
          demoMode: isDemoRuntime()
        });
      } else {
        const chunks = [];
        for (let i = 0; i < rows.length; i += capacity) {
          chunks.push(rows.slice(i, i + capacity));
        }
        const { PDFDocument, StandardFonts, rgb } = (typeof window !== 'undefined' && window.PDFLib)
          ? window.PDFLib
          : await import('pdf-lib');
        const mergedDoc = await PDFDocument.create();
        const boldFont = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

        for (let idx = 0; idx < chunks.length; idx++) {
          const chunk = chunks[idx];
          const singleBlob = await this.pdfEngine.renderTMPL18({
            ...rosterContext,
            studentsList: chunk,
            rows: chunk,
            demoMode: isDemoRuntime()
          });
          const chunkDoc = await PDFDocument.load(await singleBlob.arrayBuffer());
          const [copiedPage] = await mergedDoc.copyPages(chunkDoc, [0]);
          mergedDoc.addPage(copiedPage);

          const startNum = idx * capacity + 1;
          const endNum = startNum + chunk.length - 1;
          copiedPage.drawText(`FOLIO ${idx + 1} DE ${chunks.length} · ESTUDIANTES ${startNum} AL ${endNum} (TOTAL GRUPO: ${rows.length})`, {
            x: 40,
            y: 12,
            size: 7.5,
            font: boldFont,
            color: rgb(0.1, 0.4, 0.2)
          });
        }
        const mergedBytes = await mergedDoc.save();
        blob = new Blob([mergedBytes], { type: 'application/pdf' });
      }

      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}EFSRT_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Consolidado de EFSRT — ${group.visibleCode}`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Consolidado EFSRT generado con éxito (${rows.length} estudiantes, ${pageCount} folio(s)).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar EFSRT', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el consolidado de EFSRT: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl19(container) {
    const groupId = this.selectedGroupId;
    const workspace = container.querySelector('#doc-render-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo académico primero.</span>';
      return;
    }
    if (status) status.innerHTML = `<span class="text-primary fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Acta Oficial de Evaluación Modular (TMPL-19)…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-2" role="status"></div><p class="fw-bold text-dark">Generando Acta Oficial de Evaluación Modular en PDF…</p></div>`;
    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      const { rows, group, program } = rosterContext;
      let effectiveModule = rosterContext.module;
      if (!effectiveModule || !effectiveModule.nombre) {
        try {
          const meta = await this.adminService.getAdminMetadata();
          effectiveModule = (meta.modules || []).find(m => m.programaId === group.programaId)
            || { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
        } catch {
          effectiveModule = { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
        }
      }
      const capacity = 40;
      let blob;
      const pageCount = Math.max(1, Math.ceil(rows.length / capacity));

      if (rows.length <= capacity) {
        blob = await this.pdfEngine.renderTMPL19({
          ...rosterContext,
          module: effectiveModule,
          studentsList: rows,
          rows,
          demoMode: isDemoRuntime()
        });
      } else {
        const chunks = [];
        for (let i = 0; i < rows.length; i += capacity) {
          chunks.push(rows.slice(i, i + capacity));
        }
        const { PDFDocument } = (typeof window !== 'undefined' && window.PDFLib)
          ? window.PDFLib
          : await import('pdf-lib');
        const mergedDoc = await PDFDocument.create();

        for (let idx = 0; idx < chunks.length; idx++) {
          const chunk = chunks[idx];
          const singleBlob = await this.pdfEngine.renderTMPL19({
            ...rosterContext,
            module: effectiveModule,
            studentsList: chunk,
            rows: chunk,
            demoMode: isDemoRuntime()
          });
          const chunkDoc = await PDFDocument.load(await singleBlob.arrayBuffer());
          const copiedPages = await mergedDoc.copyPages(chunkDoc, chunkDoc.getPageIndices());
          copiedPages.forEach(p => mergedDoc.addPage(p));
        }
        const mergedBytes = await mergedDoc.save();
        blob = new Blob([mergedBytes], { type: 'application/pdf' });
      }

      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}ACTA_MODULAR_${group.visibleCode}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Acta Oficial de Evaluación Modular — ${group.visibleCode}`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Acta oficial generada con éxito (${rows.length} estudiantes, ${pageCount * 2} páginas físicas A3).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar Acta Modular', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el acta oficial: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl20(container) {
    const groupId = this.selectedGroupId;
    const studentId = this.selectedEtapa4StudentId;
    const workspace = container.querySelector('#doc-document-workspace');
    const status = container.querySelector('#doc-group-status');
    if (!groupId || !studentId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo y un estudiante.</span>';
      return;
    }
    if (status) status.innerHTML = `<span class="text-primary fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Certificado Modular Oficial (TMPL-20)…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-2" role="status"></div><p class="fw-bold text-dark">Generando Certificado Modular en PDF…</p></div>`;

    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      const { group, program } = rosterContext;
      const student = rosterContext.rows.find(s => String(s.studentId || s.id) === String(studentId)) || rosterContext.rows[0];

      let effectiveModule = rosterContext.module;
      if (!effectiveModule || !effectiveModule.nombre) {
        try {
          const meta = await this.adminService.getAdminMetadata();
          effectiveModule = (meta.modules || []).find(m => m.programaId === group.programaId)
            || { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
        } catch {
          effectiveModule = { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
        }
      }

      const regData = this.etapa4DataService.getOrGenerateCertificado(groupId, studentId, student, program, effectiveModule);

      const resolvedFieldSet = {
        'student.fullName': { status: 'RESOLVED', value: (student.studentName || student.fullName || 'ESTUDIANTE').toUpperCase() },
        'module.name': { status: 'RESOLVED', value: (effectiveModule.nombre || effectiveModule.name || 'MÓDULO FORMATIVO').toUpperCase() },
        'program.name': { status: 'RESOLVED', value: (program?.nombre || 'PROGRAMA DE ESTUDIOS').toUpperCase() },
        'institution.name': { status: 'RESOLVED', value: (rosterContext.institution?.nombreInstitucion || rosterContext.institution?.nombre || "CETPRO 'SAN PABLO'").toUpperCase() },
        'curriculum.module.hours': { status: 'RESOLVED', value: String(effectiveModule.horas || regData.hours || '320') },
        'curriculum.module.credits': { status: 'RESOLVED', value: String(effectiveModule.creditos || regData.credits || '12') },
        'document.emissionDate': { status: 'RESOLVED', value: regData.emissionDate || 'Lima, 20 de Diciembre de 2026' },
        'document.registerCode': { status: 'RESOLVED', value: regData.registerCode || 'CM-2026-0042' },
        'group.ciclo': { status: 'RESOLVED', value: regData.ciclo || group.ciclo || program?.ciclo || 'AUXILIAR TÉCNICO' },
        'group.modalidad': { status: 'RESOLVED', value: regData.modalidad || group.modalidad || 'PRESENCIAL' },
        'curriculum.unit.competence': { status: 'RESOLVED', value: regData.competence || 'Competencia técnica específica' },
        'document.registryBook': { status: 'RESOLVED', value: regData.registryBook || '01' },
        'document.registryFolio': { status: 'RESOLVED', value: regData.registryFolio || '15' },
        'document.registryNumber': { status: 'RESOLVED', value: regData.registryNumber || '0042' },
        'document.registryDate': { status: 'RESOLVED', value: regData.registryDate || '20/12/2026' }
      };

      const rows = (regData.units || []).slice(0, 8);

      const blob = await this.pdfEngine.renderTMPL20({
        resolvedFieldSet,
        rows,
        counts: { detailRows: rows.length },
        demoMode: isDemoRuntime()
      });

      const safeStudentName = (student.studentName || 'Estudiante').replace(/[^A-Za-z0-9_-]/g, '_');
      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}CERTIFICADO_MODULAR_${safeStudentName}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Certificado Modular Oficial — ${student.studentName || 'Estudiante'}`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Certificado Modular generado con éxito (2 páginas físicas A4 landscape, ${rows.length} UDs).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar Certificado Modular', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el certificado modular: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _generateTmpl21(container) {
    const role = AuthService.getCurrentRole();
    const status = container.querySelector('#doc-group-status');
    if (!AuthService.canEmitTemplate('TMPL-21')) {
      Notifications.warning('La emisión del Título Técnico Oficial (TMPL-21) requiere atribución exclusiva de la Dirección General con refrendo del MINEDU. Por favor conmute al perfil de Director.');
      if (status) status.innerHTML = '<span class="text-warning fw-bold"><i class="bi bi-shield-lock me-1"></i>Emisión bloqueada: Requiere perfil de Dirección General.</span>';
      return;
    }
    const groupId = this.selectedGroupId;
    const studentId = this.selectedEtapa4StudentId;
    const workspace = container.querySelector('#doc-document-workspace');
    if (!groupId || !studentId) {
      if (status) status.innerHTML = '<span class="text-danger fw-bold"><i class="bi bi-exclamation-circle me-1"></i>Seleccione un grupo y un estudiante.</span>';
      return;
    }
    if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="spinner-border spinner-border-sm me-1"></i>Generando Título Técnico Oficial (TMPL-21)…</span>`;
    if (workspace) workspace.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-success mb-2" role="status"></div><p class="fw-bold text-dark">Generando Título Técnico Oficial en PDF…</p></div>`;

    try {
      const rosterContext = await this.adminService.buildGroupRoster(groupId);
      const { group, program } = rosterContext;
      const student = rosterContext.rows.find(s => String(s.studentId || s.id) === String(studentId)) || rosterContext.rows[0];

      const regData = this.etapa4DataService.getOrGenerateTitulo(groupId, studentId, student, program);

      const progTitle = program?.nombre ? program.nombre.toUpperCase() : 'PELUQUERÍA Y BARBERÍA';
      const ciclo = program?.ciclo || 'AUXILIAR TÉCNICO';

      const resolvedFieldSet = {
        'student.fullName': { status: 'RESOLVED', value: (student.studentName || student.fullName || 'ESTUDIANTE').toUpperCase() },
        'document.officialTitleText': { status: 'RESOLVED', value: regData.officialTitleText || `${ciclo.toUpperCase()} EN ${progTitle}` },
        'document.emissionDate': { status: 'RESOLVED', value: regData.emissionDate || 'Dado en Lima, a los 20 días del mes de Diciembre del 2026' },
        'document.registerCode': { status: 'RESOLVED', value: regData.registerCode || 'MINEDU-REG-2026-84920' },
        'document.registryAsiento': { status: 'RESOLVED', value: regData.registryAsiento || 'Inscrito en el Libro de Títulos N° 01, Folio 15, Registro N° 2026-042 con fecha 20/12/2026.' }
      };

      const blob = await this.pdfEngine.renderTMPL21({
        resolvedFieldSet,
        rows: [],
        counts: {},
        demoMode: isDemoRuntime()
      });

      const safeStudentName = (student.studentName || 'Estudiante').replace(/[^A-Za-z0-9_-]/g, '_');
      const fileName = `${isDemoRuntime() ? 'DEMO_' : ''}TITULO_TECNICO_${safeStudentName}.pdf`;
      this._displayPdfInWorkspace(container, blob, fileName, `Título Técnico Oficial — ${student.studentName || 'Estudiante'}`);
      if (status) status.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Título Técnico generado con éxito (2 páginas físicas A4 landscape, registro MINEDU oficial).</span>`;
    } catch (error) {
      console.error('[DocumentsView] Error al generar Título Técnico', error);
      if (status) status.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Error: ${escapeHtml(error.message)}</span>`;
      if (workspace) workspace.innerHTML = `<div class="alert alert-danger">No se pudo generar el título técnico: ${escapeHtml(error.message)}</div>`;
    }
  }

  async _preloadDemoEtapa4(container) {
    const groupId = this.selectedGroupId;
    const studentId = this.selectedEtapa4StudentId;
    if (!groupId || !studentId) {
      Notifications.show('Seleccione un grupo y un estudiante primero.', 'warning');
      return;
    }

    let rosterContext;
    try {
      rosterContext = await this.adminService.buildGroupRoster(groupId);
    } catch (err) {
      Notifications.show('Error al obtener datos: ' + err.message, 'error');
      return;
    }

    const { group, program } = rosterContext;
    const student = rosterContext.rows.find(s => String(s.studentId || s.id) === String(studentId)) || rosterContext.rows[0];

    let effectiveModule = rosterContext.module;
    if (!effectiveModule || !effectiveModule.nombre) {
      try {
        const meta = await this.adminService.getAdminMetadata();
        effectiveModule = (meta.modules || []).find(m => m.programaId === group.programaId)
          || { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
      } catch {
        effectiveModule = { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
      }
    }

    if (this.selectedTemplateId === 'TMPL-20') {
      this.etapa4DataService.generateDemoCertificado(groupId, studentId, student, program, effectiveModule);
      Notifications.show('Datos demo precargados para Certificado Modular (Libro, Folio y UDs).', 'success');
    } else if (this.selectedTemplateId === 'TMPL-21') {
      this.etapa4DataService.generateDemoTitulo(groupId, studentId, student, program);
      Notifications.show('Datos demo precargados para Título Técnico (Código REGISTRA y Asiento).', 'success');
    }

    const summaryBox = container.querySelector('#doc-etapa4-student-summary-container');
    if (summaryBox) {
      summaryBox.innerHTML = this._renderEtapa4StudentSummary(group);
    }

    const btn20 = container.querySelector('#doc-generate-tmpl20-btn');
    if (btn20) btn20.disabled = false;
    const btn21 = container.querySelector('#doc-generate-tmpl21-btn');
    if (btn21) btn21.disabled = false;
  }

  async _openEtapa4Modal(container) {
    const groupId = this.selectedGroupId;
    const studentId = this.selectedEtapa4StudentId;
    if (!groupId || !studentId) {
      Notifications.show('Seleccione un grupo y un estudiante primero.', 'warning');
      return;
    }

    let rosterContext;
    try {
      rosterContext = await this.adminService.buildGroupRoster(groupId);
    } catch (err) {
      Notifications.show('Error al obtener datos: ' + err.message, 'error');
      return;
    }

    const { group, program } = rosterContext;
    const student = rosterContext.rows.find(s => String(s.studentId || s.id) === String(studentId)) || rosterContext.rows[0];
    let effectiveModule = rosterContext.module;
    if (!effectiveModule || !effectiveModule.nombre) {
      try {
        const meta = await this.adminService.getAdminMetadata();
        effectiveModule = (meta.modules || []).find(m => m.programaId === group.programaId)
          || { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
      } catch {
        effectiveModule = { id: 'MOD-01', nombre: `Módulo Formativo Oficial — ${program?.nombre || 'General'}` };
      }
    }

    const isTmpl20 = this.selectedTemplateId === 'TMPL-20';
    const isTmpl21 = this.selectedTemplateId === 'TMPL-21';

    const overlay = document.createElement('div');
    overlay.id = 'etapa4-modal-overlay';
    overlay.className = 'etapa4-modal-overlay etapa2-modal-overlay';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 1rem;';

    if (isTmpl20) {
      const currentData = this.etapa4DataService.getOrGenerateCertificado(groupId, studentId, student, program, effectiveModule);
      const units = currentData.units || [];

      let unitsRowsHtml = '';
      for (let i = 0; i < 6; i++) {
        const u = units[i] || { 'curriculum.unit.name': `Unidad Didáctica ${i + 1}`, 'curriculum.unit.credits': '3', 'curriculum.unit.hours': '60', 'curriculum.unit.capacity': `Capacidad terminal ${i + 1}`, 'evaluation.unitResult': '16' };
        unitsRowsHtml += `
          <tr>
            <td style="text-align: center; font-weight: bold; width: 35px;">${i + 1}</td>
            <td><input type="text" class="form-control form-control-sm modal-unit-name" value="${escapeHtml(u['curriculum.unit.name'] || '')}" placeholder="Nombre de Unidad Didáctica"></td>
            <td style="width: 70px;"><input type="number" class="form-control form-control-sm text-center modal-unit-credits" value="${escapeHtml(u['curriculum.unit.credits'] || '3')}" min="1" max="10"></td>
            <td style="width: 75px;"><input type="number" class="form-control form-control-sm text-center modal-unit-hours" value="${escapeHtml(u['curriculum.unit.hours'] || '60')}" min="10" max="300"></td>
            <td><input type="text" class="form-control form-control-sm modal-unit-capacity" value="${escapeHtml(u['curriculum.unit.capacity'] || '')}" placeholder="Capacidad terminal / Indicador"></td>
            <td style="width: 75px;"><input type="number" class="form-control form-control-sm text-center fw-bold text-primary modal-unit-result" value="${escapeHtml(u['evaluation.unitResult'] || '16')}" min="0" max="20"></td>
          </tr>
        `;
      }

      overlay.innerHTML = `
        <div class="card shadow-lg border-0" style="max-width: 900px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden;">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2.5 px-3">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-white text-primary fw-bold">TMPL-20</span>
              <h5 class="m-0 fw-bold fs-6"><i class="bi bi-pencil-square me-1"></i>Datos Registrales: Certificado Modular Oficial</h5>
            </div>
            <button type="button" class="btn-close btn-close-white" id="modal-etapa4-close-btn" aria-label="Cerrar"></button>
          </div>
          <div class="card-body p-3" style="overflow-y: auto;">
            <div class="alert alert-primary py-2 px-3 mb-3 small d-flex align-items-center justify-content-between">
              <div>
                <strong>Estudiante:</strong> ${escapeHtml(student.studentName || 'Estudiante')} (${student.numeroDocumento || 'DNI'}) · <strong>Módulo:</strong> ${escapeHtml(effectiveModule.nombre || '')}
              </div>
              <span class="badge bg-primary">MINEDU Oficial</span>
            </div>
            
            <h6 class="fw-bold text-dark mb-2" style="font-size: 0.9rem;"><i class="bi bi-journal-bookmark me-1 text-primary"></i>Datos de Foliación y Registro (Reverso)</h6>
            <div class="row g-2 mb-3">
              <div class="col-md-3">
                <label class="form-label small fw-bold text-dark mb-1">Código Certificado:</label>
                <input id="modal-e4-reg-code" class="form-control form-control-sm" value="${escapeHtml(currentData.registerCode || 'CM-2026-0042')}">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-dark mb-1">Fecha Emisión (Anverso):</label>
                <input id="modal-e4-emission-date" class="form-control form-control-sm" value="${escapeHtml(currentData.emissionDate || 'Lima, 20 de Diciembre de 2026')}">
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-bold text-dark mb-1">Libro N°:</label>
                <input id="modal-e4-book" class="form-control form-control-sm text-center" value="${escapeHtml(currentData.registryBook || '01')}">
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-bold text-dark mb-1">Folio N°:</label>
                <input id="modal-e4-folio" class="form-control form-control-sm text-center" value="${escapeHtml(currentData.registryFolio || '15')}">
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-bold text-dark mb-1">Registro N°:</label>
                <input id="modal-e4-number" class="form-control form-control-sm text-center" value="${escapeHtml(currentData.registryNumber || '0042')}">
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-3">
                <label class="form-label small fw-bold text-dark mb-1">Fecha Registro (Reverso):</label>
                <input id="modal-e4-reg-date" class="form-control form-control-sm" value="${escapeHtml(currentData.registryDate || '20/12/2026')}">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-dark mb-1">Ciclo Formativo:</label>
                <input id="modal-e4-ciclo" class="form-control form-control-sm" value="${escapeHtml(currentData.ciclo || 'AUXILIAR TÉCNICO')}">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-dark mb-1">Modalidad:</label>
                <input id="modal-e4-modalidad" class="form-control form-control-sm" value="${escapeHtml(currentData.modalidad || 'PRESENCIAL')}">
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-dark mb-1">Competencia Modular:</label>
                <input id="modal-e4-competence" class="form-control form-control-sm" value="${escapeHtml(currentData.competence || 'Competencia técnica específica')}" maxlength="45">
              </div>
            </div>

            <h6 class="fw-bold text-dark mb-2" style="font-size: 0.9rem;"><i class="bi bi-list-check me-1 text-primary"></i>Unidades Didácticas Acreditadas y Calificaciones (Hasta 8 UDs)</h6>
            <div class="table-responsive border rounded mb-2">
              <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.82rem;">
                <thead class="table-light">
                  <tr>
                    <th style="width: 35px; text-align: center;">#</th>
                    <th>Unidad Didáctica</th>
                    <th style="width: 70px; text-align: center;">Créditos</th>
                    <th style="width: 75px; text-align: center;">Horas</th>
                    <th>Capacidad Terminal</th>
                    <th style="width: 75px; text-align: center;">Nota</th>
                  </tr>
                </thead>
                <tbody id="modal-etapa4-uds-body">
                  ${unitsRowsHtml}
                </tbody>
              </table>
            </div>
            <p class="text-muted small mb-0"><i class="bi bi-info-circle me-1"></i>Las notas se imprimirán en escala vigesimal (0..20) en el reverso oficial del certificado.</p>
          </div>
          <div class="card-footer bg-light d-flex justify-content-between align-items-center py-2 px-3">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" id="modal-e4-demo-btn">
              <i class="bi bi-lightning-charge me-1"></i>Cargar Sugeridos
            </button>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-secondary btn-sm fw-bold" id="modal-e4-cancel-btn">Cancelar</button>
              <button type="button" class="btn btn-primary btn-sm fw-bold px-3" id="modal-e4-save-btn">
                <i class="bi bi-save me-1"></i>Guardar Datos Registrales
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (isTmpl21) {
      const currentData = this.etapa4DataService.getOrGenerateTitulo(groupId, studentId, student, program);

      overlay.innerHTML = `
        <div class="card shadow-lg border-0" style="max-width: 750px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden;">
          <div class="card-header bg-success text-white d-flex justify-content-between align-items-center py-2.5 px-3">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-white text-success fw-bold">TMPL-21</span>
              <h5 class="m-0 fw-bold fs-6"><i class="bi bi-award-fill me-1"></i>Datos Registrales: Título Técnico Oficial</h5>
            </div>
            <button type="button" class="btn-close btn-close-white" id="modal-etapa4-close-btn" aria-label="Cerrar"></button>
          </div>
          <div class="card-body p-3" style="overflow-y: auto;">
            <div class="alert alert-success py-2 px-3 mb-3 small d-flex align-items-center justify-content-between">
              <div>
                <strong>Estudiante Titulado:</strong> ${escapeHtml(student.studentName || 'Estudiante')} (${student.numeroDocumento || 'DNI'})
              </div>
              <span class="badge bg-success">MINEDU Titulación</span>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-dark mb-1">Nombre Completo del Titulado (Anverso):</label>
              <input id="modal-e4-student-name" class="form-control" value="${escapeHtml((student.studentName || student.fullName || '').toUpperCase())}">
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-dark mb-1">Denominación Oficial del Título Otorgado (Anverso):</label>
              <input id="modal-e4-official-title" class="form-control" value="${escapeHtml(currentData.officialTitleText || `AUXILIAR TÉCNICO EN ${(program?.nombre || 'PROGRAMA').toUpperCase()}`)}">
              <div class="form-text small">Ejemplo: AUXILIAR TÉCNICO EN PELUQUERÍA Y BARBERÍA</div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label small fw-bold text-dark mb-1">Fecha de Expedición Formal (Anverso):</label>
                <input id="modal-e4-emission-date" class="form-control" value="${escapeHtml(currentData.emissionDate || 'Dado en Lima, a los 20 días del mes de Diciembre del 2026')}">
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-bold text-dark mb-1">Código del Registro Institucional / REGISTRA (Reverso):</label>
                <input id="modal-e4-reg-code" class="form-control" value="${escapeHtml(currentData.registerCode || 'MINEDU-REG-2026-84920')}">
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-dark mb-1">Asiento Registral Institucional (Reverso):</label>
              <textarea id="modal-e4-registry-asiento" class="form-control" rows="3">${escapeHtml(currentData.registryAsiento || 'Inscrito en el Libro de Títulos N° 01, Folio 15, Registro N° 2026-042 con fecha 20/12/2026.')}</textarea>
              <div class="form-text small">Constancia formal de inscripción en los libros institucionales del CETPRO y nómina ministerial.</div>
            </div>
          </div>
          <div class="card-footer bg-light d-flex justify-content-between align-items-center py-2 px-3">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" id="modal-e4-demo-btn">
              <i class="bi bi-lightning-charge me-1"></i>Cargar Sugeridos
            </button>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-secondary btn-sm fw-bold" id="modal-e4-cancel-btn">Cancelar</button>
              <button type="button" class="btn btn-success btn-sm fw-bold px-3" id="modal-e4-save-btn">
                <i class="bi bi-save me-1"></i>Guardar Datos Registrales
              </button>
            </div>
          </div>
        </div>
      `;
    }

    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.remove();
    };

    const closeBtn = overlay.querySelector('#modal-etapa4-close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;
    const cancelBtn = overlay.querySelector('#modal-e4-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const demoBtn = overlay.querySelector('#modal-e4-demo-btn');
    if (demoBtn) {
      demoBtn.onclick = () => {
        if (isTmpl20) {
          this.etapa4DataService.generateDemoCertificado(groupId, studentId, student, program, effectiveModule);
          closeModal();
          this._openEtapa4Modal(container);
          Notifications.show('Valores sugeridos cargados en el formulario.', 'info');
        } else if (isTmpl21) {
          this.etapa4DataService.generateDemoTitulo(groupId, studentId, student, program);
          closeModal();
          this._openEtapa4Modal(container);
          Notifications.show('Valores sugeridos cargados en el formulario.', 'info');
        }
      };
    }

    const saveBtn = overlay.querySelector('#modal-e4-save-btn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        if (isTmpl20) {
          const rows = overlay.querySelectorAll('#modal-etapa4-uds-body tr');
          const units = [];
          rows.forEach(r => {
            const name = r.querySelector('.modal-unit-name')?.value?.trim();
            const credits = r.querySelector('.modal-unit-credits')?.value?.trim() || '3';
            const hours = r.querySelector('.modal-unit-hours')?.value?.trim() || '60';
            const capacity = r.querySelector('.modal-unit-capacity')?.value?.trim() || '';
            const unitResult = r.querySelector('.modal-unit-result')?.value?.trim() || '16';
            if (name) {
              units.push({
                'curriculum.unit.name': name,
                'curriculum.unit.credits': credits,
                'curriculum.unit.hours': hours,
                'curriculum.unit.capacity': capacity,
                'evaluation.unitResult': unitResult
              });
            }
          });

          const payload = {
            registerCode: overlay.querySelector('#modal-e4-reg-code')?.value?.trim() || 'CM-2026-0001',
            emissionDate: overlay.querySelector('#modal-e4-emission-date')?.value?.trim() || 'Lima, 20 de Diciembre de 2026',
            registryBook: overlay.querySelector('#modal-e4-book')?.value?.trim() || '01',
            registryFolio: overlay.querySelector('#modal-e4-folio')?.value?.trim() || '15',
            registryNumber: overlay.querySelector('#modal-e4-number')?.value?.trim() || '0042',
            registryDate: overlay.querySelector('#modal-e4-reg-date')?.value?.trim() || '20/12/2026',
            ciclo: overlay.querySelector('#modal-e4-ciclo')?.value?.trim() || 'AUXILIAR TÉCNICO',
            modalidad: overlay.querySelector('#modal-e4-modalidad')?.value?.trim() || 'PRESENCIAL',
            competence: overlay.querySelector('#modal-e4-competence')?.value?.trim() || 'Competencia técnica específica',
            units
          };

          this.etapa4DataService.saveCertificado(groupId, studentId, payload);
          Notifications.show('Datos registrales del Certificado Modular guardados.', 'success');
        } else if (isTmpl21) {
          const payload = {
            studentName: overlay.querySelector('#modal-e4-student-name')?.value?.trim(),
            officialTitleText: overlay.querySelector('#modal-e4-official-title')?.value?.trim(),
            emissionDate: overlay.querySelector('#modal-e4-emission-date')?.value?.trim(),
            registerCode: overlay.querySelector('#modal-e4-reg-code')?.value?.trim(),
            registryAsiento: overlay.querySelector('#modal-e4-registry-asiento')?.value?.trim()
          };
          this.etapa4DataService.saveTitulo(groupId, studentId, payload);
          Notifications.show('Datos registrales del Título Técnico guardados.', 'success');
        }

        closeModal();

        // Actualizar resumen en pantalla
        const summaryBox = container.querySelector('#doc-etapa4-student-summary-container');
        if (summaryBox) {
          summaryBox.innerHTML = this._renderEtapa4StudentSummary(group);
        }
      };
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
