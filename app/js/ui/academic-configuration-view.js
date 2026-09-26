import { CONFIG } from '../config.js';
import { MvpAdminService, SOURCE_CONFIRMATION_TEXT } from '../services/mvp-admin-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { DemoRuntimeService } from '../services/demo-runtime-service.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';

const sourceFields = prefix => `
  <div class="grid grid-3 margin-top-sm">
    <div><label for="${prefix}-source-type">Tipo de fuente</label><select id="${prefix}-source-type" class="form-input">
      <option value="">Seleccione…</option><option value="RESOLUCION">Resolución</option><option value="PLAN_OFICIAL">Plan oficial</option>
      <option value="COMUNICACION_AUTORIZADA">Comunicación autorizada</option><option value="OTRO_AUTORIZADO">Otra fuente autorizada</option></select></div>
    <div><label for="${prefix}-source-description">Descripción de la fuente</label><input id="${prefix}-source-description" class="form-input" type="text" autocomplete="off"></div>
    <div><label for="${prefix}-confirmed-by">Confirmado por</label><input id="${prefix}-confirmed-by" class="form-input" type="text" autocomplete="off"></div>
  </div>
  <label class="mvp-confirmation"><input id="${prefix}-source-confirmed" type="checkbox"> ${SOURCE_CONFIRMATION_TEXT}</label>`;

export class AcademicConfigurationView {
  constructor() { this.service = new MvpAdminService(); this.catalogs = null; this.groups = []; }

