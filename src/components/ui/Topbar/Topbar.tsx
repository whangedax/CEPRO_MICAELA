import React from 'react';
import { UserProfile } from '../../../types';
import { CalendarIcon } from '../Icons';
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
      .replace('Prof. ', '')
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
    if (activeWorkspace?.year) return `${activeWorkspace.year}-I`;
    return user.period || '2026-I';
  }, [activeGroup?.periodId, activeWorkspace?.year, user.period]);

  const programName = React.useMemo(() => {
    const progId = activeGroup?.programId || activeWorkspace?.programId;
    if (!progId || !options?.programs) return activeWorkspace?.programName || '';
    return options.programs.find((p) => p.id === progId)?.nombre || activeWorkspace?.programName || progId;
  }, [activeGroup?.programId, activeWorkspace?.programId, activeWorkspace?.programName, options?.programs]);

  const moduleShortLabel = React.useMemo(() => {
    const modId = activeGroup?.moduleId || activeWorkspace?.moduleId || '';
    const num = Number(modId.replace(/\D+/g, ''));
    if (!Number.isNaN(num) && num > 0) {
      return num % 2 === 1 ? 'Módulo I' : 'Módulo II';
    }
    return activePeriodLabel.endsWith('-II') ? 'Módulo II' : 'Módulo I';
  }, [activeGroup?.moduleId, activeWorkspace?.moduleId, activePeriodLabel]);

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

  return (
    <header className="fixed top-0 left-64 right-0 h-20 bg-white/80 dark:bg-[#131C1A]/95 backdrop-blur-md border-b border-slate-100 dark:border-[#263834] z-40 flex items-center justify-between px-6 xl:px-8 transition-colors duration-200 select-none">
      {/* Menú y selector permanente de contexto académico (WCAG 2.2 AA) */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="hidden 2xl:inline text-[13px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
          {user.institution}
        </span>

        <div className="hidden 2xl:block h-4 w-px bg-slate-200 dark:bg-[#263834] shrink-0" />

        {/* Control interactivo permanente de Contexto Académico */}
        {isGlobalOverview ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#182220] border border-slate-200/90 dark:border-[#263834] text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Vista Global · {activePeriodLabel}
            </span>
            <button
              type="button"
              onClick={() => openSelector(1)}
              className="px-3.5 py-1.5 rounded-xl bg-[#13594A] hover:bg-[#004034] text-white text-xs font-extrabold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Seleccionar módulo, carrera o unidad didáctica"
            >
              <span>🎯 Seleccionar Unidad</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#E6F4F1] dark:bg-[#132B25] border border-[#13594A]/30 dark:border-[#205C4E] text-[#004034] dark:text-[#5EEAD4] text-xs font-bold shadow-xs">
              {/* Paso 1: Periodo */}
              <button
                type="button"
                onClick={() => openSelector(1)}
                className="px-2 py-0.5 rounded-lg bg-[#13594A] text-white font-extrabold text-xs tabular-nums hover:bg-[#0D382F] transition-colors shrink-0 cursor-pointer"
                title="Cambiar Periodo o Etapa Modular"
              >
                {activePeriodLabel}
              </button>

              <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>

              {/* Paso 2: Carrera + Módulo */}
              <button
                type="button"
                onClick={() => openSelector(2)}
                className="font-extrabold hover:underline truncate max-w-[200px] xl:max-w-[280px] shrink-0 cursor-pointer text-left"
                title={`Carrera: ${programName} (${moduleShortLabel}) — Clic para cambiar de carrera`}
              >
                {programName} <span className="font-semibold opacity-85">({moduleShortLabel})</span>
              </button>

              {groupShortLabel && (
                <>
                  <span className="text-slate-400 dark:text-slate-500 hidden 2xl:inline shrink-0">•</span>
                  <button
                    type="button"
                    onClick={() => openSelector(3)}
                    className="hidden 2xl:inline font-bold hover:underline shrink-0 cursor-pointer"
                    title="Cambiar Aula o Turno"
                  >
                    {groupShortLabel}
                  </button>
                </>
              )}

              {unitLabel && (
                <>
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
                  <button
                    type="button"
                    onClick={() => openSelector(3)}
                    className="px-2 py-0.5 rounded-lg bg-[#13594A]/15 dark:bg-[#5EEAD4]/20 text-[#13594A] dark:text-[#5EEAD4] font-extrabold text-xs hover:bg-[#13594A]/25 dark:hover:bg-[#5EEAD4]/30 transition-colors truncate max-w-[150px] xl:max-w-[240px] shrink-0 cursor-pointer"
                    title={activeUnitName ? `${unitLabel}: ${activeUnitName}` : unitLabel}
                  >
                    {unitLabel}
                    {activeUnitName ? (
                      <span className="hidden xl:inline font-bold">: {activeUnitName}</span>
                    ) : null}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => openSelector(activeGroup ? 3 : 1)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#182220] hover:bg-[#F2FBF8] dark:hover:bg-[#193830] text-[#13594A] dark:text-[#5EEAD4] border border-[#13594A]/40 dark:border-[#205C4E] text-xs font-extrabold shadow-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Cambiar unidad didáctica, aula o carrera técnica"
            >
              <span>🔄 Cambiar</span>
            </button>
          </div>
        )}
      </div>

      {/* Right controls: ThemeSwitcher, Period & Teacher Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Selector de Tema Accesible */}
        <ThemeSwitcher />

        {/* Active Academic Period Badge (visible en pantallas amplias o vista global) */}
        <div className="hidden 2xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs tabular-nums">
          <CalendarIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
          <span>{activeGroup?.periodId || user.period}</span>
        </div>

        <div className="hidden 2xl:block h-6 w-px bg-slate-200/80 dark:bg-[#263834]" />

        {/* Profile Button with native semantics and accessible name */}
        <button
          type="button"
          onClick={onProfileClick}
          aria-label={`Usuario institucional: ${user.name}, ${user.role}`}
          className="flex items-center gap-3 pl-1 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2 rounded-xl p-1 text-left"
        >
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-[13px] text-slate-800 dark:text-slate-200 font-bold leading-tight group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] transition-colors">
              {user.name}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">
              {user.role}
            </span>
          </div>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#13594A] text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100 dark:ring-[#263834] group-hover:ring-[#13594A]/30 dark:group-hover:ring-[#5EEAD4]/30 transition-all shadow-sm">
              {initials}
            </div>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#131C1A]"
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Botón de Cierre de Sesión Oficial */}
        {onLogout && (
          <>
            <div className="h-6 w-px bg-slate-200/80 dark:bg-[#263834]" />
            <button
              id="btn-logout"
              type="button"
              onClick={onLogout}
              title="Cerrar sesión institucional"
              aria-label="Cerrar sesión institucional"
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/60 dark:border-[#263834] hover:border-rose-100 dark:hover:border-rose-900/60 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <svg
                className="w-4 h-4 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
