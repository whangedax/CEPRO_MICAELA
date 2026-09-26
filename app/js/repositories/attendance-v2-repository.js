import { IntegrityError, OperationalError, ValidationError } from '../services/error-service.js';
import {
  ATTENDANCE_CAPTURE_STATES, ATTENDANCE_RECORD_TYPES, assertAttendanceLabName,
  generateAttendanceId, normalizeAttendanceDate, normalizeAttendanceObservation,
  normalizeAttendanceState, normalizeOptionalHours
} from '../services/attendance-v2-domain.js';
import { RUNTIME_TARGETS, getRuntimeTarget } from '../services/runtime-target-service.js';

const requestValue = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result ?? null);
  request.onerror = () => reject(request.error || new OperationalError('Lectura IndexedDB fallida.'));
});

export class AttendanceV2Repository {
  constructor(dbProvider) {
    if (typeof dbProvider !== 'function') throw new ValidationError('AttendanceV2Repository requiere proveedor de DB.');
    this.dbProvider = dbProvider;
  }

  database({ write = false } = {}) {
    const db = this.dbProvider();
    if (!db || db.name === 'CETPRO_DB' || db.version !== 2) throw new ValidationError('Asistencia v2 requiere DB schema 2 y prohíbe CETPRO_DB.');
    if (write) assertAttendanceLabName(db.name);
    else if (db.name !== 'CETPRO_V2_CANDIDATE' &&
      !(getRuntimeTarget() === RUNTIME_TARGETS.DEMO && db.name === 'CETPRO_V2_DEMO') &&
      !/^CETPRO_V2_ATTENDANCE_LAB_/.test(db.name)) {
      throw new ValidationError('DB de lectura de asistencia v2 no autorizada.');
    }
    return db;
  }

  async _all(storeName) {
    const db = this.database();
    return await requestValue(db.transaction(storeName, 'readonly').objectStore(storeName).getAll()) || [];
  }

  async getSessionById(sessionId) {
    const db = this.database();
    const value = await requestValue(db.transaction('asistencia', 'readonly').objectStore('asistencia').get(sessionId));
    return value?.recordType === ATTENDANCE_RECORD_TYPES.SESSION ? value : null;
  }

  async listSessionsByContext({ groupId, periodoId, unidadId }) {
    return (await this._all('asistencia')).filter(record => record.recordType === ATTENDANCE_RECORD_TYPES.SESSION &&
      record.groupId === groupId && record.periodoId === periodoId && record.unidadId === unidadId && record.estado !== 'ANULADA')
      .sort((a, b) => `${a.fecha}|${a.ordenSesion ?? ''}|${a.sessionId}`.localeCompare(`${b.fecha}|${b.ordenSesion ?? ''}|${b.sessionId}`));
  }

  async listMarksBySession(sessionId) {
    const db = this.database();
    const store = db.transaction('asistencia', 'readonly').objectStore('asistencia');
    const rows = store.indexNames.contains('sesionId')
      ? await requestValue(store.index('sesionId').getAll(sessionId)) : await requestValue(store.getAll());
    return (rows || []).filter(record => record.recordType === ATTENDANCE_RECORD_TYPES.MARK && record.sessionId === sessionId);
  }

  async listMarksByEnrollment(matriculaId) {
    const db = this.database();
    const store = db.transaction('asistencia', 'readonly').objectStore('asistencia');
    const rows = store.indexNames.contains('matriculaId')
      ? await requestValue(store.index('matriculaId').getAll(matriculaId)) : await requestValue(store.getAll());
    return (rows || []).filter(record => record.recordType === ATTENDANCE_RECORD_TYPES.MARK && record.matriculaId === matriculaId);
  }

