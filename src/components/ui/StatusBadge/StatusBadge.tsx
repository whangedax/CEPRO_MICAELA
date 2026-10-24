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
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e6f4f1] text-[#004034] text-[10px] font-bold tracking-wider uppercase border border-[#13594A]/20 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#13594A]" aria-hidden="true" />
        PROTOTIPO · DATOS FICTICIOS
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs ${className}`}
    >
      <span className="text-[10px] font-bold tracking-wider text-slate-700 uppercase">
        PROTOTIPO · DATOS FICTICIOS
      </span>
    </div>
  );
};

export default StatusBadge;
