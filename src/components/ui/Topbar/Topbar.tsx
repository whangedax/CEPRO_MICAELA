import React from 'react';
import { UserProfile } from '../../../types';
import { CalendarIcon, RefreshIcon } from '../Icons';
import ThemeSwitcher from './ThemeSwitcher';
import { useWorkspace } from '../../../context/WorkspaceContext';

export interface TopbarProps {
  user: UserProfile;
  onProfileClick?: () => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ user, onProfileClick, onLogout }) => {
  const { activeWorkspace, options, selectedGroup, openSelector } = useWorkspace();

  // Extract initials for clean local offline avatar
  const initials =
    user.name
      .replace(/^(?:Prof\.?|Lic\.?|Mg\.?|Ing\.?)\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() || 'MV';

  const isGlobalOverview = !activeWorkspace || Boolean(activeWorkspace.overview);

  const activeGroup = React.useMemo(() => {
    if (selectedGroup) return selectedGroup;
    if (!activeWorkspace?.groupId || !options?.groups) return null;
    return options.groups.find((g) => g.id === activeWorkspace.groupId) || null;
  }, [selectedGroup, activeWorkspace?.groupId, options?.groups]);

  const activePeriodLabel = React.useMemo(() => {
    if (activeGroup?.periodId) return activeGroup.periodId;
    if (activeWorkspace?.periodId) return activeWorkspace.periodId;
    if (activeWorkspace?.year) return activeWorkspace.year;
    return user.period || '2026-I';
  }, [activeGroup?.periodId, activeWorkspace?.periodId, activeWorkspace?.year, user.period]);

  const programName = React.useMemo(() => {
    const progId = activeGroup?.programId || activeWorkspace?.programId;
    if (!progId || !options?.programs) return activeWorkspace?.programName || '';
    return options.programs.find((p) => p.id === progId)?.nombre || activeWorkspace?.programName || progId;
  }, [activeGroup?.programId, activeWorkspace?.programId, activeWorkspace?.programName, options?.programs]);

  const moduleShortLabel = React.useMemo(() => {
    if (activePeriodLabel === '2026-I') return 'Módulo I';
    if (activePeriodLabel === '2026-II') return 'Módulo II';
    return options?.modules.find(m => m.id === activeWorkspace?.moduleId)?.nombre || 'Módulo formativo';
  }, [activePeriodLabel, options?.modules, activeWorkspace?.moduleId]);

  const groupShortLabel = React.useMemo(() => {
    if (activeGroup) {
      const turno = activeGroup.turno || 'Mañana';
      const secc = activeGroup.section ? ` · Secc. ${activeGroup.section}` : '';
      return `Turno ${turno}${secc}`;
    }
    return '';
  }, [activeGroup]);

  const unitLabel = React.useMemo(() => {
    if (!activeWorkspace || activeWorkspace.overview) return '';
    if (activeWorkspace.mode === 'UNIT') {
      if (!activeWorkspace.unit) return 'Unidad Activa';
      const u = String(activeWorkspace.unit).trim();
      const match = u.match(/^UD\s*(\d+)$/i);
      if (match) return `UD ${match[1]}`;
      return u.toUpperCase().startsWith('UD') || u.toUpperCase() === 'EFSRT' ? u : `UD ${u}`;
    }
    if (activeWorkspace.mode === 'PRACTICE') {
      return 'EFSRT';
    }
    return 'Módulo Completo';
  }, [activeWorkspace]);

  const activeUnitName = React.useMemo(() => {
    if (!activeWorkspace || activeWorkspace.overview) return '';
    if (activeWorkspace.mode === 'UNIT' && activeWorkspace.unit) {
      const unitObj = activeGroup?.units?.find((u) => u.code === activeWorkspace.unit);
      return unitObj?.name || activeWorkspace.unitName || '';
    }
    if (activeWorkspace.mode === 'PRACTICE') {
      return 'Prácticas Pre-Profesionales';
    }
    return '';
  }, [activeWorkspace, activeGroup]);

  const contextButton = 'min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
  const contextTitle = isGlobalOverview ? 'Vista institucional' : programName || 'Contexto académico';
  const contextDetail = isGlobalOverview ? 'Selecciona tu espacio de trabajo' : [moduleShortLabel, groupShortLabel].filter(Boolean).join(' · ');

  return (
    <header data-app-topbar className="fixed left-[72px] right-0 top-0 z-40 flex h-32 flex-col justify-center gap-2 border-b border-line bg-surface px-3 py-2 text-ink md:left-64 sm:px-5 lg:h-20 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:px-6 xl:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => openSelector(1)} title="Cambiar periodo o módulo formativo" aria-label={`Cambiar periodo ${activePeriodLabel}`} className={`${contextButton} inline-flex border border-line bg-surface-alt text-ink hover:bg-brand-soft`}>
          <CalendarIcon aria-hidden="true" className="hidden size-4 text-brand sm:block" />
          <span className="tabular-nums">{activePeriodLabel}</span>
        </button>
        <button type="button" onClick={() => openSelector(isGlobalOverview ? 1 : 2)} title={`${contextTitle} · ${unitLabel ? `${unitLabel} · ` : ''}${contextDetail}`} aria-label={isGlobalOverview ? 'Seleccionar carrera y unidad' : `Cambiar carrera o módulo: ${programName}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <span className="block w-full truncate text-sm font-semibold leading-5 text-ink lg:text-[15px]">{contextTitle}</span>
          <span className="mt-0.5 block w-full truncate text-xs font-normal leading-4 text-muted">{!isGlobalOverview && unitLabel && <span className="xl:hidden">{unitLabel} · </span>}{contextDetail}</span>
        </button>
        {!isGlobalOverview && unitLabel && (
          <button type="button" onClick={() => openSelector(3)} title={activeUnitName ? `${unitLabel}: ${activeUnitName}` : unitLabel} aria-label={`Cambiar unidad: ${unitLabel}`} className={`${contextButton} hidden border border-line bg-brand-soft text-brand hover:border-brand/50 xl:inline-flex`}>
            {unitLabel}
          </button>
        )}
        <button type="button" onClick={() => openSelector(activeGroup ? 3 : 1)} data-testid="header-change-context" aria-label="Cambiar contexto académico" className={`${contextButton} inline-flex bg-brand text-on-brand hover:opacity-90`}>
          <RefreshIcon aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Cambiar</span>
        </button>
      </div>

      <div className="flex w-full shrink-0 items-center justify-between gap-3 lg:w-auto lg:justify-end lg:gap-4">
        <ThemeSwitcher />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={onProfileClick} aria-label={`Usuario institucional: ${user.name}, ${user.role}`} title={`${user.name} · ${user.role}`} className="group flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <span className="hidden min-w-0 max-w-36 flex-col text-right sm:flex lg:hidden xl:flex xl:max-w-48 2xl:max-w-64">
              <span className="truncate text-sm font-semibold leading-5 text-ink group-hover:text-brand">{user.name}</span>
              <span className="mt-0.5 truncate text-xs font-normal leading-4 text-muted">{user.role}</span>
            </span>
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-brand-soft text-sm font-semibold text-brand" aria-hidden="true">{initials}</span>
          </button>
          {onLogout && (
            <button id="btn-logout" type="button" onClick={onLogout} title="Cerrar sesión institucional" aria-label="Cerrar sesión institucional" className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:bg-surface-alt hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
