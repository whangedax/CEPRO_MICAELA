import React, { useEffect, useRef } from 'react';

export const transferFieldClass = 'w-full min-h-[48px] rounded-[10px] border border-line bg-surface px-3.5 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60';
export const transferButtonClass = 'min-h-[44px] rounded-[10px] px-5 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
export const transferPrimaryButtonClass = `${transferButtonClass} bg-brand text-on-brand hover:opacity-95`;
export const transferSecondaryButtonClass = `${transferButtonClass} border border-line bg-surface text-ink hover:bg-surface-alt`;

export function TransferSteps({ steps, current, label = 'Progreso de la tarea' }: {
  steps: readonly string[];
  current: number;
  label?: string;
}) {
  return <ol aria-label={label} className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
    {steps.map((step, index) => {
      const number = index + 1;
      const active = number === current;
      const completed = number < current;
      return <li key={step} aria-current={active ? 'step' : undefined} className={`flex items-center gap-2.5 min-w-0 text-sm ${active ? 'text-ink font-semibold' : 'text-muted'}`}>
        <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${active ? 'bg-brand text-on-brand border-brand' : completed ? 'bg-brand-soft text-brand border-brand/30' : 'bg-surface border-line text-muted'}`}>
          {completed ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m4 10 4 4 8-8" /></svg> : number}
        </span>
        <span className="break-words">{step}<span className="sr-only">{active ? ', paso actual' : completed ? ', completado' : ', pendiente'}</span></span>
      </li>;
    })}
  </ol>;
}

export function TransferFrame({ id, title, description, steps, current, children, footer }: {
  id: string;
  title: string;
  description?: string;
  steps: readonly string[];
  current: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [current, id]);
  return <section aria-labelledby={`${id}-heading`} className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--ui-shadow)]">
    <div className="border-b border-line bg-surface-alt px-5 py-4 sm:px-7"><TransferSteps steps={steps} current={current} /></div>
    <div className="p-5 sm:p-7 space-y-6">
      <header className="space-y-2 max-w-3xl">
        <p className="text-sm font-medium text-muted">Paso {current} de {steps.length}</p>
        <h3 ref={heading} id={`${id}-heading`} tabIndex={-1} className="text-xl sm:text-2xl font-bold leading-tight text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{title}</h3>
        {description && <p className="text-base leading-relaxed text-muted">{description}</p>}
      </header>
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
    {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">{footer}</div>}
  </section>;
}

export function TransferIntentCard({ id, title, description, icon, selected, disabled, onClick }: {
  id?: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      data-testid={id}
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`group w-full min-w-0 rounded-2xl border p-4 text-left shadow-[var(--ui-shadow)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 sm:p-5 ${selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-brand/65 hover:bg-surface-alt'}`}
    >
      <span className="flex min-h-16 items-start gap-3">
        {icon && <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block break-words text-base font-bold leading-snug text-ink">{title}</span>
          <span className="mt-1.5 block break-words text-sm leading-relaxed text-muted">{description}</span>
        </span>
        {selected !== undefined ? (
          <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-brand bg-brand text-on-brand' : 'border-muted'}`}>
            {selected && <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7" /></svg>}
          </span>
        ) : (
          <svg aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 10h11m-5-5 5 5-5 5" /></svg>
        )}
      </span>
    </button>
  );
}
