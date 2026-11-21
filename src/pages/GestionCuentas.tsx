/**
 * src/pages/GestionCuentas.tsx
 * 
 * Módulo de Gestión de Cuentas, Usuarios y Asignaciones — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real al backend SQLite local mediante:
 * - GET /api/users (Directorio de cuentas institucional con control RBAC).
 * - POST /api/users (Creación y actualización de cuentas y asignaciones de aulas).
 * - POST /api/users/archive (Baja formal y archivado con motivo auditable).
 * - GET /api/dashboard?overview=1 (Consulta de grupos y aulas para asignaciones docentes).
 * - Separación estricta de privilegios:
 *   * DIRECTOR: Control total de todos los roles (DIRECTOR, SECRETARIA, DOCENTE).
 *   * SECRETARIA: Administración y asignación exclusiva de cuentas DOCENTE (HTTP 403 en otros roles).
 *   * DOCENTE: Ficha de solo lectura de su propia cuenta y aulas asignadas.
 * - Seguridad de credenciales: cero almacenamiento o exposición de hashes de contraseña.
 * - Control de concurrencia optimista mediante `version` (HTTP 409).
 * - Protección de cambios pendientes con `PendingChangesContext`.
 * - Identidad visual Google Stitch (#13594A, #0D3E34, #F6F8FA).
 */

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { apiClient } from '../api/client';
import {
  PublicUser,
  UserRole,
  UserAssignment,
  DashboardGroup,
  SaveUserPayload,
  ArchiveUserPayload,
  ApiError,
} from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  AccountsIcon,
  SearchIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  LockIcon,
  EyeIcon,
  GroupsIcon,
  StudentsIcon,
} from '../components/ui/Icons';

interface GestionCuentasProps {
  onNavigate?: (route: NavRoute) => void;
}

interface UserFormData {
  id?: string;
  username: string;
  name: string;
  description: string;
  careerId: string;
  role: UserRole;
  password: string;
  active: boolean;
  assignmentPending: boolean;
  assignments: UserAssignment[];
  version?: number;
}

const INITIAL_FORM: UserFormData = {
  username: '',
  name: '',
  description: '',
  careerId: '',
  role: 'DOCENTE',
  password: '',
  active: true,
  assignmentPending: false,
  assignments: [],
};

