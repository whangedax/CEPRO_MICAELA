/**
 * Componente de Vista de Diagnóstico Técnico de Cierre Académico (ClosureView)
 * Módulo: M09 — Diagnóstico Técnico de Cierre Académico
 */

import { AcademicClosureReadinessService } from '../services/academic-closure-readiness-service.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { CONFIG } from '../config.js';

export class ClosureView {
  constructor(options = {}) {
    this.dbOverride = options.dbOverride || null;
    this.readinessService = options.readinessService || new AcademicClosureReadinessService();
    this.isTestEnv = options.isTestEnv || false;
    this.currentMatriculaId = this.isTestEnv ? 'MAT-TEST-001' : 'MAT-IMP-BD-001';
  }

  async render(container) {
    if (!container) return;

    let result = null;
    try {
      result = await this.readinessService.evaluateClosureReadiness(this.currentMatriculaId, this.dbOverride);
    } catch (e) {
      result = this.readinessService._buildDefaultBlockedResponse(this.currentMatriculaId, e.message);
    }

    container.innerHTML = `
      <div class="closure-page-container fade-in">
        <!-- Header -->
        <div class="card header-card mb-4">
          <div class="card-header flex-between flex-wrap gap-3">
            <div>
              <h2 class="card-title text-primary"><i class="icon">🏁</i> Diagnóstico Técnico de Cierre Académico</h2>
              <p class="card-subtitle">Módulo M09 — Inspección de Completitud Técnica y Reglas Normativas Bloqueadas</p>
            </div>
            <div>
              ${CONFIG.IS_V2_CANDIDATE ? `<span class="badge">${CONFIG.DB.NAME} · GROUP por groupId</span>` : `<button id="btn-toggle-closure-test-mode" class="btn ${this.isTestEnv ? 'btn-warning' : 'btn-outline-primary'}">
                <i class="icon">${this.isTestEnv ? '🧪' : '🔬'}</i> ${this.isTestEnv ? 'Modo: CETPRO_M09_TEST_DB (Aislado)' : 'Probar en Entorno Aislado (TEST_DB)'}
              </button>`}
            </div>
          </div>
        </div>

        <!-- Alerta de Estado Global de Cierre -->
        <div class="card p-4 mb-4">
          <div class="alert" style="background-color: #fff1f0; border-left: 4px solid #ff4d4f; padding: 1.25rem;">
            <div class="flex-between flex-wrap gap-2">
              <div>
                <h3 style="margin-top:0; color: #cf1322; font-size: 1.15rem;">
                  <i class="icon">🚫</i> CIERRE ACADÉMICO REAL: BLOQUEADO
                </h3>
                <p style="margin-bottom: 0.5rem; color: #434343;">
                  Estado Técnico: <strong>academicClosureAllowed = false</strong>
                </p>
                <p class="text-muted small" style="margin-bottom:0;">
                  El cierre académico oficial no está autorizado mientras las reglas institucionales (B-002, B-003, B-004, B-005, B-007) permanezcan pendientes de resolución por la institución o la UGEL.
                </p>
              </div>
              <div>
                <span class="badge" style="background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; font-size: 0.9rem; padding: 0.5rem 1rem;">
                  rulesStatus: BLOCKED
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2-cols gap-4 mb-4">
          <!-- Columna 1: Diagnóstico de Matrícula Seleccionada -->
          <div class="card p-3">
            <h3 class="mb-3" style="font-size:1.1rem; border-bottom:1px solid #eee; padding-bottom:0.5rem;">
              Matrícula en Inspección: <code style="font-weight:bold;">${escapeHtml(result.matriculaId)}</code>
            </h3>

            <div class="form-group mb-3">
              <label for="select-matricula-closure" class="form-label">Seleccionar Matrícula Contextual</label>
              <input type="text" id="select-matricula-closure" class="form-control" value="${escapeHtml(result.matriculaId)}">
              <small class="text-muted">Ingresa el ID técnico de matrícula para evaluar su diagnóstico.</small>
            </div>

            <div class="diagnosis-summary p-3" style="background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
              <h4 style="margin-top:0; font-size: 0.95rem; color: #1e293b;">Dimensiones de Estado Técnico:</h4>
              <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
                <li style="padding: 0.35rem 0; border-bottom: 1px dashed #cbd5e1;">
                  <strong>Estado de Configuración:</strong> 
                  <span class="badge ${result.configurationStatus === 'COMPLETE' ? 'badge-success' : 'badge-warning'}">
                    ${escapeHtml(result.configurationStatus)}
                  </span>
                </li>
                <li style="padding: 0.35rem 0; border-bottom: 1px dashed #cbd5e1;">
                  <strong>Cobertura de Datos:</strong> 
                  <span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">
                    ${escapeHtml(result.dataCoverageStatus)}
                  </span>
                </li>
                <li style="padding: 0.35rem 0; border-bottom: 1px dashed #cbd5e1;">
                  <strong>Estado Normativo:</strong> 
                  <span class="badge" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">
                    ${escapeHtml(result.rulesStatus)}
                  </span>
                </li>
                <li style="padding: 0.35rem 0; border-bottom: 1px dashed #cbd5e1;">
                  <strong>Contexto Técnico Completo:</strong> 
                  <strong>${result.technicalContextComplete ? 'SÍ (TEST_DB)' : 'NO (Producción)'}</strong>
                </li>
                <li style="padding: 0.35rem 0;">
                  <strong>Cierre Académico Permitido:</strong> 
                  <strong style="color: #dc2626;">FALSE (Bloqueado)</strong>
                </li>
              </ul>
            </div>
          </div>

          <!-- Columna 2: Componentes Técnicos y Datos Observados -->
          <div class="card p-3">
            <h3 class="mb-3" style="font-size:1.1rem; border-bottom:1px solid #eee; padding-bottom:0.5rem;">
              Datos Técnicos Observados (Sin Juicio de Suficiencia)
            </h3>

            <div class="table-responsive">
              <table class="table table-sm" style="width:100%;">
                <thead>
                  <tr>
                    <th>Componente Técnico</th>
                    <th>Valor / Recuento</th>
                    <th>Estado de Observación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Periodo Asignado</td>
                    <td>${result.technicalContext.periodAssigned ? 'Asignado' : 'null (Sin asignar)'}</td>
                    <td>${result.technicalContext.periodAssigned ? '✅ Presente' : '❌ Pendiente'}</td>
                  </tr>
                  <tr>
                    <td>Módulo Asignado</td>
                    <td>${result.technicalContext.moduloAssigned ? 'Asignado' : 'null (Sin asignar)'}</td>
                    <td>${result.technicalContext.moduloAssigned ? '✅ Presente' : '❌ Pendiente'}</td>
                  </tr>
                  <tr>
                    <td>Unidades Configurate Count</td>
                    <td>${result.technicalContext.unitsConfiguredCount} unidades</td>
                    <td>${result.technicalContext.unitsConfiguredCount > 0 ? '✅ Observado' : '⚠️ 0 Unidades'}</td>
                  </tr>
                  <tr>
                    <td>Indicadores Configurate Count</td>
                    <td>${result.technicalContext.indicatorsConfiguredCount} indicadores</td>
                    <td>${result.technicalContext.indicatorsConfiguredCount > 0 ? '✅ Observado' : '⚠️ 0 Indicadores'}</td>
                  </tr>
                  <tr>
                    <td>Asistencias Registradas</td>
                    <td>${result.technicalContext.attendanceRecordsCount} filas</td>
                    <td>Dato observado (No juzga % asistencia)</td>
                  </tr>
                  <tr>
                    <td>Evaluaciones Registradas</td>
                    <td>${result.technicalContext.evaluationRecordsCount} filas</td>
                    <td>Dato observado (No calcula promedios)</td>
                  </tr>
                  <tr>
                    <td>EFSRT Registradas</td>
                    <td>${result.technicalContext.efsrtRecordsCount} filas</td>
                    <td>Dato observado (No valida horas mínimas)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Bloqueos Institucionales Activos -->
        <div class="card p-3">
          <h3 class="mb-3" style="font-size:1.1rem; color: #b91c1c; border-bottom:1px solid #fecaca; padding-bottom:0.5rem;">
            <i class="icon">🔒</i> Inventario de Reglas Normativas Bloqueadas (B-002, B-003, B-004, B-005, B-007)
          </h3>
          <ul style="margin-bottom:0; padding-left:1.25rem;">
            ${result.blockedRules.map(r => `<li style="margin-bottom:0.5rem; color:#475569;">${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const btnToggle = container.querySelector('#btn-toggle-closure-test-mode');
    const inputMatricula = container.querySelector('#select-matricula-closure');

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        this.isTestEnv = !this.isTestEnv;
        this.currentMatriculaId = this.isTestEnv ? 'MAT-TEST-001' : 'MAT-IMP-BD-001';
        Notifications.info(this.isTestEnv ? 'Entorno Aislado CETPRO_M09_TEST_DB activado' : `Retornado a ${CONFIG.IS_V2_CANDIDATE ? CONFIG.DB.NAME : 'Producción CETPRO_DB'}`);
        this.render(container);
      });
    }

    if (inputMatricula) {
      inputMatricula.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val && val.trim()) {
          this.currentMatriculaId = val.trim();
          this.render(container);
        }
      });
    }
  }
}
