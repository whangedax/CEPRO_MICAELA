/**
 * Motor de Renderizado HTML5 / CSS Grid / SVG (DocumentRenderEngine)
 * Módulo: M10 — Motor Documental Institucional
 *
 * Renderiza plantillas web dinámicas semánticas para la vertical slice (TMPL-01 y TMPL-03).
 * Protegido contra inyección XSS mediante escapeHtml().
 */

import { escapeHtml } from '../utils/dom-utils.js';

export class PrintEngine {
  /**
   * Obtiene la configuración de impresión basada en el renderProfile de la plantilla.
   * NO inventa ni impone A4/portrait/landscape a plantillas NOT_IMPLEMENTED (renderProfile: null).
   * @param {object} template - Objeto plantilla del TemplateRegistry
   * @returns {object|null} Configuración de impresión o null si renderProfile es null
   */
  getPrintConfig(template) {
    if (!template || !template.renderProfile) {
      return null;
    }
    return {
      orientation: template.renderProfile.orientation,
      paperSize: template.renderProfile.paperSize,
      origin: template.renderProfile.origin
    };
  }

  /**
   * Genera el bloque CSS @page dinámico para la plantilla dada.
   * @param {object} template - Objeto plantilla del TemplateRegistry
   * @returns {string} Regla CSS @page o string vacío si renderProfile es null
   */
  generatePrintCSS(template) {
    const config = this.getPrintConfig(template);
    if (!config) {
      return '';
    }
    const sizeStr = config.paperSize ? config.paperSize.toLowerCase() : 'auto';
    const orientStr = config.orientation ? config.orientation.toLowerCase() : '';
    
    if (template.templateId === 'TMPL-01') {
      return `
        @media print { 
          @page { 
            size: ${sizeStr} ${orientStr}; 
            margin: 3.05mm 3.05mm 3.05mm 9.4mm; 
          }
          .tmpl-01-page {
            zoom: 0.84; /* Escala física del pageSetup XLSX */
          }
        }
      `;
    }
    
    return `@media print { @page { size: ${sizeStr} ${orientStr}; margin: 10mm; } }`;
  }
}

export class DocumentRenderEngine {
  /**
   * Genera el marcado HTML completo para renderizado y comparación visual
   * @param {object} previewObj - Objeto resultante de DocumentService.generatePreview
   * @param {object} [options={}] - Opciones de renderizado (pageSegment, etc.)
   * @returns {string} String HTML sanitizado
   */
  renderHTML(previewObj, options = {}) {
    if (!previewObj || !previewObj.template) {
      return '<div class="render-error">Error: Objeto de vista previa inválido.</div>';
    }

    const { template, mappedFields, mode, payloadData } = previewObj;

    if (template.templateId === 'TMPL-01') {
      return this._renderTmpl01(mappedFields, mode, payloadData, options);
    } else if (template.templateId === 'TMPL-03') {
      return this._renderTmpl03(mappedFields, mode, payloadData, options);
    }

    return `<div class="render-error">Plantilla ${escapeHtml(template.code)} no disponible para renderizado.</div>`;
  }

