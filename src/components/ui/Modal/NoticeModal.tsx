import React, { useEffect, useRef } from 'react';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  originalRoute?: string;
  actionName?: string;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  title,
  originalRoute,
  actionName,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus button automatically when dialog opens for keyboard accessibility
      closeButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#182220] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-[#263834] transform transition-all">
        {/* Header icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#E6F4F1] dark:bg-[#132B25] text-[#13594A] dark:text-[#5EEAD4] flex items-center justify-center mb-4 border border-transparent dark:border-[#205C4E]" aria-hidden="true">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>

        {/* Content */}
        <h3 id="modal-title" className="text-lg font-bold text-[#172B28] dark:text-[#F0FDF8] mb-1">
          {title}
        </h3>

        {actionName && (
          <p className="text-xs font-bold text-[#004034] dark:text-[#5EEAD4] uppercase tracking-wide mb-3">
            Acción: {actionName}
          </p>
        )}

        <div id="modal-desc" className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-xs text-slate-700 dark:text-slate-300 mb-5 space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Disponible en la futura integración funcional.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Este prototipo visual opera de forma 100% aislada con datos ficticios para validar la experiencia de usuario y arquitectura React.
          </p>
          {originalRoute && (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono pt-1.5 border-t border-slate-200 dark:border-[#263834]">
              Ruta destino prevista: <span className="text-[#004034] dark:text-[#5EEAD4] font-bold">{originalRoute}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-semibold hover:bg-[#004034] dark:hover:bg-[#1A6B5A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeModal;
