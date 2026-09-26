import { EnrollmentRepository } from '../repositories/enrollment-repository.js';
import { MvpAdminService, SOURCE_CONFIRMATION_TEXT } from '../services/mvp-admin-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';

export class CandidateEnrollmentsView {
  constructor() { this.mvp = new MvpAdminService(); this.repo = new EnrollmentRepository(); this.catalogs = null; this.groups = []; this.rows = []; }

  async render(container) {
    this.catalogs = await this.mvp.listCatalogs();
    this.groups = await this.mvp.listGroupSummaries();
    const requestedGroupId = new URLSearchParams((globalThis.location?.hash || '').split('?')[1] || '').get('groupId') || '';
    const rawRows = requestedGroupId ? await this.repo.searchEnrollments('', { groupId: requestedGroupId }) : await this.repo.searchEnrollments();
    const groupMap = new Map(this.groups.map(group => [group.id, group]));
    const programMap = new Map(this.catalogs.programs.map(program => [program.id, program]));
    this.rows = rawRows.map(row => ({ ...row, group: groupMap.get(row.grupoId), program: programMap.get(row.programaId) }));
    container.innerHTML = `
      <section class="view-header"><div><h2>Matrículas</h2><p class="subtitle">Consulta y alta administrativa por grupo académico.</p></div>
        <button id="new-enrollment" class="btn btn-primary">+ Nueva matrícula</button></section>
      <div id="enrollment-form-panel" style="display:none"></div>
      <div class="card margin-bottom-sm"><div style="display:flex;gap:.75rem;flex-wrap:wrap"><input id="candidate-enrollment-search" class="form-input" type="search" placeholder="Buscar estudiante, documento, programa o grupo" style="flex:1;min-width:250px">
        <select id="candidate-enrollment-program" class="form-input"><option value="">Todos los programas</option>${this.catalogs.programs.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('')}</select></div></div>
      <div id="candidate-enrollment-list">${this.renderList(this.rows)}</div>`;
    container.querySelector('#new-enrollment').onclick = () => this.showForm(container);
    const search = container.querySelector('#candidate-enrollment-search');
    const program = container.querySelector('#candidate-enrollment-program');
    const filter = () => {
      const q = search.value.toLocaleLowerCase('es');
      const filtered = this.rows.filter(row => (!program.value || row.programaId === program.value) &&
        [row.estudianteNombreCompleto, row.estudianteDocumento, row.program?.nombre, row.group?.visibleCode].some(value => String(value || '').toLocaleLowerCase('es').includes(q)));
      container.querySelector('#candidate-enrollment-list').innerHTML = this.renderList(filtered);
    };
    search.oninput = filter; program.onchange = filter;
  }

