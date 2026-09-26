/**
 * Componente de Vista de Experiencias Formativas en Situaciones Reales de Trabajo (EfsrtView)
 * Módulo: M08 — EFSRT
 */

import { AcademicReadinessService } from '../services/academic-readiness-service.js';
import { EfsrtService } from '../services/efsrt-service.js';
import { PdfTemplateEngine } from '../services/pdf-template-engine.js';
import { escapeHtml } from '../utils/dom-utils.js';
import { Notifications } from './notifications.js';
import { CONFIG } from '../config.js';

export class EfsrtView {
  constructor(options = {}) {
    this.dbOverride = options.dbOverride || null;
    this.readinessService = options.readinessService || new AcademicReadinessService();
    this.efsrtService = options.efsrtService || new EfsrtService(this.dbOverride);
    this.templateEngine = options.templateEngine || new PdfTemplateEngine();
    this.blobUrl = null;
    this.isTestEnv = options.isTestEnv || false;
    this.recordsList = [];
    this.selectedRecord = null;
  }

  async render(container) {
    if (!container) return;

    // Verificar readiness en producción o entorno de prueba
    const testMatriculaId = this.isTestEnv ? 'MAT-TEST-001' : 'MAT-IMP-BD-001';
    const readiness = await this.readinessService.canRegisterEFSRT(testMatriculaId, this.dbOverride);

    if (CONFIG.IS_V2_CANDIDATE || (!readiness.ready && !this.isTestEnv)) {
      this.renderBlockedState(container);
      return;
    }

    await this.renderTestState(container);
  }

  renderBlockedState(container) {
    container.innerHTML = `
      <div class="efsrt-page-container fade-in">
        <div class="card header-card mb-4">
          <div class="card-header flex-between flex-wrap gap-3">
            <div>
              <h2 class="card-title text-primary"><i class="icon">💼</i> EFSRT — Experiencias Formativas en Situaciones Reales de Trabajo</h2>
              <p class="card-subtitle">Módulo M08 — Gestión de Prácticas y Experiencias Formativas en Empresas</p>
            </div>
            <div>
              ${CONFIG.IS_V2_CANDIDATE ? `<span class="badge">${CONFIG.DB.NAME} · GROUP por groupId</span>` : `<button id="btn-toggle-efsrt-test-mode" class="btn btn-outline-primary">
                <i class="icon">🧪</i> Probar en Entorno Aislado (TEST_DB)
              </button>`}
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="alert alert-warning mb-3" style="background-color: #fffbe6; border-left: 4px solid #faad14; padding: 1.25rem;">
            <h3 style="margin-top:0; color: #d46b08; font-size: 1.15rem;">
              <i class="icon">⚠️</i> CONFIGURACIÓN ACADÉMICA PENDIENTE
            </h3>
            <p style="margin-bottom: 0.75rem;">
              ${CONFIG.IS_V2_CANDIDATE ? `Los grupos académicos de <strong>${CONFIG.DB.NAME}</strong>, base candidata aislada, aún no poseen periodo ni módulo oficialmente asignados (B-007/B-004). La matrícula conserva solo procedencia y snapshots legacy.` : 'Las matrículas productivas registradas en <strong>CETPRO_DB</strong> no poseen actualmente un Periodo Académico ni un Módulo Curricular oficialmente asignado.'}
            </p>
            <p style="margin-bottom: 0.75rem;">
              El registro de EFSRT se habilitará en producción una vez que la Secretaría complete la asignación oficial 
              ${CONFIG.IS_V2_CANDIDATE ? 'de periodos y módulos a GRUPO_ACADEMICO, y resuelva B-005.' : 'de periodos y módulos a las matrículas.'}
            </p>
            <p class="text-muted small" style="margin-bottom:0;">
              <strong>Nota sobre Bloqueo B-005:</strong> El sistema no impone ni infiere cantidad de horas mínimas/máximas, 
              porcentajes de aprobación, convalidaciones ni reglas de certificación no sustentadas en normas oficiales institucionales.
            </p>
          </div>

          <div class="card mt-4 p-4 border-rounded bg-light text-left" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; margin-top:1.5rem; text-align:left;">
            <h4 class="font-weight-bold mb-2 text-primary" style="color:#0284c7; font-size:1.1rem; margin-top:0;">Previsualización Técnica — Consolidado de EFSRT (TMPL-18)</h4>
            <p class="text-muted text-sm mb-3" style="color:#64748b; font-size:0.9rem;">
              Demostración del motor vectorial calibrado sobre la plantilla canónica A3 portrait (40 filas × 9 criterios + calificación final) con salvaguarda B-005 (celdas limpias ante ausencia de prácticas).
            </p>
            <div class="flex-gap-2" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button id="btn-generate-tmpl18-candidate" class="btn btn-primary" style="padding:0.6rem 1.2rem; background:#2563eb; color:#fff; border:none; border-radius:4px; font-weight:600; cursor:pointer;">
                <i class="icon">📄</i> Generar Consolidado EFSRT (TMPL-18)
              </button>
            </div>
            <div id="efsrt-tmpl18-viewer-output" style="display:none; margin-top:1rem;"></div>
          </div>

          ${CONFIG.IS_V2_CANDIDATE ? '' : `<div style="text-align: center; margin-top: 1.5rem;">
            <button id="btn-toggle-efsrt-test-mode-2" class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-weight: 600;">
              <i class="icon">🧪</i> Habilitar Entorno de Prueba Aislado (CETPRO_M08_TEST_DB)
            </button>
          </div>`}
        </div>
      </div>
    `;

    this.bindBlockedEvents(container);
  }

