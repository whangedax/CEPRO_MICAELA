import React from 'react';
import { UserProfile } from '../../../types';
import { CalendarIcon } from '../Icons';

export interface TopbarProps {
  user: UserProfile;
  onProfileClick?: () => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ user, onProfileClick, onLogout }) => {
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

  return (
    <header className="fixed top-0 left-64 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 flex items-center justify-between px-8 transition-all select-none">
      {/* Institutional academic context (WCAG 2.2 AA compliant contrast) */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-slate-600">
          {user.institution} · {user.role === 'Dirección Institucional' ? 'Supervisión de Dirección' : user.role === 'Secretaría Académica' ? 'Gestión de Secretaría' : 'Plataforma Docente'}
        </span>
      </div>

      {/* Right controls: Period & Teacher Profile */}
      <div className="flex items-center gap-5">
        {/* Active Academic Period Badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-[12px] font-semibold shadow-xs">
          <CalendarIcon className="w-4 h-4 text-[#13594A]" />
          <span>{user.period}</span>
        </div>

        <div className="h-6 w-px bg-slate-200/80" />

        {/* Profile Button with native semantics and accessible name */}
        <button
          type="button"
          onClick={onProfileClick}
          aria-label={`Usuario institucional: ${user.name}, ${user.role}`}
          className="flex items-center gap-3 pl-1 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2 rounded-xl p-1 text-left"
        >
          <div className="flex flex-col text-right">
            <span className="text-[13px] text-slate-800 font-bold leading-tight group-hover:text-[#13594A] transition-colors">
              {user.name}
            </span>
            <span className="text-[11px] text-slate-600 font-medium leading-tight">
              {user.role}
            </span>
          </div>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#13594A] text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100 group-hover:ring-[#13594A]/30 transition-all shadow-sm">
              {initials}
            </div>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Botón de Cierre de Sesión Oficial */}
        {onLogout && (
          <>
            <div className="h-6 w-px bg-slate-200/80" />
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión institucional"
              aria-label="Cerrar sesión institucional"
              className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-100 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <svg
                className="w-4 h-4"
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
