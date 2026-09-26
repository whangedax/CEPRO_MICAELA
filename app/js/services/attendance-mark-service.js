import {
  ATTENDANCE_CAPTURE_STATES, buildAttendanceDraft, normalizeAttendanceObservation,
  normalizeAttendanceState, normalizeOptionalHours
} from './attendance-v2-domain.js';

export class AttendanceMarkService {
  createDraft(input) { return buildAttendanceDraft(input); }
  markAllPresent(draft) {
    return { ...draft, dirty: true, marks: draft.marks.map(mark => ({ ...mark, estadoRegistro: ATTENDANCE_CAPTURE_STATES.PRESENTE })) };
  }
  changeMark(draft, matriculaId, patch) {
    let found = false;
    const marks = draft.marks.map(mark => {
      if (mark.matriculaId !== matriculaId) return mark;
      found = true;
      return { ...mark,
        estadoRegistro: patch.estadoRegistro === undefined ? mark.estadoRegistro : normalizeAttendanceState(patch.estadoRegistro),
        horasRegistradas: patch.horasRegistradas === undefined ? mark.horasRegistradas : normalizeOptionalHours(patch.horasRegistradas),
        observacion: patch.observacion === undefined ? mark.observacion : normalizeAttendanceObservation(patch.observacion)
      };
    });
    if (!found) throw new Error('Matrícula fuera del borrador de sesión.');
    return { ...draft, dirty: true, marks };
  }
}

