/**
 * Componente de Maquetación y Renderizado de Vistas UI
 * Módulo: M02 - Catálogos y Configuración / M05.3 - Control de Prerrequisitos Académicos
 */

import { getDB } from '../db/database.js';
import { ActiveStorageService as StorageService } from '../services/active-storage-service.js';
import { CONFIG } from '../config.js';
import { InstitutionService } from '../services/institution-service.js';
import { getInstitutionFieldProvenance } from '../services/institution-provenance-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { CatalogService, OFFICIAL_CATALOG_SEED } from '../services/catalog-service.js';
import { PeriodService } from '../services/period-service.js';
import { ConfigService } from '../services/config-service.js';
import { StudentsView } from './students-view.js';
import { EnrollmentsView } from './enrollments-view.js';
import { CandidateEnrollmentsView } from './candidate-enrollments-view.js';
import { GroupAssignmentView } from './group-assignment-view.js';
import { AttendanceView } from './attendance-view.js';
import { EvaluationView } from './evaluation-view.js';
import { EfsrtView } from './efsrt-view.js';
import { ClosureView } from './closure-view.js';
import { DocumentsView } from './documents-view.js';
import { NominasView } from './nominas-view.js';
import { EnrollmentRegisterView } from './enrollment-register-view.js';
import { AcademicConfigurationView } from './academic-configuration-view.js';
import { DemoDashboardView } from './demo-dashboard-view.js';
import { DemoAttendanceView } from './demo-attendance-view.js';
import { DemoEvaluationView } from './demo-evaluation-view.js';
import { DemoRuntimeService } from '../services/demo-runtime-service.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';
import { MvpAdminService } from '../services/mvp-admin-service.js';
import { Notifications } from './notifications.js';
import { ErrorService, ValidationError } from '../services/error-service.js';
import { StagingService } from '../services/staging-service.js';
import { AcademicReadinessService, PENDING_PREREQUISITES } from '../services/academic-readiness-service.js';
import { ProductiveImportService } from '../services/productive-import-service.js';
import { StagingRecoveryService } from '../services/staging-recovery-service.js';
import { AuthService, ROLES } from '../services/auth-service.js';
import { TeacherContextService } from '../services/teacher-context-service.js';
import { LoginView } from './login-view.js';
import { TeacherWorkspacesView } from './teacher-workspaces-view.js';
import { TeacherConfigView } from './teacher-config-view.js';

const stagingService = new StagingService();
const academicReadinessService = new AcademicReadinessService();
const recoveryService = new StagingRecoveryService();
const INSTITUTION_FORM_FIELDS = Object.freeze([
  ['nombre', 'Nombre CETPRO'], ['denominacionVisible', 'Denominación visible'],
  ['tipoGestion', 'Tipo de Gestión'], ['ugel', 'UGEL'],
  ['resolucionAutorizacion1', 'Resolución 1'], ['resolucionAutorizacion2', 'Resolución 2'],
  ['direccion', 'Dirección'], ['telefono', 'Teléfono'],
  ['celular1', 'Celular 1'], ['celular2', 'Celular 2'],
  ['dre', 'DRE'], ['codigoModular', 'Código Modular'],
  ['departamento', 'Departamento'], ['provincia', 'Provincia'], ['distrito', 'Distrito']
]);
const PENDING_INSTITUTION_FIELDS = Object.freeze(['dre', 'codigoModular', 'departamento', 'provincia', 'distrito']);

