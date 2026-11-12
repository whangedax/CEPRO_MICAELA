/**
 * src/pages/GestionEstudiantes.tsx
 * 
 * Módulo de Gestión de Estudiantes — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real al backend SQLite local mediante GET /api/dashboard y POST /api/students:
 * - Consulta del padrón consolidado de estudiantes.
 * - Registro y edición de fichas de estudiantes (DIRECTOR y SECRETARIA).
 * - Vista de solo lectura para DOCENTE (Mis estudiantes en aulas autorizadas).
 * - Archivado formal con preservación total del historial académico (POST /api/students/archive).
 * - Restauración de fichas archivadas.
 * - Protección contra pérdida de datos no guardados con PendingChangesContext.
 * - Control de concurrencia y detección de duplicados por DNI (HTTP 409).
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import {
  StudentItem,
  StudentEnrollmentItem,
  DashboardGroup,
  SaveStudentPayload,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import { ActiveUnitContextBanner } from '../components/academic/ActiveUnitContextBanner';
import {
  StudentsIcon,
  SearchIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowForwardIcon,
} from '../components/ui/Icons';

interface GestionEstudiantesProps {
  onNavigate?: (route: NavRoute) => void;
}

export const GestionEstudiantes: React.FC<GestionEstudiantesProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { registerPendingChanges, unregisterPendingChanges } = usePendingChanges();

  const isTeacher = user?.role === 'DOCENTE';
  const canEdit = user?.role === 'DIRECTOR' || user?.role === 'SECRETARIA';

  // Estados de datos
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollmentItem[]>([]);
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVOS' | 'TODOS' | 'ARCHIVADOS'>('ACTIVOS');
  const [scopeFilter, setScopeFilter] = useState<'CAREER' | 'ALL'>('ALL');

  // Contexto de carrera activa
  const activeProgramId = activeWorkspace?.programId;
  const activeProgramName = activeWorkspace?.programName || 'Carrera Seleccionada';

  useEffect(() => {
    if (activeProgramId) {
      setScopeFilter('CAREER');
    }
  }, [activeProgramId]);

  // Formulario de Estudiante
  const initialFormState: SaveStudentPayload = {
    id: undefined,
    rev: null,
    name: '',
    document: '',
    documentType: 'DNI',
    lastName1: '',
    lastName2: '',
    firstNames: '',
    sex: '',
    birthDate: '',
    active: true,
  };

  const [formData, setFormData] = useState<SaveStudentPayload>(initialFormState);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Modal de Archivado / Eliminación lógica
  const [studentToArchive, setStudentToArchive] = useState<StudentItem | null>(null);
  const [archiveReason, setArchiveReason] = useState<string>('');
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  // Referencia al formulario para scroll suave
  const formRef = useRef<HTMLDivElement | null>(null);

  // Carga de datos desde SQLite mediante API
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      // Para roles administrativos se consulta el overview global; para docente su ámbito autorizado
      const res = await apiClient.getDashboard(undefined, !isTeacher);
      setStudents(res.students || []);
      setEnrollments(res.enrollments || []);
      setGroups(res.groups || []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al conectar con la base de datos local de estudiantes.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Protección de cambios pendientes
  useEffect(() => {
    if (isDirty) {
      registerPendingChanges({
        id: 'student-form',
        hasChanges: true,
        message: 'Tiene datos del estudiante sin guardar. ¿Desea descartar los cambios?',
        onDiscard: () => {
          setFormData(initialFormState);
          setEditingStudentId(null);
          setIsDirty(false);
        },
      });
    } else {
      unregisterPendingChanges('student-form');
    }

    return () => {
      unregisterPendingChanges('student-form');
    };
  }, [isDirty, registerPendingChanges, unregisterPendingChanges]);

  // Manejador de cambios en formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      // Auto-generación de nombre completo si se completan apellidos y nombres
      if (['lastName1', 'lastName2', 'firstNames'].includes(name)) {
        const ln1 = name === 'lastName1' ? value : next.lastName1 || '';
        const ln2 = name === 'lastName2' ? value : next.lastName2 || '';
        const fn = name === 'firstNames' ? value : next.firstNames || '';
        const surnames = [ln1, ln2].filter(Boolean).join(' ');
        if (surnames && fn) {
          next.name = `${surnames}, ${fn}`;
        }
      }

      return next;
    });

    setIsDirty(true);
  };

  // Cargar estudiante para edición
  const handleEditClick = (student: StudentItem) => {
    setFormData({
      id: student.id,
      rev: student.rev || null,
      name: student.name || '',
      document: student.document || '',
      documentType: student.documentType || 'DNI',
      lastName1: student.lastName1 || (student.legacy?.apellidoPaterno as string) || '',
      lastName2: student.lastName2 || (student.legacy?.apellidoMaterno as string) || '',
      firstNames: student.firstNames || (student.legacy?.nombres as string) || '',
      sex: student.sex || (student.legacy?.sexo as string) || '',
      birthDate: student.birthDate || (student.legacy?.fechaNacimiento as string) || '',
      active: student.active !== false,
      archived: student.archived || false,
    });
    setEditingStudentId(student.id);
    setIsDirty(false);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Scroll hacia el formulario
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Limpiar / Nuevo registro
  const handleResetForm = () => {
    setFormData(initialFormState);
    setEditingStudentId(null);
    setIsDirty(false);
    setErrorMsg(null);
  };

  // Guardar estudiante (Creación o Actualización)
  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.document.trim()) {
      setErrorMsg('Nombre completo y documento de identidad son obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: SaveStudentPayload = {
        ...formData,
        id: formData.id || undefined,
        rev: formData.rev || null,
        name: formData.name.trim(),
        document: formData.document.trim(),
        documentType: formData.documentType?.trim() || 'DNI',
        lastName1: formData.lastName1?.trim() || undefined,
        lastName2: formData.lastName2?.trim() || undefined,
        firstNames: formData.firstNames?.trim() || undefined,
        sex: formData.sex || undefined,
        birthDate: formData.birthDate || undefined,
        active: formData.active !== false,
      };

      const saved = await apiClient.saveStudent(payload);
      setIsDirty(false);
      unregisterPendingChanges('student-form');

      const isUpdate = Boolean(formData.id);
      setSuccessMsg(
        isUpdate
          ? `Ficha del estudiante "${saved.name}" actualizada correctamente.`
          : `Estudiante "${saved.name}" registrado con éxito en el padrón institucional.`
      );

      handleResetForm();
      await loadData();

      // Si la secretaria registró un estudiante con aula activa, se le ofrece matricular inmediatamente
      if (!isUpdate && user?.role === 'SECRETARIA' && activeWorkspace?.groupId && onNavigate) {
        sessionStorage.setItem('CETPRO_NEW_STUDENT', saved.id);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        setErrorMsg(apiErr.error || 'Ya existe un estudiante con ese documento o el registro cambió en otra ventana.');
      } else {
        setErrorMsg(apiErr?.error || 'Error al guardar la ficha del estudiante.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de archivo
  const handleOpenArchiveModal = (student: StudentItem) => {
    setStudentToArchive(student);
    setArchiveReason('');
    setErrorMsg(null);
  };

  // Confirmar archivado
  const handleConfirmArchive = async () => {
    if (!studentToArchive) return;
    if (!archiveReason.trim()) {
      setErrorMsg('Debe indicar un motivo para el archivado de la ficha.');
      return;
    }

    setIsArchiving(true);
    setErrorMsg(null);
    try {
      await apiClient.archiveStudent({
        id: studentToArchive.id,
        rev: studentToArchive.rev || '',
        reason: archiveReason.trim(),
        date: new Date().toISOString().slice(0, 10),
      });

      setSuccessMsg(`Estudiante "${studentToArchive.name}" archivado. Su historial de notas y asistencia se conserva intacto.`);
      setStudentToArchive(null);
      setArchiveReason('');
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al archivar la ficha del estudiante.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Restaurar estudiante archivado
  const handleRestoreStudent = async (student: StudentItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.saveStudent({
        ...student,
        id: student.id,
        rev: student.rev || null,
        active: true,
        archived: false,
      });

      setSuccessMsg(`Ficha de "${student.name}" restaurada con éxito. Ya se encuentra disponible en el padrón activo.`);
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al restaurar la ficha del estudiante.');
    }
  };

  // Grupos y estudiantes de la carrera activa
  const careerGroupIds = useMemo(() => {
    if (!activeProgramId) return new Set<string>();
    return new Set(groups.filter((g) => g.programId === activeProgramId).map((g) => g.id));
  }, [groups, activeProgramId]);

  const careerStudentIds = useMemo(() => {
    if (!activeProgramId) return new Set<string>();
    const set = new Set<string>();
    for (const en of enrollments) {
      if (en.active && careerGroupIds.has(en.groupId)) {
        set.add(en.studentId);
      }
    }
    return set;
  }, [enrollments, careerGroupIds, activeProgramId]);

  const isSearching = searchQuery.trim().length > 0;

  // Estudiantes filtrados según búsqueda, carrera y pestaña
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      // Si no hay búsqueda escrita y está activo el filtro de carrera, limitamos a la carrera
      if (!q && scopeFilter === 'CAREER' && activeProgramId) {
        if (!careerStudentIds.has(s.id)) return false;
      }

      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.document.toLowerCase().includes(q) ||
        (s.firstNames && s.firstNames.toLowerCase().includes(q)) ||
        (s.lastName1 && s.lastName1.toLowerCase().includes(q)) ||
        (s.lastName2 && s.lastName2.toLowerCase().includes(q));

      if (statusFilter === 'ACTIVOS') {
        return matchesQuery && s.active && !s.archived;
      }
      if (statusFilter === 'ARCHIVADOS') {
        return matchesQuery && s.archived;
      }
      return matchesQuery;
    });
  }, [students, searchQuery, statusFilter, scopeFilter, activeProgramId, careerStudentIds]);

  // Métricas rápidas
  const counts = useMemo(() => {
    const activeCount = students.filter((s) => s.active && !s.archived).length;
    const archivedCount = students.filter((s) => s.archived).length;
    const totalCount = students.length;
    const careerCount = students.filter((s) => careerStudentIds.has(s.id) && s.active && !s.archived).length;
    return { activeCount, archivedCount, totalCount, careerCount };
  }, [students, careerStudentIds]);

  // Helper para avatar con iniciales
  const renderAvatar = (name: string) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'EST';

    return (
      <div className="w-9 h-9 rounded-full bg-[#13594A]/10 dark:bg-[#132B25] text-[#13594A] dark:text-[#5EEAD4] font-bold text-xs flex items-center justify-center shrink-0 border border-[#13594A]/20 dark:border-[#5EEAD4]/30">
        {initials}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Encabezado Institucional */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#263834]">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] dark:text-[#5EEAD4] uppercase tracking-widest bg-[#E6F4F1] dark:bg-[#132B25] px-2.5 py-1 rounded-md">
              Ámbito Académico · Padrón Estudiantil
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-[#0D382F] dark:text-[#F0FDF8] font-bold tracking-tight leading-tight">
            {isTeacher ? 'Mis Estudiantes' : 'Padrón Consolidado de Estudiantes'}
          </h1>
          <p className="text-[14px] text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
            {isTeacher
              ? 'Consulta de participantes matriculados en sus aulas asignadas y seguimiento académico.'
              : 'Administración de legajos, registro de nuevos participantes y consulta integral de historias de matrícula.'}
          </p>
        </div>

        {/* Botón de Actualización */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar padrón de estudiantes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] hover:border-[#13594A]/30 dark:hover:border-[#5EEAD4]/40 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 text-[#13594A] dark:text-[#5EEAD4] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </header>

      {/* Contexto Académico de Unidad Activa y Conmutador Rápido */}
      <ActiveUnitContextBanner variant="compact" onNavigate={onNavigate} />

      {/* 2. Mensajes de Notificación */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 text-xs font-bold shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs font-bold shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 3. Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {activeProgramId && scopeFilter === 'CAREER' ? `Padrón Activo (${activeProgramName})` : 'Padrón Activo'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#0D382F] dark:text-[#F0FDF8] block">
                {activeProgramId && scopeFilter === 'CAREER' ? counts.careerCount : counts.activeCount}
              </span>
              {activeProgramId && scopeFilter === 'CAREER' && (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  de {counts.activeCount} total
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#132B25] text-emerald-700 dark:text-[#5EEAD4] flex items-center justify-center font-bold">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Fichas Archivadas
            </span>
            <span className="text-2xl font-extrabold text-slate-700 dark:text-slate-300 mt-1 block">
              {counts.archivedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#131C1A] text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Registrados
            </span>
            <span className="text-2xl font-extrabold text-[#0D382F] dark:text-[#F0FDF8] mt-1 block">
              {counts.totalCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Formulario de Registro / Edición (Solo DIRECTOR y SECRETARIA) */}
      {canEdit && (
        <div
          ref={formRef}
          className="bg-white dark:bg-[#182220] rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-xs p-6 lg:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#263834]">
            <div>
              <span className="text-xs font-bold text-[#13594A] dark:text-[#5EEAD4] uppercase tracking-wider">
                {editingStudentId ? 'Modificación de Datos' : 'Alta de Participante'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0FDF8] mt-0.5">
                {editingStudentId ? 'Actualizar Ficha del Estudiante' : 'Registrar Nuevo Estudiante'}
              </h2>
            </div>
            {editingStudentId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-[#F0FDF8] self-start sm:self-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#263834] hover:bg-slate-50 dark:hover:bg-[#131C1A] transition-colors"
              >
                Cancelar edición y crear nuevo
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Documento de Identidad */}
              <div>
                <label htmlFor="field-document" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Documento de Identidad <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="field-documentType"
                    name="documentType"
                    value={formData.documentType || 'DNI'}
                    onChange={handleInputChange}
                    className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">C.E.</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="OTRO">Otro</option>
                  </select>
                  <input
                    id="field-document"
                    name="document"
                    type="text"
                    required
                    placeholder="Ej.: 00112233"
                    value={formData.document}
                    onChange={handleInputChange}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                  />
                </div>
              </div>

              {/* Apellido Paterno */}
              <div>
                <label htmlFor="field-lastName1" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Apellido Paterno
                </label>
                <input
                  id="field-lastName1"
                  name="lastName1"
                  type="text"
                  placeholder="Ej.: Pérez"
                  value={formData.lastName1 || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                />
              </div>

              {/* Apellido Materno */}
              <div>
                <label htmlFor="field-lastName2" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Apellido Materno
                </label>
                <input
                  id="field-lastName2"
                  name="lastName2"
                  type="text"
                  placeholder="Ej.: Gómez"
                  value={formData.lastName2 || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                />
              </div>

              {/* Nombres */}
              <div>
                <label htmlFor="field-firstNames" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombres
                </label>
                <input
                  id="field-firstNames"
                  name="firstNames"
                  type="text"
                  placeholder="Ej.: Ana María"
                  value={formData.firstNames || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                />
              </div>

              {/* Nombre Completo Oficial */}
              <div className="md:col-span-2">
                <label htmlFor="field-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre Completo Oficial <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="field-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Ej.: Pérez Gómez, Ana María"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                />
              </div>

              {/* Sexo */}
              <div>
                <label htmlFor="field-sex" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sexo (Norma MINEDU)
                </label>
                <select
                  id="field-sex"
                  name="sex"
                  value={formData.sex || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                >
                  <option value="">Pendiente de registrar</option>
                  <option value="H">H — Hombre</option>
                  <option value="M">M — Mujer</option>
                </select>
              </div>

              {/* Fecha de Nacimiento */}
              <div>
                <label htmlFor="field-birthDate" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fecha de Nacimiento
                </label>
                <input
                  id="field-birthDate"
                  name="birthDate"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={formData.birthDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center pt-6">
                <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active !== false}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-[#13594A] focus:ring-[#13594A] border-slate-300 dark:border-[#263834] dark:bg-[#131C1A]"
                  />
                  <span>Estudiante con ficha activa en el sistema</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-[#263834]">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {isDirty && <span className="text-amber-800 dark:text-amber-400 font-semibold">● Cambios pendientes en el formulario</span>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#263834] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#131C1A] transition-colors"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] dark:hover:bg-[#1A7360] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando en SQLite…' : editingStudentId ? 'Actualizar Estudiante' : 'Guardar Estudiante'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Toolbar de Búsqueda y Pestañas */}
      <div className="bg-white dark:bg-[#182220] rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-xs p-6 space-y-5">
        {/* Banner contextual de carrera */}
        {activeProgramId && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#E6F4F1]/70 dark:bg-[#132B25]/70 border border-[#13594A]/20 dark:border-[#5EEAD4]/20">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#0D382F] dark:text-[#F0FDF8]">
                {scopeFilter === 'CAREER'
                  ? `🎯 Viendo Alumnos de: ${activeProgramName}`
                  : '🌐 Viendo Todo el Padrón General'}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#13594A]/10 dark:bg-[#5EEAD4]/20 text-[#13594A] dark:text-[#5EEAD4] font-bold">
                {scopeFilter === 'CAREER' ? `${careerStudentIds.size} matriculados` : `${counts.totalCount} estudiantes`}
              </span>
              {isSearching && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                  ⚡ Búsqueda activa en todo el padrón ({filteredStudents.length} resultados)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScopeFilter(scopeFilter === 'CAREER' ? 'ALL' : 'CAREER')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-200 hover:text-[#13594A] dark:hover:text-[#5EEAD4] cursor-pointer shadow-xs transition-colors"
              >
                {scopeFilter === 'CAREER' ? '🌐 Ver Todo el Padrón' : `🎯 Filtrar por ${activeProgramName}`}
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#/matriculas';
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#13594A] text-white hover:bg-[#0D382F] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>➕ Matricular en {activeProgramName}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Pestañas de estado */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-[#131C1A] rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVOS')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'ACTIVOS'
                  ? 'bg-white dark:bg-[#182220] text-[#13594A] dark:text-[#5EEAD4] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F0FDF8]'
              }`}
            >
              Padrón Activo ({counts.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ARCHIVADOS')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'ARCHIVADOS'
                  ? 'bg-white dark:bg-[#182220] text-[#13594A] dark:text-[#5EEAD4] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F0FDF8]'
              }`}
            >
              Archivados ({counts.archivedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('TODOS')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'TODOS'
                  ? 'bg-white dark:bg-[#182220] text-[#13594A] dark:text-[#5EEAD4] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F0FDF8]'
              }`}
            >
              Todos ({counts.totalCount})
            </button>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar por DNI, nombres o apellidos…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
            />
          </div>
        </div>

        {/* 6. Tabla de Estudiantes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#263834] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Matrículas</th>
                <th className="py-3 px-4">Estado</th>
                {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#263834] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="w-8 h-8 border-3 border-[#13594A]/20 border-t-[#13594A] dark:border-t-[#5EEAD4] rounded-full animate-spin mx-auto mb-2" />
                    Cargando padrón de estudiantes…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-bold text-slate-800 dark:text-[#F0FDF8] text-sm">No se encontraron estudiantes</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                      {searchQuery
                        ? 'No existen coincidencias con el término buscado.'
                        : 'No hay estudiantes registrados en este estado.'}
                    </span>
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#131C1A] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#182220] transition-colors cursor-pointer"
                      >
                        Limpiar búsqueda
                      </button>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="mt-3 px-4 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D382F] transition-colors shadow-xs cursor-pointer"
                      >
                        + Registrar nuevo estudiante
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const studentEnrollments = enrollments.filter((e) => e.studentId === s.id && e.active);
                  const isArchived = Boolean(s.archived);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-[#131C1A]/50 transition-colors">
                      {/* Nombre y avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {renderAvatar(s.name)}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-[#F0FDF8] block leading-tight">
                              {s.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {s.sex ? `Sexo: ${s.sex}` : 'Sexo sin registrar'}
                              {s.birthDate ? ` · F. Nac: ${s.birthDate}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {s.document}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {s.documentType || 'DNI'}
                        </span>
                      </td>

                      {/* Matrículas Asociadas */}
                      <td className="py-3.5 px-4">
                        {studentEnrollments.length > 0 ? (
                          <div className="space-y-1">
                            {studentEnrollments.map((en) => {
                              const group = groups.find((g) => g.id === en.groupId);
                              return (
                                <span
                                  key={en.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#131C1A] text-slate-700 dark:text-slate-300 text-[11px] font-medium mr-1.5"
                                >
                                  <strong className="text-slate-800 dark:text-slate-200">{group?.name || en.groupId}</strong>
                                  <span className="text-slate-400 dark:text-slate-500">({en.code || 'MAT'})</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Sin matrícula activa</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#131C1A] text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-[#263834]">
                            Archivado
                          </span>
                        ) : s.active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Acciones para Admin */}
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleRestoreStudent(s)}
                                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#131C1A] hover:bg-emerald-50 dark:hover:bg-[#132B25] text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-[#5EEAD4] font-bold text-xs transition-colors border border-slate-200 dark:border-[#263834]"
                              >
                                Restaurar ficha
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.location.hash = `#/matriculas?studentId=${s.id}`;
                                  }}
                                  title={`Matricular a ${s.name} en ${activeProgramName || 'un aula'}`}
                                  className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-[#5EEAD4] font-bold text-xs transition-colors border border-emerald-300 dark:border-emerald-800/60 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>➕ Matricular</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(s)}
                                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#131C1A] hover:bg-slate-200 dark:hover:bg-[#202E2B] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenArchiveModal(s)}
                                  className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors border border-rose-200 dark:border-rose-800/60"
                                >
                                  Archivar
                                </button>
                              </>
                            )}
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

      {/* 7. Modal de Archivado / Eliminación Lógica */}
      {studentToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#182220] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-[#263834]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircleIcon className="w-5 h-5 text-rose-700 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F0FDF8]">
                  Archivar Ficha de Estudiante
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Está por archivar la ficha de <strong className="text-slate-800 dark:text-slate-200">{studentToArchive.name}</strong> (Doc: {studentToArchive.document}).
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
              <strong>Garantía de Integridad:</strong> Las notas, asistencias y expedientes previos se conservan de forma permanente en SQLite. Las matrículas activas se retirarán formalmente.
            </div>

            <div>
              <label htmlFor="archive-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Motivo del Archivado <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <textarea
                id="archive-reason"
                required
                rows={3}
                placeholder="Indique el motivo administrativo o justificación del retiro del padrón activo…"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#263834] bg-white dark:bg-[#131C1A] text-slate-800 dark:text-[#F0FDF8] placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A] dark:focus:ring-[#5EEAD4]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#263834]">
              <button
                type="button"
                onClick={() => setStudentToArchive(null)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#263834] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#131C1A] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving || !archiveReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isArchiving ? 'Archivando…' : 'Confirmar Archivado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Pie de Página */}
      <footer className="text-center py-4 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-[#263834]">
        CEPRO_MICAELA 2.0 · Módulo de Padrón y Legajos de Estudiantes Fuera de Línea
      </footer>
    </div>
  );
};

export default GestionEstudiantes;
