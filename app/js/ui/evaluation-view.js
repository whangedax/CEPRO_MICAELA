/**
 * Componente de Vista de Registro de Evaluaciones (EvaluationView)
 * Módulo: M07 — EVALUACIÓN
 */

import { AcademicReadinessService } from '../services/academic-readiness-service.js';
import { EvaluationService } from '../services/evaluation-service.js';
import { EvaluationRepository } from '../repositories/evaluation-repository.js';
import { EnrollmentService, FILE_GROUP_MAP } from '../services/enrollment-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { AttendanceView } from './attendance-view.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';

export class EvaluationView {
  constructor(options = {}) {
    this.readinessService = options.readinessService || new AcademicReadinessService();
    this.evaluationService = options.evaluationService || new EvaluationService();
    this.enrollmentService = options.enrollmentService || new EnrollmentService();
    this.templateEngine = options.templateEngine || new PdfTemplateEngine();
    this.blobUrl = null;
    this.isTestEnv = options.isTestEnv || false;
    this.currentGroupCode = 'GRP-BD-001';
    this.currentFecha = new Date().toISOString().substring(0, 10);
    this.currentUnidadId = 'UNID-TEST-001';
    this.currentIndicadorId = 'IND-TEST-001';
    this.currentBatchId = null;
    this.studentsList = [];
    this.evaluationMap = {}; // { matriculaId: { id, nota, observacion, batchId } }
    this.auditLogs = [];
  }

  async render(container, activeTab = 'evaluacion') {
    if (!container) return;

    const readiness = await this.readinessService.getAcademicReadinessSummary();

    container.innerHTML = `
      <div class="evaluation-page-container">
        <!-- Header & Nav Tabs -->
        <div class="card header-card mb-4">
          <div class="card-header flex-between flex-wrap gap-3">
            <div>
              <h2 class="card-title text-primary"><i class="icon">📊</i> Registro Académico</h2>
              <p class="card-subtitle">Control de Asistencia y Evaluaciones de Estudiantes CETPRO</p>
            </div>
            <div class="flex-gap-2">
              <button id="btn-toggle-m07-test-mode" class="btn ${this.isTestEnv ? 'btn-warning' : 'btn-outline-primary'}">
                <i class="icon">${this.isTestEnv ? '⚠️' : '🧪'}</i> ${this.isTestEnv ? 'Modo: ENTORNO AISLADO (TEST_DB)' : 'Probar en Entorno Aislado (TEST_DB)'}
              </button>
            </div>
          </div>
          
          <div class="tab-navigation mt-3" style="display:flex; gap:0.5rem; border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem;">
            <button class="tab-btn ${activeTab === 'asistencia' ? 'active' : ''}" id="tab-btn-asistencia" style="padding:0.6rem 1.2rem; font-weight:600; border:none; background:${activeTab === 'asistencia' ? '#2563eb' : '#f1f5f9'}; color:${activeTab === 'asistencia' ? '#ffffff' : '#475569'}; border-radius:4px; cursor:pointer;">
              <i class="icon">✅</i> ASISTENCIA (M06)
            </button>
            <button class="tab-btn ${activeTab === 'evaluacion' ? 'active' : ''}" id="tab-btn-evaluacion" style="padding:0.6rem 1.2rem; font-weight:600; border:none; background:${activeTab === 'evaluacion' ? '#2563eb' : '#f1f5f9'}; color:${activeTab === 'evaluacion' ? '#ffffff' : '#475569'}; border-radius:4px; cursor:pointer;">
              <i class="icon">📊</i> EVALUACIÓN (M07)
            </button>
          </div>
        </div>

        <!-- Main Content Panel -->
        <div id="evaluation-content-panel">
          ${this.isTestEnv ? this._renderTestModeUI() : this._renderProductionBlockedUI(readiness)}
        </div>
      </div>
    `;

    this._bindEvents(container);

    if (this.isTestEnv) {
      await this._loadTestGroupData();
    }
  }

