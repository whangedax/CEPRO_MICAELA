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
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../api/client';
import { DashboardResponse, SubmissionStatus } from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
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

  // Cálculos estadísticos oficiales del backend SQLite sintético
  const metrics = useMemo(() => {
    if (!data) {
      return {
        activeStudents: 0,
        activeEnrollments: 0,
        groupsCount: 0,
        pendingSubmissions: 0,
        programsCount: 0,
        modulesCount: 0,
        totalSubmissions: 0,
      };
    }

    const activeStudents = (data.students || []).filter(s => s.active && !s.archived).length;
    const activeEnrollments = (data.enrollments || []).filter(e => e.active).length;
    const groupsCount = (data.groups || []).length;
    const submissions = data.submissions || [];
    const pendingSubmissions = submissions.filter(s => s.status === 'ENTREGADO').length;
    const programsCount = (data.programs || []).length;
    const modulesCount = (data.modules || []).length;

    return {
      activeStudents,
      activeEnrollments,
      groupsCount,
      pendingSubmissions,
      programsCount,
      modulesCount,
      totalSubmissions: submissions.length,
    };
  }, [data]);

  // Tarjetas operativas autorizadas para Dirección (scripts/role-policy.cjs)
  const supervisoryActions = useMemo(() => [
    {
      route: 'configuracion-academica' as NavRoute,
      title: 'Organizar el año lectivo',
      description: 'Gestión de calendario, programas formativos, módulos, planes de estudio y turnos.',
      icon: <AcademicConfigIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Gestión anual',
    },
    {
      route: 'cuentas' as NavRoute,
      title: 'Usuarios y asignaciones',
      description: 'Gestión de cuentas institucionales de docentes, secretaría y asignación a aulas.',
      icon: <AccountsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Personal',
    },
    {
      route: 'estudiantes' as NavRoute,
      title: 'Padrón de estudiantes',
      description: 'Consulta consolidada de estudiantes registrados, legajos y estados académicos.',
      icon: <StudentsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Participantes',
    },
    {
      route: 'matriculas' as NavRoute,
      title: 'Supervisión de matrículas',
      description: 'Auditoría del padrón de participantes inscritos, vacantes y ratificación modular.',
      icon: <EnrollmentIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Matrícula',
    },
    {
      route: 'entregas' as NavRoute,
      title: 'Mesa de partes y revisión',
      description: 'Recepción, observación y visado oficial de actas y registros presentados por docentes.',
      icon: <DeliveriesIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Mesa de partes',
      highlight: metrics.pendingSubmissions > 0,
      highlightText: `${metrics.pendingSubmissions} pendiente${metrics.pendingSubmissions === 1 ? '' : 's'}`,
    },
    {
      route: 'documentos' as NavRoute,
      title: 'Centro documental oficial',
      description: 'Emisión de las 21 plantillas oficiales: actas, nóminas, certificados y títulos.',
      icon: <DocumentIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Documentación',
    },
    {
      route: 'configuracion-documental' as NavRoute,
      title: 'Configuración documental',
      description: 'Definición de autoridades, firmas, resoluciones y directivas documentales oficiales.',
      icon: <DocConfigIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Normativa',
    },
    {
      route: 'sincronizacion' as NavRoute,
      title: 'Intercambio y sincronización',
      description: 'Distribución y recepción de paquetes offline USB para consolidación en el equipo central.',
      icon: <SyncIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Sincronización',
    },
    {
      route: 'respaldo' as NavRoute,
      title: 'Respaldos e integridad',
      description: 'Copias de seguridad fuera de línea, salud de SQLite y auditoría de integridad.',
      icon: <BackupIcon className="w-5 h-5 text-[#13594A]" />,
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
    return (data?.submissions || []).slice(0, 5);
  }, [data?.submissions]);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Encabezado Superior */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#263834]">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] dark:text-[#5EEAD4] uppercase tracking-widest bg-[#E6F4F1] dark:bg-[#132B25] border border-transparent dark:border-[#205C4E] px-2.5 py-1 rounded-md">
              Ámbito Institucional · Dirección General
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-[#0D382F] dark:text-[#5EEAD4] font-bold tracking-tight leading-tight">
            Supervisión de Dirección
          </h1>
          <p className="text-[14px] text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
            {user ? `Bienvenido, ${user.name}. ` : ''}
            Monitoreo integral de la gestión académica institucional, padrón de estudiantes, supervisión de entregas y control documental.
          </p>
        </div>

        {/* Controles de Periodo y Actualización */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-slate-800 dark:text-slate-200">
            <div className="w-8 h-8 rounded-xl bg-[#e6f4f1] dark:bg-[#132B25] flex items-center justify-center text-[#13594A] dark:text-[#5EEAD4]">
              <CalendarIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-bold leading-none">
                Periodo Activo
              </span>
              <span className="text-[13px] text-[#172B28] dark:text-[#F0FDF8] font-bold leading-tight">
                2026-I
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar métricas institucionales"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] hover:border-[#13594A]/30 dark:hover:border-[#205C4E] text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 text-[#13594A] dark:text-[#5EEAD4] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </header>

      {/* 2. Banner de Estado Operativo */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#182220] border border-slate-200 dark:border-[#263834] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <div>
            <strong className="text-slate-900 dark:text-slate-100 block font-semibold">
              SISTEMA ACADÉMICO INSTITUCIONAL · SUPERVISIÓN DE DIRECCIÓN GENERAL
            </strong>
            <span className="text-slate-600 dark:text-slate-400">
              Base de datos institucional local protegida. La supervisión académica opera de forma 100% fuera de línea y confidencial.
            </span>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            Actualizado localmente: {lastUpdated.toLocaleTimeString('es-PE')}
          </span>
        )}
      </div>

      {/* Alerta de error si falla la carga */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 3. Banner de Entregas Pendientes de Revisión (si existen) */}
      {metrics.pendingSubmissions > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
              <DeliveriesIcon className="w-5 h-5 text-amber-800 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Atención requerida: {metrics.pendingSubmissions} entrega{metrics.pendingSubmissions === 1 ? '' : 's'} pendiente{metrics.pendingSubmissions === 1 ? '' : 's'} de revisión
              </h3>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                Los docentes han remitido actas y registros académicos a Mesa de Partes que aguardan conformidad oficial de Dirección.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('entregas')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 dark:hover:bg-amber-500 transition-colors shrink-0 shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span>Revisar entregas en Mesa de Partes</span>
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Banner Contextual de Espacio de Trabajo Activo */}
      <section
        aria-label="Espacio de Trabajo Activo"
        className="p-5 rounded-3xl bg-white dark:bg-[#182220] border border-slate-200/90 dark:border-[#263834] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F4F1] dark:bg-[#132B25] border border-[#13594A]/20 dark:border-[#205C4E] flex items-center justify-center text-[#13594A] dark:text-[#5EEAD4] shrink-0">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#13594A] dark:text-[#5EEAD4] bg-[#13594A]/10 dark:bg-[#205C4E]/40 px-2 py-0.5 rounded-md">
                {isGlobalOverview ? 'Ámbito Global Institucional' : 'Supervisión de Unidad Activa'}
              </span>
              <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                {activeProgramName || 'CETPRO Micaela Bastidas Puyucawa'}
              </span>
            </div>
            <h2 className="text-[17px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-tight">
              {activeGroup ? `${activeGroup.name} · ${activeUnitLabel}` : 'Vista Global Institucional (Todas las 7 carreras)'}
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeGroup
                ? `Docente titular: ${activeGroup.teacherName || 'Asignado'} · ${activeGroup.studentCount} participantes matriculados · Turno ${activeGroup.turno || 'Mañana'}`
                : 'Supervisión integral de las 7 carreras técnicas y 16 aulas formativas activas.'}
            </p>
            {activeGroup && activeGroup.units && activeGroup.units.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                  Unidades del Aula:
                </span>
                {activeGroup.units.map((u) => {
                  const isUnitSelected =
                    (activeWorkspace?.mode === 'UNIT' && activeWorkspace?.unit === u.code) ||
                    (activeWorkspace?.mode === 'PRACTICE' && u.code === 'EFSRT');
                  return (
                    <button
                      key={u.code}
                      type="button"
                      onClick={() => selectGroupAndUnit(activeGroup, u.code === 'EFSRT' ? 'PRACTICE' : 'UNIT', u.code)}
                      title={u.name ? `${u.code}: ${u.name}` : `Seleccionar ${u.code}`}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        isUnitSelected
                          ? 'bg-[#13594A] text-white border-[#13594A] shadow-xs'
                          : 'bg-slate-50 dark:bg-[#131C1A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#263834] hover:border-[#13594A] hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
                      }`}
                    >
                      {u.code}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeGroup && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('matriculas')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#13594A] text-white text-[12px] font-bold hover:bg-[#004034] transition-colors shadow-xs cursor-pointer"
              >
                <EnrollmentIcon className="w-4 h-4" />
                <span>Nóminas del Aula</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('documentos')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#131C1A] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#263834] text-[12px] font-bold hover:border-[#13594A] transition-colors cursor-pointer"
              >
                <DocumentIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
                <span>Formatos Oficiales</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => openSelector(1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#182220] hover:bg-[#F2FBF8] dark:hover:bg-[#193830] text-[#13594A] dark:text-[#5EEAD4] border border-[#13594A]/40 dark:border-[#205C4E] text-[12px] font-bold transition-all shadow-xs cursor-pointer"
          >
            <span>🔄 {activeGroup ? 'Cambiar Carrera / Unidad' : 'Seleccionar Carrera / Unidad'}</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Indicadores Académicos Institucionales</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] animate-pulse space-y-3">
                <div className="w-12 h-3 bg-slate-200 dark:bg-[#263834] rounded" />
                <div className="w-16 h-8 bg-slate-200 dark:bg-[#263834] rounded" />
                <div className="w-20 h-2 bg-slate-100 dark:bg-[#131C1A] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* KPI 1: Estudiantes Activos */}
            <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Estudiantes
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] dark:text-[#5EEAD4] mt-1 block tracking-tight">
                  {metrics.activeStudents}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Activos en el padrón
              </span>
            </div>

            {/* KPI 2: Matrículas Activas */}
            <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Matrículas
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] dark:text-[#5EEAD4] mt-1 block tracking-tight">
                  {metrics.activeEnrollments}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Vigentes en módulos
              </span>
            </div>

            {/* KPI 3: Grupos / Secciones */}
            <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Grupos
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] dark:text-[#5EEAD4] mt-1 block tracking-tight">
                  {metrics.groupsCount}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Aulas y turnos
              </span>
            </div>

            {/* KPI 4: Entregas por Revisar */}
            <div className={`p-5 rounded-3xl border shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between ${
              metrics.pendingSubmissions > 0
                ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-800/60'
                : 'bg-white dark:bg-[#182220] border-slate-200/80 dark:border-[#263834]'
            }`}>
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Por Revisar
                </span>
                <span className={`text-2xl lg:text-3xl font-extrabold mt-1 block tracking-tight ${
                  metrics.pendingSubmissions > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-[#0D382F] dark:text-[#5EEAD4]'
                }`}>
                  {metrics.pendingSubmissions}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${metrics.pendingSubmissions > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                Entregas en mesa
              </span>
            </div>

            {/* KPI 5: Programas de Estudio */}
            <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Programas
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] dark:text-[#5EEAD4] mt-1 block tracking-tight">
                  {metrics.programsCount}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Carreras técnicas
              </span>
            </div>

            {/* KPI 6: Módulos Formativos */}
            <div className="bg-white dark:bg-[#182220] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Módulos
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] dark:text-[#5EEAD4] mt-1 block tracking-tight">
                  {metrics.modulesCount}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Planes curriculares
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Áreas de Supervisión Institucional (Acciones de Dirección) */}
      <section className="space-y-4" aria-labelledby="supervision-areas-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="supervision-areas-heading" className="text-lg font-bold text-slate-900 dark:text-[#F0FDF8]">
              Áreas de Supervisión y Operación Institucional
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Seleccione un módulo operativo para acceder a la gestión y supervisión oficial de la institución.
            </p>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            9 módulos autorizados para Dirección
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {supervisoryActions.map((action) => (
            <button
              key={action.route}
              type="button"
              onClick={() => onNavigate(action.route)}
              className="bg-white dark:bg-[#182220] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#13594A]/40 dark:hover:border-[#205C4E] hover:shadow-[0_8px_24px_rgba(19,89,74,0.08)] transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4] relative"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#E6F4F1] dark:bg-[#132B25] flex items-center justify-center text-[#13594A] dark:text-[#5EEAD4] border border-transparent dark:border-[#205C4E] group-hover:scale-105 transition-transform">
                    {action.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {action.highlight && (
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                        {action.highlightText}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#131C1A] px-2.5 py-1 rounded-md">
                      {action.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-[#F0FDF8] group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] transition-colors flex items-center justify-between">
                  <span>{action.title}</span>
                  <ArrowForwardIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#263834] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                <span className="text-[#13594A] dark:text-[#5EEAD4] group-hover:underline">Acceder a supervisión</span>
                <span className="text-[#13594A] dark:text-[#5EEAD4] font-bold group-hover:translate-x-0.5 transition-transform">Supervisar →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 6. Entregas Recientes en Mesa de Partes */}
      <section className="bg-white dark:bg-[#182220] rounded-3xl border border-slate-200/80 dark:border-[#263834] shadow-xs overflow-hidden" aria-labelledby="recent-deliveries-heading">
        <div className="p-6 border-b border-slate-100 dark:border-[#263834] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 id="recent-deliveries-heading" className="text-base font-bold text-slate-900 dark:text-[#F0FDF8]">
              Últimas Entregas Remitidas por Docentes
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Historial reciente de documentos entregados en Mesa de Partes para auditoría de Dirección.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('entregas')}
            className="text-xs font-bold text-[#13594A] dark:text-[#5EEAD4] hover:text-[#0D382F] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Ver todas las entregas ({metrics.totalSubmissions})</span>
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSubmissions.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-[#263834]">
            {recentSubmissions.map((s) => (
              <div
                key={s.id}
                className="p-5 hover:bg-slate-50/70 dark:hover:bg-[#1F2D2A]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-[#13594A] dark:text-[#5EEAD4] bg-[#E6F4F1] dark:bg-[#132B25] px-2 py-0.5 rounded border border-[#13594A]/20 dark:border-[#205C4E]">
                      {s.templateId}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Docente: {s.authorName}
                    </span>
                    {renderStatusBadge(s.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <span>Aula: <strong className="text-slate-700 dark:text-slate-300">{s.groupId}</strong></span>
                    {s.unit && <span>Unidad: <strong className="text-slate-700 dark:text-slate-300">{s.unit}</strong></span>}
                    <span>Fecha: {new Date(s.createdAt).toLocaleString('es-PE')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('entregas')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#263834] bg-slate-50 dark:bg-[#182220] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] hover:border-[#13594A]/30 dark:hover:border-[#205C4E] hover:bg-white dark:hover:bg-[#1F2D2A] transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Supervisar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#132B25] text-emerald-700 dark:text-[#5EEAD4] flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-[#F0FDF8]">
              Bandeja de Supervisión al Día
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              No hay documentos o actas de docentes pendientes de auditoría en este momento. Los nuevos envíos de los profesores se reflejarán aquí automáticamente.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('entregas')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#131C1A] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Consultar historial de entregas</span>
              <ArrowForwardIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 7. Nota Institucional al Pie */}
      <footer className="text-center py-4 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-[#263834]">
        CEPRO_MICAELA 2.0 · Plataforma de Gestión Académica Institucional Fuera de Línea
        <span className="mx-2">•</span>
        Módulo de Supervisión General y Dirección Institucional
      </footer>
    </div>
  );
};

export default DashboardDireccion;
