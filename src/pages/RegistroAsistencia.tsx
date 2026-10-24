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
import {
  isHoliday,
  isWeekend,
  formatDisplayDate,
  getTodayLima,
  getDayOfWeekIso,
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
  } = useWorkspace();

  const { requestSafeTransition, registerPendingChanges, unregisterPendingChanges } =
    usePendingChanges();

  // Fecha y sesión activas
  const [sessionDate, setSessionDate] = useState<string>(() => getTodayLima());
  const [sessionNumber, setSessionNumber] = useState<string>('1');
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

  const sessionNumberRef = useRef<string>(sessionNumber);
  sessionNumberRef.current = sessionNumber;

  const activeWorkspaceRef = useRef(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;

  // Identificar grupo activo
  const currentGroup = useMemo(() => {
    if (!dashboardData?.groups || !activeWorkspace?.groupId) return null;
    return dashboardData.groups.find((g) => g.id === activeWorkspace.groupId) || null;
  }, [dashboardData, activeWorkspace]);

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

  // Sincronizar estado de filas cuando cambie la fecha, sesión o datos de dashboard
  useEffect(() => {
    if (!activeWorkspace?.unit || !activeWorkspace?.groupId || !dashboardData) {
      setRowsState({});
      return;
    }

    const currentAttendance = dashboardData.attendance || [];
    const newRows: Record<string, LocalRowState> = {};

    for (const item of rosterData) {
      const enId = item.enrollment.id;
      // Buscar registro existente para esta matrícula, unidad, fecha y sesión
      const match = currentAttendance.find(
        (att: AttendanceRecord) =>
          att.enrollmentId === enId &&
          att.unit === activeWorkspace.unit &&
          att.date === sessionDate &&
          String(att.session || '').trim() === String(sessionNumber).trim()
      );

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
  }, [rosterData, activeWorkspace, sessionDate, sessionNumber, dashboardData]);

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
    const activeSession = sessionNumberRef.current.trim() || '1';

    if (!ws?.groupId || !ws?.unit || currentGroup?.closed) {
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
            const serverRec = freshAttendance.find(
              (a: AttendanceRecord) =>
                a.enrollmentId === row.enrollmentId &&
                a.unit === ws.unit &&
                a.date === activeDate &&
                String(a.session || '').trim() === activeSession
            );

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
          message: apiErr?.error || 'Error al guardar la asistencia en el servidor local.',
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeWorkspace, currentGroup, rowsState, sessionDate, sessionNumber, loadOptions, rosterData]);

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

  // Interceptores seguros para cambios de fecha y sesión locales
  const handleDateChange = (newDate: string) => {
    if (newDate === sessionDate) return;
    if (hasUnsavedChanges) {
      requestSafeTransition(() => {
        setSessionDate(newDate);
      });
    } else {
      setSessionDate(newDate);
    }
  };

  const handleSessionChange = (newSession: string) => {
    if (newSession === sessionNumber) return;
    if (hasUnsavedChanges) {
      requestSafeTransition(() => {
        setSessionNumber(newSession);
      });
    } else {
      setSessionNumber(newSession);
    }
  };

  // Verificaciones de calendario informativo (no inventa prohibiciones absolutas)
  const calendarAlert = useMemo(() => {
    if (!sessionDate) return null;
    const holidayReason = isHoliday(sessionDate);
    if (holidayReason) {
      return {
        type: 'holiday',
        title: 'Aviso de calendario institucional',
        message: `La fecha ${sessionDate} está registrada como "${holidayReason}". Si se trata de una sesión ordinaria o recuperación autorizada, puede registrar la asistencia; la validación final corresponde a las reglas académicas del servidor.`,
      };
    }

    if (isWeekend(sessionDate)) {
      const dow = getDayOfWeekIso(sessionDate);
      return {
        type: 'weekend',
        title: 'Aviso: Fecha en fin de semana',
        message: `La fecha seleccionada corresponde a un ${dow === 0 ? 'domingo' : 'sábado'}. Si se trata de una sesión programada de fin de semana o recuperación autorizada, puede registrar la asistencia; la confirmación definitiva reside en el servidor.`,
      };
    }

    return null;
  }, [sessionDate]);

  // Manejador de cambio de marca para un estudiante
  const handleMarkChange = (enrollmentId: string, mark: AttendanceValue) => {
    if (currentGroup?.closed) return;

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
    if (currentGroup?.closed) return;

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
    if (currentGroup?.closed) return;
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
        session: sessionNumber.trim() || '1',
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
        <div className="w-10 h-10 border-4 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700">
          Cargando registros de asistencia desde el servicio local…
        </p>
      </div>
    );
  }

  // Estado: Sin espacio de trabajo activo
  if (!activeWorkspace || !activeWorkspace.groupId) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#E6F4F1] text-[#13594A] flex items-center justify-center">
            <AttendanceIcon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#0D382F] mb-2">
            No hay un aula activa seleccionada
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
            Para registrar asistencia, primero debe seleccionar una de sus aulas autorizadas desde el panel de inicio.
          </p>
          <a
            href="#/inicio"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#13594A] text-white font-bold text-xs hover:bg-[#0D382F] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
          >
            <span>Ir a Mis Aulas Asignadas</span>
            <ArrowForwardIcon className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Estado: Modo MODULE activo
  if (activeWorkspace.mode === 'MODULE') {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <AttendanceIcon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#0D382F] mb-2">
            Seleccione una unidad didáctica para registrar asistencia
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
            Actualmente se encuentra en la vista general del módulo. El registro de sesiones y asistencia requiere seleccionar una unidad didáctica autorizada.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenUnitModal}
              className="px-5 py-2.5 rounded-xl bg-[#13594A] text-white font-bold text-xs hover:bg-[#0D382F] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            >
              Elegir Unidad Didáctica de este grupo
            </button>
            <a
              href="#/inicio"
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            >
              Volver al Inicio
            </a>
          </div>
        </div>

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-[#004034] uppercase tracking-widest bg-[#E6F4F1] px-2.5 py-1 rounded-md">
              Operación Académica
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0D382F] tracking-tight">
            Control de Asistencia
          </h1>
          <p className="text-sm font-medium text-slate-700 mt-1">
            Registro diario de asistencia por sesión y cómputo de asistencias institucionales.
          </p>
        </div>

        {/* Contexto Activo y Botón de Cambio */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#13594A]/10 text-[#13594A]">
              <InstitutionalBrandIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-slate-800 block">
                {currentGroup?.rawName || currentGroup?.name || 'Aula asignada'}
              </span>
              <span className="text-xs font-semibold text-[#13594A] block">
                Unidad: {activeWorkspace.unit} {activeWorkspace.unitName ? `· ${activeWorkspace.unitName}` : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenUnitModal}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            title="Cambiar aula o unidad didáctica"
          >
            Cambiar aula / UD
          </button>
        </div>
      </div>

      {/* 2. Banner de Grupo Cerrado */}
      {currentGroup?.closed && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">⚠️</span>
            <div>
              <strong className="block text-sm font-bold">
                Registro cerrado institucionalmente
              </strong>
              <p className="text-xs text-amber-800 mt-0.5">
                Este grupo ha sido cerrado por Dirección. La asistencia se encuentra en modo solo consulta. Solicite reapertura a dirección para realizar modificaciones.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-amber-200 text-amber-900 rounded-md">
            Solo Consulta
          </span>
        </div>
      )}

      {/* 3. Alertas de Calendario Académico Informativo */}
      {calendarAlert && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 flex items-start gap-3 shadow-xs"
        >
          <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">📅</span>
          <div>
            <strong className="block text-sm font-bold">
              {calendarAlert.title}
            </strong>
            <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">
              {calendarAlert.message}
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
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : saveFeedback.type === 'conflict'
              ? 'bg-purple-50 border-purple-300 text-purple-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">
              {saveFeedback.type === 'success' ? '✔' : '⚠'}
            </span>
            <span className="text-xs font-bold leading-relaxed">
              {saveFeedback.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-black/5"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5. Barra de Herramientas de Sesión */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Selector de Fecha */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="attendance-date"
              className="text-[11px] font-bold text-slate-700 uppercase tracking-wider"
            >
              Fecha de sesión
            </label>
            <input
              id="attendance-date"
              type="date"
              value={sessionDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            />
          </div>

          {/* Selector de Sesión */}
          <div className="flex flex-col gap-1.5 w-28">
            <label
              htmlFor="attendance-session"
              className="text-[11px] font-bold text-slate-700 uppercase tracking-wider"
            >
              N° Sesión
            </label>
            <input
              id="attendance-session"
              type="number"
              min="1"
              max="120"
              value={sessionNumber}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            />
          </div>

          {/* Etiqueta de Fecha en Español */}
          <div className="flex flex-col gap-1.5 self-end">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
              {formatDisplayDate(sessionDate)}
            </span>
          </div>
        </div>

        {/* Acciones de Lote y Guardado */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={Boolean(currentGroup?.closed) || rosterData.length === 0}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
          >
            Marcar todos presentes (P)
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={Boolean(currentGroup?.closed) || isSaving || !hasUnsavedChanges}
            className="px-5 py-2.5 rounded-xl bg-[#13594A] hover:bg-[#0D382F] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando…</span>
              </>
            ) : (
              <>
                <span>Guardar asistencia</span>
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 6. Barra de Resumen de Conteo y Filtro de Búsqueda */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Contadores Accesibles */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="font-bold text-slate-700 mr-1">Cómputo:</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            {counts.pCount} Presentes
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-bold border border-rose-200">
            {counts.fCount} Faltas
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
            {counts.jCount} Justificadas
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
            {counts.tCount} Tardanzas
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
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
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
          />
          <div aria-live="polite" role="status" className="sr-only">
            {filteredRoster.length} estudiantes listados
          </div>
        </div>
      </div>

      {/* 7. Tabla Principal de Estudiantes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Nómina oficial de estudiantes">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-4 w-12 text-center">N°</th>
                <th scope="col" className="py-3.5 px-4">Estudiante / Documento</th>
                <th scope="col" className="py-3.5 px-4 text-center w-72">Control de Asistencia</th>
                <th scope="col" className="py-3.5 px-4">Observación pedagógica</th>
                <th scope="col" className="py-3.5 px-4 text-center w-28">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
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

                  const isDisabled = Boolean(currentGroup?.closed) || isPriorToEnrollment;

                  return (
                    <tr
                      key={enId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.isDirty ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Número de Orden */}
                      <td className="py-3 px-4 text-center font-bold text-slate-600">
                        {index + 1}
                      </td>

                      {/* Datos del Estudiante */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {item.student.name}
                          </span>
                          <span className="text-[11px] text-slate-600 font-mono mt-0.5">
                            DNI: {item.student.document || 'S/D'} · Matrícula: {item.enrollment.code || enId}
                          </span>
                          {isPriorToEnrollment && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded mt-1 self-start">
                              Ingreso posterior ({item.enrollment.startDate})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Botones de Marcado P, F, J, T */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* P - Presente */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'P'}
                            aria-label={`Marcar Presente para ${item.student.name}`}
                            onClick={() => handleMarkChange(enId, 'P')}
                            className={`w-9 h-9 rounded-xl font-bold text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] disabled:opacity-30 ${
                              row.value === 'P'
                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                          >
                            P
                          </button>

                          {/* F - Falta */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'F'}
                            aria-label={`Marcar Falta para ${item.student.name}`}
                            onClick={() => handleMarkChange(enId, 'F')}
                            className={`w-9 h-9 rounded-xl font-bold text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-30 ${
                              row.value === 'F'
                                ? 'bg-rose-600 text-white shadow-xs font-black'
                                : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800'
                            }`}
                          >
                            F
                          </button>

                          {/* J - Justificada */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'J'}
                            aria-label={`Marcar Justificada para ${item.student.name}`}
                            onClick={() => handleMarkChange(enId, 'J')}
                            className={`w-9 h-9 rounded-xl font-bold text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-30 ${
                              row.value === 'J'
                                ? 'bg-amber-600 text-white shadow-xs font-black'
                                : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                          >
                            J
                          </button>

                          {/* T - Tardanza */}
                          <button
                            type="button"
                            disabled={isDisabled}
                            aria-pressed={row.value === 'T'}
                            aria-label={`Marcar Tardanza para ${item.student.name}`}
                            onClick={() => handleMarkChange(enId, 'T')}
                            className={`w-9 h-9 rounded-xl font-bold text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-30 ${
                              row.value === 'T'
                                ? 'bg-blue-600 text-white shadow-xs font-black'
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800'
                            }`}
                          >
                            T
                          </button>

                          {/* Botón Desmarcar */}
                          {row.value && !isDisabled && (
                            <button
                              type="button"
                              onClick={() => handleMarkChange(enId, row.value as AttendanceValue)}
                              aria-label={`Limpiar marca de ${item.student.name}`}
                              title="Desmarcar / Dejar pendiente"
                              className="w-7 h-7 ml-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xs transition-colors"
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
                          placeholder="Nota u observación opcional…"
                          value={row.observation}
                          onChange={(e) => handleObservationChange(enId, e.target.value)}
                          maxLength={500}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13594A] disabled:opacity-50"
                        />
                      </td>

                      {/* Estado de Persistencia */}
                      <td className="py-3 px-4 text-center">
                        {row.isDirty ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                            ● Modificado
                          </span>
                        ) : row.savedValue !== null ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                            ✔ Guardado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-purple-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Encabezado */}
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 id="conflict-dialog-title" className="text-lg font-bold text-slate-900 tracking-tight">
                  Conflicto de actualización — Registro modificado en otra sesión
                </h3>
                <p id="conflict-dialog-desc" className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Este registro fue modificado en otra sesión o equipo. A continuación puede consultar la información actualizada del servidor y compararla con sus modificaciones locales antes de decidir cómo proceder:
                </p>
              </div>
            </div>

            {/* Comparación de Registros en Conflicto */}
            <div className="overflow-y-auto flex-1 my-2 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Estudiante</th>
                    <th className="py-2.5 px-3">Modificación local</th>
                    <th className="py-2.5 px-3">Versión actual en servidor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conflictItems.map((c) => (
                    <tr key={c.enrollmentId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{c.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">DNI: {c.document}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                          {c.localValue ? `Estado: ${c.localValue}` : 'Pendiente / Sin marca'}
                        </span>
                        {c.localObservation && (
                          <span className="block text-[10px] text-slate-600 mt-0.5 italic">
                            "{c.localObservation}"
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                          {c.serverValue ? `Estado: ${c.serverValue}` : 'Sin registrar'}
                        </span>
                        {c.serverObservation && (
                          <span className="block text-[10px] text-slate-600 mt-0.5 italic">
                            "{c.serverObservation}"
                          </span>
                        )}
                        <span className="block text-[9px] text-slate-600 font-mono mt-0.5">
                          Rev: {c.serverRev || 'null'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Acciones de Resolución Segura */}
            <div className="flex flex-col sm:flex-row gap-2.5 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="btn-conflict-keep"
                onClick={handleConflictKeepLocal}
                disabled={isResolvingConflict}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors text-center disabled:opacity-50"
              >
                Conservar cambios locales (sin enviar)
              </button>

              <button
                type="button"
                id="btn-conflict-discard"
                onClick={handleConflictDiscardAndLoadServer}
                disabled={isResolvingConflict}
                className="px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-900 text-xs font-bold hover:bg-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors text-center disabled:opacity-50"
              >
                Descartar cambios y cargar servidor
              </button>

              <button
                type="button"
                id="btn-conflict-reapply"
                onClick={handleConflictReapplyWithServerRev}
                disabled={isResolvingConflict}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D382F] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors text-center shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResolvingConflict ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
