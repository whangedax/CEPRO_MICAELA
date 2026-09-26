import { isDemoRuntime } from './runtime-target-service.js';

const DRAFT_LABEL = 'BORRADOR ADMINISTRATIVO — DATOS ACADÉMICOS PENDIENTES';
const INTERNAL_LABEL = 'REPORTE ADMINISTRATIVO INTERNO';

function clean(value) {
  return value === null || value === undefined ? '' : String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
}

function wrapText(font, content, width, size) {
  if (!content) return [''];
  const fragments = content.split(/(\s+)/).filter(Boolean);
  const lines = [];
  let line = '';
  const pushToken = token => {
    let remaining = token;
    while (remaining && font.widthOfTextAtSize(remaining, size) > width) {
      let cut = 1;
      while (cut < remaining.length && font.widthOfTextAtSize(remaining.slice(0, cut + 1), size) <= width) cut++;
      const part = remaining.slice(0, cut);
      if (line.trim()) lines.push(line.trimEnd());
      lines.push(part);
      line = '';
      remaining = remaining.slice(cut);
    }
    if (!remaining) return;
    const candidate = `${line}${remaining}`;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line.trimEnd());
      line = remaining.trimStart();
    } else {
      line = candidate;
    }
  };
  fragments.forEach(pushToken);
  if (line.trim() || !lines.length) lines.push(line.trim());
  return lines;
}

function drawCell(page, font, value, x, y, width, height, options = {}) {
  const content = clean(value);
  const availableWidth = width - 8;
  const availableHeight = height - 4;
  const minSize = options.minSize || 5.5;
  let size = options.maxSize || 8;
  let lines = [];
  while (size >= minSize) {
    lines = wrapText(font, content, availableWidth, size);
    if (lines.length * (size + 1) <= availableHeight) break;
    size -= 0.25;
  }
  if (size < minSize || lines.some(line => font.widthOfTextAtSize(line, size) > availableWidth)) {
    const error = new Error(`FIELD_OVERFLOW: el texto completo no cabe en ${width}x${height}pt.`);
    error.code = 'FIELD_OVERFLOW';
    throw error;
  }
  const lineHeight = size + 1;
  const blockHeight = lines.length * lineHeight;
  let baseline = y + (height + blockHeight) / 2 - size;
  for (const line of lines) {
    page.drawText(line, { x: x + 4, y: baseline, size, font, color: options.color });
    baseline -= lineHeight;
  }
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""')}"`;
}

export class MvpPdfService {
  assertPdfRuntime() {
    if (!globalThis.PDFLib?.PDFDocument) throw new Error('El generador PDF local no está disponible.');
  }

  async renderAdministrativeRoster(context) {
    return this.renderTableReport({
      context,
      title: 'LISTADO COMPLETO DEL GRUPO',
      subtitle: INTERNAL_LABEL,
      columns: [
        { key: 'ordinal', label: 'N°', width: 35 },
        { key: 'studentName', label: 'ESTUDIANTE', width: 300 },
        { key: 'document', label: 'DOCUMENTO', width: 100 },
        { key: 'sex', label: 'SEXO', width: 50 },
        { key: 'birthDate', label: 'NACIMIENTO', width: 90 },
        { key: 'enrollmentStatus', label: 'ESTADO', width: 150 }
      ],
      rows: context.rows.map((row, index) => ({ ...row, ordinal: index + 1 }))
    });
  }

  async renderAdministrativeEnrollmentRegister(context) {
    return this.renderTableReport({
      context,
      title: 'REGISTRO ADMINISTRATIVO DE MATRÍCULAS',
      subtitle: 'NO OFICIAL — USO INTERNO',
      columns: [
        { key: 'ordinal', label: 'N°', width: 32 },
        { key: 'studentName', label: 'ESTUDIANTE', width: 235 },
        { key: 'document', label: 'DOCUMENTO', width: 85 },
        { key: 'programName', label: 'PROGRAMA', width: 150 },
        { key: 'groupLabel', label: 'GRUPO', width: 75 },
        { key: 'moduleName', label: 'MÓDULO', width: 95 },
        { key: 'periodName', label: 'PERIODO', width: 70 },
        { key: 'enrollmentStatus', label: 'ESTADO', width: 90 }
      ],
      rows: context.rows.map((row, index) => ({ ...row, ordinal: index + 1,
        programName: clean(context.program?.nombre), groupLabel: clean(context.group?.visibleCode),
        moduleName: clean(context.module?.nombreOficial || context.module?.nombre),
        periodName: clean(context.period?.nombre) }))
    });
  }