  async render(container) {
    if (!CONFIG.IS_V2_CANDIDATE) {
      container.innerHTML = '<div class="alert alert-warning">La configuración académica controlada está preparada primero para la aplicación v2.</div>';
      return;
    }
    this.catalogs = await this.service.listCatalogs();
    this.groups = await this.service.listGroupSummaries();
    const demoMode = isDemoRuntime();
    container.innerHTML = `
      <section class="view-header"><div><h2>Configuración académica</h2>
        <p class="subtitle">Asistente controlado: solo guarde información respaldada por una fuente autorizada.</p></div>
        <a href="#/grupos" class="btn btn-secondary">Ver grupos</a></section>
      ${demoMode ? `<div class="card demo-configuration-card"><div class="mvp-summary-header"><div><h3>Configuración de demostración</h3><p>Periodo, módulos y unidades son sintéticos, official=false y DEMO_SYNTHETIC.</p></div><button id="btn-load-demo-configuration" class="btn btn-warning" type="button">CARGAR CONFIGURACIÓN DE DEMOSTRACIÓN</button></div></div>`
        : `<div class="card"><div class="mvp-summary-header"><div><h3>Demostración aislada</h3><p>Puede mostrar el flujo completo sin completar fuentes reales.</p></div><button id="btn-enter-demo-page" class="btn btn-warning" type="button">INICIAR MODO DEMOSTRACIÓN</button></div></div>`}
      <div class="alert alert-warning">${demoMode ? 'Todo valor de esta pantalla permanece DEMO, simulado y no oficial.' : 'No se completan valores automáticamente. La nómina administrativa puede funcionar aunque módulo, periodo o unidades sigan pendientes.'}</div>

      <div class="card mvp-step"><span class="mvp-step-number">A</span><h3>Periodo académico</h3>
        <p>Cree un periodo únicamente cuando Jefatura confirme denominación y fechas. La leyenda fija de una plantilla no es fuente válida.</p>
        <form id="mvp-period-form"><div class="grid grid-3">
          <div><label for="mvp-period-name">Denominación</label><input id="mvp-period-name" class="form-input" type="text" autocomplete="off"></div>
          <div><label for="mvp-period-year">Año</label><input id="mvp-period-year" class="form-input" type="number" min="2000" max="2100"></div>
          <div><label for="mvp-period-status">Estado</label><select id="mvp-period-status" class="form-input"><option value="">Seleccione…</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
          <div><label for="mvp-period-start">Fecha de inicio</label><input id="mvp-period-start" class="form-input" type="date"></div>
          <div><label for="mvp-period-end">Fecha de fin</label><input id="mvp-period-end" class="form-input" type="date"></div>
        </div>${sourceFields('period')}<button class="btn btn-primary margin-top-sm" type="submit">Guardar periodo confirmado</button></form>
        <div class="margin-top-sm"><strong>Periodos registrados:</strong> ${this.catalogs.periods.length ? this.catalogs.periods.map(item => escapeHtml(item.nombre)).join(', ') : 'Ninguno'}</div>
        <form id="mvp-group-period-form" class="margin-top"><h4>Asignar un periodo confirmado a un grupo</h4><div class="grid grid-2">
          <div><label for="mvp-period-group">Grupo</label><select id="mvp-period-group" class="form-input"><option value="">Seleccione grupo…</option>${this.groups.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.visibleCode)} · ${escapeHtml(group.program?.nombre || '')}</option>`).join('')}</select></div>
          <div><label for="mvp-period-choice">Periodo</label><select id="mvp-period-choice" class="form-input"><option value="">Seleccione explícitamente…</option>${this.catalogs.periods.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('')}</select></div>
        </div>${sourceFields('group-period')}<button class="btn btn-secondary margin-top-sm" type="submit">Asignar periodo al grupo</button></form>
      </div>

      <div class="card mvp-step margin-top"><span class="mvp-step-number">B</span><h3>Asignación de módulo y configuración del grupo</h3>
        <p>Seleccione el grupo, el módulo de su programa y los datos académicos (Turno, Ciclo, Sección). No hay preselección.</p>
        <form id="mvp-module-form"><div class="grid grid-2">
          <div><label for="mvp-module-group">Grupo</label><select id="mvp-module-group" class="form-input"><option value="">Seleccione grupo…</option>
            ${this.groups.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.visibleCode)} · ${escapeHtml(group.program?.nombre || '')} · ${group.enrollmentCount} matrículas</option>`).join('')}</select></div>
          <div><label for="mvp-module-choice">Módulo válido del programa</label><select id="mvp-module-choice" class="form-input"><option value="">Seleccione primero un grupo…</option></select></div>
        </div>
        <div class="grid grid-3 margin-top-sm">
          <div><label for="mvp-module-turno">Turno</label><select id="mvp-module-turno" class="form-input">
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="MAÑANA">MAÑANA</option>
            <option value="TARDE">TARDE</option>
            <option value="NOCHE">NOCHE</option>
          </select></div>
          <div><label for="mvp-module-ciclo">Ciclo</label><select id="mvp-module-ciclo" class="form-input">
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="AUXILIAR TÉCNICO">AUXILIAR TÉCNICO</option>
            <option value="TÉCNICO">TÉCNICO</option>
          </select></div>
          <div><label for="mvp-module-seccion">Sección</label><select id="mvp-module-seccion" class="form-input">
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="ÚNICA">ÚNICA</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select></div>
        </div>
        <div id="mvp-group-impact" class="mvp-context-note margin-top-sm">Seleccione un grupo para revisar su contexto.</div>
        ${sourceFields('module')}<button class="btn btn-primary margin-top-sm" type="submit">Confirmar asignación</button></form>
      </div>

      <div class="card mvp-step margin-top"><span class="mvp-step-number">C</span><h3>Unidades didácticas por módulo</h3>
        <p>La carga es manual y controlada. Sin unidades, asistencia y evaluación continúan pendientes.</p>
        <form id="mvp-unit-form"><div class="grid grid-3">
          <div><label for="mvp-unit-program">Programa</label><select id="mvp-unit-program" class="form-input"><option value="">Seleccione programa…</option>${this.catalogs.programs.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('')}</select></div>
          <div><label for="mvp-unit-module">Módulo</label><select id="mvp-unit-module" class="form-input"><option value="">Seleccione programa primero…</option></select></div>
          <div><label for="mvp-unit-order">Orden</label><input id="mvp-unit-order" class="form-input" type="number" min="1"></div>
          <div><label for="mvp-unit-name">Nombre</label><input id="mvp-unit-name" class="form-input" type="text"></div>
          <div><label for="mvp-unit-capacity">Capacidad</label><input id="mvp-unit-capacity" class="form-input" type="number" min="1"></div>
          <div><label for="mvp-unit-hours">Horas</label><input id="mvp-unit-hours" class="form-input" type="number" min="1"></div>
          <div><label for="mvp-unit-credits">Créditos</label><input id="mvp-unit-credits" class="form-input" type="number" min="0.1" step="0.1"></div>
          <div style="grid-column:span 2"><label for="mvp-unit-indicators">Indicadores (uno por línea)</label><textarea id="mvp-unit-indicators" class="form-input" rows="4"></textarea></div>
        </div>${sourceFields('unit')}<button class="btn btn-primary margin-top-sm" type="submit">Guardar unidad confirmada</button></form>
      </div>

      <div class="card margin-top"><h3>Grupos que requieren revisar procedencia</h3>
        ${this.groups.filter(group => group.reviewDetails.length).length ? this.groups.filter(group => group.reviewDetails.length).map(group => `<details class="mvp-review-item"><summary>${escapeHtml(group.visibleCode)} — REVISAR PROCEDENCIA</summary><ul>${group.reviewDetails.map(detail => `<li>${escapeHtml(detail)}</li>`).join('')}</ul></details>`).join('') : '<p>No hay grupos pendientes de procedencia.</p>'}
      </div>`;
    this.bind(container);
  }

  source(container, prefix) {
    return {
      sourceType: container.querySelector(`#${prefix}-source-type`).value,
      sourceDescription: container.querySelector(`#${prefix}-source-description`).value,
      confirmedBy: container.querySelector(`#${prefix}-confirmed-by`).value,
      sourceConfirmed: container.querySelector(`#${prefix}-source-confirmed`).checked,
      confirmationText: container.querySelector(`#${prefix}-source-confirmed`).checked ? SOURCE_CONFIRMATION_TEXT : ''
    };
  }

  bind(container) {
    const loadDemo = container.querySelector('#btn-load-demo-configuration');
    if (loadDemo) loadDemo.onclick = async () => {
      try {
        const result = await DemoRuntimeService.ensureAcademicConfiguration();
        Notifications.success(`Configuración DEMO cargada: ${result.groups} grupos y ${result.units} unidades; official=false.`);
        await this.render(container);
      } catch (error) { Notifications.error(error.message); }
    };
    const groupSelect = container.querySelector('#mvp-module-group');
    const moduleChoice = container.querySelector('#mvp-module-choice');
    const turnoChoice = container.querySelector('#mvp-module-turno');
    const cicloChoice = container.querySelector('#mvp-module-ciclo');
    const seccionChoice = container.querySelector('#mvp-module-seccion');
    groupSelect.onchange = () => {
      const group = this.groups.find(item => item.id === groupSelect.value);
      const modules = group ? this.catalogs.modules.filter(item => item.programaId === group.programaId) : [];
      moduleChoice.innerHTML = '<option value="">Seleccione explícitamente…</option>' + modules.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombreOficial || item.nombre)}</option>`).join('');
      if (group) {
        if (group.moduloId) moduleChoice.value = group.moduloId;
        if (turnoChoice && group.turno) turnoChoice.value = group.turno;
        if (cicloChoice && group.ciclo) cicloChoice.value = group.ciclo;
        if (seccionChoice && group.seccion) seccionChoice.value = group.seccion;
      }
      const impact = container.querySelector('#mvp-group-impact');
      impact.innerHTML = group ? `<strong>${escapeHtml(group.program?.nombre || '')}</strong> · Grupo ${escapeHtml(group.visibleCode)} · ${group.enrollmentCount} matrículas<br><small>Identificador administrativo: ${escapeHtml(group.id)}</small>${group.reviewDetails.length ? `<br><strong>Revisar:</strong> ${group.reviewDetails.map(escapeHtml).join(' ')}` : ''}` : 'Seleccione un grupo para revisar su contexto.';
    };

    const unitProgram = container.querySelector('#mvp-unit-program');
    const unitModule = container.querySelector('#mvp-unit-module');
    unitProgram.onchange = () => {
      const modules = this.catalogs.modules.filter(item => item.programaId === unitProgram.value);
      unitModule.innerHTML = '<option value="">Seleccione explícitamente…</option>' + modules.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombreOficial || item.nombre)}</option>`).join('');
    };

    container.querySelector('#mvp-period-form').onsubmit = async event => {
      event.preventDefault();
      try {
        if (!window.confirm('¿Confirma guardar este periodo con la fuente indicada?')) return;
        const result = await this.service.createConfirmedPeriod({ nombre: container.querySelector('#mvp-period-name').value,
          anio: container.querySelector('#mvp-period-year').value, estado: container.querySelector('#mvp-period-status').value,
          fechaInicio: container.querySelector('#mvp-period-start').value, fechaFin: container.querySelector('#mvp-period-end').value,
          ...this.source(container, 'period') });
        Notifications.success(`Periodo ${result.nombre} guardado con procedencia.`); await this.render(container);
      } catch (error) { Notifications.error(error.message); }
    };

    container.querySelector('#mvp-module-form').onsubmit = async event => {
      event.preventDefault();
      try {
        if (!window.confirm('¿Confirma asignar el módulo y datos seleccionados al grupo?')) return;
        const result = await this.service.assignConfirmedModule({
          groupId: groupSelect.value,
          moduloId: moduleChoice.value,
          turno: turnoChoice?.value,
          ciclo: cicloChoice?.value,
          seccion: seccionChoice?.value,
          ...this.source(container, 'module')
        });
        Notifications.success(`Módulo y configuración asignados a ${result.affectedEnrollments} matrícula(s).`); await this.render(container);
      } catch (error) { Notifications.error(error.message); }
    };

    container.querySelector('#mvp-group-period-form').onsubmit = async event => {
      event.preventDefault();
      try {
        if (!window.confirm('¿Confirma asignar el periodo seleccionado al grupo?')) return;
        const result = await this.service.assignConfirmedPeriod({
          groupId: container.querySelector('#mvp-period-group').value,
          periodoId: container.querySelector('#mvp-period-choice').value,
          ...this.source(container, 'group-period')
        });
        Notifications.success(`Periodo asignado a ${result.affectedEnrollments} matrícula(s).`); await this.render(container);
      } catch (error) { Notifications.error(error.message); }
    };

    container.querySelector('#mvp-unit-form').onsubmit = async event => {
      event.preventDefault();
      try {
        if (!window.confirm('¿Confirma guardar esta unidad y sus indicadores desde la fuente indicada?')) return;
        const result = await this.service.createConfirmedUnit({ programaId: unitProgram.value, moduloId: unitModule.value,
          orden: container.querySelector('#mvp-unit-order').value, nombre: container.querySelector('#mvp-unit-name').value,
          capacidad: container.querySelector('#mvp-unit-capacity').value, horas: container.querySelector('#mvp-unit-hours').value,
          creditos: container.querySelector('#mvp-unit-credits').value,
          indicadores: container.querySelector('#mvp-unit-indicators').value.split(/\r?\n/), ...this.source(container, 'unit') });
        Notifications.success(`Unidad guardada con ${result.indicatorCount} indicador(es).`); await this.render(container);
      } catch (error) { Notifications.error(error.message); }
    };
  }
}
