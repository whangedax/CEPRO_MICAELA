import { ATTENDANCE_CAPTURE_STATES, ATTENDANCE_POLICY_BOUNDARY } from './attendance-v2-domain.js';

export class AttendanceSummaryService {
  summarize({ sessions = [], marks = [] } = {}) {
    const active = marks.filter(mark => mark.estadoLogico !== 'ANULADO');
    const count = state => active.filter(mark => mark.estadoRegistro === state).length;
    return {
      sessionCount: sessions.filter(session => session.estado !== 'ANULADA').length,
      presentCount: count(ATTENDANCE_CAPTURE_STATES.PRESENTE),
      absentCount: count(ATTENDANCE_CAPTURE_STATES.AUSENTE),
      justifiedCount: count(ATTENDANCE_CAPTURE_STATES.JUSTIFICADA),
      unmarkedCount: count(ATTENDANCE_CAPTURE_STATES.SIN_REGISTRO),
      markedCount: active.filter(mark => mark.estadoRegistro !== ATTENDANCE_CAPTURE_STATES.SIN_REGISTRO).length,
      officialAbsencePercentage: { status: ATTENDANCE_POLICY_BOUNDARY.status, value: null }
    };
  }

  summarizeEnrollment(marks = []) { return this.summarize({ sessions: [], marks }); }
}

