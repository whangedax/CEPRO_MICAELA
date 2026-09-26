import { getV2PdfManifest } from './v2-document-manifest-registry.js';
import { AttendanceSummaryService } from './attendance-summary-service.js';
import { ATTENDANCE_DISPLAY_MAPPING, ATTENDANCE_POLICY_BOUNDARY } from './attendance-v2-domain.js';

const resolved = value => ({ status: 'RESOLVED', value });
const text = value => String(value ?? '').trim();
const displayName = student => {
  const structured = [student?.apellidoPaterno, student?.apellidoMaterno, student?.nombres].map(text).filter(Boolean).join(' ');
  return structured || text(student?.nombresCompletoOriginal) || 'ESTUDIANTE SIN NOMBRE';
};

export class AttendanceDocumentContextService {
  constructor({ repository, summaryService } = {}) {
    if (!repository) throw new Error('AttendanceDocumentContextService requiere repository.');
    this.repository = repository;
    this.summaryService = summaryService || new AttendanceSummaryService();
  }

  async buildAttendanceDocumentContext({ groupId, unidadId, periodoId, testOnly = false }) {
    const context = await this.repository.loadDocumentContext({ groupId, unidadId, periodoId });
    const order = Number(context.unit.orden);
    if (!Number.isInteger(order) || order < 1 || order > 6) {
      const error = new Error('B-001: no existe plantilla física de asistencia para esta unidad.');
      error.code = 'TEMPLATE_NOT_AVAILABLE'; throw error;
    }
    const templateId = `TMPL-${String(order + 4).padStart(2, '0')}`;
    const manifest = getV2PdfManifest(templateId);
    const sessionCapacity = Number(manifest?.capacity?.sessions || 0);
    const sessions = [...context.sessions].sort((a, b) => `${a.fecha}|${a.ordenSesion ?? ''}|${a.sessionId}`.localeCompare(`${b.fecha}|${b.ordenSesion ?? ''}|${b.sessionId}`));
    if (sessionCapacity && sessions.length > sessionCapacity) {
      const error = new Error(`SESSION_CAPACITY_EXCEEDED: ${sessions.length} > ${sessionCapacity} en ${templateId}.`);
      error.code = 'SESSION_CAPACITY_EXCEEDED'; error.templateId = templateId; throw error;
    }
    if (context.enrollments.length > 40) {
      const error = new Error(`CAPACITY_EXCEEDED: rows ${context.enrollments.length} > 40 en ${templateId}.`);
      error.code = 'CAPACITY_EXCEEDED'; error.templateId = templateId; throw error;
    }
    const studentById = new Map(context.students.map(student => [student.id, student]));
    const marksByEnrollment = new Map(context.enrollments.map(enrollment => [enrollment.id, []]));
    for (const mark of context.marks) if (marksByEnrollment.has(mark.matriculaId)) marksByEnrollment.get(mark.matriculaId).push(mark);
    const matrix = context.enrollments.map(enrollment => {
      const student = studentById.get(enrollment.estudianteId);
      const marks = sessions.map(session => {
        const mark = marksByEnrollment.get(enrollment.id).find(item => item.sessionId === session.sessionId) || null;
        return { sessionId: session.sessionId, estadoRegistro: mark?.estadoRegistro || 'SIN_REGISTRO',
          displayCode: ATTENDANCE_DISPLAY_MAPPING[mark?.estadoRegistro || 'SIN_REGISTRO'], markId: mark?.id || null };
      });
      const summary = this.summaryService.summarizeEnrollment(marksByEnrollment.get(enrollment.id));
      return { matriculaId: enrollment.id, studentDisplayName: displayName(student), marksBySession: marks, counts: summary };
    }).sort((a, b) => a.studentDisplayName.localeCompare(b.studentDisplayName, 'es'));
    const rows = matrix.map(item => ({
      'student.fullName': item.studentDisplayName,
      'attendance.presentCount': String(item.counts.presentCount),
      'attendance.absentCount': String(item.counts.absentCount),
      attendanceOperationalCounts: { status: 'OPERATIONAL_COUNT', ...item.counts },
      matriculaId: item.matriculaId,
      marksBySession: item.marksBySession
    }));
    return {
      templateId, testOnly: Boolean(testOnly), contextType: 'ATTENDANCE',
      resolvedFieldSet: {
        'program.name': resolved(context.program.nombre || context.program.name || ''),
        'period.name': resolved(context.period.nombre || context.period.name || ''),
        'module.name': resolved(context.module.nombre || context.module.name || ''),
        'curriculum.unit.name': resolved(context.unit.nombre || context.unit.name || '')
      },
      rows, matrix, sessions: sessions.map(session => ({ sessionId: session.sessionId, fecha: session.fecha, ordenSesion: session.ordenSesion })),
      capacity: { students: 40, sessions: sessionCapacity },
      operationalSummary: this.summaryService.summarize({ sessions, marks: context.marks }),
      attendancePolicy: ATTENDANCE_POLICY_BOUNDARY,
      officialAbsencePercentage: { status: 'BLOCKED_BY_POLICY', value: null },
      source: { groupId, unidadId, periodoId, enrollmentIds: context.enrollments.map(item => item.id), authority: 'GROUPID_MATRICULAID' }
    };
  }
}

