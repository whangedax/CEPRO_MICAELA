import { useId, type ReactNode } from 'react';
import { ArrowForwardIcon } from './Icons';

interface ModuleActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  action: string;
  onClick: () => void;
  category?: string;
  highlight?: string;
}

export function ModuleActionCard({
  title, description, icon, action, onClick, category, highlight,
}: ModuleActionCardProps) {
  const titleId = useId();
  const actionId = useId();

  return (
    <article className="relative grid h-full min-w-0 grid-rows-[auto_1fr_auto] gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--ui-shadow)] transition-colors hover:border-brand/65 hover:bg-surface-alt focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {category && <span className="text-xs font-semibold leading-5 text-muted">{category}</span>}
          {highlight && <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">{highlight}</span>}
        </span>
      </span>
      <div className="min-w-0">
        <h3 id={titleId} className="break-words text-base font-bold leading-snug text-ink sm:text-lg">{title}</h3>
        <span className="mt-1.5 block break-words text-sm leading-relaxed text-muted">{description}</span>
      </div>
      <button type="button" data-module-action onClick={onClick} aria-labelledby={`${actionId} ${titleId}`} className="flex min-h-11 items-center justify-between gap-2 border-t border-line pt-2 text-left text-sm font-semibold text-brand outline-none after:absolute after:inset-0 after:rounded-2xl">
        <span id={actionId}>{action}</span>
        <ArrowForwardIcon aria-hidden="true" className="size-4 shrink-0" />
      </button>
    </article>
  );
}