  _renderProductionBlockedUI(readiness) {
    return `
      <div class="card blocked-readiness-card p-5 text-center" style="border-left:5px solid #dc2626;">
        <div class="blocked-icon mb-3" style="font-size: 3.5rem;">🔒</div>
        <h3 class="text-danger font-weight-bold mb-2">EVALUACIÓN — CONFIGURACIÓN ACADÉMICA PENDIENTE</h3>
        <p class="text-muted max-w-600 margin-auto mb-4" style="margin: 0 auto 1.5rem auto; max-width:600px;">
          No es posible registrar evaluaciones en la base productiva (<code>CETPRO_DB</code>) porque la estructura lectiva oficial y las reglas de calificación aún no han sido entregadas por la Jefatura del CETPRO.
        </p>

        <div class="readiness-status-box max-w-500 margin-auto p-4 border-rounded bg-light text-left mb-4" style="margin: 0 auto 1.5rem auto; max-width:500px; text-align:left; background:#f8fafc; padding:1.25rem; border-radius:6px; border:1px solid #cbd5e1;">
          <h4 class="font-weight-bold mb-3 border-bottom pb-2" style="font-size:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem;">Estado de Prerrequisitos Obligatorios:</h4>
          <ul class="status-list pl-3 mb-0" style="list-style: none; padding-left:0;">
            <li class="mb-2 text-danger" style="margin-bottom:0.5rem; color:#dc2626;">
              <span class="status-icon">❌</span> <strong>Periodo Académico Oficial:</strong> PENDIENTE (${readiness.periodosCount} activos)
            </li>
            <li class="mb-2 text-danger" style="margin-bottom:0.5rem; color:#dc2626;">
              <span class="status-icon">❌</span> <strong>Módulo por Grupo Técnico:</strong> PENDIENTE (${readiness.groupsWithModule} / ${readiness.totalGroups} asignados)
            </li>
            <li class="mb-2 text-danger" style="margin-bottom:0.5rem; color:#dc2626;">
              <span class="status-icon">❌</span> <strong>Unidades Didácticas Oficiales:</strong> PENDIENTE (0 configuradas, Bloqueo B-002)
            </li>
            <li class="mb-2 text-danger" style="margin-bottom:0.5rem; color:#dc2626;">
              <span class="status-icon">❌</span> <strong>Indicadores de Logro Oficiales:</strong> PENDIENTE (0 configurados, Bloqueo B-003)
            </li>
          </ul>
        </div>

        <p class="text-secondary text-sm mb-4" style="font-size:0.88rem; color:#64748b;">
          <em>Cuando la Jefatura entregue la resolución oficial con la estructura curricular e indicadores de logro, esta pantalla habilitará la persistencia productiva.</em>
        </p>

        <div class="action-buttons flex-center gap-3" style="display:flex; justify-content:center; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <a href="#/inicio" class="btn btn-secondary" style="padding:0.6rem 1.2rem; background:#64748b; color:#fff; text-decoration:none; border-radius:4px;"><i class="icon">🏠</i> Volver al Inicio</a>
          <div style="display:inline-flex; align-items:center; gap:0.4rem;">
            <select id="eval-unit-selector" class="form-control" style="padding:0.55rem 0.8rem; border:1px solid #cbd5e1; border-radius:4px; font-weight:600;">
              <option value="1">UD1: TMPL-11 (47 filas)</option>
              <option value="2">UD2: TMPL-12 (40 filas)</option>
              <option value="3">UD3: TMPL-13 (40 filas)</option>
              <option value="4">UD4: TMPL-14 (40 filas)</option>
              <option value="5">UD5: TMPL-15 (40 filas)</option>
              <option value="6">UD6: TMPL-16 (40 filas)</option>
              <option value="7">UD7: TMPL-17 (40 filas)</option>
            </select>
            <button id="btn-generate-tmpl11-candidate" class="btn btn-success" style="padding:0.6rem 1.2rem; background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">📄</i> Generar Evaluación</button>
          </div>
          <button id="btn-generate-tmpl19-candidate" class="btn btn-primary" style="padding:0.6rem 1.2rem; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">📜</i> Generar Acta Modular (TMPL-19)</button>
          <button id="btn-activate-eval-test-env-inline" class="btn btn-warning" style="padding:0.6rem 1.2rem; background:#d97706; color:#fff; border:none; border-radius:4px; cursor:pointer;"><i class="icon">🧪</i> Probar Flujo Completo en Entorno Aislado</button>
        </div>
        <div id="evaluation-tmpl11-viewer-output" style="display:none; margin-top:1.5rem; text-align:left;"></div>
        <div id="evaluation-tmpl19-viewer-output" style="display:none; margin-top:1.5rem; text-align:left;"></div>
      </div>
    `;
  }

