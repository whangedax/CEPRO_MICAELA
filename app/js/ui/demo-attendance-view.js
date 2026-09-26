import { getDB } from '../db/database.js';
import { AttendanceV2Repository } from '../repositories/attendance-v2-repository.js';
import { AttendanceSessionService } from '../services/attendance-session-service.js';
import { AttendanceDocumentContextService } from '../services/attendance-document-context-service.js';
import { AttendanceSummaryService } from '../services/attendance-summary-service.js';
import { ATTENDANCE_CAPTURE_STATES } from '../services/attendance-v2-domain.js';
import { MvpPdfService } from '../services/mvp-pdf-service.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';

const all = store => new Promise((resolve, reject) => {
  const request = getDB().transaction(store, 'readonly').objectStore(store).getAll();
  request.onsuccess = () => resolve(request.result || []);
  request.onerror = () => reject(request.error || new Error(`No se pudo leer ${store}.`));
});
const displayName = student => student?.nombresCompletoOriginal ||
  [student?.apellidoPaterno, student?.apellidoMaterno, student?.nombres].filter(Boolean).join(' ');

export class DemoAttendanceView {
  constructor() {
    this.repository = new AttendanceV2Repository(() => getDB());
    this.summaryService = new AttendanceSummaryService();
    this.sessionService = new AttendanceSessionService({ repository: this.repository, summaryService: this.summaryService });
    this.documentService = new AttendanceDocumentContextService({ repository: this.repository, summaryService: this.summaryService });
    this.templateEngine = new PdfTemplateEngine();
    this.pdf = new MvpPdfService();
    this.groupId = 'GAC-DEMO-A';
    this.unitId = 'UNI-DEMO-MOD-001-01';
    this.sessionId = 'ATS-DEMO-001';
    this.context = null;
    this.draft = null;
    this.blobUrl = null;
  }

  async render(container) {
    if (!isDemoRuntime()) {
      container.innerHTML = '<div class="alert alert-warning">La captura real continúa bloqueada. Ingrese al Modo Demostración para mostrar el flujo sintético.</div>';
      return;
    }
    const [groups, units, sessions] = await Promise.all([all('grupos_academicos'), all('unidades'), all('asistencia')]);
    const demoSessions = sessions.filter(row => row.recordType === 'ATTENDANCE_SESSION');
    const currentGroup = groups.find(group => group.id === this.groupId) || groups[0];
    if (currentGroup) this.groupId = currentGroup.id;
    const groupUnits = units.filter(unit => unit.moduloId === currentGroup?.moduloId);
    if (!groupUnits.some(unit => unit.id === this.unitId)) this.unitId = groupUnits[0]?.id || '';
    const contextSessions = demoSessions.filter(session => session.groupId === this.groupId && session.unidadId === this.unitId);
    if (!contextSessions.some(session => session.sessionId === this.sessionId)) this.sessionId = contextSessions[0]?.sessionId || '';

    container.innerHTML = `
      <section class="view-header"><div><h2>Registro Académico — Asistencia DEMO</h2>
        <p class="subtitle">Motor transaccional con estados técnicos; B-003 continúa abierta.</p></div>
        <span class="demo-badge">DEMOSTRACIÓN · NO OFICIAL</span></section>
      <div class="alert alert-warning"><strong>PORCENTAJE OFICIAL NO DISPONIBLE.</strong> Los conteos son demostrativos y no normativos.</div>
      <div class="card"><div class="grid grid-3">
        <div><label for="demo-att-group">Grupo demo</label><select id="demo-att-group" class="form-input">${groups.map(group => `<option value="${escapeHtml(group.id)}" ${group.id === this.groupId ? 'selected' : ''}>${escapeHtml(group.codigoVisible)}</option>`).join('')}</select></div>
        <div><label for="demo-att-unit">Unidad demo</label><select id="demo-att-unit" class="form-input">${groupUnits.map(unit => `<option value="${escapeHtml(unit.id)}" ${unit.id === this.unitId ? 'selected' : ''}>${escapeHtml(unit.nombre)}</option>`).join('')}</select></div>
        <div><label for="demo-att-session">Sesión demo</label><select id="demo-att-session" class="form-input">${contextSessions.map(session => `<option value="${escapeHtml(session.sessionId)}" ${session.sessionId === this.sessionId ? 'selected' : ''}>Sesión ${session.ordenSesion} · ${session.fecha}</option>`).join('')}</select></div>
      </div></div>
      <div id="demo-att-workspace" class="margin-top"><div class="card"><p>Preparando asistencia demo…</p></div></div>`;
    this.bindSelectors(container);
    await this.loadSession(container);
  }

  bindSelectors(container) {
    container.querySelector('#demo-att-group').onchange = async event => { this.groupId = event.target.value; this.unitId = ''; this.sessionId = ''; await this.render(container); };
    container.querySelector('#demo-att-unit').onchange = async event => { this.unitId = event.target.value; this.sessionId = ''; await this.render(container); };
    container.querySelector('#demo-att-session').onchange = async event => { this.sessionId = event.target.value; await this.loadSession(container); };
  }

