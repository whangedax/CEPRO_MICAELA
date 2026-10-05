/**
 * Vista de Configuración de Carpeta Pedagógica y Parámetros del Docente
 * Ruta: #/configuracion-docente
 * Permite registrar y persistir los datos de identidad docente, parámetros de carátula institucional (TMPL-04)
 * y programación curricular de unidades didácticas, capacidades terminales e indicadores de logro (TMPL-05..17).
 */

import { escapeHtml } from '../utils/dom-utils.js';
import { AuthService } from '../services/auth-service.js';
import { TeacherContextService } from '../services/teacher-context-service.js';
import { TeacherConfigService } from '../services/teacher-config-service.js';
import { Notifications } from './notifications.js';

export class TeacherConfigView {
  constructor() {
    this.configService = new TeacherConfigService();
    this.activeTab = 'perfil'; // 'perfil' | 'caratula' | 'unidades'
    this.selectedUdNum = 1;
    this.activeContainer = null;
  }

  async render(container) {
    if (!container) return;
    this.activeContainer = container;

    const role = AuthService.getCurrentRole();
    const activeProg = TeacherContextService.getActiveProgram();
    const activeGroup = TeacherContextService.getActiveGroupInfo();
    const activeGroupCode = activeGroup.grupoCode || 'GRP-BD-008';

    // Obtener datos guardados
    const profile = this.configService.getProfile();
    const groupConfig = this.configService.getGroupConfig(activeGroupCode, activeProg.id);
    const unitConfig = this.configService.getUnitConfig(activeGroupCode, this.selectedUdNum, activeProg.id);

    container.innerHTML = `
      <div class="teacher-workspace-container p-3 p-md-4">
        <!-- Banner Principal de Configuración Pedagógica -->
        <div class="card p-3 mb-3" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; border-radius: 14px; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.25);">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                <span class="badge" style="background: rgba(255,255,255,0.2); font-weight: 700; font-size: 0.75rem; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.3);">
                  CONFIGURACIÓN DE CARPETA DOCENTE
                </span>
                <span class="badge" style="background: #ede9fe; color: #5b21b6; font-weight: 700; font-size: 0.75rem;">
                  TMPL-04 · TMPL-05..10 · TMPL-11..17
                </span>
              </div>
              <h2 class="m-0 fw-bold d-flex align-items-center gap-2" style="font-size: 1.45rem; color: #ffffff; letter-spacing: -0.02em;">
                <span>⚙️ Parámetros y Datos Oficiales de Plantillas</span>
              </h2>
              <p class="m-0 mt-1" style="font-size: 0.88rem; color: #e0e7ff;">
                Personalice los datos que figurarán en su Portada oficial, Control de Asistencia y Registro Auxiliar de Calificaciones.
              </p>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-light btn-sm fw-bold px-3 py-2" id="tc-btn-switch-classroom" style="border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); color: #4338ca;">
                🏫 Cambiar Carrera o Aula
              </button>
            </div>
          </div>
        </div>

        <!-- Indicador de Contexto Activo -->
        <div class="card p-2.5 px-3 mb-3" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 0.88rem;">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <span class="text-muted">Especialidad:</span>
              <strong class="text-dark ms-1">${escapeHtml(activeProg.nombre)}</strong>
              <span class="text-muted ms-3">Aula Asignada:</span>
              <span class="badge bg-primary ms-1">${escapeHtml(activeGroupCode)} (${escapeHtml(activeGroup.turno || 'Regular')})</span>
            </div>
            <div class="d-flex gap-2">
              <a href="#/portada" class="btn btn-sm btn-outline-secondary fw-semibold">📁 Portada</a>
              <a href="#/asistencia" class="btn btn-sm btn-outline-secondary fw-semibold">📝 Asistencia</a>
              <a href="#/evaluacion" class="btn btn-sm btn-outline-secondary fw-semibold">📊 Registro Notas</a>
            </div>
          </div>
        </div>

        <!-- Pestañas de Navegación -->
        <div class="d-flex gap-2 border-bottom pb-2 mb-3 flex-wrap">
          <button type="button" class="btn btn-sm ${this.activeTab === 'perfil' ? 'btn-primary' : 'btn-outline-primary'} fw-bold" id="tc-tab-perfil">
            👤 1. Perfil del Docente
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'caratula' ? 'btn-primary' : 'btn-outline-primary'} fw-bold" id="tc-tab-caratula">
            📁 2. Carátula y Grupo (TMPL-04)
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'unidades' ? 'btn-primary' : 'btn-outline-primary'} fw-bold" id="tc-tab-unidades">
            📖 3. Unidades y Capacidades (TMPL-05..17)
          </button>
        </div>

        <!-- Contenido de las Pestañas -->
        <form id="tc-form-config">
          ${this._renderActiveTabContent(profile, groupConfig, unitConfig, activeProg)}

          <!-- Barra de Acciones Global -->
          <div class="card p-3 mt-4" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px;">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" id="tc-btn-load-suggestions">
                  ⚡ Cargar Sugerencias Oficiales del MINEDU
                </button>
                <span class="text-muted" style="font-size: 0.8rem;">Autocompleta horas, capacidades e indicadores según el catálogo oficial.</span>
              </div>
              <div>
                <button type="submit" class="btn btn-success fw-bold px-4 py-2" id="tc-btn-save">
                  💾 Guardar Todos los Cambios
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    `;

    this._bindEvents(container);
  }