  _renderTestModeUI() {
    return `
      <div class="test-env-banner p-3 mb-4 bg-warning-light border-warning border-rounded flex-between flex-wrap gap-2" style="background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #d97706; padding:1rem; border-radius:6px; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <div class="flex-align-center gap-2" style="display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size: 1.5rem;">⚠️</span>
          <div>
            <strong>ENTORNO DE PRUEBAS AISLADO ACTIVO (<code>CETPRO_M07_TEST_DB</code>)</strong>
            <div class="text-xs text-muted" style="font-size:0.8rem; color:#78350f;">Todos los datos generados en esta vista son ficticios (TEST_ONLY) y no afectan la base productiva.</div>
          </div>
        </div>
        <button id="btn-exit-eval-test-mode" class="btn btn-sm btn-outline-danger" style="padding:0.4rem 0.8rem; border:1px solid #dc2626; color:#dc2626; background:transparent; border-radius:4px; cursor:pointer;">Salir de Modo Pruebas</button>
      </div>

      <!-- Filters & Context Selection -->
      <div class="card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; padding:1.25rem; border-radius:6px; margin-bottom:1rem;">
        <h4 style="margin-bottom:1rem; font-size:1rem; color:#1e293b;">🎯 Configuración del Contexto de Evaluación (TEST_ONLY)</h4>
        <div class="form-row grid-cols-1-1-1-1 gap-3" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
          <div>
            <label style="font-weight:600; font-size:0.85rem;">Grupo Técnico (TEST_ONLY)</label>
            <select id="eval-select-group" class="form-control" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px;">
              <option value="GRP-BD-001" ${this.currentGroupCode === 'GRP-BD-001' ? 'selected' : ''}>GRP-BD-001: Automotriz (Mañana)</option>
              <option value="GRP-BD-002" ${this.currentGroupCode === 'GRP-BD-002' ? 'selected' : ''}>GRP-BD-002: Computación (Tarde)</option>
              <option value="GRP-BD-003" ${this.currentGroupCode === 'GRP-BD-003' ? 'selected' : ''}>GRP-BD-003: Electricidad (Noche)</option>
            </select>
          </div>

          <div>
            <label style="font-weight:600; font-size:0.85rem;">Unidad Didáctica (TEST_ONLY)</label>
            <select id="eval-select-unidad" class="form-control" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px;">
              <option value="UNID-TEST-001" ${this.currentUnidadId === 'UNID-TEST-001' ? 'selected' : ''}>UD1: Diagnóstico de Sistemas</option>
              <option value="UNID-TEST-002" ${this.currentUnidadId === 'UNID-TEST-002' ? 'selected' : ''}>UD2: Mantenimiento Preventivo</option>
              <option value="UNID-TEST-007" ${this.currentUnidadId === 'UNID-TEST-007' ? 'selected' : ''}>UD7: Reparación Avanzada</option>
              <option value="UNID-TEST-008" ${this.currentUnidadId === 'UNID-TEST-008' ? 'selected' : ''}>UD8: Unidad Especial Extra (Fuera de UD1-UD7)</option>
            </select>
          </div>

          <div>
            <label style="font-weight:600; font-size:0.85rem;">Indicador de Logro (TEST_ONLY)</label>
            <select id="eval-select-indicador" class="form-control" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px;">
              <option value="IND-TEST-001" ${this.currentIndicadorId === 'IND-TEST-001' ? 'selected' : ''}>IND-01: Identifica componentes técnicos</option>
              <option value="IND-TEST-002" ${this.currentIndicadorId === 'IND-TEST-002' ? 'selected' : ''}>IND-02: Ejecuta pruebas de rendimiento</option>
              <option value="IND-TEST-008" ${this.currentIndicadorId === 'IND-TEST-008' ? 'selected' : ''}>IND-08: Demostración fuera de UD1-UD7</option>
            </select>
          </div>

          <div>
            <label style="font-weight:600; font-size:0.85rem;">Fecha de Evaluación</label>
            <input type="date" id="eval-input-fecha" value="${this.currentFecha}" class="form-control" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px;">
          </div>
        </div>
      </div>

      <!-- Batch Header & Actions -->
      <div class="card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; padding:1.25rem; border-radius:6px; margin-bottom:1rem;">
        <div class="flex-between flex-wrap gap-3" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem; color:#1e293b; margin:0;">📋 Lista de Matrículas del Grupo</h3>
            <span class="badge badge-info" id="eval-students-count-badge" style="background:#0284c7; color:#fff; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.8rem;">Cargando...</span>
          </div>

          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <button id="btn-eval-fill-all-valid" class="btn btn-sm btn-outline-secondary" style="padding:0.4rem 0.8rem; border:1px solid #94a3b8; background:transparent; border-radius:4px; cursor:pointer;" title="Llenar con notas aleatorias 12-18 para demostración">
              ⚡ Llenar Demo
            </button>
            <button id="btn-eval-save-batch" class="btn btn-primary" style="padding:0.5rem 1.25rem; background:#2563eb; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">
              💾 Registrar Evaluación Masiva (Idempotente)
            </button>
          </div>
        </div>
      </div>

      <!-- Students Table / Cards -->
      <div class="card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; padding:1.25rem; border-radius:6px; margin-bottom:1rem;">
        <div id="eval-students-table-container" style="overflow-x:auto;">
          <p class="text-muted p-4 text-center">Cargando matrículas del entorno de prueba...</p>
        </div>
      </div>

      <!-- Audit Log Panel -->
      <div class="card mb-4" style="background:#f8fafc; border:1px solid #cbd5e1; padding:1.25rem; border-radius:6px;">
        <h4 style="font-size:0.95rem; color:#334155; margin-bottom:0.75rem;">📜 Bitácora de Auditoría de Evaluación (Append-Only)</h4>
        <div id="eval-audit-log-box" style="font-family:monospace; font-size:0.82rem; background:#0f172a; color:#38bdf8; padding:1rem; border-radius:4px; max-height:180px; overflow-y:auto; white-space:pre-wrap;">
// Esperando acciones de registro, edición explícita o anulación...
        </div>
      </div>
    `;
  }

