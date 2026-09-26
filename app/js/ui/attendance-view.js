/**
 * Componente de Vista de Registro de Asistencia (AttendanceView)
 * Módulo: M06.1 — Cierre de Modelo de Asistencia y Sesiones
 */

import { AcademicReadinessService } from '../services/academic-readiness-service.js';
import { AttendanceService, OFFICIAL_ATTENDANCE_STATES } from '../services/attendance-service.js';
import { AttendanceRepository } from '../repositories/attendance-repository.js';
import { EnrollmentService, FILE_GROUP_MAP } from '../services/enrollment-service.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { EvaluationView } from './evaluation-view.js';
import { CONFIG } from '../config.js';

export class AttendanceView {
  constructor() {
    this.readinessService = new AcademicReadinessService();
    this.attendanceService = new AttendanceService();
    this.enrollmentService = new EnrollmentService();
    this.templateEngine = new PdfTemplateEngine();
    this.blobUrl = null;
    this.isTestEnv = false;
    this.currentGroupCode = 'GRP-BD-001';
    this.currentFecha = new Date().toISOString().substring(0, 10);
    this.currentUnidadId = 'UNID-TEST-001';
    this.currentSesionId = 'SES-20260912-01';
    this.studentsList = [];
    this.attendanceStateMap = {};
  }

  async render(container) {
    if (!container) return;

    const readiness = await this.readinessService.getAcademicReadinessSummary();

    container.innerHTML = `
      <div class="attendance-page-container">
        <!-- Header & Nav Tabs -->
        <div class="card header-card mb-4">
          <div class="card-header flex-between flex-wrap gap-3">
            <div>
              <h2 class="card-title text-primary"><i class="icon">📋</i> Registro Académico</h2>
              <p class="card-subtitle">Control de Asistencia y Evaluaciones de Estudiantes CETPRO</p>
            </div>
            <div class="flex-gap-2">
              ${CONFIG.IS_V2_CANDIDATE ? `<span class="badge">${CONFIG.DB.NAME} · GROUP por groupId</span>` : `<button id="btn-toggle-m06-test-mode" class="btn ${this.isTestEnv ? 'btn-warning' : 'btn-outline-primary'}">
                <i class="icon">${this.isTestEnv ? '⚠️' : '🧪'}</i> ${this.isTestEnv ? 'Modo: ENTORNO AISLADO (TEST_DB)' : 'Probar en Entorno Aislado (TEST_DB)'}
              </button>`}
            </div>
          </div>
          
          <div class="tab-navigation mt-3" style="display:flex; gap:0.5rem; border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem;">
            <button class="tab-btn active" data-tab="asistencia" style="padding:0.6rem 1.2rem; font-weight:600; border:none; background:#2563eb; color:#ffffff; border-radius:4px; cursor:pointer;">
              <i class="icon">✅</i> ASISTENCIA (M06)
            </button>
            <button class="tab-btn" id="btn-tab-evaluacion" data-tab="evaluacion" style="padding:0.6rem 1.2rem; font-weight:600; border:none; background:#f1f5f9; color:#475569; border-radius:4px; cursor:pointer;">
              <i class="icon">📊</i> EVALUACIÓN (M07)
            </button>
          </div>
        </div>

        <!-- Main Content Panel -->
        <div id="attendance-content-panel">
          ${this.isTestEnv && !CONFIG.IS_V2_CANDIDATE ? this._renderTestModeUI() : this._renderProductionBlockedUI(readiness)}
        </div>
      </div>
    `;

    this._bindEvents(container);
  }

