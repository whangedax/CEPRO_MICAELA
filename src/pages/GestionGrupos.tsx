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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import {
  DashboardGroup,
  StudentEnrollmentItem,
  StudentItem,
  SaveGroupPayload,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
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

export const GestionGrupos: React.FC<GestionGruposProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { registerPendingChanges, unregisterPendingChanges } = usePendingChanges();

  const isDirector = user?.role === 'DIRECTOR';
  const isTeacher = user?.role === 'DOCENTE';

  // Estados de datos
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name?: string; nombre?: string }>>([]);
  const [modules, setModules] = useState<Array<{ id: string; name?: string; nombre?: string; programaId?: string }>>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollmentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ABIERTOS' | 'CERRADOS'>('TODOS');

  // Formulario Nuevo Grupo (DIRECTOR)
  const initialNewGroupState = {
    name: '',
    programId: '',
    moduleId: '',
    periodId: '2026-I',
    section: 'A',
    turno: 'Mañana',
    units: 'UD1, UD2, UD3',
  };
  const [newGroupForm, setNewGroupForm] = useState(initialNewGroupState);
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [isNewGroupDirty, setIsNewGroupDirty] = useState<boolean>(false);

  // Modal / Edición de Grupo Existente (DIRECTOR)
  const [editingGroup, setEditingGroup] = useState<DashboardGroup | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({
    name: '',
    programId: '',
    moduleId: '',
    periodId: '',
    section: '',
    turno: '',
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

  // Carga de datos
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      const res = await apiClient.getDashboard(undefined, !isTeacher);
      setGroups(res.groups || []);
      setPrograms(res.programs || []);
      setModules((res.modules || []) as unknown as Array<{ id: string; name?: string; nombre?: string; programaId?: string }>);
      setEnrollments(res.enrollments || []);
      setStudents(res.students || []);

      // Preseleccionar primer programa en nuevo grupo si aún no está seleccionado
      if (res.programs?.length && !newGroupForm.programId) {
        const firstProgId = res.programs[0].id;
        const matchingModule = (res.modules as unknown as Array<{ id: string; programaId?: string }>)?.find(
          (m) => m.programaId === firstProgId
        );
        setNewGroupForm((prev) => ({
          ...prev,
          programId: firstProgId,
          moduleId: matchingModule?.id || '',
        }));
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al conectar con la base de datos de aulas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isTeacher, newGroupForm.programId]);

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
        },
      });
    } else {
      unregisterPendingChanges('new-group-form');
    }

    return () => {
      unregisterPendingChanges('new-group-form');
    };
  }, [isNewGroupDirty, registerPendingChanges, unregisterPendingChanges]);

  // Manejar cambio de programa en formulario de nuevo grupo
  const handleNewGroupProgramChange = (programId: string) => {
    const matchingModule = modules.find((m) => m.programaId === programId);
    setNewGroupForm((prev) => ({
      ...prev,
      programId,
      moduleId: matchingModule?.id || '',
    }));
    setIsNewGroupDirty(true);
  };

  // Crear nuevo grupo (DIRECTOR)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.name.trim() || !newGroupForm.programId || !newGroupForm.moduleId || !newGroupForm.periodId.trim()) {
      setErrorMsg('Nombre descriptivo, carrera, módulo y periodo son campos obligatorios.');
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

    setIsCreatingGroup(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: SaveGroupPayload = {
        name: newGroupForm.name.trim(),
        programId: newGroupForm.programId,
        moduleId: newGroupForm.moduleId,
        periodId: newGroupForm.periodId.trim(),
        section: newGroupForm.section.trim().toUpperCase() || 'ÚNICA',
        turno: newGroupForm.turno.trim() || 'Mañana',
        units: unitsArray,
      };

      const created = await apiClient.saveGroup(payload);
      setIsNewGroupDirty(false);
      unregisterPendingChanges('new-group-form');

      setSuccessMsg(`Aula "${created.name}" creada exitosamente en el periodo ${created.periodId}.`);
      setNewGroupForm((prev) => ({
        ...prev,
        name: '',
        section: 'A',
      }));
      await loadData();
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
      section: g.section || '',
      turno: g.turno || '',
      units: (g.units || []).join(', '),
    });
    setErrorMsg(null);
  };

  // Guardar edición de grupo (DIRECTOR)
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

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
        units: unitsArray,
      };

      const updated = await apiClient.saveGroup(payload);
      setSuccessMsg(`Configuración del aula "${updated.name}" actualizada con éxito.`);
      setEditingGroup(null);
      await loadData();
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

  // Confirmar cierre / reapertura
  const handleConfirmClosure = async () => {
    const { group, reason } = closureModal;
    if (!group || !reason.trim()) {
      setErrorMsg('Debe ingresar un motivo para el cierre o reapertura.');
      return;
    }

    setIsSubmittingClosure(true);
    setErrorMsg(null);

    try {
      const newClosedState = !group.closed;
      await apiClient.closureGroup({
        groupId: group.id,
        closed: newClosedState,
        reason: reason.trim(),
        rev: group.rev,
      });

      setSuccessMsg(
        newClosedState
          ? `Registro del aula "${group.name}" cerrado formalmente. Las notas y asistencias quedan congeladas.`
          : `Aula "${group.name}" reabierta formalmente para el registro académico.`
      );

      setClosureModal({ isOpen: false, group: null, reason: '' });
      await loadData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al modificar el estado de cierre del grupo.');
    } finally {
      setIsSubmittingClosure(false);
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
      const matchesProgram = !selectedProgramFilter || g.programId === selectedProgramFilter;
      const matchesStatus =
        statusFilter === 'TODOS' ||
        (statusFilter === 'ABIERTOS' && !g.closed) ||
        (statusFilter === 'CERRADOS' && g.closed);

      const nameMatch = (g.name || '').toLowerCase().includes(q);
      const periodMatch = (g.periodId || '').toLowerCase().includes(q);
      const turnoMatch = (g.turno || '').toLowerCase().includes(q);
      const sectionMatch = (g.section || '').toLowerCase().includes(q);

      return matchesProgram && matchesStatus && (!q || nameMatch || periodMatch || turnoMatch || sectionMatch);
    });
  }, [groups, searchQuery, selectedProgramFilter, statusFilter]);

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
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] uppercase tracking-widest bg-[#E6F4F1] px-2.5 py-1 rounded-md">
              Ámbito Institucional · Organización Curricular
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-[#0D382F] font-bold tracking-tight leading-tight">
            {isTeacher ? 'Mis Grupos y Aulas' : 'Organización de Grupos y Aulas'}
          </h1>
          <p className="text-[14px] text-slate-700 font-normal leading-relaxed">
            {isTeacher
              ? 'Consulta de aulas, turnos y unidades didácticas asignadas a su carga lectiva.'
              : 'Configuración de carreras, módulos formativos, turnos, periodos lectivos y estados de cierre de registros.'}
          </p>
        </div>

        {/* Botón de Actualización */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar listado de aulas"
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
              Total Grupos
            </span>
            <span className="text-2xl font-extrabold text-[#0D382F] mt-1 block">
              {counts.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <GroupsIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Aulas Abiertas
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
              {counts.open}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Aulas Cerradas
            </span>
            <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
              {counts.closed}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Matrículas Activas
            </span>
            <span className="text-2xl font-extrabold text-[#0D382F] mt-1 block">
              {counts.totalEnrollments}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] text-[#13594A] flex items-center justify-center font-bold">
            <StudentsIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Formulario de Creación de Grupo (DIRECTOR únicamente) */}
      {isDirector && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 lg:p-8 space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs font-bold text-[#13594A] uppercase tracking-wider">
              Dirección General · Planificación Lectiva
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Crear Nueva Aula / Grupo Académico
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Configure la carrera técnica, módulo curricular, periodo lectivo, sección, turno y unidades didácticas normadas.
            </p>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Nombre descriptivo */}
              <div className="md:col-span-2">
                <label htmlFor="new-group-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre Descriptivo del Grupo <span className="text-rose-600">*</span>
                </label>
                <input
                  id="new-group-name"
                  type="text"
                  required
                  placeholder="Ej.: Computación e Informática, Grupo A — Turno Mañana"
                  value={newGroupForm.name}
                  onChange={(e) => {
                    setNewGroupForm((prev) => ({ ...prev, name: e.target.value }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              {/* Periodo Lectivo */}
              <div>
                <label htmlFor="new-group-period" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Periodo Lectivo <span className="text-rose-600">*</span>
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              {/* Carrera / Programa */}
              <div>
                <label htmlFor="new-group-program" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Programa de Estudio <span className="text-rose-600">*</span>
                </label>
                <select
                  id="new-group-program"
                  required
                  value={newGroupForm.programId}
                  onChange={(e) => handleNewGroupProgramChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
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
                <label htmlFor="new-group-module" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Módulo Formativo <span className="text-rose-600">*</span>
                </label>
                <select
                  id="new-group-module"
                  required
                  value={newGroupForm.moduleId}
                  onChange={(e) => {
                    setNewGroupForm((prev) => ({ ...prev, moduleId: e.target.value }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
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

              {/* Sección */}
              <div>
                <label htmlFor="new-group-section" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sección Oficial <span className="text-rose-600">*</span>
                </label>
                <input
                  id="new-group-section"
                  type="text"
                  required
                  placeholder="Ej.: A, B o ÚNICA"
                  maxLength={20}
                  value={newGroupForm.section}
                  onChange={(e) => {
                    setNewGroupForm((prev) => ({ ...prev, section: e.target.value }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              {/* Turno */}
              <div>
                <label htmlFor="new-group-turno" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Turno Lectivo
                </label>
                <input
                  id="new-group-turno"
                  type="text"
                  placeholder="Ej.: Mañana, Tarde, Noche"
                  maxLength={60}
                  value={newGroupForm.turno}
                  onChange={(e) => {
                    setNewGroupForm((prev) => ({ ...prev, turno: e.target.value }));
                    setIsNewGroupDirty(true);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              {/* Unidades Didácticas */}
              <div className="md:col-span-2">
                <label htmlFor="new-group-units" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Unidades Didácticas (Separadas por coma) <span className="text-rose-600">*</span>
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Ingrese los códigos de las unidades normadas para el módulo (ej. UD1, UD2, UD3, UD4, EFSRT).
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {isNewGroupDirty && <span className="text-amber-800 font-semibold">● Datos del nuevo grupo sin guardar</span>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewGroupForm(initialNewGroupState);
                    setIsNewGroupDirty(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="px-6 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingGroup ? 'Creando grupo en SQLite…' : 'Crear Aula / Grupo'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Toolbar de Filtros y Búsqueda */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Aulas y Grupos Académicos Registrados
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de secciones lectivas, estudiantes matriculados y unidades curriculares.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {filteredGroups.length} aulas encontradas
          </span>
        </div>

        {/* Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Filtro por Programa */}
          <div>
            <label htmlFor="filter-prog" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Programa / Carrera
            </label>
            <select
              id="filter-prog"
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            >
              <option value="">Todas las carreras</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label htmlFor="filter-status-group" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Estado de Cierre
            </label>
            <select
              id="filter-status-group"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'TODOS' | 'ABIERTOS' | 'CERRADOS')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            >
              <option value="TODOS">Todos (Abiertos y Cerrados)</option>
              <option value="ABIERTOS">Solo Aulas Abiertas</option>
              <option value="CERRADOS">Solo Aulas Cerradas</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div>
            <label htmlFor="search-group-input" className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Buscar Aula
            </label>
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-group-input"
                type="search"
                placeholder="Nombre, turno, periodo o sección…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
              />
            </div>
          </div>
        </div>

        {/* 6. Grid de Tarjetas de Aulas */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 border-3 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin mx-auto mb-2" />
            Cargando configuración de grupos desde SQLite…
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="font-bold text-slate-800 text-sm">No se encontraron grupos</p>
            <span className="text-xs text-slate-500 mt-1 block">
              No existen aulas que coincidan con los filtros seleccionados.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-3">
            {filteredGroups.map((g) => {
              const progName = getProgramName(g.programId);
              const modName = getModuleName(g.moduleId);
              const studentCount = enrollments.filter((e) => e.groupId === g.id && e.active).length;

              return (
                <div
                  key={g.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#13594A]/30 transition-all p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-[#13594A] uppercase tracking-wider bg-[#E6F4F1] px-2.5 py-0.5 rounded-md">
                        {g.periodId || 'Periodo Pendiente'}
                      </span>
                      {g.closed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          Cerrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Abierto
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {g.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {progName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 italic">
                      Módulo: {modName}
                    </p>

                    {/* Metadata rápida */}
                    <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-slate-600">
                      {g.section && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold">
                          Sección: {g.section}
                        </span>
                      )}
                      {g.turno && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold">
                          Turno: {g.turno}
                        </span>
                      )}
                    </div>

                    {/* Unidades didácticas */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Unidades Didácticas
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(g.units || []).map((u) => (
                          <span
                            key={u}
                            className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 text-[10px] font-mono border border-slate-200/80"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer de la tarjeta con acciones */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setRosterModalGroup(g)}
                        className="text-[#13594A] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <StudentsIcon className="w-3.5 h-3.5" />
                        <span>{studentCount} estudiante{studentCount === 1 ? '' : 's'}</span>
                      </button>

                      <span className="text-[11px] font-mono text-slate-400">
                        {g.id}
                      </span>
                    </div>

                    {isDirector && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditGroup(g)}
                          className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenClosureModal(g)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors border ${
                            g.closed
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {g.closed ? 'Reabrir' : 'Cerrar registro'}
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 lg:p-8 space-y-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="pb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-[#13594A] uppercase tracking-wider">
                Dirección Institucional
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                Modificar Configuración de Aula ({editingGroup.id})
              </h3>
            </div>

            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Descriptivo <span className="text-rose-600">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editGroupForm.name}
                  onChange={(e) => setEditGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-period" className="block text-xs font-bold text-slate-700 mb-1">
                    Periodo Lectivo <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="edit-period"
                    type="text"
                    required
                    value={editGroupForm.periodId}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, periodId: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-section" className="block text-xs font-bold text-slate-700 mb-1">
                    Sección <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="edit-section"
                    type="text"
                    required
                    maxLength={20}
                    value={editGroupForm.section}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, section: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-turno" className="block text-xs font-bold text-slate-700 mb-1">
                    Turno Lectivo
                  </label>
                  <input
                    id="edit-turno"
                    type="text"
                    maxLength={60}
                    value={editGroupForm.turno}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, turno: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-module" className="block text-xs font-bold text-slate-700 mb-1">
                    Módulo Curricular <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="edit-module"
                    required
                    value={editGroupForm.moduleId}
                    onChange={(e) => setEditGroupForm((prev) => ({ ...prev, moduleId: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
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

              <div>
                <label htmlFor="edit-units" className="block text-xs font-bold text-slate-700 mb-1">
                  Unidades Didácticas (Separadas por coma) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="edit-units"
                  type="text"
                  required
                  value={editGroupForm.units}
                  onChange={(e) => setEditGroupForm((prev) => ({ ...prev, units: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  disabled={isUpdatingGroup}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingGroup}
                  className="px-5 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-colors shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {closureModal.group.closed ? 'Autorizar Reapertura de Aula' : 'Cerrar Registro Académico de Aula'}
            </h3>

            <p className="text-xs text-slate-600">
              Aula: <strong>{closureModal.group.name}</strong> ({closureModal.group.periodId})
            </p>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              {closureModal.group.closed
                ? 'La reapertura permite que los docentes continúen registrando marcas de asistencia y calificaciones pendientes.'
                : 'El cierre congela los registros de notas y asistencias, impidiendo modificaciones por parte del docente.'}
            </div>

            <div>
              <label htmlFor="closure-reason" className="block text-xs font-bold text-slate-700 mb-1.5">
                Motivo Administrativo de la Decisión <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="closure-reason"
                required
                rows={3}
                placeholder="Indique la justificación formal del cierre o reapertura institucional…"
                value={closureModal.reason}
                onChange={(e) => setClosureModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClosureModal({ isOpen: false, group: null, reason: '' })}
                disabled={isSubmittingClosure}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClosure}
                disabled={isSubmittingClosure || !closureModal.reason.trim()}
                className="px-5 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D3E34] transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmittingClosure ? 'Guardando…' : 'Confirmar Decisión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal de Nómina de Estudiantes del Grupo */}
      {rosterModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-[#13594A] uppercase tracking-wider">
                  Nómina Oficial del Aula
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {rosterModalGroup.name}
                </h3>
                <span className="text-xs text-slate-500">
                  {rosterStudents.length} estudiantes matriculados activos
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRosterModalGroup(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {rosterStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  No hay estudiantes matriculados en esta aula todavía.
                </div>
              ) : (
                rosterStudents.map(({ student, enrollment }, idx) => (
                  <div key={enrollment.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 w-6 text-right">{idx + 1}.</span>
                      <div>
                        <strong className="text-slate-900 block">{student?.name || 'Estudiante'}</strong>
                        <span className="text-[11px] text-slate-500">
                          DNI: {student?.document || '—'} · Código: {enrollment.code || 'MAT'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Ingreso: {enrollment.startDate || 'Pendiente'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setRosterModalGroup(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Pie de Página */}
      <footer className="text-center py-4 text-xs text-slate-600 border-t border-slate-200">
        CEPRO_MICAELA 2.0 · Módulo de Planificación y Control de Aulas Fuera de Línea
      </footer>
    </div>
  );
};

export default GestionGrupos;