export const GestionCuentas: React.FC<GestionCuentasProps> = ({ onNavigate }) => {
  const { user: currentUser } = useAuth();
  const { registerPendingChanges, unregisterPendingChanges } = usePendingChanges();

  const isDirector = currentUser?.role === 'DIRECTOR';
  const isSecretaria = currentUser?.role === 'SECRETARIA';
  const isDocente = currentUser?.role === 'DOCENTE';
  const canManageAccounts = isDirector || isSecretaria;

  // Estados de datos
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; nombre?: string; name?: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Filtros de tabla
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [careerFilter, setCareerFilter] = useState<string>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [assignmentFilter, setAssignmentFilter] = useState<'TODOS' | 'CON_AULA' | 'PENDIENTES'>('TODOS');

  // Formulario de creación / edición
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);

  // Selector auxiliar de asignación en formulario docente
  const [assignGroupId, setAssignGroupId] = useState<string>('');
  const [assignUnits, setAssignUnits] = useState<string[]>([]);

  // Modal de Archivación / Baja
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    user: PublicUser | null;
    reason: string;
    replacementTeacherId: string;
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    user: null,
    reason: '',
    replacementTeacherId: '',
    isSubmitting: false,
    error: null,
  });

  const drawerPanelRef = useRef<HTMLDivElement | null>(null);
  const previousDrawerFocusRef = useRef<HTMLElement | null>(null);
  const archivePanelRef = useRef<HTMLDivElement | null>(null);
  const previousArchiveFocusRef = useRef<HTMLElement | null>(null);

  // Trampa de foco, Escape y retorno de foco para el drawer de cuenta
  useEffect(() => {
    if (!isDrawerOpen) return;
    previousDrawerFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = drawerPanelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) focusables[0].focus();
      else panel.focus();
    };
    const rafId = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting) {
          e.preventDefault();
          setIsDrawerOpen(false);
        }
        return;
      }
      if (e.key !== 'Tab' || !drawerPanelRef.current) return;
      const focusables = Array.from(
        drawerPanelRef.current.querySelectorAll<HTMLElement>(
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
        if (document.activeElement === first || !drawerPanelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !drawerPanelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousDrawerFocusRef.current && typeof previousDrawerFocusRef.current.focus === 'function') {
        previousDrawerFocusRef.current.focus();
      }
    };
  }, [isDrawerOpen, isSubmitting]);

  // Trampa de foco, Escape y retorno de foco para el modal de archivación
  useEffect(() => {
    if (!archiveModal.isOpen) return;
    previousArchiveFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = archivePanelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) focusables[0].focus();
      else panel.focus();
    };
    const rafId = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!archiveModal.isSubmitting) {
          e.preventDefault();
          setArchiveModal({ isOpen: false, user: null, reason: '', replacementTeacherId: '', isSubmitting: false, error: null });
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
      if (previousArchiveFocusRef.current && typeof previousArchiveFocusRef.current.focus === 'function') {
        previousArchiveFocusRef.current.focus();
      }
    };
  }, [archiveModal.isOpen, archiveModal.isSubmitting]);

  // Carga de datos
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);
    setConflictMsg(null);

    try {
      if (canManageAccounts) {
        // Cargar usuarios y catálogo de grupos/programas institucionales
        const [usersData, dashboardData] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getDashboard(undefined, true),
        ]);
        setUsers(usersData || []);
        setGroups(dashboardData.groups || []);
        setPrograms((dashboardData.programs || []) as Array<{ id: string; nombre?: string; name?: string }>);
      } else {
        // Docente: solo carga sus grupos asignados para consulta
        const dashboardData = await apiClient.getDashboard(undefined, false);
        setGroups(dashboardData.groups || []);
        setPrograms((dashboardData.programs || []) as Array<{ id: string; nombre?: string; name?: string }>);
      }

      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString('es-PE', { hour12: false }));
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr?.error || 'Error al conectar con el servidor institucional de cuentas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canManageAccounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Protección de cambios pendientes en formulario de cuenta
  useEffect(() => {
    if (isFormDirty && isDrawerOpen) {
      registerPendingChanges({
        id: 'account-management-form',
        hasChanges: true,
        message: 'Tiene modificaciones en la ficha de usuario sin guardar. ¿Desea descartar los cambios?',
        onDiscard: () => {
          setIsDrawerOpen(false);
          setIsEditing(false);
          setFormData(INITIAL_FORM);
          setIsFormDirty(false);
          setFormError(null);
        },
      });
    } else {
      unregisterPendingChanges('account-management-form');
    }

    return () => {
      unregisterPendingChanges('account-management-form');
    };
  }, [isFormDirty, isDrawerOpen, registerPendingChanges, unregisterPendingChanges]);

  const getProgramName = useCallback(
    (programId: string) => {
      const found = programs.find((p) => p.id === programId);
      return found?.nombre || found?.name || programId;
    },
    [programs]
  );

  const resolveUserCareerId = useCallback(
    (u: PublicUser): string => {
      if (u.careerId) return u.careerId;
      if (u.assignments?.[0]?.programId) return u.assignments[0].programId;
      const desc = String(u.description || '').toLowerCase();
      if (!desc || !programs.length) return '';
      const matched = programs.find((p) => {
        const pname = String(p.nombre || p.name || '').toLowerCase();
        return pname && desc.includes(pname);
      });
      return matched?.id || '';
    },
    [programs]
  );

  // Filtro de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Búsqueda por texto (nombre o usuario)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = u.name?.toLowerCase().includes(query);
        const matchUser = u.username?.toLowerCase().includes(query);
        if (!matchName && !matchUser) return false;
      }

      // Filtro de rol
      if (isSecretaria) {
        // Secretaría solo ve docentes por regla institucional
        if (u.role !== 'DOCENTE') return false;
      } else if (roleFilter !== 'TODOS') {
        if (u.role !== roleFilter) return false;
      }

      // Filtro por categoría de carrera
      if (careerFilter !== 'TODOS') {
        if (u.role !== 'DOCENTE') return false;
        const resolved = resolveUserCareerId(u);
        if (careerFilter === 'SIN_CARRERA') {
          if (resolved) return false;
        } else if (resolved !== careerFilter) {
          return false;
        }
      }

      // Filtro de estado activo/inactivo
      if (statusFilter === 'ACTIVOS' && !u.active) return false;
      if (statusFilter === 'INACTIVOS' && u.active) return false;

      // Filtro de asignación para docentes
      if (assignmentFilter === 'CON_AULA') {
        if (u.role === 'DOCENTE' && (!u.assignments || u.assignments.length === 0)) return false;
      }
      if (assignmentFilter === 'PENDIENTES') {
        if (u.role !== 'DOCENTE' || !u.assignmentPending) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, careerFilter, statusFilter, assignmentFilter, isSecretaria, resolveUserCareerId]);

  // Resumen de docentes activos por carrera
  const careerSummary = useMemo(() => {
    const activeTeachers = users.filter((u) => u.role === 'DOCENTE' && u.active && !u.archived);
    const rows = programs.map((p) => {
      const list = activeTeachers.filter((t) => resolveUserCareerId(t) === p.id);
      return {
        id: p.id,
        name: p.nombre || p.name || p.id,
        count: list.length,
        assignedCount: list.filter((t) => (t.assignments || []).length > 0).length,
      };
    });
    const unassignedCareerCount = activeTeachers.filter((t) => !resolveUserCareerId(t)).length;
    return { rows, unassignedCareerCount };
  }, [users, programs, resolveUserCareerId]);

  // Mapa rápido de qué docente tiene asignada cada aula actualmente
  const groupOwnersByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const u of users) {
      if (u.role !== 'DOCENTE' || !u.active || u.archived) continue;
      for (const a of u.assignments || []) {
        const list = map.get(a.groupId) || [];
        list.push(u.name);
        map.set(a.groupId, list);
      }
    }
    return map;
  }, [users]);

  // Estadísticas institucionales rápidas
  const stats = useMemo(() => {
    const total = users.length;
    const activos = users.filter((u) => u.active).length;
    const docentes = users.filter((u) => u.role === 'DOCENTE').length;
    const directivos = users.filter((u) => u.role === 'DIRECTOR' || u.role === 'SECRETARIA').length;
    const pendientes = users.filter((u) => u.role === 'DOCENTE' && u.assignmentPending).length;
    const conAsignacion = users.filter((u) => u.role === 'DOCENTE' && u.assignments?.length > 0).length;

    return { total, activos, docentes, directivos, pendientes, conAsignacion };
  }, [users]);

  // Abrir Drawer para Crear
  const handleOpenCreate = () => {
    const defaultCareer = careerFilter !== 'TODOS' && careerFilter !== 'SIN_CARRERA'
      ? careerFilter
      : programs[0]?.id || '';
    setFormData({
      ...INITIAL_FORM,
      careerId: defaultCareer,
      role: 'DOCENTE',
      active: true,
      assignmentPending: false,
      assignments: [],
    });
    setAssignGroupId('');
    setAssignUnits([]);
    setIsEditing(false);
    setShowPassword(false);
    setFormError(null);
    setIsFormDirty(false);
    setIsDrawerOpen(true);
  };

  // Abrir Drawer para Editar
  const handleOpenEdit = (targetUser: PublicUser) => {
    if (isSecretaria && targetUser.role !== 'DOCENTE') {
      setErrorMsg('Secretaría solo tiene autorización para administrar cuentas docentes.');
      return;
    }

    setFormData({
      id: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      description: targetUser.description || '',
      careerId: targetUser.role === 'DOCENTE' ? resolveUserCareerId(targetUser) : '',
      role: targetUser.role,
      password: '', // En blanco para mantener contraseña existente
      active: targetUser.active,
      assignmentPending: !!targetUser.assignmentPending,
      assignments: targetUser.assignments ? [...targetUser.assignments] : [],
      version: targetUser.version,
    });
    setAssignGroupId('');
    setAssignUnits([]);
    setIsEditing(true);
    setShowPassword(false);
    setFormError(null);
    setIsFormDirty(false);
    setIsDrawerOpen(true);
  };

  // Manejar cambio de aula en selector de asignación
  const handleAssignGroupChange = (groupId: string) => {
    setAssignGroupId(groupId);
    const grp = groups.find((g) => g.id === groupId);
    if (grp && Array.isArray(grp.units)) {
      setAssignUnits([...grp.units]);
    } else {
      setAssignUnits([]);
    }
  };

  // Alternar unidad individual para la asignación en curso
  const handleToggleUnitForAssign = (unitName: string) => {
    setAssignUnits((prev) =>
      prev.includes(unitName) ? prev.filter((u) => u !== unitName) : [...prev, unitName]
    );
  };

  // Agregar asignación al listado del formulario docente
  const handleAddAssignment = () => {
    if (!assignGroupId) {
      setFormError('Seleccione un aula o grupo para asignar.');
      return;
    }
    const grp = groups.find((g) => g.id === assignGroupId);
    if (!grp) {
      setFormError('El aula seleccionada no es válida.');
      return;
    }
    if (!assignUnits.length) {
      setFormError('Debe marcar al menos una unidad didáctica para este grupo.');
      return;
    }

    setFormData((prev) => {
      const existingIdx = prev.assignments.findIndex((a) => a.groupId === assignGroupId);
      let nextAssignments: UserAssignment[];

      if (existingIdx >= 0) {
        // Combinar unidades sin duplicados
        const mergedUnits = Array.from(new Set([...prev.assignments[existingIdx].units, ...assignUnits]));
        nextAssignments = prev.assignments.map((a, idx) =>
          idx === existingIdx ? { ...a, units: mergedUnits } : a
        );
      } else {
        const newAssignment: UserAssignment = {
          groupId: grp.id,
          section: grp.section || '',
          periodId: grp.periodId,
          programId: grp.programId,
          moduleId: grp.moduleId,
          units: [...assignUnits],
        };
        nextAssignments = [...prev.assignments, newAssignment];
      }

      return {
        ...prev,
        assignments: nextAssignments,
        assignmentPending: false, // Al tener asignaciones se desmarca pendiente
      };
    });

    setIsFormDirty(true);
    setFormError(null);
    setAssignGroupId('');
    setAssignUnits([]);
  };

  // Quitar asignación completa de un aula
  const handleRemoveAssignment = (groupId: string) => {
    setFormData((prev) => {
      const nextAssignments = prev.assignments.filter((a) => a.groupId !== groupId);
      return {
        ...prev,
        assignments: nextAssignments,
        assignmentPending: nextAssignments.length === 0 ? true : prev.assignmentPending,
      };
    });
    setIsFormDirty(true);
  };

  // Quitar una unidad individual de una asignación existente
  const handleRemoveUnitFromAssignment = (groupId: string, unitName: string) => {
    setFormData((prev) => {
      const nextAssignments = prev.assignments
        .map((a) => {
          if (a.groupId === groupId) {
            return { ...a, units: a.units.filter((u) => u !== unitName) };
          }
          return a;
        })
        .filter((a) => a.units.length > 0);

      return {
        ...prev,
        assignments: nextAssignments,
        assignmentPending: nextAssignments.length === 0 ? true : prev.assignmentPending,
      };
    });
    setIsFormDirty(true);
  };

  // Guardar formulario de usuario
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConflictMsg(null);

    const name = formData.name.trim();
    const username = formData.username.trim().toLowerCase();

    if (!name) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!username) {
      setFormError('El nombre de usuario es obligatorio.');
      return;
    }
    if (!isEditing && !formData.password) {
      setFormError('Debe ingresar una contraseña inicial para la nueva cuenta.');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setFormError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (isSecretaria && formData.role !== 'DOCENTE') {
      setFormError('Secretaría solo puede crear o editar cuentas con rol DOCENTE.');
      return;
    }

    if (formData.role === 'DOCENTE') {
      if (!formData.assignments.length && !formData.assignmentPending) {
        setFormError('Para cuentas docentes debe asignar al menos un aula con unidades o marcar "Asignación pendiente".');
        return;
      }
    }

    const payload: SaveUserPayload = {
      id: formData.id,
      name,
      username,
      description: formData.description.trim(),
      careerId: formData.role === 'DOCENTE' ? formData.careerId : '',
      role: formData.role,
      active: formData.active,
      assignmentPending: formData.role === 'DOCENTE' ? formData.assignmentPending : false,
      assignments: formData.role === 'DOCENTE' ? formData.assignments : [],
      version: formData.version,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    setIsSubmitting(true);

    try {
      await apiClient.saveUser(payload);
      setSuccessMsg(
        isEditing
          ? `Cuenta "${username}" actualizada exitosamente.`
          : `Cuenta "${username}" creada exitosamente.`
      );
      setIsFormDirty(false);
      setIsDrawerOpen(false);
      await loadData(true);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        setConflictMsg(apiErr.error || 'La cuenta cambió en otra sesión. Por favor recargue antes de actualizar.');
      } else {
        setFormError(apiErr.error || 'Ocurrió un error al guardar la cuenta institucional.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de archivación
  const handleOpenArchiveModal = (targetUser: PublicUser) => {
    if (targetUser.id === currentUser?.id) {
      setErrorMsg('No puede eliminar ni archivar la cuenta con la que ha iniciado sesión.');
      return;
    }
    if (isSecretaria && targetUser.role !== 'DOCENTE') {
      setErrorMsg('Secretaría solo tiene autorización para archivar cuentas docentes.');
      return;
    }

    setArchiveModal({
      isOpen: true,
      user: targetUser,
      reason: '',
      replacementTeacherId: '',
      isSubmitting: false,
      error: null,
    });
  };

  // Confirmar archivación / baja
  const handleConfirmArchive = async () => {
    if (!archiveModal.user) return;
    const reason = archiveModal.reason.trim();
    if (!reason) {
      setArchiveModal((prev) => ({ ...prev, error: 'Debe ingresar el motivo de archivación o baja institucional.' }));
      return;
    }

    setArchiveModal((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const payload: ArchiveUserPayload = {
        id: archiveModal.user.id,
        version: archiveModal.user.version,
        reason,
        ...(archiveModal.replacementTeacherId ? { replacementTeacherId: archiveModal.replacementTeacherId } : {}),
      };
      await apiClient.archiveUser(payload);
      setSuccessMsg(
        archiveModal.replacementTeacherId
          ? `Cuenta "${archiveModal.user.username}" archivada y sus aulas fueron transferidas al docente reemplazante.`
          : `Cuenta "${archiveModal.user.username}" archivada y dada de baja.`
      );
      setArchiveModal({ isOpen: false, user: null, reason: '', replacementTeacherId: '', isSubmitting: false, error: null });
      await loadData(true);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setArchiveModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: apiErr.error || 'Error al archivar la cuenta.',
      }));
    }
  };

  // Mapear nombres de grupos para previsualizaciones
  const getGroupName = (groupId: string): string => {
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) return groupId;
    return String(grp.name || grp.code || groupId);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* 1. Encabezado institucional */}
      <DashboardPhotoBand as="header" scene="direccion" className="mb-6" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge size="sm" />
            <span className="text-muted">/</span>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Administración de Personal
            </span>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center shadow-[var(--ui-shadow)] shrink-0">
              <AccountsIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[30px] leading-[36px] font-bold text-ink tracking-tight">
                Gestión de Cuentas, Usuarios y Asignaciones
              </h1>
              <p className="text-xs text-muted font-medium">
                {isDirector && 'Directorio institucional de cuentas, asignaciones docentes y credenciales de acceso local.'}
                {isSecretaria && 'Administración y asignación académica de cuentas docentes autorizadas.'}
                {isDocente && 'Ficha de cuenta institucional y aulas lectivas asignadas a su cargo.'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {lastUpdatedTime && (
            <span className="text-[11px] font-medium text-muted bg-surface-alt border border-line px-2.5 py-1 rounded-full tabular-nums">
              Actualizado: {lastUpdatedTime}
            </span>
          )}

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-[10px] bg-surface border border-line text-ink text-xs font-semibold hover:border-brand transition-colors shadow-[var(--ui-shadow)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            title="Recargar directorio de usuarios"
          >
            <RefreshIcon className={`w-3.5 h-3.5 text-brand ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>

          {canManageAccounts && (
            <button
              type="button"
              id="btn-nueva-cuenta"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-[10px] bg-brand text-on-brand text-xs font-semibold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span>+ Nueva Cuenta</span>
            </button>
          )}
        </div>
      </DashboardPhotoBand>

      {/* Alertas globales */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 text-xs font-medium flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="min-w-[44px] min-h-[44px] rounded-[10px] text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Cerrar error"
          >
            ✕
          </button>
        </div>
      )}

      {conflictMsg && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200 text-xs font-medium flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircleIcon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">Conflicto de concurrencia detectado (HTTP 409)</p>
              <p>{conflictMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-3.5 min-h-[44px] rounded-[10px] bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white font-semibold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Recargar Datos
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 text-xs font-medium flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="min-w-[44px] min-h-[44px] rounded-[10px] text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Tarjetas de métricas rápidas (Solo para Directivos) */}
      {canManageAccounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-surface p-4 rounded-2xl border border-line shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
              {isSecretaria ? 'Docentes Registrados' : 'Cuentas Totales'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink tabular-nums">
                {isSecretaria ? stats.docentes : stats.total}
              </span>
              <span className="text-xs text-muted font-medium">cuentas</span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-line shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Cuentas Activas
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">{stats.activos}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">habilitadas</span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-line shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-brand uppercase tracking-wider block mb-1">
              Docentes con Aula
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand tabular-nums">{stats.conAsignacion}</span>
              <span className="text-xs text-muted font-medium">asignados</span>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-line shadow-[var(--ui-shadow)]">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Asignación Pendiente
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-800 dark:text-amber-300 tabular-nums">{stats.pendientes}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">provisionales</span>
            </div>
          </div>
        </div>
      )}

      {/* 2B. Resumen de Docentes por Categoría de Carrera */}
      {canManageAccounts && careerSummary.rows.length > 0 && (
        <div className="mb-6 bg-surface p-4 rounded-2xl border border-line shadow-[var(--ui-shadow)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-brand uppercase tracking-wider block">
                Distribución de Docentes por Carrera
              </span>
              <p className="text-xs text-muted">
                Haga clic en una especialidad para filtrar la nómina docente y revisar vacantes por carrera.
              </p>
            </div>
            {careerFilter !== 'TODOS' && (
              <button
                type="button"
                onClick={() => setCareerFilter('TODOS')}
                className="min-h-[36px] px-3 py-1 rounded-[10px] border border-line bg-surface-alt text-xs font-bold text-ink hover:border-brand cursor-pointer"
              >
                Ver todas las carreras
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {careerSummary.rows.map((c) => {
              const selected = careerFilter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCareerFilter((prev) => (prev === c.id ? 'TODOS' : c.id))}
                  aria-pressed={selected}
                  className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-brand text-on-brand border-brand shadow-[var(--ui-shadow)]'
                      : 'bg-surface-alt text-ink border-line hover:border-brand'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold block line-clamp-2 min-h-[30px] ${
                      selected ? 'text-on-brand' : 'text-ink'
                    }`}
                    title={c.name}
                  >
                    {c.name}
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between gap-1 tabular-nums">
                    <span className={`text-lg font-extrabold ${selected ? 'text-on-brand' : 'text-brand'}`}>
                      {c.count}
                    </span>
                    <span className={`text-[10px] font-semibold ${selected ? 'text-on-brand/85' : 'text-muted'}`}>
                      docente{c.count === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {careerSummary.unassignedCareerCount > 0 && (
            <div className="text-[11px] text-amber-800 dark:text-amber-300">
              {careerSummary.unassignedCareerCount} docente(s) activo(s) aún no tienen categoría de carrera asignada.
            </div>
          )}
        </div>
      )}

      {/* 3. VISTA PARA DOCENTE: Solo lectura de su perfil y aulas */}
      {isDocente && (
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-line shadow-[var(--ui-shadow)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-line">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center font-bold text-xl shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-ink truncate">{currentUser?.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-brand border border-brand/20">
                      DOCENTE
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5">@{currentUser?.username}</p>
                  {currentUser?.description && (
                    <p className="text-xs text-muted mt-1 max-w-xl">{currentUser.description}</p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] text-muted block">Versión de cuenta</span>
                <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                  v{currentUser?.version || 1}
                </span>
              </div>
            </div>

            {/* Aulas asignadas al docente */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
                <GroupsIcon className="w-4 h-4 text-brand" />
                <span className="tabular-nums">Aulas y Unidades Didácticas Asignadas ({currentUser?.assignments?.length || 0})</span>
              </h3>

              {currentUser?.assignments && currentUser.assignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {currentUser.assignments.map((asg, idx) => {
                    const grp = groups.find((g) => g.id === asg.groupId);
                    return (
                      <div
                        key={`${asg.groupId}-${idx}`}
                        className="p-4 rounded-2xl bg-surface-alt border border-line"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-ink block truncate">
                              {grp?.name || (asg.programId ? `${asg.programId} - ${asg.moduleId}` : `Aula ${asg.groupId.slice(0, 10)}...`)}
                            </span>
                            <span className="text-[11px] text-muted font-medium">
                              Sección: {asg.section || grp?.section || 'Única'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-muted border border-line shrink-0 tabular-nums">
                            {asg.units.length} {asg.units.length === 1 ? 'unidad' : 'unidades'}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-line">
                          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                            Unidades autorizadas:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {asg.units.map((unitName) => (
                              <span
                                key={unitName}
                                className="px-2 py-0.5 rounded-[10px] text-[10px] font-medium bg-surface text-ink border border-line"
                              >
                                {unitName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center justify-center gap-1.5">
                    <AlertCircleIcon className="w-4 h-4 shrink-0" />
                    <span>Su cuenta no tiene aulas asignadas actualmente.</span>
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                    Comuníquese con Dirección o Secretaría para que asignen sus grupos y unidades didácticas.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-brand-soft border border-brand/15 text-xs text-muted">
              <span className="font-bold text-brand block mb-1">Nota Institucional</span>
              Las cuentas docentes cuentan con permisos de solo lectura para la administración de personal.
              Para gestionar cambios de clave o asignaciones lectivas, recurra a la Secretaría Académica.
            </div>
          </div>
        </div>
      )}

      {/* 4. VISTA PARA DIRECTIVOS (DIRECTOR Y SECRETARIA): Directorio de Cuentas */}
      {canManageAccounts && (
        <div className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] overflow-hidden">
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 sm:p-5 border-b border-line flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Input de Búsqueda */}
            <div className="relative flex-1 max-w-md min-w-0">
              <SearchIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o usuario..."
                className="w-full min-h-[44px] pl-9 pr-3.5 py-2 text-xs rounded-[10px] border border-line bg-surface-alt text-ink placeholder:text-muted focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all"
              />
            </div>

            {/* Selectores de Filtro */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Rol (Director puede filtrar todos, Secretaría bloqueada a Docente) */}
              {isDirector ? (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="min-h-[44px] text-xs rounded-[10px] border border-line bg-surface px-3 py-2 text-ink font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="DOCENTE">Docentes</option>
                  <option value="SECRETARIA">Secretaría</option>
                  <option value="DIRECTOR">Dirección</option>
                </select>
              ) : (
                <span className="min-h-[44px] inline-flex items-center text-xs font-semibold px-3 py-2 rounded-[10px] bg-surface-alt text-muted border border-line">
                  Rol: DOCENTE
                </span>
              )}

              {/* Filtro por Carrera */}
              <select
                value={careerFilter}
                onChange={(e) => setCareerFilter(e.target.value)}
                aria-label="Filtrar por categoría de carrera"
                className="min-h-[44px] text-xs rounded-[10px] border border-line bg-surface px-3 py-2 text-ink font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand max-w-[230px]"
              >
                <option value="TODOS">Todas las carreras</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre || p.name || p.id}
                  </option>
                ))}
                <option value="SIN_CARRERA">Sin carrera asignada</option>
              </select>

              {/* Filtro por Estado */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'TODOS' | 'ACTIVOS' | 'INACTIVOS')}
                className="min-h-[44px] text-xs rounded-[10px] border border-line bg-surface px-3 py-2 text-ink font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVOS">Solo Activos</option>
                <option value="INACTIVOS">Solo Inactivos</option>
              </select>

              {/* Filtro por Asignación */}
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as 'TODOS' | 'CON_AULA' | 'PENDIENTES')}
                className="min-h-[44px] text-xs rounded-[10px] border border-line bg-surface px-3 py-2 text-ink font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="TODOS">Todas las asignaciones</option>
                <option value="CON_AULA">Con aula asignada</option>
                <option value="PENDIENTES">Asignación pendiente</option>
              </select>
            </div>
          </div>

          {/* Tabla de Directorio */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-line text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario / Nombre</th>
                  <th className="py-3 px-4">Rol Institucional</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Aulas y Unidades Asignadas</th>
                  <th className="py-3 px-4 text-center">Versión</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshIcon className="w-4 h-4 animate-spin text-brand" />
                        <span>Cargando directorio institucional de cuentas...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      <p className="font-bold text-ink text-sm">No se encontraron cuentas</p>
                      <span className="text-xs text-muted mt-1 block">
                        No existen cuentas de usuario que coincidan con los filtros seleccionados.
                      </span>
                      {(searchQuery || roleFilter !== 'TODOS' || careerFilter !== 'TODOS' || statusFilter !== 'TODOS' || assignmentFilter !== 'TODOS') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setRoleFilter('TODOS');
                            setCareerFilter('TODOS');
                            setStatusFilter('TODOS');
                            setAssignmentFilter('TODOS');
                          }}
                          className="mt-3 px-3.5 min-h-[44px] rounded-[10px] bg-surface-alt border border-line text-ink text-xs font-bold hover:border-brand transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          Limpiar filtros
                        </button>
                      ) : canManageAccounts ? (
                        <button
                          type="button"
                          onClick={handleOpenCreate}
                          className="mt-3 px-4 min-h-[44px] rounded-[10px] bg-brand text-on-brand text-xs font-bold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          + Registrar nueva cuenta docente
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const canEdit = isDirector || (isSecretaria && u.role === 'DOCENTE');
                    const canArchive = canEdit && !isSelf;

                    return (
                      <tr key={u.id} className="hover:bg-surface-alt/60 transition-colors">
                        {/* Usuario y Nombre */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-[10px] bg-surface-alt border border-line text-ink flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-ink truncate">{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-alt border border-line text-muted shrink-0">
                                    TÚ
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-muted">@{u.username}</span>
                              {u.description && (
                                <p className="text-[11px] text-muted line-clamp-1 max-w-xs">{u.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.role === 'DIRECTOR' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              DIRECTOR
                            </span>
                          )}
                          {u.role === 'SECRETARIA' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              SECRETARÍA
                            </span>
                          )}
                          {u.role === 'DOCENTE' && (
                            <div className="space-y-1">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-soft text-brand border border-brand/20 inline-block">
                                DOCENTE
                              </span>
                              {(() => {
                                const cid = resolveUserCareerId(u);
                                return cid ? (
                                  <span className="block text-[11px] font-semibold text-ink max-w-[190px] truncate" title={getProgramName(cid)}>
                                    {getProgramName(cid)}
                                  </span>
                                ) : (
                                  <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                                    Sin carrera
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                              Inactivo / Baja
                            </span>
                          )}
                        </td>

                        {/* Asignaciones */}
                        <td className="py-3.5 px-4">
                          {u.role === 'DOCENTE' ? (
                            u.assignmentPending ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>Asignación pendiente</span>
                              </span>
                            ) : u.assignments && u.assignments.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-sm">
                                {u.assignments.map((asg, idx) => (
                                  <span
                                    key={`${asg.groupId}-${idx}`}
                                    className="px-2 py-0.5 rounded-[10px] bg-surface-alt text-ink text-[10px] font-medium border border-line"
                                    title={`Unidades: ${asg.units.join(', ')}`}
                                  >
                                    {getGroupName(asg.groupId)} ({asg.units.length} un.)
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted text-[11px] italic">Sin aulas registradas</span>
                            )
                          ) : (
                            <span className="text-muted text-[11px]">Acceso institucional global</span>
                          )}
                        </td>

                        {/* Versión */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-muted whitespace-nowrap tabular-nums">
                          v{u.version}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                className="px-3 min-h-[44px] rounded-[10px] text-xs font-semibold text-brand bg-brand-soft hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                              >
                                Editar / Asignar
                              </button>
                            )}

                            {canArchive && (
                              <button
                                type="button"
                                onClick={() => handleOpenArchiveModal(u)}
                                className="px-3 min-h-[44px] rounded-[10px] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                title="Archivar o dar de baja"
                              >
                                Dar de baja
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. DRAWER / MODAL: Creación y Edición de Cuenta */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-drawer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setIsDrawerOpen(false);
            }
          }}
        >
          <div
            ref={drawerPanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel w-full max-w-2xl bg-surface h-full !max-h-full !rounded-none sm:!rounded-l-2xl shadow-[var(--ui-shadow)] flex flex-col justify-between overflow-y-auto focus:outline-none"
          >
            {/* Header del Drawer */}
            <div className="p-6 border-b border-line flex items-center justify-between sticky top-0 bg-surface z-10 gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-wider text-brand uppercase block">
                  {isEditing ? 'Actualización Institucional' : 'Alta de Nuevo Personal'}
                </span>
                <h2 id="account-drawer-title" className="text-xl font-bold text-ink truncate">
                  {isEditing ? `Editar Cuenta: @${formData.username}` : 'Registrar Nueva Cuenta'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                disabled={isSubmitting}
                className="min-w-[44px] min-h-[44px] rounded-[10px] bg-surface-alt border border-line hover:border-brand text-ink flex items-center justify-center text-sm font-bold transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Cerrar panel de cuenta"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmitUser} className="p-6 space-y-5 flex-1">
              {formError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datos Generales */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                  1. Datos de Identidad
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre Completo */}
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Nombre Completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        setIsFormDirty(true);
                      }}
                      placeholder="Ej. Mg. Carlos Ramírez"
                      className="w-full min-h-[44px] text-xs rounded-[10px] border border-line px-3.5 py-2.5 bg-surface-alt text-ink placeholder:text-muted focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    />
                  </div>

                  {/* Nombre de Usuario */}
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Usuario de Inicio de Sesión <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditing}
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value.toLowerCase().trim() });
                        setIsFormDirty(true);
                      }}
                      placeholder="Ej. carlos.ramirez"
                      className="w-full min-h-[44px] text-xs rounded-[10px] border border-line px-3.5 py-2.5 bg-surface-alt text-ink placeholder:text-muted focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                {/* Rol Institucional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Rol Institucional <span className="text-rose-500">*</span>
                    </label>
                    {isSecretaria ? (
                      <div className="min-h-[44px] flex items-center px-3.5 py-2.5 rounded-[10px] bg-surface-alt border border-line text-xs font-semibold text-muted">
                        DOCENTE (Restringido por Secretaría)
                      </div>
                    ) : (
                      <select
                        value={formData.role}
                        onChange={(e) => {
                          setFormData({ ...formData, role: e.target.value as UserRole });
                          setIsFormDirty(true);
                        }}
                        className="w-full min-h-[44px] text-xs rounded-[10px] border border-line px-3.5 py-2.5 bg-surface text-ink font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <option value="DOCENTE">DOCENTE</option>
                        <option value="SECRETARIA">SECRETARIA</option>
                        <option value="DIRECTOR">DIRECTOR</option>
                      </select>
                    )}
                  </div>

                  {/* Estado Activo */}
                  <div className="flex items-center pt-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => {
                          setFormData({ ...formData, active: e.target.checked });
                          setIsFormDirty(true);
                        }}
                        className="rounded border-line text-brand focus:ring-brand"
                      />
                      <span className="text-xs font-semibold text-ink">
                        Cuenta habilitada para inicio de sesión
                      </span>
                    </label>
                  </div>
                </div>

                {/* Categoría de Carrera (Docente) */}
                {formData.role === 'DOCENTE' && programs.length > 0 && (
                  <div>
                    <label htmlFor="account-career-select" className="block text-xs font-semibold text-ink mb-1">
                      Categoría de Carrera / Especialidad
                    </label>
                    <select
                      id="account-career-select"
                      value={formData.careerId}
                      onChange={(e) => {
                        const nextCareer = e.target.value;
                        const careerName = nextCareer ? getProgramName(nextCareer) : '';
                        setFormData((prev) => ({
                          ...prev,
                          careerId: nextCareer,
                          description:
                            !prev.description.trim() && careerName
                              ? `Prof. de Aula · ${careerName}`
                              : prev.description,
                        }));
                        setIsFormDirty(true);
                      }}
                      className="w-full min-h-[44px] text-xs rounded-[10px] border border-line px-3.5 py-2.5 bg-surface text-ink font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <option value="">-- Seleccione categoría de carrera --</option>
                      {programs.map((p) => {
                        const cnt = careerSummary.rows.find((r) => r.id === p.id)?.count ?? 0;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre || p.name || p.id} ({cnt} docente{cnt === 1 ? '' : 's'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Descripción / Cargo */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Cargo o Especialidad Institucional
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="Ej. Docente del Programa de Computación e Informática..."
                    className="w-full text-xs rounded-[10px] border border-line px-3.5 py-2 bg-surface-alt text-ink placeholder:text-muted focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                {/* Contraseña */}
                <div className="p-4 rounded-2xl bg-surface-alt border border-line">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <LockIcon className="w-3.5 h-3.5 text-muted" />
                      <span>{isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="min-h-[44px] px-2 rounded-[10px] text-[11px] font-semibold text-brand hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder={
                      isEditing
                        ? 'Dejar en blanco para mantener la clave actual'
                        : 'Mínimo 6 caracteres'
                    }
                    className="w-full min-h-[44px] text-xs rounded-[10px] border border-line px-3.5 py-2.5 bg-surface text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    {isEditing
                      ? 'Ingrese una nueva clave únicamente si desea restablecer el acceso del usuario.'
                      : 'Esta clave será solicitada en el primer inicio de sesión del usuario en este nodo.'}
                  </p>
                </div>
              </div>

              {/* 2. Sección de Asignaciones (Solo cuando el rol es DOCENTE) */}
              {formData.role === 'DOCENTE' && (
                <div className="space-y-4 pt-4 border-t border-line">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
                      <GroupsIcon className="w-4 h-4" />
                      <span>2. Asignación de Aulas y Unidades Didácticas</span>
                    </h3>

                    {/* Checkbox de Asignación Pendiente */}
                    <label className="inline-flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={formData.assignmentPending}
                        onChange={(e) => {
                          setFormData({ ...formData, assignmentPending: e.target.checked });
                          setIsFormDirty(true);
                        }}
                        className="rounded border-line text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                        Marcar como asignación pendiente (Provisional)
                      </span>
                    </label>
                  </div>

                  {/* Panel de incorporación de nueva aula */}
                  <div className="p-4 rounded-2xl bg-brand-soft border border-brand/20 space-y-3">
                    <span className="text-[11px] font-bold text-brand uppercase tracking-wider block">
                      ＋ Incorporar Aula a la Ficha Docente
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-ink mb-1">
                          Seleccionar Grupo / Aula Institucional
                        </label>
                        <select
                          value={assignGroupId}
                          onChange={(e) => handleAssignGroupChange(e.target.value)}
                          className="w-full min-h-[44px] text-xs rounded-[10px] border border-line px-3 py-2 bg-surface text-ink font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <option value="">-- Elija un aula disponible --</option>
                          {groups
                            .slice()
                            .sort((a, b) => {
                              const aMatch = formData.careerId && a.programId === formData.careerId ? 0 : 1;
                              const bMatch = formData.careerId && b.programId === formData.careerId ? 0 : 1;
                              if (aMatch !== bMatch) return aMatch - bMatch;
                              return String(a.name || a.id).localeCompare(String(b.name || b.id));
                            })
                            .map((g) => {
                              const owners = (groupOwnersByGroup.get(g.id) || []).filter(
                                (name) => name !== formData.name
                              );
                              const isMatch = formData.careerId && g.programId === formData.careerId;
                              return (
                                <option key={g.id} value={g.id}>
                                  {isMatch ? '★ ' : ''}
                                  {String(g.name || g.code || g.id)} ({String(g.turno || 'Turno Regular')})
                                  {owners.length ? ` — Docente actual: ${owners.join(', ')}` : ' — Sin docente'}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {/* Unidades didácticas del grupo */}
                      {assignGroupId && (
                        <div>
                          <label className="block text-[11px] font-semibold text-ink mb-1">
                            Unidades del Grupo a Asignar
                          </label>
                          {(() => {
                            const currentGrp = groups.find((g) => g.id === assignGroupId);
                            const grpUnits = currentGrp?.units || [];
                            if (!grpUnits.length) {
                              return (
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                                  Este grupo no tiene unidades didácticas configuradas.
                                </p>
                              );
                            }
                            return (
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-surface rounded-[10px] border border-line">
                                {grpUnits.map((unitName) => {
                                  const isChecked = assignUnits.includes(unitName);
                                  return (
                                    <button
                                      key={unitName}
                                      type="button"
                                      onClick={() => handleToggleUnitForAssign(unitName)}
                                      className={`px-2.5 py-1.5 rounded-[10px] text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                        isChecked
                                          ? 'bg-brand text-on-brand'
                                          : 'bg-surface-alt text-ink hover:border-brand border border-line'
                                      }`}
                                    >
                                      {isChecked ? '✓ ' : '+ '}
                                      {unitName}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddAssignment}
                        disabled={!assignGroupId || !assignUnits.length}
                        className="px-4 min-h-[44px] rounded-[10px] bg-brand text-on-brand text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        Asignar Aula y Unidades
                      </button>
                    </div>
                  </div>

                  {/* Listado de asignaciones actuales en la ficha */}
                  <div>
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-2 tabular-nums">
                      Aulas Asignadas a esta Ficha ({formData.assignments.length})
                    </span>

                    {formData.assignments.length === 0 ? (
                      <p className="text-xs text-muted italic py-2">
                        No hay aulas asignadas actualmente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {formData.assignments.map((asg) => (
                          <div
                            key={asg.groupId}
                            className="p-3 rounded-xl bg-surface-alt border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-ink block truncate">
                                {getGroupName(asg.groupId)}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {asg.units.map((unitName) => (
                                  <span
                                    key={unitName}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[10px] bg-surface text-ink border border-line"
                                  >
                                    <span>{unitName}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUnitFromAssignment(asg.groupId, unitName)}
                                      className="text-muted hover:text-rose-600 font-bold ml-0.5 px-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                      title="Quitar esta unidad"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(asg.groupId)}
                              className="min-h-[44px] px-3 rounded-[10px] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 self-end sm:self-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              Quitar Aula
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botones de acción del formulario */}
              <div className="pt-6 border-t border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 min-h-[44px] rounded-[10px] border border-line bg-surface-alt text-ink text-xs font-semibold hover:border-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 min-h-[44px] rounded-[10px] bg-brand text-on-brand text-xs font-semibold hover:opacity-90 transition-opacity shadow-[var(--ui-shadow)] flex items-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Actualizar Cuenta' : 'Crear Cuenta'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Confirmación de Archivación / Baja */}
      {archiveModal.isOpen && archiveModal.user && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !archiveModal.isSubmitting) {
              setArchiveModal({ isOpen: false, user: null, reason: '', replacementTeacherId: '', isSubmitting: false, error: null });
            }
          }}
        >
          <div
            ref={archivePanelRef}
            tabIndex={-1}
            className="cepro-dialog-panel bg-surface rounded-2xl max-w-md w-full p-6 shadow-[var(--ui-shadow)] border border-line animate-in zoom-in-95 duration-200 focus:outline-none"
          >
            <div className="flex items-center gap-3 mb-4 min-w-0">
              <div className="w-10 h-10 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 id="archive-modal-title" className="text-base font-bold text-ink">
                  Dar de Baja / Archivar Cuenta
                </h3>
                <p className="text-xs text-muted truncate">
                  @{archiveModal.user.username} — {archiveModal.user.name}
                </p>
              </div>
            </div>

            {archiveModal.error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{archiveModal.error}</span>
              </div>
            )}

            <p className="text-xs text-muted mb-4 leading-relaxed">
              Esta acción desactivará la cuenta institucional y retirará sus permisos activos de inicio de sesión.
              Para proceder, indique el motivo oficial de la baja:
            </p>

            {archiveModal.user.role === 'DOCENTE' && (archiveModal.user.assignments || []).length > 0 && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Aulas activas a cargo ({archiveModal.user.assignments.length}):{' '}
                  <span className="font-normal">
                    {archiveModal.user.assignments.map((a) => getGroupName(a.groupId)).join(' · ')}
                  </span>
                </div>
                <div>
                  <label htmlFor="archive-replacement-teacher" className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                    Reasignar sus aulas a un docente reemplazante (opcional)
                  </label>
                  <select
                    id="archive-replacement-teacher"
                    value={archiveModal.replacementTeacherId}
                    onChange={(e) =>
                      setArchiveModal((prev) => ({
                        ...prev,
                        replacementTeacherId: e.target.value,
                        error: null,
                      }))
                    }
                    className="w-full min-h-[42px] text-xs rounded-[10px] border border-amber-300 dark:border-amber-700 px-3 py-2 bg-surface text-ink font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">-- Dejar aulas liberadas sin titular por ahora --</option>
                    {users
                      .filter(
                        (candidate) =>
                          candidate.role === 'DOCENTE' &&
                          candidate.active &&
                          !candidate.archived &&
                          candidate.id !== archiveModal.user?.id
                      )
                      .sort((a, b) => {
                        const outCareer = resolveUserCareerId(archiveModal.user!);
                        const aMatch = outCareer && resolveUserCareerId(a) === outCareer ? 0 : 1;
                        const bMatch = outCareer && resolveUserCareerId(b) === outCareer ? 0 : 1;
                        if (aMatch !== bMatch) return aMatch - bMatch;
                        return a.name.localeCompare(b.name);
                      })
                      .map((candidate) => {
                        const cid = resolveUserCareerId(candidate);
                        return (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name} (@{candidate.username})
                            {cid ? ` — ${getProgramName(cid)}` : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-semibold text-ink mb-1">
                Motivo de Baja o Retiro <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={archiveModal.reason}
                onChange={(e) =>
                  setArchiveModal((prev) => ({ ...prev, reason: e.target.value, error: null }))
                }
                placeholder="Ej. Cese de contrato docente por fin de periodo lectivo..."
                className="w-full text-xs rounded-[10px] border border-line p-3 bg-surface-alt text-ink placeholder:text-muted focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() =>
                  setArchiveModal({ isOpen: false, user: null, reason: '', replacementTeacherId: '', isSubmitting: false, error: null })
                }
                disabled={archiveModal.isSubmitting}
                className="px-4 min-h-[44px] rounded-[10px] border border-line bg-surface-alt text-ink text-xs font-semibold hover:border-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={archiveModal.isSubmitting}
                className="px-4 min-h-[44px] rounded-[10px] bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-[var(--ui-shadow)] flex items-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {archiveModal.isSubmitting ? (
                  <>
                    <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Archivando...</span>
                  </>
                ) : (
                  <span>Confirmar Baja</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCuentas;
