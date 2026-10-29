import React from 'react';

interface StatusBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  className = '',
  size = 'md',
}) => {
  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e6f4f1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] text-[10px] font-bold tracking-wider uppercase border border-[#13594A]/20 dark:border-[#205C4E] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#13594A] dark:bg-[#5EEAD4]" aria-hidden="true" />
        PROTOTIPO · DATOS FICTICIOS
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-white dark:bg-[#182220] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-300 shadow-xs ${className}`}
    >
      <span className="text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
        PROTOTIPO · DATOS FICTICIOS
      </span>
    </div>
  );
};

export default StatusBadge;
