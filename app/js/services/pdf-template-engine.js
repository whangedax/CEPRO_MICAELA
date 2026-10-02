import { getDrawableBindings } from './document-binding-service.js';
import { DocumentFitService, DOCUMENT_STYLE_PROFILES } from './document-fit-service.js';
import { getV2PdfManifest, physicalFieldsOf } from './v2-document-manifest-registry.js';
import { DocumentPaginationPolicy, TMPL01_CANONICAL_CAPACITY } from './document-pagination-policy.js';
import { BRANDING_CONFIG } from '../config/branding-config.js';

/**
 * Motor Documental en base a PDF nativo (pdf-lib)
 */

export class PdfTemplateEngine {
  constructor() {
    this.fonts = {};
    this.canonicPdfs = {};
    this.fieldsConfig = {};
  }

  // Centrado vertical exacto usando métricas reales
  _getVerticallyCenteredBaseline(font, fontSize, box, pageHeight) {
    const ascent = (font.embedder.font.Ascender / 1000) * fontSize;
    const descent = (font.embedder.font.Descender / 1000) * fontSize;
    const pdfLibBottomY = pageHeight - box.y - box.h;
    
    // Baseline = offset(Y) inferior de la caja + (alto de la caja / 2) - centro tipográfico real
    return pdfLibBottomY + (box.h / 2) - ((ascent + descent) / 2);
  }

  _fitTextToBox(text, font, box, pageHeight, options) {
    let currentSize = options.maxFontSize;
    const minSize = options.minFontSize;
    const padding = options.paddingX || 0;
    
    // Padding A CADA LADO
    const availableWidth = box.w - (2 * padding);

    // Reducir fuente hasta que quepa
    while (currentSize >= minSize) {
      const textWidth = font.widthOfTextAtSize(text, currentSize);
      if (textWidth <= availableWidth) {
        break;
      }
      currentSize -= 0.1;
    }

    // Verificar si falló el fit
    const finalWidth = font.widthOfTextAtSize(text, currentSize);
    if (finalWidth > availableWidth) {
      const err = new Error(`El contenido no cabe en la caja de ${box.w}pt con minFontSize ${minSize}. Ancho disponible: ${availableWidth}pt, ancho medido: ${finalWidth}pt.`);
      err.name = 'EXPECTED_REJECTION';
      throw err;
    }

    // Calcular alineación horizontal
    let startX = box.x + padding; // Align left por defecto
    if (options.align === 'center') {
      startX = box.x + (box.w / 2) - (finalWidth / 2);
    } else if (options.align === 'right') {
      startX = box.x + box.w - padding - finalWidth;
    }

    const baselineY = this._getVerticallyCenteredBaseline(font, currentSize, box, pageHeight);

    return {
      text: text,
      x: startX,
      y: baselineY,
      size: currentSize,
      font: font
    };
  }

  /** Preflight tipográfico puro. Un campo largo nunca se omite silenciosamente. */
  fitTextOrThrow(text, font, box, pageHeight, options) {
    try { return this._fitTextToBox(text, font, box, pageHeight, options); }
    catch (error) {
      if (error.name === 'EXPECTED_REJECTION') {
        error.code = 'FIELD_OVERFLOW';
        error.fieldKey = options?.fieldKey || null;
      }
      throw error;
    }
  }

  _textBounds(drawArgs, pageHeight) {
    const ascent = (drawArgs.font.embedder.font.Ascender / 1000) * drawArgs.size;
    const descent = (drawArgs.font.embedder.font.Descender / 1000) * drawArgs.size;
    return {
      x: drawArgs.x,
      y: pageHeight - (drawArgs.y + ascent),
      width: drawArgs.font.widthOfTextAtSize(drawArgs.text, drawArgs.size),
      height: ascent - descent
    };
  }

  _rectanglesOverlap(left, right, epsilon = 0.05) {
    return left.x + left.width > right.x + epsilon && right.x + right.width > left.x + epsilon &&
      left.y + left.height > right.y + epsilon && right.y + right.height > left.y + epsilon;
  }

  _geometryConflict(templateId, fieldKey, conflictId) {
    const error = new Error(`GEOMETRY_CONFLICT: ${templateId}/${fieldKey} invade ${conflictId}.`);
    error.code = 'GEOMETRY_CONFLICT';
    error.templateId = templateId;
    error.fieldKey = fieldKey;
    error.conflictId = conflictId;
    return error;
  }

  async _loadResource(url, type = 'arrayBuffer') {
    let finalUrl = url;
    if (typeof window !== 'undefined' && window.location) {
      finalUrl = new URL(url, window.location.href).href;
    } else if (typeof url === 'string' && url.startsWith('/')) {
      finalUrl = `http://127.0.0.1:8081${url}`;
    }
    if (typeof fetch === 'function' && (finalUrl.startsWith('http://') || finalUrl.startsWith('https://'))) {
      try {
        const res = await fetch(finalUrl);
        if (res.ok) return type === 'json' ? res.json() : res.arrayBuffer();
      } catch (e) {
        // Fallback to local fs in Node if fetch fails
      }
    }
    try {
      const fs = await import('fs');
      const path = await import('path');
      let localPath = url;
      if (localPath.startsWith('http://') || localPath.startsWith('https://')) {
        localPath = new URL(localPath).pathname;
      }
      if (localPath.startsWith('/')) localPath = localPath.slice(1);
      const resolved = path.resolve(process.cwd(), localPath);
      const buf = fs.readFileSync(resolved);
      return type === 'json' ? JSON.parse(buf.toString('utf8')) : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch (fsErr) {
      throw new Error(`No se pudo cargar recurso: ${url}`);
    }
  }

  /**
   * Incrusta el logotipo oficial del CETPRO en una página PDF de forma dinámica en memoria.
   * Regla de no-regresión: Preserva intactas las plantillas canónicas base y sus 21 hashes SHA-256.
   * @param {object} pdfDoc Instancia de PDFDocument de pdf-lib
   * @param {object} page Instancia de PDFPage de pdf-lib
   * @param {string} templateId Identificador (ej. 'TMPL-04', 'TMPL-05', 'TMPL-11', 'TMPL-18', 'TMPL-19')
   * @param {object} [customBox] Coordenadas opcionales { x, y, width, height }
   */
  async _drawInstitutionalLogo(pdfDoc, page, templateId, customBox = null) {
    try {
      if (!BRANDING_CONFIG?.enabledInPdfs || !pdfDoc || !page) return;
      const box = customBox || BRANDING_CONFIG?.templates?.[templateId];
      if (!box) return;

      const logoBuffer = await this._loadResource(BRANDING_CONFIG.logoUrl, 'arrayBuffer');
      if (!logoBuffer) return;

      const embeddedLogo = await pdfDoc.embedJpg(logoBuffer);
      page.drawImage(embeddedLogo, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      });
    } catch (err) {
      console.warn(`[PdfTemplateEngine] Aviso: No se pudo incrustar el logo en ${templateId}:`, err?.message || err);
    }
  }

