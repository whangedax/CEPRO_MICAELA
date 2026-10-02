/**
 * Vista de Inicio de Sesión Institucional y Contexto Académico (LoginView)
 * Módulo: M01/RBAC — Autenticación y Delimitación de Ámbito por Carrera y Aula
 */

import { AuthService, ROLES } from '../services/auth-service.js';
import { TeacherContextService } from '../services/teacher-context-service.js';
import { Notifications } from './notifications.js';
import { escapeHtml } from '../utils/dom-utils.js';

export class LoginView {
  constructor() {
    this.selectedRole = 'DOCENTE'; // Por defecto iniciar en Docente que es el perfil principal
    this.selectedProgramId = TeacherContextService.getActiveProgramId();
    this.selectedGroupCode = TeacherContextService.getActiveGroupCode();
  }

  async render(container) {
    const programs = TeacherContextService.getPrograms();
    const currentCustomName = AuthService.getCustomUserName();

    container.innerHTML = `
      <div class="login-view-wrapper">
        <div class="login-view-card">
          <!-- Encabezado con Logo Oficial Institucional -->
          <div class="login-header">
            <div class="login-logo-container">
              <img src="/app/img/logo-cetpro.jpg" alt="Logo Institucional CETPRO" class="login-logo-img" onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='./img/logo-cetpro.jpg';}">
            </div>
            <h1 class="login-inst-title">CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"</h1>
            <p class="login-inst-subtitle">SISTEMA INTEGRADO DE GESTIÓN ACADÉMICA Y CONTROL DOCUMENTAL</p>
            <div class="login-offline-badge">
              <span class="login-pulse-dot"></span> Operación 100% Local y Descentralizada (Sin Internet)
            </div>
          </div>

          <!-- Selector de Perfil / Rol Institucional -->
          <div class="login-section-title">
            <span>1. Seleccione su Perfil Institucional</span>
          </div>

          <div class="login-role-selector" role="radiogroup" aria-label="Selección de perfil">
            <!-- Opción Docente -->
            <label class="login-role-card ${this.selectedRole === 'DOCENTE' ? 'is-selected' : ''}" data-role="DOCENTE">
              <input type="radio" name="login-role" value="DOCENTE" ${this.selectedRole === 'DOCENTE' ? 'checked' : ''} class="visually-hidden">
              <div class="login-role-icon">👨‍🏫</div>
              <div class="login-role-meta">
                <strong class="login-role-name">Docente de Especialidad</strong>
                <span class="login-role-desc">Asistencia diaria, calificaciones y aula</span>
              </div>
              <div class="login-role-check">✓</div>
            </label>

            <!-- Opción Secretaría -->
            <label class="login-role-card ${this.selectedRole === 'SECRETARIA' ? 'is-selected' : ''}" data-role="SECRETARIA">
              <input type="radio" name="login-role" value="SECRETARIA" ${this.selectedRole === 'SECRETARIA' ? 'checked' : ''} class="visually-hidden">
              <div class="login-role-icon">👩‍💼</div>
              <div class="login-role-meta">
                <strong class="login-role-name">Secretaría Académica</strong>
                <span class="login-role-desc">Matrícula, nóminas oficiales y certificados</span>
              </div>
              <div class="login-role-check">✓</div>
            </label>

            <!-- Opción Dirección -->
            <label class="login-role-card ${this.selectedRole === 'DIRECTOR' ? 'is-selected' : ''}" data-role="DIRECTOR">
              <input type="radio" name="login-role" value="DIRECTOR" ${this.selectedRole === 'DIRECTOR' ? 'checked' : ''} class="visually-hidden">
              <div class="login-role-icon">👨‍💼</div>
              <div class="login-role-meta">
                <strong class="login-role-name">Dirección General</strong>
                <span class="login-role-desc">Supervisión total, títulos y respaldo</span>
              </div>
              <div class="login-role-check">✓</div>
            </label>
          </div>

          <!-- Formulario de Configuración de Contexto -->
          <form id="login-form" class="login-form">
            <!-- Bloque Condicional para Docente: Selección en Cascada de Carrera y Grupo -->
            <div id="login-teacher-context-box" class="login-teacher-box" style="${this.selectedRole === 'DOCENTE' ? 'display: block;' : 'display: none;'}">
              <div class="login-teacher-box-header">
                <span class="login-teacher-box-icon">🏫</span>
                <div>
                  <strong>Asignación Pedagógica de Carrera y Aula</strong>
                  <p>El sistema adaptará todos los registros, listas de alumnos y plantillas exclusivamente a su grupo seleccionado.</p>
                </div>
              </div>

              <!-- Paso A: Selección de Carrera / Especialidad -->
              <div class="form-group margin-top-sm">
                <label for="login-program-select" class="login-field-label">
                  <strong>Paso A: Carrera / Especialidad Técnica</strong>
                </label>
                <select id="login-program-select" class="form-select login-select" required>
                  ${programs.map(p => `
                    <option value="${p.id}" ${p.id === this.selectedProgramId ? 'selected' : ''}>
                      📚 ${escapeHtml(p.nombre)} (${escapeHtml(p.codigo)})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Paso B: Selección de Grupo / Aula a Cargo -->
              <div class="form-group margin-top-sm">
                <label for="login-group-select" class="login-field-label">
                  <strong>Paso B: Grupo / Aula Asignada</strong>
                  <span id="login-group-summary-badge" class="badge badge-info" style="font-size: 0.75rem; margin-left: 0.5rem;"></span>
                </label>
                <select id="login-group-select" class="form-select login-select" required>
                  <!-- Rellenado dinámicamente -->
                </select>
              </div>

              <!-- Input Opcional: Nombre del Docente -->
              <div class="form-group margin-top-sm">
                <label for="login-custom-name" class="login-field-label">
                  <strong>Nombre del Docente (Para firmas en documentos y portada)</strong>
                  <small class="text-muted" style="font-weight: normal; font-size: 0.78rem;">Opcional</small>
                </label>
                <input type="text" id="login-custom-name" class="form-input login-input" 
                  placeholder="Ej: Lic. Juan Carlos Ramos Quispe (o déjelo en blanco)" 
                  value="${escapeHtml(currentCustomName)}">
                <span class="login-field-hint">Si lo deja en blanco se utilizará la denominación institucional estándar "Docente de Especialidad".</span>
              </div>
            </div>

            <!-- Bloque Condicional para Director / Secretaría: Nombre Personalizado Opcional -->
            <div id="login-admin-context-box" class="login-admin-box" style="${this.selectedRole !== 'DOCENTE' ? 'display: block;' : 'display: none;'}">
              <div class="form-group">
                <label for="login-admin-name" class="login-field-label">
                  <strong id="login-admin-label-text">Nombre de quien suscribe el despacho</strong>
                  <small class="text-muted" style="font-weight: normal; font-size: 0.78rem;">Opcional</small>
                </label>
                <input type="text" id="login-admin-name" class="form-input login-input" 
                  placeholder="Ej: Lic. Responsable de Despacho" 
                  value="${escapeHtml(currentCustomName)}">
                <span class="login-field-hint">Aparecerá en los reportes y pie de página institucionales.</span>
              </div>
            </div>

            <!-- Botón de Envío / Acceso -->
            <div class="login-actions margin-top">
              <button type="submit" id="btn-login-submit" class="btn btn-primary login-submit-btn">
                <span>Ingresar al Sistema Académico</span>
                <span class="login-btn-arrow">→</span>
              </button>
            </div>
          </form>

          <!-- Pie Institucional con Nota de Privacidad -->
          <div class="login-footer-info">
            <span>Base de datos segura IndexedDB · Sin envío de datos externos</span>
            <span>Versión 2.0 Local · Antigravity Suite</span>
          </div>
        </div>
      </div>
    `;

    this._bindEvents(container);
    this._updateGroupsDropdown(container);
  }

  _bindEvents(container) {
    const roleCards = container.querySelectorAll('.login-role-card');
    const teacherBox = container.querySelector('#login-teacher-context-box');
    const adminBox = container.querySelector('#login-admin-context-box');
    const adminLabel = container.querySelector('#login-admin-label-text');
    const progSelect = container.querySelector('#login-program-select');
    const form = container.querySelector('#login-form');

    // Conmutación de Rol
    roleCards.forEach(card => {
      card.addEventListener('click', () => {
        const role = card.getAttribute('data-role');
        this.selectedRole = role;

        roleCards.forEach(c => {
          c.classList.remove('is-selected');
          const radio = c.querySelector('input[type="radio"]');
          if (radio) radio.checked = false;
        });
        card.classList.add('is-selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        if (role === 'DOCENTE') {
          teacherBox.style.display = 'block';
          adminBox.style.display = 'none';
        } else {
          teacherBox.style.display = 'none';
          adminBox.style.display = 'block';
          adminLabel.textContent = role === 'DIRECTOR'
            ? 'Nombre del Director General (Opcional)'
            : 'Nombre de la Secretaria Académica (Opcional)';
        }
      });
    });

    // Cambio en Cascada de Programa / Carrera
    if (progSelect) {
      progSelect.addEventListener('change', () => {
        this.selectedProgramId = progSelect.value;
        this._updateGroupsDropdown(container);
      });
    }

    // Envío del Formulario de Inicio de Sesión
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleLogin(container);
      });
    }
  }

  _updateGroupsDropdown(container) {
    const groupSelect = container.querySelector('#login-group-select');
    const summaryBadge = container.querySelector('#login-group-summary-badge');
    if (!groupSelect) return;

    const groups = TeacherContextService.getGroupsForProgram(this.selectedProgramId);

    if (groups.length === 0) {
      groupSelect.innerHTML = '<option value="">No hay grupos registrados para esta carrera</option>';
      if (summaryBadge) summaryBadge.textContent = '0 grupos';
      return;
    }

    // Verificar si el grupo actualmente seleccionado existe en la carrera elegida
    const isCurrentInProg = groups.some(g => g.grupoCode === this.selectedGroupCode);
    if (!isCurrentInProg && groups.length > 0) {
      this.selectedGroupCode = groups[0].grupoCode;
    }

    groupSelect.innerHTML = groups.map(g => {
      const isSelected = g.grupoCode === this.selectedGroupCode;
      const turnoText = g.turno && g.turno !== 'PENDIENTE' ? `Turno ${g.turno}` : (g.modalidad && g.modalidad !== 'PENDIENTE' ? g.modalidad : 'Regular');
      return `
        <option value="${escapeHtml(g.grupoCode)}" ${isSelected ? 'selected' : ''}>
          👥 ${escapeHtml(g.grupoCode)} · ${escapeHtml(turnoText)} (${g.count} estudiantes matriculados)
        </option>
      `;
    }).join('');

    if (summaryBadge) {
      const totalAlumnos = groups.reduce((acc, g) => acc + (g.count || 0), 0);
      summaryBadge.textContent = `${groups.length} grupo${groups.length > 1 ? 's' : ''} (${totalAlumnos} alumnos)`;
    }

    groupSelect.onchange = () => {
      this.selectedGroupCode = groupSelect.value;
    };
  }

  _handleLogin(container) {
    let customName = '';
    const groupSelect = container.querySelector('#login-group-select');

    if (this.selectedRole === 'DOCENTE') {
      const teacherNameInput = container.querySelector('#login-custom-name');
      customName = teacherNameInput ? teacherNameInput.value.trim() : '';

      const progId = this.selectedProgramId;
      const groupCode = groupSelect ? groupSelect.value : this.selectedGroupCode;

      if (!groupCode) {
        Notifications.error('Debe seleccionar un grupo válido para su especialidad');
        return;
      }

      // Guardar el contexto en el TeacherContextService
      TeacherContextService.setActiveProgramId(progId);
      TeacherContextService.setActiveGroupCode(groupCode);
    } else {
      const adminNameInput = container.querySelector('#login-admin-name');
      customName = adminNameInput ? adminNameInput.value.trim() : '';
    }

    // Iniciar sesión oficial en el servicio de autenticación
    AuthService.login({
      roleId: this.selectedRole,
      customName: customName
    });

    const activeRole = AuthService.getCurrentRole();
    const activeProg = TeacherContextService.getActiveProgram();
    const activeGroup = TeacherContextService.getActiveGroupInfo();

    if (this.selectedRole === 'DOCENTE') {
      Notifications.success(
        `Bienvenido(a) ${activeRole.userName}. Aula activa: ${activeProg.nombre} — Grupo ${activeGroup.grupoCode}`
      );
    } else {
      Notifications.success(
        `Bienvenido(a) ${activeRole.userName} (${activeRole.title})`
      );
    }

    // Redireccionar al panel principal
    window.location.hash = '#/inicio';
  }
}