  async loadSession(container) {
    const workspace = container.querySelector('#demo-att-workspace');
    if (!this.sessionId) {
      workspace.innerHTML = '<div class="alert alert-warning">El grupo seleccionado no tiene sesiones demo precargadas.</div>';
      return;
    }
    this.context = await this.repository.loadDocumentContext({
      groupId: this.groupId,
      periodoId: (await all('grupos_academicos')).find(group => group.id === this.groupId)?.periodoId,
      unidadId: this.unitId
    });
    const enrollmentIds = this.context.enrollments.map(item => item.id);
    this.draft = await this.sessionService.loadSession(this.sessionId, enrollmentIds);
    const studentMap = new Map(this.context.students.map(student => [student.id, student]));
    const enrollmentMap = new Map(this.context.enrollments.map(enrollment => [enrollment.id, enrollment]));
    const summary = this.summaryService.summarize({ sessions: [this.draft.session], marks: this.draft.marks });
    workspace.innerHTML = `
      <div class="grid grid-4 demo-att-counts">
        <div class="stat-card"><span class="stat-value" id="demo-count-present">${summary.presentCount}</span><span class="stat-label">Presentes</span></div>
        <div class="stat-card"><span class="stat-value" id="demo-count-absent">${summary.absentCount}</span><span class="stat-label">Ausentes</span></div>
        <div class="stat-card"><span class="stat-value" id="demo-count-justified">${summary.justifiedCount}</span><span class="stat-label">Justificadas</span></div>
        <div class="stat-card"><span class="stat-value" id="demo-count-unmarked">${summary.unmarkedCount}</span><span class="stat-label">Sin registro</span></div>
      </div>
      <div class="card margin-top"><div class="mvp-summary-header"><div><h3>${escapeHtml(this.context.group.codigoVisible)}</h3>
        <p>${escapeHtml(this.context.unit.nombre)} · ${escapeHtml(this.draft.session.fecha)} · versión ${this.draft.session.version}</p></div>
        <div class="mvp-actions"><button id="demo-mark-all" class="btn btn-secondary">Marcar todos presente</button><button id="demo-save-attendance" class="btn btn-primary">Guardar cambios DEMO</button></div></div>
        <div style="overflow-x:auto"><table class="table-info mvp-table"><thead><tr><th>N°</th><th>Estudiante</th><th>Documento</th><th>Estado técnico</th><th>Observación</th></tr></thead><tbody>
          ${this.draft.marks.map((mark, index) => {
            const enrollment = enrollmentMap.get(mark.matriculaId); const student = studentMap.get(enrollment?.estudianteId);
            return `<tr><td>${index + 1}</td><td>${escapeHtml(displayName(student))}</td><td>${escapeHtml(student?.numeroDocumento || '')}</td>
              <td><select class="form-input demo-att-state" data-enrollment-id="${escapeHtml(mark.matriculaId)}">${Object.values(ATTENDANCE_CAPTURE_STATES).map(state => `<option value="${state}" ${state === mark.estadoRegistro ? 'selected' : ''}>${state}</option>`).join('')}</select></td>
              <td><input class="form-input demo-att-observation" data-enrollment-id="${escapeHtml(mark.matriculaId)}" value="${escapeHtml(mark.observacion || '')}" maxlength="500"></td></tr>`;
          }).join('')}
        </tbody></table></div>
      </div>
      <div class="card margin-top"><h3>Documento de asistencia</h3>
        <p>Generación sobre la plantilla canónica ministerial A3 (TMPL-05) con cuadrícula calibrada de 44 sesiones y marcas operativas (P, F, J).</p>
        <div class="mvp-actions mb-3">
          <button id="demo-att-tmpl05" class="btn btn-primary">Generar Asistencia Oficial UD1 (TMPL-05)</button>
          <button id="demo-att-report" class="btn btn-secondary">Reporte Alternativo DEMO PDF</button>
        </div>
        <div id="demo-att-output" class="margin-top-sm"></div>
      </div>`;
    workspace.querySelector('#demo-mark-all').onclick = () => {
      workspace.querySelectorAll('.demo-att-state').forEach(select => { select.value = ATTENDANCE_CAPTURE_STATES.PRESENTE; });
      this.refreshCounts(workspace);
    };
    workspace.querySelectorAll('.demo-att-state').forEach(select => { select.onchange = () => this.refreshCounts(workspace); });
    workspace.querySelector('#demo-save-attendance').onclick = () => this.save(container);
    workspace.querySelector('#demo-att-tmpl05').onclick = () => this.generateTmpl05(workspace);
    workspace.querySelector('#demo-att-report').onclick = () => this.generateReport(workspace);
  }

  collect(workspace) {
    return this.draft.marks.map(mark => ({ ...mark,
      estadoRegistro: workspace.querySelector(`.demo-att-state[data-enrollment-id="${mark.matriculaId}"]`).value,
      observacion: workspace.querySelector(`.demo-att-observation[data-enrollment-id="${mark.matriculaId}"]`).value
    }));
  }

