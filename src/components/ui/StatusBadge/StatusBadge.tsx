import React from 'react';
import { isInstitutional } from '../../../utils/appProfile';

interface StatusBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  className = '',
  size = 'md',
}) => {
  if (__IS_INSTITUTIONAL__) {
    return null;
  }

  if (size === 'sm') {
    return (
      <span
        className={`status-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] text-[10px] font-bold tracking-wider uppercase border border-[var(--ui-line)] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-brand)]" aria-hidden="true" />
        SISTEMA INSTITUCIONAL · BASE 2026
      </span>
    );
  }

  return (
    <div
      className={`status-badge inline-flex items-center justify-center px-3 py-1 rounded-full bg-[var(--ui-surface)] border border-[var(--ui-line)] text-[var(--ui-ink)] shadow-xs ${className}`}
    >
      <span className="text-[10px] font-bold tracking-wider text-[var(--ui-ink)] uppercase">
        SISTEMA INSTITUCIONAL · BASE 2026
      </span>
    </div>
  );
};

export default StatusBadge;
