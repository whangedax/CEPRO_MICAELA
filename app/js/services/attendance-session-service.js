import { AttendanceV2Repository } from '../repositories/attendance-v2-repository.js';
import { AttendanceMarkService } from './attendance-mark-service.js';
import { AttendanceSummaryService } from './attendance-summary-service.js';
import { generateAttendanceId, normalizeAttendanceDate, normalizeOptionalHours } from './attendance-v2-domain.js';

export class AttendanceSessionService {
  constructor({ repository, markService, summaryService } = {}) {
    this.repository = repository;
    if (!(repository instanceof AttendanceV2Repository) && !repository) throw new Error('AttendanceSessionService requiere repository.');
    this.markService = markService || new AttendanceMarkService();
    this.summaryService = summaryService || new AttendanceSummaryService();
  }
  newSession({ groupId, periodoId, unidadId, fecha, ordenSesion = null, horasProgramadas = null }) {
    return { sessionId: generateAttendanceId('ATS'), groupId, periodoId, unidadId,
      fecha: normalizeAttendanceDate(fecha), ordenSesion, horasProgramadas: normalizeOptionalHours(horasProgramadas), estado: 'ACTIVA', version: 0 };
  }
  async listSessionsByContext(context) { return this.repository.listSessionsByContext(context); }
  async loadSession(sessionId, enrollmentIds) {
    const session = await this.repository.getSessionById(sessionId);
    if (!session) throw new Error('Sesión de asistencia inexistente.');
    const marks = await this.repository.listMarksBySession(sessionId);
    return this.markService.createDraft({ session, enrollmentIds, existingMarks: marks });
  }
  async saveDraft(draft, options = {}) {
    const result = await this.repository.saveSessionWithMarks({ session: draft.session, marks: draft.marks,
      expectedVersion: draft.session.version || 0, operator: options.operator, faultAt: options.faultAt });
    return { ...result, summary: this.summaryService.summarize({ sessions: [result.session], marks: result.marks }), dirty: false };
  }
}
