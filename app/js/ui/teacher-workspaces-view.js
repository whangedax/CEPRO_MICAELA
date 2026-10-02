/**
 * Espacios de Trabajo Pedagógicos Especializados del Docente
 * Elimina toda la contaminación visual de Secretaría (cero wizards de 3 pasos, cero buscadores de nóminas, cero etapas).
 * Proporciona interfaces directas, limpias y de un solo propósito para:
 * 1. Control de Asistencia Modular (#/asistencia)
 * 2. Registro Auxiliar de Calificaciones (#/evaluacion)
 * 3. Portada de Carpeta Pedagógica (#/portada)
 */

import { escapeHtml } from '../utils/dom-utils.js';
import { AuthService } from '../services/auth-service.js';
import { TeacherContextService } from '../services/teacher-context-service.js';
import { DocumentsView } from './documents-view.js';
import { SyncPackageService } from '../services/sync-package-service.js';
import { Layout } from './layout.js';

export class TeacherWorkspacesView {
  constructor() {
    this.docView = new DocumentsView();
    this.currentMode = 'asistencia'; // 'asistencia' | 'evaluacion' | 'portada'
    this.selectedAsistenciaUD = 1;
    this.selectedEvaluacionUD = 1;
    this.activeContainer = null;

    // Redirigir el render interno de DocumentsView a nuestro propio workspace
    this.docView.render = async (container) => {
      await this.renderCurrent(container || this.activeContainer);
    };

    // Suscribir a cambios de aula o especialidad
    TeacherContextService.subscribe(() => {
      if (this.activeContainer && document.body.contains(this.activeContainer)) {
        this.renderCurrent(this.activeContainer);
      }
    });
  }

  async _syncDocViewContext() {
    if (!this.docView._allGroups || this.docView._allGroups.length === 0) {
      try {
        this.docView._allGroups = await this.docView.adminService.listGroupSummaries();
      } catch (err) {
        console.warn('[TeacherWorkspacesView] Error cargando grupos:', err);
        this.docView._allGroups = [];
      }
    }
    const activeProg = TeacherContextService.getActiveProgram();
    this.docView.groups = TeacherContextService.filterGroups(this.docView._allGroups, activeProg.id);
    const activeGroupCode = TeacherContextService.getActiveGroupCode();
    const matched = this.docView.groups.find(g => (g.visibleCode === activeGroupCode || (g.id && g.id.includes(activeGroupCode))));
    if (matched) {
      this.docView.selectedGroupId = matched.id;
      this.docView.selectedGroupCode = matched.visibleCode;
    } else if (this.docView.groups.length > 0) {
      this.docView.selectedGroupId = this.docView.groups[0].id;
      this.docView.selectedGroupCode = this.docView.groups[0].visibleCode;
    }
  }

  async renderCurrent(container) {
    if (!container) return;
    this.activeContainer = container;
    if (this.currentMode === 'asistencia') {
      await this.renderAttendance(container);
    } else if (this.currentMode === 'evaluacion') {
      await this.renderEvaluation(container);
    } else if (this.currentMode === 'portada') {
      await this.renderPortada(container);
    }
  }

