/**
 * context/PendingChangesContext.tsx
 * 
 * Arquitectura Reutilizable de Protección de Cambios Pendientes.
 * CEPRO_MICAELA 2.0.
 * 
 * Detecta y protege modificaciones no guardadas en formularios académicos
 * (Asistencia, Evaluaciones, etc.) ante:
 * - Navegación entre pantallas del sistema
 * - Cambios de contexto (fecha, sesión, unidad, aula)
 * - Cierre de sesión (logout)
 * - Recarga o cierre de pestaña (beforeunload)
 * 
 * Cumple estrictamente con accesibilidad WCAG 2.2 AA y diseño Google Stitch.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface PendingChangesRegistration {
  id: string;
  hasChanges: boolean;
  message?: string;
  onSave?: () => Promise<boolean>;
  onDiscard?: () => void;
}

interface PendingChangesContextType {
  hasPendingChanges: boolean;
  activeRegistration: PendingChangesRegistration | null;
  registerPendingChanges: (reg: PendingChangesRegistration) => void;
  unregisterPendingChanges: (id: string) => void;
  requestSafeTransition: (targetAction: () => void | Promise<void>) => void;
}

const PendingChangesContext = createContext<PendingChangesContextType | undefined>(undefined);

export const PendingChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registrations, setRegistrations] = useState<Record<string, PendingChangesRegistration>>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Acción pausada que espera confirmación del usuario
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

  const registrationsRef = useRef<Record<string, PendingChangesRegistration>>({});

  const registerPendingChanges = useCallback((reg: PendingChangesRegistration) => {
    registrationsRef.current[reg.id] = reg;
    setRegistrations((prev) => {
      return { ...prev, [reg.id]: reg };
    });
  }, []);

  const unregisterPendingChanges = useCallback((id: string) => {
    delete registrationsRef.current[id];
    setRegistrations((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Determinar si hay al menos un formulario con cambios no guardados
  const activeRegistration = Object.values(registrations).find((r) => r.hasChanges) || null;
  const hasPendingChanges = Boolean(activeRegistration);

  // Escuchar beforeunload (F5 o cierre de pestaña)
  useEffect(() => {
    if (!hasPendingChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // En navegadores modernos returnValue activa el diálogo nativo del navegador
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasPendingChanges]);

  // Interceptar transiciones
  const requestSafeTransition = useCallback(
    (targetAction: () => void | Promise<void>) => {
      if (!hasPendingChanges) {
        // Sin cambios pendientes: ejecutar inmediatamente
        void targetAction();
        return;
      }

      // Con cambios pendientes: pausar y abrir diálogo
      pendingActionRef.current = targetAction;
      setSaveError(null);
      setIsSaving(false);
      setIsModalOpen(true);
    },
    [hasPendingChanges]
  );

  // Opción 1: Permanecer y continuar editando
  const handleStay = () => {
    setIsModalOpen(false);
    setSaveError(null);
    pendingActionRef.current = null;
  };

  // Opción 2: Descartar cambios y continuar
  const handleDiscardAndProceed = () => {
    const currentReg = Object.values(registrationsRef.current).find((r) => r.hasChanges) || activeRegistration;
    if (currentReg?.onDiscard) {
      currentReg.onDiscard();
    }
    if (currentReg?.id) {
      unregisterPendingChanges(currentReg.id);
    }
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setIsModalOpen(false);
    setSaveError(null);

    if (action) {
      void action();
    }
  };

  // Opción 3: Guardar antes de continuar
  const handleSaveAndProceed = async () => {
    const currentReg = Object.values(registrationsRef.current).find((r) => r.hasChanges) || activeRegistration;
    if (!currentReg?.onSave) {
      handleDiscardAndProceed();
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const success = await currentReg.onSave();
      if (success) {
        if (currentReg.id) {
          unregisterPendingChanges(currentReg.id);
        }
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setIsModalOpen(false);
        setIsSaving(false);

        if (action) {
          void action();
        }
      } else {
        setIsSaving(false);
        setSaveError('No se pudieron confirmar los cambios en el servidor local. Revise los registros.');
      }
    } catch (err: unknown) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : 'Error al guardar los cambios en el backend.';
      setSaveError(msg);
    }
  };

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen && !isSaving) {
        handleStay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isSaving]);

  const defaultMessage =
    'Hay cambios de asistencia sin guardar. Si continúa, perderá las modificaciones pendientes.';
  const displayMessage = activeRegistration?.message || defaultMessage;

  return (
    <PendingChangesContext.Provider
      value={{
        hasPendingChanges,
        activeRegistration,
        registerPendingChanges,
        unregisterPendingChanges,
        requestSafeTransition,
      }}
    >
      {children}

      {/* Diálogo accesible de confirmación de cambios pendientes */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-modal-title"
          aria-describedby="unsaved-modal-desc"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Encabezado con icono de advertencia */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3
                  id="unsaved-modal-title"
                  className="text-lg font-bold text-slate-900 tracking-tight"
                >
                  Cambios pendientes sin guardar
                </h3>
                <p id="unsaved-modal-desc" className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {displayMessage}
                </p>
              </div>
            </div>

            {/* Error si el guardado falla */}
            {saveError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{saveError}</span>
              </div>
            )}

            {/* Botones de acción accesibles */}
            <div className="flex flex-col sm:flex-row gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                id="btn-unsaved-stay"
                onClick={handleStay}
                disabled={isSaving}
                className="order-2 sm:order-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors text-center disabled:opacity-50"
              >
                Permanecer y continuar editando
              </button>

              <button
                type="button"
                id="btn-unsaved-discard"
                onClick={handleDiscardAndProceed}
                disabled={isSaving}
                className="order-3 sm:order-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-semibold hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors text-center disabled:opacity-50"
              >
                Descartar cambios y continuar
              </button>

              <button
                type="button"
                id="btn-unsaved-save"
                onClick={handleSaveAndProceed}
                disabled={isSaving}
                className="order-1 sm:order-3 flex-1 px-4 py-2.5 rounded-xl bg-[#13594A] text-white text-sm font-semibold hover:bg-[#0D3E34] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <span>Guardar antes de continuar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PendingChangesContext.Provider>
  );
};

export const usePendingChanges = (): PendingChangesContextType => {
  const context = useContext(PendingChangesContext);
  if (!context) {
    throw new Error('usePendingChanges debe utilizarse dentro de un PendingChangesProvider');
  }
  return context;
};