  _bindEvents(container) {
    const tabAsistencia = container.querySelector('#tab-btn-asistencia');
    const tabEvaluacion = container.querySelector('#tab-btn-evaluacion');

    if (tabAsistencia) {
      tabAsistencia.onclick = async () => {
        const view = new AttendanceView();
        view.isTestEnv = this.isTestEnv;
        await view.render(container);
      };
    }

    if (tabEvaluacion) {
      tabEvaluacion.onclick = async () => {
        await this.render(container, 'evaluacion');
      };
    }

    const btnToggle = container.querySelector('#btn-toggle-m07-test-mode');
    const btnActivateInline = container.querySelector('#btn-activate-eval-test-env-inline');
    const btnExit = container.querySelector('#btn-exit-eval-test-mode');

    const toggleMode = async () => {
      this.isTestEnv = !this.isTestEnv;
      await this.render(container, 'evaluacion');
    };

    if (btnToggle) btnToggle.onclick = toggleMode;
    if (btnActivateInline) btnActivateInline.onclick = toggleMode;
    if (btnExit) btnExit.onclick = toggleMode;

    const btnTmpl11 = container.querySelector("#btn-generate-tmpl11-candidate");
    if (btnTmpl11) {
      btnTmpl11.onclick = () => this._generateTmpl11Preview(container);
    }

    const btnTmpl19 = container.querySelector("#btn-generate-tmpl19-candidate");
    if (btnTmpl19) {
      btnTmpl19.onclick = () => this._generateTmpl19Preview(container);
    }

    if (!this.isTestEnv) return;

    const selectGroup = container.querySelector('#eval-select-group');
    const selectUnidad = container.querySelector('#eval-select-unidad');
    const selectIndicador = container.querySelector('#eval-select-indicador');
    const inputFecha = container.querySelector('#eval-input-fecha');
    const btnFillDemo = container.querySelector('#btn-fill-all-valid') || container.querySelector('#btn-eval-fill-all-valid');
    const btnSaveBatch = container.querySelector('#btn-eval-save-batch');

    if (selectGroup) {
      selectGroup.onchange = async (e) => {
        this.currentGroupCode = e.target.value;
        await this._loadTestGroupData();
      };
    }

    if (selectUnidad) {
      selectUnidad.onchange = async (e) => {
        this.currentUnidadId = e.target.value;
        await this._loadTestGroupData();
      };
    }

    if (selectIndicador) {
      selectIndicador.onchange = async (e) => {
        this.currentIndicadorId = e.target.value;
        await this._loadTestGroupData();
      };
    }

    if (inputFecha) {
      inputFecha.onchange = (e) => {
        this.currentFecha = e.target.value;
      };
    }

    if (btnFillDemo) {
      btnFillDemo.onclick = () => {
        const inputs = container.querySelectorAll('.eval-nota-input');
        inputs.forEach((input, index) => {
          const mockNota = 12 + (index % 8);
          input.value = mockNota;
        });
        Notifications.info('Notas de demostración cargadas en el formulario (0-20)');
      };
    }

    if (btnSaveBatch) {
      btnSaveBatch.onclick = async () => {
        await this._saveBatchEvaluations();
      };
    }
  }

