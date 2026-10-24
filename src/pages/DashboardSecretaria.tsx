/**
 * src/pages/DashboardSecretaria.tsx
 * 
 * Dashboard Oficial de Gestión de Secretaría Académica — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real al backend SQLite local mediante GET /api/dashboard?overview=1:
 * - Métricas reales verificadas: Estudiantes registrados, Matrículas en curso, Grupos habilitados y Entregas por recepcionar.
 * - Acciones académicas autorizadas con navegación fluida por teclado y accesibilidad WCAG 2.2 AA.
 * - Línea visual premium Stitch (#13594A, #0D382F, #F6F8FA).
 * - Exclusión estricta de funciones de respaldo (política oficial de seguridad institucional).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { DashboardResponse, SubmissionStatus } from '../api/types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  AcademicConfigIcon,
  AccountsIcon,
  DocumentIcon,
  EnrollmentIcon,
  StudentsIcon,
  DeliveriesIcon,
  SyncIcon,
  GroupsIcon,
  DocConfigIcon,
  ArrowForwardIcon,
  CalendarIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '../components/ui/Icons';

interface DashboardSecretariaProps {
  onNavigate: (route: NavRoute) => void;
}

export const DashboardSecretaria: React.FC<DashboardSecretariaProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Carga inicial y actualización de datos de secretaría (overview = true)
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
      setError(`No se pudieron cargar los datos de secretaría (${msg}).`);
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

  // Tarjetas operativas autorizadas para Secretaría (scripts/role-policy.cjs - Excluye rigurosamente 'respaldo')
  const secretariatActions = useMemo(() => [
    {
      route: 'matriculas' as NavRoute,
      title: 'Matrículas de participantes',
      description: 'Incorporación formal, ratificación de matrícula y rectificaciones modulares de participantes.',
      icon: <EnrollmentIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Admisión',
    },
    {
      route: 'estudiantes' as NavRoute,
      title: 'Padrón de estudiantes',
      description: 'Búsqueda por DNI, registro de nuevos participantes y actualización de legajos estudiantiles.',
      icon: <StudentsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Registros',
    },
    {
      route: 'entregas' as NavRoute,
      title: 'Recepción de entregas',
      description: 'Mesa de partes: recepción, conformidad y observación de actas y registros docentes.',
      icon: <DeliveriesIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Mesa de partes',
      highlight: metrics.pendingSubmissions > 0,
      highlightText: `${metrics.pendingSubmissions} pendiente${metrics.pendingSubmissions === 1 ? '' : 's'}`,
    },
    {
      route: 'documentos' as NavRoute,
      title: 'Nóminas y formatos oficiales',
      description: 'Preparación y verificación de nóminas de matrícula, actas de evaluación y fichas individuales.',
      icon: <DocumentIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Documentación',
    },
    {
      route: 'cuentas' as NavRoute,
      title: 'Registrar docentes',
      description: 'Alta de cuentas docentes institucionales y vinculación con programas de estudio autorizados.',
      icon: <AccountsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Personal docente',
    },
    {
      route: 'grupos' as NavRoute,
      title: 'Organización del grupo',
      description: 'Revisión de secciones, turnos lectivos, modalidades y docentes responsables de aula.',
      icon: <GroupsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Aulas',
    },
    {
      route: 'configuracion-documental' as NavRoute,
      title: 'Configuración documental',
      description: 'Consulta y verificación de parámetros oficiales, resoluciones y autoridades asignadas.',
      icon: <DocConfigIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Normativa',
    },
    {
      route: 'sincronizacion' as NavRoute,
      title: 'Intercambio y sincronización',
      description: 'Recepción de paquetes de trabajo USB de docentes y consolidación en el equipo institucional.',
      icon: <SyncIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Sincronización',
    },
    {
      route: 'configuracion-academica' as NavRoute,
      title: 'Consulta académica anual',
      description: 'Consulta de carreras, planes de estudio, módulos formativos y turnos lectivos del periodo.',
      icon: <AcademicConfigIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Consulta anual',
    },
  ], [metrics.pendingSubmissions]);

  // Helper para renderizar estado de entrega
  const renderStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'ENTREGADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ClockIcon className="w-3 h-3 text-amber-600" />
            Entregado · Pendiente
          </span>
        );
      case 'RECIBIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <CheckCircleIcon className="w-3 h-3 text-sky-600" />
            Recibido Conforme
          </span>
        );
      case 'OBSERVADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircleIcon className="w-3 h-3 text-rose-600" />
            Observado
          </span>
        );
      case 'REVISADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
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
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#004034] uppercase tracking-widest bg-[#E6F4F1] px-2.5 py-1 rounded-md">
              Ámbito Institucional · Secretaría Académica
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-[30px] text-[#0D382F] font-bold tracking-tight leading-tight">
            Gestión de Secretaría Académica
          </h1>
          <p className="text-[14px] text-slate-700 font-normal leading-relaxed">
            {user ? `Bienvenida, ${user.name}. ` : ''}
            Administración central de matrículas, legajos estudiantiles, recepción de documentos en Mesa de Partes y emisión de nóminas oficiales.
          </p>
        </div>

        {/* Controles de Periodo y Actualización */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-[#e6f4f1] flex items-center justify-center text-[#13594A]">
              <CalendarIcon className="w-4 h-4 text-[#13594A]" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold leading-none">
                Periodo Activo
              </span>
              <span className="text-[13px] text-[#172B28] font-bold leading-tight">
                2026-I
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            aria-label="Actualizar datos de secretaría"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-700 hover:text-[#13594A] hover:border-[#13594A]/30 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 text-[#13594A] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </header>

      {/* 2. Banner de Entorno Sandbox */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <div>
            <strong className="text-slate-900 block font-semibold">
              ENTORNO DE PRUEBAS LOCAL · OPERACIÓN SIMULADA EN SQLITE (127.0.0.1:8085)
            </strong>
            <span className="text-slate-600">
              Servicio de secretaría académica operando 100% fuera de línea con base de datos local aislada.
            </span>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-slate-500 whitespace-nowrap shrink-0">
            Actualizado localmente: {lastUpdated.toLocaleTimeString('es-PE')}
          </span>
        )}
      </div>

      {/* Alerta de error si falla la carga */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0" />
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

      {/* 3. Banner de Entregas Pendientes de Mesa de Partes (si existen) */}
      {metrics.pendingSubmissions > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
              <DeliveriesIcon className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Atención de Secretaría: {metrics.pendingSubmissions} entrega{metrics.pendingSubmissions === 1 ? '' : 's'} por recepcionar
              </h3>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Existen actas y registros presentados por docentes pendientes de validación y emisión de dictamen de recepción conforme u observación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('entregas')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shrink-0 shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span>Atender Mesa de Partes</span>
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Grid de Métricas Principales (KPIs en tiempo real) */}
      <section aria-labelledby="kpi-heading-sec">
        <h2 id="kpi-heading-sec" className="sr-only">Indicadores Académicos de Secretaría</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/80 animate-pulse space-y-3">
                <div className="w-12 h-3 bg-slate-200 rounded" />
                <div className="w-16 h-8 bg-slate-200 rounded" />
                <div className="w-20 h-2 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* KPI 1: Estudiantes Registrados */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Estudiantes
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] mt-1 block tracking-tight">
                  {metrics.activeStudents}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Padrón activo registrado
              </span>
            </div>

            {/* KPI 2: Matrículas en Curso */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Matrículas en Curso
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] mt-1 block tracking-tight">
                  {metrics.activeEnrollments}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Participantes matriculados
              </span>
            </div>

            {/* KPI 3: Grupos Habilitados */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Grupos Habilitados
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-[#0D382F] mt-1 block tracking-tight">
                  {metrics.groupsCount}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Secciones en el periodo
              </span>
            </div>

            {/* KPI 4: Entregas por Recepcionar */}
            <div className={`p-5 rounded-3xl border shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between ${
              metrics.pendingSubmissions > 0
                ? 'bg-amber-50/50 border-amber-300/80'
                : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Por Recepcionar
                </span>
                <span className={`text-2xl lg:text-3xl font-extrabold mt-1 block tracking-tight ${
                  metrics.pendingSubmissions > 0 ? 'text-amber-800' : 'text-[#0D382F]'
                }`}>
                  {metrics.pendingSubmissions}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${metrics.pendingSubmissions > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                Entregas pendientes
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Áreas de Gestión Académica (Acciones de Secretaría) */}
      <section className="space-y-4" aria-labelledby="secretariat-areas-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="secretariat-areas-heading" className="text-lg font-bold text-slate-900">
              Áreas de Gestión y Trámites de Secretaría
            </h2>
            <p className="text-xs text-slate-600">
              Acceso a los módulos autorizados para la administración de estudiantes, matrículas y documentación académica.
            </p>
          </div>
          <span className="text-xs text-slate-600 font-medium">
            9 trámites autorizados para Secretaría
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {secretariatActions.map((action) => (
            <button
              key={action.route}
              type="button"
              onClick={() => onNavigate(action.route)}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#13594A]/40 hover:shadow-[0_8px_24px_rgba(19,89,74,0.08)] transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] relative"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#E6F4F1] flex items-center justify-center text-[#13594A] group-hover:scale-105 transition-transform">
                    {action.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {action.highlight && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                        {action.highlightText}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                      {action.badge}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#13594A] transition-colors flex items-center justify-between">
                  <span>{action.title}</span>
                  <ArrowForwardIcon className="w-4 h-4 text-slate-400 group-hover:text-[#13594A] group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span className="text-[#13594A] group-hover:underline">Iniciar gestión</span>
                <span className="text-slate-400 font-mono">#{action.route}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 6. Entregas Recientes en Mesa de Partes (si existen) */}
      {recentSubmissions.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden" aria-labelledby="sec-deliveries-heading">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="sec-deliveries-heading" className="text-base font-bold text-slate-900">
                Últimas Entregas Recibidas en Mesa de Partes
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Documentos presentados por los docentes pendientes de recepción o verificación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('entregas')}
              className="text-xs font-bold text-[#13594A] hover:text-[#0D382F] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>Atender en Mesa de Partes ({metrics.totalSubmissions})</span>
              <ArrowForwardIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentSubmissions.map((s) => (
              <div
                key={s.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-[#13594A] bg-[#E6F4F1] px-2 py-0.5 rounded border border-[#13594A]/20">
                      {s.templateId}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      Docente: {s.authorName}
                    </span>
                    {renderStatusBadge(s.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>Aula: <strong className="text-slate-700">{s.groupId}</strong></span>
                    {s.unit && <span>Unidad: <strong className="text-slate-700">{s.unit}</strong></span>}
                    <span>Fecha: {new Date(s.createdAt).toLocaleString('es-PE')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('entregas')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#13594A] hover:border-[#13594A]/30 hover:bg-white transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  {s.status === 'ENTREGADO'
                    ? 'Recepcionar'
                    : s.status === 'RECIBIDO'
                    ? 'Revisar expediente'
                    : s.status === 'OBSERVADO'
                    ? 'Ver observaciones'
                    : s.status === 'REVISADO'
                    ? 'Consultar visado'
                    : 'Atender entrega'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Nota Institucional al Pie */}
      <footer className="text-center py-4 text-xs text-slate-600 border-t border-slate-200">
        CEPRO_MICAELA 2.0 · Plataforma de Gestión Académica Institucional Fuera de Línea
        <span className="mx-2">•</span>
        Módulo de Secretaría Académica (Acceso Restringido a Respaldo)
      </footer>
    </div>
  );
};

export default DashboardSecretaria;