  _renderActiveTabContent(profile, groupConfig, unitConfig, activeProg) {
    if (this.activeTab === 'perfil') {
      return `
        <div class="card p-4" style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:12px; border-left: 6px solid #4f46e5;">
          <h4 class="fw-bold mb-3" style="font-size: 1.1rem; color: #1e293b;">
            👤 Identidad Profesional del Docente Responsable
          </h4>
          <p class="text-muted mb-4" style="font-size: 0.88rem;">
            Estos datos se imprimirán en el pie de firma de las Actas, Registros Auxiliares y en la carátula técnica oficial.
          </p>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Apellidos y Nombres Completos *</label>
              <input type="text" class="form-control" id="tc-prof-nombre" value="${escapeHtml(profile.nombreDocente)}" placeholder="Ej: Lic. Roberto Mendoza Huamán" required>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Grado / Título Profesional *</label>
              <input type="text" class="form-control" id="tc-prof-titulo" value="${escapeHtml(profile.tituloDocente)}" placeholder="Ej: Licenciado en Educación Técnica e Informática" required>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Número de DNI *</label>
              <input type="text" class="form-control" id="tc-prof-dni" value="${escapeHtml(profile.dniDocente)}" maxlength="8" placeholder="Ej: 41258963" required>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Teléfono de Contacto</label>
              <input type="text" class="form-control" id="tc-prof-tel" value="${escapeHtml(profile.telefonoDocente)}" placeholder="Ej: 951884211">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Lugar y Región de Emisión (Postfirma)</label>
              <input type="text" class="form-control" id="tc-prof-lugar" value="${escapeHtml(profile.lugarEmision)}" placeholder="Ej: Juliaca, Puno">
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'caratula') {
      return `
        <div class="card p-4" style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:12px; border-left: 6px solid #d97706;">
          <h4 class="fw-bold mb-3" style="font-size: 1.1rem; color: #1e293b;">
            📁 Parámetros de Carátula Institucional (Portada TMPL-04)
          </h4>
          <p class="text-muted mb-4" style="font-size: 0.88rem;">
            Configure las menciones del sector educación, módulo formativo y duración que se imprimirán en el formato A4 de la portada.
          </p>

          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Dirección Regional de Educación (DRE)</label>
              <input type="text" class="form-control" id="tc-grp-dre" value="${escapeHtml(groupConfig.dre)}" placeholder="Ej: DRE PUNO">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Unidad de Gestión Educativa Local (UGEL)</label>
              <input type="text" class="form-control" id="tc-grp-ugel" value="${escapeHtml(groupConfig.ugel)}" placeholder="Ej: UGEL SAN ROMÁN">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Tipo de Gestión</label>
              <input type="text" class="form-control" id="tc-grp-gestion" value="${escapeHtml(groupConfig.tipoGestion)}" placeholder="Ej: PÚBLICA DIRECTA">
            </div>

            <div class="col-md-12">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Denominación Completa del Módulo Formativo *</label>
              <input type="text" class="form-control" id="tc-grp-modulo" value="${escapeHtml(groupConfig.nombreModulo)}" placeholder="Ej: Módulo I: Ofimática Profesional y Tecnologías de la Información" required>
            </div>

            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Ciclo / Nivel Formativo</label>
              <input type="text" class="form-control" id="tc-grp-ciclo" value="${escapeHtml(groupConfig.ciclo)}" placeholder="Ej: TÉCNICO o AUXILIAR TÉCNICO">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Duración en Horas Lectivas</label>
              <input type="text" class="form-control" id="tc-grp-horas" value="${escapeHtml(groupConfig.horasModulo)}" placeholder="Ej: 360 HORAS">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Créditos Académicos</label>
              <input type="text" class="form-control" id="tc-grp-creditos" value="${escapeHtml(groupConfig.creditosModulo)}" placeholder="Ej: 18 CRÉDITOS">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Año Lectivo Escolar</label>
              <input type="text" class="form-control" id="tc-grp-anio" value="${escapeHtml(groupConfig.anioLectivo)}" placeholder="Ej: 2026">
            </div>

            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Fecha de Inicio del Módulo</label>
              <input type="text" class="form-control" id="tc-grp-inicio" value="${escapeHtml(groupConfig.fechaInicio)}" placeholder="DD/MM/AAAA">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Fecha de Término del Módulo</label>
              <input type="text" class="form-control" id="tc-grp-termino" value="${escapeHtml(groupConfig.fechaTermino)}" placeholder="DD/MM/AAAA">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Turno de Clases</label>
              <input type="text" class="form-control" id="tc-grp-turno" value="${escapeHtml(groupConfig.turno)}" placeholder="Ej: MAÑANA o TARDE">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Sección / Aula</label>
              <input type="text" class="form-control" id="tc-grp-seccion" value="${escapeHtml(groupConfig.seccion)}" placeholder="Ej: ÚNICA, A, B">
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'unidades') {
      const indicators = unitConfig.indicadores || [];
      return `
        <div class="card p-4" style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:12px; border-left: 6px solid #16a34a;">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div>
              <h4 class="fw-bold m-0" style="font-size: 1.1rem; color: #1e293b;">
                📖 Programación de Capacidades e Indicadores de Logro (TMPL-05..17)
              </h4>
              <p class="text-muted m-0 mt-1" style="font-size: 0.88rem;">
                Defina la denominación de la Unidad Didáctica, su Capacidad Terminal y los 5 Indicadores evaluables en la escala vigesimal.
              </p>
            </div>
          </div>

          <!-- Selector de Unidad Didáctica (Pills) -->
          <div class="d-flex align-items-center gap-2 mb-4 flex-wrap bg-light p-2.5 rounded border">
            <span class="fw-bold text-dark me-2" style="font-size: 0.85rem;">Seleccionar Unidad a Configurar:</span>
            ${[1, 2, 3, 4, 5, 6, 7].map(num => `
              <button type="button" class="btn btn-sm ${this.selectedUdNum === num ? 'btn-success fw-bold' : 'btn-outline-secondary'}" data-ud-num="${num}">
                UD ${num} ${this.selectedUdNum === num ? '✓' : ''}
              </button>
            `).join('')}
          </div>

          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Nombre Oficial de la Unidad Didáctica *</label>
              <input type="text" class="form-control" id="tc-unit-nombre" value="${escapeHtml(unitConfig.nombreUD)}" placeholder="Ej: UD ${this.selectedUdNum}: Sistemas Operativos y Ofimática Aplicada" required>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold" style="font-size: 0.85rem;">Fecha Inicio de la Unidad (para Asistencia)</label>
              <input type="date" class="form-control" id="tc-unit-inicio" value="${escapeHtml(unitConfig.fechaInicioUD || '2026-03-16')}">
            </div>

            <div class="col-md-12">
              <label class="form-label fw-bold text-success" style="font-size: 0.9rem;">
                📌 Capacidad Terminal de la Unidad Didáctica (Recuadro oficial MINEDU en Registro de Notas) *
              </label>
              <textarea class="form-control" id="tc-unit-capacidad" rows="2" placeholder="Describa la capacidad terminal que el estudiante alcanzará al culminar la unidad didáctica..." required>${escapeHtml(unitConfig.capacidadUD || '')}</textarea>
              <small class="text-muted">Este texto se estampará en la casilla oficial "CAPACIDAD" del Registro Auxiliar A3.</small>
            </div>

            <div class="col-md-12 mt-3">
              <label class="form-label fw-bold text-dark" style="font-size: 0.9rem;">
                🎯 Indicadores de Logro Evaluables (IL 1 al IL 5)
              </label>
              <div class="d-flex flex-column gap-2.5">
                ${[1, 2, 3, 4, 5].map(idx => `
                  <div class="input-group">
                    <span class="input-group-text fw-bold text-dark bg-light" style="min-width: 60px;">IL ${idx}</span>
                    <input type="text" class="form-control tc-indicator-input" data-il-idx="${idx}" value="${escapeHtml(indicators[idx - 1] || '')}" placeholder="Descripción del Indicador de Logro ${idx}..." required>
                  </div>
                `).join('')}
              </div>
              <small class="text-muted">Estos 5 indicadores corresponden a las columnas IL 1 al IL 5 de la matriz de notas de 00 a 20.</small>
            </div>
          </div>
        </div>
      `;
    }
  }

