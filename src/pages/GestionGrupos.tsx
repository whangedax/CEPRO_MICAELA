/**
 * src/pages/GestionGrupos.tsx
 * 
 * Módulo de Gestión de Grupos y Aulas — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real al backend SQLite local mediante:
 * - GET /api/dashboard (Consulta de aulas, programas, módulos y matrículas).
 * - POST /api/groups (Creación y actualización de grupos por el DIRECTOR).
 * - POST /api/closure (Cierre y reapertura formal de aulas con motivo auditado por el DIRECTOR).
 * - Consulta de nóminas de estudiantes y asignaciones docentes por aula.
 * - Modo consulta de solo lectura para SECRETARIA y DOCENTE.
 * - Protección de modificaciones con PendingChangesContext.
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA).
 */

import { CareerPhoto } from '../components/academic/CareerVisualBanner';
import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import {
  DashboardGroup,
  PublicUser,
  StudentEnrollmentItem,
  StudentItem,
  SaveGroupPayload,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import { ActiveUnitContextBanner } from '../components/academic/ActiveUnitContextBanner';
import {
  GroupsIcon,
  SearchIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowForwardIcon,
  StudentsIcon,
} from '../components/ui/Icons';

interface GestionGruposProps {
  onNavigate?: (route: NavRoute) => void;
}

const TURNOS_OFICIALES = ['Mañana', 'Tarde', 'Noche'] as const;
const SECCIONES_SUCESIVAS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const SECCIONES_RAPIDAS = SECCIONES_SUCESIVAS.slice(0, 8);

const normalizeTurnoLabel = (value?: string): string => {
  const raw = String(value || '').trim();
  if (/^ma[nñ]ana$/i.test(raw)) return 'Mañana';
  if (/^tarde$/i.test(raw)) return 'Tarde';
  if (/^noche$/i.test(raw)) return 'Noche';
  return raw;
};

export const GestionGrupos: React.FC<GestionGruposProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeWorkspace, options, loadOptions, selectGroupAndUnit, clearWorkspace } = useWorkspace();

  const handleSelectUnitFromCard = async (g: DashboardGroup, unitCode: string) => {
    try {
      const optGroup = options?.groups.find((og) => og.id === g.id) || {
        id: g.id,
        name: g.name,
        section: g.section || 'A1',
        studentCount: enrollments.filter((e) => e.groupId === g.id && e.active).length,
        programId: g.programId,
        moduleId: g.moduleId,
        periodId: g.periodId || '2026-I',
        year: (g.periodId || '2026').slice(0, 4),
        turno: g.turno || 'Mañana',
        modalidad: String((g as unknown as { modalidad?: string }).modalidad || 'Presencial'),
        units: (g.units || []).map((code) => ({ code, name: code })),
      };
      await selectGroupAndUnit(
        optGroup,
        unitCode === 'EFSRT' ? 'PRACTICE' : 'UNIT',
        unitCode
      );
      setSuccessMsg(`Unidad activa seleccionada: ${g.name} · Unidad ${unitCode}. Ya puede gestionar matrículas, asistencia, notas o formatos PDF de esta unidad.`);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'No se pudo seleccionar la unidad didáctica.');
    }
  };
  const { registerPendingChanges, unregisterPendingChanges } = usePendingChanges();

  const isDirector = user?.role === 'DIRECTOR';
  const isTeacher = user?.role === 'DOCENTE';

  // Estados de datos
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name?: string; nombre?: string }>>([]);
  const [modules, setModules] = useState<Array<{ id: string; name?: string; nombre?: string; programaId?: string }>>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollmentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ABIERTOS' | 'CERRADOS'>('TODOS');
  const [convenioFilter, setConvenioFilter] = useState<'TODOS' | 'REGULARES' | 'CONVENIOS'>('TODOS');

  // Formulario Nuevo Grupo (DIRECTOR)
  const initialNewGroupState = {
    name: '',
    programId: '',
    moduleId: '',
    periodId: '2026-I',
    section: 'A',
    turno: 'Mañana',
    isConvenio: false,
    convenioName: '',
    units: 'UD1, UD2, UD3',
  };
  const [newGroupForm, setNewGroupForm] = useState(initialNewGroupState);
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [isNewGroupDirty, setIsNewGroupDirty] = useState<boolean>(false);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState<boolean>(false);
  const lastSuggestionContextRef = useRef<string>('');

  // Modal / Edición de Grupo Existente (DIRECTOR)
  const [editingGroup, setEditingGroup] = useState<DashboardGroup | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({
    name: '',
    programId: '',
    moduleId: '',
    periodId: '',
    section: '',
    turno: '',
    isConvenio: false,
    convenioName: '',
    units: '',
  });
  const [isUpdatingGroup, setIsUpdatingGroup] = useState<boolean>(false);

  // Modal de Cierre / Reapertura de Grupo (DIRECTOR)
  const [closureModal, setClosureModal] = useState<{
    isOpen: boolean;
    group: DashboardGroup | null;
    reason: string;
  }>({
    isOpen: false,
    group: null,
    reason: '',
  });
  const [isSubmittingClosure, setIsSubmittingClosure] = useState<boolean>(false);

  // Modal para ver nómina de estudiantes del grupo
  const [rosterModalGroup, setRosterModalGroup] = useState<DashboardGroup | null>(null);

  // Modal de asignación / reasignación directa de docente titular al aula
  const [teacherModal, setTeacherModal] = useState<{
    isOpen: boolean;
    group: DashboardGroup | null;
    teacherId: string;
    units: string[];
    unassign: boolean;
  }>({
    isOpen: false,
    group: null,
    teacherId: '',
    units: [],
    unassign: false,
  });
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState<boolean>(false);

  // Modal de eliminación segura de grupo vacío
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    group: DashboardGroup | null;
    reason: string;
  }>({
    isOpen: false,
    group: null,
    reason: '',
  });
  const [isDeletingGroup, setIsDeletingGroup] = useState<boolean>(false);

  const editGroupPanelRef = useRef<HTMLDivElement | null>(null);
  const closurePanelRef = useRef<HTMLDivElement | null>(null);
  const rosterPanelRef = useRef<HTMLDivElement | null>(null);
  const teacherPanelRef = useRef<HTMLDivElement | null>(null);
  const deletePanelRef = useRef<HTMLDivElement | null>(null);
  const previousModalFocusRef = useRef<HTMLElement | null>(null);
  const modalBusyRef = useRef({
    isUpdatingGroup,
    isSubmittingClosure,
    isSubmittingTeacher,
    isDeletingGroup,
  });
  modalBusyRef.current = {
    isUpdatingGroup,
    isSubmittingClosure,
    isSubmittingTeacher,
    isDeletingGroup,
  };

  // Trampa de foco, Escape y retorno de foco para modales de grupos
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      editingGroup ||
        (closureModal.isOpen && closureModal.group) ||
        rosterModalGroup ||
        (teacherModal.isOpen && teacherModal.group) ||
        (deleteModal.isOpen && deleteModal.group)
    );
    if (!isAnyModalOpen) return;

    previousModalFocusRef.current = document.activeElement as HTMLElement | null;

    const getActivePanel = () => {
      if (editingGroup) return editGroupPanelRef.current;
      if (closureModal.isOpen && closureModal.group) return closurePanelRef.current;
      if (teacherModal.isOpen && teacherModal.group) return teacherPanelRef.current;
      if (deleteModal.isOpen && deleteModal.group) return deletePanelRef.current;
      if (rosterModalGroup) return rosterPanelRef.current;
      return null;
    };

    const focusFirst = () => {
      const panel = getActivePanel();
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
      const panel = getActivePanel();
      if (e.key === 'Escape') {
        const busy = modalBusyRef.current;
        if (editingGroup && !busy.isUpdatingGroup) {
          e.preventDefault();
          setEditingGroup(null);
        } else if (closureModal.isOpen && !busy.isSubmittingClosure) {
          e.preventDefault();
          setClosureModal({ isOpen: false, group: null, reason: '' });
          setErrorMsg(null);
        } else if (teacherModal.isOpen && !busy.isSubmittingTeacher) {
          e.preventDefault();
          setTeacherModal({ isOpen: false, group: null, teacherId: '', units: [], unassign: false });
        } else if (deleteModal.isOpen && !busy.isDeletingGroup) {
          e.preventDefault();
          setDeleteModal({ isOpen: false, group: null, reason: '' });
          setErrorMsg(null);
        } else if (rosterModalGroup) {
          e.preventDefault();
          setRosterModalGroup(null);
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

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousModalFocusRef.current && typeof previousModalFocusRef.current.focus === 'function') {
        previousModalFocusRef.current.focus();
      }
    };
  }, [
    editingGroup,
    closureModal.isOpen,
    closureModal.group,
    rosterModalGroup,
    teacherModal.isOpen,
    teacherModal.group,
    deleteModal.isOpen,
    deleteModal.group,
  ]);

  // Carga de datos
  const loadData = useCallback(async (isManual = false, silent = false): Promise<DashboardGroup[] | null> => {
    if (!silent) {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMsg(null);
    }

    try {
      const [res, usersList] = await Promise.all([
        apiClient.getDashboard(undefined, !isTeacher),
        !isTeacher ? apiClient.getUsers(false).catch(() => [] as PublicUser[]) : Promise.resolve([] as PublicUser[]),
      ]);
      const fetchedGroups = res.groups || [];
      setGroups(fetchedGroups);
      setPrograms(res.programs || []);
      setModules((res.modules || []) as unknown as Array<{ id: string; name?: string; nombre?: string; programaId?: string }>);
      setEnrollments(res.enrollments || []);
      setStudents(res.students || []);
      setUsers(usersList);

      // Preseleccionar primer programa en nuevo grupo si aún no está seleccionado
      if (res.programs?.length) {
        const firstProgId = res.programs[0].id;
        const matchingModule = (res.modules as unknown as Array<{ id: string; programaId?: string }>)?.find(
          (m) => m.programaId === firstProgId
        );
        const modPlan = options?.modules.find(
          (m) => m.id === (matchingModule?.id || '') && m.programId === firstProgId
        );
        setNewGroupForm((prev) =>
          prev.programId
            ? prev
            : {
                ...prev,
                programId: firstProgId,
                moduleId: matchingModule?.id || '',
                periodId: modPlan?.periodId || prev.periodId,
                units: modPlan?.plannedUnits?.length
                  ? modPlan.plannedUnits.map((u) => u.code).join(', ')
                  : prev.units,
              }
        );
      }
      return fetchedGroups;
    } catch (err: unknown) {
      if (!silent) {
        const apiErr = err as ApiError;
        setErrorMsg(apiErr?.error || 'Error al conectar con la base de datos de aulas.');
      }
      return null;
    } finally {
      if (!silent) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Protección de cambios pendientes
  useEffect(() => {
    if (isNewGroupDirty) {
      registerPendingChanges({
        id: 'new-group-form',
        hasChanges: true,
        message: 'Tiene datos de creación de aula sin guardar. ¿Desea descartar los cambios?',
        onDiscard: () => {
          setNewGroupForm(initialNewGroupState);
          setIsNewGroupDirty(false);
          setIsNameManuallyEdited(false);
        },
      });
    } else {
      unregisterPendingChanges('new-group-form');
    }

    return () => {
      unregisterPendingChanges('new-group-form');
    };
  }, [isNewGroupDirty, registerPendingChanges, unregisterPendingChanges]);

  const handleNewGroupPlanChange = (programId: string, moduleId: string) => {
    const plan = options?.modules.find(module => module.id === moduleId && module.programId === programId);
    setNewGroupForm(prev => ({
      ...prev,
      programId,
      moduleId,
      periodId: plan?.periodId || prev.periodId,
      units: plan?.plannedUnits?.length ? plan.plannedUnits.map(unit => unit.code).join(', ') : prev.units,
    }));
    setIsNewGroupDirty(true);
  };

  // Secciones ocupadas y siguiente letra sucesiva (A, B, C, D...) por carrera/módulo/periodo/turno/convenio
  const shiftSectionCounts = useMemo(() => {
    const countsByShift: Record<string, string[]> = {
      Mañana: [],
      Tarde: [],
      Noche: [],
    };
    const targetConvenioKey = newGroupForm.isConvenio
      ? newGroupForm.convenioName.trim().toUpperCase()
      : '';
    for (const g of groups) {
      if (g.programId !== newGroupForm.programId) continue;
      if (newGroupForm.moduleId && g.moduleId !== newGroupForm.moduleId) continue;
      if (newGroupForm.periodId.trim() && g.periodId !== newGroupForm.periodId.trim()) continue;
      const gConvenioKey = g.isConvenio || g.convenioName
        ? String(g.convenioName || '').trim().toUpperCase()
        : '';
      if (gConvenioKey !== targetConvenioKey) continue;
      const gTurno = normalizeTurnoLabel(g.turno);
      const sec = String(g.section || '').trim().toUpperCase();
      if (sec && countsByShift[gTurno] && !countsByShift[gTurno].includes(sec)) {
        countsByShift[gTurno].push(sec);
      }
    }
    for (const key of Object.keys(countsByShift)) {
      countsByShift[key].sort();
    }
    return countsByShift;
  }, [groups, newGroupForm.programId, newGroupForm.moduleId, newGroupForm.periodId, newGroupForm.isConvenio, newGroupForm.convenioName]);

  const usedSectionsInCurrentShift = useMemo(() => {
    const currentShift = normalizeTurnoLabel(newGroupForm.turno) || 'Mañana';
    return new Set(shiftSectionCounts[currentShift] || []);
  }, [shiftSectionCounts, newGroupForm.turno]);

  const nextSuggestedSection = useMemo(() => {
    return SECCIONES_SUCESIVAS.find((sec) => !usedSectionsInCurrentShift.has(sec)) || 'A';
  }, [usedSectionsInCurrentShift]);

  // Sincronizar periodo y unidades desde options.modules si aún no hubo edición manual
  useEffect(() => {
    if (isNewGroupDirty || !newGroupForm.programId || !newGroupForm.moduleId) return;
    const plan = options?.modules.find(
      (m) => m.id === newGroupForm.moduleId && m.programId === newGroupForm.programId
    );
    if (!plan) return;
    const planPeriod = plan.periodId || '';
    const planUnits = plan.plannedUnits?.length
      ? plan.plannedUnits.map((u) => u.code).join(', ')
      : '';
    setNewGroupForm((prev) => {
      if (
        (!planPeriod || prev.periodId === planPeriod) &&
        (!planUnits || prev.units === planUnits)
      ) {
        return prev;
      }
      return {
        ...prev,
        periodId: planPeriod || prev.periodId,
        units: planUnits || prev.units,
      };
    });
  }, [options?.modules, newGroupForm.programId, newGroupForm.moduleId, isNewGroupDirty]);

  // Sugerir automáticamente la siguiente sección sucesiva al cambiar contexto o lista de grupos
  useEffect(() => {
    const shift = normalizeTurnoLabel(newGroupForm.turno) || 'Mañana';
    const ctxKey = `${newGroupForm.programId}|${newGroupForm.moduleId}|${newGroupForm.periodId.trim()}|${shift}|${nextSuggestedSection}`;
    if (lastSuggestionContextRef.current !== ctxKey) {
      lastSuggestionContextRef.current = ctxKey;
      setNewGroupForm((prev) =>
        prev.section === nextSuggestedSection ? prev : { ...prev, section: nextSuggestedSection }
      );
    }
  }, [
    newGroupForm.programId,
    newGroupForm.moduleId,
    newGroupForm.periodId,
    newGroupForm.turno,
    nextSuggestedSection,
  ]);

  // Auto-generar nombre descriptivo uniforme mientras el usuario no lo personalice manualmente
  useEffect(() => {
    if (isNameManuallyEdited || !newGroupForm.programId) return;
    const prog = programs.find((pr) => pr.id === newGroupForm.programId);
    const progLabel = prog?.nombre || prog?.name || '';
    if (!progLabel) return;
    const shift = normalizeTurnoLabel(newGroupForm.turno) || 'Mañana';
    const sec = (newGroupForm.section || nextSuggestedSection || 'A').trim().toUpperCase();
    const convenioClean = newGroupForm.isConvenio ? newGroupForm.convenioName.trim() : '';
    const convenioPart = convenioClean ? ` · ${convenioClean}` : '';
    const autoName = `${progLabel}${convenioPart} · Turno ${shift} · Sección ${sec}`;
    setNewGroupForm((prev) => (prev.name === autoName ? prev : { ...prev, name: autoName }));
  }, [
    isNameManuallyEdited,
    programs,
    newGroupForm.programId,
    newGroupForm.turno,
    newGroupForm.section,
    newGroupForm.isConvenio,
    newGroupForm.convenioName,
    nextSuggestedSection,
  ]);

  // Crear nuevo grupo (DIRECTOR)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.programId || !newGroupForm.moduleId || !newGroupForm.periodId.trim()) {
      setErrorMsg('Carrera, módulo y periodo son campos obligatorios.');
      return;
    }

    const convenioClean = newGroupForm.isConvenio ? newGroupForm.convenioName.trim() : '';
    if (newGroupForm.isConvenio && !convenioClean) {
      setErrorMsg('Indique el nombre del convenio institucional (ej.: Convenio Lampa).');
      return;
    }

    const unitsArray = newGroupForm.units
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    if (!unitsArray.length) {
      setErrorMsg('Debe indicar al menos una unidad didáctica para el aula (ej.: UD1, UD2).');
      return;
    }

    const normalizedTurno = normalizeTurnoLabel(newGroupForm.turno) || 'Mañana';
    const normalizedSection = (newGroupForm.section || nextSuggestedSection || 'A').trim().toUpperCase();
    const progName =
      programs.find((pr) => pr.id === newGroupForm.programId)?.nombre ||
      programs.find((pr) => pr.id === newGroupForm.programId)?.name ||
      newGroupForm.programId;
    const convenioPart = convenioClean ? ` · ${convenioClean}` : '';
    const finalName =
      newGroupForm.name.trim() || `${progName}${convenioPart} · Turno ${normalizedTurno} · Sección ${normalizedSection}`;

    setIsCreatingGroup(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: SaveGroupPayload = {
        name: finalName,
        programId: newGroupForm.programId,
        moduleId: newGroupForm.moduleId,
        periodId: newGroupForm.periodId.trim(),
        section: normalizedSection,
        turno: normalizedTurno,
        isConvenio: newGroupForm.isConvenio,
        convenioName: convenioClean,
        units: unitsArray,
      };

      const created = await apiClient.saveGroup(payload);
      setIsNewGroupDirty(false);
      setIsNameManuallyEdited(false);
      setNewGroupForm((prev) => ({ ...prev, name: '', isConvenio: false, convenioName: '' }));
      unregisterPendingChanges('new-group-form');

      setSuccessMsg(
        `Aula "${created.name}" (${created.turno || normalizedTurno} · Sección ${created.section || normalizedSection}${convenioClean ? ` · ${convenioClean}` : ''}) creada exitosamente en el periodo ${created.periodId}.`
      );
      await Promise.all([loadData(), loadOptions()]);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al crear el nuevo grupo en SQLite.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Abrir modal de edición
  const handleOpenEditGroup = (g: DashboardGroup) => {
    setEditingGroup(g);
    setEditGroupForm({
      name: g.rawName || g.name || '',
      programId: g.programId || '',
      moduleId: g.moduleId || '',
      periodId: g.periodId || '',
      section: String(g.section || 'A').trim().toUpperCase(),
      turno: normalizeTurnoLabel(g.turno) || 'Mañana',
      isConvenio: Boolean(g.isConvenio || g.convenioName),
      convenioName: String(g.convenioName || ''),
      units: (g.units || []).join(', '),
    });
    setErrorMsg(null);
  };

  // Guardar edición de grupo (DIRECTOR)
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    const convenioClean = editGroupForm.isConvenio ? editGroupForm.convenioName.trim() : '';
    if (editGroupForm.isConvenio && !convenioClean) {
      setErrorMsg('Indique el nombre del convenio institucional.');
      return;
    }

    const unitsArray = editGroupForm.units
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    if (!unitsArray.length) {
      setErrorMsg('El grupo debe tener al menos una unidad didáctica.');
      return;
    }

    setIsUpdatingGroup(true);
    setErrorMsg(null);

    try {
      const payload: SaveGroupPayload = {
        id: editingGroup.id,
        rev: editingGroup.rev || null,
        name: editGroupForm.name.trim(),
        programId: editGroupForm.programId || editingGroup.programId,
        moduleId: editGroupForm.moduleId || editingGroup.moduleId,
        periodId: editGroupForm.periodId.trim(),
        section: editGroupForm.section.trim().toUpperCase() || 'ÚNICA',
        turno: editGroupForm.turno.trim(),
        isConvenio: editGroupForm.isConvenio,
        convenioName: convenioClean,
        units: unitsArray,
      };

      const updated = await apiClient.saveGroup(payload);
      setSuccessMsg(`Configuración del aula "${updated.name}" actualizada con éxito.`);
      setEditingGroup(null);
      await Promise.all([loadData(), loadOptions()]);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        setErrorMsg('El grupo cambió en otra ventana o ya existe un aula con esa sección y turno.');
      } else {
        setErrorMsg(apiErr?.error || 'Error al actualizar la configuración del aula.');
      }
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Abrir modal de cierre / reapertura
  const handleOpenClosureModal = (g: DashboardGroup) => {
    setClosureModal({
      isOpen: true,
      group: g,
      reason: '',
    });
    setErrorMsg(null);
  };

  const syncModalGroupAfterConflict = async <T extends { isOpen: boolean; group: DashboardGroup | null; reason: string }>(
    groupId: string,
    setModal: React.Dispatch<React.SetStateAction<T>>
  ) => {
    const freshGroups = await loadData(false, true);
    const refreshed = freshGroups?.find((item) => item.id === groupId) || null;
    if (refreshed) {
      setModal((prev) => ({ ...prev, group: refreshed }));
    } else {
      setModal((prev) => ({ ...prev, isOpen: false, group: null, reason: '' }));
    }
  };

  // Confirmar cierre / reapertura
  const handleConfirmClosure = async () => {
    const { group, reason } = closureModal;
    if (!group || !reason.trim()) {
      setErrorMsg('Debe ingresar un motivo para el cierre o reapertura.');
      return;
    }

    setIsSubmittingClosure(true);
    setErrorMsg(null);

    const latestGroup = groups.find((item) => item.id === group.id) || group;

    try {
      const newClosedState = !latestGroup.closed;
      await apiClient.closureGroup({
        groupId: latestGroup.id,
        closed: newClosedState,
        reason: reason.trim(),
        rev: latestGroup.rev,
      });

      setSuccessMsg(
        newClosedState
          ? `Registro del aula "${latestGroup.name}" cerrado formalmente. Las notas y asistencias quedan congeladas.`
          : `Aula "${latestGroup.name}" reabierta formalmente para el registro académico.`
      );

      setClosureModal({ isOpen: false, group: null, reason: '' });
      await Promise.all([loadData(), loadOptions()]);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        await syncModalGroupAfterConflict(latestGroup.id, setClosureModal);
      }
      setErrorMsg(apiErr?.error || 'Error al modificar el estado de cierre del grupo.');
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  // Docentes activos y mapa de docentes asignados por grupo
  const activeTeachers = useMemo(
    () => users.filter((u) => u.role === 'DOCENTE' && u.active && !u.archived),
    [users]
  );

  const assignedTeachersByGroup = useMemo(() => {
    const map = new Map<string, PublicUser[]>();
    for (const u of activeTeachers) {
      for (const a of u.assignments || []) {
        const list = map.get(a.groupId) || [];
        list.push(u);
        map.set(a.groupId, list);
      }
    }
    return map;
  }, [activeTeachers]);

  const handleOpenTeacherModal = (g: DashboardGroup) => {
    const currentAssigned = assignedTeachersByGroup.get(g.id) || [];
    const matchingCareer = activeTeachers.filter((t) => t.careerId === g.programId);
    const defaultTeacherId = currentAssigned[0]?.id || matchingCareer[0]?.id || activeTeachers[0]?.id || '';
    const existingAssignment = currentAssigned[0]?.assignments?.find((a) => a.groupId === g.id);
    setTeacherModal({
      isOpen: true,
      group: g,
      teacherId: defaultTeacherId,
      units: existingAssignment?.units?.length ? [...existingAssignment.units] : [...(g.units || [])],
      unassign: false,
    });
    setErrorMsg(null);
  };

  const handleConfirmTeacherReassign = async () => {
    const { group, teacherId, units, unassign } = teacherModal;
    if (!group) return;
    if (!unassign && !teacherId) {
      setErrorMsg('Seleccione un docente activo para asignar al aula.');
      return;
    }
    if (!unassign && !units.length) {
      setErrorMsg('Seleccione al menos una unidad didáctica para el docente.');
      return;
    }
    setIsSubmittingTeacher(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.reassignGroupTeacher({
        groupId: group.id,
        teacherId: unassign ? undefined : teacherId,
        units: unassign ? undefined : units,
        exclusive: true,
        unassign,
      });
      setSuccessMsg(
        unassign
          ? `Se retiró la asignación docente del aula "${group.name}".`
          : `Docente titular ${res.teacher?.name || ''} asignado al aula "${group.name}".`
      );
      setTeacherModal({ isOpen: false, group: null, teacherId: '', units: [], unassign: false });
      await loadData();
      await loadOptions();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al asignar o reasignar el docente del grupo.');
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const handleOpenDeleteModal = (g: DashboardGroup, studentCount: number) => {
    if (studentCount > 0) {
      setErrorMsg(`No se puede eliminar "${g.name}": aún tiene ${studentCount} estudiante(s) matriculado(s) activo(s). Debe tener 0 estudiantes.`);
      return;
    }
    if (!g.closed) {
      setErrorMsg(`No se puede eliminar "${g.name}": primero debe cerrarlo usando "Cerrar registro".`);
      return;
    }
    setDeleteModal({
      isOpen: true,
      group: g,
      reason: 'Grupo cerrado sin estudiantes matriculados',
    });
    setErrorMsg(null);
  };

  const handleConfirmDeleteGroup = async () => {
    const { group, reason } = deleteModal;
    if (!group || !reason.trim()) {
      setErrorMsg('Ingrese el motivo de eliminación del grupo.');
      return;
    }
    const latestGroup = groups.find((item) => item.id === group.id) || group;
    if (!latestGroup.closed) {
      setErrorMsg('Solo se pueden eliminar grupos que estén cerrados.');
      return;
    }
    setIsDeletingGroup(true);
    setErrorMsg(null);
    try {
      await apiClient.deleteGroup({
        id: latestGroup.id,
        rev: latestGroup.rev,
        reason: reason.trim(),
      });
      setSuccessMsg(`Grupo "${latestGroup.name}" eliminado correctamente del registro activo.`);
      setDeleteModal({ isOpen: false, group: null, reason: '' });
      if (activeWorkspace?.groupId === latestGroup.id) {
        clearWorkspace();
      }
      await Promise.all([loadData(), loadOptions()]);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        await syncModalGroupAfterConflict(latestGroup.id, setDeleteModal);
      }
      setErrorMsg(apiErr?.error || 'No se pudo eliminar el grupo seleccionado.');
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // Resolver nombre de programa
  const getProgramName = useCallback(
    (programId: string) => {
      const p = programs.find((pr) => pr.id === programId);
      return p?.nombre || p?.name || programId;
    },
    [programs]
  );

  // Resolver nombre de módulo
  const getModuleName = useCallback(
    (moduleId: string) => {
      const m = modules.find((mod) => mod.id === moduleId);
      return m?.nombre || m?.name || moduleId;
    },
    [modules]
  );

  // Lista de grupos filtrados
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return groups.filter((g) => {
      const isGroupConvenio = Boolean(g.isConvenio || g.convenioName);
      const matchesProgram = !selectedProgramFilter || g.programId === selectedProgramFilter;
      const matchesStatus =
        statusFilter === 'TODOS' ||
        (statusFilter === 'ABIERTOS' && !g.closed) ||
        (statusFilter === 'CERRADOS' && g.closed);
      const matchesConvenio =
        convenioFilter === 'TODOS' ||
        (convenioFilter === 'CONVENIOS' && isGroupConvenio) ||
        (convenioFilter === 'REGULARES' && !isGroupConvenio);

      const nameMatch = (g.name || '').toLowerCase().includes(q);
      const periodMatch = (g.periodId || '').toLowerCase().includes(q);
      const turnoMatch = (g.turno || '').toLowerCase().includes(q);
      const sectionMatch = (g.section || '').toLowerCase().includes(q);
      const convenioMatch =
        String(g.convenioName || '').toLowerCase().includes(q) ||
        (isGroupConvenio && 'convenio'.includes(q));

      return (
        matchesProgram &&
        matchesStatus &&
        matchesConvenio &&
        (!q || nameMatch || periodMatch || turnoMatch || sectionMatch || convenioMatch)
      );
    });
  }, [groups, searchQuery, selectedProgramFilter, statusFilter, convenioFilter]);

  // Contadores rápidos
  const counts = useMemo(() => {
    const total = groups.length;
    const open = groups.filter((g) => !g.closed).length;
    const closed = groups.filter((g) => g.closed).length;
    const totalEnrollments = enrollments.filter((e) => e.active).length;
    return { total, open, closed, totalEnrollments };
  }, [groups, enrollments]);

  // Estudiantes del grupo seleccionado en modal
  const rosterStudents = useMemo(() => {
    if (!rosterModalGroup) return [];
    const groupEnrollments = enrollments.filter((e) => e.groupId === rosterModalGroup.id && e.active);
    return groupEnrollments
      .map((en) => {
        const student = students.find((s) => s.id === en.studentId);
        return {
          enrollment: en,
          student,
        };
      })
      .sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || '', 'es'));
  }, [rosterModalGroup, enrollments, students]);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Encabezado Institucional */}
      <DashboardPhotoBand as="header" scene="docente" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-3xl min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-brand uppercase tracking-widest bg-brand-soft px-2.5 py-1 rounded-md">
              Ámbito Institucional · Organización Curricular
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-ink font-bold tracking-tight leading-tight">
            {isTeacher ? 'Mis Grupos y Aulas' : 'Organización de Grupos y Aulas'}
          </h1>
          <p className="text-[14px] text-muted font-normal leading-relaxed">
            {isTeacher
              ? 'Consulta de aulas, turnos y unidades didácticas asignadas a su carga lectiva.'
              : 'Configuración de carreras, módulos formativos, turnos, periodos lectivos y estados de cierre de registros.'}
          </p>
        </div>

        {/* Botón de Actualización */}
        <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar listado de aulas"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Total Grupos
            </span>
            <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
              {counts.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
            <GroupsIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Aulas Abiertas
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1 block">
              {counts.open}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Aulas Cerradas
            </span>
            <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums mt-1 block">
              {counts.closed}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-[var(--ui-shadow)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Matrículas Activas
            </span>
            <span className="text-2xl font-extrabold text-ink tabular-nums mt-1 block">
              {counts.totalEnrollments}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Formulario de Creación de Grupo (DIRECTOR únicamente) */}
      {isDirector && (
        <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] p-6 lg:p-8 space-y-6">
          <div className="pb-4 border-b border-line">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Dirección General · Planificación Lectiva
            </span>
            <h2 className="text-lg font-bold text-ink mt-0.5">
              Crear Nueva Aula / Grupo Académico
            </h2>
            <p className="text-xs text-muted mt-1">
              Configure la carrera técnica, módulo curricular, periodo lectivo, sección, turno y unidades didácticas normadas.
            </p>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Nombre descriptivo */}
              <div className="md:col-span-2">
                <label htmlFor="new-group-name" className="block text-xs font-bold text-ink mb-1.5">
                  Nombre Descriptivo del Grupo <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="new-group-name"
                  type="text"
                  required
                  placeholder="Se genera automáticamente o ingrese un nombre personalizado"
                  value={newGroupForm.name}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setNewGroupForm((prev) => ({ ...prev, name: nextVal }));
                    setIsNameManuallyEdited(nextVal.trim().length > 0);
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Periodo Lectivo */}
              <div>
                <label htmlFor="new-group-period" className="block text-xs font-bold text-ink mb-1.5">
                  Periodo Lectivo <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="new-group-period"
                  type="text"
                  required
                  placeholder="Ej.: 2026-I, 2026-II"
                  value={newGroupForm.periodId}
                  onChange={(e) => {
                    setNewGroupForm((prev) => ({ ...prev, periodId: e.target.value }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {/* Carrera / Programa */}
              <div>
                <label htmlFor="new-group-program" className="block text-xs font-bold text-ink mb-1.5">
                  Programa de Estudio <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  id="new-group-program"
                  required
                  value={newGroupForm.programId}
                  onChange={(e) => {
                    const programId = e.target.value;
                    handleNewGroupPlanChange(programId, modules.find(module => module.programaId === programId)?.id || '');
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Seleccionar programa…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Módulo correspondiente */}
              <div>
                <label htmlFor="new-group-module" className="block text-xs font-bold text-ink mb-1.5">
                  Módulo Formativo <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  id="new-group-module"
                  required
                  value={newGroupForm.moduleId}
                  onChange={(e) => handleNewGroupPlanChange(newGroupForm.programId, e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Seleccionar módulo…</option>
                  {modules
                    .filter((m) => !newGroupForm.programId || m.programaId === newGroupForm.programId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre || m.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Turno */}
              <div>
                <label htmlFor="new-group-turno" className="block text-xs font-bold text-ink mb-1.5">
                  Turno Lectivo <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  id="new-group-turno"
                  required
                  value={normalizeTurnoLabel(newGroupForm.turno) || 'Mañana'}
                  onChange={(e) => {
                    const nextTurno = e.target.value;
                    setNewGroupForm((prev) => ({ ...prev, turno: nextTurno }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {TURNOS_OFICIALES.map((t) => (
                    <option key={t} value={t}>
                      Turno {t} ({(shiftSectionCounts[t] || []).length} secc.)
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label="Turnos oficiales">
                  {TURNOS_OFICIALES.map((t) => {
                    const active = (normalizeTurnoLabel(newGroupForm.turno) || 'Mañana') === t;
                    const count = (shiftSectionCounts[t] || []).length;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setNewGroupForm((prev) => ({ ...prev, turno: t }));
                          setIsNewGroupDirty(true);
                        }}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer tabular-nums ${
                          active
                            ? 'bg-brand text-on-brand border-brand'
                            : 'bg-surface-alt text-ink border-line hover:border-brand hover:text-brand'
                        }`}
                      >
                        {t} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección sucesiva A, B, C, D... */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="new-group-section" className="block text-xs font-bold text-ink">
                    Sección Sucesiva <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-brand">
                    Siguiente: {nextSuggestedSection}
                  </span>
                </div>
                <select
                  id="new-group-section"
                  required
                  value={newGroupForm.section || nextSuggestedSection}
                  onChange={(e) => {
                    const nextSec = e.target.value;
                    setNewGroupForm((prev) => ({ ...prev, section: nextSec }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {SECCIONES_SUCESIVAS.map((sec) => {
                    const isUsed = usedSectionsInCurrentShift.has(sec);
                    const isNext = sec === nextSuggestedSection;
                    return (
                      <option key={sec} value={sec}>
                        Sección {sec}
                        {isUsed
                          ? ' (Ya creada en este turno)'
                          : isNext
                          ? ' (Siguiente sugerida)'
                          : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label="Secciones sucesivas rápidas">
                  {SECCIONES_RAPIDAS.map((sec) => {
                    const active = (newGroupForm.section || nextSuggestedSection) === sec;
                    const isUsed = usedSectionsInCurrentShift.has(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setNewGroupForm((prev) => ({ ...prev, section: sec }));
                          setIsNewGroupDirty(true);
                        }}
                        title={
                          isUsed
                            ? `Sección ${sec} ya creada en este turno`
                            : `Seleccionar Sección ${sec}`
                        }
                        className={`min-h-[36px] min-w-[36px] px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-brand text-on-brand border-brand'
                            : isUsed
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-surface-alt text-ink border-line hover:border-brand hover:text-brand'
                        }`}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
                {usedSectionsInCurrentShift.has(newGroupForm.section || nextSuggestedSection) ? (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block mt-1">
                    La sección {newGroupForm.section} ya existe en este turno; elija la siguiente ({nextSuggestedSection}).
                  </span>
                ) : (
                  <span className="text-[11px] text-muted block mt-1">
                    Creadas en {normalizeTurnoLabel(newGroupForm.turno) || 'Mañana'}:{' '}
                    {usedSectionsInCurrentShift.size > 0
                      ? Array.from(usedSectionsInCurrentShift).join(', ')
                      : 'Ninguna (empieza en A)'}
                  </span>
                )}
              </div>

              {/* Grupo por Convenio Institucional */}
              <div className="md:col-span-3 rounded-xl border border-line bg-surface-alt/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="new-group-is-convenio" className="inline-flex items-center gap-2.5 cursor-pointer min-h-[36px]">
                    <input
                      id="new-group-is-convenio"
                      type="checkbox"
                      checked={newGroupForm.isConvenio}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNewGroupForm((prev) => ({
                          ...prev,
                          isConvenio: checked,
                          convenioName: checked ? prev.convenioName : '',
                        }));
                        setIsNewGroupDirty(true);
                      }}
                      className="w-4 h-4 rounded border-line text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                    <span className="text-xs font-bold text-ink">
                      Grupo por Convenio Institucional
                    </span>
                  </label>
                  <span className="text-[11px] text-muted">
                    Marque esta opción cuando el aula pertenezca a un convenio (ej.: Convenio Lampa, Municipalidad, etc.).
                  </span>
                </div>

                {newGroupForm.isConvenio && (
                  <div>
                    <label htmlFor="new-group-convenio-name" className="block text-xs font-bold text-ink mb-1.5">
                      Nombre del Convenio <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <input
                      id="new-group-convenio-name"
                      type="text"
                      required
                      placeholder="Ej.: Convenio Lampa"
                      value={newGroupForm.convenioName}
                      onChange={(e) => {
                        setNewGroupForm((prev) => ({ ...prev, convenioName: e.target.value }));
                        setIsNewGroupDirty(true);
                      }}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                )}
              </div>

              {/* Unidades Didácticas */}
              <div className="md:col-span-2">
                <label htmlFor="new-group-units" className="block text-xs font-bold text-ink mb-1.5">
                  Unidades Didácticas (Separadas por coma) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="new-group-units"
                  type="text"
                  required
                  placeholder="Ej.: UD1, UD2, UD3, EFSRT"
                  value={newGroupForm.units}
                  onChange={(e) => {
                    setNewGroupForm((prev) => ({ ...prev, units: e.target.value }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <span className="text-[11px] text-muted block mt-1">
                  Ingrese los códigos de las unidades normadas para el módulo (ej. UD1, UD2, UD3, UD4, EFSRT).
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-line">
              <div className="text-xs text-muted">
                {isNewGroupDirty && <span className="text-amber-700 dark:text-amber-400 font-semibold">● Datos del nuevo grupo sin guardar</span>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNameManuallyEdited(false);
                    setNewGroupForm((prev) => ({
                      ...initialNewGroupState,
                      programId: prev.programId,
                      moduleId: prev.moduleId,
                      periodId: prev.periodId,
                      units: prev.units,
                    }));
                    setIsNewGroupDirty(false);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="min-h-[44px] px-6 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingGroup ? 'Creando aula institucional…' : 'Crear Aula / Grupo'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Toolbar de Filtros y Búsqueda */}
      <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">
              Aulas y Grupos Académicos Registrados
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Supervisión de secciones lectivas, estudiantes matriculados y unidades curriculares.
            </p>
          </div>

          <span className="text-xs font-semibold text-ink bg-surface-alt border border-line px-3 py-1 rounded-full tabular-nums shrink-0 self-start md:self-auto">
            {filteredGroups.length} aulas encontradas
          </span>
        </div>

        {/* Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Filtro por Programa */}
          <div>
            <label htmlFor="filter-prog" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Programa / Carrera
            </label>
            <select
              id="filter-prog"
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Todas las carreras</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tipo / Convenio */}
          <div>
            <label htmlFor="filter-convenio-group" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Tipo / Convenio
            </label>
            <select
              id="filter-convenio-group"
              value={convenioFilter}
              onChange={(e) => setConvenioFilter(e.target.value as 'TODOS' | 'REGULARES' | 'CONVENIOS')}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="TODOS">Todos (Regulares y Convenios)</option>
              <option value="REGULARES">Solo Grupos Regulares</option>
              <option value="CONVENIOS">Solo Grupos por Convenio</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label htmlFor="filter-status-group" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Estado de Cierre
            </label>
            <select
              id="filter-status-group"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'TODOS' | 'ABIERTOS' | 'CERRADOS')}
              className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="TODOS">Todos (Abiertos y Cerrados)</option>
              <option value="ABIERTOS">Solo Aulas Abiertas</option>
              <option value="CERRADOS">Solo Aulas Cerradas</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div>
            <label htmlFor="search-group-input" className="block text-[11px] font-bold text-muted uppercase mb-1">
              Buscar Aula
            </label>
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-group-input"
                type="search"
                placeholder="Nombre, turno, periodo, sección o convenio…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        {/* 6. Grid de Tarjetas de Aulas */}
        {isLoading ? (
          <div className="py-12 text-center text-muted text-xs">
            <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            Cargando configuración de aulas y grupos…
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-muted">
            <p className="font-bold text-ink text-sm">No hay grupos registrados en esta vista</p>
            <span className="text-xs text-muted mt-1 block">
              Cree una nueva aula arriba eligiendo Turno (Mañana, Tarde o Noche) y Sección sucesiva (A, B, C, D…).
            </span>
            {(searchQuery || selectedProgramFilter || statusFilter !== 'TODOS' || convenioFilter !== 'TODOS') ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedProgramFilter('');
                  setStatusFilter('TODOS');
                  setConvenioFilter('TODOS');
                }}
                className="mt-3 min-h-[44px] px-4 py-2 rounded-[10px] bg-surface-alt text-ink border border-line text-xs font-bold hover:bg-brand-soft transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            ) : isDirector ? (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="mt-3 min-h-[44px] px-4 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] cursor-pointer"
              >
                + Crear primera aula
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-3">
            {filteredGroups.map((g) => {
              const progName = getProgramName(g.programId);
              const modName = getModuleName(g.moduleId);
              const studentCount = enrollments.filter((e) => e.groupId === g.id && e.active).length;
              const canDeleteGroup = studentCount === 0 && Boolean(g.closed);
              const deleteDisabledReason =
                studentCount > 0 && !g.closed
                  ? `Para eliminar el grupo debe tener 0 estudiantes (actualmente tiene ${studentCount}) y estar cerrado ("Cerrar registro").`
                  : studentCount > 0
                    ? `No se puede eliminar: el grupo aún tiene ${studentCount} estudiante(s) matriculado(s). Debe tener 0 estudiantes.`
                    : !g.closed
                      ? 'Para eliminar este grupo primero debe cerrarlo usando "Cerrar registro".'
                      : 'Eliminar grupo cerrado sin estudiantes activos';

              return (
                <div
                  key={g.id}
                  data-academic-group={g.id}
                  className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[var(--ui-shadow)] transition-colors hover:border-brand/50 flex flex-col justify-between gap-5"
                >
                  <div className="min-w-0">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="record-code text-xs font-semibold bg-surface-alt px-2.5 py-1 rounded-lg border border-line">
                        {g.periodId || 'Periodo Pendiente'}
                      </span>
                      {g.closed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Cerrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Abierto
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-start gap-3">
                      <CareerPhoto programId={g.programId} programName={progName} decorative className="h-16 w-20 shrink-0 rounded-xl" />
                      <div className="min-w-0">
                        <p className="record-label">Programa de estudios</p>
                        <p className="record-academic mt-1 text-base">{progName}</p>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3">
                      <div>
                        <dt className="record-label">Aula</dt>
                        <dd><h3 className="record-name mt-0.5 text-lg" title={g.name}>{g.name}</h3></dd>
                      </div>
                      <div>
                        <dt className="record-label">Módulo formativo</dt>
                        <dd className="mt-0.5 break-words text-sm leading-relaxed text-ink" title={modName}>{modName}</dd>
                      </div>
                    </dl>

                    {/* Metadata rápida */}
                    <div className="flex flex-wrap gap-2 mt-4 text-xs text-ink">
                      {g.section && (
                        <span className="bg-surface border border-line px-2 py-0.5 rounded font-semibold">
                          Sección: {g.section}
                        </span>
                      )}
                      {g.turno && (
                        <span className="bg-surface border border-line px-2 py-0.5 rounded font-semibold">
                          Turno: {g.turno}
                        </span>
                      )}
                      {(g.isConvenio || g.convenioName) && (
                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded font-bold">
                          {g.convenioName || 'Grupo por Convenio'}
                        </span>
                      )}
                    </div>

                    {/* Unidades didácticas interactivas */}
                    <div className="mt-3 pt-3 border-t border-line">
                      <span className="record-label block mb-2">
                        Unidades del aula
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(g.units || []).map((u) => {
                          const isUnitActive =
                            activeWorkspace?.groupId === g.id &&
                            ((activeWorkspace?.mode === 'UNIT' && activeWorkspace?.unit === u) ||
                              (activeWorkspace?.mode === 'PRACTICE' && u === 'EFSRT'));
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => handleSelectUnitFromCard(g, u)}
                              aria-pressed={isUnitActive}
                              title={`Activar ${g.name} · Unidad ${u}`}
                              className={`min-h-11 px-2.5 py-1 rounded-[10px] text-sm font-semibold transition-colors cursor-pointer border tabular-nums ${
                                isUnitActive
                                  ? 'bg-brand text-on-brand border-brand shadow-[var(--ui-shadow)] ring-2 ring-brand/25'
                                  : 'bg-surface text-ink border-line hover:border-brand hover:text-brand'
                              }`}
                            >
                              {u}{isUnitActive ? ' ✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer de la tarjeta con acciones */}
                  <div className="pt-3 border-t border-line space-y-2.5">
                    {(() => {
                      const assignedList = assignedTeachersByGroup.get(g.id) || [];
                      const teacherLabel =
                        assignedList.map((t) => t.name).join(' / ') ||
                        String(g.teacherName || '').trim();
                      return (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted shrink-0">Docente titular:</span>
                          {teacherLabel ? (
                            <span
                              className="font-bold text-ink truncate text-right"
                              title={teacherLabel}
                            >
                              {teacherLabel}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px]">
                              Sin docente asignado
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap items-center justify-between text-sm gap-2">
                      <button
                        type="button"
                        onClick={() => setRosterModalGroup(g)}
                        className="min-h-11 text-brand hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer tabular-nums"
                      >
                        <StudentsIcon className="w-3.5 h-3.5" />
                        <span>{studentCount} estudiante{studentCount === 1 ? '' : 's'}</span>
                      </button>

                      <span className="record-code text-xs break-all">
                        {g.id}
                      </span>
                    </div>

                    {(isDirector || user?.role === 'SECRETARIA') && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {!isTeacher && (
                          <button
                            type="button"
                            onClick={() => handleOpenTeacherModal(g)}
                            className="min-h-11 px-3 py-1 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/35 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                          >
                            {(assignedTeachersByGroup.get(g.id)?.length || g.teacherName)
                              ? 'Reasignar docente'
                              : 'Asignar docente'}
                          </button>
                        )}
                        {isDirector && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditGroup(g)}
                              className="min-h-11 px-3 py-1 rounded-[10px] bg-surface hover:bg-brand-soft text-ink hover:text-brand border border-line font-bold text-xs transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenClosureModal(g)}
                              className={`min-h-11 px-3 py-1 rounded-[10px] text-xs font-bold transition-colors border cursor-pointer ${
                                g.closed
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {g.closed ? 'Reabrir' : 'Cerrar registro'}
                            </button>
                            <button
                              type="button"
                              disabled={!canDeleteGroup}
                              title={deleteDisabledReason}
                              aria-label={`Eliminar ${g.name}`}
                              onClick={() => handleOpenDeleteModal(g, studentCount)}
                              className={`min-h-11 px-3 py-1 rounded-[10px] text-xs font-bold transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                                !canDeleteGroup
                                  ? 'bg-surface-alt text-muted border-line opacity-50 cursor-not-allowed'
                                  : 'bg-rose-50 dark:bg-rose-950/35 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 cursor-pointer'
                              }`}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Modal de Edición de Aula (DIRECTOR) */}
      {editingGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-group-modal-title"
        >
          <div
            ref={editGroupPanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-xl w-full p-6 lg:p-8 space-y-6 shadow-[var(--ui-shadow)] border border-line"
          >
            <div className="pb-4 border-b border-line">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Dirección Institucional
              </span>
              <h3 id="edit-group-modal-title" className="text-lg font-bold text-ink mt-0.5">
                Modificar Configuración de Aula (<span className="tabular-nums">{editingGroup.id}</span>)
              </h3>
            </div>

            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-bold text-ink mb-1">
                  Nombre Descriptivo <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editGroupForm.name}
                  onChange={(e) => setEditGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-period" className="block text-xs font-bold text-ink mb-1">
                    Periodo Lectivo <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    id="edit-period"
                    type="text"
                    required
                    value={editGroupForm.periodId}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, periodId: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label htmlFor="edit-section" className="block text-xs font-bold text-ink mb-1">
                    Sección <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    id="edit-section"
                    required
                    value={editGroupForm.section}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, section: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {editGroupForm.section && !SECCIONES_SUCESIVAS.includes(editGroupForm.section.toUpperCase()) && (
                      <option value={editGroupForm.section}>{editGroupForm.section}</option>
                    )}
                    {SECCIONES_SUCESIVAS.map((sec) => (
                      <option key={sec} value={sec}>
                        Sección {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-turno" className="block text-xs font-bold text-ink mb-1">
                    Turno Lectivo <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    id="edit-turno"
                    required
                    value={normalizeTurnoLabel(editGroupForm.turno || 'Mañana')}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, turno: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {TURNOS_OFICIALES.map((t) => (
                      <option key={t} value={t}>
                        Turno {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-module" className="block text-xs font-bold text-ink mb-1">
                    Módulo Curricular <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    id="edit-module"
                    required
                    value={editGroupForm.moduleId}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, moduleId: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {modules
                      .filter((m) => m.programaId === editingGroup.programId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre || m.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface-alt/60 p-3 space-y-2.5">
                <label htmlFor="edit-is-convenio" className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    id="edit-is-convenio"
                    type="checkbox"
                    checked={editGroupForm.isConvenio}
                    onChange={(e) =>
                      setEditGroupForm((prev) => ({
                        ...prev,
                        isConvenio: e.target.checked,
                        convenioName: e.target.checked ? prev.convenioName : '',
                      }))
                    }
                    className="w-4 h-4 rounded border-line text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <span className="text-xs font-bold text-ink">Grupo por Convenio Institucional</span>
                </label>

                {editGroupForm.isConvenio && (
                  <div>
                    <label htmlFor="edit-convenio-name" className="block text-xs font-bold text-ink mb-1">
                      Nombre del Convenio <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <input
                      id="edit-convenio-name"
                      type="text"
                      required
                      placeholder="Ej.: Convenio Lampa"
                      value={editGroupForm.convenioName}
                      onChange={(e) => setEditGroupForm((prev) => ({ ...prev, convenioName: e.target.value }))}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="edit-units" className="block text-xs font-bold text-ink mb-1">
                  Unidades Didácticas (Separadas por coma) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="edit-units"
                  type="text"
                  required
                  value={editGroupForm.units}
                  onChange={(e) => setEditGroupForm((prev) => ({ ...prev, units: e.target.value }))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  disabled={isUpdatingGroup}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingGroup}
                  className="min-h-[44px] px-5 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingGroup ? 'Guardando en SQLite…' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal de Cierre / Reapertura (DIRECTOR) */}
      {closureModal.isOpen && closureModal.group && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="closure-modal-title"
        >
          <div
            ref={closurePanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line"
          >
            <h3 id="closure-modal-title" className="text-base font-bold text-ink">
              {closureModal.group.closed ? 'Autorizar Reapertura de Aula' : 'Cerrar Registro Académico de Aula'}
            </h3>

            <p className="text-xs text-muted">
              Aula: <strong className="text-ink">{closureModal.group.name}</strong> (<span className="tabular-nums">{closureModal.group.periodId}</span>)
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200">
              {closureModal.group.closed
                ? 'La reapertura permite que los docentes continúen registrando marcas de asistencia y calificaciones pendientes.'
                : 'El cierre congela los registros de notas y asistencias, impidiendo modificaciones por parte del docente.'}
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs text-rose-900 dark:text-rose-200 font-medium"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="closure-reason" className="block text-xs font-bold text-ink mb-1.5">
                Motivo Administrativo de la Decisión <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <textarea
                id="closure-reason"
                required
                rows={3}
                placeholder="Indique la justificación formal del cierre o reapertura institucional…"
                value={closureModal.reason}
                onChange={(e) => setClosureModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setClosureModal({ isOpen: false, group: null, reason: '' });
                  setErrorMsg(null);
                }}
                disabled={isSubmittingClosure}
                className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClosure}
                disabled={isSubmittingClosure || !closureModal.reason.trim()}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {isSubmittingClosure ? 'Guardando…' : 'Confirmar Decisión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8B. Modal de Asignación / Reasignación de Docente Titular */}
      {teacherModal.isOpen && teacherModal.group && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teacher-reassign-title"
        >
          <div
            ref={teacherPanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line"
          >
            <div className="pb-3 border-b border-line">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                Relevo o Asignación Docente
              </span>
              <h3 id="teacher-reassign-title" className="text-base font-bold text-ink mt-0.5">
                Asignar o Reasignar Docente del Aula
              </h3>
              <p className="text-xs text-muted mt-1">
                Aula: <strong className="text-ink">{teacherModal.group.name}</strong> ·{' '}
                <span>{getProgramName(teacherModal.group.programId)}</span>
              </p>
            </div>

            {(() => {
              const currentAssigned = assignedTeachersByGroup.get(teacherModal.group.id) || [];
              if (!currentAssigned.length) return null;
              return (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200">
                  Docente actual: <strong>{currentAssigned.map((t) => t.name).join(' / ')}</strong>. Al confirmar otro docente, el aula pasará inmediatamente al nuevo titular sin perder estudiantes, notas ni asistencias.
                </div>
              );
            })()}

            <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={teacherModal.unassign}
                onChange={(e) => setTeacherModal((prev) => ({ ...prev, unassign: e.target.checked }))}
                className="w-4 h-4 accent-amber-600 rounded"
              />
              <span>Dejar aula temporalmente sin docente titular asignado</span>
            </label>

            {!teacherModal.unassign && (
              <>
                <div>
                  <label htmlFor="reassign-teacher-select" className="block text-xs font-bold text-ink mb-1.5">
                    Docente Titular Activo <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    id="reassign-teacher-select"
                    value={teacherModal.teacherId}
                    onChange={(e) => setTeacherModal((prev) => ({ ...prev, teacherId: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-[10px] border border-line bg-surface text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">-- Seleccione docente activo --</option>
                    {activeTeachers
                      .slice()
                      .sort((a, b) => {
                        const aMatch = a.careerId === teacherModal.group?.programId ? 0 : 1;
                        const bMatch = b.careerId === teacherModal.group?.programId ? 0 : 1;
                        if (aMatch !== bMatch) return aMatch - bMatch;
                        return a.name.localeCompare(b.name);
                      })
                      .map((t) => {
                        const careerLabel = t.careerId ? getProgramName(t.careerId) : 'Sin carrera asignada';
                        const isMatch = t.careerId === teacherModal.group?.programId;
                        return (
                          <option key={t.id} value={t.id}>
                            {isMatch ? '★ ' : ''}
                            {t.name} (@{t.username}) — {careerLabel}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-bold text-ink mb-1.5">
                    Unidades didácticas a cargo del docente
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(teacherModal.group.units || []).map((uCode) => {
                      const activeUnit = teacherModal.units.includes(uCode);
                      return (
                        <button
                          key={uCode}
                          type="button"
                          onClick={() =>
                            setTeacherModal((prev) => ({
                              ...prev,
                              units: activeUnit
                                ? prev.units.filter((u) => u !== uCode)
                                : [...prev.units, uCode],
                            }))
                          }
                          className={`min-h-[38px] px-3 py-1 rounded-[10px] text-xs font-bold border transition-colors cursor-pointer ${
                            activeUnit
                              ? 'bg-brand text-on-brand border-brand'
                              : 'bg-surface text-muted border-line hover:text-ink'
                          }`}
                        >
                          {uCode} {activeUnit ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setTeacherModal({ isOpen: false, group: null, teacherId: '', units: [], unassign: false })}
                disabled={isSubmittingTeacher}
                className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTeacherReassign}
                disabled={isSubmittingTeacher || (!teacherModal.unassign && (!teacherModal.teacherId || !teacherModal.units.length))}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingTeacher
                  ? 'Guardando…'
                  : teacherModal.unassign
                    ? 'Retirar asignación'
                    : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8C. Modal de Eliminación Segura de Grupo Cerrado sin Estudiantes (DIRECTOR) */}
      {deleteModal.isOpen && deleteModal.group && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-group-title"
        >
          <div
            ref={deletePanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line"
          >
            <h3 id="delete-group-title" className="text-base font-bold text-rose-700 dark:text-rose-400">
              Eliminar Grupo Académico
            </h3>

            <p className="text-xs text-muted">
              Aula a eliminar: <strong className="text-ink">{deleteModal.group.name}</strong> ({deleteModal.group.periodId})
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                Estado: Cerrado
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface-alt text-ink border border-line tabular-nums">
                Estudiantes activos: 0
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-950 dark:text-rose-200">
              Solo se pueden eliminar grupos o salones cerrados con 0 estudiantes activos (sin calificaciones, asistencias, entregas documentales ni solicitudes pendientes). El aula se archivará de forma segura y las asignaciones docentes quedarán liberadas sin perder el historial de auditoría.
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs text-rose-900 dark:text-rose-200 font-medium"
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="delete-group-reason" className="block text-xs font-bold text-ink mb-1.5">
                Motivo de Eliminación <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <textarea
                id="delete-group-reason"
                required
                rows={3}
                placeholder="Ej. Grupo cerrado sin estudiantes matriculados…"
                value={deleteModal.reason}
                onChange={(e) => setDeleteModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-surface text-ink placeholder:text-muted text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setDeleteModal({ isOpen: false, group: null, reason: '' });
                  setErrorMsg(null);
                }}
                disabled={isDeletingGroup}
                className="min-h-[44px] px-4 py-2 rounded-[10px] border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-alt transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={isDeletingGroup || !deleteModal.reason.trim()}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-[var(--ui-shadow)] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                {isDeletingGroup ? 'Eliminando…' : 'Eliminar Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal de Nómina de Estudiantes del Grupo */}
      {rosterModalGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roster-modal-title"
        >
          <div
            ref={rosterPanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-[var(--ui-shadow)] border border-line flex flex-col"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-line">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                  Nómina Oficial del Aula
                </span>
                <h3 id="roster-modal-title" className="text-base font-bold text-ink mt-0.5 truncate" title={rosterModalGroup.name}>
                  {rosterModalGroup.name}
                </h3>
                <span className="text-xs text-muted tabular-nums">
                  {rosterStudents.length} estudiantes matriculados activos
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRosterModalGroup(null)}
                aria-label="Cerrar nómina del aula"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface-alt text-sm font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-line text-xs">
              {rosterStudents.length === 0 ? (
                <div className="py-8 text-center text-muted">
                  No hay estudiantes matriculados en esta aula todavía.
                </div>
              ) : (
                rosterStudents.map(({ student, enrollment }, idx) => (
                  <div key={enrollment.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-muted tabular-nums w-6 text-right shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <strong className="text-ink block truncate" title={student?.name || 'Estudiante'}>{student?.name || 'Estudiante'}</strong>
                        <span className="text-[11px] text-muted tabular-nums">
                          DNI: {student?.document || '—'} · Código: {enrollment.code || 'MAT'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted tabular-nums shrink-0">
                      Ingreso: {enrollment.startDate || 'Pendiente'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setRosterModalGroup(null)}
                className="min-h-[44px] px-5 py-2 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand border border-line text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Pie de Página */}
      <footer className="text-center py-4 text-xs text-muted border-t border-line">
        CEPRO_MICAELA 2.0 · Módulo de Planificación y Control de Aulas Fuera de Línea
      </footer>
    </div>
  );
};

export default GestionGrupos;