  async renderAdministrativeAttendanceReport(context) {
    return this.renderTableReport({
      context,
      title: 'REPORTE ADMINISTRATIVO DE ASISTENCIA',
      subtitle: isDemoRuntime() ? 'DEMOSTRACIÓN — NO OFICIAL' : 'NO OFICIAL — USO INTERNO',
      columns: [
        { key: 'ordinal', label: 'N°', width: 35 },
        { key: 'studentName', label: 'ESTUDIANTE', width: 300 },
        { key: 'document', label: 'DOCUMENTO', width: 110 },
        { key: 'state', label: 'ESTADO TÉCNICO', width: 120 },
        { key: 'observation', label: 'OBSERVACIÓN', width: 220 }
      ],
      rows: context.rows.map((row, index) => ({ ...row, ordinal: index + 1 }))
    });
  }

  async renderTableReport({ context, title, subtitle, columns, rows }) {
    this.assertPdfRuntime();
    const { PDFDocument, StandardFonts, rgb } = globalThis.PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 841.89; const pageHeight = 595.28;
    const margin = 28; const rowHeight = 26; const rowsPerPage = 16;
    const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const scale = Math.min(1, (pageWidth - margin * 2) / totalWidth);
    const scaled = columns.map(column => ({ ...column, width: column.width * scale }));
    const chunks = rows.length ? Array.from({ length: Math.ceil(rows.length / rowsPerPage) }, (_, index) => rows.slice(index * rowsPerPage, (index + 1) * rowsPerPage)) : [[]];

    chunks.forEach((chunk, pageIndex) => {
      const page = doc.addPage([pageWidth, pageHeight]);
      page.drawText(clean(title), { x: margin, y: pageHeight - 38, size: 15, font: bold, color: rgb(0.08, 0.16, 0.28) });
      page.drawText(clean(subtitle), { x: margin, y: pageHeight - 56, size: 9, font: bold, color: rgb(0.65, 0.18, 0.12) });
      page.drawText(`Programa: ${clean(context.program?.nombre)}`, { x: margin, y: pageHeight - 74, size: 8, font });
      page.drawText(`Grupo: ${clean(context.group?.visibleCode)} · Matrículas: ${rows.length}`, { x: margin, y: pageHeight - 88, size: 8, font });
      const watermark = isDemoRuntime() ? 'DEMOSTRACIÓN — NO OFICIAL' : DRAFT_LABEL;
      page.drawText(watermark, { x: pageWidth - 305, y: 16, size: 7.5, font: bold, color: rgb(0.45, 0.45, 0.45) });
      page.drawText(`Página ${pageIndex + 1} de ${chunks.length}`, { x: margin, y: 16, size: 7, font, color: rgb(0.4, 0.4, 0.4) });

      let x = margin; let y = pageHeight - 116;
      for (const column of scaled) {
        page.drawRectangle({ x, y, width: column.width, height: rowHeight, color: rgb(0.88, 0.92, 0.97), borderColor: rgb(0.35, 0.4, 0.48), borderWidth: 0.5 });
        drawCell(page, bold, column.label, x, y, column.width, rowHeight, { maxSize: 7, minSize: 5.5, color: rgb(0.08, 0.16, 0.28) });
        x += column.width;
      }
      y -= rowHeight;
      chunk.forEach(row => {
        x = margin;
        for (const column of scaled) {
          page.drawRectangle({ x, y, width: column.width, height: rowHeight, borderColor: rgb(0.55, 0.58, 0.62), borderWidth: 0.35 });
          drawCell(page, font, row[column.key], x, y, column.width, rowHeight, { color: rgb(0, 0, 0) });
          x += column.width;
        }
        y -= rowHeight;
      });
      if (!chunk.length) page.drawText('El grupo no tiene matrículas registradas.', { x: margin, y: y - 18, size: 10, font });
    });
    const bytes = await doc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  buildEnrollmentRegisterCsv(context) {
    const header = ['N°', 'Estudiante', 'Documento', 'Programa', 'Grupo', 'Estado', 'Módulo confirmado', 'Periodo confirmado'];
    const lines = [header.map(csvCell).join(',')];
    context.rows.forEach((row, index) => lines.push([
      index + 1, row.studentName, row.document, context.program?.nombre,
      context.group?.visibleCode, row.enrollmentStatus,
      context.module?.nombreOficial || context.module?.nombre || '', context.period?.nombre || ''
    ].map(csvCell).join(',')));
    if (isDemoRuntime()) lines.unshift(csvCell('DEMOSTRACIÓN — NO OFICIAL'));
    return `\uFEFF${lines.join('\r\n')}`;
  }
}

export { DRAFT_LABEL, INTERNAL_LABEL };
