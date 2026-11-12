/**
 * src/components/academic/ActiveUnitContextBanner.tsx
 *
 * Componente transversal de Contexto Académico de Unidad Activa — CEPRO_MICAELA 2.0.
 * Resuelve y presenta con claridad jerárquica:
 *   1. Año / Periodo Académico (ej. Periodo 2026-I)
 *   2. Carrera Técnica (Programa de Estudios)
 *   3. Módulo Formativo (con horas y créditos)
 *   4. Aula / Turno / Sección + Docente + N° de estudiantes
 *   5. Unidad Didáctica Activa (Código UD 1..UD 7, Nombre completo, Fechas de inicio/fin, Horas y Créditos)
 *
 * Incluye:
 *   - Conmutador rápido en línea de Unidades Didácticas (1 clic, de 4 hasta 7 UDs + EFSRT + Módulo Completo)
 *     protegido por PendingChangesContext (requestSafeTransition).
 *   - Botones jerárquicos directos: [🎓 Cambiar Carrera / Módulo] y [🏫 Cambiar Aula / Turno].
 *   - Adaptación visual "full" y "compact", soporte de modo oscuro AAA (0 cajas blancas).
 */

import React, { useMemo } from 'react';
import { NavRoute } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePendingChanges } from '../../context/PendingChangesContext';
import { WorkspaceUnitOption } from '../../api/types';
import { CareerEmblemIcon, resolveCareerVisualTheme } from './CareerVisualBanner';
import {
  CalendarIcon,
  StudentsIcon,
  EnrollmentIcon,
  AttendanceIcon,
  EvaluationIcon,
  DocumentIcon,
  SunIcon,
  SunsetIcon,
} from '../ui/Icons';

export interface CareerScopeToggleConfig {
  showAll: boolean;
  onToggle: (showAll: boolean) => void;
  careerCount: number;
  totalCount: number;
  unitLabel?: string;
  onQuickEnroll?: () => void;
}

export interface ActiveUnitContextBannerProps {
  variant?: 'full' | 'compact';
  showInlineUnitSwitcher?: boolean;
  showQuickModuleActions?: boolean;
  onNavigate?: (route: NavRoute) => void;
  careerScopeToggle?: CareerScopeToggleConfig;
  className?: string;
}

function formatUnitCodeDisplay(code?: string): string {
  if (!code) return 'UD';
  const clean = code.trim().toUpperCase();
  if (clean === 'EFSRT') return 'EFSRT';
  const match = clean.match(/^UD\s*(\d+)$/i);
  if (match) return `UD ${match[1]}`;
  return clean;
}

function formatReadableDateRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  if (start && end) return `${start} al ${end}`;
  return start || end || '';
}

