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

    // Reaccionar a cambios de rol dinámicamente
    AuthService.subscribe((role) => {
      this.renderUserRoleWidget();
      this.sanitizeSidebar();
      this.updateDbStatusBadge();
      
      const currentHash = window.location.hash || '#/inicio';
      if (AuthService.canAccessRoute(currentHash)) {
        const routeKey = currentHash.split('?')[0];
        const routeInfo = CONFIG.ROUTES[routeKey] || { id: 'inicio', hash: '#/inicio' };
        this.renderView({ hash: currentHash, ...routeInfo });
      } else {
        window.location.hash = '#/inicio';
      }
    });
  },

  renderUserRoleWidget() {
    const role = AuthService.getCurrentRole();
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    let widget = document.getElementById('user-role-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'user-role-widget';
      widget.className = 'user-role-widget';
      widget.setAttribute('role', 'button');
      widget.setAttribute('tabindex', '0');
      widget.setAttribute('title', 'Haga clic para cambiar de perfil (Director, Secretaría o Docente)');
      headerActions.prepend(widget);
    }

    widget.innerHTML = `
      <div class="user-role-avatar">${role.avatar}</div>
      <div class="user-role-details">
        <span class="user-role-name">${escapeHtml(role.userName)}</span>
        <span class="user-role-badge role-badge-${role.id}">${escapeHtml(role.title)}</span>
      </div>
      <button type="button" class="role-switcher-btn" id="btn-switch-role" title="Cambiar de Rol">
        Cambiar ▾
      </button>
    `;

    widget.onclick = (e) => {
      e.stopPropagation();
      this.openRoleModal();
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
                <strong>Atribuciones:</strong> Control de Asistencia diaria (TMPL-05..10), Registro Auxiliar de Calificaciones (TMPL-11..17) y Portada Docente (TMPL-04).
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

    // Secciones de cabecera en el sidebar
    const sectionTitles = document.querySelectorAll('#sidebar .nav-section-title');
    sectionTitles.forEach(sec => {
      if (sec.textContent.includes('CONFIGURACIÓN ADMINISTRATIVA')) {
        sec.style.display = role.id === 'DOCENTE' ? 'none' : '';
      }
    });
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

    this.updateNavigation(routeInfo.hash);

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
      case 'evaluacion': {
        const view = new EvaluationView();
        await view.render(container);
        break;
      }
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
      case 'configuracion':
        await this.renderConfiguracionView(container);
        break;
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

    if (role.id === 'DIRECTOR') {
      roleTitle = 'Panel Institucional — Dirección General CETPRO';
      roleSub = `${escapeHtml(institution.nombre)} · Director: ${escapeHtml(role.userName)}`;
      shortcutsHtml = `
        <a class="mvp-shortcut" href="#/documentos"><span>📑</span>Emisión de Títulos y Actas</a>
        <a class="mvp-shortcut" href="#/grupos"><span>🗂️</span>Gestión de Grupos</a>
        <a class="mvp-shortcut" href="#/configuracion-academica"><span>⚙️</span>Configuración Académica</a>
        <a class="mvp-shortcut" href="#/estudiantes"><span>👥</span>Padrón de Estudiantes</a>
        <a class="mvp-shortcut" href="#/respaldo"><span>💾</span>Respaldo del Sistema</a>
      `;
    } else if (role.id === 'SECRETARIA') {
      roleTitle = 'Panel de Matrícula y Registros — Secretaría Académica';
      roleSub = `${escapeHtml(institution.nombre)} · Secretaría: ${escapeHtml(role.userName)}`;
      shortcutsHtml = `
        <a class="mvp-shortcut" href="#/estudiantes"><span>👥</span>Padrón y Matrícula</a>
        <a class="mvp-shortcut" href="#/grupos"><span>🗂️</span>Asignación de Grupos</a>
        <a class="mvp-shortcut" href="#/documentos"><span>📑</span>Nóminas y Certificados Modulares</a>
        <a class="mvp-shortcut" href="#/programas"><span>📚</span>Programas y Módulos</a>
        <a class="mvp-shortcut" href="#/respaldo"><span>💾</span>Copia de Respaldo</a>
      `;
    } else if (role.id === 'DOCENTE') {
      roleTitle = 'Aula Virtual y Registros — Docente de Especialidad';
      roleSub = `${escapeHtml(institution.nombre)} · Docente: ${escapeHtml(role.userName)}`;
      shortcutsHtml = `
        <a class="mvp-shortcut" href="#/documentos"><span>📝</span>Control de Asistencia (Sesiones 1-40)</a>
        <a class="mvp-shortcut" href="#/documentos"><span>📊</span>Registro Auxiliar de Calificaciones</a>
        <a class="mvp-shortcut" href="#/documentos"><span>📁</span>Portada de Carpeta Docente</a>
        <a class="mvp-shortcut" href="#/grupos"><span>🗂️</span>Mis Grupos Asignados</a>
        <a class="mvp-shortcut" href="#/estudiantes"><span>👥</span>Mis Alumnos Matriculados</a>
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
      <div class="grid mvp-metric-grid">
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-info"><span class="stat-value">${counts.students}</span><span class="stat-label">Estudiantes</span></div></div>
        <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-info"><span class="stat-value">${counts.enrollments}</span><span class="stat-label">Matrículas</span></div></div>
        <div class="stat-card"><div class="stat-icon">🗂️</div><div class="stat-info"><span class="stat-value">${counts.groups}</span><span class="stat-label">Grupos</span></div></div>
        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-info"><span class="stat-value">${counts.programs}</span><span class="stat-label">Programas</span></div></div>
        <div class="stat-card"><div class="stat-icon">📖</div><div class="stat-info"><span class="stat-value">${counts.modules}</span><span class="stat-label">Módulos</span></div></div>
      </div>
      <div class="card margin-top">
        <h3>Accesos rápidos (${escapeHtml(role.title)})</h3>
        <div class="mvp-shortcuts">
          ${shortcutsHtml}
        </div>
      </div>
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
  },

  async renderProgramasView(container) {
    const programs = await CatalogService.listPrograms();
    const modules = await CatalogService.listModules();

    const modulesByProgram = {};
    modules.forEach(m => {
      if (!modulesByProgram[m.programaId]) {
        modulesByProgram[m.programaId] = [];
      }
      modulesByProgram[m.programaId].push(m);
    });

    container.innerHTML = `
      <section class="view-header">
        <div>
          <h2>Programas y Módulos Curriculares</h2>
          <p class="subtitle">Estructura Oficial Confirmada por CARRERAS.jpeg</p>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <span class="badge badge-success">${programs.length} Programas</span>
          <span class="badge badge-info">${modules.length} Módulos</span>
        </div>
      </section>

      <div class="card margin-bottom-sm">
        <div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
          <input type="text" id="search-program" class="form-input" placeholder="🔍 Buscar por programa o módulo..." style="flex:1; min-width:260px; padding:0.6rem 1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm);">
          <a href="#/grupos" class="btn btn-secondary">Asignación de grupos →</a>
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
    const view = new DocumentsView();
    await view.render(container);
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
    return `
      <section class="view-header">
        <h2>Respaldo y Restauración</h2>
        <span class="badge ${demoMode ? 'badge-warning' : 'badge-success'}">${demoMode ? 'DEMO · NO OFICIAL' : 'SISTEMA M02'}</span>
      </section>

      <div class="card">
        <h3>Crear respaldo</h3>
        <p>Exporta todos los datos locales a un archivo JSON con bitácora, conteos y checksum SHA-256.${demoMode ? ' El envelope queda marcado environment=DEMO y official=false.' : ''}</p>
        <button id="btn-export-backup" class="btn btn-primary margin-top-sm">Exportar Respaldo ${demoMode ? 'DEMO ' : 'Local '}(JSON)</button>
      </div>
      ${restorePanel}
    `;
  }
};
