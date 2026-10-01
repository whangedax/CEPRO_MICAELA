/**
 * Componente UI para la Gestión de Estudiantes (#/estudiantes)
 * Módulo: M03 - Estudiantes
 */

import { StudentService } from '../services/student-service.js';
import { EnrollmentService } from '../services/enrollment-service.js';
import { Notifications } from './notifications.js';
import { AuthService } from '../services/auth-service.js';
import { ErrorService } from '../services/error-service.js';
import { escapeHtml as escapeHtmlUtil } from '../utils/dom-utils.js';

/**
 * Re-exporta escapeHtml desde dom-utils.js (.replace(/</g, '&lt;'))
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return escapeHtmlUtil(str);
}


export const StudentsView = {
  currentStudents: [],

  async render(container) {
    this.currentStudents = await StudentService.searchStudents();

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>Padrón de Estudiantes</h2>
          <p class="subtitle">Registro Manual, Consulta y Expediente del Estudiante</p>
        </div>
        ${(() => {
          const role = AuthService.getCurrentRole();
          if (role.id === 'DOCENTE') {
            return `
              <div style="display:flex; gap:0.75rem; align-items:center;">
                <span class="badge role-badge-DOCENTE">👨‍🏫 VISTA DE CONSULTA DOCENTE</span>
                <span id="student-count-badge" class="badge badge-primary" style="font-size:0.85rem; padding:0.4rem 0.8rem; background:var(--primary-color); color:#fff;">${this.currentStudents.length} Estudiantes Asignados</span>
              </div>`;
          }
          return `
            <div style="display:flex; gap:0.75rem; align-items:center;">
              <span id="student-count-badge" class="badge badge-primary" style="font-size:0.85rem; padding:0.4rem 0.8rem; background:var(--primary-color); color:#fff;">${this.currentStudents.length} Estudiantes</span>
              <button id="btn-new-student" class="btn btn-primary">+ Nuevo Estudiante</button>
            </div>`;
        })()}
      </section>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="card margin-bottom-sm">
        <div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
          <input type="text" id="student-search-input" class="form-input" placeholder="🔍 Buscar por DNI, Apellidos o Nombres..." style="flex:1; min-width:260px; padding:0.6rem 1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
          
          <select id="student-filter-status" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Todos los Estados</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>

          <select id="student-filter-doc" style="padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <option value="">Todos los Documentos</option>
            <option value="DNI">DNI</option>
            <option value="CE">Carné Extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </div>
      </div>

      <!-- Contenedor Principal de Lista / Tabla -->
      <div id="student-list-container">
        ${this.renderStudentsList(this.currentStudents)}
      </div>

      <!-- Modal de Formulario de Estudiante -->
      <div id="student-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); z-index:1000; align-items:center; justify-content:center; padding:1rem;">
        <div class="modal-content card" style="max-width:650px; width:100%; max-height:90vh; overflow-y:auto; position:relative; background:#fff; border-radius:var(--radius-md); padding:1.75rem;">
          <button id="modal-close-btn" style="position:absolute; top:1rem; right:1rem; background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--neutral-muted);">&times;</button>
          <h3 id="modal-title" style="margin-bottom:1rem; font-size:1.25rem; color:var(--neutral-dark);">Nuevo Estudiante</h3>
          
          <form id="student-form">
            <input type="hidden" id="form-student-id" value="">
            
            <div class="grid grid-3">
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Tipo Documento *</label>
                <select id="form-tipoDoc" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné Extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div style="grid-column: span 2;">
                <label style="font-weight:600; font-size:0.85rem;">Número de Documento * (Conserva ceros iniciales)</label>
                <input type="text" id="form-numeroDoc" placeholder="Ej: 01704242" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
              </div>
            </div>

            <div class="grid grid-3 margin-top-sm">
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Apellido Paterno *</label>
                <input type="text" id="form-paterno" placeholder="Apellido paterno" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
              </div>
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Apellido Materno</label>
                <input type="text" id="form-materno" placeholder="Apellido materno" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              </div>
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Nombres *</label>
                <input type="text" id="form-nombres" placeholder="Nombres completos" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
              </div>
            </div>

            <div class="grid grid-3 margin-top-sm">
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Sexo *</label>
                <select id="form-sexo" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
                  <option value="H">Hombre (H)</option>
                  <option value="M">Mujer (M)</option>
                </select>
              </div>
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Fecha Nacimiento</label>
                <input type="date" id="form-fechaNac" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              </div>
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Teléfono / Celular</label>
                <input type="text" id="form-telefono" placeholder="Ej: 951811881" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              </div>
            </div>

            <div class="grid grid-3 margin-top-sm">
              <div style="grid-column: span 2;">
                <label style="font-weight:600; font-size:0.85rem;">Dirección de Domicilio</label>
                <input type="text" id="form-direccion" placeholder="Dirección completa" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              </div>
              <div>
                <label style="font-weight:600; font-size:0.85rem;">Correo Electrónico</label>
                <input type="email" id="form-correo" placeholder="correo@ejemplo.com" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              </div>
            </div>

            <div class="margin-top-sm">
              <label style="font-weight:600; font-size:0.85rem;">Observaciones</label>
              <textarea id="form-observaciones" rows="2" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);"></textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
              <button type="button" id="btn-cancel-form" class="btn" style="background:#e2e8f0; color:#334155;">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar Estudiante</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Detalle del Estudiante -->
      <div id="student-detail-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); z-index:1000; align-items:center; justify-content:center; padding:1rem;">
        <div class="modal-content card" style="max-width:600px; width:100%; background:#fff; border-radius:var(--radius-md); padding:1.75rem; position:relative;">
          <button id="detail-close-btn" style="position:absolute; top:1rem; right:1rem; background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--neutral-muted);">&times;</button>
          <h3 style="margin-bottom:1rem; font-size:1.25rem; color:var(--neutral-dark);">Expediente del Estudiante</h3>
          <div id="detail-modal-body"></div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const btnNew = container.querySelector('#btn-new-student');
    const modal = container.querySelector('#student-modal');
    const modalClose = container.querySelector('#modal-close-btn');
    const btnCancel = container.querySelector('#btn-cancel-form');
    const form = container.querySelector('#student-form');

    const openModal = (student = null) => {
      form.reset();
      if (student) {
        container.querySelector('#modal-title').textContent = 'Editar Estudiante';
        container.querySelector('#form-student-id').value = student.id;
        container.querySelector('#form-tipoDoc').value = student.tipoDocumento || 'DNI';
        container.querySelector('#form-numeroDoc').value = student.numeroDocumento || '';
        container.querySelector('#form-paterno').value = student.apellidoPaterno || '';
        container.querySelector('#form-materno').value = student.apellidoMaterno || '';
        container.querySelector('#form-nombres').value = student.nombres || '';
        container.querySelector('#form-sexo').value = student.sexo || 'H';
        container.querySelector('#form-fechaNac').value = student.fechaNacimiento || '';
        container.querySelector('#form-telefono').value = student.telefono || '';
        container.querySelector('#form-correo').value = student.correo || '';
        container.querySelector('#form-direccion').value = student.direccion || '';
        container.querySelector('#form-observaciones').value = student.observaciones || '';
      } else {
        container.querySelector('#modal-title').textContent = 'Nuevo Estudiante';
        container.querySelector('#form-student-id').value = '';
      }
      modal.style.display = 'flex';
    };

    const closeModal = () => {
      modal.style.display = 'none';
    };

    if (btnNew) btnNew.onclick = () => openModal();
    if (modalClose) modalClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    // Guardar estudiante
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const studentId = container.querySelector('#form-student-id').value;
          const payload = {
            id: studentId || undefined,
            tipoDocumento: container.querySelector('#form-tipoDoc').value,
            numeroDocumento: container.querySelector('#form-numeroDoc').value,
            apellidoPaterno: container.querySelector('#form-paterno').value,
            apellidoMaterno: container.querySelector('#form-materno').value,
            nombres: container.querySelector('#form-nombres').value,
            sexo: container.querySelector('#form-sexo').value,
            fechaNacimiento: container.querySelector('#form-fechaNac').value || null,
            telefono: container.querySelector('#form-telefono').value,
            correo: container.querySelector('#form-correo').value,
            direccion: container.querySelector('#form-direccion').value,
            observaciones: container.querySelector('#form-observaciones').value
          };

          if (studentId) {
            await StudentService.updateStudent(payload);
            Notifications.success('Estudiante actualizado correctamente');
          } else {
            const created = await StudentService.createStudent(payload);
            Notifications.success(`Estudiante creado con ID técnico ${created.id}`);
          }

          closeModal();
          this.refreshList(container);
        } catch (err) {
          const handled = ErrorService.handleError(err, 'StudentForm');
          Notifications.error(handled.userMessage);
        }
      };
    }

    // Buscador y Filtros
    const searchInput = container.querySelector('#student-search-input');
    const filterStatus = container.querySelector('#student-filter-status');
    const filterDoc = container.querySelector('#student-filter-doc');

    const updateFilter = async () => {
      const q = searchInput.value;
      const filters = {
        estado: filterStatus.value || undefined,
        tipoDocumento: filterDoc.value || undefined
      };
      this.currentStudents = await StudentService.searchStudents(q, filters);
      container.querySelector('#student-list-container').innerHTML = this.renderStudentsList(this.currentStudents);
      container.querySelector('#student-count-badge').textContent = `${this.currentStudents.length} Estudiantes`;
      this.bindTableEvents(container, openModal);
    };

    if (searchInput) searchInput.oninput = updateFilter;
    if (filterStatus) filterStatus.onchange = updateFilter;
    if (filterDoc) filterDoc.onchange = updateFilter;

    this.bindTableEvents(container, openModal);

    // Modal de Detalle
    const detailModal = container.querySelector('#student-detail-modal');
    const detailClose = container.querySelector('#detail-close-btn');
    if (detailClose) detailClose.onclick = () => { detailModal.style.display = 'none'; };
  },

  bindTableEvents(container, openModal) {
    // Eventos de botones Ver / Editar / Desactivar
    container.querySelectorAll('.btn-view-student').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const s = await StudentService.getStudentById(id);
        if (s) {
          const enrollmentService = new EnrollmentService();
          const enrollments = await enrollmentService.getEnrollmentsByStudent(s.id);
          const detailBody = container.querySelector('#detail-modal-body');
          detailBody.innerHTML = `
            <table class="table-info">
              <tr><th>ID Técnico</th><td><code>${escapeHtml(s.id)}</code></td></tr>
              <tr><th>Documento</th><td><strong>${escapeHtml(s.tipoDocumento || 'DNI')}: ${s.numeroDocumento ? escapeHtml(s.numeroDocumento) : 'Pendiente'}</strong></td></tr>
              <tr><th>Apellidos y Nombres</th><td>${escapeHtml(s.apellidoPaterno)} ${escapeHtml(s.apellidoMaterno)}, ${escapeHtml(s.nombres)}</td></tr>
              <tr><th>Nombre Original</th><td><code>${escapeHtml(s.nombresCompletoOriginal || '-')}</code></td></tr>
              <tr><th>Sexo</th><td>${s.sexo === 'H' ? 'Hombre (H)' : 'Mujer (M)'}</td></tr>
              <tr><th>Fecha Nacimiento</th><td>${escapeHtml(s.fechaNacimiento || 'No registrada')}</td></tr>
              <tr><th>Estado</th><td><span class="badge ${s.estado === 'ACTIVO' ? 'badge-success' : 'badge-secondary'}">${escapeHtml(s.estado)}</span></td></tr>
              <tr><th>Fuente / Origen</th><td><code>${escapeHtml(s.fuente)}</code></td></tr>
              <tr><th>Matrículas (${enrollments.length})</th><td>
                ${enrollments.length > 0 ? `
                  <ul style="margin:0; padding-left:1.2rem; font-size:0.85rem;">
                    ${enrollments.map(m => `<li><strong>${escapeHtml(m.id)}</strong> - ${escapeHtml(m.programaNombre)} (Grupo: <code>${escapeHtml(m.grupoCode)}</code>)</li>`).join('')}
                  </ul>
                ` : '<span style="color:var(--neutral-muted);">Sin matrículas registradas</span>'}
              </td></tr>
            </table>
          `;
          container.querySelector('#student-detail-modal').style.display = 'flex';
        }
      };
    });

    container.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const s = await StudentService.getStudentById(id);
        if (s) openModal(s);
      };
    });

    container.querySelectorAll('.btn-deactivate-student').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`¿Está seguro de desactivar al estudiante ${id}?`)) {
          try {
            await StudentService.deactivateStudent(id);
            Notifications.success('Estudiante desactivado (Borrado lógico)');
            this.refreshList(container);
          } catch (err) {
            const handled = ErrorService.handleError(err, 'StudentDeactivate');
            Notifications.error(handled.userMessage);
          }
        }
      };
    });
  },

  async refreshList(container) {
    this.currentStudents = await StudentService.searchStudents();
    container.querySelector('#student-list-container').innerHTML = this.renderStudentsList(this.currentStudents);
    container.querySelector('#student-count-badge').textContent = `${this.currentStudents.length} Estudiantes`;
    this.bindTableEvents(container, (s) => {
      const modal = container.querySelector('#student-modal');
      container.querySelector('#form-student-id').value = s.id;
      modal.style.display = 'flex';
    });
  },

  renderStudentsList(students) {
    if (students.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>Padrón Vacío de Estudiantes</h3>
            <p>No hay estudiantes registrados en este criterio.</p>
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
              <th>ID / Documento</th>
              <th>Apellidos y Nombres</th>
              <th>Sexo</th>
              <th>Fecha Nacimiento</th>
              <th>Estado</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td>
                  <span class="badge badge-secondary" style="font-size:0.7rem;">${escapeHtml(s.id)}</span><br>
                  <strong>${escapeHtml(s.tipoDocumento || 'DNI')}: ${s.numeroDocumento ? escapeHtml(s.numeroDocumento) : '<span style="color:#d97706; font-style:italic;">Pendiente</span>'}</strong>
                </td>
                <td>
                  <strong style="color:var(--neutral-dark);">${escapeHtml(s.apellidoPaterno)} ${escapeHtml(s.apellidoMaterno)}</strong>, ${escapeHtml(s.nombres)}
                </td>
                <td>${s.sexo === 'H' ? 'Hombre' : 'Mujer'}</td>
                <td>${escapeHtml(s.fechaNacimiento || '-')}</td>
                <td><span class="badge ${s.estado === 'ACTIVO' ? 'badge-success' : 'badge-secondary'}">${escapeHtml(s.estado)}</span></td>
                <td style="text-align:right;">
                  <button class="btn btn-view-student" data-id="${escapeHtml(s.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#e0f2fe; color:#0369a1; border:none; border-radius:4px; cursor:pointer;">Ver</button>
                  <button class="btn btn-edit-student" data-id="${escapeHtml(s.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#e0e7ff; color:#4338ca; border:none; border-radius:4px; cursor:pointer;">Editar</button>
                  <button class="btn btn-deactivate-student" data-id="${escapeHtml(s.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#fef2f2; color:#991b1b; border:none; border-radius:4px; cursor:pointer;">Desactivar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Vista Móvil: Tarjetas -->
      <div class="grid mobile-only margin-top-sm" style="grid-template-columns:1fr; gap:1rem;">
        ${students.map(s => `
          <div class="card" style="border-left:4px solid var(--primary-color);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <span class="badge badge-secondary">${escapeHtml(s.id)}</span>
                <h4 style="font-size:1.05rem; margin:0.3rem 0; color:var(--neutral-dark);">${escapeHtml(s.apellidoPaterno)} ${escapeHtml(s.apellidoMaterno)}, ${escapeHtml(s.nombres)}</h4>
                <p style="font-size:0.85rem; color:var(--neutral-muted);">${escapeHtml(s.tipoDocumento || 'DNI')}: <strong>${s.numeroDocumento ? escapeHtml(s.numeroDocumento) : '<span style="color:#d97706; font-style:italic;">Pendiente</span>'}</strong></p>
              </div>
              <span class="badge ${s.estado === 'ACTIVO' ? 'badge-success' : 'badge-secondary'}">${escapeHtml(s.estado)}</span>
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:1rem; justify-content:flex-end;">
              <button class="btn btn-view-student" data-id="${escapeHtml(s.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#e0f2fe; color:#0369a1; border:none; border-radius:4px;">Ver</button>
              <button class="btn btn-edit-student" data-id="${escapeHtml(s.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#e0e7ff; color:#4338ca; border:none; border-radius:4px;">Editar</button>
              <button class="btn btn-deactivate-student" data-id="${escapeHtml(s.id)}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#fef2f2; color:#991b1b; border:none; border-radius:4px;">Desactivar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};
