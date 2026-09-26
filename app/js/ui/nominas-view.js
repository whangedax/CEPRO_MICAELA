import { CONFIG } from '../config.js';
import { MvpAdminService } from '../services/mvp-admin-service.js';
import { MvpPdfService, DRAFT_LABEL, INTERNAL_LABEL } from '../services/mvp-pdf-service.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';
import { DocumentPaginationPolicy, TMPL01_CANONICAL_CAPACITY } from '../services/document-pagination-policy.js';

export class NominasView {
  constructor() {
    this.service = new MvpAdminService();
    this.pdf = new MvpPdfService();
    this.templateEngine = new PdfTemplateEngine();
    this.groups = [];
    this.context = null;
    this.blobUrl = null;
  }

  async render(container) {
    if (!CONFIG.IS_V2_CANDIDATE) {
      container.innerHTML = '<div class="alert alert-warning">Nóminas por grupo académico estarán disponibles después del gate v2.</div>';
      return;
    }
    const catalogs = await this.service.listCatalogs();
    this.groups = await this.service.listGroupSummaries();
    const requested = new URLSearchParams((globalThis.location?.hash || '').split('?')[1] || '').get('groupId') || '';
    const requestedGroup = this.groups.find(group => group.id === requested);
    const initialProgram = requestedGroup?.programaId || '';
    container.innerHTML = `
      <section class="view-header"><div><h2>Nóminas</h2>
        <p class="subtitle">Vista administrativa por programa y grupo, con datos confirmados.</p></div>
        <span class="badge badge-warning">${isDemoRuntime() ? 'DEMOSTRACIÓN — NO OFICIAL' : 'EMISIÓN OFICIAL PENDIENTE'}</span></section>
      <div class="card mvp-selector-card">
        <div class="grid grid-2">
          <div><label for="roster-program">Programa</label>
            <select id="roster-program" class="form-input"><option value="">Seleccione programa…</option>
              ${catalogs.programs.map(program => `<option value="${escapeHtml(program.id)}" ${program.id === initialProgram ? 'selected' : ''}>${escapeHtml(program.nombre)}</option>`).join('')}
            </select></div>
          <div><label for="roster-group">Grupo académico</label><select id="roster-group" class="form-input"><option value="">Seleccione programa primero…</option></select></div>
        </div>
      </div>
      <div id="roster-workspace" class="margin-top"><div class="card empty-state"><p>Seleccione un grupo para preparar la nómina.</p></div></div>`;
    const programSelect = container.querySelector('#roster-program');
    const groupSelect = container.querySelector('#roster-group');
    const fillGroups = () => {
      const rows = this.groups.filter(group => !programSelect.value || group.programaId === programSelect.value);
      groupSelect.innerHTML = '<option value="">Seleccione grupo…</option>' + rows.map(group =>
        `<option value="${escapeHtml(group.id)}">${escapeHtml(group.visibleCode)} (${group.enrollmentCount} matrículas)</option>`).join('');
      if (requestedGroup && requestedGroup.programaId === programSelect.value) groupSelect.value = requestedGroup.id;
    };
    programSelect.onchange = () => { this.releasePdf(); this.context = null; fillGroups(); this.renderEmpty(container); };
    groupSelect.onchange = () => this.openGroup(container, groupSelect.value);
    fillGroups();
    if (requestedGroup) await this.openGroup(container, requestedGroup.id);
  }

  renderEmpty(container) {
    const workspace = container.querySelector('#roster-workspace');
    if (workspace) workspace.innerHTML = '<div class="card empty-state"><p>Seleccione un grupo para preparar la nómina.</p></div>';
  }