export const Layout = {
  activeRoute: null,

  init() {
    this.renderUserRoleWidget();
    this.sanitizeSidebar();
    this.bindEvents();
    this.updateDbStatusBadge();

    // Redirigir a login si no hay sesión activa
    if (!AuthService.isAuthenticated() && !window.location.hash.startsWith('#/login')) {
      window.location.hash = '#/login';
    }

    // Escuchar evento personalizado para conmutar aula desde vistas internas
    document.addEventListener('cetpro:open-classroom-modal', () => {
      this.openClassroomSwitcherModal();
    });

    // Reaccionar a cambios de rol dinámicamente
    AuthService.subscribe((role) => {
      this.renderUserRoleWidget();
      this.sanitizeSidebar();
      this.updateDbStatusBadge();
      
      if (!role) {
        window.location.hash = '#/login';
        return;
      }

      const currentHash = window.location.hash || '#/inicio';
      if (currentHash === '#/login') {
        window.location.hash = '#/inicio';
        return;
      }
      if (AuthService.canAccessRoute(currentHash)) {
        const routeKey = currentHash.split('?')[0];
        const routeInfo = CONFIG.ROUTES[routeKey] || { id: 'inicio', hash: '#/inicio' };
        this.renderView({ hash: currentHash, ...routeInfo });
      } else {
        window.location.hash = '#/inicio';
      }
    });

    // Reaccionar a cambios de especialidad docente dinámicamente
    TeacherContextService.subscribe((program) => {
      this.renderUserRoleWidget();
      if (AuthService.getCurrentRole().id === 'DOCENTE') {
        const currentHash = window.location.hash || '#/inicio';
        const routeKey = currentHash.split('?')[0];
        const routeInfo = CONFIG.ROUTES[routeKey] || { id: 'inicio', hash: '#/inicio' };
        this.renderView({ hash: currentHash, ...routeInfo });
      }
    });
  },

  renderUserRoleWidget() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    let widget = document.getElementById('user-role-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'user-role-widget';
      widget.className = 'user-role-widget';
      headerActions.prepend(widget);
    }

    if (!AuthService.isAuthenticated()) {
      widget.innerHTML = `
        <a href="#/login" class="btn btn-outline-primary btn-sm fw-bold" style="border-radius: 8px;">
          🔑 Iniciar Sesión
        </a>
      `;
      widget.onclick = null;
      return;
    }

    const role = AuthService.getCurrentRole();
    const activeGroup = TeacherContextService.getActiveGroupInfo();
    const activeProg = TeacherContextService.getActiveProgram();

    if (role.id === 'DOCENTE') {
      widget.innerHTML = `
        <div class="user-role-avatar">${role.avatar}</div>
        <div class="user-role-details">
          <span class="user-role-name">${escapeHtml(role.userName)}</span>
          <span class="user-role-badge role-badge-${role.id}" title="Aula Activa: Grupo ${escapeHtml(activeGroup.grupoCode)} · ${escapeHtml(activeProg.nombre)}">
            👥 Aula: ${escapeHtml(activeGroup.grupoCode)} (${escapeHtml(activeGroup.turno || activeGroup.modalidad || 'Regular')})
          </span>
        </div>
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <button type="button" class="role-switcher-btn" id="btn-switch-classroom" title="Cambiar de Carrera o Aula" style="background: #f5f3ff; color: #6b21a8; border-color: #d8b4fe; font-weight: 700;">
            🏫 Aula ▾
          </button>
          <button type="button" class="role-switcher-btn" id="btn-switch-role" title="Cambiar Perfil Institucional">
            Perfil ▾
          </button>
          <button type="button" class="role-switcher-btn" id="btn-auth-logout" title="Cerrar Sesión" style="color: #dc2626; border-color: #fecaca; background: #fef2f2; font-weight: 700;">
            ⎋ Salir
          </button>
        </div>
      `;

      widget.querySelector('#btn-switch-classroom')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openClassroomSwitcherModal();
      });
      widget.querySelector('#btn-switch-role')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openRoleModal();
      });
      widget.querySelector('#btn-auth-logout')?.addEventListener('click', (e) => {
        e.stopPropagation();
        AuthService.logout();
        Notifications.info('Sesión finalizada correctamente');
        window.location.hash = '#/login';
      });
    } else {
      widget.innerHTML = `
        <div class="user-role-avatar">${role.avatar}</div>
        <div class="user-role-details">
          <span class="user-role-name">${escapeHtml(role.userName)}</span>
          <span class="user-role-badge role-badge-${role.id}">${escapeHtml(role.title)}</span>
        </div>
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <button type="button" class="role-switcher-btn" id="btn-switch-role" title="Cambiar Perfil">
            Perfil ▾
          </button>
          <button type="button" class="role-switcher-btn" id="btn-auth-logout" title="Cerrar Sesión" style="color: #dc2626; border-color: #fecaca; background: #fef2f2; font-weight: 700;">
            ⎋ Salir
          </button>
        </div>
      `;

      widget.querySelector('#btn-switch-role')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openRoleModal();
      });
      widget.querySelector('#btn-auth-logout')?.addEventListener('click', (e) => {
        e.stopPropagation();
        AuthService.logout();
        Notifications.info('Sesión finalizada correctamente');
        window.location.hash = '#/login';
      });
    }

    widget.onclick = null;
  },

  openClassroomSwitcherModal() {
    const existing = document.getElementById('classroom-switcher-modal-overlay');
    if (existing) existing.remove();

    const programs = TeacherContextService.getPrograms();
    let currentProgId = TeacherContextService.getActiveProgramId();
    let currentGroupCode = TeacherContextService.getActiveGroupCode();

    const overlay = document.createElement('div');
    overlay.id = 'classroom-switcher-modal-overlay';
    overlay.className = 'classroom-modal-overlay';

    overlay.innerHTML = `
      <div class="classroom-modal-card">
        <div style="background: linear-gradient(135deg, #6b21a8, #4c1d95); color: #fff; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="margin: 0; font-size: 1.15rem; font-weight: 700;">🏫 Conmutador de Carrera y Aula Pedagógica</h4>
            <p style="margin: 0.2rem 0 0; font-size: 0.85rem; color: #e9d5ff;">Seleccione la especialidad técnica y el grupo para delimitar el sistema</p>
          </div>
          <button type="button" class="btn-close btn-close-white" id="modal-classroom-close-btn" style="background:none; border:none; color:#fff; font-size:1.4rem; cursor:pointer;" aria-label="Cerrar">✕</button>
        </div>

        <div style="padding: 1.5rem; max-height: 75vh; overflow-y: auto;">
          <!-- Paso 1: Carrera -->
          <div class="classroom-step-box">
            <div class="classroom-step-header">
              <span class="classroom-step-num">1</span>
              <strong style="color: #1e293b; font-size: 0.95rem;">Paso 1: Seleccione Carrera / Especialidad Técnica:</strong>
            </div>
            <select id="modal-classroom-prog-select" class="form-select login-select" style="font-weight: 600;">
              ${programs.map(p => `
                <option value="${p.id}" ${p.id === currentProgId ? 'selected' : ''}>
                  📚 ${escapeHtml(p.nombre)} (${escapeHtml(p.codigo)})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Paso 2: Grupo -->
          <div class="classroom-step-box">
            <div class="classroom-step-header" style="justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <span class="classroom-step-num">2</span>
                <strong style="color: #1e293b; font-size: 0.95rem;">Paso 2: Seleccione el Grupo / Aula Asignada:</strong>
              </div>
              <span id="modal-classroom-group-badge" class="badge badge-info" style="font-size: 0.78rem;"></span>
            </div>
            <select id="modal-classroom-group-select" class="form-select login-select" style="border-color: #7c3aed; font-weight: 700;">
            </select>
            <div style="margin-top: 0.5rem; font-size: 0.78rem; color: #64748b;">
              ℹ️ Al conmutar el grupo, las nóminas, asistencias y evaluaciones se adaptarán de inmediato a los alumnos de esta aula.
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" class="btn btn-secondary btn-sm" id="modal-classroom-cancel-btn">Cancelar</button>
          <button type="button" class="btn btn-primary btn-sm fw-bold" id="modal-classroom-apply-btn" style="background: #7c3aed; border-color: #6d28d9; padding: 0.45rem 1.25rem;">
            ✓ Conmutar a esta Aula
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const progSelect = overlay.querySelector('#modal-classroom-prog-select');
    const groupSelect = overlay.querySelector('#modal-classroom-group-select');
    const groupBadge = overlay.querySelector('#modal-classroom-group-badge');
    const closeBtn = overlay.querySelector('#modal-classroom-close-btn');
    const cancelBtn = overlay.querySelector('#modal-classroom-cancel-btn');
    const applyBtn = overlay.querySelector('#modal-classroom-apply-btn');

    const closeModal = () => overlay.remove();
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    const updateGroups = (progId) => {
      const groups = TeacherContextService.getGroupsForProgram(progId);
      if (groups.length === 0) {
        groupSelect.innerHTML = '<option value="">No hay grupos en este programa</option>';
        if (groupBadge) groupBadge.textContent = '0 grupos';
        return;
      }
      groupSelect.innerHTML = groups.map(g => {
        const isSelected = g.grupoCode === currentGroupCode;
        const turnoText = g.turno && g.turno !== 'PENDIENTE' ? `Turno ${g.turno}` : (g.modalidad && g.modalidad !== 'PENDIENTE' ? g.modalidad : 'Regular');
        return `<option value="${escapeHtml(g.grupoCode)}" ${isSelected ? 'selected' : ''}>👥 ${escapeHtml(g.grupoCode)} · ${escapeHtml(turnoText)} (${g.count} estudiantes)</option>`;
      }).join('');
      if (groupBadge) {
        const total = groups.reduce((acc, g) => acc + (g.count || 0), 0);
        groupBadge.textContent = `${groups.length} grupo${groups.length > 1 ? 's' : ''} (${total} al.)`;
      }
    };

    updateGroups(currentProgId);

    progSelect.onchange = () => {
      currentProgId = progSelect.value;
      const groups = TeacherContextService.getGroupsForProgram(currentProgId);
      if (groups.length > 0) currentGroupCode = groups[0].grupoCode;
      updateGroups(currentProgId);
    };

    applyBtn.onclick = () => {
      const selectedGroup = groupSelect.value;
      if (!selectedGroup) {
        Notifications.error('Debe seleccionar un grupo válido');
        return;
      }
      TeacherContextService.setActiveProgramId(currentProgId);
      TeacherContextService.setActiveGroupCode(selectedGroup);
      const activeGroup = TeacherContextService.getActiveGroupInfo();
      const activeProg = TeacherContextService.getActiveProgram();
      Notifications.success(`Aula conmutada: ${activeProg.nombre} — Grupo ${activeGroup.grupoCode}`);
      closeModal();
      
      // Refrescar la vista activa
      const currentHash = window.location.hash || '#/inicio';
      const routeKey = currentHash.split('?')[0];
      const routeInfo = CONFIG.ROUTES[routeKey] || { id: 'inicio', hash: '#/inicio' };
      this.renderView({ hash: currentHash, ...routeInfo });
    };
  },

  openRoleModal() {
    const currentRole = AuthService.getCurrentRole();
    const existing = document.getElementById('role-selector-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'role-selector-modal-overlay';
    overlay.className = 'role-modal-overlay';

    overlay.innerHTML = `
      <div class="role-modal-card">
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Control de Acceso y Perfiles Institucionales (RBAC)</h4>
            <p style="margin: 0.2rem 0 0; font-size: 0.85rem; color: #94a3b8;">Seleccione el perfil para conmutar permisos, vistas y documentos ministeriales</p>
          </div>
          <button type="button" class="btn-close btn-close-white" id="modal-role-close-btn" style="background:none; border:none; color:#fff; font-size:1.4rem; cursor:pointer;" aria-label="Cerrar">✕</button>
        </div>

        <div style="padding: 1.25rem 1.5rem; max-height: 75vh; overflow-y: auto;">
          <!-- Opción 1: DIRECTOR -->
          <div class="role-card-option ${currentRole.id === 'DIRECTOR' ? 'is-active-role' : ''}" data-role-id="DIRECTOR">
            <div class="role-option-avatar">👨‍💼</div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <strong style="font-size: 1rem; color: #0f172a;">${ROLES.DIRECTOR.title}</strong>
                <span class="user-role-badge role-badge-DIRECTOR">DIRECTOR GENERAL</span>
              </div>
              <div style="font-weight: 600; font-size: 0.85rem; color: #047857; margin-bottom: 0.35rem;">
                ${ROLES.DIRECTOR.userName} · ${ROLES.DIRECTOR.cargo}
              </div>
              <p style="margin: 0 0 0.5rem; font-size: 0.82rem; color: #475569;">
                ${ROLES.DIRECTOR.description}
              </p>
              <div style="font-size: 0.75rem; color: #64748b; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                <strong>Atribuciones:</strong> Refrendo oficial de Títulos (TMPL-21), Actas Modulares (TMPL-19), Certificados (TMPL-20), Mallas Curriculares y Respaldo Total.
              </div>
            </div>
            <div style="display: flex; align-items: center;">
              <button type="button" class="btn ${currentRole.id === 'DIRECTOR' ? 'btn-success' : 'btn-outline-primary'} btn-sm fw-bold">
                ${currentRole.id === 'DIRECTOR' ? '✓ Activo' : 'Seleccionar'}
              </button>
            </div>
          </div>

          <!-- Opción 2: SECRETARIA -->
          <div class="role-card-option ${currentRole.id === 'SECRETARIA' ? 'is-active-role' : ''}" data-role-id="SECRETARIA">
            <div class="role-option-avatar">👩‍💼</div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <strong style="font-size: 1rem; color: #0f172a;">${ROLES.SECRETARIA.title}</strong>
                <span class="user-role-badge role-badge-SECRETARIA">SECRETARÍA ACADÉMICA</span>
              </div>
              <div style="font-weight: 600; font-size: 0.85rem; color: #1d4ed8; margin-bottom: 0.35rem;">
                ${ROLES.SECRETARIA.userName} · ${ROLES.SECRETARIA.cargo}
              </div>
              <p style="margin: 0 0 0.5rem; font-size: 0.82rem; color: #475569;">
                ${ROLES.SECRETARIA.description}
              </p>
              <div style="font-size: 0.75rem; color: #64748b; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                <strong>Atribuciones:</strong> Matrícula, Nóminas Oficiales (TMPL-01..03), EFSRT (TMPL-18), Actas (TMPL-19), Foliación y Certificados Modulares (TMPL-20).
              </div>
            </div>
            <div style="display: flex; align-items: center;">
              <button type="button" class="btn ${currentRole.id === 'SECRETARIA' ? 'btn-success' : 'btn-outline-primary'} btn-sm fw-bold">
                ${currentRole.id === 'SECRETARIA' ? '✓ Activo' : 'Seleccionar'}
              </button>
            </div>
          </div>

          <!-- Opción 3: DOCENTE -->
          <div class="role-card-option ${currentRole.id === 'DOCENTE' ? 'is-active-role' : ''}" data-role-id="DOCENTE">
            <div class="role-option-avatar">👨‍🏫</div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <strong style="font-size: 1rem; color: #0f172a;">${ROLES.DOCENTE.title}</strong>
                <span class="user-role-badge role-badge-DOCENTE">DOCENTE DE ESPECIALIDAD</span>
              </div>
              <div style="font-weight: 600; font-size: 0.85rem; color: #7c3aed; margin-bottom: 0.35rem;">
                ${ROLES.DOCENTE.userName} · ${ROLES.DOCENTE.cargo}
              </div>
              <p style="margin: 0 0 0.5rem; font-size: 0.82rem; color: #475569;">
                ${ROLES.DOCENTE.description}
              </p>
              <div style="font-size: 0.75rem; color: #64748b; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                <strong>Atribuciones:</strong> Control de Asistencia diaria (TMPL-05..10), Registro Auxiliar de Calificaciones (TMPL-11..17) y Portada Docente (TMPL-04).<br>
                <strong style="color: #7c3aed;">Especialidad Activa:</strong> ${escapeHtml(TeacherContextService.getActiveProgram().nombre)} (Delimitación contextual de BD: solo grupos y alumnos asignados).
              </div>
            </div>
            <div style="display: flex; align-items: center;">
              <button type="button" class="btn ${currentRole.id === 'DOCENTE' ? 'btn-success' : 'btn-outline-primary'} btn-sm fw-bold">
                ${currentRole.id === 'DOCENTE' ? '✓ Activo' : 'Seleccionar'}
              </button>
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 0.85rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary btn-sm" id="modal-role-cancel-btn">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#modal-role-close-btn').onclick = closeModal;
    overlay.querySelector('#modal-role-cancel-btn').onclick = closeModal;

    overlay.querySelectorAll('.role-card-option').forEach(card => {
      card.onclick = () => {
        const roleId = card.getAttribute('data-role-id');
        AuthService.setRole(roleId);
        const newRole = ROLES[roleId];
        Notifications.success(`Perfil cambiado a: ${newRole.userName} (${newRole.title})`);
        closeModal();
      };
    });
  },

  /**
   * Sanea la barra lateral y adapta enlaces según el rol activo (RBAC)
   */
  sanitizeSidebar() {
    const role = AuthService.getCurrentRole();
    const redundantSelectors = [
      '#sidebar a[href="#/matriculas"]',
      '#sidebar a[href="#/nominas"]',
      '#sidebar a[href="#/registros/matricula"]',
      '#sidebar a[href="#/registro"]'
    ];
    redundantSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Control de visibilidad de enlaces por rol en la barra lateral
    const navLinks = document.querySelectorAll('#sidebar .nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const baseHref = href.split('?')[0];
        if (role.allowedRoutes.includes(baseHref)) {
          link.style.display = '';
        } else {
          link.style.display = 'none';
        }
      }
    });

    // Depuración de ruido visual específico para DIRECCIÓN GENERAL ("eliminar cosas que no sirven")
    if (role.id === 'DIRECTOR') {
      const directorNoiseSelectors = [
        '#sidebar a[href="#/incidencias"]',
        '#sidebar a[href="#/efsrt"]',
        '#sidebar a[href="#/cierre"]',
        '#sidebar a[href="#/asistencia"]',
        '#sidebar a[href="#/evaluacion"]',
        '#sidebar a[href="#/portada"]',
        '#sidebar a[href="#/configuracion-docente"]'
      ];
      directorNoiseSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.display = 'none';
        });
      });
    }

    // Depuración de ruido visual específico para SECRETARÍA ACADÉMICA ("eliminar cosas que no sirven")
    if (role.id === 'SECRETARIA') {
      const secretariaNoiseSelectors = [
        '#sidebar a[href="#/incidencias"]',
        '#sidebar a[href="#/cierre"]',
        '#sidebar a[href="#/efsrt"]',
        '#sidebar a[href="#/registro"]',
        '#sidebar a[href="#/asistencia"]',
        '#sidebar a[href="#/evaluacion"]',
        '#sidebar a[href="#/portada"]',
        '#sidebar a[href="#/configuracion-docente"]'
      ];
      secretariaNoiseSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.display = 'none';
        });
      });
    }

    // Depuración de ruido visual específico para DOCENTE DE ESPECIALIDAD ("eliminar cosas que no sirven")
    if (role.id === 'DOCENTE') {
      const docenteNoiseSelectors = [
        '#sidebar a[href="#/incidencias"]',
        '#sidebar a[href="#/cierre"]',
        '#sidebar a[href="#/efsrt"]',
        '#sidebar a[href="#/registro"]',
        '#sidebar a[href="#/respaldo"]',
        '#sidebar a[href="#/matriculas"]',
        '#sidebar a[href="#/nominas"]',
        '#sidebar a[href="#/registros/matricula"]',
        '#sidebar a[href="#/configuracion"]',
        '#sidebar a[href="#/documentos"]'
      ];
      docenteNoiseSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.display = 'none';
        });
      });
    }

    // Secciones de cabecera en el sidebar
    let mainSecTitle = document.getElementById('sidebar-sec-title-main');
    let adminSecTitle = document.getElementById('sidebar-sec-title-admin');
    let academicSecTitle = document.getElementById('sidebar-sec-title-academic');
    const inicioLink = document.querySelector('#sidebar a[href="#/inicio"]');
    const estLink = document.querySelector('#sidebar a[href="#/estudiantes"]');
    const respaldoLink = document.querySelector('#sidebar a[href="#/respaldo"]');

    if (!mainSecTitle && inicioLink && inicioLink.parentNode) {
      mainSecTitle = document.createElement('div');
      mainSecTitle.id = 'sidebar-sec-title-main';
      mainSecTitle.className = 'nav-section-title';
      inicioLink.parentNode.insertBefore(mainSecTitle, inicioLink);
    }
    if (!academicSecTitle && estLink && estLink.parentNode) {
      academicSecTitle = document.createElement('div');
      academicSecTitle.id = 'sidebar-sec-title-academic';
      academicSecTitle.className = 'nav-section-title';
      estLink.parentNode.insertBefore(academicSecTitle, estLink);
    }
    if (!adminSecTitle && respaldoLink && respaldoLink.parentNode) {
      adminSecTitle = document.createElement('div');
      adminSecTitle.id = 'sidebar-sec-title-admin';
      adminSecTitle.className = 'nav-section-title';
      respaldoLink.parentNode.insertBefore(adminSecTitle, respaldoLink);
    }

    if (mainSecTitle) {
      if (role.id === 'DIRECTOR') {
        mainSecTitle.textContent = 'DIRECCIÓN GENERAL';
        mainSecTitle.style.display = '';
      } else if (role.id === 'SECRETARIA') {
        mainSecTitle.textContent = 'SECRETARÍA ACADÉMICA';
        mainSecTitle.style.display = '';
      } else if (role.id === 'DOCENTE') {
        mainSecTitle.textContent = 'GESTIÓN PEDAGÓGICA';
        mainSecTitle.style.display = '';
      }
    }

    if (academicSecTitle) {
      if (role.id === 'DOCENTE') {
        academicSecTitle.textContent = 'AULA Y ESPECIALIDAD';
        academicSecTitle.style.display = '';
      } else {
        academicSecTitle.style.display = 'none';
      }
    }

    if (adminSecTitle) {
      if (role.id === 'DIRECTOR') {
        adminSecTitle.textContent = 'SISTEMA Y SEGURIDAD';
        adminSecTitle.style.display = '';
      } else if (role.id === 'SECRETARIA') {
        adminSecTitle.textContent = 'ADMINISTRACIÓN Y REGISTRO';
        adminSecTitle.style.display = '';
      } else {
        adminSecTitle.style.display = 'none';
      }
    }

    // Gestión de enlaces pedagógicos especializados para el rol DOCENTE
    const docLink = document.querySelector('#sidebar a[href="#/documentos"]');
    let teacherLinksContainer = document.getElementById('sidebar-teacher-custom-nav');

    if (role.id === 'DOCENTE') {
      if (docLink) docLink.style.display = 'none';
      if (!teacherLinksContainer) {
        teacherLinksContainer = document.createElement('div');
        teacherLinksContainer.id = 'sidebar-teacher-custom-nav';
        teacherLinksContainer.innerHTML = `
          <a href="#/asistencia" class="nav-link"><span class="nav-icon">📝</span><span>CONTROL DE ASISTENCIA</span></a>
          <a href="#/evaluacion" class="nav-link"><span class="nav-icon">📊</span><span>REGISTRO DE NOTAS</span></a>
          <a href="#/portada" class="nav-link"><span class="nav-icon">📁</span><span>PORTADA DOCENTE</span></a>
          <a href="#/configuracion-docente" class="nav-link"><span class="nav-icon">⚙️</span><span>CONFIGURACIÓN DE CARPETA</span></a>
        `;
        if (inicioLink && inicioLink.parentNode) {
          inicioLink.parentNode.insertBefore(teacherLinksContainer, inicioLink.nextSibling);
        }
      } else {
        teacherLinksContainer.style.display = '';
        if (inicioLink && inicioLink.parentNode && inicioLink.nextSibling !== teacherLinksContainer) {
          inicioLink.parentNode.insertBefore(teacherLinksContainer, inicioLink.nextSibling);
        }
      }
    } else {
      if (docLink) docLink.style.display = '';
      if (teacherLinksContainer) teacherLinksContainer.style.display = 'none';
    }

    // Etiquetas y orden contextual por rol
    const inicioSpan = document.querySelector('#sidebar a[href="#/inicio"] span:last-child');
    if (inicioSpan) {
      inicioSpan.textContent = role.id === 'DIRECTOR'
        ? 'PANEL EJECUTIVO'
        : (role.id === 'SECRETARIA' ? 'PANEL DE MATRÍCULA' : 'AULA PEDAGÓGICA');
    }

    const docLinkEl = document.querySelector('#sidebar a[href="#/documentos"]');
    if (docLinkEl) {
      const docIcon = docLinkEl.querySelector('.nav-icon');
      const docSpan = docLinkEl.querySelector('span:last-child');
      if (docIcon && docSpan) {
        if (role.id === 'DIRECTOR') {
          docIcon.textContent = '🎓';
          docSpan.textContent = 'TITULACIÓN Y DOCUMENTOS';
          if (inicioLink && inicioLink.nextSibling !== docLinkEl) {
            inicioLink.parentNode.insertBefore(docLinkEl, inicioLink.nextSibling);
          }
        } else if (role.id === 'SECRETARIA') {
          docIcon.textContent = '📑';
          docSpan.textContent = 'NÓMINAS Y DOCUMENTOS';
        } else {
          docIcon.textContent = '📄';
          docSpan.textContent = 'DOCUMENTOS';
        }
      }
    }

    const gruposLink = document.querySelector('#sidebar a[href="#/grupos"] span:last-child');
    if (gruposLink) {
      gruposLink.textContent = role.id === 'DOCENTE'
        ? 'MIS GRUPOS ASIGNADOS'
        : (role.id === 'DIRECTOR' ? 'SUPERVISIÓN DE AULAS' : 'ASIGNACIÓN DE GRUPOS');
    }
    const estudiantesLink = document.querySelector('#sidebar a[href="#/estudiantes"] span:last-child');
    if (estudiantesLink) {
      estudiantesLink.textContent = role.id === 'DOCENTE'
        ? 'MIS ALUMNOS'
        : (role.id === 'DIRECTOR' ? 'PADRÓN INSTITUCIONAL' : 'PADRÓN Y MATRÍCULA');
    }
    const programasLink = document.querySelector('#sidebar a[href="#/programas"] span:last-child');
    if (programasLink) {
      programasLink.textContent = role.id === 'DOCENTE'
        ? 'MI MALLA CURRICULAR'
        : (role.id === 'DIRECTOR' ? 'PLANES DE ESTUDIO' : 'PROGRAMAS Y MÓDULOS');
    }

    const respaldoLinkSpan = document.querySelector('#sidebar a[href="#/respaldo"] span:last-child');
    if (respaldoLinkSpan) {
      respaldoLinkSpan.textContent = role.id === 'DIRECTOR'
        ? 'SEGURIDAD Y RESPALDO BD'
        : (role.id === 'SECRETARIA' ? 'COPIA DE RESPALDO' : 'RESPALDO');
    }
    const configLinkSpan = document.querySelector('#sidebar a[href="#/configuracion"] span:last-child');
    if (configLinkSpan) {
      configLinkSpan.textContent = role.id === 'DIRECTOR'
        ? 'CONFIGURACIÓN GENERAL'
        : (role.id === 'SECRETARIA' ? 'CONFIGURACIÓN GENERAL' : 'CONFIGURACIÓN');
    }
  },

  bindEvents() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
      menuToggle.onclick = () => {
        sidebar.classList.toggle('open');
      };
    }
    document.addEventListener('click', (e) => {
      if (e.target && (e.target.id === 'doc-header-switch-role-btn' || e.target.closest('#doc-header-switch-role-btn') || e.target.id === 'btn-denied-switch-role')) {
        this.openRoleModal();
      }
    });
  },

  /**
   * Actualiza la navegación activa en la barra lateral
   * @param {string} currentHash
   */
  updateNavigation(currentHash) {
    this.activeRoute = currentHash;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentHash) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
  },

  /**
   * Actualiza el indicador de estado de la base de datos local en la cabecera
   */
  updateDbStatusBadge() {
    const badge = document.getElementById('db-status-badge');
    if (!badge) return;

    const status = StorageService.getStatus();
    if (status.isConnected) {
      badge.className = 'status-badge status-online';
      badge.innerHTML = CONFIG.IS_V2_CANDIDATE
        ? `<span class="dot"></span> ${isDemoRuntime() ? 'CETPRO_V2_DEMO · datos simulados' : 'Datos locales disponibles'}`
        : `<span class="dot"></span> IDB: Conectado (${status.dbName} v${status.version})`;
    } else {
      badge.className = 'status-badge status-offline';
      badge.innerHTML = `<span class="dot"></span> IDB: Desconectado`;
    }
  },

  /**
   * Renderiza el contenido principal de la sección según la ruta seleccionada
   * @param {object} routeInfo
   */
  /**
   * Renderiza la pantalla de Acceso Restringido cuando el rol no posee facultades
   */
  renderAccessDeniedView(container, routeInfo) {
    const role = AuthService.getCurrentRole();
    container.innerHTML = `
      <div class="access-denied-card">
        <div class="access-denied-icon">🛡️</div>
        <h2 style="color: #dc2626; margin-bottom: 0.5rem; font-size: 1.45rem; font-weight: 700;">Acceso Restringido por Nivel de Autorización</h2>
        <p class="text-muted" style="margin-bottom: 1.5rem; font-size: 0.95rem;">
          La sección solicitada (<strong>${escapeHtml(routeInfo.title || routeInfo.id || 'solicitada')}</strong>) requiere facultades administrativas o de dirección institucional.
        </p>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 1.1rem; margin-bottom: 1.5rem; text-align: left; font-size: 0.88rem;">
          <div style="font-weight: 700; color: #92400e; margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
            <span>Usuario actual: ${escapeHtml(role.userName)}</span>
            <span class="user-role-badge role-badge-${role.id}">${escapeHtml(role.title)}</span>
          </div>
          <div style="color: #78350f; font-size: 0.82rem; margin-bottom: 0.5rem;">
            ${escapeHtml(role.cargo)}
          </div>
          <div style="color: #451a03; font-size: 0.8rem; background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 4px;">
            ${escapeHtml(role.description)}
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <a href="#/inicio" class="btn btn-secondary">← Volver al Inicio</a>
          <button type="button" class="btn btn-primary" id="btn-denied-switch-role">
            <i class="bi bi-person-badge me-1"></i>Cambiar Perfil Institucional
          </button>
        </div>
      </div>
    `;

    const switchBtn = container.querySelector('#btn-denied-switch-role');
    if (switchBtn) {
      switchBtn.onclick = () => this.openRoleModal();
    }
  },

  async renderView(routeInfo) {
    const container = document.getElementById('main-content');
    if (!container) return;

    const appLayout = document.getElementById('app-layout');
    const sidebar = document.getElementById('sidebar');

    // Manejo de Pantalla Completa para Inicio de Sesión
    if (routeInfo.id === 'login') {
      if (appLayout) appLayout.classList.add('app-layout--login');
      if (sidebar) sidebar.style.display = 'none';
      this.renderUserRoleWidget();
      await new LoginView().render(container);
      window.scrollTo(0, 0);
      return;
    }

    // Guardia de Autenticación Institucional
    if (!AuthService.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }

    if (appLayout) appLayout.classList.remove('app-layout--login');
    if (sidebar) sidebar.style.display = '';

    this.renderUserRoleWidget();
    this.sanitizeSidebar();
    this.updateNavigation(routeInfo.hash);

    // Limpieza de modales flotantes que puedan quedar adjuntos a document.body
    document.querySelectorAll('.etapa2-modal-overlay, .etapa4-modal-overlay, #etapa2-attendance-modal, #etapa2-evaluation-modal, #etapa4-modal-overlay').forEach(el => el.remove());

    // Guardia de Enrutamiento (RBAC)
    if (!AuthService.canAccessRoute(routeInfo.hash)) {
      this.renderAccessDeniedView(container, routeInfo);
      return;
    }

    switch (routeInfo.id) {
      case 'demo': {
        await DemoRuntimeService.enter({ reset: false });
        DemoRuntimeService.applyVisualState();
        this.updateDbStatusBadge();
        await new DemoDashboardView().render(container);
        break;
      }
      case 'demo-evaluacion':
        await new DemoEvaluationView().render(container);
        break;
      case 'inicio':
        await this.renderInicioView(container);
        break;
      case 'estudiantes':
        await StudentsView.render(container);
        break;
      case 'matriculas':
        if (CONFIG.IS_V2_CANDIDATE) await new CandidateEnrollmentsView().render(container);
        else await EnrollmentsView.render(container);
        break;
      case 'programas':
        await this.renderProgramasView(container);
        break;
      case 'grupos':
        await GroupAssignmentView.render(container);
        break;
      case 'nominas': {
        const view = new NominasView();
        await view.render(container);
        break;
      }
      case 'registro-matricula': {
        const view = new EnrollmentRegisterView();
        await view.render(container);
        break;
      }
      case 'configuracion-academica': {
        const view = new AcademicConfigurationView();
        await view.render(container);
        break;
      }
      case 'registro':
        await this.renderRegistroView(container);
        break;
      case 'asistencia':
        await this.renderAsistenciaDocenteView(container);
        break;
      case 'evaluacion': {
        const role = AuthService.getCurrentRole();
        if (role.id === 'DOCENTE') {
          await this.renderEvaluacionDocenteView(container);
        } else {
          const view = new EvaluationView();
          await view.render(container);
        }
        break;
      }
      case 'portada':
        await this.renderPortadaDocenteView(container);
        break;
      case 'efsrt':
        {
          const view = new EfsrtView();
          await view.render(container);
        }
        break;
      case 'cierre':
        {
          const view = new ClosureView();
          await view.render(container);
        }
        break;
      case 'documentos':
        await this.renderDocumentosView(container);
        break;
      case 'incidencias':
        await this.renderIncidenciasView(container);
        break;
      case 'respaldo':
        container.innerHTML = this.renderRespaldoView();
        break;
      case 'configuracion-docente':
        await new TeacherConfigView().render(container);
        break;
      case 'configuracion': {
        const role = AuthService.getCurrentRole();
        if (role.id === 'DOCENTE') {
          await new TeacherConfigView().render(container);
        } else {
          await this.renderConfiguracionView(container);
        }
        break;
      }
      default:
        await this.renderInicioView(container);
    }

    window.scrollTo(0, 0);
  },

  async renderInicioView(container) {
    if (isDemoRuntime()) return new DemoDashboardView().render(container);
    if (CONFIG.IS_V2_CANDIDATE) return this.renderMvpInicioView(container);
    const status = StorageService.getStatus();
    const institution = await InstitutionService.getInstitutionProfile();
    const readiness = await academicReadinessService.getAcademicReadinessSummary();
    const finalCounts = await new ProductiveImportService().getFinalCounts();
    const matriculasCount = finalCounts.MATRICULAS;
    const stagingCount = finalCounts.STAGING;

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>Panel Principal — Secretaría CETPRO</h2>
          <p class="subtitle">${escapeHtml(institution.nombre)}</p>
        </div>
        <span class="module-tag">Control de Prerrequisitos M05.3</span>
      </section>

      <div class="grid grid-3">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <span class="stat-value">7</span>
            <span class="stat-label">Programas Oficiales</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📖</div>
          <div class="stat-info">
            <span class="stat-value">14</span>
            <span class="stat-label">Módulos Curriculares</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🎓</div>
          <div class="stat-info">
            <span class="stat-value">${matriculasCount}</span>
            <span class="stat-label">Matrículas Registradas</span>
            <small class="text-muted" style="font-size:0.75rem;">(${stagingCount} en staging)</small>
          </div>
        </div>
      </div>

      <!-- Panel de Estado de Configuración Académica Pendiente -->
      <div class="card margin-top" style="border-left: 4px solid #d97706;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
          <h3>⚙️ Estado de Configuración Académica (Prerrequisitos)</h3>
          <span class="badge badge-warning" style="background:#fef3c7; color:#92400e;">Pendiente de Fuentes Oficiales</span>
        </div>
        <p class="subtitle margin-top-sm">Resumen administrativo de datos académicos pendientes de confirmación por la jefatura del CETPRO.</p>

        <div class="grid grid-3 margin-top" style="gap:1rem;">
          <div style="background:#f8fafc; padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <div style="font-size:0.85rem; color:var(--neutral-muted);">PERIODO ACADÉMICO</div>
            <div style="font-size:1.2rem; font-weight:bold; color:#d97706; margin:0.2rem 0;">${readiness.periodosCount} / 1 Activos</div>
            <small style="color:var(--neutral-muted);">Pendiente de creación en Configuración → Periodos.</small>
          </div>

          <div style="background:#f8fafc; padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <div style="font-size:0.85rem; color:var(--neutral-muted);">MÓDULO POR GRUPO TÉCNICO</div>
            <div style="font-size:1.2rem; font-weight:bold; color:#d97706; margin:0.2rem 0;">${readiness.groupsWithModule} / ${readiness.totalGroups} Grupos</div>
            <small style="color:var(--neutral-muted);">${readiness.groupsPending} grupos pendientes de asignación Módulo I o II.</small>
          </div>

          <div style="background:#f8fafc; padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
            <div style="font-size:0.85rem; color:var(--neutral-muted);">UNIDADES DIDÁCTICAS</div>
            <div style="font-size:1.2rem; font-weight:bold; color:#d97706; margin:0.2rem 0;">${readiness.totalUnits} Unidades</div>
            <small style="color:var(--neutral-muted);">${readiness.modulesWithUnitsCount} / 14 módulos con estructura curricular configurada.</small>
          </div>
        </div>

        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end;">
          <a href="#/configuracion" class="btn btn-secondary">Gestionar Configuración Académica →</a>
        </div>
      </div>
    `;
  },

  async renderMvpInicioView(container) {
    const institution = await InstitutionService.getInstitutionProfile();
    const counts = await new MvpAdminService().getDashboardStats();
    const role = AuthService.getCurrentRole();

    let roleTitle = 'Panel Institucional — Dirección General';
    let roleSub = `${escapeHtml(institution.nombre)} · Director: ${escapeHtml(role.userName)}`;
    let shortcutsHtml = '';
    let metricsGridHtml = '';
    let contextBannerHtml = '';
    let synopticMonitorHtml = '';

    if (role.id === 'DIRECTOR') {
      roleTitle = 'Panel Institucional — Dirección General CETPRO';
      roleSub = `${escapeHtml(institution.nombre)} · Despacho de Dirección: ${escapeHtml(role.userName)}`;

      const cleanInstName = (institution.nombre || 'Micaela Bastidas Puyucawa')
        .replace(/^CETPRO\s+P[úu]blico\s+/i, '')
        .replace(/^["“”']+|["“”']+$/g, '');
      const bannerInstTitle = `CETPRO Público "${cleanInstName}"`;

      contextBannerHtml = `
        <div class="card margin-bottom-sm" style="background: linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%); color: #ffffff; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 4px 14px rgba(6, 78, 59, 0.18); border: 1px solid #059669;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="max-width: 760px;">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; flex-wrap:wrap;">
                <span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.65rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;">
                  Despacho de Dirección General
                </span>
                <span style="background: #10b981; color: #064e3b; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                  R.D. N° 0124-1983-ED
                </span>
                <span style="background: rgba(255,255,255,0.15); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
                  UGEL 03 · DRELM
                </span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; letter-spacing: -0.01em; line-height: 1.25; margin-bottom: 0.35rem;">
                ${escapeHtml(bannerInstTitle)}
              </div>
              <div style="font-size:0.86rem; opacity:0.95; line-height:1.4;">
                Código Modular: <strong>0725358</strong> · Periodo Académico: <strong>2026-I</strong> · Titular: <strong>${escapeHtml(role.userName)}</strong>
              </div>
            </div>
            <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
              <a href="#/documentos" class="btn btn-sm" style="background:#ffffff; color:#065f46; font-weight:700; border-radius:8px; padding:0.55rem 1.1rem; text-decoration:none; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                🎓 Titulación Oficial (TMPL-21)
              </a>
              <a href="#/respaldo" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#ffffff; border:1px solid rgba(255,255,255,0.45); font-weight:600; border-radius:8px; padding:0.55rem 1rem; text-decoration:none;">
                💾 Respaldo Maestro BD
              </a>
            </div>
          </div>
        </div>
      `;

      metricsGridHtml = `
        <div class="stat-card" style="border-left: 4px solid #047857;">
          <div class="stat-icon" style="background: #d1fae5; color: #047857;">👥</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #047857;">${counts.students}</span>
            <span class="stat-label">Padrón de Estudiantes</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #2563eb;">
          <div class="stat-icon" style="background: #dbeafe; color: #1d4ed8;">📋</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #1d4ed8;">${counts.enrollments}</span>
            <span class="stat-label">Matrículas Totales</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #7c3aed;">
          <div class="stat-icon" style="background: #ede9fe; color: #7c3aed;">🗂️</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #6d28d9;">${counts.groups}</span>
            <span class="stat-label">Aulas / 12 Grupos</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #d97706;">
          <div class="stat-icon" style="background: #fef3c7; color: #b45309;">📚</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #b45309;">${counts.programs}</span>
            <span class="stat-label">Carreras Técnicas</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #0284c7;">
          <div class="stat-icon" style="background: #e0f2fe; color: #0369a1;">📖</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #0369a1;">${counts.modules}</span>
            <span class="stat-label">Módulos Oficiales</span>
          </div>
        </div>
      `;

      shortcutsHtml = `
        <a class="shortcut-btn-card shortcut-btn--emerald" href="#/documentos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">🎓</div>
            <span class="shortcut-btn-badge">TMPL-21 / TMPL-20</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Titulación y Certificación Oficial</strong>
            <p class="shortcut-btn-desc">Refrendo ministerial de Títulos Profesionales Técnicos (TMPL-21) con código REGISTRA y Certificados Modulares oficiales.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Emitir Títulos y Actas <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--amber" href="#/documentos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📜</div>
            <span class="shortcut-btn-badge">TMPL-01 / TMPL-19</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Visado de Nóminas y Actas Finales</strong>
            <p class="shortcut-btn-desc">Supervisión y visado oficial de Nóminas de Matrícula (TMPL-01..03) y Actas Consolidadas de Evaluación Modular para UGEL 03.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Supervisar Documentos <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--blue" href="#/grupos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">🗂️</div>
            <span class="shortcut-btn-badge">${counts.groups} Aulas Activas</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Supervisión de Aulas y Aforos</strong>
            <p class="shortcut-btn-desc">Monitoreo de carga docente, turnos (Mañana, Tarde, Noche, Virtual) y distribución de aforos en las 12 aulas formativas.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Monitorear Aulas <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--purple" href="#/respaldo" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">💾</div>
            <span class="shortcut-btn-badge">Copia Local SHA-256</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Seguridad y Respaldo Maestro de BD</strong>
            <p class="shortcut-btn-desc">Exportación de respaldo inmutable en JSON criptográfico, restauración de emergencia y auditoría de integridad física.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Gestionar Respaldo <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--indigo" href="#/programas" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📚</div>
            <span class="shortcut-btn-badge">${counts.programs} Carreras / ${counts.modules} Módulos</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Planes de Estudio y Catálogo Curricular</strong>
            <p class="shortcut-btn-desc">Estructura curricular oficial, unidades de competencia y horas lectivas bajo enfoque de formación técnico-productiva.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Consultar Malla <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--teal" href="#/estudiantes" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">👥</div>
            <span class="shortcut-btn-badge">${counts.students} Matriculados</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Padrón Institucional de Estudiantes</strong>
            <p class="shortcut-btn-desc">Consulta centralizada de estudiantes, datos DNI, género y estado de matrícula institucional de todo el CETPRO.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Consultar Padrón <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>
      `;

      // Generación del Monitor Sinóptico de las 7 Carreras Técnicas
      const allPrograms = TeacherContextService.getPrograms();
      const allGroups = TeacherContextService.getGroupCatalog();

      const rows = allPrograms.map(p => {
        const pGroups = allGroups.filter(g => g.programaId === p.id);
        const pStudents = pGroups.reduce((acc, g) => acc + (g.count || 0), 0);
        const pModules = (p.modulos && p.modulos.length) || 2;
        const turnosSet = new Set(pGroups.map(g => {
          if (g.turno && g.turno !== 'PENDIENTE') return g.turno;
          if (g.modalidad && g.modalidad !== 'PENDIENTE') return g.modalidad;
          return 'Regular';
        }));
        const turnosStr = Array.from(turnosSet).join(', ') || 'Regular';
        const percent = Math.min(100, Math.round((pStudents / 295) * 100));

        return `
          <tr>
            <td style="padding:0.65rem 0.75rem;"><code style="background:#f1f5f9; padding:0.15rem 0.4rem; border-radius:4px; font-weight:700; color:#334155;">${escapeHtml(p.id)}</code></td>
            <td style="padding:0.65rem 0.75rem;">
              <strong style="color:#0f172a;">${escapeHtml(p.nombre)}</strong>
              <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(p.modulos?.[0]?.nombre || 'Módulo Modular')}</div>
            </td>
            <td style="text-align:center; padding:0.65rem 0.75rem;"><span class="badge badge-light" style="font-weight:600;">${pModules} Mód.</span></td>
            <td style="text-align:center; padding:0.65rem 0.75rem;"><span class="badge badge-light" style="font-weight:600;">${pGroups.length} Aula(s)</span></td>
            <td style="padding:0.65rem 0.75rem;"><span style="font-size:0.8rem; color:#475569;">${escapeHtml(turnosStr)}</span></td>
            <td style="text-align:center; padding:0.65rem 0.75rem;">
              <strong style="color:#047857; font-size:0.92rem;">${pStudents}</strong>
              <div style="font-size:0.72rem; color:#64748b;">${percent}% del CETPRO</div>
            </td>
            <td style="text-align:center; padding:0.65rem 0.75rem;">
              <span class="badge badge-success" style="font-size:0.72rem; padding:0.25rem 0.5rem;">ACTIVO</span>
            </td>
            <td style="text-align:right; padding:0.65rem 0.75rem;">
              <a href="#/grupos" class="btn btn-sm btn-secondary" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none;">Supervisar →</a>
            </td>
          </tr>
        `;
      }).join('');

      synopticMonitorHtml = `
        <div class="card margin-top">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
            <div>
              <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem; font-size:1.1rem;">
                <span>📊</span> Monitor Sinóptico de Carreras Técnicas
              </h3>
              <p style="margin:0.25rem 0 0 0; font-size:0.83rem; color:#64748b;">
                Supervisión institucional consolidada de aforos, matrícula modular y distribución por especialidad (Periodo 2026-I)
              </p>
            </div>
            <span class="badge badge-success" style="font-size:0.78rem; padding:0.35rem 0.75rem; font-weight:700;">
              7 Carreras Acreditadas · 12 Aulas
            </span>
          </div>

          <div class="table-responsive" style="overflow-x:auto;">
            <table class="data-table" style="width:100%; font-size:0.86rem; border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                  <th style="padding:0.65rem 0.75rem;">Código</th>
                  <th style="padding:0.65rem 0.75rem;">Especialidad Formativa</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Módulos</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Aulas</th>
                  <th style="padding:0.65rem 0.75rem;">Turnos / Modalidad</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Matrículas</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Estado</th>
                  <th style="padding:0.65rem 0.75rem; text-align:right;">Supervisión</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
              <tfoot>
                <tr style="background:#f1f5f9; font-weight:700; border-top:2px solid #cbd5e1;">
                  <td colspan="2" style="padding:0.75rem;">TOTAL CONSOLIDADO CETPRO</td>
                  <td style="padding:0.75rem; text-align:center;">14 Módulos</td>
                  <td style="padding:0.75rem; text-align:center;">12 Grupos</td>
                  <td style="padding:0.75rem;">Mañana · Tarde · Noche · Virtual</td>
                  <td style="padding:0.75rem; text-align:center; color:#047857; font-size:0.95rem;">295 Matrículas (269 Alumnos)</td>
                  <td style="padding:0.75rem; text-align:center;"><span class="badge badge-success" style="font-size:0.72rem;">100% OPERATIVO</span></td>
                  <td style="padding:0.75rem; text-align:right;"><a href="#/grupos" class="btn btn-sm btn-secondary" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none;">Ver Todo →</a></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    } else if (role.id === 'SECRETARIA') {
      roleTitle = 'Panel de Matrícula y Registros — Secretaría Académica';
      roleSub = `${escapeHtml(institution.nombre)} · Área de Secretaría: ${escapeHtml(role.userName)}`;

      const cleanInstName = (institution.nombre || 'Micaela Bastidas Puyucawa')
        .replace(/^CETPRO\s+P[úu]blico\s+/i, '')
        .replace(/^["“”']+|["“”']+$/g, '');
      const bannerInstTitle = `CETPRO Público "${cleanInstName}"`;

      contextBannerHtml = `
        <div class="card margin-bottom-sm" style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%); color: #ffffff; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.18); border: 1px solid #3b82f6;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="max-width: 760px;">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; flex-wrap:wrap;">
                <span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.65rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;">
                  Área de Secretaría Académica
                </span>
                <span style="background: #60a5fa; color: #1e3a8a; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                  Gestión de Matrícula y Nóminas
                </span>
                <span style="background: rgba(255,255,255,0.15); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
                  Periodo 2026-I
                </span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; letter-spacing: -0.01em; line-height: 1.25; margin-bottom: 0.35rem;">
                ${escapeHtml(bannerInstTitle)}
              </div>
              <div style="font-size:0.86rem; opacity:0.95; line-height:1.4;">
                Registro Central de Estudiantes · Padrón Oficial · Responsable: <strong>${escapeHtml(role.userName)}</strong>
              </div>
            </div>
            <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
              <a href="#/documentos" class="btn btn-sm" style="background:#ffffff; color:#1d4ed8; font-weight:700; border-radius:8px; padding:0.55rem 1.1rem; text-decoration:none; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                📑 Nóminas Oficiales (TMPL-01)
              </a>
              <a href="#/estudiantes" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#ffffff; border:1px solid rgba(255,255,255,0.45); font-weight:600; border-radius:8px; padding:0.55rem 1rem; text-decoration:none;">
                👥 Padrón de Matrícula
              </a>
            </div>
          </div>
        </div>
      `;

      metricsGridHtml = `
        <div class="stat-card" style="border-left: 4px solid #2563eb;">
          <div class="stat-icon" style="background: #dbeafe; color: #1d4ed8;">👥</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #1d4ed8;">${counts.students}</span>
            <span class="stat-label">Padrón de Estudiantes</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #4f46e5;">
          <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">📋</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #4338ca;">${counts.enrollments}</span>
            <span class="stat-label">Matrículas Registradas</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #059669;">
          <div class="stat-icon" style="background: #d1fae5; color: #047857;">🗂️</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #047857;">${counts.groups}</span>
            <span class="stat-label">Grupos Asignados</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #d97706;">
          <div class="stat-icon" style="background: #fef3c7; color: #b45309;">📚</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #b45309;">${counts.programs}</span>
            <span class="stat-label">Especialidades Técnicas</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #0284c7;">
          <div class="stat-icon" style="background: #e0f2fe; color: #0369a1;">📖</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #0369a1;">${counts.modules}</span>
            <span class="stat-label">Módulos Oficiales</span>
          </div>
        </div>
      `;

      shortcutsHtml = `
        <a class="shortcut-btn-card shortcut-btn--blue" href="#/estudiantes" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">👥</div>
            <span class="shortcut-btn-badge">${counts.students} Estudiantes</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Padrón General y Matrícula</strong>
            <p class="shortcut-btn-desc">Administración del padrón oficial, registro de nuevos postulantes, validación DNI y asignación de ficha de matrícula.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Gestionar Padrón <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--emerald" href="#/documentos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📑</div>
            <span class="shortcut-btn-badge">TMPL-01 / TMPL-02 / TMPL-03</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Nóminas Oficiales de Matrícula</strong>
            <p class="shortcut-btn-desc">Generación normativa de Nóminas de Matrícula oficial (30 por folio), carátulas y reportes para elevación a UGEL 03.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Generar Nóminas <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--purple" href="#/documentos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">🎓</div>
            <span class="shortcut-btn-badge">TMPL-20 (Libro/Folio)</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Certificación Modular Oficial</strong>
            <p class="shortcut-btn-desc">Expedición de Certificados Modulares oficiales con asignación de Libro y Folio institucional tras aprobación técnica.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Emitir Certificados <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--amber" href="#/grupos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">🗂️</div>
            <span class="shortcut-btn-badge">${counts.groups} Aulas / 3 Turnos</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Asignación y Distribución de Aulas</strong>
            <p class="shortcut-btn-desc">Organización de secciones por turno (Mañana, Tarde, Noche, Virtual) y distribución de aforos de los estudiantes.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Administrar Aulas <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--indigo" href="#/programas" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📚</div>
            <span class="shortcut-btn-badge">${counts.programs} Carreras</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Catálogo Curricular y Especialidades</strong>
            <p class="shortcut-btn-desc">Estructura curricular aprobada, módulos formativos vigentes y planes de estudio técnico-productivos oficiales.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Consultar Malla <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--teal" href="#/respaldo" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">💾</div>
            <span class="shortcut-btn-badge">Respaldo Local JSON</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Copia de Respaldo y Custodia</strong>
            <p class="shortcut-btn-desc">Generación y descarga de archivo de respaldo de la base de datos institucional para custodia administrativa local.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Exportar Respaldo <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>
      `;

      // Generación del Tablero de Estado de Nóminas y Matrícula para Secretaría
      const allGroupsSec = TeacherContextService.getGroupCatalog();
      const secRows = allGroupsSec.map(g => {
        const turnoBadge = g.turno && g.turno !== 'PENDIENTE'
          ? `<span class="badge badge-info" style="font-size:0.72rem;">${escapeHtml(g.turno)}</span>`
          : (g.modalidad && g.modalidad !== 'PENDIENTE'
            ? `<span class="badge badge-purple" style="font-size:0.72rem; background:#ede9fe; color:#6d28d9;">${escapeHtml(g.modalidad)}</span>`
            : `<span class="badge badge-secondary" style="font-size:0.72rem;">Regular</span>`);

        return `
          <tr>
            <td style="padding:0.65rem 0.75rem;"><code style="background:#eff6ff; padding:0.15rem 0.45rem; border-radius:4px; font-weight:700; color:#1d4ed8;">${escapeHtml(g.grupoCode)}</code></td>
            <td style="padding:0.65rem 0.75rem;">
              <strong style="color:#0f172a;">${escapeHtml(g.programaNombre)}</strong>
              <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(g.profesor || 'Docente Asignado')}</div>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:center;">${turnoBadge}</td>
            <td style="padding:0.65rem 0.75rem; text-align:center;">
              <strong style="color:#1d4ed8; font-size:0.92rem;">${g.count || 0}</strong>
              <span style="font-size:0.75rem; color:#64748b;"> alumnos</span>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:center;">
              <span class="badge badge-success" style="font-size:0.72rem; padding:0.25rem 0.5rem;">LISTO PARA NÓMINA</span>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:right;">
              <a href="#/documentos" class="btn btn-sm btn-primary" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none; background:#2563eb;">Emitir TMPL-01 →</a>
            </td>
          </tr>
        `;
      }).join('');

      synopticMonitorHtml = `
        <div class="card margin-top">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
            <div>
              <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem; font-size:1.1rem;">
                <span>📋</span> Control Centralizado de Aulas y Nóminas de Matrícula
              </h3>
              <p style="margin:0.25rem 0 0 0; font-size:0.83rem; color:#64748b;">
                Monitoreo operativo de grupos activos para expedición de Nóminas Oficiales (TMPL-01..03) a elevar a la UGEL 03
              </p>
            </div>
            <span class="badge badge-primary" style="font-size:0.78rem; padding:0.35rem 0.75rem; font-weight:700; background:#2563eb; color:#ffffff;">
              12 Aulas Operativas · 295 Matrículas
            </span>
          </div>

          <div class="table-responsive" style="overflow-x:auto;">
            <table class="data-table" style="width:100%; font-size:0.86rem; border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                  <th style="padding:0.65rem 0.75rem;">Código Aula</th>
                  <th style="padding:0.65rem 0.75rem;">Especialidad / Docente</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Turno / Modalidad</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Matrículas</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Estado Documental</th>
                  <th style="padding:0.65rem 0.75rem; text-align:right;">Acción Rápida</th>
                </tr>
              </thead>
              <tbody>
                ${secRows}
              </tbody>
              <tfoot>
                <tr style="background:#f1f5f9; font-weight:700; border-top:2px solid #cbd5e1;">
                  <td colspan="2" style="padding:0.75rem;">TOTAL GENERAL EN SECRETARÍA</td>
                  <td style="padding:0.75rem; text-align:center;">12 Grupos Oficiales</td>
                  <td style="padding:0.75rem; text-align:center; color:#1d4ed8; font-size:0.95rem;">295 Matrículas (269 Alumnos)</td>
                  <td style="padding:0.75rem; text-align:center;"><span class="badge badge-success" style="font-size:0.72rem;">100% REGISTRADO</span></td>
                  <td style="padding:0.75rem; text-align:right;"><a href="#/documentos" class="btn btn-sm btn-secondary" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none;">Centro Documental →</a></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    } else if (role.id === 'DOCENTE') {
      const activeGroup = TeacherContextService.getActiveGroupInfo();
      const activeProg = TeacherContextService.getActiveProgram();
      const progGroups = TeacherContextService.getGroupsForProgram(activeProg.id);
      const totalCarreraAlumnos = progGroups.reduce((acc, g) => acc + (g.count || 0), 0);
      const moduleCount = (activeProg.modulos && activeProg.modulos.length) || 2;
      const studentCount = activeGroup.count || 0;

      roleTitle = `Aula Pedagógica — ${activeProg.nombre}`;
      roleSub = `${escapeHtml(institution.nombre)} · Docente: ${escapeHtml(role.userName)} · Aula: ${escapeHtml(activeGroup.grupoCode)} (${escapeHtml(activeGroup.turno && activeGroup.turno !== 'PENDIENTE' ? activeGroup.turno : (activeGroup.modalidad && activeGroup.modalidad !== 'PENDIENTE' ? activeGroup.modalidad : 'Presencial'))})`;

      const cleanInstName = (institution.nombre || 'Micaela Bastidas Puyucawa')
        .replace(/^CETPRO\s+P[úu]blico\s+/i, '')
        .replace(/^["“”']+|["“”']+$/g, '');
      const bannerInstTitle = `CETPRO Público "${cleanInstName}"`;

      contextBannerHtml = `
        <div class="card margin-bottom-sm" style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #7c3aed 100%); color: #ffffff; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 4px 14px rgba(76, 29, 149, 0.22); border: 1px solid #8b5cf6;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="max-width: 760px;">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; flex-wrap:wrap;">
                <span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.65rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;">
                  Área Pedagógica y Aula
                </span>
                <span style="background: #c084fc; color: #3b0764; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                  Gestión Modular de Clases
                </span>
                <span style="background: rgba(255,255,255,0.15); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
                  Periodo 2026-I
                </span>
              </div>
              <div style="font-size:1.35rem; font-weight:800; letter-spacing: -0.01em; line-height: 1.25; margin-bottom: 0.35rem;">
                ${escapeHtml(bannerInstTitle)}
              </div>
              <div style="font-size:0.86rem; opacity:0.95; line-height:1.4;">
                Especialidad: <strong>${escapeHtml(activeProg.nombre)}</strong> · Aula Activa: <strong>${escapeHtml(activeGroup.grupoCode)} (${escapeHtml(activeGroup.turno && activeGroup.turno !== 'PENDIENTE' ? 'Turno ' + activeGroup.turno : (activeGroup.modalidad && activeGroup.modalidad !== 'PENDIENTE' ? activeGroup.modalidad : 'Presencial'))})</strong> · Responsable: <strong>${escapeHtml(role.userName)}</strong>
              </div>
            </div>
            <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
              <a href="#/asistencia" class="btn btn-sm" style="background:#ffffff; color:#6d28d9; font-weight:700; border-radius:8px; padding:0.55rem 1.1rem; text-decoration:none; box-shadow:0 2px 6px rgba(0,0,0,0.12);">
                📝 Tomar Asistencia (TMPL-05..10)
              </a>
              <a href="#/evaluacion" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#ffffff; border:1px solid rgba(255,255,255,0.45); font-weight:600; border-radius:8px; padding:0.55rem 1rem; text-decoration:none;">
                📊 Registro de Notas (TMPL-11..17)
              </a>
              <button type="button" class="btn btn-sm" id="btn-inicio-switch-classroom" style="background:rgba(255,255,255,0.25); color:#ffffff; border:1px solid rgba(255,255,255,0.6); font-weight:700; border-radius:8px; padding:0.55rem 0.9rem; cursor:pointer;">
                🏫 Cambiar Aula
              </button>
            </div>
          </div>
        </div>
      `;

      metricsGridHtml = `
        <div class="stat-card" style="border-left: 4px solid #7c3aed;">
          <div class="stat-icon" style="background: #ede9fe; color: #7c3aed;">👥</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #6d28d9;">${studentCount}</span>
            <span class="stat-label">Alumnos en Aula (${escapeHtml(activeGroup.grupoCode)})</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #2563eb;">
          <div class="stat-icon" style="background: #dbeafe; color: #1d4ed8;">📋</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #1d4ed8;">${studentCount}</span>
            <span class="stat-label">Matrículas en su Nómina</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #059669;">
          <div class="stat-icon" style="background: #d1fae5; color: #047857;">🗂️</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #047857;">${progGroups.length}</span>
            <span class="stat-label">Aulas en Carrera (${totalCarreraAlumnos} al.)</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #d97706;">
          <div class="stat-icon" style="background: #fef3c7; color: #b45309;">📚</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #b45309;">${moduleCount}</span>
            <span class="stat-label">Módulos Oficiales</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #4f46e5;">
          <div class="stat-icon" style="background: #e0e7ff; color: #4338ca;">📖</div>
          <div class="stat-info">
            <span class="stat-value" style="color: #4338ca;">13</span>
            <span class="stat-label">Formatos (6 Asist. + 7 Eval.)</span>
          </div>
        </div>
      `;

      shortcutsHtml = `
        <a class="shortcut-btn-card shortcut-btn--blue" href="#/asistencia" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📝</div>
            <span class="shortcut-btn-badge">TMPL-05..10 (40 Sesiones)</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Control de Asistencia Modular</strong>
            <p class="shortcut-btn-desc">Registro diario de asistencias (sesiones 1 a 40), faltas y tardanzas de los estudiantes del aula asignada.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Registrar Asistencia <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--green" href="#/evaluacion" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📊</div>
            <span class="shortcut-btn-badge">TMPL-11..17 (5 Indicadores)</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Registro Auxiliar de Notas</strong>
            <p class="shortcut-btn-desc">Evaluación continua por capacidades terminales, indicadores de logro y promedios oficiales del período modular.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Evaluar Alumnos <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--amber" href="#/portada" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📁</div>
            <span class="shortcut-btn-badge">TMPL-04 Oficial</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Portada de Carpeta Docente</strong>
            <p class="shortcut-btn-desc">Generación formal de la carátula técnica y pedagógica oficial con membrete y datos de especialidad.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Generar Portada <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--purple" href="#/estudiantes" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">👥</div>
            <span class="shortcut-btn-badge">${studentCount} Alumnos Asignados</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Mis Alumnos Matriculados</strong>
            <p class="shortcut-btn-desc">Padrón de estudiantes del aula ${escapeHtml(activeGroup.grupoCode)}, fichas individuales y seguimiento pedagógico.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Ver Mis Alumnos <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--emerald" href="#/grupos" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">🗂️</div>
            <span class="shortcut-btn-badge">${progGroups.length} Aulas en Especialidad</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Mis Aulas Asignadas</strong>
            <p class="shortcut-btn-desc">Visualice y conmute entre los grupos y turnos correspondientes a ${escapeHtml(activeProg.nombre)}.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Gestionar Aulas <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>

        <a class="shortcut-btn-card shortcut-btn--indigo" href="#/programas" role="button">
          <div class="shortcut-btn-header">
            <div class="shortcut-btn-icon">📚</div>
            <span class="shortcut-btn-badge">${moduleCount} Módulos Oficiales</span>
          </div>
          <div class="shortcut-btn-content">
            <strong class="shortcut-btn-title">Malla Curricular Asignada</strong>
            <p class="shortcut-btn-desc">Estructura curricular oficial, unidades de competencia y horas lectivas de su especialidad técnica.</p>
          </div>
          <div class="shortcut-btn-footer">
            <span class="shortcut-btn-action">Ver Malla Oficial <span class="shortcut-btn-arrow">→</span></span>
          </div>
        </a>
      `;

      // Generación del Tablero de Control Pedagógico de Aulas para Docente
      const teacherRows = progGroups.map(g => {
        const isCurrentActive = g.grupoCode === activeGroup.grupoCode;
        const turnoBadge = g.turno && g.turno !== 'PENDIENTE'
          ? `<span class="badge badge-info" style="font-size:0.72rem;">${escapeHtml(g.turno)}</span>`
          : (g.modalidad && g.modalidad !== 'PENDIENTE'
            ? `<span class="badge badge-purple" style="font-size:0.72rem; background:#ede9fe; color:#6d28d9;">${escapeHtml(g.modalidad)}</span>`
            : `<span class="badge badge-secondary" style="font-size:0.72rem;">Regular</span>`);

        const statusBadge = isCurrentActive
          ? `<span class="badge badge-success" style="font-size:0.72rem; padding:0.25rem 0.55rem; background:#10b981; color:#fff;">✓ AULA ACTIVA ACTUAL</span>`
          : `<span class="badge badge-secondary" style="font-size:0.72rem; padding:0.25rem 0.5rem;">DISPONIBLE</span>`;

        const actionButtons = isCurrentActive
          ? `<div style="display:flex; gap:0.35rem; justify-content:flex-end;">
               <a href="#/asistencia" class="btn btn-sm btn-primary" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none; background:#7c3aed; border-color:#7c3aed;">📝 Asistencia →</a>
               <a href="#/evaluacion" class="btn btn-sm btn-success" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none; background:#059669; border-color:#059669;">📊 Notas →</a>
             </div>`
          : `<div style="display:flex; justify-content:flex-end;">
               <button type="button" class="btn btn-sm btn-outline-primary btn-teacher-switch-group" data-group-code="${escapeHtml(g.grupoCode)}" style="font-size:0.76rem; padding:0.25rem 0.6rem;">🏫 Activar Aula</button>
             </div>`;

        return `
          <tr style="${isCurrentActive ? 'background:#faf5ff;' : ''}">
            <td style="padding:0.65rem 0.75rem;">
              <code style="background:${isCurrentActive ? '#ede9fe' : '#f1f5f9'}; padding:0.15rem 0.45rem; border-radius:4px; font-weight:700; color:${isCurrentActive ? '#6d28d9' : '#334155'};">
                ${escapeHtml(g.grupoCode)}
              </code>
            </td>
            <td style="padding:0.65rem 0.75rem;">
              <strong style="color:#0f172a;">${escapeHtml(g.programaNombre)}</strong>
              <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(g.profesor || role.userName)}</div>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:center;">${turnoBadge}</td>
            <td style="padding:0.65rem 0.75rem; text-align:center;">
              <strong style="color:#6d28d9; font-size:0.92rem;">${g.count || 0}</strong>
              <span style="font-size:0.75rem; color:#64748b;"> estudiantes</span>
            </td>
            <td style="padding:0.65rem 0.75rem; text-align:center;">${statusBadge}</td>
            <td style="padding:0.65rem 0.75rem; text-align:right;">${actionButtons}</td>
          </tr>
        `;
      }).join('');

      synopticMonitorHtml = `
        <div class="card margin-top">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
            <div>
              <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem; font-size:1.1rem;">
                <span>🏫</span> Control Pedagógico de Aulas — Especialidad: ${escapeHtml(activeProg.nombre)}
              </h3>
              <p style="margin:0.25rem 0 0 0; font-size:0.83rem; color:#64748b;">
                Monitoreo de grupos activos asignados a su especialidad con accesos directos al Control de Asistencia diaria y Registro Auxiliar
              </p>
            </div>
            <span class="badge badge-purple" style="font-size:0.78rem; padding:0.35rem 0.75rem; font-weight:700; background:#ede9fe; color:#6d28d9; border:1px solid #d8b4fe;">
              ${progGroups.length} Aulas · ${totalCarreraAlumnos} Estudiantes en Especialidad
            </span>
          </div>

          <div class="table-responsive" style="overflow-x:auto;">
            <table class="data-table" style="width:100%; font-size:0.86rem; border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                  <th style="padding:0.65rem 0.75rem;">Código Aula</th>
                  <th style="padding:0.65rem 0.75rem;">Especialidad / Docente</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Turno / Modalidad</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Matrículas</th>
                  <th style="padding:0.65rem 0.75rem; text-align:center;">Estado Pedagógico</th>
                  <th style="padding:0.65rem 0.75rem; text-align:right;">Acciones de Aula</th>
                </tr>
              </thead>
              <tbody>
                ${teacherRows}
              </tbody>
              <tfoot>
                <tr style="background:#f1f5f9; font-weight:700; border-top:2px solid #cbd5e1;">
                  <td colspan="2" style="padding:0.75rem;">TOTAL ESPECIALIDAD DOCENTE</td>
                  <td style="padding:0.75rem; text-align:center;">${progGroups.length} Aulas Asignadas</td>
                  <td style="padding:0.75rem; text-align:center; color:#6d28d9; font-size:0.95rem;">${totalCarreraAlumnos} Alumnos en Carrera</td>
                  <td style="padding:0.75rem; text-align:center;"><span class="badge badge-success" style="font-size:0.72rem;">100% OPERATIVO</span></td>
                  <td style="padding:0.75rem; text-align:right;"><a href="#/grupos" class="btn btn-sm btn-secondary" style="font-size:0.76rem; padding:0.25rem 0.6rem; text-decoration:none;">Mis Aulas →</a></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>${escapeHtml(roleTitle)}</h2>
          <p class="subtitle">${roleSub}</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="user-role-badge role-badge-${role.id}">${escapeHtml(role.title)}</span>
          <span class="badge badge-success">OPERACIÓN LOCAL</span>
        </div>
      </section>
      ${contextBannerHtml}
      <div class="grid mvp-metric-grid">
        ${metricsGridHtml}
      </div>
      <div class="card margin-top">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom: 0.5rem;">
          <h3 style="margin:0;">Accesos rápidos (${escapeHtml(role.title)})</h3>
          <span style="font-size:0.82rem; color:#64748b;">${role.id === 'DIRECTOR' ? 'Operaciones ejecutivas y refrendo institucional' : (role.id === 'DOCENTE' ? 'Módulos de trabajo pedagógico y aula' : 'Módulos de registro y secretaría')}</span>
        </div>
        <div class="mvp-shortcuts-grid">
          ${shortcutsHtml}
        </div>
      </div>
      ${synopticMonitorHtml}
      <div class="card margin-top">
        <h3>Estado y Atribuciones del Rol</h3>
        <p>${escapeHtml(role.description)}</p>
        <p class="mvp-context-note">
          <strong>Atribuciones activas:</strong> ${
            role.id === 'DIRECTOR'
              ? 'Control total, refrendo de Título Técnico Oficial (TMPL-21), Actas Modulares, Certificados, Mallas y Respaldo.'
              : role.id === 'SECRETARIA'
                ? 'Padrón de estudiantes, matrículas, nóminas oficiales (TMPL-01..03), consolidado EFSRT y Certificados Modulares (TMPL-20).'
                : 'Control de asistencia modular diaria (TMPL-05..10), registro auxiliar de notas (TMPL-11..17) y portadas pedagógicas.'
          }
        </p>
      </div>`;

    const switchClassBtn = container.querySelector('#btn-inicio-switch-classroom');
    if (switchClassBtn) {
      switchClassBtn.onclick = () => this.openClassroomSwitcherModal();
    }

    container.querySelectorAll('.btn-teacher-switch-group').forEach(btn => {
      btn.onclick = (e) => {
        const code = btn.getAttribute('data-group-code');
        TeacherContextService.setActiveGroupCode(code);
        Notifications.success(`Aula activa cambiada a: ${code}`);
        this.renderInicioView(container);
      };
    });
  },

  async renderProgramasView(container) {
    const role = AuthService.getCurrentRole();
    let programs = await CatalogService.listPrograms();
    const modules = await CatalogService.listModules();

    const modulesByProgram = {};
    modules.forEach(m => {
      if (!modulesByProgram[m.programaId]) {
        modulesByProgram[m.programaId] = [];
      }
      modulesByProgram[m.programaId].push(m);
    });

    if (role.id === 'DOCENTE') {
      const activeProgId = TeacherContextService.getActiveProgramId();
      programs = programs.filter(p => p.id === activeProgId);
    }

    const isDocente = role.id === 'DOCENTE';
    const currentProg = programs[0];

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>${isDocente ? `Malla Curricular Asignada — ${escapeHtml(currentProg?.nombre || 'Especialidad')}` : 'Programas y Módulos Curriculares'}</h2>
          <p class="subtitle">${isDocente ? 'Programa formativo oficial y módulos curriculares de su especialidad técnica' : 'Estructura Oficial Confirmada por CARRERAS.jpeg'}</p>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          ${isDocente ? '<span class="user-role-badge role-badge-DOCENTE">DOCENTE DE ESPECIALIDAD</span>' : ''}
          <span class="badge badge-success">${programs.length} ${programs.length === 1 ? 'Especialidad Asignada' : 'Programas'}</span>
          <span class="badge badge-info">${isDocente ? (modulesByProgram[currentProg?.id]?.length || 2) : modules.length} Módulos</span>
        </div>
      </section>

      <div class="card margin-bottom-sm">
        <div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
          <input type="text" id="search-program" class="form-input" placeholder="🔍 Buscar por programa o módulo..." style="flex:1; min-width:260px; padding:0.6rem 1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
          <a href="#/grupos" class="btn btn-secondary">${isDocente ? 'Mis grupos asignados →' : 'Asignación de grupos →'}</a>
        </div>
      </div>

      <div id="programs-container" class="grid" style="grid-template-columns:1fr; gap:1rem;">
        ${this.generateProgramsListHtml(programs, modulesByProgram)}
      </div>
    `;

    const searchInput = document.getElementById('search-program');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = programs.filter(p => {
          const nameMatch = p.nombre.toLowerCase().includes(query) || p.codigo.toLowerCase().includes(query);
          const pMods = modulesByProgram[p.id] || [];
          const modMatch = pMods.some(m => m.nombreOficial.toLowerCase().includes(query));
          return nameMatch || modMatch;
        });

        const pContainer = document.getElementById('programs-container');
        if (pContainer) {
          pContainer.innerHTML = this.generateProgramsListHtml(filtered, modulesByProgram);
        }
      };
    }
  },

  generateProgramsListHtml(programs, modulesByProgram) {
    if (programs.length === 0) {
      return `
        <div class="card">
          <div class="empty-state">
            <p>No se encontraron programas curriculares coincidentes.</p>
          </div>
        </div>
      `;
    }

    return programs.map(p => {
      const pMods = (modulesByProgram[p.id] || []).sort((a, b) => a.numeroModulo - b.numeroModulo);
      return `
        <div class="card" style="border-left: 4px solid var(--primary-color);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <span class="badge badge-secondary" style="margin-bottom:0.25rem; display:inline-block;">${p.codigo}</span>
              <h3 style="font-size:1.15rem; color:var(--neutral-dark); margin:0.2rem 0;">${p.nombre}</h3>
              <p class="subtitle" style="font-size:0.82rem;">Fuente: <code>${p.fuente}</code></p>
            </div>
            <span class="status-badge status-online"><span class="dot"></span> ${p.estado}</span>
          </div>

          <div style="margin-top:1rem; background-color:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:1rem;">
            <h4 style="font-size:0.88rem; text-transform:uppercase; color:var(--neutral-muted); margin-bottom:0.6rem;">Módulos Curriculares Oficiales (${pMods.length})</h4>
            <div style="display:flex; flex-direction:column; gap:0.6rem;">
              ${pMods.map(m => `
                <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                  <div>
                    <span class="badge badge-info" style="margin-right:0.5rem;">MÓDULO ${m.numeroModulo}</span>
                    <strong style="font-size:0.92rem; color:var(--neutral-dark);">${m.nombreOficial}</strong>
                  </div>
                  <span class="badge badge-secondary">${m.id}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async renderConfiguracionView(container) {
    const inst = await InstitutionService.getInstitutionProfile();
    const periods = await PeriodService.listPeriods();
    const systemSummary = await ConfigService.getSystemSummary();
    const readiness = await academicReadinessService.getAcademicReadinessSummary();
    const recoveryEval = await recoveryService.evaluatePreconditions();
    const renderInstitutionInput = ([field, label]) => {
      const id = `inst-${field}`;
      const value = escapeHtml(inst[field] || '');
      const required = field === 'nombre' ? ' required' : '';
      const input = field === 'denominacionVisible'
        ? `<textarea id="${id}" class="form-control" rows="2" style="width:100%;"${required}>${value}</textarea>`
        : `<input type="text" id="${id}" class="form-control" value="${value}" style="width:100%;"${required}>`;
      return `<div><label for="${id}" style="font-weight:600; font-size:0.85rem;">${label}</label>${input}</div>`;
    };
    const renderPendingInstitutionInput = ([field, label]) => {
      const input = renderInstitutionInput([field, label]);
      const provenance = getInstitutionFieldProvenance(inst, field);
      return `${input.slice(0, -6)}<div id="inst-source-status-${field}" data-state="${provenance.code}" style="margin-top:0.3rem; font-size:0.72rem; font-weight:700;">${provenance.label}</div></div>`;
    };
    const confirmedInputs = INSTITUTION_FORM_FIELDS
      .filter(([field]) => !PENDING_INSTITUTION_FIELDS.includes(field)).map(renderInstitutionInput).join('');
    const pendingInputs = INSTITUTION_FORM_FIELDS
      .filter(([field]) => PENDING_INSTITUTION_FIELDS.includes(field)).map(renderPendingInstitutionInput).join('');

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>Configuración del Sistema y Prerrequisitos Académicos</h2>
          <p class="subtitle">Parámetros Institucionales, Periodos, Carga de Unidades y Diagnóstico</p>
        </div>
        <span class="module-tag">M05.3 — Configuración Académica</span>
      </section>

      <!-- Panel de Diagnóstico de Prerrequisitos Académicos -->
      <div class="card margin-bottom-sm" style="border-left: 4px solid #d97706;">
        <h3>⚙️ Dashboard de Prerrequisitos Académicos Pendientes</h3>
        <p class="subtitle margin-top-sm">Estado de completitud curricular diferido para habilitación de Asistencia (M06) y Evaluación (M07).</p>

        <div class="grid grid-3 margin-top-sm" style="gap:1rem;">
          <div style="background:#fffbeb; padding:0.85rem; border:1px solid #fef3c7; border-radius:var(--radius-sm);">
            <strong>PERIODO ACADÉMICO:</strong><br>
            <span style="color:#92400e; font-weight:bold;">${readiness.periodosCount === 0 ? 'PENDIENTE (0 / 1 Activos)' : 'CONFIGURADO'}</span>
          </div>

          <div style="background:#fffbeb; padding:0.85rem; border:1px solid #fef3c7; border-radius:var(--radius-sm);">
            <strong>MÓDULO POR GRUPO TÉCNICO:</strong><br>
            <span style="color:#92400e; font-weight:bold;">${readiness.groupsPending} / ${readiness.totalGroups} GRUPOS PENDIENTES</span>
          </div>

          <div style="background:#fffbeb; padding:0.85rem; border:1px solid #fef3c7; border-radius:var(--radius-sm);">
            <strong>UNIDADES DIDÁCTICAS:</strong><br>
            <span style="color:#92400e; font-weight:bold;">${readiness.totalUnits} UNIDADES (0 / 14 Módulos)</span>
          </div>
        </div>

        <div style="margin-top:1rem; background:#f8fafc; padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
          <h4 style="font-size:0.9rem; color:var(--neutral-dark); margin-bottom:0.5rem;">📋 Flujo Guiado de Configuración Académica para Secretaría</h4>
          <ol style="margin-left:1.2rem; font-size:0.85rem; color:var(--neutral-muted); line-height:1.5;">
            <li><strong>PASO 1:</strong> Crear el periodo académico cuando la jefatura confirme las fechas oficiales.</li>
            <li><strong>PASO 2:</strong> Asignar explícitamente Módulo I o Módulo II a cada Grupo Técnico en <code>#/matriculas</code>.</li>
            <li><strong>PASO 3:</strong> Validar y cargar la estructura de Unidades Didácticas oficiales del módulo.</li>
            <li><strong>PASO 4:</strong> Validar horas, créditos, capacidades e indicadores de logro.</li>
            <li><strong>PASO 5:</strong> Habilitar automáticamente Asistencia (M06) y Evaluación (M07) para las matrículas del grupo.</li>
          </ol>
        </div>
      </div>

      <!-- 1. Datos Institucionales -->
      <div class="card margin-bottom-sm">
        <h3>DATOS INSTITUCIONALES</h3>
        <p class="subtitle margin-top-sm">Perfil vigente de la institución. Los datos sin fuente oficial pueden permanecer vacíos.</p>
        
        <form id="form-institution" class="margin-top">
          <div class="grid grid-3">${confirmedInputs}</div>
          <h4 style="margin-top:1.2rem; font-size:0.95rem; color:var(--neutral-dark);">Campos administrativos y procedencia</h4>
          <p class="subtitle margin-top-sm">El estado existente se conserva. La casilla se aplica únicamente a cambios nuevos en estos campos.</p>
          <div class="grid grid-3 margin-top-sm">${pendingInputs}</div>
          <label class="margin-top-sm" style="display:flex; align-items:flex-start; gap:0.5rem; font-size:0.85rem;">
            <input type="checkbox" id="inst-confirm-source">
            Confirmo que únicamente los cambios nuevos ingresados provienen de una fuente oficial.
          </label>
          <button type="button" id="btn-save-institution" class="btn btn-primary margin-top">Guardar cambios</button>
          <div id="institution-save-status" class="margin-top-sm" role="status" aria-live="polite"></div>
        </form>
      </div>

      <!-- 2. Periodos Académicos -->
      <div class="card margin-top margin-bottom-sm">
        <h3>2. Administración de Periodos Académicos</h3>
        <p class="subtitle margin-top-sm">Registre y gestione los periodos lectivos (ej: 2026-I, 2026-II) validando rangos de fecha.</p>

        <form id="form-period" class="margin-top" style="background:#f8fafc; padding:1.25rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
          <div class="grid grid-3">
            <div>
              <label style="font-weight:600; font-size:0.85rem;">Denominación del Periodo *</label>
              <input type="text" id="per-nombre" placeholder="Ej: 2026-I (Oficial)" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.85rem;">Año Lectivo *</label>
              <input type="number" id="per-anio" placeholder="Ej: 2026" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.85rem;">Estado Inicial</label>
              <select id="per-estado" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.85rem;">Fecha Inicio *</label>
              <input type="date" id="per-fechaInicio" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>
            <div>
              <label style="font-weight:600; font-size:0.85rem;">Fecha Fin *</label>
              <input type="date" id="per-fechaFin" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>
          </div>
          <button type="button" id="btn-create-period" class="btn btn-primary margin-top-sm"
            ${CONFIG.IS_V2_CANDIDATE ? 'disabled title="Bloqueado en candidata hasta aprobación del gate de activación"' : ''}>
            ${CONFIG.IS_V2_CANDIDATE ? 'Bloqueado en candidata — no crear periodo' : 'Crear Periodo Académico'}
          </button>
        </form>

        <div class="margin-top">
          <h4 style="font-size:0.95rem; color:var(--neutral-dark);">Periodos Académicos Registrados (${periods.length})</h4>
          ${this.generatePeriodsTableHtml(periods)}
        </div>
      </div>

      <!-- 3. Formulario de Carga Futura y Validación de Unidades Didácticas -->
      <div class="card margin-top margin-bottom-sm">
        <h3>3. Preparación y Validación de Unidades Didácticas (Mallas Curriculares)</h3>
        <p class="subtitle margin-top-sm">Formulario de validación contractual para la carga oficial posterior de unidades didácticas por módulo.</p>

        <form id="form-unit-validation" class="margin-top" style="background:#f8fafc; padding:1.25rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
          <div class="grid grid-2">
            <div>
              <label style="font-weight:600; font-size:0.85rem;">Programa de Estudio *</label>
              <select id="unit-prog-id" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
                <option value="">Seleccione programa...</option>
                ${OFFICIAL_CATALOG_SEED.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="font-weight:600; font-size:0.85rem;">Módulo Curricular *</label>
              <select id="unit-mod-id" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
                <option value="">Seleccione programa primero...</option>
              </select>
            </div>

            <div>
              <label style="font-weight:600; font-size:0.85rem;">Número de Unidad *</label>
              <input type="number" id="unit-number" min="1" max="20" placeholder="Ej: 1" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>

            <div>
              <label style="font-weight:600; font-size:0.85rem;">Nombre de Unidad Didáctica *</label>
              <input type="text" id="unit-name" placeholder="Ej: Mantenimiento Preventivo del Sistema de Frenos" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>

            <div>
              <label style="font-weight:600; font-size:0.85rem;">Horas Lectivas *</label>
              <input type="number" id="unit-hours" min="1" placeholder="Ej: 120" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>

            <div>
              <label style="font-weight:600; font-size:0.85rem;">Créditos Académicos *</label>
              <input type="number" id="unit-credits" step="0.5" min="0.5" placeholder="Ej: 6" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);" required>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.25rem;">
            <button type="submit" class="btn btn-secondary">Validar y Previsualizar Contrato UD</button>
          </div>
        </form>

        <div id="unit-preview-box" style="display:none; margin-top:1rem; background:#0f172a; color:#38bdf8; padding:1rem; border-radius:var(--radius-sm); font-family:monospace; font-size:0.8rem; overflow-x:auto;">
        </div>
      </div>

      <!-- 4. Diagnóstico del Sistema -->
      <div class="card margin-top">
        <h3>4. Diagnóstico e Información del Entorno Local</h3>
        <table class="table-info margin-top-sm">
          <tr><th>Nombre de Aplicación</th><td>${systemSummary.appName}</td></tr>
          <tr><th>Versión Activa</th><td>${systemSummary.appVersion}</td></tr>
          <tr><th>Base de Datos Local</th><td>${systemSummary.dbName} (v${systemSummary.dbVersion})</td></tr>
          <tr><th>Estado IndexedDB</th><td><span class="status-badge status-online"><span class="dot"></span> ${systemSummary.isConnected ? 'Conectado' : 'Desconectado'}</span></td></tr>
          <tr><th>Modo de Operación</th><td><strong>${systemSummary.mode}</strong></td></tr>
          <tr><th>Fecha/Hora Local</th><td>${systemSummary.localTime}</td></tr>
          <tr><th>Programas Registrados</th><td><strong>${systemSummary.programsCount}</strong> Programas (CARRERAS.jpeg)</td></tr>
          <tr><th>Módulos Registrados</th><td><strong>${systemSummary.modulesCount}</strong> Módulos Curriculares</td></tr>
          <tr><th>Periodos Activos</th><td><strong>${systemSummary.activePeriodsCount}</strong> Periodos Lectivos</td></tr>
          <tr><th>Unidades Didácticas</th><td><strong>${systemSummary.unitsCount}</strong> (Inviolable B-002: Permanecen Vacías)</td></tr>
        </table>
      </div>

      ${CONFIG.IS_V2_CANDIDATE ? `<div class="card margin-top">Recuperación productiva no disponible en ${CONFIG.DB.NAME}; base candidata aislada.</div>` : `<!-- 5. Recuperación Controlada desde Staging (RECOVERY-01) -->
      <div class="card margin-top" style="border-left: 4px solid #0284c7;">
        <h3>5. Recuperación Controlada de Datos Productivos desde Staging (RECOVERY-01)</h3>
        <p class="subtitle margin-top-sm">Herramienta administrativa para hidratar la base de datos de producción desde las 295 filas de staging en un navegador nuevo (ej: Edge).</p>

        <div class="grid grid-3 margin-top-sm" style="gap:1rem;">
          <div style="background:#f0f9ff; padding:0.85rem; border:1px solid #bae6fd; border-radius:var(--radius-sm);">
            <strong>REGISTROS STAGING:</strong><br>
            <span style="color:#0369a1; font-weight:bold; font-size:1.1rem;">${recoveryEval.counts.staging} Registros</span>
          </div>

          <div style="background:#f0f9ff; padding:0.85rem; border:1px solid #bae6fd; border-radius:var(--radius-sm);">
            <strong>ESTUDIANTES ACTUALES:</strong><br>
            <span style="color:${recoveryEval.counts.estudiantes === 0 ? '#d97706' : '#15803d'}; font-weight:bold; font-size:1.1rem;">${recoveryEval.counts.estudiantes} Estudiantes</span>
          </div>

          <div style="background:#f0f9ff; padding:0.85rem; border:1px solid #bae6fd; border-radius:var(--radius-sm);">
            <strong>MATRÍCULAS ACTUALES:</strong><br>
            <span style="color:${recoveryEval.counts.matriculas === 0 ? '#d97706' : '#15803d'}; font-weight:bold; font-size:1.1rem;">${recoveryEval.counts.matriculas} Matrículas</span>
          </div>
        </div>

        <div style="background:#e0f2fe; border:1px solid #7dd3fc; border-radius:var(--radius-sm); padding:0.75rem; margin-top:0.75rem; font-size:0.85rem; color:#0369a1;">
          <strong>DIAGNÓSTICO DE ENTORNO FÍSICO DEL NAVEGADOR:</strong><br>
          • <code>Origin</code>: <span>${typeof window !== 'undefined' ? window.location.origin : 'N/A'}</span><br>
          • <code>dbName</code>: <span>${recoveryEval.counts.dbName}</span><br>
          • <code>staging_importaciones</code>: <span>${recoveryEval.counts.staging} filas</span> | <code>estudiantes</code>: <span>${recoveryEval.counts.estudiantes}</span> | <code>matriculas</code>: <span>${recoveryEval.counts.matriculas}</span>
        </div>

        <div class="margin-top" style="background:#f8fafc; padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
              <h4 style="font-size:0.95rem; color:var(--neutral-dark); margin:0;">Estado de Aptitud de Recuperación</h4>
              <p class="small text-muted margin-top-xs" style="margin-bottom:0;">${recoveryEval.reason}</p>
            </div>
            <div>
              ${recoveryEval.canRecover ? `
                <button type="button" id="btn-execute-recovery-01" class="btn btn-warning fw-bold" style="background:#f59e0b; color:#ffffff; border:none; padding:0.6rem 1.2rem;">
                  ⚡ Recuperar Datos Productivos (269 Est / 295 Mat)
                </button>
              ` : `
                <span class="badge ${recoveryEval.counts.estudiantes > 0 ? 'badge-success' : 'badge-secondary'}" style="padding:0.6rem 1rem;">
                  ${recoveryEval.counts.estudiantes > 0 ? '✓ BASE PRODUCTIVA YA COMPLETA' : '🔒 RECURSO BLOQUEADO'}
                </span>
              `}
            </div>
          </div>
        </div>
      </div>`}
    `;

    const updatePendingProvenance = field => {
      const input = document.getElementById(`inst-${field}`);
      const status = document.getElementById(`inst-source-status-${field}`);
      if (!input || !status) return;
      const provenance = getInstitutionFieldProvenance(inst, field, input.value);
      status.textContent = provenance.label;
      status.dataset.state = provenance.code;
    };
    for (const field of PENDING_INSTITUTION_FIELDS) {
      document.getElementById(`inst-${field}`)?.addEventListener('input', () => updatePendingProvenance(field));
    }

    // Bind Event Listeners
    const btnExecuteRecovery = document.getElementById('btn-execute-recovery-01');
    if (btnExecuteRecovery) {
      btnExecuteRecovery.onclick = async () => {
        const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const dbStatus = StorageService.getStatus();

        if (dbStatus.dbName !== 'CETPRO_DB' || recoveryEval.counts.staging !== 295 || recoveryEval.counts.estudiantes !== 0 || recoveryEval.counts.matriculas !== 0) {
          alert(`ABORTADO: Las precondiciones físicas no se cumplen.\nOrigin: ${runtimeOrigin}\nDB: ${dbStatus.dbName}\nStaging: ${recoveryEval.counts.staging} (Req: 295)\nEstudiantes: ${recoveryEval.counts.estudiantes} (Req: 0)\nMatrículas: ${recoveryEval.counts.matriculas} (Req: 0)`);
          return;
        }

        const confirmed = window.confirm(
          'DIAGNÓSTICO ENTORNO Y CONFIRMACIÓN DE RECUPERACIÓN (RECOVERY-01.4):\n\n' +
          `• Origin: ${runtimeOrigin}\n` +
          `• Base de Datos: ${dbStatus.dbName} (v${dbStatus.version})\n` +
          `• Staging en IDB: ${recoveryEval.counts.staging} (requerido: 295)\n` +
          `• Estudiantes en IDB: ${recoveryEval.counts.estudiantes} (requerido: 0)\n` +
          `• Matrículas en IDB: ${recoveryEval.counts.matriculas} (requerido: 0)\n\n` +
          'Se creará el respaldo inmutable BACKUP_PRE_RECOVERY_FROM_STAGING, se ejecutará la transacción readwrite física y la verificación post-commit readback:\n' +
          '- 269 Estudiantes Productivos\n' +
          '- 295 Matrículas Productivas (con moduloId=null y periodoId=null)\n\n' +
          '¿Desea ejecutar la escritura física en IndexedDB ahora?'
        );
        if (!confirmed) return;

        btnExecuteRecovery.disabled = true;
        btnExecuteRecovery.textContent = 'Ejecutando Escritura y Verificación Post-Commit...';

        try {
          const res = await recoveryService.executeRecovery({ operator: 'SECRETARIA_EDGE_USER' });
          Notifications.success(`Recuperación exitosa: ${res.estudiantesCreados} estudiantes y ${res.matriculasCreadas} matrículas verificadas post-commit en CETPRO_DB.`);
          await this.renderConfiguracionView(container);
        } catch (err) {
          btnExecuteRecovery.disabled = false;
          btnExecuteRecovery.textContent = '⚡ Recuperar Datos Productivos (269 Est / 295 Mat)';
          const handled = ErrorService.handleError(err, 'StagingRecovery');
          Notifications.error(`FALLO EN RECUPERACIÓN: ${handled.userMessage}`);
        }
      };
    }

    // Bind Event Listeners
    const unitProgSelect = document.getElementById('unit-prog-id');
    const unitModSelect = document.getElementById('unit-mod-id');

    if (unitProgSelect) {
      unitProgSelect.onchange = () => {
        const pId = unitProgSelect.value;
        const progSeed = OFFICIAL_CATALOG_SEED.find(p => p.id === pId);
        if (progSeed) {
        unitModSelect.innerHTML = '<option value="">Seleccione módulo...</option>' +
          progSeed.modulos.map(m => '<option value="' + String(m.id) + '">' + String(m.id) + ': ' + String(m.nombre) + '</option>').join('');
        } else {
        unitModSelect.innerHTML = '<option value="">Seleccione programa primero...</option>';
        }
      };
    }

    const unitForm = document.getElementById('form-unit-validation');
    if (unitForm) {
      unitForm.onsubmit = (e) => {
        e.preventDefault();
        try {
          const progId = unitProgSelect.value;
          const modId = unitModSelect.value;
          const num = parseInt(document.getElementById('unit-number').value, 10);
          const name = document.getElementById('unit-name').value.trim();
          const hours = parseInt(document.getElementById('unit-hours').value, 10);
          const credits = parseFloat(document.getElementById('unit-credits').value);

          if (!progId || !modId) throw new ValidationError('Debe seleccionar programa y módulo.');
          if (isNaN(num) || num <= 0) throw new ValidationError('Número de unidad inválido.');
          if (!name) throw new ValidationError('El nombre de la unidad didáctica es obligatorio.');
          if (isNaN(hours) || hours <= 0) throw new ValidationError('Las horas lectivas deben ser un número positivo.');
          if (isNaN(credits) || credits <= 0) throw new ValidationError('Los créditos deben ser un número positivo.');

          const recordPreview = {
            id: `UNID-${modId}-${String(num).padStart(2, '0')}`,
            moduloId: modId,
            programaId: progId,
            numeroUnidad: num,
            nombre: name,
            horas: hours,
            creditos: credits,
            estado: 'PREPARADA_VALIDADA',
            observacion: 'Objeto de unidad didáctica validado según contrato DATA_CONTRACTS.md. Almacenamiento productivo postergado (B-002).'
          };

          const previewBox = document.getElementById('unit-preview-box');
          previewBox.style.display = 'block';
          previewBox.textContent = `// CONTRATO DE UNIDAD DIDÁCTICA VALIDADO EXITOSAMENTE (MODO PREVISUALIZACIÓN):\n` + JSON.stringify(recordPreview, null, 2);

          Notifications.success('Contrato de Unidad Didáctica validado con éxito');
        } catch (err) {
          const handled = ErrorService.handleError(err, 'UnitValidation');
          Notifications.error(handled.userMessage);
        }
      };
    }

    const btnSaveInst = document.getElementById('btn-save-institution');
    if (btnSaveInst) {
      btnSaveInst.onclick = async () => {
        const status = document.getElementById('institution-save-status');
        btnSaveInst.disabled = true;
        try {
          const form = document.getElementById('form-institution');
          if (!form) throw new Error('No se encontró el formulario institucional.');
          const updated = {};
          for (const [field] of INSTITUTION_FORM_FIELDS) {
            const input = form.querySelector(`#inst-${field}`);
            if (!input) throw new Error(`No se encontró el campo institucional ${field}.`);
            updated[field] = input.value.trim();
          }
          if (!updated.nombre) {
            const error = new Error('El nombre de la institución es obligatorio.');
            error.name = 'EXPECTED_VALIDATION';
            throw error;
          }
          const pendingChanges = PENDING_INSTITUTION_FIELDS.filter(
            field => updated[field] && updated[field] !== String(inst[field] || '').trim()
          );
          if (pendingChanges.length && !document.getElementById('inst-confirm-source')?.checked) {
            const error = new Error('Confirme que los campos pendientes provienen de una fuente oficial.');
            error.name = 'EXPECTED_VALIDATION';
            throw error;
          }
          await InstitutionService.updateInstitution(updated, 'SECRETARIA_LOCAL', {
            confirmPendingSources: pendingChanges
          });
          const saved = await InstitutionService.getInstitutionProfile();
          if (INSTITUTION_FORM_FIELDS.some(([field]) => saved[field] !== updated[field])) {
            throw new Error('La comprobación posterior al guardado institucional no coincide.');
          }
          if (saved.sourceMigrationVersion !== inst.sourceMigrationVersion || saved.fuente !== inst.fuente) {
            throw new Error('Se alteró la procedencia del registro institucional.');
          }
          Object.assign(inst, saved);
          for (const field of PENDING_INSTITUTION_FIELDS) updatePendingProvenance(field);
          const sourceConfirmation = document.getElementById('inst-confirm-source');
          if (sourceConfirmation) sourceConfirmation.checked = false;
          if (status) {
            status.className = 'alert alert-success';
            status.textContent = 'Datos institucionales actualizados.';
          }
          Notifications.success('Datos institucionales actualizados.');
        } catch (err) {
          if (err.name !== 'EXPECTED_VALIDATION') console.error('[Layout] Error al guardar la institución:', err);
          if (status) {
            status.className = 'alert alert-error';
            status.textContent = 'No se pudieron guardar los datos institucionales.';
          }
          Notifications.error('No se pudieron guardar los datos institucionales.');
        } finally {
          btnSaveInst.disabled = false;
        }
      };
    }

    const btnCreatePer = document.getElementById('btn-create-period');
    if (btnCreatePer) {
      btnCreatePer.onclick = async () => {
        const confirmed = window.confirm(
          'Está a punto de crear un PERIODO ACADÉMICO PRODUCTIVO.\n\nUse únicamente información oficial confirmada por la institución.\n\n¿Desea continuar?'
        );
        if (!confirmed) return;

        btnCreatePer.disabled = true;
        btnCreatePer.textContent = 'Creando Periodo...';

        try {
          const periodData = {
            nombre: document.getElementById('per-nombre').value,
            anio: document.getElementById('per-anio').value,
            fechaInicio: document.getElementById('per-fechaInicio').value,
            fechaFin: document.getElementById('per-fechaFin').value,
            estado: document.getElementById('per-estado').value
          };
          await PeriodService.createPeriod(periodData);
          Notifications.success(`Periodo ${periodData.nombre} creado con éxito`);
          await this.renderConfiguracionView(container);
        } catch (err) {
          btnCreatePer.disabled = false;
          btnCreatePer.textContent = 'Crear Periodo Académico';
          const handled = ErrorService.handleError(err, 'PeriodCreate');
          Notifications.error(handled.userMessage);
        }
      };
    }

    const btnDeleteAccidentalPer = container.querySelector('.btn-delete-period-accidental');
    if (btnDeleteAccidentalPer) {
      btnDeleteAccidentalPer.onclick = async () => {
        const periodId = btnDeleteAccidentalPer.dataset.periodId;
        const periodName = btnDeleteAccidentalPer.dataset.periodName;
        const periodStatus = btnDeleteAccidentalPer.dataset.periodStatus;
        const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const dbStatus = StorageService.getStatus();

        const db = getDB();
        const linkedCount = await new Promise((resolve, reject) => {
          const tx = db.transaction('matriculas', 'readonly');
          const req = tx.objectStore('matriculas').getAll();
          tx.onerror = (e) => reject(new Error(`Error al verificar matrículas: ${e?.target?.error?.message}`));
          tx.onabort = () => reject(new Error('Transacción de lectura cancelada'));
          req.onerror = (e) => reject(new Error(`Error de consulta: ${e?.target?.error?.message}`));
          req.onsuccess = () => resolve((req.result || []).filter(e => e.periodoId === periodId).length);
        });

        // Precondiciones estrictas de seguridad (PERIOD-CLEANUP-01.4)
        if (runtimeOrigin !== 'http://127.0.0.1:8080' || dbStatus.dbName !== 'CETPRO_DB' || periodId !== 'PER-1789180520385' || linkedCount !== 0) {
          alert(
            `ABORTADO: Las precondiciones obligatorias de seguridad no se cumplen.\n\n` +
            `• Origin: ${runtimeOrigin} (requerido: http://127.0.0.1:8080)\n` +
            `• dbName: ${dbStatus.dbName} (requerido: CETPRO_DB)\n` +
            `• periodId: ${periodId} (requerido: PER-1789180520385)\n` +
            `• Matrículas vinculadas: ${linkedCount} (requerido: 0)`
          );
          return;
        }

        const confirmed = window.confirm(
          'DIAGNÓSTICO ENTORNO Y CONFIRMACIÓN DE ELIMINACIÓN (PERIOD-CLEANUP-01.4):\n\n' +
          `• Origin: ${runtimeOrigin}\n` +
          `• Base de Datos: ${dbStatus.dbName} (v${dbStatus.version})\n` +
          `• ID Periodo: ${periodId}\n` +
          `• Denominación: ${periodName}\n` +
          `• Estado: ${periodStatus}\n` +
          `• Matrículas vinculadas: ${linkedCount}\n\n` +
          'PRECONDICIONES EXIGIDAS EN RESPALDO:\n' +
          '- periodos = 1, estudiantes = 269, matriculas = 295, staging = 295\n\n' +
          'POSTCONDICIONES EXIGIDAS EN READBACK:\n' +
          '- periodos = 0, estudiantes = 269, matriculas = 295, staging = 295\n' +
          '- 295 periodoId = null | 295 moduloId = null\n\n' +
          '¿Desea ejecutar la eliminación administrativa en CETPRO_DB ahora?'
        );
        if (!confirmed) return;

        btnDeleteAccidentalPer.disabled = true;
        btnDeleteAccidentalPer.textContent = 'Eliminando Periodo...';

        try {
          const res = await PeriodService.deletePeriodAdmin(periodId, {
            motivo: 'ELIMINACION_PERIODO_ACCIDENTAL_FASE_0_2',
            operador: 'SECRETARIA_EDGE_USER',
            requireExactCounts: {
              periods: 1,
              students: 269,
              enrollments: 295,
              staging: 295
            },
            verifyReadbackCounts: {
              expectedPeriods: 0,
              expectedStudents: 269,
              expectedEnrollments: 295,
              expectedStaging: 295,
              expectedNullPeriodoId: 295,
              expectedNullModuloId: 295
            }
          });
          Notifications.success(`Periodo ${periodName} (PER-1789180520385) eliminado con éxito. Respaldo generado: ${res.backupId}`);
          await this.renderConfiguracionView(container);
        } catch (err) {
          btnDeleteAccidentalPer.disabled = false;
          btnDeleteAccidentalPer.textContent = '🗑️ Eliminar periodo accidental 2026-1';
          const handled = ErrorService.handleError(err, 'PeriodDeleteAdmin');
          Notifications.error(`FALLO EN ELIMINACIÓN: ${handled.userMessage}`);
        }
      };
    }
  },

  generatePeriodsTableHtml(periods) {
    if (periods.length === 0) {
      return `<p class="text-muted margin-top-sm">No existen periodos académicos registrados aún (Regla B-007 Abierta / Pendiente).</p>`;
    }

    return `
      <table class="table-info margin-top-sm">
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Año</th>
            <th>Fecha Inicio</th>
            <th>Fecha Fin</th>
            <th>Estado</th>
            <th>Acciones Administrativas</th>
          </tr>
        </thead>
        <tbody>
          ${periods.map(p => `
            <tr>
              <td><strong>${p.nombre}</strong> <code style="font-size:0.75rem;">(${p.id})</code></td>
              <td>${p.anio}</td>
              <td>${p.fechaInicio}</td>
              <td>${p.fechaFin}</td>
              <td><span class="badge ${p.estado === 'ACTIVO' ? 'badge-success' : 'badge-secondary'}">${p.estado}</span></td>
              <td>
                ${p.id === 'PER-1789180520385' ? `
                  <button type="button" class="btn btn-danger btn-sm btn-delete-period-accidental" data-period-id="${p.id}" data-period-name="${p.nombre}" data-period-status="${p.estado}" style="background:#dc2626; color:#ffffff; border:none; padding:0.35rem 0.75rem; border-radius:4px; font-weight:bold;">
                    🗑️ Eliminar periodo accidental 2026-1
                  </button>
                ` : `
                  <span class="text-muted" style="font-size:0.8rem;">Periodo Oficial</span>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  async renderRegistroView(container) {
    if (isDemoRuntime()) return new DemoAttendanceView().render(container);
    const view = new AttendanceView();
    await view.render(container);
  },

  async renderDocumentosView(container) {
    const role = AuthService.getCurrentRole();
    if (role.id === 'DOCENTE') {
      await this.renderAsistenciaDocenteView(container);
      return;
    }
    const view = new DocumentsView();
    await view.render(container);
  },

  async renderAsistenciaDocenteView(container) {
    const view = new TeacherWorkspacesView();
    await view.renderAttendance(container);
  },

  async renderEvaluacionDocenteView(container) {
    const view = new TeacherWorkspacesView();
    await view.renderEvaluation(container);
  },

  async renderPortadaDocenteView(container) {
    const view = new TeacherWorkspacesView();
    await view.renderPortada(container);
  },

  async renderIncidenciasView(container) {
    const summary = await stagingService.getDashboardSummary();
    const stagingRecords = await stagingService.getFilteredStaging();

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>Previsualización de Importación e Incidencias (Staging M04)</h2>
          <p class="subtitle">Lote: <code>${summary.reconciliation.loteId}</code> — Control de Importación M04</p>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <button class="btn btn-secondary" disabled style="cursor:not-allowed; opacity:0.8; font-weight:bold; background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; padding:0.6rem 1rem; border-radius:4px;" title="La importación definitiva a producción está bloqueada hasta autorización formal">
            🔒 BLOQUEADO — PENDIENTE DE CONCILIACIÓN
          </button>
        </div>
      </section>

      <div class="grid grid-3 margin-bottom-sm">
        <div class="stat-card">
          <div class="stat-icon">📑</div>
          <div class="stat-info">
            <span class="stat-value">${summary.totalLeido}</span>
            <span class="stat-label">TOTAL LEÍDO (Filas Candidatas)</span>
          </div>
        </div>

        <div class="stat-card" style="border-left: 4px solid var(--success-color);">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">${summary.listos}</span>
            <span class="stat-label">LISTOS (Sin Incidencias)</span>
          </div>
        </div>

        <div class="stat-card" style="border-left: 4px solid var(--warning-color);">
          <div class="stat-icon">⚠️</div>
          <div class="stat-info">
            <span class="stat-value">${summary.conIncidencias}</span>
            <span class="stat-label">CON INCIDENCIAS / REVISIÓN</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
          <h3>Registros en Staging (<code>staging_importaciones</code>)</h3>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <input type="text" id="staging-search" class="form-input" placeholder="🔍 Buscar por DNI, Nombre o Programa..." style="padding:0.5rem 0.8rem; font-size:0.85rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); min-width:240px;">
            <select id="staging-filter-estado" class="form-input" style="padding:0.5rem 0.8rem; font-size:0.85rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              <option value="">Todos los Estados</option>
              <option value="LISTO">LISTO</option>
              <option value="PENDIENTE_REVISION">PENDIENTE REVISIÓN</option>
            </select>
          </div>
        </div>

        <div id="staging-table-container" style="overflow-x:auto;">
          ${this.generateStagingTableHtml(stagingRecords)}
        </div>
      </div>
    `;

    const searchInput = document.getElementById('staging-search');
    const filterSelect = document.getElementById('staging-filter-estado');

    const updateFilter = async () => {
      const query = searchInput ? searchInput.value : null;
      const estado = filterSelect ? filterSelect.value : null;
      const filtered = await stagingService.getFilteredStaging({ query, estado: estado || null });
      const tableContainer = document.getElementById('staging-table-container');
      if (tableContainer) {
        tableContainer.innerHTML = this.generateStagingTableHtml(filtered);
      }
    };

    if (searchInput) searchInput.oninput = updateFilter;
    if (filterSelect) filterSelect.onchange = updateFilter;
  },

  generateStagingTableHtml(records) {
    if (!records || records.length === 0) {
      return `<p class="text-muted" style="padding:1rem;">No se encontraron registros de staging coincidentes.</p>`;
    }

    return `
      <table class="table-info" style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead>
          <tr style="background:#f1f5f9; text-align:left;">
            <th style="padding:0.6rem; border:1px solid var(--border-color);">ID Staging</th>
            <th style="padding:0.6rem; border:1px solid var(--border-color);">Origen (Archivo / Hoja / Fila)</th>
            <th style="padding:0.6rem; border:1px solid var(--border-color);">Documento Orig.</th>
            <th style="padding:0.6rem; border:1px solid var(--border-color);">Nombre Completo Original</th>
            <th style="padding:0.6rem; border:1px solid var(--border-color);">Programa Candidate</th>
            <th style="padding:0.6rem; border:1px solid var(--border-color);">Estado</th>
            <th style="padding:0.6rem; border:1px solid var(--border-color);">Incidencias</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => {
            const hasInc = Array.isArray(r.incidencias) && r.incidencias.length > 0;
            const incBadges = hasInc ? r.incidencias.map(inc => `
              <span class="badge ${inc.severidad === 'ALTA' ? 'badge-danger' : 'badge-warning'}" style="margin-right:0.2rem; margin-bottom:0.2rem; display:inline-block;" title="${inc.descripcion}">
                ${escapeHtml(inc.codigo)}
              </span>
            `).join('') : '<span class="badge badge-success">NINGUNA</span>';

            return `
              <tr>
                <td style="padding:0.5rem; border:1px solid var(--border-color);"><code>${escapeHtml(r.id)}</code></td>
                <td style="padding:0.5rem; border:1px solid var(--border-color);">
                  <strong style="color:var(--neutral-dark);">${escapeHtml(r.archivoOrigen)}</strong><br>
                  <span class="text-muted" style="font-size:0.75rem;">Hoja: ${escapeHtml(r.hojaOrigen)} | Fila Excel: ${escapeHtml(r.filaOrigen)}</span>
                </td>
                <td style="padding:0.5rem; border:1px solid var(--border-color);">
                  ${r.numeroDocumentoOriginal ? `<code>${escapeHtml(r.numeroDocumentoOriginal)}</code>` : '<span class="badge badge-danger">VACÍO</span>'}
                </td>
                <td style="padding:0.5rem; border:1px solid var(--border-color);"><strong>${escapeHtml(r.nombreCompletoOriginal)}</strong></td>
                <td style="padding:0.5rem; border:1px solid var(--border-color);">${escapeHtml(r.programaOriginal)}</td>
                <td style="padding:0.5rem; border:1px solid var(--border-color);">
                  <span class="badge ${r.estado === 'LISTO' ? 'badge-success' : 'badge-warning'}">${escapeHtml(r.estado)}</span>
                </td>
                <td style="padding:0.5rem; border:1px solid var(--border-color);">${incBadges}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  renderRespaldoView() {
    const demoMode = isDemoRuntime();
    const restorePanel = CONFIG.IS_V2_CANDIDATE ? `
      <div class="card margin-top-sm">
        <h3>Restaurar respaldo de la aplicación ${demoMode ? 'DEMO' : 'administrativa'}</h3>
        <p>Seleccionar un archivo solo ejecuta una comprobación previa. Antes de reemplazar datos, el sistema exige confirmación, genera un prebackup y verifica el resultado por lectura posterior.</p>
        <label for="backup-restore-file">Archivo JSON de respaldo</label>
        <input id="backup-restore-file" class="form-input" type="file" accept="application/json,.json">
        <div id="backup-restore-preflight" aria-live="polite" class="margin-top-sm"></div>
        <p><strong>Importante:</strong> ${demoMode ? 'solo se admite un backup environment=DEMO; nunca puede restaurarse sobre REAL.' : 'un backup DEMO no puede restaurarse sobre la candidata real.'}</p>
        <button id="btn-restore-backup" class="btn btn-danger" type="button" disabled>Restaurar con prebackup</button>
      </div>` : `
      <div class="card margin-top-sm">
        <h3>Restaurar respaldo</h3>
        <p>Seleccionar un archivo solo ejecuta el preflight. Ningún dato cambia hasta confirmar expresamente la restauración.</p>
        <label for="backup-restore-file">Archivo JSON de respaldo</label>
        <input id="backup-restore-file" class="form-input" type="file" accept="application/json,.json">
        <div id="backup-restore-preflight" aria-live="polite" class="margin-top-sm"></div>
        <p><strong>Advertencia:</strong> esta acción reemplazará los datos actuales después de crear un respaldo de seguridad previo.</p>
        <button id="btn-restore-backup" class="btn btn-danger" type="button" disabled>Restaurar</button>
      </div>`;
    const role = AuthService.getCurrentRole();
    const canRestore = role.canRestoreBackup;

    return `
      <section class="view-header">
        <div>
          <h2>${canRestore ? 'Respaldo y Restauración Institucional' : 'Copia de Respaldo Operativo'}</h2>
          <p class="subtitle">${canRestore ? 'Gestión técnica y restauración de base de datos — Dirección General' : 'Exportación de respaldo de seguridad — Secretaría Académica'}</p>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <span class="user-role-badge role-badge-${role.id}">${escapeHtml(role.title)}</span>
          <span class="badge ${demoMode ? 'badge-warning' : 'badge-success'}">${demoMode ? 'DEMO · NO OFICIAL' : 'SISTEMA M02'}</span>
        </div>
      </section>

      <div class="card">
        <h3>Crear respaldo de seguridad (Exportación JSON)</h3>
        <p>Exporta todos los datos locales a un archivo JSON firmado con bitácora, conteos y checksum SHA-256.${demoMode ? ' El envelope queda marcado environment=DEMO y official=false.' : ''}</p>
        <button id="btn-export-backup" class="btn btn-primary margin-top-sm">
          <i class="bi bi-download me-1"></i>Exportar Respaldo ${demoMode ? 'DEMO ' : 'Local '}(JSON)
        </button>
      </div>
      ${canRestore ? restorePanel : ''}
    `;
  }
};
