/**
 * Modal Interactivo con Carrusel Informativo de Documentos (DocumentInfoModal)
 * Muestra fichas técnicas y pedagógicas en 4 diapositivas para cada plantilla oficial:
 * 1. ¿Qué es este documento?
 * 2. ¿Qué contiene?
 * 3. ¿Para qué sirve?
 * 4. Responsabilidades por Rol y Emisión
 * 
 * 100% Offline — Accesible, navegable por teclado y con indicadores visuales.
 */

import { getDocumentInfo } from '../services/document-info-catalog.js';
import { escapeHtml } from '../utils/dom-utils.js';

export class DocumentInfoModal {
  constructor() {
    this.currentSlideIndex = 0;
    this.docInfo = null;
    this.modalEl = null;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Abre el modal informativo para la plantilla especificada
   * @param {string} templateId Ej: 'TMPL-01', 'TMPL-19', etc.
   */
  open(templateId) {
    this.docInfo = getDocumentInfo(templateId);
    this.currentSlideIndex = 0;

    // Eliminar modal previo si existe
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'doc-info-modal-overlay';
    overlay.id = 'doc-info-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Información de ${this.docInfo.name}`);

    overlay.innerHTML = `
      <div class="doc-info-modal-dialog">
        <!-- Encabezado del Modal -->
        <div class="doc-info-header">
          <div class="doc-info-title-group">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="doc-info-tmpl-badge" style="background-color: ${this.docInfo.badgeColor || '#1d4ed8'};">
                ${escapeHtml(this.docInfo.id)}
              </span>
              <span class="doc-info-meta-badge">
                ${escapeHtml(this.docInfo.badge || 'Documento Oficial')}
              </span>
              <span class="doc-info-stage-text">
                ${escapeHtml(this.docInfo.stage)}
              </span>
            </div>
            <h3 class="doc-info-modal-title">${escapeHtml(this.docInfo.name)}</h3>
            <div class="doc-info-module-ctx">
              <small class="text-muted"><strong>Ámbito:</strong> ${escapeHtml(this.docInfo.module)}</small>
            </div>
          </div>
          <button type="button" class="doc-info-close-btn" id="btn-close-doc-info" aria-label="Cerrar ventana">
            ✕
          </button>
        </div>

        <!-- Cuerpo con Carrusel de Diapositivas -->
        <div class="doc-info-body">
          <div class="doc-info-carousel-track" id="doc-info-carousel-track">
            ${this._renderSlidesHTML(this.docInfo.slides)}
          </div>
        </div>

        <!-- Pie con Controles de Navegación del Carrusel -->
        <div class="doc-info-footer">
          <div class="doc-info-footer-nav">
            <button type="button" class="btn btn-outline-secondary btn-sm doc-info-nav-btn" id="btn-doc-info-prev">
              ← Anterior
            </button>

            <!-- Indicadores de puntos (Dots) -->
            <div class="doc-info-dots" id="doc-info-dots" role="tablist">
              ${this.docInfo.slides.map((_, i) => `
                <button type="button" class="doc-info-dot ${i === 0 ? 'is-active' : ''}" 
                  data-slide-index="${i}" 
                  aria-label="Ir a diapositiva ${i + 1}" 
                  role="tab">
                </button>
              `).join('')}
            </div>

            <button type="button" class="btn btn-primary btn-sm doc-info-nav-btn" id="btn-doc-info-next">
              Siguiente →
            </button>
          </div>

          <div class="doc-info-slide-counter">
            <span id="doc-info-counter-text">Paso 1 de ${this.docInfo.slides.length}</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modalEl = overlay;

    // Vincular eventos
    this._bindEvents(overlay);
    this._updateSlideView();

    // Eventos globales de teclado
    document.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Cierra y remueve el modal del DOM
   */
  close() {
    document.removeEventListener('keydown', this._handleKeyDown);
    const existing = document.getElementById('doc-info-modal-overlay');
    if (existing) {
      existing.remove();
    }
    this.modalEl = null;
  }

  _bindEvents(overlay) {
    // Cerrar al hacer clic en X
    const closeBtn = overlay.querySelector('#btn-close-doc-info');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Cerrar al hacer clic en el backdrop exterior
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Botón Anterior
    const prevBtn = overlay.querySelector('#btn-doc-info-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prevSlide());
    }

    // Botón Siguiente
    const nextBtn = overlay.querySelector('#btn-doc-info-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextSlide());
    }

    // Puntos indicadores clicables
    const dots = overlay.querySelectorAll('.doc-info-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-slide-index'), 10);
        if (!isNaN(idx)) {
          this.goToSlide(idx);
        }
      });
    });
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowRight') {
      this.nextSlide();
    } else if (e.key === 'ArrowLeft') {
      this.prevSlide();
    }
  }

  nextSlide() {
    if (!this.docInfo) return;
    if (this.currentSlideIndex < this.docInfo.slides.length - 1) {
      this.currentSlideIndex++;
      this._updateSlideView();
    } else {
      // Si llegó al final, volver al inicio o cerrar
      this.currentSlideIndex = 0;
      this._updateSlideView();
    }
  }

  prevSlide() {
    if (!this.docInfo) return;
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      this._updateSlideView();
    } else {
      this.currentSlideIndex = this.docInfo.slides.length - 1;
      this._updateSlideView();
    }
  }

  goToSlide(index) {
    if (!this.docInfo) return;
    if (index >= 0 && index < this.docInfo.slides.length) {
      this.currentSlideIndex = index;
      this._updateSlideView();
    }
  }

  _updateSlideView() {
    if (!this.modalEl || !this.docInfo) return;

    // Actualizar visibilidad de diapositivas
    const slides = this.modalEl.querySelectorAll('.doc-info-slide');
    slides.forEach((s, idx) => {
      if (idx === this.currentSlideIndex) {
        s.classList.add('is-active');
        s.style.display = 'block';
      } else {
        s.classList.remove('is-active');
        s.style.display = 'none';
      }
    });

    // Actualizar dots
    const dots = this.modalEl.querySelectorAll('.doc-info-dot');
    dots.forEach((d, idx) => {
      if (idx === this.currentSlideIndex) {
        d.classList.add('is-active');
      } else {
        d.classList.remove('is-active');
      }
    });

    // Actualizar contador
    const counter = this.modalEl.querySelector('#doc-info-counter-text');
    if (counter) {
      counter.textContent = `Paso ${this.currentSlideIndex + 1} de ${this.docInfo.slides.length}`;
    }

    // Actualizar texto del botón siguiente si es el último
    const nextBtn = this.modalEl.querySelector('#btn-doc-info-next');
    if (nextBtn) {
      if (this.currentSlideIndex === this.docInfo.slides.length - 1) {
        nextBtn.innerHTML = 'Reiniciar Recorrido ↺';
      } else {
        nextBtn.innerHTML = 'Siguiente →';
      }
    }
  }

  _renderSlidesHTML(slides) {
    return slides.map((slide, index) => {
      let contentHTML = '';

      // Slide 1: ¿Qué es este documento?
      if (slide.num === 1) {
        contentHTML = `
          <div class="doc-slide-callout">
            <div class="doc-slide-callout-icon">${slide.icon || '📄'}</div>
            <div class="doc-slide-callout-text">
              <strong>${escapeHtml(slide.highlight || '')}</strong>
            </div>
          </div>
          <p class="doc-slide-desc">${escapeHtml(slide.description || '')}</p>
          <div class="doc-slide-meta-box">
            ${slide.normativa ? `<div><strong>⚖️ Marco Normativo:</strong> ${escapeHtml(slide.normativa)}</div>` : ''}
            ${slide.tipo ? `<div class="mt-1"><strong>📐 Formato Oficial:</strong> ${escapeHtml(slide.tipo)}</div>` : ''}
          </div>
        `;
      }
      // Slide 2: ¿Qué contiene?
      else if (slide.num === 2) {
        const items = slide.items || [];
        contentHTML = `
          <h4 class="doc-slide-subtitle">Estructura y Datos Registrados:</h4>
          <ul class="doc-slide-list">
            ${items.map(it => `<li><span class="doc-bullet">✓</span> <span>${escapeHtml(it)}</span></li>`).join('')}
          </ul>
          ${slide.observation ? `
            <div class="doc-slide-note">
              <strong>💡 Criterio Institucional:</strong> ${escapeHtml(slide.observation)}
            </div>
          ` : ''}
        `;
      }
      // Slide 3: ¿Para qué sirve?
      else if (slide.num === 3) {
        const items = slide.items || [];
        contentHTML = `
          <h4 class="doc-slide-subtitle">Finalidad y Valor Institucional:</h4>
          <div class="doc-slide-uses-grid">
            ${items.map((it, idx) => `
              <div class="doc-slide-use-card">
                <span class="doc-use-num">${idx + 1}</span>
                <p class="doc-use-text">${escapeHtml(it)}</p>
              </div>
            `).join('')}
          </div>
        `;
      }
      // Slide 4: Responsabilidades por Rol
      else if (slide.num === 4) {
        contentHTML = `
          <h4 class="doc-slide-subtitle">Intervención y Atribuciones por Rol:</h4>
          <div class="doc-slide-roles-container">
            ${slide.roleEmit ? `
              <div class="doc-role-row doc-role-sec">
                <div class="doc-role-text">${escapeHtml(slide.roleEmit)}</div>
              </div>
            ` : ''}
            ${slide.roleSign ? `
              <div class="doc-role-row doc-role-dir">
                <div class="doc-role-text">${escapeHtml(slide.roleSign)}</div>
              </div>
            ` : ''}
            ${slide.docenteAction ? `
              <div class="doc-role-row doc-role-doc">
                <div class="doc-role-text">${escapeHtml(slide.docenteAction)}</div>
              </div>
            ` : ''}
          </div>
          ${slide.prerequisites ? `
            <div class="doc-slide-prereq-box mt-3">
              <strong>🔑 Requisitos Previos en el Sistema:</strong>
              <span>${escapeHtml(slide.prerequisites)}</span>
            </div>
          ` : ''}
        `;
      }

      return `
        <div class="doc-info-slide ${index === 0 ? 'is-active' : ''}" data-slide-index="${index}" style="${index === 0 ? 'display: block;' : 'display: none;'}">
          <div class="doc-slide-header-bar">
            <span class="doc-slide-step-badge">Paso ${slide.num} de 4</span>
            <h4 class="doc-slide-main-title">
              <span class="doc-slide-icon">${slide.icon || '📌'}</span>
              <span>${escapeHtml(slide.title)}</span>
            </h4>
          </div>
          <div class="doc-slide-content">
            ${contentHTML}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Instancia singleton para fácil invocación global
export const documentInfoModal = new DocumentInfoModal();