  async _loadTestGroupData() {
    const tableContainer = document.getElementById('eval-students-table-container');
    const badgeCount = document.getElementById('eval-students-count-badge');
    if (!tableContainer) return;

    // Load mock students for test group
    const mockStudents = [
      { matriculaId: `MAT-TEST-${this.currentGroupCode}-001`, estudianteId: 'EST-TEST-001', nombres: 'JUAN CARLOS', apellidos: 'QUISPE MENDOZA' },
      { matriculaId: `MAT-TEST-${this.currentGroupCode}-002`, estudianteId: 'EST-TEST-002', nombres: 'MARÍA ELENA', apellidos: 'FLORES HUAMÁN' },
      { matriculaId: `MAT-TEST-${this.currentGroupCode}-003`, estudianteId: 'EST-TEST-003', nombres: 'CARLOS ALBERTO', apellidos: 'SANCHEZ ROJAS' },
      { matriculaId: `MAT-TEST-${this.currentGroupCode}-004`, estudianteId: 'EST-TEST-004', nombres: 'ANA LUCÍA', apellidos: 'TORRES RAMOS' },
      { matriculaId: `MAT-TEST-${this.currentGroupCode}-005`, estudianteId: 'EST-TEST-005', nombres: 'ROBERTO CARLOS', apellidos: 'GUTIERREZ LÓPEZ' }
    ];

    this.studentsList = mockStudents;
    if (badgeCount) badgeCount.textContent = `${mockStudents.length} Matrículas`;

    tableContainer.innerHTML = `
      <table class="table" style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1; font-size:0.85rem; color:#475569;">
            <th style="padding:0.75rem;">N°</th>
            <th style="padding:0.75rem;">Matrícula ID</th>
            <th style="padding:0.75rem;">Estudiante</th>
            <th style="padding:0.75rem; width:120px;">Nota (0–20)</th>
            <th style="padding:0.75rem;">Observación</th>
            <th style="padding:0.75rem; text-align:center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${mockStudents.map((st, idx) => `
            <tr style="border-bottom:1px solid #e2e8f0; font-size:0.88rem;">
              <td style="padding:0.75rem; font-weight:bold; color:#64748b;">${idx + 1}</td>
              <td style="padding:0.75rem;"><code>${escapeHtml(st.matriculaId)}</code></td>
              <td style="padding:0.75rem;">
                <strong>${escapeHtml(st.apellidos)}, ${escapeHtml(st.nombres)}</strong>
              </td>
              <td style="padding:0.75rem;">
                <input type="number" step="0.1" min="0" max="20" class="form-control eval-nota-input" data-matricula-id="${escapeHtml(st.matriculaId)}" data-estudiante-id="${escapeHtml(st.estudianteId)}" placeholder="0-20" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px; font-weight:bold;">
              </td>
              <td style="padding:0.75rem;">
                <input type="text" class="form-control eval-obs-input" data-matricula-id="${escapeHtml(st.matriculaId)}" placeholder="Opcional..." style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px;">
              </td>
              <td style="padding:0.75rem; text-align:center;">
                <button class="btn btn-sm btn-outline-primary btn-eval-edit-row" data-matricula-id="${escapeHtml(st.matriculaId)}" style="padding:0.3rem 0.6rem; border:1px solid #2563eb; color:#2563eb; background:transparent; border-radius:4px; cursor:pointer;" title="Editar registro explícito">✏️ Editar</button>
                <button class="btn btn-sm btn-outline-danger btn-eval-cancel-row" data-matricula-id="${escapeHtml(st.matriculaId)}" style="padding:0.3rem 0.6rem; border:1px solid #dc2626; color:#dc2626; background:transparent; border-radius:4px; cursor:pointer;" title="Anular registro">🚫 Anular</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this._bindRowActionEvents();
  }

