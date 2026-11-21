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

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
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
  const [programs, setPrograms] = useState<Array<{ id: string; name?: string; nombre?: string }>>([]);
  const [modules, setModules] = useState<Array<{ id: string; name?: string; nombre?: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVOS' | 'TODOS' | 'ARCHIVADOS'>('ACTIVOS');
  const [scopeFilter, setScopeFilter] = useState<'CAREER' | 'ALL'>('ALL');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState<string>('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('');
  const [selectedConvenioFilter, setSelectedConvenioFilter] = useState<'' | 'REGULAR' | 'CONVENIO'>('');

  // Contexto de carrera activa
  const activeProgramId = activeWorkspace?.programId;
  const activeProgramName = activeWorkspace?.programName || 'Carrera Seleccionada';

  useEffect(() => {
    if (activeProgramId) {
      setScopeFilter('CAREER');
    }
    setSelectedProgramFilter('');
    setSelectedTurnoFilter('');
    setSelectedSectionFilter('');
    setSelectedConvenioFilter('');
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
  const archivePanelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Referencia al formulario para scroll suave
  const formRef = useRef<HTMLDivElement | null>(null);

  // Trampa de foco, cierre con Escape y retorno de foco en modal de archivado
  useEffect(() => {
    if (!studentToArchive) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = archivePanelRef.current;
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
        if (!isArchiving) {
          e.preventDefault();
          setStudentToArchive(null);
        }
        return;
      }

      if (e.key !== 'Tab' || !archivePanelRef.current) return;
      const focusables = Array.from(
        archivePanelRef.current.querySelectorAll<HTMLElement>(
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
        if (document.activeElement === first || !archivePanelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !archivePanelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [studentToArchive, isArchiving]);

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
      setPrograms(res.programs || []);
      setModules(res.modules || []);
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

  const normalizeTurnoLabel = useCallback((value?: string): string => {
    const t = String(value || '').trim();
    if (/^ma[nñ]ana$/i.test(t)) return 'Mañana';
    if (/^tarde$/i.test(t)) return 'Tarde';
    if (/^noche$/i.test(t)) return 'Noche';
    return t;
  }, []);

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);
  const moduleById = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const activeEnrollmentsByStudent = useMemo(() => {
    const map = new Map<string, StudentEnrollmentItem[]>();
    for (const en of enrollments) {
      if (!en.active) continue;
      const list = map.get(en.studentId);
      if (list) list.push(en);
      else map.set(en.studentId, [en]);
    }
    return map;
  }, [enrollments]);

  const availableFilterPrograms = useMemo(() => {
    const list: Array<{ id: string; name?: string; nombre?: string }> = programs.length > 0
      ? programs
      : Array.from(new Set(groups.map((g) => g.programId).filter(Boolean))).map((id) => ({ id, nombre: id }));
    return [...list].sort((a, b) =>
      String(a.nombre || a.name || a.id).localeCompare(String(b.nombre || b.name || b.id), 'es')
    );
  }, [programs, groups]);

  const filterSourceGroups = useMemo(() => {
    if (selectedProgramFilter) {
      return groups.filter((g) => g.programId === selectedProgramFilter);
    }
    if (scopeFilter === 'CAREER' && activeProgramId) {
      return groups.filter((g) => g.programId === activeProgramId);
    }
    return groups;
  }, [groups, selectedProgramFilter, scopeFilter, activeProgramId]);

  const availableTurnos = useMemo(() => {
    const order: Record<string, number> = { Mañana: 1, Tarde: 2, Noche: 3 };
    const unique = new Set<string>();
    for (const g of filterSourceGroups) {
      const label = normalizeTurnoLabel(g.turno);
      if (label) unique.add(label);
    }
    return Array.from(unique).sort((a, b) => (order[a] || 99) - (order[b] || 99) || a.localeCompare(b, 'es'));
  }, [filterSourceGroups, normalizeTurnoLabel]);

  const availableSections = useMemo(() => {
    const unique = new Set<string>();
    for (const g of filterSourceGroups) {
      if (selectedTurnoFilter && normalizeTurnoLabel(g.turno) !== selectedTurnoFilter) continue;
      const sec = String(g.section || '').trim().toUpperCase();
      if (sec) unique.add(sec);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [filterSourceGroups, selectedTurnoFilter, normalizeTurnoLabel]);

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
  const hasAcademicFilters = Boolean(selectedProgramFilter || selectedTurnoFilter || selectedSectionFilter || selectedConvenioFilter);

  // Estudiantes filtrados según búsqueda, carrera, turno, sección, convenio y pestaña
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      // Si se eligió manualmente una carrera en el selector, prevalece sobre el ámbito superior
      if (!selectedProgramFilter && !q && scopeFilter === 'CAREER' && activeProgramId) {
        if (!careerStudentIds.has(s.id)) return false;
      }

      const studentActiveEnrolls = activeEnrollmentsByStudent.get(s.id) || [];

      if (hasAcademicFilters) {
        const matchesAcademic = studentActiveEnrolls.some((en) => {
          const g = groupById.get(en.groupId);
          if (!g) return false;
          const isGroupConvenio = Boolean(g.isConvenio || g.convenioName);
          if (selectedProgramFilter && g.programId !== selectedProgramFilter) return false;
          if (selectedTurnoFilter && normalizeTurnoLabel(g.turno) !== selectedTurnoFilter) return false;
          if (selectedSectionFilter && String(g.section || '').trim().toUpperCase() !== selectedSectionFilter) return false;
          if (selectedConvenioFilter === 'CONVENIO' && !isGroupConvenio) return false;
          if (selectedConvenioFilter === 'REGULAR' && isGroupConvenio) return false;
          return true;
        });
        if (!matchesAcademic) return false;
      }

      const matchesAcademicQuery = q
        ? studentActiveEnrolls.some((en) => {
            const g = groupById.get(en.groupId);
            if (!g) return false;
            const prog = programById.get(g.programId);
            const mod = moduleById.get(g.moduleId);
            const progName = String(prog?.nombre || prog?.name || '').toLowerCase();
            const modName = String(mod?.nombre || mod?.name || '').toLowerCase();
            const turnoStr = normalizeTurnoLabel(g.turno).toLowerCase();
            const secStr = String(g.section || '').trim().toLowerCase();
            const convStr = String(g.convenioName || '').trim().toLowerCase();
            const isGroupConvenio = Boolean(g.isConvenio || g.convenioName);
            return (
              String(g.name || '').toLowerCase().includes(q) ||
              progName.includes(q) ||
              modName.includes(q) ||
              turnoStr.includes(q) ||
              convStr.includes(q) ||
              (isGroupConvenio && 'convenio'.includes(q)) ||
              (secStr && (secStr === q || `sección ${secStr}`.includes(q) || `seccion ${secStr}`.includes(q)))
            );
          })
        : false;

      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.document.toLowerCase().includes(q) ||
        (s.firstNames && s.firstNames.toLowerCase().includes(q)) ||
        (s.lastName1 && s.lastName1.toLowerCase().includes(q)) ||
        (s.lastName2 && s.lastName2.toLowerCase().includes(q)) ||
        matchesAcademicQuery;

      if (statusFilter === 'ACTIVOS') {
        return matchesQuery && s.active && !s.archived;
      }
      if (statusFilter === 'ARCHIVADOS') {
        return matchesQuery && s.archived;
      }
      return matchesQuery;
    });
  }, [
    students,
    searchQuery,
    statusFilter,
    scopeFilter,
    activeProgramId,
    careerStudentIds,
    selectedProgramFilter,
    selectedTurnoFilter,
    selectedSectionFilter,
    selectedConvenioFilter,
    hasAcademicFilters,
    activeEnrollmentsByStudent,
    groupById,
    programById,
    moduleById,
    normalizeTurnoLabel,
  ]);

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
      <div className="w-9 h-9 rounded-full bg-brand-soft text-brand font-bold text-xs flex items-center justify-center shrink-0 border border-brand/20">
        {initials}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Encabezado Institucional */}
      <DashboardPhotoBand as="header" scene="aulas" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-3xl min-w-0">
          <h1 className="text-[30px] text-ink font-bold tracking-tight leading-tight">
            {isTeacher ? 'Mis estudiantes' : 'Padrón de estudiantes'}
          </h1>
          <p className="text-[14px] text-muted font-normal leading-relaxed">
            {isTeacher
              ? 'Consulta a los estudiantes de tus aulas y revisa su información académica.'
              : 'Registra estudiantes, actualiza sus fichas y consulta su historial de matrícula.'}
          </p>
        </div>

        {/* Botón de Actualización */}
        <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar padrón de estudiantes"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface border border-line text-ink hover:text-brand hover:border-brand/40 text-xs font-bold transition-all shadow-[var(--ui-shadow)] cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 text-brand ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </DashboardPhotoBand>

      {/* Contexto Académico de Unidad Activa y Conmutador Rápido */}
      <ActiveUnitContextBanner variant="compact" onNavigate={onNavigate} />

      {/* 2. Mensajes de Notificación */}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 dark:text-rose-300 hover:underline text-xs font-bold shrink-0 min-h-[44px] px-2 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline text-xs font-bold shrink-0 min-h-[44px] px-2 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 3. Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block truncate" title={activeProgramId && scopeFilter === 'CAREER' ? `Padrón Activo (${activeProgramName})` : 'Padrón Activo'}>
              {activeProgramId && scopeFilter === 'CAREER' ? `Padrón Activo (${activeProgramName})` : 'Padrón Activo'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-ink tabular-nums block">
                {activeProgramId && scopeFilter === 'CAREER' ? counts.careerCount : counts.activeCount}
              </span>
              {activeProgramId && scopeFilter === 'CAREER' && (
                <span className="text-xs text-muted font-medium tabular-nums">
                  de {counts.activeCount} total
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Fichas Archivadas
            </span>
            <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
              {counts.archivedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-surface-alt text-muted flex items-center justify-center font-bold shrink-0">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Total Registrados
            </span>
            <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
              {counts.totalCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Formulario de Registro / Edición (Solo DIRECTOR y SECRETARIA) */}
      {canEdit && (
        <div
          ref={formRef}
          className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] p-6 lg:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
            <div className="min-w-0">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                {editingStudentId ? 'Modificación de Datos' : 'Alta de Participante'}
              </span>
              <h2 className="text-lg font-bold text-ink mt-0.5">
                {editingStudentId ? 'Actualizar Ficha del Estudiante' : 'Registrar Nuevo Estudiante'}
              </h2>
            </div>
            {editingStudentId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-bold text-ink hover:text-brand self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancelar edición y crear nuevo
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Documento de Identidad */}
              <div>
                <label htmlFor="field-document" className="block text-xs font-bold text-ink mb-1.5">
                  Documento de Identidad <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="field-documentType"
                    name="documentType"
                    aria-label="Tipo de documento"
                    value={formData.documentType || 'DNI'}
                    onChange={handleInputChange}
                    className="w-24 min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
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
                    className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              {/* Apellido Paterno */}
              <div>
                <label htmlFor="field-lastName1" className="block text-xs font-bold text-ink mb-1.5">
                  Apellido Paterno
                </label>
                <input
                  id="field-lastName1"
                  name="lastName1"
                  type="text"
                  placeholder="Ej.: Pérez"
                  value={formData.lastName1 || ''}
                  onChange={handleInputChange}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Apellido Materno */}
              <div>
                <label htmlFor="field-lastName2" className="block text-xs font-bold text-ink mb-1.5">
                  Apellido Materno
                </label>
                <input
                  id="field-lastName2"
                  name="lastName2"
                  type="text"
                  placeholder="Ej.: Gómez"
                  value={formData.lastName2 || ''}
                  onChange={handleInputChange}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Nombres */}
              <div>
                <label htmlFor="field-firstNames" className="block text-xs font-bold text-ink mb-1.5">
                  Nombres
                </label>
                <input
                  id="field-firstNames"
                  name="firstNames"
                  type="text"
                  placeholder="Ej.: Ana María"
                  value={formData.firstNames || ''}
                  onChange={handleInputChange}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Nombre Completo Oficial */}
              <div className="md:col-span-2">
                <label htmlFor="field-name" className="block text-xs font-bold text-ink mb-1.5">
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
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Sexo */}
              <div>
                <label htmlFor="field-sex" className="block text-xs font-bold text-ink mb-1.5">
                  Sexo (Norma MINEDU)
                </label>
                <select
                  id="field-sex"
                  name="sex"
                  value={formData.sex || ''}
                  onChange={handleInputChange}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Pendiente de registrar</option>
                  <option value="H">H — Hombre</option>
                  <option value="M">M — Mujer</option>
                </select>
              </div>

              {/* Fecha de Nacimiento */}
              <div>
                <label htmlFor="field-birthDate" className="block text-xs font-bold text-ink mb-1.5">
                  Fecha de Nacimiento
                </label>
                <input
                  id="field-birthDate"
                  name="birthDate"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={formData.birthDate || ''}
                  onChange={handleInputChange}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center pt-6">
                <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active !== false}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-brand focus:ring-brand border-line bg-surface"
                  />
                  <span>Estudiante con ficha activa en el sistema</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-line">
              <div className="text-xs text-muted">
                {isDirty && <span className="text-amber-700 dark:text-amber-400 font-semibold">● Cambios pendientes en el formulario</span>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando en SQLite…' : editingStudentId ? 'Actualizar Estudiante' : 'Guardar Estudiante'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Toolbar de Búsqueda y Pestañas */}
      <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] p-6 space-y-5">
        {/* Banner contextual de carrera */}
        {activeProgramId && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-brand-soft border border-brand/20">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-ink truncate" title={scopeFilter === 'CAREER' ? `Viendo Alumnos de: ${activeProgramName}` : 'Viendo Todo el Padrón General'}>
                {scopeFilter === 'CAREER'
                  ? `🎯 Viendo Alumnos de: ${activeProgramName}`
                  : '🌐 Viendo Todo el Padrón General'}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface text-brand border border-brand/20 font-bold tabular-nums">
                {scopeFilter === 'CAREER' ? `${careerStudentIds.size} matriculados` : `${counts.totalCount} estudiantes`}
              </span>
              {isSearching && (
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60 tabular-nums">
                  ⚡ Búsqueda activa en todo el padrón ({filteredStudents.length} resultados)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setScopeFilter(scopeFilter === 'CAREER' ? 'ALL' : 'CAREER');
                  setSelectedProgramFilter('');
                  setSelectedTurnoFilter('');
                  setSelectedSectionFilter('');
                  setSelectedConvenioFilter('');
                }}
                className="min-h-[44px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold bg-surface border border-line text-ink hover:text-brand hover:border-brand/40 cursor-pointer shadow-[var(--ui-shadow)] transition-colors"
              >
                {scopeFilter === 'CAREER' ? '🌐 Ver Todo el Padrón' : `🎯 Filtrar por ${activeProgramName}`}
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#/matriculas';
                  }}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-[10px] text-xs font-bold bg-brand text-on-brand hover:opacity-90 transition-opacity cursor-pointer shadow-[var(--ui-shadow)] flex items-center gap-1.5"
                >
                  <span>➕ Matricular en {activeProgramName}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Pestañas de estado */}
          <div className="inline-flex p-1 bg-surface-alt rounded-xl text-xs font-bold border border-line">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVOS')}
              className={`min-h-[40px] px-4 py-2 rounded-[10px] transition-all cursor-pointer tabular-nums ${
                statusFilter === 'ACTIVOS'
                  ? 'bg-surface text-brand shadow-[var(--ui-shadow)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Padrón Activo ({counts.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ARCHIVADOS')}
              className={`min-h-[40px] px-4 py-2 rounded-[10px] transition-all cursor-pointer tabular-nums ${
                statusFilter === 'ARCHIVADOS'
                  ? 'bg-surface text-brand shadow-[var(--ui-shadow)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Archivados ({counts.archivedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('TODOS')}
              className={`min-h-[40px] px-4 py-2 rounded-[10px] transition-all cursor-pointer tabular-nums ${
                statusFilter === 'TODOS'
                  ? 'bg-surface text-brand shadow-[var(--ui-shadow)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Todos ({counts.totalCount})
            </button>
          </div>

          {/* Campo de búsqueda */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Buscar estudiante por DNI, nombres, apellidos, carrera, turno o sección"
              placeholder="Buscar por DNI, apellidos, carrera, turno o sección…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        {/* Filtros combinables por Carrera, Turno, Sección y Convenio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end pt-1">
          <div>
            <label htmlFor="filter-student-program" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Carrera / Programa
            </label>
            <select
              id="filter-student-program"
              value={selectedProgramFilter}
              onChange={(e) => {
                setSelectedProgramFilter(e.target.value);
                setSelectedTurnoFilter('');
                setSelectedSectionFilter('');
                setSelectedConvenioFilter('');
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">
                {scopeFilter === 'CAREER' && activeProgramId ? `Ámbito actual (${activeProgramName})` : 'Todas las carreras'}
              </option>
              {availableFilterPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre || p.name || p.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-student-turno" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Turno
            </label>
            <select
              id="filter-student-turno"
              value={selectedTurnoFilter}
              onChange={(e) => {
                setSelectedTurnoFilter(e.target.value);
                setSelectedSectionFilter('');
              }}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">Todos los turnos</option>
              {availableTurnos.map((turno) => (
                <option key={turno} value={turno}>
                  {turno}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-student-section" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Sección
            </label>
            <select
              id="filter-student-section"
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">Todas las secciones</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Sección {sec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-student-convenio" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Tipo / Convenio
            </label>
            <select
              id="filter-student-convenio"
              value={selectedConvenioFilter}
              onChange={(e) => setSelectedConvenioFilter(e.target.value as '' | 'REGULAR' | 'CONVENIO')}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">Todos</option>
              <option value="REGULAR">Regulares</option>
              <option value="CONVENIO">Solo Convenios</option>
            </select>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2">
            <span className="text-xs font-semibold text-muted tabular-nums">
              {filteredStudents.length} mostrados
            </span>
            {(hasAcademicFilters || isSearching) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedProgramFilter('');
                  setSelectedTurnoFilter('');
                  setSelectedSectionFilter('');
                  setSelectedConvenioFilter('');
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand border border-line text-xs font-bold transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* 6. Tabla de Estudiantes */}
        <div role="region" aria-label="Listado de estudiantes" tabIndex={0} className="overflow-x-auto rounded-xl border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <table className="record-table w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">Padrón de estudiantes, documentos, carrera, turno, sección y estado</caption>
            <thead className="bg-surface-alt">
              <tr className="border-b border-line text-xs font-semibold text-muted">
                <th scope="col" className="py-3 px-4">Estudiante</th>
                <th scope="col" className="py-3 px-4">Documento</th>
                <th scope="col" className="py-3 px-4">Carrera · Turno · Sección</th>
                <th scope="col" className="py-3 px-4">Estado</th>
                {canEdit && <th scope="col" className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="py-12 text-center text-muted">
                    <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-2" />
                    Cargando padrón de estudiantes…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="py-12 text-center text-muted">
                    <p className="font-bold text-ink text-sm">No se encontraron estudiantes</p>
                    <span className="text-xs text-muted mt-1 block">
                      {searchQuery || hasAcademicFilters
                        ? 'No existen coincidencias con la búsqueda o filtros seleccionados.'
                        : 'No hay estudiantes registrados en este estado.'}
                    </span>
                    {searchQuery || hasAcademicFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedProgramFilter('');
                          setSelectedTurnoFilter('');
                          setSelectedSectionFilter('');
                          setSelectedConvenioFilter('');
                        }}
                        className="mt-3 min-h-[44px] px-4 py-2 rounded-[10px] bg-surface-alt text-ink border border-line text-xs font-bold hover:bg-brand-soft transition-colors cursor-pointer"
                      >
                        Limpiar búsqueda y filtros
                      </button>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="mt-3 min-h-[44px] px-4 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] cursor-pointer"
                      >
                        + Registrar nuevo estudiante
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const studentEnrollments = activeEnrollmentsByStudent.get(s.id) || [];
                  const isArchived = Boolean(s.archived);
                  const phone = String((s.profile2026 as Record<string, unknown> | undefined)?.telefono || '').trim();

                  return (
                    <tr key={s.id} className="align-top transition-colors hover:bg-surface-alt/60">
                      {/* Nombre y avatar */}
                      <td className="min-w-[240px] max-w-[360px] px-4 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          {renderAvatar(s.name)}
                          <div className="min-w-0">
                            <span className="record-name block break-words text-base font-semibold leading-snug" title={s.name}>
                              {s.name}
                            </span>
                            <span className="record-label mt-1 block text-xs leading-relaxed tabular-nums">
                              {s.sex ? `Sexo: ${s.sex}` : 'Sexo sin registrar'}
                              {s.birthDate ? ` · F. Nac: ${s.birthDate}` : ''}
                              {phone ? ` · Cel: ${phone}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="px-4 py-4">
                        <span className="record-code break-all text-sm font-semibold tabular-nums">
                          {s.document}
                        </span>
                        <span className="record-label mt-1 block text-xs">
                          {s.documentType || 'DNI'}
                        </span>
                      </td>

                      {/* Matrículas Asociadas (Carrera, Turno y Sección) */}
                      <td className="min-w-[260px] max-w-[380px] px-4 py-4">
                        {studentEnrollments.length > 0 ? (
                          <div className="space-y-2.5">
                            {studentEnrollments.map((en) => {
                              const group = groupById.get(en.groupId);
                              const prog = group ? programById.get(group.programId) : undefined;
                              const mod = group ? moduleById.get(group.moduleId) : undefined;
                              const turnoLabel = normalizeTurnoLabel(group?.turno);
                              const sectionLabel = String(group?.section || '').trim().toUpperCase();
                              const progName = prog?.nombre || prog?.name || group?.programId || '';
                              const modName = mod?.nombre || mod?.name || '';

                              return (
                                <div
                                  key={en.id}
                                  className="flex min-w-0 flex-col gap-1 border-l-2 border-brand/40 pl-2.5 text-sm"
                                >
                                  {progName && (
                                    <span className="text-xs font-bold text-ink break-words">
                                      {progName}
                                      {modName ? ` · ${modName}` : ''}
                                    </span>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {turnoLabel && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft text-brand border border-brand/20">
                                        Turno: {turnoLabel}
                                      </span>
                                    )}
                                    {sectionLabel && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-surface-alt text-ink border border-line">
                                        Sección {sectionLabel}
                                      </span>
                                    )}
                                    {(group?.isConvenio || group?.convenioName) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                        {group.convenioName || 'Convenio'}
                                      </span>
                                    )}
                                  </div>
                                  <strong className="record-academic break-words text-xs font-medium leading-snug text-muted">
                                    {group?.name || en.groupId}
                                  </strong>
                                  <span className="record-code break-all text-[11px] tabular-nums">
                                    {en.code || 'MAT'}
                                    {group?.teacherName ? ` · ${group.teacherName}` : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="record-label text-sm">Sin matrícula activa</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-4">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-alt text-muted border border-line">
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
                        <td className="min-w-[170px] px-4 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleRestoreStudent(s)}
                                className="min-h-[44px] px-3 py-1 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand font-bold text-xs transition-colors border border-line cursor-pointer"
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
                                  className="min-h-[44px] px-3 py-1 rounded-[10px] bg-brand-soft hover:bg-brand hover:text-on-brand text-brand font-bold text-xs transition-colors border border-brand/30 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>➕ Matricular</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(s)}
                                  className="min-h-[44px] px-3 py-1 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand border border-line font-bold text-xs transition-colors cursor-pointer"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenArchiveModal(s)}
                                  className="min-h-[44px] px-3 py-1 rounded-[10px] bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors border border-rose-200 dark:border-rose-800/60 cursor-pointer"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-student-title"
        >
          <div
            ref={archivePanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircleIcon className="w-5 h-5 text-rose-700 dark:text-rose-400" />
              </div>
              <div className="min-w-0">
                <h3 id="archive-student-title" className="text-base font-bold text-ink">
                  Archivar Ficha de Estudiante
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Está por archivar la ficha de <strong className="text-ink">{studentToArchive.name}</strong> (Doc: <span className="tabular-nums">{studentToArchive.document}</span>).
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
              <strong>Garantía de Integridad:</strong> Las notas, asistencias y expedientes previos se conservan de forma permanente en SQLite. Las matrículas activas se retirarán formalmente.
            </div>

            <div>
              <label htmlFor="archive-reason" className="block text-xs font-bold text-ink mb-1.5">
                Motivo del Archivado <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <textarea
                id="archive-reason"
                required
                rows={3}
                placeholder="Indique el motivo administrativo o justificación del retiro del padrón activo…"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setStudentToArchive(null)}
                disabled={isArchiving}
                className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving || !archiveReason.trim()}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
              >
                {isArchiving ? 'Archivando…' : 'Confirmar Archivado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Pie de Página */}
      <footer className="text-center py-4 text-xs text-muted border-t border-line">
        CEPRO_MICAELA 2.0 · Módulo de Padrón y Legajos de Estudiantes Fuera de Línea
      </footer>
    </div>
  );
};

export default GestionEstudiantes;