  /* ==========================================================================
     1. ESPACIO EXCLUSIVO: CONTROL DE ASISTENCIA MODULAR (#/asistencia)
     ========================================================================== */
  async renderAttendance(container) {
    this.currentMode = 'asistencia';
    this.activeContainer = container;
    await this._syncDocViewContext();

    const role = AuthService.getCurrentRole();
    const activeProg = TeacherContextService.getActiveProgram();
    const activeGroup = TeacherContextService.getActiveGroupInfo();
    const studentCount = activeGroup.count || 0;
    const currentUd = this.selectedAsistenciaUD || 1;
    const tmplId = `TMPL-0${currentUd + 4}`;

    this.docView.selectedTemplateId = tmplId;
    this.docView.selectedAsistenciaUD = currentUd;

    const attData = this.docView.selectedGroupId 
      ? this.docView.etapa2DataService?.getAttendance(this.docView.selectedGroupId, currentUd) 
      : null;
    const hasAtt = attData && Array.isArray(attData.sessions) && attData.sessions.length > 0;

    container.innerHTML = `
      <div class="teacher-workspace-container p-3 p-md-4">
        <!-- Encabezado Pedagógico Exclusivo (Azul Institucional) -->
        <div class="card p-3 mb-3" style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #ffffff; border-radius: 14px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                <span class="badge" style="background: rgba(255,255,255,0.2); font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3);">
                  DOCENTE DE ESPECIALIDAD
                </span>
                <span class="badge" style="background: #ede9fe; color: #6b21a8; font-weight: 700; font-size: 0.75rem;">
                  AULA ACTIVA: ${escapeHtml(activeGroup.grupoCode)}
                </span>
              </div>
              <h2 class="m-0 fw-bold d-flex align-items-center gap-2" style="font-size: 1.45rem; color: #ffffff; letter-spacing: -0.02em;">
                <span>📝 Control de Asistencia Modular</span>
              </h2>
              <p class="m-0 mt-1" style="font-size: 0.88rem; color: #bfdbfe;">
                Registro oficial de asistencia, inasistencias y tardanzas (Sesiones 1 a 40) · Formato Oficial MINEDU A3
              </p>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-light btn-sm fw-bold px-3 py-2" id="tw-btn-switch-classroom" style="border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); color: #1e3a8a;">
                🏫 Cambiar Carrera o Aula
              </button>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Contexto Académico Delimitado -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #dbeafe; border-radius: 12px; border-left: 6px solid #2563eb; box-shadow: var(--shadow-xs);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <span style="font-size: 0.72rem; text-transform: uppercase; font-weight: 800; color: #2563eb; letter-spacing: 0.05em;">Ámbito Académico Docente</span>
              <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 0.1rem;">
                ${escapeHtml(activeProg.nombre)} · Aula: ${escapeHtml(activeGroup.grupoCode)} (${escapeHtml(activeGroup.turno || 'Regular')})
              </div>
              <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">
                Docente: <strong>${escapeHtml(role.userName)}</strong> · Padrón de aula: <strong>${studentCount} estudiantes</strong>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge" style="background: #eff6ff; color: #1e40af; border: 1.5px solid #bfdbfe; font-size: 0.85rem; padding: 0.4rem 0.8rem; font-weight: 700;">
                Plantilla Ministerial: ${tmplId}
              </span>
            </div>
          </div>
        </div>

        <!-- Selector Rápido de Unidades Didácticas (UD1 a UD6) -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: var(--shadow-xs);">
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <label style="font-size: 0.82rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; margin: 0;">
              Seleccione la Unidad Didáctica (UD):
            </label>
            <span style="font-size: 0.78rem; color: #64748b;">Cada UD cuenta con su registro físico de 40 sesiones</span>
          </div>
          <div class="d-flex flex-wrap gap-2" id="tw-ud-selector">
            ${[1, 2, 3, 4, 5, 6].map(u => `
              <button type="button" class="btn btn-sm ${currentUd === u ? 'btn-primary fw-bold text-white shadow-sm' : 'btn-outline-secondary'}" data-ud="${u}" style="border-radius: 8px; padding: 0.5rem 1.1rem; font-size: 0.88rem; transition: all 0.2s ease;">
                UD ${u} <span style="font-size:0.75rem; opacity:0.85;">(TMPL-0${u + 4})</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Barra de Acciones Pedagógicas y Estado -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: var(--shadow-xs);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div id="doc-group-status" style="font-size: 0.88rem; font-weight: 600; color: #334155;">
              ${hasAtt 
                ? `<span style="color:#16a34a;"><i class="bi bi-check-circle-fill me-1"></i>Asistencia registrada para UD ${currentUd} (${attData.sessions.length} sesiones). Al generar, se incluirán las marcas P/F/J.</span>`
                : `<span style="color:#2563eb;"><i class="bi bi-info-circle me-1"></i>Sin asistencia registrada para UD ${currentUd}. Puede llenar asistencia diaria o generar la plantilla en blanco.</span>`
              }
            </div>
            <div class="d-flex flex-wrap gap-2 align-items-center">
              <button type="button" class="btn btn-warning fw-bold text-dark px-3 py-2" id="tw-btn-open-att-modal" style="border-radius: 8px; font-size: 0.9rem; background: #f59e0b; border-color: #d97706;">
                📝 Llenar Asistencia Diaria
              </button>
              <button type="button" class="btn btn-primary fw-bold px-3.5 py-2" id="tw-btn-generate-pdf" style="border-radius: 8px; font-size: 0.9rem; background: #1d4ed8; border-color: #1d4ed8;">
                📄 Generar Registro Oficial PDF
              </button>
              <button type="button" class="btn btn-outline-primary btn-sm fw-bold px-2.5 py-2" id="tw-btn-demo-att" style="border-radius: 8px;" title="Precargar asistencia de prueba para esta UD">
                ⚡ Demo
              </button>
              ${hasAtt ? `
                <button type="button" class="btn btn-outline-danger btn-sm fw-bold px-2.5 py-2" id="tw-btn-clear-att" style="border-radius: 8px;" title="Limpiar asistencia registrada">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Visor Directo del Documento Oficial en PDF -->
        <div id="doc-render-workspace" class="mt-3">
          <div class="text-center py-5" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
            <div style="font-size: 2.4rem; margin-bottom: 0.5rem;">📄</div>
            <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Vista Previa de Asistencia Oficial (A3)</h4>
            <p style="font-size: 0.88rem; margin: 0; max-width: 500px; margin-inline: auto;">
              Haga clic en <strong>"Generar Registro Oficial PDF"</strong> para emitir y previsualizar la hoja ministerial con la nómina de su aula.
            </p>
          </div>
        </div>
      </div>
    `;

    this._bindAttendanceEvents(container);
  }

  _bindAttendanceEvents(container) {
    const switchBtn = container.querySelector('#tw-btn-switch-classroom');
    if (switchBtn) {
      switchBtn.onclick = () => Layout.openClassroomSwitcherModal();
    }

    const udButtons = container.querySelectorAll('#tw-ud-selector button');
    udButtons.forEach(btn => {
      btn.onclick = async () => {
        const ud = parseInt(btn.getAttribute('data-ud'), 10);
        this.selectedAsistenciaUD = ud;
        await this.renderAttendance(container);
      };
    });

    const openAttModalBtn = container.querySelector('#tw-btn-open-att-modal');
    if (openAttModalBtn) {
      openAttModalBtn.onclick = async () => this.docView._openAttendanceModal(container);
    }

    const genPdfBtn = container.querySelector('#tw-btn-generate-pdf');
    if (genPdfBtn) {
      genPdfBtn.onclick = async () => this.docView._generateTmplAttendance(container);
    }

    const demoBtn = container.querySelector('#tw-btn-demo-att');
    if (demoBtn) {
      demoBtn.onclick = async () => {
        await this.docView._preloadDemoAttendance(container);
        await this.renderAttendance(container);
      };
    }

    const clearBtn = container.querySelector('#tw-btn-clear-att');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        await this.docView._clearAttendanceData(container);
        await this.renderAttendance(container);
      };
    }
  }

  /* ==========================================================================
     2. ESPACIO EXCLUSIVO: REGISTRO AUXILIAR DE NOTAS (#/evaluacion)
     ========================================================================== */
  async renderEvaluation(container) {
    this.currentMode = 'evaluacion';
    this.activeContainer = container;
    await this._syncDocViewContext();

    const role = AuthService.getCurrentRole();
    const activeProg = TeacherContextService.getActiveProgram();
    const activeGroup = TeacherContextService.getActiveGroupInfo();
    const studentCount = activeGroup.count || 0;
    const currentUd = this.selectedEvaluacionUD || 1;
    const tmplId = `TMPL-${currentUd + 10}`;

    this.docView.selectedTemplateId = tmplId;
    this.docView.selectedEvaluacionUD = currentUd;

    const evalData = this.docView.selectedGroupId 
      ? this.docView.etapa2DataService?.getEvaluation(this.docView.selectedGroupId, currentUd) 
      : null;
    const hasEval = evalData && evalData.evaluationsByEnrollment && Object.keys(evalData.evaluationsByEnrollment).length > 0;

    container.innerHTML = `
      <div class="teacher-workspace-container p-3 p-md-4">
        <!-- Encabezado Pedagógico Exclusivo (Verde Esmeralda Calificaciones) -->
        <div class="card p-3 mb-3" style="background: linear-gradient(135deg, #065f46, #059669); color: #ffffff; border-radius: 14px; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.2);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                <span class="badge" style="background: rgba(255,255,255,0.2); font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3);">
                  DOCENTE DE ESPECIALIDAD
                </span>
                <span class="badge" style="background: #dcfce7; color: #14532d; font-weight: 700; font-size: 0.75rem;">
                  AULA ACTIVA: ${escapeHtml(activeGroup.grupoCode)}
                </span>
              </div>
              <h2 class="m-0 fw-bold d-flex align-items-center gap-2" style="font-size: 1.45rem; color: #ffffff; letter-spacing: -0.02em;">
                <span>📊 Registro Auxiliar de Calificaciones</span>
              </h2>
              <p class="m-0 mt-1" style="font-size: 0.88rem; color: #a7f3d0;">
                Evaluación continua por capacidades terminales, indicadores de logro (IL1 a IL5) y escala vigesimal · Formato Oficial MINEDU A3
              </p>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-light btn-sm fw-bold px-3 py-2" id="tw-btn-switch-classroom" style="border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); color: #065f46;">
                🏫 Cambiar Carrera o Aula
              </button>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Contexto Académico Delimitado -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #bbf7d0; border-radius: 12px; border-left: 6px solid #059669; box-shadow: var(--shadow-xs);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <span style="font-size: 0.72rem; text-transform: uppercase; font-weight: 800; color: #059669; letter-spacing: 0.05em;">Ámbito Académico Docente</span>
              <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-top: 0.1rem;">
                ${escapeHtml(activeProg.nombre)} · Aula: ${escapeHtml(activeGroup.grupoCode)} (${escapeHtml(activeGroup.turno || 'Regular')})
              </div>
              <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.15rem;">
                Docente: <strong>${escapeHtml(role.userName)}</strong> · Padrón evaluable: <strong>${studentCount} estudiantes</strong>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge" style="background: #ecfdf5; color: #065f46; border: 1.5px solid #a7f3d0; font-size: 0.85rem; padding: 0.4rem 0.8rem; font-weight: 700;">
                Plantilla Ministerial: ${tmplId}
              </span>
            </div>
          </div>
        </div>

        <!-- Selector Rápido de Unidades Didácticas (UD1 a UD7) -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: var(--shadow-xs);">
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <label style="font-size: 0.82rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; margin: 0;">
              Seleccione la Unidad Didáctica a Evaluar:
            </label>
            <span style="font-size: 0.78rem; color: #64748b;">Cada UD evalúa 5 Indicadores de Logro con promedio automático</span>
          </div>
          <div class="d-flex flex-wrap gap-2" id="tw-ud-selector">
            ${[1, 2, 3, 4, 5, 6, 7].map(u => `
              <button type="button" class="btn btn-sm ${currentUd === u ? 'btn-success fw-bold text-white shadow-sm' : 'btn-outline-secondary'}" data-ud="${u}" style="border-radius: 8px; padding: 0.5rem 1.1rem; font-size: 0.88rem; transition: all 0.2s ease; ${currentUd === u ? 'background:#059669; border-color:#059669;' : ''}">
                UD ${u} <span style="font-size:0.75rem; opacity:0.85;">(TMPL-${u + 10})</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Barra de Acciones Pedagógicas y Estado -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: var(--shadow-xs);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div id="doc-group-status" style="font-size: 0.88rem; font-weight: 600; color: #334155;">
              ${hasEval 
                ? `<span style="color:#16a34a;"><i class="bi bi-check-circle-fill me-1"></i>Calificaciones registradas para UD ${currentUd} (5 Indicadores). Al generar, se incluirán las notas vigesimales y promedios.</span>`
                : `<span style="color:#059669;"><i class="bi bi-info-circle me-1"></i>Sin calificaciones registradas para UD ${currentUd}. Puede ingresar notas o generar el auxiliar en blanco.</span>`
              }
            </div>
            <div class="d-flex flex-wrap gap-2 align-items-center">
              <button type="button" class="btn btn-warning fw-bold text-dark px-3 py-2" id="tw-btn-open-eval-modal" style="border-radius: 8px; font-size: 0.9rem; background: #f59e0b; border-color: #d97706;">
                📊 Llenar Calificaciones
              </button>
              <button type="button" class="btn btn-success fw-bold text-white px-3.5 py-2" id="tw-btn-generate-pdf" style="border-radius: 8px; font-size: 0.9rem; background: #059669; border-color: #059669;">
                📄 Generar Registro Auxiliar PDF
              </button>
              <button type="button" class="btn btn-primary fw-bold px-3 py-2" id="tw-btn-export-usb" style="border-radius: 8px; font-size: 0.9rem; background: #2563eb;" title="Exportar mis notas y asistencias a memoria USB para entregar a Secretaría">
                📦 Exportar Notas (USB)
              </button>
              <button type="button" class="btn btn-outline-success btn-sm fw-bold px-2.5 py-2" id="tw-btn-demo-eval" style="border-radius: 8px;" title="Precargar notas vigesimales de prueba">
                ⚡ Demo
              </button>
              ${hasEval ? `
                <button type="button" class="btn btn-outline-danger btn-sm fw-bold px-2.5 py-2" id="tw-btn-clear-eval" style="border-radius: 8px;" title="Limpiar calificaciones guardadas">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Visor Directo del Documento Oficial en PDF -->
        <div id="doc-render-workspace" class="mt-3">
          <div class="text-center py-5" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
            <div style="font-size: 2.4rem; margin-bottom: 0.5rem;">📊</div>
            <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Vista Previa de Registro Auxiliar Oficial (A3)</h4>
            <p style="font-size: 0.88rem; margin: 0; max-width: 500px; margin-inline: auto;">
              Haga clic en <strong>"Generar Registro Auxiliar PDF"</strong> para emitir y previsualizar las calificaciones y promedios de su aula.
            </p>
          </div>
        </div>
      </div>
    `;

    this._bindEvaluationEvents(container);
  }

  _bindEvaluationEvents(container) {
    const switchBtn = container.querySelector('#tw-btn-switch-classroom');
    if (switchBtn) {
      switchBtn.onclick = () => Layout.openClassroomSwitcherModal();
    }

    const udButtons = container.querySelectorAll('#tw-ud-selector button');
    udButtons.forEach(btn => {
      btn.onclick = async () => {
        const ud = parseInt(btn.getAttribute('data-ud'), 10);
        this.selectedEvaluacionUD = ud;
        await this.renderEvaluation(container);
      };
    });

    const openEvalModalBtn = container.querySelector('#tw-btn-open-eval-modal');
    if (openEvalModalBtn) {
      openEvalModalBtn.onclick = async () => this.docView._openEvaluationModal(container);
    }

    const genPdfBtn = container.querySelector('#tw-btn-generate-pdf');
    if (genPdfBtn) {
      genPdfBtn.onclick = async () => this.docView._generateTmplEvaluation(container);
    }

    const exportUsbBtn = container.querySelector('#tw-btn-export-usb');
    if (exportUsbBtn) {
      exportUsbBtn.onclick = async () => {
        const syncService = new SyncPackageService();
        await syncService.exportTeacherGradesPackage();
      };
    }

    const demoBtn = container.querySelector('#tw-btn-demo-eval');
    if (demoBtn) {
      demoBtn.onclick = async () => {
        await this.docView._preloadDemoEvaluation(container);
        await this.renderEvaluation(container);
      };
    }

    const clearBtn = container.querySelector('#tw-btn-clear-eval');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        await this.docView._clearEvaluationData(container);
        await this.renderEvaluation(container);
      };
    }
  }

  /* ==========================================================================
     3. ESPACIO EXCLUSIVO: PORTADA DE CARPETA PEDAGÓGICA (#/portada)
     ========================================================================== */
  async renderPortada(container) {
    this.currentMode = 'portada';
    this.activeContainer = container;
    await this._syncDocViewContext();

    const role = AuthService.getCurrentRole();
    const activeProg = TeacherContextService.getActiveProgram();
    const activeGroup = TeacherContextService.getActiveGroupInfo();
    const studentCount = activeGroup.count || 0;

    this.docView.selectedTemplateId = 'TMPL-04';

    container.innerHTML = `
      <div class="teacher-workspace-container p-3 p-md-4">
        <!-- Encabezado Pedagógico Exclusivo (Ámbar / Dorado Portada) -->
        <div class="card p-3 mb-3" style="background: linear-gradient(135deg, #92400e, #d97706); color: #ffffff; border-radius: 14px; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.2);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                <span class="badge" style="background: rgba(255,255,255,0.2); font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3);">
                  DOCENTE DE ESPECIALIDAD
                </span>
                <span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 700; font-size: 0.75rem;">
                  TMPL-04 OFICIAL
                </span>
              </div>
              <h2 class="m-0 fw-bold d-flex align-items-center gap-2" style="font-size: 1.45rem; color: #ffffff; letter-spacing: -0.02em;">
                <span>📁 Portada Oficial de Carpeta Pedagógica</span>
              </h2>
              <p class="m-0 mt-1" style="font-size: 0.88rem; color: #fde68a;">
                Carátula formal para la carpeta técnica y pedagógica del docente con membrete institucional · Formato Oficial MINEDU A4
              </p>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-light btn-sm fw-bold px-3 py-2" id="tw-btn-switch-classroom" style="border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); color: #92400e;">
                🏫 Cambiar Carrera o Aula
              </button>
            </div>
          </div>
        </div>

        <!-- Resumen de Datos Oficiales de la Carátula -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #fde68a; border-radius: 12px; border-left: 6px solid #d97706; box-shadow: var(--shadow-xs);">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem;">
            Datos Institucionales que figurarán en la Carátula:
          </h4>
          <div class="row g-2" style="font-size: 0.88rem; color: #334155;">
            <div class="col-md-6"><strong>Institución Educativa:</strong> CETPRO Público "Micaela Bastidas Puyucawa"</div>
            <div class="col-md-6"><strong>Docente Responsable:</strong> ${escapeHtml(role.userName)}</div>
            <div class="col-md-6"><strong>Especialidad / Carrera:</strong> ${escapeHtml(activeProg.nombre)}</div>
            <div class="col-md-6"><strong>Aula / Grupo:</strong> ${escapeHtml(activeGroup.grupoCode)} (${escapeHtml(activeGroup.turno || 'Regular')})</div>
            <div class="col-md-6"><strong>Módulo Oficial:</strong> Módulo Oficial de Formación Profesional</div>
            <div class="col-md-6"><strong>Alumnos Matriculados:</strong> ${studentCount} estudiantes</div>
          </div>
        </div>

        <!-- Barra de Acciones -->
        <div class="card p-3 mb-3" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: var(--shadow-xs);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div id="doc-group-status" style="font-size: 0.88rem; font-weight: 600; color: #334155;">
              <span>Listo para generar la carátula oficial en tamaño A4 para anillar en su carpeta pedagógica.</span>
            </div>
            <div>
              <button type="button" class="btn fw-bold text-white px-4 py-2" id="tw-btn-generate-pdf" style="border-radius: 8px; font-size: 0.92rem; background: #d97706; border-color: #d97706;">
                📄 Generar Portada de Carpeta en PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Visor Directo del Documento Oficial en PDF -->
        <div id="doc-render-workspace" class="mt-3">
          <div class="text-center py-5" style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
            <div style="font-size: 2.4rem; margin-bottom: 0.5rem;">📁</div>
            <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">Vista Previa de la Portada Oficial (A4)</h4>
            <p style="font-size: 0.88rem; margin: 0; max-width: 500px; margin-inline: auto;">
              Haga clic en <strong>"Generar Portada de Carpeta en PDF"</strong> para previsualizar, imprimir o descargar la carátula formal.
            </p>
          </div>
        </div>
      </div>
    `;

    this._bindPortadaEvents(container);
  }

  _bindPortadaEvents(container) {
    const switchBtn = container.querySelector('#tw-btn-switch-classroom');
    if (switchBtn) {
      switchBtn.onclick = () => Layout.openClassroomSwitcherModal();
    }

    const genPdfBtn = container.querySelector('#tw-btn-generate-pdf');
    if (genPdfBtn) {
      genPdfBtn.onclick = async () => this.docView._generateTmpl04(container);
    }
  }
}