  _bindRowActionEvents() {
    const editBtns = document.querySelectorAll('.btn-eval-edit-row');
    const cancelBtns = document.querySelectorAll('.btn-eval-cancel-row');

    editBtns.forEach(btn => {
      btn.onclick = async () => {
        const matId = btn.getAttribute('data-matricula-id');
        const existing = this.evaluationMap[matId];
        if (!existing) {
          Notifications.warning('Debe guardar primero la evaluación en lote antes de editar individualmente.');
          return;
        }

        const inputNota = document.querySelector(`.eval-nota-input[data-matricula-id="${matId}"]`);
        const inputObs = document.querySelector(`.eval-obs-input[data-matricula-id="${matId}"]`);
        const newNota = inputNota ? inputNota.value : existing.nota;
        const newObs = inputObs ? inputObs.value : existing.observacion;

        try {
          const updated = await this.evaluationService.updateEvaluation({
            id: existing.id,
            nota: newNota,
            observacion: newObs,
            operador: { id: 'SYS-USER', nombre: 'Operador Test' }
          });
          this.evaluationMap[matId] = updated;
          this._appendAuditLog(`[EDICION_EVALUACION] ID: ${updated.id} | Matrícula: ${matId} | Nota Anterior: ${existing.nota} -> Nueva Nota: ${updated.nota}`);
          Notifications.success(`Evaluación de ${matId} actualizada explícitamente.`);
        } catch (err) {
          Notifications.error(err.message || 'Error al actualizar evaluación');
        }
      };
    });

    cancelBtns.forEach(btn => {
      btn.onclick = async () => {
        const matId = btn.getAttribute('data-matricula-id');
        const existing = this.evaluationMap[matId];
        if (!existing) {
          Notifications.warning('No existe evaluación guardada para anular.');
          return;
        }

        try {
          const canceled = await this.evaluationService.cancelEvaluation(existing.id, { id: 'SYS-USER', nombre: 'Operador Test' });
          delete this.evaluationMap[matId];
          const inputNota = document.querySelector(`.eval-nota-input[data-matricula-id="${matId}"]`);
          if (inputNota) inputNota.value = '';
          this._appendAuditLog(`[ANULACION_EVALUACION] ID: ${canceled.id} | Matrícula: ${matId} | Estado: ANULADO`);
          Notifications.success(`Evaluación de ${matId} anulada con éxito.`);
        } catch (err) {
          Notifications.error(err.message || 'Error al anular evaluación');
        }
      };
    });
  }

