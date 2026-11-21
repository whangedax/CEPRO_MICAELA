/**
 * src/components/academic/AcademicWorkflowModal.tsx
 *
 * Asistente Guiado de Gestión Académica por Ventanas / Pasos — CEPRO_MICAELA 2.0.
 * Organiza de forma lógica, limpia y sin sobrecarga cognitiva el flujo operativo:
 *   - Ventana 1 (Paso 1): Selección de Módulo Formativo / Periodo Lectivo (Módulo I / Módulo II / Vista Global).
 *   - Ventana 2 (Paso 2): Selección de Carrera Técnica (con ilustraciones descriptivas temáticas).
 *   - Ventana 3 (Paso 3): Selección de Aula y Unidades Didácticas (con acceso directo a gestionar en contexto).
 *
 * Permite cambiar de módulo, carrera o unidad en cualquier momento desde el Topbar
 * o desde cualquier panel del sistema.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { NavRoute } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceGroupOption, WorkspaceUnitOption } from '../../api/types';
import {
  CareerVisualBanner,
  CareerEmblemIcon,
  resolveCareerVisualTheme,
} from './CareerVisualBanner';
import {
  CalendarIcon,
  StudentsIcon,
  EnrollmentIcon,
  AttendanceIcon,
  EvaluationIcon,
  DocumentIcon,
  CheckCircleIcon,
  ArrowForwardIcon,
  SunIcon,
  SunsetIcon,
} from '../ui/Icons';

export interface AcademicWorkflowModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (route: NavRoute) => void;
}

const moduleLabel = (periodId: string) =>
  periodId === '2026-I' ? 'Módulo I' : periodId === '2026-II' ? 'Módulo II' : '';

export const AcademicWorkflowModal: React.FC<AcademicWorkflowModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onNavigate,
}) => {
  const { user } = useAuth();
  const {
    options,
    error,
    loadOptions,
    activeWorkspace,
    selectedGroup,
    isSelectorOpen,
    selectorStep,
    closeSelector,
    selectWorkspace,
    selectGroupAndUnit,
  } = useWorkspace();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isSelectorOpen;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    if (propOnClose) propOnClose();
    closeSelector();
  }, [propOnClose, closeSelector]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
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
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen, handleClose]);

  const role = user?.role || 'DOCENTE';
  const isAdminOrSec = role === 'DIRECTOR' || role === 'SECRETARIA';

  // Paso actual (1: Módulo, 2: Carrera, 3: Aula y Unidades)
  const [requestedStep, setStep] = useState<1 | 2 | 3>(1);
  const [periodId, setPeriodId] = useState('');
  const initializedStep = useRef<1 | 2 | 3 | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const programs = useMemo(() => options?.programs || [], [options?.programs]);
  const modules = useMemo(() => options?.modules || [], [options?.modules]);
  const groups = useMemo(() => options?.groups || [], [options?.groups]);

  const periods = useMemo(() => [...new Set([
    '2026-I',
    '2026-II',
    ...(options?.periods || []),
    ...groups.map(group => group.periodId),
    ...modules.map(module => module.periodId),
  ].filter((period): period is string => Boolean(period)))].sort(), [groups, modules, options?.periods]);

  const periodGroups = useMemo(
    () => groups.filter(group => group.periodId === periodId),
    [groups, periodId]
  );
  const periodPlans = useMemo(
    () => isAdminOrSec ? modules.filter(module => module.periodId === periodId) : [],
    [modules, periodId, isAdminOrSec]
  );
  const periodPrograms = useMemo(() => {
    const programIds = new Set([...periodGroups, ...periodPlans].map(item => item.programId));
    return programs.filter(program => programIds.has(program.id));
  }, [programs, periodGroups, periodPlans]);
  const currentProgram = periodPrograms.find(program => program.id === selectedProgramId);
  const careerGroups = periodGroups.filter(group => group.programId === currentProgram?.id);
  const currentGroup = careerGroups.find(group => group.id === selectedGroupId) || careerGroups[0] || null;
  const currentPlans = periodPlans.filter(plan =>
    plan.programId === currentProgram?.id && !careerGroups.some(group => group.moduleId === plan.id)
  );
  const step = !periodId ? 1 : requestedStep === 3 && !currentProgram ? 2 : requestedStep;

  useEffect(() => {
    if (!isOpen) {
      initializedStep.current = null;
      return;
    }
    if (!options || initializedStep.current === selectorStep) return;
    initializedStep.current = selectorStep;

    const currentGroup = selectedGroup || groups.find(group => group.id === activeWorkspace?.groupId);
    const activePeriod = currentGroup?.periodId || activeWorkspace?.periodId || '';
    setPeriodId(activePeriod);
    setSelectedProgramId(currentGroup?.programId || activeWorkspace?.programId || '');
    setSelectedGroupId(currentGroup?.id || '');
    setFeedbackMsg(null);
    setStep(activePeriod ? selectorStep : 1);
  }, [isOpen, options, selectorStep, groups, selectedGroup, activeWorkspace]);

  const choosePeriod = (period: string) => {
    setPeriodId(period);
    setSelectedProgramId('');
    setSelectedGroupId('');
    setFeedbackMsg(null);
    setStep(2);
  };

  const pedagogicalUnits: WorkspaceUnitOption[] = useMemo(() => {
    if (!currentGroup) return [];
    return (currentGroup.units || []).filter((u) => u.code !== 'EFSRT');
  }, [currentGroup]);

  const efsrtUnit: WorkspaceUnitOption | null = useMemo(() => {
    if (!currentGroup) return null;
    return (currentGroup.units || []).find((u) => u.code === 'EFSRT') || null;
  }, [currentGroup]);

  // Navegación segura
  const navigateTo = (route: NavRoute) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.hash = `#/${route}`;
    }
  };

  // Activar contexto y entrar al sistema
  const handleSelectUnit = async (
    group: WorkspaceGroupOption,
    mode: 'UNIT' | 'MODULE' | 'PRACTICE',
    unitCode?: string,
    targetRoute?: NavRoute
  ) => {
    if (isApplying || group.id !== currentGroup?.id || group.periodId !== periodId) return;
    setIsApplying(true);
    setFeedbackMsg(null);
    try {
      const effectiveMode = unitCode === 'EFSRT' ? 'PRACTICE' : mode;
      await selectGroupAndUnit(group, effectiveMode, unitCode);
      handleClose();
      navigateTo(targetRoute || 'inicio');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'error' in err ? String((err as { error: unknown }).error) : 'No se pudo seleccionar la unidad.';
      setFeedbackMsg(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectOverview = async () => {
    if (!isAdminOrSec || isApplying) return;
    setFeedbackMsg(null);
    setIsApplying(true);
    try {
      await selectWorkspace({ overview: true });
      handleClose();
    } catch {
      setFeedbackMsg('No se pudo abrir la vista global. Inténtelo de nuevo.');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="academic-workflow-title"
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-xs animate-fade-in"
    >
      <div
        ref={panelRef}
        className="cepro-dialog-panel w-full max-w-5xl bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO DEL ASISTENTE GUIADO */}
        <header className="px-6 py-5 border-b border-line bg-surface-alt flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-bold text-brand uppercase tracking-wider tabular-nums">
                Navegador académico
              </span>
            </div>
            <h2
              id="academic-workflow-title"
              className="text-[20px] font-bold text-ink leading-tight"
            >
              {step === 1 && 'Paso 1: Seleccione el Módulo Formativo / Periodo Lectivo'}
              {step === 2 && 'Paso 2: Seleccione la Carrera Técnica (Especialidad)'}
              {step === 3 && 'Paso 3: Seleccione el Aula y la Unidad Didáctica'}
            </h2>
          </div>

          {/* Barra de progreso de pasos */}
          <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isApplying}
              className={`min-h-[44px] px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                step === 1
                  ? 'bg-brand text-on-brand shadow-xs'
                  : 'bg-surface border border-line text-ink hover:text-brand hover:bg-brand-soft'
              }`}
            >
              <span className="tabular-nums">1. Módulo</span>
              {step > 1 && <span className="text-[10px]" aria-hidden="true">✓</span>}
            </button>
            <span className="text-muted" aria-hidden="true">→</span>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!periodId || isApplying}
              className={`min-h-[44px] px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                step === 2
                  ? 'bg-brand text-on-brand shadow-xs'
                  : 'bg-surface border border-line text-ink hover:text-brand hover:bg-brand-soft'
              }`}
            >
              <span className="tabular-nums">2. Carrera</span>
              {step > 2 && <span className="text-[10px]" aria-hidden="true">✓</span>}
            </button>
            <span className="text-muted" aria-hidden="true">→</span>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!currentProgram || isApplying}
              className={`min-h-[44px] px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                step === 3
                  ? 'bg-brand text-on-brand shadow-xs'
                  : 'bg-surface border border-line text-ink hover:text-brand hover:bg-brand-soft'
              }`}
            >
              <span className="tabular-nums">3. Unidades</span>
            </button>

            {/* Botón cerrar si ya existe un espacio o desea omitir */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
              className="ml-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* CONTENIDO SCROLLABLE SEGÚN EL PASO ACTIVO */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {(feedbackMsg || (!options && error)) && (
            <div
              role="alert"
              className="p-3.5 rounded-[10px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2"
            >
              <span className="font-bold shrink-0" aria-hidden="true">!</span>
              <span className="min-w-0">{feedbackMsg || error}</span>
              {!options && error && (
                <button type="button" className="min-h-[44px] shrink-0 px-2 font-bold underline focus-visible:ring-2"
                  onClick={() => void loadOptions()}>
                  Reintentar
                </button>
              )}
            </div>
          )}
          {/* ========================================================
              VENTANA 1: SELECCIÓN DE MÓDULO / PERIODO LECTIVO
             ======================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto mb-2">
                <p className="text-[14px] text-muted">
                  Seleccione el periodo lectivo y la etapa formativa con la que va a trabajar.
                  El sistema organizará automáticamente las carreras técnicas y aulas correspondientes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {periods.map(period => {
                  const title = moduleLabel(period);
                  const count = groups.filter(group => group.periodId === period).length;
                  return (
                    <button
                      key={period}
                      type="button"
                      data-testid={`workspace-period-${period}`}
                      disabled={!options || isApplying}
                      onClick={() => choosePeriod(period)}
                      className="p-6 rounded-2xl text-left border-2 transition-colors flex flex-col justify-between group bg-surface border-line hover:border-brand cursor-pointer focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                    >
                      <div>
                        <CalendarIcon className="w-5 h-5 text-brand mb-4" />
                        <h3 className="text-lg font-bold text-ink tabular-nums">
                          {title ? `${title} · Periodo ${period}` : `Periodo ${period}`}
                        </h3>
                        <p className="text-sm text-muted mt-2">
                          {!options ? 'Cargando disponibilidad…' : count
                            ? `${count} ${count === 1 ? 'aula disponible' : 'aulas disponibles'}`
                            : role === 'DOCENTE' ? 'Sin aulas asignadas' : 'Sin aulas habilitadas'}
                        </p>
                      </div>
                      <div className="mt-5 pt-3 border-t border-line flex justify-between items-center gap-2 text-sm font-bold text-brand">
                        <span>{title ? `Ver Carreras de ${title}` : 'Ver carreras del periodo'}</span>
                        <ArrowForwardIcon className="w-4 h-4 shrink-0" />
                      </div>
                    </button>
                  );
                })}

                {/* Opción 3: Vista Global Institucional (Solo Secretaría y Dirección) */}
                {isAdminOrSec ? (
                  <button
                    type="button"
                    onClick={handleSelectOverview}
                    disabled={isApplying}
                    className="p-6 rounded-2xl text-left border-2 transition-all duration-200 flex flex-col justify-between group bg-brand-soft/60 border-brand/40 hover:border-brand hover:shadow-[var(--ui-shadow)] cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-brand text-on-brand">
                          Ámbito Institucional
                        </span>
                        <CheckCircleIcon className="w-5 h-5 text-brand" />
                      </div>
                      <h3 className="text-[18px] font-bold text-ink group-hover:text-brand transition-colors">
                        Vista Global del CETPRO
                      </h3>
                      <p className="text-[13px] text-muted mt-2 leading-relaxed">
                        Consulte las carreras, nóminas y reportes institucionales sin seleccionar una unidad didáctica.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-brand/20 flex items-center justify-between text-[13px] font-bold text-brand">
                      <span>Acceder a Vista Global</span>
                      <ArrowForwardIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* ========================================================
              VENTANA 2: SELECCIÓN DE CARRERA TÉCNICA (ESPECIALIDAD)
             ======================================================== */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-[12px] font-bold transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span>← Volver al Módulo</span>
                  </button>
                  <span className="text-[13px] text-muted font-medium truncate">
                    <strong className="text-brand tabular-nums">{[moduleLabel(periodId), periodId].filter(Boolean).join(' · ')}</strong>
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-muted tabular-nums shrink-0">
                  {periodPrograms.length} {periodPrograms.length === 1 ? 'carrera disponible' : 'carreras disponibles'}
                </span>
              </div>

              {!periodPrograms.length && (
                <div className="rounded-xl border border-line bg-surface-alt p-5 space-y-2" role="status">
                  <h3 className="font-bold text-ink">
                    {role === 'DOCENTE' ? 'Aún no tienes aulas asignadas' : 'Aún no hay aulas ni planes disponibles'} en {periodId}
                  </h3>
                  <p className="text-sm text-muted">
                    {role === 'DIRECTOR' ? 'Revise los planes del periodo en Configuración Académica.' : 'Consulte con Dirección para habilitar sus aulas en este periodo.'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {periodPrograms.map((prog) => {
                  const isSelected = prog.id === selectedProgramId;
                  const progGroups = periodGroups.filter((g) => g.programId === prog.id);
                  const totalStudents = progGroups.reduce((acc, g) => acc + (g.studentCount || 0), 0);
                  const theme = resolveCareerVisualTheme(prog.id, prog.nombre);

                  return (
                    <button
                      key={prog.id}
                      data-testid={`workspace-program-${prog.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedProgramId(prog.id);
                        setSelectedGroupId(progGroups[0]?.id || '');
                        setFeedbackMsg(null);
                        setStep(3);
                      }}
                      className={`text-left rounded-2xl p-3.5 transition-all duration-200 border flex flex-col justify-between group cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                        isSelected
                          ? 'bg-brand-soft/60 border-brand ring-2 ring-brand/25 shadow-[var(--ui-shadow)]'
                          : 'bg-surface border-line hover:border-brand/60 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <CareerVisualBanner
                          programId={prog.id}
                          programName={prog.nombre}
                          instanceId={`wizard-${prog.id}`}
                          heightClass="h-28"
                          rightBadgeText={`${progGroups.length} ${progGroups.length === 1 ? 'aula' : 'aulas'}`}
                          showToolsFooter={false}
                        />
                        <div className="mt-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand tabular-nums">
                              {prog.id}
                            </span>
                            <h4 className="text-[15px] font-bold text-ink leading-snug mt-0.5 group-hover:text-brand transition-colors">
                              {prog.nombre}
                            </h4>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-xl ${theme.iconBgClass} text-white flex items-center justify-center shrink-0 shadow-xs`}
                          >
                            <CareerEmblemIcon programId={prog.id} programName={prog.nombre} className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-ink flex items-center gap-1 tabular-nums">
                          <StudentsIcon className="w-3.5 h-3.5 text-brand" />
                          {progGroups.length ? `${totalStudents} matrículas activas` : 'Plan sin aula'}
                        </span>
                        <span className="font-bold text-brand group-hover:underline">
                          Elegir carrera →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              VENTANA 3: SELECCIÓN DE AULA Y UNIDADES DIDÁCTICAS
             ======================================================== */}
          {step === 3 && currentProgram && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span>← Volver a Carreras</span>
                  </button>
                  <span className="text-sm text-muted font-medium min-w-0 truncate">
                    Carrera seleccionada:{' '}
                    <strong className="text-brand">
                      {currentProgram.nombre}
                    </strong>
                  </span>
                </div>

                <span className="text-xs font-semibold text-muted tabular-nums">
                  <strong className="text-brand">{[moduleLabel(periodId), periodId].filter(Boolean).join(' · ')}</strong> · {careerGroups.length}{' '}
                  {careerGroups.length === 1 ? 'aula disponible' : 'aulas disponibles'}
                </span>
              </div>

              {currentPlans.length > 0 && (
                <div className="rounded-xl border border-line bg-surface-alt p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-ink">Plan disponible · Sin aula habilitada</h3>
                    <p className="mt-1 text-sm text-muted">
                      {role === 'DIRECTOR'
                        ? 'Para abrir asistencia, notas o documentos, cree un aula con este plan en Grupos y aulas.'
                        : 'Dirección debe habilitar un aula de este periodo para trabajar con sus registros.'}
                    </p>
                  </div>
                  {currentPlans.map(plan => (
                    <section key={plan.id} className="border-t border-line pt-3">
                      <h4 className="text-sm font-bold text-ink">{plan.nombre}</h4>
                      {plan.plannedUnits?.length ? (
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 text-sm text-muted">
                          {plan.plannedUnits.map(unit => (
                            <li key={unit.code} className="flex gap-2">
                              <span className="font-bold text-brand">{unit.code}</span>
                              {unit.name && <span>{unit.name}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                  {role === 'DIRECTOR' && (
                    <button type="button" onClick={() => { handleClose(); navigateTo('grupos'); }}
                      className="min-h-[44px] rounded-[10px] bg-brand px-4 text-sm font-bold text-on-brand focus-visible:ring-2 focus-visible:ring-brand">
                      Ir a Grupos y aulas
                    </button>
                  )}
                </div>
              )}

              {careerGroups.length > 0 && <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink block mb-2.5">
                  1. Seleccione el aula
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {careerGroups.map((grp) => {
                    const isGrpSelected = currentGroup?.id === grp.id;
                    const isMorning = (grp.turno || '').toLowerCase().includes('mañana');
                    const grpModule = modules.find((m) => m.id === grp.moduleId);
                    const grpStageLabel = moduleLabel(grp.periodId) || 'Módulo';

                    return (
                      <button
                        key={grp.id}
                        data-testid={`workspace-group-${grp.id}`}
                        type="button"
                        disabled={isApplying}
                        onClick={() => { setSelectedGroupId(grp.id); setFeedbackMsg(null); }}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                          isGrpSelected
                            ? 'bg-brand-soft/60 border-brand ring-2 ring-brand/25 shadow-sm'
                            : 'bg-surface border-line hover:border-brand/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60">
                              {isMorning ? (
                                <SunIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <SunsetIcon className="w-3 h-3 text-indigo-500 dark:text-indigo-300" />
                              )}
                              Turno {grp.turno || 'Mañana'}
                            </span>
                            <span className="text-[10px] font-bold text-brand tabular-nums">
                              {grp.periodId} · Secc. {grp.section || 'A1'}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand block truncate">
                            {grpStageLabel}: {grpModule?.nombre || grp.moduleId}
                          </span>
                          <h4 className="text-[13px] font-bold text-ink leading-tight mt-0.5 truncate">
                            {grp.name}
                          </h4>
                          {grp.teacherName && (
                            <p className="text-[11px] text-muted mt-1 truncate">
                              Prof. {grp.teacherName}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] font-semibold text-brand tabular-nums">
                          <span>{grp.studentCount} matriculados</span>
                          <span>{isGrpSelected ? 'Seleccionada ✓' : 'Elegir'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>}

              {/* Unidades Didácticas del Aula Seleccionada */}
              {currentGroup && (
                <div className="pt-4 border-t border-line space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink block tabular-nums">
                        2. Haga clic en la Unidad Didáctica que desea gestionar (
                        {pedagogicalUnits.length} UDs):
                      </span>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        Módulo:{' '}
                        <strong className="text-ink">
                          {modules.find((m) => m.id === currentGroup.moduleId)?.nombre ||
                            currentGroup.name}
                        </strong>{' '}
                        · Periodo{' '}
                        <strong className="text-ink tabular-nums">
                          {currentGroup.periodId}
                        </strong>
                      </p>
                    </div>

                    {/* Acceso a Módulo Completo para Secretaría / Dirección */}
                    {isAdminOrSec && (
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() => handleSelectUnit(currentGroup, 'MODULE', undefined, 'matriculas')}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-surface-alt hover:bg-brand hover:text-on-brand text-ink border border-line text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <EnrollmentIcon className="w-4 h-4" />
                        <span>Gestionar Aula Completa (Nóminas de Matrícula)</span>
                      </button>
                    )}
                  </div>

                  {/* Cuadrícula de Unidades Didácticas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pedagogicalUnits.map((unit, idx) => {
                      const isUnitActive =
                        activeWorkspace?.groupId === currentGroup.id &&
                        activeWorkspace?.mode === 'UNIT' &&
                        activeWorkspace?.unit === unit.code;

                      return (
                        <div
                          key={unit.code}
                          className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                            isUnitActive
                              ? 'bg-brand-soft/60 border-brand ring-2 ring-brand/25 shadow-sm'
                              : 'bg-surface border-line hover:border-brand/50 hover:shadow-xs'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-brand text-on-brand text-xs font-bold tabular-nums">
                                {unit.code} · Unidad {idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted tabular-nums">
                                {unit.hours ? <span>{unit.hours} h</span> : null}
                                {unit.hours && unit.credits ? <span>·</span> : null}
                                {unit.credits ? <span>{unit.credits} créd.</span> : null}
                              </div>
                            </div>

                            <h4 className="text-sm font-bold text-ink leading-snug">
                              {unit.name || `Unidad Didáctica ${unit.code}`}
                            </h4>

                            {(unit.fechaInicio || unit.fechaFin) && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-brand-soft border border-brand/25 text-[11px] font-bold text-brand tabular-nums">
                                <CalendarIcon className="w-3 h-3 shrink-0" />
                                <span>
                                  {unit.fechaInicio || ''} al {unit.fechaFin || ''}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-line space-y-2">
                            {/* Botón Principal: Entrar a gestionar */}
                            <button
                              type="button"
                              disabled={isApplying}
                              onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code)}
                              data-testid={`workspace-unit-${unit.code}`}
                              aria-label={`Abrir ${unit.code}: ${unit.name || unit.code} · ${moduleLabel(periodId) || periodId}`}
                              className="min-h-[44px] w-full py-2.5 px-4 rounded-[10px] bg-brand hover:bg-brand/90 text-on-brand font-bold text-[12px] tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <span>Ingresar a Gestionar esta Unidad</span>
                              <ArrowForwardIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* Accesos directos rápidos */}
                            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                              <button
                                type="button"
                                disabled={isApplying}
                                onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code, 'asistencia')}
                                className="min-h-[44px] p-1.5 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand font-bold border border-line transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-brand"
                              >
                                Asistencia
                              </button>
                              <button
                                type="button"
                                disabled={isApplying}
                                onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code, 'evaluacion')}
                                className="min-h-[44px] p-1.5 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand font-bold border border-line transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-brand"
                              >
                                Notas
                              </button>
                              <button
                                type="button"
                                disabled={isApplying}
                                onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code, 'documentos')}
                                className="min-h-[44px] p-1.5 rounded-[10px] bg-surface-alt hover:bg-brand-soft text-ink hover:text-brand font-bold border border-line transition-colors cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-brand"
                              >
                                Formatos PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Tarjeta de Prácticas EFSRT si existe */}
                    {efsrtUnit && (
                      <div className="rounded-2xl p-4 border bg-amber-50/60 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/60 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold">
                              EFSRT · Prácticas
                            </span>
                            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
                              {efsrtUnit.hours || 192} h · {efsrtUnit.credits || 6} créd.
                            </span>
                          </div>
                          <h4 className="text-[14px] font-bold text-amber-950 dark:text-amber-200 leading-snug">
                            Experiencias Formativas en Situaciones Reales de Trabajo
                          </h4>
                          <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-1 tabular-nums">
                            Evaluación y acta de prácticas formativas de taller y empresa (Formato TMPL-18).
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-800/40">
                          <button
                            type="button"
                            disabled={isApplying}
                            onClick={() => handleSelectUnit(currentGroup, 'PRACTICE', 'EFSRT', 'documentos')}
                            className="min-h-[44px] w-full py-2.5 px-4 rounded-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <span>Gestionar Prácticas EFSRT →</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PIE DE DIÁLOGO */}
        <footer className="px-6 py-4 border-t border-line bg-surface-alt flex items-center justify-between text-[12px]">
          <span className="text-muted tabular-nums">
            {step === 1 && 'Paso 1 de 3 · Selección de Módulo'}
            {step === 2 && 'Paso 2 de 3 · Selección de Carrera'}
            {step === 3 && 'Paso 3 de 3 · Selección de Aula y Unidad Didáctica'}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] px-4 py-2 rounded-[10px] bg-surface border border-line text-ink font-bold hover:bg-brand-soft hover:text-brand transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cerrar Asistente
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AcademicWorkflowModal;
