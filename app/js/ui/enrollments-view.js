/**
 * Componente UI para la Gestión de Matrículas (#/matriculas)
 * Módulo: M05 / M05.1 — Matrículas y Configuración por Grupo Técnico
 */

import { EnrollmentService } from '../services/enrollment-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { CONFIG } from '../config.js';
import { AcademicContextAuthorityService } from '../services/academic-context-authority-service.js';

export const EnrollmentsView = {
  service: new EnrollmentService(),
  currentEnrollments: [],

  async render(container) {
    this.currentEnrollments = await this.withAcademicContext(await this.service.searchEnrollments());
    const groupCounts = new Map();
    this.currentEnrollments.forEach(item => {
      if (item.grupoCode) groupCounts.set(item.grupoCode, (groupCounts.get(item.grupoCode) || 0) + 1);
    });

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>Gestión de Matrículas</h2>
          <p class="subtitle">Registro de Matrículas, Trazabilidad y Asignación por Grupo Técnico de Origen</p>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <span id="enrollment-count-badge" class="badge badge-primary" style="font-size:0.85rem; padding:0.4rem 0.8rem; background:var(--primary-color); color:#fff;">${this.currentEnrollments.length} Matrículas</span>
          <a href="#/grupos" class="btn btn-secondary">Asignación de grupos</a>
        </div>
      </section>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="card margin-bottom-sm">
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <input type="text" id="enrollment-search-input" class="form-input" placeholder="🔍 Buscar por DNI, Estudiante, Programa o Grupo..." style="flex:1; min-width:240px; padding:0.6rem 1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">

          <select id="filter-program" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Todos los Programas</option>
            <option value="PROG-001">MECÁNICA AUTOMOTRIZ</option>
            <option value="PROG-002">MECÁNICA DE MOTOS</option>
            <option value="PROG-003">CARPINTERÍA METÁLICA</option>
            <option value="PROG-004">PELUQUERÍA Y BARBERÍA</option>
            <option value="PROG-005">COMPUTACIÓN E INFORMÁTICA</option>
            <option value="PROG-006">CORTE Y ENSAMBLAJE</option>
            <option value="PROG-007">SISTEMAS ELÉCTRICOS</option>
          </select>

          <select id="filter-group" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Todos los Grupos Técnicos</option>
            ${[...groupCounts].sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) =>
              `<option value="${escapeHtml(code)}">${escapeHtml(code)} (${count} matrículas)</option>`).join('')}
          </select>

          <select id="filter-turno" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Todos los Turnos</option>
            <option value="MAÑANA">MAÑANA</option>
            <option value="TARDE">TARDE</option>
            <option value="NOCHE">NOCHE</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>

          <select id="filter-modalidad" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Todas las Modalidades</option>
            <option value="PRESENCIAL">PRESENCIAL</option>
            <option value="VIRTUAL">VIRTUAL</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>

          <select id="filter-pending-modulo" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Módulo: Todos</option>
            <option value="true">Módulo: Pendiente</option>
          </select>
        </div>
      </div>

      <!-- Contenedor Principal de Lista / Tabla -->
      <div id="enrollment-list-container">
        ${this.renderEnrollmentsList(this.currentEnrollments)}
      </div>

      <!-- Modal de Detalle de Matrícula -->
      <div id="enrollment-detail-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); z-index:1000; align-items:center; justify-content:center; padding:1rem;">
        <div class="modal-content card" style="max-width:650px; width:100%; background:#fff; border-radius:var(--radius-md); padding:1.75rem; position:relative; max-height:90vh; overflow-y:auto;">
          <button id="enrollment-detail-close-btn" style="position:absolute; top:1rem; right:1rem; background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--neutral-muted);">&times;</button>
          <h3 style="margin-bottom:1rem; font-size:1.25rem; color:var(--neutral-dark);">Detalle de Matrícula</h3>
          <div id="enrollment-detail-modal-body"></div>
        </div>
      </div>

    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#enrollment-search-input');
    const filterProgram = container.querySelector('#filter-program');
    const filterGroup = container.querySelector('#filter-group');
    const filterTurno = container.querySelector('#filter-turno');
    const filterModalidad = container.querySelector('#filter-modalidad');
    const filterPendingModulo = container.querySelector('#filter-pending-modulo');

    const updateFilters = async () => {
      const q = searchInput.value;
      const filters = {
        programaId: filterProgram.value || undefined,
        grupoCode: filterGroup.value || undefined,
        turno: filterTurno.value || undefined,
        modalidad: filterModalidad.value || undefined,
        moduloPendiente: filterPendingModulo.value === 'true' ? true : undefined
      };
      try {
        this.currentEnrollments = await this.withAcademicContext(await this.service.searchEnrollments(q, filters));
        container.querySelector('#enrollment-list-container').innerHTML = this.renderEnrollmentsList(this.currentEnrollments);
        container.querySelector('#enrollment-count-badge').textContent = `${this.currentEnrollments.length} Matrículas`;
        this.bindTableEvents(container);
      } catch (error) {
        container.querySelector('#enrollment-list-container').innerHTML = `<div class="card alert alert-danger">INCONSISTENCY: filtro bloqueado por contexto GROUP divergente. ${escapeHtml(error.message)}</div>`;
      }
    };

    if (searchInput) searchInput.oninput = updateFilters;
    if (filterProgram) filterProgram.onchange = updateFilters;
    if (filterGroup) filterGroup.onchange = updateFilters;
    if (filterTurno) filterTurno.onchange = updateFilters;
    if (filterModalidad) filterModalidad.onchange = updateFilters;
    if (filterPendingModulo) filterPendingModulo.onchange = updateFilters;

    this.bindTableEvents(container);

  },

  bindTableEvents(container) {
    const detailModal = container.querySelector('#enrollment-detail-modal');
    const detailClose = container.querySelector('#enrollment-detail-close-btn');
    if (detailClose) detailClose.onclick = () => { detailModal.style.display = 'none'; };

    container.querySelectorAll('.btn-view-enrollment').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const m = await this.service.repo.getById(id);
        if (m) {
          const [display] = await this.withAcademicContext([m]);
          const detailBody = container.querySelector('#enrollment-detail-modal-body');
          detailBody.innerHTML = `
            <table class="table-info">
              <tr><th>ID Matrícula</th><td><code>${escapeHtml(m.id)}</code></td></tr>
              <tr><th>Estudiante</th><td>${escapeHtml(m.estudianteNombreCompleto)}</td></tr>
              <tr><th>Documento Estudiante</th><td>${m.estudianteDocumento ? escapeHtml(m.estudianteDocumento) : '<span style="color:#d97706; font-style:italic;">Pendiente</span>'}</td></tr>
              <tr><th>Programa Oficial</th><td><strong>${escapeHtml(m.programaNombre)}</strong> (<code>${escapeHtml(m.programaId)}</code>)</td></tr>
              <tr><th>Módulo Curricular</th><td>${display.academicModuloId ? escapeHtml(display.academicModuloId) : '<span class="badge badge-warning" style="background:#fef3c7; color:#92400e;">Módulo: Pendiente</span>'}</td></tr>
              <tr><th>Periodo Académico</th><td>${display.academicPeriodoId ? escapeHtml(display.academicPeriodoId) : '<span class="badge badge-secondary">Periodo: Pendiente</span>'}</td></tr>
              ${display.academicError ? `<tr><th>Integridad GROUP</th><td>INCONSISTENCY: ${escapeHtml(display.academicError)}</td></tr>` : ''}
              <tr><th>Grupo Técnico de Origen</th><td><code>${escapeHtml(m.grupoCode)}</code></td></tr>
              ${CONFIG.IS_V2_CANDIDATE ? `<tr><th>Grupo Académico (groupId)</th><td><code>${escapeHtml(m.grupoId || '')}</code></td></tr>` : ''}
              <tr><th>Turno</th><td>${escapeHtml(m.turno)}</td></tr>
              <tr><th>Modalidad</th><td>${escapeHtml(m.modalidad)}</td></tr>
              <tr><th>Profesor Fuente</th><td>${escapeHtml(m.profesorFuente || 'No indicado')}</td></tr>
              <tr><th>Año Fuente</th><td>${escapeHtml(String(m.anioFuente || 2026))}</td></tr>
              <tr><th>Trazabilidad Origen</th><td><code>${escapeHtml(m.archivoOrigen)}</code> | Hoja: ${escapeHtml(m.hojaOrigen)} | Fila: ${escapeHtml(m.filaOrigen)}</td></tr>
              <tr><th>Estado</th><td><span class="badge badge-warning">${escapeHtml(m.estado)}</span></td></tr>
              <tr><th>Fecha Registro</th><td>${escapeHtml(m.fechaCreacion)}</td></tr>
            </table>
          `;
          detailModal.style.display = 'flex';
        }
      };
    });
  },

  async withAcademicContext(rows) {
    if (!CONFIG.IS_V2_CANDIDATE) return rows.map(row => ({ ...row, academicModuloId: row.moduloId, academicPeriodoId: row.periodoId }));
    const authority = new AcademicContextAuthorityService();
    return Promise.all(rows.map(async row => {
      try {
        const context = await authority.resolveEnrollment(row.id);
        return { ...row, academicModuloId: context.moduloId, academicPeriodoId: context.periodoId };
      } catch (error) { return { ...row, academicModuloId: null, academicPeriodoId: null, academicError: error.message }; }
    }));
  },

  renderEnrollmentsList(enrollments) {
    if (enrollments.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">🎓</div>
            <h3>No se encontraron matrículas</h3>
            <p>No existen matrículas que coincidan con los criterios de búsqueda.</p>
          </div>
        </div>
      `;
    }

    return `
      <!-- Vista Escritorio: Tabla -->
      <div class="card desktop-only" style="padding:0; overflow:hidden;">
        <table class="table-info" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th>ID Matrícula / Grupo Técnico</th>
              <th>Estudiante / Documento</th>
              <th>Programa</th>
              <th>Módulo</th>
              <th>Turno / Modalidad</th>
              <th>Estado</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${enrollments.map(m => `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td>
                  <span class="badge badge-secondary" style="font-size:0.7rem;">${escapeHtml(m.id)}</span><br>
                  <code style="font-size:0.8rem; color:var(--primary-color);">${escapeHtml(m.grupoCode)}</code>
                  ${CONFIG.IS_V2_CANDIDATE ? `<br><small>groupId: ${escapeHtml(m.grupoId || '')}</small>` : ''}
                </td>
                <td>
                  <strong style="color:var(--neutral-dark);">${escapeHtml(m.estudianteNombreCompleto)}</strong><br>
                  <span style="font-size:0.8rem; color:var(--neutral-muted);">${m.estudianteDocumento ? escapeHtml(m.estudianteDocumento) : '<span style="color:#d97706; font-style:italic;">Pendiente</span>'}</span>
                </td>
                <td><strong style="font-size:0.85rem;">${escapeHtml(m.programaNombre)}</strong></td>
                <td>
                  ${m.academicError ? '<span>INCONSISTENCY</span>' : m.academicModuloId ? `<code>${escapeHtml(m.academicModuloId)}</code>` : '<span style="color:#d97706; font-size:0.8rem; font-style:italic;">Módulo: Pendiente</span>'}
                </td>
                <td>
                  <span style="font-size:0.8rem;">${escapeHtml(m.turno)} / ${escapeHtml(m.modalidad)}</span>
                </td>
                <td><span class="badge badge-warning" style="font-size:0.75rem;">${escapeHtml(m.estado)}</span></td>
                <td style="text-align:right;">
                  <button class="btn btn-view-enrollment" data-id="${escapeHtml(m.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#e0f2fe; color:#0369a1; border:none; border-radius:4px; cursor:pointer;">Ver Detalle</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Vista Móvil: Tarjetas -->
      <div class="grid mobile-only margin-top-sm" style="grid-template-columns:1fr; gap:1rem;">
        ${enrollments.map(m => `
          <div class="card" style="border-left:4px solid var(--primary-color);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <span class="badge badge-secondary">${escapeHtml(m.id)}</span>
                <code style="font-size:0.8rem; margin-left:0.3rem;">${escapeHtml(m.grupoCode)}</code>
                ${CONFIG.IS_V2_CANDIDATE ? `<small class="d-block">groupId: ${escapeHtml(m.grupoId || '')}</small>` : ''}
                <h4 style="font-size:1.05rem; margin:0.3rem 0; color:var(--neutral-dark);">${escapeHtml(m.estudianteNombreCompleto)}</h4>
                <p style="font-size:0.85rem; color:var(--neutral-muted); margin:0.2rem 0;">Doc: <strong>${m.estudianteDocumento ? escapeHtml(m.estudianteDocumento) : 'Pendiente'}</strong></p>
                <p style="font-size:0.85rem; margin:0.2rem 0;">Prog: <strong>${escapeHtml(m.programaNombre)}</strong></p>
                <p style="font-size:0.85rem; color:#d97706; margin:0.2rem 0;">${m.academicError ? 'INCONSISTENCY' : m.academicModuloId ? escapeHtml(m.academicModuloId) : 'Módulo: Pendiente'}</p>
              </div>
              <span class="badge badge-warning" style="font-size:0.75rem;">${escapeHtml(m.estado)}</span>
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:0.75rem; justify-content:flex-end;">
              <button class="btn btn-view-enrollment" data-id="${escapeHtml(m.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#e0f2fe; color:#0369a1; border:none; border-radius:4px;">Ver Detalle</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};