  _renderProductionBlockedUI(readiness) {
    return `
      <div class="card blocked-readiness-card p-5 text-center">
        <div class="blocked-icon mb-3" style="font-size: 3.5rem;">🔒</div>
        <h3 class="text-danger font-weight-bold mb-2">ASISTENCIA — CONFIGURACIÓN ACADÉMICA PENDIENTE</h3>
        <p class="text-muted max-w-600 margin-auto mb-4">
          ${CONFIG.IS_V2_CANDIDATE ? `No es posible registrar asistencia en la base candidata aislada (<code>${CONFIG.DB.NAME}</code>): faltan B-004, B-007 y B-002 según GRUPO_ACADEMICO.` : 'No es posible registrar asistencia en la base productiva (<code>CETPRO_DB</code>) porque la estructura lectiva oficial aún no ha sido entregada por la Jefatura del CETPRO.'}
        </p>

        <div class="readiness-status-box max-w-500 margin-auto p-4 border-rounded bg-light text-left mb-4">
          <h4 class="font-weight-bold mb-3 border-bottom pb-2">Estado de Prerrequisitos Obligatorios:</h4>
          <ul class="status-list pl-3 mb-0" style="list-style: none;">
            <li class="mb-2 text-danger">
              <span class="status-icon">❌</span> <strong>Periodo Académico Oficial:</strong> PENDIENTE (${readiness.periodosCount} activos)
            </li>
            <li class="mb-2 text-danger">
              <span class="status-icon">❌</span> <strong>Módulo por Grupo Técnico:</strong> PENDIENTE (${readiness.groupsWithModule} / ${readiness.totalGroups} asignados)
            </li>
            <li class="mb-2 text-danger">
              <span class="status-icon">❌</span> <strong>Unidades Didácticas Oficiales:</strong> PENDIENTE (0 configuradas, Bloqueo B-002)
            </li>
          </ul>
        </div>

        <p class="text-secondary text-sm mb-4">
          <em>Cuando la Jefatura entregue la resolución del periodo y el plan de estudios con las Unidades Didácticas oficiales, esta pantalla se habilitará automáticamente.</em>
        </p>

        <div class="action-buttons flex-center gap-3">
          <a href="#/inicio" class="btn btn-secondary"><i class="icon">🏠</i> Volver al Inicio</a>
          <button id="btn-activate-test-env-inline" class="btn btn-warning"><i class="icon">🧪</i> Probar Flujo Completo en Entorno Aislado</button>
        </div>

        <div class="card mt-4 p-4 border-rounded bg-light text-left">
          <h4 class="font-weight-bold mb-2 text-primary">Previsualización Técnica — Registro de Asistencia UD1 (TMPL-05)</h4>
          <p class="text-muted text-sm mb-3">
            Demostración del motor vectorial calibrado sobre la plantilla canónica A3 landscape (40 filas × 44 sesiones) con marcas operativas (P, F, J).
          </p>
          <div class="flex-gap-2">
            <button id="btn-generate-tmpl05-candidate" class="btn btn-primary">Generar Asistencia UD1 (TMPL-05)</button>
          </div>
          <div id="attendance-tmpl05-viewer-output" class="mt-3" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  _renderTestModeUI() {
    return `
      <div class="test-env-banner p-3 mb-4 bg-warning-light border-warning border-rounded flex-between flex-wrap gap-2">
        <div class="flex-align-center gap-2">
          <span style="font-size: 1.5rem;">⚠️</span>
          <div>
            <strong>ENTORNO DE PRUEBAS AISLADO ACTIVO (<code>CETPRO_M06_TEST_DB</code>)</strong>
            <div class="text-xs text-muted">Todos los datos generados en esta vista son ficticios (TEST_ONLY) y no afectan la base productiva.</div>
          </div>
        </div>
        <button id="btn-exit-test-mode" class="btn btn-sm btn-outline-danger">Salir de Modo Pruebas</button>
      </div>

      <!-- Filters & Context Selection -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="form-row grid-cols-1-1-1-1 gap-3">
            <div>
              <label for="select-test-group" class="form-label font-weight-bold">Grupo Técnico (TEST_ONLY):</label>
              <select id="select-test-group" class="form-control">
                ${FILE_GROUP_MAP.map(g => `<option value="${g.grupoCode}" ${g.grupoCode === this.currentGroupCode ? 'selected' : ''}>${g.grupoCode} - ${escapeHtml(g.nombreDisplay)}</option>`).join('')}
              </select>
            </div>

            <div>
              <label for="select-test-unit" class="form-label font-weight-bold">Unidad Didáctica (TEST_ONLY):</label>
              <select id="select-test-unit" class="form-control">
                <option value="UNID-TEST-001" ${this.currentUnidadId === 'UNID-TEST-001' ? 'selected' : ''}>UD1 - Fundamentos Técnicos (TEST_ONLY)</option>
                <option value="UNID-TEST-002" ${this.currentUnidadId === 'UNID-TEST-002' ? 'selected' : ''}>UD2 - Aplicaciones Prácticas (TEST_ONLY)</option>
                <option value="UNID-TEST-003" ${this.currentUnidadId === 'UNID-TEST-003' ? 'selected' : ''}>UD3 - Taller de Especialidad (TEST_ONLY)</option>
                <option value="UNID-TEST-007" ${this.currentUnidadId === 'UNID-TEST-007' ? 'selected' : ''}>UD7 - Proyecto Integrador (TEST_ONLY - Fuera de UD1-UD6)</option>
              </select>
            </div>

            <div>
              <label for="select-test-session" class="form-label font-weight-bold">Sesión Lectiva (sesionId):</label>
              <select id="select-test-session" class="form-control">
                <option value="SES-20260912-01" ${this.currentSesionId === 'SES-20260912-01' ? 'selected' : ''}>Sesión A (SES-20260912-01)</option>
                <option value="SES-20260912-02" ${this.currentSesionId === 'SES-20260912-02' ? 'selected' : ''}>Sesión B (Misma fecha/unidad) (SES-20260912-02)</option>
              </select>
            </div>

            <div>
              <label for="input-test-fecha" class="form-label font-weight-bold">Fecha de Clase:</label>
              <input type="date" id="input-test-fecha" class="form-control" value="${this.currentFecha}">
            </div>
          </div>
          <div class="mt-3 flex-between flex-wrap gap-2">
            <span class="text-xs text-muted"><em>Motor desacoplado: registra cualquier unidad oficial o de prueba sin exigir plantilla documental As-7.</em></span>
            <button id="btn-load-test-attendance" class="btn btn-primary"><i class="icon">🔍</i> Cargar Estudiantes de la Sesión</button>
          </div>
        </div>
      </div>

      <!-- Attendance Table / List -->
      <div class="card mb-4">
        <div class="card-header flex-between align-items-center">
          <h3 class="card-title"><i class="icon">👥</i> Lista de Estudiantes — ${this.currentGroupCode} [${this.currentSesionId}]</h3>
          <div class="flex-gap-2">
            <button id="btn-mark-all-present" class="btn btn-sm btn-outline-success">Marcar Todos Presente</button>
            <button id="btn-save-test-attendance" class="btn btn-success"><i class="icon">💾</i> Registrar Nueva Asistencia</button>
          </div>
        </div>
        <div class="card-body p-0">
          <div id="test-attendance-table-container" class="table-responsive">
            <div class="p-4 text-center text-muted">Haga clic en "Cargar Estudiantes" para visualizar el listado.</div>
          </div>
        </div>
      </div>

      <!-- Audit History Log Modal/Box -->
      <div id="test-audit-log-container" class="card">
        <div class="card-header">
          <h4 class="card-title text-sm"><i class="icon">📜</i> Bitácora de Auditoría (TEST_ONLY)</h4>
        </div>
        <div class="card-body text-xs text-muted" id="test-audit-records">
          Sin eventos recientes en esta sesión.
        </div>
      </div>
    `;
  }

  _bindEvents(container) {
    const btnToggle = container.querySelector('#btn-toggle-m06-test-mode');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.isTestEnv = !this.isTestEnv;
        this.render(container);
      });
    }

    const btnInline = container.querySelector('#btn-activate-test-env-inline');
    if (btnInline) {
      btnInline.addEventListener('click', () => {
        this.isTestEnv = true;
        this.render(container);
      });
    }

    const btnExit = container.querySelector('#btn-exit-test-mode');
    if (btnExit) {
      btnExit.addEventListener('click', () => {
        this.isTestEnv = false;
        this.render(container);
      });
    }

    const btnTabEval = container.querySelector('#btn-tab-evaluacion');
    if (btnTabEval) {
      btnTabEval.addEventListener('click', async () => {
        const evalView = new EvaluationView({ isTestEnv: this.isTestEnv });
        await evalView.render(container, 'evaluacion');
      });
    }

    const btnTmpl05 = container.querySelector('#btn-generate-tmpl05-candidate');
    if (btnTmpl05) {
      btnTmpl05.addEventListener('click', async () => {
        await this._generateTmpl05Preview(container);
      });
    }

    if (this.isTestEnv) {
      const btnLoad = container.querySelector('#btn-load-test-attendance');
      if (btnLoad) {
        btnLoad.addEventListener('click', () => this._loadTestGroupStudents(container));
      }

      const btnMarkAll = container.querySelector('#btn-mark-all-present');
      if (btnMarkAll) {
        btnMarkAll.addEventListener('click', () => {
          container.querySelectorAll('.select-student-state').forEach(sel => {
            sel.value = OFFICIAL_ATTENDANCE_STATES.PRESENTE;
          });
        });
      }

      const btnSave = container.querySelector('#btn-save-test-attendance');
      if (btnSave) {
        btnSave.addEventListener('click', () => this._saveTestAttendance(container));
      }
    }
  }

  async _loadTestGroupStudents(container) {
    const groupSelect = container.querySelector('#select-test-group');
    const unitSelect = container.querySelector('#select-test-unit');
    const sessionSelect = container.querySelector('#select-test-session');
    const fechaInput = container.querySelector('#input-test-fecha');

    if (groupSelect) this.currentGroupCode = groupSelect.value;
    if (unitSelect) this.currentUnidadId = unitSelect.value;
    if (sessionSelect) this.currentSesionId = sessionSelect.value;
    if (fechaInput) this.currentFecha = fechaInput.value;

    const tableContainer = container.querySelector('#test-attendance-table-container');
    if (!tableContainer) return;

    tableContainer.innerHTML = `<div class="p-4 text-center text-muted">Cargando matrículas de ${this.currentGroupCode}...</div>`;

    const enrollments = await this.enrollmentService.getByGrupoCode(this.currentGroupCode);

    if (enrollments.length === 0) {
      tableContainer.innerHTML = `<div class="p-4 text-center text-warning">No se encontraron matrículas pertenecientes al grupo ${this.currentGroupCode}.</div>`;
      return;
    }

    this.studentsList = enrollments;

    let html = `
      <table class="table table-hover table-striped mb-0 align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>Estudiante</th>
            <th>Documento</th>
            <th>Grupo</th>
            <th>Sesión</th>
            <th>Estado de Asistencia</th>
            <th>Acciones / Observación</th>
          </tr>
        </thead>
        <tbody>
    `;

    enrollments.forEach((mat, idx) => {
      const currentState = this.attendanceStateMap[`${mat.id}_${this.currentSesionId}`] || OFFICIAL_ATTENDANCE_STATES.PRESENTE;
      const isSaved = !!this.attendanceStateMap[`SAVED_${mat.id}_${this.currentSesionId}`];
      const savedId = this.attendanceStateMap[`ID_${mat.id}_${this.currentSesionId}`] || null;

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(mat.estudianteNombreCompleto || 'Estudiante #' + (idx + 1))}</strong></td>
          <td><code>${escapeHtml(mat.numeroDocumento || 'SIN_DNI')}</code></td>
          <td><span class="badge badge-outline">${mat.grupoCode}</span></td>
          <td><span class="badge badge-info">${this.currentSesionId}</span></td>
          <td>
            <select class="form-control form-control-sm select-student-state" data-matricula-id="${mat.id}" data-estudiante-id="${mat.estudianteId}">
              <option value="${OFFICIAL_ATTENDANCE_STATES.PRESENTE}" ${currentState === OFFICIAL_ATTENDANCE_STATES.PRESENTE ? 'selected' : ''}>✅ ${OFFICIAL_ATTENDANCE_STATES.PRESENTE}</option>
              <option value="${OFFICIAL_ATTENDANCE_STATES.FALTA}" ${currentState === OFFICIAL_ATTENDANCE_STATES.FALTA ? 'selected' : ''}>❌ ${OFFICIAL_ATTENDANCE_STATES.FALTA}</option>
              <option value="${OFFICIAL_ATTENDANCE_STATES.TARDANZA}" ${currentState === OFFICIAL_ATTENDANCE_STATES.TARDANZA ? 'selected' : ''}>⏳ ${OFFICIAL_ATTENDANCE_STATES.TARDANZA}</option>
              <option value="${OFFICIAL_ATTENDANCE_STATES.JUSTIFICADO}" ${currentState === OFFICIAL_ATTENDANCE_STATES.JUSTIFICADO ? 'selected' : ''}>📝 ${OFFICIAL_ATTENDANCE_STATES.JUSTIFICADO}</option>
            </select>
          </td>
          <td>
            <div class="flex-gap-2">
              <input type="text" class="form-control form-control-sm input-student-obs" data-matricula-id="${mat.id}" placeholder="Observación opcional...">
              ${isSaved ? `<button class="btn btn-xs btn-outline-warning btn-edit-explicit" data-asis-id="${savedId}" data-matricula-id="${mat.id}">✏️ Editar</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    tableContainer.innerHTML = html;

    // Bind explicit edit buttons
    tableContainer.querySelectorAll('.btn-edit-explicit').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleExplicitEdit(e, container));
    });
  }

  async _saveTestAttendance(container) {
    const selects = container.querySelectorAll('.select-student-state');
    if (selects.length === 0) {
      Notifications.warning('Primero debe cargar la lista de estudiantes.');
      return;
    }

    const asistencias = [];
    selects.forEach(sel => {
      const matriculaId = sel.dataset.matriculaId;
      const estudianteId = sel.dataset.estudianteId;
      const estado = sel.value;
      const obsInput = container.querySelector(`.input-student-obs[data-matricula-id="${matriculaId}"]`);
      const observaciones = obsInput ? obsInput.value : '';

      asistencias.push({ matriculaId, estudianteId, estado, observaciones });
    });

    try {
      // Usar servicio real de asistencia
      const result = await this.attendanceService.registerBatchAttendance({
        grupoCode: this.currentGroupCode,
        unidadId: this.currentUnidadId,
        fecha: this.currentFecha,
        sesionId: this.currentSesionId,
        asistencias
      });

      result.forEach(rec => {
        this.attendanceStateMap[`${rec.matriculaId}_${rec.sesionId}`] = rec.estado;
        this.attendanceStateMap[`SAVED_${rec.matriculaId}_${rec.sesionId}`] = true;
        this.attendanceStateMap[`ID_${rec.matriculaId}_${rec.sesionId}`] = rec.id;
      });

      Notifications.success(`Asistencia creada correctamente para ${asistencias.length} estudiantes (${this.currentGroupCode} - ${this.currentSesionId}).`);

      const auditBox = container.querySelector('#test-audit-records');
      if (auditBox) {
        auditBox.innerHTML = `
          <div>[${new Date().toLocaleTimeString()}] <strong>REGISTRO_ASISTENCIA (CREACIÓN)</strong>: sesionId='${this.currentSesionId}', unidadId='${this.currentUnidadId}', ${result.length} registros creados.</div>
        ` + auditBox.innerHTML;
      }

      this._loadTestGroupStudents(container);
    } catch (e) {
      Notifications.error(`Error al registrar asistencia: ${e.message}`);
      const auditBox = container.querySelector('#test-audit-records');
      if (auditBox) {
        auditBox.innerHTML = `
          <div class="text-danger">[${new Date().toLocaleTimeString()}] <strong>RECHAZO_DUPLICADO</strong>: ${e.message}</div>
        ` + auditBox.innerHTML;
      }
    }
  }

  async _handleExplicitEdit(e, container) {
    const btn = e.currentTarget;
    const asisId = btn.dataset.asisId;
    const matriculaId = btn.dataset.matriculaId;
    const sel = container.querySelector(`.select-student-state[data-matricula-id="${matriculaId}"]`);
    const obsInput = container.querySelector(`.input-student-obs[data-matricula-id="${matriculaId}"]`);

    if (!asisId || !sel) return;

    const nuevoEstado = sel.value;
    const observaciones = obsInput ? obsInput.value : '';

    try {
      const updated = await this.attendanceService.updateAttendance({
        id: asisId,
        estado: nuevoEstado,
        observaciones
      });

      this.attendanceStateMap[`${matriculaId}_${this.currentSesionId}`] = updated.estado;

      Notifications.success(`Asistencia modificada explícitamente (updateAttendance) para id ${asisId}. Nuevo estado: ${updated.estado}.`);

      const auditBox = container.querySelector('#test-audit-records');
      if (auditBox) {
        auditBox.innerHTML = `
          <div class="text-warning">[${new Date().toLocaleTimeString()}] <strong>EDICION_ASISTENCIA (UPDATE_EXPLÍCITO)</strong>: idAsistencia='${asisId}', sesionId='${updated.sesionId}', matriculaId='${matriculaId}', valorNuevo='${updated.estado}'.</div>
        ` + auditBox.innerHTML;
      }
    } catch (err) {
      Notifications.error(`Error al editar asistencia: ${err.message}`);
    }
  }

  async _generateTmpl05Preview(container) {
    const output = container.querySelector('#attendance-tmpl05-viewer-output');
    const btn = container.querySelector('#btn-generate-tmpl05-candidate');
    if (!output) return;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try {
      const sessions = Array.from({ length: 12 }, (_, j) => ({
        sessionId: `SES-CAND-${j + 1}`,
        fecha: `2026-09-${String(j + 1).padStart(2, '0')}`,
        ordenSesion: j + 1
      }));
      const rows = Array.from({ length: 25 }, (_, i) => ({
        'student.fullName': `ESTUDIANTE PILOTO ${String(i + 1).padStart(2, '0')}`,
        'attendance.presentCount': 10,
        'attendance.absentCount': 2,
        marksBySession: sessions.map((_, j) => ({
          estadoRegistro: j % 5 === 0 ? 'AUSENTE' : (j % 7 === 0 ? 'JUSTIFICADA' : 'PRESENTE')
        }))
      }));
      const blob = await this.templateEngine.renderAttendanceTMPL05({
        program: { nombre: 'COMPUTACIÓN E INFORMÁTICA' },
        period: { nombre: '2026-I' },
        module: { nombre: 'OFIMÁTICA' },
        unit: { nombre: 'OFIMÁTICA EMPRESARIAL', orden: 1 },
        group: { turno: 'NOCHE', ciclo: 'I', seccion: 'A' },
        institution: { nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"' },
        sessions,
        rows,
        demoMode: false
      });
      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = URL.createObjectURL(blob);
      output.style.display = 'block';
      output.innerHTML = `
        <div class="alert alert-success mt-2">
          <strong>TMPL-05 generada exitosamente.</strong> Vista previa técnica en modo borrador sobre plantilla canónica A3 landscape.
        </div>
        <div class="mvp-actions mb-2">
          <button id="btn-tmpl05-print" class="btn btn-secondary">Imprimir</button>
          <a class="btn btn-primary" href="${this.blobUrl}" download="TMPL-05_ASISTENCIA_PREVIEW.pdf">Descargar PDF</a>
        </div>
        <iframe title="Vista previa TMPL-05" src="${this.blobUrl}" width="100%" height="700" style="border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
      output.querySelector('#btn-tmpl05-print').onclick = () => {
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