  async renderTMPL01(payload) {
    const rowCount = Array.isArray(payload?.studentsList) ? payload.studentsList.length : 0;
    DocumentPaginationPolicy.plan('TMPL-01', rowCount, { mode: 'CANONICAL' });
    // 1. Cargar PDF Canónico
    const pdfUrl = new URL('/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/01_NOMINA_DE_MATRICULA.pdf', window.location.href).href;
    const pdfBytes = await this._loadResource(pdfUrl, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize(); // height = 841.890

    // 2. Cargar fuente
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 3. Cargar manifiesto
    const fieldsConfigUrl = new URL('/app/data/TMPL01_PDF_FIELDS.json', window.location.href).href;
    const fieldsConfig = await this._loadResource(fieldsConfigUrl, 'json');

    // 4. Transformar payload a formato plano (fixture)
    const fixtureData = {};
    fixtureData['header.cetpro'] = payload.institution?.nombre || '';
    fixtureData['header.ugel'] = payload.institution?.ugel || '';
    fixtureData['header.gestionPublica'] = payload.institution?.tipoGestion === 'PÚBLICA' ? 'X' : '';
    fixtureData['header.direccion'] = payload.institution?.direccion || '';
    fixtureData['header.distrito'] = payload.institution?.distrito || '';
    fixtureData['header.lugar'] = payload.institution?.provincia || '';
    fixtureData['header.programa'] = payload.program?.nombre || '';
    fixtureData['header.codigoModular'] = payload.institution?.codigoModular || '';

    // Módulo oficial y resolución
    const moduleName = payload.module?.nombreOficial || payload.module?.nombre || '';
    fixtureData['header.modulo'] = moduleName;
    fixtureData['header.rdModulo'] = payload.module?.resolucion || payload.module?.resolucionDirectoral || '';

    // Periodo y fechas
    fixtureData['header.fechaInicio'] = payload.period?.fechaInicio || '';
    fixtureData['header.fechaTermino'] = payload.period?.fechaFin || payload.period?.fechaTermino || '';

    // Grupo (Turno, Ciclo, Sección)
    const turno = String(payload.group?.turno || '').trim().toUpperCase();
    fixtureData['header.turno'] = (turno && turno !== 'PENDIENTE') ? turno : '';

    const ciclo = String(payload.group?.ciclo || '').trim().toUpperCase();
    fixtureData['header.ciclo'] = (ciclo && ciclo !== 'PENDIENTE') ? ciclo : '';

    const seccion = String(payload.group?.seccion || '').trim().toUpperCase();
    fixtureData['header.seccion'] = (seccion && seccion !== 'PENDIENTE') ? seccion : '';
    
    let hombres = 0, mujeres = 0, gratuitos = 0, pagantes = 0, becarios = 0;
    
    const maxRows = rowCount;
    for (let i = 0; i < maxRows; i++) {
      const student = payload.studentsList[i];
      const nn = String(i + 1).padStart(2, '0');
      fixtureData[`row${nn}.nombre`] = student.apellidosNombres || '';
      fixtureData[`row${nn}.sexo`] = student.sexo || '';
      // Sin fecha confirmada el campo permanece vacío; el renderer no inventa datos.
      fixtureData[`row${nn}.fechaNacimiento`] = student.fechaNacimiento || '';
      
      // El contrato productivo usa H/M y el encabezado físico también indica H-M.
      if (student.sexo === 'H') hombres++;
      if (student.sexo === 'M') mujeres++;
    }

    const totalSexo = hombres + mujeres;
    if (totalSexo > 0 && payload?.suppressOfficialTotals !== true) {
      fixtureData['summary.hombres'] = String(hombres);
      fixtureData['summary.mujeres'] = String(mujeres);
      fixtureData['summary.totalSexo'] = String(totalSexo);
    }
    
    const totalCondicion = gratuitos + pagantes + becarios;
    if (totalCondicion > 0 && payload?.suppressOfficialTotals !== true) {
      fixtureData['summary.gratuitos'] = String(gratuitos);
      fixtureData['summary.pagantes'] = String(pagantes);
      fixtureData['summary.becarios'] = String(becarios);
      fixtureData['summary.totalCondicion'] = String(totalCondicion);
    }

    // 5. Dibujar cada campo
    for (const [key, text] of Object.entries(fixtureData)) {
      if (!text) continue;
      const box = fieldsConfig[key];
      if (box) {
        try {
          const drawArgs = this.fitTextOrThrow(text, font, box, height, {
            maxFontSize: box.maxFontSize,
            minFontSize: box.minFontSize,
            paddingX: box.paddingX,
            align: box.align,
            fieldKey: key
          });
          
          page.drawText(drawArgs.text, {
            x: drawArgs.x,
            y: drawArgs.y,
            size: drawArgs.size,
            font: drawArgs.font,
            color: rgb(0, 0, 0)
          });
        } catch (err) {
          throw err;
        }
      }
    }

    if (payload?.administrativeDraft === true || payload?.demoMode === true) {
      const watermark = payload?.demoMode === true
        ? 'DEMOSTRACIÓN — NO OFICIAL'
        : 'BORRADOR ADMINISTRATIVO — DATOS ACADÉMICOS PENDIENTES';
      page.drawText(watermark, {
        x: 132,
        y: 18,
        size: 7.5,
        font,
        color: rgb(0.48, 0.48, 0.48)
      });
    }

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-01');

    // 6. Generar PDF
    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /**
   * Salida administrativa multipágina. Cada página se renderiza desde una
   * copia independiente de la única página canónica TMPL-01. No consulta DB.
   */
  async renderAdministrativeTMPL01(payload = {}) {
    const inputRows = Array.isArray(payload.studentsList) ? payload.studentsList : [];
    const rows = inputRows.slice().sort((a, b) => {
      const nameA = String(a.apellidosNombres || a.studentName || '').trim();
      const nameB = String(b.apellidosNombres || b.studentName || '').trim();
      return nameA.localeCompare(nameB, 'es') || String(a.matriculaId || '').localeCompare(String(b.matriculaId || ''));
    });
    const chunks = DocumentPaginationPolicy.chunkRows('TMPL-01', rows, { mode: 'ADMINISTRATIVE_MULTIPAGE' });
    const plan = DocumentPaginationPolicy.plan('TMPL-01', rows.length, { mode: 'ADMINISTRATIVE_MULTIPAGE' });
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const output = await PDFDocument.create();
    const regular = await output.embedFont(StandardFonts.Helvetica);
    const bold = await output.embedFont(StandardFonts.HelveticaBold);

    for (let index = 0; index < chunks.length; index += 1) {
      const singlePageBlob = await this.renderTMPL01({
        institution: payload.institution,
        program: payload.program,
        module: payload.module,
        period: payload.period,
        group: payload.group,
        studentsList: chunks[index],
        suppressOfficialTotals: false,
        administrativeDraft: false,
        demoMode: false
      });
      const singlePage = await PDFDocument.load(await singlePageBlob.arrayBuffer());
      const [copied] = await output.copyPages(singlePage, [0]);
      output.addPage(copied);
      const pageRange = plan.pages[index];
      copied.drawText(`Página ${index + 1} de ${plan.pageCount} · Registros ${pageRange.startRecord}–${pageRange.endRecord}`, {
        x: 30, y: 18, size: 6.2, font: bold, color: rgb(0.32, 0.12, 0.12)
      });
      copied.drawText(`TOTAL GENERAL DEL GRUPO: ${rows.length} · REGISTROS EN ESTA PÁGINA: ${chunks[index].length}`, {
        x: 240, y: 18, size: 5.9, font: regular, color: rgb(0.32, 0.12, 0.12)
      });
      copied.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
        x: 30, y: 8, size: 5.9, font: bold, color: rgb(0.48, 0.18, 0.18)
      });
      if (payload.demoMode === true) copied.drawText('DEMOSTRACIÓN — NO OFICIAL', {
        x: 240, y: 8, size: 5.9, font: bold, color: rgb(0.48, 0.48, 0.48)
      });
    }
    const bytes = await output.save();
    this.lastAdministrativePagination = { templateId: 'TMPL-01', mode: 'ADMINISTRATIVE_MULTIPAGE',
      rowCount: rows.length, pageCount: plan.pageCount, capacityPerPage: TMPL01_CANONICAL_CAPACITY,
      chunkSizes: chunks.map(chunk => chunk.length), officialTotalsSuppressed: false,
      pages: plan.pages.map((pageRange, index) => ({ ...pageRange,
        matriculaIds: chunks[index].map(row => row.matriculaId).filter(Boolean) })) };
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async renderDocument(payload = {}) {
    const { documentType, mode, context, rows = [], demoMode = false } = payload;
    if (documentType === 'TMPL-01' && mode === 'ADMINISTRATIVE_MULTIPAGE') {
      return this.renderAdministrativeTMPL01({
        institution: context?.institution,
        program: context?.program,
        module: context?.module,
        period: context?.period,
        group: context?.group,
        studentsList: rows.map(row => ({
          matriculaId: row.enrollmentId ?? row.matriculaId ?? '',
          apellidosNombres: row.studentName ?? row.apellidosNombres ?? '',
          sexo: row.sex ?? row.sexo ?? '',
          fechaNacimiento: row.birthDate ?? row.fechaNacimiento ?? ''
        })),
        demoMode
      });
    }
    if (documentType === 'TMPL-03') {
      return this.renderAdministrativeTMPL03({
        institution: context?.institution,
        program: context?.program,
        module: context?.module,
        period: context?.period,
        group: context?.group,
        studentsList: rows.map(row => ({
          matriculaId: row.enrollmentId ?? row.matriculaId ?? '',
          apellidosNombres: row.studentName ?? row.apellidosNombres ?? '',
          apellidoPaterno: row.apellidoPaterno ?? '',
          apellidoMaterno: row.apellidoMaterno ?? '',
          nombres: row.nombres ?? row.nombre ?? '',
          tipoDocumento: row.tipoDocumento ?? row.documentType ?? 'DNI',
          numeroDocumento: row.numeroDocumento ?? row.documentNumber ?? row.document ?? row.numDoc ?? row.dni ?? row.codigoEstudiante ?? '',
          sexo: row.sex ?? row.sexo ?? '',
          fechaNacimiento: row.birthDate ?? row.fechaNacimiento ?? ''
        })),
        demoMode
      });
    }
    if (documentType === 'TMPL-04') {
      return this.renderTMPL04({ ...context, demoMode });
    }
    if (['TMPL-05', 'TMPL-06', 'TMPL-07', 'TMPL-08', 'TMPL-09', 'TMPL-10'].includes(documentType)) {
      return this.renderAttendanceDocument({ ...context, rows, documentType, demoMode });
    }
    if (['TMPL-11', 'TMPL-12', 'TMPL-13', 'TMPL-14', 'TMPL-15', 'TMPL-16', 'TMPL-17'].includes(documentType)) {
      return this.renderEvaluationDocument({ ...context, rows, documentType, demoMode });
    }
    if (documentType === 'TMPL-18') {
      return this.renderEFSRTDocument({ ...context, rows, documentType, demoMode });
    }
    if (documentType === 'TMPL-19') {
      return this.renderModularActDocument({ ...context, rows, documentType, demoMode });
    }
    if (documentType === 'TMPL-20') {
      return this.renderTMPL20({ ...context, rows, resolvedFieldSet: payload.resolvedFieldSet, demoMode, ...payload });
    }
    if (documentType === 'TMPL-21') {
      return this.renderTMPL21({ ...context, rows, resolvedFieldSet: payload.resolvedFieldSet, demoMode, ...payload });
    }
    throw new Error(`DOCUMENT_RENDER_MODE_UNSUPPORTED: ${documentType || 'UNKNOWN'}/${mode || 'UNKNOWN'}`);
  }

  async renderTMPL02(payload) {
    const drawableBindings = getDrawableBindings('TMPL-02', payload?.resolvedFieldSet);
    const pdfUrl = new URL('../sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/02_FICHA_DE_MATRICULA.pdf', window.location.href).href;
    const pdfBytes = await this._loadResource(pdfUrl, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const { box: configuredBox, text } of drawableBindings) {
      const box = {
        ...configuredBox,
        w: configuredBox.width,
        h: configuredBox.height
      };
      const font = configuredBox.styleProfile === 'PRIMARY_PERSON_NAME' || configuredBox.fontWeight === 'BOLD'
        ? boldFont : regularFont;
      const drawArgs = this.fitTextOrThrow(text, font, box, height, {
        maxFontSize: box.maxFontSize,
        minFontSize: box.minFontSize,
        paddingX: box.paddingX,
        align: box.align,
        fieldKey: configuredBox.contractKey
      });

      page.drawText(drawArgs.text, {
        x: drawArgs.x,
        y: drawArgs.y,
        size: drawArgs.size,
        font: drawArgs.font,
        color: rgb(0, 0, 0)
      });
    }

    if (payload?.demoMode === true) {
      page.drawText('DEMOSTRACIÓN — NO OFICIAL', {
        x: 130, y: 16, size: 8, font: boldFont, color: rgb(0.55, 0.18, 0.18)
      });
    }

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-02');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /**
   * Renderer físico común. Recibe datos ya resueltos y jamás consulta DB,
   * repositorios ni servicios académicos. Solo pinta cajas VERIFIED.
   */
  async renderFromManifest(templateId, resolvedFieldSet = {}, rows = [], counts = {}) {
    const manifest = getV2PdfManifest(templateId);
    if (!manifest) throw new Error(`Manifest inexistente: ${templateId}`);
    if (!Array.isArray(rows)) throw new Error('rows debe ser una lista sintética o previamente resuelta.');
    new DocumentFitService().validateCapacity(manifest, { rows: rows.length, detailRows: rows.length, ...counts });

    const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'http://127.0.0.1:8081';
    const pdfUrl = new URL(manifest.canonicalPdf, origin).href;
    const pdfBytes = await this._loadResource(pdfUrl, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    if (pages.length !== manifest.pages.length) throw new Error(`PAGE_COUNT_MISMATCH: ${templateId}`);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const valueOf = (entry) => {
      if (entry == null) return null;
      if (typeof entry !== 'object' || Array.isArray(entry)) return entry;
      if (entry.status && !['CONFIRMED','RESOLVED'].includes(entry.status)) return null;
      return entry.value;
    };
    const bindings = [];
    this.lastRenderDiagnostics = { templateId, fields: [] };
    for (const field of physicalFieldsOf(manifest)) {
      const rowIndex = Number(field.rowOffset || 0) + Number(field.occurrence || 0);
      const source = field.source === 'rows' ? rows[rowIndex] : resolvedFieldSet;
      let value = valueOf(source?.[field.canonicalKey]);
      if (Array.isArray(value)) value = value[Number(field.occurrence || 0)];
      if (value == null || value === '') continue;
      bindings.push({ field, text: String(value) });
    }

    const drawnBounds = [];
    for (const { field, text } of bindings) {
      const page = pages[field.page - 1];
      if (!page) throw new Error(`Página física ausente: ${templateId}/${field.page}`);
      const { height } = page.getSize();
      const profile = DOCUMENT_STYLE_PROFILES[field.styleProfile] || DOCUMENT_STYLE_PROFILES.TABLE_TEXT;
      const font = profile.fontWeight === 'bold' ? boldFont : regularFont;
      const box = { x: field.x, y: field.y, w: field.width, h: field.height };
      let drawArgs;
      try {
        drawArgs = this.fitTextOrThrow(text, font, box, height, {
          maxFontSize: field.maxFontSize || profile.maxFontSize,
          minFontSize: field.minFontSize || profile.minFontSize,
          paddingX: field.paddingX || 1, align: field.alignment || 'left',
          fieldKey: field.canonicalKey
        });
      } catch (error) {
        if (error.code === 'FIELD_OVERFLOW') this.lastRenderDiagnostics.fields.push({
          canonicalKey: field.canonicalKey, page: field.page, status: 'FIELD_OVERFLOW'
        });
        throw error;
      }
      const bounds = this._textBounds(drawArgs, height);
      const physicalBox = { x: field.x, y: field.y, width: field.width, height: field.height };
      if (bounds.x < physicalBox.x - 0.05 || bounds.y < physicalBox.y - 0.05 ||
          bounds.x + bounds.width > physicalBox.x + physicalBox.width + 0.05 ||
          bounds.y + bounds.height > physicalBox.y + physicalBox.height + 0.05) {
        const error = this._geometryConflict(templateId, field.canonicalKey, 'VARIABLE_BOX');
        this.lastRenderDiagnostics.fields.push({ canonicalKey: field.canonicalKey, page: field.page, status: 'GEOMETRY_CONFLICT' });
        throw error;
      }
      const reserved = (manifest.reservedRegions || []).find(region =>
        region.page === field.page && this._rectanglesOverlap(bounds, region));
      if (reserved) {
        const error = this._geometryConflict(templateId, field.canonicalKey, reserved.id || reserved.kind || 'RESERVED');
        this.lastRenderDiagnostics.fields.push({ canonicalKey: field.canonicalKey, page: field.page, status: 'GEOMETRY_CONFLICT' });
        throw error;
      }
      const variable = drawnBounds.find(item => item.page === field.page && this._rectanglesOverlap(bounds, item.bounds));
      if (variable) {
        const error = this._geometryConflict(templateId, field.canonicalKey, `VARIABLE:${variable.canonicalKey}`);
        this.lastRenderDiagnostics.fields.push({ canonicalKey: field.canonicalKey, page: field.page, status: 'GEOMETRY_CONFLICT' });
        throw error;
      }
      page.drawText(drawArgs.text, { x: drawArgs.x, y: drawArgs.y, size: drawArgs.size,
        font: drawArgs.font, color: rgb(0, 0, 0) });
      drawnBounds.push({ canonicalKey: field.canonicalKey, page: field.page, bounds });
      this.lastRenderDiagnostics.fields.push({ canonicalKey: field.canonicalKey, page: field.page, status: 'DRAWN' });
    }

    await this._drawInstitutionalLogo(pdfDoc, pages[0], templateId);

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async renderTMPL04(payload = {}) {
    const manifest = getV2PdfManifest('TMPL-04');
    if (!manifest) throw new Error('Manifest inexistente: TMPL-04');

    const pdfUrl = new URL(manifest.canonicalPdf, window.location.origin).href;
    const pdfBytes = await this._loadResource(pdfUrl, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    if (!page) throw new Error('Página física ausente en TMPL-04');
    const { height: pageHeight } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const sanitize = val => {
      if (val === null || val === undefined) return '';
      const str = String(val).trim();
      if (str === 'null' || str === 'undefined' || str === 'PENDIENTE') return '';
      return str;
    };

    const inst = payload.institution || {};
    const prog = payload.program || {};
    const mod = payload.module || {};
    const grp = payload.group || {};
    const per = payload.period || {};
    const rfs = payload.resolvedFieldSet || {};

    const values = {
      'institution.name': sanitize(rfs['institution.name'] || rfs['institution.nombre'] || inst.nombreInstitucion || inst.nombre || ''),
      'program.name': sanitize(rfs['program.name'] || rfs['program.nombre'] || prog.nombre || prog.name || ''),
      'module.name': sanitize(rfs['module.name'] || rfs['module.nombre'] || mod.nombre || mod.name || ''),
      'institution.dre': sanitize(rfs['institution.dre'] || inst.dre || ''),
      'institution.ugel': sanitize(rfs['institution.ugel'] || inst.ugel || ''),
      'institution.tipoGestion': sanitize(rfs['institution.tipoGestion'] || inst.tipoGestion || ''),
      'group.ciclo': sanitize(rfs['group.ciclo'] || grp.ciclo || prog.ciclo || ''),
      'curriculum.hours': sanitize(rfs['curriculum.hours'] || (mod.horas ? `${mod.horas} HORAS` : '')),
      'curriculum.credits': sanitize(rfs['curriculum.credits'] || (mod.creditos ? `${mod.creditos} CRÉDITOS` : '')),
      'period.fechaInicio': sanitize(rfs['period.fechaInicio'] || per.fechaInicio || grp.fechaInicio || ''),
      'period.fechaTermino': sanitize(rfs['period.fechaTermino'] || per.fechaTermino || per.fechaFin || grp.fechaTermino || ''),
      'group.turno': sanitize(rfs['group.turno'] || grp.turno || ''),
      'group.seccion': sanitize(rfs['group.seccion'] || grp.seccion || ''),
      'teacher.name': sanitize(rfs['teacher.name'] || grp.docente || payload.teacher || ''),
      'period.year': sanitize(rfs['period.year'] || per.anio || per.year || (per.fechaInicio ? String(per.fechaInicio).slice(0, 4) : ''))
    };

    const fields = physicalFieldsOf(manifest);
    this.lastRenderDiagnostics = { templateId: 'TMPL-04', fields: [] };

    for (const field of fields) {
      const text = values[field.canonicalKey];
      if (!text) continue;

      const profile = DOCUMENT_STYLE_PROFILES[field.styleProfile] || DOCUMENT_STYLE_PROFILES.HEADER_VALUE;
      const font = (profile.fontWeight === 'bold' || field.styleProfile === 'INSTITUTION_NAME' || field.styleProfile === 'PROGRAM_NAME' || field.styleProfile === 'MODULE_NAME')
        ? boldFont : regularFont;

      const box = { x: field.x, y: field.y, w: field.width, h: field.height };

      let drawArgs;
      try {
        drawArgs = this.fitTextOrThrow(text, font, box, pageHeight, {
          maxFontSize: field.maxFontSize || profile.maxFontSize,
          minFontSize: field.minFontSize || profile.minFontSize,
          paddingX: field.paddingX || 2,
          align: field.alignment || 'left',
          fieldKey: field.canonicalKey
        });
      } catch (error) {
        if (error.code === 'FIELD_OVERFLOW') {
          this.lastRenderDiagnostics.fields.push({
            canonicalKey: field.canonicalKey, page: 1, status: 'FIELD_OVERFLOW'
          });
        }
        throw error;
      }

      page.drawText(drawArgs.text, {
        x: drawArgs.x,
        y: drawArgs.y,
        size: drawArgs.size,
        font: drawArgs.font,
        color: rgb(0, 0, 0)
      });

      this.lastRenderDiagnostics.fields.push({
        canonicalKey: field.canonicalKey, page: 1, status: 'DRAWN'
      });
    }

    if (payload.demoMode === true) {
      page.drawText('DEMOSTRACIÓN — NO OFICIAL', {
        x: 134.2,
        y: 25,
        size: 7.5,
        font: boldFont,
        color: rgb(0.55, 0.18, 0.18)
      });
    } else if (payload.administrativeDraft !== false) {
      page.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
        x: 134.2,
        y: 25,
        size: 7.5,
        font: boldFont,
        color: rgb(0.48, 0.18, 0.18)
      });
    }

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-04');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  _splitStudentName(rawName) {
    const raw = String(rawName || '').trim();
    if (!raw) return { paterno: '', materno: '', nombres: '' };
    if (raw.includes(',')) {
      const [apPart, nomPart] = raw.split(',');
      const tokens = apPart.trim().split(/\s+/).filter(Boolean);
      let paterno = '';
      let materno = '';
      if (tokens.length === 1) {
        paterno = tokens[0];
      } else if (tokens.length === 2) {
        paterno = tokens[0];
        materno = tokens[1];
      } else if (tokens.length >= 3) {
        materno = tokens[tokens.length - 1];
        paterno = tokens.slice(0, tokens.length - 1).join(' ');
      }
      return {
        paterno,
        materno,
        nombres: nomPart ? nomPart.trim() : ''
      };
    }
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length >= 4) {
      return {
        paterno: tokens[0],
        materno: tokens[1],
        nombres: tokens.slice(2).join(' ')
      };
    }
    if (tokens.length === 3) {
      return {
        paterno: tokens[0],
        materno: tokens[1],
        nombres: tokens[2]
      };
    }
    if (tokens.length === 2) {
      return {
        paterno: tokens[0],
        materno: '',
        nombres: tokens[1]
      };
    }
    return {
      paterno: tokens[0] || '',
      materno: '',
      nombres: ''
    };
  }

  async renderTMPL03(payload = {}) {
    const manifest = getV2PdfManifest('TMPL-03');
    if (!manifest) throw new Error('Manifest inexistente: TMPL-03');

    const canonicalRel = manifest.canonicalPdf || '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/03_REGISTRO_DE_MATRICULA_MODULAR.pdf';
    const pdfBytes = await this._loadResource(canonicalRel, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    if (!page) throw new Error('Página física ausente en TMPL-03');
    const { height: pageHeight } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const sanitize = val => {
      if (val === null || val === undefined) return '';
      const str = String(val).trim();
      if (str === 'null' || str === 'undefined' || str === 'PENDIENTE') return '';
      return str;
    };

    const inst = payload.institution || {};
    const prog = payload.program || {};
    const mod = payload.module || {};
    const grp = payload.group || {};
    const per = payload.period || {};
    const rfs = payload.resolvedFieldSet || {};
    const rawStudents = Array.isArray(payload.studentsList) ? payload.studentsList : (Array.isArray(payload.rows) ? payload.rows : []);
    const students = rawStudents.slice(0, 20);

    // 1. Neutralizar la columna ordinal de numeración (x ≈ 18..35, y ≈ 355..1057)
    // con un parche blanco limpio para eliminar los "15" preimpresos corruptos del fondo ministerial
    page.drawRectangle({
      x: 18.0,
      y: 354.7,
      width: 16.5,
      height: 703.0,
      color: rgb(1, 1, 1)
    });

    // 2. Neutralizar el área colapsada corrupta debajo de la fila 20 (y < 354.7 pt)
    page.drawRectangle({
      x: 17.5,
      y: 22.0,
      width: 804.0,
      height: 332.7,
      color: rgb(1, 1, 1)
    });
    // Línea de cierre inferior de la cuadrícula de 20 filas
    page.drawLine({
      start: { x: 18.0, y: 354.7 },
      end: { x: 821.5, y: 354.7 },
      thickness: 0.8,
      color: rgb(0, 0, 0)
    });

    // 3. Estampar sobre el parche la numeración correlativa limpia y real de la página
    const pageOffset = payload.pageOffset || 0;
    for (let i = 0; i < students.length; i++) {
      const rowOrdinal = pageOffset + i + 1;
      const rowY = 134.5 + i * 35.10;
      const ordinalBox = { x: 18.5, y: rowY, w: 16.0, h: 33.0 };
      const numFit = this.fitTextOrThrow(String(rowOrdinal), boldFont, ordinalBox, pageHeight, {
        maxFontSize: 7.0, minFontSize: 5.0, paddingX: 0.5, align: 'center', fieldKey: `ordinal[${i}]`
      });
      page.drawText(numFit.text, {
        x: numFit.x, y: numFit.y, size: numFit.size, font: boldFont, color: rgb(0, 0, 0)
      });
    }

    const fields = physicalFieldsOf(manifest);
    this.lastRenderDiagnostics = { templateId: 'TMPL-03', fields: [] };

    for (const field of fields) {
      const occurrence = field.occurrence ?? 0;
      if (occurrence >= students.length) continue;

      const student = students[occurrence] || {};
      let text = '';

      switch (field.canonicalKey) {
        case 'institution.ugel':
          text = sanitize(rfs['institution.ugel'] || inst.ugel || '');
          break;
        case 'institution.codigoModular':
          text = sanitize(rfs['institution.codigoModular'] || inst.codigoModular || '');
          break;
        case 'institution.nombre':
          text = sanitize(rfs['institution.nombre'] || rfs['institution.name'] || inst.nombreInstitucion || inst.nombre || '');
          break;
        case 'program.nombre':
          text = sanitize(rfs['program.nombre'] || rfs['program.name'] || prog.nombre || prog.name || '');
          break;
        case 'group.ciclo':
          text = sanitize(rfs['group.ciclo'] || grp.ciclo || prog.ciclo || '');
          break;
        case 'institution.resolucionPrograma':
          text = sanitize(rfs['institution.resolucionPrograma'] || inst.resolucionPrograma || inst.resolucionCreacion || prog.resolucion || '');
          break;
        case 'module.nombre':
          text = sanitize(rfs['module.nombre'] || rfs['module.name'] || mod.nombreOficial || mod.nombre || mod.name || '');
          break;
        case 'student.tipoDocumento':
          text = sanitize(student.tipoDocumento || student.documentType || 'DNI');
          break;
        case 'student.numeroDocumento':
          text = sanitize(student.numeroDocumento || student.documentNumber || student.document || student.dni || student.numDoc || student.codigoEstudiante || '');
          break;
        case 'student.apellidoPaterno': {
          let pat = student.apellidoPaterno || '';
          if (!pat && !student.apellidoMaterno && !student.nombres) {
            const split = this._splitStudentName(student.apellidosNombres || student.studentName || '');
            pat = split.paterno;
          }
          text = sanitize(pat);
          break;
        }
        case 'student.apellidoMaterno': {
          let mat = student.apellidoMaterno || '';
          if (!mat && !student.apellidoPaterno && !student.nombres) {
            const split = this._splitStudentName(student.apellidosNombres || student.studentName || '');
            mat = split.materno;
          }
          text = sanitize(mat);
          break;
        }
        case 'student.nombres': {
          let nom = student.nombres || student.nombre || '';
          if (!nom && !student.apellidoPaterno && !student.apellidoMaterno) {
            const split = this._splitStudentName(student.apellidosNombres || student.studentName || '');
            nom = split.nombres;
          }
          text = sanitize(nom);
          break;
        }
        case 'student.sexo':
          text = sanitize(student.sexo || student.sex || '');
          break;
        case 'student.fechaNacimiento': {
          const rawDate = sanitize(student.fechaNacimiento || student.birthDate || '');
          if (!rawDate) break;
          let d = '', m = '', y = '';
          if (rawDate.includes('-')) {
            const parts = rawDate.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
              else { d = parts[0]; m = parts[1]; y = parts[2]; }
            }
          } else if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              if (parts[2].length === 4) { d = parts[0]; m = parts[1]; y = parts[2]; }
              else { y = parts[0]; m = parts[1]; d = parts[2]; }
            }
          }
          if (d && m && y) {
            // Desglosar limpiamente en Día, Mes, Año para evitar colisiones
            const baseBox = { x: field.x, y: field.y, w: field.width, h: field.height };
            const dayBox = { x: baseBox.x, y: baseBox.y, w: 12.0, h: baseBox.h };
            const monthBox = { x: baseBox.x + 12.0, y: baseBox.y, w: 12.0, h: baseBox.h };
            const yearBox = { x: baseBox.x + 24.0, y: baseBox.y, w: 14.8, h: baseBox.h };

            const dayFit = this.fitTextOrThrow(d, regularFont, dayBox, pageHeight, { maxFontSize: 6.5, minFontSize: 4.5, align: 'center', fieldKey: `birth.day[${occurrence}]` });
            const monthFit = this.fitTextOrThrow(m, regularFont, monthBox, pageHeight, { maxFontSize: 6.5, minFontSize: 4.5, align: 'center', fieldKey: `birth.month[${occurrence}]` });
            const yearFit = this.fitTextOrThrow(y, regularFont, yearBox, pageHeight, { maxFontSize: 6.5, minFontSize: 4.5, align: 'center', fieldKey: `birth.year[${occurrence}]` });

            page.drawText(dayFit.text, { x: dayFit.x, y: dayFit.y, size: dayFit.size, font: dayFit.font, color: rgb(0, 0, 0) });
            page.drawText(monthFit.text, { x: monthFit.x, y: monthFit.y, size: monthFit.size, font: monthFit.font, color: rgb(0, 0, 0) });
            page.drawText(yearFit.text, { x: yearFit.x, y: yearFit.y, size: yearFit.size, font: yearFit.font, color: rgb(0, 0, 0) });
            continue;
          }
          text = rawDate;
          break;
        }
        default:
          text = sanitize(rfs[field.canonicalKey] || '');
      }

      if (!text) continue;

      const font = regularFont;
      const box = { x: field.x, y: field.y, w: field.width, h: field.height };

      let drawArgs;
      try {
        drawArgs = this.fitTextOrThrow(text, font, box, pageHeight, {
          maxFontSize: field.maxFontSize || 7.5,
          minFontSize: field.minFontSize || 4.0,
          paddingX: field.paddingX ?? 1,
          align: field.alignment || 'left',
          fieldKey: `${field.canonicalKey}[${occurrence}]`
        });
      } catch (error) {
        if (error.code === 'FIELD_OVERFLOW') {
          this.lastRenderDiagnostics.fields.push({
            canonicalKey: field.canonicalKey, occurrence, page: 1, status: 'FIELD_OVERFLOW'
          });
        }
        throw error;
      }

      page.drawText(drawArgs.text, {
        x: drawArgs.x,
        y: drawArgs.y,
        size: drawArgs.size,
        font: drawArgs.font,
        color: rgb(0, 0, 0)
      });

      this.lastRenderDiagnostics.fields.push({
        canonicalKey: field.canonicalKey, occurrence, page: 1, status: 'DRAWN'
      });
    }

    if (payload.administrativeDraft !== false) {
      page.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
        x: 40,
        y: 12,
        size: 7.0,
        font: boldFont,
        color: rgb(0.48, 0.18, 0.18)
      });
    }
    if (payload.demoMode === true) {
      page.drawText('DEMOSTRACIÓN — NO OFICIAL', {
        x: 240,
        y: 12,
        size: 7.0,
        font: boldFont,
        color: rgb(0.48, 0.48, 0.48)
      });
    }

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-03');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async renderAdministrativeTMPL03(payload = {}) {
    const inputRows = Array.isArray(payload.studentsList) ? payload.studentsList : (Array.isArray(payload.rows) ? payload.rows : []);
    const rows = inputRows.slice().sort((a, b) => {
      const nameA = String(a.apellidosNombres || a.studentName || `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombres || ''}`).trim();
      const nameB = String(b.apellidosNombres || b.studentName || `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombres || ''}`).trim();
      return nameA.localeCompare(nameB, 'es') || String(a.matriculaId || a.studentId || '').localeCompare(String(b.matriculaId || b.studentId || ''));
    });

    const CHUNK_SIZE = 20;
    const chunks = [];
    if (rows.length === 0) {
      chunks.push([]);
    } else {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunks.push(rows.slice(i, i + CHUNK_SIZE));
      }
    }

    const { PDFDocument, StandardFonts, rgb } = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : await import('pdf-lib');
    const output = await PDFDocument.create();
    const regular = await output.embedFont(StandardFonts.Helvetica);
    const bold = await output.embedFont(StandardFonts.HelveticaBold);
    const pageCount = chunks.length;
    let currentStart = 1;

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const startRecord = chunk.length > 0 ? currentStart : 0;
      const endRecord = chunk.length > 0 ? (currentStart + chunk.length - 1) : 0;
      currentStart += chunk.length;

      const singlePageBlob = await this.renderTMPL03({
        institution: payload.institution,
        program: payload.program,
        module: payload.module,
        period: payload.period,
        group: payload.group,
        resolvedFieldSet: payload.resolvedFieldSet,
        studentsList: chunk,
        pageOffset: startRecord > 0 ? (startRecord - 1) : 0,
        administrativeDraft: false,
        demoMode: false
      });
      const singlePage = await PDFDocument.load(await singlePageBlob.arrayBuffer());
      const [copied] = await output.copyPages(singlePage, [0]);
      output.addPage(copied);

      copied.drawText(`Página ${index + 1} de ${pageCount} · Registros ${startRecord}–${endRecord}`, {
        x: 40, y: 25, size: 7.5, font: bold, color: rgb(0.32, 0.12, 0.12)
      });
      copied.drawText(`TOTAL GENERAL DEL GRUPO: ${rows.length} · REGISTROS EN ESTA PÁGINA: ${chunk.length}`, {
        x: 240, y: 25, size: 7.0, font: regular, color: rgb(0.32, 0.12, 0.12)
      });
      copied.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
        x: 40, y: 12, size: 7.0, font: bold, color: rgb(0.48, 0.18, 0.18)
      });
      if (payload.demoMode === true) {
        copied.drawText('DEMOSTRACIÓN — NO OFICIAL', {
          x: 240, y: 12, size: 7.0, font: bold, color: rgb(0.48, 0.48, 0.48)
        });
      }
    }

    const bytes = await output.save();
    this.lastAdministrativePagination = {
      templateId: 'TMPL-03',
      mode: 'ADMINISTRATIVE_MULTIPAGE',
      rowCount: rows.length,
      pageCount: pageCount,
      capacityPerPage: CHUNK_SIZE,
      chunkSizes: chunks.map(chunk => chunk.length)
    };
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async renderAttendanceDocument(payload = {}) {
    // 1. Resolver documentType o mapear por unit.orden (Guard B-001)
    let docType = payload.documentType;
    const order = Number(payload.unit?.orden ?? payload.unidad?.orden ?? payload.orden ?? payload.order ?? (docType ? Number(docType.replace('TMPL-', '')) - 4 : 1));
    if (order > 6 || order < 1) {
      const error = new Error('B-001: no existe plantilla física de asistencia para esta unidad.');
      error.code = 'TEMPLATE_NOT_AVAILABLE';
      throw error;
    }

    if (!docType) {
      docType = `TMPL-${String(order + 4).padStart(2, '0')}`;
    } else {
      const docNum = Number(docType.replace('TMPL-', ''));
      if (docNum < 5 || docNum > 10) {
        const error = new Error('B-001: no existe plantilla física de asistencia para esta unidad.');
        error.code = 'TEMPLATE_NOT_AVAILABLE';
        throw error;
      }
    }

    const manifest = getV2PdfManifest(docType);
    if (!manifest) throw new Error(`Manifest inexistente: ${docType}`);

    const maxSessions = manifest.capacity?.sessions || 44;
    const maxRows = manifest.capacity?.rows || 40;

    // 2. Row capacity validation
    const rawRows = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload.studentsList) ? payload.studentsList : []);
    if (rawRows.length > maxRows) {
      const error = new Error(`CAPACITY_EXCEEDED: rows ${rawRows.length} > ${maxRows} en ${docType}.`);
      error.code = 'CAPACITY_EXCEEDED';
      error.templateId = docType;
      throw error;
    }

    // 3. Session capacity validation
    const rawSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    if (rawSessions.length > maxSessions) {
      const error = new Error(`SESSION_CAPACITY_EXCEEDED: sessions ${rawSessions.length} > ${maxSessions} en ${docType}.`);
      error.code = 'SESSION_CAPACITY_EXCEEDED';
      error.templateId = docType;
      throw error;
    }

    const PDFLib = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : require('pdf-lib');
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'http://127.0.0.1:8081';
    const pdfUrl = new URL(manifest.canonicalPdf, origin).href;
    const pdfBytes = await this._loadResource(pdfUrl, 'arrayBuffer');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    if (!page) throw new Error(`Página física ausente en ${docType}`);
    const { height: pageHeight } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0.1, 0.1, 0.1);

    const sanitize = val => {
      if (val == null) return '';
      const str = String(val).trim();
      return (str === 'null' || str === 'undefined' || str === 'PENDIENTE') ? '' : str;
    };

    const inst = payload.institution || {};
    const prog = payload.program || {};
    const mod = payload.module || {};
    const grp = payload.group || {};
    const per = payload.period || {};
    const uni = payload.unit || payload.unidad || {};
    const rfs = payload.resolvedFieldSet || {};

    const programName = sanitize(rfs['program.name']?.value ?? rfs['program.name'] ?? prog.nombre ?? prog.name);
    const periodName = sanitize(rfs['period.name']?.value ?? rfs['period.name'] ?? per.nombre ?? per.name);
    const moduleName = sanitize(rfs['module.name']?.value ?? rfs['module.name'] ?? mod.nombre ?? mod.name);
    const unitName = sanitize(rfs['curriculum.unit.name']?.value ?? rfs['curriculum.unit.name'] ?? uni.nombre ?? uni.name);
    const institutionName = sanitize(rfs['institution.name']?.value ?? rfs['institution.name'] ?? inst.nombre ?? inst.name);
    const turno = sanitize(grp.turno ?? payload.turno);
    const ciclo = sanitize(grp.ciclo ?? payload.ciclo);
    const seccion = sanitize(grp.seccion ?? payload.seccion);

    const originX = manifest.grid?.originX || 284.46;
    const stepX = manifest.grid?.stepX || 15.9873;
    const cellW = manifest.grid?.cellWidth || 15.99;
    const studentField = (manifest.fields || []).find(f => f.canonicalKey === 'student.fullName');
    const studentX = studentField?.box?.x || 103.18;
    const studentW = studentField?.box?.w || 181.28;
    const presField = (manifest.fields || []).find(f => f.canonicalKey === 'attendance.presentCount');
    const absField = (manifest.fields || []).find(f => f.canonicalKey === 'attendance.absentCount');
    const totPX = presField?.box?.x || (originX + maxSessions * stepX);
    const totFX = absField?.box?.x || (totPX + 37.0);

    // Cabecera institucional (alineada al borde izquierdo del cuadro informativo y sin chocar con 'CENTRO DE EDUCACIÓN TÉCNICO PRODUCTIVA' que inicia en x: 474.4)
    if (institutionName) {
      try {
        const instFit = this.fitTextOrThrow(institutionName, boldFont, { x: 103.2, y: 22.0, w: 360.0, h: 12.0 }, pageHeight, {
          maxFontSize: 8.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.name'
        });
        page.drawText(instFit.text, { x: instFit.x, y: instFit.y, size: instFit.size, font: boldFont, color });
      } catch (e) { /* ignore */ }
    }

    // Programa de Estudios
    if (programName) {
      const pFit = this.fitTextOrThrow(programName, boldFont, { x: originX, y: 37.45, w: 463.63, h: 12.72 }, pageHeight, {
        maxFontSize: 8.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'program.name'
      });
      page.drawText(pFit.text, { x: pFit.x, y: pFit.y, size: pFit.size, font: boldFont, color });
    }

    // Periodo Académico + Turno + Ciclo + Sección
    let periodText = periodName;
    const details = [turno ? `TURNO: ${turno}` : '', ciclo ? `CICLO: ${ciclo}` : '', seccion ? `SECCIÓN: ${seccion}` : ''].filter(Boolean).join('   ·   ');
    if (details) periodText = periodText ? `${periodText}   ·   ${details}` : details;
    if (periodText) {
      const perFit = this.fitTextOrThrow(periodText, regularFont, { x: originX, y: 50.17, w: 463.63, h: 12.73 }, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'period.name'
      });
      page.drawText(perFit.text, { x: perFit.x, y: perFit.y, size: perFit.size, font: regularFont, color });
    }

    // Módulo Formativo
    if (moduleName) {
      const modFit = this.fitTextOrThrow(moduleName, boldFont, { x: originX, y: 62.90, w: 463.63, h: 12.73 }, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'module.name'
      });
      page.drawText(modFit.text, { x: modFit.x, y: modFit.y, size: modFit.size, font: boldFont, color });
    }

    // Unidad Didáctica
    if (unitName) {
      const uniFit = this.fitTextOrThrow(unitName, boldFont, { x: originX, y: 75.63, w: 463.63, h: 12.73 }, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'curriculum.unit.name'
      });
      page.drawText(uniFit.text, { x: uniFit.x, y: uniFit.y, size: uniFit.size, font: boldFont, color });
    }

    // Ordenamiento A-Z de estudiantes
    const sortedStudents = rawRows.slice().sort((a, b) => {
      const nameA = sanitize(a['student.fullName'] || a.studentDisplayName || a.apellidosNombres || a.studentName || `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombres || ''}`);
      const nameB = sanitize(b['student.fullName'] || b.studentDisplayName || b.apellidosNombres || b.studentName || `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombres || ''}`);
      return nameA.localeCompare(nameB, 'es') || String(a.matriculaId || a.id || '').localeCompare(String(b.matriculaId || b.id || ''));
    });

    // Fechas de sesión
    for (let j = 0; j < rawSessions.length; j++) {
      const session = rawSessions[j];
      const rawDate = sanitize(session.fecha || session.date || '');
      let dateText = rawDate.includes('-') ? rawDate.slice(8, 10) : (rawDate || String(j + 1).padStart(2, '0'));
      const dateBox = {
        x: originX + j * stepX,
        y: 136.35,
        w: cellW,
        h: 12.72
      };
      const dateFit = this.fitTextOrThrow(dateText, boldFont, dateBox, pageHeight, {
        maxFontSize: 6.5, minFontSize: 4.0, paddingX: 0.5, align: 'center', fieldKey: `sessionDate.${j}`
      });
      page.drawText(dateFit.text, { x: dateFit.x, y: dateFit.y, size: dateFit.size, font: boldFont, color });
    }

    // Filas de estudiantes (hasta 40)
    for (let i = 0; i < sortedStudents.length; i++) {
      const student = sortedStudents[i];
      const rowY = 149.07 + i * 11.99;

      // Nombre completo del estudiante
      const studentName = sanitize(student['student.fullName'] || student.studentDisplayName || student.apellidosNombres || student.studentName || `${student.apellidoPaterno || ''} ${student.apellidoMaterno || ''} ${student.nombres || ''}`);
      if (studentName) {
        const nameBox = { x: studentX, y: rowY, w: studentW, h: 11.99 };
        const nameFit = this.fitTextOrThrow(studentName, regularFont, nameBox, pageHeight, {
          maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: `student.${i}.fullName`
        });
        page.drawText(nameFit.text, { x: nameFit.x, y: nameFit.y, size: nameFit.size, font: regularFont, color });
      }

      // Marcas por sesión
      const marksList = Array.isArray(student.marksBySession)
        ? student.marksBySession
        : (Array.isArray(student.marks) ? student.marks : []);

      for (let j = 0; j < rawSessions.length; j++) {
        const session = rawSessions[j];
        const markObj = marksList.find(m => m.sessionId === session.sessionId) || marksList[j] || null;
        const state = String(markObj?.estadoRegistro || markObj?.state || markObj || '').toUpperCase();

        let markChar = '—';
        if (state === 'PRESENTE' || state === 'ASISTIO' || state === 'P') markChar = 'P';
        else if (state === 'AUSENTE' || state === 'FALTA' || state === 'FALTA_INJUSTIFICADA' || state === 'F') markChar = 'F';
        else if (state === 'JUSTIFICADA' || state === 'JUSTIFICADO' || state === 'FALTA_JUSTIFICADA' || state === 'J') markChar = 'J';
        else if (state === 'SIN_REGISTRO' || !state) markChar = '—';

        const markBox = {
          x: originX + j * stepX,
          y: rowY,
          w: cellW,
          h: 11.99
        };
        const isDash = markChar === '—';
        const markFont = isDash ? regularFont : boldFont;
        const markFit = this.fitTextOrThrow(markChar, markFont, markBox, pageHeight, {
          maxFontSize: 7.0, minFontSize: 5.0, paddingX: 0.5, align: 'center', fieldKey: `mark.${i}.${j}`
        });
        page.drawText(markFit.text, {
          x: markFit.x, y: markFit.y, size: markFit.size, font: markFont,
          color: isDash ? rgb(0.5, 0.5, 0.5) : color
        });
      }

      // Totales operativos
      const presCount = student['attendance.presentCount'] ?? student.counts?.presentCount ?? student.presentCount;
      if (presCount != null && presCount !== '') {
        const pBox = { x: totPX, y: rowY, w: 36.99, h: 11.99 };
        const pFit = this.fitTextOrThrow(String(presCount), boldFont, pBox, pageHeight, {
          maxFontSize: 7.5, minFontSize: 5.0, paddingX: 0.5, align: 'center', fieldKey: `presentCount.${i}`
        });
        page.drawText(pFit.text, { x: pFit.x, y: pFit.y, size: pFit.size, font: boldFont, color });
      }

      const absCount = student['attendance.absentCount'] ?? student.counts?.absentCount ?? student.absentCount;
      if (absCount != null && absCount !== '') {
        const aBox = { x: totFX, y: rowY, w: 37.0, h: 11.99 };
        const aFit = this.fitTextOrThrow(String(absCount), boldFont, aBox, pageHeight, {
          maxFontSize: 7.5, minFontSize: 5.0, paddingX: 0.5, align: 'center', fieldKey: `absentCount.${i}`
        });
        page.drawText(aFit.text, { x: aFit.x, y: aFit.y, size: aFit.size, font: boldFont, color });
      }

      // % Inasistencias (B-003): Permanece estrictamente en blanco.
    }

    // Leyendas y marcas de agua
    page.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
      x: 40,
      y: 25,
      size: 7.5,
      font: boldFont,
      color: rgb(0.45, 0.45, 0.45)
    });

    if (payload.demoMode === true) {
      page.drawText('DEMOSTRACIÓN — NO OFICIAL', {
        x: 240,
        y: 25,
        size: 7.5,
        font: boldFont,
        color: rgb(0.7, 0.1, 0.1)
      });
    }

    page.drawText(`ESTUDIANTES: ${sortedStudents.length} · SESIONES REGISTRADAS: ${rawSessions.length} DE ${maxSessions}`, {
      x: 420,
      y: 25,
      size: 7.5,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35)
    });

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-05');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  renderAttendanceTMPL05(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-05' }); }
  renderTMPL05(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-05' }); }
  renderTMPL06(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-06' }); }
  renderTMPL07(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-07' }); }
  renderTMPL08(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-08' }); }
  renderTMPL09(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-09' }); }
  renderTMPL10(payload={}) { return this.renderAttendanceDocument({ ...payload, documentType: 'TMPL-10' }); }
  async renderEvaluationDocument(payload = {}) {
    // 1. Resolver documentType o mapear por unit.orden
    let docType = payload.documentType;
    const order = Number(payload.unit?.orden ?? payload.unidad?.orden ?? payload.orden ?? payload.order ?? (docType ? Number(docType.replace('TMPL-', '')) - 10 : 1));
    if (order > 7 || order < 1) {
      const error = new Error('B-001/B-002: no existe plantilla física de evaluación para esta unidad (rango admitido UD1 a UD7).');
      error.code = 'TEMPLATE_NOT_AVAILABLE';
      throw error;
    }

    if (!docType) {
      docType = `TMPL-${String(order + 10).padStart(2, '0')}`;
    } else {
      const docNum = Number(docType.replace('TMPL-', ''));
      if (docNum < 11 || docNum > 17) {
        const error = new Error('B-001/B-002: no existe plantilla física de evaluación para esta unidad (rango admitido UD1 a UD7).');
        error.code = 'TEMPLATE_NOT_AVAILABLE';
        throw error;
      }
    }

    const manifest = getV2PdfManifest(docType);
    if (!manifest) throw new Error(`Manifest inexistente: ${docType}`);

    const maxRows = manifest.capacity?.rows || (docType === 'TMPL-11' ? 47 : 40);

    // 2. Validación de sobrecapacidad de estudiantes (filas)
    const rawRows = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload.studentsList) ? payload.studentsList : (Array.isArray(payload.estudiantes) ? payload.estudiantes : []));
    if (rawRows.length > maxRows) {
      const error = new Error(`CAPACITY_EXCEEDED: rows ${rawRows.length} > ${maxRows} en ${docType}.`);
      error.code = 'CAPACITY_EXCEEDED';
      error.templateId = docType;
      throw error;
    }

    // 3. Cargar binario canónico oficial
    const canonicalRel = manifest.canonicalPdf || `/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/${docType === 'TMPL-11' ? '11_EVALUACION_IL_UD1' : `${order + 10}_EVALUACION_UD${order}`}.pdf`;
    const pdfBytes = await this._loadResource(canonicalRel, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { height: pageHeight } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0, 0, 0);

    const sanitize = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val).trim();
      if (s === 'null' || s === 'undefined' || s === 'PENDIENTE') return '';
      return s;
    };

    const inst = payload.institution || payload.institucion || {};
    const prog = payload.program || payload.programa || {};
    const mod = payload.module || payload.modulo || {};
    const per = payload.period || payload.periodo || {};
    const uni = payload.unit || payload.unidad || {};
    const grp = payload.group || payload.grupo || {};
    const rfs = payload.resolvedFieldSet || {};

    const programName = sanitize(rfs['program.name']?.value ?? rfs['program.name'] ?? prog.nombre ?? prog.name);
    const periodName = sanitize(rfs['period.name']?.value ?? rfs['period.name'] ?? per.nombre ?? per.name);
    const moduleName = sanitize(rfs['module.name']?.value ?? rfs['module.name'] ?? mod.nombre ?? mod.name);
    const unitName = sanitize(rfs['curriculum.unit.name']?.value ?? rfs['curriculum.unit.name'] ?? uni.nombre ?? uni.name);
    const institutionName = sanitize(rfs['institution.name']?.value ?? rfs['institution.name'] ?? inst.nombre ?? inst.name);
    const capacityText = sanitize(rfs['curriculum.unit.capacity']?.value ?? rfs['curriculum.unit.capacity'] ?? uni.capacidad ?? payload.capacidad);
    const turno = sanitize(grp.turno ?? payload.turno);
    const ciclo = sanitize(grp.ciclo ?? payload.ciclo);
    const seccion = sanitize(grp.seccion ?? payload.seccion);

    const getFieldBox = (key, fallback) => {
      const f = manifest.fields?.find(field => field.canonicalKey === key);
      return f?.box || fallback;
    };

    // Cabecera institucional
    if (institutionName) {
      try {
        const instBox = getFieldBox('institution.name', { x: 542.0, y: 98.0, w: 270.0, h: 14.0 });
        const instFit = this.fitTextOrThrow(institutionName, boldFont, instBox, pageHeight, {
          maxFontSize: 8.0, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'institution.name'
        });
        page.drawText(instFit.text, { x: instFit.x, y: instFit.y, size: instFit.size, font: boldFont, color });
      } catch (e) {}
    }

    // Programa de Estudios
    if (programName) {
      const progBox = getFieldBox('program.name', { x: 255.0, y: 112.0, w: 565.0, h: 13.0 });
      const pFit = this.fitTextOrThrow(programName, boldFont, progBox, pageHeight, {
        maxFontSize: 8.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'program.name'
      });
      page.drawText(pFit.text, { x: pFit.x, y: pFit.y, size: pFit.size, font: boldFont, color });
    }

    // Periodo Académico + Turno + Ciclo + Sección
    let periodText = periodName;
    const details = [turno ? `TURNO: ${turno}` : '', ciclo ? `CICLO: ${ciclo}` : '', seccion ? `SECCIÓN: ${seccion}` : ''].filter(Boolean).join('   ·   ');
    if (details) periodText = periodText ? `${periodText}   ·   ${details}` : details;
    if (periodText) {
      const perBox = getFieldBox('period.name', { x: 255.0, y: 124.0, w: 565.0, h: 13.0 });
      const perFit = this.fitTextOrThrow(periodText, regularFont, perBox, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'period.name'
      });
      page.drawText(perFit.text, { x: perFit.x, y: perFit.y, size: perFit.size, font: regularFont, color });
    }

    // Módulo Formativo
    if (moduleName) {
      const modBox = getFieldBox('module.name', { x: 255.0, y: 136.0, w: 565.0, h: 13.0 });
      const modFit = this.fitTextOrThrow(moduleName, boldFont, modBox, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'module.name'
      });
      page.drawText(modFit.text, { x: modFit.x, y: modFit.y, size: modFit.size, font: boldFont, color });
    }

    // Unidad Didáctica
    if (unitName) {
      const uniBox = getFieldBox('curriculum.unit.name', { x: 255.0, y: 148.0, w: 565.0, h: 13.0 });
      const uniFit = this.fitTextOrThrow(unitName, boldFont, uniBox, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'curriculum.unit.name'
      });
      page.drawText(uniFit.text, { x: uniFit.x, y: uniFit.y, size: uniFit.size, font: boldFont, color });
    }

    // Capacidad de la Unidad Didáctica
    if (capacityText) {
      const capBox = getFieldBox('curriculum.unit.capacity', { x: 255.0, y: 167.0, w: 565.0, h: 13.0 });
      const capFit = this.fitTextOrThrow(capacityText, regularFont, capBox, pageHeight, {
        maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'curriculum.unit.capacity'
      });
      page.drawText(capFit.text, { x: capFit.x, y: capFit.y, size: capFit.size, font: regularFont, color });
    }

    // Textos de los 5 Indicadores de Logro
    const rawIndicators = Array.isArray(payload.indicators) ? payload.indicators : (Array.isArray(payload.indicadores) ? payload.indicadores : []);
    for (let k = 0; k < 5; k++) {
      const indVal = rawIndicators[k];
      const indText = sanitize(typeof indVal === 'string' ? indVal : (indVal?.descripcion || indVal?.nombre || indVal?.text || rfs[`curriculum.indicator.${k+1}`]?.value));
      if (indText) {
        const ilBox = getFieldBox(`curriculum.indicator.${k+1}`, { x: 255.0, y: 194.0 + (k * 27.7), w: 565.0, h: 14.0 });
        const ilFit = this.fitTextOrThrow(indText, regularFont, ilBox, pageHeight, {
          maxFontSize: 7.0, minFontSize: 3.5, paddingX: 1, align: 'left', fieldKey: `curriculum.indicator.${k+1}`
        });
        page.drawText(ilFit.text, { x: ilFit.x, y: ilFit.y, size: ilFit.size, font: regularFont, color });
      }
    }

    // Ordenamiento alfabético A-Z de los estudiantes
    const sortedStudents = [...rawRows].sort((a, b) => {
      const nameA = (a['student.fullName'] || a.studentDisplayName || a.apellidosNombres || a.studentName || `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombres || ''}`).trim();
      const nameB = (b['student.fullName'] || b.studentDisplayName || b.apellidosNombres || b.studentName || `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombres || ''}`).trim();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    // Filas de Estudiantes y Matriz de Notas
    const studentX = manifest.grid?.studentX || 34.55;
    const studentW = manifest.grid?.studentW || 210.42;
    const originY = manifest.grid?.originY || 369.22;
    const stepY = manifest.grid?.stepY || 14.215;
    const originX = manifest.grid?.originX || 245.0;
    const stepX_IL = manifest.grid?.stepX_IL || 106.86;
    const subcolsConfig = manifest.grid?.subcols || {
      ia1: { offsetX: 0.0, width: 19.26 },
      ia2: { offsetX: 19.26, width: 19.26 },
      ia3: { offsetX: 38.52, width: 19.26 },
      il:  { offsetX: 57.78, width: 31.28 },
      r:   { offsetX: 89.06, width: 17.80 }
    };
    const logroConfig = manifest.grid?.finalResult || { x: 779.3, width: 42.0 };

    const formatVigesimal = (score) => {
      if (score === null || score === undefined || score === '' || score === 'null' || score === 'undefined') return '';
      const num = Number(score);
      if (isNaN(num)) return '';
      const clamped = Math.min(20, Math.max(0, Math.round(num)));
      return String(clamped).padStart(2, '0');
    };

    for (let i = 0; i < sortedStudents.length; i++) {
      const student = sortedStudents[i];
      const rowY = originY + i * stepY;

      // Nombre completo del estudiante
      const studentName = sanitize(student['student.fullName'] || student.studentDisplayName || student.apellidosNombres || student.studentName || `${student.apellidoPaterno || ''} ${student.apellidoMaterno || ''} ${student.nombres || ''}`);
      if (studentName) {
        const nameBox = { x: studentX, y: rowY, w: studentW, h: stepY };
        const nameFit = this.fitTextOrThrow(studentName, regularFont, nameBox, pageHeight, {
          maxFontSize: 7.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: `student.${i}.fullName`
        });
        page.drawText(nameFit.text, { x: nameFit.x, y: nameFit.y, size: nameFit.size, font: regularFont, color });
      }

      // Matriz de Evaluación (5 IL x 5 columnas [IA1, IA2, IA3, IL, R])
      const evalList = Array.isArray(student.evaluations) ? student.evaluations : (Array.isArray(student.evaluacion) ? student.evaluacion : (Array.isArray(student.indicators) ? student.indicators : []));

      for (let k = 0; k < 5; k++) {
        const ev = evalList[k] || {};
        const xBlock = originX + k * stepX_IL;

        const subcols = [
          { key: 'ia1', val: ev.ia1 ?? student[`evaluation.ia1.${k}`], x: xBlock + subcolsConfig.ia1.offsetX, w: subcolsConfig.ia1.width },
          { key: 'ia2', val: ev.ia2 ?? student[`evaluation.ia2.${k}`], x: xBlock + subcolsConfig.ia2.offsetX, w: subcolsConfig.ia2.width },
          { key: 'ia3', val: ev.ia3 ?? student[`evaluation.ia3.${k}`], x: xBlock + subcolsConfig.ia3.offsetX, w: subcolsConfig.ia3.width },
          { key: 'il',  val: ev.score ?? ev.il ?? ev.nota ?? student[`evaluation.il.${k}`], x: xBlock + subcolsConfig.il.offsetX, w: subcolsConfig.il.width },
          { key: 'r',   val: ev.recovery ?? ev.r ?? student[`evaluation.r.${k}`], x: xBlock + subcolsConfig.r.offsetX, w: subcolsConfig.r.width }
        ];

        for (const sub of subcols) {
          const formatted = formatVigesimal(sub.val);
          if (formatted) {
            const cellFit = this.fitTextOrThrow(formatted, boldFont, { x: sub.x, y: rowY, w: sub.w, h: stepY }, pageHeight, {
              maxFontSize: 6.5, minFontSize: 4.5, paddingX: 0.5, align: 'center', fieldKey: `eval.${i}.${k}.${sub.key}`
            });
            page.drawText(cellFit.text, { x: cellFit.x, y: cellFit.y, size: cellFit.size, font: boldFont, color });
          }
        }
      }

      // Columna de Logro Final de la Unidad Didáctica
      const finalLogro = student.finalResult ?? student.logro ?? student.unitResult ?? student['evaluation.unitResult'];
      const formattedLogro = formatVigesimal(finalLogro);
      if (formattedLogro) {
        const logroFit = this.fitTextOrThrow(formattedLogro, boldFont, { x: logroConfig.x, y: rowY, w: logroConfig.width, h: stepY }, pageHeight, {
          maxFontSize: 7.0, minFontSize: 5.0, paddingX: 1, align: 'center', fieldKey: `student.${i}.logro`
        });
        page.drawText(logroFit.text, { x: logroFit.x, y: logroFit.y, size: logroFit.size, font: boldFont, color });
      }
    }

    // Marcas de agua reglamentarias
    if (payload.administrativeDraft === true || payload.demoMode === true || payload.official !== true) {
      const watermark = payload.demoMode === true
        ? 'DEMOSTRACIÓN — NO OFICIAL'
        : 'BORRADOR ADMINISTRATIVO — NO OFICIAL';
      page.drawText(watermark, {
        x: 40,
        y: 20,
        size: 7.5,
        font: boldFont,
        color: rgb(0.55, 0.2, 0.2)
      });
    }

    page.drawText(`ESTUDIANTES: ${sortedStudents.length} DE ${maxRows} · UNIDAD DIDÁCTICA ${order}`, {
      x: 300,
      y: 20,
      size: 7.5,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35)
    });

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-11');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  renderEvaluationTMPL11(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-11' }); }
  renderTMPL11(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-11' }); }
  renderTMPL12(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-12' }); }
  renderTMPL13(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-13' }); }
  renderTMPL14(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-14' }); }
  renderTMPL15(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-15' }); }
  renderTMPL16(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-16' }); }
  renderTMPL17(payload={}) { return this.renderEvaluationDocument({ ...payload, documentType: 'TMPL-17' }); }
  async renderEFSRTDocument(payload = {}) {
    const docType = 'TMPL-18';
    const manifest = getV2PdfManifest(docType);
    if (!manifest) throw new Error(`Manifest inexistente: ${docType}`);

    const maxRows = manifest.capacity?.rows || 40;
    const rawRows = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload.studentsList) ? payload.studentsList : (Array.isArray(payload.estudiantes) ? payload.estudiantes : []));

    // 1. Validación de sobrecapacidad fail-closed
    if (rawRows.length > maxRows) {
      const error = new Error(`CAPACITY_EXCEEDED: rows ${rawRows.length} > ${maxRows} en ${docType}.`);
      error.code = 'CAPACITY_EXCEEDED';
      error.templateId = docType;
      throw error;
    }

    // 2. Cargar binario canónico oficial
    const canonicalRel = manifest.canonicalPdf || '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/18_CONSOLIDADO_EFSRT.pdf';
    const pdfBytes = await this._loadResource(canonicalRel, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts } = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { height: pageHeight } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0, 0, 0);

    const sanitize = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val).trim();
      if (s === 'null' || s === 'undefined' || s === 'PENDIENTE') return '';
      return s;
    };

    const inst = payload.institution || payload.institucion || {};
    const mod = payload.module || payload.modulo || {};
    const doc = payload.document || payload.docente || {};
    const efsrt = payload.efsrt || {};
    const rfs = payload.resolvedFieldSet || {};

    const institutionName = sanitize(rfs['institution.name']?.value ?? inst.nombre ?? inst.name);
    const moduleName = sanitize(rfs['module.name']?.value ?? mod.nombre ?? mod.name);
    const hoursText = sanitize(rfs['efsrt.hours']?.value ?? efsrt.horas ?? efsrt.hours ?? payload.horas ?? payload.hours);
    const teacherName = sanitize(rfs['document.teacherName']?.value ?? doc.nombre ?? doc.teacherName ?? payload.teacherName ?? payload.docenteNombre);
    const startDateText = sanitize(rfs['efsrt.startDate']?.value ?? efsrt.fechaInicio ?? efsrt.startDate ?? payload.fechaInicio);
    const endDateText = sanitize(rfs['efsrt.endDate']?.value ?? efsrt.fechaTermino ?? efsrt.endDate ?? payload.fechaTermino);

    const getFieldBox = (key, fallback) => {
      const f = manifest.fields?.find(field => field.canonicalKey === key);
      return f?.box || fallback;
    };

    // Cabecera institucional
    if (institutionName) {
      const instBox = getFieldBox('institution.name', { x: 95.0, y: 263.0, w: 450.0, h: 14.0 });
      const instFit = this.fitTextOrThrow(institutionName, boldFont, instBox, pageHeight, {
        maxFontSize: 8.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'institution.name'
      });
      page.drawText(instFit.text, { x: instFit.x, y: instFit.y, size: instFit.size, font: boldFont, color });
    }

    if (moduleName) {
      const modBox = getFieldBox('module.name', { x: 95.0, y: 277.5, w: 450.0, h: 14.0 });
      const modFit = this.fitTextOrThrow(moduleName, boldFont, modBox, pageHeight, {
        maxFontSize: 8.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'module.name'
      });
      page.drawText(modFit.text, { x: modFit.x, y: modFit.y, size: modFit.size, font: boldFont, color });
    }

    if (hoursText) {
      const hoursBox = getFieldBox('efsrt.hours', { x: 670.0, y: 277.5, w: 140.0, h: 14.0 });
      const hoursFit = this.fitTextOrThrow(hoursText, boldFont, hoursBox, pageHeight, {
        maxFontSize: 8.0, minFontSize: 5.0, paddingX: 1, align: 'left', fieldKey: 'efsrt.hours'
      });
      page.drawText(hoursFit.text, { x: hoursFit.x, y: hoursFit.y, size: hoursFit.size, font: boldFont, color });
    }

    if (teacherName) {
      const teachBox = getFieldBox('document.teacherName', { x: 95.0, y: 292.0, w: 380.0, h: 14.0 });
      const teachFit = this.fitTextOrThrow(teacherName, regularFont, teachBox, pageHeight, {
        maxFontSize: 8.0, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'document.teacherName'
      });
      page.drawText(teachFit.text, { x: teachFit.x, y: teachFit.y, size: teachFit.size, font: regularFont, color });
    }

    if (startDateText) {
      const sBox = getFieldBox('efsrt.startDate', { x: 565.0, y: 292.0, w: 70.0, h: 14.0 });
      const sFit = this.fitTextOrThrow(startDateText, regularFont, sBox, pageHeight, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'efsrt.startDate'
      });
      page.drawText(sFit.text, { x: sFit.x, y: sFit.y, size: sFit.size, font: regularFont, color });
    }

    if (endDateText) {
      const eBox = getFieldBox('efsrt.endDate', { x: 720.0, y: 292.0, w: 90.0, h: 14.0 });
      const eFit = this.fitTextOrThrow(endDateText, regularFont, eBox, pageHeight, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'efsrt.endDate'
      });
      page.drawText(eFit.text, { x: eFit.x, y: eFit.y, size: eFit.size, font: regularFont, color });
    }

    // 3. Ordenamiento alfabético determinista A-Z de los estudiantes
    const sortedStudents = [...rawRows].sort((a, b) => {
      const nameA = (a['student.fullName'] || a.studentDisplayName || a.apellidosNombres || a.studentName || `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombres || ''}`).trim();
      const nameB = (b['student.fullName'] || b.studentDisplayName || b.apellidosNombres || b.studentName || `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombres || ''}`).trim();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    const formatVigesimal = (score) => {
      if (score === null || score === undefined || score === '' || score === 'null' || score === 'undefined') return '';
      const num = Number(score);
      if (isNaN(num)) return '';
      const clamped = Math.min(20, Math.max(0, Math.round(num)));
      return String(clamped).padStart(2, '0');
    };

    const formatCriterion = (score, maxVal = 3) => {
      if (score === null || score === undefined || score === '' || score === 'null' || score === 'undefined') return '';
      const num = Number(score);
      if (isNaN(num)) return '';
      const clamped = Math.min(maxVal, Math.max(0, Math.round(num)));
      return String(clamped);
    };

    const grid = manifest.grid || {
      rows: 40,
      originY: 405.49,
      stepY: 13.6,
      code: { x: 43.89, width: 49.4 },
      student: { x: 93.29, width: 185.8 },
      company: { x: 279.09, width: 139.7 },
      address: { x: 418.79, width: 139.7 },
      criteria: { originX: 558.49, stepX: 26.325, width: 26.325, count: 9 },
      finalScore: { x: 795.4, width: 35.0 }
    };

    const criteriaMax = [3, 2, 2, 3, 3, 3, 1, 2, 1];

    // 4. Filas de Estudiantes y Matriz de Prácticas
    for (let i = 0; i < sortedStudents.length; i++) {
      const student = sortedStudents[i];
      const rowY = grid.originY + i * grid.stepY;

      // Código de matrícula / estudiante
      const codeVal = sanitize(student['enrollment.code'] || student.code || student.codigoMatricula || student.studentCode);
      if (codeVal) {
        const codeFit = this.fitTextOrThrow(codeVal, regularFont, { x: grid.code.x, y: rowY, w: grid.code.width, h: grid.stepY }, pageHeight, {
          maxFontSize: 6.5, minFontSize: 4.0, paddingX: 0.5, align: 'center', fieldKey: `student.${i}.code`
        });
        page.drawText(codeFit.text, { x: codeFit.x, y: codeFit.y, size: codeFit.size, font: regularFont, color });
      }

      // Nombre completo del estudiante
      const studentName = sanitize(student['student.fullName'] || student.studentDisplayName || student.apellidosNombres || student.studentName || `${student.apellidoPaterno || ''} ${student.apellidoMaterno || ''} ${student.nombres || ''}`);
      if (studentName) {
        const nameFit = this.fitTextOrThrow(studentName, regularFont, { x: grid.student.x, y: rowY, w: grid.student.width, h: grid.stepY }, pageHeight, {
          maxFontSize: 7.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: `student.${i}.fullName`
        });
        page.drawText(nameFit.text, { x: nameFit.x, y: nameFit.y, size: nameFit.size, font: regularFont, color });
      }

      // Salvaguarda B-005: Si no tiene práctica registrada, celdas de empresa, dirección, criterios y nota quedan 100% limpias en blanco
      const companyName = sanitize(student['efsrt.companyName'] || student.companyName || student.empresa);
      const companyAddress = sanitize(student['efsrt.companyAddress'] || student.companyAddress || student.direccionEmpresa);
      const criteriaList = Array.isArray(student.criteria) ? student.criteria : (Array.isArray(student.criterios) ? student.criterios : []);
      const finalGrade = student['efsrt.finalGrade'] ?? student.finalGrade ?? student['efsrt.finalScore'] ?? student.finalScore ?? student.notaFinal ?? student.calificacionFinal;

      if (companyName) {
        const compFit = this.fitTextOrThrow(companyName, regularFont, { x: grid.company.x, y: rowY, w: grid.company.width, h: grid.stepY }, pageHeight, {
          maxFontSize: 6.5, minFontSize: 3.5, paddingX: 1, align: 'left', fieldKey: `student.${i}.company`
        });
        page.drawText(compFit.text, { x: compFit.x, y: compFit.y, size: compFit.size, font: regularFont, color });
      }

      if (companyAddress) {
        const addrFit = this.fitTextOrThrow(companyAddress, regularFont, { x: grid.address.x, y: rowY, w: grid.address.width, h: grid.stepY }, pageHeight, {
          maxFontSize: 6.5, minFontSize: 3.5, paddingX: 1, align: 'left', fieldKey: `student.${i}.address`
        });
        page.drawText(addrFit.text, { x: addrFit.x, y: addrFit.y, size: addrFit.size, font: regularFont, color });
      }

      // 9 Criterios de evaluación (CT1..3, OP1..3, DA1..3)
      for (let c = 0; c < 9; c++) {
        const critVal = criteriaList[c] ?? student[`criterion.${c + 1}`] ?? student[`efsrt.criterion.${c + 1}`];
        const formattedCrit = formatCriterion(critVal, criteriaMax[c]);
        if (formattedCrit) {
          const critX = grid.criteria.originX + c * grid.criteria.stepX;
          const critFit = this.fitTextOrThrow(formattedCrit, boldFont, { x: critX, y: rowY, w: grid.criteria.width, h: grid.stepY }, pageHeight, {
            maxFontSize: 6.5, minFontSize: 4.5, paddingX: 0.5, align: 'center', fieldKey: `student.${i}.crit.${c + 1}`
          });
          page.drawText(critFit.text, { x: critFit.x, y: critFit.y, size: critFit.size, font: boldFont, color });
        }
      }

      // Calificación final vigesimal
      const formattedGrade = formatVigesimal(finalGrade);
      if (formattedGrade) {
        const gradeFit = this.fitTextOrThrow(formattedGrade, boldFont, { x: grid.finalScore.x, y: rowY, w: grid.finalScore.width, h: grid.stepY }, pageHeight, {
          maxFontSize: 7.0, minFontSize: 5.0, paddingX: 1, align: 'center', fieldKey: `student.${i}.finalGrade`
        });
        page.drawText(gradeFit.text, { x: gradeFit.x, y: gradeFit.y, size: gradeFit.size, font: boldFont, color });
      }
    }

    // Marcas de agua reglamentarias
    if (payload.administrativeDraft === true || payload.demoMode === true || payload.official !== true) {
      const watermark = payload.demoMode === true
        ? 'DEMOSTRACIÓN — NO OFICIAL'
        : 'BORRADOR ADMINISTRATIVO — NO OFICIAL';
      page.drawText(watermark, {
        x: 40,
        y: 20,
        size: 7.5,
        font: boldFont,
        color: rgb(0.4, 0.4, 0.4)
      });
    }

    page.drawText(`ESTUDIANTES: ${sortedStudents.length} DE ${maxRows} · CONSOLIDADO EFSRT`, {
      x: 300,
      y: 20,
      size: 7.5,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35)
    });

    await this._drawInstitutionalLogo(pdfDoc, page, 'TMPL-18');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async renderModularActDocument(payload = {}) {
    const docType = 'TMPL-19';
    const manifest = getV2PdfManifest(docType);
    if (!manifest) throw new Error(`Manifest inexistente: ${docType}`);

    const maxRows = manifest.capacity?.rows || 40;
    const rawRows = Array.isArray(payload.rows) ? payload.rows : (Array.isArray(payload.studentsList) ? payload.studentsList : (Array.isArray(payload.estudiantes) ? payload.estudiantes : []));

    // 1. Fail-closed: Verificación de sobrecapacidad vertical (> 40 estudiantes)
    if (rawRows.length > maxRows) {
      const error = new Error(`CAPACITY_EXCEEDED: rows ${rawRows.length} > ${maxRows} en ${docType}.`);
      error.code = 'CAPACITY_EXCEEDED';
      error.templateId = docType;
      throw error;
    }

    // 2. Fail-closed: Verificación de módulo formativo asignado
    const mod = payload.module || payload.modulo || {};
    const grp = payload.group || payload.grupo || {};
    const hasModule = Boolean(mod.id || mod.nombre || mod.name || grp.moduloId || grp.moduleId || payload.moduloId || payload.moduleId);
    if (!hasModule) {
      const error = new Error('ACADEMIC_CONFIGURATION_PENDING: Grupo sin módulo formativo asignado para emisión de Acta Modular (TMPL-19).');
      error.code = 'ACADEMIC_CONFIGURATION_PENDING';
      error.templateId = docType;
      throw error;
    }

    // 3. Cargar binario canónico oficial
    const canonicalRel = manifest.canonicalPdf || '/sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/19_ACTA_DE_EVALUACION_MODULAR.pdf';
    const pdfBytes = await this._loadResource(canonicalRel, 'arrayBuffer');
    const { PDFDocument, rgb, StandardFonts, degrees } = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages[1];
    const { height: pageHeight1 } = page1.getSize();
    const { height: pageHeight2 } = page2.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(0, 0, 0);

    const sanitize = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val).trim();
      if (s === 'null' || s === 'undefined' || s === 'PENDIENTE') return '';
      return s;
    };

    const inst = payload.institution || payload.institucion || {};
    const prog = payload.program || payload.programa || {};
    const doc = payload.document || payload.docente || {};
    const period = payload.period || payload.periodo || {};
    const rfs = payload.resolvedFieldSet || {};

    const getFieldBox = (key, fallback) => {
      const f = manifest.physicalFields?.find(field => field.canonicalKey === key);
      return f ? { x: f.x, y: f.y, w: f.width, h: f.height } : fallback;
    };

    // 4. Cabeceras institucionales (Página 1)
    const institutionName = sanitize(rfs['institution.name']?.value ?? inst.nombre ?? inst.name);
    if (institutionName) {
      const box = getFieldBox('institution.name', { x: 170.0, y: 141.3, w: 340.0, h: 23.6 });
      const fit = this.fitTextOrThrow(institutionName, boldFont, box, pageHeight1, {
        maxFontSize: 8.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'institution.name'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: boldFont, color });
    }

    const tipoGestion = sanitize(rfs['institution.tipoGestion']?.value ?? inst.tipoGestion ?? 'PÚBLICA DE GESTIÓN DIRECTA');
    if (tipoGestion) {
      const box = getFieldBox('institution.tipoGestion', { x: 170.0, y: 164.9, w: 160.0, h: 23.6 });
      const fit = this.fitTextOrThrow(tipoGestion, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'institution.tipoGestion'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const codigoModular = sanitize(rfs['institution.codigoModular']?.value ?? inst.codigoModular ?? inst.modularCode);
    if (codigoModular) {
      const box = getFieldBox('institution.codigoModular', { x: 425.0, y: 164.9, w: 88.0, h: 23.6 });
      const fit = this.fitTextOrThrow(codigoModular, boldFont, box, pageHeight1, {
        maxFontSize: 8.0, minFontSize: 5.0, paddingX: 1, align: 'center', fieldKey: 'institution.codigoModular'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: boldFont, color });
    }

    const resAuto = sanitize(rfs['institution.resolucionAutorizacion']?.value ?? inst.resolucionAutorizacion ?? inst.resolucionCreacion ?? inst.resolucion);
    if (resAuto) {
      const box = getFieldBox('institution.resolucionAutorizacion', { x: 170.0, y: 188.5, w: 105.0, h: 23.7 });
      const fit = this.fitTextOrThrow(resAuto, regularFont, box, pageHeight1, {
        maxFontSize: 7.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.resolucionAutorizacion'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const resConv = sanitize(rfs['institution.resolucionConversion']?.value ?? inst.resolucionConversion);
    if (resConv) {
      const box = getFieldBox('institution.resolucionConversion', { x: 425.0, y: 188.5, w: 88.0, h: 23.7 });
      const fit = this.fitTextOrThrow(resConv, regularFont, box, pageHeight1, {
        maxFontSize: 7.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.resolucionConversion'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const dre = sanitize(rfs['institution.dre']?.value ?? inst.dre ?? payload.dre ?? 'DRE LIMA METROPOLITANA');
    if (dre) {
      const box = getFieldBox('institution.dre', { x: 125.0, y: 235.8, w: 95.0, h: 23.6 });
      const fit = this.fitTextOrThrow(dre, regularFont, box, pageHeight1, {
        maxFontSize: 7.0, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'institution.dre'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const ugel = sanitize(rfs['institution.ugel']?.value ?? inst.ugel ?? payload.ugel ?? 'UGEL 03');
    if (ugel) {
      const box = getFieldBox('institution.ugel', { x: 284.0, y: 235.8, w: 225.0, h: 23.6 });
      const fit = this.fitTextOrThrow(ugel, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: 'institution.ugel'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const region = sanitize(rfs['institution.region']?.value ?? inst.region ?? payload.region ?? 'LIMA');
    if (region) {
      const box = getFieldBox('institution.region', { x: 125.0, y: 259.4, w: 150.0, h: 23.6 });
      const fit = this.fitTextOrThrow(region, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.region'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const provincia = sanitize(rfs['institution.provincia']?.value ?? inst.provincia ?? payload.provincia ?? 'LIMA');
    if (provincia) {
      const box = getFieldBox('institution.provincia', { x: 340.0, y: 259.4, w: 170.0, h: 23.6 });
      const fit = this.fitTextOrThrow(provincia, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.provincia'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const distrito = sanitize(rfs['institution.distrito']?.value ?? inst.distrito ?? payload.distrito ?? 'BREÑA');
    if (distrito) {
      const box = getFieldBox('institution.distrito', { x: 125.0, y: 283.0, w: 150.0, h: 23.6 });
      const fit = this.fitTextOrThrow(distrito, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.distrito'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const lugar = sanitize(rfs['institution.lugar']?.value ?? inst.lugar ?? payload.lugar ?? 'BREÑA');
    if (lugar) {
      const box = getFieldBox('institution.lugar', { x: 340.0, y: 283.0, w: 170.0, h: 23.6 });
      const fit = this.fitTextOrThrow(lugar, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.lugar'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const direccion = sanitize(rfs['institution.direccion']?.value ?? inst.direccion ?? payload.direccion);
    if (direccion) {
      const box = getFieldBox('institution.direccion', { x: 125.0, y: 306.6, w: 385.0, h: 23.7 });
      const fit = this.fitTextOrThrow(direccion, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'institution.direccion'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const programName = sanitize(rfs['program.name']?.value ?? prog.nombre ?? prog.name);
    if (programName) {
      const box = getFieldBox('program.name', { x: 968.0, y: 164.9, w: 200.0, h: 23.6 });
      const fit = this.fitTextOrThrow(programName, boldFont, box, pageHeight1, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'program.name'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: boldFont, color });
    }

    const ciclo = sanitize(rfs['group.ciclo']?.value ?? grp.ciclo ?? prog.ciclo ?? 'TÉCNICO');
    if (ciclo) {
      const box = getFieldBox('group.ciclo', { x: 1072.0, y: 188.5, w: 98.0, h: 23.7 });
      const fit = this.fitTextOrThrow(ciclo, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'center', fieldKey: 'group.ciclo'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const moduleName = sanitize(rfs['module.name']?.value ?? mod.nombre ?? mod.name);
    if (moduleName) {
      const box = getFieldBox('module.name', { x: 968.0, y: 235.8, w: 200.0, h: 23.6 });
      const fit = this.fitTextOrThrow(moduleName, boldFont, box, pageHeight1, {
        maxFontSize: 8.0, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: 'module.name'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: boldFont, color });
    }

    const modRes = sanitize(rfs['module.resolucionAutorizacion']?.value ?? mod.resolucionAutorizacion ?? mod.resolucion);
    if (modRes) {
      const box = getFieldBox('module.resolucionAutorizacion', { x: 1072.0, y: 259.4, w: 98.0, h: 23.6 });
      const fit = this.fitTextOrThrow(modRes, regularFont, box, pageHeight1, {
        maxFontSize: 6.5, minFontSize: 4.0, paddingX: 1, align: 'center', fieldKey: 'module.resolucionAutorizacion'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const seccion = sanitize(rfs['group.seccion']?.value ?? grp.seccion ?? payload.seccion ?? 'A');
    if (seccion) {
      const box = getFieldBox('group.seccion', { x: 1072.0, y: 283.0, w: 98.0, h: 23.6 });
      const fit = this.fitTextOrThrow(seccion, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'center', fieldKey: 'group.seccion'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    const turno = sanitize(rfs['group.turno']?.value ?? grp.turno ?? payload.turno);
    if (turno) {
      const box = getFieldBox('group.turno', { x: 1072.0, y: 306.6, w: 98.0, h: 23.7 });
      const fit = this.fitTextOrThrow(turno, regularFont, box, pageHeight1, {
        maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'center', fieldKey: 'group.turno'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
    }

    // 5. Unidades Didácticas (Cabeceras en Pág 1 y Pág 2)
    const units = Array.isArray(payload.units) ? payload.units : (Array.isArray(payload.unidades) ? payload.unidades : (payload.unit ? [payload.unit] : []));
    const totalCreds = units.reduce((acc, u) => acc + (Number(u?.creditos || u?.credits) || 0), 0);
    const totalHours = units.reduce((acc, u) => acc + (Number(u?.horas || u?.hours) || 0), 0);
    const calculatedCredHours = (totalCreds > 0 || totalHours > 0) ? `${totalCreds} CRÉD. / ${totalHours} HRS` : '';
    const totalCredHoras = sanitize(rfs['module.totalCreditosHoras']?.value ?? payload.totalCreditosHoras ?? calculatedCredHours);
    if (totalCredHoras) {
      const box = getFieldBox('module.totalCreditosHoras', { x: 1072.0, y: 330.3, w: 98.0, h: 20.7 });
      const fit = this.fitTextOrThrow(totalCredHoras, boldFont, box, pageHeight1, {
        maxFontSize: 6.5, minFontSize: 4.0, paddingX: 1, align: 'center', fieldKey: 'module.totalCreditosHoras'
      });
      page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: boldFont, color });
    }

    const maxUnits = units.length > 0 ? Math.min(10, units.length) : 10;
    const udColsP1 = [
      { x: 513.77, w: 32.8 }, { x: 546.57, w: 32.8 }, { x: 579.37, w: 32.8 },
      { x: 612.18, w: 32.8 }, { x: 644.98, w: 32.8 }, { x: 677.78, w: 32.8 },
      { x: 710.59, w: 32.8 }, { x: 743.39, w: 27.75 }, { x: 771.14, w: 27.75 }, { x: 798.88, w: 21.26 }
    ];
    const udColsP2 = [
      { x: 518.14, w: 31.06 }, { x: 549.20, w: 31.05 }, { x: 580.25, w: 31.06 },
      { x: 611.31, w: 31.05 }, { x: 642.36, w: 31.05 }, { x: 673.41, w: 31.06 },
      { x: 704.47, w: 31.05 }, { x: 735.52, w: 26.27 }, { x: 761.79, w: 26.26 }, { x: 788.05, w: 20.13 }
    ];

    for (let u = 0; u < maxUnits; u++) {
      const unitObj = units[u];
      const uName = sanitize(typeof unitObj === 'string' ? unitObj : (unitObj?.nombre || unitObj?.name || `UD ${u + 1}`));
      const uCredits = sanitize(unitObj?.creditos ?? unitObj?.credits ?? '');
      const uHours = sanitize(unitObj?.horas ?? unitObj?.hours ?? '');
      const uCredHours = uCredits && uHours ? `${uCredits} / ${uHours}` : (uCredits || uHours || '');

      if (uName) {
        // Pág 1 rotado
        page1.drawText(uName.slice(0, 42), {
          x: udColsP1[u].x + udColsP1[u].w / 2 + 2.5,
          y: pageHeight1 - 325,
          size: 6.0,
          font: regularFont,
          color,
          rotate: degrees(90)
        });
        // Pág 2 rotado
        page2.drawText(uName.slice(0, 32), {
          x: udColsP2[u].x + udColsP2[u].w / 2 + 2.5,
          y: pageHeight2 - 175,
          size: 6.0,
          font: regularFont,
          color,
          rotate: degrees(90)
        });
      }

      if (uCredHours) {
        const textWidthP1 = boldFont.widthOfTextAtSize(uCredHours, 5.5);
        page1.drawText(uCredHours, {
          x: udColsP1[u].x + Math.max(1, (udColsP1[u].w - textWidthP1) / 2),
          y: pageHeight1 - 364,
          size: 5.5,
          font: boldFont,
          color
        });
      }
      if (uCredits) {
        const textWidthP2 = boldFont.widthOfTextAtSize(String(uCredits), 6.5);
        page2.drawText(String(uCredits), {
          x: udColsP2[u].x + Math.max(1, (udColsP2[u].w - textWidthP2) / 2),
          y: pageHeight2 - 213,
          size: 6.5,
          font: boldFont,
          color
        });
      }
    }

    // 6. Ordenamiento alfabético determinista A-Z
    const sortedStudents = [...rawRows].sort((a, b) => {
      const nameA = (a['student.fullName'] || a.studentDisplayName || a.apellidosNombres || a.studentName || `${a.apellidoPaterno || ''} ${a.apellidoMaterno || ''} ${a.nombres || ''}`).trim();
      const nameB = (b['student.fullName'] || b.studentDisplayName || b.apellidosNombres || b.studentName || `${b.apellidoPaterno || ''} ${b.apellidoMaterno || ''} ${b.nombres || ''}`).trim();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    const formatVigesimal = (score) => {
      if (score === null || score === undefined || score === '' || score === 'null' || score === 'undefined') return '';
      const num = Number(score);
      if (isNaN(num)) return '';
      const clamped = Math.min(20, Math.max(0, Math.round(num)));
      return String(clamped).padStart(2, '0');
    };

    // 7. Partición 20+20 filas
    // Página 1: Filas 0..19 (Estudiantes 1 al 20)
    for (let i = 0; i < Math.min(20, sortedStudents.length); i++) {
      const student = sortedStudents[i];
      const rowY = 371.84 + i * 20.79;
      const textY = pageHeight1 - (rowY + 13.5);

      const docNum = sanitize(student['student.documentNumber'] || student.numeroDocumento || student.documentNumber || student.dni || student['enrollment.code'] || student.codigoMatricula);
      if (docNum) {
        const tw = regularFont.widthOfTextAtSize(docNum, 7.5);
        page1.drawText(docNum, { x: 43.52 + Math.max(1, (77.68 - tw) / 2), y: textY, size: 7.5, font: regularFont, color });
      }

      const sName = sanitize(student['student.fullName'] || student.studentDisplayName || student.apellidosNombres || student.studentName || `${student.apellidoPaterno || ''} ${student.apellidoMaterno || ''} ${student.nombres || ''}`);
      if (sName) {
        const box = { x: 125, y: rowY, w: 385, h: 20.79 };
        const fit = this.fitTextOrThrow(sName, regularFont, box, pageHeight1, {
          maxFontSize: 7.5, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: `student.fullName.p1.${i+1}`
        });
        page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
      }

      // Notas de UDs (solo para unidades existentes)
      for (let u = 0; u < maxUnits; u++) {
        const col = udColsP1[u];
        const val = student.unitGrades?.[u] ?? student.grades?.[u] ?? student[`evaluation.unit${u+1}`] ?? student.evaluations?.[u]?.score ?? student.notas?.[u];
        const gradeText = formatVigesimal(val);
        if (gradeText) {
          const tw = regularFont.widthOfTextAtSize(gradeText, 7.5);
          page1.drawText(gradeText, { x: col.x + Math.max(1, (col.w - tw) / 2), y: textY, size: 7.5, font: regularFont, color });
        }
      }

      // EFSRT
      const efsrtVal = student['efsrt.finalGrade'] ?? student.efsrtGrade ?? student.notaEfsrt ?? student.efsrtFinalScore;
      const efsrtText = formatVigesimal(efsrtVal);
      if (efsrtText) {
        const tw = regularFont.widthOfTextAtSize(efsrtText, 7.5);
        page1.drawText(efsrtText, { x: 820.14 + Math.max(1, (35.61 - tw) / 2), y: textY, size: 7.5, font: regularFont, color });
      }

      // Logro Modular
      const logroVal = student['closure.achievement'] ?? student.logro ?? student.modularGrade ?? student.finalResult;
      const logroText = formatVigesimal(logroVal);
      if (logroText) {
        const tw = boldFont.widthOfTextAtSize(logroText, 7.5);
        page1.drawText(logroText, { x: 855.75 + Math.max(1, (37.46 - tw) / 2), y: textY, size: 7.5, font: boldFont, color });
      }

      // UDs Aprobadas
      const aprVal = student['closure.approvedCount'] ?? student.unidadesAprobadas ?? student.approvedUnitsCount;
      const aprText = aprVal !== null && aprVal !== undefined && aprVal !== '' ? String(aprVal).padStart(2, '0') : '';
      if (aprText) {
        const tw = regularFont.widthOfTextAtSize(aprText, 7.5);
        page1.drawText(aprText, { x: 893.21 + Math.max(1, (37.46 - tw) / 2), y: textY, size: 7.5, font: regularFont, color });
      }

      // UDs Desaprobadas
      const desVal = student['closure.failedCount'] ?? student.unidadesDesaprobadas ?? student.failedUnitsCount;
      const desText = desVal !== null && desVal !== undefined && desVal !== '' ? String(desVal).padStart(2, '0') : '';
      if (desText) {
        const tw = regularFont.widthOfTextAtSize(desText, 7.5);
        page1.drawText(desText, { x: 930.67 + Math.max(1, (32.8 - tw) / 2), y: textY, size: 7.5, font: regularFont, color });
      }

      // Observaciones
      const obsText = sanitize(student.observaciones || student.obs || student.observacion);
      if (obsText) {
        const box = { x: 965, y: rowY, w: 200, h: 20.79 };
        const fit = this.fitTextOrThrow(obsText, regularFont, box, pageHeight1, {
          maxFontSize: 6.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: `observaciones.p1.${i+1}`
        });
        page1.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
      }
    }

    // Página 2: Filas 20..39 (Estudiantes 21 al 40)
    for (let i = 20; i < Math.min(40, sortedStudents.length); i++) {
      const idx = i - 20;
      const student = sortedStudents[i];
      const rowY = 220.06 + idx * 17.57;
      const textY = pageHeight2 - (rowY + 11.5);

      const docNum = sanitize(student['student.documentNumber'] || student.numeroDocumento || student.documentNumber || student.dni || student['enrollment.code'] || student.codigoMatricula);
      if (docNum) {
        const tw = regularFont.widthOfTextAtSize(docNum, 7.0);
        page2.drawText(docNum, { x: 72.98 + Math.max(1, (73.54 - tw) / 2), y: textY, size: 7.0, font: regularFont, color });
      }

      const sName = sanitize(student['student.fullName'] || student.studentDisplayName || student.apellidosNombres || student.studentName || `${student.apellidoPaterno || ''} ${student.apellidoMaterno || ''} ${student.nombres || ''}`);
      if (sName) {
        const box = { x: 150, y: rowY, w: 365, h: 17.57 };
        const fit = this.fitTextOrThrow(sName, regularFont, box, pageHeight2, {
          maxFontSize: 7.0, minFontSize: 4.5, paddingX: 1, align: 'left', fieldKey: `student.fullName.p2.${i+1}`
        });
        page2.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
      }

      // Notas de UDs (solo para unidades existentes)
      for (let u = 0; u < maxUnits; u++) {
        const col = udColsP2[u];
        const val = student.unitGrades?.[u] ?? student.grades?.[u] ?? student[`evaluation.unit${u+1}`] ?? student.evaluations?.[u]?.score ?? student.notas?.[u];
        const gradeText = formatVigesimal(val);
        if (gradeText) {
          const tw = regularFont.widthOfTextAtSize(gradeText, 7.0);
          page2.drawText(gradeText, { x: col.x + Math.max(1, (col.w - tw) / 2), y: textY, size: 7.0, font: regularFont, color });
        }
      }

      // EFSRT
      const efsrtVal = student['efsrt.finalGrade'] ?? student.efsrtGrade ?? student.notaEfsrt ?? student.efsrtFinalScore;
      const efsrtText = formatVigesimal(efsrtVal);
      if (efsrtText) {
        const tw = regularFont.widthOfTextAtSize(efsrtText, 7.0);
        page2.drawText(efsrtText, { x: 808.18 + Math.max(1, (33.71 - tw) / 2), y: textY, size: 7.0, font: regularFont, color });
      }

      // Logro Modular
      const logroVal = student['closure.achievement'] ?? student.logro ?? student.modularGrade ?? student.finalResult;
      const logroText = formatVigesimal(logroVal);
      if (logroText) {
        const tw = boldFont.widthOfTextAtSize(logroText, 7.0);
        page2.drawText(logroText, { x: 841.89 + Math.max(1, (35.46 - tw) / 2), y: textY, size: 7.0, font: boldFont, color });
      }

      // UDs Aprobadas
      const aprVal = student['closure.approvedCount'] ?? student.unidadesAprobadas ?? student.approvedUnitsCount;
      const aprText = aprVal !== null && aprVal !== undefined && aprVal !== '' ? String(aprVal).padStart(2, '0') : '';
      if (aprText) {
        const tw = regularFont.widthOfTextAtSize(aprText, 7.0);
        page2.drawText(aprText, { x: 877.35 + Math.max(1, (35.46 - tw) / 2), y: textY, size: 7.0, font: regularFont, color });
      }

      // UDs Desaprobadas
      const desVal = student['closure.failedCount'] ?? student.unidadesDesaprobadas ?? student.failedUnitsCount;
      const desText = desVal !== null && desVal !== undefined && desVal !== '' ? String(desVal).padStart(2, '0') : '';
      if (desText) {
        const tw = regularFont.widthOfTextAtSize(desText, 7.0);
        page2.drawText(desText, { x: 912.81 + Math.max(1, (31.06 - tw) / 2), y: textY, size: 7.0, font: regularFont, color });
      }

      // Observaciones
      const obsText = sanitize(student.observaciones || student.obs || student.observacion);
      if (obsText) {
        const box = { x: 946, y: rowY, w: 190, h: 17.57 };
        const fit = this.fitTextOrThrow(obsText, regularFont, box, pageHeight2, {
          maxFontSize: 6.5, minFontSize: 4.0, paddingX: 1, align: 'left', fieldKey: `observaciones.p2.${i+1}`
        });
        page2.drawText(fit.text, { x: fit.x, y: fit.y, size: fit.size, font: regularFont, color });
      }
    }

    // 8. Tabla intermedia en Página 2: UNIDAD DIDÁCTICA y CAPACIDAD (hasta 8 filas de datos, iniciando en topY = 592.72)
    for (let k = 0; k < Math.min(8, units.length); k++) {
      const u = units[k];
      const uName = sanitize(typeof u === 'string' ? u : (u?.nombre || u?.name || ''));
      const uCap = sanitize(u?.capacidad || u?.capacity || '');
      const topY = 592.72 + k * 13.82;
      const textY = pageHeight2 - (topY + 9.5);

      if (uName) {
        page2.drawText(uName.slice(0, 50), { x: 56.0, y: textY, size: 6.0, font: boldFont, color });
      }
      if (uCap) {
        page2.drawText(uCap.slice(0, 115), { x: 440.0, y: textY, size: 6.0, font: regularFont, color });
      }
    }

    // 9. Cuadro estadístico en Página 2 (Aprobados, Desaprobados, Retirados)
    // Se calculan estadísticas reales únicamente a partir de unidades y notas existentes (CERO MOCKS)
    const statCols = [
      { x: 518.14, w: 31.06 }, { x: 549.20, w: 31.05 }, { x: 580.25, w: 31.06 },
      { x: 611.31, w: 31.05 }, { x: 642.36, w: 31.05 }, { x: 673.41, w: 31.06 },
      { x: 704.47, w: 31.05 }, { x: 735.52, w: 26.27 }, { x: 761.79, w: 26.26 }, { x: 788.05, w: 20.13 },
      { x: 808.18, w: 33.71 }, { x: 841.89, w: 35.46 }, { x: 877.35, w: 35.46 }, { x: 912.81, w: 31.06 }
    ];

    // Para cada una de las UDs reales existentes
    for (let u = 0; u < maxUnits; u++) {
      const col = statCols[u];
      let apr = 0;
      let des = 0;
      let ret = 0;
      let hasNotes = false;

      for (const s of sortedStudents) {
        if (s.retirado) { ret++; continue; }
        const val = s.unitGrades?.[u] ?? s.grades?.[u] ?? s[`evaluation.unit${u+1}`] ?? s.evaluations?.[u]?.score ?? s.notas?.[u];
        if (val !== null && val !== undefined && val !== '' && val !== 'null' && val !== 'undefined') {
          hasNotes = true;
          const n = Number(val);
          if (!isNaN(n)) {
            if (n >= 13) apr++;
            else des++;
          }
        }
      }

      if (hasNotes) {
        const aprStr = String(apr).padStart(2, '0');
        const desStr = String(des).padStart(2, '0');
        const retStr = String(ret).padStart(2, '0');

        const twApr = boldFont.widthOfTextAtSize(aprStr, 7.0);
        page2.drawText(aprStr, { x: col.x + Math.max(1, (col.w - twApr) / 2), y: pageHeight2 - (697.51 + 10.0), size: 7.0, font: boldFont, color });

        const twDes = regularFont.widthOfTextAtSize(desStr, 7.0);
        page2.drawText(desStr, { x: col.x + Math.max(1, (col.w - twDes) / 2), y: pageHeight2 - (711.88 + 10.0), size: 7.0, font: regularFont, color });

        const twRet = regularFont.widthOfTextAtSize(retStr, 7.0);
        page2.drawText(retStr, { x: col.x + Math.max(1, (col.w - twRet) / 2), y: pageHeight2 - (726.77 + 10.0), size: 7.0, font: regularFont, color });
      }
    }

    // Estadísticas para EFSRT (columna 10)
    let aprE = 0, desE = 0, retE = 0, hasE = false;
    for (const s of sortedStudents) {
      if (s.retirado) { retE++; continue; }
      const val = s['efsrt.finalGrade'] ?? s.efsrtGrade ?? s.notaEfsrt ?? s.efsrtFinalScore;
      if (val !== null && val !== undefined && val !== '' && val !== 'null' && val !== 'undefined') {
        hasE = true;
        const n = Number(val);
        if (!isNaN(n)) {
          if (n >= 13) aprE++;
          else desE++;
        }
      }
    }
    if (hasE) {
      const colE = statCols[10];
      const aprStr = String(aprE).padStart(2, '0');
      const desStr = String(desE).padStart(2, '0');
      const retStr = String(retE).padStart(2, '0');
      const twApr = boldFont.widthOfTextAtSize(aprStr, 7.0);
      page2.drawText(aprStr, { x: colE.x + Math.max(1, (colE.w - twApr) / 2), y: pageHeight2 - (697.51 + 10.0), size: 7.0, font: boldFont, color });
      const twDes = regularFont.widthOfTextAtSize(desStr, 7.0);
      page2.drawText(desStr, { x: colE.x + Math.max(1, (colE.w - twDes) / 2), y: pageHeight2 - (711.88 + 10.0), size: 7.0, font: regularFont, color });
      const twRet = regularFont.widthOfTextAtSize(retStr, 7.0);
      page2.drawText(retStr, { x: colE.x + Math.max(1, (colE.w - twRet) / 2), y: pageHeight2 - (726.77 + 10.0), size: 7.0, font: regularFont, color });
    }

    // Estadísticas para Logro Modular (columna 11)
    let aprL = 0, desL = 0, retL = 0, hasL = false;
    for (const s of sortedStudents) {
      if (s.retirado) { retL++; continue; }
      const val = s['closure.achievement'] ?? s.logro ?? s.modularGrade ?? s.finalResult;
      if (val !== null && val !== undefined && val !== '' && val !== 'null' && val !== 'undefined') {
        hasL = true;
        const n = Number(val);
        if (!isNaN(n)) {
          if (n >= 13) aprL++;
          else desL++;
        }
      }
    }
    if (hasL) {
      const colL = statCols[11];
      const aprStr = String(aprL).padStart(2, '0');
      const desStr = String(desL).padStart(2, '0');
      const retStr = String(retL).padStart(2, '0');
      const twApr = boldFont.widthOfTextAtSize(aprStr, 7.0);
      page2.drawText(aprStr, { x: colL.x + Math.max(1, (colL.w - twApr) / 2), y: pageHeight2 - (697.51 + 10.0), size: 7.0, font: boldFont, color });
      const twDes = regularFont.widthOfTextAtSize(desStr, 7.0);
      page2.drawText(desStr, { x: colL.x + Math.max(1, (colL.w - twDes) / 2), y: pageHeight2 - (711.88 + 10.0), size: 7.0, font: regularFont, color });
      const twRet = regularFont.widthOfTextAtSize(retStr, 7.0);
      page2.drawText(retStr, { x: colL.x + Math.max(1, (colL.w - twRet) / 2), y: pageHeight2 - (726.77 + 10.0), size: 7.0, font: regularFont, color });
    }

    // 10. Marcas de agua y avisos normativos
    const isDraft = payload.administrativeDraft || payload.demoMode || false;
    if (isDraft) {
      [page1, page2].forEach(p => {
        p.drawText('BORRADOR ADMINISTRATIVO — NO OFICIAL', {
          x: 280,
          y: 420,
          size: 32,
          font: boldFont,
          color: rgb(0.9, 0.85, 0.85),
          rotate: degrees(25)
        });
        p.drawText('ACTA DE EVALUACIÓN MODULAR · EMISIÓN ADMINISTRATIVA', {
          x: 420,
          y: 20,
          size: 7.5,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4)
        });
      });
    }

    await this._drawInstitutionalLogo(pdfDoc, page1, 'TMPL-19');
    await this._drawInstitutionalLogo(pdfDoc, page2, 'TMPL-19');

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  renderTMPL18(payload={}) { return this.renderEFSRTDocument(payload); }
  renderTMPL19(payload={}) { return this.renderModularActDocument(payload); }
  _buildTmpl20FieldSet(payload = {}) {
    const student = payload.student || payload.context?.student || {};
    const module = payload.module || payload.context?.module || {};
    const program = payload.program || payload.context?.program || {};
    const group = payload.group || payload.context?.group || {};
    const inst = payload.institution || payload.context?.institution || {};
    const reg = payload.registry || payload.context?.registry || {};
    const rfs = payload.resolvedFieldSet || payload.context?.resolvedFieldSet || {};

    const studentName = rfs['student.fullName'] || student.fullName || student.apellidosNombres || student.nombreCompleto || [student.apellidoPaterno, student.apellidoMaterno, student.nombres].filter(Boolean).join(' ') || 'ESTUDIANTE';
    const moduleName = rfs['module.name'] || module.nombre || module.name || 'MÓDULO FORMATIVO';
    const programName = rfs['program.name'] || program.nombre || program.name || 'PROGRAMA DE ESTUDIOS';
    const instName = rfs['institution.name'] || inst.nombreInstitucion || inst.nombre || "CETPRO 'SAN PABLO'";
    const hours = rfs['curriculum.module.hours'] || (module.horas ? String(module.horas) : '320');
    const credits = rfs['curriculum.module.credits'] || (module.creditos ? String(module.creditos) : '12');
    const emissionDate = rfs['document.emissionDate'] || reg.emissionDate || payload.emissionDate || '20 de Diciembre de 2026';
    const registerCode = rfs['document.registerCode'] || reg.registerCode || payload.registerCode || 'CM-2026-0001';

    const ciclo = rfs['group.ciclo'] || group.ciclo || program.ciclo || 'AUXILIAR TÉCNICO';
    const modalidad = rfs['group.modalidad'] || group.modalidad || 'PRESENCIAL';
    const competence = rfs['curriculum.unit.competence'] || module.competencia || reg.competence || payload.competence || '';

    const registryBook = rfs['document.registryBook'] || reg.registryBook || '01';
    const registryFolio = rfs['document.registryFolio'] || reg.registryFolio || '15';
    const registryNumber = rfs['document.registryNumber'] || reg.registryNumber || '0042';
    const registryDate = rfs['document.registryDate'] || reg.registryDate || '20/12/2026';

    const confirmed = val => ({ status: 'RESOLVED', value: String(val ?? '') });

    return {
      'student.fullName': confirmed(studentName),
      'module.name': confirmed(moduleName),
      'program.name': confirmed(programName),
      'institution.name': confirmed(instName),
      'curriculum.module.hours': confirmed(hours),
      'curriculum.module.credits': confirmed(credits),
      'document.emissionDate': confirmed(emissionDate),
      'document.registerCode': confirmed(registerCode),
      'group.ciclo': confirmed(ciclo),
      'group.modalidad': confirmed(modalidad),
      'curriculum.unit.competence': confirmed(competence),
      'document.registryBook': confirmed(registryBook),
      'document.registryFolio': confirmed(registryFolio),
      'document.registryNumber': confirmed(registryNumber),
      'document.registryDate': confirmed(registryDate)
    };
  }

  _buildTmpl21FieldSet(payload = {}) {
    const student = payload.student || payload.context?.student || {};
    const program = payload.program || payload.context?.program || {};
    const reg = payload.registry || payload.context?.registry || {};
    const rfs = payload.resolvedFieldSet || payload.context?.resolvedFieldSet || {};

    const studentName = rfs['student.fullName'] || student.fullName || student.apellidosNombres || student.nombreCompleto || [student.apellidoPaterno, student.apellidoMaterno, student.nombres].filter(Boolean).join(' ') || 'ESTUDIANTE';
    const progTitle = program.nombre ? program.nombre.toUpperCase() : 'PELUQUERÍA Y BARBERÍA';
    const titleText = rfs['document.officialTitleText'] || reg.officialTitleText || payload.officialTitleText || `AUXILIAR TÉCNICO EN ${progTitle}`;
    const emissionDate = rfs['document.emissionDate'] || reg.emissionDate || payload.emissionDate || 'Dado en Lima, a los 20 días del mes de Diciembre del 2026';
    const registerCode = rfs['document.registerCode'] || reg.registerCode || payload.registerCode || 'MINEDU-REG-2026-0042';
    const registryAsiento = rfs['document.registryAsiento'] || reg.registryAsiento || payload.registryAsiento || 'Inscrito en el Libro de Títulos N° 01, Folio 15, Registro N° 2026-042.';

    const confirmed = val => ({ status: 'RESOLVED', value: String(val ?? '') });

    return {
      'student.fullName': confirmed(studentName),
      'document.officialTitleText': confirmed(titleText),
      'document.emissionDate': confirmed(emissionDate),
      'document.registerCode': confirmed(registerCode),
      'document.registryAsiento': confirmed(registryAsiento)
    };
  }

  renderTMPL20(payload = {}) {
    const resolvedFieldSet = payload.resolvedFieldSet || this._buildTmpl20FieldSet(payload);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const counts = payload.counts || { detailRows: rows.length };
    return this.renderFromManifest('TMPL-20', resolvedFieldSet, rows, counts);
  }

  renderTMPL21(payload = {}) {
    const resolvedFieldSet = payload.resolvedFieldSet || this._buildTmpl21FieldSet(payload);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const counts = payload.counts || {};
    return this.renderFromManifest('TMPL-21', resolvedFieldSet, rows, counts);
  }
}