  async openGroup(container, groupId) {
    this.releasePdf();
    const workspace = container.querySelector('#roster-workspace');
    if (!groupId) return this.renderEmpty(container);
    workspace.dataset.groupId = groupId;
    workspace.innerHTML = '<div class="card"><p>Preparando nómina…</p></div>';
    try {
      this.context = await this.service.buildGroupRoster(groupId);
      const { group, program, module, period, rows } = this.context;
      const pagination = DocumentPaginationPolicy.plan('TMPL-01', rows.length, { mode: 'ADMINISTRATIVE_MULTIPAGE' });
      const capacityNotice = `<div class="alert alert-info"><strong>Salida administrativa completa.</strong> Este grupo tiene ${rows.length} estudiante(s). La plantilla institucional admite ${TMPL01_CANONICAL_CAPACITY} por página. Se generará una salida administrativa de ${pagination.pageCount} página(s), usando copias exactas de la página canónica. La emisión oficial multipágina continúa bloqueada.</div>`;
      const incompleteNotice = (!module || !period) ? `
        <div class="alert alert-warning margin-top-sm" style="background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #d97706; padding:0.75rem; border-radius:4px;">
          <strong>⚠️ GRUPO CON CONFIGURACIÓN ACADÉMICA PENDIENTE:</strong>
          <span class="badge badge-warning" style="margin-left:0.5rem;">REVISIÓN REQUERIDA / DATOS PENDIENTES</span>
          <ul style="margin:0.5rem 0 0 1.25rem; font-size:0.85rem;">
            ${!module ? '<li>Módulo formativo no asignado oficialmente al grupo. La nómina y portada permanecerán limpias en blanco en dicho campo sin inventar datos.</li>' : ''}
            ${!period ? '<li>Periodo académico no asignado oficialmente al grupo.</li>' : ''}
          </ul>
        </div>` : '';
      workspace.innerHTML = `
        <div class="card">
          <div class="mvp-summary-header"><div><h3>${escapeHtml(program.nombre)}</h3>
            <p>Grupo ${escapeHtml(group.visibleCode)} · ${rows.length} matrícula(s)</p></div>
            ${group.reviewDetails.length ? '<span class="badge badge-warning">REVISAR PROCEDENCIA</span>' : '<span class="badge badge-success">CONTEXTO IDENTIFICADO</span>'}</div>
          ${capacityNotice}
          ${incompleteNotice}
          <p class="mvp-draft-label">${DRAFT_LABEL}</p>
          <div class="mvp-actions">
            <button id="generate-tmpl01" class="btn btn-primary">Generar Nómina completa</button>
            <button id="generate-full-roster" class="btn btn-secondary">Generar reporte completo</button>
            <button id="generate-tmpl04" class="btn btn-secondary">Generar Portada (TMPL-04)</button>
          </div>
          <p id="roster-generation-status" class="alert alert-info margin-top-sm" role="status" aria-live="polite">Lista para generar ${pagination.pageCount} página(s) administrativas con ${rows.length} matrículas.</p>
          ${group.reviewDetails.length ? `<details class="margin-top-sm"><summary>Qué debe revisar Jefatura</summary><ul>${group.reviewDetails.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details>` : ''}
        </div>
        <div id="roster-pdf" class="margin-top"></div>
        <div class="card margin-top" style="overflow-x:auto"><h3>Estudiantes del grupo</h3>
          <table class="table-info mvp-table"><thead><tr><th>N°</th><th>Estudiante</th><th>Documento</th><th>Sexo</th><th>Fecha de nacimiento</th><th>Estado</th></tr></thead>
          <tbody>${rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.studentName)}</td><td>${escapeHtml(row.document || 'No registrado')}</td><td>${escapeHtml(row.sex)}</td><td>${escapeHtml(row.birthDate)}</td><td>${escapeHtml(row.enrollmentStatus)}</td></tr>`).join('') : '<tr><td colspan="6">El grupo no tiene matrículas.</td></tr>'}</tbody></table>
        </div>`;
      workspace.querySelector('#generate-tmpl01').onclick = async () => this.generateInstitutionalDraft(workspace);
      workspace.querySelector('#generate-full-roster').onclick = async () => this.generateCompleteReport(workspace);
      workspace.querySelector('#generate-tmpl04').onclick = async () => this.generateInstitutionalCover(workspace);
    } catch (error) {
      workspace.innerHTML = `<div class="alert alert-danger">No se pudo preparar la nómina: ${escapeHtml(error.message)}</div>`;
    }
  }

  async generateInstitutionalDraft(workspace) {
    const { rows, institution, program } = this.context;
    const button = workspace.querySelector('#generate-tmpl01');
    const status = workspace.querySelector('#roster-generation-status');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.className = 'alert alert-info margin-top-sm';
    status.textContent = `Generando nómina administrativa con ${rows.length} matrículas…`;
    try {
      const blob = await this.templateEngine.renderDocument({
        documentType: 'TMPL-01', mode: 'ADMINISTRATIVE_MULTIPAGE',
        context: { ...this.context, institution, program }, rows,
        demoMode: isDemoRuntime()
      });
      const pageCount = this.templateEngine.lastAdministrativePagination?.pageCount || 1;
      this.showPdf(workspace, blob, `${isDemoRuntime() ? 'DEMO_' : ''}NOMINA_ADMINISTRATIVA_COMPLETA_${this.context.group.visibleCode}.pdf`, 'Nómina administrativa completa TMPL-01');
      status.className = 'alert alert-success margin-top-sm';
      status.textContent = `Nómina generada correctamente: ${rows.length} matrículas en ${pageCount} página(s). Puede descargarla o imprimirla.`;
    } catch (error) {
      status.className = 'alert alert-danger margin-top-sm';
      status.textContent = `No se pudo generar la nómina: ${error.message}`;
      Notifications.error(error.code === 'CAPACITY_EXCEEDED' ? 'La plantilla física admite un máximo de 30 estudiantes.' : error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  async generateCompleteReport(workspace) {
    const button = workspace.querySelector('#generate-full-roster');
    const status = workspace.querySelector('#roster-generation-status');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.className = 'alert alert-info margin-top-sm';
    status.textContent = `Generando reporte completo con ${this.context.rows.length} matrículas…`;
    try {
      const blob = await this.pdf.renderAdministrativeRoster(this.context);
      this.showPdf(workspace, blob, `${isDemoRuntime() ? 'DEMO_' : ''}LISTADO_COMPLETO_${this.context.group.visibleCode}.pdf`, INTERNAL_LABEL);
      status.className = 'alert alert-success margin-top-sm';
      status.textContent = `Reporte completo generado correctamente: ${this.context.rows.length} matrículas. Puede descargarlo o imprimirlo.`;
    } catch (error) {
      status.className = 'alert alert-danger margin-top-sm';
      status.textContent = `No se pudo generar el reporte completo: ${error.message}`;
      Notifications.error(error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  async generateInstitutionalCover(workspace) {
    const button = workspace.querySelector('#generate-tmpl04');
    const status = workspace.querySelector('#roster-generation-status');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.className = 'alert alert-info margin-top-sm';
    status.textContent = 'Generando portada de registro (TMPL-04)…';
    try {
      const blob = await this.templateEngine.renderDocument({
        documentType: 'TMPL-04',
        context: this.context,
        demoMode: isDemoRuntime()
      });
      this.showPdf(workspace, blob, `${isDemoRuntime() ? 'DEMO_' : ''}PORTADA_REGISTRO_${this.context.group.visibleCode}.pdf`, 'Portada de Registro de Asistencia y Evaluación TMPL-04');
      status.className = 'alert alert-success margin-top-sm';
      status.textContent = 'Portada generada correctamente. Puede descargarla o imprimirla.';
    } catch (error) {
      status.className = 'alert alert-danger margin-top-sm';
      status.textContent = `No se pudo generar la portada: ${error.message}`;
      Notifications.error(error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  showPdf(workspace, blob, fileName, title) {
    this.releasePdf();
    this.blobUrl = URL.createObjectURL(blob);
    const target = workspace.querySelector('#roster-pdf');
    const safeName = fileName.replace(/[^A-Za-z0-9_.-]/g, '_');
    target.innerHTML = `<div class="card"><div class="mvp-summary-header"><h3>${escapeHtml(title)}</h3><div class="mvp-actions">
      <button id="roster-print" class="btn btn-secondary">Imprimir</button><a class="btn btn-primary" href="${this.blobUrl}" download="${escapeHtml(safeName)}">Descargar PDF</a></div></div>
      <iframe title="Vista previa de nómina" src="${this.blobUrl}" width="100%" height="650" style="border:0"></iframe></div>`;
    target.querySelector('#roster-print').onclick = () => {
      const frame = target.querySelector('iframe'); frame?.contentWindow?.focus(); frame?.contentWindow?.print();
    };
    target.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  releasePdf() { if (this.blobUrl) URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
}