  renderList(rows) {
    if (!rows.length) return '<div class="card empty-state"><p>No se encontraron matrículas.</p></div>';
    return `<div class="card" style="overflow-x:auto"><table class="table-info mvp-table"><thead><tr><th>Estudiante</th><th>Documento</th><th>Programa</th><th>Grupo</th><th>Módulo</th><th>Periodo</th><th>Estado</th></tr></thead><tbody>
      ${rows.map(row => `<tr><td>${escapeHtml(row.estudianteNombreCompleto)}</td><td>${escapeHtml(row.estudianteDocumento || 'No registrado')}</td><td>${escapeHtml(row.program?.nombre || row.programaNombre)}</td><td>${escapeHtml(row.group?.visibleCode || row.grupoCode)}</td><td>${escapeHtml(row.group?.module?.nombreOficial || row.group?.module?.nombre || 'Pendiente')}</td><td>${escapeHtml(row.group?.period?.nombre || 'Pendiente')}</td><td><span class="badge badge-secondary">${escapeHtml(row.estado)}</span></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  showForm(container) {
    const panel = container.querySelector('#enrollment-form-panel');
    panel.style.display = 'block';
    panel.innerHTML = `<div class="card margin-bottom-sm"><div class="mvp-summary-header"><div><h3>Nueva matrícula</h3><p>Seleccione registros existentes o cree un grupo administrativo futuro.</p></div><button id="close-enrollment-form" class="btn btn-secondary">Cerrar</button></div>
      <form id="candidate-enrollment-form"><div class="grid grid-2">
        <div><label for="enrollment-student-search">Buscar estudiante</label><input id="enrollment-student-search" class="form-input" type="search" placeholder="Documento o nombre"><select id="enrollment-student" class="form-input margin-top-sm" size="5"></select><a href="#/estudiantes" class="btn btn-secondary margin-top-sm">Crear estudiante</a></div>
        <div><label for="enrollment-program">Programa</label><select id="enrollment-program" class="form-input"><option value="">Seleccione programa…</option>${this.catalogs.programs.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('')}</select>
          <label for="enrollment-group" class="margin-top-sm">Grupo académico</label><select id="enrollment-group" class="form-input"><option value="">Seleccione programa primero…</option></select></div>
      </div>
      <div id="future-group-fields" class="mvp-context-note margin-top-sm" style="display:none"><h4>Nuevo grupo administrativo futuro</h4><div class="grid grid-3">
        <div><label for="future-code">Código visible</label><input id="future-code" class="form-input" type="text"></div>
        <div><label for="future-period">Periodo opcional</label><select id="future-period" class="form-input"><option value="">Pendiente</option>${this.catalogs.periods.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('')}</select></div>
        <div><label for="future-module">Módulo opcional</label><select id="future-module" class="form-input"><option value="">Pendiente</option></select></div>
        <div><label for="future-shift">Turno</label><input id="future-shift" class="form-input" type="text"></div><div><label for="future-mode">Modalidad</label><input id="future-mode" class="form-input" type="text"></div><div><label for="future-section">Sección</label><input id="future-section" class="form-input" type="text"></div>
      </div></div>
      <div class="grid grid-3 margin-top-sm"><div><label for="enrollment-source-type">Tipo de fuente</label><select id="enrollment-source-type" class="form-input"><option value="">Seleccione…</option><option value="FICHA_AUTORIZADA">Ficha autorizada</option><option value="SOLICITUD_MATRICULA">Solicitud de matrícula</option><option value="OTRO_AUTORIZADO">Otra fuente autorizada</option></select></div>
        <div><label for="enrollment-source-description">Descripción de la fuente</label><input id="enrollment-source-description" class="form-input" type="text"></div><div><label for="enrollment-confirmed-by">Confirmado por</label><input id="enrollment-confirmed-by" class="form-input" type="text"></div></div>
      <label class="mvp-confirmation"><input id="enrollment-source-confirmed" type="checkbox"> ${SOURCE_CONFIRMATION_TEXT}</label>
      <button class="btn btn-primary margin-top-sm" type="submit">Guardar matrícula</button></form></div>`;
    panel.querySelector('#close-enrollment-form').onclick = () => { panel.style.display = 'none'; panel.replaceChildren(); };
    const studentSearch = panel.querySelector('#enrollment-student-search'); const studentSelect = panel.querySelector('#enrollment-student');
    const fillStudents = () => {
      const q = studentSearch.value.toLocaleLowerCase('es');
      const students = this.catalogs.students.filter(student => [student.numeroDocumento, student.apellidoPaterno, student.apellidoMaterno, student.nombres, student.nombresCompletoOriginal].some(value => String(value || '').toLocaleLowerCase('es').includes(q))).slice(0, 50);
      studentSelect.innerHTML = students.map(student => `<option value="${escapeHtml(student.id)}">${escapeHtml([student.apellidoPaterno, student.apellidoMaterno, student.nombres].filter(Boolean).join(' '))} · ${escapeHtml(student.numeroDocumento || 'sin documento')}</option>`).join('');
    };
    fillStudents(); studentSearch.oninput = fillStudents;
    const program = panel.querySelector('#enrollment-program'); const group = panel.querySelector('#enrollment-group'); const future = panel.querySelector('#future-group-fields'); const futureModule = panel.querySelector('#future-module');
    const fillProgramOptions = () => {
      const groups = this.groups.filter(item => item.programaId === program.value);
      group.innerHTML = '<option value="">Seleccione grupo…</option>' + groups.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.visibleCode)} (${item.enrollmentCount})</option>`).join('') + '<option value="__NEW__">+ Crear grupo administrativo futuro</option>';
      const modules = this.catalogs.modules.filter(item => item.programaId === program.value);
      futureModule.innerHTML = '<option value="">Pendiente</option>' + modules.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombreOficial || item.nombre)}</option>`).join('');
      future.style.display = 'none';
    };
    program.onchange = fillProgramOptions; group.onchange = () => { future.style.display = group.value === '__NEW__' ? 'block' : 'none'; };
    panel.querySelector('#candidate-enrollment-form').onsubmit = async event => {
      event.preventDefault();
      try {
        if (!window.confirm('¿Confirma registrar esta matrícula con la información mostrada?')) return;
        const isFuture = group.value === '__NEW__';
        const result = await this.mvp.createEnrollment({ estudianteId: studentSelect.value, programaId: program.value,
          groupId: isFuture ? '' : group.value,
          futureGroup: isFuture ? { codigoVisible: panel.querySelector('#future-code').value,
            periodoId: panel.querySelector('#future-period').value, moduloId: futureModule.value,
            turno: panel.querySelector('#future-shift').value, modalidad: panel.querySelector('#future-mode').value,
            seccion: panel.querySelector('#future-section').value, estado: 'ACTIVO' } : null,
          sourceType: panel.querySelector('#enrollment-source-type').value,
          sourceDescription: panel.querySelector('#enrollment-source-description').value,
          confirmedBy: panel.querySelector('#enrollment-confirmed-by').value,
          sourceConfirmed: panel.querySelector('#enrollment-source-confirmed').checked,
          confirmationText: panel.querySelector('#enrollment-source-confirmed').checked ? SOURCE_CONFIRMATION_TEXT : '' });
        Notifications.success(`Matrícula registrada para ${result.enrollment.estudianteNombreCompleto}.`); await this.render(container);
      } catch (error) { Notifications.error(error.message); }
    };
  }
}
