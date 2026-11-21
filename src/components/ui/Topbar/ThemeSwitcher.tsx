import React from 'react';
import { useTheme, ThemePreference } from '../../../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const options: { id: ThemePreference; label: string; title: string; icon: React.ReactNode }[] = [
    {
      id: 'light',
      label: 'Claro',
      title: 'Tema Claro (Modo diurno)',
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
    {
      id: 'dark',
      label: 'Oscuro',
      title: 'Tema Oscuro Ergonómico (Modo nocturno)',
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
    },
    {
      id: 'system',
      label: 'Auto',
      title: 'Sincronizar con el Sistema Operativo',
      icon: (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Selector de tema de color institucional"
      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface-alt p-1"
    >
      {options.map((opt) => {
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            title={opt.title}
            aria-label={opt.title}
            onClick={() => setTheme(opt.id)}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const index = options.findIndex(option => option.id === opt.id);
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
              setTheme(options[next].id);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
            }}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isSelected ? 'border-line bg-surface text-brand shadow-xs' : 'border-transparent text-muted hover:bg-surface hover:text-ink'
            }`}
          >
            {opt.icon}
            <span className="hidden 2xl:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