  async _saveBatchEvaluations() {
    const inputs = document.querySelectorAll('.eval-nota-input');
    const evaluaciones = [];

    inputs.forEach(input => {
      const matId = input.getAttribute('data-matricula-id');
      const estId = input.getAttribute('data-estudiante-id');
      const val = input.value;
      const obsInput = document.querySelector(`.eval-obs-input[data-matricula-id="${matId}"]`);
      const obs = obsInput ? obsInput.value : '';

      if (val !== '' && val !== null) {
        evaluaciones.push({
          matriculaId: matId,
          estudianteId: estId,
          nota: val,
          observacion: obs
        });
      }
    });

    if (evaluaciones.length === 0) {
      Notifications.warning('Ingrese al menos una nota numérica (0-20) para guardar el lote.');
      return;
    }

    try {
      // Idempotency: generate batchId if not set
      if (!this.currentBatchId) {
        this.currentBatchId = this.evaluationService.generateBatchId();
      }

      // Mock readiness in test mode
      const mockReadinessService = {
        canRegisterEvaluation: async () => ({ ready: true })
      };
      this.evaluationService.readinessService = mockReadinessService;

      const saved = await this.evaluationService.registerBatchEvaluation({
        batchId: this.currentBatchId,
        grupoCode: this.currentGroupCode,
        unidadId: this.currentUnidadId,
        indicadorId: this.currentIndicadorId,
        fecha: this.currentFecha,
        evaluaciones,
        operador: { id: 'SYS-USER', nombre: 'Operador Test' }
      });

      saved.forEach(item => {
        this.evaluationMap[item.matriculaId] = item;
      });

      this._appendAuditLog(`[REGISTRO_EVALUACION] BatchID: ${this.currentBatchId} | Lote: ${saved.length} registros guardados para ${this.currentGroupCode} - ${this.currentUnidadId}`);
      Notifications.success(`Lote de ${saved.length} evaluaciones guardado exitosamente (Idempotente batchId: ${this.currentBatchId})`);
    } catch (err) {
      Notifications.error(err.message || 'Error al guardar lote de evaluaciones');
    }
  }

