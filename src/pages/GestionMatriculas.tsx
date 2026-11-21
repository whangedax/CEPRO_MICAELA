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

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
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
import { ActiveUnitContextBanner } from '../components/academic/ActiveUnitContextBanner';
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

  // Filtros de tabla y contexto de carrera
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [selectedTurnoFilter, setSelectedTurnoFilter] = useState<string>('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('');
  const [selectedConvenioFilter, setSelectedConvenioFilter] = useState<'' | 'REGULAR' | 'CONVENIO'>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('');
  const [showAllCareers, setShowAllCareers] = useState<boolean>(false);

  const hasCareerContext = Boolean(!activeWorkspace?.overview && (activeWorkspace?.programId || activeWorkspace?.groupId));

  useEffect(() => {
    setSelectedProgramFilter('');
    setSelectedTurnoFilter('');
    setSelectedSectionFilter('');
    setSelectedConvenioFilter('');
    setSelectedGroupFilter('');
  }, [activeWorkspace?.programId]);

  const activeProgramName = useMemo(() => {
    if (!activeWorkspace?.programId) return '';
    return (
      programs.find((p) => p.id === activeWorkspace.programId)?.nombre ||
      programs.find((p) => p.id === activeWorkspace.programId)?.name ||
      activeWorkspace.programId
    );
  }, [programs, activeWorkspace?.programId]);

  // Formulario de Nueva Matrícula
  const [enrollMode, setEnrollMode] = useState<'search' | 'create'>('search');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [studentSearchInput, setStudentSearchInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);

  // Campos para Alta Rápida de Alumno en 1 paso
  const [newStudentDni, setNewStudentDni] = useState<string>('');
  const [newStudentLastName1, setNewStudentLastName1] = useState<string>('');
  const [newStudentLastName2, setNewStudentLastName2] = useState<string>('');
  const [newStudentNames, setNewStudentNames] = useState<string>('');
  const [newStudentSex, setNewStudentSex] = useState<string>('H');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState<string>('');

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
  const modulePanelRef = useRef<HTMLDivElement | null>(null);
  const retirePanelRef = useRef<HTMLDivElement | null>(null);
  const previousModalFocusRef = useRef<HTMLElement | null>(null);

  // Trampa de foco, Escape y retorno de foco para modales de matrícula
  useEffect(() => {
    const activePanel = moduleModal.isOpen
      ? modulePanelRef.current
      : retireModal.isOpen
      ? retirePanelRef.current
      : null;
    if (!moduleModal.isOpen && !retireModal.isOpen) return;

    previousModalFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = moduleModal.isOpen ? modulePanelRef.current : retirePanelRef.current;
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
      const panel = moduleModal.isOpen ? modulePanelRef.current : retirePanelRef.current;
      if (e.key === 'Escape') {
        if (moduleModal.isOpen && !isSubmittingModuleAction) {
          e.preventDefault();
          setModuleModal({ isOpen: false, enrollment: null, action: 'CONFIRM', reason: '' });
        } else if (retireModal.isOpen && !isSubmittingRetire) {
          e.preventDefault();
          setRetireModal({ isOpen: false, enrollment: null, reason: '', date: '', targetGroupId: '' });
        }
        return;
      }

      if (e.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
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
        if (document.activeElement === first || !panel.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    void activePanel;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousModalFocusRef.current && typeof previousModalFocusRef.current.focus === 'function') {
        previousModalFocusRef.current.focus();
      }
    };
  }, [moduleModal.isOpen, retireModal.isOpen, isSubmittingModuleAction, isSubmittingRetire]);

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

      // Revisar si viene studentId desde URL hash query params (ej. #/matriculas?studentId=...)
      const hash = window.location.hash;
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const params = new URLSearchParams(hash.slice(qIndex));
        const sId = params.get('studentId');
        if (sId && res.students?.some((s) => s.id === sId)) {
          setSelectedStudentId(sId);
        }
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

  // Grupos de la carrera activa
  const careerGroups = useMemo(() => {
    if (!hasCareerContext || !activeWorkspace?.programId) return groups;
    return groups.filter((g) => g.programId === activeWorkspace.programId);
  }, [groups, hasCareerContext, activeWorkspace?.programId]);

  // Grupos disponibles para matrícula (con periodo y módulo configurados)
  const availableGroups = useMemo(() => {
    return groups.filter((g) => g.moduleId && g.periodId);
  }, [groups]);

  // Grupos mostrados en el selector de aula según carrera activa
  const selectableEnrollmentGroups = useMemo(() => {
    const list = availableGroups;
    if (hasCareerContext && !showAllCareers && careerGroups.length > 0) {
      return list.filter((g) => g.programId === activeWorkspace?.programId);
    }
    return list;
  }, [availableGroups, hasCareerContext, showAllCareers, careerGroups, activeWorkspace?.programId]);

  // Auto-selección inicial de aula y ajuste de fecha al calendario del aula
  useEffect(() => {
    if (groups.length === 0) return;
    let targetId = selectedGroupId;
    if (!targetId) {
      if (hasCareerContext && activeWorkspace?.groupId && careerGroups.some((g) => g.id === activeWorkspace.groupId)) {
        targetId = activeWorkspace.groupId;
      } else if (hasCareerContext && careerGroups.length > 0) {
        targetId = careerGroups[0].id;
      } else if (groups.length > 0) {
        targetId = groups[0].id;
      }
      if (targetId) {
        setSelectedGroupId(targetId);
      }
    }

    if (targetId) {
      const g = groups.find((grp) => grp.id === targetId);
      const gStart: string = (g?.fechaInicio as string) || '2026-03-16';
      const gEnd: string = (g?.fechaFin as string) || '2026-07-24';
      const today = new Date().toISOString().slice(0, 10);
      if (today < gStart || today > gEnd) {
        setStartDate(gStart);
      }
    }
  }, [groups, careerGroups, hasCareerContext, activeWorkspace?.groupId, selectedGroupId]);

  // Al cambiar manualmente de aula, recalcular si la fecha de inicio debe ajustarse
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    setIsFormDirty(true);
    const g = groups.find((grp) => grp.id === newGroupId);
    if (g) {
      const gStart: string = (g.fechaInicio as string) || '2026-03-16';
      const gEnd: string = (g.fechaFin as string) || '2026-07-24';
      const today = new Date().toISOString().slice(0, 10);
      if (today < gStart || today > gEnd) {
        setStartDate(gStart);
      }
    }
  };

  const currentSelectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const groupDateRangeInfo = useMemo<{ gStart: string; gEnd: string } | null>(() => {
    if (!currentSelectedGroup) return null;
    const gStart: string = (currentSelectedGroup.fechaInicio as string) || '2026-03-16';
    const gEnd: string = (currentSelectedGroup.fechaFin as string) || '2026-07-24';
    return { gStart, gEnd };
  }, [currentSelectedGroup]);

  // Buscador interactivo en los 286 alumnos del padrón general
  const studentSearchResults = useMemo(() => {
    const q = studentSearchInput.toLowerCase().trim();
    if (!q) return [];
    return students
      .filter((s) => s.active && !s.archived)
      .filter((s) => {
        return (
          s.name.toLowerCase().includes(q) ||
          s.document.toLowerCase().includes(q) ||
          (s.firstNames && s.firstNames.toLowerCase().includes(q)) ||
          (s.lastName1 && s.lastName1.toLowerCase().includes(q)) ||
          (s.lastName2 && s.lastName2.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  }, [students, studentSearchInput]);

  const isEnrolledInSelectedGroup = useCallback(
    (studentId: string) => {
      return enrollments.some((e) => e.studentId === studentId && e.groupId === selectedGroupId && e.active);
    },
    [enrollments, selectedGroupId]
  );

  const getOtherEnrollmentGroup = useCallback(
    (studentId: string) => {
      const other = enrollments.find((e) => e.studentId === studentId && e.active && e.groupId !== selectedGroupId);
      if (!other) return null;
      return groups.find((g) => g.id === other.groupId) || null;
    },
    [enrollments, selectedGroupId, groups]
  );

  // Registrar nueva matrícula desde selección de estudiante
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
        autoAdjustDate: true,
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

  // Alta rápida de nuevo estudiante y matrícula en 1 paso
  const handleQuickCreateAndEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentDni.trim() || !/^\d{8}$/.test(newStudentDni.trim())) {
      setErrorMsg('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!newStudentLastName1.trim() || !newStudentNames.trim()) {
      setErrorMsg('El Apellido Paterno y Nombres son obligatorios.');
      return;
    }
    if (!selectedGroupId) {
      setErrorMsg('Debe seleccionar el aula a la que se matriculará al nuevo participante.');
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
      const fullName = `${newStudentLastName1.trim()} ${newStudentLastName2.trim()}, ${newStudentNames.trim()}`;
      // 1. Guardar estudiante en el padrón
      const savedStudent = await apiClient.saveStudent({
        document: newStudentDni.trim(),
        name: fullName,
        documentType: 'DNI',
        lastName1: newStudentLastName1.trim(),
        lastName2: newStudentLastName2.trim(),
        firstNames: newStudentNames.trim(),
        sex: newStudentSex,
        birthDate: newStudentBirthDate || undefined,
        active: true,
      });

      // 2. Matricular de inmediato en el aula seleccionada
      const enrollResult = await apiClient.enroll({
        studentId: savedStudent.id,
        groupId: selectedGroupId,
        startDate,
        autoAdjustDate: true,
      });

      setSuccessMsg(
        `Estudiante "${fullName}" registrado y matriculado con éxito en ${group?.name || 'el aula'} (Código: ${enrollResult.code || 'MAT'}).`
      );

      // Limpiar formulario rápido
      setNewStudentDni('');
      setNewStudentLastName1('');
      setNewStudentLastName2('');
      setNewStudentNames('');
      setNewStudentBirthDate('');
      setSelectedStudentId('');
      setStudentSearchInput('');
      setEnrollMode('search');
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al registrar y matricular al nuevo estudiante.');
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

  const normalizeTurnoLabel = useCallback((value?: string): string => {
    const t = String(value || '').trim();
    if (/^ma[nñ]ana$/i.test(t)) return 'Mañana';
    if (/^tarde$/i.test(t)) return 'Tarde';
    if (/^noche$/i.test(t)) return 'Noche';
    return t;
  }, []);

  const availableFilterPrograms = useMemo(() => {
    const list: Array<{ id: string; name?: string; nombre?: string }> = programs.length > 0
      ? programs
      : Array.from(new Set(availableGroups.map((g) => g.programId).filter(Boolean))).map((id) => ({ id, nombre: id }));
    return [...list].sort((a, b) =>
      String(a.nombre || a.name || a.id).localeCompare(String(b.nombre || b.name || b.id), 'es')
    );
  }, [programs, availableGroups]);

  const filterSourceGroups = useMemo(() => {
    let list = availableGroups;
    if (selectedProgramFilter) {
      list = list.filter((g) => g.programId === selectedProgramFilter);
    } else if (hasCareerContext && !showAllCareers && activeWorkspace?.programId) {
      list = list.filter((g) => g.programId === activeWorkspace.programId);
    }
    return list;
  }, [availableGroups, selectedProgramFilter, hasCareerContext, showAllCareers, activeWorkspace?.programId]);

  const availableFilterTurnos = useMemo(() => {
    const order: Record<string, number> = { Mañana: 1, Tarde: 2, Noche: 3 };
    const unique = new Set<string>();
    for (const g of filterSourceGroups) {
      const label = normalizeTurnoLabel(g.turno);
      if (label) unique.add(label);
    }
    return Array.from(unique).sort((a, b) => (order[a] || 99) - (order[b] || 99) || a.localeCompare(b, 'es'));
  }, [filterSourceGroups, normalizeTurnoLabel]);

  const availableFilterSections = useMemo(() => {
    const unique = new Set<string>();
    for (const g of filterSourceGroups) {
      if (selectedTurnoFilter && normalizeTurnoLabel(g.turno) !== selectedTurnoFilter) continue;
      const sec = String(g.section || '').trim().toUpperCase();
      if (sec) unique.add(sec);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [filterSourceGroups, selectedTurnoFilter, normalizeTurnoLabel]);

  const filteredGroupDropdownOptions = useMemo(() => {
    return filterSourceGroups.filter((g) => {
      if (selectedTurnoFilter && normalizeTurnoLabel(g.turno) !== selectedTurnoFilter) return false;
      if (selectedSectionFilter && String(g.section || '').trim().toUpperCase() !== selectedSectionFilter) return false;
      const isGroupConvenio = Boolean(g.isConvenio || g.convenioName);
      if (selectedConvenioFilter === 'CONVENIO' && !isGroupConvenio) return false;
      if (selectedConvenioFilter === 'REGULAR' && isGroupConvenio) return false;
      return true;
    });
  }, [filterSourceGroups, selectedTurnoFilter, selectedSectionFilter, selectedConvenioFilter, normalizeTurnoLabel]);

  const hasTableFilters = Boolean(
    searchQuery || selectedProgramFilter || selectedTurnoFilter || selectedSectionFilter || selectedConvenioFilter || selectedGroupFilter || selectedStateFilter
  );

  // Filtrado de filas de matrículas con soporte de carrera activa, turno, sección y convenio
  const filteredEnrollments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const careerGroupIds = new Set(careerGroups.map((g) => g.id));

    return enrollments.filter((en) => {
      // Si no se eligió una carrera específica en el filtro, respetamos la carrera activa salvo "todas las carreras"
      if (!selectedProgramFilter && hasCareerContext && !showAllCareers && !careerGroupIds.has(en.groupId)) {
        return false;
      }

      const group = groups.find((g) => g.id === en.groupId);
      const prog = programs.find((p) => p.id === group?.programId);
      const mod = modules.find((m) => m.id === group?.moduleId);
      const turnoLabel = normalizeTurnoLabel(group?.turno);
      const sectionLabel = String(group?.section || '').trim().toUpperCase();
      const isGroupConvenio = Boolean(group?.isConvenio || group?.convenioName);

      const matchesProgram = !selectedProgramFilter || group?.programId === selectedProgramFilter;
      const matchesTurno = !selectedTurnoFilter || turnoLabel === selectedTurnoFilter;
      const matchesSection = !selectedSectionFilter || sectionLabel === selectedSectionFilter;
      const matchesConvenio =
        !selectedConvenioFilter ||
        (selectedConvenioFilter === 'CONVENIO' ? isGroupConvenio : !isGroupConvenio);

      const state = getEnrollmentState(en);
      const studentName = getStudentName(en.studentId).toLowerCase();
      const studentDoc = getStudentDocument(en.studentId).toLowerCase();
      const code = (en.code || '').toLowerCase();
      const groupName = String(group?.name || '').toLowerCase();
      const progName = String(prog?.nombre || prog?.name || '').toLowerCase();
      const modName = String(mod?.nombre || mod?.name || '').toLowerCase();
      const convStr = String(group?.convenioName || '').trim().toLowerCase();

      const matchesGroup = !selectedGroupFilter || en.groupId === selectedGroupFilter;
      const matchesState = !selectedStateFilter || state === selectedStateFilter;
      const matchesQuery =
        !q ||
        studentName.includes(q) ||
        studentDoc.includes(q) ||
        code.includes(q) ||
        groupName.includes(q) ||
        progName.includes(q) ||
        modName.includes(q) ||
        convStr.includes(q) ||
        (isGroupConvenio && 'convenio'.includes(q)) ||
        turnoLabel.toLowerCase().includes(q) ||
        (sectionLabel && (sectionLabel.toLowerCase() === q || `sección ${sectionLabel.toLowerCase()}`.includes(q) || `seccion ${sectionLabel.toLowerCase()}`.includes(q)));

      return matchesProgram && matchesTurno && matchesSection && matchesConvenio && matchesGroup && matchesState && matchesQuery;
    });
  }, [
    enrollments,
    groups,
    programs,
    modules,
    searchQuery,
    selectedProgramFilter,
    selectedTurnoFilter,
    selectedSectionFilter,
    selectedConvenioFilter,
    selectedGroupFilter,
    selectedStateFilter,
    getStudentName,
    getStudentDocument,
    hasCareerContext,
    showAllCareers,
    careerGroups,
    normalizeTurnoLabel,
  ]);

  // Contadores por estado contextualizados a la carrera activa
  const counts = useMemo(() => {
    const careerGroupIds = new Set(careerGroups.map((g) => g.id));
    const baseList =
      hasCareerContext && !showAllCareers
        ? enrollments.filter((e) => careerGroupIds.has(e.groupId))
        : enrollments;

    const total = baseList.length;
    const active = baseList.filter((e) => e.active).length;
    const provisional = baseList.filter((e) => e.provisional && e.active).length;
    const confirmed = baseList.filter((e) => !e.provisional && e.active && e.moduleState !== 'EXCLUDED').length;
    const excluded = baseList.filter((e) => e.moduleState === 'EXCLUDED').length;
    return {
      total,
      active,
      provisional,
      confirmed,
      excluded,
      allTotal: enrollments.length,
      careerTotal: enrollments.filter((e) => careerGroupIds.has(e.groupId)).length,
    };
  }, [enrollments, hasCareerContext, showAllCareers, careerGroups]);

  // Renderizar badge de estado modular
  const renderStateBadge = (state: 'PROVISIONAL' | 'CONFIRMED' | 'EXCLUDED' | 'RETIRED') => {
    switch (state) {
      case 'PROVISIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Provisional: confirmar módulo
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Confirmada
          </span>
        );
      case 'EXCLUDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Excluida de este módulo
          </span>
        );
      case 'RETIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-alt text-muted border border-line">
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
      <DashboardPhotoBand as="header" scene="inscripcion" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-3xl min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-brand uppercase tracking-widest bg-brand-soft px-2.5 py-1 rounded-md">
              Ámbito Institucional · Admisión y Matrícula
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-ink font-bold tracking-tight leading-tight">
            Matrículas por Módulo
          </h1>
          <p className="text-[14px] text-muted font-normal leading-relaxed">
            Incorporación formal de estudiantes, asignación de código MAT y rectificación de pertenencia a módulos curriculares.
          </p>
        </div>

        {/* Botón de Actualización */}
        <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar datos de matrículas"
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

      {/* Banner de Contexto de Carrera y Conmutador */}
      {hasCareerContext && (
        <div className="p-4 rounded-2xl bg-surface border border-line flex flex-wrap items-center justify-between gap-3 shadow-[var(--ui-shadow)]">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-ink">Ámbito de visualización:</span>
            <div className="inline-flex flex-wrap p-1 rounded-xl bg-surface-alt border border-line gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowAllCareers(false);
                  setSelectedProgramFilter('');
                  setSelectedTurnoFilter('');
                  setSelectedSectionFilter('');
                  setSelectedConvenioFilter('');
                  setSelectedGroupFilter('');
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer tabular-nums ${
                  !showAllCareers
                    ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                🎯 Carrera: {activeProgramName} ({counts.careerTotal} matrículas)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllCareers(true);
                  setSelectedProgramFilter('');
                  setSelectedTurnoFilter('');
                  setSelectedSectionFilter('');
                  setSelectedConvenioFilter('');
                  setSelectedGroupFilter('');
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer tabular-nums ${
                  showAllCareers
                    ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                🌐 Todas las carreras ({counts.allTotal})
              </button>
            </div>
          </div>

          {activeWorkspace?.groupId && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-soft text-brand border border-brand/20 truncate max-w-full">
              Aula activa en sesión: {groups.find((g) => g.id === activeWorkspace.groupId)?.name || activeWorkspace.groupId}
            </span>
          )}
        </div>
      )}

      {/* 3. Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Matrículas Activas
            </span>
            <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
              {counts.active}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
            <EnrollmentIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Provisionales
            </span>
            <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums mt-1 block">
              {counts.provisional}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Confirmadas
            </span>
            <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
              {counts.confirmed}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Excluidas de Módulo
            </span>
            <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums mt-1 block">
              {counts.excluded}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold shrink-0">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Formulario de Nueva Matrícula (DIRECTOR y SECRETARIA) */}
      {canManage && (
        <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] p-6 lg:p-8 space-y-6">
          <div className="pb-4 border-b border-line">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Trámite de Incorporación
            </span>
            <h2 className="text-lg font-bold text-ink mt-0.5">
              Registrar Nueva Matrícula
            </h2>
            <p className="text-xs text-muted mt-1">
              Seleccione un estudiante del padrón general del CETPRO o cree uno nuevo en un solo paso.
            </p>
          </div>

          {/* Selector de Modo de Incorporación */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
            <button
              type="button"
              onClick={() => setEnrollMode('search')}
              className={`min-h-[44px] px-4 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center gap-2 tabular-nums ${
                enrollMode === 'search'
                  ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                  : 'bg-surface-alt text-muted hover:text-ink border border-line'
              }`}
            >
              <SearchIcon className="w-3.5 h-3.5" />
              1. Buscar Alumno del Padrón General ({students.length} registrados)
            </button>
            <button
              type="button"
              onClick={() => setEnrollMode('create')}
              className={`min-h-[44px] px-4 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                enrollMode === 'create'
                  ? 'bg-brand text-on-brand shadow-[var(--ui-shadow)]'
                  : 'bg-surface-alt text-muted hover:text-ink border border-line'
              }`}
            >
              <span>✨ 2. Registrar Nuevo Alumno y Matricular Aquí (En 1 paso)</span>
            </button>
          </div>

          {enrollMode === 'search' ? (
            <form onSubmit={handleSubmitEnrollment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Selección y Búsqueda de Estudiante */}
                <div className="space-y-1.5 md:col-span-1">
                  <label htmlFor="student-search-box" className="block text-xs font-bold text-ink">
                    Buscar Alumno en Padrón (DNI o Nombre) <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <SearchIcon className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="student-search-box"
                      type="text"
                      placeholder="Escriba DNI o apellidos del alumno…"
                      value={studentSearchInput}
                      onChange={(e) => {
                        setStudentSearchInput(e.target.value);
                        setIsFormDirty(true);
                      }}
                      className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  {/* Lista de coincidencias interactivas */}
                  {studentSearchInput.trim() && studentSearchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-line bg-surface shadow-[var(--ui-shadow)] divide-y divide-line z-20 relative">
                      {studentSearchResults.map((st) => {
                        const inCurrent = isEnrolledInSelectedGroup(st.id);
                        const otherGrp = getOtherEnrollmentGroup(st.id);
                        const isSelected = selectedStudentId === st.id;
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              setSelectedStudentId(st.id);
                              setIsFormDirty(true);
                            }}
                            className={`p-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs ${
                              isSelected
                                ? 'bg-brand-soft'
                                : 'hover:bg-surface-alt'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="record-name break-words font-semibold leading-snug" title={st.name}>
                                {st.name}
                              </p>
                              <span className="font-mono text-[11px] text-muted tabular-nums">
                                DNI: {st.document}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              {inCurrent ? (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                  Ya matriculado en esta aula
                                </span>
                              ) : otherGrp ? (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                  Matriculado en: {otherGrp.name.slice(0, 15)}…
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  Listo para matricular
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tarjeta de Estudiante Seleccionado */}
                  {selectedStudentId && (
                    <div className="mt-2 p-3 rounded-xl bg-brand-soft border border-brand/30 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand block">
                          Seleccionado
                        </span>
                        <p className="record-name break-words text-sm font-semibold leading-snug" title={getStudentName(selectedStudentId)}>
                          {getStudentName(selectedStudentId)}
                        </p>
                        <span className="text-[11px] font-mono text-brand tabular-nums">
                          DNI: {getStudentDocument(selectedStudentId)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId('');
                          setStudentSearchInput('');
                        }}
                        className="min-h-[40px] px-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
                      >
                        ✕ Quitar
                      </button>
                    </div>
                  )}
                </div>

                {/* Selección de Grupo / Aula */}
                <div className="space-y-1.5 md:col-span-1">
                  <label htmlFor="select-group" className="block text-xs font-bold text-ink">
                    Aula y Módulo Curricular <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    id="select-group"
                    required
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Seleccionar aula…</option>
                    {selectableEnrollmentGroups.map((g) => {
                      const prog = programs.find((p) => p.id === g.programId);
                      return (
                        <option key={g.id} value={g.id}>
                          {g.name} · {g.periodId} {g.turno ? `(${g.turno})` : ''} {prog?.nombre ? `— ${prog.nombre}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedGroupId && groups.find((g) => g.id === selectedGroupId)?.closed && (
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block mt-1">
                      ⚠ Aula cerrada: Requiere reapertura para admitir nuevas matrículas.
                    </span>
                  )}
                  {groupDateRangeInfo && (
                    <span className="text-[11px] text-muted tabular-nums block mt-1">
                      Vigencia del aula: {groupDateRangeInfo.gStart} al {groupDateRangeInfo.gEnd}
                    </span>
                  )}
                </div>

                {/* Fecha de Ingreso con auto-ajuste */}
                <div className="space-y-1.5 md:col-span-1">
                  <label htmlFor="input-start-date" className="block text-xs font-bold text-ink">
                    Fecha de Ingreso <span className="text-rose-600 dark:text-rose-400">*</span>
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
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  {groupDateRangeInfo && (
                    <span className="text-[11px] font-semibold text-brand tabular-nums block">
                      Periodo del aula: {groupDateRangeInfo.gStart} al {groupDateRangeInfo.gEnd} (Fecha ajustada automáticamente al calendario lectivo)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-line">
                <div className="text-xs text-muted">
                  {isFormDirty && <span className="text-amber-700 dark:text-amber-400 font-semibold">● Datos de matrícula listos para confirmación</span>}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentId('');
                      setStudentSearchInput('');
                      setIsFormDirty(false);
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedStudentId || !selectedGroupId}
                    className="min-h-[44px] px-6 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Registrando matrícula…' : 'Confirmar Matrícula en Aula'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Modo 2: Alta Rápida de Alumno en 1 Paso */
            <form onSubmit={handleQuickCreateAndEnroll} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="quick-dni" className="block text-xs font-bold text-ink mb-1">
                    DNI del Estudiante (8 dígitos) <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="quick-dni"
                    type="text"
                    required
                    maxLength={8}
                    value={newStudentDni}
                    onChange={(e) => setNewStudentDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej.: 72345678"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-mono font-bold tabular-nums focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="quick-ln1" className="block text-xs font-bold text-ink mb-1">
                    Apellido Paterno <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="quick-ln1"
                    type="text"
                    required
                    value={newStudentLastName1}
                    onChange={(e) => setNewStudentLastName1(e.target.value)}
                    placeholder="Ej.: Quispe"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="quick-ln2" className="block text-xs font-bold text-ink mb-1">
                    Apellido Materno
                  </label>
                  <input
                    id="quick-ln2"
                    type="text"
                    value={newStudentLastName2}
                    onChange={(e) => setNewStudentLastName2(e.target.value)}
                    placeholder="Ej.: Mamani"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="quick-names" className="block text-xs font-bold text-ink mb-1">
                    Nombres Completos <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="quick-names"
                    type="text"
                    required
                    value={newStudentNames}
                    onChange={(e) => setNewStudentNames(e.target.value)}
                    placeholder="Ej.: Juan Carlos"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="quick-sex" className="block text-xs font-bold text-ink mb-1">
                    Sexo
                  </label>
                  <select
                    id="quick-sex"
                    value={newStudentSex}
                    onChange={(e) => setNewStudentSex(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:ring-2 focus:ring-brand outline-none"
                  >
                    <option value="H">Hombre (H)</option>
                    <option value="M">Mujer (M)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="quick-birth" className="block text-xs font-bold text-ink mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    id="quick-birth"
                    type="date"
                    value={newStudentBirthDate}
                    onChange={(e) => setNewStudentBirthDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium tabular-nums focus:ring-2 focus:ring-brand outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="quick-group" className="block text-xs font-bold text-ink mb-1">
                    Aula de Matrícula <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    id="quick-group"
                    required
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:ring-2 focus:ring-brand outline-none"
                  >
                    <option value="">Seleccionar aula…</option>
                    {selectableEnrollmentGroups.map((g) => {
                      const prog = programs.find((p) => p.id === g.programId);
                      return (
                        <option key={g.id} value={g.id}>
                          {g.name} · {g.periodId} {g.turno ? `(${g.turno})` : ''} {prog?.nombre ? `— ${prog.nombre}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="quick-start-date" className="block text-xs font-bold text-ink mb-1">
                    Fecha de Ingreso <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="quick-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium tabular-nums focus:ring-2 focus:ring-brand outline-none"
                  />
                  {groupDateRangeInfo && (
                    <span className="text-[11px] font-semibold text-brand tabular-nums block mt-1">
                      Periodo: {groupDateRangeInfo.gStart} al {groupDateRangeInfo.gEnd}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEnrollMode('search')}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Volver a Buscar en Padrón
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newStudentDni.trim() || !newStudentLastName1.trim() || !newStudentNames.trim() || !selectedGroupId}
                  className="min-h-[44px] px-6 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Registrando y Matriculando…' : 'Crear Alumno y Matricular de Inmediato (1 paso)'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 5. Tabla de Matrículas y Pertenencia Modular */}
      <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">
              Padrón de Matrículas y Control Modular
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Supervisión de módulos cursados, ratificación y rectificación de asignación de aula.
            </p>
          </div>

          <span className="text-xs font-semibold text-ink bg-surface-alt border border-line px-3 py-1 rounded-full tabular-nums shrink-0 self-start md:self-auto">
            {filteredEnrollments.length} matrículas encontradas
          </span>
        </div>

        {/* Toolbar de Filtros */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Filtro por Carrera */}
            {(availableFilterPrograms.length > 1 || showAllCareers || Boolean(selectedProgramFilter)) && (
              <div>
                <label htmlFor="filter-program-enroll" className="block text-[11px] font-bold text-muted uppercase mb-1">
                  Carrera / Programa
                </label>
                <select
                  id="filter-program-enroll"
                  value={selectedProgramFilter}
                  onChange={(e) => {
                    setSelectedProgramFilter(e.target.value);
                    setSelectedTurnoFilter('');
                    setSelectedSectionFilter('');
                    setSelectedConvenioFilter('');
                    setSelectedGroupFilter('');
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">
                    {hasCareerContext && !showAllCareers ? `Carrera activa (${activeProgramName})` : 'Todas las carreras'}
                  </option>
                  {availableFilterPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || p.name || p.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por Turno */}
            <div>
              <label htmlFor="filter-turno-enroll" className="block text-[11px] font-bold text-muted uppercase mb-1">
                Turno
              </label>
              <select
                id="filter-turno-enroll"
                value={selectedTurnoFilter}
                onChange={(e) => {
                  setSelectedTurnoFilter(e.target.value);
                  setSelectedSectionFilter('');
                  setSelectedGroupFilter('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">Todos los turnos</option>
                {availableFilterTurnos.map((turno) => (
                  <option key={turno} value={turno}>
                    {turno}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Sección */}
            <div>
              <label htmlFor="filter-section-enroll" className="block text-[11px] font-bold text-muted uppercase mb-1">
                Sección
              </label>
              <select
                id="filter-section-enroll"
                value={selectedSectionFilter}
                onChange={(e) => {
                  setSelectedSectionFilter(e.target.value);
                  setSelectedGroupFilter('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">Todas las secciones</option>
                {availableFilterSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Sección {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Aula */}
            <div>
              <label htmlFor="filter-group" className="block text-[11px] font-bold text-muted uppercase mb-1">
                Aula / Grupo
              </label>
              <select
                id="filter-group"
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">Todas las aulas</option>
                {filteredGroupDropdownOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            {/* Filtro por Tipo / Convenio */}
            <div>
              <label htmlFor="filter-convenio-enroll" className="block text-[11px] font-bold text-muted uppercase mb-1">
                Tipo / Convenio
              </label>
              <select
                id="filter-convenio-enroll"
                value={selectedConvenioFilter}
                onChange={(e) => {
                  setSelectedConvenioFilter(e.target.value as '' | 'REGULAR' | 'CONVENIO');
                  setSelectedGroupFilter('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="">Todos</option>
                <option value="REGULAR">Regulares</option>
                <option value="CONVENIO">Solo Convenios</option>
              </select>
            </div>

            {/* Filtro por Estado */}
            <div>
              <label htmlFor="filter-state" className="block text-[11px] font-bold text-muted uppercase mb-1">
                Estado Modular
              </label>
              <select
                id="filter-state"
                value={selectedStateFilter}
                onChange={(e) => setSelectedStateFilter(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
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
              <label htmlFor="search-input-enroll" className="block text-[11px] font-bold text-muted uppercase mb-1">
                Buscar Estudiante o Ubicación
              </label>
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-input-enroll"
                  type="search"
                  placeholder="DNI, apellidos, código MAT, turno, sección o convenio…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {hasTableFilters && (
              <div className="flex justify-start lg:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProgramFilter('');
                    setSelectedTurnoFilter('');
                    setSelectedSectionFilter('');
                    setSelectedConvenioFilter('');
                    setSelectedGroupFilter('');
                    setSelectedStateFilter('');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand border border-line text-xs font-bold transition-colors cursor-pointer"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div role="region" aria-label="Listado de matrículas" tabIndex={0} className="overflow-x-auto rounded-xl border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <table className="record-table w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">Matrículas, estudiantes, aulas, turno, sección y estado modular</caption>
            <thead className="bg-surface-alt">
              <tr className="border-b border-line text-xs font-semibold text-muted">
                <th scope="col" className="py-3 px-4">Estudiante</th>
                <th scope="col" className="py-3 px-4">Carrera · Turno · Sección</th>
                <th scope="col" className="py-3 px-4">Estado Modular</th>
                {canManage && <th scope="col" className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-muted">
                    <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-2" />
                    Cargando padrón de matrículas…
                  </td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-muted">
                    <p className="font-bold text-ink text-sm">No se encontraron matrículas</p>
                    <span className="text-xs text-muted mt-1 block">
                      No existen registros que coincidan con los filtros seleccionados.
                    </span>
                    {hasTableFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedProgramFilter('');
                          setSelectedTurnoFilter('');
                          setSelectedSectionFilter('');
                          setSelectedConvenioFilter('');
                          setSelectedGroupFilter('');
                          setSelectedStateFilter('');
                        }}
                        className="mt-3 min-h-[44px] px-4 py-2 rounded-[10px] bg-surface-alt text-ink border border-line text-xs font-bold hover:bg-brand-soft transition-colors cursor-pointer"
                      >
                        Limpiar todos los filtros
                      </button>
                    ) : canManage ? (
                      <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="mt-3 min-h-[44px] px-4 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] cursor-pointer"
                      >
                        + Registrar nueva matrícula
                      </button>
                    ) : null}
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
                  const turnoLabel = normalizeTurnoLabel(group?.turno);
                  const sectionLabel = String(group?.section || '').trim().toUpperCase();

                  return (
                    <tr key={en.id} className="align-top transition-colors hover:bg-surface-alt/60">
                      {/* Estudiante y código */}
                      <td className="min-w-[240px] max-w-[360px] px-4 py-4">
                        <span className="record-name block break-words text-base font-semibold leading-snug" title={studentName}>
                          {studentName}
                        </span>
                        <div className="record-label mt-2 space-y-1 text-xs leading-relaxed tabular-nums">
                          <p>Documento <strong className="record-code break-all font-semibold">{studentDoc}</strong></p>
                          <p className="record-code break-all font-medium">{en.code || 'MAT'}</p>
                          <p>Ingreso <span className="whitespace-nowrap font-medium text-ink">{en.startDate || 'Pendiente'}</span></p>
                        </div>
                      </td>

                      {/* Carrera / Turno / Sección / Aula */}
                      <td className="min-w-[240px] max-w-[360px] px-4 py-4">
                        <span className="record-academic block break-words font-semibold leading-snug" title={group?.name || en.groupId}>
                          {group?.name || en.groupId}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
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
                        <span className="record-academic mt-1.5 block break-words text-sm leading-relaxed" title={`${prog?.nombre || prog?.name || 'Programa'} · ${mod?.nombre || mod?.name || 'Módulo'}`}>
                          {prog?.nombre || prog?.name || 'Programa'} · {mod?.nombre || mod?.name || 'Módulo'}
                        </span>
                        {group?.teacherName && (
                          <span className="record-label mt-1 block text-xs">
                            Docente: {group.teacherName}
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="min-w-[140px] px-4 py-4">
                        {renderStateBadge(state)}
                        {en.moduleCorrection?.reason && (
                          <span className="record-label mt-2 block max-w-[260px] break-words text-xs leading-relaxed">
                            Motivo: "{en.moduleCorrection.reason}"
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      {canManage && (
                        <td className="min-w-[170px] px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {en.active ? (
                              <>
                                {en.provisional && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModuleModal(en, 'CONFIRM')}
                                    className="min-h-[44px] px-2.5 py-1 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenModuleModal(en, 'EXCLUDE')}
                                  className="min-h-[44px] px-2.5 py-1 rounded-[10px] bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer"
                                >
                                  Quitar de módulo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRetireModal(en)}
                                  className="min-h-[44px] px-2.5 py-1 rounded-[10px] bg-surface-alt hover:bg-rose-50 dark:hover:bg-rose-950/40 text-ink hover:text-rose-700 dark:hover:text-rose-300 font-bold text-xs transition-colors border border-line cursor-pointer"
                                >
                                  Retirar / Trasladar
                                </button>
                              </>
                            ) : en.moduleState === 'EXCLUDED' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenModuleModal(en, 'RESTORE')}
                                className="min-h-[44px] px-3 py-1 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-modal-title"
        >
          <div
            ref={modulePanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line"
          >
            <h3 id="module-modal-title" className="text-base font-bold text-ink">
              {moduleModal.action === 'CONFIRM'
                ? 'Confirmar Pertenencia al Módulo'
                : moduleModal.action === 'EXCLUDE'
                ? 'Quitar de este Módulo Formativo'
                : 'Restaurar Matrícula en el Módulo'}
            </h3>

            <p className="text-xs text-muted">
              Estudiante: <strong className="text-ink">{getStudentName(moduleModal.enrollment.studentId)}</strong>
              <br />
              Aula: <strong className="text-ink">{groups.find((g) => g.id === moduleModal.enrollment?.groupId)?.name}</strong>
            </p>

            <div className="p-3 rounded-xl bg-surface-alt border border-line text-xs text-ink">
              {moduleModal.action === 'EXCLUDE'
                ? 'El estudiante será desvinculado exclusivamente de este módulo. Se preservan sus notas previas, asistencias y fichas en otros módulos.'
                : moduleModal.action === 'CONFIRM'
                ? 'La matrícula provisional pasará a estado oficial confirmado en este módulo curricular.'
                : 'Se restaurará la vigencia de la matrícula en este módulo curricular.'}
            </div>

            <div>
              <label htmlFor="module-reason" className="block text-xs font-bold text-ink mb-1.5">
                Motivo de la Corrección Modular <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <textarea
                id="module-reason"
                required
                rows={3}
                placeholder="Indique la justificación técnica o resolución de dirección/secretaría…"
                value={moduleModal.reason}
                onChange={(e) => setModuleModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setModuleModal({ isOpen: false, enrollment: null, action: 'CONFIRM', reason: '' })}
                disabled={isSubmittingModuleAction}
                className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmModuleAction}
                disabled={isSubmittingModuleAction || !moduleModal.reason.trim()}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingModuleAction ? 'Guardando…' : 'Confirmar Operación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal de Retiro / Traslado de Matrícula */}
      {retireModal.isOpen && retireModal.enrollment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retire-modal-title"
        >
          <div
            ref={retirePanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line"
          >
            <h3 id="retire-modal-title" className="text-base font-bold text-ink">
              Retiro Formal o Traslado de Matrícula
            </h3>

            <p className="text-xs text-muted">
              Estudiante: <strong className="text-ink">{getStudentName(retireModal.enrollment.studentId)}</strong>
              <br />
              Aula actual: <strong className="text-ink">{groups.find((g) => g.id === retireModal.enrollment?.groupId)?.name}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label htmlFor="retire-date" className="block text-xs font-bold text-ink mb-1">
                  Fecha de Retiro / Traslado <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="retire-date"
                  type="date"
                  required
                  value={retireModal.date}
                  onChange={(e) => setRetireModal((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label htmlFor="retire-target-group" className="block text-xs font-bold text-ink mb-1">
                  Trasladar a otro Grupo (Opcional)
                </label>
                <select
                  id="retire-target-group"
                  value={retireModal.targetGroupId}
                  onChange={(e) => setRetireModal((prev) => ({ ...prev, targetGroupId: e.target.value }))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
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
                <span className="text-[11px] text-muted block mt-1">
                  Si selecciona un aula destino, se creará la nueva matrícula en una sola transacción.
                </span>
              </div>

              <div>
                <label htmlFor="retire-reason" className="block text-xs font-bold text-ink mb-1">
                  Motivo Administrativo <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <textarea
                  id="retire-reason"
                  required
                  rows={2}
                  placeholder="Ej.: Retiro voluntario, cambio de turno, traslado de sección…"
                  value={retireModal.reason}
                  onChange={(e) => setRetireModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setRetireModal({ isOpen: false, enrollment: null, reason: '', date: '', targetGroupId: '' })}
                disabled={isSubmittingRetire}
                className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRetire}
                disabled={isSubmittingRetire || !retireModal.reason.trim() || !retireModal.date}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRetire ? 'Procesando…' : 'Confirmar Retiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Pie de Página */}
      <footer className="text-center py-4 text-xs text-muted border-t border-line">
        CEPRO_MICAELA 2.0 · Módulo de Matrículas e Historial Modular Fuera de Línea
      </footer>
    </div>
  );
};

export default GestionMatriculas;
