/**
 * src/pages/GestionMatriculas.tsx
 * 
 * Módulo de Gestión de Matrículas — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real al backend SQLite local mediante:
 * - GET /api/dashboard?overview=1 (Consulta del padrón de matrículas e historial modular).
 * - POST /api/enrollments (Registro formal de nueva matrícula con generación de código MAT).
 * - POST /api/enrollments/module (Confirmación, exclusión o restauración de pertenencia modular).
 * - POST /api/enrollments/retire (Retiro formal o traslado entre grupos académicos).
 * - Protección contra pérdida de datos no guardados con PendingChangesContext.
 * - Validación de duplicados, fechas de inicio y aulas cerradas (HTTP 409 y HTTP 400).
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import {
  StudentEnrollmentItem,
  StudentItem,
  DashboardGroup,
  EnrollPayload,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  EnrollmentIcon,
  SearchIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowForwardIcon,
} from '../components/ui/Icons';

interface GestionMatriculasProps {
  onNavigate?: (route: NavRoute) => void;
}

export const GestionMatriculas: React.FC<GestionMatriculasProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { registerPendingChanges, unregisterPendingChanges } = usePendingChanges();

  const isTeacher = user?.role === 'DOCENTE';
  const canManage = user?.role === 'DIRECTOR' || user?.role === 'SECRETARIA';

  // Estados de datos
  const [enrollments, setEnrollments] = useState<StudentEnrollmentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name?: string; nombre?: string }>>([]);
  const [modules, setModules] = useState<Array<{ id: string; name?: string; nombre?: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros de tabla
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('');

  // Formulario de Nueva Matrícula
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [studentSearchInput, setStudentSearchInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);

  // Modal de Corrección Modular (CONFIRM | EXCLUDE | RESTORE)
  const [moduleModal, setModuleModal] = useState<{
    isOpen: boolean;
    enrollment: StudentEnrollmentItem | null;
    action: 'CONFIRM' | 'EXCLUDE' | 'RESTORE';
    reason: string;
  }>({
    isOpen: false,
    enrollment: null,
    action: 'CONFIRM',
    reason: '',
  });
  const [isSubmittingModuleAction, setIsSubmittingModuleAction] = useState<boolean>(false);

  // Modal de Retiro de Matrícula (retireEnrollment)
  const [retireModal, setRetireModal] = useState<{
    isOpen: boolean;
    enrollment: StudentEnrollmentItem | null;
    reason: string;
    date: string;
    targetGroupId: string;
  }>({
    isOpen: false,
    enrollment: null,
    reason: '',
    date: new Date().toISOString().slice(0, 10),
    targetGroupId: '',
  });
  const [isSubmittingRetire, setIsSubmittingRetire] = useState<boolean>(false);

  // Carga de datos
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      const res = await apiClient.getDashboard(undefined, true);
      setEnrollments(res.enrollments || []);
      setStudents(res.students || []);
      setGroups(res.groups || []);
      setPrograms(res.programs || []);
      setModules(res.modules || []);

      // Revisar si viene un estudiante recién creado desde sessionStorage
      const pendingNewStudent = sessionStorage.getItem('CETPRO_NEW_STUDENT');
      if (pendingNewStudent && res.students?.some((s) => s.id === pendingNewStudent)) {
        setSelectedStudentId(pendingNewStudent);
        sessionStorage.removeItem('CETPRO_NEW_STUDENT');
      }

      // Si hay un aula activa en sesión, sugerirla por defecto
      if (activeWorkspace?.groupId && res.groups?.some((g) => g.id === activeWorkspace.groupId)) {
        setSelectedGroupId((prev) => prev || activeWorkspace.groupId || '');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al conectar con la base de datos de matrículas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWorkspace?.groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Protección de cambios pendientes en formulario de matrícula
  useEffect(() => {
    if (isFormDirty) {
      registerPendingChanges({
        id: 'enrollment-form',
        hasChanges: true,
        message: 'Tiene datos de matrícula sin guardar. ¿Desea descartar la información?',
        onDiscard: () => {
          setSelectedStudentId('');
          setStudentSearchInput('');
          setStartDate(new Date().toISOString().slice(0, 10));
          setIsFormDirty(false);
        },
      });
    } else {
      unregisterPendingChanges('enrollment-form');
    }

    return () => {
      unregisterPendingChanges('enrollment-form');
    };
  }, [isFormDirty, registerPendingChanges, unregisterPendingChanges]);

  // Resolver nombre de estudiante
  const getStudentName = useCallback(
    (studentId: string) => {
      const s = students.find((st) => st.id === studentId);
      return s ? s.name : 'Estudiante';
    },
    [students]
  );

  // Resolver DNI de estudiante
  const getStudentDocument = useCallback(
    (studentId: string) => {
      const s = students.find((st) => st.id === studentId);
      return s ? s.document : '';
    },
    [students]
  );

  // Determinar estado de la matrícula
  const getEnrollmentState = (en: StudentEnrollmentItem): 'PROVISIONAL' | 'CONFIRMED' | 'EXCLUDED' | 'RETIRED' => {
    if (en.moduleState === 'EXCLUDED') return 'EXCLUDED';
    if (!en.active) return 'RETIRED';
    if (en.provisional) return 'PROVISIONAL';
    return 'CONFIRMED';
  };

  // Filtrado de estudiantes para el selector de matrícula
  const eligibleStudents = useMemo(() => {
    const q = studentSearchInput.toLowerCase().trim();
    return students
      .filter((s) => s.active && !s.archived)
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.document.toLowerCase().includes(q)
        );
      });
  }, [students, studentSearchInput]);

  // Grupos disponibles para matrícula (con periodo y módulo configurados)
  const availableGroups = useMemo(() => {
    return groups.filter((g) => g.moduleId && g.periodId);
  }, [groups]);

  // Registrar nueva matrícula
  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedGroupId || !startDate) {
      setErrorMsg('Debe seleccionar estudiante, aula y fecha de ingreso válida.');
      return;
    }

    const group = groups.find((g) => g.id === selectedGroupId);
    if (group?.closed) {
      setErrorMsg('El aula seleccionada se encuentra cerrada. Dirección debe autorizar su reapertura antes de matricular.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: EnrollPayload = {
        studentId: selectedStudentId,
        groupId: selectedGroupId,
        startDate,
      };

      const result = await apiClient.enroll(payload);
      setIsFormDirty(false);
      unregisterPendingChanges('enrollment-form');

      const studentName = getStudentName(selectedStudentId);
      setSuccessMsg(
        `Matrícula de "${studentName}" registrada exitosamente con código ${result.code || 'MAT'}.`
      );

      setSelectedStudentId('');
      setStudentSearchInput('');
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        setErrorMsg('El estudiante ya se encuentra matriculado en este grupo.');
      } else {
        setErrorMsg(apiErr?.error || 'Error al registrar la matrícula.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de corrección modular
  const handleOpenModuleModal = (en: StudentEnrollmentItem, action: 'CONFIRM' | 'EXCLUDE' | 'RESTORE') => {
    setModuleModal({
      isOpen: true,
      enrollment: en,
      action,
      reason: '',
    });
    setErrorMsg(null);
  };

  // Confirmar acción modular
  const handleConfirmModuleAction = async () => {
    const { enrollment, action, reason } = moduleModal;
    if (!enrollment || !reason.trim()) {
      setErrorMsg('Debe ingresar un motivo o fundamentación administrativa.');
      return;
    }

    setIsSubmittingModuleAction(true);
    setErrorMsg(null);

    try {
      await apiClient.correctModuleEnrollment({
        id: enrollment.id,
        rev: enrollment.rev || '',
        action,
        reason: reason.trim(),
      });

      setSuccessMsg(
        action === 'EXCLUDE'
          ? 'Matrícula excluida de este módulo. El estudiante y su historial se conservan de forma permanente.'
          : action === 'CONFIRM'
          ? 'Matrícula modular confirmada con éxito.'
          : 'Matrícula restaurada en este módulo formativo.'
      );

      setModuleModal({ isOpen: false, enrollment: null, action: 'CONFIRM', reason: '' });
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al procesar la corrección modular.');
    } finally {
      setIsSubmittingModuleAction(false);
    }
  };

  // Abrir modal de retiro / traslado
  const handleOpenRetireModal = (en: StudentEnrollmentItem) => {
    setRetireModal({
      isOpen: true,
      enrollment: en,
      reason: '',
      date: new Date().toISOString().slice(0, 10),
      targetGroupId: '',
    });
    setErrorMsg(null);
  };

  // Confirmar retiro / traslado
  const handleConfirmRetire = async () => {
    const { enrollment, reason, date, targetGroupId } = retireModal;
    if (!enrollment || !reason.trim() || !date) {
      setErrorMsg('Fecha y motivo de retiro son obligatorios.');
      return;
    }

    setIsSubmittingRetire(true);
    setErrorMsg(null);

    try {
      await apiClient.retireEnrollment({
        id: enrollment.id,
        rev: enrollment.rev || '',
        date,
        reason: reason.trim(),
        targetGroupId: targetGroupId || undefined,
      });

      setSuccessMsg(
        targetGroupId
          ? `Estudiante trasladado formalmente al nuevo grupo seleccionado.`
          : `Matrícula retirada formalmente del padrón activo. Se conserva todo el historial previo.`
      );

      setRetireModal({ isOpen: false, enrollment: null, reason: '', date: '', targetGroupId: '' });
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al retirar la matrícula.');
    } finally {
      setIsSubmittingRetire(false);
    }
  };

  // Filtrado de filas de matrículas
  const filteredEnrollments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return enrollments.filter((en) => {
      const state = getEnrollmentState(en);
      const studentName = getStudentName(en.studentId).toLowerCase();
      const studentDoc = getStudentDocument(en.studentId).toLowerCase();
      const code = (en.code || '').toLowerCase();

      const matchesGroup = !selectedGroupFilter || en.groupId === selectedGroupFilter;
      const matchesState = !selectedStateFilter || state === selectedStateFilter;
      const matchesQuery =
        !q ||
        studentName.includes(q) ||
        studentDoc.includes(q) ||
        code.includes(q);

      return matchesGroup && matchesState && matchesQuery;
    });
  }, [enrollments, searchQuery, selectedGroupFilter, selectedStateFilter, getStudentName, getStudentDocument]);

  // Contadores por estado
  const counts = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.active).length;
    const provisional = enrollments.filter((e) => e.provisional && e.active).length;
    const confirmed = enrollments.filter((e) => !e.provisional && e.active && e.moduleState !== 'EXCLUDED').length;
    const excluded = enrollments.filter((e) => e.moduleState === 'EXCLUDED').length;
    return { total, active, provisional, confirmed, excluded };
  }, [enrollments]);

  // Renderizar badge de estado modular
  const renderStateBadge = (state: 'PROVISIONAL' | 'CONFIRMED' | 'EXCLUDED' | 'RETIRED') => {
    switch (state) {
      case 'PROVISIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Provisional: confirmar módulo
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Confirmada
          </span>
        );
      case 'EXCLUDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            Excluida de este módulo
          </span>
        );
      case 'RETIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Retirada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Encabezado Institucional */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] uppercase tracking-widest bg-[#E6F4F1] px-2.5 py-1 rounded-md">
              Ámbito Institucional · Admisión y Matrícula
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-[#0D382F] font-bold tracking-tight leading-tight">
            Matrículas por Módulo
          </h1>
          <p className="text-[14px] text-slate-700 font-normal leading-relaxed">
            Incorporación formal de estudiantes, asignación de código MAT y rectificación de pertenencia a módulos curriculares.
          </p>
        </div>

        {/* Botón de Actualización */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar datos de matrículas"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-700 hover:text-[#13594A] hover:border-[#13594A]/30 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 text-[#13594A] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </header>

      {/* 2. Mensajes de Notificación */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 3. Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Matrículas Activas
            </span>
            <span className="text-2xl font-extrabold text-[#0D382F] mt-1 block">
              {counts.active}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <EnrollmentIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Provisionales
            </span>
            <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
              {counts.provisional}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Confirmadas
            </span>
            <span className="text-2xl font-extrabold text-[#0D382F] mt-1 block">
              {counts.confirmed}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Excluidas de Módulo
            </span>
            <span className="text-2xl font-extrabold text-rose-700 mt-1 block">
              {counts.excluded}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Formulario de Nueva Matrícula (DIRECTOR y SECRETARIA) */}
      {canManage && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 lg:p-8 space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs font-bold text-[#13594A] uppercase tracking-wider">
              Trámite de Incorporación
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Registrar Nueva Matrícula
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Seleccione un estudiante del padrón activo y el aula correspondiente al periodo y turno lectivo.
            </p>
          </div>

          <form onSubmit={handleSubmitEnrollment} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Selección de Estudiante */}
              <div className="space-y-1.5">
                <label htmlFor="select-student" className="block text-xs font-bold text-slate-700">
                  Estudiante Participante <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Filtrar por nombre o DNI…"
                  value={studentSearchInput}
                  onChange={(e) => {
                    setStudentSearchInput(e.target.value);
                    setIsFormDirty(true);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs mb-1.5 focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
                <select
                  id="select-student"
                  required
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setIsFormDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                >
                  <option value="">Seleccionar estudiante…</option>
                  {eligibleStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} · {st.document}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de Grupo / Aula */}
              <div className="space-y-1.5">
                <label htmlFor="select-group" className="block text-xs font-bold text-slate-700">
                  Aula y Módulo Curricular <span className="text-rose-600">*</span>
                </label>
                <select
                  id="select-group"
                  required
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setIsFormDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] mt-8 md:mt-0"
                >
                  <option value="">Seleccionar aula…</option>
                  {availableGroups.map((g) => {
                    const prog = programs.find((p) => p.id === g.programId);
                    return (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.periodId} {g.turno ? `(${g.turno})` : ''} {prog?.nombre ? `— ${prog.nombre}` : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedGroupId && groups.find((g) => g.id === selectedGroupId)?.closed && (
                  <span className="text-[11px] font-bold text-rose-600 block mt-1">
                    ⚠ Aula cerrada: Requiere reapertura para admitir nuevas matrículas.
                  </span>
                )}
              </div>

              {/* Fecha de Ingreso */}
              <div className="space-y-1.5">
                <label htmlFor="input-start-date" className="block text-xs font-bold text-slate-700">
                  Fecha de Ingreso <span className="text-rose-600">*</span>
                </label>
                <input
                  id="input-start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setIsFormDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] mt-8 md:mt-0"
                />
                <span className="text-[11px] text-slate-500 block">
                  Fecha formal de inicio lectivo del participante.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {isFormDirty && <span className="text-amber-800 font-semibold">● Datos de matrícula listos para confirmación</span>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentId('');
                    setStudentSearchInput('');
                    setIsFormDirty(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Registrando en SQLite…' : 'Registrar Matrícula'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Tabla de Matrículas y Pertenencia Modular */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Padrón de Matrículas y Control Modular
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de módulos cursados, ratificación y rectificación de asignación de aula.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {filteredEnrollments.length} matrículas encontradas
          </span>
        </div>

        {/* Toolbar de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Filtro por Aula */}
          <div>
            <label htmlFor="filter-group" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Aula / Grupo
            </label>
            <select
              id="filter-group"
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            >
              <option value="">Todas las aulas</option>
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label htmlFor="filter-state" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Estado Modular
            </label>
            <select
              id="filter-state"
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            >
              <option value="">Todos los estados</option>
              <option value="PROVISIONAL">Provisionales (Confirmar módulo)</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="EXCLUDED">Excluidas del módulo</option>
              <option value="RETIRED">Retiradas formalmente</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div>
            <label htmlFor="search-input-enroll" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Buscar Estudiante
            </label>
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-input-enroll"
                type="search"
                placeholder="DNI, nombre o código MAT…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Aula / Módulo</th>
                <th className="py-3 px-4">Estado Modular</th>
                {canManage && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-3 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin mx-auto mb-2" />
                    Cargando padrón de matrículas desde SQLite…
                  </td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-slate-800 text-sm">No se encontraron matrículas</p>
                    <span className="text-xs text-slate-500 mt-1 block">
                      No existen registros que coincidan con los filtros seleccionados.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((en) => {
                  const studentName = getStudentName(en.studentId);
                  const studentDoc = getStudentDocument(en.studentId);
                  const group = groups.find((g) => g.id === en.groupId);
                  const prog = programs.find((p) => p.id === group?.programId);
                  const mod = modules.find((m) => m.id === group?.moduleId);
                  const state = getEnrollmentState(en);

                  return (
                    <tr key={en.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Estudiante y código */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {studentName}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                          <span>Doc: <strong className="text-slate-700">{studentDoc}</strong></span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-slate-700">{en.code || 'MAT'}</span>
                          <span>•</span>
                          <span>Ingreso: {en.startDate || 'Pendiente'}</span>
                        </div>
                      </td>

                      {/* Aula / Módulo */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {group?.name || en.groupId}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {prog?.nombre || prog?.name || 'Programa'} · {mod?.nombre || mod?.name || 'Módulo'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        {renderStateBadge(state)}
                        {en.moduleCorrection?.reason && (
                          <span className="text-[10px] text-slate-500 block mt-1 italic">
                            Motivo: "{en.moduleCorrection.reason}"
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {en.active ? (
                              <>
                                {en.provisional && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModuleModal(en, 'CONFIRM')}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors border border-emerald-200"
                                  >
                                    Confirmar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenModuleModal(en, 'EXCLUDE')}
                                  className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors border border-amber-200"
                                >
                                  Quitar de módulo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRetireModal(en)}
                                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition-colors border border-slate-200"
                                >
                                  Retirar / Trasladar
                                </button>
                              </>
                            ) : en.moduleState === 'EXCLUDED' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenModuleModal(en, 'RESTORE')}
                                className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors border border-emerald-200"
                              >
                                Restaurar en módulo
                              </button>
                            ) : null}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal de Corrección Modular */}
      {moduleModal.isOpen && moduleModal.enrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {moduleModal.action === 'CONFIRM'
                ? 'Confirmar Pertenencia al Módulo'
                : moduleModal.action === 'EXCLUDE'
                ? 'Quitar de este Módulo Formativo'
                : 'Restaurar Matrícula en el Módulo'}
            </h3>

            <p className="text-xs text-slate-600">
              Estudiante: <strong>{getStudentName(moduleModal.enrollment.studentId)}</strong>
              <br />
              Aula: <strong>{groups.find((g) => g.id === moduleModal.enrollment?.groupId)?.name}</strong>
            </p>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              {moduleModal.action === 'EXCLUDE'
                ? 'El estudiante será desvinculado exclusivamente de este módulo. Se preservan sus notas previas, asistencias y fichas en otros módulos.'
                : moduleModal.action === 'CONFIRM'
                ? 'La matrícula provisional pasará a estado oficial confirmado en este módulo curricular.'
                : 'Se restaurará la vigencia de la matrícula en este módulo curricular.'}
            </div>

            <div>
              <label htmlFor="module-reason" className="block text-xs font-bold text-slate-700 mb-1.5">
                Motivo de la Corrección Modular <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="module-reason"
                required
                rows={3}
                placeholder="Indique la justificación técnica o resolución de dirección/secretaría…"
                value={moduleModal.reason}
                onChange={(e) => setModuleModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModuleModal({ isOpen: false, enrollment: null, action: 'CONFIRM', reason: '' })}
                disabled={isSubmittingModuleAction}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmModuleAction}
                disabled={isSubmittingModuleAction || !moduleModal.reason.trim()}
                className="px-5 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmittingModuleAction ? 'Guardando…' : 'Confirmar Operación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal de Retiro / Traslado de Matrícula */}
      {retireModal.isOpen && retireModal.enrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Retiro Formal o Traslado de Matrícula
            </h3>

            <p className="text-xs text-slate-600">
              Estudiante: <strong>{getStudentName(retireModal.enrollment.studentId)}</strong>
              <br />
              Aula actual: <strong>{groups.find((g) => g.id === retireModal.enrollment?.groupId)?.name}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label htmlFor="retire-date" className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Retiro / Traslado <span className="text-rose-600">*</span>
                </label>
                <input
                  id="retire-date"
                  type="date"
                  required
                  value={retireModal.date}
                  onChange={(e) => setRetireModal((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div>
                <label htmlFor="retire-target-group" className="block text-xs font-bold text-slate-700 mb-1">
                  Trasladar a otro Grupo (Opcional)
                </label>
                <select
                  id="retire-target-group"
                  value={retireModal.targetGroupId}
                  onChange={(e) => setRetireModal((prev) => ({ ...prev, targetGroupId: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                >
                  <option value="">Solo retirar (Sin traslado)</option>
                  {availableGroups
                    .filter((g) => g.id !== retireModal.enrollment?.groupId && !g.closed)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        Trasladar a: {g.name} ({g.periodId})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Si selecciona un aula destino, se creará la nueva matrícula en una sola transacción.
                </span>
              </div>

              <div>
                <label htmlFor="retire-reason" className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo Administrativo <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="retire-reason"
                  required
                  rows={2}
                  placeholder="Ej.: Retiro voluntario, cambio de turno, traslado de sección…"
                  value={retireModal.reason}
                  onChange={(e) => setRetireModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRetireModal({ isOpen: false, enrollment: null, reason: '', date: '', targetGroupId: '' })}
                disabled={isSubmittingRetire}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRetire}
                disabled={isSubmittingRetire || !retireModal.reason.trim() || !retireModal.date}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmittingRetire ? 'Procesando…' : 'Confirmar Retiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Pie de Página */}
      <footer className="text-center py-4 text-xs text-slate-600 border-t border-slate-200">
        CEPRO_MICAELA 2.0 · Módulo de Matrículas e Historial Modular Fuera de Línea
      </footer>
    </div>
  );
};

export default GestionMatriculas;