  async loadDocumentContext({ groupId, periodoId, unidadId }) {
    const db = this.database();
    const stores = ['grupos_academicos', 'matriculas', 'estudiantes', 'programas', 'modulos', 'periodos', 'unidades', 'asistencia'];
    const snapshot = {};
    await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readonly');
      let pending = stores.length;
      tx.onerror = () => reject(tx.error || new OperationalError('No se pudo leer el contexto de asistencia.'));
      tx.onabort = tx.onerror;
      for (const name of stores) {
        const request = tx.objectStore(name).getAll();
        request.onsuccess = () => { snapshot[name] = request.result || []; if (--pending === 0) resolve(); };
        request.onerror = () => reject(request.error);
      }
    });
    const group = snapshot.grupos_academicos.find(item => item.id === groupId);
    const period = snapshot.periodos.find(item => item.id === periodoId);
    const unit = snapshot.unidades.find(item => item.id === unidadId);
    if (!group || !period || !unit) throw new IntegrityError('Contexto GROUP/periodo/unidad incompleto.');
    const module = snapshot.modulos.find(item => item.id === group.moduloId);
    const program = snapshot.programas.find(item => item.id === group.programaId);
    if (!module || !program || group.periodoId !== periodoId || unit.moduloId !== group.moduloId || module.programaId !== group.programaId) {
      throw new IntegrityError('Contexto académico cruzado para asistencia.');
    }
    const enrollments = snapshot.matriculas.filter(item => item.grupoId === groupId && item.estado !== 'INACTIVO');
    const studentMap = new Map(snapshot.estudiantes.map(item => [item.id, item]));
    if (!enrollments.length || enrollments.some(item => !studentMap.has(item.estudianteId) || item.programaId !== group.programaId)) {
      throw new IntegrityError('Matrículas del grupo incompletas o inconsistentes.');
    }
    const sessions = snapshot.asistencia.filter(item => item.recordType === ATTENDANCE_RECORD_TYPES.SESSION &&
      item.groupId === groupId && item.periodoId === periodoId && item.unidadId === unidadId && item.estado !== 'ANULADA');
    const sessionIds = new Set(sessions.map(item => item.sessionId));
    const marks = snapshot.asistencia.filter(item => item.recordType === ATTENDANCE_RECORD_TYPES.MARK && sessionIds.has(item.sessionId));
    return { group, period, unit, module, program, enrollments, students: enrollments.map(item => studentMap.get(item.estudianteId)), sessions, marks };
  }

  async saveSessionWithMarks({ session, marks, expectedVersion = 0, operator = 'SECRETARIA_QA', faultAt = null }) {
    const db = this.database({ write: true });
    const input = { ...session };
    if (!input.sessionId || !String(input.sessionId).startsWith('ATS-')) throw new ValidationError('sessionId técnico ATS-* obligatorio.');
    input.fecha = normalizeAttendanceDate(input.fecha);
    input.horasProgramadas = normalizeOptionalHours(input.horasProgramadas);
    if (!input.groupId || !input.periodoId || !input.unidadId) throw new ValidationError('groupId, periodoId y unidadId son obligatorios.');
    if (!Array.isArray(marks) || !marks.length) throw new ValidationError('Faltan registros por completar.');
    const normalizedMarks = marks.map(mark => ({
      matriculaId: String(mark.matriculaId || ''),
      estadoRegistro: normalizeAttendanceState(mark.estadoRegistro),
      horasRegistradas: normalizeOptionalHours(mark.horasRegistradas),
      observacion: normalizeAttendanceObservation(mark.observacion)
    }));
    const duplicated = normalizedMarks.find((mark, index) => normalizedMarks.findIndex(item => item.matriculaId === mark.matriculaId) !== index);
    if (duplicated) throw new IntegrityError('Marca duplicada para sessionId + matriculaId.');
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (input.fecha > localToday && normalizedMarks.some(mark => mark.estadoRegistro !== ATTENDANCE_CAPTURE_STATES.SIN_REGISTRO)) {
      throw new ValidationError('Una sesión futura solo puede conservar SIN_REGISTRO.');
    }

    return await new Promise((resolve, reject) => {
      const names = ['asistencia', 'auditoria', 'grupos_academicos', 'matriculas', 'periodos', 'modulos', 'unidades'];
      const tx = db.transaction(names, 'readwrite');
      const attendance = tx.objectStore('asistencia');
      let failure = null;
      let result = null;
      const abort = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      const requests = {
        group: tx.objectStore('grupos_academicos').get(input.groupId),
        members: tx.objectStore('matriculas').index('grupoId').getAll(input.groupId),
        period: tx.objectStore('periodos').get(input.periodoId),
        unit: tx.objectStore('unidades').get(input.unidadId),
        modules: tx.objectStore('modulos').getAll(),
        existingSession: attendance.get(input.sessionId),
        existingMarks: attendance.index('sesionId').getAll(input.sessionId)
      };
      let pending = Object.keys(requests).length;
      const validateAndWrite = () => {
        if (--pending) return;
        try {
          const group = requests.group.result;
          const members = (requests.members.result || []).filter(item => item.estado !== 'INACTIVO');
          const period = requests.period.result;
          const unit = requests.unit.result;
          const module = (requests.modules.result || []).find(item => item.id === group?.moduloId);
          const existingSession = requests.existingSession.result;
          const existingMarks = (requests.existingMarks.result || []).filter(item => item.recordType === ATTENDANCE_RECORD_TYPES.MARK);
          if (!group || group.estado !== 'ACTIVO' || !period || period.estado === 'INACTIVO' || !unit || unit.estado === 'INACTIVO' ||
              !group.moduloId || !module || module.programaId !== group.programaId || group.periodoId !== input.periodoId || unit.moduloId !== group.moduloId) {
            throw new IntegrityError('Contexto de grupo, periodo, módulo o unidad cambió antes de guardar.');
          }
          const memberIds = new Set(members.map(item => item.id));
          if (members.length !== normalizedMarks.length || members.some(item => item.programaId !== group.programaId) ||
              normalizedMarks.some(mark => !memberIds.has(mark.matriculaId))) {
            throw new IntegrityError('Faltan registros o existe una matrícula ajena al groupId.');
          }
          if (existingSession && existingSession.recordType !== ATTENDANCE_RECORD_TYPES.SESSION) throw new IntegrityError('sessionId colisiona con otro registro.');
          const currentVersion = existingSession?.version || 0;
          if (currentVersion !== expectedVersion) throw new IntegrityError('STALE_SESSION: Esta sesión fue modificada en otra ventana. Recargue antes de continuar.');
          if (existingSession && (existingSession.groupId !== input.groupId || existingSession.periodoId !== input.periodoId || existingSession.unidadId !== input.unidadId)) {
            throw new IntegrityError('El contexto de la sesión no puede cambiar.');
          }
          const timestamp = new Date().toISOString();
          const runtimeMeta = getRuntimeTarget() === RUNTIME_TARGETS.DEMO
            ? { environment: 'DEMO', demo: true, official: false }
            : {};
          const storedSession = {
            ...existingSession, id: input.sessionId, sessionId: input.sessionId,
            sesionId: input.sessionId,
            recordType: ATTENDANCE_RECORD_TYPES.SESSION, groupId: input.groupId, periodoId: input.periodoId,
            unidadId: input.unidadId, fecha: input.fecha, ordenSesion: input.ordenSesion ?? null,
            horasProgramadas: input.horasProgramadas, estado: input.estado || 'ACTIVA', version: currentVersion + 1,
            createdAt: existingSession?.createdAt || timestamp, updatedAt: timestamp, ...runtimeMeta
          };
          if (faultAt === 'before') throw new Error('SIMULATED_BEFORE');
          attendance.put(storedSession);
          if (faultAt === 'before_first_mark') throw new Error('SIMULATED_BEFORE_FIRST_MARK');
          const existingByEnrollment = new Map(existingMarks.map(mark => [mark.matriculaId, mark]));
          const storedMarks = [];
          const changedMarks = [];
          normalizedMarks.forEach((mark, index) => {
            const previous = existingByEnrollment.get(mark.matriculaId);
            const changed = !previous || previous.estadoRegistro !== mark.estadoRegistro ||
              previous.horasRegistradas !== mark.horasRegistradas || previous.observacion !== mark.observacion;
            const stored = changed ? {
              ...previous, id: previous?.id || generateAttendanceId('ATM'), attendanceId: previous?.attendanceId || previous?.id || null,
              recordType: ATTENDANCE_RECORD_TYPES.MARK, sessionId: input.sessionId, sesionId: input.sessionId, groupId: input.groupId,
              periodoId: input.periodoId, unidadId: input.unidadId, matriculaId: mark.matriculaId,
              estadoRegistro: mark.estadoRegistro, horasRegistradas: mark.horasRegistradas, observacion: mark.observacion,
              estadoLogico: 'ACTIVO', version: (previous?.version || 0) + 1,
              createdAt: previous?.createdAt || timestamp, updatedAt: timestamp, ...runtimeMeta
            } : previous;
            if (!stored.attendanceId) stored.attendanceId = stored.id;
            if (changed) { attendance.put(stored); changedMarks.push(stored); }
            storedMarks.push(stored);
            if (faultAt === 'first_mark' && index === 0) throw new Error('SIMULATED_FIRST_MARK');
            if (faultAt === 'middle' && index === Math.floor(normalizedMarks.length / 2)) throw new Error('SIMULATED_MIDDLE');
            if (faultAt === 'last_mark' && index === normalizedMarks.length - 1) throw new Error('SIMULATED_LAST_MARK');
          });
          const audit = tx.objectStore('auditoria');
          const sessionAuditId = generateAttendanceId('AUD-ATT');
          audit.add({ id: sessionAuditId, timestamp, entidad: 'ATTENDANCE_SESSION', entidadId: input.sessionId,
            accion: existingSession ? 'UPDATE_SESSION_WITH_MARKS' : 'CREATE_SESSION_WITH_MARKS',
            estadoAnterior: existingSession ? { version: currentVersion, markCount: existingMarks.length } : null,
            estadoNuevo: { version: storedSession.version, markCount: storedMarks.length },
            origen: { usuarioOperador: operator, pantalla: getRuntimeTarget() === RUNTIME_TARGETS.DEMO ? 'ATTENDANCE_DEMO' : 'ATTENDANCE_QA', groupId: input.groupId },
            ...runtimeMeta });
          for (const stored of changedMarks) {
            const previous = existingByEnrollment.get(stored.matriculaId);
            audit.add({ id: generateAttendanceId('AUD-ATM'), timestamp, entidad: 'ATTENDANCE_MARK', entidadId: stored.id,
              accion: previous ? 'UPDATE_ATTENDANCE_MARK' : 'CREATE_ATTENDANCE_MARK',
              estadoAnterior: previous ? { estadoRegistro: previous.estadoRegistro } : null,
              estadoNuevo: { estadoRegistro: stored.estadoRegistro },
              origen: { usuarioOperador: operator, sessionId: input.sessionId, groupId: input.groupId, matriculaId: stored.matriculaId },
              ...runtimeMeta });
          }
          if (faultAt === 'audit') throw new Error('SIMULATED_AUDIT');
          if (faultAt === 'before_commit') throw new Error('SIMULATED_BEFORE_COMMIT');
          result = { session: storedSession, marks: storedMarks, auditId: sessionAuditId };
        } catch (error) { abort(error); }
      };
      for (const request of Object.values(requests)) {
        request.onsuccess = validateAndWrite;
        request.onerror = () => abort(request.error || new OperationalError('Preflight transaccional falló.'));
      }
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new OperationalError('No se pudo guardar la asistencia. No se realizó ningún cambio.'));
      tx.onerror = () => { if (!failure) failure = tx.error; };
    });
  }
}
