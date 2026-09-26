import { getDB } from '../db/database.js';
import { isDemoRuntime } from '../services/runtime-target-service.js';
import { escapeHtml } from '../utils/dom-utils.js';

const all = store => new Promise((resolve, reject) => {
  const request = getDB().transaction(store, 'readonly').objectStore(store).getAll();
  request.onsuccess = () => resolve(request.result || []);
  request.onerror = () => reject(request.error);
});

export class DemoEvaluationView {
  async render(container) {
    if (!isDemoRuntime()) {
      container.innerHTML = '<div class="alert alert-warning">La vista de evaluación demostrativa solo existe dentro de MODO DEMOSTRACIÓN.</div>';
      return;
    }
    const [groups, units, indicators] = await Promise.all([all('grupos_academicos'), all('unidades'), all('indicadores')]);
    container.innerHTML = `
      <section class="view-header"><div><h2>Evaluación — Vista demostrativa</h2>
        <p class="subtitle">Estructura simulada reutilizada del dataset DEMO; no se registran notas.</p></div>
        <span class="demo-badge">DEMOSTRACIÓN · NO OFICIAL</span></section>
      <div class="alert alert-warning"><strong>Evaluación productiva continúa bloqueada.</strong> Esta pantalla demuestra navegación, grupos, unidades e indicadores, pero no inventa reglas de aprobación, notas ni redondeos.</div>
      <div class="grid grid-3">
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${groups.length}</span><span class="stat-label">Grupos demo</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${units.length}</span><span class="stat-label">Unidades simuladas</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-value">${indicators.length}</span><span class="stat-label">Indicadores simulados</span></div></div>
      </div>
      <div class="card margin-top"><h3>Estructura disponible</h3>
        <ul>${units.slice(0, 12).map(unit => `<li><strong>${escapeHtml(unit.nombre)}</strong> — ${unit.indicadores.length} indicadores DEMO</li>`).join('')}</ul>
        <p class="mvp-context-note">No existe calificación oficial ni cálculo académico en este gate.</p></div>`;
  }
}
