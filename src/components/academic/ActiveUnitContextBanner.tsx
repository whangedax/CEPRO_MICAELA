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
  GroupsIcon,
  EnrollmentIcon,
  AttendanceIcon,
  EvaluationIcon,
  DocumentIcon,
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
  const readable = (date: string) => date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
  if (start && end) return readable(start) + " al " + readable(end);
  if (start) return "Desde " + readable(start);
  return end ? "Hasta " + readable(end) : "";
}

const control = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60';
const neutral = control + ' border border-line bg-surface text-ink hover:bg-surface-alt';
const primary = control + ' bg-brand text-on-brand hover:opacity-90';

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
    if (activeWorkspace?.periodId) return activeWorkspace.periodId;
    if (activeWorkspace?.year) return activeWorkspace.year;
    return '2026-I';
  }, [activeGroup?.periodId, activeWorkspace?.periodId, activeWorkspace?.year]);

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
    if (periodLabel === '2026-I') return 'Módulo I';
    if (periodLabel === '2026-II') return 'Módulo II';
    return 'Módulo formativo';
  }, [periodLabel]);

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
        title: moduleName,
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

  const spacing = variant === 'compact' ? 'px-4 py-3' : 'px-5 py-4 sm:px-6';
  const surface = `rounded-2xl border border-line bg-surface shadow-[var(--ui-shadow)] ${className}`;
  if (isGlobalOverview) {
    return (
      <section aria-label="Contexto Académico Institucional" className={surface}>
        <div className={`${spacing} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
              <GroupsIcon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand tabular-nums">Periodo {periodLabel}</p>
              <h2 className="mt-0.5 text-xl font-bold text-ink">
                {role === 'DOCENTE' ? 'Elige tu espacio de trabajo' : 'Vista institucional'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {role === 'DOCENTE' ? 'Selecciona una carrera, un aula y una unidad para empezar.' : 'Consulta el consolidado o selecciona un aula para ver su información.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => handleOpenStep(1)} disabled={isLoading} className={primary}>
            Elegir contexto
          </button>
        </div>
      </section>
    );
  }

  const theme = resolveCareerVisualTheme(activeGroup.programId, programName);
  const pedagogicalUnits = (activeGroup.units || []).filter((unit) => unit.code !== 'EFSRT');
  const efsrtUnit = (activeGroup.units || []).find((unit) => unit.code === 'EFSRT');
  const practiceActive = activeWorkspace?.mode === 'PRACTICE' || activeWorkspace?.unit === 'EFSRT';
  const moduleActive = activeWorkspace?.mode === 'MODULE';
  const breadcrumbs = [
    `Periodo ${periodLabel}`,
    programName,
    activeModule?.nombre ? `${moduleStageBadge} · ${moduleName}` : moduleStageBadge,
    activeGroup.name,
  ].filter(Boolean);
  const switchClass = (selected: boolean) =>
    selected ? primary + ' border border-brand' : neutral;
  const quickActions = [
    { route: 'asistencia', label: 'Asistencia', Icon: AttendanceIcon },
    { route: 'evaluacion', label: 'Evaluaciones', Icon: EvaluationIcon },
    { route: 'documentos', label: 'Formatos PDF', Icon: DocumentIcon },
    ...(isAdminOrSec ? [{ route: 'matriculas', label: 'Matrículas', Icon: EnrollmentIcon } as const] : []),
  ] as const;
  const scope = careerScopeToggle;

  return (
    <section aria-label="Contexto Académico de Unidad Activa" className={surface}>
      <div className={`${spacing} space-y-4`}>
        <nav aria-label="Ruta académica" className="min-w-0">
          <ol className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm text-muted">
            {breadcrumbs.map((label, index) => (
              <li key={index} className="flex min-w-0 items-baseline gap-2.5">
                {index > 0 && <span aria-hidden="true">›</span>}
                <span className="min-w-0 break-words">{label}</span>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-1 basis-80 items-start gap-3">
            <div aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] text-white ${theme.iconBgClass}`}>
              <CareerEmblemIcon programId={activeGroup.programId} programName={programName} className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand">
                {moduleActive ? 'Módulo completo' : practiceActive ? 'Práctica activa · EFSRT' : `Unidad activa · ${activeUnitDisplay.badge}`}
              </p>
              <h2 className={`mt-0.5 break-words font-bold leading-snug text-ink ${variant === 'compact' ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                {activeUnitDisplay.title}
              </h2>
            </div>
          </div>
          <div role="group" aria-label="Cambiar contexto académico" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleOpenStep(2)} disabled={isLoading} className={neutral} aria-label="Cambiar carrera o módulo">
              Carrera o módulo
            </button>
            <button type="button" onClick={() => handleOpenStep(3)} disabled={isLoading} className={neutral} aria-label="Cambiar aula, turno o unidad">
              Cambiar aula
            </button>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          {activeUnitDisplay.dateRange && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
              <dt className="sr-only">Vigencia</dt>
              <dd className="font-medium text-ink tabular-nums">{activeUnitDisplay.dateRange}</dd>
            </div>
          )}
          {activeUnitDisplay.hours !== undefined && <div><dt className="sr-only">Duración</dt><dd className="font-medium text-ink tabular-nums">{activeUnitDisplay.hours} horas</dd></div>}
          {activeUnitDisplay.credits !== undefined && <div><dt className="sr-only">Créditos</dt><dd className="font-medium text-ink tabular-nums">{activeUnitDisplay.credits} créditos</dd></div>}
          <div><dt className="sr-only">Turno y sección</dt><dd>Turno {activeGroup.turno || 'Mañana'} · Sección {activeGroup.section || 'A1'}</dd></div>
          {activeGroup.teacherName && <div className="min-w-0 break-words"><dt className="inline">Docente: </dt><dd className="inline font-medium text-ink">{activeGroup.teacherName}</dd></div>}
          <div className="flex items-center gap-2">
            <StudentsIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
            <dt className="sr-only">Matrícula del aula</dt>
            <dd className="tabular-nums">{activeGroup.studentCount} estudiantes</dd>
          </div>
        </dl>
      </div>

      {showInlineUnitSwitcher && Boolean(activeGroup.units?.length) && (
        <div className={`${spacing} space-y-3 border-t border-line bg-surface-alt`}>
          <div role="group" aria-label="Unidades del aula" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-ink" aria-hidden="true">Unidades del aula</span>
            {pedagogicalUnits.map((unit) => {
              const selected = activeWorkspace?.mode === 'UNIT' && activeWorkspace?.unit === unit.code;
              const label = formatUnitCodeDisplay(unit.code);
              return (
                <button key={unit.code} type="button" disabled={isLoading} aria-pressed={selected}
                  onClick={() => handleQuickUnitSwitch('UNIT', unit.code)}
                  title={unit.name} aria-label={unit.name ? `${label}: ${unit.name}` : label} className={switchClass(selected)}>
                  {label}
                </button>
              );
            })}
            {efsrtUnit && (
              <button type="button" disabled={isLoading} aria-pressed={practiceActive} className={switchClass(practiceActive)}
                onClick={() => handleQuickUnitSwitch('PRACTICE', 'EFSRT')} title={efsrtUnit.name}>
                EFSRT
              </button>
            )}
            {isAdminOrSec && (
              <button type="button" disabled={isLoading} aria-pressed={moduleActive} className={switchClass(moduleActive)}
                onClick={() => handleQuickUnitSwitch('MODULE', undefined)}>
                Módulo completo
              </button>
            )}
          </div>
          {showQuickModuleActions && (
            <div role="group" aria-label="Acciones del aula" className="flex flex-wrap items-center gap-2">
              {quickActions.map(({ route, label, Icon }) => (
                <button key={route} type="button" onClick={() => navigateSafe(route)} className={neutral}>
                  <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {scope && (
        <div className={`${spacing} flex flex-wrap items-center justify-between gap-3 border-t border-line`}>
          <div role="group" aria-label="Alcance de la consulta" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!scope.showAll} onClick={() => scope.onToggle(false)}
              title={programName} className={switchClass(!scope.showAll)}>
              Mi carrera ({scope.careerCount} {scope.unitLabel || 'matriculados'})
            </button>
            <button type="button" aria-pressed={scope.showAll} onClick={() => scope.onToggle(true)} className={switchClass(scope.showAll)}>
              Consolidado ({scope.totalCount})
            </button>
          </div>
          {scope.onQuickEnroll && (
            <button type="button" onClick={scope.onQuickEnroll} className={neutral}>
              <EnrollmentIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
              Matricular estudiante
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ActiveUnitContextBanner;
