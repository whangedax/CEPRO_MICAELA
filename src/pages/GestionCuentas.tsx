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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Filtros de tabla
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
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
    isSubmitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    user: null,
    reason: '',
    isSubmitting: false,
    error: null,
  });

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
        // Cargar usuarios y catálogo de grupos institucionales
        const [usersData, dashboardData] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getDashboard(undefined, true),
        ]);
        setUsers(usersData || []);
        setGroups(dashboardData.groups || []);
      } else {
        // Docente: solo carga sus grupos asignados para consulta
        const dashboardData = await apiClient.getDashboard(undefined, false);
        setGroups(dashboardData.groups || []);
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
  }, [users, searchQuery, roleFilter, statusFilter, assignmentFilter, isSecretaria]);

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
    setFormData({
      ...INITIAL_FORM,
      role: isSecretaria ? 'DOCENTE' : 'DOCENTE',
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
      };
      await apiClient.archiveUser(payload);
      setSuccessMsg(`Cuenta "${archiveModal.user.username}" archivada y dada de baja.`);
      setArchiveModal({ isOpen: false, user: null, reason: '', isSubmitting: false, error: null });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge size="sm" />
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Administración de Personal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] text-[#13594A] flex items-center justify-center shadow-xs">
              <AccountsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Gestión de Cuentas, Usuarios y Asignaciones
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isDirector && 'Directorio institucional de cuentas, asignaciones docentes y credenciales de acceso local.'}
                {isSecretaria && 'Administración y asignación académica de cuentas docentes autorizadas.'}
                {isDocente && 'Ficha de cuenta institucional y aulas lectivas asignadas a su cargo.'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex items-center gap-2.5">
          {lastUpdatedTime && (
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              Actualizado: {lastUpdatedTime}
            </span>
          )}

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            title="Recargar directorio de usuarios"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>

          {canManageAccounts && (
            <button
              type="button"
              id="btn-nueva-cuenta"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#13594A] text-white text-xs font-semibold hover:bg-[#0D3E34] transition-colors shadow-xs"
            >
              <span>+ Nueva Cuenta</span>
            </button>
          )}
        </div>
      </div>

      {/* Alertas globales */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {conflictMsg && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">Conflicto de concurrencia detectado (HTTP 409)</p>
              <p>{conflictMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors shrink-0"
          >
            Recargar Datos
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Tarjetas de métricas rápidas (Solo para Directivos) */}
      {canManageAccounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              {isSecretaria ? 'Docentes Registrados' : 'Cuentas Totales'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {isSecretaria ? stats.docentes : stats.total}
              </span>
              <span className="text-xs text-slate-400 font-medium">cuentas</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
              Cuentas Activas
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-800">{stats.activos}</span>
              <span className="text-xs text-emerald-600 font-medium">habilitadas</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-[#13594A] uppercase tracking-wider block mb-1">
              Docentes con Aula
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#13594A]">{stats.conAsignacion}</span>
              <span className="text-xs text-slate-400 font-medium">asignados</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
              Asignación Pendiente
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-800">{stats.pendientes}</span>
              <span className="text-xs text-amber-600 font-medium">provisionales</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. VISTA PARA DOCENTE: Solo lectura de su perfil y aulas */}
      {isDocente && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E6F4F1] text-[#13594A] flex items-center justify-center font-bold text-xl">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{currentUser?.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4F1] text-[#13594A] border border-[#13594A]/20">
                      DOCENTE
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">@{currentUser?.username}</p>
                  {currentUser?.description && (
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">{currentUser.description}</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Versión de cuenta</span>
                <span className="font-mono text-xs font-semibold text-slate-700">
                  v{currentUser?.version || 1}
                </span>
              </div>
            </div>

            {/* Aulas asignadas al docente */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <GroupsIcon className="w-4 h-4 text-[#13594A]" />
                <span>Aulas y Unidades Didácticas Asignadas ({currentUser?.assignments?.length || 0})</span>
              </h3>

              {currentUser?.assignments && currentUser.assignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {currentUser.assignments.map((asg, idx) => {
                    const grp = groups.find((g) => g.id === asg.groupId);
                    return (
                      <div
                        key={`${asg.groupId}-${idx}`}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {grp?.name || asg.groupId}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Sección: {asg.section || grp?.section || 'Única'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                            {asg.units.length} {asg.units.length === 1 ? 'unidad' : 'unidades'}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Unidades autorizadas:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {asg.units.map((unitName) => (
                              <span
                                key={unitName}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
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
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-xs font-bold text-amber-900">
                    ⚠ Su cuenta no tiene aulas asignadas actualmente.
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    Comuníquese con Dirección o Secretaría para que asignen sus grupos y unidades didácticas.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-[#E6F4F1]/60 border border-[#13594A]/10 text-xs text-slate-600">
              <span className="font-bold text-[#13594A] block mb-1">Nota Institucional</span>
              Las cuentas docentes cuentan con permisos de solo lectura para la administración de personal.
              Para gestionar cambios de clave o asignaciones lectivas, recurra a la Secretaría Académica.
            </div>
          </div>
        </div>
      )}

      {/* 4. VISTA PARA DIRECTIVOS (DIRECTOR Y SECRETARIA): Directorio de Cuentas */}
      {canManageAccounts && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Input de Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o usuario..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]/20 focus:border-[#13594A] transition-all"
              />
            </div>

            {/* Selectores de Filtro */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Rol (Director puede filtrar todos, Secretaría bloqueada a Docente) */}
              {isDirector ? (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="DOCENTE">Docentes</option>
                  <option value="SECRETARIA">Secretaría</option>
                  <option value="DIRECTOR">Dirección</option>
                </select>
              ) : (
                <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  Rol: DOCENTE
                </span>
              )}

              {/* Filtro por Estado */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'TODOS' | 'ACTIVOS' | 'INACTIVOS')}
                className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVOS">Solo Activos</option>
                <option value="INACTIVOS">Solo Inactivos</option>
              </select>

              {/* Filtro por Asignación */}
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as 'TODOS' | 'CON_AULA' | 'PENDIENTES')}
                className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
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
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario / Nombre</th>
                  <th className="py-3 px-4">Rol Institucional</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Aulas y Unidades Asignadas</th>
                  <th className="py-3 px-4 text-center">Versión</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshIcon className="w-4 h-4 animate-spin text-[#13594A]" />
                        <span>Cargando directorio institucional de cuentas...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No se encontraron cuentas que coincidan con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const canEdit = isDirector || (isSecretaria && u.role === 'DOCENTE');
                    const canArchive = canEdit && !isSelf;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Usuario y Nombre */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                    TÚ
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-slate-500">@{u.username}</span>
                              {u.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{u.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.role === 'DIRECTOR' && (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              DIRECTOR
                            </span>
                          )}
                          {u.role === 'SECRETARIA' && (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              SECRETARÍA
                            </span>
                          )}
                          {u.role === 'DOCENTE' && (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#E6F4F1] text-[#13594A] border border-[#13594A]/20">
                              DOCENTE
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              Inactivo / Baja
                            </span>
                          )}
                        </td>

                        {/* Asignaciones */}
                        <td className="py-3.5 px-4">
                          {u.role === 'DOCENTE' ? (
                            u.assignmentPending ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                                ⚠ Asignación pendiente
                              </span>
                            ) : u.assignments && u.assignments.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-sm">
                                {u.assignments.map((asg, idx) => (
                                  <span
                                    key={`${asg.groupId}-${idx}`}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/80"
                                    title={`Unidades: ${asg.units.join(', ')}`}
                                  >
                                    {getGroupName(asg.groupId)} ({asg.units.length} un.)
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Sin aulas registradas</span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px]">Acceso institucional global</span>
                          )}
                        </td>

                        {/* Versión */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          v{u.version}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#13594A] bg-[#E6F4F1] hover:bg-[#d1eae5] transition-colors"
                              >
                                Editar / Asignar
                              </button>
                            )}

                            {canArchive && (
                              <button
                                type="button"
                                onClick={() => handleOpenArchiveModal(u)}
                                className="px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
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
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Header del Drawer */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-[#13594A] uppercase block">
                  {isEditing ? 'Actualización Institucional' : 'Alta de Nuevo Personal'}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {isEditing ? `Editar Cuenta: @${formData.username}` : 'Registrar Nueva Cuenta'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmitUser} className="p-6 space-y-5 flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-medium flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datos Generales */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#13594A]">
                  1. Datos de Identidad
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre Completo */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre Completo <span className="text-red-500">*</span>
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
                      className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]/20 focus:border-[#13594A]"
                    />
                  </div>

                  {/* Nombre de Usuario */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Usuario de Inicio de Sesión <span className="text-red-500">*</span>
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
                      className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]/20 focus:border-[#13594A] disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                {/* Rol Institucional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rol Institucional <span className="text-red-500">*</span>
                    </label>
                    {isSecretaria ? (
                      <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                        DOCENTE (Restringido por Secretaría)
                      </div>
                    ) : (
                      <select
                        value={formData.role}
                        onChange={(e) => {
                          setFormData({ ...formData, role: e.target.value as UserRole });
                          setIsFormDirty(true);
                        }}
                        className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
                      >
                        <option value="DOCENTE">DOCENTE</option>
                        <option value="SECRETARIA">SECRETARIA</option>
                        <option value="DIRECTOR">DIRECTOR</option>
                      </select>
                    )}
                  </div>

                  {/* Estado Activo */}
                  <div className="flex items-center pt-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => {
                          setFormData({ ...formData, active: e.target.checked });
                          setIsFormDirty(true);
                        }}
                        className="rounded border-slate-300 text-[#13594A] focus:ring-[#13594A]"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Cuenta habilitada para inicio de sesión
                      </span>
                    </label>
                  </div>
                </div>

                {/* Descripción / Cargo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
                  />
                </div>

                {/* Contraseña */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <LockIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-semibold text-[#13594A] hover:underline flex items-center gap-1"
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
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isEditing
                      ? 'Ingrese una nueva clave únicamente si desea restablecer el acceso del usuario.'
                      : 'Esta clave será solicitada en el primer inicio de sesión del usuario en este nodo.'}
                  </p>
                </div>
              </div>

              {/* 2. Sección de Asignaciones (Solo cuando el rol es DOCENTE) */}
              {formData.role === 'DOCENTE' && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#13594A] flex items-center gap-1.5">
                      <GroupsIcon className="w-4 h-4" />
                      <span>2. Asignación de Aulas y Unidades Didácticas</span>
                    </h3>

                    {/* Checkbox de Asignación Pendiente */}
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignmentPending}
                        onChange={(e) => {
                          setFormData({ ...formData, assignmentPending: e.target.checked });
                          setIsFormDirty(true);
                        }}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[11px] font-semibold text-amber-900">
                        Marcar como asignación pendiente (Provisional)
                      </span>
                    </label>
                  </div>

                  {/* Panel de incorporación de nueva aula */}
                  <div className="p-4 rounded-2xl bg-[#E6F4F1]/40 border border-[#13594A]/15 space-y-3">
                    <span className="text-[11px] font-bold text-[#13594A] uppercase tracking-wider block">
                      ＋ Incorporar Aula a la Ficha Docente
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Seleccionar Grupo / Aula Institucional
                        </label>
                        <select
                          value={assignGroupId}
                          onChange={(e) => handleAssignGroupChange(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#13594A]/20"
                        >
                          <option value="">-- Elija un aula disponible --</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {String(g.name || g.code || g.id)} ({String(g.turno || 'Turno Regular')})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Unidades didácticas del grupo */}
                      {assignGroupId && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Unidades del Grupo a Asignar
                          </label>
                          {(() => {
                            const currentGrp = groups.find((g) => g.id === assignGroupId);
                            const grpUnits = currentGrp?.units || [];
                            if (!grpUnits.length) {
                              return (
                                <p className="text-[11px] text-amber-700 italic">
                                  Este grupo no tiene unidades didácticas configuradas.
                                </p>
                              );
                            }
                            return (
                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                                {grpUnits.map((unitName) => {
                                  const isChecked = assignUnits.includes(unitName);
                                  return (
                                    <button
                                      key={unitName}
                                      type="button"
                                      onClick={() => handleToggleUnitForAssign(unitName)}
                                      className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                        isChecked
                                          ? 'bg-[#13594A] text-white'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                        className="px-3.5 py-1.5 rounded-xl bg-[#13594A] text-white text-xs font-semibold hover:bg-[#0D3E34] transition-colors disabled:opacity-40"
                      >
                        Asignar Aula y Unidades
                      </button>
                    </div>
                  </div>

                  {/* Listado de asignaciones actuales en la ficha */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Aulas Asignadas a esta Ficha ({formData.assignments.length})
                    </span>

                    {formData.assignments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No hay aulas asignadas actualmente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {formData.assignments.map((asg) => (
                          <div
                            key={asg.groupId}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">
                                {getGroupName(asg.groupId)}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {asg.units.map((unitName) => (
                                  <span
                                    key={unitName}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white text-slate-700 border border-slate-200"
                                  >
                                    <span>{unitName}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUnitFromAssignment(asg.groupId, unitName)}
                                      className="text-slate-400 hover:text-red-600 font-bold ml-0.5"
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
                              className="text-xs font-semibold text-red-600 hover:text-red-800 self-end sm:self-center"
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
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-semibold hover:bg-[#0D3E34] transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Dar de Baja / Archivar Cuenta
                </h3>
                <p className="text-xs text-slate-500">
                  @{archiveModal.user.username} — {archiveModal.user.name}
                </p>
              </div>
            </div>

            {archiveModal.error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-medium">
                {archiveModal.error}
              </div>
            )}

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Esta acción desactivará la cuenta institucional y retirará sus permisos activos de inicio de sesión.
              Para proceder, indique el motivo oficial de la baja:
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo de Baja o Retiro <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={archiveModal.reason}
                onChange={(e) =>
                  setArchiveModal((prev) => ({ ...prev, reason: e.target.value, error: null }))
                }
                placeholder="Ej. Cese de contrato docente por fin de periodo lectivo..."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  setArchiveModal({ isOpen: false, user: null, reason: '', isSubmitting: false, error: null })
                }
                disabled={archiveModal.isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={archiveModal.isSubmitting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
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
