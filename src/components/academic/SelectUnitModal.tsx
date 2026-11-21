/**
 * components/academic/SelectUnitModal.tsx
 * 
 * Modal accesible de selección de Unidad Didáctica y Espacio de Trabajo.
 * Cumple con el flujo original de CEPRO_MICAELA:
 * - Selección de modo 'UNIT' con unidad específica para notas, asistencias y evaluaciones.
 * - Selección de modo 'MODULE' para gestión documental global del módulo.
 * - Validación oficial antes de enviar POST /api/workspace.
 */

import React, { useEffect, useRef, useState } from 'react';
import { WorkspaceGroupOption } from '../../api/types';
import { AlertCircleIcon, ArrowForwardIcon } from '../ui/Icons';

export interface SelectUnitModalProps {
  isOpen: boolean;
  group: WorkspaceGroupOption | null;
  programName: string;
  moduleName: string;
  currentUnitCode?: string;
  onClose: () => void;
  onConfirm: (group: WorkspaceGroupOption, mode: 'UNIT' | 'MODULE', unitCode?: string) => Promise<void>;
}

export const SelectUnitModal: React.FC<SelectUnitModalProps> = ({
  isOpen,
  group,
  programName,
  moduleName,
  currentUnitCode,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'UNIT' | 'MODULE'>('UNIT');
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (currentUnitCode) return currentUnitCode;
    return group?.units[0]?.code || 'UD1';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sincronizar unidad al abrir
  useEffect(() => {
    if (group?.units?.length) {
      if (currentUnitCode && group.units.some((u) => u.code === currentUnitCode)) {
        setSelectedUnit(currentUnitCode);
      } else {
        setSelectedUnit(group.units[0].code);
      }
    }
    setError(null);
  }, [group, currentUnitCode]);

  // Trampa de foco, Escape y retorno de foco al control de origen
  useEffect(() => {
    if (!isOpen || !group) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    };

    const rafId = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !panelRef.current.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, group, isSubmitting, onClose]);

  if (!isOpen || !group) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'UNIT' && !selectedUnit) {
      setError('Por favor seleccione una unidad didáctica para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(group, mode, mode === 'UNIT' ? selectedUnit : undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'error' in err
        ? String((err as { error: unknown }).error)
        : 'Error al conectar con el espacio de trabajo.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-unit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="cepro-dialog-panel bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] w-full max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="p-6 border-b border-line bg-surface-alt/70 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-brand shrink-0" aria-hidden="true" />
            <span className="text-[12px] leading-[18px] font-bold text-brand uppercase tracking-wider">
              Selección de Espacio de Trabajo
            </span>
          </div>
          <h2 id="select-unit-modal-title" className="text-[20px] leading-[28px] font-bold text-ink truncate">
            {programName}
          </h2>
          <p className="text-[14px] leading-[21px] text-muted font-medium mt-1 truncate">
            {moduleName}
          </p>
        </div>

        {/* Resumen del Aula */}
        <div className="px-6 py-3.5 bg-surface-alt/40 border-b border-line flex flex-wrap items-center gap-4 text-[12px] leading-[18px] text-muted tabular-nums">
          <div>
            <span className="font-semibold">Periodo: </span>
            <span className="font-bold text-ink">{group.periodId}</span>
          </div>
          <div>
            <span className="font-semibold">Turno: </span>
            <span className="font-bold text-ink">{group.turno || 'Sin turno'}</span>
          </div>
          <div>
            <span className="font-semibold">Matriculados: </span>
            <span className="font-bold text-brand">{group.studentCount} estudiantes</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-[10px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-[12px] leading-[18px] font-medium flex items-start gap-2.5"
            >
              <AlertCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="min-w-0">{error}</span>
            </div>
          )}

          {/* Selector de Modo */}
          <div>
            <span className="block text-[12px] leading-[18px] font-bold text-muted uppercase tracking-wider mb-2">
              Modo de trabajo
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('UNIT')}
                className={`min-h-[44px] px-3.5 py-2.5 rounded-[10px] text-[14px] leading-[21px] font-semibold border transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
                  mode === 'UNIT'
                    ? 'bg-brand-soft border-[var(--ui-brand)] text-brand shadow-xs'
                    : 'bg-surface-alt border-line text-ink hover:bg-brand-soft/50'
                }`}
              >
                <span className="font-bold">Unidad Didáctica</span>
                <span className="text-[12px] leading-[18px] text-muted font-normal">Notas, asistencia y sesiones</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('MODULE')}
                className={`min-h-[44px] px-3.5 py-2.5 rounded-[10px] text-[14px] leading-[21px] font-semibold border transition-all text-left flex flex-col gap-0.5 cursor-pointer ${
                  mode === 'MODULE'
                    ? 'bg-brand-soft border-[var(--ui-brand)] text-brand shadow-xs'
                    : 'bg-surface-alt border-line text-ink hover:bg-brand-soft/50'
                }`}
              >
                <span className="font-bold">Módulo Completo</span>
                <span className="text-[12px] leading-[18px] text-muted font-normal">Formatos globales del módulo</span>
              </button>
            </div>
          </div>

          {/* Lista de Unidades si mode === 'UNIT' */}
          {mode === 'UNIT' && (
            <div>
              <span className="block text-[12px] leading-[18px] font-bold text-muted uppercase tracking-wider mb-2">
                Unidad Didáctica asignada
              </span>

              {group.units && group.units.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {group.units.map((unit) => {
                    const isSelected = selectedUnit === unit.code;
                    return (
                      <label
                        key={unit.code}
                        className={`min-h-[44px] flex items-center justify-between gap-3 p-3.5 rounded-[10px] border cursor-pointer transition-all min-w-0 ${
                          isSelected
                            ? 'bg-brand-soft border-[var(--ui-brand)] shadow-xs'
                            : 'bg-surface-alt border-line hover:bg-brand-soft/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="radio"
                            name="unitSelection"
                            value={unit.code}
                            checked={isSelected}
                            onChange={() => setSelectedUnit(unit.code)}
                            className="w-4 h-4 shrink-0 text-brand focus:ring-[var(--ui-brand)] border-line"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[14px] leading-[21px] font-bold text-ink block truncate">
                              {unit.name ? `${unit.code}: ${unit.name}` : `Unidad: ${unit.code}`}
                            </span>
                            {unit.hours && (
                              <span className="text-[12px] leading-[18px] text-muted font-medium tabular-nums">
                                Horas: {unit.hours} {unit.credits ? `· Créditos: ${unit.credits}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[11px] font-bold text-brand uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface border border-line shrink-0">
                            Seleccionada
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-[10px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-[12px] leading-[18px] flex items-start gap-2.5">
                  <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>No se registran unidades configuradas en esta aula.</span>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-3 border-t border-line flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-muted hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] bg-brand text-on-brand text-[14px] font-semibold shadow-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-hidden="true" />
                  <span>Conectando aula...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al aula</span>
                  <ArrowForwardIcon className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelectUnitModal;