  _renderTmpl01(fields, mode, payload, options = {}) {
    const instName = escapeHtml(fields['institucion-nombre']?.value || '');
    const progName = escapeHtml(fields['programa-nombre']?.value || '');
    const modName = escapeHtml(fields['modulo-nombre']?.value || '');
    const perName = escapeHtml(fields['periodo-nombre']?.value || '');
    const instRegion = escapeHtml(payload.institution?.region || '');
    const instUgel = escapeHtml(payload.institution?.ugel || '');
    const instCodMod = escapeHtml(payload.institution?.codigoModular || '');

    const students = Array.isArray(payload.studentsList) ? payload.studentsList : [];
    const totalStudents = students.length;
    const confirmedCapacity = 30; // Canonical PDF is 1 page
    const capacityExceeded = totalStudents > confirmedCapacity;
    const overflowCount = Math.max(0, totalStudents - confirmedCapacity);
    const pageCount = 1;
    const targetSegment = options.pageSegment || 0;

    let capacityWarningHtml = '';
    if (capacityExceeded) {
      capacityWarningHtml = `
        <div class="no-print alert alert-danger capacity-warning p-3 mb-3 text-dark border-danger" style="border: 2px solid #dc3545; background-color: #fff5f5; border-radius: 6px;">
          <i class="bi bi-exclamation-octagon-fill me-2 text-danger"></i>
          <strong>CAPACIDAD CONFIRMADA DE TMPL-01 SUPERADA</strong> (Capacidad: 60 posiciones | Registrados: ${totalStudents} | Excedentes: ${overflowCount}).
          La nómina oficial está limitada a 60 posiciones en 2 páginas. Impresión suspendida.
        </div>
      `;
    }

    let overflowPanelHtml = '';
    if (capacityExceeded) {
      const overflowStudents = students.slice(confirmedCapacity);
      const overflowRows = overflowStudents.map((st, idx) => {
        const num = confirmedCapacity + idx + 1;
        const matId = escapeHtml(st.matriculaId || st.id || '');
        const doc = escapeHtml(st.numeroDocumento || st.documento || '');
        const name = escapeHtml(st.apellidosNombres || st.nombreCompleto || st.estudianteNombreCompleto || '');
        return `<tr><td class="text-danger fw-bold text-center">${num}</td><td>${matId}</td><td>${doc}</td><td>${name}</td></tr>`;
      }).join('');
      overflowPanelHtml = `
        <div class="no-print overflow-technical-panel card border-danger mt-4 mb-3 shadow-sm">
          <div class="card-header bg-danger text-white fw-bold">REGISTROS FUERA DE CAPACIDAD CONFIRMADA (${overflowCount} excedentes)</div>
          <div class="card-body bg-light">
            <table class="table table-sm table-hover bg-white border mb-0" style="font-size: 12px;">
              <thead class="table-dark"><tr><th>N°</th><th>ID MATRÍCULA</th><th>DOCUMENTO</th><th>ESTUDIANTE</th></tr></thead>
              <tbody>${overflowRows}</tbody>
            </table>
          </div>
        </div>
      `;
    }

    const data = payload;

    // Dimensiones y métricas base para A4 (210mm x 297mm)
    const pageStyle = `
      width: 210mm; height: 297mm; position: relative; margin-bottom: 20mm;
      padding: 3.048mm 3.048mm 3.048mm 9.398mm; /* top right bottom left */
      font-family: Arial, sans-serif; font-size: 10px; color: #000; overflow: hidden;
      box-sizing: border-box; page-break-after: always; isolation: isolate;
    `;

    const printAreaStyle = `
      position: relative; width: 100%; height: 100%;
    `;

    const underlayStyle = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 0; pointer-events: none;
    `;

    // SVG Layer Configuration
    const viewBox = options.fieldBoxes?.viewBox || { w: 595.304, h: 841.890 };
    const svgStyle = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 1; pointer-events: none; font-family: Arial, sans-serif;
    `;

    const isDebugBoxes = mode === 'DEBUG_BOXES';
    const isCanonicalOnly = mode === 'CANONICAL_UNDERLAY_ONLY';
    const boxes = options.fieldBoxes || {
  "viewBox": {
    "x": 0,
    "y": 0,
    "w": 595.304,
    "h": 841.89
  },
  "header": {
    "region": {
      "x": 65.5,
      "y": 101.31,
      "w": 114.11,
      "h": 14.95
    },
    "ugel": {
      "x": 214.92,
      "y": 101.31,
      "w": 111.53,
      "h": 14.95
    },
    "cetpro": {
      "x": 386.82,
      "y": 101.31,
      "w": 166.27,
      "h": 14.95
    },
    "gestionPublica": {
      "x": 113.59,
      "y": 116.26,
      "w": 35.32,
      "h": 14.94
    },
    "gestionPrivada": {
      "x": 214.92,
      "y": 116.26,
      "w": 35.32,
      "h": 14.94
    },
    "convenio": {
      "x": 293.72,
      "y": 116.26,
      "w": 32.73,
      "h": 14.94
    },
    "codigoModular": {
      "x": 469.7,
      "y": 116.26,
      "w": 83.39,
      "h": 14.94
    },
    "resolucionCreacion": {
      "x": 148.91,
      "y": 131.2,
      "w": 101.33,
      "h": 14.94
    },
    "resolucionConversion": {
      "x": 443.61,
      "y": 131.2,
      "w": 109.48,
      "h": 14.94
    },
    "provincia": {
      "x": 113.59,
      "y": 146.14,
      "w": 156.6,
      "h": 14.94
    },
    "distrito": {
      "x": 326.45,
      "y": 146.14,
      "w": 226.64,
      "h": 14.94
    },
    "lugar": {
      "x": 65.5,
      "y": 161.08,
      "w": 204.69,
      "h": 14.94
    },
    "direccion": {
      "x": 326.45,
      "y": 161.08,
      "w": 226.64,
      "h": 14.94
    },
    "programa": {
      "x": 179.61,
      "y": 176.02,
      "w": 373.48,
      "h": 14.93
    },
    "modulo": {
      "x": 65.5,
      "y": 190.95,
      "w": 184.74,
      "h": 14.95
    },
    "resDirectoralModulo": {
      "x": 386.82,
      "y": 190.95,
      "w": 56.79,
      "h": 14.95
    },
    "ciclo": {
      "x": 469.7,
      "y": 190.95,
      "w": 83.39,
      "h": 14.95
    },
    "fechaInicio": {
      "x": 113.59,
      "y": 205.9,
      "w": 66.02,
      "h": 14.95
    },
    "fechaTermino": {
      "x": 250.24,
      "y": 205.9,
      "w": 43.48,
      "h": 14.95
    },
    "turno": {
      "x": 386.82,
      "y": 205.9,
      "w": 56.79,
      "h": 14.95
    },
    "seccion": {
      "x": 510.62,
      "y": 205.9,
      "w": 42.47,
      "h": 14.95
    }
  },
  "rows": [
    {
      "index": 0,
      "codigoMatricula": {
        "x": 45.55,
        "y": 244.48,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 244.48,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 244.48,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 244.48,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 244.48,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 244.48,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 244.48,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 1,
      "codigoMatricula": {
        "x": 45.55,
        "y": 259.42,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 259.42,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 259.42,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 259.42,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 259.42,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 259.42,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 259.42,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 2,
      "codigoMatricula": {
        "x": 45.55,
        "y": 274.36,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 274.36,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 274.36,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 274.36,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 274.36,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 274.36,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 274.36,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 3,
      "codigoMatricula": {
        "x": 45.55,
        "y": 289.3,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 289.3,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 289.3,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 289.3,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 289.3,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 289.3,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 289.3,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 4,
      "codigoMatricula": {
        "x": 45.55,
        "y": 304.24,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 304.24,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 304.24,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 304.24,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 304.24,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 304.24,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 304.24,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 5,
      "codigoMatricula": {
        "x": 45.55,
        "y": 319.18,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 319.18,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 319.18,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 319.18,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 319.18,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 319.18,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 319.18,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 6,
      "codigoMatricula": {
        "x": 45.55,
        "y": 334.12,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 334.12,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 334.12,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 334.12,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 334.12,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 334.12,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 334.12,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 7,
      "codigoMatricula": {
        "x": 45.55,
        "y": 349.06,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 349.06,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 349.06,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 349.06,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 349.06,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 349.06,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 349.06,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 8,
      "codigoMatricula": {
        "x": 45.55,
        "y": 364,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 364,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 364,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 364,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 364,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 364,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 364,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 9,
      "codigoMatricula": {
        "x": 45.55,
        "y": 378.94,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 378.94,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 378.94,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 378.94,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 378.94,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 378.94,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 378.94,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 10,
      "codigoMatricula": {
        "x": 45.55,
        "y": 393.88,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 393.88,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 393.88,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 393.88,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 393.88,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 393.88,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 393.88,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 11,
      "codigoMatricula": {
        "x": 45.55,
        "y": 408.82,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 408.82,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 408.82,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 408.82,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 408.82,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 408.82,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 408.82,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 12,
      "codigoMatricula": {
        "x": 45.55,
        "y": 423.76,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 423.76,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 423.76,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 423.76,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 423.76,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 423.76,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 423.76,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 13,
      "codigoMatricula": {
        "x": 45.55,
        "y": 438.7,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 438.7,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 438.7,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 438.7,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 438.7,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 438.7,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 438.7,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 14,
      "codigoMatricula": {
        "x": 45.55,
        "y": 453.64,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 453.64,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 453.64,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 453.64,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 453.64,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 453.64,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 453.64,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 15,
      "codigoMatricula": {
        "x": 45.55,
        "y": 468.58,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 468.58,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 468.58,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 468.58,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 468.58,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 468.58,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 468.58,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 16,
      "codigoMatricula": {
        "x": 45.55,
        "y": 483.52,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 483.52,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 483.52,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 483.52,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 483.52,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 483.52,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 483.52,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 17,
      "codigoMatricula": {
        "x": 45.55,
        "y": 498.46,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 498.46,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 498.46,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 498.46,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 498.46,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 498.46,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 498.46,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 18,
      "codigoMatricula": {
        "x": 45.55,
        "y": 513.4,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 513.4,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 513.4,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 513.4,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 513.4,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 513.4,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 513.4,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 19,
      "codigoMatricula": {
        "x": 45.55,
        "y": 528.34,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 528.34,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 528.34,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 528.34,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 528.34,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 528.34,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 528.34,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 20,
      "codigoMatricula": {
        "x": 45.55,
        "y": 543.28,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 543.28,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 543.28,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 543.28,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 543.28,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 543.28,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 543.28,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 21,
      "codigoMatricula": {
        "x": 45.55,
        "y": 558.22,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 558.22,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 558.22,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 558.22,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 558.22,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 558.22,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 558.22,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 22,
      "codigoMatricula": {
        "x": 45.55,
        "y": 573.16,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 573.16,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 573.16,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 573.16,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 573.16,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 573.16,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 573.16,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 23,
      "codigoMatricula": {
        "x": 45.55,
        "y": 588.1,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 588.1,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 588.1,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 588.1,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 588.1,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 588.1,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 588.1,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 24,
      "codigoMatricula": {
        "x": 45.55,
        "y": 603.04,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 603.04,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 603.04,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 603.04,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 603.04,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 603.04,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 603.04,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 25,
      "codigoMatricula": {
        "x": 45.55,
        "y": 617.98,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 617.98,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 617.98,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 617.98,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 617.98,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 617.98,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 617.98,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 26,
      "codigoMatricula": {
        "x": 45.55,
        "y": 632.92,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 632.92,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 632.92,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 632.92,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 632.92,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 632.92,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 632.92,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 27,
      "codigoMatricula": {
        "x": 45.55,
        "y": 647.86,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 647.86,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 647.86,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 647.86,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 647.86,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 647.86,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 647.86,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 28,
      "codigoMatricula": {
        "x": 45.55,
        "y": 662.8,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 662.8,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 662.8,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 662.8,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 662.8,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 662.8,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 662.8,
        "w": 42.47,
        "h": 14.94
      }
    },
    {
      "index": 29,
      "codigoMatricula": {
        "x": 45.55,
        "y": 677.74,
        "w": 68.04,
        "h": 14.94
      },
      "apellidosNombres": {
        "x": 113.59,
        "y": 677.74,
        "w": 180.13,
        "h": 14.94
      },
      "sexo": {
        "x": 293.72,
        "y": 677.74,
        "w": 32.73,
        "h": 14.94
      },
      "fechaNacimiento": {
        "x": 326.45,
        "y": 677.74,
        "w": 60.37,
        "h": 14.94
      },
      "condicion": {
        "x": 386.82,
        "y": 677.74,
        "w": 56.79,
        "h": 14.94
      },
      "numeroUnidades": {
        "x": 443.61,
        "y": 677.74,
        "w": 67.01,
        "h": 14.94
      },
      "numeroCreditos": {
        "x": 510.62,
        "y": 677.74,
        "w": 42.47,
        "h": 14.94
      }
    }
  ],
  "footer": {
    "hombres": {
      "x": 113.59,
      "y": 732.51,
      "w": 35.32,
      "h": 14.94
    },
    "mujeres": {
      "x": 148.91,
      "y": 732.51,
      "w": 30.7,
      "h": 14.94
    },
    "totalEstudiantes": {
      "x": 179.61,
      "y": 732.51,
      "w": 35.31,
      "h": 14.94
    },
    "gratuitos": {
      "x": 250.24,
      "y": 732.51,
      "w": 43.48,
      "h": 14.94
    },
    "pagantes": {
      "x": 293.72,
      "y": 732.51,
      "w": 93.1,
      "h": 14.94
    },
    "becarios": {
      "x": 386.82,
      "y": 732.51,
      "w": 56.79,
      "h": 14.94
    },
    "totalCondicion": {
      "x": 443.61,
      "y": 732.51,
      "w": 67.01,
      "h": 14.94
    },
    "fecha": {
      "x": 65.5,
      "y": 765.33,
      "w": 149.42,
      "h": 12
    }
  }
};

    let svgContent = '';

    const addBox = (box, label, val) => {
      if (!box) return;
      if (isDebugBoxes) {
        svgContent += `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="rgba(255, 0, 0, 0.05)" stroke="red" stroke-width="1" />`;
      } else {
        if (!val) return;
        const textY = box.y + box.h - 4; // Baseline approx for 1654x2339
        svgContent += `<text x="${box.x + 4}" y="${textY}" font-size="20" fill="black">${val}</text>`;
      }
    };

    if (boxes.header) {
      if (isDebugBoxes) {
        addBox(boxes.header.region, 'REGION', '');
        addBox(boxes.header.ugel, 'UGEL', '');
        addBox(boxes.header.cetpro, 'CETPRO', '');
        addBox(boxes.header.gestionPublica, 'GES.PUB', '');
        addBox(boxes.header.gestionPrivada, 'GES.PRI', '');
        addBox(boxes.header.convenio, 'CONVENIO', '');
        addBox(boxes.header.codigoModular, 'COD.MOD', '');
        addBox(boxes.header.resolucionCreacion, 'RES.CRE', '');
        addBox(boxes.header.resolucionConversion, 'RES.CON', '');
        addBox(boxes.header.provincia, 'PROV', '');
        addBox(boxes.header.distrito, 'DIST', '');
        addBox(boxes.header.lugar, 'LUGAR', '');
        addBox(boxes.header.direccion, 'DIR', '');
        addBox(boxes.header.programa, 'PROGRAMA', '');
        addBox(boxes.header.modulo, 'MODULO', '');
        addBox(boxes.header.resDirectoralModulo, 'RES.DIR.MOD', '');
        addBox(boxes.header.ciclo, 'CICLO', '');
        addBox(boxes.header.fechaInicio, 'F.INI', '');
        addBox(boxes.header.fechaTermino, 'F.FIN', '');
        addBox(boxes.header.turno, 'TURNO', '');
        addBox(boxes.header.seccion, 'SECCION', '');
      } else {
        addBox(boxes.header.region, '', escapeHtml(data.institution?.region || ''));
        addBox(boxes.header.ugel, '', escapeHtml(data.institution?.ugel || ''));
        addBox(boxes.header.cetpro, '', escapeHtml(data.institution?.nombre || ''));
        addBox(boxes.header.gestionPublica, '', '');
        addBox(boxes.header.gestionPrivada, '', '');
        addBox(boxes.header.convenio, '', '');
        addBox(boxes.header.codigoModular, '', escapeHtml(data.institution?.codigoModular || ''));
        addBox(boxes.header.resolucionCreacion, '', '');
        addBox(boxes.header.resolucionConversion, '', '');
        addBox(boxes.header.provincia, '', escapeHtml(data.institution?.provincia || ''));
        addBox(boxes.header.distrito, '', escapeHtml(data.institution?.distrito || ''));
        addBox(boxes.header.lugar, '', escapeHtml(data.institution?.lugar || ''));
        addBox(boxes.header.direccion, '', escapeHtml(data.institution?.direccion || ''));
        addBox(boxes.header.programa, '', escapeHtml(data.program?.nombre || ''));
        addBox(boxes.header.modulo, '', escapeHtml(data.module?.nombre || ''));
        addBox(boxes.header.resDirectoralModulo, '', escapeHtml(data.module?.resolucion || ''));
        addBox(boxes.header.ciclo, '', escapeHtml(data.module?.ciclo || ''));
        addBox(boxes.header.fechaInicio, '', escapeHtml(data.module?.fechaInicio || ''));
        addBox(boxes.header.fechaTermino, '', escapeHtml(data.module?.fechaTermino || ''));
        addBox(boxes.header.turno, '', escapeHtml(data.module?.turno || ''));
        addBox(boxes.header.seccion, '', escapeHtml(data.module?.seccion || ''));
      }
    }

    if (boxes.rows && boxes.rows.length > 0) {
      for (let i = 0; i < 30; i++) {
        const rowBox = boxes.rows[i];
        if (!rowBox) continue;
        
        if (isDebugBoxes) {
          addBox(rowBox.codigoMatricula, `F${i+1}-COD`, '');
          addBox(rowBox.apellidosNombres, `F${i+1}-NOMBRE`, '');
          addBox(rowBox.sexo, `S`, '');
          addBox(rowBox.fechaNacimiento, `NAC`, '');
          addBox(rowBox.condicion, `COND`, '');
          addBox(rowBox.numeroUnidades, `UD`, '');
          addBox(rowBox.numeroCreditos, `CR`, '');
        } else {
          const student = students[i];
          if (!student) break;
          const name = escapeHtml(student.apellidosNombres || student.nombreCompleto || student.estudianteNombreCompleto || '');
          const sex = escapeHtml(student.sexo || student.sex || '');
          const dob = escapeHtml(student.fechaNacimiento || student.birthDate || '');
          const cond = escapeHtml(student.condicion || student.condition || '');
          
          addBox(rowBox.codigoMatricula, '', ''); // B-004
          addBox(rowBox.apellidosNombres, '', name);
          addBox(rowBox.sexo, '', sex);
          addBox(rowBox.fechaNacimiento, '', dob);
          addBox(rowBox.condicion, '', cond);
          addBox(rowBox.numeroUnidades, '', ''); // B-002
          addBox(rowBox.numeroCreditos, '', ''); // B-002
        }
      }
    }

    if (boxes.footer) {
      if (isDebugBoxes) {
        addBox(boxes.footer.hombres, 'H', '');
        addBox(boxes.footer.mujeres, 'M', '');
        addBox(boxes.footer.totalEstudiantes, 'TOT', '');
        addBox(boxes.footer.gratuitos, 'GRA', '');
        addBox(boxes.footer.pagantes, 'PAG', '');
        addBox(boxes.footer.becarios, 'BEC', '');
        addBox(boxes.footer.totalCondicion, 'T.C', '');
        addBox(boxes.footer.fecha, 'FECHA', '');
      } else {
        let hombres = 0, mujeres = 0;
        for (let i = 0; i < Math.min(30, students.length); i++) {
            if (students[i].sexo === 'M' || students[i].sex === 'M') hombres++;
            else if (students[i].sexo === 'F' || students[i].sex === 'F') mujeres++;
        }
        addBox(boxes.footer.hombres, '', hombres.toString());
        addBox(boxes.footer.mujeres, '', mujeres.toString());
        addBox(boxes.footer.totalEstudiantes, '', (hombres + mujeres).toString());
        
        addBox(boxes.footer.gratuitos, '', (hombres + mujeres).toString());
        addBox(boxes.footer.pagantes, '', '0');
        addBox(boxes.footer.becarios, '', '0');
        addBox(boxes.footer.totalCondicion, '', (hombres + mujeres).toString());
        
        addBox(boxes.footer.fecha, '', escapeHtml(data.fecha || ''));
      }
    }

    const diagnosticPanel2 = isDebugBoxes ? `
      <div class="no-print overflow-technical-panel card border-info mt-4 mb-3 shadow-sm">
        <div class="card-header bg-info text-white fw-bold">DIAGNÓSTICO PIXEL-LOCK (M11.14)</div>
        <div class="card-body bg-light" style="font-family: monospace; font-size: 13px;">
          <div><strong>M11_RUNTIME_BUILD:</strong> M11.14-PIXEL-LOCK</div>
          <div><strong>underlaySrc:</strong> img/TMPL01_PRINT_PAGE_1.png</div>
          <div><strong>underlayNaturalWidth:</strong> 1654</div>
          <div><strong>underlayNaturalHeight:</strong> 2339</div>
          <div><strong>svgViewBox:</strong> 0 0 1654 2339</div>
          <div><strong>canvasAspectRatio:</strong> 1654/2339</div>
          <div><strong>selectedMode:</strong> ${mode}</div>
        </div>
      </div>
    ` : '';

    const p1Html = `
      <style>
        @media screen {
          .preview-wrapper {
            display: flex;
            justify-content: center;
            width: 100%;
            overflow-x: hidden;
            container-type: inline-size;
            container-name: preview;
            background: #f0f0f0;
            padding: 20px 0;
          }
          @container preview (max-width: 840px) {
            .document-page-scaler {
              zoom: calc(100cqw / 840px);
            }
          }
          .tmpl01-canvas {
            position: relative;
            width: 100%;
            aspect-ratio: 1654 / 2339;
          }
          .tmpl01-underlay {
            display: block;
            width: 100%;
            height: auto;
          }
          .tmpl01-data-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          }
        }
      </style>
      <div class="preview-wrapper">
        <div class="document-page tmpl-01-page portrait-mode page-segment-1 document-page-scaler" style="${pageStyle}">
          <div class="tmpl01-canvas">
            <img class="tmpl01-underlay" src="img/TMPL01_PRINT_PAGE_1.png" ${isDebugBoxes ? 'style="border: 2px solid blue; box-sizing: border-box;"' : ''}>
            ${!isCanonicalOnly ? `
            <svg class="tmpl01-data-layer" viewBox="0 0 1654 2339" ${isDebugBoxes ? 'style="border: 2px solid green; box-sizing: border-box;"' : ''}>
              ${svgContent}
            </svg>` : ''}
          </div>
        </div>
      </div>
    `;

    if (targetSegment === 1) return capacityWarningHtml + diagnosticPanel2 + p1Html;
    return capacityWarningHtml + diagnosticPanel2 + p1Html + overflowPanelHtml;
  }

  _renderTmpl03(fields, mode, payload) {
    const instName = escapeHtml(fields['institucion-nombre']?.value || '[PENDIENTE]');
    const progName = escapeHtml(fields['programa-nombre']?.value || '[PENDIENTE]');
    const grpCode = escapeHtml(fields['grupo-code']?.value || '[PENDIENTE]');

    const enrollments = Array.isArray(payload.enrollmentsList) ? payload.enrollmentsList : [];

    let rowsHtml = '';
    if (enrollments.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="6" class="text-center p-3 text-muted">
            ${mode === 'DRAFT_PREVIEW' ? '[MARCADOR TEST_ONLY: SIN REGISTROS DE MATRÍCULA PARA VISTA PREVIA]' : 'No hay matrículas registradas'}
          </td>
        </tr>
      `;
    } else {
      enrollments.forEach((mat, idx) => {
        const num = idx + 1;
        const matId = escapeHtml(mat.id || mat.matriculaId || '[PENDIENTE]');
        const doc = escapeHtml(mat.numeroDocumento || '[PENDIENTE]');
        const name = escapeHtml(mat.estudianteNombreCompleto || mat.nombreEstudiante || '[PENDIENTE]');
        const turn = escapeHtml(mat.turno || 'PENDIENTE');
        const st = escapeHtml(mat.estado || 'REGISTRADO');

        rowsHtml += `
          <tr>
            <td style="text-align: center;">${num}</td>
            <td>${matId}</td>
            <td>${doc}</td>
            <td>${name}</td>
            <td style="text-align: center;">${turn}</td>
            <td style="text-align: center;">${st}</td>
          </tr>
        `;
      });
    }

    return `
      <div class="document-page tmpl-03-page landscape-mode">
        <div class="document-header">
          <div class="header-text-section text-center">
            <h2 class="inst-title">${instName}</h2>
            <h3 class="doc-title">REGISTRO DE MATRÍCULA MODULAR</h3>
            <p class="subtitle">REGISTRO AUXILIAR OFICIAL DE INSCRIPCIÓN</p>
          </div>
        </div>

        <div class="document-meta-grid">
          <div class="meta-item"><strong>PROGRAMA DE ESTUDIOS:</strong> <span>${progName}</span></div>
          <div class="meta-item"><strong>GRUPO TÉCNICO:</strong> <span>${grpCode}</span></div>
          <div class="meta-item"><strong>MODO DE DOCUMENTO:</strong> <span class="badge-mode">${escapeHtml(mode)}</span></div>
        </div>

        <table class="document-table">
          <thead>
            <tr>
              <th style="width: 40px;">N°</th>
              <th style="width: 130px;">CÓD. MATRÍCULA</th>
              <th style="width: 110px;">DNI / DOC</th>
              <th>APELLIDOS Y NOMBRES DEL ESTUDIANTE</th>
              <th style="width: 90px;">TURNO</th>
              <th style="width: 110px;">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="document-footer">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>JEFE/A DE TALLER</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>SECRETARIO/A ACADÉMICO/A</p>
          </div>
        </div>
      </div>
    `;
  }
}
