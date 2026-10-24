/**
 * components/academic/SelectUnitModal.tsx
 * 
 * Modal accesible de selección de Unidad Didáctica y Espacio de Trabajo.
 * Cumple con el flujo original de CEPRO_MICAELA:
 * - Selección de modo 'UNIT' con unidad específica para notas, asistencias y evaluaciones.
 * - Selección de modo 'MODULE' para gestión documental global del módulo.
 * - Validación oficial antes de enviar POST /api/workspace.
 */

import React, { useState } from 'react';
import { WorkspaceGroupOption } from '../../api/types';
import { ArrowForwardIcon } from '../ui/Icons';

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

  // Sincronizar unidad al abrir
  React.useEffect(() => {
    if (group?.units?.length) {
      if (currentUnitCode && group.units.some((u) => u.code === currentUnitCode)) {
        setSelectedUnit(currentUnitCode);
      } else {
        setSelectedUnit(group.units[0].code);
      }
    }
    setError(null);
  }, [group, currentUnitCode]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="p-6 border-b border-slate-100 bg-[#F6F8FA]/70">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#13594A]" aria-hidden="true" />
            <span className="text-[11px] font-bold text-[#13594A] uppercase tracking-wider">
              Selección de Espacio de Trabajo
            </span>
          </div>
          <h2 id="select-unit-modal-title" className="text-[20px] font-bold text-[#172B28] leading-snug">
            {programName}
          </h2>
          <p className="text-[13px] text-slate-600 font-medium mt-1">
            {moduleName}
          </p>
        </div>

        {/* Resumen del Aula */}
        <div className="px-6 py-3.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-4 text-[12px] text-slate-700">
          <div>
            <span className="font-semibold text-slate-500">Periodo: </span>
            <span className="font-bold text-slate-800">{group.periodId}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Turno: </span>
            <span className="font-bold text-slate-800">{group.turno || 'Sin turno'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Matriculados: </span>
            <span className="font-bold text-[#13594A]">{group.studentCount} estudiantes</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[12px] font-medium"
            >
              {error}
            </div>
          )}

          {/* Selector de Modo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Modo de trabajo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('UNIT')}
                className={`px-3.5 py-2.5 rounded-xl text-[12px] font-semibold border transition-all text-left flex flex-col gap-0.5 ${
                  mode === 'UNIT'
                    ? 'bg-[#e6f4f1] border-[#13594A] text-[#004034] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold">Unidad Didáctica</span>
                <span className="text-[10px] text-slate-500 font-normal">Notas, asistencia y sesiones</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('MODULE')}
                className={`px-3.5 py-2.5 rounded-xl text-[12px] font-semibold border transition-all text-left flex flex-col gap-0.5 ${
                  mode === 'MODULE'
                    ? 'bg-[#e6f4f1] border-[#13594A] text-[#004034] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold">Módulo Completo</span>
                <span className="text-[10px] text-slate-500 font-normal">Formatos globales del módulo</span>
              </button>
            </div>
          </div>

          {/* Lista de Unidades si mode === 'UNIT' */}
          {mode === 'UNIT' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Unidad Didáctica asignada
              </label>

              {group.units && group.units.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {group.units.map((unit) => {
                    const isSelected = selectedUnit === unit.code;
                    return (
                      <label
                        key={unit.code}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#e6f4f1]/70 border-[#13594A] shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="unitSelection"
                            value={unit.code}
                            checked={isSelected}
                            onChange={() => setSelectedUnit(unit.code)}
                            className="w-4 h-4 text-[#13594A] focus:ring-[#13594A] border-slate-300"
                          />
                          <div>
                            <span className="text-[13px] font-bold text-slate-900 block">
                              {unit.name ? `${unit.code}: ${unit.name}` : `Unidad: ${unit.code}`}
                            </span>
                            {unit.hours && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                Horas: {unit.hours} {unit.credits ? `· Créditos: ${unit.credits}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#13594A] uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-[#13594A]/20">
                            Seleccionada
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[12px]">
                  No se registran unidades configuradas en esta aula.
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-[12px] font-semibold shadow-sm hover:bg-[#004034] hover:shadow-[0_4px_12px_rgba(19,89,74,0.25)] transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Conectando aula...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al aula</span>
                  <ArrowForwardIcon className="w-3.5 h-3.5" />
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
