/**
 * src/pages/DashboardDireccion.tsx
 * 
 * Dashboard Oficial de Supervisión de Dirección — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real al backend SQLite local mediante GET /api/dashboard?overview=1:
 * - Métricas reales verificadas: Estudiantes, Matrículas activas, Grupos, Entregas pendientes, Programas y Módulos.
 * - Acciones institucionales autorizadas con navegación fluida por teclado y accesibilidad WCAG 2.2 AA.
 * - Línea visual premium Stitch (#13594A, #0D382F, #F6F8FA).
 * - Supervisión de entregas de docentes y acceso a respaldo institucional.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ModuleActionCard } from '../components/ui/ModuleActionCard';
import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../api/client';
import { DashboardResponse, SubmissionStatus } from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import ActiveUnitContextBanner from '../components/academic/ActiveUnitContextBanner';
import { isInstitutional } from '../utils/appProfile';
import {
  AcademicConfigIcon,
  AccountsIcon,
  BackupIcon,
  DocumentIcon,
  EnrollmentIcon,
  StudentsIcon,
  DeliveriesIcon,
  SyncIcon,
  DocConfigIcon,
  ArrowForwardIcon,
  CalendarIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '../components/ui/Icons';

interface DashboardDireccionProps {
  onNavigate: (route: NavRoute) => void;
}

export const DashboardDireccion: React.FC<DashboardDireccionProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeWorkspace, options, selectedGroup, selectGroupAndUnit, openSelector } = useWorkspace();
  const hasPromptedRef = useRef<boolean>(false);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-apertura del Asistente Guiado en primer ingreso si no hay espacio activo
  useEffect(() => {
    if (options && !activeWorkspace && !hasPromptedRef.current) {
      hasPromptedRef.current = true;
      openSelector(1);
    }
  }, [options, activeWorkspace, openSelector]);

  const isGlobalOverview = !activeWorkspace || Boolean(activeWorkspace.overview);
  const activeProgramName = useMemo(() => {
    if (!activeWorkspace?.programId || !options?.programs) return '';
    return options.programs.find((p) => p.id === activeWorkspace.programId)?.nombre || activeWorkspace.programId;
  }, [activeWorkspace?.programId, options?.programs]);

  const activeGroup = useMemo(() => {
    if (selectedGroup) return selectedGroup;
    if (!activeWorkspace?.groupId || !options?.groups) return null;
    return options.groups.find((g) => g.id === activeWorkspace.groupId) || null;
  }, [selectedGroup, activeWorkspace?.groupId, options?.groups]);

  const activeUnitLabel = useMemo(() => {
    if (!activeWorkspace || activeWorkspace.overview) return '';
    if (activeWorkspace.mode === 'UNIT') {
      return activeWorkspace.unitName
        ? `${activeWorkspace.unit}: ${activeWorkspace.unitName}`
        : `Unidad ${activeWorkspace.unit || ''}`;
    }
    if (activeWorkspace.mode === 'PRACTICE') return 'Prácticas EFSRT';
    return 'Módulo Completo';
  }, [activeWorkspace]);

  // Carga inicial y actualización de datos de supervisión global (overview = true)
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await apiClient.getDashboard(undefined, true);
      setData(res);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servicio local';
      setError(`No se pudieron cargar los datos de supervisión (${msg}).`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Modo de visualización: false = Filtrar por carrera seleccionada (si existe); true = Mostrar consolidado institucional
  const [showAllInstitutional, setShowAllInstitutional] = useState<boolean>(false);

  useEffect(() => {
    setShowAllInstitutional(false);
  }, [activeWorkspace?.programId, activeWorkspace?.moduleId, activeWorkspace?.periodId, activeWorkspace?.groupId, activeWorkspace?.unit]);

  const hasCareerContext = Boolean(!activeWorkspace?.overview && (activeWorkspace?.programId || activeWorkspace?.groupId));

  // Cálculos estadísticos oficiales con soporte de filtrado contextual por carrera
  const careerFilteredMetrics = useMemo(() => {
    if (!data) {
      return {
        activeStudents: 0,
        activeEnrollments: 0,
        groupsCount: 0,
        pendingSubmissions: 0,
        programsCount: 0,
        modulesCount: 0,
        totalSubmissions: 0,
        isFiltered: false,
        careerStudentsCount: 0,
        totalStudentsCount: 0,
      };
    }

    const allStudents = (data.students || []).filter(s => s.active && !s.archived);
    const totalStudentsCount = allStudents.length;

    if (!hasCareerContext || showAllInstitutional) {
      const activeEnrollments = (data.enrollments || []).filter(e => e.active).length;
      const groupsCount = (data.groups || []).length;
      const submissions = data.submissions || [];
      const pendingSubmissions = submissions.filter(s => s.status === 'ENTREGADO').length;
      return {
        activeStudents: totalStudentsCount,
        activeEnrollments,
        groupsCount,
        pendingSubmissions,
        programsCount: (data.programs || []).length,
        modulesCount: (data.modules || []).length,
        totalSubmissions: submissions.length,
        isFiltered: false,
        careerStudentsCount: totalStudentsCount,
        totalStudentsCount,
      };
    }

    // Filtrar por carrera activa
    const targetProgramId = activeWorkspace?.programId;
    const targetGroupId = activeWorkspace?.groupId;

    const relevantGroups = (data.groups || []).filter(group =>
      (!targetGroupId || group.id === targetGroupId) &&
      (!targetProgramId || group.programId === targetProgramId) &&
      (!activeWorkspace?.moduleId || group.moduleId === activeWorkspace.moduleId) &&
      (!activeWorkspace?.periodId || group.periodId === activeWorkspace.periodId)
    );

    const relevantGroupIds = new Set(relevantGroups.map(g => g.id));
    const relevantModuleIds = new Set(relevantGroups.map(group => group.moduleId));
    const careerEnrollments = (data.enrollments || []).filter(e => e.active && relevantGroupIds.has(e.groupId));
    const careerStudentIds = new Set(careerEnrollments.map(e => e.studentId));
    const careerStudents = allStudents.filter(s => careerStudentIds.has(s.id));
    const careerSubmissions = (data.submissions || []).filter(s => relevantGroupIds.has(s.groupId));
    const pendingSubmissions = careerSubmissions.filter(s => s.status === 'ENTREGADO').length;

    return {
      activeStudents: careerStudents.length,
      activeEnrollments: careerEnrollments.length,
      groupsCount: relevantGroups.length,
      pendingSubmissions,
      programsCount: 1,
      modulesCount: (data.modules || []).filter(module => relevantModuleIds.has(module.id)).length,
      totalSubmissions: careerSubmissions.length,
      isFiltered: true,
      careerStudentsCount: careerStudents.length,
      totalStudentsCount,
    };
  }, [data, hasCareerContext, showAllInstitutional, activeWorkspace?.programId, activeWorkspace?.groupId, activeWorkspace?.moduleId, activeWorkspace?.periodId]);

  const metrics = careerFilteredMetrics;

  // Tarjetas operativas autorizadas para Dirección (scripts/role-policy.cjs)
  const supervisoryActions = useMemo(() => [
    {
      route: 'ficha-registro-2026' as NavRoute,
      title: 'Ficha de Registro 2026 (WhatsApp / QR)',
      description: 'Supervisión de admisiones, recepción de fichas por WhatsApp/QR y generación oficial de Fichas PDF 2026.',
      icon: <DocumentIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: '📲 Admisión 2026',
      highlight: true,
      highlightText: 'Nuevo',
    },
    {
      route: 'configuracion-academica' as NavRoute,
      title: 'Organizar el año lectivo',
      description: 'Gestión de calendario, programas formativos, módulos, planes de estudio y turnos.',
      icon: <AcademicConfigIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Gestión anual',
    },
    {
      route: 'cuentas' as NavRoute,
      title: 'Usuarios y asignaciones',
      description: 'Gestión de cuentas institucionales de docentes, secretaría y asignación a aulas.',
      icon: <AccountsIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Personal',
    },
    {
      route: 'estudiantes' as NavRoute,
      title: 'Padrón de estudiantes',
      description: 'Consulta consolidada de estudiantes registrados, legajos y estados académicos.',
      icon: <StudentsIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Participantes',
    },
    {
      route: 'matriculas' as NavRoute,
      title: 'Supervisión de matrículas',
      description: 'Auditoría del padrón de participantes inscritos, vacantes y ratificación modular.',
      icon: <EnrollmentIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Matrícula',
    },
    {
      route: 'entregas' as NavRoute,
      title: 'Mesa de partes y revisión',
      description: 'Recepción, observación y visado oficial de actas y registros presentados por docentes.',
      icon: <DeliveriesIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Mesa de partes',
      highlight: metrics.pendingSubmissions > 0,
      highlightText: `${metrics.pendingSubmissions} pendiente${metrics.pendingSubmissions === 1 ? '' : 's'}`,
    },
    {
      route: 'documentos' as NavRoute,
      title: 'Centro documental oficial',
      description: 'Emisión de las 21 plantillas oficiales: actas, nóminas, certificados y títulos.',
      icon: <DocumentIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Documentación',
    },
    {
      route: 'configuracion-documental' as NavRoute,
      title: 'Configuración documental',
      description: 'Definición de autoridades, firmas, resoluciones y directivas documentales oficiales.',
      icon: <DocConfigIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Normativa',
    },
    {
      route: 'sincronizacion' as NavRoute,
      title: 'Intercambio y sincronización',
      description: 'Distribución y recepción de paquetes offline USB para consolidación en el equipo central.',
      icon: <SyncIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Sincronización',
    },
    {
      route: 'respaldo' as NavRoute,
      title: 'Respaldos e integridad',
      description: 'Copias de seguridad fuera de línea, salud de SQLite y auditoría de integridad.',
      icon: <BackupIcon className="w-5 h-5 text-[var(--ui-brand)]" />,
      badge: 'Seguridad',
    },
  ], [metrics.pendingSubmissions]);

  // Helper para renderizar estado de entrega
  const renderStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'ENTREGADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <ClockIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Entregado · Pendiente
          </span>
        );
      case 'RECIBIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            <CheckCircleIcon className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            Recibido Conforme
          </span>
        );
      case 'OBSERVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <AlertCircleIcon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Observado
          </span>
        );
      case 'REVISADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircleIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Revisado Oficial
          </span>
        );
      default:
        return null;
    }
  };

  const recentSubmissions = useMemo(() => {
    let list = data?.submissions || [];
    if (careerFilteredMetrics.isFiltered && activeWorkspace?.programId) {
      const relevantGroupIds = new Set(
        (data?.groups || [])
          .filter(group =>
            (!activeWorkspace.groupId || group.id === activeWorkspace.groupId) &&
            (!activeWorkspace.programId || group.programId === activeWorkspace.programId) &&
            (!activeWorkspace.moduleId || group.moduleId === activeWorkspace.moduleId) &&
            (!activeWorkspace.periodId || group.periodId === activeWorkspace.periodId)
          )
          .map((g) => g.id)
      );
      list = list.filter((s) => relevantGroupIds.has(s.groupId));
    }
    return list.slice(0, 5);
  }, [data?.submissions, data?.groups, careerFilteredMetrics.isFiltered, activeWorkspace?.programId, activeWorkspace?.groupId, activeWorkspace?.moduleId, activeWorkspace?.periodId]);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Encabezado Superior */}
      <DashboardPhotoBand as="header" scene="direccion" variant="hero" className="" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-3xl min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-brand)] uppercase tracking-wider bg-[var(--ui-brand-soft)] border border-[var(--ui-line)] px-2.5 py-1 rounded-md">
              Ámbito Institucional · Dirección General
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] leading-[36px] text-[var(--ui-ink)] font-bold tracking-tight">
            Supervisión de Dirección
          </h1>
          <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] font-normal">
            {user ? `Bienvenido, ${user.name}. ` : ''}
            Monitoreo integral de la gestión académica institucional, padrón de estudiantes, supervisión de entregas y control documental.
          </p>
        </div>

        {/* Controles de Periodo y Actualización */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center shrink-0">
          <div className="inline-flex items-center gap-3 px-4 py-2 min-h-[44px] rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-line)] shadow-[var(--ui-shadow)] text-[var(--ui-ink)]">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--ui-brand-soft)] flex items-center justify-center text-[var(--ui-brand)]">
              <CalendarIcon className="w-4 h-4 text-[var(--ui-brand)]" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-semibold">
                Periodo Activo
              </span>
              <span className="text-[14px] leading-[21px] text-[var(--ui-ink)] font-bold tabular-nums">
                2026-I
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar métricas institucionales"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-[var(--ui-surface)] border border-[var(--ui-line)] text-[var(--ui-ink)] hover:text-[var(--ui-brand)] hover:border-[var(--ui-brand)] hover:bg-[var(--ui-surface-alt)] text-[14px] font-semibold transition-all shadow-[var(--ui-shadow)] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <RefreshIcon className={`w-4 h-4 text-[var(--ui-brand)] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </DashboardPhotoBand>

      {/* 2. Banner de Estado Operativo */}
      <div className="p-4 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] leading-[18px] text-[var(--ui-muted)]">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <strong className="text-[var(--ui-ink)] block font-semibold">
              SISTEMA ACADÉMICO INSTITUCIONAL · SUPERVISIÓN DE DIRECCIÓN GENERAL
            </strong>
            <span className="text-[var(--ui-muted)]">
              Base de datos institucional local protegida. La supervisión académica opera de forma 100% fuera de línea y confidencial.
            </span>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-[var(--ui-muted)] whitespace-nowrap shrink-0 tabular-nums">
            Actualizado localmente: {lastUpdated.toLocaleTimeString('es-PE')}
          </span>
        )}
      </div>

      {/* Banner Destacado: Ficha de Registro 2026 (WhatsApp / QR) */}
      <div className="p-6 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] flex items-center justify-center text-2xl shrink-0">
            📲
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[16px] leading-[24px] font-bold text-[var(--ui-ink)]">
                Ficha de Registro 2026 (WhatsApp / QR)
              </strong>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] leading-[18px] font-bold bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                Admisión 2026
              </span>
            </div>
            <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] mt-0.5">
              Supervisión de fichas de pre-inscripción digital enviadas por WhatsApp o QR, auditoría de los 27 campos y generación de Fichas PDF 2026.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ficha-registro-2026')}
          className="min-h-[44px] px-5 py-2.5 rounded-[10px] bg-[var(--ui-brand)] text-[var(--ui-on-brand)] hover:opacity-95 font-bold text-[14px] flex items-center justify-center gap-2 shadow-[var(--ui-shadow)] transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto shrink-0"
        >
          <span>Abrir Módulo de Fichas 2026</span>
          <ArrowForwardIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Alerta de error si falla la carga */}
      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-[14px] leading-[21px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData()}
            className="min-h-[44px] px-4 py-2 bg-rose-600 text-white rounded-[10px] text-[12px] font-bold hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 3. Banner de Entregas Pendientes de Revisión (si existen) */}
      {metrics.pendingSubmissions > 0 && (
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[var(--ui-shadow)]">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
              <DeliveriesIcon className="w-5 h-5 text-amber-800 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] leading-[21px] font-bold text-amber-950 dark:text-amber-100 tabular-nums">
                Atención requerida: {metrics.pendingSubmissions} entrega{metrics.pendingSubmissions === 1 ? '' : 's'} pendiente{metrics.pendingSubmissions === 1 ? '' : 's'} de revisión
              </h3>
              <p className="text-[12px] leading-[18px] text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                Los docentes han remitido actas y registros académicos a Mesa de Partes que aguardan conformidad oficial de Dirección.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('entregas')}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[10px] bg-amber-600 text-white text-[14px] font-bold hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors shrink-0 shadow-[var(--ui-shadow)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span>Revisar entregas en Mesa de Partes</span>
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Banner Contextual de Espacio de Trabajo Activo */}
      <ActiveUnitContextBanner
        variant="full"
        showQuickModuleActions
        onNavigate={onNavigate}
        careerScopeToggle={
          hasCareerContext
            ? {
                showAll: showAllInstitutional,
                onToggle: setShowAllInstitutional,
                careerCount: careerFilteredMetrics.careerStudentsCount,
                totalCount: careerFilteredMetrics.totalStudentsCount,
                unitLabel: 'matriculados',
                onQuickEnroll: () => onNavigate('matriculas'),
              }
            : undefined
        }
      />

      <section aria-labelledby="kpi-heading">
        <DashboardPhotoBand scene="indicadores" className="mb-4" contentClassName="flex items-center">
          <h2 id="kpi-heading" className="text-xl font-bold text-ink">Indicadores Académicos Institucionales</h2>
        </DashboardPhotoBand>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[var(--ui-surface)] p-6 rounded-2xl border border-[var(--ui-line)] animate-pulse space-y-3">
                <div className="w-12 h-3 bg-[var(--ui-surface-alt)] rounded" />
                <div className="w-16 h-8 bg-[var(--ui-surface-alt)] rounded" />
                <div className="w-20 h-2 bg-[var(--ui-surface-alt)] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* KPI 1: Estudiantes Activos */}
            <div className="bg-[var(--ui-surface)] p-6 rounded-2xl border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col justify-between min-w-0">
              <div>
                <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider block">
                  Estudiantes
                </span>
                <span className="text-[30px] leading-[36px] font-extrabold tabular-nums text-[var(--ui-ink)] mt-1 block tracking-tight">
                  {metrics.activeStudents}
                </span>
              </div>
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-medium mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                Activos en el padrón
              </span>
            </div>

            {/* KPI 2: Matrículas Activas */}
            <div className="bg-[var(--ui-surface)] p-6 rounded-2xl border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col justify-between min-w-0">
              <div>
                <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider block">
                  Matrículas
                </span>
                <span className="text-[30px] leading-[36px] font-extrabold tabular-nums text-[var(--ui-ink)] mt-1 block tracking-tight">
                  {metrics.activeEnrollments}
                </span>
              </div>
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-medium mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                Vigentes en módulos
              </span>
            </div>

            {/* KPI 3: Grupos / Secciones */}
            <div className="bg-[var(--ui-surface)] p-6 rounded-2xl border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col justify-between min-w-0">
              <div>
                <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider block">
                  Grupos
                </span>
                <span className="text-[30px] leading-[36px] font-extrabold tabular-nums text-[var(--ui-ink)] mt-1 block tracking-tight">
                  {metrics.groupsCount}
                </span>
              </div>
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-medium mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
                Aulas y turnos
              </span>
            </div>

            {/* KPI 4: Entregas por Revisar */}
            <div className={`p-6 rounded-2xl border shadow-[var(--ui-shadow)] flex flex-col justify-between min-w-0 ${
              metrics.pendingSubmissions > 0
                ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-800/60'
                : 'bg-[var(--ui-surface)] border-[var(--ui-line)]'
            }`}>
              <div>
                <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider block">
                  Entregas
                </span>
                <span className={`text-[30px] leading-[36px] font-extrabold tabular-nums mt-1 block tracking-tight ${
                  metrics.pendingSubmissions > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-[var(--ui-ink)]'
                }`}>
                  {metrics.pendingSubmissions}
                </span>
              </div>
              <span className={`text-[12px] leading-[18px] font-medium mt-3 flex items-center gap-1.5 ${
                metrics.pendingSubmissions > 0 ? 'text-amber-800 dark:text-amber-300 font-semibold' : 'text-[var(--ui-muted)]'
              }`}>
                {metrics.pendingSubmissions > 0 ? (
                  <>
                    <ClockIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                    <span>Por revisar en mesa</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Entregas al día</span>
                  </>
                )}
              </span>
            </div>

            {/* KPI 5: Programas de Estudio */}
            <div className="bg-[var(--ui-surface)] p-6 rounded-2xl border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col justify-between min-w-0">
              <div>
                <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider block">
                  Programas
                </span>
                <span className="text-[30px] leading-[36px] font-extrabold tabular-nums text-[var(--ui-ink)] mt-1 block tracking-tight">
                  {metrics.programsCount}
                </span>
              </div>
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-medium mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" aria-hidden="true" />
                Carreras técnicas
              </span>
            </div>

            {/* KPI 6: Módulos Formativos */}
            <div className="bg-[var(--ui-surface)] p-6 rounded-2xl border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col justify-between min-w-0">
              <div>
                <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider block">
                  Módulos
                </span>
                <span className="text-[30px] leading-[36px] font-extrabold tabular-nums text-[var(--ui-ink)] mt-1 block tracking-tight">
                  <span data-testid="dashboard-module-count">{metrics.modulesCount}</span>
                </span>
              </div>
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-medium mt-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                Planes curriculares
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Áreas de Supervisión Institucional (Acciones de Dirección) */}
      <section className="space-y-4" aria-labelledby="supervision-areas-heading">
        <DashboardPhotoBand scene="supervision" contentClassName="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="supervision-areas-heading" className="text-[20px] leading-[28px] font-bold text-[var(--ui-ink)]">
              Áreas de Supervisión y Operación Institucional
            </h2>
            <p className="text-[14px] leading-[21px] text-[var(--ui-muted)]">
              Seleccione un módulo operativo para acceder a la gestión y supervisión oficial de la institución.
            </p>
          </div>
          
        </DashboardPhotoBand>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {supervisoryActions.map((action) => (
            <ModuleActionCard
              key={action.route}
              title={action.title}
              description={action.description}
              icon={action.icon}
              category={action.badge}
              highlight={action.highlight ? action.highlightText : undefined}
              action="Abrir módulo"
              onClick={() => onNavigate(action.route)}
            />
          ))}
        </div>
      </section>

      {/* 6. Entregas Recientes en Mesa de Partes */}
      <section className="bg-[var(--ui-surface)] rounded-2xl border border-[var(--ui-line)] shadow-[var(--ui-shadow)] overflow-hidden" aria-labelledby="recent-deliveries-heading">
        <DashboardPhotoBand scene="archivo" variant="embedded" contentClassName="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="recent-deliveries-heading" className="text-[20px] leading-[28px] font-bold text-[var(--ui-ink)]">
              Últimas Entregas Remitidas por Docentes
            </h2>
            <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] mt-0.5">
              Historial reciente de documentos entregados en Mesa de Partes para auditoría de Dirección.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('entregas')}
            className="min-h-[44px] px-3 py-2 rounded-[10px] text-[14px] font-bold text-[var(--ui-brand)] hover:bg-[var(--ui-surface-alt)] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer tabular-nums shrink-0"
          >
            <span>Ver todas las entregas ({metrics.totalSubmissions})</span>
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </button>
        </DashboardPhotoBand>

        {recentSubmissions.length > 0 ? (
          <div className="divide-y divide-[var(--ui-line)]">
            {recentSubmissions.map((s) => (
              <div
                key={s.id}
                className="p-5 hover:bg-[var(--ui-surface-alt)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-brand)] bg-[var(--ui-brand-soft)] px-2.5 py-0.5 rounded-md border border-[var(--ui-line)]">
                      {s.templateId}
                    </span>
                    <span className="text-[14px] leading-[21px] font-semibold text-[var(--ui-ink)]">
                      Docente: {s.authorName}
                    </span>
                    {renderStatusBadge(s.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] leading-[18px] text-[var(--ui-muted)]">
                    <span>
                      Aula:{' '}
                      <strong className="text-[var(--ui-ink)]">
                        {options?.groups?.find((g) => g.id === s.groupId)?.name ||
                          data?.groups?.find((g) => g.id === s.groupId)?.name ||
                          s.groupId}
                      </strong>
                    </span>
                    {s.unit && <span>Unidad: <strong className="text-[var(--ui-ink)]">{s.unit}</strong></span>}
                    <span className="tabular-nums">Fecha: {new Date(s.createdAt).toLocaleString('es-PE')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('entregas')}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] border border-[var(--ui-line)] bg-[var(--ui-surface-alt)] text-[14px] font-bold text-[var(--ui-ink)] hover:text-[var(--ui-brand)] hover:border-[var(--ui-brand)] hover:bg-[var(--ui-surface)] transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Supervisar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <p className="text-[16px] leading-[24px] font-bold text-[var(--ui-ink)]">
              Bandeja de Supervisión al Día
            </p>
            <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] max-w-md">
              No hay documentos o actas de docentes pendientes de auditoría en este momento. Los nuevos envíos de los profesores se reflejarán aquí automáticamente.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('entregas')}
              className="mt-2 inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-[10px] bg-[var(--ui-surface-alt)] border border-[var(--ui-line)] text-[var(--ui-ink)] hover:text-[var(--ui-brand)] hover:border-[var(--ui-brand)] text-[14px] font-bold transition-colors cursor-pointer"
            >
              <span>Consultar historial de entregas</span>
              <ArrowForwardIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 7. Nota Institucional al Pie */}
      <footer className="text-center py-4 text-[12px] leading-[18px] text-[var(--ui-muted)] border-t border-[var(--ui-line)]">
        CEPRO_MICAELA 2.0 · Plataforma de Gestión Académica Institucional Fuera de Línea
        <span className="mx-2">•</span>
        Módulo de Supervisión General y Dirección Institucional
      </footer>
    </div>
  );
};

export default DashboardDireccion;
