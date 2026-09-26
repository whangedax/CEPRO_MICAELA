import { CONFIG } from '../config.js';
import { MvpAdminService } from '../services/mvp-admin-service.js';
import { MvpPdfService } from '../services/mvp-pdf-service.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';

export class EnrollmentRegisterView {
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
      container.innerHTML = '<div class="alert alert-warning">El registro por grupo académico requiere la aplicación v2.</div>';
      return;
    }
    const catalogs = await this.service.listCatalogs();
    this.groups = await this.service.listGroupSummaries();
    const requested = new URLSearchParams((globalThis.location?.hash || '').split('?')[1] || '').get('groupId') || '';
    const requestedGroup = this.groups.find(group => group.id === requested);
    container.innerHTML = `
      <section class="view-header"><div><h2>Registro de matrícula</h2>
        <p class="subtitle">Consulta por grupo y emisión de registro oficial modular.</p></div>
        <span class="badge badge-success">TMPL-03 DISPONIBLE · FORMATO OFICIAL MINISTERIAL CALIBRADO</span></section>
      <div class="card"><div class="grid grid-2">
        <div><label for="register-program">Programa</label><select id="register-program" class="form-input"><option value="">Seleccione programa…</option>
          ${catalogs.programs.map(program => `<option value="${escapeHtml(program.id)}" ${program.id === requestedGroup?.programaId ? 'selected' : ''}>${escapeHtml(program.nombre)}</option>`).join('')}</select></div>
        <div><label for="register-group">Grupo académico</label><select id="register-group" class="form-input"><option value="">Seleccione programa primero…</option></select></div>
      </div></div>
      <div id="register-workspace" class="margin-top"><div class="card empty-state"><p>Seleccione un grupo para construir el contexto.</p></div></div>`;
    const programSelect = container.querySelector('#register-program');
    const groupSelect = container.querySelector('#register-group');
    const fillGroups = () => {
      const rows = this.groups.filter(group => !programSelect.value || group.programaId === programSelect.value);
      groupSelect.innerHTML = '<option value="">Seleccione grupo…</option>' + rows.map(group =>
        `<option value="${escapeHtml(group.id)}">${escapeHtml(group.visibleCode)} (${group.enrollmentCount})</option>`).join('');
      if (requestedGroup && requestedGroup.programaId === programSelect.value) groupSelect.value = requestedGroup.id;
    };
    programSelect.onchange = () => { fillGroups(); this.releasePdf(); container.querySelector('#register-workspace').innerHTML = '<div class="card empty-state"><p>Seleccione un grupo.</p></div>'; };
    groupSelect.onchange = () => this.openGroup(container, groupSelect.value);
    fillGroups();
    if (requestedGroup) await this.openGroup(container, requestedGroup.id);
  }

  async openGroup(container, groupId) {
    const workspace = container.querySelector('#register-workspace');
    this.releasePdf();
    if (!groupId) return;
    workspace.dataset.groupId = groupId;
    workspace.innerHTML = '<div class="card"><p>Preparando registro…</p></div>';
    try {
      this.context = await this.service.buildGroupRoster(groupId);
      const { group, program, module, period, rows } = this.context;
      const pending = [!module && 'Módulo del grupo', !period && 'Periodo académico', 'Plan y unidades didácticas', 'Emisión oficial sujeta a validación final'].filter(Boolean);
      const isIncomplete = !module || !period;
      workspace.innerHTML = `
        <div class="card"><div class="mvp-summary-header"><div><h3>${escapeHtml(program.nombre)}</h3><p>Grupo ${escapeHtml(group.visibleCode)} · ${rows.length} matrícula(s)</p></div>
          <span class="badge badge-success">FORMATO OFICIAL DISPONIBLE</span></div>
          <div class="alert alert-info" style="margin-top:0.75rem;">
            <strong>TMPL-03 CALIBRADA Y HABILITADA:</strong> Plantilla oficial ministerial (<code>03_REGISTRO_DE_MATRICULA_MODULAR.pdf</code>) calibrada con enmascaramiento vectorial limpio en columna ordinal (x=18..40, y=35..1045) y numeración correlativa real. Emisión en PDF ministerial A3 disponible. Salida administrativa (PDF/CSV) disponible como reporte alternativo.
          </div>
          ${isIncomplete ? `
          <div class="alert alert-warning margin-top-sm" style="background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #d97706; padding:0.75rem; border-radius:4px;">
            <strong>⚠️ GRUPO CON CONFIGURACIÓN ACADÉMICA PENDIENTE:</strong>
            <span class="badge badge-warning" style="margin-left:0.5rem;">REVISIÓN REQUERIDA / DATOS PENDIENTES</span>
            <ul style="margin:0.5rem 0 0 1.25rem; font-size:0.85rem;">
              ${!module ? '<li>Módulo formativo no asignado oficialmente al grupo. Prohibida terminantemente su invención o asignación en tiempo de ejecución.</li>' : ''}
              ${!period ? '<li>Periodo académico no asignado oficialmente al grupo.</li>' : ''}
            </ul>
          </div>` : ''}
          <div class="grid grid-2 margin-top"><div><h4>Datos disponibles</h4><ul><li>Estudiantes y documentos</li><li>Programa y grupo</li><li>Estado de matrícula</li>${module ? '<li>Módulo confirmado</li>' : ''}${period ? '<li>Periodo confirmado</li>' : ''}</ul></div>
          <div><h4>Datos pendientes</h4><ul>${pending.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div>
          <div class="mvp-actions margin-top">
            <button id="register-tmpl03" class="btn btn-primary">Generar Registro Modular (TMPL-03 Oficial)</button>
            <button id="register-pdf" class="btn btn-secondary">Listado administrativo PDF</button>
            <button id="register-csv" class="btn btn-secondary">Descargar CSV</button>
          </div>
          <p id="register-generation-status" class="alert alert-info margin-top-sm" role="status" aria-live="polite">Plantilla oficial TMPL-03 lista para generación sobre PDF ministerial de ${rows.length} matrículas.</p>
        </div>
        <div id="register-output" class="margin-top"></div>
        <div class="card margin-top" style="overflow-x:auto"><table class="table-info mvp-table"><thead><tr><th>N°</th><th>Estudiante</th><th>Documento</th><th>Programa</th><th>Grupo</th><th>Estado</th><th>Módulo</th><th>Periodo</th></tr></thead>
          <tbody>${rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.studentName)}</td><td>${escapeHtml(row.document)}</td><td>${escapeHtml(program.nombre)}</td><td>${escapeHtml(group.visibleCode)}</td><td>${escapeHtml(row.enrollmentStatus)}</td><td>${escapeHtml(module?.nombreOficial || module?.nombre || 'Pendiente')}</td><td>${escapeHtml(period?.nombre || 'Pendiente')}</td></tr>`).join('') : '<tr><td colspan="8">Sin matrículas.</td></tr>'}</tbody></table></div>
        `;
      workspace.querySelector('#register-tmpl03').onclick = () => this.generateTmpl03(workspace);
      workspace.querySelector('#register-pdf').onclick = async () => this.generatePdf(workspace);
      workspace.querySelector('#register-csv').onclick = () => this.downloadCsv(workspace);
    } catch (error) {
      workspace.innerHTML = `<div class="alert alert-danger">No se pudo preparar el registro: ${escapeHtml(error.message)}</div>`;
    }
  }

  async generateTmpl03(workspace) {
    const button = workspace.querySelector('#register-tmpl03');
    const status = workspace.querySelector('#register-generation-status');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.className = 'alert alert-info margin-top-sm';
    status.textContent = `Generando Registro Modular Oficial (TMPL-03) con ${this.context.rows.length} matrículas…`;
    try {
      const blob = await this.templateEngine.renderDocument({
        documentType: 'TMPL-03',
        context: this.context,
        rows: this.context.rows,
        demoMode: isDemoRuntime()
      });
      this.releasePdf();
      this.blobUrl = URL.createObjectURL(blob);
      const output = workspace.querySelector('#register-output');
      const name = `${isDemoRuntime() ? 'DEMO_' : ''}REGISTRO_MODULAR_TMPL03_${this.context.group.visibleCode}`.replace(/[^A-Za-z0-9_.-]/g, '_');
      output.innerHTML = `<div class="card"><div class="mvp-summary-header"><h3>Registro de Matrícula Modular (TMPL-03 Oficial)</h3><div class="mvp-actions"><button id="register-print" class="btn btn-secondary">Imprimir</button><a class="btn btn-primary" href="${this.blobUrl}" download="${escapeHtml(name)}.pdf">Descargar PDF</a></div></div>
        <iframe title="Vista previa del Registro de Matrícula Modular Oficial" src="${this.blobUrl}" width="100%" height="650" style="border:0"></iframe></div>`;
      output.querySelector('#register-print').onclick = () => { const frame = output.querySelector('iframe'); frame?.contentWindow?.focus(); frame?.contentWindow?.print(); };
      status.className = 'alert alert-success margin-top-sm';
      status.textContent = `PDF oficial TMPL-03 generado correctamente: ${this.context.rows.length} matrículas en formato ministerial A3. Puede descargarlo o imprimirlo.`;
      output.scrollIntoView({ block: 'start', behavior: 'auto' });
    } catch (error) {
      status.className = 'alert alert-danger margin-top-sm';
      status.textContent = `No se pudo generar el Registro Modular Oficial TMPL-03: ${error.message}`;
      Notifications.error(error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  async generatePdf(workspace) {
    const button = workspace.querySelector('#register-pdf');
    const status = workspace.querySelector('#register-generation-status');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.className = 'alert alert-info margin-top-sm';
    status.textContent = `Generando registro administrativo PDF con ${this.context.rows.length} matrículas…`;
    try {
      const blob = await this.pdf.renderAdministrativeEnrollmentRegister(this.context);
      this.releasePdf();
      this.blobUrl = URL.createObjectURL(blob);
      const output = workspace.querySelector('#register-output');
      const name = `${isDemoRuntime() ? 'DEMO_' : ''}REGISTRO_ADMINISTRATIVO_${this.context.group.visibleCode}`.replace(/[^A-Za-z0-9_.-]/g, '_');
      output.innerHTML = `<div class="card"><div class="mvp-summary-header"><h3>Registro administrativo de matrículas</h3><div class="mvp-actions"><button id="register-print" class="btn btn-secondary">Imprimir</button><a class="btn btn-primary" href="${this.blobUrl}" download="${escapeHtml(name)}.pdf">Descargar PDF</a></div></div>
        <iframe title="Vista previa del registro administrativo" src="${this.blobUrl}" width="100%" height="650" style="border:0"></iframe></div>`;
      output.querySelector('#register-print').onclick = () => { const frame = output.querySelector('iframe'); frame?.contentWindow?.focus(); frame?.contentWindow?.print(); };
      status.className = 'alert alert-success margin-top-sm';
      status.textContent = `PDF generado correctamente: ${this.context.rows.length} matrículas. Puede descargarlo o imprimirlo.`;
      output.scrollIntoView({ block: 'start', behavior: 'auto' });
    } catch (error) {
      status.className = 'alert alert-danger margin-top-sm';
      status.textContent = `No se pudo generar el registro administrativo: ${error.message}`;
      Notifications.error(error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  downloadCsv(workspace) {
    const status = workspace.querySelector('#register-generation-status');
    try {
      const csv = this.pdf.buildEnrollmentRegisterCsv(this.context);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `${isDemoRuntime() ? 'DEMO_' : ''}REGISTRO_ADMINISTRATIVO_${this.context.group.visibleCode}.csv`.replace(/[^A-Za-z0-9_.-]/g, '_');
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
      status.className = 'alert alert-success margin-top-sm';
      status.textContent = `CSV preparado correctamente: ${this.context.rows.length} matrículas, sin truncamiento.`;
    } catch (error) {
      status.className = 'alert alert-danger margin-top-sm';
      status.textContent = `No se pudo preparar el CSV: ${error.message}`;
      Notifications.error(error.message);
    }
  }

  releasePdf() { if (this.blobUrl) URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
}
