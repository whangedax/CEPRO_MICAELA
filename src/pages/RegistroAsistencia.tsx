/**
 * pages/RegistroAsistencia.tsx
 * 
 * Módulo Oficial de Registro de Asistencia — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real con el backend Node.js y SQLite local.
 * 
 * Tarea 15:
 * - Protección integral contra pérdida silenciosa de cambios no guardados.
 * - Manejo accesible y robusto de conflictos de concurrencia HTTP 409 con resolución segura.
 * - Prevención estricta de condiciones de carrera y descarte de respuestas obsoletas.
 * - Integración con el motor institucional de calendario y feriados.
 * - Cumplimiento del contrato exacto de POST /api/attendance (rows, observation, rev string).
 * - Identidad visual Google Stitch (#13594A, #F6F8FA) y accesibilidad WCAG 2.2 AA.
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import apiClient from '../api/client';
import {
  AttendanceValue,
  AttendanceRowPayload,
  AttendanceRecord,
  StudentEnrollmentItem,
  StudentItem,
  WorkspaceGroupOption,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import { SelectUnitModal } from '../components/academic/SelectUnitModal';
import ActiveUnitContextBanner from '../components/academic/ActiveUnitContextBanner';
import {
  isHoliday,
  isWeekend,
  formatDisplayDate,
  getTodayLima,
  getDayOfWeekIso,
  resolveUnitDates,
  getClosestSchoolDate,
  UnitCalendarResolution,
  MonthSpan,
} from '../utils/calendar';
import {
  AttendanceIcon,
  CheckroomIcon,
  ArrowForwardIcon,
  InstitutionalBrandIcon,
} from '../components/ui/Icons';

interface LocalRowState {
  value: AttendanceValue | null;
  observation: string;
  savedValue: AttendanceValue | null;
  savedObservation: string;
  rev?: string;
  isDirty: boolean;
}

interface ConflictItem {
  enrollmentId: string;
  studentName: string;
  document: string;
  localValue: AttendanceValue | null;
  localObservation: string;
  serverValue: AttendanceValue | null;
  serverObservation: string;
  serverRev: string | null;
}

export const RegistroAsistencia: React.FC = () => {
  const { user } = useAuth();
  const {
    activeWorkspace,
    dashboardData,
    options,
    isLoading: isWorkspaceLoading,
    selectGroupAndUnit,
    loadOptions,
    openSelector,
  } = useWorkspace();

  const { requestSafeTransition, registerPendingChanges, unregisterPendingChanges } =
    usePendingChanges();

  // Fecha activa (la sesión es estrictamente '1' de acuerdo a la normativa institucional)
  const [sessionDate, setSessionDate] = useState<string>(() => getTodayLima());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estado local de filas por enrollmentId
  const [rowsState, setRowsState] = useState<Record<string, LocalRowState>>({});

  // Estados de interfaz y guardado
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error' | 'conflict';
    message: string;
  } | null>(null);

  // Estado para gestión y resolución segura de conflictos 409
  const [conflictItems, setConflictItems] = useState<ConflictItem[] | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState<boolean>(false);
  const conflictPanelRef = useRef<HTMLDivElement | null>(null);
  const conflictPreviousFocusRef = useRef<HTMLElement | null>(null);

  // Modal para cambiar unidad / aula
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [modalTargetGroup, setModalTargetGroup] = useState<WorkspaceGroupOption | null>(null);

  // Secuencia para evitar condiciones de carrera (descarte de respuestas obsoletas)
  const syncSequenceRef = useRef<number>(0);

  // Referencias mutables para garantizar acceso al estado vivo en callbacks asíncronos
  const rowsStateRef = useRef<Record<string, LocalRowState>>(rowsState);
  rowsStateRef.current = rowsState;

  const sessionDateRef = useRef<string>(sessionDate);
  sessionDateRef.current = sessionDate;

  const activeWorkspaceRef = useRef(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;

  // Identificar grupo activo
  const currentGroup = useMemo(() => {
    if (!dashboardData?.groups || !activeWorkspace?.groupId) return null;
    return dashboardData.groups.find((g) => g.id === activeWorkspace.groupId) || null;
  }, [dashboardData, activeWorkspace]);

  // Unidad activa y calendario institucional
  const activeUnitOption = useMemo(() => {
    if (!options?.groups || !activeWorkspace?.groupId || !activeWorkspace?.unit) return null;
    const grp = options.groups.find((g) => g.id === activeWorkspace.groupId);
    return grp?.units?.find((u) => u.code === activeWorkspace.unit) || null;
  }, [options, activeWorkspace]);

  const legacyCalendar = (activeWorkspace?.periodId || currentGroup?.periodId) === '2026-I';
  const unitStartDate: string = activeUnitOption?.fechaInicio || currentGroup?.fechaInicio || (legacyCalendar ? '2026-03-16' : '');
  const unitEndDate: string = activeUnitOption?.fechaFin || currentGroup?.fechaFin || (legacyCalendar ? '2026-07-24' : '');

  const unitCalendar = useMemo<UnitCalendarResolution>(() => {
    return resolveUnitDates(unitStartDate, unitEndDate);
  }, [unitStartDate, unitEndDate]);

  const [activeMonthFilter, setActiveMonthFilter] = useState<string | null>(null);
  useEffect(() => {
    setActiveMonthFilter(null);
  }, [activeWorkspace?.groupId, activeWorkspace?.unit]);

  // Auto-ajuste de fecha si hoy o la fecha actual está fuera de los días lectivos de la unidad
  useEffect(() => {
    if (unitCalendar.dates.length > 0) {
      if (sessionDate < unitStartDate || sessionDate > unitEndDate) {
        setSessionDate(unitCalendar.firstSchoolDate);
      }
    }
  }, [unitStartDate, unitEndDate, unitCalendar.firstSchoolDate, sessionDate]);

  // Validación estricta de fecha para registro de asistencia:
  // Dentro del rango de la UD, Lu-Vi, y sin ser feriado
  const dateValidationError = useMemo<string | null>(() => {
    if (!unitCalendar.fechaInicio) return 'Esta unidad aún no tiene un calendario configurado. Consulte con Dirección.';
    if (!sessionDate) return 'Debe seleccionar una fecha de sesión.';
    if (sessionDate < unitStartDate || sessionDate > unitEndDate) {
      return `La fecha ${sessionDate} está fuera del rango oficial de la unidad didáctica (${unitStartDate} al ${unitEndDate}).`;
    }
    const holidayReason = isHoliday(sessionDate);
    if (holidayReason) {
      return `La fecha ${sessionDate} es feriado o día no lectivo (${holidayReason}). No se permite registrar asistencia.`;
    }
    if (isWeekend(sessionDate)) {
      const dow = getDayOfWeekIso(sessionDate);
      return `La fecha ${sessionDate} corresponde a fin de semana (${dow === 0 ? 'domingo' : 'sábado'}). Las clases ordinarias son de lunes a viernes.`;
    }
    return null;
  }, [sessionDate, unitStartDate, unitEndDate, unitCalendar.fechaInicio]);

  // Fechas que tienen al menos una marca de asistencia guardada con valor válido no nulo (P, F, J, T)
  const datesWithValidAttendance = useMemo(() => {
    const set = new Set<string>();
    if (!dashboardData?.attendance || !activeWorkspace?.unit) return set;
    for (const att of dashboardData.attendance) {
      if (
        att.unit === activeWorkspace.unit &&
        att.value !== null &&
        att.value !== undefined &&
        String(att.value).trim() !== ''
      ) {
        set.add(att.date);
      }
    }
    return set;
  }, [dashboardData?.attendance, activeWorkspace?.unit]);

  // Lista de matrículas activas del grupo ordenadas alfabéticamente
  const rosterData = useMemo(() => {
    if (!dashboardData?.enrollments || !dashboardData?.students || !activeWorkspace?.groupId) {
      return [];
    }

    const studentsMap = new Map<string, StudentItem>();
    for (const s of dashboardData.students) {
      studentsMap.set(s.id, s);
    }

    const activeEnrollments = dashboardData.enrollments.filter(
      (e: StudentEnrollmentItem) => e.groupId === activeWorkspace.groupId && e.active
    );

    const list = activeEnrollments.map((en: StudentEnrollmentItem) => {
      const student = studentsMap.get(en.studentId);
      return {
        enrollment: en,
        student: student || {
          id: en.studentId,
          name: 'Estudiante no registrado',
          document: 'S/D',
          active: true,
        },
      };
    });

    // Ordenar alfabéticamente por apellido / nombre
    list.sort((a, b) => a.student.name.localeCompare(b.student.name, 'es'));
    return list;
  }, [dashboardData, activeWorkspace]);

  // Sincronizar estado de filas cuando cambie la fecha o datos de dashboard (consolidado por fecha)
  useEffect(() => {
    if (!activeWorkspace?.unit || !activeWorkspace?.groupId || !dashboardData) {
      setRowsState({});
      return;
    }

    const currentAttendance = dashboardData.attendance || [];
    const newRows: Record<string, LocalRowState> = {};

    for (const item of rosterData) {
      const enId = item.enrollment.id;
      // Buscar marcas existentes para esta matrícula, unidad y fecha consolidando por fecha
      const matchingRecords = currentAttendance.filter(
        (att: AttendanceRecord) =>
          att.enrollmentId === enId &&
          att.unit === activeWorkspace.unit &&
          att.date === sessionDate
      );

      let match: AttendanceRecord | undefined;
      if (matchingRecords.length === 1) {
        match = matchingRecords[0];
      } else if (matchingRecords.length > 1) {
        // Si existen múltiples marcas heredadas para la misma fecha+matrícula, priorizar session '1' y luego el más reciente por updatedAt
        matchingRecords.sort((a, b) => {
          const aSess1 = String(a.session || '').trim() === '1' ? 1 : 0;
          const bSess1 = String(b.session || '').trim() === '1' ? 1 : 0;
          if (aSess1 !== bSess1) return bSess1 - aSess1;
          const aTime = a.updatedAt || '';
          const bTime = b.updatedAt || '';
          return bTime.localeCompare(aTime);
        });
        match = matchingRecords[0];
      }

      const val = (match?.value as AttendanceValue) || null;
      const obs = match?.observation || '';

      newRows[enId] = {
        value: val,
        observation: obs,
        savedValue: val,
        savedObservation: obs,
        rev: match?.rev,
        isDirty: false,
      };
    }

    setRowsState(newRows);
  }, [rosterData, activeWorkspace, sessionDate, dashboardData]);

  // Determinar si hay cambios locales no guardados
  const hasUnsavedChanges = useMemo(() => {
    return Object.values(rowsState).some((r) => r.isDirty);
  }, [rowsState]);

  // Descartar modificaciones locales y volver al estado guardado
  const handleDiscardLocalChanges = useCallback(() => {
    setRowsState((prev) => {
      const reverted: Record<string, LocalRowState> = {};
      for (const [id, r] of Object.entries(prev)) {
        reverted[id] = {
          ...r,
          value: r.savedValue,
          observation: r.savedObservation,
          isDirty: false,
        };
      }
      return reverted;
    });
    setSaveFeedback(null);
    setConflictItems(null);
  }, []);

  // Guardar asistencia en backend oficial (POST /api/attendance)
  const executeSaveInternal = useCallback(async (): Promise<boolean> => {
    const ws = activeWorkspaceRef.current;
    const currentRows = rowsStateRef.current;
    const activeDate = sessionDateRef.current;
    const activeSession = '1';

    if (!ws?.groupId || !ws?.unit || currentGroup?.closed) {
      return false;
    }

    if (dateValidationError) {
      setSaveFeedback({
        type: 'error',
        message: dateValidationError,
      });
      return false;
    }

    // Recolectar únicamente las filas modificadas del estado vivo
    const changedRows: AttendanceRowPayload[] = [];

    for (const [enrollmentId, state] of Object.entries(currentRows)) {
      if (state.isDirty) {
        const isClearing = state.value === null && state.savedValue !== null;
        changedRows.push({
          enrollmentId,
          value: state.value,
          clear: isClearing,
          observation: state.observation,
          rev: state.rev || null,
        });
      }
    }

    if (changedRows.length === 0) {
      setSaveFeedback({
        type: 'success',
        message: 'No hay modificaciones pendientes para guardar.',
      });
      return true;
    }

    setIsSaving(true);
    setSaveFeedback(null);
    const thisSeq = ++syncSequenceRef.current;

    try {
      const savedRecords = await apiClient.saveAttendance({
        groupId: ws.groupId,
        unit: ws.unit,
        date: activeDate,
        session: activeSession,
        rows: changedRows,
      });

      // Refrescar opciones y dashboard para sincronizar revisions de la BD
      await loadOptions();

      // Sincronizar inmediatamente el estado local para limpiar bandera dirty
      setRowsState((prev) => {
        const updated = { ...prev };
        for (const rec of savedRecords) {
          if (updated[rec.enrollmentId]) {
            updated[rec.enrollmentId] = {
              ...updated[rec.enrollmentId],
              savedValue: rec.value,
              savedObservation: rec.observation || '',
              value: rec.value,
              observation: rec.observation || '',
              rev: rec.rev,
              isDirty: false,
            };
          }
        }
        return updated;
      });

      if (thisSeq !== syncSequenceRef.current) {
        // La vista cambió mientras se guardaba; descartar actualización visual de respuesta obsoleta
        return true;
      }

      setSaveFeedback({
        type: 'success',
        message: `Guardado en este equipo · ${savedRecords.length} registro(s) confirmados en SQLite local.`,
      });
      return true;
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        // Conflicto de concurrencia: consultar versión fresca del servidor y mostrar resolución
        try {
          const freshDash = await apiClient.getDashboard();
          const freshAttendance = freshDash.attendance || [];
          const conflicts: ConflictItem[] = [];

          for (const row of changedRows) {
            const matchingServer = freshAttendance.filter(
              (a: AttendanceRecord) =>
                a.enrollmentId === row.enrollmentId &&
                a.unit === ws.unit &&
                a.date === activeDate
            );

            let serverRec: AttendanceRecord | undefined;
            if (matchingServer.length === 1) {
              serverRec = matchingServer[0];
            } else if (matchingServer.length > 1) {
              matchingServer.sort((a, b) => {
                const aS1 = String(a.session || '').trim() === '1' ? 1 : 0;
                const bS1 = String(b.session || '').trim() === '1' ? 1 : 0;
                if (aS1 !== bS1) return bS1 - aS1;
                return (b.updatedAt || '').localeCompare(a.updatedAt || '');
              });
              serverRec = matchingServer[0];
            }

            const student = rosterData.find((ro) => ro.enrollment.id === row.enrollmentId)?.student;
            conflicts.push({
              enrollmentId: row.enrollmentId,
              studentName: student?.name || 'Estudiante',
              document: student?.document || 'S/D',
              localValue: row.value,
              localObservation: row.observation || '',
              serverValue: (serverRec?.value as AttendanceValue) || null,
              serverObservation: serverRec?.observation || '',
              serverRev: serverRec?.rev || null,
            });
          }

          setConflictItems(conflicts);
        } catch {
          // Si falla la consulta adicional, conservar los cambios locales
        }

        setSaveFeedback({
          type: 'conflict',
          message: `Conflicto de actualización: ${apiErr.error || 'Este registro fue modificado en otra sesión.'}`,
        });
      } else {
        setSaveFeedback({
          type: 'error',
          message: apiErr?.error || (err instanceof Error ? err.message : 'Error al guardar la asistencia en el servidor local.'),
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeWorkspace, currentGroup, rowsState, sessionDate, dateValidationError, loadOptions, rosterData]);

  // Registro del hook de cambios pendientes
  useEffect(() => {
    if (hasUnsavedChanges) {
      registerPendingChanges({
        id: 'asistencia',
        hasChanges: true,
        message:
          'Hay cambios de asistencia sin guardar. Si continúa, perderá las modificaciones pendientes.',
        onSave: executeSaveInternal,
        onDiscard: handleDiscardLocalChanges,
      });
    } else {
      unregisterPendingChanges('asistencia');
    }

    return () => {
      unregisterPendingChanges('asistencia');
    };
  }, [
    hasUnsavedChanges,
    registerPendingChanges,
    unregisterPendingChanges,
    executeSaveInternal,
    handleDiscardLocalChanges,
  ]);

  // Interceptores seguros para cambios de fecha locales
  const handleDateChange = (newDate: string) => {
    if (!newDate || newDate === sessionDate) return;

    // Auto-corregir fechas al día escolar válido más cercano de la UD
    let targetDate = newDate;
    if (unitCalendar.dates.length > 0 && !unitCalendar.dates.includes(targetDate)) {
      targetDate = getClosestSchoolDate(targetDate, unitCalendar.dates);
    }

    if (targetDate === sessionDate) return;

    if (hasUnsavedChanges) {
      requestSafeTransition(() => {
        setSessionDate(targetDate);
      });
    } else {
      setSessionDate(targetDate);
    }
  };

  // Manejador de cambio de marca para un estudiante
  const handleMarkChange = (enrollmentId: string, mark: AttendanceValue) => {
    if (currentGroup?.closed || dateValidationError) return;

    setRowsState((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;

      // Si hace clic en la misma marca, se desmarca (queda pendiente/null)
      const nextValue = current.value === mark ? null : mark;
      const dirty = nextValue !== current.savedValue || current.observation !== current.savedObservation;

      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          value: nextValue,
          isDirty: dirty,
        },
      };
    });
  };

  // Manejador de cambio de observación
  const handleObservationChange = (enrollmentId: string, text: string) => {
    if (currentGroup?.closed || dateValidationError) return;

    setRowsState((prev) => {
      const current = prev[enrollmentId];
      if (!current) return prev;

      const dirty = current.value !== current.savedValue || text !== current.savedObservation;

      return {
        ...prev,
        [enrollmentId]: {
          ...current,
          observation: text,
          isDirty: dirty,
        },
      };
    });
  };

  // Acción rápida: Marcar presentes a todos los habilitados
  const handleMarkAllPresent = () => {
    if (currentGroup?.closed || dateValidationError) return;
    if (!window.confirm('¿Desea marcar PRESENTE (P) a todos los estudiantes habilitados para esta sesión?')) {
      return;
    }

    setRowsState((prev) => {
      const updated = { ...prev };
      for (const item of rosterData) {
        const enId = item.enrollment.id;
        // Omitir si la sesión es anterior a su ingreso
        if (item.enrollment.startDate && sessionDate < item.enrollment.startDate) {
          continue;
        }

        const current = updated[enId];
        if (current) {
          const nextVal: AttendanceValue = 'P';
          const dirty = nextVal !== current.savedValue || current.observation !== current.savedObservation;
          updated[enId] = {
            ...current,
            value: nextVal,
            isDirty: dirty,
          };
        }
      }
      return updated;
    });
  };

  // Guardar manual al pulsar el botón principal
  const handleSaveClick = async () => {
    if (dateValidationError) {
      setSaveFeedback({
        type: 'error',
        message: dateValidationError,
      });
      return;
    }
    await executeSaveInternal();
  };

  // Filtrado de estudiantes por búsqueda
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return rosterData;
    const query = searchQuery.trim().toLowerCase();
    return rosterData.filter((item) => {
      const nameMatch = item.student.name.toLowerCase().includes(query);
      const docMatch = String(item.student.document || '').includes(query);
      return nameMatch || docMatch;
    });
  }, [rosterData, searchQuery]);

  // Contadores de asistencia
  const counts = useMemo(() => {
    let completed = 0;
    let pCount = 0;
    let fCount = 0;
    let jCount = 0;
    let tCount = 0;

    for (const state of Object.values(rowsState)) {
      if (state.value) {
        completed++;
        if (state.value === 'P') pCount++;
        if (state.value === 'F') fCount++;
        if (state.value === 'J') jCount++;
        if (state.value === 'T') tCount++;
      }
    }

    return {
      total: rosterData.length,
      completed,
      pending: rosterData.length - completed,
      pCount,
      fCount,
      jCount,
      tCount,
    };
  }, [rowsState, rosterData.length]);

  // Manejo de cambio de unidad desde modal protegido ante cambios pendientes
  const handleOpenUnitModal = () => {
    const openModal = () => {
      if (options && activeWorkspace?.groupId) {
        const g = options.groups.find((group) => group.id === activeWorkspace.groupId);
        if (g) {
          setModalTargetGroup(g);
          setIsUnitModalOpen(true);
        }
      }
    };

    if (hasUnsavedChanges) {
      requestSafeTransition(openModal);
    } else {
      openModal();
    }
  };

  // =========================================================================
  // GESTIÓN Y RESOLUCIÓN SEGURA DE CONFLICTOS HTTP 409
  // =========================================================================

  // Trampa de foco, cierre con Escape y retorno de foco en modal de conflictos 409
  const isConflictModalOpen = Boolean(conflictItems && conflictItems.length > 0);
  useEffect(() => {
    if (!isConflictModalOpen) return;

    conflictPreviousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = conflictPanelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    };

    const rafId = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isResolvingConflict) {
          e.preventDefault();
          handleConflictKeepLocal();
        }
        return;
      }

      if (e.key !== 'Tab' || !conflictPanelRef.current) return;
      const focusables = Array.from(
        conflictPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !conflictPanelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !conflictPanelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (conflictPreviousFocusRef.current && typeof conflictPreviousFocusRef.current.focus === 'function') {
        conflictPreviousFocusRef.current.focus();
      }
    };
  }, [isConflictModalOpen, isResolvingConflict]);

  // Opción 1: Conservar cambios locales sin enviar
  const handleConflictKeepLocal = () => {
    setConflictItems(null);
    setSaveFeedback({
      type: 'conflict',
      message:
        'Modificaciones locales conservadas en pantalla sin enviar. Puede revisarlas o anotarlas sin riesgo de sobrescritura.',
    });
  };

  // Opción 2: Descartar cambios locales y cargar versión del servidor
  const handleConflictDiscardAndLoadServer = async () => {
    if (!conflictItems) {
      setConflictItems(null);
      return;
    }

    setRowsState((prev) => {
      const updated = { ...prev };
      for (const item of conflictItems) {
        if (updated[item.enrollmentId]) {
          updated[item.enrollmentId] = {
            value: item.serverValue,
            observation: item.serverObservation,
            savedValue: item.serverValue,
            savedObservation: item.serverObservation,
            rev: item.serverRev || undefined,
            isDirty: false,
          };
        }
      }
      return updated;
    });

    setConflictItems(null);
    await loadOptions();
    setSaveFeedback({
      type: 'success',
      message: 'Se cargaron los valores y revisiones vigentes del servidor.',
    });
  };

  // Opción 3: Reaplicar cambios locales con la revisión vigente del servidor
  const handleConflictReapplyWithServerRev = async () => {
    if (!conflictItems || !activeWorkspace?.groupId || !activeWorkspace?.unit) return;

    setIsResolvingConflict(true);
    try {
      const rowsToReapply: AttendanceRowPayload[] = [];
      for (const item of conflictItems) {
        const isClearing = item.localValue === null;
        rowsToReapply.push({
          enrollmentId: item.enrollmentId,
          value: item.localValue,
          clear: isClearing,
          observation: item.localObservation,
          rev: item.serverRev || null,
        });
      }

      const saved = await apiClient.saveAttendance({
        groupId: activeWorkspace.groupId,
        unit: activeWorkspace.unit,
        date: sessionDate,
        session: '1',
        rows: rowsToReapply,
      });

      await loadOptions();

      setRowsState((prev) => {
        const updated = { ...prev };
        for (const item of conflictItems) {
          const rec = saved.find((s) => s.enrollmentId === item.enrollmentId);
          if (updated[item.enrollmentId]) {
            updated[item.enrollmentId] = {
              value: item.localValue,
              observation: item.localObservation,
              savedValue: item.localValue,
              savedObservation: item.localObservation,
              rev: rec?.rev || item.serverRev || undefined,
              isDirty: false,
            };
          }
        }
        return updated;
      });

      setConflictItems(null);
      setSaveFeedback({
        type: 'success',
        message: `Cambios reaplicados con éxito usando la revisión vigente · ${saved.length} registro(s) confirmados.`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setSaveFeedback({
        type: 'error',
        message: apiErr?.error || 'No se pudieron reaplicar los cambios en el servidor.',
      });
    } finally {
      setIsResolvingConflict(false);
    }
  };

  // =========================================================================
  // RENDER CONDICIONAL DE ESTADOS DE WORKSPACE
  // =========================================================================

  // Estado: Cargando datos
  if (isWorkspaceLoading && !dashboardData) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-line border-t-brand rounded-full animate-spin" />
        <p className="text-sm font-semibold text-muted">
          Cargando registros de asistencia desde el servicio local…
        </p>
      </div>
    );
  }

  // Estado: Sin espacio de trabajo activo
  if (!activeWorkspace || !activeWorkspace.groupId) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in duration-300">
        <DashboardPhotoBand as="header" scene="calendario" contentClassName="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
            <AttendanceIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">
            No hay un aula activa seleccionada
          </h1>
          <p className="text-sm text-muted max-w-lg mx-auto mb-6 leading-relaxed">
            Para registrar asistencia, primero debe seleccionar una de sus aulas autorizadas desde el panel de inicio.
          </p>
          <button
            type="button"
            onClick={() => openSelector(1)}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[10px] bg-brand text-on-brand font-bold text-xs hover:opacity-90 transition-all shadow-[var(--ui-shadow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span>Seleccionar Aula y Unidad Didáctica</span>
            <ArrowForwardIcon className="w-4 h-4" />
          </button>
        </DashboardPhotoBand>
      </div>
    );
  }

  // Estado: Modo MODULE activo
  if (activeWorkspace.mode === 'MODULE') {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-300">
        <ActiveUnitContextBanner variant="full" />

        <DashboardPhotoBand as="header" scene="calendario" contentClassName="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <AttendanceIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">
            Seleccione una unidad didáctica para registrar asistencia
          </h1>
          <p className="text-sm text-muted max-w-lg mx-auto mb-6 leading-relaxed">
            Actualmente se encuentra en la vista general del módulo. Haga clic en cualquiera de las píldoras de unidad didáctica arriba (UD 1, UD 2, etc.) o use el selector para tomar asistencia.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenUnitModal}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-[10px] bg-brand text-on-brand font-bold text-xs hover:opacity-90 transition-all shadow-[var(--ui-shadow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Elegir Unidad Didáctica de este grupo
            </button>
            <a
              href="#/inicio"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-[10px] bg-surface-alt text-ink border border-line font-semibold text-xs hover:bg-brand-soft transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Volver al Inicio
            </a>
          </div>
        </DashboardPhotoBand>

        {/* Modal de selección de unidad */}
        {modalTargetGroup && (
          <SelectUnitModal
            isOpen={isUnitModalOpen}
            group={modalTargetGroup}
            programName={currentGroup?.programId || 'Programa'}
            moduleName={currentGroup?.moduleId || 'Módulo'}
            currentUnitCode={activeWorkspace.unit}
            onClose={() => setIsUnitModalOpen(false)}
            onConfirm={async (group, mode, unitCode) => {
              await selectGroupAndUnit(group, mode, unitCode);
              setIsUnitModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // PANTALLA PRINCIPAL DE ASISTENCIA (MODO UNIT)
  // =========================================================================

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Encabezado Institucional y Breadcrumbs */}
      <DashboardPhotoBand as="header" scene="calendario" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-brand uppercase tracking-widest bg-brand-soft px-2.5 py-1 rounded-full">
              Operación Académica
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">
            Control de Asistencia
          </h1>
          <p className="text-sm font-medium text-muted mt-1">
            Registro diario de asistencia por sesión y cómputo de asistencias institucionales.
          </p>
        </div>

        {/* Contexto Activo y Botón de Cambio */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleOpenUnitModal}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface hover:bg-surface-alt text-ink text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            title="Cambiar aula o unidad didáctica"
          >
            Cambiar aula / UD
          </button>
        </div>
      </DashboardPhotoBand>

      {/* Banner Transversal de Contexto de Unidad Activa (con cambio de UD 1..UD 7 en 1 clic) */}
      <ActiveUnitContextBanner variant="full" />

      {/* 2. Banner de Grupo Cerrado */}
      {currentGroup?.closed && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-[var(--ui-shadow)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg className="w-5 h-5 shrink-0 text-amber-700 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="min-w-0">
              <strong className="block text-sm font-bold">
                Registro cerrado institucionalmente
              </strong>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Este grupo ha sido cerrado por Dirección. La asistencia se encuentra en modo solo consulta. Solicite reapertura a dirección para realizar modificaciones.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-extrabold uppercase px-2.5 py-1 bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-full">
            Solo Consulta
          </span>
        </div>
      )}

      {/* 3. Alerta Bloqueante de Fecha No Lectiva / Fuera de Rango */}
      {dateValidationError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-[var(--ui-shadow)]"
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-rose-700 dark:text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div className="min-w-0">
            <strong className="block text-sm font-bold">
              Registro no habilitado para esta fecha
            </strong>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
              {dateValidationError}
            </p>
          </div>
        </div>
      )}

      {/* 4. Feedback de Guardado / Errores / Conflictos */}
      {saveFeedback && (
        <div
          id="attendance-save-feedback"
          role="alert"
          aria-live="polite"
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-[var(--ui-shadow)] ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
              : saveFeedback.type === 'conflict'
              ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800/60 text-purple-900 dark:text-purple-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {saveFeedback.type === 'success' ? (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="text-xs font-bold leading-relaxed">
              {saveFeedback.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-xs font-semibold rounded-[10px] text-ink hover:bg-surface-alt transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4.5. Banner Oficial del Calendario de la Unidad Didáctica y Selector Rápido de Días */}
      <div className="bg-surface rounded-2xl p-5 border border-line shadow-[var(--ui-shadow)] space-y-4">
        {/* Cabecera del Banner: Información de la Unidad y Píldoras de Meses */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-line">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Calendario Oficial · {activeWorkspace.unit}
              </span>
              <span className="text-xs font-bold text-ink truncate">
                {activeUnitOption?.name || activeWorkspace.unitName || 'Unidad Didáctica Activa'}
              </span>
            </div>
            <p className="text-xs text-muted tabular-nums">
              {unitCalendar.fechaInicio ? (
                <>Vigencia programada: <strong className="text-ink">{unitStartDate} al {unitEndDate}</strong> · {unitCalendar.totalDays} días lectivos oficiales (Lu-Vi)</>
              ) : 'Calendario sin configurar'}
            </p>
          </div>

          {/* Píldoras de Meses Automáticos */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted mr-1">
              Meses:
            </span>
            <button
              type="button"
              onClick={() => setActiveMonthFilter(null)}
              className={`min-h-[44px] px-3.5 py-2 rounded-[10px] text-xs font-bold tabular-nums transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                activeMonthFilter === null
                  ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                  : 'bg-surface-alt text-ink hover:bg-brand-soft border border-line'
              }`}
            >
              Todos ({unitCalendar.totalDays}d)
            </button>
            {unitCalendar.monthSpans.map((m) => (
              <button
                key={m.monthKey}
                type="button"
                onClick={() => setActiveMonthFilter(activeMonthFilter === m.monthKey ? null : m.monthKey)}
                className={`min-h-[44px] px-3.5 py-2 rounded-[10px] text-xs font-bold tabular-nums transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  activeMonthFilter === m.monthKey
                    ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                    : 'bg-surface-alt text-ink hover:bg-brand-soft border border-line'
                }`}
              >
                <span>{m.shortLabel}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                  activeMonthFilter === m.monthKey ? 'bg-on-brand/20 text-on-brand' : 'bg-surface text-muted border border-line'
                }`}>
                  {m.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Carrusel / Selector Horizontal de Días Lectivos */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-muted px-1">
            <span>Días de sesión programados (Seleccione para registrar):</span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" /> Con asistencia registrada
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="w-2 h-2 rounded-full bg-line" aria-hidden="true" /> Sin registrar
              </span>
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {unitCalendar.dates
              .filter((d) => !activeMonthFilter || d.startsWith(activeMonthFilter))
              .map((d) => {
                const isSelected = d === sessionDate;
                const hasSaved = datesWithValidAttendance.has(d);
                const dayNum = d.slice(8);
                const dow = getDayOfWeekIso(d);
                const dowName = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'][dow] || '';

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDateChange(d)}
                    className={`shrink-0 flex flex-col items-center justify-center min-w-[52px] min-h-[56px] py-2 px-2.5 rounded-[10px] border text-xs font-bold tabular-nums transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isSelected
                        ? 'bg-brand border-brand text-on-brand shadow-[var(--ui-shadow)] ring-2 ring-brand/30'
                        : hasSaved
                        ? 'bg-brand-soft border-brand/40 text-ink hover:border-brand'
                        : 'bg-surface-alt border-line text-ink hover:bg-brand-soft/60'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-on-brand/85' : 'text-muted'}`}>
                      {dowName}
                    </span>
                    <span className="text-sm font-extrabold my-0.5 tabular-nums">
                      {dayNum}
                    </span>
                    <span className="text-[10px] leading-none">
                      {hasSaved ? (
                        <span className={isSelected ? 'text-on-brand font-bold' : 'text-emerald-700 dark:text-emerald-300 font-bold'}>
                          ✓
                        </span>
                      ) : (
                        <span className={isSelected ? 'text-on-brand/50' : 'text-muted'}>
                          ○
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* 5. Barra de Herramientas de Sesión */}
      <div className="bg-surface rounded-2xl p-5 border border-line shadow-[var(--ui-shadow)] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Selector de Fecha */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="attendance-date"
              className="text-[11px] font-bold text-muted uppercase tracking-wider"
            >
              Fecha de sesión
            </label>
            <input
              id="attendance-date"
              type="date"
              min={unitStartDate}
              max={unitEndDate}
              value={sessionDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-surface-alt border border-line text-xs font-bold tabular-nums text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Etiqueta de Fecha en Español */}
          <div className="flex flex-col gap-1.5 self-end">
            <span className="min-h-[44px] inline-flex items-center text-xs font-semibold tabular-nums text-muted bg-surface-alt px-3.5 py-2 rounded-[10px] border border-line">
              {formatDisplayDate(sessionDate)}
            </span>
          </div>
        </div>

        {/* Acciones de Lote y Guardado */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={Boolean(currentGroup?.closed) || Boolean(dateValidationError) || rosterData.length === 0}
            className="min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface hover:bg-surface-alt text-ink text-xs font-bold transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Marcar todos presentes (P)
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={Boolean(currentGroup?.closed) || Boolean(dateValidationError) || isSaving || !hasUnsavedChanges}
            className="min-h-[44px] px-5 py-2.5 rounded-[10px] bg-brand hover:opacity-90 text-on-brand text-xs font-extrabold shadow-[var(--ui-shadow)] transition-all flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-on-brand/30 border-t-on-brand rounded-full animate-spin" />
                <span>Guardando…</span>
              </>
            ) : (
              <>
                <span>Guardar asistencia</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6. Barra de Resumen de Conteo y Filtro de Búsqueda */}
      <div className="bg-surface rounded-2xl p-4 border border-line shadow-[var(--ui-shadow)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Contadores Accesibles */}
        <div className="flex items-center gap-2 text-xs flex-wrap tabular-nums">
          <span className="font-bold text-ink mr-1">Cómputo:</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60">
            {counts.pCount} Presentes
          </span>
          <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800/60">
            {counts.fCount} Faltas
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/60">
            {counts.jCount} Justificadas
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60">
            {counts.tCount} Tardanzas
          </span>
          <span className="px-2.5 py-1 rounded-full bg-surface-alt text-muted font-semibold border border-line">
            {counts.pending} Sin marcar
          </span>
        </div>

        {/* Buscador y Estado ARIA */}
        <div className="w-full md:w-72">
          <label htmlFor="search-students" className="sr-only">
            Buscar estudiante por nombre o documento
          </label>
          <input
            id="search-students"
            type="search"
            placeholder="Buscar por apellido, nombre o DNI…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] bg-surface-alt border border-line text-xs font-semibold text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <div aria-live="polite" role="status" className="sr-only">
            {filteredRoster.length} estudiantes listados
          </div>
        </div>
      </div>

      {/* 7. Tabla Principal de Estudiantes */}
      <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] overflow-hidden">
        <ul aria-label="Significado de las marcas de asistencia" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line px-4 py-3 text-xs font-semibold">
          <li className="text-emerald-800 dark:text-emerald-300">P · Presente</li>
          <li className="text-rose-800 dark:text-rose-300">F · Falta</li>
          <li className="text-blue-800 dark:text-blue-300">J · Justificada</li>
          <li className="text-amber-900 dark:text-amber-200">T · Tardanza</li>
        </ul>
        <div role="region" aria-label="Listado de asistencia" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
          <table className="record-table w-full text-left border-collapse" aria-label="Nómina oficial de estudiantes">
            <thead>
              <tr className="bg-surface-alt border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-4 w-12 min-w-[48px] text-center lg:sticky lg:left-0 lg:z-20 bg-surface-alt">N°</th>
                <th scope="col" className="py-3.5 px-4 min-w-[220px] lg:sticky lg:left-[48px] lg:z-20 bg-surface-alt border-r border-line">Estudiante e identificadores</th>
                <th scope="col" className="py-3.5 px-4 text-center min-w-[260px]">Control de Asistencia</th>
                <th scope="col" className="py-3.5 px-4 min-w-[200px]">Observación pedagógica</th>
                <th scope="col" className="py-3.5 px-4 text-center w-32">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted font-medium">
                    No se encontraron estudiantes para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item, index) => {
                  const enId = item.enrollment.id;
                  const row = rowsState[enId] || {
                    value: null,
                    observation: '',
                    savedValue: null,
                    savedObservation: '',
                    isDirty: false,
                  };

                  const isPriorToEnrollment =
                    Boolean(item.enrollment.startDate) &&
                    sessionDate < (item.enrollment.startDate || '');

                  const isDisabled = Boolean(currentGroup?.closed) || Boolean(dateValidationError) || isPriorToEnrollment;
                  const rowStickyBg = row.isDirty ? 'bg-surface-alt' : 'bg-surface';

                  return (
                    <tr
                      key={enId}
                      className={`hover:bg-surface-alt transition-colors ${
                        row.isDirty ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      {/* Número de Orden */}
                      <td className={`py-3 px-4 text-center font-bold tabular-nums text-muted lg:sticky lg:left-0 lg:z-10 ${rowStickyBg}`}>
                        {index + 1}
                      </td>

                      {/* Datos del Estudiante */}
                      <td className={`py-3 px-4 lg:sticky lg:left-[48px] lg:z-10 border-r border-line ${rowStickyBg}`}>
                        <div className="flex min-w-[240px] max-w-[320px] flex-col gap-2">
                          <span className="record-name break-words text-base font-semibold leading-snug text-brand" title={item.student.name}>{item.student.name}</span>
                          <dl className="grid gap-1.5 text-sm leading-relaxed">
                            <div className="flex flex-wrap items-baseline gap-x-2"><dt className="record-label text-muted">DNI</dt><dd className="record-code break-all font-medium tabular-nums text-ink">{item.student.document || "S/D"}</dd></div>
                            <div className="flex flex-wrap items-baseline gap-x-2"><dt className="record-label text-muted">Matrícula</dt><dd className="record-academic break-all font-medium tabular-nums text-ink">{item.enrollment.code || enId}</dd></div>
                          </dl>
                          {isPriorToEnrollment && (
                            <span className="text-[10px] font-bold tabular-nums text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full mt-1 self-start">
                              Ingreso posterior ({item.enrollment.startDate})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Botones de Marcado P, F, J, T */}
                      <td className="py-3 px-4">
                        <div role="group" aria-label={"Asistencia de " + item.student.name} className="flex flex-wrap items-center justify-center gap-2">
                          {/* P - Presente */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'P'}
                            aria-label={`Marcar Presente para ${item.student.name}`}
                            title="Presente"
                            onClick={() => handleMarkChange(enId, 'P')}
                            className={`min-w-[44px] min-h-[44px] rounded-[10px] px-2 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                              row.value === 'P'
                                ? 'bg-emerald-700 text-white border-2 border-emerald-800 dark:bg-emerald-300 dark:text-emerald-950 dark:border-emerald-300'
                                : 'bg-surface-alt text-ink border border-line hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300'
                            }`}
                          >
                            <span>P</span> <span className="hidden 2xl:inline">Presente</span>
                            {row.value === "P" && <span aria-hidden="true" className="ml-1">✓</span>}
                          </button>

                          {/* F - Falta */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'F'}
                            aria-label={`Marcar Falta para ${item.student.name}`}
                            title="Falta"
                            onClick={() => handleMarkChange(enId, 'F')}
                            className={`min-w-[44px] min-h-[44px] rounded-[10px] px-2 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                              row.value === 'F'
                                ? 'bg-red-700 text-white border-2 border-red-800 dark:bg-red-300 dark:text-red-950 dark:border-red-300'
                                : 'bg-surface-alt text-ink border border-line hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-800 dark:hover:text-rose-300'
                            }`}
                          >
                            <span>F</span> <span className="hidden 2xl:inline">Falta</span>
                            {row.value === "F" && <span aria-hidden="true" className="ml-1">✓</span>}
                          </button>

                          {/* J - Justificada */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'J'}
                            aria-label={`Marcar Justificada para ${item.student.name}`}
                            title="Justificada"
                            onClick={() => handleMarkChange(enId, 'J')}
                            className={`min-w-[44px] min-h-[44px] rounded-[10px] px-2 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                              row.value === 'J'
                                ? 'bg-blue-700 text-white border-2 border-blue-800 dark:bg-blue-300 dark:text-blue-950 dark:border-blue-300'
                                : 'bg-surface-alt text-ink border border-line hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-800 dark:hover:text-blue-300'
                            }`}
                          >
                            <span>J</span> <span className="hidden 2xl:inline">Justificada</span>
                            {row.value === "J" && <span aria-hidden="true" className="ml-1">✓</span>}
                          </button>

                          {/* T - Tardanza */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'T'}
                            aria-label={`Marcar Tardanza para ${item.student.name}`}
                            title="Tardanza"
                            onClick={() => handleMarkChange(enId, 'T')}
                            className={`min-w-[44px] min-h-[44px] rounded-[10px] px-2 font-semibold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                              row.value === 'T'
                                ? 'bg-amber-300 text-amber-950 border-2 border-amber-700 dark:border-amber-300'
                                : 'bg-surface-alt text-ink border border-line hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300'
                            }`}
                          >
                            <span>T</span> <span className="hidden 2xl:inline">Tardanza</span>
                            {row.value === "T" && <span aria-hidden="true" className="ml-1">✓</span>}
                          </button>

                          {/* Botón Desmarcar */}
                          {row.value && !isDisabled && (
                            <button
                              type="button"
                              onClick={() => handleMarkChange(enId, row.value as AttendanceValue)}
                              aria-label={`Limpiar marca de ${item.student.name}`}
                              title="Desmarcar / Dejar pendiente"
                              className="min-w-[44px] min-h-[44px] ml-1 rounded-[10px] text-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Observación Pedagógica */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isDisabled}
                          aria-label={"Observación pedagógica de " + item.student.name}
                          placeholder="Nota u observación opcional…"
                          value={row.observation}
                          onChange={(e) => handleObservationChange(enId, e.target.value)}
                          maxLength={500}
                          className="w-full min-h-[44px] px-3 py-2 rounded-[10px] bg-surface-alt border border-line text-sm text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                        />
                      </td>

                      {/* Estado de Persistencia */}
                      <td className="py-3 px-4 text-center">
                        {row.isDirty ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
                            ● Modificado
                          </span>
                        ) : row.savedValue !== null ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                            ✔ Guardado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted bg-surface-alt border border-line px-2.5 py-1 rounded-full">
                            Sin registrar
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Selección de Unidad y Aula */}
      {modalTargetGroup && (
        <SelectUnitModal
          isOpen={isUnitModalOpen}
          group={modalTargetGroup}
          programName={currentGroup?.programId || 'Programa'}
          moduleName={currentGroup?.moduleId || 'Módulo'}
          currentUnitCode={activeWorkspace.unit}
          onClose={() => setIsUnitModalOpen(false)}
          onConfirm={async (group, mode, unitCode) => {
            await selectGroupAndUnit(group, mode, unitCode);
            setIsUnitModalOpen(false);
          }}
        />
      )}

      {/* Modal Accesible de Resolución de Conflictos HTTP 409 */}
      {conflictItems && conflictItems.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-dialog-title"
          aria-describedby="conflict-dialog-desc"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            ref={conflictPanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-[var(--ui-shadow)] border border-line animate-in zoom-in-95 duration-200 flex flex-col focus:outline-none"
          >
            {/* Encabezado */}
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-line">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="conflict-dialog-title" className="text-lg font-bold text-ink tracking-tight">
                  Conflicto de actualización — Registro modificado en otra sesión
                </h3>
                <p id="conflict-dialog-desc" className="text-xs text-muted mt-1 leading-relaxed">
                  Este registro fue modificado en otra sesión o equipo. A continuación puede consultar la información actualizada del servidor y compararla con sus modificaciones locales antes de decidir cómo proceder:
                </p>
              </div>
            </div>

            {/* Comparación de Registros en Conflicto */}
            <div className="overflow-y-auto flex-1 my-2 border border-line rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-alt border-b border-line text-muted font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Estudiante</th>
                    <th className="py-2.5 px-3">Modificación local</th>
                    <th className="py-2.5 px-3">Versión actual en servidor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {conflictItems.map((c) => (
                    <tr key={c.enrollmentId} className="hover:bg-surface-alt/60">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-ink block">{c.studentName}</span>
                        <span className="text-[10px] text-muted font-mono tabular-nums">DNI: {c.document}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full text-[11px]">
                          {c.localValue ? `Estado: ${c.localValue}` : 'Pendiente / Sin marca'}
                        </span>
                        {c.localObservation && (
                          <span className="block text-[10px] text-muted mt-0.5 italic">
                            "{c.localObservation}"
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-[11px]">
                          {c.serverValue ? `Estado: ${c.serverValue}` : 'Sin registrar'}
                        </span>
                        {c.serverObservation && (
                          <span className="block text-[10px] text-muted mt-0.5 italic">
                            "{c.serverObservation}"
                          </span>
                        )}
                        <span className="block text-[9px] text-muted font-mono tabular-nums mt-0.5">
                          Rev: {c.serverRev || 'null'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Acciones de Resolución Segura */}
            <div className="flex flex-col sm:flex-row gap-2.5 mt-4 pt-3 border-t border-line">
              <button
                type="button"
                id="btn-conflict-keep"
                onClick={handleConflictKeepLocal}
                disabled={isResolvingConflict}
                className="min-h-[44px] px-4 py-2.5 rounded-[10px] border border-line bg-surface-alt text-ink text-xs font-bold hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors text-center disabled:opacity-50"
              >
                Conservar cambios locales (sin enviar)
              </button>

              <button
                type="button"
                id="btn-conflict-discard"
                onClick={handleConflictDiscardAndLoadServer}
                disabled={isResolvingConflict}
                className="min-h-[44px] px-4 py-2.5 rounded-[10px] border border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors text-center disabled:opacity-50"
              >
                Descartar cambios y cargar servidor
              </button>

              <button
                type="button"
                id="btn-conflict-reapply"
                onClick={handleConflictReapplyWithServerRev}
                disabled={isResolvingConflict}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors text-center shadow-[var(--ui-shadow)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResolvingConflict ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-on-brand/30 border-t-on-brand rounded-full animate-spin" />
                    <span>Reaplicando…</span>
                  </>
                ) : (
                  <span>Reaplicar con revisión vigente</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroAsistencia;