export const ActiveUnitContextBanner: React.FC<ActiveUnitContextBannerProps> = ({
  variant = 'full',
  showInlineUnitSwitcher = true,
  showQuickModuleActions = false,
  onNavigate,
  careerScopeToggle,
  className = '',
}) => {
  const { user } = useAuth();
  const {
    options,
    activeWorkspace,
    selectedGroup,
    selectGroupAndUnit,
    openSelector,
    isLoading,
  } = useWorkspace();
  const { requestSafeTransition } = usePendingChanges();

  const role = user?.role || 'DOCENTE';
  const isAdminOrSec = role === 'DIRECTOR' || role === 'SECRETARIA';

  // Resolver grupo activo
  const activeGroup = useMemo(() => {
    if (selectedGroup) return selectedGroup;
    if (!activeWorkspace?.groupId || !options?.groups) return null;
    return options.groups.find((g) => g.id === activeWorkspace.groupId) || null;
  }, [selectedGroup, activeWorkspace?.groupId, options?.groups]);

  const isGlobalOverview = !activeWorkspace || Boolean(activeWorkspace.overview) || !activeGroup;

  // 1. Periodo Académico
  const periodLabel = useMemo(() => {
    if (activeGroup?.periodId) return activeGroup.periodId;
    if (activeWorkspace?.year) return `${activeWorkspace.year}-I`;
    return '2026-I';
  }, [activeGroup?.periodId, activeWorkspace?.year]);

  // 2. Carrera Técnica
  const activeProgram = useMemo(() => {
    const progId = activeGroup?.programId || activeWorkspace?.programId;
    if (!progId || !options?.programs) return null;
    return options.programs.find((p) => p.id === progId) || null;
  }, [activeGroup?.programId, activeWorkspace?.programId, options?.programs]);

  const programName =
    activeProgram?.nombre ||
    activeWorkspace?.programName ||
    activeGroup?.programId ||
    'Carrera Técnica';

  // 3. Módulo Formativo
  const activeModule = useMemo(() => {
    const modId = activeGroup?.moduleId || activeWorkspace?.moduleId;
    if (!modId || !options?.modules) return null;
    return options.modules.find((m) => m.id === modId) || null;
  }, [activeGroup?.moduleId, activeWorkspace?.moduleId, options?.modules]);

  const moduleStageBadge = useMemo(() => {
    const modId = activeGroup?.moduleId || activeWorkspace?.moduleId || '';
    const num = Number(modId.replace(/\D+/g, ''));
    if (!Number.isNaN(num) && num > 0) {
      return num % 2 === 1 ? 'Módulo I' : 'Módulo II';
    }
    return periodLabel.endsWith('-II') ? 'Módulo II' : 'Módulo I';
  }, [activeGroup?.moduleId, activeWorkspace?.moduleId, periodLabel]);

  const moduleName = activeModule?.nombre || activeGroup?.name || 'Módulo Formativo';

  // 4. Unidad Didáctica Activa
  const activeUnitObj: WorkspaceUnitOption | null = useMemo(() => {
    if (!activeGroup?.units || !activeWorkspace) return null;
    if (activeWorkspace.mode === 'PRACTICE') {
      return activeGroup.units.find((u) => u.code === 'EFSRT') || null;
    }
    if (activeWorkspace.mode === 'UNIT' && activeWorkspace.unit) {
      return activeGroup.units.find((u) => u.code === activeWorkspace.unit) || null;
    }
    return null;
  }, [activeGroup?.units, activeWorkspace]);

  const activeUnitDisplay = useMemo(() => {
    if (!activeWorkspace || activeWorkspace.overview || !activeGroup) {
      return {
        badge: 'VISTA GLOBAL',
        title: 'Vista Global Institucional',
        dateRange: '',
        hours: undefined as number | undefined,
        credits: undefined as number | undefined,
      };
    }

    if (activeWorkspace.mode === 'PRACTICE' || activeWorkspace.unit === 'EFSRT') {
      return {
        badge: 'EFSRT',
        title:
          activeUnitObj?.name ||
          'EFSRT — Experiencias Formativas en Situaciones Reales de Trabajo',
        dateRange: formatReadableDateRange(
          activeUnitObj?.fechaInicio || activeGroup.fechaInicio,
          activeUnitObj?.fechaFin || activeGroup.fechaFin
        ),
        hours: activeUnitObj?.hours ?? 128,
        credits: activeUnitObj?.credits ?? 4,
      };
    }

    if (activeWorkspace.mode === 'MODULE') {
      return {
        badge: 'MÓDULO COMPLETO',
        title: `Módulo Completo — Gestión Integral del Aula (${moduleName})`,
        dateRange: formatReadableDateRange(activeGroup.fechaInicio, activeGroup.fechaFin),
        hours: activeModule?.hours,
        credits: activeModule?.credits,
      };
    }

    const codeLabel = formatUnitCodeDisplay(activeWorkspace.unit);
    const fullTitle =
      activeUnitObj?.name ||
      activeWorkspace.unitName ||
      `Unidad Didáctica ${codeLabel}`;
    const dateRange = formatReadableDateRange(
      activeUnitObj?.fechaInicio,
      activeUnitObj?.fechaFin
    );

    return {
      badge: codeLabel,
      title: fullTitle,
      dateRange,
      hours: activeUnitObj?.hours,
      credits: activeUnitObj?.credits,
    };
  }, [activeWorkspace, activeGroup, activeUnitObj, moduleName, activeModule]);

  const navigateSafe = (route: NavRoute) => {
    requestSafeTransition(() => {
      if (onNavigate) {
        onNavigate(route);
      } else {
        window.location.hash = `#/${route}`;
      }
    });
  };

  const handleOpenStep = (step: 1 | 2 | 3) => {
    requestSafeTransition(() => {
      openSelector(step);
    });
  };

  const handleQuickUnitSwitch = (
    mode: 'UNIT' | 'MODULE' | 'PRACTICE',
    unitCode?: string
  ) => {
    if (!activeGroup) return;
    requestSafeTransition(async () => {
      await selectGroupAndUnit(activeGroup, mode, unitCode);
    });
  };

  // =========================================================================
  // RENDER EN VISTA GLOBAL (SIN AULA SELECCIONADA)
  // =========================================================================
  if (isGlobalOverview) {
    return (
      <section
        aria-label="Contexto Académico Institucional"
        className={`rounded-3xl bg-white dark:bg-[#182220] border border-slate-200/90 dark:border-[#263834] shadow-[0_2px_12px_rgba(19,89,74,0.05)] p-4 sm:p-5 transition-colors ${className}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#13594A] text-white flex items-center justify-center text-lg font-extrabold shrink-0 shadow-xs">
              🎯
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-[#E6F4F1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] border border-[#13594A]/25 dark:border-[#205C4E]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Periodo {periodLabel}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {role === 'DOCENTE'
                    ? 'Sin Unidad Didáctica seleccionada'
                    : 'Ámbito Global Institucional (Todas las 7 Carreras Técnicas)'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0D382F] dark:text-[#F0FDF8] leading-snug">
                {role === 'DOCENTE'
                  ? 'Seleccione su Carrera, Aula y Unidad Didáctica de Trabajo'
                  : 'Vista Global del CETPRO Micaela Bastidas — 7 Carreras y 16 Aulas'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {role === 'DOCENTE'
                  ? 'Elija su módulo formativo, especialidad y unidad didáctica (UD 1 a UD 7) para registrar asistencia, calificaciones vigesimales y formatos oficiales.'
                  : 'Supervisión consolidada de toda la institución. Puede seleccionar una carrera, aula o unidad didáctica específica en cualquier momento.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenStep(1)}
              className="px-4 py-2.5 rounded-2xl bg-[#13594A] hover:bg-[#0D382F] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4]"
            >
              <span>🎯 Seleccionar Carrera, Módulo y Unidad Didáctica</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // RENDER CON AULA Y UNIDAD ACTIVA SELECCIONADA
  // =========================================================================
  const theme = resolveCareerVisualTheme(activeGroup.programId, programName);
  const isMorning = (activeGroup.turno || '').toLowerCase().includes('mañana');
  const pedagogicalUnits = (activeGroup.units || []).filter((u) => u.code !== 'EFSRT');
  const efsrtUnit = (activeGroup.units || []).find((u) => u.code === 'EFSRT') || null;

  return (
    <section
      aria-label="Contexto Académico de Unidad Activa"
      className={`rounded-3xl bg-white dark:bg-[#182220] border border-[#13594A]/30 dark:border-[#263834] shadow-[0_4px_18px_rgba(19,89,74,0.06)] overflow-hidden transition-colors ${className}`}
    >
      {/* Fila Superior: Jerarquía Académica Completa (Año -> Carrera -> Módulo -> Aula) + Botones de Cambio */}
      <div
        className={`${
          variant === 'compact' ? 'px-4 py-3.5' : 'px-5 py-4 sm:px-6 sm:py-5'
        } bg-gradient-to-r from-[#F4FAF8] via-white to-[#F4FAF8] dark:from-[#132B25]/80 dark:via-[#182220] dark:to-[#132B25]/60 border-b border-slate-200/80 dark:border-[#263834]`}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Bloque izquierdo: Emblema + Ruta Jerárquica + Unidad Didáctica Activa */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              className={`w-12 h-12 rounded-2xl ${theme.iconBgClass} text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5`}
            >
              <CareerEmblemIcon
                programId={activeGroup.programId}
                programName={programName}
                className="w-6 h-6 text-white"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Etiquetas superiores: Periodo · Carrera · Módulo · Turno/Sección */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-extrabold bg-[#13594A] text-white tabular-nums">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Periodo {periodLabel}</span>
                </span>

                <span className="text-slate-400 dark:text-slate-500 font-bold">›</span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-extrabold bg-[#E6F4F1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] border border-[#13594A]/25 dark:border-[#205C4E]">
                  <span>🎓 {programName}</span>
                </span>

                <span className="text-slate-400 dark:text-slate-500 font-bold">›</span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold bg-slate-100 dark:bg-[#131C1A] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#263834]">
                  <span>
                    {moduleStageBadge}: {moduleName}
                  </span>
                  {activeModule?.hours ? (
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      ({activeModule.hours}h
                      {activeModule.credits ? ` · ${activeModule.credits} cr.` : ''})
                    </span>
                  ) : null}
                </span>

                <span className="text-slate-400 dark:text-slate-500 font-bold">›</span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60">
                  {isMorning ? (
                    <SunIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <SunsetIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  )}
                  <span>
                    Turno {activeGroup.turno || 'Mañana'} · Secc. {activeGroup.section || 'A1'}
                  </span>
                </span>
              </div>

              {/* Unidad Didáctica Activa Destacada */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-[#13594A] dark:bg-[#5EEAD4] text-white dark:text-[#0B2922] shadow-2xs tracking-tight tabular-nums">
                  <span>📌 {activeUnitDisplay.badge}</span>
                </span>

                <h2 className="text-base sm:text-lg font-extrabold text-[#0D382F] dark:text-[#F0FDF8] leading-snug">
                  {activeUnitDisplay.title}
                </h2>

                {activeUnitDisplay.dateRange && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] border border-emerald-200 dark:border-[#205C4E] tabular-nums">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                    <span>Vigencia: {activeUnitDisplay.dateRange}</span>
                  </span>
                )}

                {(activeUnitDisplay.hours || activeUnitDisplay.credits) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#131C1A] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#263834] tabular-nums">
                    {activeUnitDisplay.hours ? <span>{activeUnitDisplay.hours} horas</span> : null}
                    {activeUnitDisplay.hours && activeUnitDisplay.credits ? <span>·</span> : null}
                    {activeUnitDisplay.credits ? (
                      <span>{activeUnitDisplay.credits} créditos</span>
                    ) : null}
                  </span>
                )}
              </div>

              {/* Metadatos del Aula: Docente y Participantes */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {activeGroup.teacherName && (
                  <span>
                    Docente:{' '}
                    <strong className="text-slate-900 dark:text-[#F0FDF8] font-bold">
                      {activeGroup.teacherName}
                    </strong>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <StudentsIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                  <strong className="text-slate-900 dark:text-[#F0FDF8] font-bold">
                    {activeGroup.studentCount}
                  </strong>{' '}
                  estudiantes matriculados
                </span>
              </div>
            </div>
          </div>

          {/* Bloque derecho: Botones Claros de Cambio Jerárquico */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start xl:self-center">
            <button
              type="button"
              onClick={() => handleOpenStep(2)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#131C1A] hover:bg-[#F2FBF8] dark:hover:bg-[#132B25] text-slate-800 dark:text-slate-200 hover:text-[#13594A] dark:hover:text-[#5EEAD4] border border-slate-200/90 dark:border-[#263834] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Cambiar de Carrera Técnica o Módulo Formativo"
            >
              <span>🎓 Cambiar Carrera / Módulo</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenStep(3)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-[#13594A] hover:bg-[#0D382F] text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Cambiar de Aula, Turno o Unidad Didáctica"
            >
              <span>🏫 Cambiar Aula / Turno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fila Inferior: Conmutador Rápido de Unidades Didácticas en Línea (1 clic) + Acciones Rápidas */}
      {showInlineUnitSwitcher && activeGroup.units && activeGroup.units.length > 0 && (
        <div className="px-4 py-3 sm:px-6 bg-slate-50/80 dark:bg-[#131C1A] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mr-1.5 flex items-center gap-1">
              <span>Unidades del Aula ({pedagogicalUnits.length} UDs):</span>
            </span>

            {pedagogicalUnits.map((u) => {
              const isSelected =
                activeWorkspace?.mode === 'UNIT' && activeWorkspace?.unit === u.code;
              const codeLabel = formatUnitCodeDisplay(u.code);
              const dateInfo = formatReadableDateRange(u.fechaInicio, u.fechaFin);
              const tooltip = [
                `${codeLabel}: ${u.name || 'Unidad Didáctica'}`,
                dateInfo ? `Fechas: ${dateInfo}` : '',
                u.hours ? `${u.hours} horas` : '',
                u.credits ? `${u.credits} créditos` : '',
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <button
                  key={u.code}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickUnitSwitch('UNIT', u.code)}
                  title={tooltip}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 tabular-nums ${
                    isSelected
                      ? 'bg-[#13594A] text-white border-[#13594A] dark:bg-[#5EEAD4] dark:text-[#0B2922] dark:border-[#5EEAD4] shadow-xs ring-2 ring-[#13594A]/20 dark:ring-[#5EEAD4]/25'
                      : 'bg-white dark:bg-[#182220] text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-[#263834] hover:border-[#13594A] dark:hover:border-[#5EEAD4] hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
                  }`}
                >
                  <span>{codeLabel}</span>
                  {variant === 'full' && u.name && isSelected && (
                    <span className="hidden md:inline font-bold opacity-95 max-w-[180px] truncate">
                      · {u.name}
                    </span>
                  )}
                </button>
              );
            })}

            {efsrtUnit && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickUnitSwitch('PRACTICE', 'EFSRT')}
                title={`EFSRT: Experiencias Formativas en Situaciones Reales de Trabajo (${
                  efsrtUnit.hours || 128
                }h)`}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border tabular-nums ${
                  activeWorkspace?.mode === 'PRACTICE' || activeWorkspace?.unit === 'EFSRT'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60 hover:border-amber-500'
                }`}
              >
                EFSRT
              </button>
            )}

            {isAdminOrSec && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickUnitSwitch('MODULE', undefined)}
                title="Ver y gestionar el Módulo Completo (Nóminas y Actas Consolidadas)"
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  activeWorkspace?.mode === 'MODULE'
                    ? 'bg-[#13594A] text-white border-[#13594A] dark:bg-[#5EEAD4] dark:text-[#0B2922] dark:border-[#5EEAD4] shadow-xs'
                    : 'bg-white dark:bg-[#182220] text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-[#263834] hover:border-[#13594A] dark:hover:border-[#5EEAD4]'
                }`}
              >
                Módulo Completo
              </button>
            )}
          </div>

          {/* Acciones directas opcionales (Asistencia, Notas, Formatos, Matrículas) */}
          {showQuickModuleActions && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigateSafe('asistencia')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#182220] hover:bg-[#E6F4F1] dark:hover:bg-[#132B25] text-slate-800 dark:text-slate-200 hover:text-[#13594A] dark:hover:text-[#5EEAD4] border border-slate-200 dark:border-[#263834] text-xs font-bold transition-colors cursor-pointer"
              >
                <AttendanceIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                <span>Asistencia</span>
              </button>

              <button
                type="button"
                onClick={() => navigateSafe('evaluacion')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#182220] hover:bg-[#E6F4F1] dark:hover:bg-[#132B25] text-slate-800 dark:text-slate-200 hover:text-[#13594A] dark:hover:text-[#5EEAD4] border border-slate-200 dark:border-[#263834] text-xs font-bold transition-colors cursor-pointer"
              >
                <EvaluationIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                <span>Evaluaciones</span>
              </button>

              <button
                type="button"
                onClick={() => navigateSafe('documentos')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#182220] hover:bg-[#E6F4F1] dark:hover:bg-[#132B25] text-slate-800 dark:text-slate-200 hover:text-[#13594A] dark:hover:text-[#5EEAD4] border border-slate-200 dark:border-[#263834] text-xs font-bold transition-colors cursor-pointer"
              >
                <DocumentIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                <span>Formatos PDF</span>
              </button>

              {isAdminOrSec && (
                <button
                  type="button"
                  onClick={() => navigateSafe('matriculas')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13594A] hover:bg-[#0D382F] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <EnrollmentIcon className="w-3.5 h-3.5" />
                  <span>Nóminas / Matrículas</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conmutador opcional de alcance Carrera vs Consolidado Institucional */}
      {careerScopeToggle && (
        <div className="px-4 py-2.5 sm:px-6 bg-white dark:bg-[#182220] border-t border-slate-100 dark:border-[#263834] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834]">
            <button
              type="button"
              onClick={() => careerScopeToggle.onToggle(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                !careerScopeToggle.showAll
                  ? 'bg-[#13594A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F0FDF8]'
              }`}
            >
              🎯 Viendo Carrera: {programName} ({careerScopeToggle.careerCount}{' '}
              {careerScopeToggle.unitLabel || 'matriculados'})
            </button>
            <button
              type="button"
              onClick={() => careerScopeToggle.onToggle(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                careerScopeToggle.showAll
                  ? 'bg-[#13594A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F0FDF8]'
              }`}
            >
              🌐 Ver Consolidado Institucional ({careerScopeToggle.totalCount})
            </button>
          </div>

          {careerScopeToggle.onQuickEnroll && (
            <button
              type="button"
              onClick={careerScopeToggle.onQuickEnroll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <span>➕ Matricular Alumno en esta Carrera</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ActiveUnitContextBanner;
