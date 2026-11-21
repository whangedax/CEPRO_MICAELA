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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus button automatically when dialog opens for keyboard accessibility
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!panelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
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
      <div
        ref={panelRef}
        className="cepro-dialog-panel relative w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all"
      >
        {/* Header icon */}
        <div
          className="w-12 h-12 rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] flex items-center justify-center mb-4 border border-[var(--ui-line)]"
          aria-hidden="true"
        >
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
        <h3 id="modal-title" className="text-lg font-bold text-[var(--ui-ink)] mb-1">
          {title}
        </h3>

        {actionName && (
          <p className="text-xs font-bold text-[var(--ui-brand)] uppercase tracking-wide mb-3">
            Acción: {actionName}
          </p>
        )}

        <div
          id="modal-desc"
          className="p-3.5 rounded-2xl bg-[var(--ui-canvas)] border border-[var(--ui-line)] text-xs text-[var(--ui-muted)] mb-5 space-y-2"
        >
          <p className="font-semibold text-[var(--ui-ink)]">
            Disponible en la futura integración funcional.
          </p>
          <p className="text-[var(--ui-muted)] leading-relaxed">
            Este prototipo visual opera de forma 100% aislada con datos ficticios para validar la experiencia de usuario y arquitectura React.
          </p>
          {originalRoute && (
            <p className="text-[11px] text-[var(--ui-muted)] font-mono pt-1.5 border-t border-[var(--ui-line)]">
              Ruta destino prevista:{' '}
              <span className="text-[var(--ui-brand)] font-bold">{originalRoute}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="ui-button-primary px-5 py-2.5 text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeModal;
