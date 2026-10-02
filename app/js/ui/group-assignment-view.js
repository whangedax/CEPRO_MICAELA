import { CONFIG } from '../config.js';
import { GroupAssignmentService } from '../services/group-assignment-service.js';
import { MvpAdminService } from '../services/mvp-admin-service.js';
import { AuthService } from '../services/auth-service.js';
import { TeacherContextService } from '../services/teacher-context-service.js';
import { Notifications } from './notifications.js';
import { escapeHtml } from '../utils/dom-utils.js';

export const GroupAssignmentView = {
  legacyService: new GroupAssignmentService(),
  mvpService: new MvpAdminService(),

  async render(container) {
    if (!CONFIG.IS_V2_CANDIDATE) return this.renderLegacy(container);
    const role = AuthService.getCurrentRole();
    const allGroups = await this.mvpService.listGroupSummaries();

    if (role.id === 'DOCENTE') {
      const activeProg = TeacherContextService.getActiveProgram();
      const activeGroupCode = TeacherContextService.getActiveGroupCode();
      const teacherGroups = TeacherContextService.filterGroups(allGroups, activeProg.id);
      const totalEnrollments = teacherGroups.reduce((sum, g) => sum + (g.enrollmentCount || 0), 0);

      container.innerHTML = `
        <section class="view-header">
          <div>
            <h2>Mis Grupos Asignados — ${escapeHtml(activeProg.nombre)}</h2>
            <p class="subtitle">Aulas y grupos académicos pertenecientes a su especialidad formativa</p>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <span class="user-role-badge role-badge-DOCENTE">DOCENTE DE ESPECIALIDAD</span>
            <button type="button" class="btn btn-outline-primary btn-sm fw-bold" id="btn-group-switch-classroom">
              🏫 Conmutar Aula
            </button>
          </div>
        </section>

        <div class="grid grid-3 margin-bottom-sm">
          <div class="stat-card" style="border-left: 4px solid #7c3aed;">
            <div class="stat-info">
              <span class="stat-value" style="color: #6d28d9;">${teacherGroups.length}</span>
              <span class="stat-label">Grupos en su Especialidad</span>
            </div>
          </div>
          <div class="stat-card" style="border-left: 4px solid #2563eb;">
            <div class="stat-info">
              <span class="stat-value" style="color: #1d4ed8;">${totalEnrollments}</span>
              <span class="stat-label">Matrículas en Carrera</span>
            </div>
          </div>
          <div class="stat-card" style="border-left: 4px solid #059669;">
            <div class="stat-info">
              <span class="stat-value" style="color: #047857;">${escapeHtml(activeGroupCode)}</span>
              <span class="stat-label">Aula Pedagógica Activa</span>
            </div>
          </div>
        </div>

        <div class="card" style="overflow-x:auto">
          <table class="table-info mvp-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Programa</th>
                <th>Módulo Oficial</th>
                <th>Turno / Modalidad</th>
                <th>Matrículas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${teacherGroups.map(group => {
                const isCurrentActive = group.visibleCode === activeGroupCode || group.id?.includes(activeGroupCode);
                return `
                  <tr style="${isCurrentActive ? 'background: #f5f3ff;' : ''}">
                    <td>
                      <strong>${escapeHtml(group.visibleCode)}</strong>
                      ${isCurrentActive ? '<br><span class="badge" style="background:#7c3aed; color:#fff; font-size:0.72rem; font-weight:700;">★ SU AULA ACTUAL</span>' : ''}
                    </td>
                    <td>${escapeHtml(group.program?.nombre || activeProg.nombre)}</td>
                    <td>${escapeHtml(group.module?.nombreOficial || group.module?.nombre || 'Módulo Oficial')}</td>
                    <td>${escapeHtml(group.turno || 'Regular')} / ${escapeHtml(group.modalidad || 'Presencial')}</td>
                    <td><strong>${group.enrollmentCount} estudiantes</strong></td>
                    <td><span class="badge badge-success">ASIGNADO</span></td>
                    <td>
                      <div class="mvp-actions" style="margin:0">
                        <button class="btn btn-secondary group-detail" data-group-id="${escapeHtml(group.id)}">Ver Alumnos</button>
                        ${isCurrentActive ? `
                          <span class="btn btn-success btn-sm disabled" style="background:#7c3aed; border-color:#6d28d9; cursor:default; font-weight:700;">✓ Aula Activa</span>
                        ` : `
                          <button type="button" class="btn btn-outline-primary btn-sm btn-select-classroom" data-group-code="${escapeHtml(group.visibleCode)}" data-group-id="${escapeHtml(group.id)}" style="font-weight:700;">
                            Seleccionar Aula
                          </button>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div id="group-detail-panel" class="margin-top"></div>
      `;

      container.querySelectorAll('.group-detail').forEach(button => {
        button.onclick = () => this.openDetail(container, button.dataset.groupId);
      });
      container.querySelectorAll('.btn-select-classroom').forEach(button => {
        button.onclick = () => {
          TeacherContextService.setActiveGroupCode(button.dataset.groupCode);
          Notifications.success(`Aula conmutada a: ${button.dataset.groupCode}`);
          this.render(container);
        };
      });
      const switchClassroomBtn = container.querySelector('#btn-group-switch-classroom');
      if (switchClassroomBtn) {
        switchClassroomBtn.onclick = () => {
          import('./layout.js').then(m => m.Layout.openClassroomSwitcherModal());
        };
      }
      return;
    }

    const groups = allGroups;
    const reviewCount = groups.filter(group => group.reviewDetails.length).length;
    container.innerHTML = `
      <section class="view-header"><div><h2>Grupos académicos</h2>
        <p class="subtitle">Consulta de grupos, matrículas y accesos a nóminas y registros.</p></div>
        <a class="btn btn-primary" href="#/configuracion-academica">Configuración académica</a></section>
      <div class="grid grid-3 margin-bottom-sm">
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${groups.length}</span><span class="stat-label">Grupos</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${groups.reduce((sum, group) => sum + group.enrollmentCount, 0)}</span><span class="stat-label">Matrículas vinculadas</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${reviewCount}</span><span class="stat-label">Revisar procedencia</span></div></div>
      </div>
      <div class="card" style="overflow-x:auto"><table class="table-info mvp-table"><thead><tr>
        <th>Grupo</th><th>Programa</th><th>Módulo</th><th>Periodo</th><th>Turno / modalidad</th><th>Matrículas</th><th>Estado</th><th>Acciones</th>
      </tr></thead><tbody>${groups.map(group => `<tr>
        <td><strong>${escapeHtml(group.visibleCode)}</strong><br><small>Etiqueta histórica/administrativa</small></td>
        <td>${escapeHtml(group.program?.nombre || 'Programa no disponible')}</td>
        <td>${escapeHtml(group.module?.nombreOficial || group.module?.nombre || 'Pendiente')}</td>
        <td>${escapeHtml(group.period?.nombre || 'Pendiente')}</td>
        <td>${escapeHtml(group.turno || 'Pendiente')} / ${escapeHtml(group.modalidad || 'Pendiente')}</td>
        <td>${group.enrollmentCount}</td>
        <td><span class="badge ${group.reviewDetails.length ? 'badge-warning' : group.moduloId && group.periodoId ? 'badge-success' : 'badge-secondary'}">${escapeHtml(group.administrativeStatus)}</span></td>
        <td><div class="mvp-actions" style="margin:0"><button class="btn btn-secondary group-detail" data-group-id="${escapeHtml(group.id)}">Ver grupo</button>
          <a class="btn btn-secondary" href="#/nominas?groupId=${encodeURIComponent(group.id)}">Nómina</a>
          <a class="btn btn-secondary" href="#/registros/matricula?groupId=${encodeURIComponent(group.id)}">Registro</a></div></td>
      </tr>`).join('')}</tbody></table></div>
      <div id="group-detail-panel" class="margin-top"></div>`;
    container.querySelectorAll('.group-detail').forEach(button => {
      button.onclick = () => this.openDetail(container, button.dataset.groupId);
    });
  },

  async openDetail(container, groupId) {
    const role = AuthService.getCurrentRole();
    const panel = container.querySelector('#group-detail-panel');
    panel.innerHTML = '<div class="card"><p>Abriendo ficha del grupo…</p></div>';
    try {
      const context = await this.mvpService.buildGroupRoster(groupId);
      const { group, program, module, period, rows } = context;
      const isDocente = role.id === 'DOCENTE';

      const actionsHtml = isDocente
        ? `<a class="btn btn-primary" href="#/documentos"><span>📑</span> Ir a Asistencias y Registro</a>
           <a class="btn btn-secondary" href="#/estudiantes"><span>👥</span> Ver en Padrón de Aula</a>`
        : `<a class="btn btn-primary" href="#/nominas?groupId=${encodeURIComponent(group.id)}">Ver nómina</a>
           <a class="btn btn-secondary" href="#/registros/matricula?groupId=${encodeURIComponent(group.id)}">Ver registro</a>
           <a class="btn btn-secondary" href="#/matriculas?groupId=${encodeURIComponent(group.id)}">Ver matrículas</a>`;

      panel.innerHTML = `<div class="card"><div class="mvp-summary-header"><div><h3>Ficha de grupo — ${escapeHtml(group.visibleCode)}</h3><p>${escapeHtml(program.nombre)}</p></div>
        <div class="mvp-actions">${actionsHtml}</div></div>
        <div class="grid grid-3 margin-top-sm"><div><strong>Módulo</strong><br>${escapeHtml(module?.nombreOficial || module?.nombre || 'Pendiente')}</div><div><strong>Periodo</strong><br>${escapeHtml(period?.nombre || 'Pendiente')}</div><div><strong>Matrículas</strong><br>${rows.length}</div><div><strong>Turno</strong><br>${escapeHtml(group.turno || 'Pendiente')}</div><div><strong>Modalidad</strong><br>${escapeHtml(group.modalidad || 'Pendiente')}</div><div><strong>Sección</strong><br>${escapeHtml(group.seccion || 'Pendiente')}</div></div>
        ${group.reviewDetails.length && !isDocente ? `<div class="alert alert-warning margin-top-sm"><strong>REVISAR PROCEDENCIA</strong><ul>${group.reviewDetails.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
        <div style="overflow-x:auto" class="margin-top"><table class="table-info mvp-table"><thead><tr><th>N°</th><th>Estudiante</th><th>Documento</th><th>Estado</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.studentName)}</td><td>${escapeHtml(row.document)}</td><td>${escapeHtml(row.enrollmentStatus)}</td></tr>`).join('')}</tbody></table></div></div>`;
    } catch (error) { panel.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`; }
  },

  async renderLegacy(container) {
    const summary = await this.legacyService.listGroups();
    const statusLabel = status => status === 'ASIGNADO_CONFIRMADO' ? 'Asignado' :
      status === 'INCONSISTENTE' ? 'Revisión requerida' : 'Sin asignar';
    container.innerHTML = `<section class="view-header"><div><h2>Asignación de grupos</h2><p class="subtitle">Administración v1 por grupo técnico de origen.</p></div></section>
      <div class="card" id="group-assignment-summary"><strong>${summary.groupsTotal} grupos</strong> · ${summary.groupsAssigned} asignados · ${summary.groupsUnassigned} sin asignar · ${summary.groupsInconsistent} en revisión.
      <p>La configuración académica v2 no modifica esta base productiva.</p></div>
      <div class="card" style="overflow-x:auto"><table class="table-info"><thead><tr><th>Grupo</th><th>Programa</th><th>Matrículas</th><th>Módulo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
        ${summary.groups.map(group => `<tr><td>${escapeHtml(group.groupCode)}</td><td>${escapeHtml(group.program?.nombre || 'Programa no disponible')}</td><td>${group.enrollmentCount}</td><td>${escapeHtml(group.module?.nombreOficial || group.module?.nombre || 'Pendiente')}</td><td>${escapeHtml(statusLabel(group.status))}</td><td>${group.status === 'INCONSISTENTE' ? '<span class="text-muted">Revisar datos</span>' : `<button type="button" class="btn btn-secondary group-action" data-group-code="${escapeHtml(group.groupCode)}">${group.moduloId ? 'Cambiar módulo' : 'Asignar módulo'}</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <div id="group-assignment-dialog" class="modal-overlay" role="dialog" aria-modal="true" style="display:none">
        <div class="modal-content card"><h3 id="group-dialog-title">Asignar módulo</h3>
          <p id="group-dialog-context"></p>
          <label for="group-module-select">Módulo oficial</label>
          <select id="group-module-select" class="form-control"><option value="">Seleccione un módulo</option></select>
          <p id="group-selected-impact" class="margin-top-sm">Seleccione un módulo para revisar el impacto.</p>
          <div class="mvp-actions"><button type="button" id="group-confirm" class="btn btn-primary" disabled>Confirmar asignación</button><button type="button" id="group-cancel" class="btn btn-secondary">Cancelar</button></div>
        </div>
      </div>`;
    let selectedGroup = null;
    const dialog = container.querySelector('#group-assignment-dialog');
    const moduleSelect = container.querySelector('#group-module-select');
    const confirmButton = container.querySelector('#group-confirm');
    const impact = container.querySelector('#group-selected-impact');
    const close = () => {
      dialog.style.display = 'none';
      selectedGroup = null;
      moduleSelect.innerHTML = '<option value="">Seleccione un módulo</option>';
      confirmButton.disabled = true;
    };
    container.querySelector('#group-cancel').onclick = close;
    container.querySelectorAll('.group-action').forEach(button => {
      button.onclick = async () => {
        selectedGroup = await this.legacyService.getGroup(button.dataset.groupCode);
        const modules = await this.legacyService.modulesForProgram(selectedGroup.programaId);
        moduleSelect.innerHTML = `<option value="">Seleccione un módulo</option>${modules.map(module => `<option value="${escapeHtml(module.id)}">${escapeHtml(module.nombreOficial || module.nombre || module.id)}</option>`).join('')}`;
        moduleSelect.value = '';
        confirmButton.disabled = true;
        impact.textContent = 'Seleccione un módulo para revisar el impacto.';
        container.querySelector('#group-dialog-context').textContent = `${selectedGroup.groupCode} · ${selectedGroup.enrollmentCount} matrículas`;
        dialog.style.display = 'flex';
      };
    });
    moduleSelect.onchange = () => {
      confirmButton.disabled = !selectedGroup || !moduleSelect.value;
      impact.textContent = moduleSelect.value && selectedGroup ? `${selectedGroup.enrollmentCount} matrículas afectadas. No se guardará hasta confirmar.` : 'Seleccione un módulo para revisar el impacto.';
    };
    confirmButton.onclick = async () => {
      if (!selectedGroup || !moduleSelect.value) return;
      const changing = Boolean(selectedGroup.moduloId);
      const accepted = window.confirm(`${changing ? 'Cambiar' : 'Asignar'} el módulo en ${selectedGroup.enrollmentCount} matrículas del grupo ${selectedGroup.groupCode}?`);
      if (!accepted) return;
      confirmButton.disabled = true;
      try {
        await this.legacyService.assignModule({
          groupCode: selectedGroup.groupCode, moduloId: moduleSelect.value, confirmed: true,
          changeConfirmed: changing, expectedProgramId: selectedGroup.programaId,
          expectedCount: selectedGroup.enrollmentCount, expectedPreviousModuloId: selectedGroup.moduloId,
          expectedPeriodId: selectedGroup.periodoId, expectedEnrollmentIds: selectedGroup.enrollmentIds
        });
        await this.renderLegacy(container);
      } catch (error) {
        impact.textContent = error.message;
        confirmButton.disabled = false;
      }
    };
  }
};
