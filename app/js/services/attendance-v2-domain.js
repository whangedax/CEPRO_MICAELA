import { ValidationError } from './error-service.js';
import { RUNTIME_TARGETS, getRuntimeTarget } from './runtime-target-service.js';

export const ATTENDANCE_RECORD_TYPES = Object.freeze({ SESSION: 'ATTENDANCE_SESSION', MARK: 'ATTENDANCE_MARK' });
export const ATTENDANCE_CAPTURE_STATES = Object.freeze({
  PRESENTE: 'PRESENTE', AUSENTE: 'AUSENTE', JUSTIFICADA: 'JUSTIFICADA', SIN_REGISTRO: 'SIN_REGISTRO'
});
export const ATTENDANCE_DISPLAY_MAPPING = Object.freeze({
  status: 'DISPLAY_ONLY_UNCONFIRMED', PRESENTE: 'P', AUSENTE: 'F', JUSTIFICADA: 'J', SIN_REGISTRO: ''
});
export const ATTENDANCE_POLICY_BOUNDARY = Object.freeze({
  status: 'BLOCKED_BY_POLICY', blocker: 'B-003', includedStatuses: null, absenceStatuses: null,
  excludedStatuses: null, roundingRule: null, percentageFormula: null, thresholds: null
});

export function generateAttendanceId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${String(uuid).toUpperCase()}`;
}

export function normalizeAttendanceDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError('La fecha debe usar formato YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new ValidationError('La fecha de asistencia no es válida.');
  return value;
}

export function normalizeAttendanceState(value) {
  if (!Object.values(ATTENDANCE_CAPTURE_STATES).includes(value)) throw new ValidationError('Estado técnico de asistencia no válido.');
  return value;
}

export function normalizeAttendanceObservation(value = '') {
  const text = String(value ?? '').trim();
  if (text.length > 500) throw new ValidationError('La observación no puede exceder 500 caracteres.');
  return text;
}

export function normalizeOptionalHours(value) {
  if (value === '' || value === null || value === undefined) return null;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) throw new ValidationError('Las horas registradas deben ser un número no negativo.');
  return hours;
}

export function assertAttendanceLabName(name) {
  if (getRuntimeTarget() === RUNTIME_TARGETS.DEMO && name === 'CETPRO_V2_DEMO') return;
  if (!/^CETPRO_V2_ATTENDANCE_LAB_[A-Z0-9_-]+$/.test(String(name || ''))) {
    const error = new ValidationError('Las escrituras de asistencia solo se permiten en DEMO explícito o CETPRO_V2_ATTENDANCE_LAB_* schema 2.');
    error.code = getRuntimeTarget() === RUNTIME_TARGETS.DEMO ? 'DEMO_TARGET_VIOLATION' : 'ATTENDANCE_TARGET_VIOLATION';
    throw error;
  }
}

export function buildAttendanceDraft({ session, enrollmentIds, existingMarks = [] }) {
  const byEnrollment = new Map(existingMarks.map(mark => [mark.matriculaId, mark]));
  return {
    session: { ...session },
    marks: enrollmentIds.map(matriculaId => ({
      matriculaId,
      estadoRegistro: byEnrollment.get(matriculaId)?.estadoRegistro || ATTENDANCE_CAPTURE_STATES.SIN_REGISTRO,
      horasRegistradas: byEnrollment.get(matriculaId)?.horasRegistradas ?? null,
      observacion: byEnrollment.get(matriculaId)?.observacion || ''
    })),
    dirty: false
  };
}