  bindBlockedEvents(container) {
    const btn1 = container.querySelector('#btn-toggle-efsrt-test-mode');
    const btn2 = container.querySelector('#btn-toggle-efsrt-test-mode-2');
    const btnTmpl18 = container.querySelector('#btn-generate-tmpl18-candidate');

    const toggleHandler = () => {
      this.isTestEnv = true;
      Notifications.info('Entorno Aislado CETPRO_M08_TEST_DB activado para pruebas de M08');
      this.render(container);
    };

    if (btn1) btn1.addEventListener('click', toggleHandler);
    if (btn2) btn2.addEventListener('click', toggleHandler);
    if (btnTmpl18) {
      btnTmpl18.onclick = () => this._generateTmpl18Preview(container);
    }
  }

  async _generateTmpl18Preview(container) {
    const output = container.querySelector('#efsrt-tmpl18-viewer-output');
    const btn = container.querySelector('#btn-generate-tmpl18-candidate');
    if (!output) return;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try {
      const rows = Array.from({ length: 40 }, (_, i) => {
        const hasPractice = i < 15;
        return {
          'enrollment.code': `MAT-2026-${String(i + 1).padStart(3, '0')}`,
          'student.fullName': `ESTUDIANTE EFSRT PILOTO ${String(i + 1).padStart(2, '0')}`,
          'efsrt.companyName': hasPractice ? `TALLER MECÁNICO INDUSTRIAL S.A.C. ${i + 1}` : '',
          'efsrt.companyAddress': hasPractice ? `AV. LOS HÉROES ${100 + i * 10}, LIMA` : '',
          criteria: hasPractice ? [3, 2, 2, 3, 3, 2, 1, 2, 1] : [],
          finalGrade: hasPractice ? 19 : null
        };
      });

      const blob = await this.templateEngine.renderEFSRTDocument({
        institution: { nombre: 'CETPRO PÚBLICO "MICAELA BASTIDAS PUYUCAWA"' },
        module: { nombre: 'MECÁNICA AUTOMOTRIZ BÁSICA' },
        efsrt: {
          horas: '120 HORAS',
          fechaInicio: '2026-03-01',
          fechaTermino: '2026-06-30'
        },
        document: { teacherName: 'PROF. CARLOS MENDOZA HUAMÁN' },
        rows,
        demoMode: false
      });

      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = URL.createObjectURL(blob);
      output.style.display = 'block';
      output.innerHTML = `
        <div class="alert alert-success mt-2" style="background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:0.75rem; border-radius:4px; margin-bottom:0.75rem;">
          <strong>TMPL-18 generada exitosamente.</strong> Vista previa técnica en modo borrador sobre plantilla canónica A3 portrait (40 estudiantes, B-005 verificado).
        </div>
        <div class="mvp-actions mb-2" style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
          <button id="btn-tmpl18-print" class="btn btn-secondary" style="padding:0.5rem 1rem; background:#64748b; color:#fff; border:none; border-radius:4px; cursor:pointer;">Imprimir</button>
          <a class="btn btn-primary" href="${this.blobUrl}" download="TMPL-18_CONSOLIDADO_EFSRT_PREVIEW.pdf" style="padding:0.5rem 1rem; background:#2563eb; color:#fff; text-decoration:none; border-radius:4px;">Descargar PDF</a>
        </div>
        <iframe title="Vista previa TMPL-18" src="${this.blobUrl}" width="100%" height="750" style="border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
      output.querySelector('#btn-tmpl18-print').onclick = () => {
        const frame = output.querySelector('iframe');
        frame?.contentWindow?.focus();
        frame?.contentWindow?.print();
      };
      output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      Notifications.error(error.message);
      output.style.display = 'block';
      output.innerHTML = `<div class="alert alert-danger" style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:0.75rem; border-radius:4px;">${escapeHtml(error.message)}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    }
  }

  async renderTestState(container) {
    try {
      this.recordsList = await this.efsrtService.listAll();
    } catch (e) {
      this.recordsList = [];
    }

    const defaultMatricula = this.isTestEnv ? 'MAT-TEST-001' : 'MAT-IMP-BD-001';
    const defaultModulo = this.isTestEnv ? 'MOD-TEST-001' : 'MOD-001';

    container.innerHTML = `
      <div class="efsrt-page-container fade-in">
        <div class="card header-card mb-4">
          <div class="card-header flex-between flex-wrap gap-3">
            <div>
              <h2 class="card-title text-primary"><i class="icon">💼</i> EFSRT — Experiencias Formativas (Entorno Aislado)</h2>
              <p class="card-subtitle">Gestión y Trazabilidad de Prácticas Formativas (CETPRO_M08_TEST_DB)</p>
            </div>
            <div>
              <span class="badge" style="background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; padding: 0.4rem 0.8rem; font-weight:600;">
                Modo: CETPRO_M08_TEST_DB (TEST_ONLY)
              </span>
            </div>
          </div>
        </div>

        <div class="grid-2-cols gap-4 mb-4">
          <!-- Formulario de Registro / Edición -->
          <div class="card p-3">
            <h3 id="efsrt-form-title" class="mb-3" style="font-size:1.1rem; border-bottom:1px solid #eee; padding-bottom:0.5rem;">
              Registrar Nueva EFSRT
            </h3>
            <form id="efsrt-form">
              <input type="hidden" id="efsrt-id" value="">
              
              <div class="form-group mb-2">
                <label for="efsrt-matricula-id" class="form-label">ID de Matrícula <span class="text-danger">*</span></label>
                <input type="text" id="efsrt-matricula-id" class="form-control" value="${escapeHtml(defaultMatricula)}" required>
              </div>

              <div class="form-group mb-2">
                <label for="efsrt-modulo-id" class="form-label">ID de Módulo <span class="text-danger">*</span></label>
                <input type="text" id="efsrt-modulo-id" class="form-control" value="${escapeHtml(defaultModulo)}" required>
              </div>

              <div class="form-group mb-2">
                <label for="efsrt-empresa" class="form-label">Empresa / Centro de Prácticas <span class="text-danger">*</span></label>
                <input type="text" id="efsrt-empresa" class="form-control" placeholder="Ej. Taller Electrónico S.A.C." required>
              </div>

              <div class="form-group mb-2">
                <label for="efsrt-horas" class="form-label">Horas Realizadas <span class="text-danger">*</span></label>
                <input type="number" id="efsrt-horas" class="form-control" min="0" value="120" required>
              </div>

              <div class="grid-2-cols gap-2 mb-2">
                <div class="form-group">
                  <label for="efsrt-fecha-inicio" class="form-label">Fecha Inicio <span class="text-danger">*</span></label>
                  <input type="date" id="efsrt-fecha-inicio" class="form-control" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
                <div class="form-group">
                  <label for="efsrt-fecha-fin" class="form-label">Fecha Fin (Opcional)</label>
                  <input type="date" id="efsrt-fecha-fin" class="form-control">
                </div>
              </div>

              <div class="form-group mb-2">
                <label for="efsrt-nota" class="form-label">Nota Vigesimal (Opcional 0-20)</label>
                <input type="number" id="efsrt-nota" class="form-control" min="0" max="20" step="0.5" placeholder="Ej. 16">
              </div>

              <div class="form-group mb-3">
                <label for="efsrt-observacion" class="form-label">Observaciones (Opcional)</label>
                <input type="text" id="efsrt-observacion" class="form-control" placeholder="Observaciones técnicas o administrativas">
              </div>

              <div class="flex-gap-2">
                <button type="submit" id="btn-save-efsrt" class="btn btn-primary">
                  <i class="icon">💾</i> Registrar EFSRT
                </button>
                <button type="button" id="btn-cancel-form" class="btn btn-secondary" style="display:none;">
                  Cancelar Edición
                </button>
              </div>
            </form>
          </div>

          <!-- Tabla de Registros Registrados -->
          <div class="card p-3">
            <h3 class="mb-3" style="font-size:1.1rem; border-bottom:1px solid #eee; padding-bottom:0.5rem;">
              Registros EFSRT (${this.recordsList.length})
            </h3>
            
            <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
              <table class="table table-striped table-sm" style="width:100%;">
                <thead>
                  <tr>
                    <th>Matrícula / Módulo</th>
                    <th>Empresa</th>
                    <th>Horas</th>
                    <th>Nota</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="efsrt-table-body">
                  ${this.renderTableRows()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindTestEvents(container);
  }

  renderTableRows() {
    if (!this.recordsList || this.recordsList.length === 0) {
      return `<tr><td colspan="6" class="text-center text-muted p-3">No hay registros EFSRT. Usa el formulario para crear uno.</td></tr>`;
    }

    return this.recordsList.map(r => {
      const isAnulado = r.estadoLogico === 'ANULADO' || r.estado === 'ANULADO';
      const badgeStyle = isAnulado 
        ? 'background:#fff1f0; color:#cf1322; border:1px solid #ffa39e;'
        : 'background:#f6ffed; color:#389e0d; border:1px solid #b7eb8f;';

      return `
        <tr style="${isAnulado ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
          <td>
            <strong>${escapeHtml(r.matriculaId)}</strong><br>
            <small class="text-muted">${escapeHtml(r.moduloId)}</small>
          </td>
          <td>${escapeHtml(r.empresa)}</td>
          <td>${r.horasRealizadas} hrs</td>
          <td>${r.nota !== null && r.nota !== undefined ? r.nota : '-'}</td>
          <td>
            <span class="badge" style="${badgeStyle}">
              ${escapeHtml(r.estadoLogico || r.estado || 'REGISTRADO')}
            </span>
          </td>
          <td>
            ${!isAnulado ? `
              <button class="btn btn-sm btn-outline-primary btn-edit-efsrt" data-id="${escapeHtml(r.id)}">✏️</button>
              <button class="btn btn-sm btn-outline-danger btn-cancel-efsrt" data-id="${escapeHtml(r.id)}">🚫</button>
            ` : '<span class="text-muted small">Anulado</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  bindTestEvents(container) {
    const form = container.querySelector('#efsrt-form');
    const btnCancel = container.querySelector('#btn-cancel-form');
    const formTitle = container.querySelector('#efsrt-form-title');
    const btnSave = container.querySelector('#btn-save-efsrt');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = container.querySelector('#efsrt-id').value;
        const matriculaId = container.querySelector('#efsrt-matricula-id').value;
        const moduloId = container.querySelector('#efsrt-modulo-id').value;
        const empresa = container.querySelector('#efsrt-empresa').value;
        const horasRealizadas = container.querySelector('#efsrt-horas').value;
        const fechaInicio = container.querySelector('#efsrt-fecha-inicio').value;
        const fechaFin = container.querySelector('#efsrt-fecha-fin').value;
        const nota = container.querySelector('#efsrt-nota').value;
        const observacion = container.querySelector('#efsrt-observacion').value;

        const payload = {
          id: id || undefined,
          matriculaId,
          moduloId,
          empresa,
          horasRealizadas,
          fechaInicio,
          fechaFin,
          nota,
          observacion
        };

        try {
          if (id) {
            await this.efsrtService.updateEfsrt(payload, 'OPERADOR_TEST');
            Notifications.success(`EFSRT ${id} actualizada con éxito.`);
          } else {
            const created = await this.efsrtService.registerEfsrt(payload, 'OPERADOR_TEST');
            Notifications.success(`EFSRT ${created.id} registrada con éxito.`);
          }

          form.reset();
          container.querySelector('#efsrt-id').value = '';
          formTitle.textContent = 'Registrar Nueva EFSRT';
          btnSave.textContent = 'Registrar EFSRT';
          btnCancel.style.display = 'none';

          await this.renderTestState(container);
        } catch (err) {
          Notifications.error(err.message || 'Error al guardar EFSRT.');
        }
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        form.reset();
        container.querySelector('#efsrt-id').value = '';
        formTitle.textContent = 'Registrar Nueva EFSRT';
        btnSave.textContent = 'Registrar EFSRT';
        btnCancel.style.display = 'none';
      });
    }