  _bindEvents(container) {
    // Cambio de Pestañas
    const tabPerfil = container.querySelector('#tc-tab-perfil');
    const tabCaratula = container.querySelector('#tc-tab-caratula');
    const tabUnidades = container.querySelector('#tc-tab-unidades');

    if (tabPerfil) {
      tabPerfil.onclick = () => {
        this.activeTab = 'perfil';
        this.render(container);
      };
    }
    if (tabCaratula) {
      tabCaratula.onclick = () => {
        this.activeTab = 'caratula';
        this.render(container);
      };
    }
    if (tabUnidades) {
      tabUnidades.onclick = () => {
        this.activeTab = 'unidades';
        this.render(container);
      };
    }

    // Selector de UD dentro de pestaña Unidades
    container.querySelectorAll('button[data-ud-num]').forEach(btn => {
      btn.onclick = () => {
        this.selectedUdNum = parseInt(btn.getAttribute('data-ud-num'), 10) || 1;
        this.render(container);
      };
    });

    // Botón Cambiar Carrera o Aula
    const btnSwitch = container.querySelector('#tc-btn-switch-classroom');
    if (btnSwitch) {
      btnSwitch.onclick = () => {
        TeacherContextService.openModal(() => this.render(container));
      };
    }

    // Botón Cargar Sugerencias del MINEDU
    const btnSugg = container.querySelector('#tc-btn-load-suggestions');
    if (btnSugg) {
      btnSugg.onclick = () => {
        const activeProg = TeacherContextService.getActiveProgram();
        const activeGroupCode = TeacherContextService.getActiveGroupCode();

        if (this.activeTab === 'caratula') {
          const suggGroup = this.configService.getDefaultGroupConfig(activeProg.id);
          const fModulo = container.querySelector('#tc-grp-modulo');
          const fCiclo = container.querySelector('#tc-grp-ciclo');
          const fHoras = container.querySelector('#tc-grp-horas');
          const fCreditos = container.querySelector('#tc-grp-creditos');
          if (fModulo) fModulo.value = suggGroup.nombreModulo;
          if (fCiclo) fCiclo.value = suggGroup.ciclo;
          if (fHoras) fHoras.value = suggGroup.horasModulo;
          if (fCreditos) fCreditos.value = suggGroup.creditosModulo;
          Notifications.show('Sugerencias de carátula cargadas.', 'info');
        } else if (this.activeTab === 'unidades') {
          const suggUnit = this.configService.getSuggestedUnitConfig(activeProg.id, this.selectedUdNum);
          const fNombre = container.querySelector('#tc-unit-nombre');
          const fCapacidad = container.querySelector('#tc-unit-capacidad');
          if (fNombre) fNombre.value = suggUnit.nombreUD;
          if (fCapacidad) fCapacidad.value = suggUnit.capacidadUD;
          container.querySelectorAll('.tc-indicator-input').forEach((input, idx) => {
            if (suggUnit.indicadores[idx]) input.value = suggUnit.indicadores[idx];
          });
          Notifications.show(`Sugerencias para UD ${this.selectedUdNum} cargadas.`, 'info');
        } else {
          Notifications.show('Complete sus datos personales o pase a la pestaña de Carátula/Unidades.', 'info');
        }
      };
    }

    // Envío del Formulario (Guardar)
    const form = container.querySelector('#tc-form-config');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const activeProg = TeacherContextService.getActiveProgram();
        const activeGroupCode = TeacherContextService.getActiveGroupCode();

        if (this.activeTab === 'perfil') {
          this.configService.saveProfile({
            nombreDocente: container.querySelector('#tc-prof-nombre')?.value?.trim(),
            tituloDocente: container.querySelector('#tc-prof-titulo')?.value?.trim(),
            dniDocente: container.querySelector('#tc-prof-dni')?.value?.trim(),
            telefonoDocente: container.querySelector('#tc-prof-tel')?.value?.trim(),
            lugarEmision: container.querySelector('#tc-prof-lugar')?.value?.trim()
          });
          Notifications.show('Perfil del docente guardado con éxito.', 'success');
        } else if (this.activeTab === 'caratula') {
          this.configService.saveGroupConfig(activeGroupCode, {
            dre: container.querySelector('#tc-grp-dre')?.value?.trim(),
            ugel: container.querySelector('#tc-grp-ugel')?.value?.trim(),
            tipoGestion: container.querySelector('#tc-grp-gestion')?.value?.trim(),
            nombreModulo: container.querySelector('#tc-grp-modulo')?.value?.trim(),
            ciclo: container.querySelector('#tc-grp-ciclo')?.value?.trim(),
            horasModulo: container.querySelector('#tc-grp-horas')?.value?.trim(),
            creditosModulo: container.querySelector('#tc-grp-creditos')?.value?.trim(),
            anioLectivo: container.querySelector('#tc-grp-anio')?.value?.trim(),
            fechaInicio: container.querySelector('#tc-grp-inicio')?.value?.trim(),
            fechaTermino: container.querySelector('#tc-grp-termino')?.value?.trim(),
            turno: container.querySelector('#tc-grp-turno')?.value?.trim(),
            seccion: container.querySelector('#tc-grp-seccion')?.value?.trim()
          });
          Notifications.show('Parámetros de carátula (TMPL-04) guardados con éxito.', 'success');
        } else if (this.activeTab === 'unidades') {
          const indicadores = [];
          container.querySelectorAll('.tc-indicator-input').forEach(input => {
            indicadores.push(input.value.trim());
          });
          this.configService.saveUnitConfig(activeGroupCode, this.selectedUdNum, {
            nombreUD: container.querySelector('#tc-unit-nombre')?.value?.trim(),
            fechaInicioUD: container.querySelector('#tc-unit-inicio')?.value?.trim(),
            capacidadUD: container.querySelector('#tc-unit-capacidad')?.value?.trim(),
            indicadores
          });
          Notifications.show(`Capacidad e Indicadores de UD ${this.selectedUdNum} guardados con éxito.`, 'success');
        }
      };
    }
  }
}
