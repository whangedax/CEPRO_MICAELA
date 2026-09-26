import { DemoRuntimeService, DEMO_IDS } from '../services/demo-runtime-service.js';
import { escapeHtml } from '../utils/dom-utils.js';

export class DemoDashboardView {
  async render(container) {
    const state = await DemoRuntimeService.getState();
    const counts = state.counts;
    container.innerHTML = `
      <section class="view-header"><div><h2>Inicio — Modo Demostración</h2>
        <p class="subtitle">Escenario funcional aislado con datos sintéticos deterministas.</p></div>
        <span class="demo-badge">DATOS SIMULADOS · NO OFICIAL</span></section>
      <div class="grid mvp-metric-grid">
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-info"><span class="stat-value">${counts.estudiantes}</span><span class="stat-label">Estudiantes demo</span></div></div>
        <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-info"><span class="stat-value">${counts.matriculas}</span><span class="stat-label">Matrículas demo</span></div></div>
        <div class="stat-card"><div class="stat-icon">🗂️</div><div class="stat-info"><span class="stat-value">${counts.grupos_academicos}</span><span class="stat-label">Grupos demo</span></div></div>
        <div class="stat-card"><div class="stat-icon">🗓️</div><div class="stat-info"><span class="stat-value">${counts.periodos}</span><span class="stat-label">Periodo demo</span></div></div>
        <div class="stat-card"><div class="stat-icon">📖</div><div class="stat-info"><span class="stat-value">2</span><span class="stat-label">Módulos asignados demo</span></div></div>
        <div class="stat-card"><div class="stat-icon">🧩</div><div class="stat-info"><span class="stat-value">${counts.unidades}</span><span class="stat-label">Unidades demo</span></div></div>
      </div>
      <div class="card margin-top"><h3>Accesos para la demostración</h3><div class="mvp-shortcuts">
        <a class="mvp-shortcut" href="#/estudiantes"><span>👥</span>Estudiantes</a>
        <a class="mvp-shortcut" href="#/matriculas"><span>📋</span>Matrículas</a>
        <a class="mvp-shortcut" href="#/nominas?groupId=${escapeHtml(DEMO_IDS.groupB)}"><span>📄</span>Nómina Grupo B</a>
        <a class="mvp-shortcut" href="#/registros/matricula?groupId=${escapeHtml(DEMO_IDS.groupB)}"><span>📝</span>Registro</a>
        <a class="mvp-shortcut" href="#/documentos"><span>📑</span>Ficha TMPL-02</a>
        <a class="mvp-shortcut" href="#/registro"><span>✅</span>Asistencia demo</a>
        <a class="mvp-shortcut" href="#/demo/evaluacion"><span>📊</span>Evaluación demo</a>
        <a class="mvp-shortcut" href="#/respaldo"><span>💾</span>Backup DEMO</a>
      </div></div>
      <div class="card margin-top" id="demo-tour"><div class="mvp-summary-header"><div><h3>Recorrido de demostración</h3>
        <p>Use este orden frente a Jefatura. Ningún paso modifica datos reales.</p></div><span class="demo-badge">${escapeHtml(state.datasetVersion)}</span></div>
        <ol class="demo-tour-list">
          <li>Inicio y conteos sintéticos.</li><li>Estudiantes y matrículas DEMO.</li>
          <li>Grupo Demo B → Nómina TMPL-01 (25).</li><li>Registro administrativo → PDF/CSV.</li>
          <li>Ficha TMPL-02 de un estudiante DEMO.</li><li>Grupo Demo A → capacidad TMPL-01 excedida (40) y reporte completo.</li>
          <li>Asistencia → cambiar una marca, guardar, recargar y revisar conteos.</li>
          <li>Generar reporte de asistencia y exportar Backup DEMO.</li>
        </ol>
      </div>`;
  }
}