    container.querySelectorAll('.btn-edit-efsrt').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const record = await this.efsrtService.getById(id);
        if (record) {
          container.querySelector('#efsrt-id').value = record.id;
          container.querySelector('#efsrt-matricula-id').value = record.matriculaId;
          container.querySelector('#efsrt-modulo-id').value = record.moduloId;
          container.querySelector('#efsrt-empresa').value = record.empresa;
          container.querySelector('#efsrt-horas').value = record.horasRealizadas;
          container.querySelector('#efsrt-fecha-inicio').value = record.fechaInicio;
          container.querySelector('#efsrt-fecha-fin').value = record.fechaFin || '';
          container.querySelector('#efsrt-nota').value = record.nota !== null ? record.nota : '';
          container.querySelector('#efsrt-observacion').value = record.observacion || '';

          formTitle.textContent = `Editar EFSRT (${record.id})`;
          btnSave.textContent = 'Guardar Cambios (Edición)';
          btnCancel.style.display = 'inline-block';
        }
      });
    });

    container.querySelectorAll('.btn-cancel-efsrt').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`¿Confirma la anulación lógica del registro EFSRT "${id}"?`)) {
          try {
            await this.efsrtService.cancelEfsrt(id, 'OPERADOR_TEST', 'ANULACION_DESDE_UI');
            Notifications.success(`EFSRT ${id} anulada con éxito.`);
            await this.renderTestState(container);
          } catch (err) {
            Notifications.error(err.message || 'Error al anular EFSRT.');
          }
        }
      });
    });
  }
}