  refreshCounts(workspace) {
    const marks = this.collect(workspace);
    const summary = this.summaryService.summarize({ sessions: [this.draft.session], marks });
    workspace.querySelector('#demo-count-present').textContent = summary.presentCount;
    workspace.querySelector('#demo-count-absent').textContent = summary.absentCount;
    workspace.querySelector('#demo-count-justified').textContent = summary.justifiedCount;
    workspace.querySelector('#demo-count-unmarked').textContent = summary.unmarkedCount;
  }

  async save(container) {
    const workspace = container.querySelector('#demo-att-workspace');
    try {
      const result = await this.sessionService.saveDraft({ ...this.draft, marks: this.collect(workspace), dirty: true }, { operator: 'SISTEMA_DEMO' });
      Notifications.success(`Sesión DEMO guardada. Versión ${result.session.version}; ${result.summary.absentCount} ausentes.`);
      await this.loadSession(container);
    } catch (error) { Notifications.error(error.message); }
  }

  async generateTmpl05(workspace) {
    const output = workspace.querySelector('#demo-att-output');
    if (!output) return;
    const btn = workspace.querySelector('#demo-att-tmpl05');
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try {
      const documentContext = await this.documentService.buildAttendanceDocumentContext({
        groupId: this.groupId, unidadId: this.unitId, periodoId: this.context.group.periodoId, testOnly: true
      });
      const blob = await this.templateEngine.renderAttendanceTMPL05({
        ...documentContext,
        institution: { nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"' },
        group: this.context.group,
        rows: documentContext.rows,
        sessions: documentContext.sessions,
        demoMode: true
      });
      this.releasePdf();
      this.blobUrl = URL.createObjectURL(blob);
      output.innerHTML = `
        <div class="alert alert-success mt-2">
          <strong>Registro de Asistencia UD1 (TMPL-05) generado con éxito.</strong> Plantilla canónica A3 landscape con 44 sesiones y marcas centradas.
        </div>
        <div class="mvp-actions mb-2">
          <button id="demo-tmpl05-print" class="btn btn-secondary">Imprimir</button>
          <a class="btn btn-primary" href="${this.blobUrl}" download="TMPL-05_ASISTENCIA_DEMO.pdf">Descargar PDF</a>
        </div>
        <iframe title="Vista previa TMPL-05" src="${this.blobUrl}" width="100%" height="700" style="border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
      output.querySelector('#demo-tmpl05-print').onclick = () => {
        const frame = output.querySelector('iframe');
        frame?.contentWindow?.focus();
        frame?.contentWindow?.print();
      };
      output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      Notifications.error(error.message);
      output.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    }
  }

  async generateReport(workspace) {
    try {
      const documentContext = await this.documentService.buildAttendanceDocumentContext({
        groupId: this.groupId, unidadId: this.unitId, periodoId: this.context.group.periodoId, testOnly: true
      });
      const studentMap = new Map(this.context.students.map(student => [student.id, student]));
      const enrollmentMap = new Map(this.context.enrollments.map(enrollment => [enrollment.id, enrollment]));
      const marks = await this.repository.listMarksBySession(this.sessionId);
      const byEnrollment = new Map(marks.map(mark => [mark.matriculaId, mark]));
      const report = {
        program: this.context.program, group: { visibleCode: this.context.group.codigoVisible },
        rows: this.context.enrollments.map(enrollment => ({
          studentName: displayName(studentMap.get(enrollment.estudianteId)),
          document: studentMap.get(enrollment.estudianteId)?.numeroDocumento || '',
          state: byEnrollment.get(enrollment.id)?.estadoRegistro || 'SIN_REGISTRO',
          observation: byEnrollment.get(enrollment.id)?.observacion || ''
        }))
      };
      const blob = await this.pdf.renderAdministrativeAttendanceReport(report);
      this.releasePdf(); this.blobUrl = URL.createObjectURL(blob);
      const output = workspace.querySelector('#demo-att-output');
      output.innerHTML = `<div class="alert alert-info"><strong>${escapeHtml(documentContext.templateId)} DEMO:</strong> contexto autoritativo listo; celdas físicas no certificadas. Mostrando alternativa completa.</div>
        <div class="mvp-actions"><button id="demo-att-print" class="btn btn-secondary">Imprimir</button><a class="btn btn-primary" href="${this.blobUrl}" download="DEMO_ASISTENCIA_NO_OFICIAL.pdf">Descargar PDF</a></div>
        <iframe title="Vista previa asistencia DEMO" src="${this.blobUrl}" width="100%" height="650" style="border:0"></iframe>`;
      output.querySelector('#demo-att-print').onclick = () => { const frame = output.querySelector('iframe'); frame?.contentWindow?.focus(); frame?.contentWindow?.print(); };
    } catch (error) { Notifications.error(error.message); }
  }

  releasePdf() { if (this.blobUrl) URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
}