  _appendAuditLog(msg) {
    const logBox = document.getElementById('eval-audit-log-box');
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    this.auditLogs.push(formatted);
    if (logBox) {
      logBox.textContent += formatted;
      logBox.scrollTop = logBox.scrollHeight;
    }
  }
  async _generateTmpl11Preview(container, forcedOrder = null) {
    const output = container.querySelector('#evaluation-tmpl11-viewer-output');
    const btn = container.querySelector('#btn-generate-tmpl11-candidate');
    const unitSelector = container.querySelector('#eval-unit-selector');
    if (!output) return;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try {
      const unitOrden = Number(forcedOrder || unitSelector?.value || 1);
      const docCode = `TMPL-${String(unitOrden + 10).padStart(2, '0')}`;
      const maxRows = unitOrden === 1 ? 47 : 40;
      const rows = Array.from({ length: Math.min(40, maxRows) }, (_, i) => ({
        'student.fullName': `ESTUDIANTE EVALUACIÓN UD${unitOrden} ${String(i + 1).padStart(2, '0')}`,
        evaluations: [
          { ia1: 16, ia2: 15, ia3: 17, score: 16, recovery: null },
          { ia1: 14, ia2: 14, ia3: 15, score: 14, recovery: null },
          { ia1: 18, ia2: 17, ia3: 19, score: 18, recovery: null },
          { ia1: 12, ia2: 13, ia3: 14, score: 13, recovery: null },
          { ia1: 16, ia2: 16, ia3: 17, score: 16, recovery: null }
        ],
        finalResult: 15
      }));
      const blob = await this.templateEngine.renderEvaluationDocument({
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
        period: { nombre: '2026-I' },
        module: { nombre: 'OFIMÁTICA AVANZADA' },
        unit: { nombre: `UNIDAD DIDÁCTICA ${unitOrden}`, orden: unitOrden, capacidad: 'Gestionar documentos y hojas de cálculo según estándares.' },
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
      output.innerHTML = `
        <div class="alert alert-success mt-2">
          <strong>${docCode} generada exitosamente.</strong> Vista previa técnica sobre plantilla canónica A3 vertical (Unidad Didáctica ${unitOrden}).
        </div>
        <div class="mvp-actions mb-2 d-flex gap-2" style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
          <button id="btn-tmpl11-print" class="btn btn-secondary">Imprimir</button>
          <a class="btn btn-primary" href="${this.blobUrl}" download="${docCode}_EVALUACION_PREVIEW.pdf">Descargar PDF</a>
        </div>
        <iframe title="Vista previa ${docCode}" src="${this.blobUrl}" width="100%" height="750" style="border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
      output.querySelector('#btn-tmpl11-print').onclick = () => {
        const frame = output.querySelector('iframe');
        frame?.contentWindow?.focus();
        frame?.contentWindow?.print();
      };
      output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      Notifications.error(error.message);
      output.style.display = 'block';
      output.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    }
  }

  async _generateTmpl19Preview(container) {
    const output = container.querySelector('#evaluation-tmpl19-viewer-output');
    const btn = container.querySelector('#btn-generate-tmpl19-candidate');
    if (!output) return;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try {
      const rawNames = [
        'ZAPATA LUIS', 'ALVAREZ MARIA', 'CASTILLO JUAN', 'BARRERA CARMEN', 'DELGADO CARLOS',
        'ESTRADA ANA', 'FIGUEROA PEDRO', 'GOMEZ ROSA', 'HERRERA JORGE', 'IGLESIAS SOFIA',
        'JIMENEZ CESAR', 'LOPEZ DANIELA', 'MORALES VICTOR', 'NUNEZ GLORIA', 'ORTIZ MANUEL',
        'PEREZ WALTER', 'QUISPE ELENA', 'RAMIREZ ROBERTO', 'SANCHEZ PATRICIA', 'TORRES MIGUEL'
      ];
      const rows = Array.from({ length: 40 }, (_, i) => ({
        'enrollment.code': `MAT-2026-${String(i + 1).padStart(3, '0')}`,
        'student.documentNumber': `7000${String(i + 1).padStart(4, '0')}`,
        'student.fullName': `${rawNames[i % rawNames.length]} ${i + 1}`,
        unitGrades: [16, 15, 17, 14],
        'efsrt.finalGrade': 16,
        'closure.achievement': 16,
        'closure.approvedCount': 4,
        'closure.failedCount': 0,
        observaciones: ''
      }));

      const units = [
        { nombre: 'GESTIÓN DOCUMENTAL', creditos: 4, horas: 64, capacidad: 'Gestionar documentación administrativa según normas institucionales.' },
        { nombre: 'HOJAS DE CÁLCULO', creditos: 4, horas: 64, capacidad: 'Desarrollar soluciones avanzadas mediante funciones y macros.' },
        { nombre: 'PRESENTACIONES DE IMPACTO', creditos: 3, horas: 48, capacidad: 'Elaborar presentaciones dinámicas interactivas.' },
        { nombre: 'BASES DE DATOS OFIMÁTICAS', creditos: 4, horas: 64, capacidad: 'Diseñar y mantener bases de datos relacionales locales.' }
      ];

      const blob = await this.templateEngine.renderModularActDocument({
        institution: {
          nombre: 'CETPRO PILOTO REGIONAL',
          codigoModular: '1359872',
          tipoGestion: 'PÚBLICA DE GESTIÓN DIRECTA',
          resolucionAutorizacion: 'R.D. N° 0456-2018-ED',
          resolucionConversion: 'R.D. N° 0122-2022-DRELM',
          dre: 'DRE LIMA METROPOLITANA',
          ugel: 'UGEL 03',
          region: 'LIMA',
          provincia: 'LIMA',
          distrito: 'BREÑA',
          lugar: 'BREÑA',
          direccion: 'JR. TALLERES 450, BREÑA'
        },
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA', ciclo: 'TÉCNICO' },
        module: { id: 'MOD-01', nombre: 'OFIMÁTICA AVANZADA', resolucionAutorizacion: 'R.D. N° 0899-2023-ED' },
        group: { turno: 'NOCHE', ciclo: 'I', seccion: 'A', moduloId: 'MOD-01' },
        period: { nombre: '2026-I' },
        units,
        rows,
        administrativeDraft: true
      });

      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = URL.createObjectURL(blob);
      output.style.display = 'block';
      output.innerHTML = `
        <div class="alert alert-success mt-2">
          <strong>TMPL-19 generada exitosamente.</strong> Vista previa técnica de Acta Modular (2 páginas físicas A3 landscape, 40 estudiantes, 20+20).
        </div>
        <div class="mvp-actions mb-2 d-flex gap-2" style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
          <button id="btn-tmpl19-print" class="btn btn-secondary">Imprimir</button>
          <a class="btn btn-primary" href="${this.blobUrl}" download="TMPL-19_ACTA_MODULAR_PREVIEW.pdf">Descargar PDF</a>
        </div>
        <iframe title="Vista previa TMPL-19" src="${this.blobUrl}" width="100%" height="750" style="border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
      output.querySelector('#btn-tmpl19-print').onclick = () => {
        const frame = output.querySelector('iframe');
        frame?.contentWindow?.focus();
        frame?.contentWindow?.print();
      };
      output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      Notifications.error(error.message);
      output.style.display = 'block';
      output.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    }
  }
}
